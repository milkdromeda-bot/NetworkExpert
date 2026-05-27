export function createReportExportActions(runtime, getActions) {
  const { state, document, window, fn } = runtime;
  const toast = fn("toast");
  const svgToPngBlob = fn("svgToPngBlob");
  const safeEvidenceFileName = fn("safeEvidenceFileName");
  const buildAnomaliesCsv = fn("buildAnomaliesCsv");
  const buildTopSocketsCsv = fn("buildTopSocketsCsv");
  const buildTimelinePayload = fn("buildTimelinePayload");
  const buildEvidenceManifest = fn("buildEvidenceManifest");
  const downloadBlob = fn("downloadBlob");
  const resolvePlaybook = fn("resolvePlaybook");
  const playbookForHypothesis = fn("playbookForHypothesis");
  const buildComparison = fn("buildComparison");
  const buildBaselineNarrative = fn("buildBaselineNarrative");
  const buildAiSummary = fn("buildAiSummary");
  const generateIncidentReport = fn("generateIncidentReport");
  const cachedStories = fn("cachedStories");
  const cachedMultiSocket = fn("cachedMultiSocket");
  const cachedRateAlerts = fn("cachedRateAlerts");
  const captureQualityReport = fn("captureQualityReport");
  const diagnosticHypotheses = fn("diagnosticHypotheses");
  const cachedRootCauseMatrix = fn("cachedRootCauseMatrix");
  const formatMetricValue = fn("formatMetricValue");
  const formatNumber = fn("formatNumber");
  const resolvedNumberLocale = fn("resolvedNumberLocale");
  const resolvedTimeZone = fn("resolvedTimeZone");
  const selectedSocket = fn("selectedSocket");
  const pickExecutiveFocusSocket = fn("pickExecutiveFocusSocket");
  const tailLatencyLens = fn("tailLatencyLens");
  const guidedChecklistItems = fn("guidedChecklistItems");
  const buildExecutiveSummary = fn("buildExecutiveSummary");
  const formatMicroburstWindow = fn("formatMicroburstWindow");
  const formatTailLatencyWindow = fn("formatTailLatencyWindow");
  const drawPdfTextBlock = fn("drawPdfTextBlock");
  const drawPdfSection = fn("drawPdfSection");
  const metricValue = fn("metricValue");
  const socketsById = fn("socketsById");
  const metricLabel = fn("metricLabel");
  const timeLabel = fn("timeLabel");
  const buildIncidentReportPdfModel = fn("buildIncidentReportPdfModel");
  const visibleHistory = fn("visibleHistory");
  const buildReportChartSvg = (...args) => getActions().buildReportChartSvg(...args);

  async function captureEvidenceChartAssets(captures = []) {
    const assets = [];
    for (let i = 0; i < captures.length; i += 1) {
      const capture = captures[i];
      const width = 1280;
      const height = capture.hero ? 420 : 320;
      const svg = buildReportChartSvg(capture.metric, width, height);
      const pngBlob = await svgToPngBlob(svg, width, height);
      const bytes = new Uint8Array(await pngBlob.arrayBuffer());
      assets.push({ ...capture, width, height, bytes, fileName: `${String(i + 1).padStart(2, "0")}-${safeEvidenceFileName(capture.metric)}.png` });
    }
    return assets;
  }

  function incidentReportPdfDependencies() {
    return {
      PDFLib: globalThis.PDFLib,
      selectedSocket,
      reportVisibleSockets: getActions().reportVisibleSockets,
      reportRelevantAnomalies: getActions().reportRelevantAnomalies,
      pickExecutiveFocusSocket,
      reportAnnotations: getActions().reportAnnotations,
      microburstSummary: fn("microburstSummary"),
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
      reportFilterTokens: getActions().reportFilterTokens,
      reportTopSockets: getActions().reportTopSockets
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
    const captures = getActions().captureIncidentReportCharts(6);
    const chartAssets = await captureEvidenceChartAssets(captures);
    const visibleSockets = getActions().reportVisibleSockets();
    const anomalies = getActions().reportRelevantAnomalies(visibleSockets);
    const socketLookup = Object.fromEntries(state.sockets.map(socket => [socket.id, socket]));
    const annotations = getActions().reportAnnotations(selectedSocket());
    const safeName = safeEvidenceFileName(state.sourceName || "networkexpert");
    const pdfBytes = await buildIncidentReportPdf(chartAssets);
    zip.file("incident-report.pdf", pdfBytes);
    zip.file("incident-report.html", getActions().buildIncidentReportHtml(captures));
    zip.file("anomalies.csv", buildAnomaliesCsv(anomalies, socketLookup, { metricLabel, formatMetricValue }));
    zip.file("top-sockets.csv", buildTopSocketsCsv(getActions().reportTopSockets(visibleSockets, 50), { metricValue, socketBandwidth: fn("socketBandwidth"), formatMetricValue }));
    zip.file("timeline.json", JSON.stringify(buildTimelinePayload(visibleHistory(), { sourceName: state.sourceName, timezone: resolvedTimeZone(), filters: getActions().reportFilterTokens(), annotations }), null, 2));
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
    chartAssets.forEach(asset => chartFolder.file(asset.fileName, asset.bytes));
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
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fix-spikes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("CSV exported", `${results.length} spikes with correlations exported.`);
  }

  function openIncidentReport() {
    if (!state.sockets.length) {
      toast("No data to export", "Import or parse a capture before generating an incident report.", "warn");
      return;
    }
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      toast("Popup blocked", "Allow popups for this app to open the printable incident report.", "danger");
      return;
    }
    reportWindow.document.open();
    reportWindow.document.write(getActions().buildIncidentReportHtml(getActions().captureIncidentReportCharts()));
    reportWindow.document.close();
  }

  return { captureEvidenceChartAssets, incidentReportPdfDependencies, buildIncidentReportPdf, exportEvidencePack, exportIncidentReportHtml, exportFixSpikeCsv, openIncidentReport };
}
