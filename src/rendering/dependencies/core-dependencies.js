function pick(get, names) {
  return Object.fromEntries(names.map(name => [name, get(name)]));
}

export function createCoreDependencyFactories(get) {
  return {
    metricChartDependencies() {
      return {
        ...pick(get, [
          "state", "icons", "document", "window", "performance", "requestAnimationFrame", "DASHBOARD_PRESETS",
          "DEFAULT_TABLE_ORDER", "escapeHtml", "numberFormatter", "numberFormatterWith", "numberSeparators", "formatNumber",
          "lazySparklineIndex", "renderSparkline", "dateTimeFormatter", "resolvedNumberLocale", "resolvedTimeZone",
          "clearVisibleHistoryCache", "tailLatencyLens", "microburstSummary", "chartMicroburstBand", "chartAnnotationOverlay",
          "bdpWindowAnalysis", "formatBytesHuman", "annotationKindForChartContext", "annotationLabelForChartContext",
          "currentSourceAnnotations", "annotationColor", "toast", "render", "setSourceName", "setActiveInvestigation",
          "defaultSsCommandConfig", "defaultTableColumns", "clampChartColumns", "applyChartZoomOperation", "clampZoomRange",
          "zoomForMetric", "zoomRangeFromDragSelection", "savePrefs", "chartTooltipOpacity"
        ]),
        metricLabel: get("_metricLabel")
      };
    },

    historyDependencies() {
      return pick(get, [
        "state", "metricValue", "socketsById", "buildSocketHistoryFromSnapshots", "splitTimestampBlocks",
        "parseTimestampedSnapshots", "compressSnapshots", "iterateCompressed", "socketIdentityKey",
        "detectMicroburstWindow", "detectTailLatencyLens", "thresholdFor", "formatNumber", "timeLabel"
      ]);
    },

    chartOverlayDependencies() {
      return pick(get, ["annotationDefaultLabel", "annotationSocketId", "chartBgColor", "currentSourceAnnotations", "escapeHtml"]);
    },

    conversationModelDependencies() {
      return pick(get, [
        "state", "CONVERSATION_SORT_COLLATOR", "CONVERSATION_SORT_LABELS", "currentApplicationServiceSortKey",
        "escapeHtml", "metricValue", "riskRank", "severityRank", "socketBandwidth", "socketKey", "sortedFilteredSockets"
      ]);
    },

    advancedCorrelationDependencies() {
      return {
        ...pick(get, [
          "state", "icons", "document", "window", "performance", "requestAnimationFrame", "cancelAnimationFrame",
          "alignTimestamps", "chartBgColor", "chartTooltipOpacity", "computeFixStats", "correlateFixLatency",
          "correlateJvmStalls", "dateTimeFormatter", "dropRateSummary", "escapeHtml", "formatBytesHuman",
          "formatMetricValue", "formatNumber", "metricValue", "parsedTimestampSnapshots", "render",
          "renderFixLatencyPanelView", "renderJvmGcPanelView", "resolvedNumberLocale", "resolvedTimeZone",
          "setZoom", "socketsById", "timeLabel", "visibleHistory"
        ]),
        Worker: get("window").Worker
      };
    },

    serviceMapPresenterDependencies() {
      return pick(get, [
        "state", "icons", "SERVICE_MAP_SORT_COLLATOR", "aliasDisplay", "aliasForEndpoint", "anomaliesBySocketId",
        "buildServiceMapData", "escapeHtml", "formatMetricValue", "formatNumber", "metricLabel", "metricValue",
        "orderServiceMapConnectivity", "riskRank", "severityRank", "socketBandwidth", "sortedFilteredSockets",
        "thresholdSeverity", "topologyGroupForEndpoint"
      ]);
    },

    preferencesDependencies() {
      return pick(get, [
        "state", "DASHBOARD_PRESETS", "TABLE_COLUMNS", "clampChartColumns", "configuredLinkCapacityMbps",
        "defaultTableState", "escapeHtml", "loadPrefsRaw", "loadTableStateRaw", "normalizeBdpDirection",
        "normalizeSsEditorTheme", "normalizeTableState", "prefsDefault", "saveAnnotationsRaw", "savePrefsRaw",
        "saveTableStateRaw", "tableDefaults"
      ]);
    },

    annotationControllerDependencies() {
      return pick(get, [
        "state", "annotationsForContext", "buildAnnotationAnchorOptions", "buildAnnotationDraft", "metricLabel",
        "microburstSummary", "render", "reportDefaultChartMetrics", "selectedSocket", "tailLatencyLens",
        "thresholdSeverity", "toast", "visibleHistory"
      ]);
    },

    ssCommandControllerDependencies() {
      return pick(get, [
        "state", "document", "SS_OPTION_INTEL", "buildSsCollectionCommand", "defaultSsLogPath", "escapeHtml",
        "icons", "parseUiIntervalSeconds", "readSsCommandConfigFromDocument", "renderSsCommandBuilderView",
        "renderSsOptionChipView", "renderSsOptionControlView", "renderSsOptionDetailView", "selectedSsOptionView",
        "ssOptionIntelView", "updateSsCommandValidationInDocument", "validateSsCommandConfig"
      ]);
    },

    runtimeProfileDependencies() {
      return pick(get, ["state", "ACCESS_ROLES", "LINUX_PROFILES", "UBUNTU_PROFILES"]);
    },

    derivedCacheDependencies() {
      return pick(get, ["state", "clearVisibleHistoryCache", "renderBdpWindowPanel"]);
    },

    ipIntelControllerDependencies() {
      return pick(get, ["state", "publicPeerIps", "render"]);
    },

    alertStateDependencies() {
      return {
        ...pick(get, [
          "buildBaselineComparison", "createBaselineSnapshot", "document", "evaluateAlertRuleEvents", "metricValue",
          "riskRank", "socketBandwidth", "socketKey", "state"
        ]),
        DateRef: Date,
        setTimeoutRef: get("setTimeout")
      };
    },

    analysisRuntimeDependencies() {
      return {
        ...pick(get, [
          "aggregateTimestampedSockets", "analyzeAll", "applyRisks", "buildHistory", "buildSocketBandwidthIndex",
          "commandForPeer", "computeHealthScore", "detectFragmentation", "detectReordering", "dropRateSeverity",
          "dropRateSummary", "envCommand", "evaluateAlertRules", "formatDropCadence", "formatDurationCompact",
          "formatMetricValue", "formatMicroburstWindow", "hasTimestampedRawData", "isAnalystRole", "isLxcProfile",
          "metricValue", "microburstSummary", "parseTimestampLine", "resetDerivedCaches", "setActiveInvestigation",
          "setZoom", "socketsById", "state", "thresholdFor", "toast", "withStableSocketIds"
        ]),
        setTimeoutRef: get("setTimeout")
      };
    },

    browserFeedbackDependencies() {
      return {
        ...pick(get, ["document", "escapeHtml"]),
        navigatorRef: get("navigator"),
        setTimeoutRef: get("setTimeout")
      };
    },

    codeMirrorDependencies() {
      return {
        CodeMirror: get("window").CodeMirror,
        ...pick(get, ["document", "state"]),
        setTimeoutRef: get("setTimeout")
      };
    },

    focusViewDependencies() {
      return pick(get, ["chartMetricList", "escapeHtml", "icons", "metricLabel", "socketsById", "state", "visibleHistory"]);
    },

    importFlowDependencies() {
      return {
        ...pick(get, [
          "INGEST_RAW_EAGER_LIMIT", "aggregateParsedSocketsByKey", "document", "formatNumber", "hasPreImportFilterValue",
          "hasTimestampedRawData", "importSocketFile", "normalizePreImportFilters", "performance", "recompute",
          "recomputeFromSockets", "render", "resetDerivedCaches", "setActiveInvestigation", "setSourceName", "state", "toast"
        ]),
        saveFilterHistory: filters => get("saveFilterHistoryRaw")(filters),
        setTimeoutRef: get("setTimeout")
      };
    },

    investigationSummaryDependencies() {
      return pick(get, [
        "anomaliesBySocketId", "applyServiceOverride", "buildExecutiveSummary", "buildGuidedChecklistItems", "buildHistory",
        "clearVisibleHistoryCache", "escapeHtml", "formatMetricValue", "formatMicroburstWindow", "formatNumber",
        "formatTailLatencyWindow", "icons", "inferApplicationService", "metricValue", "microburstSummary",
        "pickExecutiveFocusSocket", "setActiveInvestigation", "severityRank", "socketBandwidth", "socketsById",
        "sortedFilteredSockets", "state", "tailLatencyLens", "thresholdFor"
      ]);
    },

    uiMenuDependencies() {
      return {
        ...pick(get, [
          "DASHBOARD_PRESETS", "applyDashboardPreset", "cancelAnimationFrame", "dashboardPresetIcon",
          "dashboardPresetIdOrDefault", "document", "renderKeepingWorkspacePosition", "requestAnimationFrame",
          "resetSsEditorThemePreview", "state", "toast"
        ]),
        redo: get("_redo"),
        undo: get("_undo")
      };
    },

    undoCacheDependencies() {
      return pick(get, ["detectMultiSocketCorrelation", "detectRateOfChange", "detectTimelineStories", "render", "state"]);
    },

    workspaceRenderDependencies() {
      return {
        ...pick(get, ["document", "render", "requestAnimationFrame", "window"]),
        queueMicrotaskRef: get("queueMicrotask"),
        setTimeoutRef: get("setTimeout")
      };
    }
  };
}
