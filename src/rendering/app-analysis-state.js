export function createAppAnalysisState(getDeps) {
  const current = () => getDeps();
  let cachedDiagVersion = -1;
  let cachedDiagHypotheses = [];
  let cachedMatrixVersion = -1;
  let cachedMatrix = null;
  let cwndPhasesCacheVersion = -1;
  let cwndPhasesCache = null;
  let sparklineVersion = -1;

  function renderTailLatencyLensPanel() {
    const { escapeHtml, formatMetricValue, formatTailLatencyWindow, hasRealTimestampHistory, icons, tailLatencyLens } = current();
    const lens = tailLatencyLens();
    if (!hasRealTimestampHistory() || !lens) return "";
    const rttStats = lens.stats.rtt;
    const rtoStats = lens.stats.rto;
    return `<section class="tail-latency-lens">
    <article class="tail-lens-card ${lens.severity}">
      <div class="tail-lens-head">
        <div>
          <span class="tooltip-kicker">Tail latency lens</span>
          <strong>${escapeHtml(lens.suspicion)}</strong>
          <p class="hint">This lens prioritizes extremes and short worst windows instead of averages, so the investigation can jump directly to the sharpest RTT/RTO tail behavior.</p>
        </div>
        <div class="tail-lens-actions">
          <span class="risk ${escapeHtml(lens.severity)}">${escapeHtml(lens.severity)}</span>
          <button data-action="zoomTailWindow">${icons.zoomIn} Zoom worst window</button>
        </div>
      </div>
      <div class="tail-lens-grid">
        <article><span>Worst window</span><strong>${escapeHtml(formatTailLatencyWindow(lens))}</strong></article>
        <article><span>RTT tail</span><strong>${escapeHtml(`${formatMetricValue("rtt", rttStats?.p99 || 0)} / ${formatMetricValue("rtt", rttStats?.p999 || 0)}`)}</strong><small>P99 / P99.9</small></article>
        <article><span>RTO tail</span><strong>${escapeHtml(`${formatMetricValue("rto", rtoStats?.p99 || 0)} / ${formatMetricValue("rto", rtoStats?.p999 || 0)}`)}</strong><small>P99 / P99.9</small></article>
        <article><span>Worst peaks</span><strong>${escapeHtml(`${formatMetricValue("rtt", lens.peaks.rtt)} RTT * ${formatMetricValue("rto", lens.peaks.rto)} RTO`)}</strong><small>${escapeHtml(`${formatMetricValue("recvQ", lens.peaks.recvQ)} Recv-Q * ${formatMetricValue("sendQ", lens.peaks.sendQ)} Send-Q`)}</small></article>
      </div>
    </article>
  </section>`;
  }

  function captureQualityReport() {
    const { analyzeCaptureQuality, state } = current();
    return analyzeCaptureQuality({
      raw: state.raw,
      sockets: state.sockets,
      sourceName: state.sourceName,
      command: state.command
    });
  }

  function renderCaptureQualityReport() {
    const { escapeHtml, formatNumber, icons, numberFormatterWith, renderCaptureQualityReportView } = current();
    return renderCaptureQualityReportView(captureQualityReport(), {
      escapeHtml,
      formatNumber,
      numberFormatterWith,
      icons
    });
  }

  function diagnosticHypotheses() {
    const { buildDiagnosticHypotheses, configuredLinkCapacityMbps, normalizeBdpDirection, sortedFilteredSockets, state, thresholdFor } = current();
    if (cachedDiagVersion === state.dataVersion) return cachedDiagHypotheses;
    const rows = sortedFilteredSockets();
    const hypotheses = buildDiagnosticHypotheses({
      sockets: rows.length ? rows : state.sockets,
      anomalies: state.anomalies,
      history: state.history,
      thresholds: thresholdFor,
      bdpWindow: {
        direction: normalizeBdpDirection(state.prefs.bdpDirection),
        configuredLinkCapacityMbps: configuredLinkCapacityMbps()
      }
    }).slice(0, 8);
    const quality = captureQualityReport();
    const qualityScore = quality.score || 0;
    if (qualityScore < 55) {
      const cap = qualityScore < 35 ? 0.3 : 0.5;
      for (const h of hypotheses) {
        if (h.confidenceScore > cap) {
          h.confidenceScore = cap;
          h.confidenceCapped = true;
          h.confidenceCapReason = qualityScore < 35 ? `Capped at ${Math.round(cap * 100)}% - capture quality is ${quality.grade} (${qualityScore}/100)` : `Capped at ${Math.round(cap * 100)}% - capture quality is only ${quality.grade} (${qualityScore}/100). Need stronger evidence.`;
        }
      }
    }
    cachedDiagVersion = state.dataVersion;
    cachedDiagHypotheses = hypotheses;
    return hypotheses;
  }

  function cachedRootCauseMatrix() {
    const { buildRootCauseMatrix, state } = current();
    if (cachedMatrixVersion === state.dataVersion && cachedMatrix) return cachedMatrix;
    cachedMatrixVersion = state.dataVersion;
    cachedMatrix = buildRootCauseMatrix(state.sockets);
    return cachedMatrix;
  }

  function cachedCwndPhases() {
    const { detectCwndPhases, state } = current();
    const key = `${state.dataVersion}|${state.selectedId}`;
    if (cwndPhasesCacheVersion === key && cwndPhasesCache) return cwndPhasesCache;
    cwndPhasesCacheVersion = key;
    cwndPhasesCache = detectCwndPhases(state.history);
    return cwndPhasesCache;
  }

  function lazySparklineIndex() {
    const { buildSparklineIndex, hasRealTimestampHistory, metricValue, parsedTimestampSnapshots, socketIdentityKey, state } = current();
    if (state.sparklineIndex && sparklineVersion === state.dataVersion) return state.sparklineIndex;
    if (!hasRealTimestampHistory()) return null;
    const snapshots = parsedTimestampSnapshots();
    if (snapshots.length < 3 || snapshots.length > 300) return null;
    sparklineVersion = state.dataVersion;
    state.sparklineIndex = buildSparklineIndex(snapshots, socketIdentityKey, metricValue);
    return state.sparklineIndex;
  }

  return {
    cachedCwndPhases,
    cachedRootCauseMatrix,
    captureQualityReport,
    diagnosticHypotheses,
    lazySparklineIndex,
    renderCaptureQualityReport,
    renderTailLatencyLensPanel
  };
}
