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
    cwnd: metricValue(socket, "cwnd"),
    rcv_ssthresh: metricValue(socket, "rcv_ssthresh"),
    backoff: metricValue(socket, "backoff"),
    retrans: socket.details?.timer?.retrans || 0,
    timerName: socket.details?.timer?.name || "",
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
  const metrics = ["recvQ", "sendQ", "rtt", "rto", "drops", "tx_bps", "rx_bps", "cwnd", "rcv_ssthresh", "backoff", "retrans"];
  return Object.fromEntries(metrics.map(metric => [metric, Number(after?.[metric] || 0) - Number(before?.[metric] || 0)]));
}

export function buildBaselineNarrative(comparison, baselineAnomalies = [], currentAnomalies = []) {
  if (!comparison) return null;
  const { summary, rows } = comparison;
  const changes = [];
  const stable = [];

  const worsened = rows.filter(r => r.status === "worse");
  const newSockets = rows.filter(r => r.status === "new");
  const goneSockets = rows.filter(r => r.status === "gone");

  // Peer changes
  const beforePeers = new Set(rows.filter(r => r.before).map(r => r.before.peer));
  const afterPeers = new Set(rows.filter(r => r.after).map(r => r.after.peer));
  const newPeers = [...afterPeers].filter(p => !beforePeers.has(p));
  const gonePeers = [...beforePeers].filter(p => !afterPeers.has(p));

  if (newPeers.length) changes.push(`${newPeers.length} new peer(s) appeared: ${newPeers.slice(0, 5).join(", ")}`);
  if (gonePeers.length) changes.push(`${gonePeers.length} peer(s) disappeared: ${gonePeers.slice(0, 5).join(", ")}`);

  // Metric explosions
  const recvQExplosions = worsened.filter(r => r.deltas.recvQ > 100000);
  if (recvQExplosions.length) changes.push(`${recvQExplosions.length} socket(s) Recv-Q exploded (${recvQExplosions.map(r => `+${Math.round(r.deltas.recvQ / 1024)}KB`).slice(0, 3).join(", ")})`);

  const sendQExplosions = worsened.filter(r => r.deltas.sendQ > 100000);
  if (sendQExplosions.length) changes.push(`${sendQExplosions.length} socket(s) Send-Q exploded (${sendQExplosions.map(r => `+${Math.round(r.deltas.sendQ / 1024)}KB`).slice(0, 3).join(", ")})`);

  const dropGrowth = worsened.filter(r => r.deltas.drops > 0);
  if (dropGrowth.length) changes.push(`Drops grew on ${dropGrowth.length} socket(s) (total +${dropGrowth.reduce((s, r) => s + r.deltas.drops, 0)})`);

  const persistAppeared = rows.filter(r => r.after?.timerName === "persist" && r.before?.timerName !== "persist");
  if (persistAppeared.length) changes.push(`persist timer appeared on ${persistAppeared.length} socket(s)`);

  const backoffGrew = worsened.filter(r => r.deltas.backoff > 0);
  if (backoffGrew.length) changes.push(`backoff increased on ${backoffGrew.length} socket(s)`);

  const rcvSsthreshDrop = worsened.filter(r => r.deltas.rcv_ssthresh < -50000);
  if (rcvSsthreshDrop.length) changes.push(`rcv_ssthresh dropped significantly on ${rcvSsthreshDrop.length} socket(s)`);

  // Stability signals
  const rttStable = rows.filter(r => r.before && r.after && Math.abs(r.deltas.rtt) < 1);
  if (rttStable.length > rows.length * 0.7) stable.push("RTT stable across most sockets");

  const cwndStable = rows.filter(r => r.before && r.after && r.deltas.cwnd >= 0);
  if (cwndStable.length > rows.length * 0.7) stable.push("cwnd stable or growing");

  const noRetransGrowth = rows.filter(r => r.before && r.after && r.deltas.retrans === 0);
  if (noRetransGrowth.length > rows.length * 0.8) stable.push("No retransmission growth");

  // Anomaly diff
  const baselineAnomalyKeys = new Set(baselineAnomalies.map(a => `${a.metric}|${a.socketId}`));
  const newAnomalies = currentAnomalies.filter(a => !baselineAnomalyKeys.has(`${a.metric}|${a.socketId}`));
  const preExisting = currentAnomalies.filter(a => baselineAnomalyKeys.has(`${a.metric}|${a.socketId}`));

  // Verdict
  let verdict = "";
  if (changes.length === 0) {
    verdict = "No significant change detected between baseline and current capture.";
  } else if (stable.some(s => s.includes("RTT")) && stable.some(s => s.includes("retransmission")) && (recvQExplosions.length || persistAppeared.length)) {
    verdict = "Slow consumer onset — network path is healthy but receiver is not keeping up.";
  } else if (dropGrowth.length && recvQExplosions.length) {
    verdict = "Buffer exhaustion — receiver overloaded to the point of dropping data.";
  } else if (sendQExplosions.length && backoffGrew.length && !stable.some(s => s.includes("RTT"))) {
    verdict = "Network degradation — path congestion or loss is impacting delivery.";
  } else if (persistAppeared.length) {
    verdict = "Zero Window / flow control event — peer or local stopped consuming.";
  } else {
    verdict = "Mixed signals — review the detailed changes below.";
  }

  return {
    changes,
    stable,
    newPeers,
    gonePeers,
    newAnomalies: newAnomalies.slice(0, 10),
    preExistingAnomalies: preExisting.length,
    verdict,
    summary
  };
}
