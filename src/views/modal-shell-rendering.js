export function createModalShellRendering(ctx) {
  const {
    state,
    html,
    icons,
    ACCESS_ROLES,
    ANALYSIS_TAB_GUIDE,
    APP_SPLASH_IMAGE,
    APP_VERSION,
    EXPERT_DEFAULT_THRESHOLDS,
    LINUX_PROFILES,
    UBUNTU_PROFILES,
    escapeHtml,
    metricLabel,
    timeLabel,
    socketsById,
    sortedFilteredSockets,
    aliasForEndpoint,
    aliasListForSource,
    normalizeAliasStore,
    currentApplicationService,
    inferredApplicationService,
    serviceOverrideForSocket,
    normalizeTopologyProfile,
    endpointHost,
    topologyScopeKey,
    topologyGroupForEndpoint,
    selectedSocket,
    renderSocketDetail,
    renderThresholdConfig,
    renderTableSettingsDrawer,
    renderColumnChooser,
    renderLayoutPrefs,
    renderPreImportFilters,
    renderFields,
    getColumn,
    columnHelp,
    metricHelp,
    renderThresholdSummary,
    annotationSocketId,
    currentSourceAnnotations,
    visibleHistory,
    annotationTypeList,
    buildAnnotationDraft,
    annotationAnchorOptions,
    annotationMetricChoices,
    formatMetricValue,
    annotationDefaultLabel,
    annotationTypeLabel,
    chartStats,
    formatNumber,
    renderPercentileDistribution,
    renderDatalist,
    analysisTabGuide,
    renderPrefsView,
    resolvedNumberLocale,
    hasRealTimestampHistory,
    chartTooltipOpacity,
    renderDashboardPresetOptions,
    linuxProfileLabel,
    accessRoleLabel,
    ubuntuProfileLabel,
    timeZoneOptions,
    resolvedTimeZone,
    createGuideView,
    isAnalystRole,
    isLxcProfile,
    envCommand,
    commandForPeer,
    createModalView
  } = ctx;

function renderChartAnnotationMenu() {
  if (!state.chartAnnotationMenuContext || !state.chartAnnotationMenuPos) return "";
  const context = state.chartAnnotationMenuContext;
  const pos = `style="left:${state.chartAnnotationMenuPos.left}px;top:${state.chartAnnotationMenuPos.top}px"`;
  return `<div class="chart-context-menu open" ${pos} role="menu" aria-label="Chart context menu">
    <button data-chart-annotation-menu="annotate" role="menuitem" title="${escapeHtml(metricLabel(context.metric))} at ${escapeHtml(timeLabel(context.row?.t || 0, context.row?.epochMs))}">
      <span class="chart-context-menu-icon">${icons.note}</span>
      <span class="chart-context-menu-copy">
        <strong>Annotate here</strong>
        <small>${escapeHtml(metricLabel(context.metric))} - ${escapeHtml(timeLabel(context.row?.t || 0, context.row?.epochMs))}</small>
      </span>
    </button>
  </div>`;
}
function renderDrawer() {
  const selected = socketsById().get(state.selectedId);
  const title = state.drawer === "prefs" ? "Preferences"
    : state.drawer === "guide" ? "Expert guide"
      : state.drawer === "thresholds" ? "Threshold configuration"
        : state.drawer === "tableSettings" ? "Columns"
          : "Socket details";
  const body = state.drawer === "prefs"
    ? renderPrefs()
    : state.drawer === "guide"
      ? renderGuide()
      : state.drawer === "thresholds"
        ? renderThresholdConfig()
        : state.drawer === "tableSettings"
          ? renderTableSettingsDrawer()
          : selected ? renderSocketDetail(selected) + `<pre class="code">${escapeHtml(JSON.stringify(selected, null, 2))}</pre>` : `<div class="empty">Select a socket.</div>`;
  const headerAction = state.drawer === "thresholds"
    ? `<div class="drawer-actions"><button class="compact-action" data-action="resetThresholdDefaults">${icons.reset} Defaults</button><button class="primary compact-action" data-action="saveThresholds">${icons.saveDisk} Save</button></div>`
    : "";
  return html`<aside class="drawer ${state.drawer ? "open" : ""} ${state.drawer === "thresholds" || state.drawer === "tableSettings" ? "wide" : ""}">
    <header><div class="drawer-title"><strong>${title}</strong>${headerAction}</div><button class="icon" data-action="closeDrawer">${icons.x}</button></header>
    <main>${body}</main>
    <footer class="drawer-sticky-close"><button data-action="closeDrawer">${icons.x} Close</button></footer>
  </aside>`;
}

function renderPrefs() {
  return renderPrefsView({
    state,
    html,
    icons,
    escapeHtml,
    formatNumber,
    resolvedNumberLocale,
    hasRealTimestampHistory,
    chartTooltipOpacity,
    renderTimeZoneOptions,
    renderDashboardPresetOptions,
    ACCESS_ROLES,
    UBUNTU_PROFILES,
    LINUX_PROFILES,
    linuxProfileLabel,
    accessRoleLabel,
    ubuntuProfileLabel
  });
}

function renderTimeZoneOptions() {
  const current = state.prefs.chartTimeZone || "auto";
  return `<option value="auto" ${current === "auto" ? "selected" : ""}>Browser timezone (${escapeHtml(resolvedTimeZone())})</option>`
    + timeZoneOptions().map(zone => `<option value="${escapeHtml(zone)}" ${current === zone ? "selected" : ""}>${escapeHtml(zone)}</option>`).join("");
}

function renderGuide() {
  return createGuideView({
    state,
    html,
    icons,
    escapeHtml,
    isAnalystRole,
    isLxcProfile,
    envCommand,
    linuxProfileLabel,
    accessRoleLabel,
    ubuntuProfileLabel,
    renderFields,
    commandForPeer,
    analysisTabGuide,
    analysisTabDocs: ANALYSIS_TAB_GUIDE
  }).renderGuide();
}

function modalView() {
  return createModalView({
    state,
    html,
    icons,
    escapeHtml,
    sortedFilteredSockets,
    aliasForEndpoint,
    aliasListForSource,
    normalizeAliasStore,
    currentApplicationService,
    inferredApplicationService,
    serviceOverrideForSocket,
    normalizeTopologyProfile,
    endpointHost,
    topologyScopeKey,
    topologyGroupForEndpoint,
    selectedSocket,
    renderSocketDetail,
    renderPrefs,
    renderGuide,
    renderThresholdConfig,
    renderTableSettingsDrawer,
    metricLabel,
    renderColumnChooser,
    renderLayoutPrefs,
    renderPreImportFilters,
    renderFields,
    getColumn,
    columnHelp,
    metricHelp,
    renderThresholdSummary,
    expertDefaultThresholds: EXPERT_DEFAULT_THRESHOLDS,
    annotationSocketId,
    currentSourceAnnotations,
    visibleHistory,
    annotationTypeList,
    buildAnnotationDraft,
    timeLabel,
    annotationAnchorOptions,
    annotationMetricChoices,
    formatMetricValue,
    annotationDefaultLabel,
    annotationTypeLabel,
    chartStats,
    formatNumber,
    renderPercentileDistribution,
    renderDatalist,
    analysisTabGuide,
    analysisTabDocs: ANALYSIS_TAB_GUIDE,
    appVersion: APP_VERSION,
    splashImageUrl: APP_SPLASH_IMAGE
  });
}

function serviceAliasEndpointOptions() { return modalView().serviceAliasEndpointOptions(); }
function selectedAliasTarget(endpoints) { return modalView().selectedAliasTarget(endpoints); }
function renderServiceAliasesModal() { return modalView().renderServiceAliasesModal(); }
function renderServiceOverrideModal() { return modalView().renderServiceOverrideModal(); }
function renderTopologyModal() { return modalView().renderTopologyModal(); }
function renderModal() { return modalView().renderModal(); }

  return {
    renderChartAnnotationMenu,
    renderDrawer,
    renderPrefs,
    renderTimeZoneOptions,
    renderGuide,
    modalView,
    serviceAliasEndpointOptions,
    selectedAliasTarget,
    renderServiceAliasesModal,
    renderServiceOverrideModal,
    renderTopologyModal,
    renderModal
  };
}
