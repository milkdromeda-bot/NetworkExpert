export function createConversationRendering(ctx) {
  const {
    state,
    icons,
    window,
    escapeHtml,
    formatNumber,
    formatMetricValue,
    renderTableMetricCell,
    groupedSockets,
    pagedRows,
    renderPagination,
    renderGridControls,
    renderApplicationServiceChip,
    buildConversations,
    riskRank,
    renderConversationSortHeader,
    conversationAnomalySummary,
    metricLabel,
    ipIntelSummary,
    ipIntelDetail,
    currentAliasForEndpoint
  } = ctx;

function renderGroupedSockets() {
  const groups = groupedSockets();
  const page = pagedRows(groups);
  if (!groups.length) return `<div class="empty">No group matches the filters.</div>`;
  const pager = renderPagination(groups.length, page.totalPages, page.start);
  const topPager = ["top", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  const bottomPager = ["bottom", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  return `${renderGridControls(groups.length)}${topPager}<div class="table-wrap"><table>
    <thead><tr><th>Max risk</th><th>Snapshots</th><th>Local</th><th>Peer</th><th>Process</th><th>Anomalies</th><th>Max Recv-Q</th><th>Max Send-Q</th><th>Max RTT</th><th>Max RTO</th><th>Max drops</th></tr></thead>
    <tbody>${page.rows.map(g => `<tr data-socket="${escapeHtml(g.socket.id)}" class="${g.socket.id === state.selectedId ? "selected" : ""}">
      <td><span class="risk ${g.maxRisk}">${g.maxRisk}</span></td>
      <td>${formatNumber(g.count)}</td>
      <td>${escapeHtml(g.socket.local)}</td>
      <td>${escapeHtml(g.socket.peer)}</td>
      <td>${escapeHtml(g.socket.details.process ? `${g.socket.details.process.name}:${g.socket.details.process.pid}` : "-")}</td>
      <td>${formatNumber(g.anomalies)}</td>
      <td>${renderTableMetricCell("recvQ", g.maxRecvQ)}</td>
      <td>${renderTableMetricCell("sendQ", g.maxSendQ)}</td>
      <td>${renderTableMetricCell("rtt", g.maxRtt)}</td>
      <td>${renderTableMetricCell("rto", g.maxRto)}</td>
      <td>${renderTableMetricCell("skmem.d", g.maxDrops)}</td>
    </tr>`).join("")}</tbody>
  </table></div>${bottomPager}`;
}

function renderConversations() {
  const conversations = buildConversations();
  const page = pagedRows(conversations);
  if (!conversations.length) return `<div class="empty">No conversation matches the current filters.</div>`;
  const pager = renderPagination(conversations.length, page.totalPages, page.start);
  const topPager = ["top", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  const bottomPager = ["bottom", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  return `<div class="conversation-workbench">
    <div class="expert-strip">
      <article><span>Conversations</span><strong>${formatNumber(conversations.length)}</strong></article>
      <article><span>Critical/high paths</span><strong>${formatNumber(conversations.filter(c => riskRank(c.maxRisk) >= 3).length)}</strong></article>
      <article><span>Total TX</span><strong>${formatMetricValue("tx_bps", conversations.reduce((sum, c) => sum + c.txBps, 0))}</strong></article>
      <article><span>Total RX</span><strong>${formatMetricValue("rx_bps", conversations.reduce((sum, c) => sum + c.rxBps, 0))}</strong></article>
    </div>
    ${renderGridControls(conversations.length)}
    ${topPager}
    <div class="table-wrap"><table>
      <thead><tr>${renderConversationSortHeader("risk", "Risk")}${renderConversationSortHeader("flow", "Flow")}${renderConversationSortHeader("proto", "Proto/state")}${renderConversationSortHeader("process", "Process")}${renderConversationSortHeader("sockets", "Sockets")}${renderConversationSortHeader("anomalies", "Anomalies")}${renderConversationSortHeader("tx", "TX")}${renderConversationSortHeader("rx", "RX")}${renderConversationSortHeader("sendQ", "Max Send-Q")}${renderConversationSortHeader("recvQ", "Max Recv-Q")}${renderConversationSortHeader("rtt", "RTT")}${renderConversationSortHeader("rto", "RTO")}${renderConversationSortHeader("drops", "Drops")}</tr></thead>
      <tbody>${page.rows.map(c => `<tr data-socket="${escapeHtml(c.socket.id)}" class="${c.socket.id === state.selectedId ? "selected" : ""}">
        <td><span class="risk ${c.maxRisk}">${c.maxRisk}</span></td>
        <td><div class="flow-cell"><strong>${renderFlowEndpoint(c.local)}</strong><span>${icons.arrowRight}</span>${renderPeerEndpoint(c.peer)}</div></td>
        <td><span class="badge ${c.family.includes("udp") ? "udp" : "tcp"}">${escapeHtml(c.family)}</span> ${[...c.states].map(stateName => `<span class="badge ${stateName === "LISTEN" ? "listen" : ""}">${escapeHtml(stateName)}</span>`).join(" ")} ${renderApplicationServiceChip(c.socket, "compact")}</td>
        <td>${escapeHtml([...c.processes].slice(0, 3).join(", ") || "-")}</td>
        <td>${formatNumber(c.count)}</td>
        <td>${renderConversationAnomalyCell(c)}</td>
        <td>${renderTableMetricCell("tx_bps", c.txBps)}</td>
        <td>${renderTableMetricCell("rx_bps", c.rxBps)}</td>
        <td>${renderTableMetricCell("sendQ", c.sendQ)}</td>
        <td>${renderTableMetricCell("recvQ", c.recvQ)}</td>
        <td>${renderTableMetricCell("rtt", c.maxRtt)}</td>
        <td>${renderTableMetricCell("rto", c.maxRto)}</td>
        <td>${renderTableMetricCell("skmem.d", c.drops)}</td>
      </tr>`).join("")}</tbody>
    </table></div>
    ${bottomPager}
  </div>`;
}

function renderConversationAnomalyCell(conv) {
  if (!conv.anomalies) return `<span class="conversation-anomaly-zero">0</span>`;
  const summary = conversationAnomalySummary(conv);
  const pos = state.openConversationInsightKey === conv.key && state.openConversationInsightPos
    ? `style="left:${state.openConversationInsightPos.left}px;top:${state.openConversationInsightPos.top}px"`
    : "";
  const counts = Object.entries(summary.counts).filter(([, count]) => count);
  return `<div class="conversation-anomaly-cell">
    <button class="conversation-anomaly-trigger" data-conversation-insight="${escapeHtml(conv.key)}" aria-label="Open anomaly detail dialog">
      <i class="ri-menu-search-line"></i>
    </button>
    <span class="conversation-anomaly-badge ${summary.dominantSeverity}" aria-label="${escapeHtml(formatConversationAnomalyTitle(conv, summary))}">
      <span>${formatNumber(conv.anomalies)}</span>
      <small>${escapeHtml(summary.dominantSeverity)}</small>
    </span>
    <div class="conversation-insight-popover ${state.openConversationInsightKey === conv.key ? "open" : ""}" ${pos} role="dialog" aria-label="Conversation anomaly details">
      <div class="conversation-insight-titlebar">
        <div class="conversation-insight-head">
          <span class="tooltip-kicker">Conversation anomaly lens</span>
          <strong>${formatNumber(conv.anomalies)} signal(s) on this flow</strong>
          <small>${escapeHtml(conv.local)} -> ${escapeHtml(conv.peer)}</small>
        </div>
        <button class="icon mini" data-conversation-close title="Close anomaly dialog" aria-label="Close anomaly dialog">${icons.x}</button>
      </div>
      <div class="conversation-severity-strip">
        ${counts.map(([severity, count]) => `<span class="${severity}"><b>${escapeHtml(severity)}</b>${formatNumber(count)}</span>`).join("")}
      </div>
      <div class="conversation-metric-strip">
        ${summary.metrics.map(([metric, count]) => `<em>${escapeHtml(metricLabel(metric))}<b>${formatNumber(count)}</b></em>`).join("")}
      </div>
      <div class="conversation-anomaly-list">
        ${summary.topItems.map(item => `<article class="${item.severity}">
          <header><span class="risk ${item.severity}">${escapeHtml(item.severity)}</span><b>${escapeHtml(item.title)}</b><em>${escapeHtml(metricLabel(item.metric || "socket"))}${item.count > 1 ? ` x${formatNumber(item.count)}` : ""}</em></header>
          <p>${escapeHtml(item.detail)}</p>
        </article>`).join("")}
      </div>
      <footer>
        <button data-conversation-action="chart" data-socket-id="${escapeHtml(conv.socket.id)}" data-metric="${escapeHtml(summary.topMetric)}">${icons.chart} Open charts</button>
        <button data-conversation-action="details" data-socket-id="${escapeHtml(conv.socket.id)}">${icons.focus} Socket context</button>
        <button data-conversation-action="anomalies" data-socket-id="${escapeHtml(conv.socket.id)}" data-metric="${escapeHtml(summary.topMetric)}">${icons.alert} Details</button>
      </footer>
    </div>
  </div>`;
}

function formatConversationAnomalyTitle(conv, summary) {
  const counts = Object.entries(summary.counts).filter(([, count]) => count).map(([severity, count]) => `${severity}: ${count}`).join(", ");
  const top = summary.topItems[0];
  return `${conv.anomalies} anomalies (${counts}). Top: ${top?.title || "none"}`;
}

function positionConversationInsight(button) {
  const key = button.dataset.conversationInsight;
  const rect = button.getBoundingClientRect();
  const rowRect = button.closest("tr")?.getBoundingClientRect() || rect;
  const panelWidth = Math.min(620, window.innerWidth - 16);
  const panelHeight = Math.min(520, window.innerHeight - 16);
  const rightSideLeft = rect.right + 12;
  const leftSideLeft = rect.left - panelWidth - 12;
  const preferredLeft = rightSideLeft + panelWidth <= window.innerWidth - 8 ? rightSideLeft : leftSideLeft;
  const left = Math.min(Math.max(8, preferredLeft), window.innerWidth - panelWidth - 8);
  const top = Math.min(Math.max(8, rowRect.top - 12), window.innerHeight - panelHeight - 8);
  state.openConversationInsightKey = key;
  state.openConversationInsightPos = { left: Math.round(left), top: Math.round(top) };
}

function renderFlowEndpoint(endpoint) {
  const alias = currentAliasForEndpoint ? currentAliasForEndpoint(endpoint) : null;
  if (!alias?.label) return escapeHtml(endpoint);
  return `<span class="endpoint-cell" title="${escapeHtml(endpoint)}"><strong title="${escapeHtml(alias.label)}">${escapeHtml(alias.label)}</strong>${alias.role ? `<em title="${escapeHtml(alias.role)}">${escapeHtml(alias.role)}</em>` : ""}<small>${escapeHtml(endpoint)}</small></span>`;
}

function renderPeerEndpoint(endpoint) {
  const address = parseEndpointAddress(endpoint);
  const intel = state.ipIntel[address.host];
  const summary = ipIntelSummary(intel);
  const detail = ipIntelDetail(intel);
  const alias = currentAliasForEndpoint ? currentAliasForEndpoint(endpoint) : null;
  const labelHtml = alias?.label
    ? `<span class="endpoint-cell" title="${escapeHtml(endpoint)}"><strong title="${escapeHtml(alias.label)}">${escapeHtml(alias.label)}</strong>${alias.role ? `<em title="${escapeHtml(alias.role)}">${escapeHtml(alias.role)}</em>` : ""}<small>${escapeHtml(endpoint)}</small></span>`
    : `<strong>${escapeHtml(endpoint)}</strong>`;
  return `<div class="peer-cell">
    ${labelHtml}
    ${summary ? `<small class="ip-intel" title="${escapeHtml(detail || summary)}"><i class="ri-building-4-line"></i> ${escapeHtml(summary)}</small>` : ""}
    ${intel?.status === "loading" ? `<small class="ip-intel loading"><i class="ri-loader-4-line"></i> enriching public IP...</small>` : ""}
  </div>`;
}

function parseEndpointAddress(endpoint = "") {
  const text = String(endpoint);
  if (text.startsWith("[")) {
    const idx = text.lastIndexOf("]:");
    return { host: idx > -1 ? text.slice(1, idx) : text.replace(/^\[|\]$/g, "") };
  }
  const idx = text.lastIndexOf(":");
  return { host: idx > -1 ? text.slice(0, idx) : text };
}

  return {
    renderGroupedSockets,
    renderConversations,
    renderConversationAnomalyCell,
    formatConversationAnomalyTitle,
    positionConversationInsight,
    renderPeerEndpoint,
    parseEndpointAddress
  };
}
