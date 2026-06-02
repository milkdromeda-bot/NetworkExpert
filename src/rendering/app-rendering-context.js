const OBJECT_DEPENDENCIES = [
  "state",
  "ctx",
  "icons",
  "document",
  "window",
  "performance",
  "ACCESS_ROLES",
  "ANALYSIS_TAB_GUIDE",
  "ANALYSIS_TEMPLATES",
  "DASHBOARD_PRESETS",
  "EXPERT_CORRELATIONS",
  "EXPERT_DEFAULT_THRESHOLDS",
  "FIELD_DOCS",
  "FIELD_GUIDANCE",
  "LINUX_PROFILES",
  "PRE_IMPORT_PRESETS",
  "SERVICE_MAP_SORT_COLLATOR",
  "TABLE_COLUMNS",
  "UBUNTU_PROFILES",
  "advancedCorrelationPanels"
];

const VALUE_DEPENDENCIES = [
  "APP_VERSION",
  "APP_SPLASH_IMAGE"
];

const FUNCTION_DEPENDENCIES = [
  "html",
  "ingestViewDependencies",
  "renderIngestPageView",
  "renderAnalysisPageView",
  "renderExportMenu",
  "renderAnalysisTabs",
  "computeHealthScore",
  "_renderChartsGlobalToolbar",
  "_renderAdvisorGlobalSummary",
  "_renderMetricsStatsTable",
  "chartMetricList",
  "alphabeticalMetrics",
  "microburstSummary",
  "formatMicroburstWindow",
  "metricLabel",
  "orderedChartMetrics",
  "clampChartColumns",
  "hasRealTimestampHistory",
  "renderInvestigationContext",
  "formatMetricValue",
  "renderMetricChartLegend",
  "renderChartMoveMenu",
  "_renderDashboardPresetPicker",
  "_renderDashboardStudioInline",
  "_renderDashboardStudio",
  "tailLatencyLens",
  "formatTailLatencyWindow",
  "numberFormatter",
  "formatNumber",
  "visibleHistory",
  "socketsById",
  "analyzeBdpWindowLimit",
  "normalizeBdpDirection",
  "configuredLinkCapacityMbps",
  "thresholdFor",
  "formatBitsPerSecond",
  "bdpChartSeries",
  "metricUnit",
  "metricColor",
  "formatMetricNumber",
  "renderTableMetricCell",
  "thresholdSeverity",
  "renderPercentileDistribution",
  "metricSource",
  "metricInterpretation",
  "metricCorrelations",
  "metricReliabilityProfile",
  "metricDiagnosticGuidance",
  "escapeHtml",
  "render",
  "buildAiSummary",
  "analyzeCaptureQuality",
  "renderCaptureQualityReportView",
  "buildDiagnosticHypotheses",
  "buildRootCauseMatrix",
  "detectCwndPhases",
  "buildSparklineIndex",
  "socketIdentityKey",
  "anomaliesBySocketId",
  "riskRank",
  "resolvePlaybook",
  "playbookForHypothesis",
  "runAdvisorAnalysis",
  "renderSocketTableView",
  "tableSettingsPlacement",
  "buildSocketOptionSets",
  "tableDefaults",
  "visibleColumns",
  "sortedFilteredSockets",
  "tableStateSnapshot",
  "renderTableSettingsTriggerView",
  "renderTableSettingsDrawerView",
  "renderTableSettingsMenuView",
  "renderTableHeader",
  "getColumn",
  "columnHelpView",
  "renderThresholdSummaryView",
  "renderColumnTooltipView",
  "pagedRows",
  "groupedSockets",
  "buildConversations",
  "conversationAnomalySummary",
  "renderConversationSortHeader",
  "currentAliasForEndpoint",
  "aliasCountForSource",
  "aliasForEndpoint",
  "aliasListForSource",
  "ipIntelSummary",
  "ipIntelDetail",
  "buildServiceMap",
  "buildServiceMapData",
  "buildServiceMapRoutes",
  "layoutTopologyLanePositions",
  "renderGeoMapSvg",
  "buildGeoMarkers",
  "renderSankeySvg",
  "orderServiceMapConnectivity",
  "serviceMapGroupBands",
  "endpointHost",
  "topologyGroupForEndpoint",
  "topologyScopeKey",
  "nodeLabel",
  "nodeSubtitle",
  "mapNodeTitle",
  "renderMapLegend",
  "renderHotPaths",
  "renderMapEdgeInsight",
  "buildExpertInformation",
  "buildTimelineEvents",
  "cachedStories",
  "cachedMultiSocket",
  "cachedRateAlerts",
  "detectTrends",
  "formatTimelineTime",
  "formatTimelineOffset",
  "renderHeatmapView",
  "renderTimelineStoriesViewModel",
  "severityVisible",
  "defaultAlertRules",
  "baselineDeviations",
  "buildComparison",
  "buildBaselineNarrative",
  "_renderBaselineNarrative",
  "_renderDelta",
  "selectedSocket",
  "metricValue",
  "renderApplicationServiceChip",
  "currentApplicationService",
  "currentSourceAnnotations",
  "annotationTypeList",
  "buildAnnotationDraft",
  "annotationAnchorOptions",
  "annotationMetricChoices",
  "annotationDefaultLabel",
  "annotationTypeLabel",
  "createModalView",
  "renderPrefsView",
  "timeZoneOptions",
  "createGuideView",
  "normalizePreImportFilters",
  "renderDashboardPresetOptions",
  "renderDatalist",
  "accessRoleLabel",
  "linuxProfileLabel",
  "ubuntuProfileLabel",
  "hasActiveTableFilters",
  "currentApplicationServiceSortKey",
  "socketBandwidth",
  "truncateMiddle",
  "parsedTimestampSnapshots",
  "chartTooltipOpacity",
  "annotationSocketId",
  "buildCorrelationMatrix",
  "endpointPresentation",
  "commandForPeer",
  "envCommand",
  "inferredApplicationService",
  "normalizeAliasStore",
  "normalizeTopologyProfile",
  "numberFormatterWith",
  "renderServiceMapView",
  "resolvedNumberLocale",
  "resolvedTimeZone",
  "serviceOverrideForSocket",
  "serviceMapConnectivityOrder",
  "chartStats",
  "isAnalystRole",
  "isLxcProfile",
  "timeLabel",
  "analysisTabGuide"
];

export function createAppRenderingContext(getDeps) {
  const current = () => getDeps();
  const call = (name, ...args) => {
    const fn = current()[name];
    if (typeof fn !== "function") throw new Error(`Missing app rendering dependency: ${name}`);
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
  const proxiedValue = name => new Proxy({}, {
    get(_target, prop) {
      const value = current()[name];
      if (prop === Symbol.toPrimitive) return () => value;
      if (prop === "toString") return () => String(value ?? "");
      if (prop === "valueOf") return () => value;
      return value?.[prop];
    }
  });
  const context = {};
  for (const name of OBJECT_DEPENDENCIES) context[name] = proxiedObject(name);
  for (const name of VALUE_DEPENDENCIES) context[name] = proxiedValue(name);
  for (const name of FUNCTION_DEPENDENCIES) context[name] = (...args) => call(name, ...args);
  return context;
}
