export function createSocketTableRendering(ctx) {
  const {
    state,
    html,
    icons,
    escapeHtml,
    formatNumber,
    formatMetricValue,
    FIELD_DOCS,
    TABLE_COLUMNS,
    renderSocketTableView,
    renderTableSettingsTriggerView,
    renderTableSettingsDrawerView,
    renderTableSettingsMenuView,
    renderTableHeader,
    tableDefaults,
    currentAliasForEndpoint,
    ipIntelSummary,
    ipIntelDetail,
    columnHelpView,
    thresholdFor,
    renderThresholdSummaryView,
    renderColumnTooltipView,
    buildSocketOptionSets,
    renderDatalist,
    hasActiveTableFilters,
    sortedFilteredSockets,
    pagedRows,
    visibleColumns
  } = ctx;

function renderSocketTable() {
  return renderSocketTableView({
    state,
    html,
    escapeHtml,
    renderGridControls,
    renderPagination,
    sortedFilteredSockets,
    pagedRows,
    visibleColumns,
    renderHeader,
    renderRowActions,
    renderTableSettingsTrigger,
    renderTableSettingsMenu
  });
}

function tableSettingsViewContext() {
  return { state, tableColumns: TABLE_COLUMNS, tableDefaults, icons, escapeHtml, formatNumber };
}

function renderTableSettingsTrigger() {
  return renderTableSettingsTriggerView({ icons });
}

function renderTableSettingsDrawer() {
  return renderTableSettingsDrawerView(tableSettingsViewContext());
}

function renderTableSettingsMenu() {
  return renderTableSettingsMenuView(tableSettingsViewContext());
}

function renderRowActions(socket) {
  const pos = state.openMenuId === socket.id && state.openMenuPos
    ? `style="left:${state.openMenuPos.left}px;top:${state.openMenuPos.top}px"`
    : "";
  return `<div class="row-actions">
    <button class="icon mini-menu" data-action-menu="${escapeHtml(socket.id)}" title="Socket actions"><i class="ri-menu-3-line"></i></button>
    <div class="row-menu ${state.openMenuId === socket.id ? "open" : ""}" ${pos}>
      <button data-row-action="chart" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-line-chart-line"></i> Go to Chart pane</button>
      <button data-row-action="focus" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-focus-3-line"></i> Focus all metrics</button>
      <button data-row-action="details" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-search-eye-line"></i> Open details</button>
      <button data-row-action="filter-src" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-filter-3-line"></i> Filter source IP</button>
      <button data-row-action="filter-dst" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-filter-2-line"></i> Filter destination IP</button>
      <button data-row-action="copy" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-file-copy-line"></i> Copy raw row</button>
    </div>
  </div>`;
}

function renderEndpointCell(endpoint, extra = "") {
  const alias = currentAliasForEndpoint(endpoint);
  if (!alias?.label) return `<span>${escapeHtml(endpoint)}</span>${extra}`;
  return `<div class="endpoint-cell" title="${escapeHtml(endpoint)}">
    <strong title="${escapeHtml(alias.label)}">${escapeHtml(alias.label)}</strong>
    ${alias.role ? `<em title="${escapeHtml(alias.role)}">${escapeHtml(alias.role)}</em>` : ""}
    <small>${escapeHtml(endpoint)}</small>
    ${extra}
  </div>`;
}

function renderPeerCell(socket) {
  const host = socket.peerAddress?.host || "";
  const intel = state.ipIntel[host];
  const summary = ipIntelSummary(intel);
  const detail = ipIntelDetail(intel);
  return `<div class="peer-cell">
    ${renderEndpointCell(socket.peer)}
    ${summary ? `<small class="ip-intel" title="${escapeHtml(detail || summary)}"><i class="ri-building-4-line"></i> ${escapeHtml(summary)}</small>` : ""}
    ${intel?.status === "loading" ? `<small class="ip-intel loading"><i class="ri-loader-4-line"></i> enriching public IP...</small>` : ""}
  </div>`;
}

function renderHeader(col) {
  return renderTableHeader(col, { state, icons, escapeHtml, renderColumnTooltip });
}

function columnHelpContext() {
  return { fieldDocs: FIELD_DOCS, thresholdFor, formatMetricValue, escapeHtml };
}

function columnHelp(col) {
  return columnHelpView(col, columnHelpContext());
}

function renderThresholdSummary(help) {
  return renderThresholdSummaryView(help, columnHelpContext());
}

function renderColumnTooltip(col) {
  return renderColumnTooltipView(col, columnHelpContext());
}

function gridOptionSets() {
  const key = `${state.dataVersion}|${state.sockets.length}`;
  if (state.cache.optionKey === key && state.cache.optionSets) return state.cache.optionSets;
  const optionSets = buildSocketOptionSets(state.sockets);
  state.cache.optionKey = key;
  state.cache.optionSets = optionSets;
  return optionSets;
}

function renderGridControls(total) {
  const { states, families, srcIps, dstIps, srcPorts, dstPorts, processes } = gridOptionSets();
  const anomaliesOnly = state.table.filters.onlyAnomalies;
  return `<div class="grid-controls-shell">
    <div class="grid-controls">
      <section class="filter-cluster filter-cluster--scope">
        <span class="filter-cluster-title">Scope</span>
        <div class="filter-cluster-grid filter-cluster-grid--scope">
          <select id="riskFilter">${["all", "critical", "high", "medium", "low"].map(v => `<option value="${v}" ${state.table.filters.risk === v ? "selected" : ""}>risk ${v}</option>`).join("")}</select>
          <select id="stateFilter"><option value="all">all states</option>${states.map(v => `<option ${state.table.filters.state === v ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select>
          <select id="familyFilter"><option value="all">all protocols</option>${families.map(v => `<option ${state.table.filters.family === v ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select>
          <input id="processFilter" list="processOptions" placeholder="process" value="${escapeHtml(state.table.filters.process)}" />
        </div>
      </section>

      <section class="filter-cluster filter-cluster--metrics">
        <span class="filter-cluster-title">Flow health</span>
        <div class="filter-cluster-grid filter-cluster-grid--metrics">
          <input id="minRtt" type="number" min="0" placeholder="RTT min (ms)" value="${escapeHtml(state.table.filters.minRtt)}" />
          <input id="minRecvQ" type="number" min="0" placeholder="Recv-Q min" value="${escapeHtml(state.table.filters.minRecvQ)}" />
          <input id="minSendQ" type="number" min="0" placeholder="Send-Q min" value="${escapeHtml(state.table.filters.minSendQ)}" />
        </div>
      </section>

      <aside class="filter-side-actions">
        <label class="filter-toggle ${anomaliesOnly ? "active" : ""}">
          <input id="onlyAnomalies" type="checkbox" ${anomaliesOnly ? "checked" : ""}/>
          <span class="filter-toggle-mark" aria-hidden="true"></span>
          <span>anomalies only</span>
        </label>
        <button class="filter-history-button" data-action="clearFilterHistory">${icons.clear}<span>Clear history</span></button>
      </aside>

      <section class="filter-cluster filter-cluster--endpoint">
        <span class="filter-cluster-title">Source endpoint</span>
        <div class="filter-cluster-grid filter-cluster-grid--endpoint">
          <input id="srcIpFilter" list="srcIpOptions" placeholder="source IP" value="${escapeHtml(state.table.filters.srcIp)}" />
          <input id="srcPortFilter" list="srcPortOptions" placeholder="port" value="${escapeHtml(state.table.filters.srcPort)}" />
        </div>
      </section>

      <section class="filter-cluster filter-cluster--endpoint">
        <span class="filter-cluster-title">Destination endpoint</span>
        <div class="filter-cluster-grid filter-cluster-grid--endpoint">
          <input id="dstIpFilter" list="dstIpOptions" placeholder="destination IP" value="${escapeHtml(state.table.filters.dstIp)}" />
          <input id="dstPortFilter" list="dstPortOptions" placeholder="port" value="${escapeHtml(state.table.filters.dstPort)}" />
        </div>
      </section>
    </div>
    ${renderDatalist("processOptions", processes)}
    ${renderDatalist("srcIpOptions", [...srcIps, ...state.filterHistory.map(h => h.srcIp)])}
    ${renderDatalist("dstIpOptions", [...dstIps, ...state.filterHistory.map(h => h.dstIp)])}
    ${renderDatalist("srcPortOptions", [...srcPorts, ...state.filterHistory.map(h => h.srcPort)])}
    ${renderDatalist("dstPortOptions", [...dstPorts, ...state.filterHistory.map(h => h.dstPort)])}
  </div>`;
}

function renderPagination(total, totalPages, start) {
  if (!total) return `<div class="empty"><svg width="56" height="56" viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="22" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/><path d="M20 28h16M28 20v16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/><path d="M18 18l20 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><strong>No sockets match your filters</strong>Try broadening the filter criteria or reset filters.<div class="empty-cta"><button data-action="clearFilters"><i class="ri-filter-off-line"></i> Clear filters</button></div></div>`;
  const end = Math.min(total, start + state.table.pageSize);
  const filteredCount = hasActiveTableFilters() ? `<span class="pager-filter-count">${formatNumber(total)} filtered row(s)</span>` : "";
  return `<div class="pager">
    ${filteredCount}
    <select class="pager-size" data-page-size title="Rows per page" aria-label="Rows per page">${[10, 20, 50, 100].map(v => `<option value="${v}" ${state.table.pageSize === v ? "selected" : ""}>${v}/p</option>`).join("")}</select>
    <button class="icon" data-page="first" title="First page" aria-label="First page">${icons.first}</button>
    <button class="icon" data-page="prev" title="Previous page" aria-label="Previous page">${icons.previous}</button>
    <span>${formatNumber(start + 1)}-${formatNumber(end)} / ${formatNumber(total)} - page ${state.table.page}/${totalPages}</span>
    <button class="icon" data-page="next" title="Next page" aria-label="Next page">${icons.next}</button>
    <button class="icon" data-page="last" data-total-pages="${totalPages}" title="Last page" aria-label="Last page">${icons.last}</button>
  </div>`;
}

  return {
    renderSocketTable,
    tableSettingsViewContext,
    renderTableSettingsTrigger,
    renderTableSettingsDrawer,
    renderTableSettingsMenu,
    renderRowActions,
    renderEndpointCell,
    renderPeerCell,
    renderHeader,
    columnHelpContext,
    columnHelp,
    renderThresholdSummary,
    renderColumnTooltip,
    gridOptionSets,
    renderGridControls,
    renderPagination
  };
}
