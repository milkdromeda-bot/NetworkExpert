export function createServiceMapPresenter(getDeps) {
  const current = () => getDeps();

  function currentAliasForEndpoint(endpoint, options = {}) {
    const { aliasForEndpoint, state } = current();
    return aliasForEndpoint(state.serviceAliases, endpoint, state.sourceName, options);
  }

  function currentAliasDisplay(endpoint, options = {}) {
    const { aliasDisplay, state } = current();
    return aliasDisplay(endpoint, state.serviceAliases, state.sourceName, options);
  }

  function endpointPresentation(endpoint) {
    const alias = currentAliasForEndpoint(endpoint);
    return {
      endpoint,
      label: alias?.label || endpoint,
      role: alias?.role || "",
      note: alias?.note || "",
      alias
    };
  }

  function nodeLabel(node) {
    return node.alias?.label || node.label;
  }

  function nodeSubtitle(node) {
    const { formatNumber } = current();
    if (node.kind === "process") return `${formatNumber(node.count)} socket(s)`;
    return node.alias?.label ? node.endpoint : "";
  }

  function serviceMapGroupBands(lanes, positions) {
    const bands = [];
    for (const lane of lanes.filter(item => item.key !== "processes")) {
      let run = null;
      const closeRun = () => {
        if (!run) return;
        const ys = run.nodes.map(node => positions[node.id]?.y).filter(Number.isFinite);
        if (ys.length) {
          const top = Math.min(...ys) - 60;
          const bottom = Math.max(...ys) + 42;
          bands.push({ group: run.group, x: lane.x - 166, y: top, width: 332, height: bottom - top, labelY: top + 26 });
        }
        run = null;
      };
      for (const node of lane.nodes) {
        const group = node.topologyGroup;
        if (!group) {
          closeRun();
          continue;
        }
        if (!run || run.group.id !== group.id) {
          closeRun();
          run = { group, nodes: [] };
        }
        run.nodes.push(node);
      }
      closeRun();
    }
    return bands;
  }

  function renderMapLegend() {
    return `<div class="map-legend" aria-label="Map legend">
    <span><i class="legend-line low"></i> normal</span>
    <span><i class="legend-line high"></i> high risk</span>
    <span><i class="legend-line critical"></i> critical</span>
    <span><i class="legend-box"></i> topology group</span>
    <span><i class="legend-dot"></i> editable endpoint</span>
  </div>`;
  }

  function edgeAnomalies(edge) {
    const { severityRank, state } = current();
    return state.anomalies
      .filter(anomaly => anomaly.socketId === edge.socket.id)
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  }

  function renderHotPaths(hotPaths) {
    const { escapeHtml, formatMetricValue, formatNumber, metricValue } = current();
    return `<aside class="map-side-panel hot-paths">
    <strong>Hot paths</strong>
    ${hotPaths.map(edge => {
      const peerAlias = currentAliasForEndpoint(edge.socket.peer);
      return `<article class="hot-path ${edge.risk}" data-socket="${escapeHtml(edge.socket.id)}">
      <span class="risk ${edge.risk}">${escapeHtml(edge.risk)}</span>
      <p>${escapeHtml(edge.socket.details.process?.name || "unknown")} -> ${escapeHtml(currentAliasDisplay(edge.socket.peer))}</p>
      ${peerAlias?.role ? `<em>${escapeHtml(peerAlias.role)}</em>` : ""}
      <small>${formatNumber(edge.anomalies)} anomaly signal(s), Send-Q ${formatMetricValue("sendQ", edge.socket.sendQ)}, RTT ${formatMetricValue("rtt", metricValue(edge.socket, "rtt"))}</small>
    </article>`;
    }).join("")}
  </aside>`;
  }

  function renderMapEdgeInsight(edge) {
    const { escapeHtml, formatMetricValue, formatNumber, icons, metricLabel, metricValue, socketBandwidth, state, thresholdSeverity, topologyGroupForEndpoint } = current();
    const socket = edge.socket;
    const anomalies = edgeAnomalies(edge);
    const localGroup = topologyGroupForEndpoint(state.topology, socket.local);
    const peerGroup = topologyGroupForEndpoint(state.topology, socket.peer);
    const topMetric = [
      ["TX", "tx_bps", socketBandwidth(socket, "tx_bps")],
      ["RX", "rx_bps", socketBandwidth(socket, "rx_bps")],
      ["Send-Q", "sendQ", socket.sendQ],
      ["Recv-Q", "recvQ", socket.recvQ],
      ["RTT", "rtt", metricValue(socket, "rtt")],
      ["RTO", "rto", metricValue(socket, "rto")],
      ["Drops", "skmem.d", metricValue(socket, "skmem.d")]
    ];
    return `<aside class="map-side-panel link-inspector ${edge.risk}">
    <header>
      <span class="tooltip-kicker">Link intelligence</span>
      <button class="icon" data-map-edge-close title="Close link inspector">${icons.x}</button>
    </header>
    <h3>${escapeHtml(currentAliasDisplay(socket.local))} -> ${escapeHtml(currentAliasDisplay(socket.peer))}</h3>
    <p class="link-endpoints">${escapeHtml(socket.local)} -> ${escapeHtml(socket.peer)}</p>
    <div class="link-badges">
      <span class="risk ${edge.risk}">${escapeHtml(edge.risk)}</span>
      <span>${escapeHtml(socket.family)} / ${escapeHtml(socket.state)}</span>
      <span>${formatNumber(anomalies.length)} anomalies</span>
    </div>
    <div class="link-groups">
      ${localGroup ? `<span><b>Local group</b>${escapeHtml(localGroup.name)}</span>` : ""}
      ${peerGroup ? `<span><b>Peer group</b>${escapeHtml(peerGroup.name)}</span>` : ""}
      ${socket.details.process?.name ? `<span><b>Process</b>${escapeHtml(socket.details.process.name)}${socket.details.process.pid ? `:${escapeHtml(socket.details.process.pid)}` : ""}</span>` : ""}
    </div>
    <div class="link-metrics">
      ${topMetric.map(([label, metric, value]) => `<article class="${thresholdSeverity(metric, Number(value || 0))}">
        <span>${escapeHtml(label)}</span>
        <strong>${formatMetricValue(metric, value)}</strong>
      </article>`).join("")}
    </div>
    ${anomalies.length ? `<section class="link-anomalies">
      <strong>Signals</strong>
      ${anomalies.slice(0, 4).map(anomaly => `<article class="${escapeHtml(anomaly.severity)}">
        <span class="risk ${escapeHtml(anomaly.severity)}">${escapeHtml(anomaly.severity)}</span>
        <div><b>${escapeHtml(anomaly.title)}</b><p>${escapeHtml(anomaly.detail || metricLabel(anomaly.metric || "socket"))}</p></div>
      </article>`).join("")}
    </section>` : `<div class="empty compact">No anomaly attached to this link.</div>`}
    <footer>
      <button data-map-edge-action="details" data-socket-id="${escapeHtml(socket.id)}">${icons.activity} Details</button>
      <button data-map-edge-action="chart" data-socket-id="${escapeHtml(socket.id)}">${icons.chart} Charts</button>
      ${anomalies.length ? `<button data-map-edge-action="anomalies" data-socket-id="${escapeHtml(socket.id)}">${icons.alert} Anomalies</button>` : ""}
    </footer>
  </aside>`;
  }

  function mapNodeTitle(node) {
    const { formatNumber } = current();
    const lines = [];
    if (node.endpoint) lines.push(`Endpoint: ${node.endpoint}`);
    if (node.alias?.label) lines.push(`Label: ${node.alias.label}`);
    if (node.alias?.role) lines.push(`Role: ${node.alias.role}`);
    if (node.topologyGroup) {
      lines.push(`Topology group: ${node.topologyGroup.name}`);
      lines.push(`Match: ${node.topologyGroup.match}`);
      if (node.topologyGroup.note) lines.push(`Note: ${node.topologyGroup.note}`);
    }
    lines.push(`Risk: ${node.risk}`);
    lines.push(`Sockets: ${formatNumber(node.count)}`);
    if (node.anomalies) lines.push(`Anomalies: ${formatNumber(node.anomalies)}`);
    return lines.join("\n");
  }

  function buildServiceMap() {
    const { SERVICE_MAP_SORT_COLLATOR, anomaliesBySocketId, buildServiceMapData, riskRank, socketBandwidth, sortedFilteredSockets, state, topologyGroupForEndpoint } = current();
    return buildServiceMapData({
      sockets: sortedFilteredSockets(),
      anomalyMap: anomaliesBySocketId(),
      topology: state.topology,
      endpointPresentation,
      topologyGroupForEndpoint,
      riskRank,
      socketBandwidth,
      sortCollator: SERVICE_MAP_SORT_COLLATOR
    });
  }

  function serviceMapConnectivityOrder(map) {
    const { orderServiceMapConnectivity, riskRank } = current();
    return orderServiceMapConnectivity(map, { riskRank });
  }

  return {
    buildServiceMap,
    currentAliasDisplay,
    currentAliasForEndpoint,
    endpointPresentation,
    mapNodeTitle,
    nodeLabel,
    nodeSubtitle,
    renderHotPaths,
    renderMapEdgeInsight,
    renderMapLegend,
    serviceMapConnectivityOrder,
    serviceMapGroupBands
  };
}
