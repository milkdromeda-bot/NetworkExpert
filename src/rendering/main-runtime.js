import { FIELD_DOCS, FIELD_GUIDANCE, SAMPLE, SS_OPTIONS, generateIncidentDemoSample, generateMicroburstSample, generateSlowConsumerSample, generateTailLatencySample, generateTenMinuteSample, prefsDefault } from "../core/data.js";
import { metricValue, parseTimestampLine } from "../parsing/parser.js";
import { analyzeAll, applyRisks } from "../analysis/analysis.js";
import { importSocketFile } from "../parsing/importer.js?v=20260425-2";
import { socketMatchesAdvancedQuery } from "../config/search.js";
import { defaultAlertRules, evaluateAlertRules as evaluateAlertRuleEvents } from "../config/alerts.js";
import { loadAlertRules, loadAlertAcks, saveAlertRules as saveAlertRulesRaw, saveAlertAcks as saveAlertAcksRaw, loadFilterHistory, saveFilterHistory as saveFilterHistoryRaw, loadTableProfiles, saveTableProfiles as saveTableProfilesRaw, loadDashboardProfiles, saveDashboardProfiles as saveDashboardProfilesRaw, loadServiceAliases, saveServiceAliases as saveServiceAliasesRaw, loadServiceOverrides, saveServiceOverrides as saveServiceOverridesRaw, loadTopologyProfiles, loadTopologyForSource, saveTopologyProfiles, loadAnnotations, saveAnnotations as saveAnnotationsRaw, loadPrefsRaw, savePrefsRaw, loadTableStateRaw, saveTableStateRaw } from "./persistence.js";
import { ANALYSIS_TEMPLATES, DASHBOARD_PRESETS, applyAnalysisTemplate as applyTemplateProfile, applyDashboardPreset as applyDashboardPresetProfile, applyDashboardProfile as applySavedDashboardProfile, dashboardSnapshot as createDashboardSnapshot } from "../config/profiles.js";
import { buildComparison as buildBaselineComparison, createBaseline as createBaselineSnapshot, buildBaselineNarrative } from "../analysis/compare.js";
import { ipIntelDetail, ipIntelSummary, publicPeerIps } from "../services/ip-intel.js";
import { aggregateParsedSocketsByKey, aggregateTimestampedSockets, buildSocketHistoryFromSnapshots, parsedTimestampSnapshots as parseTimestampedSnapshots, socketIdentityKey, socketKey, timestampBlocks as splitTimestampBlocks, withStableSocketIds } from "../timeline/timeline.js";
import { detectMicroburstWindow } from "../analysis/microburst.js";
import { detectTailLatencyLens } from "../analysis/tail-latency.js";
import { applyContextAction, openTopologyModal, setActiveInvestigation } from "../core/navigation.js";
import { aliasCountForSource, aliasDisplay, aliasForEndpoint, aliasListForSource, deleteEndpointAlias, normalizeAliasStore, upsertEndpointAlias } from "../services/aliases.js";
import { deleteTopologyGroup, endpointHost, layoutTopologyLanePositions, normalizeTopologyProfile, topologyGroupForEndpoint, topologyScopeKey, upsertTopologyGroup } from "../config/topology.js";
import { buildExecutiveSummary, pickExecutiveFocusSocket } from "../reporting/executive-summary.js";
import { buildDiagnosticHypotheses } from "../analysis/diagnostics.js";
import { buildRootCauseMatrix } from "../analysis/root-cause-matrix.js";
import { detectTimelineStories } from "../timeline/timeline-stories.js";
import { detectMultiSocketCorrelation } from "../analysis/multi-socket-correlation.js";
import { detectRateOfChange } from "../analysis/rate-of-change.js";
import { buildIncidentReportHtml as generateIncidentReport } from "../reporting/incident-report.js";
import { buildAiSummary } from "../reporting/ai-summary.js";
import { playbookForHypothesis, resolvePlaybook } from "../timeline/playbooks.js";
import { analyzeBdpWindowLimit } from "../analysis/bdp-window-analysis.js";
import { analyzeCaptureQuality } from "../analysis/capture-quality.js";
import { parseGcLog, classifyPause, g1Recommendations, RECOMMENDED_JVM_LOGGING } from "../parsing/gc-log-parser.js";
import { alignTimestamps, correlateJvmStalls, DEFAULT_WINDOWS as JVM_DEFAULT_WINDOWS } from "../correlation/jvm-correlation.js";
import { parsePidstat, parseNstat, correlateCpuWithStalls, extractTcpCounters } from "../parsing/pidstat-parser.js";
import { parseFixLog, computeFixStats, extractEndpoints } from "../parsing/fix-log-parser.js";
import { correlateFixLatency, DEFAULT_WINDOWS as FIX_DEFAULT_WINDOWS } from "../correlation/fix-correlation.js";
import { parseVmstat, parseNstatTimestamped, vmstatSummary } from "../parsing/vmstat-parser.js";
import { parseSar, correlateSarWithTcp } from "../parsing/sar-parser.js";
import { detectCwndPhases } from "../analysis/cwnd-phases.js";
import { detectFragmentation } from "../analysis/fragmentation.js";
import { detectReordering } from "../analysis/reordering.js";
import { buildGeoMarkers, renderGeoMapSvg } from "../charts/geo-map.js";
import { renderSankeySvg } from "../charts/sankey.js";
import { buildSparklineIndex, renderSparkline } from "../charts/sparkline.js";
import { buildSsCollectionCommand, commandCoverage, toggleCommandOption } from "../parsing/ss-command.js";
import { validateSsCommandConfig } from "../parsing/ss-command-validation.js";
import { annotationDefaultLabel, annotationTypeLabel, annotationTypeList, annotationsForContext, buildAnnotationAnchorOptions, buildAnnotationDraft, normalizeAnnotations } from "../timeline/annotations.js";
import { buildAnomaliesCsv, buildEvidenceManifest, buildTimelinePayload, buildTopSocketsCsv, safeEvidenceFileName } from "../reporting/evidence-pack.js";
import { applyChartZoomOperation, clampZoomRange, zoomForMetric, zoomRangeFromDragSelection } from "../charts/chart-zoom.js";
import { inferApplicationService } from "../services/services.js";
import { applyServiceOverride, deleteServiceOverride, normalizeServiceOverrideStore, serviceOverrideForSocket, upsertServiceOverride } from "../services/service-overrides.js";
import { TABLE_STATE_STORAGE_KEY, buildSocketOptionSets, buildVisibleColumnOrder, normalizeTableState, resetTableColumns, resetTableSort, setTableColumnVisibility, tableFilterCacheKey, tableStateSnapshot, toggleTableColumnPin, toggleTableColumnVisibility } from "../views/table-state.js";
import { createTableDefaults, defaultTableFilters, hasNonDefaultTableFilters } from "../views/table-defaults.js";
import { ACCESS_ROLES, COMMON_TIME_ZONES, EXPERT_DEFAULT_THRESHOLDS, INGEST_RAW_EAGER_LIMIT, LINUX_PROFILES, UBUNTU_PROFILES, cloneThresholds } from "../config/expert-config.js";
import { applyTableColumnSearchFilter, renderTableSettingsDrawer as renderTableSettingsDrawerView, renderTableSettingsMenu as renderTableSettingsMenuView, renderTableSettingsTrigger as renderTableSettingsTriggerView, tableSettingsPlacement } from "../views/table-settings-view.js";
import { columnHelp as columnHelpView, renderColumnTooltip as renderColumnTooltipView, renderThresholdSummary as renderThresholdSummaryView } from "../views/column-help-view.js";
import { createTableColumns } from "../views/table-columns.js";
import { renderSocketTableView, renderTableHeader } from "../views/socket-table-view.js";
import { createGuideView } from "../views/guide-view.js";
import { createModalView } from "../views/modal-view.js";
import { createLocaleFormatting } from "../core/locale-formatting.js";
import { downloadBlob, drawPdfSection, drawPdfTextBlock, reportChartDataUrl, svgToPngBlob } from "../reporting/report-utils.js";
import { buildPrintableIncidentReportHtml } from "../reporting/printable-incident-report.js";
import { buildIncidentReportPdf as buildIncidentReportPdfModel } from "../reporting/incident-report-pdf.js";
import { buildJiraReport as buildJiraReportModel } from "../reporting/jira-report.js";
import { renderIngestPage as renderIngestPageView } from "../views/ingest-view.js";
import { handleIngestAction } from "../events/ingest-actions.js";
import { renderFixLatencyPanelView } from "../views/fix-latency-view.js";
import { renderJvmGcPanelView } from "../views/jvm-gc-view.js";
import { renderServiceMapView } from "../views/service-map-view.js";
import { createServiceMapPresenter } from "../views/service-map-presenter.js";
import { renderTimelineStoriesViewModel } from "../views/timeline-stories-view.js";
import { bindSourceFileEvents } from "../events/source-file-events.js";
import { handleServiceConfigAction } from "../services/service-config-actions.js";
import { bindTableInteractionEvents } from "../events/table-interaction-events.js";
import { bindSocketInteractionEvents } from "../events/socket-interaction-events.js";
import { handleLayoutProfileAction } from "../events/layout-profile-actions.js";
import { computeHealthScore } from "../analysis/health-score.js";
import { createAdvancedCorrelationPanels } from "../correlation/advanced-correlation-panels.js";
import { createMetricChartEngine } from "../charts/metric-chart-engine.js";
import { createAppRendering } from "./app-rendering.js";
import { createAnnotationController } from "./annotation-controller.js";
import { createChartOverlayRenderer } from "./chart-overlays.js";
import { createConversationModel } from "./conversation-model.js";
import { createDerivedCacheController } from "./derived-cache-controller.js";
import { chartMetricList as historyChartMetricList, createHistoryController } from "./history-controller.js";
import { createInitialState } from "./initial-state.js";
import { createIpIntelController } from "./ip-intel-controller.js";
import { createPreferencesController } from "./preferences-controller.js";
import { createReportActions } from "../reporting/report-actions.js";
import { createRuntimeProfile, emptyPreImportFilters as createEmptyPreImportFilters } from "./runtime-profile.js";
import { createSsCommandController } from "./ss-command-controller.js";
import { createAppEventBindings } from "../events/app-event-bindings.js";
import { createGlobalDomController } from "./controllers/global-dom-controller.js";
import { createRenderShellController } from "./controllers/render-shell-controller.js";
import { createTimelineEventController } from "./controllers/timeline-event-controller.js";
import { createTableDashboardController } from "./controllers/table-dashboard-controller.js";
import { createMonitoringInsightsController } from "./controllers/monitoring-insights-controller.js";
import { createAlertStateController } from "./controllers/alert-state-controller.js";
import { createAnalysisRuntimeController } from "./controllers/analysis-runtime-controller.js";
import { createAppShellRenderController } from "./controllers/app-shell-render-controller.js";
import { createBrowserFeedbackController } from "./controllers/browser-feedback-controller.js";
import { createCodeMirrorController } from "./controllers/code-mirror-controller.js";
import { createFocusViewController } from "./controllers/focus-view-controller.js";
import { createImportFlowController } from "./controllers/import-flow-controller.js";
import { createInvestigationSummaryController } from "./controllers/investigation-summary-controller.js";
import { createUiMenuController } from "./controllers/ui-menu-controller.js";
import { createUndoCacheController } from "./controllers/undo-cache-controller.js";
import { createWorkspaceRenderController } from "./controllers/workspace-render-controller.js";
import { createMainDependencyFactories } from "./dependencies/index.js";
import { createFactoryFacade, createMethodFacade } from "./facades.js";
import { compressSnapshots, decompressSnapshot, iterateCompressed } from "../analysis/snapshot-compression.js";
import { sharedBufferAvailable, encodeShared } from "../parsing/shared-buffer.js";
import { applySsEditorThemePreview as applySsEditorThemePreviewToDocument, defaultSsCommandConfig as createDefaultSsCommandConfig, defaultSsLogPath as createDefaultSsLogPath, normalizeSsEditorTheme as normalizeSsEditorThemeValue, parseUiIntervalSeconds as parseSsUiIntervalSeconds, readSsCommandConfig as readSsCommandConfigFromDocument, updateSsCommandValidation as updateSsCommandValidationInDocument } from "../parsing/ss-command-config.js";

const TABLE_COLUMNS = createTableColumns({
  riskRank,
  escapeHtml,
  applicationServiceSortKey: currentApplicationServiceSortKey,
  renderApplicationServiceChip,
  renderTableMetricCell,
  socketBandwidth,
  renderEndpointCell,
  renderPeerCell,
  metricValue,
  socketIdentityKey
});

const TABLE_COLUMN_BY_KEY = new Map(TABLE_COLUMNS.map(column => [column.key, column]));
const TABLE_SORT_COLLATOR = new Intl.Collator("fr", { numeric: true });
const CONVERSATION_SORT_COLLATOR = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });
const SERVICE_MAP_SORT_COLLATOR = new Intl.Collator("en", { numeric: true });
const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const APP_VERSION = "1.0.0.0";
const APP_SPLASH_IMAGE = "./images/ultimateNetworkExpert.png";
let state;
const tableDefaultModel = createTableDefaults({ columns: TABLE_COLUMNS, prefsDefault, getPrefs: () => state?.prefs });
const { DEFAULT_TABLE_ORDER, defaultTableColumns, defaultTableState, tableDefaults } = tableDefaultModel;
const dependencyRegistry = {
  ACCESS_ROLES: () => ACCESS_ROLES, ANALYSIS_TAB_GUIDE: () => ANALYSIS_TAB_GUIDE, ANALYSIS_TEMPLATES: () => ANALYSIS_TEMPLATES,
  APP_SPLASH_IMAGE: () => APP_SPLASH_IMAGE, APP_VERSION: () => APP_VERSION, CONVERSATION_SORT_COLLATOR: () => CONVERSATION_SORT_COLLATOR,
  CONVERSATION_SORT_LABELS: () => CONVERSATION_SORT_LABELS, DASHBOARD_PRESETS: () => DASHBOARD_PRESETS, DEFAULT_TABLE_ORDER: () => DEFAULT_TABLE_ORDER,
  EXPERT_CORRELATIONS: () => EXPERT_CORRELATIONS, EXPERT_DEFAULT_THRESHOLDS: () => EXPERT_DEFAULT_THRESHOLDS, FIELD_DOCS: () => FIELD_DOCS,
  FIELD_GUIDANCE: () => FIELD_GUIDANCE, INGEST_RAW_EAGER_LIMIT: () => INGEST_RAW_EAGER_LIMIT, IntersectionObserver: () => IntersectionObserver,
  LINUX_PROFILES: () => LINUX_PROFILES, PRE_IMPORT_PRESETS: () => PRE_IMPORT_PRESETS, SAMPLE: () => SAMPLE,
  SERVICE_MAP_SORT_COLLATOR: () => SERVICE_MAP_SORT_COLLATOR, SS_OPTION_INTEL: () => SS_OPTION_INTEL, TABLE_COLUMNS: () => TABLE_COLUMNS,
  TABLE_COLUMN_BY_KEY: () => TABLE_COLUMN_BY_KEY, TABLE_SORT_COLLATOR: () => TABLE_SORT_COLLATOR, UBUNTU_PROFILES: () => UBUNTU_PROFILES,
  _animateCounters: () => _animateCounters, _hideBusy: () => _hideBusy, _metricLabel: () => _metricLabel,
  _positionTabIndicator: () => _positionTabIndicator, _positionTourCard: () => _positionTourCard, _redo: () => _redo,
  _renderAdvisorGlobalSummary: () => _renderAdvisorGlobalSummary, _renderBaselineNarrative: () => _renderBaselineNarrative, _renderChartsGlobalToolbar: () => _renderChartsGlobalToolbar,
  _renderDashboardPresetPicker: () => _renderDashboardPresetPicker, _renderDashboardStudio: () => _renderDashboardStudio, _renderDashboardStudioInline: () => _renderDashboardStudioInline,
  _renderDelta: () => _renderDelta, _renderError: () => _renderError, _renderMetricsStatsTable: () => _renderMetricsStatsTable,
  _renderSkeleton: () => _renderSkeleton, _showBusy: () => _showBusy, _staggerReveal: () => _staggerReveal,
  _undo: () => _undo, _undoSnapshot: () => _undoSnapshot, accessRoleLabel: () => accessRoleLabel,
  advancedCorrelationPanels: () => advancedCorrelationPanels, aggregateParsedSocketsByKey: () => aggregateParsedSocketsByKey, aggregateTimestampedSockets: () => aggregateTimestampedSockets,
  aliasCountForSource: () => aliasCountForSource, aliasDisplay: () => aliasDisplay, aliasForEndpoint: () => aliasForEndpoint,
  aliasListForSource: () => aliasListForSource, alignTimestamps: () => alignTimestamps, alphabeticalMetrics: () => alphabeticalMetrics,
  analysisTabGuide: () => analysisTabGuide, analyzeAll: () => analyzeAll, analyzeBdpWindowLimit: () => analyzeBdpWindowLimit,
  analyzeCaptureQuality: () => analyzeCaptureQuality, annotationAnchorOptions: () => annotationAnchorOptions, annotationColor: () => annotationColor,
  annotationDefaultLabel: () => annotationDefaultLabel, annotationKindForChartContext: () => annotationKindForChartContext, annotationLabelForChartContext: () => annotationLabelForChartContext,
  annotationMetricChoices: () => annotationMetricChoices, annotationSocketId: () => annotationSocketId, annotationTypeLabel: () => annotationTypeLabel,
  annotationTypeList: () => annotationTypeList, annotationsForContext: () => annotationsForContext, anomaliesBySocketId: () => anomaliesBySocketId,
  anomalyStatusClass: () => anomalyStatusClass, applyAnalysisTemplate: () => applyAnalysisTemplate, applyChartZoomAction: () => applyChartZoomAction,
  applyChartZoomOperation: () => applyChartZoomOperation, applyContextAction: () => applyContextAction, applyDashboardPreset: () => applyDashboardPreset,
  applyDashboardPresetProfile: () => applyDashboardPresetProfile, applyDashboardProfile: () => applyDashboardProfile, applyRisks: () => applyRisks,
  applySavedDashboardProfile: () => applySavedDashboardProfile, applyServiceOverride: () => applyServiceOverride, applySsEditorThemePreview: () => applySsEditorThemePreview,
  applyTableColumnSearchFilter: () => applyTableColumnSearchFilter, applyTableLayout: () => applyTableLayout, applyTemplateProfile: () => applyTemplateProfile,
  baselineDeviations: () => baselineDeviations, bdpChartSeries: () => bdpChartSeries, bdpWindowAnalysis: () => bdpWindowAnalysis,
  bindColumnHelpTooltips: () => bindColumnHelpTooltips, bindEvents: () => bindEvents, bindSmartChartTooltips: () => bindSmartChartTooltips,
  bindSocketInteractionEvents: () => bindSocketInteractionEvents, bindSourceFileEvents: () => bindSourceFileEvents, bindTableInteractionEvents: () => bindTableInteractionEvents,
  buildAiSummary: () => buildAiSummary, buildAnnotationAnchorOptions: () => buildAnnotationAnchorOptions, buildAnnotationDraft: () => buildAnnotationDraft,
  buildAnomaliesCsv: () => buildAnomaliesCsv, buildBaselineComparison: () => buildBaselineComparison, buildBaselineNarrative: () => buildBaselineNarrative,
  buildComparison: () => buildComparison, buildConversations: () => buildConversations, buildCorrelationMatrix: () => buildCorrelationMatrix,
  buildDiagnosticHypotheses: () => buildDiagnosticHypotheses, buildEvidenceManifest: () => buildEvidenceManifest, buildExecutiveSummary: () => buildExecutiveSummary,
  buildExpertInformation: () => buildExpertInformation, buildGeoMarkers: () => buildGeoMarkers, buildGuidedChecklistItems: () => buildGuidedChecklistItems,
  buildHistory: () => buildHistory, buildIncidentReportPdfModel: () => buildIncidentReportPdfModel, buildJiraReport: () => buildJiraReport,
  buildJiraReportModel: () => buildJiraReportModel, buildPrintableIncidentReportHtml: () => buildPrintableIncidentReportHtml, buildRootCauseMatrix: () => buildRootCauseMatrix,
  buildServiceMap: () => buildServiceMap, buildServiceMapData: () => buildServiceMapData, buildServiceMapRoutes: () => buildServiceMapRoutes,
  buildSocketBandwidthIndex: () => buildSocketBandwidthIndex, buildSocketHistoryFromSnapshots: () => buildSocketHistoryFromSnapshots, buildSocketOptionSets: () => buildSocketOptionSets,
  buildSparklineIndex: () => buildSparklineIndex, buildSsCollectionCommand: () => buildSsCollectionCommand, buildTimelineEvents: () => buildTimelineEvents,
  buildTimelinePayload: () => buildTimelinePayload, buildTopSocketsCsv: () => buildTopSocketsCsv, buildVisibleColumnOrder: () => buildVisibleColumnOrder,
  cachedMultiSocket: () => cachedMultiSocket, cachedRateAlerts: () => cachedRateAlerts, cachedRootCauseMatrix: () => cachedRootCauseMatrix,
  cachedStories: () => cachedStories, cancelAnimationFrame: () => cancelAnimationFrame, captureQualityReport: () => captureQualityReport,
  chartAnnotationOverlay: () => chartAnnotationOverlay, chartBgColor: () => chartBgColor, chartDrawDependencies: () => chartDrawDependencies,
  chartMetricList: () => chartMetricList, chartMicroburstBand: () => chartMicroburstBand, chartSeriesKey: () => chartSeriesKey,
  chartStats: () => chartStats, chartTooltipOpacity: () => chartTooltipOpacity, chartZoomFor: () => chartZoomFor,
  clampChartColumns: () => clampChartColumns, clampChartTooltipOpacity: () => clampChartTooltipOpacity, clampZoomRange: () => clampZoomRange,
  clearPercentileTableCrosshair: () => clearPercentileTableCrosshair, clearVisibleHistoryCache: () => clearVisibleHistoryCache, cloneThresholds: () => cloneThresholds,
  closeDashboardPresetMenu: () => closeDashboardPresetMenu, cmInstance: () => cmInstance, columnHelpView: () => columnHelpView,
  commandForPeer: () => commandForPeer, commitDashboardPresetChoice: () => commitDashboardPresetChoice, compressSnapshots: () => compressSnapshots,
  computeFixStats: () => computeFixStats, computeHealthScore: () => computeHealthScore, configuredLinkCapacityMbps: () => configuredLinkCapacityMbps,
  conversationAnomalySummary: () => conversationAnomalySummary, conversationDefaultSortDir: () => conversationDefaultSortDir, copyTextToClipboard: () => copyTextToClipboard,
  correlateCpuWithStalls: () => correlateCpuWithStalls, correlateFixLatency: () => correlateFixLatency, correlateJvmStalls: () => correlateJvmStalls,
  correlateSarWithTcp: () => correlateSarWithTcp, createBaseline: () => createBaseline, createBaselineSnapshot: () => createBaselineSnapshot,
  createDashboardSnapshot: () => createDashboardSnapshot, createGuideView: () => createGuideView, createModalView: () => createModalView,
  ctx: () => ctx, currentAliasDisplay: () => currentAliasDisplay, currentAliasForEndpoint: () => currentAliasForEndpoint,
  currentApplicationService: () => currentApplicationService, currentApplicationServiceSortKey: () => currentApplicationServiceSortKey, currentSourceAnnotations: () => currentSourceAnnotations,
  dashboardPresetIcon: () => dashboardPresetIcon, dashboardPresetIdOrDefault: () => dashboardPresetIdOrDefault, dashboardSnapshot: () => dashboardSnapshot,
  dateTimeFormatter: () => dateTimeFormatter, defaultAlertRules: () => defaultAlertRules, defaultSsCommandConfig: () => defaultSsCommandConfig,
  defaultSsLogPath: () => defaultSsLogPath, defaultTableColumns: () => defaultTableColumns, defaultTableState: () => defaultTableState,
  deleteEndpointAlias: () => deleteEndpointAlias, deleteServiceOverride: () => deleteServiceOverride, deleteTopologyGroup: () => deleteTopologyGroup,
  detectCwndPhases: () => detectCwndPhases, detectFragmentation: () => detectFragmentation, detectMicroburstWindow: () => detectMicroburstWindow,
  detectMultiSocketCorrelation: () => detectMultiSocketCorrelation, detectRateOfChange: () => detectRateOfChange, detectReordering: () => detectReordering,
  detectTailLatencyLens: () => detectTailLatencyLens, detectTimelineStories: () => detectTimelineStories, detectTrends: () => detectTrends,
  diagnosticHypotheses: () => diagnosticHypotheses, document: () => document, downloadBlob: () => downloadBlob,
  drawBdpWindowCharts: () => drawBdpWindowCharts, drawChart: () => drawChart, drawChartInto: () => drawChartInto,
  drawFixCharts: () => drawFixCharts, drawJvmCharts: () => drawJvmCharts, dropRateSeverity: () => dropRateSeverity,
  dropRateSummary: () => dropRateSummary, emptyPreImportFilters: () => emptyPreImportFilters, endpointHost: () => endpointHost,
  endpointPresentation: () => endpointPresentation, envCommand: () => envCommand, escapeHtml: () => escapeHtml,
  evaluateAlertRuleEvents: () => evaluateAlertRuleEvents, evaluateAlertRules: () => evaluateAlertRules, exportChartAsPng: () => exportChartAsPng,
  exportEvidencePack: () => exportEvidencePack, exportFixSpikeCsv: () => exportFixSpikeCsv, exportIncidentReportHtml: () => exportIncidentReportHtml,
  extractTcpCounters: () => extractTcpCounters, filteredAnomalies: () => filteredAnomalies, focusSocket: () => focusSocket,
  formatBitsPerSecond: () => formatBitsPerSecond, formatBytesHuman: () => formatBytesHuman, formatDropCadence: () => formatDropCadence,
  formatDurationCompact: () => formatDurationCompact, formatMetricNumber: () => formatMetricNumber, formatMetricValue: () => formatMetricValue,
  formatMicroburstWindow: () => formatMicroburstWindow, formatNumber: () => formatNumber, formatTailLatencyWindow: () => formatTailLatencyWindow,
  formatTimelineOffset: () => formatTimelineOffset, formatTimelineTime: () => formatTimelineTime, generateIncidentDemoSample: () => generateIncidentDemoSample,
  generateIncidentReport: () => generateIncidentReport, generateMicroburstSample: () => generateMicroburstSample, generateSlowConsumerSample: () => generateSlowConsumerSample,
  generateTailLatencySample: () => generateTailLatencySample, getColumn: () => getColumn, groupedSockets: () => groupedSockets,
  guidedChecklistItems: () => guidedChecklistItems, handleGlobalKeydown: () => handleGlobalKeydown, handleIngestAction: () => handleIngestAction,
  handleLayoutProfileAction: () => handleLayoutProfileAction, handleServiceConfigAction: () => handleServiceConfigAction, hasActiveTableFilters: () => hasActiveTableFilters,
  hasPreImportFilterValue: () => hasPreImportFilterValue, hasRealTimestampHistory: () => hasRealTimestampHistory, hasTimestampedRawData: () => hasTimestampedRawData,
  hideAppServiceTooltip: () => hideAppServiceTooltip, hideFloatingChartTooltipNow: () => hideFloatingChartTooltipNow, html: () => html,
  icons: () => icons, importFile: () => importFile, importSocketFile: () => importSocketFile,
  inferApplicationService: () => inferApplicationService, inferredApplicationService: () => inferredApplicationService, ingestActionDependencies: () => ingestActionDependencies,
  ingestViewDependencies: () => ingestViewDependencies, initCodeMirror: () => initCodeMirror, ipIntelDetail: () => ipIntelDetail,
  ipIntelSummary: () => ipIntelSummary, isAnalystRole: () => isAnalystRole, isLxcProfile: () => isLxcProfile,
  iterateCompressed: () => iterateCompressed, layoutProfileActionDependencies: () => layoutProfileActionDependencies, layoutTopologyLanePositions: () => layoutTopologyLanePositions,
  lazySparklineIndex: () => lazySparklineIndex, linuxProfileLabel: () => linuxProfileLabel, loadPrefsRaw: () => loadPrefsRaw,
  loadTableStateRaw: () => loadTableStateRaw, localStorage: () => localStorage, mapNodeTitle: () => mapNodeTitle,
  markAnalysisDirty: () => markAnalysisDirty, metricColor: () => metricColor, metricCorrelations: () => metricCorrelations,
  metricDiagnosticGuidance: () => metricDiagnosticGuidance, metricInterpretation: () => metricInterpretation, metricLabel: () => metricLabel,
  metricReliabilityProfile: () => metricReliabilityProfile, metricSource: () => metricSource, metricUnit: () => metricUnit,
  metricValue: () => metricValue, microburstSummary: () => microburstSummary, moveTableColumn: () => moveTableColumn,
  moveVisibleChartMetric: () => moveVisibleChartMetric, navigator: () => globalThis.navigator, nodeLabel: () => nodeLabel,
  nodeSubtitle: () => nodeSubtitle, normalizeAliasStore: () => normalizeAliasStore, normalizeBdpDirection: () => normalizeBdpDirection,
  normalizePreImportFilters: () => normalizePreImportFilters, normalizeSsEditorTheme: () => normalizeSsEditorTheme, normalizeTableState: () => normalizeTableState,
  normalizeTopologyProfile: () => normalizeTopologyProfile, numberFormatter: () => numberFormatter, numberFormatterWith: () => numberFormatterWith,
  numberSeparators: () => numberSeparators, openAnnotationModal: () => openAnnotationModal, openIncidentReport: () => openIncidentReport,
  openTopologyModal: () => openTopologyModal, orderServiceMapConnectivity: () => orderServiceMapConnectivity, orderedChartMetrics: () => orderedChartMetrics,
  pagedRows: () => pagedRows, parseFixLog: () => parseFixLog, parseFormattedNumber: () => parseFormattedNumber,
  parseGcLog: () => parseGcLog, parseNstat: () => parseNstat, parseNstatTimestamped: () => parseNstatTimestamped,
  parsePidstat: () => parsePidstat, parseSar: () => parseSar, parseTimestampLine: () => parseTimestampLine,
  parseTimestampedSnapshots: () => parseTimestampedSnapshots, parseUiIntervalSeconds: () => parseUiIntervalSeconds, parseVmstat: () => parseVmstat,
  parsedTimestampSnapshots: () => parsedTimestampSnapshots, percentile: () => percentile, performance: () => performance,
  pickExecutiveFocusSocket: () => pickExecutiveFocusSocket, playbookForHypothesis: () => playbookForHypothesis, positionConversationInsight: () => positionConversationInsight,
  prefsDefault: () => prefsDefault, publicPeerIps: () => publicPeerIps, queueMicrotask: () => queueMicrotask,
  readSsCommandConfigFromDocument: () => readSsCommandConfigFromDocument, recompute: () => recompute, recomputeFromSockets: () => recomputeFromSockets,
  redrawChartCardMetric: () => redrawChartCardMetric, render: () => render, renderAnalysisPage: () => renderAnalysisPage,
  renderAnalysisPageView: () => renderAnalysisPageView, renderAnalysisTabs: () => renderAnalysisTabs, renderApplicationServiceChip: () => renderApplicationServiceChip,
  renderBdpWindowPanel: () => renderBdpWindowPanel, renderCaptureQualityReportView: () => renderCaptureQualityReportView, renderChartAnnotationMenu: () => renderChartAnnotationMenu,
  renderChartMoveMenu: () => renderChartMoveMenu, renderChartsGlobalToolbar: () => renderChartsGlobalToolbar, renderChartsPage: () => renderChartsPage,
  renderColumnTooltipView: () => renderColumnTooltipView, renderConversationSortHeader: () => renderConversationSortHeader, renderDashboardPresetOptions: () => renderDashboardPresetOptions,
  renderDashboardStudioInline: () => renderDashboardStudioInline, renderDatalist: () => renderDatalist, renderDrawer: () => renderDrawer,
  renderExportMenu: () => renderExportMenu, renderFixLatencyPanel: () => renderFixLatencyPanel, renderFixLatencyPanelView: () => renderFixLatencyPanelView,
  renderFocusView: () => renderFocusView, renderGeoMapSvg: () => renderGeoMapSvg, renderGuide: () => renderGuide,
  renderHeatmapView: () => renderHeatmapView, renderHotPaths: () => renderHotPaths, renderIngestPage: () => renderIngestPage,
  renderIngestPageView: () => renderIngestPageView, renderInvestigationContext: () => renderInvestigationContext, renderJvmGcPanel: () => renderJvmGcPanel,
  renderJvmGcPanelView: () => renderJvmGcPanelView, renderKeepingModalPosition: () => renderKeepingModalPosition, renderKeepingWorkspacePosition: () => renderKeepingWorkspacePosition,
  renderMapEdgeInsight: () => renderMapEdgeInsight, renderMapLegend: () => renderMapLegend, renderMetricChartLegend: () => renderMetricChartLegend,
  renderModal: () => renderModal, renderOnboarding: () => renderOnboarding, renderPercentileDistribution: () => renderPercentileDistribution,
  renderPrefsView: () => renderPrefsView, renderRowActions: () => renderRowActions, renderSankeySvg: () => renderSankeySvg,
  renderServiceMapView: () => renderServiceMapView, renderSocketTableView: () => renderSocketTableView, renderSparkline: () => renderSparkline,
  renderSsCommandBuilderView: () => renderSsCommandBuilderView, renderSsOptionChipView: () => renderSsOptionChipView, renderSsOptionControlView: () => renderSsOptionControlView,
  renderSsOptionDetailView: () => renderSsOptionDetailView, renderTableHeader: () => renderTableHeader, renderTableMetricCell: () => renderTableMetricCell,
  renderTableSettingsDrawerView: () => renderTableSettingsDrawerView, renderTableSettingsMenuView: () => renderTableSettingsMenuView, renderTableSettingsTriggerView: () => renderTableSettingsTriggerView,
  renderThresholdSummaryView: () => renderThresholdSummaryView, renderTimelineStoriesViewModel: () => renderTimelineStoriesViewModel, reportChartDataUrl: () => reportChartDataUrl,
  reportDefaultChartMetrics: () => reportDefaultChartMetrics, requestAnimationFrame: () => requestAnimationFrame, resetAllState: () => resetAllState,
  resetDerivedCaches: () => resetDerivedCaches, resetSsEditorThemePreview: () => resetSsEditorThemePreview, resetTableColumns: () => resetTableColumns,
  resetTableSort: () => resetTableSort, resolvePlaybook: () => resolvePlaybook, resolvedNumberLocale: () => resolvedNumberLocale,
  resolvedTimeZone: () => resolvedTimeZone, riskRank: () => riskRank, runAdvisorAnalysis: () => runAdvisorAnalysis,
  runFixCorrelation: () => runFixCorrelation, runJvmCorrelation: () => runJvmCorrelation, safeEvidenceFileName: () => safeEvidenceFileName,
  saveAlertAcksRaw: () => saveAlertAcksRaw, saveAlertRulesRaw: () => saveAlertRulesRaw, saveAnnotations: () => saveAnnotations,
  saveAnnotationsRaw: () => saveAnnotationsRaw, saveCurrentTopology: () => saveCurrentTopology, saveDashboardProfilesRaw: () => saveDashboardProfilesRaw,
  saveFilterHistoryRaw: () => saveFilterHistoryRaw, savePrefs: () => savePrefs, savePrefsRaw: () => savePrefsRaw,
  saveServiceAliasesRaw: () => saveServiceAliasesRaw, saveServiceOverridesRaw: () => saveServiceOverridesRaw, saveTableProfilesRaw: () => saveTableProfilesRaw,
  saveTableState: () => saveTableState, saveTableStateRaw: () => saveTableStateRaw, scheduleAnomalyBadgeSettle: () => scheduleAnomalyBadgeSettle,
  scheduleChartPageDraw: () => scheduleChartPageDraw, scheduleIpIntelEnrichment: () => scheduleIpIntelEnrichment, selectedSocket: () => selectedSocket,
  selectedSsOptionView: () => selectedSsOptionView, serviceConfigActionDependencies: () => serviceConfigActionDependencies, serviceMapConnectivityOrder: () => serviceMapConnectivityOrder,
  serviceMapGroupBands: () => serviceMapGroupBands, serviceOverrideForSocket: () => serviceOverrideForSocket, setActiveInvestigation: () => setActiveInvestigation,
  setSourceName: () => setSourceName, setTableColumnVisibility: () => setTableColumnVisibility, setTimeout: () => setTimeout,
  setZoom: () => setZoom, setZoomFromDateInputs: () => setZoomFromDateInputs, severityRank: () => severityRank,
  severityVisible: () => severityVisible, showAppServiceTooltip: () => showAppServiceTooltip, showPercentileTableCrosshair: () => showPercentileTableCrosshair,
  socketBandwidth: () => socketBandwidth, socketIdentityKey: () => socketIdentityKey, socketInteractionDependencies: () => socketInteractionDependencies,
  socketKey: () => socketKey, socketMatchesAdvancedQuery: () => socketMatchesAdvancedQuery, socketsById: () => socketsById,
  sortedFilteredSockets: () => sortedFilteredSockets, sourceFileEventDependencies: () => sourceFileEventDependencies, splitTimestampBlocks: () => splitTimestampBlocks,
  ssOptionIntelView: () => ssOptionIntelView, state: () => state, svgToPngBlob: () => svgToPngBlob,
  syncChartHistoryToSelection: () => syncChartHistoryToSelection, syncFromCodeMirror: () => syncFromCodeMirror, syncSsCommandFromBuilder: () => syncSsCommandFromBuilder,
  tableDefaults: () => tableDefaults, tableFilterCacheKey: () => tableFilterCacheKey, tableInteractionDependencies: () => tableInteractionDependencies,
  tableLayoutSnapshot: () => tableLayoutSnapshot, tableSettingsPlacement: () => tableSettingsPlacement, tableStateSnapshot: () => tableStateSnapshot,
  tailLatencyLens: () => tailLatencyLens, thresholdFor: () => thresholdFor, thresholdSeverity: () => thresholdSeverity,
  timeLabel: () => timeLabel, timeZoneOptions: () => timeZoneOptions, toast: () => toast,
  toggleCommandOption: () => toggleCommandOption, toggleFixPlayback: () => toggleFixPlayback, toggleTableColumnPin: () => toggleTableColumnPin,
  toggleTableColumnVisibility: () => toggleTableColumnVisibility, topologyGroupForEndpoint: () => topologyGroupForEndpoint, topologyScopeKey: () => topologyScopeKey,
  truncateMiddle: () => truncateMiddle, ubuntuProfileLabel: () => ubuntuProfileLabel, updateAnomalyAlertState: () => updateAnomalyAlertState,
  updateSsCommandValidationInDocument: () => updateSsCommandValidationInDocument, upsertEndpointAlias: () => upsertEndpointAlias, upsertServiceOverride: () => upsertServiceOverride,
  upsertTopologyGroup: () => upsertTopologyGroup, validateSsCommandConfig: () => validateSsCommandConfig, visibleColumns: () => visibleColumns,
  visibleHistory: () => visibleHistory, window: () => window, withStableSocketIds: () => withStableSocketIds,
  zoomForMetric: () => zoomForMetric, zoomRangeFromDragSelection: () => zoomRangeFromDragSelection, zoomToTailLatencyWindow: () => zoomToTailLatencyWindow
};

function dependencyValue(name) {
  const resolve = dependencyRegistry[name];
  if (!resolve) throw new Error(`Missing main dependency: ${name}`);
  return resolve();
}
const dependencyFactories = createMainDependencyFactories(dependencyValue);
const {
  metricChartDependencies, historyDependencies, chartOverlayDependencies, conversationModelDependencies,
  advancedCorrelationDependencies, serviceMapPresenterDependencies, preferencesDependencies, annotationControllerDependencies,
  ssCommandControllerDependencies, runtimeProfileDependencies, derivedCacheDependencies, ipIntelControllerDependencies,
  alertStateDependencies, analysisRuntimeDependencies, appShellRenderDependencies, browserFeedbackDependencies,
  codeMirrorDependencies, focusViewDependencies, importFlowDependencies, investigationSummaryDependencies,
  uiMenuDependencies, undoCacheDependencies, workspaceRenderDependencies, appRenderingDependencies,
  reportActionDependencies, appEventDependencies, ingestActionDependencies, sourceFileEventDependencies,
  serviceConfigActionDependencies, tableInteractionDependencies, socketInteractionDependencies, layoutProfileActionDependencies,
  globalDomDependencies, renderShellDependencies, timelineEventDependencies, tableDashboardDependencies,
  monitoringInsightsDependencies
} = createFactoryFacade(() => dependencyFactories, [
  "metricChartDependencies", "historyDependencies", "chartOverlayDependencies", "conversationModelDependencies",
  "advancedCorrelationDependencies", "serviceMapPresenterDependencies", "preferencesDependencies", "annotationControllerDependencies",
  "ssCommandControllerDependencies", "runtimeProfileDependencies", "derivedCacheDependencies", "ipIntelControllerDependencies",
  "alertStateDependencies", "analysisRuntimeDependencies", "appShellRenderDependencies", "browserFeedbackDependencies",
  "codeMirrorDependencies", "focusViewDependencies", "importFlowDependencies", "investigationSummaryDependencies",
  "uiMenuDependencies", "undoCacheDependencies", "workspaceRenderDependencies", "appRenderingDependencies",
  "reportActionDependencies", "appEventDependencies", "ingestActionDependencies", "sourceFileEventDependencies",
  "serviceConfigActionDependencies", "tableInteractionDependencies", "socketInteractionDependencies", "layoutProfileActionDependencies",
  "globalDomDependencies", "renderShellDependencies", "timelineEventDependencies", "tableDashboardDependencies",
  "monitoringInsightsDependencies"
]);
const preferencesController = createPreferencesController(preferencesDependencies);
const {
  dashboardPresetIdOrDefault, renderDashboardPresetOptions, clampChartTooltipOpacity, chartTooltipOpacity,
  loadPrefs, savePrefs, saveTableState, clearVisibleHistoryCache, saveAnnotations
} = createMethodFacade(() => preferencesController, [
  "dashboardPresetIdOrDefault", "renderDashboardPresetOptions", "clampChartTooltipOpacity", "chartTooltipOpacity",
  "loadPrefs", "savePrefs", "saveTableState", "clearVisibleHistoryCache", "saveAnnotations"
]);

function normalizeSsEditorTheme(value) {
  return normalizeSsEditorThemeValue(value, SS_EDITOR_THEMES, DEFAULT_SS_EDITOR_THEME);
}

function normalizeBdpDirection(value) {
  return value === "outbound" ? "outbound" : "inbound";
}

function configuredLinkCapacityMbps() {
  const value = Number(state?.prefs?.configuredLinkCapacityMbps || 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function defaultSsLogPath(date = new Date()) {
  return createDefaultSsLogPath(date);
}

function defaultSsCommandConfig(date = new Date()) {
  return createDefaultSsCommandConfig(date);
}

function parseUiIntervalSeconds(value) {
  return parseSsUiIntervalSeconds(value);
}

function applySsEditorThemePreview(value) {
  applySsEditorThemePreviewToDocument({ documentRef: document, fallback: DEFAULT_SS_EDITOR_THEME, themes: SS_EDITOR_THEMES, value });
}

function resetSsEditorThemePreview() {
  applySsEditorThemePreview(state.prefs.ssEditorTheme);
}

function hasActiveTableFilters(filters = state?.table?.filters) {
  return hasNonDefaultTableFilters(filters);
}

const tableDashboardController = createTableDashboardController(tableDashboardDependencies);
const {
  getColumn, visibleColumns, tableLayoutSnapshot, applyTableLayout, dashboardSnapshot, applyDefaultDashboardPreset,
  applyDashboardProfile, applyDashboardPreset, applyAnalysisTemplate, moveTableColumn, sortedFilteredSockets, pagedRows
} = createMethodFacade(() => tableDashboardController, [
  "getColumn", "visibleColumns", "tableLayoutSnapshot", "applyTableLayout", "dashboardSnapshot", "applyDefaultDashboardPreset",
  "applyDashboardProfile", "applyDashboardPreset", "applyAnalysisTemplate", "moveTableColumn", "sortedFilteredSockets", "pagedRows"
]);

const initialPrefs = loadPrefs();
if (initialPrefs.theme === "light") document.documentElement.setAttribute("data-theme", "light");
if (initialPrefs.density === "compact") document.documentElement.setAttribute("data-density", "compact");
const showOnboarding = !localStorage.getItem("networkExpertOnboarded");

state = createInitialState({
  buildAnnotationDraft,
  cloneThresholds,
  dashboardPresetIdOrDefault,
  defaultSsCommandConfig,
  initialPrefs,
  loadAlertAcks,
  loadAlertRules,
  loadAnnotations,
  loadDashboardProfiles,
  loadFilterHistory,
  loadServiceAliases,
  loadServiceOverrides,
  loadTableProfiles,
  loadTableState,
  loadTopologyForSource,
  loadTopologyProfiles,
  showOnboarding
});

applyDefaultDashboardPreset();

import { icons } from "../core/icons.js";
import { ANALYSIS_TAB_GUIDE, PRE_IMPORT_PRESETS, EXPERT_CORRELATIONS, SS_EDITOR_THEMES, DEFAULT_SS_EDITOR_THEME, SS_OPTION_INTEL, CONVERSATION_SORT_LABELS } from "../core/constants.js";
import { html, escapeHtml, truncateMiddle } from "../core/utils.js";
import { createAppContext } from "../core/app-context.js";
import { renderTimelineHeatmap as renderHeatmapView } from "../views/heatmap-view.js";
import { metricLabel as _metricLabel, METRIC_LABELS } from "../core/formatters.js";
import { renderBaselineNarrative as _renderBaselineNarrative, renderDelta as _renderDelta } from "../views/comparison-view.js";
import { renderAdvisorGlobalSummary as _renderAdvisorGlobalSummary } from "../views/advisor-summary-view.js";
import { renderMetricsStatsTable as _renderMetricsStatsTable } from "../views/stats-table-view.js";
import { renderChartsGlobalToolbar as _renderChartsGlobalToolbar } from "../views/charts-toolbar-view.js";
import { dashboardPresetIcon, renderDashboardPresetPicker as _renderDashboardPresetPicker, renderDashboardStudioInline as _renderDashboardStudioInline, renderDashboardStudio as _renderDashboardStudio } from "../views/dashboard-view.js";
import { renderCaptureQualityReportView } from "../views/capture-quality-view.js";
import { renderSsCommandBuilder as renderSsCommandBuilderView, renderSsOptionChip as renderSsOptionChipView, renderSsOptionControl as renderSsOptionControlView, renderSsOptionDetail as renderSsOptionDetailView, selectedSsOption as selectedSsOptionView, ssOptionIntel as ssOptionIntelView } from "../views/ss-command-view.js";
import { renderPrefsView } from "../views/preferences-view.js";
import { analysisTabGuide as analysisTabGuideView, renderAnalysisPageView, renderAnalysisTabsView } from "../views/analysis-shell-view.js";
import { metricCorrelations, metricDiagnosticGuidance, metricInterpretation, metricReliabilityProfile, metricSource } from "../analysis/metric-intelligence.js";
import { buildGuidedChecklistItems } from "../views/guided-checklist.js";
import { buildServiceMapData, buildServiceMapRoutes, serviceMapConnectivityOrder as orderServiceMapConnectivity } from "../services/service-map-model.js";

const localeFormatting = createLocaleFormatting({
  browserTimeZone: BROWSER_TIME_ZONE,
  commonTimeZones: COMMON_TIME_ZONES,
  getNavigator: () => globalThis.navigator,
  getPrefs: () => state?.prefs
});
const {
  resolvedNumberLocale, resolvedTimeZone, timeZoneOptions, numberFormatterWith, numberFormatter,
  numberSeparators, dateTimeFormatter, formatNumber, formatTimelineTime, formatTimelineOffset
} = createMethodFacade(() => localeFormatting, [
  "resolvedNumberLocale", "resolvedTimeZone", "timeZoneOptions", "numberFormatterWith", "numberFormatter",
  "numberSeparators", "dateTimeFormatter", "formatNumber", "formatTimelineTime", "formatTimelineOffset"
]);

const metricChartEngine = createMetricChartEngine(metricChartDependencies);
const historyController = createHistoryController(historyDependencies);
const chartOverlays = createChartOverlayRenderer(chartOverlayDependencies);
const conversationModel = createConversationModel(conversationModelDependencies);

const appEventBindings = createAppEventBindings(appEventDependencies);
const globalDomController = createGlobalDomController(globalDomDependencies);
const renderShellController = createRenderShellController(renderShellDependencies);
const timelineEventController = createTimelineEventController(timelineEventDependencies);
const monitoringInsightsController = createMonitoringInsightsController(monitoringInsightsDependencies);
const alertStateController = createAlertStateController(alertStateDependencies);
const analysisRuntimeController = createAnalysisRuntimeController(analysisRuntimeDependencies);
const appShellRenderController = createAppShellRenderController(appShellRenderDependencies);
const browserFeedbackController = createBrowserFeedbackController(browserFeedbackDependencies);
const codeMirrorController = createCodeMirrorController(codeMirrorDependencies);
const focusViewController = createFocusViewController(focusViewDependencies);
const importFlowController = createImportFlowController(importFlowDependencies);
const investigationSummaryController = createInvestigationSummaryController(investigationSummaryDependencies);
const uiMenuController = createUiMenuController(uiMenuDependencies);
const undoCacheController = createUndoCacheController(undoCacheDependencies);
const workspaceRenderController = createWorkspaceRenderController(workspaceRenderDependencies);
const advancedCorrelationPanels = createAdvancedCorrelationPanels(advancedCorrelationDependencies);
const serviceMapPresenter = createServiceMapPresenter(serviceMapPresenterDependencies);
const annotationController = createAnnotationController(annotationControllerDependencies);
const ssCommandController = createSsCommandController(ssCommandControllerDependencies);
const runtimeProfile = createRuntimeProfile(runtimeProfileDependencies);
const derivedCacheController = createDerivedCacheController(derivedCacheDependencies);
const ipIntelController = createIpIntelController(ipIntelControllerDependencies);
const {
  annotationSocketId, annotationMetricChoices, openAnnotationModal
} = createMethodFacade(() => annotationController, [
  "annotationSocketId", "annotationMetricChoices", "openAnnotationModal"
]);
const {
  ssOptionIntel, selectedSsOption, renderSsOptionDetail, renderSsOptionChip, renderExportMenu,
  renderSsOptionControl, renderSsCommandBuilder, readSsCommandConfig, updateSsCommandValidation, syncSsCommandFromBuilder
} = createMethodFacade(() => ssCommandController, [
  "ssOptionIntel", "selectedSsOption", "renderSsOptionDetail", "renderSsOptionChip", "renderExportMenu",
  "renderSsOptionControl", "renderSsCommandBuilder", "readSsCommandConfig", "updateSsCommandValidation", "syncSsCommandFromBuilder"
]);
const { scheduleBdpPrecompute, resetDerivedCaches, markAnalysisDirty } = createMethodFacade(() => derivedCacheController, [
  "scheduleBdpPrecompute", "resetDerivedCaches", "markAnalysisDirty"
]);
const { scheduleIpIntelEnrichment, enrichIpIntelQueue } = createMethodFacade(() => ipIntelController, [
  "scheduleIpIntelEnrichment", "enrichIpIntelQueue"
]);
const {
  buildHistory, buildHistoryFromTimestampedSnapshots, timestampBlocks, parsedTimestampSnapshots,
  buildSocketBandwidthIndex, addBandwidthDerivatives, hasTimestampedRawData, dropRateSummary, dropRateSeverity,
  formatDurationCompact, formatDropCadence, formatMicroburstWindow, formatTailLatencyWindow
} = createMethodFacade(() => historyController, [
  "buildHistory", "buildHistoryFromTimestampedSnapshots", "timestampBlocks", "parsedTimestampSnapshots",
  "buildSocketBandwidthIndex", "addBandwidthDerivatives", "hasTimestampedRawData", "dropRateSummary", "dropRateSeverity",
  "formatDurationCompact", "formatDropCadence", "formatMicroburstWindow", "formatTailLatencyWindow"
]);
const {
  addCollectionAnomalies, runAdvisorAnalysis, socketsWhere, endpointSamples, processSamples,
  makeFinding, buildAdvisorFindings
} = createMethodFacade(() => analysisRuntimeController, [
  "addCollectionAnomalies", "runAdvisorAnalysis", "socketsWhere", "endpointSamples", "processSamples",
  "makeFinding", "buildAdvisorFindings"
]);
const {
  normalizePreImportFilters, hasPreImportFilterValue, isLxcProfile, linuxProfileLabel, ubuntuProfileLabel,
  isAnalystRole, accessRoleLabel, lxcCommand, envCommand, commandForPeer
} = createMethodFacade(() => runtimeProfile, [
  "normalizePreImportFilters", "hasPreImportFilterValue", "isLxcProfile", "linuxProfileLabel", "ubuntuProfileLabel",
  "isAnalystRole", "accessRoleLabel", "lxcCommand", "envCommand", "commandForPeer"
]);
const { buildCorrelationMatrix, detectTrends, baselineDeviations } = createMethodFacade(() => monitoringInsightsController, [
  "buildCorrelationMatrix", "detectTrends", "baselineDeviations"
]);
const {
  evaluateAlertRules, createBaseline, buildComparison, updateAnomalyAlertState,
  updateFavicon, anomalyStatusClass, scheduleAnomalyBadgeSettle
} = createMethodFacade(() => alertStateController, [
  "evaluateAlertRules", "createBaseline", "buildComparison", "updateAnomalyAlertState",
  "updateFavicon", "anomalyStatusClass", "scheduleAnomalyBadgeSettle"
]);
const renderShellFacade = {
  _showBusy: () => renderShellController.showBusy(),
  _hideBusy: () => renderShellController.hideBusy(),
  _staggerReveal: () => renderShellController.staggerReveal(),
  _positionTabIndicator: () => renderShellController.positionTabIndicator(),
  _animateCounters: () => renderShellController.animateCounters(),
  _renderSkeleton: type => renderShellController.renderSkeleton(type),
  _renderError: err => renderShellController.renderError(err),
  renderOnboarding: () => renderShellController.renderOnboarding(),
  _positionTourCard: () => renderShellController.positionTourCard()
};
const {
  _showBusy, _hideBusy, _staggerReveal, _positionTabIndicator, _animateCounters,
  _renderSkeleton, _renderError, renderOnboarding, _positionTourCard
} = renderShellFacade;
const undoFacade = {
  _undoSnapshot: () => undoCacheController.undoSnapshot(),
  _undo: () => undoCacheController.undo(),
  _redo: () => undoCacheController.redo()
};
const { _undoSnapshot, _undo, _redo } = undoFacade;
const { cachedStories, cachedMultiSocket, cachedRateAlerts } = createMethodFacade(() => undoCacheController, [
  "cachedStories", "cachedMultiSocket", "cachedRateAlerts"
]);
const {
  selectedSocket, syncChartHistoryToSelection, focusSocket, renderInvestigationContext,
  inferredApplicationService, currentApplicationService, guidedChecklistItems, renderGuidedChecklistPanel,
  executiveSummarySignal, renderExecutiveSummary
} = createMethodFacade(() => investigationSummaryController, [
  "selectedSocket", "syncChartHistoryToSelection", "focusSocket", "renderInvestigationContext",
  "inferredApplicationService", "currentApplicationService", "guidedChecklistItems", "renderGuidedChecklistPanel",
  "executiveSummarySignal", "renderExecutiveSummary"
]);
const {
  captureWorkspacePosition, restoreWorkspacePosition, renderKeepingWorkspacePosition, renderKeepingModalPosition
} = createMethodFacade(() => workspaceRenderController, [
  "captureWorkspacePosition", "restoreWorkspacePosition", "renderKeepingWorkspacePosition", "renderKeepingModalPosition"
]);
const { rememberFilterHistory, importFile } = createMethodFacade(() => importFlowController, [
  "rememberFilterHistory", "importFile"
]);
const { copyTextToClipboard } = createMethodFacade(() => browserFeedbackController, ["copyTextToClipboard"]);
const {
  closeDashboardPresetMenu, updateDashboardPresetPickerChrome, scheduleDashboardPresetRender,
  commitDashboardPresetChoice, closeFloatingMenus, handleGlobalKeydown
} = createMethodFacade(() => uiMenuController, [
  "closeDashboardPresetMenu", "updateDashboardPresetPickerChrome", "scheduleDashboardPresetRender",
  "commitDashboardPresetChoice", "closeFloatingMenus", "handleGlobalKeydown"
]);
const {
  bindChartMinimapEvents, bindChartChromeEvents, bindChartSeriesEvents, bindEvents
} = createMethodFacade(() => appEventBindings, [
  "bindChartMinimapEvents", "bindChartChromeEvents", "bindChartSeriesEvents", "bindEvents"
]);

function loadTableState(pageSize = prefsDefault.defaultPageSize) {
  return preferencesController.loadTableState(pageSize);
}

function currentSourceAnnotations(metric = null, socketId = annotationSocketId(), history = visibleHistory()) {
  return annotationController.currentSourceAnnotations(metric, socketId, history);
}

function annotationAnchorOptions(history = visibleHistory()) {
  return annotationController.annotationAnchorOptions(history);
}

function annotationKindForChartContext(metric, value) {
  return annotationController.annotationKindForChartContext(metric, value);
}

function annotationLabelForChartContext(metric, value) {
  return annotationController.annotationLabelForChartContext(metric, value);
}

function setSourceName(sourceName) {
  state.sourceName = sourceName;
  state.topology = normalizeTopologyProfile(state.topologyProfiles[topologyScopeKey(sourceName)]);
  state.topologyEditId = "";
  state.topologyDraftMatch = "";
}

function saveCurrentTopology() {
  const scope = topologyScopeKey(state.sourceName);
  state.topology = normalizeTopologyProfile(state.topology);
  state.topologyProfiles = { ...state.topologyProfiles, [scope]: state.topology };
  saveTopologyProfiles(state.topologyProfiles);
}

function recompute() { analysisRuntimeController.recompute(); }

function parseAnalysisSockets() {
  return aggregateTimestampedSockets(state.raw);
}

function recomputeFromSockets() { analysisRuntimeController.recomputeFromSockets(); }

function chartMetricList() {
  return historyChartMetricList();
}

function analysisTabGuide(tabId) {
  return analysisTabGuideView(ANALYSIS_TAB_GUIDE, tabId);
}

function renderAnalysisTabs() {
  return renderAnalysisTabsView({
    tabs: ANALYSIS_TAB_GUIDE,
    activeTab: state.activeTab,
    collapsed: state.analysisSidebarCollapsed,
    escapeHtml
  });
}


function alphabeticalMetrics(metrics = chartMetricList()) {
  return [...metrics].sort((a, b) => metricLabel(a).localeCompare(metricLabel(b), undefined, { sensitivity: "base" }));
}

function clampChartColumns(columns) {
  return Math.min(3, Math.max(1, Number(columns) || 2));
}


function socketBandwidth(socket, metric) {
  return historyController.socketBandwidth(socket, metric);
}

function microburstSummary(rows) {
  return historyController.microburstSummary(rows);
}

function tailLatencyLens(rows) {
  return historyController.tailLatencyLens(rows);
}

function chartMicroburstBand(summary, data, pad, w, h, firstTime, lastTime) {
  return chartOverlays.chartMicroburstBand(summary, data, pad, w, h, firstTime, lastTime);
}

function annotationColor(kind = "custom") {
  return chartOverlays.annotationColor(kind);
}

function chartAnnotationOverlay(metric, data, pad, w, h, firstTime, lastTime) {
  return chartOverlays.chartAnnotationOverlay(metric, data, pad, w, h, firstTime, lastTime);
}

function emptyPreImportFilters() {
  return createEmptyPreImportFilters();
}

function severityVisible(sev) {
  const rank = { critical: 4, high: 3, medium: 2, low: 1 };
  return rank[sev] >= rank[state.prefs.severityFloor];
}

function riskRank(risk) {
  return { low: 1, medium: 2, high: 3, critical: 4 }[risk] || 0;
}

function severityRank(severity) {
  return { low: 1, medium: 2, high: 3, critical: 4 }[severity] || 0;
}

function createSocketFilterMatcher(filters = state.table.filters) { return tableDashboardController.createSocketFilterMatcher(filters); }

function renderDatalist(id, values) {
  return `<datalist id="${id}">${values.slice(0, 1000).map(value => `<option value="${escapeHtml(value)}"></option>`).join("")}</datalist>`;
}

const conversationFacade = Object.fromEntries([
  "groupedSockets", "conversationKey", "buildConversations", "conversationDefaultSortDir",
  "conversationSortText", "conversationSortValue", "compareConversationFallback", "sortConversations", "renderConversationSortHeader",
  "conversationAnomalySummary"
].map(name => [name, (...args) => conversationModel[name](...args)]));
const {
  groupedSockets, conversationKey, buildConversations, conversationDefaultSortDir,
  conversationSortText, conversationSortValue, compareConversationFallback, sortConversations, renderConversationSortHeader,
  conversationAnomalySummary
} = conversationFacade;
function anomaliesBySocketId() { return conversationModel.anomaliesBySocketId(); }
function socketsById() { return conversationModel.socketsById(); }

function buildExpertInformation() {
  return timelineEventController.buildExpertInformation();
}

function buildTimelineEvents() {
  return timelineEventController.buildTimelineEvents();
}

const serviceMapFacade = Object.fromEntries([
  "endpointPresentation", "currentAliasForEndpoint", "currentAliasDisplay", "nodeLabel", "nodeSubtitle", "serviceMapGroupBands",
  "renderMapLegend", "renderHotPaths", "renderMapEdgeInsight", "mapNodeTitle", "buildServiceMap", "serviceMapConnectivityOrder"
].map(name => [name, (...args) => serviceMapPresenter[name](...args)]));
const {
  endpointPresentation, currentAliasForEndpoint, currentAliasDisplay, nodeLabel, nodeSubtitle, serviceMapGroupBands,
  renderMapLegend, renderHotPaths, renderMapEdgeInsight, mapNodeTitle, buildServiceMap, serviceMapConnectivityOrder
} = serviceMapFacade;

let cmInstance = null;
let chartPageDrawFrame = 0;
let correlationDrawFrame = 0;
function initCodeMirror() {
  cmInstance = codeMirrorController.initCodeMirror();
}
function syncFromCodeMirror() {
  codeMirrorController.syncFromCodeMirror();
  cmInstance = codeMirrorController.getInstance();
}

function render() {
  appShellRenderController.render();
}

function _renderSync() { appShellRenderController.renderSync(); }

function scheduleChartPageDraw() {
  if (chartPageDrawFrame) cancelAnimationFrame(chartPageDrawFrame);
  chartPageDrawFrame = requestAnimationFrame(() => {
    chartPageDrawFrame = 0;
    drawChart();
    drawBdpWindowCharts();
    drawJvmCharts();
    drawFixCharts();
    scheduleMultiChartDraw();
    scheduleCorrelationDraw();
  });
}

function scheduleCorrelationDraw() {
  if (correlationDrawFrame) cancelAnimationFrame(correlationDrawFrame);
  correlationDrawFrame = requestAnimationFrame(() => {
    correlationDrawFrame = 0;
    drawCorrelation();
  });
}

function currentApplicationServiceSortKey(socket = {}) { return investigationSummaryController.currentApplicationServiceSortKey(socket); }

function renderApplicationServiceChip(socket, extraClass = "") { return investigationSummaryController.renderApplicationServiceChip(socket, extraClass); }

function ingestViewDependencies() {
  return {
    state,
    html,
    icons,
    escapeHtml,
    formatNumber,
    commandCoverage,
    ssOptions: SS_OPTIONS,
    ssEditorThemes: SS_EDITOR_THEMES,
    selectedSsOption,
    normalizeSsEditorTheme,
    renderSsCommandBuilder,
    renderSsOptionChip,
    renderSsOptionControl,
    renderSsOptionDetail
  };
}

const ctx = createAppContext(state, {
  html, escapeHtml, truncateMiddle, icons,
  formatNumber, formatMetricValue, formatTimelineTime, formatTimelineOffset,
  thresholdFor, thresholdSeverity, metricLabel,
  selectedSocket, socketsById, parsedTimestampSnapshots,
  metricValue, render, renderKeepingWorkspacePosition, toast,
  focusSocket, sortedFilteredSockets, visibleHistory,
  dropRateSummary, renderWhatIfSimulation, renderInvestigationContext, renderTailLatencyLensPanel,
  renderExportMenu, renderTimeZoneOptions, zoomDateTimeValue,
  DASHBOARD_PRESETS, resolvedNumberLocale
});

const appRendering = createAppRendering(appRenderingDependencies);

function renderFocusView() { return focusViewController.renderFocusView(); }
function renderTailLatencyLensPanel(...args) { return appRendering.renderTailLatencyLensPanel(...args); }
function formatBytesHuman(...args) { return appRendering.formatBytesHuman(...args); }
function bdpWindowAnalysis(...args) { return appRendering.bdpWindowAnalysis(...args); }
function renderWhatIfSimulation(...args) { return appRendering.renderWhatIfSimulation(...args); }
function renderEndpointCell(...args) { return appRendering.renderEndpointCell(...args); }
function renderPeerCell(...args) { return appRendering.renderPeerCell(...args); }
function renderTimeZoneOptions(...args) { return appRendering.renderTimeZoneOptions(...args); }

const appRenderingFacade = Object.fromEntries([
  "renderIngestPage", "renderAnalysisPage", "renderChartsGlobalToolbar", "renderAdvisorGlobalSummary", "renderMetricsStatsTable",
  "renderChartsPage", "renderDashboardPresetPicker", "renderDashboardStudioInline", "renderDashboardStudio", "renderBdpWindowPanel",
  "renderJvmGcPanel", "runJvmCorrelation", "drawJvmCharts", "hideFloatingChartTooltipNow", "showAppServiceTooltip",
  "hideAppServiceTooltip", "bindSmartChartTooltips", "bindColumnHelpTooltips", "runFixCorrelation", "renderFixLatencyPanel",
  "drawFixCharts", "toggleFixPlayback", "captureQualityReport", "diagnosticHypotheses", "cachedRootCauseMatrix",
  "renderTableSettingsTrigger", "renderTableSettingsDrawer", "renderTableSettingsMenu", "renderRowActions", "columnHelp",
  "renderThresholdSummary", "renderColumnTooltip", "positionConversationInsight", "renderTimelineHeatmap", "renderBaselineNarrative",
  "renderDelta", "filteredAnomalies", "renderChartAnnotationMenu", "renderDrawer", "renderGuide", "renderModal"
].map(name => [name, (...args) => appRendering[name](...args)]));
const {
  renderIngestPage, renderAnalysisPage, renderChartsGlobalToolbar, renderAdvisorGlobalSummary, renderMetricsStatsTable, renderChartsPage,
  renderDashboardPresetPicker, renderDashboardStudioInline, renderDashboardStudio, renderBdpWindowPanel, renderJvmGcPanel, runJvmCorrelation,
  drawJvmCharts, hideFloatingChartTooltipNow, showAppServiceTooltip, hideAppServiceTooltip, bindSmartChartTooltips, bindColumnHelpTooltips,
  runFixCorrelation, renderFixLatencyPanel, drawFixCharts, toggleFixPlayback, captureQualityReport, diagnosticHypotheses, cachedRootCauseMatrix,
  renderTableSettingsTrigger, renderTableSettingsDrawer, renderTableSettingsMenu, renderRowActions, columnHelp,
  renderThresholdSummary, renderColumnTooltip, positionConversationInsight, renderTimelineHeatmap, renderBaselineNarrative, renderDelta,
  filteredAnomalies, renderChartAnnotationMenu, renderDrawer, renderGuide, renderModal
} = appRenderingFacade;
function lazySparklineIndex(...args) { return appRendering.lazySparklineIndex(...args); }

function metricUnit(metric) { return metricChartEngine.metricUnit(metric); }
function metricFractionDigits(metric, value) { return metricChartEngine.metricFractionDigits(metric, value); }
function formatMetricNumber(metric, value) { return metricChartEngine.formatMetricNumber(metric, value); }
function formatBitsPerSecond(value) { return metricChartEngine.formatBitsPerSecond(value); }
function formatMetricValue(metric, value) { return metricChartEngine.formatMetricValue(metric, value); }
function renderTableMetricCell(metric, value, socketKey) { return metricChartEngine.renderTableMetricCell(metric, value, socketKey); }
function parseFormattedNumber(value) { return metricChartEngine.parseFormattedNumber(value); }
function metricLabel(metric) { return metricChartEngine.metricLabel(metric); }
function metricColor(metric) { return metricChartEngine.metricColor(metric); }
function thresholdFor(metric) { return metricChartEngine.thresholdFor(metric); }
function thresholdSeverity(metric, value) { return metricChartEngine.thresholdSeverity(metric, value); }
function thresholdColor(metric, value) { return metricChartEngine.thresholdColor(metric, value); }
function percentile(sortedValues, p) { return metricChartEngine.percentile(sortedValues, p); }
function chartStats(metric) { return metricChartEngine.chartStats(metric); }
function renderPercentileDistribution(metric, stats) { return metricChartEngine.renderPercentileDistribution(metric, stats); }
function showPercentileTableCrosshair(percentile, label, value) { return metricChartEngine.showPercentileTableCrosshair(percentile, label, value); }
function clearPercentileTableCrosshair() { return metricChartEngine.clearPercentileTableCrosshair(); }
function hasRealTimestampHistory() { return metricChartEngine.hasRealTimestampHistory(); }
function chartResolutionLabel() { return metricChartEngine.chartResolutionLabel(); }
function visibleHistory(metric = null) { return metricChartEngine.visibleHistory(metric); }
function renderableHistory(rows, metric, style, width) { return metricChartEngine.renderableHistory(rows, metric, style, width); }
function chartBgColor() { return metricChartEngine.chartBgColor(); }
function timeLabel(seconds, epochMs = null) { return metricChartEngine.timeLabel(seconds, epochMs); }
function chartZoomFor(metric = null) { return metricChartEngine.chartZoomFor(metric); }
function setZoom(start, end, metric = null) { return metricChartEngine.setZoom(start, end, metric); }
function applyChartZoomAction(action, metric = null) { return metricChartEngine.applyChartZoomAction(action, metric); }
function orderedChartMetrics() { return metricChartEngine.orderedChartMetrics(); }
function renderChartMoveMenu(metric) { return metricChartEngine.renderChartMoveMenu(metric); }
function moveVisibleChartMetric(metric, directionOrTarget) { return metricChartEngine.moveVisibleChartMetric(metric, directionOrTarget); }
function resetAllState() { return metricChartEngine.resetAllState(); }
function zoomDateTimeValue(which) { return metricChartEngine.zoomDateTimeValue(which); }
function setZoomFromDateInputs() { return metricChartEngine.setZoomFromDateInputs(); }
function zoomToTailLatencyWindow() { return metricChartEngine.zoomToTailLatencyWindow(); }
function chartSeriesKey(metric, key) { return metricChartEngine.chartSeriesKey(metric, key); }
function renderMetricChartLegend(metric) { return metricChartEngine.renderMetricChartLegend(metric); }
function drawChart(deps = chartDrawDependencies()) { return metricChartEngine.drawChart(deps); }
function chartDrawDependencies() { return metricChartEngine.chartDrawDependencies(); }
function drawChartInto(svg, metric, style = null, showThreshold = false, deps = chartDrawDependencies()) { return metricChartEngine.drawChartInto(svg, metric, style, showThreshold, deps); }
function scheduleMultiChartDraw(deps = chartDrawDependencies()) { return metricChartEngine.scheduleMultiChartDraw(deps); }
function drawMinimaps(deps = chartDrawDependencies()) { return metricChartEngine.drawMinimaps(deps); }
function drawSingleMinimap(canvas, metric, deps = chartDrawDependencies()) { return metricChartEngine.drawSingleMinimap(canvas, metric, deps); }
function redrawChartCardMetric(metric, action = state.activeChartAction, deps = chartDrawDependencies()) { return metricChartEngine.redrawChartCardMetric(metric, action, deps); }
function drawCorrelation(deps = chartDrawDependencies()) { return metricChartEngine.drawCorrelation(deps); }
function drawBdpWindowCharts(deps = chartDrawDependencies()) { return metricChartEngine.drawBdpWindowCharts(deps); }
function bdpChartSeries(analysis, kind) { return metricChartEngine.bdpChartSeries(analysis, kind); }
function attachChartInteractions(svg, deps = chartDrawDependencies()) { return metricChartEngine.attachChartInteractions(svg, deps); }
const reportActions = createReportActions(reportActionDependencies);

function exportChartAsPng(...args) { return reportActions.exportChartAsPng(...args); }
function reportDefaultChartMetrics(...args) { return reportActions.reportDefaultChartMetrics(...args); }
function buildJiraReport(...args) { return reportActions.buildJiraReport(...args); }
function buildIncidentReportHtml(...args) { return reportActions.buildIncidentReportHtml(...args); }
function buildIncidentReportPdf(...args) { return reportActions.buildIncidentReportPdf(...args); }
function exportEvidencePack(...args) { return reportActions.exportEvidencePack(...args); }
function exportIncidentReportHtml(...args) { return reportActions.exportIncidentReportHtml(...args); }
function exportFixSpikeCsv(...args) { return reportActions.exportFixSpikeCsv(...args); }
function openIncidentReport(...args) { return reportActions.openIncidentReport(...args); }

function toast(title, text, type = "") {
  browserFeedbackController.toast(title, text, type);
}

function toggleCommandPalette() {
  globalDomController.toggleCommandPalette();
}

globalDomController.bindGlobalDomEvents();

window._ctx = ctx;

window._debug = { get state() { return state; }, snapshots: () => parsedTimestampSnapshots() };

render();
