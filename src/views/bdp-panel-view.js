export function createBdpPanelView(ctx) {
  const {
    state,
    icons,
    numberFormatter,
    formatNumber,
    visibleHistory,
    socketsById,
    analyzeBdpWindowLimit,
    normalizeBdpDirection,
    configuredLinkCapacityMbps,
    thresholdFor,
    hasRealTimestampHistory,
    escapeHtml,
    formatBitsPerSecond,
    bdpChartSeries,
    renderChartInfo
  } = ctx;

  function formatBytesHuman(value) {  
    const bytes = Math.max(0, Number(value || 0));  
    if (bytes >= 1024 * 1024) return `${numberFormatter(bytes >= 10 * 1024 * 1024 ? 0 : 1).format(bytes / (1024 * 1024))} MB`;  
    if (bytes >= 1024) return `${numberFormatter(bytes >= 10 * 1024 ? 0 : 1).format(bytes / 1024)} KB`;  
    return `${formatNumber(Math.round(bytes))} B`;  
  }  
    
  function bdpWindowAnalysis(rows = visibleHistory()) {  
    const socket = socketsById().get(state.selectedId) || state.sockets[0] || null;  
    return analyzeBdpWindowLimit(socket, {  
      history: rows,  
      direction: normalizeBdpDirection(state.prefs.bdpDirection),  
      configuredLinkCapacityMbps: configuredLinkCapacityMbps(),  
      recvWarn: thresholdFor("recvQ").warn  
    });  
  }  
    
  function renderBdpSummaryCard(label, value, hint = "") {  
    return `<article class="bdp-summary-card">  
      <span>${escapeHtml(label)}</span>  
      <strong>${escapeHtml(value)}</strong>  
      ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}  
    </article>`;  
  }  
    
  function renderBdpWindowPanel() {  
    if (state._bdpCache && state._bdpCache.version === state.dataVersion && state._bdpCache.direction === state.prefs.bdpDirection && state._bdpCache.selectedId === state.selectedId) return state._bdpCache.html;  
    const socket = socketsById().get(state.selectedId) || state.sockets[0] || null;  
    const hasRealTimeline = hasRealTimestampHistory();  
    const analysis = bdpWindowAnalysis();  
    const stats = analysis.stats || {};  
    const capacityValue = configuredLinkCapacityMbps();  
    const capacityText = capacityValue ? `${capacityValue}` : "";  
    const result = `<section class="panel bdp-window-panel">  
      <div class="panel-head bdp-window-head">  
        <div class="panel-title chart-title-wrap">  
          <span>BDP & Window-Limited Throughput</span>  
          ${renderChartInfo(  
            "BDP & Window-Limited Throughput",  
            "Compares observed socket throughput with the theoretical throughput allowed by the effective TCP window and RTT.",  
            "Capacity is optional. Without configured capacity, this module does not claim the physical line rate."  
          )}  
        </div>  
        <div class="bdp-controls">  
          <label><span>Direction</span><select id="bdpDirectionSelect">  
            <option value="inbound" ${state.prefs.bdpDirection !== "outbound" ? "selected" : ""}>Inbound - bytes_received</option>  
            <option value="outbound" ${state.prefs.bdpDirection === "outbound" ? "selected" : ""}>Outbound - bytes_sent</option>  
          </select></label>  
          <label><span>Capacity</span><select id="bdpCapacityInput"><option value="" ${!capacityValue ? "selected" : ""}>unknown</option><option value="100" ${capacityValue === 100 ? "selected" : ""}>100 Mbps</option><option value="200" ${capacityValue === 200 ? "selected" : ""}>200 Mbps</option><option value="1000" ${capacityValue === 1000 ? "selected" : ""}>1 Gbps</option><option value="10000" ${capacityValue === 10000 ? "selected" : ""}>10 Gbps</option><option value="25000" ${capacityValue === 25000 ? "selected" : ""}>25 Gbps</option><option value="50000" ${capacityValue === 50000 ? "selected" : ""}>50 Gbps</option>${capacityValue && ![100,200,1000,10000,25000,50000].includes(capacityValue) ? `<option value="${capacityValue}" selected>${capacityValue} Mbps</option>` : ""}</select></label>  
        </div>  
      </div>  
      <div class="panel-body">  
        <div class="bdp-context-line ${analysis.status}">  
          <span class="risk ${escapeHtml(analysis.severity)}">${escapeHtml(analysis.severity)}</span>  
          <strong>${escapeHtml(analysis.hypothesis || "informational")}</strong>  
          <em>${escapeHtml(analysis.evidence?.[0] || "capacity unknown; analysis based on observed throughput and TCP window.")}</em>  
        </div>  
        <div class="bdp-summary-grid">  
          ${renderBdpSummaryCard("Socket", socket ? `${socket.local} -> ${socket.peer}` : "none", socket?.details?.process ? `${socket.details.process.name}:${socket.details.process.pid}` : "")}  
          ${renderBdpSummaryCard("Observed peak", stats.peakObservedThroughputBps ? formatBitsPerSecond(stats.peakObservedThroughputBps) : "n/a", `${formatNumber(stats.computableSamples || 0)} computed samples`)}  
          ${renderBdpSummaryCard("Window max peak", stats.peakWindowThroughputBps ? formatBitsPerSecond(stats.peakWindowThroughputBps) : "n/a", "rcv_space x 8 / RTT")}  
          ${renderBdpSummaryCard("Observed BDP peak", stats.peakObservedBdpBytes ? formatBytesHuman(stats.peakObservedBdpBytes) : "n/a", "throughput x RTT")}  
          ${renderBdpSummaryCard("Smallest window", stats.minEffectiveWindowBytes ? formatBytesHuman(stats.minEffectiveWindowBytes) : "n/a", analysis.series?.wscale?.scale != null ? `wscale ${analysis.series.wscale.scale}` : "no wscale")}  
          ${renderBdpSummaryCard("Capacity", capacityValue ? formatBitsPerSecond(capacityValue * 1e6) : "unknown", capacityValue ? "user configured" : "no physical line-rate claim")}  
        </div>  
        ${hasRealTimeline ? `<div class="bdp-chart-toolbar">  
            <button class="mini" data-chart-zoom="zoomIn" data-bdp-zoom title="Zoom in">${icons.zoomIn}</button>  
            <button class="mini" data-chart-zoom="zoomOut" data-bdp-zoom title="Zoom out">${icons.zoomOut}</button>  
            <button class="mini" data-chart-zoom="resetZoom" data-bdp-zoom title="Reset zoom">${icons.reset}</button>  
            <button class="mini" data-chart-zoom="panLeft" data-bdp-zoom title="Pan left">${icons.arrowLeft}</button>  
            <button class="mini" data-chart-zoom="panRight" data-bdp-zoom title="Pan right">${icons.arrowRight}</button>  
          </div>  
          <div class="bdp-chart-grid">  
          <article>  
            <div class="bdp-chart-title"><strong>Window-limited theoretical throughput</strong><span>Mbps over time</span></div>  
            <svg class="chart bdp-chart" data-bdp-chart="throughput" role="img" aria-label="BDP throughput chart"></svg>  
            <div class="bdp-legend" data-bdp-legend="1">  
              ${bdpChartSeries({series: {capacityBps: null}}, "throughput").map(item => `<span data-series-key="${item.key}" style="cursor:pointer;${state.hiddenBdpSeries.has(item.key) ? "opacity:.4;text-decoration:line-through" : ""}"><i style="--legend-color:${item.color}"></i>${escapeHtml(item.label)}</span>`).join("")}  
            </div>  
          </article>  
          <article>  
            <div class="bdp-chart-title"><strong>Observed BDP vs effective window</strong><span>bytes over time</span></div>  
            <svg class="chart bdp-chart" data-bdp-chart="bdp" role="img" aria-label="BDP and window chart"></svg>  
            <div class="bdp-legend" data-bdp-legend="1">  
              ${bdpChartSeries({series: {capacityBps: null}}, "bdp").map(item => `<span data-series-key="${item.key}" style="cursor:pointer;${state.hiddenBdpSeries.has(item.key) ? "opacity:.4;text-decoration:line-through" : ""}"><i style="--legend-color:${item.color}"></i>${escapeHtml(item.label)}</span>`).join("")}  
            </div>  
          </article>  
        </div>` : `<div class="bdp-empty"><strong>Timestamped snapshots required</strong><span>Add timestamp markers before each ss snapshot to compute byte deltas, BDP, and window-limited throughput over time.</span></div>`}  
        <details class="diagnosis-learn-more bdp-learn-more">  
          <summary><i class="ri-book-open-line"></i> What this module can and cannot conclude</summary>  
          <ul>${analysis.learnMore.map(entry => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>  
        </details>  
      </div>  
    </section>`;  
    state._bdpCache = { version: state.dataVersion, direction: state.prefs.bdpDirection, selectedId: state.selectedId, html: result };  
    return result;  
  }

  return { formatBytesHuman, bdpWindowAnalysis, renderBdpSummaryCard, renderBdpWindowPanel };
}
