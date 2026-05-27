export function createReportActions(getDeps) {
  const current = () => getDeps();
  const call = (name, ...args) => {
    const fn = current()[name];
    if (typeof fn !== "function") throw new Error(`Missing report action dependency: ${name}`);
    return fn(...args);
  };
  const proxiedObject = name => new Proxy({}, {
    get(_target, prop) {
      const source = current()[name] || globalThis[name];
      const value = source?.[prop];
      return typeof value === "function" ? value.bind(source) : value;
    },
    set(_target, prop, value) {
      const source = current()[name] || globalThis[name];
      if (!source) return false;
      source[prop] = value;
      return true;
    },
    has(_target, prop) { return prop in ((current()[name] || globalThis[name]) || {}); },
    ownKeys() { return Reflect.ownKeys((current()[name] || globalThis[name]) || {}); },
    getOwnPropertyDescriptor(_target, prop) {
      const source = (current()[name] || globalThis[name]) || {};
      return Object.getOwnPropertyDescriptor(source, prop) || { configurable: true, enumerable: true, writable: true, value: source[prop] };
    }
  });
  const proxiedValue = name => new Proxy({}, {
    get(_target, prop) {
      const value = current()[name];
      if (prop === Symbol.toPrimitive) return () => value;
      if (prop === "toString") return () => String(value ?? "");
      if (prop === "valueOf") return () => value;
      return value?.[prop];
    }
  });

  const state = proxiedObject("state");
  const document = proxiedObject("document");
  const window = proxiedObject("window");
  const APP_VERSION = proxiedValue("APP_VERSION");
  function metricLabel(...args) { return call("metricLabel", ...args); }
  function toast(...args) { return call("toast", ...args); }
  function visibleHistory(...args) { return call("visibleHistory", ...args); }
  function resolvedTimeZone(...args) { return call("resolvedTimeZone", ...args); }
  function timeLabel(...args) { return call("timeLabel", ...args); }
  function selectedSocket(...args) { return call("selectedSocket", ...args); }
  function anomaliesBySocketId(...args) { return call("anomaliesBySocketId", ...args); }
  function microburstSummary(...args) { return call("microburstSummary", ...args); }
  function formatMicroburstWindow(...args) { return call("formatMicroburstWindow", ...args); }
  function drawChartInto(...args) { return call("drawChartInto", ...args); }
  function sortedFilteredSockets(...args) { return call("sortedFilteredSockets", ...args); }
  function socketBandwidth(...args) { return call("socketBandwidth", ...args); }
  function metricValue(...args) { return call("metricValue", ...args); }
  function percentile(...args) { return call("percentile", ...args); }
  function severityRank(...args) { return call("severityRank", ...args); }
  function currentSourceAnnotations(...args) { return call("currentSourceAnnotations", ...args); }
  function annotationSocketId(...args) { return call("annotationSocketId", ...args); }
  function buildPrintableIncidentReportHtml(...args) { return call("buildPrintableIncidentReportHtml", ...args); }
  function buildIncidentReportPdfModel(...args) { return call("buildIncidentReportPdfModel", ...args); }
  function buildJiraReportModel(...args) { return call("buildJiraReportModel", ...args); }
  function reportChartDataUrl(...args) { return call("reportChartDataUrl", ...args); }
  function svgToPngBlob(...args) { return call("svgToPngBlob", ...args); }
  function safeEvidenceFileName(...args) { return call("safeEvidenceFileName", ...args); }
  function buildAnomaliesCsv(...args) { return call("buildAnomaliesCsv", ...args); }
  function buildTopSocketsCsv(...args) { return call("buildTopSocketsCsv", ...args); }
  function buildTimelinePayload(...args) { return call("buildTimelinePayload", ...args); }
  function buildEvidenceManifest(...args) { return call("buildEvidenceManifest", ...args); }
  function downloadBlob(...args) { return call("downloadBlob", ...args); }
  function resolvePlaybook(...args) { return call("resolvePlaybook", ...args); }
  function playbookForHypothesis(...args) { return call("playbookForHypothesis", ...args); }
  function buildComparison(...args) { return call("buildComparison", ...args); }
  function buildBaselineNarrative(...args) { return call("buildBaselineNarrative", ...args); }
  function buildAiSummary(...args) { return call("buildAiSummary", ...args); }
  function generateIncidentReport(...args) { return call("generateIncidentReport", ...args); }
  function buildRootCauseMatrix(...args) { return call("buildRootCauseMatrix", ...args); }
  function cachedStories(...args) { return call("cachedStories", ...args); }
  function cachedMultiSocket(...args) { return call("cachedMultiSocket", ...args); }
  function cachedRateAlerts(...args) { return call("cachedRateAlerts", ...args); }
  function captureQualityReport(...args) { return call("captureQualityReport", ...args); }
  function diagnosticHypotheses(...args) { return call("diagnosticHypotheses", ...args); }
  function cachedRootCauseMatrix(...args) { return call("cachedRootCauseMatrix", ...args); }
  function formatMetricValue(...args) { return call("formatMetricValue", ...args); }
  function formatNumber(...args) { return call("formatNumber", ...args); }
  function resolvedNumberLocale(...args) { return call("resolvedNumberLocale", ...args); }
  function linuxProfileLabel(...args) { return call("linuxProfileLabel", ...args); }
  function accessRoleLabel(...args) { return call("accessRoleLabel", ...args); }
  function escapeHtml(...args) { return call("escapeHtml", ...args); }
  function annotationTypeLabel(...args) { return call("annotationTypeLabel", ...args); }
  function pickExecutiveFocusSocket(...args) { return call("pickExecutiveFocusSocket", ...args); }
  function tailLatencyLens(...args) { return call("tailLatencyLens", ...args); }
  function guidedChecklistItems(...args) { return call("guidedChecklistItems", ...args); }
  function buildExecutiveSummary(...args) { return call("buildExecutiveSummary", ...args); }
  function formatTailLatencyWindow(...args) { return call("formatTailLatencyWindow", ...args); }
  function socketsById(...args) { return call("socketsById", ...args); }

function exportChartAsPng(svg, metric) {
  const w = svg.clientWidth || 640;
  const h = svg.clientHeight || 300;
  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#05070b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    canvas.toBlob(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${metric || "chart"}-${new Date().toISOString().slice(0, 19).replace(/:/g, "")}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
    toast("Chart exported", `${metricLabel(metric)} saved as PNG.`);
  };
  img.src = url;
}

async function saveChartsPng() {
  const svgs = [...document.querySelectorAll("svg.chart")];
  if (!svgs.length) {
    toast("No chart to save", "Open the Charts tab first.", "warn");
    return;
  }
  const width = Math.max(...svgs.map(svg => svg.clientWidth || 640));
  const gap = 24;
  const heights = svgs.map(svg => svg.clientHeight || 300);
  const totalHeight = heights.reduce((sum, height) => sum + height, 0) + gap * (svgs.length - 1);
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = totalHeight * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  ctx.fillStyle = "#05070b";
  ctx.fillRect(0, 0, width, totalHeight);
  let y = 0;
  for (let i = 0; i < svgs.length; i += 1) {
    const svg = svgs[i];
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    ctx.drawImage(img, 0, y, svg.clientWidth || width, heights[i]);
    URL.revokeObjectURL(url);
    y += heights[i] + gap;
  }
  const png = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  const url = URL.createObjectURL(png);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ultimate-network-expert-charts-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast("Charts exported", "PNG export has been generated.");
}

function reportChartWindowLabel(rows = visibleHistory()) {
  if (!rows.length) return `No visible timeline (${resolvedTimeZone()})`;
  return `${timeLabel(rows[0]?.t || 0, rows[0]?.epochMs)} -> ${timeLabel(rows[rows.length - 1]?.t || 0, rows[rows.length - 1]?.epochMs)} (${resolvedTimeZone()})`;
}

function reportDefaultChartMetrics(limit = 4) {
  const selected = selectedSocket();
  const anomalyMetrics = (selected
    ? anomaliesBySocketId().get(selected.id) || []
    : reportRelevantAnomalies()).map(item => item.metric).filter(Boolean);
  const preferred = [
    state.prefs.graphMetric,
    ...anomalyMetrics,
    "skmem.d",
    "sendQ",
    "recvQ",
    "rtt",
    "rto",
    "rx_bps",
    "tx_bps"
  ];
  return [...new Set(preferred.filter(Boolean))].slice(0, limit);
}

function buildReportChartSvg(metric, width = 760, height = 280) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  drawChartInto(svg, metric, state.prefs.graphStyle === "xy" ? "points" : state.prefs.graphStyle, true);
  return svg;
}

function jiraReportDependencies() {
  return {
    state,
    reportVisibleSockets,
    reportRelevantAnomalies,
    diagnosticHypotheses,
    reportTopSockets,
    appVersion: APP_VERSION
  };
}

function buildJiraReport() {
  return buildJiraReportModel(jiraReportDependencies());
}

function captureIncidentReportCharts(limit = 5) {
  const captures = [];
  const seen = new Set();
  const microburst = microburstSummary();
  const pushCapture = (metric, title, svg, context, hero = false) => {
    if (!metric || !svg || seen.has(metric) || captures.length >= limit) return;
    const image = reportChartDataUrl(svg);
    if (!image) return;
    seen.add(metric);
    captures.push({
      metric,
      title,
      image,
      context,
      hero
    });
  };

  if (state.view === "charts") {
    const heroSvg = document.querySelector("#chart");
    const heroMetric = heroSvg?.dataset.metric || state.prefs.graphMetric;
    if (heroSvg) {
      pushCapture(
        heroMetric,
        `${metricLabel(heroMetric)} overview`,
        heroSvg,
        `${microburst ? `Microburst ${formatMicroburstWindow(microburst)} * ` : ""}Current visible chart window * ${reportChartWindowLabel()}`,
        true
      );
    }
    // Drag & drop chart reorder
  // Chart reorder via move buttons (reliable alternative to drag & drop)
  document.querySelectorAll("[data-chart-move]").forEach(btn => btn.addEventListener("click", () => {
    const metric = btn.dataset.chartMove;
    const dir = btn.dataset.chartMoveDir;
    const metrics = [...(state.prefs.visibleMetrics?.length ? state.prefs.visibleMetrics : state.chartMetrics)];
    const idx = metrics.indexOf(metric);
    if (idx < 0) return;
    const target = dir === "left" ? idx - 1 : idx + 1;
    if (target < 0 || target >= metrics.length) return;
    [metrics[idx], metrics[target]] = [metrics[target], metrics[idx]];
    state.prefs.visibleMetrics = metrics;
    render(); setTimeout(scheduleChartPageDraw, 50);
  }));
  document.querySelectorAll("[data-chart-card]").forEach(card => {
      if (captures.length >= limit) return;
      const metric = card.dataset.chartCard;
      const svg = card.querySelector("[data-mini-chart]");
      pushCapture(metric, metricLabel(metric), svg, `${microburst ? `Microburst ${formatMicroburstWindow(microburst)} * ` : ""}Chart card * ${reportChartWindowLabel()}`);
    });
  }

  reportDefaultChartMetrics(limit).forEach(metric => {
    if (captures.length >= limit || seen.has(metric)) return;
    pushCapture(
      metric,
      `${metricLabel(metric)} snapshot`,
      buildReportChartSvg(metric),
      `${microburst ? `Microburst ${formatMicroburstWindow(microburst)} * ` : ""}Generated from current filtered history * ${reportChartWindowLabel()}`
    );
  });

  return captures;
}

function reportVisibleSockets() {
  return sortedFilteredSockets();
}

function reportMetricSeries(metric, sockets = reportVisibleSockets()) {
  return sockets
    .map(socket => metric === "tx_bps" || metric === "rx_bps"
      ? socketBandwidth(socket, metric)
      : metricValue(socket, metric))
    .filter(value => Number.isFinite(value));
}

function reportMetricSummary(metric, sockets = reportVisibleSockets()) {
  const values = reportMetricSeries(metric, sockets).sort((a, b) => a - b);
  if (!values.length) return null;
  return {
    count: values.length,
    p50: percentile(values, 50),
    p90: percentile(values, 90),
    p99: percentile(values, 99),
    max: values[values.length - 1]
  };
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
  return metrics
    .map(metric => ({ metric, stats: reportMetricSummary(metric, sockets) }))
    .filter(row => row.stats);
}

function reportFindings(limit = 5) {
  return (state.advisorFindings || []).slice(0, limit);
}

function reportAnnotations(socket = selectedSocket()) {
  return currentSourceAnnotations(null, socket?.id || annotationSocketId(), visibleHistory());
}

function printableIncidentReportDependencies() {
  return {
    state,
    reportVisibleSockets,
    selectedSocket,
    microburstSummary,
    reportRelevantAnomalies,
    reportTopSockets,
    reportPercentileTable,
    reportFindings,
    reportAnnotations,
    reportFilterTokens,
    buildComparison,
    anomaliesBySocketId,
    metricLabel,
    socketsById,
    formatNumber,
    resolvedNumberLocale,
    resolvedTimeZone,
    linuxProfileLabel,
    accessRoleLabel,
    escapeHtml,
    buildAiSummary,
    buildRootCauseMatrix,
    cachedStories,
    cachedMultiSocket,
    cachedRateAlerts,
    captureQualityReport,
    diagnosticHypotheses,
    buildBaselineNarrative,
    formatMetricValue,
    metricValue,
    socketBandwidth,
    annotationTypeLabel,
    timeLabel,
    formatMicroburstWindow
  };
}

function buildIncidentReportHtml(chartCaptures = []) {
  return buildPrintableIncidentReportHtml(printableIncidentReportDependencies(), chartCaptures);
}


async function captureEvidenceChartAssets(captures = []) {
  const assets = [];
  for (let i = 0; i < captures.length; i += 1) {
    const capture = captures[i];
    const width = 1280;
    const height = capture.hero ? 420 : 320;
    const svg = buildReportChartSvg(capture.metric, width, height);
    const pngBlob = await svgToPngBlob(svg, width, height);
    const bytes = new Uint8Array(await pngBlob.arrayBuffer());
    assets.push({
      ...capture,
      width,
      height,
      bytes,
      fileName: `${String(i + 1).padStart(2, "0")}-${safeEvidenceFileName(capture.metric)}.png`
    });
  }
  return assets;
}

function incidentReportPdfDependencies() {
  return {
    PDFLib: globalThis.PDFLib,
    selectedSocket,
    reportVisibleSockets,
    reportRelevantAnomalies,
    pickExecutiveFocusSocket,
    reportAnnotations,
    microburstSummary,
    tailLatencyLens,
    guidedChecklistItems,
    state,
    buildExecutiveSummary,
    formatMicroburstWindow,
    formatTailLatencyWindow,
    formatMetricValue,
    resolvedNumberLocale,
    resolvedTimeZone,
    formatNumber,
    drawPdfTextBlock,
    drawPdfSection,
    metricValue,
    socketsById,
    metricLabel,
    timeLabel,
    reportFilterTokens,
    reportTopSockets
  };
}

async function buildIncidentReportPdf(chartAssets = []) {
  return buildIncidentReportPdfModel(chartAssets, incidentReportPdfDependencies());
}

async function exportEvidencePack() {
  if (!state.sockets.length) {
    toast("No data to export", "Import or parse a capture before generating an evidence pack.", "warn");
    return;
  }
  if (typeof JSZip === "undefined") {
    toast("ZIP helper missing", "JSZip is not available in this browser session.", "danger");
    return;
  }
  if (typeof PDFLib === "undefined") {
    toast("PDF engine missing", "pdf-lib is not available in this browser session.", "danger");
    return;
  }
  const zip = new JSZip();
  const captures = captureIncidentReportCharts(6);
  const chartAssets = await captureEvidenceChartAssets(captures);
  const visibleSockets = reportVisibleSockets();
  const anomalies = reportRelevantAnomalies(visibleSockets);
  const socketLookup = Object.fromEntries(state.sockets.map(socket => [socket.id, socket]));
  const annotations = reportAnnotations(selectedSocket());
  const safeName = safeEvidenceFileName(state.sourceName || "networkexpert");
  const pdfBytes = await buildIncidentReportPdf(chartAssets);
  zip.file("incident-report.pdf", pdfBytes);
  zip.file("incident-report.html", buildIncidentReportHtml(captures));
  zip.file("anomalies.csv", buildAnomaliesCsv(anomalies, socketLookup, { metricLabel, formatMetricValue }));
  zip.file("top-sockets.csv", buildTopSocketsCsv(reportTopSockets(visibleSockets, 50), { metricValue, socketBandwidth, formatMetricValue }));
  zip.file("timeline.json", JSON.stringify(buildTimelinePayload(visibleHistory(), { sourceName: state.sourceName, timezone: resolvedTimeZone(), filters: reportFilterTokens(), annotations }), null, 2));
  zip.file("annotations.json", JSON.stringify(annotations, null, 2));
  zip.file("README.txt", buildEvidenceManifest({
    sourceName: state.sourceName,
    generatedAt: new Date().toLocaleString(resolvedNumberLocale(), { timeZone: resolvedTimeZone() }),
    visibleSockets: visibleSockets.length,
    anomalyCount: anomalies.length,
    chartCount: chartAssets.length,
    annotationCount: annotations.length
  }));
  const chartFolder = zip.folder("charts");
  chartAssets.forEach(asset => {
    chartFolder.file(asset.fileName, asset.bytes);
  });
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${safeName}-evidence-pack.zip`);
  toast("Evidence pack exported", "ZIP downloaded with PDF report, HTML report, anomalies, sockets, timeline, annotations, and chart PNGs.");
}
function exportIncidentReportHtml() {
  const quality = captureQualityReport();
  const hyps = diagnosticHypotheses();
  const matrixData = cachedRootCauseMatrix();
  const storiesData = cachedStories();
  const multiData = cachedMultiSocket();
  const rateData = cachedRateAlerts();
  const topHyp = hyps[0];
  const pb = topHyp ? resolvePlaybook(playbookForHypothesis(topHyp.id), state.sockets.find(s => s.id === topHyp.topSocketId)) : null;
  const narrativeData = state.baseline ? buildBaselineNarrative(buildComparison(), state.baseline.anomalies || [], state.anomalies) : null;
  const summaryText = buildAiSummary({ matrix: matrixData, stories: storiesData, multiSocket: multiData, rateAlerts: rateData, captureQuality: quality, hypotheses: hyps, comparison: narrativeData });
  const html = generateIncidentReport({ sourceName: state.sourceName, captureQuality: quality, matrix: matrixData, hypotheses: hyps, stories: storiesData, multiSocket: multiData, rateAlerts: rateData, playbook: pb, comparison: narrativeData, aiSummary: summaryText, theme: state.prefs.theme || "dark", fixLatency: state.fixLatency.correlation?.summary ? { summary: state.fixLatency.correlation.summary, topSpikes: state.fixLatency.correlation.results?.slice(0, 10) } : null, jvmGc: state.jvmGc.correlation?.summary ? { summary: state.jvmGc.correlation.summary, analysisWindow: state.jvmGc.analysisWindow } : null });
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `incident-report-${state.sourceName.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Report exported", "Standalone HTML incident report downloaded.");
}

function exportFixSpikeCsv() {
  const results = state.fixLatency.correlation?.results;
  if (!results?.length) { toast("No FIX data", "Load FIX logs first.", "warn"); return; }
  const header = "timestamp,lag_ms,direction,msgType,symbol,sender,target,endpoint,thread,score,severity,cause,signals,endpoint_matched";
  const rows = results.map(r => [new Date(r.receiveMs).toISOString(), r.lagMs.toFixed(1), r.direction, r.msgType, r.symbol, r.sender, r.target, r.endpoint, r.thread, r.score.toFixed(3), r.severity, r.cause || "", `"${(r.signals || []).join(";")}"`, r.endpointMatched ? "yes" : "no"].join(","));
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `fix-spikes-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(a.href);
  toast("CSV exported", `${results.length} spikes with correlations exported.`);
}

function openIncidentReport() {
  if (!state.sockets.length) {
    toast("No data to export", "Import or parse a capture before generating an incident report.", "warn");
    return;
  }
  const chartCaptures = captureIncidentReportCharts();
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    toast("Popup blocked", "Allow popups for this app to open the printable incident report.", "danger");
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(buildIncidentReportHtml(chartCaptures));
  reportWindow.document.close();
}


  return {
    exportChartAsPng,
    saveChartsPng,
    reportChartWindowLabel,
    reportDefaultChartMetrics,
    buildReportChartSvg,
    jiraReportDependencies,
    buildJiraReport,
    captureIncidentReportCharts,
    reportVisibleSockets,
    reportMetricSeries,
    reportMetricSummary,
    reportFilterTokens,
    reportRelevantAnomalies,
    reportTopSockets,
    reportPercentileTable,
    reportFindings,
    reportAnnotations,
    printableIncidentReportDependencies,
    buildIncidentReportHtml,
    captureEvidenceChartAssets,
    incidentReportPdfDependencies,
    buildIncidentReportPdf,
    exportEvidencePack,
    exportIncidentReportHtml,
    exportFixSpikeCsv,
    openIncidentReport
  };
}
