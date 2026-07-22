export function createFocusViewController(getDeps) {
  const current = () => getDeps();

  const METRIC_GROUPS = [
    { id: "latency", label: "Latency", metrics: ["rtt", "rttvar", "rcv_rtt", "rto", "ato"] },
    { id: "throughput", label: "Throughput", metrics: ["tx_bps", "rx_bps", "delivery_rate", "pacing_rate"] },
    { id: "queuing", label: "Queuing & Buffers", metrics: ["sendQ", "recvQ", "cwnd", "rcv_space", "rcv_ssthresh", "skmem.rb", "skmem.t"] },
    { id: "counters", label: "Counters", metrics: ["bytes_sent", "bytes_acked", "bytes_received", "segs_out", "segs_in", "skmem.d"] }
  ];

  function groupedMetrics(activeMetrics) {
    const grouped = [];
    const placed = new Set();
    for (const group of METRIC_GROUPS) {
      const members = group.metrics.filter(m => activeMetrics.includes(m));
      if (members.length) {
        grouped.push({ label: group.label, metrics: members });
        members.forEach(m => placed.add(m));
      }
    }
    const remaining = activeMetrics.filter(m => !placed.has(m));
    if (remaining.length) grouped.push({ label: "Other", metrics: remaining });
    return grouped;
  }

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
      p99: percentile(sorted, 0.99),
      p999: percentile(sorted, 0.999),
      max: sorted[sorted.length - 1]
    };
  }

  function renderQuartileTable(metric, history) {
    const { escapeHtml, formatMetricValue } = current();
    const q = computeQuartiles(history, metric);
    if (!q) return `<div class="focus-quartile-table"></div>`;
    return `<div class="focus-quartile-table"><table>
      <tr><th>P25</th><td>${escapeHtml(formatMetricValue(metric, q.p25))}</td></tr>
      <tr><th>MED</th><td>${escapeHtml(formatMetricValue(metric, q.median))}</td></tr>
      <tr><th>P75</th><td>${escapeHtml(formatMetricValue(metric, q.p75))}</td></tr>
      <tr><th>P99</th><td>${escapeHtml(formatMetricValue(metric, q.p99))}</td></tr>
      <tr><th>P99.9</th><td>${escapeHtml(formatMetricValue(metric, q.p999))}</td></tr>
      <tr><th>MAX</th><td>${escapeHtml(formatMetricValue(metric, q.max))}</td></tr>
    </table></div>`;
  }

  function renderFocusView() {
    const { chartMetricList, currentAliasForEndpoint, escapeHtml, icons, metricLabel, socketsById, sortedFilteredSockets, state, visibleHistory } = current();
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

    // Socket picker
    const allSockets = sortedFilteredSockets ? sortedFilteredSockets() : [...socketsById().values()];
    const socketIndex = allSockets.findIndex(s => s.id === state.selectedId);
    const hasPrev = socketIndex > 0;
    const hasNext = socketIndex < allSockets.length - 1;
    const socketOptions = allSockets.map(s => {
      const la = currentAliasForEndpoint ? currentAliasForEndpoint(s.local) : null;
      const pa = currentAliasForEndpoint ? currentAliasForEndpoint(s.peer) : null;
      const label = (la?.label || s.local) + " → " + (pa?.label || s.peer);
      return `<option value="${escapeHtml(s.id)}" ${s.id === state.selectedId ? "selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("");

    return `<section class="panel focus-panel">
    <div class="panel-head">
      <div class="panel-title"><i class="ri-focus-3-line"></i> Focus - ${localDisplay} -> ${peerDisplay}</div>
      <div class="col-tools">
        <button class="mini" data-focus-prev title="Previous socket" ${hasPrev ? "" : "disabled"}>${icons.arrowLeft}</button>
        <select class="focus-socket-picker" data-focus-socket-select title="Switch socket">${socketOptions}</select>
        <button class="mini" data-focus-next title="Next socket" ${hasNext ? "" : "disabled"}>${icons.arrowRight}</button>
        <span class="focus-separator"></span>
        <button class="mini" data-chart-zoom="zoomIn" title="Zoom in">${icons.zoomIn}</button>
        <button class="mini" data-chart-zoom="zoomOut" title="Zoom out">${icons.zoomOut}</button>
        <button class="mini" data-chart-zoom="resetZoom" title="Reset zoom">${icons.reset}</button>
        <button class="mini" data-chart-zoom="panLeft" title="Pan left">${icons.arrowLeft}</button>
        <button class="mini" data-chart-zoom="panRight" title="Pan right">${icons.arrowRight}</button>
      </div>
    </div>
    <div class="panel-body">
      <div class="focus-grid">
        ${groupedMetrics(activeMetrics).map(group => `<div class="focus-group">
          <div class="focus-group-label">${escapeHtml(group.label)}</div>
          ${group.metrics.map(metric => `<div class="focus-chart-card chart-card" data-chart-card="${metric}">
          <div class="focus-chart-label">${escapeHtml(metricLabel(metric))} <code class="focus-metric-key">${escapeHtml(metric)}</code></div>
          <div class="focus-chart-row">
            <svg class="chart small-chart focus-chart" data-mini-chart="${metric}" tabindex="0" role="img" aria-label="${escapeHtml(metricLabel(metric))}"></svg>
            ${renderQuartileTable(metric, history)}
          </div>
        </div>`).join("")}
        </div>`).join("")}
      </div>
    </div>
  </section>`;
  }

  return {
    renderFocusView
  };
}
