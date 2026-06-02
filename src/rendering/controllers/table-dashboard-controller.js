export function createTableDashboardController(getDeps) {
  const current = () => getDeps();

  function getColumn(key) {
    const { TABLE_COLUMNS, TABLE_COLUMN_BY_KEY } = current();
    return TABLE_COLUMN_BY_KEY.get(key) || TABLE_COLUMNS[0];
  }

  function visibleColumns() {
    const { TABLE_COLUMNS, buildVisibleColumnOrder, state, tableDefaults } = current();
    return buildVisibleColumnOrder(state.table, TABLE_COLUMNS, tableDefaults()).map(getColumn);
  }

  function tableLayoutSnapshot(name) {
    const { state } = current();
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      order: [...state.table.order],
      visible: [...state.table.visible],
      pinned: [...state.table.pinned],
      sortKey: state.table.sortKey,
      sortDir: state.table.sortDir,
      pageSize: state.table.pageSize
    };
  }

  function applyTableLayout(profile) {
    if (!profile) return;
    const { DEFAULT_TABLE_ORDER, saveTableState, state } = current();
    const allKeys = DEFAULT_TABLE_ORDER;
    const allKeySet = new Set(allKeys);
    state.table.order = [...new Set([...(profile.order || []), ...allKeys])].filter(key => allKeySet.has(key));
    state.table.visible = (profile.visible || allKeys).filter(key => allKeySet.has(key));
    if (!state.table.visible.length) state.table.visible = ["risk"];
    state.table.pinned = (profile.pinned || []).filter(key => state.table.visible.includes(key));
    state.table.sortKey = profile.sortKey || state.table.sortKey;
    state.table.sortDir = profile.sortDir || state.table.sortDir;
    state.table.pageSize = Number(profile.pageSize || state.table.pageSize);
    state.table.page = 1;
    saveTableState();
  }

  function dashboardSnapshot(name) {
    const { clampChartColumns, createDashboardSnapshot, state } = current();
    state.prefs.chartLayout.columns = clampChartColumns(state.prefs.chartLayout.columns);
    return createDashboardSnapshot(state, name);
  }

  function applyDefaultDashboardPreset() {
    const { applyDashboardPresetProfile, chartMetricList, dashboardPresetIdOrDefault, state } = current();
    const presetId = dashboardPresetIdOrDefault(state.prefs.defaultDashboardPreset);
    state.activeDashboardPreset = presetId;
    applyDashboardPresetProfile(state, presetId, chartMetricList);
  }

  function applyDashboardProfile(profile) {
    const { applySavedDashboardProfile, chartMetricList, clampChartColumns, savePrefs, state } = current();
    applySavedDashboardProfile(state, profile, chartMetricList);
    state.prefs.chartLayout.columns = clampChartColumns(state.prefs.chartLayout.columns);
    savePrefs();
  }

  function applyDashboardPreset(presetId) {
    const { DASHBOARD_PRESETS, applyDashboardPresetProfile, chartMetricList, clampChartColumns, savePrefs, state } = current();
    if (!DASHBOARD_PRESETS[presetId]) return;
    applyDashboardPresetProfile(state, presetId, chartMetricList);
    state.activeDashboardPreset = presetId;
    state.prefs.chartLayout.columns = clampChartColumns(state.prefs.chartLayout.columns);
    savePrefs();
  }

  function applyAnalysisTemplate(templateId) {
    const { DEFAULT_TABLE_ORDER, applyTemplateProfile, chartMetricList, savePrefs, state } = current();
    applyTemplateProfile(state, templateId, DEFAULT_TABLE_ORDER, chartMetricList);
    savePrefs();
  }

  function moveTableColumn(sourceKey, targetKey) {
    const { state } = current();
    if (!sourceKey || !targetKey || sourceKey === targetKey) return false;
    const order = [...state.table.order];
    const from = order.indexOf(sourceKey);
    const to = order.indexOf(targetKey);
    if (from < 0 || to < 0) return false;
    order.splice(from, 1);
    order.splice(to, 0, sourceKey);
    state.table.order = order;
    return true;
  }

  function createSocketFilterMatcher(filters) {
    const { anomaliesBySocketId, metricValue, socketBandwidth, socketMatchesAdvancedQuery } = current();
    const f = filters || {};
    const text = String(f.text || "").trim();
    const process = String(f.process || "").trim().toLowerCase();
    const srcIp = String(f.srcIp || "").trim().toLowerCase();
    const dstIp = String(f.dstIp || "").trim().toLowerCase();
    const srcPort = String(f.srcPort || "").trim().toLowerCase();
    const dstPort = String(f.dstPort || "").trim().toLowerCase();
    const risk = f.risk || "all";
    const socketState = f.state || "all";
    const family = f.family || "all";
    const minRecvQ = f.minRecvQ == null || f.minRecvQ === "" ? null : Number(f.minRecvQ);
    const minSendQ = f.minSendQ == null || f.minSendQ === "" ? null : Number(f.minSendQ);
    const minRtt = f.minRtt == null || f.minRtt === "" ? null : Number(f.minRtt);
    const anomalySocketIds = f.onlyAnomalies ? anomaliesBySocketId() : null;

    return socket => {
      if (text && !socketMatchesAdvancedQuery(socket, text, { metricValue, socketBandwidth })) return false;
      if (process && !String(socket.details.process?.name || "").toLowerCase().includes(process)) return false;
      if (risk !== "all" && socket.risk !== risk) return false;
      if (socketState !== "all" && socket.state !== socketState) return false;
      if (family !== "all" && socket.family !== family) return false;
      if (Number.isFinite(minRecvQ) && socket.recvQ < minRecvQ) return false;
      if (Number.isFinite(minSendQ) && socket.sendQ < minSendQ) return false;
      if (Number.isFinite(minRtt) && metricValue(socket, "rtt") < minRtt) return false;
      if (srcIp && !socket.localAddress.host.toLowerCase().includes(srcIp)) return false;
      if (dstIp && !socket.peerAddress.host.toLowerCase().includes(dstIp)) return false;
      if (srcPort && String(socket.localAddress.port || "").toLowerCase() !== srcPort) return false;
      if (dstPort && String(socket.peerAddress.port || "").toLowerCase() !== dstPort) return false;
      if (anomalySocketIds && !anomalySocketIds.has(socket.id)) return false;
      return true;
    };
  }

  function sortedFilteredSockets() {
    const { TABLE_SORT_COLLATOR, state, tableFilterCacheKey } = current();
    const cacheKey = [state.dataVersion, tableFilterCacheKey(state.table.filters), state.table.sortKey, state.table.sortDir].join("\u001e");
    if (state.cache.filteredKey === cacheKey && state.cache.filteredRows) return state.cache.filteredRows;
    const col = getColumn(state.table.sortKey);
    const factor = state.table.sortDir === "asc" ? 1 : -1;
    const matchesFilters = createSocketFilterMatcher(state.table.filters);
    const rows = state.sockets.filter(matchesFilters).sort((a, b) => {
      const av = col.value(a);
      const bv = col.value(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
      return TABLE_SORT_COLLATOR.compare(String(av), String(bv)) * factor;
    });
    state.cache.filteredKey = cacheKey;
    state.cache.filteredRows = rows;
    rows.forEach(socket => {
      const history = state.socketHistory?.get?.(socket.id);
      socket._rttHistory = history?.map(point => point.rtt ?? 0).slice(-20) || null;
    });
    return rows;
  }

  function pagedRows(rows) {
    const { state } = current();
    const totalPages = Math.max(1, Math.ceil(rows.length / state.table.pageSize));
    state.table.page = Math.min(Math.max(1, state.table.page), totalPages);
    const start = (state.table.page - 1) * state.table.pageSize;
    return { rows: rows.slice(start, start + state.table.pageSize), totalPages, start };
  }

  return {
    applyAnalysisTemplate,
    applyDashboardPreset,
    applyDashboardProfile,
    applyDefaultDashboardPreset,
    applyTableLayout,
    createSocketFilterMatcher,
    dashboardSnapshot,
    getColumn,
    moveTableColumn,
    pagedRows,
    sortedFilteredSockets,
    tableLayoutSnapshot,
    visibleColumns
  };
}
