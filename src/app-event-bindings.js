export function createAppEventBindings(getDeps) {
  const current = () => getDeps();
  const call = (name, ...args) => {
    const fn = current()[name];
    if (typeof fn !== "function") throw new Error(`Missing app event dependency: ${name}`);
    return fn(...args);
  };
  const proxiedObject = name => new Proxy({}, {
    get(_target, prop) {
      const source = current()[name] || globalThis[name];
      const value = source?.[prop];
      return typeof value === "function" ? value.bind(source) : value;
    },
    set(_target, prop, value) {
      const source = current()[name] || globalThis[name];
      if (!source) return false;
      source[prop] = value;
      return true;
    },
    has(_target, prop) { return prop in ((current()[name] || globalThis[name]) || {}); },
    ownKeys() { return Reflect.ownKeys((current()[name] || globalThis[name]) || {}); },
    getOwnPropertyDescriptor(_target, prop) {
      const source = (current()[name] || globalThis[name]) || {};
      return Object.getOwnPropertyDescriptor(source, prop) || { configurable: true, enumerable: true, writable: true, value: source[prop] };
    }
  });

  const document = proxiedObject("document");
  const window = proxiedObject("window");
  const state = proxiedObject("state");
  const localStorage = proxiedObject("localStorage");
  const icons = proxiedObject("icons");
  const EXPERT_CORRELATIONS = proxiedObject("EXPERT_CORRELATIONS");
  const PRE_IMPORT_PRESETS = proxiedObject("PRE_IMPORT_PRESETS");
  const ANALYSIS_TEMPLATES = proxiedObject("ANALYSIS_TEMPLATES");
  const NodeFilter = proxiedObject("NodeFilter");
  function appEventDependencies() { return current(); }
  function cmInstanceRef() { return current().cmInstance || null; }
  function requestAnimationFrame(callback) {
    const raf = current().requestAnimationFrame || globalThis.requestAnimationFrame || (fn => setTimeout(fn, 16));
    return raf(callback);
  }
  function handleGlobalKeydown(...args) { return call("handleGlobalKeydown", ...args); }
  function bindSmartChartTooltips(...args) { return call("bindSmartChartTooltips", ...args); }
  function bindColumnHelpTooltips(...args) { return call("bindColumnHelpTooltips", ...args); }
  function sortedFilteredSockets(...args) { return call("sortedFilteredSockets", ...args); }
  function visibleColumns(...args) { return call("visibleColumns", ...args); }
  function escapeHtml(...args) { return call("escapeHtml", ...args); }
  function renderRowActions(...args) { return call("renderRowActions", ...args); }
  function render(...args) { return call("render", ...args); }
  function handleIngestAction(...args) { return call("handleIngestAction", ...args); }
  function ingestActionDependencies(...args) { return call("ingestActionDependencies", ...args); }
  function openIncidentReport(...args) { return call("openIncidentReport", ...args); }
  function exportEvidencePack(...args) { return call("exportEvidencePack", ...args); }
  function toast(...args) { return call("toast", ...args); }
  function annotationAnchorOptions(...args) { return call("annotationAnchorOptions", ...args); }
  function annotationDefaultLabel(...args) { return call("annotationDefaultLabel", ...args); }
  function visibleHistory(...args) { return call("visibleHistory", ...args); }
  function annotationSocketId(...args) { return call("annotationSocketId", ...args); }
  function saveAnnotations(...args) { return call("saveAnnotations", ...args); }
  function renderKeepingWorkspacePosition(...args) { return call("renderKeepingWorkspacePosition", ...args); }
  function zoomToTailLatencyWindow(...args) { return call("zoomToTailLatencyWindow", ...args); }
  function applyDashboardPreset(...args) { return call("applyDashboardPreset", ...args); }
  function resetAllState(...args) { return call("resetAllState", ...args); }
  function _undo(...args) { return call("_undo", ...args); }
  function _redo(...args) { return call("_redo", ...args); }
  function _undoSnapshot(...args) { return call("_undoSnapshot", ...args); }
  function renderModal(...args) { return call("renderModal", ...args); }
  function parseGcLog(...args) { return call("parseGcLog", ...args); }
  function runJvmCorrelation(...args) { return call("runJvmCorrelation", ...args); }
  function drawJvmCharts(...args) { return call("drawJvmCharts", ...args); }
  function toggleFixPlayback(...args) { return call("toggleFixPlayback", ...args); }
  function selectedSocket(...args) { return call("selectedSocket", ...args); }
  function anomaliesBySocketId(...args) { return call("anomaliesBySocketId", ...args); }
  function applyContextAction(...args) { return call("applyContextAction", ...args); }
  function chartMetricList(...args) { return call("chartMetricList", ...args); }
  function syncChartHistoryToSelection(...args) { return call("syncChartHistoryToSelection", ...args); }
  function openAnnotationModal(...args) { return call("openAnnotationModal", ...args); }
  function bindTableInteractionEvents(...args) { return call("bindTableInteractionEvents", ...args); }
  function tableInteractionDependencies(...args) { return call("tableInteractionDependencies", ...args); }
  function bindSocketInteractionEvents(...args) { return call("bindSocketInteractionEvents", ...args); }
  function socketInteractionDependencies(...args) { return call("socketInteractionDependencies", ...args); }
  function closeDashboardPresetMenu(...args) { return call("closeDashboardPresetMenu", ...args); }
  function commitDashboardPresetChoice(...args) { return call("commitDashboardPresetChoice", ...args); }
  function applyDashboardProfile(...args) { return call("applyDashboardProfile", ...args); }
  function saveDashboardProfiles(...args) { return call("saveDashboardProfiles", ...args); }
  function saveAlertAcks(...args) { return call("saveAlertAcks", ...args); }
  function defaultAlertRules(...args) { return call("defaultAlertRules", ...args); }
  function saveAlertRules(...args) { return call("saveAlertRules", ...args); }
  function saveFilterHistory(...args) { return call("saveFilterHistory", ...args); }
  function hasPreImportFilterValue(...args) { return call("hasPreImportFilterValue", ...args); }
  function emptyPreImportFilters(...args) { return call("emptyPreImportFilters", ...args); }
  function importFile(...args) { return call("importFile", ...args); }
  function openTopologyModal(...args) { return call("openTopologyModal", ...args); }
  function renderKeepingModalPosition(...args) { return call("renderKeepingModalPosition", ...args); }
  function socketsById(...args) { return call("socketsById", ...args); }
  function focusSocket(...args) { return call("focusSocket", ...args); }
  function hideAppServiceTooltip(...args) { return call("hideAppServiceTooltip", ...args); }
  function showAppServiceTooltip(...args) { return call("showAppServiceTooltip", ...args); }
  function applyAnalysisTemplate(...args) { return call("applyAnalysisTemplate", ...args); }
  function savePrefs(...args) { return call("savePrefs", ...args); }
  function normalizeBdpDirection(...args) { return call("normalizeBdpDirection", ...args); }
  function syncSsCommandFromBuilder(...args) { return call("syncSsCommandFromBuilder", ...args); }
  function toggleCommandOption(...args) { return call("toggleCommandOption", ...args); }
  function normalizeSsEditorTheme(...args) { return call("normalizeSsEditorTheme", ...args); }
  function applySsEditorThemePreview(...args) { return call("applySsEditorThemePreview", ...args); }
  function resetSsEditorThemePreview(...args) { return call("resetSsEditorThemePreview", ...args); }
  function drawFixCharts(...args) { return call("drawFixCharts", ...args); }
  function runFixCorrelation(...args) { return call("runFixCorrelation", ...args); }
  function sourceFileEventDependencies(...args) { return call("sourceFileEventDependencies", ...args); }
  function bindSourceFileEvents(...args) { return call("bindSourceFileEvents", ...args); }
  function setZoom(...args) { return call("setZoom", ...args); }
  function clearVisibleHistoryCache(...args) { return call("clearVisibleHistoryCache", ...args); }
  function saveTableState(...args) { return call("saveTableState", ...args); }
  function moveVisibleChartMetric(...args) { return call("moveVisibleChartMetric", ...args); }
  function showPercentileTableCrosshair(...args) { return call("showPercentileTableCrosshair", ...args); }
  function clearPercentileTableCrosshair(...args) { return call("clearPercentileTableCrosshair", ...args); }
  function exportChartAsPng(...args) { return call("exportChartAsPng", ...args); }
  function copyTextToClipboard(...args) { return call("copyTextToClipboard", ...args); }
  function buildJiraReport(...args) { return call("buildJiraReport", ...args); }
  function exportIncidentReportHtml(...args) { return call("exportIncidentReportHtml", ...args); }
  function exportFixSpikeCsv(...args) { return call("exportFixSpikeCsv", ...args); }
  function createBaseline(...args) { return call("createBaseline", ...args); }
  function formatNumber(...args) { return call("formatNumber", ...args); }
  function handleLayoutProfileAction(...args) { return call("handleLayoutProfileAction", ...args); }
  function layoutProfileActionDependencies(...args) { return call("layoutProfileActionDependencies", ...args); }
  function handleServiceConfigAction(...args) { return call("handleServiceConfigAction", ...args); }
  function serviceConfigActionDependencies(...args) { return call("serviceConfigActionDependencies", ...args); }
  function setZoomFromDateInputs(...args) { return call("setZoomFromDateInputs", ...args); }
  function applyChartZoomAction(...args) { return call("applyChartZoomAction", ...args); }
  function clampZoomRange(...args) { return call("clampZoomRange", ...args); }
  function drawBdpWindowCharts(...args) { return call("drawBdpWindowCharts", ...args); }

function bindChartMinimapEvents(deps = appEventDependencies()) {
  const {
    root = document,
    state: appState = state,
    drawSingleMinimap: drawMinimap = drawSingleMinimap,
    drawChartInto: drawInto = drawChartInto,
    chartZoomFor: zoomFor = chartZoomFor,
    clearVisibleHistoryCache: clearVisible = clearVisibleHistoryCache
  } = deps;
  root.querySelectorAll("[data-minimap]").forEach(canvas => {
    let dragging = false;
    const getMetric = () => canvas.dataset.minimap;
    const panTo = (e) => {
      const rect = canvas.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const metric = getMetric();
      const zoom = zoomFor(metric);
      const span = zoom.end - zoom.start;
      const newStart = Math.max(0, Math.min(1 - span, frac - span / 2));
      if (!appState.chartZoomByMetric) appState.chartZoomByMetric = {};
      appState.chartZoomByMetric[metric] = { start: newStart, end: newStart + span };
      clearVisible();
      drawMinimap(canvas, metric, deps);
      const svg = canvas.parentElement?.querySelector(`[data-mini-chart="${metric}"]`);
      if (svg) drawInto(svg, metric, appState.prefs.graphStyle === "xy" ? "points" : appState.prefs.graphStyle, true, deps);
    };
    canvas.addEventListener("mousedown", e => { dragging = true; panTo(e); e.preventDefault(); });
    canvas.addEventListener("mousemove", e => { if (dragging) panTo(e); });
    canvas.addEventListener("mouseup", () => { dragging = false; });
    canvas.addEventListener("mouseleave", () => { dragging = false; });
  });
}

function bindChartChromeEvents(deps = appEventDependencies()) {
  const {
    root = document,
    state: appState = state,
    render: renderView = render,
    renderKeepingWorkspacePosition: renderStable = renderKeepingWorkspacePosition,
    drawBdpWindowCharts: drawBdp = drawBdpWindowCharts,
    drawJvmCharts: drawJvm = drawJvmCharts,
    drawFixCharts: drawFix = drawFixCharts,
    redrawChartCardMetric: redrawMetric = redrawChartCardMetric,
    applyChartZoomAction: applyZoom = applyChartZoomAction
  } = deps;
  root.querySelectorAll("[data-charts-tab]").forEach(btn => {
    btn.addEventListener("click", event => {
      const tab = event.currentTarget.dataset.chartsTab;
      if (appState.chartsTab === tab) return;
      appState.chartsTab = tab;
      renderView();
      if (tab === "fix") setTimeout(() => drawFix(deps), 100);
      if (tab === "jvm") setTimeout(() => drawJvm(deps), 100);
    });
  });
  root.querySelectorAll("[data-style-toggle]").forEach(btn => {
    btn.addEventListener("click", event => {
      event.stopPropagation();
      appState.openStyleMenu = !appState.openStyleMenu;
      const menu = btn.closest(".style-picker")?.querySelector(".style-picker-menu");
      if (menu) menu.classList.toggle("open", appState.openStyleMenu);
    });
  });
  root.querySelectorAll("[data-style-choice]").forEach(btn => {
    btn.addEventListener("click", event => {
      event.stopPropagation();
      appState.prefs.graphStyle = event.currentTarget.dataset.styleChoice;
      appState.openStyleMenu = false;
      renderStable();
    });
  });
  root.querySelectorAll("[data-chart-zoom]").forEach(btn => {
    btn.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const action = event.currentTarget.dataset.chartZoom;
      const metric = event.currentTarget.dataset.chartZoomMetric;
      applyZoom(action, metric);
      if (event.currentTarget.hasAttribute("data-bdp-zoom")) {
        appState._bdpCache = null;
        drawBdp(deps);
      } else if (event.currentTarget.hasAttribute("data-jvm-zoom")) {
        appState.jvmGc.selectedEpoch = null;
        drawJvm(deps);
      } else if (event.currentTarget.hasAttribute("data-fix-zoom")) {
        drawFix(deps);
      } else if (!redrawMetric(metric, action, deps)) renderStable();
    });
  });
}

function bindChartSeriesEvents(deps = appEventDependencies()) {
  const {
    root = document,
    state: appState = state,
    redrawChartCardMetric: redrawMetric = redrawChartCardMetric,
    drawJvmCharts: drawJvm = drawJvmCharts,
    chartSeriesKey: seriesKey = chartSeriesKey
  } = deps;
  root.querySelectorAll("[data-chart-series-toggle]").forEach(button => button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const metric = event.currentTarget.dataset.chartSeriesToggle;
    const key = event.currentTarget.dataset.chartSeriesKey;
    const fullKey = seriesKey(metric, key);
    if (!appState.hiddenChartSeries) appState.hiddenChartSeries = new Set();
    appState.hiddenChartSeries.has(fullKey) ? appState.hiddenChartSeries.delete(fullKey) : appState.hiddenChartSeries.add(fullKey);
    root.querySelectorAll("[data-chart-series-toggle]").forEach(item => {
      if (item.dataset.chartSeriesToggle !== metric || item.dataset.chartSeriesKey !== key) return;
      const hidden = appState.hiddenChartSeries.has(fullKey);
      item.classList.toggle("is-muted", hidden);
      item.setAttribute("aria-pressed", hidden ? "false" : "true");
    });
    redrawMetric(metric, `series:${key}`, deps);
  }));
  root.querySelectorAll("[data-jvm-series-key]").forEach(item => item.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const key = event.currentTarget.dataset.jvmSeriesKey;
    if (!appState.hiddenJvmSeries) appState.hiddenJvmSeries = new Set();
    appState.hiddenJvmSeries.has(key) ? appState.hiddenJvmSeries.delete(key) : appState.hiddenJvmSeries.add(key);
    root.querySelectorAll(`[data-jvm-series-key="${key}"]`).forEach(span => {
      span.style.opacity = appState.hiddenJvmSeries.has(key) ? ".4" : "";
      span.style.textDecoration = appState.hiddenJvmSeries.has(key) ? "line-through" : "";
    });
    drawJvm(deps);
  }));
}

function bindEvents(deps = appEventDependencies()) {
  document.onkeydown = handleGlobalKeydown;
  bindSmartChartTooltips();
  bindColumnHelpTooltips();
  // Virtual table scroll
  document.querySelector("[data-virtual-table]")?.addEventListener("scroll", function() {
    const prev = state.table._scrollTop || 0;
    state.table._scrollTop = this.scrollTop;
    if (Math.abs(this.scrollTop - prev) > 16) {
      const allRows = sortedFilteredSockets();
      const columns = visibleColumns();
      const ROW_HEIGHT = 32;
      const visibleCount = Math.ceil(600 / ROW_HEIGHT) + 4;
      const startIdx = Math.max(0, Math.floor(this.scrollTop / ROW_HEIGHT) - 2);
      const endIdx = Math.min(allRows.length, startIdx + visibleCount);
      const tbody = this.querySelector("tbody");
      if (tbody) {
        const slice = allRows.slice(startIdx, endIdx);
        const topPad = startIdx * ROW_HEIGHT;
        const bottomPad = Math.max(0, (allRows.length - endIdx) * ROW_HEIGHT);
        tbody.innerHTML = `<tr style="height:${topPad}px" aria-hidden="true"></tr>${slice.map(s => `<tr data-socket="${escapeHtml(s.id)}" class="${s.id === state.selectedId ? "selected" : ""}" style="height:${ROW_HEIGHT}px"><td>${renderRowActions(s)}</td>${columns.map(col => `<td class="${state.table.pinned.includes(col.key) ? "pinned-cell" : ""}">${col.render(s)}</td>`).join("")}<td class="table-settings-cell"></td></tr>`).join("")}<tr style="height:${bottomPad}px" aria-hidden="true"></tr>`;
      }
    }
  });
  document.querySelectorAll("[data-stats-sort]").forEach(th => th.addEventListener("click", () => {
    const key = th.dataset.statsSort;
    if (state.statsTableSort === key) { state.statsTableDir = state.statsTableDir === "asc" ? "desc" : "asc"; }
    else { state.statsTableSort = key; state.statsTableDir = key === "metric" ? "asc" : "desc"; }
    render();
  }));
  bindChartMinimapEvents(deps);
  bindChartChromeEvents(deps);
  document.querySelectorAll("[data-cm-search]").forEach(btn => {
    btn.addEventListener("click", () => {
      const cm = cmInstanceRef();
      if (!cm) return;
      const query = btn.dataset.cmSearch;
      cm.execCommand("findPersistent");
      setTimeout(() => {
        const input = document.querySelector(".cm-container .CodeMirror-dialog input");
        if (input) { input.value = query; input.dispatchEvent(new Event("input")); input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13 })); }
      }, 50);
    });
  });
  document.querySelectorAll("[data-action]").forEach(btn => btn.addEventListener("click", async event => {
    const action = event.currentTarget.dataset.action;
    const ingestActionFlow = await handleIngestAction(action, event, ingestActionDependencies());
    if (ingestActionFlow.stop) return;
    if (action === "exportReport") { openIncidentReport(); }
    if (action === "exportEvidencePack") { exportEvidencePack().catch(error => toast("Evidence pack failed", error.message || "Evidence pack export failed.", "danger")); }
    if (action === "saveAnnotation") {
      const anchors = annotationAnchorOptions();
      const kind = document.querySelector("#annotationKind")?.value || "custom";
      const metric = document.querySelector("#annotationMetric")?.value || "*";
      const anchor = document.querySelector("#annotationAnchor")?.value || "visible-end";
      const label = (document.querySelector("#annotationLabel")?.value || "").trim() || annotationDefaultLabel(kind);
      const note = (document.querySelector("#annotationNote")?.value || "").trim();
      const draftEpoch = Number(state.annotationDraft?.epochMs);
      const epochMs = anchor === "cursor" && Number.isFinite(draftEpoch)
        ? draftEpoch
        : anchors.find(item => item.id === anchor)?.epochMs || visibleHistory()[visibleHistory().length - 1]?.epochMs || Date.now();
      state.annotations = [...state.annotations, { id: `annotation-${Date.now()}-${Math.random().toString(16).slice(2)}`, sourceName: state.sourceName, socketId: annotationSocketId(), metric, kind, label, note, anchor, epochMs, createdAt: Date.now() }];
      saveAnnotations();
      state.modal = null;
      state.annotationContext = null;
      toast("Annotation saved", `${label} was attached to the current socket.`);
      renderKeepingWorkspacePosition();
    }
    if (action === "deleteAnnotation") {
      const annotation = state.annotations.find(item => item.id === event.currentTarget.dataset.annotationId);
      state.annotations = state.annotations.filter(item => item.id !== event.currentTarget.dataset.annotationId);
      saveAnnotations();
      toast("Annotation deleted", `${annotation?.label || "Annotation"} was removed from this socket.`);
      renderKeepingWorkspacePosition();
    }
    if (action === "zoomTailWindow") {
      const preset = event.currentTarget.dataset.dashboardPresetJump;
      state.view = "charts";
      state.chartsTab = "charts";
      if (preset) applyDashboardPreset(preset);
      if (zoomToTailLatencyWindow()) renderKeepingWorkspacePosition();
      else toast("No tail window", "No significant tail-latency window is available on the current visible history.", "warn");
    }
    if (action === "openChecklistCharts") {
      const preset = event.currentTarget.dataset.dashboardPresetJump;
      state.view = "charts";
      state.chartsTab = "charts";
      if (preset) applyDashboardPreset(preset);
      renderKeepingWorkspacePosition();
    }
    if (action === "openChecklistAdvisor") {
      state.view = "analysis";
      state.activeTab = "advisor";
      renderKeepingWorkspacePosition();
    }
    if (action === "requestResetWorkspace") {
      state.modal = "resetWorkspace";
      render();
    }
    if (action === "showSplash") {
      state.modal = "splash";
      render();
    }
    if (action === "showAnalysisViewGuide") {
      state.modal = "analysisViewGuide";
      render();
    }
    if (action === "confirmResetWorkspace") {
      resetAllState();
      toast("Workspace reset", "All loaded data, filters, zoom, and UI selections have been cleared.");
      render();
    }
    if (action === "pickFile") { document.querySelector("#fileInput")?.click(); }
    if (action === "guide") { state.drawer = "guide"; render(); }
    if (action === "prefs") { state.drawer = "prefs"; render(); }
    if (action === "toggleGearMenu") { state.gearMenuOpen = !state.gearMenuOpen; render(); return; }
    if (state.gearMenuOpen) { state.gearMenuOpen = false; }
    if (action === "undo") { _undo(); return; }
    if (action === "redo") { _redo(); return; }
    _undoSnapshot();
    if (action === "setMetricsView") { state.metricsView = event.currentTarget.dataset.metricsView; render(); }
    if (action === "prefs") { state.drawer = "prefs"; render(); }
    if (action === "showShortcuts") { state.modal = "shortcuts"; state.drawer = null; render(); }
    if (action === "startTour") { state.onboarding = 0; render(); }
    if (action === "details") { state.drawer = "details"; render(); }
    if (action === "columns") { state.modal = "columns"; render(); }
    if (action === "thresholds") { state.drawer = "thresholds"; renderKeepingWorkspacePosition(); }
    if (action === "layoutPrefs") {
      state.modal = "layout";
      const modalContainer = document.querySelector("#app .app-shell") || document.querySelector("#app");
      const existing = modalContainer.querySelector(".modal-overlay-fast");
      if (existing) existing.remove();
      const div = document.createElement("div");
      div.className = "modal-overlay-fast";
      div.innerHTML = renderModal();
      modalContainer.appendChild(div);
      bindEvents();
    }
    if (action === "serviceAliases") { state.modal = "serviceAliases"; render(); }
    if (action === "topology") {
      openTopologyModal(state);
      renderKeepingWorkspacePosition();
    }
    if (action === "pickJvmGcFile") { (document.querySelector("#ingestGcFileInput") || document.querySelector("#jvmGcFileInput"))?.click(); }
    if (action === "pickPidstatFile") { document.querySelector("#pidstatFileInput")?.click(); }
    if (action === "pickNstatFile") { document.querySelector("#nstatFileInput")?.click(); }
    if (action === "pickSarFile") { document.querySelector("#ingestSarFileInput")?.click(); }
    if (action === "toggleCorrelationSources") { state.showCorrelationSources = !state.showCorrelationSources; render(); }
    if (action === "parseJvmGcLog") {
      const text = document.querySelector("#jvmGcLogInput")?.value || "";
      if (!text.trim()) { toast("No GC log", "Paste a GC log or load a file first.", "warn"); return; }
      const { pauses, safepoints } = parseGcLog(text);
      state.jvmGc.rawLog = text;
      state.jvmGc.pauses = pauses;
      state.jvmGc.safepoints = safepoints;
      runJvmCorrelation();
      toast("GC log parsed", `${pauses.length} pauses, ${safepoints.length} safepoints detected.`);
      render();
      requestAnimationFrame(drawJvmCharts);
    }
    if (action === "clearJvmGcLog") {
      state.jvmGc = { rawLog: "", pauses: [], safepoints: [], correlation: null, clockOffsetMs: 0 };
      render();
    }
    if (action === "expandFixChart") { const id = event.currentTarget.dataset.fixChartId; state.fixLatency.expandedChart = state.fixLatency.expandedChart === id ? null : id; render(); setTimeout(drawFixCharts, 50); }
    if (action === "fixPlayback") { toggleFixPlayback(); }
    if (action === "fixTablePrev") { state.fixTable.page = Math.max(1, state.fixTable.page - 1); render(); }
    if (action === "fixTableNext") { state.fixTable.page++; render(); }
    if (action === "openMetricIntelligence") { state.helpColumn = event.currentTarget.dataset.field; state.modal = "columnHelp"; render(); }
    if (action === "filterStorySocket") { state.storySocketFilter = event.currentTarget.dataset.socketKey; render(); }
    if (action === "dismissOnboarding") { localStorage.setItem("onboarded", "1"); render(); }
    if (action === "closeCmdPalette") { state.modal = null; render(); }
    if (action === "cmdPaletteSelect") { state.selectedId = event.currentTarget.dataset.socketId; state.modal = null; state.view = "analysis"; state.activeTab = "sockets"; render(); }
    if (action === "cmdPaletteTab") { state.activeTab = event.currentTarget.dataset.tab; state.modal = null; state.view = "analysis"; render(); }
    if (action === "cmdPaletteMetric") { state.prefs.graphMetric = event.currentTarget.dataset.metric; state.modal = null; state.view = "charts"; state.chartsTab = "charts"; render(); }
    if (action === "pickPeerSs") { document.querySelector("#ingestPeerSsInput")?.click(); }
    if (action === "pickAutoDir") { document.querySelector("#ingestAutoDir")?.click(); }
    if (action === "pickFixFile") { (document.querySelector("#ingestFixFileInput") || document.querySelector("#fixFileInput"))?.click(); }
    if (action === "pickFixDir") { const el = document.querySelector("#ingestFixDirInput") || document.querySelector("#fixDirInput"); if (el) el.click(); }
    if (action === "pickFixVmstatFile") { (document.querySelector("#ingestVmstatFileInput") || document.querySelector("#fixVmstatFileInput"))?.click(); }
    if (action === "pickFixNstatFile") { (document.querySelector("#ingestNstatFileInput") || document.querySelector("#fixNstatFileInput"))?.click(); }
    if (action === "clearFixLog") {
      state.fixLatency = { records: [], correlation: null, threshold: 5, fileStats: [], vmstat: null, nstat: null };
      state.fixTable = { page: 1, pageSize: 20, sortKey: "lag", sortDir: "desc" };
      render();
    }
    if (action === "setBaseline") {
      state.baseline = createBaseline();
      state.baseline.role = "healthy";
      state.activeTab = "compare";
      toast("Healthy baseline captured", `${formatNumber(state.baseline.sockets.length)} sockets saved. Now load the incident capture.`);
      render();
    }
    if (action === "setBaselineAsIncident") {
      state.baseline = createBaseline();
      state.baseline.role = "incident";
      state.activeTab = "compare";
      toast("Incident baseline captured", `${formatNumber(state.baseline.sockets.length)} sockets saved. Now load the post-fix capture to see what recovered.`);
      render();
    }
    if (action === "clearBaseline") {
      state.baseline = null;
      toast("Baseline cleared", "Before/after comparison is reset.");
      render();
    }
    if (action === "timelineView") {
      state.timelineView = event.currentTarget.dataset.value || "stories";
      render();
    }
    if (action === "heatmapRes") {
      state._heatmapResMs = Number(event.currentTarget.value);
      render();
    }
    if (action === "diagnosisView") {
      state.diagnosisView = event.currentTarget.dataset.value || "matrix";
      render();
    }
    if (action === "expandChart") {
      const metric = event.currentTarget.dataset.metric;
      state.expandedChart = state.expandedChart === metric ? null : metric;
      render();
      if (state.expandedChart) requestAnimationFrame(() => {
        const card = document.querySelector(`[data-chart-card="${metric}"]`);
        if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    if (action === "toggleTheme") {
      state.prefs.theme = state.prefs.theme === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", state.prefs.theme);
      savePrefs();
      render();
    }
    if (action === "toggleDensity") {
      state.prefs.density = state.prefs.density === "compact" ? "comfortable" : "compact";
      if (state.prefs.density === "compact") { document.documentElement.setAttribute("data-density", "compact"); }
      else { document.documentElement.removeAttribute("data-density"); }
      savePrefs();
      render();
    }
    if (action === "togglePresentation") {
      document.documentElement.classList.toggle("presentation-mode");
      toast(document.documentElement.classList.contains("presentation-mode") ? "Presentation mode on" : "Presentation mode off", "Press Escape or click again to exit.");
    }
    if (action === "nextOnboarding") {
      state.onboarding += 1;
      render();
    }
    if (action === "skipOnboarding" || action === "finishOnboarding") {
      state.onboarding = -1;
      localStorage.setItem("networkExpertOnboarded", "1");
      render();
    }
    if (action === "storyJumpToChart") {
      const epoch = Number(event.currentTarget.dataset.epoch);
      const metric = event.currentTarget.dataset.metric || "";
      const label = event.currentTarget.dataset.label || "";
      const history = state.history || [];
      if (history.length >= 2 && epoch) {
        const first = history[0].epochMs;
        const last = history[history.length - 1].epochMs;
        const range = last - first;
        if (range > 0) {
          const pos = (epoch - first) / range;
          const window = Math.min(0.2, 8000 / range);
          const zoomStart = Math.max(0, pos - window);
          const zoomEnd = Math.min(1, pos + window);
          setZoom(zoomStart, zoomEnd);
          const actualRange = zoomEnd - zoomStart;
          state.storyMarkerPct = actualRange > 0 ? ((pos - zoomStart) / actualRange) * 100 : 50;
          state.storyMarkerMetric = metric;
          if (metric && !state.chartMetrics.includes(metric)) {
            state.chartMetrics.push(metric);
          }
          clearTimeout(state._storyMarkerTimer);
          const annotationId = `story-${epoch}-${metric}`;
          if (!state.annotations.some(a => a.id === annotationId)) {
            state.annotations = [...state.annotations, { id: annotationId, sourceName: state.sourceName, socketId: state.selectedId || "", metric: metric || "*", kind: "story", label: label || "story event", note: "", anchor: "cursor", epochMs: epoch, createdAt: Date.now() }];
            saveAnnotations();
          }
        }
      }
      state.view = "charts";
      state.chartsTab = "charts";
      render();
      if (metric) requestAnimationFrame(() => {
        const card = document.querySelector(`[data-chart-card="${metric}"]`);
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      toast("Chart zoomed", `Focused on ${metric || "event"} at this timestamp.`);
    }
    if (action === "copyAdvisorCommands") {
      const finding = state.advisorFindings.find(item => item.id === event.currentTarget.dataset.findingId);
      await copyTextToClipboard((finding?.commands || []).join("\n"));
      toast("Advisor commands copied", "Suggested command line evidence has been copied.");
    }
    if (action === "copyGuideCommand") {
      const card = event.currentTarget.closest("[data-guide-command-card]");
      const command = card?.querySelector("pre")?.textContent || "";
      let ok = false;
      try {
        ok = await copyTextToClipboard(command);
      } catch {
        ok = false;
      }
      if (!ok) {
        toast("Copy failed", "The command could not be copied by the browser.", "danger");
        return;
      }
      const key = event.currentTarget.dataset.commandKey || "";
      state.copiedGuideCommand = key;
      event.currentTarget.classList.add("copied");
      event.currentTarget.innerHTML = `<i class="ri-check-line"></i> Copied`;
      toast("Command copied", "The command line is now in the clipboard.");
      setTimeout(() => {
        if (state.copiedGuideCommand === key) state.copiedGuideCommand = "";
        const button = [...document.querySelectorAll("[data-command-key]")].find(item => item.dataset.commandKey === key);
        if (button) {
          button.classList.remove("copied");
          button.innerHTML = `${icons.copy} Copy`;
        }
      }, 2200);
    }
    if (action === "addAlertRule") {
      const name = document.querySelector("#alertRuleName")?.value.trim() || "";
      const metric = document.querySelector("#alertRuleMetric")?.value || "rtt";
      const op = document.querySelector("#alertRuleOp")?.value || ">=";
      const value = Number(document.querySelector("#alertRuleValue")?.value || 0);
      const severity = document.querySelector("#alertRuleSeverity")?.value || "medium";
      if (!name || !Number.isFinite(value)) {
        toast("Alert rule incomplete", "Add a name and numeric threshold before saving the rule.", "danger");
        return;
      }
      state.alertRules = [{ id: `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`, name, metric, op, value, severity, enabled: true }, ...state.alertRules];
      saveAlertRules();
      toast("Alert rule added", `${name} is now evaluated against parsed sockets.`);
      render();
    }
    if (action === "ackAllAlerts") {
      state.alertEvents.filter(event => !event.acknowledged).forEach(event => { state.alertAcks[event.id] = Date.now(); });
      saveAlertAcks();
      toast("Alerts acknowledged", "All current active alerts were acknowledged.");
      render();
    }
    if (action === "resetAlertRules") {
      state.alertRules = defaultAlertRules();
      state.alertAcks = {};
      saveAlertRules();
      saveAlertAcks();
      toast("Default alert rules restored", "Alert rules and acknowledgements were reset.");
      render();
    }
    if (action === "clearFilterHistory") {
      state.filterHistory = [];
      saveFilterHistory();
      toast("Filter history cleared", "Saved filter suggestions have been removed.");
      render();
    }
    if (action === "startImportWithFilters") {
      const nextFilters = {
        enabled: true,
        protocol: document.querySelector("#preProtocol")?.value || "",
        state: document.querySelector("#preState")?.value || "",
        srcIp: document.querySelector("#preSrcIp")?.value.trim() || "",
        dstIp: document.querySelector("#preDstIp")?.value.trim() || "",
        anyPort: document.querySelector("#preAnyPort")?.value.trim() || "",
        srcPort: document.querySelector("#preSrcPort")?.value.trim() || "",
        dstPort: document.querySelector("#preDstPort")?.value.trim() || ""
      };
      const hasFilterValue = hasPreImportFilterValue(nextFilters);
      nextFilters.enabled = hasFilterValue;
      state.preImportFilters = nextFilters;
      if (!hasFilterValue) {
        toast("No filter selected", "Use Import full file, or choose at least one preset or field filter.", "warn");
        return;
      }
      const file = state.pendingFile;
      state.pendingFile = null;
      state.modal = null;
      if (!file) {
        toast("Choose a file", "Select an ss capture before applying import-time filters.", "warn");
        document.querySelector("#fileInput")?.click();
        return;
      }
      if (file) importFile(file).catch(error => {
        state.importStatus = null;
        toast("Import failed", error.message || "The selected file could not be read.", "danger");
        render();
      });
    }
    if (action === "startImportAll") {
      state.preImportFilters = emptyPreImportFilters();
      const file = state.pendingFile;
      state.pendingFile = null;
      state.modal = null;
      if (!file) {
        document.querySelector("#fileInput")?.click();
        return;
      }
      if (file) importFile(file).catch(error => {
        state.importStatus = null;
        toast("Import failed", error.message || "The selected file could not be read.", "danger");
        render();
      });
    }
    if (action === "zoomIn" || action === "zoomOut" || action === "panLeft" || action === "panRight" || action === "resetZoom") {
      applyChartZoomAction(action);
      renderKeepingWorkspacePosition();
    }
    if (action === "saveCharts") { saveChartsPng().catch(error => toast("Export failed", error.message || "PNG export failed.", "danger")); }
    if (handleLayoutProfileAction(action, event, layoutProfileActionDependencies())) return;
    if (handleServiceConfigAction(action, event, serviceConfigActionDependencies())) return;
    if (action === "closeDrawer") {
      const wasThresholds = state.drawer === "thresholds";
      state.drawer = null;
      if (wasThresholds && state.view === "charts") {
        const drawerEl = document.querySelector(".drawer-overlay, .drawer");
        if (drawerEl) drawerEl.remove();
        const backdrop = document.querySelector(".drawer-backdrop");
        if (backdrop) backdrop.remove();
      } else {
        render();
      }
    }
    if (action === "closeModal") {
      state.modal = null; state.helpColumn = null; state.helpMetric = null; state.annotationContext = null;
      const fast = document.querySelector(".modal-overlay-fast");
      if (fast) { fast.remove(); return; }
      render();
    }
  }));

  document.querySelectorAll("[data-context-action]").forEach(btn => btn.addEventListener("click", event => {
    const action = event.currentTarget.dataset.contextAction;
    const socket = selectedSocket();
    const suggestedMetric = socket ? anomaliesBySocketId().get(socket.id)?.[0]?.metric : null;
    const previousSelectedId = state.selectedId;
    applyContextAction(state, action, socket, { chartMetrics: chartMetricList(), suggestedMetric });
    if (action !== "clear" && state.selectedId && state.selectedId !== previousSelectedId) syncChartHistoryToSelection();
    renderKeepingWorkspacePosition();
  }));
  document.querySelectorAll("[data-pref-tab]").forEach(btn => btn.addEventListener("click", event => {
    state.prefsTab = event.currentTarget.dataset.prefTab;
    render();
  }));
  document.querySelectorAll("#prefTooltipOpacity, #layoutTooltipOpacity").forEach(slider => slider.addEventListener("input", event => {
    const val = Math.round(Number(event.target.value) * 100);
    const small = event.target.closest("label")?.querySelector("small");
    if (small) small.innerHTML = `<b>${val}%</b> opacity`;
  }));
  document.querySelectorAll("[data-topology-open]").forEach(btn => btn.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    openTopologyModal(state);
    renderKeepingWorkspacePosition();
  }));

  document.querySelector("#fileInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.pendingFile = file;
    state.modal = "preImport";
    render();
  });
  document.querySelectorAll("[data-preimport-preset]").forEach(btn => btn.addEventListener("click", event => {
    const preset = PRE_IMPORT_PRESETS.find(item => item.id === event.currentTarget.dataset.preimportPreset);
    if (!preset) return;
    state.preImportFilters = {
      ...emptyPreImportFilters(),
      ...preset.filters,
      enabled: true
    };
    toast("Pre-import preset applied", `${preset.label}: filters will run while reading the file.`);
    render();
  }));

  const openMapAliasEditor = target => {
    state.aliasEditKey = target.dataset.mapAlias;
    state.aliasEditScope = "source";
    state.modal = "serviceAliases";
    render();
  };
  document.querySelectorAll("[data-map-alias]").forEach(node => node.addEventListener("click", event => {
    event.stopPropagation();
    openMapAliasEditor(event.currentTarget);
  }));
  document.querySelectorAll("[data-map-alias]").forEach(node => node.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    openMapAliasEditor(event.currentTarget);
  }));
  document.querySelectorAll("[data-map-view]").forEach(btn => btn.addEventListener("click", () => {
    state.mapView = btn.dataset.mapView;
    render();
  }));
  document.querySelector("#sankeySortSelect")?.addEventListener("change", event => {
    state.sankeySort = event.target.value;
    render();
  });
  document.querySelector("#sankeyTimeSlider")?.addEventListener("input", event => {
    state.sankeySnapshot = parseInt(event.target.value, 10);
    render();
  });
  document.querySelectorAll("[data-map-edge]").forEach(edge => edge.addEventListener("click", event => {
    event.stopPropagation();
    state.selectedMapEdgeId = event.currentTarget.dataset.mapEdge;
    renderKeepingWorkspacePosition();
  }));
  document.querySelector("[data-map-edge-close]")?.addEventListener("click", event => {
    event.stopPropagation();
    state.selectedMapEdgeId = null;
    renderKeepingWorkspacePosition();
  });
  document.querySelectorAll("[data-map-edge-action]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const socket = socketsById().get(event.currentTarget.dataset.socketId);
    if (!socket) return;
    const action = event.currentTarget.dataset.mapEdgeAction;
    focusSocket(socket.id, "Chosen from map link");
    if (action === "details") {
      state.drawer = "details";
    }
    if (action === "chart") {
      state.view = "charts";
      const metric = anomaliesBySocketId().get(socket.id)?.[0]?.metric || "rtt";
      if (chartMetricList().includes(metric)) {
        state.prefs.graphMetric = metric;
        state.chartMetrics = [...new Set([metric, ...state.chartMetrics])];
      }
    }
    if (action === "anomalies") {
      state.view = "analysis";
      state.activeTab = "anomalies";
      state.anomalyFilters = { ...state.anomalyFilters, severity: "all", metric: "all", text: socket.id, sort: "priority" };
    }
    render();
  }));
  document.querySelectorAll("[data-alias-pick]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    state.aliasEditKey = event.currentTarget.dataset.aliasPick;
    state.aliasEditScope = event.currentTarget.dataset.aliasScope || "source";
    state.modal = "serviceAliases";
    renderKeepingModalPosition();
  }));
  document.querySelector("#aliasEndpoint")?.addEventListener("change", event => {
    state.aliasEditKey = event.target.value;
    renderKeepingModalPosition();
  });
  document.querySelector("#aliasGlobal")?.addEventListener("change", event => {
    state.aliasEditScope = event.target.checked ? "global" : "source";
    renderKeepingModalPosition();
  });
  document.querySelectorAll("[data-service-override]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    hideAppServiceTooltip();
    state.serviceOverrideSocketId = event.currentTarget.dataset.serviceOverride;
    state.modal = "serviceOverride";
    render();
  }));
  document.querySelectorAll(".app-service-chip").forEach(chip => {
    const show = () => showAppServiceTooltip(chip);
    chip.addEventListener("mouseenter", show);
    chip.addEventListener("focus", show);
    chip.addEventListener("mouseleave", hideAppServiceTooltip);
    chip.addEventListener("blur", hideAppServiceTooltip);
  });
  document.querySelector("#serviceOverrideHidden")?.addEventListener("change", event => {
    const input = document.querySelector("#serviceOverrideLabel");
    if (input) input.disabled = event.target.checked;
  });
  document.querySelectorAll("[data-topology-edit]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    openTopologyModal(state, { editId: event.currentTarget.dataset.topologyEdit, draftMatch: "" });
    renderKeepingModalPosition();
  }));
  document.querySelectorAll("[data-topology-suggest]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    openTopologyModal(state, { editId: "", draftMatch: event.currentTarget.dataset.topologySuggest });
    renderKeepingModalPosition();
  }));
  document.querySelectorAll("[data-guide-tab]").forEach(tab => tab.addEventListener("click", event => {
    state.guideTab = event.currentTarget.dataset.guideTab;
    render();
  }));
  document.querySelector("#guideSearchInput")?.addEventListener("input", event => {
    state.guideSearch = event.target.value;
    const query = event.target.value.trim();
    const content = document.querySelector(".guide-content");
    if (!content) return;
    // Remove previous highlights
    content.querySelectorAll("mark.guide-hl").forEach(m => {
      m.replaceWith(m.textContent);
    });
    if (!query) return;
    // Highlight matches in text nodes
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const walk = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walk.nextNode()) { if (regex.test(walk.currentNode.textContent)) nodes.push(walk.currentNode); regex.lastIndex = 0; }
    nodes.forEach(node => {
      const span = document.createElement("span");
      span.innerHTML = node.textContent.replace(regex, `<mark class="guide-hl">$1</mark>`);
      node.parentNode.replaceChild(span, node);
    });
    // Scroll to first match
    const first = content.querySelector("mark.guide-hl");
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  document.querySelector(".chart-context-menu")?.addEventListener("click", event => {
    event.stopPropagation();
  });
  document.querySelectorAll("[data-chart-annotation-menu]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const context = state.chartAnnotationMenuContext;
    state.chartAnnotationMenuContext = null;
    state.chartAnnotationMenuPos = null;
    if (context) openAnnotationModal(context.metric, context);
  }));
  bindTableInteractionEvents(tableInteractionDependencies());
  bindSocketInteractionEvents(socketInteractionDependencies());
  document.querySelector("[data-dashboard-preset-toggle]")?.addEventListener("click", event => {
    event.stopPropagation();
    if (state.openDashboardPresetMenu) {
      closeDashboardPresetMenu();
    } else {
      state.dashboardPresetBeforeOpen = state.activeDashboardPreset;
      state.openDashboardPresetMenu = true;
    }
    renderKeepingWorkspacePosition();
  });
  document.querySelectorAll("[data-dashboard-preset-choice]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    commitDashboardPresetChoice(event.currentTarget.dataset.dashboardPresetChoice);
  }));
  document.querySelectorAll("[data-dashboard-preset]").forEach(btn => btn.addEventListener("click", event => {
    const presetId = event.currentTarget.dataset.dashboardPreset;
    commitDashboardPresetChoice(presetId);
  }));
  document.querySelectorAll("[data-load-dashboard]").forEach(btn => btn.addEventListener("click", event => {
    applyDashboardProfile(state.dashboardProfiles.find(profile => profile.id === event.currentTarget.dataset.loadDashboard));
    toast("Dashboard loaded", "Saved widgets, layout, style, and correlation were restored.");
    render();
  }));
  document.querySelectorAll("[data-delete-dashboard]").forEach(btn => btn.addEventListener("click", event => {
    state.dashboardProfiles = state.dashboardProfiles.filter(profile => profile.id !== event.currentTarget.dataset.deleteDashboard);
    saveDashboardProfiles();
    toast("Dashboard deleted", "The saved dashboard has been removed.");
    render();
  }));
  document.querySelectorAll("[data-template-apply]").forEach(btn => btn.addEventListener("click", event => {
    const templateId = event.currentTarget.dataset.templateApply;
    applyAnalysisTemplate(templateId);
    toast("Analysis template applied", ANALYSIS_TEMPLATES[templateId]?.name || "Template applied.");
    render();
  }));
  document.querySelectorAll("[data-alert-ack]").forEach(btn => btn.addEventListener("click", event => {
    const id = event.currentTarget.dataset.alertAck;
    if (state.alertAcks[id]) delete state.alertAcks[id];
    else state.alertAcks[id] = Date.now();
    saveAlertAcks();
    render();
  }));
  document.querySelectorAll("[data-alert-rule-toggle]").forEach(input => input.addEventListener("change", event => {
    const rule = state.alertRules.find(item => item.id === event.currentTarget.dataset.alertRuleToggle);
    if (rule) rule.enabled = event.currentTarget.checked;
    saveAlertRules();
    render();
  }));
  document.querySelectorAll("[data-alert-rule-delete]").forEach(btn => btn.addEventListener("click", event => {
    state.alertRules = state.alertRules.filter(rule => rule.id !== event.currentTarget.dataset.alertRuleDelete);
    saveAlertRules();
    render();
  }));
  document.querySelectorAll("[data-chart-drag]").forEach(handle => {
    handle.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", handle.dataset.chartDrag);
      handle.closest(".chart-card")?.classList.add("dragging");
    });
    handle.addEventListener("dragend", () => {
      handle.closest(".chart-card")?.classList.remove("dragging");
      document.querySelectorAll(".chart-card.drag-over").forEach(el => el.classList.remove("drag-over"));
    });
  });
  document.querySelectorAll(".chart-card").forEach(card => {
    card.addEventListener("dragover", e => { e.preventDefault(); card.classList.add("drag-over"); });
    card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
    card.addEventListener("drop", e => {
      e.preventDefault();
      card.classList.remove("drag-over");
      const from = e.dataTransfer.getData("text/plain");
      const to = card.querySelector("[data-chart-drag]")?.dataset.chartDrag || card.querySelector("[data-mini-chart]")?.dataset.miniChart;
      if (from && to && from !== to && moveVisibleChartMetric(from, to)) render();
    });
  });
  document.querySelectorAll("[data-chart-move]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const metric = event.currentTarget.dataset.chartMove;
    const direction = event.currentTarget.dataset.chartMoveDir;
    state.openChartMoveMetric = null;
    state.openChartMovePos = null;
    if (moveVisibleChartMetric(metric, direction)) {
      // Swap DOM elements instead of full re-render
      const cards = [...document.querySelectorAll("[data-chart-card]")];
      const card = cards.find(c => c.dataset.chartCard === metric);
      if (card && card.parentElement) {
        const parent = card.parentElement;
        const idx = cards.indexOf(card);
        const targetIdx = direction === "left" || direction === "up" ? idx - 1 : idx + 1;
        const target = cards[targetIdx];
        if (target) { direction === "left" || direction === "up" ? parent.insertBefore(card, target) : parent.insertBefore(target, card); }
      }
      // Close menu without full render
      document.querySelectorAll(".chart-move-menu.open").forEach(m => m.classList.remove("open"));
    }
  }));
  document.querySelectorAll("[data-percentile-row]").forEach(row => {
    const showCrosshair = () => {
      showPercentileTableCrosshair(
        Number(row.dataset.percentileRow || 0),
        row.dataset.percentileLabel || "",
        Number(row.dataset.percentileValue || 0)
      );
    };
    row.addEventListener("mouseenter", showCrosshair);
    row.addEventListener("focus", showCrosshair);
    row.addEventListener("mouseleave", clearPercentileTableCrosshair);
    row.addEventListener("blur", clearPercentileTableCrosshair);
  });
  document.querySelectorAll("[data-move-chart]").forEach(btn => btn.addEventListener("click", event => {
    const metric = event.currentTarget.dataset.moveChart;
    const dir = Number(event.currentTarget.dataset.dir);
    if (event.currentTarget.closest("[data-chart-card]")) {
      if (moveVisibleChartMetric(metric, dir)) renderKeepingWorkspacePosition();
      return;
    }
    const order = [...state.prefs.chartLayout.panelOrder];
    const index = order.indexOf(metric);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    state.prefs.chartLayout.panelOrder = order;
    savePrefs();
    render();
  }));
  document.querySelectorAll("[data-opt]").forEach(input => {
    const stopOptionBubble = event => event.stopPropagation();
    input.addEventListener("pointerdown", stopOptionBubble);
    input.addEventListener("click", stopOptionBubble);
    input.addEventListener("change", event => {
      event.stopPropagation();
      const opt = event.currentTarget.dataset.opt;
      state.ssOptionHelpKey = opt;
      state.command = toggleCommandOption(state.command, opt, event.currentTarget.checked);
      const cmdEl = document.querySelector(".ss-command-text");
      if (cmdEl) { cmdEl.textContent = state.command; return; }
      renderKeepingWorkspacePosition();
    });
  });
  document.querySelectorAll("[id^='ssCmd']").forEach(input => {
    const eventName = input.type === "checkbox" ? "change" : "input";
    input.addEventListener(eventName, () => syncSsCommandFromBuilder());
  });
  document.querySelector("#commandInput")?.addEventListener("input", event => {
    state.command = event.currentTarget.value;
  });
  document.querySelectorAll("[data-ss-option-help]").forEach(button => {
    const showHelp = event => {
      if (event.target?.closest("label.ss-option-check")) return;
      event.stopPropagation();
      const nextKey = event.currentTarget.dataset.ssOptionHelp;
      if (!nextKey || nextKey === state.ssOptionHelpKey) return;
      state.ssOptionHelpKey = nextKey;
      renderKeepingWorkspacePosition();
    };
    button.addEventListener("click", showHelp);
    button.addEventListener("focus", showHelp);
    button.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      showHelp(event);
    });
  });
  for (const [id, key] of [["metricSelect", "graphMetric"], ["styleSelect", "graphStyle"]]) {
    document.querySelector(`#${id}`)?.addEventListener("change", e => { state.prefs[key] = e.target.value; savePrefs(); renderKeepingWorkspacePosition(); });
  }
  document.querySelector("[data-ss-theme-picker]")?.addEventListener("pointerleave", () => {
    if (state.openSsEditorThemeMenu) resetSsEditorThemePreview();
  });
  document.querySelectorAll("[data-ss-editor-theme-preview]").forEach(button => {
    const preview = event => {
      event.stopPropagation();
      applySsEditorThemePreview(event.currentTarget.dataset.ssEditorThemePreview);
    };
    button.addEventListener("pointerenter", preview);
    button.addEventListener("focus", preview);
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      syncFromCodeMirror();
      state.prefs.ssEditorTheme = normalizeSsEditorTheme(event.currentTarget.dataset.ssEditorThemePreview);
      state.openSsEditorThemeMenu = false;
      savePrefs();
      renderKeepingWorkspacePosition();
    });
    button.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        state.openSsEditorThemeMenu = false;
        resetSsEditorThemePreview();
        renderKeepingWorkspacePosition();
      }
    });
  });
  document.querySelector("#chartTimeZoneSelect")?.addEventListener("change", e => { state.prefs.chartTimeZone = e.target.value; savePrefs(); renderKeepingWorkspacePosition(); });
  document.querySelector("#jvmSyncCrosshair")?.addEventListener("change", e => {
    state.jvmGc.syncCrosshair = e.target.checked;
  });
  document.querySelector("#jvmSeverityFilter")?.addEventListener("change", e => {
    state.jvmGc.severityFilter = e.target.value;
    if (state.jvmTable) state.jvmTable.page = 1;
    render();
    requestAnimationFrame(drawJvmCharts);
  });
  document.querySelector("#jvmClockOffset")?.addEventListener("change", e => {
    state.jvmGc.clockOffsetMs = Number(e.target.value) || 0;
    runJvmCorrelation();
    render();
    requestAnimationFrame(drawJvmCharts);
  });
  bindSourceFileEvents(sourceFileEventDependencies());
  document.querySelector("#cmdPaletteInput")?.addEventListener("input", e => { state.commandPaletteQuery = e.target.value; state.cmdPaletteIdx = 0; render(); setTimeout(() => document.querySelector("#cmdPaletteInput")?.focus(), 10); });
  document.querySelector("#cmdPaletteInput")?.addEventListener("keydown", e => {
    const items = document.querySelectorAll(".cmd-palette-results button");
    if (e.key === "ArrowDown") { e.preventDefault(); state.cmdPaletteIdx = Math.min((state.cmdPaletteIdx || 0) + 1, items.length - 1); items.forEach((b, i) => b.classList.toggle("active", i === state.cmdPaletteIdx)); }
    if (e.key === "ArrowUp") { e.preventDefault(); state.cmdPaletteIdx = Math.max((state.cmdPaletteIdx || 0) - 1, 0); items.forEach((b, i) => b.classList.toggle("active", i === state.cmdPaletteIdx)); }
    if (e.key === "Enter") { e.preventDefault(); const active = items[state.cmdPaletteIdx || 0]; if (active) active.click(); }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && state.modal === "commandPalette") { state.modal = null; render(); } });
  document.querySelectorAll("[data-fix-epoch]").forEach(row => {
    row.addEventListener("click", () => {
      const epoch = Number(row.dataset.fixEpoch);
      state.fixTable.selectedEpoch = state.fixTable.selectedEpoch === epoch ? null : epoch;
      document.querySelectorAll("[data-fix-epoch]").forEach(r => r.classList.toggle("fix-selected-row", Number(r.dataset.fixEpoch) === state.fixTable.selectedEpoch));
      drawFixCharts();
    });
  });
  document.querySelectorAll("[data-fix-zoom-chart]").forEach(btn => {
    btn.addEventListener("click", () => {
      const chartId = btn.dataset.fixZoomChart;
      const action = btn.dataset.fixZoomAction;
      const z = state.fixLatency.zoom[chartId] || (state.fixLatency.zoom[chartId] = { start: 0, end: 1 });
      const span = z.end - z.start;
      if (action === "zoomIn") { const d = span * 0.2; z.start += d; z.end -= d; }
      else if (action === "zoomOut") { const d = span * 0.3; z.start = Math.max(0, z.start - d); z.end = Math.min(1, z.end + d); }
      else if (action === "panLeft") { const d = span * 0.2; z.start = Math.max(0, z.start - d); z.end = Math.max(z.start + 0.01, z.end - d); }
      else if (action === "panRight") { const d = span * 0.2; z.end = Math.min(1, z.end + d); z.start = Math.min(z.end - 0.01, z.start + d); }
      else if (action === "resetZoom") { z.start = 0; z.end = 1; }
      drawFixCharts();
    });
  });
  document.querySelectorAll("[data-fix-series]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.fixSeries;
      const s = state.fixLatency.hiddenSeries;
      s.has(key) ? s.delete(key) : s.add(key);
      btn.classList.toggle("is-muted", s.has(key));
      drawFixCharts();
    });
  });
  document.querySelector("#fixCpuCores")?.addEventListener("change", e => {
    state.fixLatency.cpuCores = parseInt(e.target.value, 10) || 0;
    runFixCorrelation();
    render();
    requestAnimationFrame(drawFixCharts);
  });
  document.querySelector("#whatIfMultiplier")?.addEventListener("change", e => {
    state.whatIfMultiplier = parseInt(e.target.value, 10) || 2;
    render();
  });
  document.querySelector("#fixShowGcZones")?.addEventListener("change", e => {
    state.fixLatency.showGcZones = e.target.checked;
    drawFixCharts();
  });
  document.querySelector("#fixGcWindowInput")?.addEventListener("change", e => {
    state.fixLatency.gcWindowMs = parseInt(e.target.value, 10) || 200;
    runFixCorrelation();
    render();
    requestAnimationFrame(drawFixCharts);
  });
  document.querySelector("#fixCauseFilter")?.addEventListener("change", e => {
    state.fixTable.causeFilter = e.target.value;
    state.fixTable.page = 1;
    render();
  });
  document.querySelectorAll("[data-fix-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.fixSort;
      if (state.fixTable.sortKey === key) state.fixTable.sortDir = state.fixTable.sortDir === "desc" ? "asc" : "desc";
      else { state.fixTable.sortKey = key; state.fixTable.sortDir = "desc"; }
      render();
    });
  });
  document.querySelector("#bdpDirectionSelect")?.addEventListener("change", e => {
    state.prefs.bdpDirection = normalizeBdpDirection(e.target.value);
    state._bdpCache = null;
    savePrefs();
    renderKeepingWorkspacePosition();
  });
  document.querySelector("#bdpCapacityInput")?.addEventListener("change", e => {
    const value = Number(e.target.value || 0);
    state.prefs.configuredLinkCapacityMbps = Number.isFinite(value) && value > 0 ? value : "";
    state._bdpCache = null;
    savePrefs();
    renderKeepingWorkspacePosition();
  });
  for (const [id, key] of [["windowInput", "graphWindow"], ["thresholdInput", "graphThreshold"], ["samplingInput", "sampling"]]) {
    document.querySelector(`#${id}`)?.addEventListener("change", e => { state.prefs[key] = Number(e.target.value); savePrefs(); renderKeepingWorkspacePosition(); });
  }
  document.querySelector("#startTimeInput")?.addEventListener("change", () => { setZoomFromDateInputs(); renderKeepingWorkspacePosition(); });
  document.querySelector("#endTimeInput")?.addEventListener("change", () => { setZoomFromDateInputs(); renderKeepingWorkspacePosition(); });
  document.querySelector("#searchInput")?.addEventListener("change", e => { state.table.filters.text = e.target.value; state.table.page = 1; render(); });
  for (const [id, key] of [["riskFilter", "risk"], ["stateFilter", "state"], ["familyFilter", "family"], ["processFilter", "process"], ["srcIpFilter", "srcIp"], ["dstIpFilter", "dstIp"], ["srcPortFilter", "srcPort"], ["dstPortFilter", "dstPort"], ["minRecvQ", "minRecvQ"], ["minSendQ", "minSendQ"], ["minRtt", "minRtt"]]) {
    document.querySelector(`#${id}`)?.addEventListener("change", e => { state.table.filters[key] = e.target.value; state.table.page = 1; render(); });
  }
  document.querySelectorAll("input[list]").forEach(input => {
    input.addEventListener("pointerdown", event => {
      const arrowZone = input.getBoundingClientRect().right - 34;
      if (event.clientX >= arrowZone && input.value) {
        input.dataset.restoreValue = input.value;
        input.value = "";
      }
    });
    input.addEventListener("blur", () => {
      if (input.dataset.restoreValue && input.value === "") input.value = input.dataset.restoreValue;
      delete input.dataset.restoreValue;
    });
    input.addEventListener("change", () => {
      delete input.dataset.restoreValue;
    });
  });
  document.querySelector("#onlyAnomalies")?.addEventListener("change", e => { state.table.filters.onlyAnomalies = e.target.checked; state.table.page = 1; render(); });
  document.querySelectorAll("[data-page-size]").forEach(select => select.addEventListener("change", e => { state.table.pageSize = Number(e.target.value); state.table.page = 1; saveTableState(); render(); }));
  document.querySelectorAll("[data-jvm-page-size]").forEach(select => select.addEventListener("change", e => { state.jvmTable.pageSize = Number(e.target.value); state.jvmTable.page = 1; renderKeepingWorkspacePosition(); }));
  for (const [id, key] of [["anomalySeverity", "severity"], ["anomalyMetric", "metric"], ["anomalySort", "sort"], ["anomalyText", "text"]]) {
    document.querySelector(`#${id}`)?.addEventListener("change", e => { state.anomalyFilters[key] = e.target.value; render(); });
  }
  document.querySelectorAll("[data-chart-metric]").forEach(input => input.addEventListener("change", event => {
    const metric = event.currentTarget.dataset.chartMetric;
    const wasChecked = event.currentTarget.checked;
    state.chartMetrics = wasChecked
      ? [...new Set([...state.chartMetrics, metric])]
      : state.chartMetrics.filter(item => item !== metric);
    if (!wasChecked) {
      const card = document.querySelector(`[data-chart-card="${metric}"]`);
      if (card) { card.remove(); return; }
    }
    renderKeepingWorkspacePosition();
  }));
  bindChartSeriesEvents(deps);
  document.querySelectorAll("[data-chart-stats]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    state.statsMetric = event.currentTarget.dataset.chartStats;
    state.modal = "chartStats";
    render();
  }));
  document.querySelectorAll("[data-chart-png]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const metric = event.currentTarget.dataset.chartPng;
    const card = event.currentTarget.closest("[data-chart-card]");
    const svg = card?.querySelector("svg.chart");
    if (!svg) return;
    exportChartAsPng(svg, metric);
  }));
  document.querySelectorAll("[data-copy-cmd]").forEach(el => el.addEventListener("click", () => {
    copyTextToClipboard(el.dataset.copyCmd);
    toast("Copied", el.dataset.copyCmd.slice(0, 50));
  }));
  document.querySelector("#corrPreset")?.addEventListener("change", e => {
    const preset = EXPERT_CORRELATIONS.find(item => item.id === e.target.value);
    if (!preset) return;
    state.correlation = { x: preset.x, y: preset.y };
    renderKeepingWorkspacePosition();
  });
  document.querySelector("#corrX")?.addEventListener("change", e => { state.correlation.x = e.target.value; renderKeepingWorkspacePosition(); });
  document.querySelector("#heatmapResSelect")?.addEventListener("change", e => { state._heatmapResMs = Number(e.target.value); render(); });
  document.querySelector("#corrY")?.addEventListener("change", e => { state.correlation.y = e.target.value; renderKeepingWorkspacePosition(); });
}

  return { bindChartMinimapEvents, bindChartChromeEvents, bindChartSeriesEvents, bindEvents };
}
