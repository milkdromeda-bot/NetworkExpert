export function createReportDataActions(runtime) {
  const { state, APP_VERSION, fn } = runtime;
  const sortedFilteredSockets = fn("sortedFilteredSockets");
  const socketBandwidth = fn("socketBandwidth");
  const metricValue = fn("metricValue");
  const percentile = fn("percentile");
  const severityRank = fn("severityRank");
  const currentSourceAnnotations = fn("currentSourceAnnotations");
  const annotationSocketId = fn("annotationSocketId");
  const buildPrintableIncidentReportHtml = fn("buildPrintableIncidentReportHtml");
  const buildJiraReportModel = fn("buildJiraReportModel");
  const diagnosticHypotheses = fn("diagnosticHypotheses");
  const selectedSocket = fn("selectedSocket");
  const visibleHistory = fn("visibleHistory");
  const microburstSummary = fn("microburstSummary");
  const buildComparison = fn("buildComparison");
  const anomaliesBySocketId = fn("anomaliesBySocketId");
  const metricLabel = fn("metricLabel");
  const socketsById = fn("socketsById");
  const formatNumber = fn("formatNumber");
  const resolvedNumberLocale = fn("resolvedNumberLocale");
  const resolvedTimeZone = fn("resolvedTimeZone");
  const linuxProfileLabel = fn("linuxProfileLabel");
  const accessRoleLabel = fn("accessRoleLabel");
  const escapeHtml = fn("escapeHtml");
  const buildAiSummary = fn("buildAiSummary");
  const buildRootCauseMatrix = fn("buildRootCauseMatrix");
  const cachedStories = fn("cachedStories");
  const cachedMultiSocket = fn("cachedMultiSocket");
  const cachedRateAlerts = fn("cachedRateAlerts");
  const captureQualityReport = fn("captureQualityReport");
  const buildBaselineNarrative = fn("buildBaselineNarrative");
  const formatMetricValue = fn("formatMetricValue");
  const annotationTypeLabel = fn("annotationTypeLabel");
  const timeLabel = fn("timeLabel");
  const formatMicroburstWindow = fn("formatMicroburstWindow");

  function reportVisibleSockets() {
    return sortedFilteredSockets();
  }

  function reportMetricSeries(metric, sockets = reportVisibleSockets()) {
    return sockets
      .map(socket => metric === "tx_bps" || metric === "rx_bps" ? socketBandwidth(socket, metric) : metricValue(socket, metric))
      .filter(value => Number.isFinite(value));
  }

  function reportMetricSummary(metric, sockets = reportVisibleSockets()) {
    const values = reportMetricSeries(metric, sockets).sort((a, b) => a - b);
    if (!values.length) return null;
    return { count: values.length, p50: percentile(values, 50), p90: percentile(values, 90), p99: percentile(values, 99), max: values[values.length - 1] };
  }

  function reportFilterTokens() {
    const filters = state.table.filters || {};
    const tokens = [];
    if (filters.text) tokens.push(`query:${filters.text}`);
    if (filters.risk && filters.risk !== "all") tokens.push(`risk:${filters.risk}`);
    if (filters.state && filters.state !== "all") tokens.push(`state:${filters.state}`);
    if (filters.family && filters.family !== "all") tokens.push(`protocol:${filters.family}`);
    if (filters.process) tokens.push(`process:${filters.process}`);
    if (filters.srcIp) tokens.push(`src ip:${filters.srcIp}`);
    if (filters.dstIp) tokens.push(`dst ip:${filters.dstIp}`);
    if (filters.srcPort) tokens.push(`src port:${filters.srcPort}`);
    if (filters.dstPort) tokens.push(`dst port:${filters.dstPort}`);
    if (filters.minRecvQ) tokens.push(`Recv-Q >= ${filters.minRecvQ}`);
    if (filters.minSendQ) tokens.push(`Send-Q >= ${filters.minSendQ}`);
    if (filters.minRtt) tokens.push(`RTT >= ${filters.minRtt} ms`);
    if (filters.onlyAnomalies) tokens.push("anomalies only");
    return tokens;
  }

  function reportRelevantAnomalies(sockets = reportVisibleSockets()) {
    const ids = new Set(sockets.map(socket => socket.id));
    return state.anomalies
      .filter(item => ids.has(item.socketId))
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.title.localeCompare(b.title));
  }

  function reportTopSockets(sockets = reportVisibleSockets(), limit = 12) {
    return sockets.slice(0, limit);
  }

  function reportPercentileTable(sockets = reportVisibleSockets()) {
    const metrics = ["rtt", "rto", "sendQ", "recvQ", "skmem.d", "tx_bps", "rx_bps"];
    return metrics.map(metric => ({ metric, stats: reportMetricSummary(metric, sockets) })).filter(row => row.stats);
  }

  function reportFindings(limit = 5) {
    return (state.advisorFindings || []).slice(0, limit);
  }

  function reportAnnotations(socket = selectedSocket()) {
    return currentSourceAnnotations(null, socket?.id || annotationSocketId(), visibleHistory());
  }

  function jiraReportDependencies() {
    return { state, reportVisibleSockets, reportRelevantAnomalies, diagnosticHypotheses, reportTopSockets, appVersion: APP_VERSION };
  }

  function buildJiraReport() {
    return buildJiraReportModel(jiraReportDependencies());
  }

  function printableIncidentReportDependencies() {
    return {
      state, reportVisibleSockets, selectedSocket, microburstSummary, reportRelevantAnomalies, reportTopSockets, reportPercentileTable,
      reportFindings, reportAnnotations, reportFilterTokens, buildComparison, anomaliesBySocketId, metricLabel, socketsById, formatNumber,
      resolvedNumberLocale, resolvedTimeZone, linuxProfileLabel, accessRoleLabel, escapeHtml, buildAiSummary, buildRootCauseMatrix,
      cachedStories, cachedMultiSocket, cachedRateAlerts, captureQualityReport, diagnosticHypotheses, buildBaselineNarrative,
      formatMetricValue, metricValue, socketBandwidth, annotationTypeLabel, timeLabel, formatMicroburstWindow
    };
  }

  function buildIncidentReportHtml(chartCaptures = []) {
    return buildPrintableIncidentReportHtml(printableIncidentReportDependencies(), chartCaptures);
  }

  return {
    reportVisibleSockets, reportMetricSeries, reportMetricSummary, reportFilterTokens, reportRelevantAnomalies, reportTopSockets,
    reportPercentileTable, reportFindings, reportAnnotations, jiraReportDependencies, buildJiraReport,
    printableIncidentReportDependencies, buildIncidentReportHtml
  };
}
