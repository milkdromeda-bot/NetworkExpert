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
import { buildAdvisorFindings as buildAdvisorFindingsModel } from "../analysis/advisor-findings.js";
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
import { createReportActions } from "../reporting/report-actions.js";
import { createAppEventBindings } from "../events/app-event-bindings.js";
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
const tableDefaultModel = createTableDefaults({ columns: TABLE_COLUMNS, prefsDefault, getPrefs: () => state?.prefs });
const { DEFAULT_TABLE_ORDER, defaultTableColumns, defaultTableState, tableDefaults } = tableDefaultModel;

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


const initialPrefs = loadPrefs();
if (initialPrefs.theme === "light") document.documentElement.setAttribute("data-theme", "light");
if (initialPrefs.density === "compact") document.documentElement.setAttribute("data-density", "compact");
const showOnboarding = !localStorage.getItem("networkExpertOnboarded");

let state = {
  raw: "",
  showEditor: false,
  analysisSidebarCollapsed: false,
  breadcrumbMenuOpen: false,
  command: "ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all",
  ssCommandConfig: defaultSsCommandConfig(),
  sourceName: "empty workspace",
  sockets: [],
  selectedId: null,
  activeContextId: null,
  activeContextReason: "",
  anomalies: [],
  alertEvents: [],
  importStatus: null,
  pendingFile: null,
  analysisDirty: true,
  dataVersion: 0,
  rawVersion: 0,
  chartRenderToken: 0,
  hiddenBdpSeries: new Set(),
  hiddenChartSeries: new Set(),
  hiddenJvmSeries: new Set(),
  jvmGc: { rawLog: "", pauses: [], safepoints: [], correlation: null, clockOffsetMs: 0, pidstat: null, nstat: null, cpuCorrelation: null },
  jvmTable: { page: 1, pageSize: 20, sortKey: "time", sortDir: "desc" },
  peerCapture: { raw: "", sockets: [], sourceName: "" },
  fixLatency: { records: [], correlation: null, threshold: 5, gcWindowMs: 0, showGcZones: true, expandedChart: null, hiddenSeries: new Set(["us", "sy"]), cpuCores: 0, fileStats: [], vmstat: null, nstat: null, playing: false, zoom: { timeline: { start: 0, end: 1 }, scatter: { start: 0, end: 1 }, vmstat: { start: 0, end: 1 }, nstat: { start: 0, end: 1 } } },
  fixTable: { page: 1, pageSize: 20, sortKey: "score", sortDir: "desc", causeFilter: "", selectedEpoch: null },
  advisorFindings: [],
  bandwidthIndex: {},
  anomalyAlertSince: null,
  lastAnomalyCount: 0,
  preImportFilters: { enabled: false, protocol: "", state: "", srcIp: "", dstIp: "", anyPort: "", srcPort: "", dstPort: "" },
  filterHistory: loadFilterHistory(),
  tableProfiles: loadTableProfiles(),
  dashboardProfiles: loadDashboardProfiles(),
  activeDashboardPreset: dashboardPresetIdOrDefault(initialPrefs.defaultDashboardPreset),
  serviceAliases: loadServiceAliases(),
  aliasEditKey: "",
  aliasEditScope: "source",
  serviceOverrides: loadServiceOverrides(),
  serviceOverrideSocketId: "",
  topologyProfiles: loadTopologyProfiles(),
  topology: loadTopologyForSource("empty workspace"),
  topologyEditId: "",
  topologyDraftMatch: "",
  alertRules: loadAlertRules(),
  alertAcks: loadAlertAcks(),
  annotations: loadAnnotations(),
  baseline: null,
  ipIntel: {},
  ipIntelRunning: false,
  prefs: initialPrefs,
  view: "ingest",
  activeTab: "sockets",
  chartsTab: "charts",
  timelineView: "stories",
  diagnosisView: "matrix",
  expandedChart: null,
  onboarding: showOnboarding ? 0 : -1,
  openStyleMenu: false,
  openSsEditorThemeMenu: false,
  editorWordWrap: false,
  anomalyFilters: { severity: "all", metric: "all", text: "", sort: "priority" },
  prefsTab: "display",
  drawer: null,
  modal: null,
  gearMenuOpen: false,
  _undoStack: [],
  _redoStack: [],
  statsMetric: null,
  helpColumn: null,
  helpMetric: null,
  ssOptionHelpKey: "-i",
  showSsOptions: false,
  showCorrelationSources: false,
  annotationDraft: buildAnnotationDraft({ sourceName: "empty workspace" }),
  annotationContext: null,
  ingestRawExpanded: true,
  openChartMoveMetric: null,
  openChartMovePos: null,
  chartAnnotationMenuContext: null,
  chartAnnotationMenuPos: null,
  openMenuPos: null,
  openMenuId: null,
  openExportMenu: null,
  openExportMenuPos: null,
  openTableSettings: false,
  openTableSettingsPos: null,
  tableColumnSearch: "",
  openDashboardPresetMenu: false,
  dashboardPresetBeforeOpen: null,
  openConversationInsightKey: null,
  openConversationInsightPos: null,
  conversationSort: { key: "anomalies", dir: "desc" },
  selectedMapEdgeId: null,
  mapView: "topology",
  sankeySort: "risk",
  sankeySnapshot: null,
  copiedGuideCommand: "",
  history: [],
  chartMetrics: ["tx_bps", "rx_bps", "rtt", "rto", "sendQ", "skmem.d"],
  correlation: { x: "rtt", y: "sendQ" },
  chartZoom: { start: 0, end: 1 },
  chartZoomByMetric: {},
  activeChartMetric: null,
  activeChartAction: null,
  cache: {
    timestampRawVersion: -1,
    timestampBlocks: [],
    snapshotRawVersion: -1,
    timestampSnapshots: [],
    filteredKey: "",
    filteredRows: null,
    optionKey: "",
    optionSets: null,
    anomalyMapKey: "",
    anomaliesBySocketId: null,
    socketMapKey: "",
    socketsById: null,
    visibleHistoryKey: "",
    visibleHistoryRows: null,
    visibleHistoryRowsByKey: new Map(),
    microburstKey: "",
    microburstSummary: null,
    tailLatencyKey: "",
    tailLatencySummary: null
  },
  thresholds: cloneThresholds(),
  table: loadTableState(initialPrefs.defaultPageSize)
};

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

const metricChartEngine = createMetricChartEngine(metricChartDependencies);

function metricChartDependencies() {
  return {
    state,
    icons,
    document,
    window,
    performance,
    requestAnimationFrame,
    DASHBOARD_PRESETS,
    DEFAULT_TABLE_ORDER,
    metricLabel: _metricLabel,
    escapeHtml,
    numberFormatter,
    numberFormatterWith,
    numberSeparators,
    formatNumber,
    lazySparklineIndex,
    renderSparkline,
    dateTimeFormatter,
    resolvedNumberLocale,
    resolvedTimeZone,
    clearVisibleHistoryCache,
    tailLatencyLens,
    microburstSummary,
    chartMicroburstBand,
    chartAnnotationOverlay,
    bdpWindowAnalysis,
    formatBytesHuman,
    annotationKindForChartContext,
    annotationLabelForChartContext,
    currentSourceAnnotations,
    annotationColor,
    toast,
    render,
    setSourceName,
    setActiveInvestigation,
    defaultSsCommandConfig,
    defaultTableColumns,
    clampChartColumns,
    applyChartZoomOperation,
    clampZoomRange,
    zoomForMetric,
    zoomRangeFromDragSelection,
    savePrefs,
    chartTooltipOpacity
  };
}

const appEventBindings = createAppEventBindings(appEventDependencies);
const advancedCorrelationPanels = createAdvancedCorrelationPanels(advancedCorrelationDependencies);
const serviceMapPresenter = createServiceMapPresenter(serviceMapPresenterDependencies);

function advancedCorrelationDependencies() {
  return {
    state,
    icons,
    document,
    window,
    Worker: window.Worker,
    performance,
    requestAnimationFrame,
    cancelAnimationFrame,
    alignTimestamps,
    chartBgColor,
    chartTooltipOpacity,
    computeFixStats,
    correlateFixLatency,
    correlateJvmStalls,
    dateTimeFormatter,
    dropRateSummary,
    escapeHtml,
    formatBytesHuman,
    formatMetricValue,
    formatNumber,
    metricValue,
    parsedTimestampSnapshots,
    render,
    renderFixLatencyPanelView,
    renderJvmGcPanelView,
    resolvedNumberLocale,
    resolvedTimeZone,
    setZoom,
    socketsById,
    timeLabel,
    visibleHistory
  };
}

function serviceMapPresenterDependencies() {
  return {
    state,
    icons,
    SERVICE_MAP_SORT_COLLATOR,
    aliasDisplay,
    aliasForEndpoint,
    anomaliesBySocketId,
    buildServiceMapData,
    escapeHtml,
    formatMetricValue,
    formatNumber,
    metricLabel,
    metricValue,
    orderServiceMapConnectivity,
    riskRank,
    severityRank,
    socketBandwidth,
    sortedFilteredSockets,
    thresholdSeverity,
    topologyGroupForEndpoint
  };
}

function dashboardPresetIdOrDefault(value) {
  const fallback = DASHBOARD_PRESETS[prefsDefault.defaultDashboardPreset]
    ? prefsDefault.defaultDashboardPreset
    : Object.keys(DASHBOARD_PRESETS)[0] || "noc";
  return DASHBOARD_PRESETS[value] ? value : fallback;
}

function renderDashboardPresetOptions(selectedId) {
  const selected = dashboardPresetIdOrDefault(selectedId);
  return Object.entries(DASHBOARD_PRESETS)
    .map(([id, preset]) => `<option value="${escapeHtml(id)}" ${id === selected ? "selected" : ""}>${escapeHtml(preset.name)}</option>`)
    .join("");
}
function clampChartTooltipOpacity(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0.3;
  return Math.max(0.2, Math.min(1, number));
}

function chartTooltipOpacity() {
  return clampChartTooltipOpacity(state.prefs.chartLayout?.tooltipOpacity);
}

function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem("networkExpertPrefs") || "{}");
    const prefs = { ...prefsDefault, ...saved, chartLayout: { ...prefsDefault.chartLayout, ...(saved.chartLayout || {}) } };
    prefs.chartLayout.columns = clampChartColumns(prefs.chartLayout.columns);
    prefs.chartLayout.tooltipOpacity = clampChartTooltipOpacity(prefs.chartLayout.tooltipOpacity);
    prefs.defaultDashboardPreset = dashboardPresetIdOrDefault(prefs.defaultDashboardPreset);
    prefs.ssEditorTheme = normalizeSsEditorTheme(prefs.ssEditorTheme);
    prefs.bdpDirection = normalizeBdpDirection(prefs.bdpDirection);
    prefs.configuredLinkCapacityMbps = Number(prefs.configuredLinkCapacityMbps) > 0 ? Number(prefs.configuredLinkCapacityMbps) : "";
    if (saved.sampling == null || (saved.sampling === 5 && saved.chartResolutionDefault !== "max")) prefs.sampling = 1;
    prefs.chartResolutionDefault = "max";
    return prefs;
  } catch {
    return { ...prefsDefault };
  }
}

function savePrefs() {
  state.prefs.chartLayout.columns = clampChartColumns(state.prefs.chartLayout.columns);
  state.prefs.chartLayout.tooltipOpacity = chartTooltipOpacity();
  state.prefs.defaultDashboardPreset = dashboardPresetIdOrDefault(state.prefs.defaultDashboardPreset);
  state.prefs.ssEditorTheme = normalizeSsEditorTheme(state.prefs.ssEditorTheme);
  state.prefs.bdpDirection = normalizeBdpDirection(state.prefs.bdpDirection);
  state.prefs.configuredLinkCapacityMbps = configuredLinkCapacityMbps() || "";
  savePrefsRaw(state.prefs);
}

function loadTableState(pageSize = prefsDefault.defaultPageSize) {
  const defaults = defaultTableState(pageSize);
  try {
    return normalizeTableState({ ...defaults, ...loadTableStateRaw() }, TABLE_COLUMNS, defaults);
  } catch {
    return normalizeTableState(defaults, TABLE_COLUMNS, defaults);
  }
}

function saveTableState() {
  state.table = saveTableStateRaw(state.table, TABLE_COLUMNS, tableDefaults());
}

function clearVisibleHistoryCache() {
  if (!state?.cache) return;
  state.cache.visibleHistoryKey = "";
  state.cache.visibleHistoryRows = null;
  state.cache.visibleHistoryRowsByKey?.clear();
}

function saveAnnotations() {
  state.annotations = saveAnnotationsRaw(state.annotations);
}

function annotationSocketId() {
  return selectedSocket()?.id || state.selectedId || "";
}

function currentSourceAnnotations(metric = null, socketId = annotationSocketId(), history = visibleHistory()) {
  return annotationsForContext(state.annotations, {
    sourceName: state.sourceName,
    socketId,
    metric,
    history,
    microburst: microburstSummary(),
    tailLatency: tailLatencyLens()
  });
}

function annotationAnchorOptions(history = visibleHistory()) {
  return buildAnnotationAnchorOptions({
    history,
    microburst: microburstSummary(),
    tailLatency: tailLatencyLens()
  });
}

function annotationMetricChoices() {
  const preferred = ["*", state.prefs.graphMetric, ...state.chartMetrics, ...reportDefaultChartMetrics(8)].filter(Boolean);
  return [...new Set(preferred)].map(metric => ({
    value: metric,
    label: metric === "*" ? "Socket-wide (show on all charts)" : metricLabel(metric)
  }));
}

function annotationKindForChartContext(metric, value) {
  if (["rtt", "rttvar", "rto"].includes(metric)) return "rtt-peak";
  if (["skmem.d", "skmem.d_rate"].includes(metric)) return "burst-start";
  if (["recvQ", "sendQ"].includes(metric)) return "queue-reset";
  if (["rx_bps", "tx_bps", "delivery_rate", "pacing_rate"].includes(metric) && Number(value) > 0) return "burst-start";
  return "custom";
}

function annotationLabelForChartContext(metric, value) {
  const severity = thresholdSeverity(metric, Number(value) || 0);
  if (severity === "danger" || severity === "warn") return `${metricLabel(metric)} spike`;
  if (["recvQ", "sendQ"].includes(metric)) return `${metricLabel(metric)} marker`;
  if (["rtt", "rttvar", "rto"].includes(metric)) return `${metricLabel(metric)} peak`;
  return `${metricLabel(metric)} marker`;
}

function openAnnotationModal(metric = "*", context = null) {
  const socketId = annotationSocketId();
  if (!socketId) {
    toast("No active socket", "Select a socket before adding an annotation.", "warn");
    return;
  }
  const chartContext = context && Number.isFinite(Number(context.epochMs))
    ? {
        ...context,
        metric: context.metric || metric || "*",
        epochMs: Number(context.epochMs),
        value: Number.isFinite(Number(context.value)) ? Number(context.value) : null
      }
    : null;
  const draftMetric = chartContext?.metric || metric || "*";
  const kind = chartContext?.kind || annotationKindForChartContext(draftMetric, chartContext?.value);
  state.annotationContext = chartContext;
  state.annotationDraft = {
    ...buildAnnotationDraft({ sourceName: state.sourceName, socketId, metric: draftMetric, kind }),
    kind,
    label: chartContext?.label || annotationLabelForChartContext(draftMetric, chartContext?.value),
    note: chartContext?.note || "",
    metric: draftMetric,
    anchor: chartContext ? "cursor" : "visible-end",
    epochMs: chartContext?.epochMs ?? null
  };
  state.modal = "annotation";
  render();
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



function ssOptionIntel(short, long, desc, group) {
  return ssOptionIntelView(SS_OPTION_INTEL, short, long, desc, group);
}

function selectedSsOption(options, active) {
  return selectedSsOptionView(options, active, state.ssOptionHelpKey);
}

function renderSsOptionDetail(option) {
  return renderSsOptionDetailView(option, { escapeHtml, ssOptionIntel });
}

function renderSsOptionChip(option) {
  return renderSsOptionChipView(option, { escapeHtml, ssOptionIntel });
}

function renderExportMenu(scope = "analysis") {
  const open = state.openExportMenu === scope;
  const pos = open && state.openExportMenuPos
    ? `style="left:${state.openExportMenuPos.left}px;top:${state.openExportMenuPos.top}px"`
    : "";
  return `<span class="export-menu-wrap">
    <button data-export-menu="${escapeHtml(scope)}" title="Export report or evidence pack">${icons.pack} Export</button>
    <div class="row-menu export-menu gdrive-menu ${open ? "open" : ""}" ${pos}>
      <button data-export-action="pdf"><i class="ri-file-pdf-line"></i><span>Executive summary PDF</span><kbd>Ctrl+Shift+P</kbd></button>
      <button data-export-action="incident-html"><i class="ri-file-code-line"></i><span>Full incident report HTML</span><kbd>Ctrl+Shift+H</kbd></button>
      <button data-export-action="pack"><i class="ri-folder-zip-line"></i><span>Evidence pack ZIP</span><kbd>Ctrl+Shift+Z</kbd></button>
      <button data-export-action="jira"><i class="ri-clipboard-line"></i><span>Copy Jira report</span><kbd>Ctrl+Shift+J</kbd></button>
      ${state.fixLatency.correlation?.results?.length ? `<button data-export-action="fix-csv"><i class="ri-file-excel-line"></i><span>FIX spikes CSV</span><kbd>Ctrl+Shift+F</kbd></button>` : ""}
    </div>
  </span>`;
}
function renderSsOptionControl(option, coverage, selectedKey) {
  return renderSsOptionControlView(option, coverage, selectedKey, { escapeHtml, ssOptionIntel });
}

function renderSsCommandBuilder() {
  return renderSsCommandBuilderView({
    state,
    parseUiIntervalSeconds,
    validateSsCommandConfig,
    escapeHtml,
    defaultSsLogPath
  });
}

function readSsCommandConfig() {
  return readSsCommandConfigFromDocument(document);
}

function updateSsCommandValidation(validation) {
  updateSsCommandValidationInDocument(validation, document);
}

function syncSsCommandFromBuilder({ updateWarning = true } = {}) {
  const commandInput = document.querySelector("#commandInput");
  state.ssCommandConfig = readSsCommandConfig();
  const validation = validateSsCommandConfig(state.ssCommandConfig);
  updateSsCommandValidation(validation);
  if (validation.valid) {
    state.command = buildSsCollectionCommand(commandInput ? commandInput.value : state.command, state.ssCommandConfig);
    if (commandInput) commandInput.value = state.command;
  }
  if (updateWarning) {
    const interval = parseUiIntervalSeconds(state.ssCommandConfig.intervalSeconds);
    const risky = Boolean(state.ssCommandConfig.outputPath && state.ssCommandConfig.appendOutput !== false && state.ssCommandConfig.loop && interval <= 0.05);
    document.querySelector("[data-ss-command-warning]")?.classList.toggle("hidden", !risky);
    const intervalNode = document.querySelector("[data-ss-warning-interval]");
    if (intervalNode) intervalNode.textContent = state.ssCommandConfig.intervalSeconds || "1";
  }
  return { command: state.command, validation };
}

let _bdpPrecomputeTimer = 0;
function scheduleBdpPrecompute() {
  clearTimeout(_bdpPrecomputeTimer);
  _bdpPrecomputeTimer = setTimeout(() => { try { renderBdpWindowPanel(); } catch {} }, 100);
}

function resetDerivedCaches({ raw = false } = {}) {
  state.dataVersion += 1;
  state._bdpCache = null;
  state.cache.filteredKey = "";
  state.cache.filteredRows = null;
  state.cache.optionKey = "";
  state.cache.optionSets = null;
  state.cache.anomalyMapKey = "";
  state.cache.anomaliesBySocketId = null;
  state.cache.socketMapKey = "";
  state.cache.socketsById = null;
  clearVisibleHistoryCache();
  state.cache.microburstKey = "";
  state.cache.microburstSummary = null;
  state.cache.tailLatencyKey = "";
  state.cache.tailLatencySummary = null;
  if (raw) {
    state.rawVersion += 1;
    state.cache.timestampRawVersion = -1;
    state.cache.timestampBlocks = [];
    state.cache.snapshotRawVersion = -1;
    state.cache.timestampSnapshots = [];
  }
}

function markAnalysisDirty({ raw = false } = {}) {
  state.analysisDirty = true;
  scheduleBdpPrecompute();
  resetDerivedCaches({ raw });
}

function recompute() {
  state.sockets = applyRisks(parseAnalysisSockets());
  state.bandwidthIndex = buildSocketBandwidthIndex();
  state.sparklineIndex = null;
  state.anomalies = analyzeAll(state.sockets);
  state.fragmentation = detectFragmentation(state.sockets);
  state.reordering = detectReordering(state.sockets);
  state.healthScore = computeHealthScore(state.sockets, { fragmentation: state.fragmentation, reordering: state.reordering });
  const socketIds = new Set(state.sockets.map(socket => socket.id));
  state.selectedId = socketIds.has(state.selectedId) ? state.selectedId : state.sockets[0]?.id || null;
  if (!socketIds.has(state.activeContextId)) setActiveInvestigation(state, null);
  setZoom(0, 1);
  buildHistory();
  addCollectionAnomalies();
  runAdvisorAnalysis();
  evaluateAlertRules();
  state.analysisDirty = false;
  resetDerivedCaches();
  pushAnomalyAlerts();
}

function parseAnalysisSockets() {
  return aggregateTimestampedSockets(state.raw);
}

function recomputeFromSockets() {
  state.sockets = withStableSocketIds(state.sockets);
  state.bandwidthIndex = buildSocketBandwidthIndex();
  state.sparklineIndex = null;
  state.anomalies = analyzeAll(state.sockets);
  state.fragmentation = detectFragmentation(state.sockets);
  state.reordering = detectReordering(state.sockets);
  state.healthScore = computeHealthScore(state.sockets, { fragmentation: state.fragmentation, reordering: state.reordering });
  state.selectedId = state.sockets.some(socket => socket.id === state.selectedId) ? state.selectedId : state.sockets[0]?.id || null;
  if (!state.sockets.some(socket => socket.id === state.activeContextId)) setActiveInvestigation(state, null);
  setZoom(0, 1);
  buildHistory();
  addCollectionAnomalies();
  runAdvisorAnalysis();
  evaluateAlertRules();
  state.analysisDirty = false;
  resetDerivedCaches();
  pushAnomalyAlerts();
}

function pushAnomalyAlerts() {
  if (!state.prefs.autoToast) return;
  const critical = state.anomalies.filter(a => a.severity === "critical" || a.severity === "high");
  if (!critical.length) return;
  const top = critical.slice(0, 3);
  setTimeout(() => {
    top.forEach((a, i) => {
      setTimeout(() => toast(`⚠ ${a.title}`, a.detail || a.metric || "", "danger"), i * 800);
    });
  }, 300);
}

function scheduleIpIntelEnrichment() {
  if (state.ipIntelRunning || !state.sockets.length) return;
  const pending = publicPeerIps(state.sockets)
    .filter(ip => !state.ipIntel[ip])
    .slice(0, 12);
  if (!pending.length) return;
  state.ipIntelRunning = true;
  pending.forEach(ip => { state.ipIntel[ip] = { status: "loading" }; });
  enrichIpIntelQueue(pending).finally(() => {
    state.ipIntelRunning = false;
    render();
  });
}

async function enrichIpIntelQueue(ips) {
  for (const ip of ips) {
    try {
      const response = await fetch(`/api/ip-intel?ip=${encodeURIComponent(ip)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.ipIntel[ip] = { status: "done", data: await response.json() };
    } catch (error) {
      state.ipIntel[ip] = { status: "error", error: error.message };
    }
  }
}

function buildHistory() {
  const realHistory = buildHistoryFromTimestampedSnapshots();
  if (realHistory.length >= 1) {
    state.history = realHistory;
    return;
  }
  const metrics = chartMetricList();
  const base = socketsById().get(state.selectedId) || state.sockets[0];
  const syntheticStart = Date.now();
  state.history = Array.from({ length: state.prefs.graphWindow }, (_, i) => {
    const wobble = Math.sin(i / 2.7) * 0.16 + Math.cos(i / 4.3) * 0.09;
    const row = { t: i * state.prefs.sampling, epochMs: syntheticStart + i * state.prefs.sampling * 1000 };
    for (const metric of metrics) row[metric] = Math.max(0, metricValue(base, metric) * (1 + wobble + (i % 7 === 0 ? 0.18 : 0)));
    row.tx_bps = metricValue(base, "delivery_rate") || metricValue(base, "pacing_rate") || 0;
    row.rx_bps = 0;
    return row;
  });
}

function chartMetricList() {
  return ["tx_bps", "rx_bps", "delivery_rate", "pacing_rate", "rtt", "rttvar", "rto", "rcv_rtt", "rcv_space", "rcv_ssthresh", "sendQ", "recvQ", "cwnd", "ato", "skmem.r", "skmem.rb", "skmem.t", "skmem.d", "skmem.d_rate", "bytes_sent", "bytes_acked", "bytes_received", "segs_out", "segs_in", "backoff", "retrans"];
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


function buildHistoryFromTimestampedSnapshots() {
  const snapshots = parsedTimestampSnapshots();
  if (!snapshots.length) return [];
  const selected = socketsById().get(state.selectedId) || state.sockets[0];
  if (!selected) return [];
  return addBandwidthDerivatives(buildSocketHistoryFromSnapshots(snapshots, selected));
}

function timestampBlocks() {
  if (state.cache.timestampRawVersion === state.rawVersion) return state.cache.timestampBlocks;
  const blocks = splitTimestampBlocks(state.raw);
  state.cache.timestampRawVersion = state.rawVersion;
  state.cache.timestampBlocks = blocks;
  return blocks;
}

function parsedTimestampSnapshots() {
  if (state.cache.snapshotRawVersion === state.rawVersion) {
    if (state.cache.compressedSnapshots) {
      return [...iterateCompressed(state.cache.compressedSnapshots)];
    }
    return state.cache.timestampSnapshots;
  }
  const snapshots = parseTimestampedSnapshots(state.raw);
  state.cache.snapshotRawVersion = state.rawVersion;
  if (snapshots.length > 20) {
    state.cache.compressedSnapshots = compressSnapshots(snapshots);
    state.cache.timestampSnapshots = null;
  } else {
    state.cache.compressedSnapshots = null;
    state.cache.timestampSnapshots = snapshots;
  }
  return snapshots;
}

function buildSocketBandwidthIndex() {
  const samples = {};
  for (const block of parsedTimestampSnapshots()) {
    for (const socket of block.sockets) {
      const key = socketIdentityKey(socket);
      const current = {
        epochMs: block.epochMs,
        bytes_acked: metricValue(socket, "bytes_acked"),
        bytes_received: metricValue(socket, "bytes_received"),
        delivery_rate: metricValue(socket, "delivery_rate"),
        pacing_rate: metricValue(socket, "pacing_rate")
      };
      samples[key] = samples[key] ? [samples[key][1], current] : [null, current];
    }
  }
  return Object.fromEntries(Object.entries(samples).map(([key, [prev, current]]) => {
    const elapsed = prev ? Math.max(0.001, (current.epochMs - prev.epochMs) / 1000) : 0;
    const txBytes = prev ? Math.max(0, current.bytes_acked - prev.bytes_acked) : 0;
    const rxBytes = prev ? Math.max(0, current.bytes_received - prev.bytes_received) : 0;
    return [key, {
      tx_bps: elapsed ? (txBytes * 8) / elapsed : (current.delivery_rate || current.pacing_rate || 0),
      rx_bps: elapsed ? (rxBytes * 8) / elapsed : 0,
      delivery_rate: current.delivery_rate,
      pacing_rate: current.pacing_rate
    }];
  }));
}

function socketBandwidth(socket, metric) {
  if (!socket) return 0;
  const indexed = state.bandwidthIndex?.[socketIdentityKey(socket)];
  if (indexed?.[metric] != null) return indexed[metric];
  if (metric === "tx_bps") return metricValue(socket, "delivery_rate") || metricValue(socket, "pacing_rate") || 0;
  return 0;
}

function addBandwidthDerivatives(rows) {
  return rows.map((row, index) => {
    const prev = rows[index - 1];
    const elapsed = prev ? Math.max(0.001, (row.epochMs - prev.epochMs) / 1000) : 0;
    const txBytes = prev ? Math.max(0, (row.bytes_acked || 0) - (prev.bytes_acked || 0)) : 0;
    const rxBytes = prev ? Math.max(0, (row.bytes_received || 0) - (prev.bytes_received || 0)) : 0;
    const sameObservedSocket = prev && row.socketPresent !== false && prev.socketPresent !== false;
    const dropDelta = sameObservedSocket ? Math.max(0, (row["skmem.d"] || 0) - (prev["skmem.d"] || 0)) : 0;
    return {
      ...row,
      tx_bps: elapsed ? (txBytes * 8) / elapsed : 0,
      rx_bps: elapsed ? (rxBytes * 8) / elapsed : 0,
      "skmem.d_rate": elapsed ? dropDelta / elapsed : 0
    };
  });
}

function hasTimestampedRawData() {
  return timestampBlocks().length >= 2;
}

function dropRateSummary(rows = state.history) {
  if (!hasTimestampedRawData() || rows.length < 2) return null;
  let totalDropDelta = 0;
  let peakDropRate = 0;
  let intervals = 0;
  let firstGrowth = null;
  let lastGrowth = null;
  for (let i = 1; i < rows.length; i += 1) {
    const prev = rows[i - 1];
    const row = rows[i];
    if (row.socketPresent === false || prev.socketPresent === false) continue;
    const elapsed = Math.max(0.001, ((row.epochMs || 0) - (prev.epochMs || 0)) / 1000);
    if (!Number.isFinite(elapsed) || elapsed <= 0) continue;
    const dropDelta = Math.max(0, Number(row["skmem.d"] || 0) - Number(prev["skmem.d"] || 0));
    if (!dropDelta) continue;
    const rate = dropDelta / elapsed;
    totalDropDelta += dropDelta;
    peakDropRate = Math.max(peakDropRate, rate);
    intervals += 1;
    firstGrowth ??= prev.epochMs;
    lastGrowth = row.epochMs;
  }
  if (!totalDropDelta) return null;
  const observedSeconds = Math.max(0.001, ((rows[rows.length - 1].epochMs || 0) - (rows[0].epochMs || 0)) / 1000);
  const avgDropRate = totalDropDelta / observedSeconds;
  return {
    totalDropDelta,
    observedSeconds,
    avgDropRate,
    peakDropRate,
    cadenceSeconds: avgDropRate ? 1 / avgDropRate : Number.POSITIVE_INFINITY,
    intervals,
    firstGrowth,
    lastGrowth
  };
}

function dropRateSeverity(summary) {
  if (!summary) return "low";
  if (summary.avgDropRate >= 1 || summary.peakDropRate >= 5 || summary.totalDropDelta >= 100) return "critical";
  if (summary.avgDropRate >= 0.1 || summary.peakDropRate >= 1 || summary.totalDropDelta >= 10) return "high";
  return "medium";
}

function microburstSummary(rows = state.history) {
  const historyRows = rows || [];
  const key = `${state.selectedId || "none"}|${historyRows.length}|${historyRows[0]?.epochMs || 0}|${historyRows[historyRows.length - 1]?.epochMs || 0}|${state.dataVersion}`;
  if (rows === state.history && state.cache.microburstKey === key) return state.cache.microburstSummary;
  const summary = detectMicroburstWindow(historyRows, {
    recvQ: thresholdFor("recvQ"),
    skmemR: thresholdFor("skmem.r"),
    dropRate: thresholdFor("skmem.d_rate")
  });
  if (rows === state.history) {
    state.cache.microburstKey = key;
    state.cache.microburstSummary = summary;
  }
  return summary;
}

function tailLatencyLens(rows = state.history) {
  const historyRows = rows || [];
  const key = `${state.selectedId || "none"}|${historyRows.length}|${historyRows[0]?.epochMs || 0}|${historyRows[historyRows.length - 1]?.epochMs || 0}|${state.dataVersion}`;
  if (rows === state.history && state.cache.tailLatencyKey === key) return state.cache.tailLatencySummary;
  const summary = detectTailLatencyLens(historyRows, {
    rtt: thresholdFor("rtt"),
    rttvar: thresholdFor("rttvar"),
    rto: thresholdFor("rto"),
    sendQ: thresholdFor("sendQ"),
    recvQ: thresholdFor("recvQ"),
    dropRate: thresholdFor("skmem.d_rate")
  });
  if (rows === state.history) {
    state.cache.tailLatencyKey = key;
    state.cache.tailLatencySummary = summary;
  }
  return summary;
}

function formatDurationCompact(seconds) {
  const value = Number(seconds || 0);
  if (!Number.isFinite(value)) return "unknown duration";
  if (value < 1) return `${formatNumber(value * 1000)} ms`;
  if (value < 60) return `${formatNumber(value)} s`;
  if (value < 3600) return `${formatNumber(value / 60)} min`;
  return `${formatNumber(value / 3600)} h`;
}

function formatDropCadence(summary) {
  if (!summary?.avgDropRate) return "no increasing drop cadence";
  return `1 drop every ${formatDurationCompact(summary.cadenceSeconds)}`;
}

function formatMicroburstWindow(summary) {
  if (!summary) return "no microburst window";
  return `${timeLabel(0, summary.startEpochMs)} -> ${timeLabel(0, summary.endEpochMs)} over ${formatDurationCompact(summary.durationSeconds)}`;
}

function formatTailLatencyWindow(summary) {
  if (!summary) return "no tail window";
  return `${timeLabel(0, summary.startEpochMs)} -> ${timeLabel(0, summary.endEpochMs)} over ${formatDurationCompact(summary.durationSeconds)}`;
}

function chartMicroburstBand(summary, data, pad, w, h, firstTime, lastTime) {
  if (!summary || !data.length) return "";
  const startTime = Math.max(firstTime, summary.startEpochMs || firstTime);
  const endTime = Math.min(lastTime, summary.endEpochMs || lastTime);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime || endTime < firstTime || startTime > lastTime) return "";
  const timeSpan = Math.max(1, lastTime - firstTime);
  const xFromTime = time => data.length > 1 && timeSpan > 1
    ? pad.l + ((time - firstTime) / timeSpan) * (w - pad.l - pad.r)
    : pad.l;
  const left = Math.max(pad.l, Math.min(w - pad.r, xFromTime(startTime)));
  const right = Math.max(left + 2, Math.min(w - pad.r, xFromTime(endTime)));
  const labelX = Math.min(Math.max(left + 8, pad.l + 8), Math.max(pad.l + 8, right - 112));
  return `
    <rect x="${left}" y="${pad.t}" width="${Math.max(2, right - left)}" height="${h - pad.t - pad.b}" fill="#ffd84d" opacity=".12"/>
    <line x1="${left}" x2="${left}" y1="${pad.t}" y2="${h - pad.b}" stroke="#ffd84d" stroke-width="1.5" stroke-dasharray="5 4" opacity=".9"/>
    <line x1="${right}" x2="${right}" y1="${pad.t}" y2="${h - pad.b}" stroke="#ffd84d" stroke-width="1.5" stroke-dasharray="5 4" opacity=".9"/>
    <rect x="${labelX}" y="${pad.t + 8}" width="108" height="22" rx="6" fill="#211804" stroke="#ffd84d"/>
    <text x="${labelX + 10}" y="${pad.t + 23}" fill="#ffe58c" font-size="11" font-weight="700">MICROBURST</text>
  `;
}


function annotationColor(kind = "custom") {
  return {
    custom: "#7bdff6",
    "burst-start": "#ffd84d",
    failover: "#ff9f43",
    "queue-reset": "#4cde8a",
    "rtt-peak": "#ff5c77"
  }[kind] || "#7bdff6";
}

function chartAnnotationOverlay(metric, data, pad, w, h, firstTime, lastTime) {
  const annotations = currentSourceAnnotations(metric, annotationSocketId(), data)
    .filter(item => item.resolvedEpochMs >= firstTime && item.resolvedEpochMs <= lastTime)
    .slice(0, 6);
  if (!annotations.length || !data.length) return "";
  const timeSpan = Math.max(1, lastTime - firstTime);
  const xFromTime = time => data.length > 1 && timeSpan > 1
    ? pad.l + ((time - firstTime) / timeSpan) * (w - pad.l - pad.r)
    : pad.l;
  return annotations.map((item, index) => {
    const x = Math.max(pad.l, Math.min(w - pad.r, xFromTime(item.resolvedEpochMs)));
    const color = annotationColor(item.kind);
    const label = item.label || annotationDefaultLabel(item.kind);
    const width = Math.min(176, Math.max(72, label.length * 7 + 20));
    const boxX = Math.min(Math.max(x + 8, pad.l + 8), Math.max(pad.l + 8, w - pad.r - width - 6));
    const boxY = pad.t + 10 + (index % 3) * 26;
    const timeStr = item.resolvedEpochMs ? new Date(item.resolvedEpochMs).toISOString().slice(11, 23) : "";
    const isLight = chartBgColor() === "#f0f3f7";
    const lineColor = isLight ? "#1a5fb4" : color;
    return `
      <g class="annotation-overlay-item" opacity="${isLight ? 1 : .8}" pointer-events="none">
        <line x1="${x}" x2="${x}" y1="${pad.t}" y2="${h - pad.b}" stroke="${lineColor}" stroke-width="1.8" stroke-dasharray="6 4"/>
        <circle cx="${x}" cy="${pad.t + 8}" r="4.5" fill="${lineColor}"/>
        <rect x="${boxX}" y="${boxY}" width="${width}" height="32" rx="6" fill="${isLight ? "#dce2ea" : "#081019"}" opacity=".7" stroke="${lineColor}"/>
        <text x="${boxX + 8}" y="${boxY + 13}" fill="${isLight ? "#1a2533" : color}" font-size="10" font-weight="800">${escapeHtml(label)}</text>
        <text x="${boxX + 8}" y="${boxY + 26}" fill="${isLight ? "#3d4f60" : color}" font-size="9" opacity="0.7">${escapeHtml(timeStr)}</text>
      </g>
    `;
  }).join("");
}
function addCollectionAnomalies() {
  const hasTimestamp = hasTimestampedRawData();
  const huge = state.sockets.length >= 5000;
  const dropRate = dropRateSummary();
  const microburst = microburstSummary();
  if (!hasTimestamp && state.raw.trim()) {
    state.anomalies.push({
      socketId: state.selectedId,
      severity: "low",
      title: "Collection has no timestamp",
      detail: "Add date --iso-8601=ns or EPOCH_MS before each snapshot to build a real timeline.",
      metric: "collection"
    });
  }
  if (dropRate) {
    state.anomalies.unshift({
      socketId: state.selectedId,
      severity: dropRateSeverity(dropRate),
      title: "Socket drops are increasing",
      detail: `skmem.d increased by ${formatMetricValue("skmem.d", dropRate.totalDropDelta)} over ${formatDurationCompact(dropRate.observedSeconds)} (${formatDropCadence(dropRate)}, peak ${formatMetricValue("skmem.d_rate", dropRate.peakDropRate)}).`,
      metric: "skmem.d_rate"
    });
  }
  if (microburst) {
    state.anomalies.unshift({
      socketId: state.selectedId,
      severity: microburst.severity,
      title: "Receive-side microburst detected",
      detail: `${formatMicroburstWindow(microburst)}: RX peaked at ${formatMetricValue("rx_bps", microburst.peakRxBps)}, Recv-Q at ${formatMetricValue("recvQ", microburst.peakRecvQ)}, skmem.r at ${formatMetricValue("skmem.r", microburst.peakSkmemR)}, with ${formatMetricValue("skmem.d", microburst.dropDeltaTotal)} new drops (peak ${formatMetricValue("skmem.d_rate", microburst.peakDropRate)}).`,
      metric: "rx_bps"
    });
  }
  if (huge) {
    state.anomalies.unshift({
      socketId: state.selectedId,
      severity: "medium",
      title: "Very high socket volume",
      detail: `${state.sockets.length} sockets parsed: avoid overly aggressive collection frequency, especially with -p, -e, -m, -i, --bpf, or DNS resolution.`,
      metric: "overhead"
    });
  }
}

function runAdvisorAnalysis() {
  state.advisorFindings = buildAdvisorFindings();
}

function socketsWhere(predicate) {
  return state.sockets.filter(socket => {
    try {
      return predicate(socket);
    } catch {
      return false;
    }
  });
}

function endpointSamples(sockets, side = "peer", limit = 4) {
  const values = sockets.map(socket => side === "peer" ? socket.peer : socket.local).filter(Boolean);
  return [...new Set(values)].slice(0, limit);
}

function processSamples(sockets, limit = 4) {
  return [...new Set(sockets.map(socket => socket.details.process ? `${socket.details.process.name}:${socket.details.process.pid}` : "").filter(Boolean))].slice(0, limit);
}

function emptyPreImportFilters() {
  return { enabled: false, protocol: "", state: "", srcIp: "", dstIp: "", anyPort: "", srcPort: "", dstPort: "" };
}

function normalizePreImportFilters(filters = state.preImportFilters) {
  return { ...emptyPreImportFilters(), ...filters };
}

function hasPreImportFilterValue(filters) {
  const f = normalizePreImportFilters(filters);
  return [f.protocol, f.state, f.srcIp, f.dstIp, f.anyPort, f.srcPort, f.dstPort].some(Boolean);
}

function isLxcProfile() {
  return state.prefs.linuxProfile !== "native";
}

function linuxProfileLabel() {
  return LINUX_PROFILES[state.prefs.linuxProfile]?.label || LINUX_PROFILES.lxc.label;
}

function ubuntuProfileLabel() {
  return UBUNTU_PROFILES[state.prefs.ubuntuVersion] || UBUNTU_PROFILES["22.04"];
}

function isAnalystRole() {
  return state.prefs.accessRole !== "opsRoot";
}

function accessRoleLabel() {
  return ACCESS_ROLES[state.prefs.accessRole]?.label || ACCESS_ROLES.analyst.label;
}

function lxcCommand(command) {
  return `lxc exec <container> -- ${command}`;
}

function envCommand(command, { host = false } = {}) {
  if (isAnalystRole()) {
    return host ? `# Request from ops/root on the LXD host:\n${command}` : command;
  }
  if (!isLxcProfile()) return command;
  return host ? `# Run on the LXD host\n${command}` : lxcCommand(command);
}

function commandForPeer(socket) {
  const host = socket?.peerAddress?.host;
  const command = host && !["*", "0.0.0.0", "::"].includes(host) ? `ip route get ${host}` : "ip route get <peer-ip>";
  return envCommand(command, { host: isLxcProfile() && !isAnalystRole() });
}

function makeFinding({ id, severity, title, pattern, sockets, confidence, why, next, mitigate, commands }) {
  const rank = { critical: 4, high: 3, medium: 2, low: 1 };
  const topSocket = sockets[0] || state.sockets[0];
  return {
    id,
    severity,
    score: (rank[severity] || 1) * 100 + Math.min(99, sockets.length),
    title,
    pattern,
    count: sockets.length,
    confidence,
    why,
    next,
    mitigate,
    commands,
    socketId: topSocket?.id || null,
    local: endpointSamples(sockets, "local"),
    peer: endpointSamples(sockets, "peer"),
    processes: processSamples(sockets)
  };
}

function buildCorrelationMatrix() {
  const history = state.history;
  if (!history || history.length < 20) return null;
  const metrics = ["rtt", "sendQ", "recvQ", "cwnd", "rto", "retrans", "skmem.r", "skmem.d"];
  const data = metrics.map(m => history.map(h => h[m] || 0));
  function pearson(a, b) {
    const n = a.length; if (n < 5) return 0;
    const ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
    const denom = Math.sqrt(da) * Math.sqrt(db);
    return denom ? num / denom : 0;
  }
  const cells = metrics.map((_, i) => metrics.map((_, j) => i === j ? 1 : pearson(data[i], data[j])));
  function color(v) { const abs = Math.abs(v); if (abs < 0.3) return "transparent"; return v > 0 ? `rgba(255,92,119,${abs})` : `rgba(59,130,246,${abs})`; }
  return `<table style="border-collapse:collapse;font-size:11px"><thead><tr><th></th>${metrics.map(m => `<th style="padding:3px 6px;color:var(--muted);font-weight:400">${m}</th>`).join("")}</tr></thead><tbody>${cells.map((row, i) => `<tr><td style="padding:3px 6px;font-weight:600;color:var(--text)">${metrics[i]}</td>${row.map(v => `<td style="padding:3px 6px;text-align:center;background:${color(v)};border-radius:3px">${v === 1 ? "" : v.toFixed(2)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function detectTrends() {
  const history = state.history;
  if (!history || history.length < 10) return [];
  const trends = [];
  const metrics = [
    { key: "recvQ", label: "Recv-Q", limit: s => (s?.details?.skmem?.rb || 4194304), unit: "bytes" },
    { key: "sendQ", label: "Send-Q", limit: () => 1048576, unit: "bytes" },
    { key: "skmem.r", label: "skmem.r", limit: s => (s?.details?.skmem?.rb || 4194304), unit: "bytes" },
    { key: "rto", label: "RTO", limit: () => 120000, unit: "ms" }
  ];
  const recent = history.slice(-20);
  const older = history.slice(-40, -20);
  if (!older.length) return [];
  const socket = socketsById().get(state.selectedId) || state.sockets[0];
  for (const m of metrics) {
    const recentAvg = recent.reduce((s, d) => s + (d[m.key] || 0), 0) / recent.length;
    const olderAvg = older.reduce((s, d) => s + (d[m.key] || 0), 0) / older.length;
    if (olderAvg <= 0 || recentAvg <= olderAvg) continue;
    const growthRate = (recentAvg - olderAvg) / olderAvg;
    if (growthRate < 0.1) continue;
    const limit = m.limit(socket);
    const timePerSample = history.length > 1 ? (history[history.length-1].epochMs - history[0].epochMs) / history.length : 1000;
    const samplesPerMin = 60000 / timePerSample;
    const ratePerMin = (recentAvg - olderAvg) / (20 / samplesPerMin);
    const remaining = limit - recentAvg;
    const minutesToOverflow = remaining > 0 && ratePerMin > 0 ? Math.round(remaining / ratePerMin) : null;
    if (minutesToOverflow !== null && minutesToOverflow < 30) {
      trends.push({ metric: m.label, rate: `${(growthRate * 100).toFixed(0)}%`, perMin: ratePerMin, eta: minutesToOverflow, unit: m.unit, current: Math.round(recentAvg), limit });
    }
  }
  return trends;
}

function baselineDeviations() {
  if (!state.baseline?.history?.length || !state.history?.length) return [];
  const deviations = [];
  const metrics = ["rtt", "sendQ", "recvQ", "retrans", "rto"];
  for (const m of metrics) {
    const baseVals = state.baseline.history.map(d => d[m] || 0).filter(v => v > 0);
    const currVals = state.history.map(d => d[m] || 0).filter(v => v > 0);
    if (!baseVals.length || !currVals.length) continue;
    const baseP95 = baseVals.sort((a, b) => a - b)[Math.floor(baseVals.length * 0.95)] || 0;
    const currP95 = currVals.sort((a, b) => a - b)[Math.floor(currVals.length * 0.95)] || 0;
    if (baseP95 > 0 && currP95 > baseP95 * 2) deviations.push({ metric: m, baseP95, currP95, ratio: (currP95 / baseP95).toFixed(1) });
  }
  return deviations;
}

function advisorFindingDependencies() {
  return {
    state,
    socketsById,
    socketsWhere,
    thresholdFor,
    metricValue,
    dropRateSummary,
    microburstSummary,
    parseTimestampLine,
    isLxcProfile,
    isAnalystRole,
    makeFinding,
    envCommand,
    commandForPeer,
    processSamples,
    dropRateSeverity,
    formatMetricValue,
    formatDurationCompact,
    formatDropCadence,
    formatMicroburstWindow
  };
}

function buildAdvisorFindings() {
  return buildAdvisorFindingsModel(advisorFindingDependencies());
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

function getColumn(key) {
  return TABLE_COLUMN_BY_KEY.get(key) || TABLE_COLUMNS[0];
}

function visibleColumns() {
  return buildVisibleColumnOrder(state.table, TABLE_COLUMNS, tableDefaults()).map(getColumn);
}

function tableLayoutSnapshot(name) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    order: [...state.table.order],
    visible: [...state.table.visible],
    pinned: [...state.table.pinned],
    sortKey: state.table.sortKey,
    sortDir: state.table.sortDir,
    pageSize: state.table.pageSize
  };
}

function applyTableLayout(profile) {
  if (!profile) return;
  const allKeys = DEFAULT_TABLE_ORDER;
  const allKeySet = new Set(allKeys);
  state.table.order = [...new Set([...(profile.order || []), ...allKeys])].filter(key => allKeySet.has(key));
  state.table.visible = (profile.visible || allKeys).filter(key => allKeySet.has(key));
  if (!state.table.visible.length) state.table.visible = ["risk"];
  state.table.pinned = (profile.pinned || []).filter(key => state.table.visible.includes(key));
  state.table.sortKey = profile.sortKey || state.table.sortKey;
  state.table.sortDir = profile.sortDir || state.table.sortDir;
  state.table.pageSize = Number(profile.pageSize || state.table.pageSize);
  state.table.page = 1;
  saveTableState();
}

function dashboardSnapshot(name) {
  state.prefs.chartLayout.columns = clampChartColumns(state.prefs.chartLayout.columns);
  return createDashboardSnapshot(state, name);
}

function applyDefaultDashboardPreset() {
  const presetId = dashboardPresetIdOrDefault(state.prefs.defaultDashboardPreset);
  state.activeDashboardPreset = presetId;
  applyDashboardPresetProfile(state, presetId, chartMetricList);
}
function applyDashboardProfile(profile) {
  applySavedDashboardProfile(state, profile, chartMetricList);
  state.prefs.chartLayout.columns = clampChartColumns(state.prefs.chartLayout.columns);
  savePrefs();
}

function applyDashboardPreset(presetId) {
  if (!DASHBOARD_PRESETS[presetId]) return;
  applyDashboardPresetProfile(state, presetId, chartMetricList);
  state.activeDashboardPreset = presetId;
  state.prefs.chartLayout.columns = clampChartColumns(state.prefs.chartLayout.columns);
  savePrefs();
}

function applyAnalysisTemplate(templateId) {
  const allColumns = DEFAULT_TABLE_ORDER;
  applyTemplateProfile(state, templateId, allColumns, chartMetricList);
  savePrefs();
}

function moveTableColumn(sourceKey, targetKey) {
  if (!sourceKey || !targetKey || sourceKey === targetKey) return false;
  const order = [...state.table.order];
  const from = order.indexOf(sourceKey);
  const to = order.indexOf(targetKey);
  if (from < 0 || to < 0) return false;
  order.splice(from, 1);
  order.splice(to, 0, sourceKey);
  state.table.order = order;
  return true;
}

function createSocketFilterMatcher(filters = state.table.filters) {
  const f = filters || {};
  const text = String(f.text || "").trim();
  const process = String(f.process || "").trim().toLowerCase();
  const srcIp = String(f.srcIp || "").trim().toLowerCase();
  const dstIp = String(f.dstIp || "").trim().toLowerCase();
  const srcPort = String(f.srcPort || "").trim().toLowerCase();
  const dstPort = String(f.dstPort || "").trim().toLowerCase();
  const risk = f.risk || "all";
  const socketState = f.state || "all";
  const family = f.family || "all";
  const minRecvQ = f.minRecvQ == null || f.minRecvQ === "" ? null : Number(f.minRecvQ);
  const minSendQ = f.minSendQ == null || f.minSendQ === "" ? null : Number(f.minSendQ);
  const minRtt = f.minRtt == null || f.minRtt === "" ? null : Number(f.minRtt);
  const anomalySocketIds = f.onlyAnomalies ? anomaliesBySocketId() : null;

  return socket => {
    if (text && !socketMatchesAdvancedQuery(socket, text, { metricValue, socketBandwidth })) return false;
    if (process && !String(socket.details.process?.name || "").toLowerCase().includes(process)) return false;
    if (risk !== "all" && socket.risk !== risk) return false;
    if (socketState !== "all" && socket.state !== socketState) return false;
    if (family !== "all" && socket.family !== family) return false;
    if (Number.isFinite(minRecvQ) && socket.recvQ < minRecvQ) return false;
    if (Number.isFinite(minSendQ) && socket.sendQ < minSendQ) return false;
    if (Number.isFinite(minRtt) && metricValue(socket, "rtt") < minRtt) return false;
    if (srcIp && !socket.localAddress.host.toLowerCase().includes(srcIp)) return false;
    if (dstIp && !socket.peerAddress.host.toLowerCase().includes(dstIp)) return false;
    if (srcPort && String(socket.localAddress.port || "").toLowerCase() !== srcPort) return false;
    if (dstPort && String(socket.peerAddress.port || "").toLowerCase() !== dstPort) return false;
    if (anomalySocketIds && !anomalySocketIds.has(socket.id)) return false;
    return true;
  };
}

function sortedFilteredSockets() {
  const cacheKey = [
    state.dataVersion,
    tableFilterCacheKey(state.table.filters),
    state.table.sortKey,
    state.table.sortDir
  ].join("\u001e");
  if (state.cache.filteredKey === cacheKey && state.cache.filteredRows) return state.cache.filteredRows;
  const col = getColumn(state.table.sortKey);
  const factor = state.table.sortDir === "asc" ? 1 : -1;
  const matchesFilters = createSocketFilterMatcher(state.table.filters);
  const rows = state.sockets.filter(matchesFilters).sort((a, b) => {
    const av = col.value(a);
    const bv = col.value(b);
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
    return TABLE_SORT_COLLATOR.compare(String(av), String(bv)) * factor;
  });
  state.cache.filteredKey = cacheKey;
  state.cache.filteredRows = rows;
  rows.forEach(s => { const h = state.socketHistory?.get?.(s.id); s._rttHistory = h?.map(p => p.rtt ?? 0).slice(-20) || null; });
  return rows;
}

function renderDatalist(id, values) {
  return `<datalist id="${id}">${values.slice(0, 1000).map(value => `<option value="${escapeHtml(value)}"></option>`).join("")}</datalist>`;
}

function pagedRows(rows) {
  const totalPages = Math.max(1, Math.ceil(rows.length / state.table.pageSize));
  state.table.page = Math.min(Math.max(1, state.table.page), totalPages);
  const start = (state.table.page - 1) * state.table.pageSize;
  return { rows: rows.slice(start, start + state.table.pageSize), totalPages, start };
}

function groupedSockets() {
  const map = new Map();
  const anomalyMap = anomaliesBySocketId();
  for (const socket of sortedFilteredSockets()) {
    const key = socketKey(socket);
    if (!map.has(key)) {
      map.set(key, {
        key,
        socket,
        count: 0,
        maxRisk: "low",
        maxRecvQ: 0,
        maxSendQ: 0,
        maxRtt: 0,
        maxRto: 0,
        maxDrops: 0,
        anomalies: 0
      });
    }
    const group = map.get(key);
    group.count += 1;
    group.maxRisk = riskRank(socket.risk) > riskRank(group.maxRisk) ? socket.risk : group.maxRisk;
    group.maxRecvQ = Math.max(group.maxRecvQ, socket.recvQ);
    group.maxSendQ = Math.max(group.maxSendQ, socket.sendQ);
    group.maxRtt = Math.max(group.maxRtt, metricValue(socket, "rtt"));
    group.maxRto = Math.max(group.maxRto, metricValue(socket, "rto"));
    group.maxDrops = Math.max(group.maxDrops, metricValue(socket, "skmem.d"));
    group.anomalies += anomalyMap.get(socket.id)?.length || 0;
  }
  return [...map.values()].sort((a, b) => riskRank(b.maxRisk) - riskRank(a.maxRisk) || b.anomalies - a.anomalies || b.maxSendQ - a.maxSendQ);
}

function conversationKey(socket) {
  return `${socket.localAddress.host || socket.local}|${socket.localAddress.port || ""}|${socket.peerAddress.host || socket.peer}|${socket.peerAddress.port || ""}|${socket.family}`;
}

function anomaliesBySocketId() {
  const key = `${state.dataVersion}|${state.anomalies.length}`;
  if (state.cache.anomalyMapKey === key && state.cache.anomaliesBySocketId) return state.cache.anomaliesBySocketId;
  const map = new Map();
  for (const anomaly of state.anomalies) {
    if (!anomaly.socketId) continue;
    if (!map.has(anomaly.socketId)) map.set(anomaly.socketId, []);
    map.get(anomaly.socketId).push(anomaly);
  }
  state.cache.anomalyMapKey = key;
  state.cache.anomaliesBySocketId = map;
  return map;
}

function socketsById() {
  const key = `${state.dataVersion}|${state.sockets.length}`;
  if (state.cache.socketMapKey === key && state.cache.socketsById) return state.cache.socketsById;
  const map = new Map(state.sockets.map(socket => [socket.id, socket]));
  state.cache.socketMapKey = key;
  state.cache.socketsById = map;
  return map;
}

function buildConversations() {
  const map = new Map();
  const anomalyMap = anomaliesBySocketId();
  for (const socket of sortedFilteredSockets()) {
    const key = conversationKey(socket);
    if (!map.has(key)) {
      map.set(key, {
        key,
        socket,
        local: socket.local,
        peer: socket.peer,
        family: socket.family,
        states: new Set(),
        processes: new Set(),
        application: currentApplicationServiceSortKey(socket),
        count: 0,
        maxRisk: "low",
        anomalies: 0,
        recvQ: 0,
        sendQ: 0,
        txBps: 0,
        rxBps: 0,
        maxRtt: 0,
        maxRto: 0,
        drops: 0,
        anomalyItems: []
      });
    }
    const conv = map.get(key);
    const socketAnomalies = anomalyMap.get(socket.id) || [];
    conv.count += 1;
    conv.states.add(socket.state);
    if (socket.details.process?.name) conv.processes.add(socket.details.process.name);
    conv.maxRisk = riskRank(socket.risk) > riskRank(conv.maxRisk) ? socket.risk : conv.maxRisk;
    conv.anomalies += socketAnomalies.length;
    conv.anomalyItems.push(...socketAnomalies);
    conv.recvQ += socket.recvQ;
    conv.sendQ += socket.sendQ;
    conv.txBps += socketBandwidth(socket, "tx_bps");
    conv.rxBps += socketBandwidth(socket, "rx_bps");
    conv.maxRtt = Math.max(conv.maxRtt, metricValue(socket, "rtt"));
    conv.maxRto = Math.max(conv.maxRto, metricValue(socket, "rto"));
    conv.drops += metricValue(socket, "skmem.d");
  }
  return sortConversations([...map.values()]);
}

const CONVERSATION_TEXT_SORTS = new Set(["flow", "proto", "process"]);

function conversationDefaultSortDir(key) {
  return CONVERSATION_TEXT_SORTS.has(key) ? "asc" : "desc";
}

function conversationSortText(conv, key) {
  if (key === "flow") return `${conv.local} ${conv.peer}`;
  if (key === "proto") return `${conv.family} ${[...conv.states].join(" ")} ${conv.application || ""}`;
  if (key === "process") return [...conv.processes].join(", ") || "-";
  return "";
}

function conversationSortValue(conv, key) {
  if (CONVERSATION_TEXT_SORTS.has(key)) return conversationSortText(conv, key);
  if (key === "risk") return riskRank(conv.maxRisk);
  if (key === "sockets") return conv.count;
  if (key === "anomalies") return conv.anomalies;
  if (key === "tx") return conv.txBps;
  if (key === "rx") return conv.rxBps;
  if (key === "sendQ") return conv.sendQ;
  if (key === "recvQ") return conv.recvQ;
  if (key === "rtt") return conv.maxRtt;
  if (key === "rto") return conv.maxRto;
  if (key === "drops") return conv.drops;
  return 0;
}

function compareConversationFallback(a, b) {
  return riskRank(b.maxRisk) - riskRank(a.maxRisk) ||
    b.anomalies - a.anomalies ||
    b.drops - a.drops ||
    b.sendQ - a.sendQ ||
    b.txBps - a.txBps ||
    CONVERSATION_SORT_COLLATOR.compare(String(a.key), String(b.key));
}

function sortConversations(conversations) {
  const sort = state.conversationSort || { key: "anomalies", dir: "desc" };
  const key = CONVERSATION_SORT_LABELS[sort.key] ? sort.key : "anomalies";
  const factor = sort.dir === "asc" ? 1 : -1;
  return conversations.map((conv, index) => ({ conv, index })).sort((a, b) => {
    const av = conversationSortValue(a.conv, key);
    const bv = conversationSortValue(b.conv, key);
    let result = 0;
    if (typeof av === "number" && typeof bv === "number") {
      result = av - bv;
    } else {
      result = CONVERSATION_SORT_COLLATOR.compare(String(av), String(bv));
    }
    return result * factor || compareConversationFallback(a.conv, b.conv) || a.index - b.index;
  }).map(item => item.conv);
}

function renderConversationSortHeader(key, label) {
  const sort = state.conversationSort || { key: "anomalies", dir: "desc" };
  const active = sort.key === key;
  const direction = active ? (sort.dir === "asc" ? "ASC" : "DESC") : "";
  const title = `Sort conversations by ${label}${active ? ` (${direction})` : ""}`;
  return `<th><button class="th-sort conversation-sort ${active ? "active" : ""}" data-conversation-sort="${escapeHtml(key)}" title="${escapeHtml(title)}">${escapeHtml(label)}${direction ? ` <span>${direction}</span>` : ""}</button></th>`;
}

function conversationAnomalySummary(conv) {
  const items = conv.anomalyItems || [];
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  const byMetric = new Map();
  const byTitle = new Map();
  for (const item of items) {
    counts[item.severity] = (counts[item.severity] || 0) + 1;
    const metric = item.metric || "socket";
    byMetric.set(metric, (byMetric.get(metric) || 0) + 1);
    const key = `${item.severity}|${item.title}|${metric}`;
    if (!byTitle.has(key)) byTitle.set(key, { ...item, count: 0 });
    byTitle.get(key).count += 1;
  }
  const dominantSeverity = ["critical", "high", "medium", "low"].find(severity => counts[severity]) || "low";
  const topMetric = [...byMetric.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "rtt";
  const topItems = [...byTitle.values()].sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.count - a.count || a.title.localeCompare(b.title)).slice(0, 4);
  return { counts, dominantSeverity, topMetric, topItems, metrics: [...byMetric.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5) };
}

function buildExpertInformation() {
  const rank = { critical: 4, high: 3, medium: 2, low: 1 };
  const map = new Map();
  const socketLookup = socketsById();
  for (const anomaly of filteredAnomalies(state.anomalies)) {
    const socket = socketLookup.get(anomaly.socketId);
    const key = `${anomaly.severity}|${anomaly.metric || "socket"}|${anomaly.title}`;
    if (!map.has(key)) {
      map.set(key, {
        ...anomaly,
        count: 0,
        sockets: [],
        processes: new Set(),
        application: currentApplicationServiceSortKey(socket),
        peers: new Set()
      });
    }
    const item = map.get(key);
    item.count += 1;
    if (socket) {
      item.sockets.push(socket);
      if (socket.details.process?.name) item.processes.add(socket.details.process.name);
      if (socket.peer) item.peers.add(socket.peer);
    }
  }
  return [...map.values()].sort((a, b) =>
    rank[b.severity] - rank[a.severity] ||
    b.count - a.count ||
    a.title.localeCompare(b.title)
  );
}

function buildTimelineEvents() {
  const rank = { critical: 4, high: 3, medium: 2, low: 1 };
  const events = [];
  const rows = state.history || [];
  const selected = socketsById().get(state.selectedId) || state.sockets[0];
  const metrics = ["rto", "rtt", "sendQ", "recvQ", "skmem.d", "skmem.d_rate", "cwnd", "tx_bps", "rx_bps"];
  let previousTimerName = "";
  const prevMetricValue = {};
  for (const row of rows) {
    const timerName = String(row.timerName || "").toLowerCase();
    if (timerName === "persist" && previousTimerName !== "persist") {
      const sendQ = Number(row.sendQ || 0);
      const backoff = Number(row.backoff || 0);
      const expire = Number(row.timerExpireMs || 0);
      events.push({
        epochMs: row.epochMs,
        t: row.t,
        severity: backoff >= 2 || sendQ >= thresholdFor("sendQ").danger ? "critical" : "high",
        metric: "timer",
        title: "TCP persist timer active",
        detail: `timer:(persist${Number.isFinite(expire) && expire > 0 ? `, ${formatMetricValue("rto", expire)}` : ""}) is active: TCP is probing a constrained or closed receive window${sendQ > 0 ? ` while Send-Q is ${formatMetricValue("sendQ", sendQ)}` : ""}.`,
        socketId: selected?.id
      });
    }
    previousTimerName = timerName;
    for (const metric of metrics) {
      const value = Number(row[metric] || 0);
      const severity = thresholdSeverity(metric, value);
      if (severity === "danger" || severity === "warn") {
        if (prevMetricValue[metric] === value) continue;
        events.push({
          epochMs: row.epochMs,
          t: row.t,
          severity: severity === "danger" ? "high" : "medium",
          metric,
          title: `${metricLabel(metric)} threshold crossed`,
          detail: `${metricLabel(metric)} reached ${formatMetricValue(metric, value)}${selected ? ` on ${selected.local} -> ${selected.peer}` : ""}.`,
          socketId: selected?.id
        });
      }
      prevMetricValue[metric] = value;
    }
  }
  state.anomalies.slice(0, 80).forEach((anomaly, index) => {
    const row = rows[index % Math.max(1, rows.length)];
    events.push({
      epochMs: row?.epochMs || Date.now(),
      t: row?.t ?? index,
      severity: anomaly.severity,
      metric: anomaly.metric || "socket",
      title: anomaly.title,
      detail: anomaly.detail,
      socketId: anomaly.socketId
    });
  });
  return events
    .sort((a, b) => (a.epochMs || 0) - (b.epochMs || 0) || rank[b.severity] - rank[a.severity])
    .slice(0, 160);
}

function endpointPresentation(...args) { return serviceMapPresenter.endpointPresentation(...args); }
function currentAliasForEndpoint(...args) { return serviceMapPresenter.currentAliasForEndpoint(...args); }
function currentAliasDisplay(...args) { return serviceMapPresenter.currentAliasDisplay(...args); }
function nodeLabel(...args) { return serviceMapPresenter.nodeLabel(...args); }
function nodeSubtitle(...args) { return serviceMapPresenter.nodeSubtitle(...args); }
function serviceMapGroupBands(...args) { return serviceMapPresenter.serviceMapGroupBands(...args); }
function renderMapLegend(...args) { return serviceMapPresenter.renderMapLegend(...args); }
function renderHotPaths(...args) { return serviceMapPresenter.renderHotPaths(...args); }
function renderMapEdgeInsight(...args) { return serviceMapPresenter.renderMapEdgeInsight(...args); }
function mapNodeTitle(...args) { return serviceMapPresenter.mapNodeTitle(...args); }
function buildServiceMap(...args) { return serviceMapPresenter.buildServiceMap(...args); }
function serviceMapConnectivityOrder(...args) { return serviceMapPresenter.serviceMapConnectivityOrder(...args); }

function evaluateAlertRules() {
  state.alertEvents = evaluateAlertRuleEvents({
    rules: state.alertRules,
    sockets: state.sockets,
    alertAcks: state.alertAcks
  }, { metricValue, socketBandwidth, riskRank });
}

function createBaseline() {
  const baseline = createBaselineSnapshot(state, { metricValue, socketBandwidth, socketKey });
  baseline.history = state.history?.slice(0, 2000) || [];
  return baseline;
}

function buildComparison() {
  return buildBaselineComparison(state, { metricValue, socketBandwidth, socketKey, riskRank });
}

function updateAnomalyAlertState() {
  const count = state.anomalies.length;
  if (count <= 0) {
    state.anomalyAlertSince = null;
    state.lastAnomalyCount = 0;
    return;
  }
  if (count !== state.lastAnomalyCount || !state.anomalyAlertSince) {
    state.anomalyAlertSince = Date.now();
    state.lastAnomalyCount = count;
  }
  updateFavicon();
}

function updateFavicon() {
  const critical = state.anomalies.some(a => a.severity === "critical" || a.severity === "high");
  const hasAnomalies = state.anomalies.length > 0;
  const color = critical ? "%23ff5c77" : hasAnomalies ? "%23ff9f43" : "%234cde8a";
  const dot = critical || hasAnomalies ? `%3Ccircle cx='54' cy='10' r='9' fill='${color}'/%3E` : "";
  const link = document.querySelector("link[rel='icon']");
  if (link) link.href = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23070b11'/%3E%3Cpath d='M18 34h12m4 0h12M24 24l8 10 8-10' fill='none' stroke='%2339d6d6' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='18' cy='34' r='6' fill='%235db7ff'/%3E%3Ccircle cx='46' cy='34' r='6' fill='${color}'/%3E${dot}%3C/svg%3E`;
}

function anomalyStatusClass() {
  if (!state.anomalies.length) return "";
  return Date.now() - state.anomalyAlertSince < 10000 ? "blink" : "solid";
}

function scheduleAnomalyBadgeSettle() {
  if (!state.anomalies.length || !state.anomalyAlertSince) return;
  const remaining = 10050 - (Date.now() - state.anomalyAlertSince);
  if (remaining > 0) setTimeout(() => {
    const badge = document.querySelector(".anomaly-status.blink");
    if (badge) {
      badge.classList.remove("blink");
      badge.classList.add("solid");
    }
  }, remaining);
}

let cmInstance = null;
let chartPageDrawFrame = 0;
let correlationDrawFrame = 0;
let dashboardPresetRenderFrame = 0;
function initCodeMirror() {
  const container = document.querySelector("#cmContainer");
  if (!container || !window.CodeMirror) return;
  if (container.querySelector(".CodeMirror")) return;
  cmInstance = CodeMirror(container, {
    value: state.raw || "",
    mode: "ss",
    theme: "default",
    lineNumbers: true,
    lineWrapping: state.editorWordWrap,
    readOnly: false,
    placeholder: "Paste ss output or a timestamped collection here...",
    extraKeys: {
      "Ctrl-F": "findPersistent",
      "Cmd-F": "findPersistent",
      "Ctrl-G": "jumpToLine",
      "Cmd-G": "jumpToLine"
    }
  });
  cmInstance.on("change", () => { state.raw = cmInstance.getValue(); });
  cmInstance.on("paste", () => { setTimeout(() => { const val = cmInstance.getValue(); if (val.length > 20 && val.length < 500000) { document.querySelector("[data-action='parse']")?.click(); } }, 100); });
  cmInstance.setSize("100%", "clamp(360px, 58vh, 620px)");
}
function syncFromCodeMirror() {
  if (cmInstance) state.raw = cmInstance.getValue();
}

const _busyEl = document.getElementById("busyOverlay");
function _showBusy() { const el = document.getElementById("inlineBusy"); if (el) el.classList.add("visible"); }
function _hideBusy() { const el = document.getElementById("inlineBusy"); if (el) el.classList.remove("visible"); _busyEl?.classList.remove("visible"); }

function _staggerReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.setAttribute("data-reveal", "");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(".workspace .advisor-card, .workspace .timeline-story, .workspace .expert-strip article, .workspace .diagnosis-grid > *").forEach((el, i) => {
    el.style.animationDelay = `${i * 35}ms`;
    el.style.opacity = "0";
    observer.observe(el);
  });
}

function _positionTabIndicator() {
  const active = document.querySelector(".app-tab.active");
  const indicator = document.getElementById("tabIndicator");
  if (!active || !indicator) return;
  const tabs = active.closest(".app-tabs");
  const tabsRect = tabs.getBoundingClientRect();
  const rect = active.getBoundingClientRect();
  indicator.style.left = `${rect.left - tabsRect.left}px`;
  indicator.style.width = `${rect.width}px`;
}

function _animateCounters() {
  document.querySelectorAll("[data-countup]").forEach(el => {
    const target = parseInt(el.dataset.countup, 10);
    if (isNaN(target)) return;
    const prev = parseInt(el.dataset.prev || "0", 10);
    if (prev === target) return;
    el.dataset.prev = target;
    const duration = 500;
    const start = performance.now();
    const fmt = (n) => n.toLocaleString("fr");
    (function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(Math.round(prev + (target - prev) * ease));
      if (t < 1) requestAnimationFrame(step);
    })(start);
  });
}

function _renderSkeleton(type) {
  const skeletons = {
    analysis: `<div class="skeleton-grid" style="margin-bottom:16px">${Array(4).fill('<div class="skeleton skeleton-kpi"></div>').join("")}</div><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-line long"></div><div class="skeleton skeleton-line medium"></div><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-chart" style="margin-top:16px"></div>`,
    table: `<div class="skeleton skeleton-title"></div>${Array(8).fill('<div class="skeleton skeleton-table-row"></div>').join("")}`,
    charts: `<div class="skeleton-grid">${Array(2).fill('<div class="skeleton skeleton-chart"></div>').join("")}</div>`
  };
  return skeletons[type] || skeletons.analysis;
}

function _undoSnapshot() {
  const snap = { view: state.view, activeTab: state.activeTab, chartsTab: state.chartsTab, selectedId: state.selectedId, annotations: JSON.stringify(state.annotations), filter: state.filter };
  state._undoStack.push(snap);
  if (state._undoStack.length > 30) state._undoStack.shift();
  state._redoStack = [];
}
function _undo() {
  if (!state._undoStack.length) return;
  const current = { view: state.view, activeTab: state.activeTab, chartsTab: state.chartsTab, selectedId: state.selectedId, annotations: JSON.stringify(state.annotations), filter: state.filter };
  state._redoStack.push(current);
  const snap = state._undoStack.pop();
  state.view = snap.view; state.activeTab = snap.activeTab; state.chartsTab = snap.chartsTab; state.selectedId = snap.selectedId; state.filter = snap.filter;
  try { state.annotations = JSON.parse(snap.annotations); } catch(e) {}
  render();
}
function _redo() {
  if (!state._redoStack.length) return;
  const current = { view: state.view, activeTab: state.activeTab, chartsTab: state.chartsTab, selectedId: state.selectedId, annotations: JSON.stringify(state.annotations), filter: state.filter };
  state._undoStack.push(current);
  const snap = state._redoStack.pop();
  state.view = snap.view; state.activeTab = snap.activeTab; state.chartsTab = snap.chartsTab; state.selectedId = snap.selectedId; state.filter = snap.filter;
  try { state.annotations = JSON.parse(snap.annotations); } catch(e) {}
  render();
}

function _renderError(err) {
  console.error("Render error:", err);
  const app = document.querySelector("#app");
  if (app) app.innerHTML = `<div style="padding:40px;max-width:700px;margin:0 auto;font-family:monospace">
    <h2 style="color:#ff5c77">⚠ Render error</h2>
    <p style="color:#c4d0de">A module crashed during rendering. Your data is preserved in memory.</p>
    <pre style="background:#0b1018;padding:16px;border-radius:8px;overflow:auto;color:#ff9f43;font-size:12px">${escapeHtml(err?.stack || err?.message || String(err))}</pre>
    <button onclick="try{render()}catch(e){}" style="padding:8px 16px;background:#5db7ff;color:#fff;border:none;border-radius:6px;cursor:pointer;margin-top:12px">Retry render</button>
    <button onclick="location.reload()" style="padding:8px 16px;background:#52657a;color:#fff;border:none;border-radius:6px;cursor:pointer;margin-top:12px;margin-left:8px">Reload page</button>
  </div>`;
}

window.addEventListener("error", e => { console.error("Uncaught error:", e.error); });
window.addEventListener("unhandledrejection", e => { console.error("Unhandled rejection:", e.reason); });

let _cachedDataVersion = -1;
let _cachedStories = [];
let _cachedMultiSocket = [];
let _cachedRateAlerts = [];

function cachedStories() {
  if (_cachedDataVersion !== state.dataVersion) {
    _cachedDataVersion = state.dataVersion;
    _cachedStories = detectTimelineStories(state.raw, state.sockets);
    _cachedMultiSocket = detectMultiSocketCorrelation(state.raw);
    _cachedRateAlerts = detectRateOfChange(state.raw);
  }
  return _cachedStories;
}
function cachedMultiSocket() { cachedStories(); return _cachedMultiSocket; }
function cachedRateAlerts() { cachedStories(); return _cachedRateAlerts; }

function renderOnboarding() {
  const steps = [
    { icon: "ri-upload-cloud-line", title: "Import your data", desc: "Click <b>Open ss file</b> or <b>Auto-detect dir</b> to load ss, vmstat, nstat, GC logs, and FIX logs at once.", target: "[data-action='pickAutoDir'],[data-action='openSsFile']", view: "ingest", anchor: "bottom" },
    { icon: "ri-play-line", title: "Analyze", desc: "Paste ss output in the editor and click <b>Analyze</b> — or use a sample from <b>See it in action</b>.", target: "[data-action='parse']", view: "ingest", anchor: "bottom" },
    { icon: "ri-stethoscope-line", title: "Diagnosis & Advisor", desc: "The tool builds a Root Cause Matrix, causal stories, and multi-socket correlation. Explore tabs for deep analysis.", target: "[data-tab='diagnosis'],[data-tab='advisor']", view: "analysis", anchor: "bottom" },
    { icon: "ri-line-chart-line", title: "Monitoring charts", desc: "Real-time charts with zoom, crosshair sync, and annotations. Use sub-tabs for BDP, JVM, and FIX Latency.", target: "[data-view='charts']", view: "charts", anchor: "bottom" },
    { icon: "ri-node-tree", title: "Service Map", desc: "Topology view shows process → socket → peer connections. Use <b>Geo & Flow</b> tabs for traffic distribution.", target: "[data-tab='map']", view: "analysis", anchor: "bottom" },
    { icon: "ri-settings-3-line", title: "Settings & Export", desc: "Customize thresholds, export PDF/HTML reports, evidence packs, or Jira tickets from the gear menu.", target: ".gear-btn", view: "ingest", anchor: "left" }
  ];
  const step = steps[state.onboarding] || steps[0];
  const isLast = state.onboarding >= steps.length - 1;
  if (step.view) state.view = step.view;
  return `<div class="onboarding-overlay" data-tour-step="${state.onboarding}" data-tour-target="${step.target}" data-tour-anchor="${step.anchor}">
    <div class="onboarding-card">
      <div class="onboarding-progress">${steps.map((_, i) => `<span class="${i <= state.onboarding ? "active" : ""}"></span>`).join("")}</div>
      <div class="onboarding-icon"><i class="${step.icon}"></i></div>
      <h2>${step.title}</h2>
      <p>${step.desc}</p>
      <div class="onboarding-actions">
        <button data-action="skipOnboarding" class="onboarding-skip">Skip tour</button>
        <button data-action="${isLast ? "finishOnboarding" : "nextOnboarding"}" class="primary">${isLast ? "Start using" : "Next →"}</button>
      </div>
      <span class="onboarding-step-count">${state.onboarding + 1}/${steps.length}</span>
    </div>
  </div>`;
}

function _positionTourCard() {
  const overlay = document.querySelector(".onboarding-overlay");
  if (!overlay) return;
  const selector = overlay.dataset.tourTarget;
  const anchor = overlay.dataset.tourAnchor || "bottom";
  const card = overlay.querySelector(".onboarding-card");
  if (!card) return;
  const target = selector ? document.querySelector(selector) : null;
  if (!target) {
    card.style.position = "fixed";
    card.style.bottom = "24px";
    card.style.right = "24px";
    card.style.top = "auto";
    card.style.left = "auto";
    return;
  }
  const rect = target.getBoundingClientRect();
  target.style.position = target.style.position || "relative";
  target.style.zIndex = "100001";
  target.style.boxShadow = "0 0 0 4px rgba(57,214,214,0.6), 0 0 20px rgba(57,214,214,0.3)";
  target.style.borderRadius = "6px";
  card.style.position = "fixed";
  card.style.bottom = "auto";
  card.style.right = "auto";
  if (anchor === "bottom") {
    card.style.top = `${Math.min(rect.bottom + 12, window.innerHeight - 260)}px`;
    card.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 380))}px`;
  } else if (anchor === "left") {
    card.style.top = `${Math.max(12, rect.top - 40)}px`;
    card.style.left = `${Math.max(12, rect.left - 380)}px`;
  }
}

function render() {
  _showBusy();
  hideAppServiceTooltip();
  hideFloatingChartTooltipNow();
  if (state.analysisDirty) recompute();
  updateAnomalyAlertState();
  const doRender = () => { try { _renderSync(); } catch(e) { _renderError(e); } _hideBusy(); };
  setTimeout(doRender, 16);
}

function _renderSync() {
  const app = document.querySelector("#app");
  const newHtml = html`
    ${state.onboarding >= 0 ? renderOnboarding() : ""}
    <a href="#main-content" class="skip-link">Skip to content</a>
    <div class="app-shell view-${state.view}" role="application" aria-label="Ultimate Network Expert">
      <header class="topbar" role="banner">
        <div class="title">
          <div class="brand tcp-brand" title="TCP packets travelling between peers">
          <span class="brand-node n1"></span>
          <span class="brand-node n2"></span>
          <span class="brand-link l1"></span>
          <span class="brand-packet p1"></span>
          <span class="brand-packet p2"></span>
          </div>
          <div>
            <h1>
              Ultimate Network Expert
              <button class="version-pill" data-action="showSplash" title="Show product splash screen and version" aria-label="Show Ultimate Network Expert version">v${escapeHtml(APP_VERSION)}</button>
              <button class="app-title-info" type="button" data-action="showSplash" title="About Ultimate Network Expert" aria-label="Open application details">
                <i class="ri-information-line"></i>
              </button>
            </h1>
          </div>
        </div>
        <div class="top-actions">
          <div class="app-tabs" role="tablist" aria-label="Main navigation">
            <span id="inlineBusy" class="inline-busy" aria-live="assertive" aria-atomic="true"><span class="busy-spinner-sm"></span> Analyzing...</span>
            <span id="inlineReport" class="inline-busy" aria-live="assertive" aria-atomic="true"><span class="busy-spinner-sm"></span> Generating report...</span>
            ${[
              ["ingest", "Import", "ri-upload-2-line"],
              ["analysis", "Analysis", "ri-stethoscope-line"],
              ["charts", "Monitoring", "ri-line-chart-line"],
              ["guide", "Guide", "ri-book-open-line"]
            ].map(([key, label, icon]) => `<button class="app-tab ${state.view === key ? "active" : ""}" data-view="${key}" role="tab" aria-selected="${state.view === key}"><i class="${icon}"></i><span>${label}</span></button>`).join("")}
            <span class="app-tab-indicator" id="tabIndicator"></span>
          </div>
          <span class="status-pill"><span class="dot"></span>${state.sockets.length} sockets parsed</span>
          <span class="status-pill anomaly-status ${anomalyStatusClass()}">${state.anomalies.length ? icons.incidentWarning : ""}${formatNumber(state.anomalies.length)} anomalies</span>
          ${(() => { const t = detectTrends(); return t.length ? `<span class="status-pill trend-badge" title="${t.map(x => x.metric + " overflow in ~" + x.eta + " min").join(", ")}"><i class="ri-timer-flash-line" style="color:#ff9f43"></i> ${t.length} trend${t.length > 1 ? "s" : ""}</span>` : ""; })()}
          ${state.sockets.length ? `<button class="icon reset-workspace-btn" data-action="requestResetWorkspace" title="Reset workspace" aria-label="Reset workspace">${icons.resetWorkspace}</button>` : ""}
          <button class="icon" data-action="undo" title="Undo (Ctrl+Z)" aria-label="Undo" ${!state._undoStack?.length ? 'disabled style="opacity:0.3"' : ""}><i class="ri-arrow-go-back-line"></i></button>
          <button class="icon" data-action="redo" title="Redo (Ctrl+Y)" aria-label="Redo" ${!state._redoStack?.length ? 'disabled style="opacity:0.3"' : ""}><i class="ri-arrow-go-forward-line"></i></button>
          <button class="icon" data-action="togglePresentation" title="Presentation mode (hide controls, enlarge charts)" aria-label="Toggle presentation mode"><i class="ri-slideshow-line"></i></button>
          <button class="theme-toggle" data-action="toggleTheme" title="Toggle light/dark mode" aria-label="Toggle theme"><span class="theme-toggle-track"><i class="ri-sun-line"></i><i class="ri-moon-line"></i><span class="theme-toggle-thumb ${state.prefs.theme === "light" ? "" : "dark"}"></span></span></button>
          <div class="gear-menu-wrap">
            <button class="icon gear-btn ${state.gearMenuOpen ? "is-open" : ""}" data-action="toggleGearMenu" title="Settings" aria-label="Settings" aria-haspopup="true"><i class="ri-settings-3-line"></i></button>
            ${state.gearMenuOpen ? `<div class="gear-dropdown" role="menu">
              <button role="menuitem" data-action="prefs"><i class="ri-equalizer-line"></i> Settings</button>
              <button role="menuitem" data-action="showShortcuts"><i class="ri-keyboard-box-line"></i> Keyboard shortcuts</button>
              <button role="menuitem" data-action="startTour"><i class="ri-compass-3-line"></i> Guided tour</button>
            </div>` : ""}
          </div>
        </div>
      </header>
      <nav class="breadcrumb" aria-label="Navigation">${state.view === "ingest" ? "Import" : state.view === "analysis" ? `Analysis → <button class="breadcrumb-dropdown-trigger" data-action="toggleBreadcrumbMenu">${state.activeTab} <i class="ri-arrow-down-s-line"></i></button>${state.breadcrumbMenuOpen ? `<div class="breadcrumb-menu">${["quality","diagnosis","advisor","templates","map","conversations","expert","timeline","alerts","compare","sockets","groups","anomalies","fields"].map(t => `<button data-tab="${t}" class="${t === state.activeTab ? "active" : ""}">${t}</button>`).join("")}</div>` : ""}` : state.view === "charts" ? `Monitoring → <button class="breadcrumb-dropdown-trigger" data-action="toggleBreadcrumbMenu">${state.chartsTab === "charts" ? "Metrics" : state.chartsTab === "bdp" ? "BDP" : state.chartsTab === "jvm" ? "JVM Stall" : state.chartsTab === "fix" ? "FIX Latency" : state.chartsTab === "focus" ? "Focus" : "Advisor"} <i class="ri-arrow-down-s-line"></i></button>${state.breadcrumbMenuOpen ? `<div class="breadcrumb-menu"><button data-charts-tab="charts">Metrics</button><button data-charts-tab="bdp">BDP</button><button data-charts-tab="jvm">JVM Stall</button><button data-charts-tab="fix">FIX Latency</button></div>` : ""}` : "Guide"}</nav>
      ${state.view !== "charts" ? renderInvestigationContext() : ""}
      ${state.view === "ingest" ? `<main id="main-content" class="workspace wide" role="main">${renderIngestPage()}</main>` : ""}
      ${state.view === "analysis" ? `<main id="main-content" class="workspace wide" role="main">${renderAnalysisPage()}</main>` : ""}
      ${state.view === "charts" ? `<main id="main-content" class="workspace wide" role="main">
        <nav class="charts-sub-tabs" role="tablist">
          <button class="charts-sub-tab ${state.chartsTab === "charts" ? "active" : ""}" data-charts-tab="charts" role="tab" aria-selected="${state.chartsTab === "charts"}">Metrics</button>
          <button class="charts-sub-tab ${state.chartsTab === "bdp" ? "active" : ""}" data-charts-tab="bdp" role="tab" aria-selected="${state.chartsTab === "bdp"}">BDP & Throughput</button>
          ${state.jvmGc.pauses.length ? `<button class="charts-sub-tab ${state.chartsTab === "jvm" ? "active" : ""}" data-charts-tab="jvm" role="tab" aria-selected="${state.chartsTab === "jvm"}">JVM Stall / GC</button>` : ""}
          ${state.fixLatency.records.length ? `<button class="charts-sub-tab ${state.chartsTab === "fix" ? "active" : ""}" data-charts-tab="fix" role="tab" aria-selected="${state.chartsTab === "fix"}">FIX Latency</button>` : ""}
          <button class="charts-sub-tab ${state.chartsTab === "advisor" ? "active" : ""}" data-charts-tab="advisor" role="tab" aria-selected="${state.chartsTab === "advisor"}">Advisor</button>
          ${state.selectedId ? `<button class="charts-sub-tab ${state.chartsTab === "focus" ? "active" : ""}" data-charts-tab="focus" role="tab" aria-selected="${state.chartsTab === "focus"}"><i class="ri-focus-3-line"></i> Focus</button>` : ""}
          ${state.chartsTab === "charts" ? renderDashboardStudioInline() : ""}
        </nav>
        ${state.chartsTab === "charts" ? renderChartsGlobalToolbar() : ""}
        ${state.chartsTab === "charts" ? renderChartsPage() : ""}
        ${state.chartsTab === "bdp" ? renderBdpWindowPanel() : ""}
        ${state.chartsTab === "jvm" ? renderJvmGcPanel() : ""}
        ${state.chartsTab === "fix" ? renderFixLatencyPanel() : ""}
        ${state.chartsTab === "focus" ? renderFocusView() : ""}
        ${state.chartsTab === "advisor" ? renderChartsPage() : ""}
      </main>` : ""}
      ${state.view === "guide" ? `<main class="workspace wide">${renderGuide()}</main>` : ""}
    </div>
    ${!localStorage.getItem("onboarded") && !state.sockets.length && state.view === "ingest" && !state.modal ? `<div class="cmd-palette-overlay" data-action="dismissOnboarding"><div class="cmd-palette" onclick="event.stopPropagation()" style="max-width:500px"><div style="padding:24px;text-align:center"><h2 style="margin:0 0 8px;font-size:20px">Welcome to Ultimate Network Expert</h2><p style="color:var(--muted);margin:0 0 20px">Analyze TCP socket behavior from ss captures with multi-source correlation.</p><div style="display:grid;gap:12px;text-align:left"><div style="display:flex;gap:10px;align-items:center"><span style="width:28px;height:28px;border-radius:50%;background:rgba(59,130,246,0.15);display:flex;align-items:center;justify-content:center;font-weight:700;color:#3b82f6">1</span><span><b>Load data</b> — Open an ss file, or use <b>Auto-detect dir</b> to load ss + GC + vmstat + nstat + FIX at once</span></div><div style="display:flex;gap:10px;align-items:center"><span style="width:28px;height:28px;border-radius:50%;background:rgba(44,198,44,0.15);display:flex;align-items:center;justify-content:center;font-weight:700;color:#2cc62c">2</span><span><b>Analyze</b> — Click Analyze or press Enter. The tool detects anomalies, builds hypotheses, and generates stories.</span></div><div style="display:flex;gap:10px;align-items:center"><span style="width:28px;height:28px;border-radius:50%;background:rgba(255,159,67,0.15);display:flex;align-items:center;justify-content:center;font-weight:700;color:#ff9f43">3</span><span><b>Investigate</b> — Use Diagnosis, Timeline, Charts, and Expert tabs. Press <kbd>Ctrl+K</kbd> to search anything.</span></div></div><button class="primary" data-action="dismissOnboarding" style="margin-top:20px;padding:8px 24px">Got it, let's go</button></div></div></div>` : ""}
    ${state.modal === "shortcuts" ? `<div class="cmd-palette-overlay" data-action="closeCmdPalette"><div class="cmd-palette" onclick="event.stopPropagation()" style="max-width:420px"><div class="cmd-palette-head"><strong style="flex:1">Keyboard shortcuts</strong><kbd>?</kbd></div><div class="cmd-palette-results" style="padding:12px 16px"><table style="width:100%;font-size:13px;border-collapse:collapse"><tbody><tr><td style="padding:4px 0"><kbd>?</kbd></td><td>Show this help</td></tr><tr><td style="padding:4px 0"><kbd>Ctrl+K</kbd></td><td>Command palette</td></tr><tr><td style="padding:4px 0"><kbd>j</kbd> / <kbd>k</kbd></td><td>Next / previous socket</td></tr><tr><td style="padding:4px 0"><kbd>r</kbd></td><td>Reset chart zoom</td></tr><tr><td style="padding:4px 0"><kbd>Esc</kbd></td><td>Close modal / palette</td></tr><tr><td style="padding:4px 0"><kbd>Ctrl+Shift+P</kbd></td><td>Export PDF</td></tr><tr><td style="padding:4px 0"><kbd>Ctrl+Shift+H</kbd></td><td>Export HTML report</td></tr><tr><td style="padding:4px 0"><kbd>Ctrl+Shift+Z</kbd></td><td>Evidence pack ZIP</td></tr><tr><td style="padding:4px 0"><kbd>Ctrl+Shift+J</kbd></td><td>Copy Jira report</td></tr><tr><td style="padding:4px 0"><kbd>Ctrl+Shift+F</kbd></td><td>FIX spikes CSV</td></tr></tbody></table></div></div></div>` : ""}
    ${state.modal === "commandPalette" ? `<div class="cmd-palette-overlay" data-action="closeCmdPalette"><div class="cmd-palette" onclick="event.stopPropagation()"><div class="cmd-palette-head"><i class="ri-search-line"></i><input id="cmdPaletteInput" type="text" placeholder="Search sockets, metrics, commands..." value="${escapeHtml(state.commandPaletteQuery || "")}" autocomplete="off"/><kbd>Esc</kbd></div><div class="cmd-palette-results">${(() => { const q = (state.commandPaletteQuery || "").toLowerCase(); if (!q) return "<div class=cmd-palette-hint><i class='ri-command-line' style='font-size:20px;opacity:.4;display:block;margin-bottom:6px'></i>Type to search sockets, metrics, tabs, or commands</div>"; function fuzzyHighlight(text, query) { let result = "", qi = 0; for (let i = 0; i < text.length; i++) { if (qi < query.length && text[i].toLowerCase() === query[qi]) { result += "<mark>" + escapeHtml(text[i]) + "</mark>"; qi++; } else { result += escapeHtml(text[i]); } } return qi === query.length ? result : null; } const results = []; state.sockets.filter(s => (s.peer + s.local + s.state + (s.details?.process?.name || "")).toLowerCase().includes(q)).slice(0, 5).forEach(s => { const label = s.local + " → " + s.peer; const hl = fuzzyHighlight(label, q) || escapeHtml(label); results.push(`<button data-action="cmdPaletteSelect" data-socket-id="${s.id}"><i class="ri-plug-line" style="color:var(--cyan)"></i><span>${hl}<small style="color:var(--muted);margin-left:6px">${escapeHtml(s.state)}</small></span><kbd class="cmd-cat">socket</kbd></button>`); }); const tabIcons = { quality:"ri-shield-check-line", diagnosis:"ri-stethoscope-line", advisor:"ri-lightbulb-line", sockets:"ri-plug-line", timeline:"ri-time-line", alerts:"ri-alarm-warning-line", compare:"ri-scales-3-line", groups:"ri-folder-line", anomalies:"ri-error-warning-line", fields:"ri-list-settings-line" }; ["quality","diagnosis","advisor","sockets","timeline","alerts","compare","groups","anomalies","fields"].filter(t => t.includes(q)).forEach((t, i) => results.push(`<button data-action="cmdPaletteTab" data-tab="${t}"><i class="${tabIcons[t] || "ri-layout-grid-line"}" style="color:var(--green)"></i><span>Go to <b>${t}</b></span><kbd>${i < 9 ? "⌘" + (i+1) : ""}</kbd></button>`)); ["rtt","cwnd","sendQ","recvQ","retrans","rto","pacing_rate","delivery_rate"].filter(m => m.toLowerCase().includes(q)).forEach(m => results.push(`<button data-action="cmdPaletteMetric" data-metric="${m}"><i class="ri-line-chart-line" style="color:var(--yellow)"></i><span>Chart <b>${m}</b></span><kbd class="cmd-cat">metric</kbd></button>`)); return results.length ? results.join("") : "<div class=cmd-palette-hint>No results</div>"; })()}</div></div></div>` : ""}
    ${renderChartAnnotationMenu()}
    ${renderDrawer()}
    ${renderModal()}
  `;
  if (false && window.Idiomorph) {
    Idiomorph.morph(app, newHtml, { morphStyle: "innerHTML" });
  } else {
    app.innerHTML = newHtml;
  }
  bindEvents();
  _staggerReveal();
  _positionTabIndicator();
  _animateCounters();
  _positionTourCard();
  initCodeMirror();
  if (state.view === "charts") {
    scheduleChartPageDraw();
  }
  scheduleAnomalyBadgeSettle();
  scheduleIpIntelEnrichment();
}

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

function selectedSocket() {
  return state.activeContextId ? socketsById().get(state.activeContextId) || null : null;
}

function syncChartHistoryToSelection() {
  buildHistory();
  clearVisibleHistoryCache();
}

function focusSocket(socketId, reason = "Selected by user") {
  if (!socketId) return;
  state.selectedId = socketId;
  setActiveInvestigation(state, socketId, reason);
  syncChartHistoryToSelection();
}

function renderInvestigationContext() {
  const socket = selectedSocket();
  if (!socket) return "";
  const socketAnomalies = state.anomalies.filter(anomaly => anomaly.socketId === socket.id);
  const topAnomaly = socketAnomalies
    .slice()
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];
  const process = socket.details.process ? `${socket.details.process.name}:${socket.details.process.pid}` : "unknown process";
  const appChip = renderApplicationServiceChip(socket, "inline");
  return `<section class="investigation-context" aria-label="Active investigation context">
    <div class="investigation-main">
      <span class="tooltip-kicker">Active investigation</span>
      <div class="investigation-flow">
        <strong>${escapeHtml(socket.local)}</strong>
        <span>${icons.arrowRight}</span>
        <strong>${escapeHtml(socket.peer)}</strong>
      </div>
      <small>${escapeHtml(state.activeContextReason || "Chosen by explicit user selection")} / ${escapeHtml(socket.family || "socket")} / ${escapeHtml(socket.state)} / ${escapeHtml(process)} ${appChip}</small>
    </div>
    <div class="investigation-metrics">
      <span><b class="risk ${socket.risk}">${escapeHtml(socket.risk)}</b><small>risk</small></span>
      <span><b>${formatNumber(socketAnomalies.length)}</b><small>anomalies</small></span>
      <span><b>${formatMetricValue("rtt", metricValue(socket, "rtt"))}</b><small>RTT</small></span>
      <span><b>${formatMetricValue("rto", metricValue(socket, "rto"))}</b><small>RTO</small></span>
      <span><b>${formatMetricValue("tx_bps", socketBandwidth(socket, "tx_bps"))}</b><small>TX</small></span>
      <span><b>${formatMetricValue("rx_bps", socketBandwidth(socket, "rx_bps"))}</b><small>RX</small></span>
    </div>
    <div class="investigation-actions">
      <button data-context-action="details">${icons.activity} Details</button>
      <button data-context-action="charts">${icons.chart} Charts</button>
      <button data-context-action="focus"><i class="ri-focus-3-line"></i> Focus</button>
      <button data-context-action="anomalies" class="${socketAnomalies.length ? "hot-action" : ""}">${icons.alert} Anomalies</button>
      <button data-context-action="conversations"><i class="ri-chat-3-line"></i> Conversations</button>
      <button class="icon" data-context-action="clear" title="Clear active context" aria-label="Clear active context">${icons.x}</button>
    </div>
    <div class="investigation-subrow">
      ${topAnomaly ? `<div class="investigation-note ${topAnomaly.severity}">
        <b>${escapeHtml(topAnomaly.severity)}</b>
        <span>${escapeHtml(topAnomaly.title)}</span>
      </div>` : ""}
      ${(state.view === "analysis" || state.view === "charts") ? renderGuidedChecklistPanel(socket) : ""}
    </div>
  </section>`;
}

function inferredApplicationService(socket) {
  return inferApplicationService(socket);
}

function currentApplicationService(socket) {
  return applyServiceOverride(socket, state.serviceOverrides, state.sourceName, inferredApplicationService(socket));
}

function currentApplicationServiceSortKey(socket = {}) {
  const app = currentApplicationService(socket);
  if (!app || app.source === "suppressed") return "";
  return `${app.label} ${app.port || ""}`.trim();
}

function renderApplicationServiceChip(socket, extraClass = "") {
  const app = currentApplicationService(socket);
  if (!app) return "";
  const side = app.side === "local" ? "local port" : "peer port";
  const source = app.source === "override"
    ? "Analyst override"
    : app.source === "suppressed"
      ? "Port heuristic suppressed"
      : "Inferred from port";
  const title = app.source === "override"
    ? `${app.label} set by analyst override for this recording. ${app.description}`
    : app.source === "suppressed"
      ? `Port-based inference hidden by analyst override. Original heuristic is no longer shown for this scope.`
      : `${app.label} inferred from ${side} ${app.port}. ${app.description} Confidence: ${app.confidence}.`;
  const label = app.source === "suppressed" ? "Hidden" : app.label;
  const scopeLabel = app.override?.scope === "global" ? "global rule" : app.source === "override" || app.source === "suppressed" ? "recording rule" : `${side} ${app.port}`;
  return `<button type="button" class="app-service-chip ${escapeHtml(extraClass)} ${app.source === "override" ? "override" : ""} ${app.source === "suppressed" ? "suppressed" : ""}" data-service-override="${escapeHtml(socket.id)}" data-app-tooltip-label="${escapeHtml(label)}" data-app-tooltip-source="${escapeHtml(source)}" data-app-tooltip-scope="${escapeHtml(scopeLabel)}" data-app-tooltip-detail="${escapeHtml(title)}" aria-label="Correct service classification: ${escapeHtml(label)}">
    <i class="ri-stack-line"></i>
    <b>APP</b>
    <span class="app-service-label">${escapeHtml(label)}</span>
  </button>`;
}

function guidedChecklistItems(socket = selectedSocket()) {
  return buildGuidedChecklistItems({
    socket,
    lens: tailLatencyLens(),
    burst: microburstSummary(),
    anomalies: socket ? anomaliesBySocketId().get(socket.id) || [] : [],
    thresholdFor,
    formatMicroburstWindow,
    formatTailLatencyWindow
  });
}

function renderGuidedChecklistPanel(socket = selectedSocket()) {
  const items = guidedChecklistItems(socket);
  if (!items.length) return "";
  const collapsed = state.prefs.guidedChecklistCollapsed !== false;
  const summary = `${items.length} next step${items.length > 1 ? "s" : ""} - ${items[0].severity} - ${items[0].title}`;
  return `<div class="guided-checklist ${collapsed ? "collapsed" : "expanded"}" aria-label="Next best step checklist">
    <div class="guided-checklist-head">
      <div class="guided-checklist-title">
        <span class="tooltip-kicker">Guided checklist</span>
        <strong>Next best step</strong>
        <p class="hint">This panel turns the current socket evidence into concrete investigation moves, so you can avoid hopping between tabs without a hypothesis.</p>
      </div>
      <div class="guided-checklist-tools">
        <span class="guided-checklist-summary">${escapeHtml(summary)}</span>
        <button class="icon" data-action="toggleGuidedChecklist" aria-expanded="${collapsed ? "false" : "true"}" title="${collapsed ? "Expand guided checklist" : "Collapse guided checklist"}">${collapsed ? icons.down : icons.up}</button>
      </div>
    </div>
    <div class="guided-checklist-grid">
      ${items.map(item => `<article class="guided-checklist-card ${item.severity}">
        <header>
          <span class="risk ${item.severity}">${escapeHtml(item.severity)}</span>
          <strong>${escapeHtml(item.title)}</strong>
        </header>
        <p>${escapeHtml(item.why)}</p>
        <small>${escapeHtml(item.next)}</small>
        <footer>
          <button data-action="${item.action}" ${item.preset ? `data-dashboard-preset-jump="${escapeHtml(item.preset)}"` : ""}>${icons.focus} ${escapeHtml(item.actionLabel)}</button>
        </footer>
      </article>`).join("")}
    </div>
  </div>`;
}

function executiveSummarySignal() {
  const rows = sortedFilteredSockets();
  const focusSocket = pickExecutiveFocusSocket(selectedSocket(), rows.length ? rows : state.sockets);
  const anomalyMap = anomaliesBySocketId();
  const summary = buildExecutiveSummary({
    focusSocket,
    anomalies: focusSocket ? anomalyMap.get(focusSocket.id) || [] : state.anomalies,
    advisorFindings: state.advisorFindings || [],
    microburst: microburstSummary(),
    tailLatency: tailLatencyLens(),
    checklistItems: focusSocket ? guidedChecklistItems(focusSocket) : [],
    formatMicroburstWindow,
    formatTailLatencyWindow,
    formatMetricValue
  });
  if (!summary) return null;
  const process = focusSocket?.details?.process ? `${focusSocket.details.process.name}:${focusSocket.details.process.pid}` : "unknown process";
  return { ...summary, process };
}

function renderExecutiveSummary() {
  const rows = sortedFilteredSockets();
  const summary = executiveSummarySignal();
  if (!summary) return "";
  const focusSocket = summary.focusSocket;
  const anomalyMap = anomaliesBySocketId();
  const visibleAnomalies = focusSocket
    ? anomalyMap.get(focusSocket.id)?.length || 0
    : state.anomalies.length;
  const criticalCount = state.anomalies.filter(item => item.severity === "critical").length;
  const checklist = focusSocket ? guidedChecklistItems(focusSocket) : [];
  const cards = [
    {
      label: "Dominant signal",
      value: summary.title,
      detail: summary.summary,
      tone: summary.severity
    },
    {
      label: "Focus flow",
      value: focusSocket ? `${focusSocket.local} -> ${focusSocket.peer}` : "No selected flow",
      detail: focusSocket ? `${focusSocket.family} / ${focusSocket.state} / ${summary.process}` : "Select a row to anchor the investigation on one socket.",
      tone: focusSocket?.risk || "low"
    },
    {
      label: "Visible scope",
      value: `${formatNumber(rows.length)} socket${rows.length > 1 ? "s" : ""}`,
      detail: `${formatNumber(visibleAnomalies)} anomaly signal(s) on the current focus${criticalCount ? ` - ${formatNumber(criticalCount)} critical globally` : ""}.`,
      tone: criticalCount ? "critical" : summary.severity
    },
    {
      label: "Next best step",
      value: checklist[0]?.actionLabel || "Open charts or advisor",
      detail: summary.next,
      tone: checklist[0]?.severity || summary.severity
    }
  ];
  return `<section class="executive-summary ${summary.severity}" aria-label="Incident snapshot">
    <div class="executive-summary-head">
      <div>
        <span class="tooltip-kicker">Incident snapshot</span>
        <h2>${escapeHtml(summary.headline)}</h2>
        <p>${escapeHtml(summary.summary)}</p>
      </div>
      <div class="executive-summary-badge ${summary.severity}">
        <span>${escapeHtml(summary.severity)}</span>
        <strong>${escapeHtml(summary.title)}</strong>
      </div>
    </div>
    <div class="executive-summary-grid">
      ${cards.map(card => `<article class="executive-summary-card ${card.tone}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <small>${escapeHtml(card.detail)}</small>
      </article>`).join("")}
    </div>
  </section>`;
}
function captureWorkspacePosition() {
  const workspace = document.querySelector(".workspace");
  return {
    scrollTop: workspace?.scrollTop || 0,
    scrollLeft: workspace?.scrollLeft || 0,
    windowScrollX: window.scrollX || 0,
    windowScrollY: window.scrollY || 0
  };
}

function restoreWorkspacePosition(snapshot) {
  const nextWorkspace = document.querySelector(".workspace");
  if (nextWorkspace) {
    nextWorkspace.scrollTop = snapshot.scrollTop;
    nextWorkspace.scrollLeft = snapshot.scrollLeft;
  }
  window.scrollTo(snapshot.windowScrollX, snapshot.windowScrollY);
}

function renderKeepingWorkspacePosition() {
  const snapshot = captureWorkspacePosition();
  const active = document.activeElement;
  if (active && typeof active.blur === "function" && active.closest?.(".modal")) active.blur();
  const restore = () => restoreWorkspacePosition(snapshot);
  render();
  restore();
  queueMicrotask(restore);
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(restore);
  });
  setTimeout(restore, 0);
  setTimeout(restore, 80);
}

function renderKeepingModalPosition() {
  const modal = document.querySelector(".modal");
  const modalScrollTop = modal?.scrollTop || 0;
  const modalScrollLeft = modal?.scrollLeft || 0;
  const columnList = document.querySelector(".column-list");
  const columnListScrollTop = columnList?.scrollTop || 0;
  const columnListScrollLeft = columnList?.scrollLeft || 0;
  render();
  const nextModal = document.querySelector(".modal");
  if (nextModal) {
    nextModal.scrollTop = modalScrollTop;
    nextModal.scrollLeft = modalScrollLeft;
  }
  const nextColumnList = document.querySelector(".column-list");
  if (nextColumnList) {
    nextColumnList.scrollTop = columnListScrollTop;
    nextColumnList.scrollLeft = columnListScrollLeft;
  }
}

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

const appRendering = createAppRendering(appRenderingDependencies);

function appRenderingDependencies() {
  return {
    state,
    ctx,
    icons,
    document,
    window,
    performance,
    APP_VERSION,
    APP_SPLASH_IMAGE,
    ACCESS_ROLES,
    ANALYSIS_TAB_GUIDE,
    ANALYSIS_TEMPLATES,
    DASHBOARD_PRESETS,
    EXPERT_CORRELATIONS,
    EXPERT_DEFAULT_THRESHOLDS,
    FIELD_DOCS,
    FIELD_GUIDANCE,
    LINUX_PROFILES,
    PRE_IMPORT_PRESETS,
    SERVICE_MAP_SORT_COLLATOR,
    TABLE_COLUMNS,
    UBUNTU_PROFILES,
    html,
    ingestViewDependencies,
    renderIngestPageView,
    renderAnalysisPageView,
    renderExportMenu,
    renderAnalysisTabs,
    computeHealthScore,
    _renderChartsGlobalToolbar,
    _renderAdvisorGlobalSummary,
    _renderMetricsStatsTable,
    chartMetricList,
    alphabeticalMetrics,
    microburstSummary,
    formatMicroburstWindow,
    metricLabel,
    orderedChartMetrics,
    clampChartColumns,
    hasRealTimestampHistory,
    renderInvestigationContext,
    formatMetricValue,
    renderMetricChartLegend,
    renderChartMoveMenu,
    _renderDashboardPresetPicker,
    _renderDashboardStudioInline,
    _renderDashboardStudio,
    tailLatencyLens,
    formatTailLatencyWindow,
    numberFormatter,
    formatNumber,
    visibleHistory,
    socketsById,
    analyzeBdpWindowLimit,
    normalizeBdpDirection,
    configuredLinkCapacityMbps,
    thresholdFor,
    formatBitsPerSecond,
    bdpChartSeries,
    metricUnit,
    metricColor,
    formatMetricNumber,
    renderTableMetricCell,
    thresholdSeverity,
    renderPercentileDistribution,
    advancedCorrelationPanels,
    metricSource,
    metricInterpretation,
    metricCorrelations,
    metricReliabilityProfile,
    metricDiagnosticGuidance,
    escapeHtml,
    render,
    buildAiSummary,
    buildCorrelationMatrix,
    analyzeCaptureQuality,
    renderCaptureQualityReportView,
    buildDiagnosticHypotheses,
    buildRootCauseMatrix,
    detectCwndPhases,
    buildSparklineIndex,
    socketIdentityKey,
    anomaliesBySocketId,
    riskRank,
    resolvePlaybook,
    playbookForHypothesis,
    runAdvisorAnalysis,
    renderSocketTableView,
    tableSettingsPlacement,
    buildSocketOptionSets,
    tableDefaults,
    visibleColumns,
    sortedFilteredSockets,
    tableStateSnapshot,
    renderTableSettingsTriggerView,
    renderTableSettingsDrawerView,
    renderTableSettingsMenuView,
    renderTableHeader,
    getColumn,
    columnHelpView,
    renderThresholdSummaryView,
    renderColumnTooltipView,
    pagedRows,
    groupedSockets,
    buildConversations,
    conversationAnomalySummary,
    renderConversationSortHeader,
    currentAliasForEndpoint,
    aliasCountForSource,
    aliasForEndpoint,
    aliasListForSource,
    ipIntelSummary,
    ipIntelDetail,
    buildServiceMap,
    buildServiceMapData,
    buildServiceMapRoutes,
    layoutTopologyLanePositions,
    renderGeoMapSvg,
    buildGeoMarkers,
    renderSankeySvg,
    orderServiceMapConnectivity,
    serviceMapConnectivityOrder,
    serviceMapGroupBands,
    endpointHost,
    endpointPresentation,
    topologyGroupForEndpoint,
    topologyScopeKey,
    nodeLabel,
    nodeSubtitle,
    mapNodeTitle,
    renderMapLegend,
    renderHotPaths,
    renderMapEdgeInsight,
    buildExpertInformation,
    buildTimelineEvents,
    cachedStories,
    cachedMultiSocket,
    cachedRateAlerts,
    detectTrends,
    formatTimelineTime,
    formatTimelineOffset,
    renderHeatmapView,
    renderTimelineStoriesViewModel,
    severityVisible,
    defaultAlertRules,
    baselineDeviations,
    buildComparison,
    buildBaselineNarrative,
    _renderBaselineNarrative,
    _renderDelta,
    selectedSocket,
    metricValue,
    renderApplicationServiceChip,
    currentApplicationService,
    inferredApplicationService,
    currentSourceAnnotations,
    annotationTypeList,
    buildAnnotationDraft,
    annotationAnchorOptions,
    annotationMetricChoices,
    annotationDefaultLabel,
    annotationTypeLabel,
    createModalView,
    renderPrefsView,
    timeZoneOptions,
    createGuideView,
    normalizeAliasStore,
    normalizeTopologyProfile,
    serviceOverrideForSocket,
    normalizePreImportFilters,
    renderDashboardPresetOptions,
    renderDatalist,
    accessRoleLabel,
    linuxProfileLabel,
    ubuntuProfileLabel,
    envCommand,
    commandForPeer,
    isAnalystRole,
    isLxcProfile,
    hasActiveTableFilters,
    currentApplicationServiceSortKey,
    socketBandwidth,
    truncateMiddle,
    parsedTimestampSnapshots,
    chartTooltipOpacity,
    chartStats,
    numberFormatterWith,
    renderServiceMapView,
    resolvedNumberLocale,
    resolvedTimeZone,
    timeLabel,
    analysisTabGuide,
    annotationSocketId
  };
}

function renderIngestPage(...args) { return appRendering.renderIngestPage(...args); }
function renderAnalysisPage(...args) { return appRendering.renderAnalysisPage(...args); }
function renderChartsGlobalToolbar(...args) { return appRendering.renderChartsGlobalToolbar(...args); }
function renderAdvisorGlobalSummary(...args) { return appRendering.renderAdvisorGlobalSummary(...args); }
function renderMetricsStatsTable(...args) { return appRendering.renderMetricsStatsTable(...args); }
function renderChartsPage(...args) { return appRendering.renderChartsPage(...args); }
function renderFocusView() {
  const selected = socketsById().get(state.selectedId);
  if (!selected) return `<section class="panel"><div class="panel-body"><p class="empty">Select a socket from the table to enter focus mode.</p></div></section>`;
  const history = visibleHistory();
  const allMetrics = chartMetricList();
  const activeMetrics = allMetrics.filter(m => {
    return history.some(row => { const v = Number(row?.[m]); return Number.isFinite(v) && v !== 0; });
  });
  if (!activeMetrics.length) return `<section class="panel"><div class="panel-body"><p class="empty">No metric data available for this socket.</p></div></section>`;
  const layout = state.prefs.chartLayout;
  return `<section class="panel focus-panel">
    <div class="panel-head">
      <div class="panel-title"><i class="ri-focus-3-line"></i> Focus — ${escapeHtml(selected.local)} → ${escapeHtml(selected.peer)}</div>
      <div class="col-tools">
        <button class="mini" data-chart-zoom="zoomIn" title="Zoom in">${icons.zoomIn}</button>
        <button class="mini" data-chart-zoom="zoomOut" title="Zoom out">${icons.zoomOut}</button>
        <button class="mini" data-chart-zoom="resetZoom" title="Reset zoom">${icons.reset}</button>
        <button class="mini" data-chart-zoom="panLeft" title="Pan left">${icons.arrowLeft}</button>
        <button class="mini" data-chart-zoom="panRight" title="Pan right">${icons.arrowRight}</button>
      </div>
    </div>
    <div class="panel-body">
      <div class="focus-grid">
        ${activeMetrics.map(m => `<div class="focus-chart-card chart-card" data-chart-card="${m}">
          <div class="focus-chart-label">${escapeHtml(metricLabel(m))}</div>
          <svg class="chart small-chart focus-chart" data-mini-chart="${m}" tabindex="0" role="img" aria-label="${escapeHtml(metricLabel(m))}"></svg>
        </div>`).join("")}
      </div>
    </div>
  </section>`;
}
function renderDashboardPresetPicker(...args) { return appRendering.renderDashboardPresetPicker(...args); }
function renderDashboardStudioInline(...args) { return appRendering.renderDashboardStudioInline(...args); }
function renderDashboardStudio(...args) { return appRendering.renderDashboardStudio(...args); }
function renderTailLatencyLensPanel(...args) { return appRendering.renderTailLatencyLensPanel(...args); }
function formatBytesHuman(...args) { return appRendering.formatBytesHuman(...args); }
function bdpWindowAnalysis(...args) { return appRendering.bdpWindowAnalysis(...args); }
function renderBdpWindowPanel(...args) { return appRendering.renderBdpWindowPanel(...args); }
function renderJvmGcPanel(...args) { return appRendering.renderJvmGcPanel(...args); }
function runJvmCorrelation(...args) { return appRendering.runJvmCorrelation(...args); }
function drawJvmCharts(...args) { return appRendering.drawJvmCharts(...args); }
function hideFloatingChartTooltipNow(...args) { return appRendering.hideFloatingChartTooltipNow(...args); }
function showAppServiceTooltip(...args) { return appRendering.showAppServiceTooltip(...args); }
function hideAppServiceTooltip(...args) { return appRendering.hideAppServiceTooltip(...args); }
function bindSmartChartTooltips(...args) { return appRendering.bindSmartChartTooltips(...args); }
function bindColumnHelpTooltips(...args) { return appRendering.bindColumnHelpTooltips(...args); }
function runFixCorrelation(...args) { return appRendering.runFixCorrelation(...args); }
function renderFixLatencyPanel(...args) { return appRendering.renderFixLatencyPanel(...args); }
function drawFixCharts(...args) { return appRendering.drawFixCharts(...args); }
function renderWhatIfSimulation(...args) { return appRendering.renderWhatIfSimulation(...args); }
function toggleFixPlayback(...args) { return appRendering.toggleFixPlayback(...args); }
function captureQualityReport(...args) { return appRendering.captureQualityReport(...args); }
function diagnosticHypotheses(...args) { return appRendering.diagnosticHypotheses(...args); }
function cachedRootCauseMatrix(...args) { return appRendering.cachedRootCauseMatrix(...args); }
function lazySparklineIndex(...args) { return appRendering.lazySparklineIndex(...args); }
function renderTableSettingsTrigger(...args) { return appRendering.renderTableSettingsTrigger(...args); }
function renderTableSettingsDrawer(...args) { return appRendering.renderTableSettingsDrawer(...args); }
function renderTableSettingsMenu(...args) { return appRendering.renderTableSettingsMenu(...args); }
function renderRowActions(...args) { return appRendering.renderRowActions(...args); }
function renderEndpointCell(...args) { return appRendering.renderEndpointCell(...args); }
function renderPeerCell(...args) { return appRendering.renderPeerCell(...args); }
function columnHelp(...args) { return appRendering.columnHelp(...args); }
function renderThresholdSummary(...args) { return appRendering.renderThresholdSummary(...args); }
function renderColumnTooltip(...args) { return appRendering.renderColumnTooltip(...args); }
function positionConversationInsight(...args) { return appRendering.positionConversationInsight(...args); }
function renderTimelineHeatmap(...args) { return appRendering.renderTimelineHeatmap(...args); }
function renderBaselineNarrative(...args) { return appRendering.renderBaselineNarrative(...args); }
function renderDelta(...args) { return appRendering.renderDelta(...args); }
function filteredAnomalies(...args) { return appRendering.filteredAnomalies(...args); }
function renderChartAnnotationMenu(...args) { return appRendering.renderChartAnnotationMenu(...args); }
function renderDrawer(...args) { return appRendering.renderDrawer(...args); }
function renderTimeZoneOptions(...args) { return appRendering.renderTimeZoneOptions(...args); }
function renderGuide(...args) { return appRendering.renderGuide(...args); }
function renderModal(...args) { return appRendering.renderModal(...args); }

function resolvedNumberLocale(...args) { return localeFormatting.resolvedNumberLocale(...args); }
function resolvedTimeZone(...args) { return localeFormatting.resolvedTimeZone(...args); }
function timeZoneOptions(...args) { return localeFormatting.timeZoneOptions(...args); }
function numberFormatterWith(...args) { return localeFormatting.numberFormatterWith(...args); }
function numberFormatter(...args) { return localeFormatting.numberFormatter(...args); }
function numberSeparators(...args) { return localeFormatting.numberSeparators(...args); }
function dateTimeFormatter(...args) { return localeFormatting.dateTimeFormatter(...args); }
function formatNumber(...args) { return localeFormatting.formatNumber(...args); }
function formatTimelineTime(...args) { return localeFormatting.formatTimelineTime(...args); }
function formatTimelineOffset(...args) { return localeFormatting.formatTimelineOffset(...args); }

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

function reportActionDependencies() {
  return {
    state,
    document,
    window,
    APP_VERSION,
    metricLabel,
    toast,
    visibleHistory,
    resolvedTimeZone,
    timeLabel,
    selectedSocket,
    anomaliesBySocketId,
    microburstSummary,
    formatMicroburstWindow,
    drawChartInto,
    sortedFilteredSockets,
    socketBandwidth,
    metricValue,
    percentile,
    severityRank,
    currentSourceAnnotations,
    annotationSocketId,
    buildPrintableIncidentReportHtml,
    buildIncidentReportPdfModel,
    buildJiraReportModel,
    reportChartDataUrl,
    svgToPngBlob,
    safeEvidenceFileName,
    buildAnomaliesCsv,
    buildTopSocketsCsv,
    buildTimelinePayload,
    buildEvidenceManifest,
    downloadBlob,
    resolvePlaybook,
    playbookForHypothesis,
    buildComparison,
    buildBaselineNarrative,
    buildAiSummary,
    generateIncidentReport,
    buildRootCauseMatrix,
    cachedStories,
    cachedMultiSocket,
    cachedRateAlerts,
    captureQualityReport,
    diagnosticHypotheses,
    cachedRootCauseMatrix,
    formatMetricValue,
    formatNumber,
    resolvedNumberLocale,
    linuxProfileLabel,
    accessRoleLabel,
    escapeHtml,
    annotationTypeLabel,
    pickExecutiveFocusSocket,
    tailLatencyLens,
    guidedChecklistItems,
    buildExecutiveSummary,
    formatTailLatencyWindow,
    socketsById
  };
}

function exportChartAsPng(...args) { return reportActions.exportChartAsPng(...args); }
function reportDefaultChartMetrics(...args) { return reportActions.reportDefaultChartMetrics(...args); }
function buildJiraReport(...args) { return reportActions.buildJiraReport(...args); }
function buildIncidentReportHtml(...args) { return reportActions.buildIncidentReportHtml(...args); }
function buildIncidentReportPdf(...args) { return reportActions.buildIncidentReportPdf(...args); }
function exportEvidencePack(...args) { return reportActions.exportEvidencePack(...args); }
function exportIncidentReportHtml(...args) { return reportActions.exportIncidentReportHtml(...args); }
function exportFixSpikeCsv(...args) { return reportActions.exportFixSpikeCsv(...args); }
function openIncidentReport(...args) { return reportActions.openIncidentReport(...args); }

async function importFile(file) {
  state.importStatus = { title: "Preparing import", detail: `${file.name} (${formatNumber(file.size)} bytes)`, progress: 1 };
  state.raw = "";
  state.ingestRawExpanded = false;
  state.sockets = [];
  state.anomalies = [];
  state.healthScore = null;
  state.selectedId = null;
  setActiveInvestigation(state, null);
  setSourceName(file.name);
  state.view = "ingest";
  state.analysisDirty = false;
  resetDerivedCaches({ raw: true });
  render();

  const result = await importSocketFile(file, {
    formatNumber,
    preFilter: state.preImportFilters.enabled ? { ...state.preImportFilters } : null,
    onProgress(update, options = {}) {
      state.raw = update.raw;
      const isTimelineImport = hasTimestampedRawData();
      const visibleSockets = isTimelineImport ? aggregateParsedSocketsByKey(update.sockets) : update.sockets;
      state.importStatus = update.status && isTimelineImport && visibleSockets.length !== update.sockets.length
        ? {
          ...update.status,
          detail: `${update.status.detail} ${formatNumber(visibleSockets.length)} active sockets after timeline aggregation.`
        }
        : update.status;
      if (options.render !== false) {
        state.sockets = visibleSockets;
        // Only render status, skip heavy recompute during streaming
        const statusEl = document.querySelector(".import-status");
        if (statusEl && update.status) statusEl.textContent = `${update.status.title} - ${update.status.detail} (${update.status.progress || 0}%)`;
      } else {
        state.sockets = visibleSockets;
      }
    }
  });

  state.raw = result.raw;
  state.ingestRawExpanded = result.raw.length <= INGEST_RAW_EAGER_LIMIT;
  setSourceName(result.sourceName);
  rememberFilterHistory(state.preImportFilters);
  state.importStatus = null;
  state.view = "analysis";
  state.activeTab = "advisor";
  state.healthScore = null;
  resetDerivedCaches({ raw: true });
  // Yield to UI before heavy computation
  render();
  await new Promise(r => setTimeout(r, 50));
  const t0 = performance.now();
  if (hasTimestampedRawData()) {
    recompute();
  } else {
    state.sockets = result.sockets;
    recomputeFromSockets();
  }
  toast("Analysis complete", `${state.sockets.length} sockets in ${((performance.now() - t0) / 1000).toFixed(1)}s.`);
  toast("Import complete", `${formatNumber(state.sockets.length)} sockets parsed from ${file.name}.`);
  render();
}

function rememberFilterHistory(filters) {
  if (!filters.enabled || !hasPreImportFilterValue(filters)) return;
  const normalized = normalizePreImportFilters(filters);
  state.filterHistory = [
    { ...normalized, at: Date.now() },
    ...state.filterHistory
  ].filter((item, index, all) => index === all.findIndex(other =>
    other.protocol === item.protocol &&
    other.state === item.state &&
    other.srcIp === item.srcIp &&
    other.dstIp === item.dstIp &&
    other.anyPort === item.anyPort &&
    other.srcPort === item.srcPort &&
    other.dstPort === item.dstPort
  )).slice(0, 40);
  saveFilterHistoryRaw(state.filterHistory);
}

function toast(title, text, type = "") {
  const stack = document.querySelector("#toastStack");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p><button class="toast-close" aria-label="Close">×</button><span class="toast-progress"></span>`;
  el.querySelector(".toast-close").addEventListener("click", () => { el.classList.add("leaving"); setTimeout(() => el.remove(), 300); });
  el.addEventListener("mouseenter", () => { el.classList.add("paused"); });
  el.addEventListener("mouseleave", () => { el.classList.remove("paused"); });
  stack.appendChild(el);
  while (stack.children.length > 4) { stack.firstElementChild.remove(); }
  setTimeout(() => { if (!el.classList.contains("paused")) { el.classList.add("leaving"); setTimeout(() => el.remove(), 300); } else { const wait = () => { if (!el.classList.contains("paused")) { el.classList.add("leaving"); setTimeout(() => el.remove(), 300); } else { setTimeout(wait, 500); } }; setTimeout(wait, 500); } }, 8000);
}

async function copyTextToClipboard(text) {
  const value = String(text || "");
  if (!value) return false;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  textarea.remove();
  return ok;
}

function closeDashboardPresetMenu(cancel = false) {
  if (!state.openDashboardPresetMenu) return false;
  if (cancel) {
    state.activeDashboardPreset = dashboardPresetIdOrDefault(state.dashboardPresetBeforeOpen || state.activeDashboardPreset);
  }
  state.openDashboardPresetMenu = false;
  state.dashboardPresetBeforeOpen = null;
  return true;
}

function updateDashboardPresetPickerChrome(presetId) {
  const preset = DASHBOARD_PRESETS[presetId];
  const picker = document.querySelector("#dashboardPresetPicker");
  if (!preset || !picker) return;
  const trigger = picker.querySelector("[data-dashboard-preset-toggle]");
  const label = picker.querySelector(".dashboard-preset-current");
  const icon = picker.querySelector(".dashboard-preset-trigger .dashboard-preset-icon i");
  const menu = picker.querySelector(".dashboard-preset-menu");
  trigger?.setAttribute("aria-expanded", "false");
  trigger?.setAttribute("title", preset.description || "Choose an expert dashboard preset.");
  if (label) label.textContent = preset.name || "Choose preset";
  if (icon) icon.className = dashboardPresetIcon(presetId);
  menu?.classList.remove("open");
  picker.querySelectorAll("[data-dashboard-preset-choice]").forEach(option => {
    const selected = option.dataset.dashboardPresetChoice === presetId;
    option.classList.toggle("selected", selected);
    option.setAttribute("aria-selected", selected ? "true" : "false");
  });
}

function scheduleDashboardPresetRender() {
  if (dashboardPresetRenderFrame) cancelAnimationFrame(dashboardPresetRenderFrame);
  dashboardPresetRenderFrame = requestAnimationFrame(() => {
    dashboardPresetRenderFrame = requestAnimationFrame(() => {
      dashboardPresetRenderFrame = 0;
      renderKeepingWorkspacePosition();
    });
  });
}

function commitDashboardPresetChoice(presetId) {
  const preset = DASHBOARD_PRESETS[presetId];
  if (!preset) return;
  state.openDashboardPresetMenu = false;
  state.dashboardPresetBeforeOpen = null;
  applyDashboardPreset(presetId);
  updateDashboardPresetPickerChrome(presetId);
  toast("Dashboard preset applied", preset.name || "Preset applied.");
  scheduleDashboardPresetRender();
}

function closeFloatingMenus(options = {}) {
  let changed = closeDashboardPresetMenu(Boolean(options.cancelDashboard));
  if (state.openStyleMenu) {
    state.openStyleMenu = false;
    changed = true;
  }
  if (state.openSsEditorThemeMenu) {
    state.openSsEditorThemeMenu = false;
    resetSsEditorThemePreview();
    changed = true;
  }
  if (state.openExportMenu || state.openExportMenuPos) {
    state.openExportMenu = null;
    state.openExportMenuPos = null;
    changed = true;
  }
  if (state.openTableSettings || state.openTableSettingsPos) {
    state.openTableSettings = false;
    state.openTableSettingsPos = null;
    changed = true;
  }
  if (state.openMenuId || state.openMenuPos) {
    state.openMenuId = null;
    state.openMenuPos = null;
    changed = true;
  }
  if (state.openChartMoveMetric || state.openChartMovePos) {
    state.openChartMoveMetric = null;
    state.openChartMovePos = null;
    changed = true;
  }
  if (state.openConversationInsightKey || state.openConversationInsightPos) {
    state.openConversationInsightKey = null;
    state.openConversationInsightPos = null;
    changed = true;
  }
  if (state.drawer === "tableSettings") {
    state.drawer = null;
    changed = true;
  }
  return changed;
}

function handleGlobalKeydown(event) {
  if (event.ctrlKey && event.key === "z" && !event.shiftKey) { event.preventDefault(); _undo(); return; }
  if (event.ctrlKey && (event.key === "y" || (event.key === "z" && event.shiftKey))) { event.preventDefault(); _redo(); return; }
  if (event.key !== "Escape") return;
  if (!closeFloatingMenus({ cancelDashboard: true })) return;
  event.preventDefault();
  renderKeepingWorkspacePosition();
}

function appEventDependencies() {
  return {
    ...chartDrawDependencies(),
    document,
    window,
    state,
    cmInstance,
    icons,
    EXPERT_CORRELATIONS,
    PRE_IMPORT_PRESETS,
    ANALYSIS_TEMPLATES,
    render,
    renderKeepingWorkspacePosition,
    drawBdpWindowCharts,
    drawJvmCharts,
    drawFixCharts,
    redrawChartCardMetric,
    applyChartZoomAction,
    chartZoomFor,
    clearVisibleHistoryCache,
    chartSeriesKey,
    handleGlobalKeydown,
    bindSmartChartTooltips,
    bindColumnHelpTooltips,
    sortedFilteredSockets,
    visibleColumns,
    escapeHtml,
    renderRowActions,
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
    zoomToTailLatencyWindow,
    applyDashboardPreset,
    resetAllState,
    _undo,
    _redo,
    _undoSnapshot,
    renderModal,
    parseGcLog,
    runJvmCorrelation,
    toggleFixPlayback,
    selectedSocket,
    anomaliesBySocketId,
    applyContextAction,
    chartMetricList,
    syncChartHistoryToSelection,
    openAnnotationModal,
    bindTableInteractionEvents,
    tableInteractionDependencies,
    bindSocketInteractionEvents,
    socketInteractionDependencies,
    closeDashboardPresetMenu,
    commitDashboardPresetChoice,
    applyDashboardProfile,
    saveDashboardProfiles: () => saveDashboardProfilesRaw(state.dashboardProfiles),
    saveAlertAcks: () => saveAlertAcksRaw(state.alertAcks),
    defaultAlertRules,
    saveAlertRules: () => saveAlertRulesRaw(state.alertRules),
    saveFilterHistory: () => saveFilterHistoryRaw(state.filterHistory),
    hasPreImportFilterValue,
    emptyPreImportFilters,
    importFile,
    openTopologyModal,
    renderKeepingModalPosition,
    socketsById,
    focusSocket,
    hideAppServiceTooltip,
    showAppServiceTooltip,
    applyAnalysisTemplate,
    savePrefs,
    normalizeBdpDirection,
    syncSsCommandFromBuilder,
    syncFromCodeMirror,
    toggleCommandOption,
    normalizeSsEditorTheme,
    applySsEditorThemePreview,
    resetSsEditorThemePreview,
    runFixCorrelation,
    sourceFileEventDependencies,
    bindSourceFileEvents,
    setZoom,
    saveTableState,
    moveVisibleChartMetric,
    showPercentileTableCrosshair,
    clearPercentileTableCrosshair,
    exportChartAsPng,
    copyTextToClipboard,
    buildJiraReport,
    exportIncidentReportHtml,
    exportFixSpikeCsv,
    createBaseline,
    formatNumber,
    handleLayoutProfileAction,
    layoutProfileActionDependencies,
    handleServiceConfigAction,
    serviceConfigActionDependencies,
    setZoomFromDateInputs,
    clampZoomRange
  };
}

function ingestActionDependencies() {
  return {
    document,
    state,
    cmInstance,
    performance,
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
  };
}

function sourceFileEventDependencies() {
  return {
    document,
    state,
    cmInstance,
    parseGcLog,
    parsePidstat,
    parseNstat,
    parseFixLog,
    parseVmstat,
    parseNstatTimestamped,
    parseSar,
    extractTcpCounters,
    correlateCpuWithStalls,
    correlateSarWithTcp,
    visibleHistory,
    runJvmCorrelation,
    runFixCorrelation,
    drawJvmCharts,
    drawFixCharts,
    toast,
    render,
    _showBusy,
    _hideBusy
  };
}

function serviceConfigActionDependencies() {
  return {
    document,
    state,
    currentAliasDisplay,
    upsertEndpointAlias,
    deleteEndpointAlias,
    saveServiceAliases: () => saveServiceAliasesRaw(state.serviceAliases),
    upsertServiceOverride,
    deleteServiceOverride,
    saveServiceOverrides: () => saveServiceOverridesRaw(state.serviceOverrides),
    upsertTopologyGroup,
    deleteTopologyGroup,
    saveCurrentTopology,
    toast,
    render
  };
}

function tableInteractionDependencies() {
  return {
    document,
    state,
    TABLE_COLUMNS,
    tableDefaults,
    tableSettingsPlacement,
    applyTableColumnSearchFilter,
    resetTableSort,
    resetTableColumns,
    toggleTableColumnPin,
    setTableColumnVisibility,
    toggleTableColumnVisibility,
    saveTableState,
    applyTableLayout,
    saveTableProfiles: () => saveTableProfilesRaw(state.tableProfiles),
    moveTableColumn,
    toast,
    renderKeepingWorkspacePosition,
    renderKeepingModalPosition,
    render
  };
}

function socketInteractionDependencies() {
  return {
    document,
    window,
    state,
    CONVERSATION_SORT_LABELS,
    conversationDefaultSortDir,
    positionConversationInsight,
    socketsById,
    focusSocket,
    chartMetricList,
    metricLabel,
    anomaliesBySocketId,
    metricValue,
    formatNumber,
    openIncidentReport,
    exportIncidentReportHtml,
    exportEvidencePack,
    buildJiraReport,
    exportFixSpikeCsv,
    copyTextToClipboard,
    toast,
    renderKeepingWorkspacePosition,
    render
  };
}

function layoutProfileActionDependencies() {
  return {
    document,
    state,
    DEFAULT_TABLE_ORDER,
    parseFormattedNumber,
    cloneThresholds,
    clampChartColumns,
    clampChartTooltipOpacity,
    defaultTableColumns,
    saveTableState,
    tableLayoutSnapshot,
    saveTableProfiles: () => saveTableProfilesRaw(state.tableProfiles),
    applyDashboardProfile,
    saveDashboardProfiles: () => saveDashboardProfilesRaw(state.dashboardProfiles),
    dashboardSnapshot,
    dashboardPresetIdOrDefault,
    savePrefs,
    toast,
    renderKeepingWorkspacePosition,
    render
  };
}

function bindChartMinimapEvents(deps = appEventDependencies()) { return appEventBindings.bindChartMinimapEvents(deps); }
function bindChartChromeEvents(deps = appEventDependencies()) { return appEventBindings.bindChartChromeEvents(deps); }
function bindChartSeriesEvents(deps = appEventDependencies()) { return appEventBindings.bindChartSeriesEvents(deps); }
function bindEvents(deps = appEventDependencies()) { return appEventBindings.bindEvents(deps); }
// === DELEGATED EVENT HANDLING (installed once, never re-attached) ===
document.addEventListener("keydown", event => {
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.isContentEditable) return;
  if (event.key === "Escape") {
    if (state.onboarding >= 0) { state.onboarding = -1; localStorage.setItem("networkExpertOnboarded", "1"); render(); return; }
    if (document.documentElement.classList.contains("presentation-mode")) { document.documentElement.classList.remove("presentation-mode"); return; }
    if (state.modal) { state.modal = null; render(); return; }
    if (state.drawer) { state.drawer = null; render(); return; }
  }
  if (event.ctrlKey || event.metaKey) {
    const num = parseInt(event.key);
    if (num >= 1 && num <= 9) {
      const tabs = ["quality", "diagnosis", "advisor", "templates", "map", "conversations", "timeline", "alerts", "compare"];
      if (tabs[num - 1]) { event.preventDefault(); state.activeTab = tabs[num - 1]; state.view = "analysis"; render(); }
    }
    if (event.key === "e") { event.preventDefault(); state.view = "ingest"; render(); }
    if (event.key === "m") { event.preventDefault(); state.view = "charts"; state.chartsTab = "charts"; render(); }
  }
});

document.querySelector("#app").addEventListener("click", event => {
  const actionMenu = event.target.closest("[data-action-menu]");
  if (actionMenu) {
    event.stopPropagation();
    const id = actionMenu.dataset.actionMenu;
    if (state.openMenuId === id) { state.openMenuId = null; state.openMenuPos = null; }
    else {
      const rect = actionMenu.getBoundingClientRect();
      const menuWidth = 250;
      const menuHeight = 220;
      const left = Math.min(Math.max(8, rect.right + 4), window.innerWidth - menuWidth - 8);
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow > menuHeight + 8 ? rect.top : Math.max(8, rect.bottom - menuHeight);
      state.openMenuId = id;
      state.openMenuPos = { left: Math.round(left), top: Math.round(top) };
    }
    render(); return;
  }

  const target = event.target.closest("[data-view]");
  if (target) { state._lastTab = state._lastTab || {}; state._lastTab[state.view] = state.activeTab; state.view = target.dataset.view; if (state._lastTab[state.view]) state.activeTab = state._lastTab[state.view]; if (document.startViewTransition) { document.startViewTransition(() => render()); } else { render(); } return; }

  const tab = event.target.closest("[data-tab]");
  if (tab) { state.activeTab = tab.dataset.tab; state.breadcrumbMenuOpen = false; render(); return; }

  const chartsTab = event.target.closest("[data-charts-tab]");
  if (chartsTab) { state.chartsTab = chartsTab.dataset.chartsTab; state.breadcrumbMenuOpen = false; render(); return; }

  const sort = event.target.closest("[data-sort]");
  if (sort) {
    event.stopPropagation();
    const key = sort.dataset.sort;
    state.table.sortDir = state.table.sortKey === key && state.table.sortDir === "desc" ? "asc" : "desc";
    state.table.sortKey = key;
    state.table.page = 1;
    saveTableState();
    render();
    return;
  }

  const page = event.target.closest("[data-page]");
  if (page) {
    const action = page.dataset.page;
    const total = Number(page.dataset.totalPages || Math.max(1, Math.ceil(sortedFilteredSockets().length / state.table.pageSize)));
    if (action === "first") state.table.page = 1;
    if (action === "prev") state.table.page = Math.max(1, state.table.page - 1);
    if (action === "next") state.table.page = Math.min(total, state.table.page + 1);
    if (action === "last") state.table.page = total;
    render();
    return;
  }

  const jvmSort = event.target.closest("[data-jvm-sort]");
  if (jvmSort) {
    event.stopPropagation();
    const key = jvmSort.dataset.jvmSort;
    state.jvmTable.sortDir = state.jvmTable.sortKey === key && state.jvmTable.sortDir === "desc" ? "asc" : "desc";
    state.jvmTable.sortKey = key;
    state.jvmTable.page = 1;
    renderKeepingWorkspacePosition();
    return;
  }

  const jvmPage = event.target.closest("[data-jvm-page]");
  if (jvmPage) {
    const action = jvmPage.dataset.jvmPage;
    const total = Number(jvmPage.dataset.totalPages || 1);
    if (action === "first") state.jvmTable.page = 1;
    if (action === "prev") state.jvmTable.page = Math.max(1, state.jvmTable.page - 1);
    if (action === "next") state.jvmTable.page = Math.min(total, state.jvmTable.page + 1);
    if (action === "last") state.jvmTable.page = total;
    renderKeepingWorkspacePosition();
    return;
  }

  const jvmRow = event.target.closest("[data-jvm-row-epoch]");
  if (jvmRow) {
    const epoch = Number(jvmRow.dataset.jvmRowEpoch);
    if (!epoch) return;
    // Toggle selection: click again to deselect
    if (state.jvmGc.selectedEpoch === epoch) {
      state.jvmGc.selectedEpoch = null;
      document.querySelectorAll("[data-jvm-row-epoch]").forEach(r => r.style.background = "");
    } else {
      state.jvmGc.selectedEpoch = epoch;
      document.querySelectorAll("[data-jvm-row-epoch]").forEach(r => {
        r.style.background = Number(r.dataset.jvmRowEpoch) === epoch ? "rgba(93,183,255,.15)" : "";
      });
    }
    drawJvmCharts();
    return;
  }

  const jump = event.target.closest("[data-jump]");
  if (jump) {
    focusSocket(jump.dataset.jump, "Chosen from navigation jump");
    state.activeTab = "sockets";
    render();
    return;
  }

  const socket = event.target.closest("[data-socket]");
  if (socket && !event.target.closest("button, input, label, select, textarea, a, [role='button'], .row-menu, .table-settings-menu, .column-tooltip")) {
    focusSocket(socket.dataset.socket, "Chosen by clicking a row");
    state.openConversationInsightKey = null;
    state.openConversationInsightPos = null;
    renderKeepingWorkspacePosition();
    return;
  }
});


// Keyboard shortcuts for export
document.addEventListener("keydown", e => {
  if (!e.ctrlKey || !e.shiftKey) return;
  if (e.key === "P") { e.preventDefault(); openIncidentReport(); }
  if (e.key === "H") { e.preventDefault(); exportIncidentReportHtml(); }
  if (e.key === "Z") { e.preventDefault(); exportEvidencePack().catch(() => {}); }
  if (e.key === "J") { e.preventDefault(); copyTextToClipboard(buildJiraReport()); toast("Jira report copied", "Paste into a Jira ticket."); }
  if (e.key === "F") { e.preventDefault(); exportFixSpikeCsv(); }
});

// Dark/light auto from OS preference
if (!localStorage.getItem("theme")) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (!prefersDark && state.prefs.theme !== "light") { state.prefs.theme = "light"; document.documentElement.dataset.theme = "light"; }
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => { state.prefs.theme = e.matches ? "dark" : "light"; document.documentElement.dataset.theme = state.prefs.theme; render(); });
}

// Undo stack
const _undoStack = [];
function pushUndo() { _undoStack.push({ activeTab: state.activeTab, selectedId: state.selectedId, chartZoom: { ...state.chartZoom }, view: state.view }); if (_undoStack.length > 20) _undoStack.shift(); }
function popUndo() { const prev = _undoStack.pop(); if (prev) { Object.assign(state, prev); render(); toast("Undo", "Reverted to previous state."); } }

// Keyboard shortcuts
document.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
  const sockets = state.sockets;
  if (e.key === "j" && !e.ctrlKey) { const idx = sockets.findIndex(s => s.id === state.selectedId); const next = sockets[Math.min(sockets.length - 1, idx + 1)]; if (next) { pushUndo(); state.selectedId = next.id; render(); } }
  if (e.key === "k" && !e.ctrlKey) { const idx = sockets.findIndex(s => s.id === state.selectedId); const prev = sockets[Math.max(0, idx - 1)]; if (prev) { pushUndo(); state.selectedId = prev.id; render(); } }
  if (e.key === "r" && !e.ctrlKey && !e.metaKey) { pushUndo(); state.chartZoom = { start: 0, end: 1 }; render(); }
  if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); popUndo(); }
  if (e.key === "k" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); toggleCommandPalette(); }
  if (e.key === "?" && !e.ctrlKey) { state.modal = state.modal === "shortcuts" ? null : "shortcuts"; render(); }
});

// File drag & drop zone
document.addEventListener("dragover", e => { e.preventDefault(); document.querySelector(".drop-zone")?.classList.add("dragover"); });
document.addEventListener("dragleave", e => { if (!e.relatedTarget || !document.contains(e.relatedTarget)) document.querySelector(".drop-zone")?.classList.remove("dragover"); });
document.addEventListener("drop", e => {
  e.preventDefault();
  document.querySelector(".drop-zone")?.classList.remove("dragover");
  const files = [...(e.dataTransfer?.files || [])].filter(f => /\.(log|txt|out|ss|gz|zip)$/i.test(f.name));
  if (!files.length) return;
  if (files.length === 1) { importFile(files[0]); return; }
  // Multi-file: first file = baseline, second = incident, auto-compare
  (async () => {
    await importFile(files[0]);
    state.baseline = createBaseline();
    state.baseline.role = "healthy";
    state.baseline.label = files[0].name;
    toast("Baseline set", `${files[0].name} loaded as baseline (${state.sockets.length} sockets).`);
    await importFile(files[1]);
    state.activeTab = "compare";
    render();
    toast("Comparison ready", `${files[0].name} vs ${files[1].name} — switch to Compare tab.`);
  })();
});

// Topbar shrink on scroll + back to top
const _backToTop = document.getElementById("backToTop");
document.querySelector("#app").addEventListener("scroll", e => {
  const ws = e.target.closest?.(".workspace");
  if (!ws) return;
  document.querySelector(".topbar")?.classList.toggle("compact", ws.scrollTop > 40);
  _backToTop.classList.toggle("visible", ws.scrollTop > 300);
}, true);
_backToTop.addEventListener("click", () => { document.querySelector(".workspace")?.scrollTo({ top: 0, behavior: "smooth" }); });

// Socket hover card
// Mouse spotlight on panels
document.querySelector("#app").addEventListener("mousemove", e => {
  const panel = e.target.closest(".panel, .advisor-card, .guided-checklist-card");
  if (panel) { const r = panel.getBoundingClientRect(); panel.style.setProperty("--mouse-x", `${e.clientX - r.left}px`); panel.style.setProperty("--mouse-y", `${e.clientY - r.top}px`); }
}, { passive: true });

// Ripple effect on buttons
document.addEventListener("pointerdown", e => {
  const btn = e.target.closest("button:not(.icon)");
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  const size = Math.max(r.width, r.height);
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size/2}px;top:${e.clientY - r.top - size/2}px`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);
});

// Double-click to zoom charts
document.querySelector("#app").addEventListener("dblclick", e => {
  const svg = e.target.closest("svg.chart");
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  const xRatio = (e.clientX - rect.left) / rect.width;
  const z = state.chartZoom;
  const range = z.end - z.start;
  const center = z.start + xRatio * range;
  const newRange = range / 2;
  state.chartZoom = clampZoomRange({ start: center - newRange / 2, end: center + newRange / 2 });
  render();
});
document.querySelector("#app").addEventListener("contextmenu", e => {
  if (!e.target.closest("svg.chart")) return;
  e.preventDefault();
  const z = state.chartZoom;
  const range = z.end - z.start;
  const center = (z.start + z.end) / 2;
  const newRange = Math.min(1, range * 2);
  state.chartZoom = clampZoomRange({ start: center - newRange / 2, end: center + newRange / 2 });
  render();
});

// Command palette
function toggleCommandPalette() {
  if (state.modal === "commandPalette") { state.modal = null; render(); return; }
  state.modal = "commandPalette"; state.commandPaletteQuery = ""; render();
  setTimeout(() => document.querySelector("#cmdPaletteInput")?.focus(), 50);
}

// App context for extracted modules
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
window._ctx = ctx;

window._debug = { get state() { return state; }, snapshots: () => parsedTimestampSnapshots() };

render();
