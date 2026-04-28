function socketSnapshot(socket, { metricValue, socketBandwidth, socketKey }) {
  return {
    key: socketKey(socket),
    local: socket.local,
    peer: socket.peer,
    state: socket.state,
    family: socket.family,
    process: socket.details.process ? `${socket.details.process.name}:${socket.details.process.pid}` : "",
    risk: socket.risk,
    recvQ: socket.recvQ,
    sendQ: socket.sendQ,
    rtt: metricValue(socket, "rtt"),
    rto: metricValue(socket, "rto"),
    drops: metricValue(socket, "skmem.d"),
    tx_bps: socketBandwidth(socket, "tx_bps"),
    rx_bps: socketBandwidth(socket, "rx_bps")
  };
}

export function createBaseline(state, deps) {
  return {
    createdAt: new Date().toISOString(),
    sourceName: state.sourceName,
    sockets: state.sockets.map(socket => socketSnapshot(socket, deps)),
    anomalies: state.anomalies.map(item => ({ severity: item.severity, title: item.title, metric: item.metric, socketId: item.socketId }))
  };
}

export function buildComparison(state, deps) {
  if (!state.baseline) return null;
  const { riskRank } = deps;
  const before = new Map(state.baseline.sockets.map(socket => [socket.key, socket]));
  const afterSockets = state.sockets.map(socket => socketSnapshot(socket, deps));
  const after = new Map(afterSockets.map(socket => [socket.key, socket]));
  const rows = [];
  for (const [key, next] of after) {
    const prev = before.get(key);
    rows.push(compareSocketSnapshots(prev, next, riskRank));
  }
  for (const [key, prev] of before) {
    if (!after.has(key)) rows.push(compareSocketSnapshots(prev, null, riskRank));
  }
  const summary = {
    before: before.size,
    after: after.size,
    added: rows.filter(row => row.status === "new").length,
    removed: rows.filter(row => row.status === "gone").length,
    worsened: rows.filter(row => row.status === "worse").length,
    improved: rows.filter(row => row.status === "better").length,
    unchanged: rows.filter(row => row.status === "same").length
  };
  return {
    summary,
    rows: rows.sort((a, b) =>
      statusRank(b.status) - statusRank(a.status) ||
      Math.abs(b.deltaScore) - Math.abs(a.deltaScore)
    )
  };
}

export function currentSnapshotMap(state, deps) {
  return state.sockets.map(socket => socketSnapshot(socket, deps));
}

function statusRank(status) {
  return { worse: 5, new: 4, gone: 3, better: 2, same: 1 }[status] || 0;
}

function compareSocketSnapshots(before, after, riskRank) {
  if (!before && after) return { status: "new", before, after, deltaScore: riskRank(after.risk), deltas: metricDeltas(null, after) };
  if (before && !after) return { status: "gone", before, after, deltaScore: -riskRank(before.risk), deltas: metricDeltas(before, null) };
  const deltas = metricDeltas(before, after);
  const riskDelta = riskRank(after.risk) - riskRank(before.risk);
  const pressureDelta = deltas.sendQ + deltas.recvQ + deltas.rto * 100 + deltas.drops * 100000;
  const status = riskDelta > 0 || pressureDelta > 100000 ? "worse" : riskDelta < 0 || pressureDelta < -100000 ? "better" : "same";
  return { status, before, after, deltaScore: riskDelta * 1000000 + pressureDelta, deltas };
}

function metricDeltas(before, after) {
  const metrics = ["recvQ", "sendQ", "rtt", "rto", "drops", "tx_bps", "rx_bps"];
  return Object.fromEntries(metrics.map(metric => [metric, Number(after?.[metric] || 0) - Number(before?.[metric] || 0)]));
}
