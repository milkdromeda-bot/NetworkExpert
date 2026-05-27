function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(rows = [], columns = []) {
  const header = columns.map(column => csvEscape(column.label)).join(",");
  const body = rows.map(row => columns.map(column => csvEscape(column.value(row))).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function buildAnomaliesCsv(anomalies = [], socketLookup = {}, helpers = {}) {
  const { metricLabel = metric => metric, formatMetricValue = (_metric, value) => String(value ?? "") } = helpers;
  return buildCsv(anomalies, [
    { label: "severity", value: item => item.severity },
    { label: "title", value: item => item.title },
    { label: "metric", value: item => metricLabel(item.metric || "socket") },
    { label: "detail", value: item => item.detail },
    { label: "flow", value: item => socketLookup[item.socketId] ? `${socketLookup[item.socketId].local} -> ${socketLookup[item.socketId].peer}` : "" },
    { label: "process", value: item => socketLookup[item.socketId]?.details?.process ? `${socketLookup[item.socketId].details.process.name}:${socketLookup[item.socketId].details.process.pid}` : "" },
    { label: "risk", value: item => socketLookup[item.socketId]?.risk || "" },
    { label: "send_q", value: item => socketLookup[item.socketId] ? formatMetricValue("sendQ", socketLookup[item.socketId].sendQ) : "" },
    { label: "recv_q", value: item => socketLookup[item.socketId] ? formatMetricValue("recvQ", socketLookup[item.socketId].recvQ) : "" }
  ]);
}

export function buildTopSocketsCsv(sockets = [], helpers = {}) {
  const { metricValue = (socket, metric) => socket?.[metric] || 0, socketBandwidth = (socket, metric) => socket?.[metric] || 0, formatMetricValue = (_metric, value) => String(value ?? "") } = helpers;
  return buildCsv(sockets, [
    { label: "risk", value: socket => socket.risk },
    { label: "family", value: socket => socket.family },
    { label: "state", value: socket => socket.state },
    { label: "local", value: socket => socket.local },
    { label: "peer", value: socket => socket.peer },
    { label: "process", value: socket => socket.details?.process ? `${socket.details.process.name}:${socket.details.process.pid}` : "" },
    { label: "anomalies", value: socket => socket.anomalyCount || 0 },
    { label: "rtt", value: socket => formatMetricValue("rtt", metricValue(socket, "rtt")) },
    { label: "rto", value: socket => formatMetricValue("rto", metricValue(socket, "rto")) },
    { label: "send_q", value: socket => formatMetricValue("sendQ", socket.sendQ) },
    { label: "recv_q", value: socket => formatMetricValue("recvQ", socket.recvQ) },
    { label: "drops", value: socket => formatMetricValue("skmem.d", metricValue(socket, "skmem.d")) },
    { label: "tx_bps", value: socket => formatMetricValue("tx_bps", socketBandwidth(socket, "tx_bps")) },
    { label: "rx_bps", value: socket => formatMetricValue("rx_bps", socketBandwidth(socket, "rx_bps")) }
  ]);
}

export function buildTimelinePayload(rows = [], meta = {}) {
  return {
    sourceName: meta.sourceName || "",
    timezone: meta.timezone || "UTC",
    filters: meta.filters || [],
    annotations: meta.annotations || [],
    points: rows.map(row => ({ ...row }))
  };
}

export function buildEvidenceManifest(meta = {}) {
  return [
    `NetworkExpert Evidence Pack`,
    `Source: ${meta.sourceName || "unknown"}`,
    `Generated: ${meta.generatedAt || "unknown"}`,
    `Visible sockets: ${meta.visibleSockets ?? 0}`,
    `Anomalies: ${meta.anomalyCount ?? 0}`,
    `Charts: ${meta.chartCount ?? 0}`,
    `Annotations: ${meta.annotationCount ?? 0}`,
    ``,
    `Files`,
    `- incident-report.pdf : portable incident report generated from the current incident snapshot and chart evidence.`,
    `- incident-report.html : browser version of the report, useful for quick review or re-printing.`,
    `- anomalies.csv : anomaly list in current scope.`,
    `- top-sockets.csv : top visible sockets with key metrics.`,
    `- timeline.json : visible timeline samples and annotations.`,
    `- charts/*.png : chart evidence captures.`
  ].join("\n");
}

export function safeEvidenceFileName(value = "artifact") {
  return String(value || "artifact")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "artifact";
}

