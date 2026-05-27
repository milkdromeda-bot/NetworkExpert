function actionResult(stop = false) {
  return { handled: true, stop };
}

export async function handleIngestAction(action, event, deps) {
  const {
    document: doc,
    state,
    cmInstance,
    performance: perf = globalThis.performance,
    SAMPLE,
    INGEST_RAW_EAGER_LIMIT,
    generateIncidentDemoSample,
    generateSlowConsumerSample,
    generateMicroburstSample,
    generateTailLatencySample,
    setSourceName,
    setActiveInvestigation,
    resetDerivedCaches,
    markAnalysisDirty,
    recompute,
    applyDashboardPreset,
    setZoom,
    syncSsCommandFromBuilder,
    copyTextToClipboard,
    captureQualityReport,
    defaultSsLogPath,
    buildSsCollectionCommand,
    render,
    renderKeepingWorkspacePosition,
    _showBusy,
    _hideBusy,
    _renderSkeleton,
    toast,
    savePrefs
  } = deps;

  if (action === "parse") {
    const rawInput = doc.querySelector("#rawInput");
    const cmValue = cmInstance ? cmInstance.getValue() : "";
    state.raw = rawInput ? rawInput.value : (cmValue || state.raw);
    setActiveInvestigation(state, null);
    resetDerivedCaches({ raw: true });
    const parseStart = perf.now();
    if (state.raw.length > 5000000) {
      _showBusy();
      const ws = doc.querySelector(".workspace");
      if (ws) ws.innerHTML = _renderSkeleton("analysis");
      setTimeout(() => {
        recompute();
        _hideBusy();
        const elapsed = ((perf.now() - parseStart) / 1000).toFixed(1);
        toast("Analysis complete", `${state.sockets.length} sockets parsed in ${elapsed}s.`);
        state.view = "analysis";
        state.activeTab = "advisor";
        render();
      }, 50);
      return actionResult(true);
    }
    recompute();
    const elapsed = ((perf.now() - parseStart) / 1000).toFixed(1);
    if (state.prefs.autoToast) {
      const top = state.anomalies[0];
      toast(
        "Analysis complete",
        `${state.sockets.length} sockets in ${elapsed}s. ${top ? `${top.severity}: ${top.title}` : "No major anomaly."}`,
        top?.severity === "critical" ? "danger" : "warn"
      );
    }
    state.view = "analysis";
    state.activeTab = "advisor";
    render();
    return actionResult();
  }

  if (action === "copySsCommand") {
    const result = syncSsCommandFromBuilder();
    if (!result.validation.valid) {
      const first = result.validation.errors[0];
      toast("Invalid ss command fields", first?.message || "Fix the highlighted fields before copying.", "danger");
      return actionResult(true);
    }
    const ok = await copyTextToClipboard(result.command);
    if (!ok) {
      toast("Copy failed", "The ss command could not be copied by the browser.", "danger");
      return actionResult(true);
    }
    toast("ss command copied", "Paste it on the target server to collect the ss evidence.");
    return actionResult();
  }

  if (action === "copyQualityCommand") {
    const report = captureQualityReport();
    const ok = await copyTextToClipboard(report.recommendedCommand);
    if (!ok) {
      toast("Copy failed", "The recommended capture command could not be copied by the browser.", "danger");
      return actionResult(true);
    }
    toast("Capture command copied", "Paste it on the target server to collect stronger ss evidence.");
    return actionResult();
  }

  if (action === "loadSsCommandEndpointExample") {
    const commandInput = doc.querySelector("#commandInput");
    state.ssCommandConfig = {
      timestamp: true,
      loop: true,
      intervalSeconds: "1",
      srcIp: "10.0.0.10",
      srcPort: "50000",
      dstIp: "10.0.0.20",
      dstPort: "443",
      outputPath: defaultSsLogPath(),
      appendOutput: true
    };
    state.command = buildSsCollectionCommand(commandInput ? commandInput.value : state.command, state.ssCommandConfig);
    toast("Example loaded", "The ss command fields now contain a generic endpoint filter example.");
    renderKeepingWorkspacePosition();
    return actionResult();
  }

  if (action === "sample") {
    state.raw = SAMPLE;
    state.ingestRawExpanded = true;
    setSourceName("built-in sample");
    setActiveInvestigation(state, null);
    markAnalysisDirty({ raw: true });
    toast("Sample loaded", "Demo ss snapshot loaded.");
    render();
    return actionResult();
  }

  if (action === "toggleSsOptions") {
    state.showSsOptions = true;
    renderKeepingWorkspacePosition();
    return actionResult();
  }

  if (action === "showEditor") {
    state.showSsOptions = false;
    renderKeepingWorkspacePosition();
    return actionResult();
  }

  if (action === "showRawEditor") {
    state.showEditor = true;
    renderKeepingWorkspacePosition();
    return actionResult();
  }

  if (action === "toggleAnalysisSidebar") {
    state.analysisSidebarCollapsed = !state.analysisSidebarCollapsed;
    renderKeepingWorkspacePosition();
    return actionResult();
  }

  if (action === "toggleBreadcrumbMenu") {
    state.breadcrumbMenuOpen = !state.breadcrumbMenuOpen;
    renderKeepingWorkspacePosition();
    return actionResult();
  }

  if (action === "toggleWordWrap") {
    state.editorWordWrap = !state.editorWordWrap;
    if (cmInstance) cmInstance.setOption("lineWrapping", state.editorWordWrap);
    return actionResult();
  }

  if (action === "toggleSsEditorThemeMenu") {
    event.preventDefault();
    event.stopPropagation();
    state.openSsEditorThemeMenu = !state.openSsEditorThemeMenu;
    renderKeepingWorkspacePosition();
    return actionResult();
  }

  if (action === "toggleGuidedChecklist") {
    state.prefs.guidedChecklistCollapsed = !state.prefs.guidedChecklistCollapsed;
    savePrefs();
    renderKeepingWorkspacePosition();
    return actionResult();
  }

  if (action === "sampleIncidentDemo") {
    state.raw = generateIncidentDemoSample();
    state.ingestRawExpanded = false;
    setSourceName("JVM GC stall incident (demo)");
    const demoBase = Date.now() - 60000;
    state.jvmGc.pauses = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      epochMs: demoBase + i * 8000,
      durationMs: i === 5 ? 450 : 5 + Math.random() * 15,
      type: i === 5 ? "Full" : "Young",
      cause: i === 5 ? "Heap exhausted" : "G1 Evacuation Pause"
    }));
    state.jvmGc.safepoints = [];
    state.jvmGc.rawLog = "[demo]";
    state.selectedId = null;
    setActiveInvestigation(state, null);
    state.showSsOptions = false;
    setZoom(0, 1);
    markAnalysisDirty({ raw: true });
    toast("Incident demo loaded", "Press Analyze to see stories, matrix, and multi-socket correlation in action.");
    render();
    return actionResult();
  }

  if (action === "sample10m") {
    state.raw = generateSlowConsumerSample();
    state.ingestRawExpanded = state.raw.length <= INGEST_RAW_EAGER_LIMIT;
    setSourceName("20-min slow consumer scenario");
    state.selectedId = null;
    setActiveInvestigation(state, null);
    state.showSsOptions = false;
    setZoom(0, 1);
    markAnalysisDirty({ raw: true });
    toast("Sample loaded", "Press Analyze to parse the 20-min slow consumer scenario.");
    render();
    return actionResult();
  }

  if (action === "sampleMicroburst") {
    state.raw = generateMicroburstSample();
    state.ingestRawExpanded = state.raw.length <= INGEST_RAW_EAGER_LIMIT;
    setSourceName("microburst guide sample");
    state.selectedId = null;
    setActiveInvestigation(state, null);
    state.drawer = null;
    state.view = "charts";
    setZoom(0, 1);
    markAnalysisDirty({ raw: true });
    recompute();
    applyDashboardPreset("microburst");
    toast("Microburst sample loaded", "The guide sample opened in Charts with the Microburst investigation preset.");
    render();
    return actionResult();
  }

  if (action === "sampleTailLatency") {
    state.raw = generateTailLatencySample();
    state.ingestRawExpanded = state.raw.length <= INGEST_RAW_EAGER_LIMIT;
    setSourceName("tail latency guide sample");
    state.selectedId = null;
    setActiveInvestigation(state, null);
    state.drawer = null;
    state.view = "charts";
    setZoom(0, 1);
    markAnalysisDirty({ raw: true });
    recompute();
    applyDashboardPreset("tail");
    toast("Tail latency sample loaded", "The guide sample opened in Charts with the Tail latency preset.");
    render();
    return actionResult();
  }

  if (action === "clear") {
    state.raw = "";
    state.importStatus = null;
    state.ingestRawExpanded = true;
    markAnalysisDirty({ raw: true });
    toast("Input cleared", "Only the ss text input was emptied. Current parsed analysis is unchanged until you parse again.");
    render();
    return actionResult();
  }

  return { handled: false, stop: false };
}
