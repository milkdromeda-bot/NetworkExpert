export function createFocusViewController(getDeps) {
  const current = () => getDeps();

  function renderFocusView() {
    const { chartMetricList, escapeHtml, icons, metricLabel, socketsById, state, visibleHistory } = current();
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
    return `<section class="panel focus-panel">
    <div class="panel-head">
      <div class="panel-title"><i class="ri-focus-3-line"></i> Focus - ${escapeHtml(selected.local)} -> ${escapeHtml(selected.peer)}</div>
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
        ${activeMetrics.map(metric => `<div class="focus-chart-card chart-card" data-chart-card="${metric}"><div class="focus-chart-label">${escapeHtml(metricLabel(metric))}</div><svg class="chart small-chart focus-chart" data-mini-chart="${metric}" tabindex="0" role="img" aria-label="${escapeHtml(metricLabel(metric))}"></svg></div>`).join("")}
      </div>
    </div>
  </section>`;
  }

  return {
    renderFocusView
  };
}
