export function createFocusViewController(getDeps) {
  const current = () => getDeps();

  function computeQuartiles(history, metric) {
    const { percentile } = current();
    const values = history
      .map(row => Number(row?.[metric]))
      .filter(v => Number.isFinite(v) && v !== 0);
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return {
      p25: percentile(sorted, 0.25),
      median: percentile(sorted, 0.5),
      p75: percentile(sorted, 0.75),
      max: sorted[sorted.length - 1]
    };
  }

  function renderQuartileTable(metric, history) {
    const { escapeHtml, formatMetricValue } = current();
    const q = computeQuartiles(history, metric);
    if (!q) return "";
    return `<table class="focus-quartile-table">
      <thead><tr><th>P25</th><th>Median</th><th>P75</th><th>Max</th></tr></thead>
      <tbody><tr><td>${escapeHtml(formatMetricValue(metric, q.p25))}</td><td>${escapeHtml(formatMetricValue(metric, q.median))}</td><td>${escapeHtml(formatMetricValue(metric, q.p75))}</td><td>${escapeHtml(formatMetricValue(metric, q.max))}</td></tr></tbody>
    </table>`;
  }

  function renderFocusView() {
    const { chartMetricList, currentAliasForEndpoint, escapeHtml, icons, metricLabel, socketsById, state, visibleHistory } = current();
    const selected = socketsById().get(state.selectedId);
    if (!selected) return `<section class="panel"><div class="panel-body"><p class="empty">Select a socket from the table to enter focus mode.</p></div></section>`;
    const history = visibleHistory();
    const activeMetrics = chartMetricList().filter(metric => {
      return history.some(row => {
        const value = Number(row?.[metric]);
        return Number.isFinite(value) && value !== 0;
      });
    });
    if (!activeMetrics.length) return `<section class="panel"><div class="panel-body"><p class="empty">No metric data available for this socket.</p></div></section>`;

    // Resolve service labels for local and peer
    const localAlias = currentAliasForEndpoint ? currentAliasForEndpoint(selected.local) : null;
    const peerAlias = currentAliasForEndpoint ? currentAliasForEndpoint(selected.peer) : null;
    const localDisplay = localAlias?.label
      ? `<strong title="${escapeHtml(selected.local)}">${escapeHtml(localAlias.label)}</strong>${localAlias.role ? ` <em>${escapeHtml(localAlias.role)}</em>` : ""} <small>${escapeHtml(selected.local)}</small>`
      : escapeHtml(selected.local);
    const peerDisplay = peerAlias?.label
      ? `<strong title="${escapeHtml(selected.peer)}">${escapeHtml(peerAlias.label)}</strong>${peerAlias.role ? ` <em>${escapeHtml(peerAlias.role)}</em>` : ""} <small>${escapeHtml(selected.peer)}</small>`
      : escapeHtml(selected.peer);

    return `<section class="panel focus-panel">
    <div class="panel-head">
      <div class="panel-title"><i class="ri-focus-3-line"></i> Focus - ${localDisplay} -> ${peerDisplay}</div>
      <div class="col-tools">
        <button class="mini" data-chart-zoom="zoomIn" title="Zoom in">${icons.zoomIn}</button>
        <button class="mini" data-chart-zoom="zoomOut" title="Zoom out">${icons.zoomOut}</button>
        <button class="mini" data-chart-zoom="resetZoom" title="Reset zoom">${icons.reset}</button>
        <button class="mini" data-chart-zoom="panLeft" title="Pan left">${icons.arrowLeft}</button>
        <button class="mini" data-chart-zoom="panRight" title="Pan right">${icons.arrowRight}</button>
      </div>
    </div>
    <div class="panel-body">
      <div class="focus-grid">
        ${activeMetrics.map(metric => `<div class="focus-chart-card chart-card" data-chart-card="${metric}">
          <div class="focus-chart-header">
            <div class="focus-chart-label">${escapeHtml(metricLabel(metric))} <code class="focus-metric-key">${escapeHtml(metric)}</code></div>
            ${renderQuartileTable(metric, history)}
          </div>
          <svg class="chart small-chart focus-chart" data-mini-chart="${metric}" tabindex="0" role="img" aria-label="${escapeHtml(metricLabel(metric))}"></svg>
        </div>`).join("")}
      </div>
    </div>
  </section>`;
  }

  return {
    renderFocusView
  };
}
