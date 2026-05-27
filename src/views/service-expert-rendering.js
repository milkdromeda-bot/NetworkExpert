export function createServiceExpertRendering(ctx) {
  const {
    state,
    icons,
    SERVICE_MAP_SORT_COLLATOR,
    buildServiceMap,
    serviceMapConnectivityOrder,
    layoutTopologyLanePositions,
    serviceMapGroupBands,
    buildServiceMapRoutes,
    riskRank,
    formatNumber,
    aliasCountForSource,
    renderMapLegend,
    escapeHtml,
    renderMapEdgeInsight,
    renderHotPaths,
    buildGeoMarkers,
    renderGeoMapSvg,
    renderSankeySvg,
    nodeSubtitle,
    truncateMiddle,
    nodeLabel,
    mapNodeTitle,
    parsedTimestampSnapshots,
    buildServiceMapData,
    anomaliesBySocketId,
    endpointPresentation,
    topologyGroupForEndpoint,
    socketBandwidth,
    buildExpertInformation,
    buildCorrelationMatrix,
    metricLabel,
    renderServiceMapView
  } = ctx;

function renderServiceMap() {
  return renderServiceMapView({
    state,
    buildServiceMap,
    serviceMapConnectivityOrder,
    layoutTopologyLanePositions,
    serviceMapGroupBands,
    buildServiceMapRoutes,
    riskRank,
    formatNumber,
    aliasCountForSource,
    renderMapLegend,
    escapeHtml,
    renderMapEdgeInsight,
    renderHotPaths,
    buildGeoMarkers,
    renderGeoMapSvg,
    renderSankeySvg,
    nodeSubtitle,
    truncateMiddle,
    nodeLabel,
    mapNodeTitle,
    snapshotCount: parsedTimestampSnapshots().length,
    buildServiceMapForSnapshot: (idx) => {
      const snapshots = parsedTimestampSnapshots();
      if (idx == null || !snapshots[idx]) return null;
      return buildServiceMapData({
        sockets: snapshots[idx].sockets.map(s => ({ ...s, id: s.id || `${s.local}-${s.peer}` })),
        anomalyMap: anomaliesBySocketId(),
        topology: state.topology,
        endpointPresentation,
        topologyGroupForEndpoint,
        riskRank,
        socketBandwidth,
        sortCollator: SERVICE_MAP_SORT_COLLATOR
      });
    }
  });
}

function renderExpertInformation() {
  const items = buildExpertInformation();
  if (!items.length) return `<div class="empty">No expert information matches the current filters.</div>`;
  const corrMatrix = buildCorrelationMatrix();
  return `<div class="expert-workbench">
    ${corrMatrix ? `<details class="correlation-matrix-section" style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:600;font-size:13px"><i class="ri-grid-line"></i> Auto-correlation matrix (Pearson)</summary><div style="overflow-x:auto;margin-top:8px">${corrMatrix}</div></details>` : ""}
    <div class="anomaly-controls">
      <select id="anomalySeverity"><option value="all">all severities</option>${["critical", "high", "medium", "low"].map(v => `<option value="${v}" ${state.anomalyFilters.severity === v ? "selected" : ""}>${v}</option>`).join("")}</select>
      <select id="anomalyMetric"><option value="all">all metrics</option>${[...new Set(state.anomalies.map(item => item.metric).filter(Boolean))].sort().map(v => `<option value="${escapeHtml(v)}" ${state.anomalyFilters.metric === v ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select>
      <select id="anomalySort">${[
        ["priority", "priority"],
        ["metric", "metric"],
        ["title", "title"],
        ["socket", "socket context"]
      ].map(([value, label]) => `<option value="${value}" ${state.anomalyFilters.sort === value ? "selected" : ""}>sort ${label}</option>`).join("")}</select>
      <input id="anomalyText" placeholder="filter expert title, detail, metric..." value="${escapeHtml(state.anomalyFilters.text)}" />
      <span class="hint">${formatNumber(items.length)} grouped expert item(s)</span>
    </div>
    <div class="expert-list">
      ${items.map(item => `<article class="expert-item ${item.severity}">
        <div class="expert-severity"><span class="risk ${item.severity}">${escapeHtml(item.severity)}</span><strong>${formatNumber(item.count)}</strong></div>
        <div>
          <header><strong>${escapeHtml(item.title)}</strong><span class="metric-chip">${escapeHtml(item.metric || "socket")}</span></header>
          <p>${escapeHtml(item.detail)}</p>
          <div class="evidence-row">
            ${item.processes.size ? `<span><i class="ri-cpu-line"></i> ${escapeHtml([...item.processes].slice(0, 4).join(", "))}</span>` : ""}
            ${item.peers.size ? `<span><i class="ri-exchange-line"></i> ${escapeHtml([...item.peers].slice(0, 4).join(", "))}</span>` : ""}
          </div>
        </div>
        <footer>${item.socketId ? `<button data-jump="${escapeHtml(item.socketId)}">${icons.focus} Inspect</button>` : ""}</footer>
      </article>`).join("")}
    </div>
  </div>`;
}

  return { renderServiceMap, renderExpertInformation };
}
