export function createChartsPageRendering(ctx) {
  const {
    state,
    icons,
    html,
    EXPERT_CORRELATIONS,
    escapeHtml,
    chartMetricList,
    alphabeticalMetrics,
    socketsById,
    clampChartColumns,
    hasRealTimestampHistory,
    orderedChartMetrics,
    microburstSummary,
    renderInvestigationContext,
    renderTailLatencyLensPanel,
    renderAdvisorGlobalSummary,
    formatMicroburstWindow,
    formatMetricValue,
    metricLabel,
    renderMetricsStatsTable,
    renderChartMetricTooltip,
    renderChartMoveMenu,
    renderMetricChartLegend
  } = ctx;

function renderChartsPage() {
  const metrics = chartMetricList();
  const metricOptions = alphabeticalMetrics(metrics);
  const selected = socketsById().get(state.selectedId);
  const layout = state.prefs.chartLayout;
  const columns = clampChartColumns(layout.columns);
  const realTimeline = hasRealTimestampHistory();
  const orderedMetrics = orderedChartMetrics();
  const activeCorrelation = EXPERT_CORRELATIONS.find(item => item.x === state.correlation.x && item.y === state.correlation.y);
  const microburst = microburstSummary();
  return html`
    ${state.chartsTab === "advisor" ? `${renderInvestigationContext() || renderTailLatencyLensPanel() || renderAdvisorGlobalSummary()}` : ""}
    ${state.chartsTab === "charts" ? `<section class="panel ${layout.stickyToolbar ? "sticky-chart-panel" : ""}">
      <div class="panel-body">
        ${microburst ? `<div class="investigation-note ${microburst.severity}">
          <b>${escapeHtml(microburst.severity)}</b>
          <span>Microburst window ${escapeHtml(formatMicroburstWindow(microburst))} with RX peak ${escapeHtml(formatMetricValue("rx_bps", microburst.peakRxBps))}, Recv-Q ${escapeHtml(formatMetricValue("recvQ", microburst.peakRecvQ))}, skmem.r ${escapeHtml(formatMetricValue("skmem.r", microburst.peakSkmemR))}, and ${escapeHtml(formatMetricValue("skmem.d", microburst.dropDeltaTotal))} new drops.</span>
        </div>` : ""}
        <div class="metric-picks">
          ${metricOptions.map(m => `<label class="check inline"><input type="checkbox" data-chart-metric="${m}" ${state.chartMetrics.includes(m) ? "checked" : ""}/> ${escapeHtml(metricLabel(m))}</label>`).join("")}
        </div>
      </div>
    </section>

    ${state.metricsView === "table" ? renderMetricsStatsTable(orderedMetrics) : `<section class="chart-grid cols-${columns} density-${layout.density}">
      ${orderedMetrics.map((m, index) => `<div class="panel chart-card ${state.activeChartMetric === m ? "active-chart" : ""}${state.expandedChart === m ? " chart-expanded" : ""}" data-chart-card="${m}">
        ${state.storyMarkerPct != null && (!state.storyMarkerMetric || state.storyMarkerMetric === m) ? `<div class="story-marker-overlay" style="padding-left:${state.storyMarkerPct}%"><div class="story-marker-line"><span class="story-marker-label">${escapeHtml(state.storyMarkerTime || "")} ${escapeHtml((state.storyMarkerLabel || "").slice(0, 20))}</span></div></div>` : ""}
        <div class="panel-head">
          <div class="panel-title chart-title-wrap">
            <span>${escapeHtml(metricLabel(m))}</span>
            ${renderChartMetricTooltip(m)}
          </div>
          <div class="col-tools chart-card-tools">
            <button class="mini" data-action="expandChart" data-metric="${m}" title="${state.expandedChart === m ? "Collapse" : "Expand"}"><i class="${state.expandedChart === m ? "ri-collapse-diagonal-line" : "ri-expand-diagonal-line"}"></i></button>
            <button class="mini" data-chart-zoom="zoomIn" data-chart-zoom-metric="${m}" title="Zoom in">${icons.zoomIn}</button>
            <button class="mini" data-chart-zoom="zoomOut" data-chart-zoom-metric="${m}" title="Zoom out">${icons.zoomOut}</button>
            <button class="mini" data-chart-zoom="resetZoom" data-chart-zoom-metric="${m}" title="Reset zoom">${icons.reset}</button>
            <button class="mini" data-chart-zoom="panLeft" data-chart-zoom-metric="${m}" title="Pan left">${icons.arrowLeft}</button>
            <button class="mini" data-chart-zoom="panRight" data-chart-zoom-metric="${m}" title="Pan right">${icons.arrowRight}</button>
            <button class="mini" data-chart-png="${m}" title="Save as PNG"><i class="ri-image-line"></i></button>
            ${renderChartMoveMenu(m)}
          </div>
        </div>
        <div class="panel-body chart-card-body">
          <svg class="chart small-chart ${layout.density}" data-mini-chart="${m}" tabindex="0" role="img" aria-label="${escapeHtml(metricLabel(m))} chart"></svg>
          <canvas class="chart-minimap" data-minimap="${m}" aria-hidden="true"></canvas>
          ${renderMetricChartLegend(m)}
        </div>
      </div>`).join("")}
    </section>`}
    <section class="panel">
      <div class="panel-head"><div class="panel-title">Correlation between two stats</div></div>
      <div class="panel-body">
        <div class="chart-controls correlation-controls">
          <label class="chart-field">
            <span>Correlation</span>
            <select id="corrPreset">
              <option value="custom" ${activeCorrelation ? "" : "selected"}>Custom</option>
              ${EXPERT_CORRELATIONS.map(item => `<option value="${item.id}" ${activeCorrelation?.id === item.id ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
            </select>
          </label>
          <label class="chart-field">
            <span>X axis</span>
            <select id="corrX">${metricOptions.map(m => `<option value="${m}" ${state.correlation.x === m ? "selected" : ""}>${escapeHtml(metricLabel(m))}</option>`).join("")}</select>
          </label>
          <label class="chart-field">
            <span>Y axis</span>
            <select id="corrY">${metricOptions.map(m => `<option value="${m}" ${state.correlation.y === m ? "selected" : ""}>${escapeHtml(metricLabel(m))}</option>`).join("")}</select>
          </label>
        </div>
        ${activeCorrelation ? `<div class="correlation-advice"><i class="ri-lightbulb-flash-line"></i><div><strong>${escapeHtml(activeCorrelation.label)}</strong><span>${escapeHtml(activeCorrelation.reason)}</span></div></div>` : ""}
        <svg id="correlationChart" class="chart" role="img" aria-label="Correlation"></svg>
        <p class="hint">Each point corresponds to a timestamped snapshot or a local projection. Useful for checking whether RTT, queues, drops, or buffers rise together.</p>
      </div>
    </section>` : ""}
  `;
}

  return { renderChartsPage };
}
