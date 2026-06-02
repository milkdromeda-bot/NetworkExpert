function pick(get, names) {
  return Object.fromEntries(names.map(name => [name, get(name)]));
}

export function createEventDependencyFactories(get) {
  return {
    appEventDependencies() {
      return {
        ...get("chartDrawDependencies")(),
        ...pick(get, [
          "document", "window", "state", "cmInstance", "icons", "EXPERT_CORRELATIONS", "PRE_IMPORT_PRESETS",
          "ANALYSIS_TEMPLATES", "render", "renderKeepingWorkspacePosition", "drawBdpWindowCharts", "drawJvmCharts",
          "drawFixCharts", "redrawChartCardMetric", "applyChartZoomAction", "chartZoomFor", "clearVisibleHistoryCache",
          "chartSeriesKey", "handleGlobalKeydown", "bindSmartChartTooltips", "bindColumnHelpTooltips", "sortedFilteredSockets",
          "visibleColumns", "escapeHtml", "renderRowActions", "handleIngestAction", "ingestActionDependencies",
          "openIncidentReport", "exportEvidencePack", "toast", "annotationAnchorOptions", "annotationDefaultLabel",
          "visibleHistory", "annotationSocketId", "saveAnnotations", "zoomToTailLatencyWindow", "applyDashboardPreset",
          "resetAllState", "_undo", "_redo", "_undoSnapshot", "renderModal", "parseGcLog", "runJvmCorrelation",
          "toggleFixPlayback", "selectedSocket", "anomaliesBySocketId", "applyContextAction", "chartMetricList",
          "syncChartHistoryToSelection", "openAnnotationModal", "bindTableInteractionEvents", "tableInteractionDependencies",
          "bindSocketInteractionEvents", "socketInteractionDependencies", "closeDashboardPresetMenu", "commitDashboardPresetChoice",
          "applyDashboardProfile", "defaultAlertRules", "hasPreImportFilterValue", "emptyPreImportFilters", "importFile",
          "openTopologyModal", "renderKeepingModalPosition", "socketsById", "focusSocket", "hideAppServiceTooltip",
          "showAppServiceTooltip", "applyAnalysisTemplate", "savePrefs", "normalizeBdpDirection", "syncSsCommandFromBuilder",
          "syncFromCodeMirror", "toggleCommandOption", "normalizeSsEditorTheme", "applySsEditorThemePreview",
          "resetSsEditorThemePreview", "runFixCorrelation", "sourceFileEventDependencies", "bindSourceFileEvents",
          "setZoom", "saveTableState", "moveVisibleChartMetric", "showPercentileTableCrosshair", "clearPercentileTableCrosshair",
          "exportChartAsPng", "copyTextToClipboard", "buildJiraReport", "exportIncidentReportHtml", "exportFixSpikeCsv",
          "createBaseline", "formatNumber", "handleLayoutProfileAction", "layoutProfileActionDependencies",
          "handleServiceConfigAction", "serviceConfigActionDependencies", "setZoomFromDateInputs", "clampZoomRange"
        ]),
        saveDashboardProfiles: () => get("saveDashboardProfilesRaw")(get("state").dashboardProfiles),
        saveAlertAcks: () => get("saveAlertAcksRaw")(get("state").alertAcks),
        saveAlertRules: () => get("saveAlertRulesRaw")(get("state").alertRules),
        saveFilterHistory: () => get("saveFilterHistoryRaw")(get("state").filterHistory)
      };
    },

    ingestActionDependencies() {
      return pick(get, [
        "document", "state", "cmInstance", "performance", "SAMPLE", "INGEST_RAW_EAGER_LIMIT",
        "generateIncidentDemoSample", "generateSlowConsumerSample", "generateMicroburstSample", "generateTailLatencySample",
        "setSourceName", "setActiveInvestigation", "resetDerivedCaches", "markAnalysisDirty", "recompute",
        "applyDashboardPreset", "setZoom", "syncSsCommandFromBuilder", "copyTextToClipboard", "captureQualityReport",
        "defaultSsLogPath", "buildSsCollectionCommand", "render", "renderKeepingWorkspacePosition", "_showBusy",
        "_hideBusy", "_renderSkeleton", "toast", "savePrefs"
      ]);
    },

    sourceFileEventDependencies() {
      return pick(get, [
        "document", "state", "cmInstance", "parseGcLog", "parsePidstat", "parseNstat", "parseFixLog", "parseVmstat",
        "parseNstatTimestamped", "parseSar", "extractTcpCounters", "correlateCpuWithStalls", "correlateSarWithTcp",
        "visibleHistory", "runJvmCorrelation", "runFixCorrelation", "drawJvmCharts", "drawFixCharts", "toast",
        "render", "_showBusy", "_hideBusy"
      ]);
    },

    serviceConfigActionDependencies() {
      return {
        ...pick(get, [
          "document", "state", "currentAliasDisplay", "upsertEndpointAlias", "deleteEndpointAlias", "upsertServiceOverride",
          "deleteServiceOverride", "upsertTopologyGroup", "deleteTopologyGroup", "saveCurrentTopology", "toast", "render"
        ]),
        saveServiceAliases: () => get("saveServiceAliasesRaw")(get("state").serviceAliases),
        saveServiceOverrides: () => get("saveServiceOverridesRaw")(get("state").serviceOverrides)
      };
    },

    tableInteractionDependencies() {
      return {
        ...pick(get, [
          "document", "state", "TABLE_COLUMNS", "tableDefaults", "tableSettingsPlacement", "applyTableColumnSearchFilter",
          "resetTableSort", "resetTableColumns", "toggleTableColumnPin", "setTableColumnVisibility",
          "toggleTableColumnVisibility", "saveTableState", "applyTableLayout", "moveTableColumn", "toast",
          "renderKeepingWorkspacePosition", "renderKeepingModalPosition", "render"
        ]),
        saveTableProfiles: () => get("saveTableProfilesRaw")(get("state").tableProfiles)
      };
    },

    socketInteractionDependencies() {
      return pick(get, [
        "document", "window", "state", "CONVERSATION_SORT_LABELS", "conversationDefaultSortDir",
        "positionConversationInsight", "socketsById", "focusSocket", "chartMetricList", "metricLabel",
        "anomaliesBySocketId", "metricValue", "formatNumber", "openIncidentReport", "exportIncidentReportHtml",
        "exportEvidencePack", "buildJiraReport", "exportFixSpikeCsv", "copyTextToClipboard", "toast",
        "renderKeepingWorkspacePosition", "render"
      ]);
    },

    layoutProfileActionDependencies() {
      return {
        ...pick(get, [
          "document", "state", "DEFAULT_TABLE_ORDER", "parseFormattedNumber", "cloneThresholds", "clampChartColumns",
          "clampChartTooltipOpacity", "defaultTableColumns", "saveTableState", "tableLayoutSnapshot",
          "applyDashboardProfile", "dashboardSnapshot", "dashboardPresetIdOrDefault", "savePrefs", "toast",
          "renderKeepingWorkspacePosition", "render"
        ]),
        saveTableProfiles: () => get("saveTableProfilesRaw")(get("state").tableProfiles),
        saveDashboardProfiles: () => get("saveDashboardProfilesRaw")(get("state").dashboardProfiles)
      };
    },

    globalDomDependencies() {
      return {
        ...pick(get, [
          "document", "window", "localStorage", "state", "render", "renderKeepingWorkspacePosition", "saveTableState",
          "sortedFilteredSockets", "focusSocket", "drawJvmCharts", "openIncidentReport", "exportIncidentReportHtml",
          "exportEvidencePack", "copyTextToClipboard", "buildJiraReport", "toast", "exportFixSpikeCsv",
          "clampZoomRange", "importFile", "createBaseline"
        ]),
        setTimeout: get("setTimeout")
      };
    },

    renderShellDependencies() {
      return {
        ...pick(get, ["document", "escapeHtml", "IntersectionObserver", "performance", "requestAnimationFrame", "state", "window"]),
        consoleRef: console
      };
    },

    timelineEventDependencies() {
      return pick(get, [
        "state", "currentApplicationServiceSortKey", "filteredAnomalies", "formatMetricValue", "metricLabel",
        "socketsById", "thresholdFor", "thresholdSeverity"
      ]);
    },

    tableDashboardDependencies() {
      return pick(get, [
        "state", "DASHBOARD_PRESETS", "DEFAULT_TABLE_ORDER", "TABLE_COLUMNS", "TABLE_COLUMN_BY_KEY",
        "TABLE_SORT_COLLATOR", "anomaliesBySocketId", "applyDashboardPresetProfile", "applySavedDashboardProfile",
        "applyTemplateProfile", "buildVisibleColumnOrder", "chartMetricList", "clampChartColumns",
        "createDashboardSnapshot", "dashboardPresetIdOrDefault", "metricValue", "savePrefs", "saveTableState",
        "socketBandwidth", "socketMatchesAdvancedQuery", "tableDefaults", "tableFilterCacheKey"
      ]);
    },

    monitoringInsightsDependencies() {
      return pick(get, ["state", "socketsById", "thresholdFor"]);
    }
  };
}
