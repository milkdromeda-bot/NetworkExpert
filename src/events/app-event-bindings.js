import {
  bindChartChromeEvents as bindChartChromeEventsModel,
  bindChartMinimapEvents as bindChartMinimapEventsModel,
  bindChartSeriesEvents as bindChartSeriesEventsModel
} from "./chart-event-bindings.js";
import { bindCommandPreferenceEvents as bindCommandPreferenceEventsModel } from "./command-preference-events.js";
import { bindActionButtonEvents as bindActionButtonEventsModel } from "./action-button-events.js";
import { bindContextGuideEvents as bindContextGuideEventsModel } from "./context-guide-events.js";
import { createAppEventContext } from "./app-event-context.js";

export function createAppEventBindings(getDeps) {
  const {
    appEventDependencies, cmInstanceRef, requestAnimationFrame, document, window, state,
    localStorage, icons, EXPERT_CORRELATIONS, PRE_IMPORT_PRESETS, ANALYSIS_TEMPLATES, NodeFilter,
    handleGlobalKeydown, bindSmartChartTooltips, bindColumnHelpTooltips, sortedFilteredSockets, visibleColumns, escapeHtml,
    renderRowActions, render, handleIngestAction, ingestActionDependencies, openIncidentReport, exportEvidencePack,
    toast, annotationAnchorOptions, annotationDefaultLabel, visibleHistory, annotationSocketId, saveAnnotations,
    renderKeepingWorkspacePosition, zoomToTailLatencyWindow, applyDashboardPreset, resetAllState, _undo, _redo,
    _undoSnapshot, renderModal, parseGcLog, runJvmCorrelation, drawJvmCharts, toggleFixPlayback,
    selectedSocket, anomaliesBySocketId, applyContextAction, chartMetricList, syncChartHistoryToSelection, openAnnotationModal,
    bindTableInteractionEvents, tableInteractionDependencies, bindSocketInteractionEvents, socketInteractionDependencies, closeDashboardPresetMenu, commitDashboardPresetChoice,
    applyDashboardProfile, saveDashboardProfiles, saveAlertAcks, defaultAlertRules, saveAlertRules, saveFilterHistory,
    hasPreImportFilterValue, emptyPreImportFilters, importFile, openTopologyModal, renderKeepingModalPosition, socketsById,
    focusSocket, hideAppServiceTooltip, showAppServiceTooltip, applyAnalysisTemplate, savePrefs, normalizeBdpDirection,
    syncSsCommandFromBuilder, toggleCommandOption, syncFromCodeMirror, normalizeSsEditorTheme, applySsEditorThemePreview, resetSsEditorThemePreview,
    drawFixCharts, runFixCorrelation, sourceFileEventDependencies, bindSourceFileEvents, setZoom, clearVisibleHistoryCache,
    saveTableState, moveVisibleChartMetric, showPercentileTableCrosshair, clearPercentileTableCrosshair, exportChartAsPng, copyTextToClipboard,
    buildJiraReport, exportIncidentReportHtml, exportFixSpikeCsv, createBaseline, formatNumber, handleLayoutProfileAction,
    layoutProfileActionDependencies, handleServiceConfigAction, serviceConfigActionDependencies, setZoomFromDateInputs, applyChartZoomAction, clampZoomRange,
    drawBdpWindowCharts
  } = createAppEventContext(getDeps);

function bindChartMinimapEvents(deps = appEventDependencies()) {
  return bindChartMinimapEventsModel(deps);
}

function bindChartChromeEvents(deps = appEventDependencies()) {
  return bindChartChromeEventsModel(deps);
}

function bindChartSeriesEvents(deps = appEventDependencies()) {
  return bindChartSeriesEventsModel(deps);
}

function bindCommandPreferenceEvents(deps = appEventDependencies()) {
  return bindCommandPreferenceEventsModel({ ...deps, document, state, requestAnimationFrame, syncFromCodeMirror });
}

function bindActionButtonEvents(deps = appEventDependencies()) {
  return bindActionButtonEventsModel({ ...deps, document, state, localStorage, icons, requestAnimationFrame, bindEvents });
}

function bindContextGuideEvents(deps = appEventDependencies()) {
  return bindContextGuideEventsModel({ ...deps, document, state, NodeFilter, PRE_IMPORT_PRESETS });
}

function bindEvents(deps = appEventDependencies()) {
  document.onkeydown = handleGlobalKeydown;
  bindSmartChartTooltips();
  bindColumnHelpTooltips();
  bindSourceFileEvents(sourceFileEventDependencies());
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
  bindActionButtonEvents(deps);
  bindContextGuideEvents(deps);
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
  bindCommandPreferenceEvents(deps);
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
