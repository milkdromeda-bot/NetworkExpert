export function bindActionButtonEvents(deps = {}) {
  const {
    document,
    state,
    localStorage,
    icons,
    handleIngestAction,
    ingestActionDependencies,
    openIncidentReport,
    exportEvidencePack,
    toast,
    annotationAnchorOptions,
    annotationDefaultLabel,
    visibleHistory,
    annotationSocketId,
    saveAnnotations,
    renderKeepingWorkspacePosition,
    applyDashboardPreset,
    zoomToTailLatencyWindow,
    render,
    resetAllState,
    _undo,
    _redo,
    _undoSnapshot,
    renderModal,
    bindEvents,
    openTopologyModal,
    parseGcLog,
    runJvmCorrelation,
    requestAnimationFrame,
    drawJvmCharts,
    drawFixCharts,
    toggleFixPlayback,
    createBaseline,
    formatNumber,
    savePrefs,
    setZoom,
    saveAlertRules,
    saveAlertAcks,
    defaultAlertRules,
    saveFilterHistory,
    hasPreImportFilterValue,
    emptyPreImportFilters,
    importFile,
    applyChartZoomAction,
    saveChartsPng,
    handleLayoutProfileAction,
    layoutProfileActionDependencies,
    handleServiceConfigAction,
    serviceConfigActionDependencies,
    copyTextToClipboard
  } = deps;
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
}
