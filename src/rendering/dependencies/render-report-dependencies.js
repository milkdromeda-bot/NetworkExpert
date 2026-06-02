function pick(get, names) {
  return Object.fromEntries(names.map(name => [name, get(name)]));
}

export function createRenderReportDependencyFactories(get) {
  return {
    appShellRenderDependencies() {
      return {
        ...pick(get, [
          "APP_VERSION", "anomalyStatusClass", "bindEvents", "detectTrends", "document", "drawBdpWindowCharts",
          "drawChart", "drawFixCharts", "drawJvmCharts", "escapeHtml", "formatNumber", "hideAppServiceTooltip",
          "hideFloatingChartTooltipNow", "html", "icons", "initCodeMirror", "localStorage", "recompute",
          "renderAnalysisPage", "renderBdpWindowPanel", "renderChartAnnotationMenu", "renderChartsGlobalToolbar",
          "renderChartsPage", "renderDashboardStudioInline", "renderDrawer", "renderFixLatencyPanel", "renderFocusView",
          "renderGuide", "renderIngestPage", "renderInvestigationContext", "renderJvmGcPanel", "renderModal",
          "renderOnboarding", "scheduleAnomalyBadgeSettle", "scheduleChartPageDraw", "scheduleIpIntelEnrichment",
          "state", "updateAnomalyAlertState", "window"
        ]),
        animateCounters: get("_animateCounters"),
        hideBusy: get("_hideBusy"),
        positionTabIndicator: get("_positionTabIndicator"),
        positionTourCard: get("_positionTourCard"),
        renderError: get("_renderError"),
        setTimeoutRef: get("setTimeout"),
        showBusy: get("_showBusy"),
        staggerReveal: get("_staggerReveal")
      };
    },

    appRenderingDependencies() {
      return pick(get, [
        "state", "ctx", "icons", "document", "window", "performance", "APP_VERSION", "APP_SPLASH_IMAGE",
        "ACCESS_ROLES", "ANALYSIS_TAB_GUIDE", "ANALYSIS_TEMPLATES", "DASHBOARD_PRESETS", "EXPERT_CORRELATIONS",
        "EXPERT_DEFAULT_THRESHOLDS", "FIELD_DOCS", "FIELD_GUIDANCE", "LINUX_PROFILES", "PRE_IMPORT_PRESETS",
        "SERVICE_MAP_SORT_COLLATOR", "TABLE_COLUMNS", "UBUNTU_PROFILES", "html", "ingestViewDependencies",
        "renderIngestPageView", "renderAnalysisPageView", "renderExportMenu", "renderAnalysisTabs", "computeHealthScore",
        "_renderChartsGlobalToolbar", "_renderAdvisorGlobalSummary", "_renderMetricsStatsTable", "chartMetricList",
        "alphabeticalMetrics", "microburstSummary", "formatMicroburstWindow", "metricLabel", "orderedChartMetrics",
        "clampChartColumns", "hasRealTimestampHistory", "renderInvestigationContext", "formatMetricValue",
        "renderMetricChartLegend", "renderChartMoveMenu", "_renderDashboardPresetPicker", "_renderDashboardStudioInline",
        "_renderDashboardStudio", "tailLatencyLens", "formatTailLatencyWindow", "numberFormatter", "formatNumber",
        "visibleHistory", "socketsById", "analyzeBdpWindowLimit", "normalizeBdpDirection", "configuredLinkCapacityMbps",
        "thresholdFor", "formatBitsPerSecond", "bdpChartSeries", "metricUnit", "metricColor", "formatMetricNumber",
        "renderTableMetricCell", "thresholdSeverity", "renderPercentileDistribution", "advancedCorrelationPanels",
        "metricSource", "metricInterpretation", "metricCorrelations", "metricReliabilityProfile", "metricDiagnosticGuidance",
        "escapeHtml", "render", "buildAiSummary", "buildCorrelationMatrix", "analyzeCaptureQuality",
        "renderCaptureQualityReportView", "buildDiagnosticHypotheses", "buildRootCauseMatrix", "detectCwndPhases",
        "buildSparklineIndex", "socketIdentityKey", "anomaliesBySocketId", "riskRank", "resolvePlaybook",
        "playbookForHypothesis", "runAdvisorAnalysis", "renderSocketTableView", "tableSettingsPlacement",
        "buildSocketOptionSets", "tableDefaults", "visibleColumns", "sortedFilteredSockets", "tableStateSnapshot",
        "renderTableSettingsTriggerView", "renderTableSettingsDrawerView", "renderTableSettingsMenuView", "renderTableHeader",
        "getColumn", "columnHelpView", "renderThresholdSummaryView", "renderColumnTooltipView", "pagedRows",
        "groupedSockets", "buildConversations", "conversationAnomalySummary", "renderConversationSortHeader",
        "currentAliasForEndpoint", "aliasCountForSource", "aliasForEndpoint", "aliasListForSource", "ipIntelSummary",
        "ipIntelDetail", "buildServiceMap", "buildServiceMapData", "buildServiceMapRoutes", "layoutTopologyLanePositions",
        "renderGeoMapSvg", "buildGeoMarkers", "renderSankeySvg", "orderServiceMapConnectivity", "serviceMapConnectivityOrder",
        "serviceMapGroupBands", "endpointHost", "endpointPresentation", "topologyGroupForEndpoint", "topologyScopeKey",
        "nodeLabel", "nodeSubtitle", "mapNodeTitle", "renderMapLegend", "renderHotPaths", "renderMapEdgeInsight",
        "buildExpertInformation", "buildTimelineEvents", "cachedStories", "cachedMultiSocket", "cachedRateAlerts",
        "detectTrends", "formatTimelineTime", "formatTimelineOffset", "renderHeatmapView", "renderTimelineStoriesViewModel",
        "severityVisible", "defaultAlertRules", "baselineDeviations", "buildComparison", "buildBaselineNarrative",
        "_renderBaselineNarrative", "_renderDelta", "selectedSocket", "metricValue", "renderApplicationServiceChip",
        "currentApplicationService", "inferredApplicationService", "currentSourceAnnotations", "annotationTypeList",
        "buildAnnotationDraft", "annotationAnchorOptions", "annotationMetricChoices", "annotationDefaultLabel",
        "annotationTypeLabel", "createModalView", "renderPrefsView", "timeZoneOptions", "createGuideView",
        "normalizeAliasStore", "normalizeTopologyProfile", "serviceOverrideForSocket", "normalizePreImportFilters",
        "renderDashboardPresetOptions", "renderDatalist", "accessRoleLabel", "linuxProfileLabel", "ubuntuProfileLabel",
        "envCommand", "commandForPeer", "isAnalystRole", "isLxcProfile", "hasActiveTableFilters",
        "currentApplicationServiceSortKey", "socketBandwidth", "truncateMiddle", "parsedTimestampSnapshots",
        "chartTooltipOpacity", "chartStats", "numberFormatterWith", "renderServiceMapView", "resolvedNumberLocale",
        "resolvedTimeZone", "timeLabel", "analysisTabGuide", "annotationSocketId"
      ]);
    },

    reportActionDependencies() {
      return pick(get, [
        "state", "document", "window", "APP_VERSION", "metricLabel", "toast", "visibleHistory", "resolvedTimeZone",
        "timeLabel", "selectedSocket", "anomaliesBySocketId", "microburstSummary", "formatMicroburstWindow",
        "drawChartInto", "sortedFilteredSockets", "socketBandwidth", "metricValue", "percentile", "severityRank",
        "currentSourceAnnotations", "annotationSocketId", "buildPrintableIncidentReportHtml", "buildIncidentReportPdfModel",
        "buildJiraReportModel", "reportChartDataUrl", "svgToPngBlob", "safeEvidenceFileName", "buildAnomaliesCsv",
        "buildTopSocketsCsv", "buildTimelinePayload", "buildEvidenceManifest", "downloadBlob", "resolvePlaybook",
        "playbookForHypothesis", "buildComparison", "buildBaselineNarrative", "buildAiSummary", "generateIncidentReport",
        "buildRootCauseMatrix", "cachedStories", "cachedMultiSocket", "cachedRateAlerts", "captureQualityReport",
        "diagnosticHypotheses", "cachedRootCauseMatrix", "formatMetricValue", "formatNumber", "resolvedNumberLocale",
        "linuxProfileLabel", "accessRoleLabel", "escapeHtml", "annotationTypeLabel", "pickExecutiveFocusSocket",
        "tailLatencyLens", "guidedChecklistItems", "buildExecutiveSummary", "formatTailLatencyWindow", "socketsById"
      ]);
    }
  };
}
