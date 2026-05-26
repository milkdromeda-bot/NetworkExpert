export function handleLayoutProfileAction(action, event, deps) {
  const {
    document,
    state,
    DEFAULT_TABLE_ORDER,
    parseFormattedNumber,
    cloneThresholds,
    clampChartColumns,
    clampChartTooltipOpacity,
    defaultTableColumns,
    saveTableState,
    tableLayoutSnapshot,
    saveTableProfiles,
    applyDashboardProfile,
    saveDashboardProfiles,
    dashboardSnapshot,
    dashboardPresetIdOrDefault,
    savePrefs,
    toast,
    renderKeepingWorkspacePosition,
    render
  } = deps;

  if (action === "saveThresholds") {
    document.querySelectorAll("[data-threshold]").forEach(input => {
      const metric = input.dataset.threshold;
      const key = input.dataset.thresholdKey;
      state.thresholds[metric][key] = parseFormattedNumber(input.value);
    });
    toast("Thresholds saved", "Chart comfort, warning, and danger zones have been updated.");
    state.drawer = null;
    render();
    return true;
  }

  if (action === "resetThresholdDefaults") {
    state.thresholds = cloneThresholds();
    toast("Expert defaults restored", "Thresholds have been reset to the built-in network analysis baseline.");
    render();
    return true;
  }

  if (action === "saveLayout") {
    const layout = state.prefs.chartLayout;
    layout.columns = clampChartColumns(document.querySelector("#layoutColumns")?.value || layout.columns);
    layout.density = document.querySelector("#layoutDensity")?.value || layout.density;
    layout.mainChart = Boolean(document.querySelector("#layoutMainChart")?.checked);
    layout.sharedZoom = Boolean(document.querySelector("#layoutSharedZoom")?.checked);
    layout.showLegend = Boolean(document.querySelector("#layoutLegend")?.checked);
    layout.showCrosshair = Boolean(document.querySelector("#layoutCrosshair")?.checked);
    layout.syncCrosshair = Boolean(document.querySelector("#layoutSyncCrosshair")?.checked);
    layout.tooltipOpacity = clampChartTooltipOpacity(document.querySelector("#layoutTooltipOpacity")?.value ?? layout.tooltipOpacity);
    layout.showThresholds = Boolean(document.querySelector("#layoutThresholds")?.checked);
    layout.stickyToolbar = Boolean(document.querySelector("#layoutStickyToolbar")?.checked);
    const preset = document.querySelector("#layoutPreset")?.value;
    if (preset === "noc") Object.assign(layout, { columns: 3, density: "compact", mainChart: true, sharedZoom: true, showLegend: true });
    if (preset === "deep") Object.assign(layout, { columns: 2, density: "tall", mainChart: true, sharedZoom: true, showLegend: true });
    if (preset === "single") Object.assign(layout, { columns: 1, density: "tall", mainChart: true, sharedZoom: true, showLegend: true });
    savePrefs();
    toast("Layout saved", "Chart layout preferences have been stored in this browser.");
    state.modal = null;
    const fast = document.querySelector(".modal-overlay-fast");
    if (fast) fast.remove();
    render();
    return true;
  }

  if (action === "resetGrid") {
    state.table = {
      ...state.table,
      page: 1,
      pageSize: state.prefs.defaultPageSize,
      sortKey: "risk",
      sortDir: "desc",
      pinned: ["risk", "state", "local"],
      visible: defaultTableColumns(),
      order: [...DEFAULT_TABLE_ORDER],
      filters: { text: "", risk: "all", state: "all", family: "all", minRecvQ: "", minSendQ: "", minRtt: "", srcIp: "", dstIp: "", srcPort: "", dstPort: "", process: "", onlyAnomalies: false }
    };
    saveTableState();
    render();
    return true;
  }

  if (action === "saveTableLayout") {
    const name = document.querySelector("#tableLayoutName")?.value?.trim() || "";
    if (!name) {
      toast("Layout name required", "Give this table layout a name before saving.", "danger");
      return true;
    }
    const next = tableLayoutSnapshot(name);
    state.tableProfiles = [next, ...state.tableProfiles.filter(profile => profile.name.toLowerCase() !== name.toLowerCase())];
    saveTableProfiles();
    toast("Table layout saved", `"${name}" is now available in named table layouts.`);
    render();
    return true;
  }

  if (action === "loadSelectedDashboard") {
    const id = document.querySelector("#savedDashboardSelect")?.value || "";
    applyDashboardProfile(state.dashboardProfiles.find(profile => profile.id === id));
    toast("Dashboard loaded", "Saved widgets, layout, style, and correlation were restored.");
    renderKeepingWorkspacePosition();
    return true;
  }

  if (action === "deleteSelectedDashboard") {
    const id = document.querySelector("#savedDashboardSelect")?.value || "";
    state.dashboardProfiles = state.dashboardProfiles.filter(profile => profile.id !== id);
    saveDashboardProfiles();
    toast("Dashboard deleted", "The saved dashboard has been removed.");
    renderKeepingWorkspacePosition();
    return true;
  }

  if (action === "saveDashboard") {
    const name = document.querySelector("#dashboardName")?.value?.trim() || "";
    if (!name) {
      toast("Dashboard name required", "Give this dashboard a name before saving.", "danger");
      return true;
    }
    const next = dashboardSnapshot(name);
    state.dashboardProfiles = [next, ...state.dashboardProfiles.filter(profile => profile.name.toLowerCase() !== name.toLowerCase())];
    saveDashboardProfiles();
    toast("Dashboard saved", `"${name}" is ready in saved dashboards.`);
    render();
    return true;
  }

  if (action === "savePrefs") {
    state.prefs.severityFloor = document.querySelector("#prefSeverity")?.value || state.prefs.severityFloor;
    state.prefs.autoToast = document.querySelector("#prefToast")?.checked ?? state.prefs.autoToast;
    state.prefs.deepAnalysis = true;
    state.prefs.compactRows = document.querySelector("#prefCompact")?.checked ?? state.prefs.compactRows;
    state.prefs.tableUnits = document.querySelector("#prefTableUnits")?.checked ?? state.prefs.tableUnits;
    state.prefs.colorBlind = document.querySelector("#prefColorBlind")?.checked ?? state.prefs.colorBlind;
    state.prefs.linuxProfile = document.querySelector("#prefLinuxProfile")?.value || state.prefs.linuxProfile;
    state.prefs.accessRole = document.querySelector("#prefAccessRole")?.value || state.prefs.accessRole;
    state.prefs.ubuntuVersion = document.querySelector("#prefUbuntuVersion")?.value || state.prefs.ubuntuVersion;
    state.prefs.numberLocale = document.querySelector("#prefNumberLocale")?.value || state.prefs.numberLocale;
    state.prefs.numberGrouping = document.querySelector("#prefNumberGrouping")?.checked ?? state.prefs.numberGrouping;
    state.prefs.chartTimeZone = document.querySelector("#prefChartTimeZone")?.value || state.prefs.chartTimeZone;
    state.prefs.chartPointSize = document.querySelector("#prefChartPointSize")?.value || state.prefs.chartPointSize;
    state.prefs.defaultDashboardPreset = dashboardPresetIdOrDefault(document.querySelector("#prefDefaultDashboardPreset")?.value || state.prefs.defaultDashboardPreset);
    state.prefs.chartLayout.tooltipOpacity = clampChartTooltipOpacity(document.querySelector("#prefTooltipOpacity")?.value ?? state.prefs.chartLayout.tooltipOpacity);
    state.prefs.paginationPosition = document.querySelector("#prefPagination")?.value || state.prefs.paginationPosition;
    state.prefs.defaultPageSize = Number(document.querySelector("#prefPageSize")?.value || state.prefs.defaultPageSize);
    state.table.pageSize = state.prefs.defaultPageSize;
    state.prefs.graphWindow = Number(document.querySelector("#prefWindow")?.value || state.prefs.graphWindow);
    savePrefs();
    toast("Preferences saved", "Your settings will be kept in this browser.");
    render();
    return true;
  }

  return false;
}
