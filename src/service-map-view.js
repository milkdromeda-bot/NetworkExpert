export function renderServiceMapView(deps) {
  const {
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
    mapNodeTitle
  } = deps;

  const map = buildServiceMap();
  const ordered = serviceMapConnectivityOrder(map);
  const allNodes = [...ordered.processes, ...ordered.locals, ...ordered.peers];
  if (!allNodes.length) return `<div class="empty">No service map is available for the current filters.</div>`;
  const lanes = [
    { key: "processes", title: "Processes", x: 160, nodes: ordered.processes },
    { key: "locals", title: "Local sockets", x: 520, nodes: ordered.locals },
    { key: "peers", title: "Peers", x: 920, nodes: ordered.peers }
  ];
  const positions = layoutTopologyLanePositions(lanes, { nodeGap: 86 });
  const maxY = Math.max(...Object.values(positions).map(position => position.y));
  const height = Math.max(420, maxY + 104);
  const groupBands = serviceMapGroupBands(lanes, positions);
  const visibleEdges = map.edges.filter(edge => positions[edge.from] && positions[edge.mid] && positions[edge.to]).slice(0, 160);
  const routes = buildServiceMapRoutes(visibleEdges, positions);
  const selectedEdge = visibleEdges.find(edge => edge.id === state.selectedMapEdgeId) || null;
  const hotPaths = [...map.edges].sort((a, b) =>
    riskRank(b.risk) - riskRank(a.risk) ||
    b.anomalies - a.anomalies ||
    b.weight - a.weight
  ).slice(0, 8);
  return `<div class="service-map-workbench">
    <div class="service-map-head">
      <div class="expert-strip">
        <article><span>Processes</span><strong>${formatNumber(map.processes.length)}</strong></article>
        <article><span>Local sockets</span><strong>${formatNumber(map.locals.length)}</strong></article>
        <article><span>Peers</span><strong>${formatNumber(map.peers.length)}</strong></article>
        <article><span>Labels</span><strong>${formatNumber(aliasCountForSource(state.serviceAliases, state.sourceName))}</strong></article>
        <article><span>Mapped flows</span><strong>${formatNumber(visibleEdges.length)}</strong></article>
      </div>
      <div class="service-map-actions">
        <nav class="charts-sub-tabs" style="margin:0;border:0;padding:0">
          <button class="charts-sub-tab ${!state.mapView || state.mapView === "topology" ? "active" : ""}" data-map-view="topology">Topology</button>
          <button class="charts-sub-tab ${state.mapView === "geo" ? "active" : ""}" data-map-view="geo">Geographic</button>
          <button class="charts-sub-tab ${state.mapView === "sankey" ? "active" : ""}" data-map-view="sankey">Flow Sankey</button>
        </nav>
        <button class="service-labels-button topology" type="button" data-topology-open aria-haspopup="dialog"><i class="ri-node-tree"></i> Topology</button>
        <button class="service-labels-button" data-action="serviceAliases"><i class="ri-price-tag-3-line"></i> Labels</button>
      </div>
    </div>
    ${state.mapView !== "insights" ? `<div class="service-map-layout">
      <div class="service-map-canvas">
        ${renderMapLegend()}
        <svg viewBox="0 0 1100 ${height}" role="img" aria-label="Service dependency map">
          <defs>
            <linearGradient id="editButtonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#42e7f2"/>
              <stop offset="48%" stop-color="#1586c5"/>
              <stop offset="100%" stop-color="#12315f"/>
            </linearGradient>
          </defs>
          ${lanes.map(lane => `<text x="${lane.x}" y="28" class="map-lane-title">${escapeHtml(lane.title)}</text>`).join("")}
          ${groupBands.map(band => `<g class="map-group-band ${escapeHtml(band.group.color)}">
            <rect x="${band.x}" y="${band.y}" width="${band.width}" height="${band.height}" rx="14"/>
            <text x="${band.x + 14}" y="${band.labelY}">${escapeHtml(band.group.name)}</text>
          </g>`).join("")}
          ${visibleEdges.map(edge => {
            const color = edge.risk === "critical" ? "#ff5c77" : edge.risk === "high" ? "#ff9f43" : edge.risk === "medium" ? "#ffd166" : "#39d6d6";
            const width = Math.min(5, 1.5 + Math.log10(edge.weight + 1));
            const d = routes.get(edge.id)?.d || "";
            return `<g class="map-link-wrap ${edge.id === state.selectedMapEdgeId ? "selected" : ""} ${edge.risk}" data-map-edge="${escapeHtml(edge.id)}" style="--link-color:${color};--link-width:${width}px;--link-hover-width:${Math.max(width + 2, 5.5)}px">
              <path class="map-link-hit" d="${d}"/>
              <path class="map-link" d="${d}"/>
              <title>${escapeHtml(edge.socket.local)} -> ${escapeHtml(edge.socket.peer)} | ${edge.risk} | ${formatNumber(edge.anomalies)} anomaly signal(s)</title>
            </g>`;
          }).join("")}
          ${lanes.flatMap(lane => lane.nodes.map(node => {
            const p = positions[node.id];
            const isDark = state.prefs.theme !== "light";
            const fill = isDark
              ? (node.risk === "critical" ? "#1a0a10" : node.risk === "high" ? "#1a1008" : node.risk === "medium" ? "#161408" : "#0a1520")
              : (node.risk === "critical" ? "#fff1f3" : node.risk === "high" ? "#fff4e6" : node.risk === "medium" ? "#fffbe6" : "#e8f4fd");
            const stroke = node.risk === "critical" ? "#ff5c77" : node.risk === "high" ? "#ff9f43" : node.risk === "medium" ? "#ffd166" : "#39d6d6";
            const subtitle = nodeSubtitle(node);
            const nodeH = Math.max(48, Math.min(80, 36 + (node.count || 1) * 4));
            return `<g class="map-node ${node.endpoint ? "has-edit" : ""}">
              <rect x="${p.x - 146}" y="${p.y - nodeH / 2}" width="292" height="${nodeH}" rx="8" fill="${fill}" stroke="${stroke}" opacity=".96"/>
              <text x="${p.x - 134}" y="${subtitle ? p.y - 3 : p.y + 5}" class="map-node-label">${escapeHtml(truncateMiddle(nodeLabel(node), 30))}</text>
              ${subtitle ? `<text x="${p.x - 134}" y="${p.y + 14}" class="map-node-subtitle">${escapeHtml(subtitle)}</text>` : ""}
              ${node.endpoint ? `<g class="map-node-edit-action" data-map-alias="${escapeHtml(node.endpoint)}" role="button" tabindex="0" aria-label="Edit ${escapeHtml(node.endpoint)} label">
                <title>Edit service label for ${escapeHtml(node.endpoint)}</title>
                <rect x="${p.x + 96}" y="${p.y - 16}" width="31" height="32" rx="10"/>
                <g class="map-node-edit-glyph" transform="translate(${p.x + 101} ${p.y - 10}) scale(.74)">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                </g>
              </g>` : ""}
              <circle cx="${p.x + 134}" cy="${p.y}" r="5" fill="${stroke}"/>
              <title>${escapeHtml(mapNodeTitle(node))}</title>
            </g>`;
          })).join("")}
        </svg>
      </div>
      ${selectedEdge ? renderMapEdgeInsight(selectedEdge) : renderHotPaths(hotPaths)}
    </div>
  </div>` : ""}
    ${state.mapView === "geo" ? `
      ${(() => { const markers = buildGeoMarkers(state.ipIntel, state.sockets); return markers.length || Object.keys(state.ipIntel).length ? `<div class="panel" style="margin-top:12px"><div class="panel-head"><div class="panel-title">Geographic peer distribution</div></div><div class="panel-body">${renderGeoMapSvg(markers)}</div></div>` : `<div class="panel" style="margin-top:12px"><div class="panel-head"><div class="panel-title">Geographic peer distribution</div></div><div class="panel-body"><p style="color:var(--muted);text-align:center;padding:24px">No geolocated peers — IP intel needs public IPs with country data</p></div></div>`; })()}
    ` : ""}
    ${state.mapView === "sankey" ? `
      <div class="panel" style="margin-top:12px"><div class="panel-head"><div class="panel-title">Flow Sankey — bandwidth proportional <span class="field-info" tabindex="0" style="position:relative"><i class="ri-information-line"></i><span class="field-info-card" role="tooltip" style="left:0;right:auto;min-width:420px"><span class="tooltip-kicker">Flow Sankey — How to read</span><strong>What it shows</strong><p>Each curve connects a process (left) to a remote peer (right). Thickness is proportional to bandwidth (bytes_acked + bytes_received).</p><strong>Colors</strong><p><b style="color:#ff5c77">Red</b> = critical risk (retrans, backoff, drops).<br/><b style="color:#ff9f43">Orange</b> = high risk.<br/><b style="color:#ffd166">Yellow</b> = medium risk.<br/><b style="color:#5db7ff">Blue</b> = normal.</p><strong>Filtering</strong><p>Only the top 15 flows are shown, grouped by peer IP and sorted by risk then bandwidth.</p><strong>Use cases</strong><p>• Identify which peer concentrates the most traffic.<br/>• Spot a single high-risk flow dominating bandwidth.<br/>• Correlate with the Topology view to understand the full path.</p></span></span></div><select id="sankeySortSelect" style="margin-left:auto;font-size:11px"><option value="risk"${state.sankeySort !== "bandwidth" ? " selected" : ""}>Sort: risk first</option><option value="bandwidth"${state.sankeySort === "bandwidth" ? " selected" : ""}>Sort: bandwidth first</option></select></div><div class="panel-body">${renderSankeySvg({ edges: map.edges, nodes: new Map([...map.processes, ...map.locals, ...map.peers].map(n => [n.id, n])) }, { escapeHtml, sortBy: state.sankeySort || "risk" })}</div></div>
    ` : ""}
  </div>`;

}
