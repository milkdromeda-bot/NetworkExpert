export function createPreferencesController(getDeps) {
  const current = () => getDeps();

  function dashboardPresetIdOrDefault(value) {
    const { DASHBOARD_PRESETS, prefsDefault } = current();
    const fallback = DASHBOARD_PRESETS[prefsDefault.defaultDashboardPreset]
      ? prefsDefault.defaultDashboardPreset
      : Object.keys(DASHBOARD_PRESETS)[0] || "noc";
    return DASHBOARD_PRESETS[value] ? value : fallback;
  }

  function renderDashboardPresetOptions(selectedId) {
    const { DASHBOARD_PRESETS, escapeHtml } = current();
    const selected = dashboardPresetIdOrDefault(selectedId);
    return Object.entries(DASHBOARD_PRESETS)
      .map(([id, preset]) => `<option value="${escapeHtml(id)}" ${id === selected ? "selected" : ""}>${escapeHtml(preset.name)}</option>`)
      .join("");
  }

  function clampChartTooltipOpacity(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0.3;
    return Math.max(0.2, Math.min(1, number));
  }

  function chartTooltipOpacity() {
    const { state } = current();
    return clampChartTooltipOpacity(state.prefs.chartLayout?.tooltipOpacity);
  }

  function loadPrefs() {
    const {
      clampChartColumns,
      loadPrefsRaw,
      normalizeBdpDirection,
      normalizeSsEditorTheme,
      prefsDefault
    } = current();
    try {
      const saved = loadPrefsRaw();
      const prefs = { ...prefsDefault, ...saved, chartLayout: { ...prefsDefault.chartLayout, ...(saved.chartLayout || {}) } };
      prefs.chartLayout.columns = clampChartColumns(prefs.chartLayout.columns);
      prefs.chartLayout.tooltipOpacity = clampChartTooltipOpacity(prefs.chartLayout.tooltipOpacity);
      prefs.defaultDashboardPreset = dashboardPresetIdOrDefault(prefs.defaultDashboardPreset);
      prefs.ssEditorTheme = normalizeSsEditorTheme(prefs.ssEditorTheme);
      prefs.bdpDirection = normalizeBdpDirection(prefs.bdpDirection);
      prefs.configuredLinkCapacityMbps = Number(prefs.configuredLinkCapacityMbps) > 0 ? Number(prefs.configuredLinkCapacityMbps) : "";
      if (saved.sampling == null || (saved.sampling === 5 && saved.chartResolutionDefault !== "max")) prefs.sampling = 1;
      prefs.chartResolutionDefault = "max";
      return prefs;
    } catch {
      return { ...prefsDefault };
    }
  }

  function savePrefs() {
    const {
      clampChartColumns,
      configuredLinkCapacityMbps,
      normalizeBdpDirection,
      normalizeSsEditorTheme,
      savePrefsRaw,
      state
    } = current();
    state.prefs.chartLayout.columns = clampChartColumns(state.prefs.chartLayout.columns);
    state.prefs.chartLayout.tooltipOpacity = chartTooltipOpacity();
    state.prefs.defaultDashboardPreset = dashboardPresetIdOrDefault(state.prefs.defaultDashboardPreset);
    state.prefs.ssEditorTheme = normalizeSsEditorTheme(state.prefs.ssEditorTheme);
    state.prefs.bdpDirection = normalizeBdpDirection(state.prefs.bdpDirection);
    state.prefs.configuredLinkCapacityMbps = configuredLinkCapacityMbps() || "";
    savePrefsRaw(state.prefs);
  }

  function loadTableState(pageSize) {
    const { TABLE_COLUMNS, defaultTableState, loadTableStateRaw, normalizeTableState } = current();
    const defaults = defaultTableState(pageSize);
    try {
      return normalizeTableState({ ...defaults, ...loadTableStateRaw() }, TABLE_COLUMNS, defaults);
    } catch {
      return normalizeTableState(defaults, TABLE_COLUMNS, defaults);
    }
  }

  function saveTableState() {
    const { TABLE_COLUMNS, saveTableStateRaw, state, tableDefaults } = current();
    state.table = saveTableStateRaw(state.table, TABLE_COLUMNS, tableDefaults());
  }

  function clearVisibleHistoryCache() {
    const { state } = current();
    if (!state?.cache) return;
    state.cache.visibleHistoryKey = "";
    state.cache.visibleHistoryRows = null;
    state.cache.visibleHistoryRowsByKey?.clear();
  }

  function saveAnnotations() {
    const { saveAnnotationsRaw, state } = current();
    state.annotations = saveAnnotationsRaw(state.annotations);
  }

  return {
    chartTooltipOpacity,
    clampChartTooltipOpacity,
    clearVisibleHistoryCache,
    dashboardPresetIdOrDefault,
    loadPrefs,
    loadTableState,
    renderDashboardPresetOptions,
    saveAnnotations,
    savePrefs,
    saveTableState
  };
}
