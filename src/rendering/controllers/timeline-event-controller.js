export function createTimelineEventController(getDeps) {
  const current = () => getDeps();

  function buildExpertInformation() {
    const {
      state,
      currentApplicationServiceSortKey,
      filteredAnomalies,
      socketsById
    } = current();
    const rank = { critical: 4, high: 3, medium: 2, low: 1 };
    const map = new Map();
    const socketLookup = socketsById();
    for (const anomaly of filteredAnomalies(state.anomalies)) {
      const socket = socketLookup.get(anomaly.socketId);
      const key = `${anomaly.severity}|${anomaly.metric || "socket"}|${anomaly.title}`;
      if (!map.has(key)) {
        map.set(key, {
          ...anomaly,
          count: 0,
          sockets: [],
          processes: new Set(),
          application: currentApplicationServiceSortKey(socket),
          peers: new Set()
        });
      }
      const item = map.get(key);
      item.count += 1;
      if (!socket) continue;
      item.sockets.push(socket);
      if (socket.details.process?.name) item.processes.add(socket.details.process.name);
      if (socket.peer) item.peers.add(socket.peer);
    }
    return [...map.values()].sort((a, b) =>
      rank[b.severity] - rank[a.severity] ||
      b.count - a.count ||
      a.title.localeCompare(b.title)
    );
  }

  function buildTimelineEvents() {
    const {
      state,
      formatMetricValue,
      metricLabel,
      socketsById,
      thresholdFor,
      thresholdSeverity
    } = current();
    const rank = { critical: 4, high: 3, medium: 2, low: 1 };
    const events = [];
    const rows = state.history || [];
    const selected = socketsById().get(state.selectedId) || state.sockets[0];
    const metrics = ["rto", "rtt", "sendQ", "recvQ", "skmem.d", "skmem.d_rate", "cwnd", "tx_bps", "rx_bps"];
    let previousTimerName = "";
    const prevMetricValue = {};
    for (const row of rows) {
      const timerName = String(row.timerName || "").toLowerCase();
      if (timerName === "persist" && previousTimerName !== "persist") {
        const sendQ = Number(row.sendQ || 0);
        const backoff = Number(row.backoff || 0);
        const expire = Number(row.timerExpireMs || 0);
        events.push({
          epochMs: row.epochMs,
          t: row.t,
          severity: backoff >= 2 || sendQ >= thresholdFor("sendQ").danger ? "critical" : "high",
          metric: "timer",
          title: "TCP persist timer active",
          detail: `timer:(persist${Number.isFinite(expire) && expire > 0 ? `, ${formatMetricValue("rto", expire)}` : ""}) is active: TCP is probing a constrained or closed receive window${sendQ > 0 ? ` while Send-Q is ${formatMetricValue("sendQ", sendQ)}` : ""}.`,
          socketId: selected?.id
        });
      }
      previousTimerName = timerName;
      for (const metric of metrics) {
        const value = Number(row[metric] || 0);
        const severity = thresholdSeverity(metric, value);
        if (severity !== "danger" && severity !== "warn") {
          prevMetricValue[metric] = value;
          continue;
        }
        if (prevMetricValue[metric] === value) continue;
        events.push({
          epochMs: row.epochMs,
          t: row.t,
          severity: severity === "danger" ? "high" : "medium",
          metric,
          title: `${metricLabel(metric)} threshold crossed`,
          detail: `${metricLabel(metric)} reached ${formatMetricValue(metric, value)}${selected ? ` on ${selected.local} -> ${selected.peer}` : ""}.`,
          socketId: selected?.id
        });
        prevMetricValue[metric] = value;
      }
    }
    state.anomalies.slice(0, 80).forEach((anomaly, index) => {
      const row = rows[index % Math.max(1, rows.length)];
      events.push({
        epochMs: row?.epochMs || Date.now(),
        t: row?.t ?? index,
        severity: anomaly.severity,
        metric: anomaly.metric || "socket",
        title: anomaly.title,
        detail: anomaly.detail,
        socketId: anomaly.socketId
      });
    });
    return events
      .sort((a, b) => (a.epochMs || 0) - (b.epochMs || 0) || rank[b.severity] - rank[a.severity])
      .slice(0, 160);
  }

  return {
    buildExpertInformation,
    buildTimelineEvents
  };
}
