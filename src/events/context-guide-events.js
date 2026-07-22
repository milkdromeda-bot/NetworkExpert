export function bindContextGuideEvents(deps = {}) {
  const {
    document,
    state,
    NodeFilter,
    PRE_IMPORT_PRESETS,
    selectedSocket,
    anomaliesBySocketId,
    applyContextAction,
    chartMetricList,
    syncChartHistoryToSelection,
    renderKeepingWorkspacePosition,
    render,
    openTopologyModal,
    emptyPreImportFilters,
    toast,
    socketsById,
    sortedFilteredSockets,
    focusSocket,
    renderKeepingModalPosition,
    hideAppServiceTooltip,
    showAppServiceTooltip,
    openAnnotationModal
  } = deps;

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
    state.aliasEditScope = "global";
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
  // Focus socket picker
  document.querySelector("[data-focus-socket-select]")?.addEventListener("change", event => {
    const socketId = event.target.value;
    if (socketId) focusSocket(socketId, "Chosen from focus picker");
    render();
  });
  document.querySelector("[data-focus-prev]")?.addEventListener("click", event => {
    event.stopPropagation();
    const sockets = sortedFilteredSockets();
    const idx = sockets.findIndex(s => s.id === state.selectedId);
    if (idx > 0) { focusSocket(sockets[idx - 1].id, "Focus prev"); render(); }
  });
  document.querySelector("[data-focus-next]")?.addEventListener("click", event => {
    event.stopPropagation();
    const sockets = sortedFilteredSockets();
    const idx = sockets.findIndex(s => s.id === state.selectedId);
    if (idx >= 0 && idx < sockets.length - 1) { focusSocket(sockets[idx + 1].id, "Focus next"); render(); }
  });
}
