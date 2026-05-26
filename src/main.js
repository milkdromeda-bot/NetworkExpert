import { FIELD_DOCS, FIELD_GUIDANCE, SAMPLE, SS_OPTIONS, generateIncidentDemoSample, generateMicroburstSample, generateSlowConsumerSample, generateTailLatencySample, generateTenMinuteSample, prefsDefault } from "./data.js";
import { metricValue, parseTimestampLine } from "./parser.js";
import { analyzeAll, applyRisks } from "./analysis.js";
import { importSocketFile } from "./importer.js?v=20260425-2";
import { socketMatchesAdvancedQuery } from "./search.js";
import { defaultAlertRules, evaluateAlertRules as evaluateAlertRuleEvents, loadAlertAcks, loadAlertRules, saveAlertAcks as persistAlertAcks, saveAlertRules as persistAlertRules } from "./alerts.js";
import { ANALYSIS_TEMPLATES, DASHBOARD_PRESETS, applyAnalysisTemplate as applyTemplateProfile, applyDashboardPreset as applyDashboardPresetProfile, applyDashboardProfile as applySavedDashboardProfile, dashboardSnapshot as createDashboardSnapshot } from "./profiles.js";
import { buildComparison as buildBaselineComparison, createBaseline as createBaselineSnapshot, buildBaselineNarrative } from "./compare.js";
import { ipIntelDetail, ipIntelSummary, publicPeerIps } from "./ip-intel.js";
import { aggregateParsedSocketsByKey, aggregateTimestampedSockets, buildSocketHistoryFromSnapshots, parsedTimestampSnapshots as parseTimestampedSnapshots, socketIdentityKey, socketKey, timestampBlocks as splitTimestampBlocks, withStableSocketIds } from "./timeline.js";
import { detectMicroburstWindow } from "./microburst.js";
import { detectTailLatencyLens } from "./tail-latency.js";
import { applyContextAction, openTopologyModal, setActiveInvestigation } from "./navigation.js";
import { aliasCountForSource, aliasDisplay, aliasForEndpoint, aliasListForSource, deleteEndpointAlias, normalizeAliasStore, upsertEndpointAlias } from "./aliases.js";
import { deleteTopologyGroup, endpointHost, layoutTopologyLanePositions, normalizeTopologyProfile, topologyGroupForEndpoint, topologyScopeKey, upsertTopologyGroup } from "./topology.js";
import { buildExecutiveSummary, pickExecutiveFocusSocket } from "./executive-summary.js";
import { buildDiagnosticHypotheses } from "./diagnostics.js";
import { buildRootCauseMatrix } from "./root-cause-matrix.js";
import { detectTimelineStories } from "./timeline-stories.js";
import { detectMultiSocketCorrelation } from "./multi-socket-correlation.js";
import { detectRateOfChange } from "./rate-of-change.js";
import { buildIncidentReportHtml as generateIncidentReport } from "./incident-report.js";
import { buildAiSummary } from "./ai-summary.js";
import { playbookForHypothesis, resolvePlaybook } from "./playbooks.js";
import { analyzeBdpWindowLimit } from "./bdp-window-analysis.js";
import { analyzeCaptureQuality } from "./capture-quality.js";
import { parseGcLog, classifyPause, g1Recommendations, RECOMMENDED_JVM_LOGGING } from "./gc-log-parser.js";
import { alignTimestamps, correlateJvmStalls, DEFAULT_WINDOWS as JVM_DEFAULT_WINDOWS } from "./jvm-correlation.js";
import { parsePidstat, parseNstat, correlateCpuWithStalls, extractTcpCounters } from "./pidstat-parser.js";
import { parseFixLog, computeFixStats, extractEndpoints } from "./fix-log-parser.js";
import { correlateFixLatency, DEFAULT_WINDOWS as FIX_DEFAULT_WINDOWS } from "./fix-correlation.js";
import { parseVmstat, parseNstatTimestamped, vmstatSummary } from "./vmstat-parser.js";
import { buildSsCollectionCommand, commandCoverage, toggleCommandOption } from "./ss-command.js";
import { validateSsCommandConfig } from "./ss-command-validation.js";
import { annotationDefaultLabel, annotationTypeLabel, annotationTypeList, annotationsForContext, buildAnnotationAnchorOptions, buildAnnotationDraft, normalizeAnnotations } from "./annotations.js";
import { buildAnomaliesCsv, buildEvidenceManifest, buildTimelinePayload, buildTopSocketsCsv, safeEvidenceFileName } from "./evidence-pack.js";
import { applyChartZoomOperation, clampZoomRange, zoomForMetric, zoomRangeFromDragSelection } from "./chart-zoom.js";
import { inferApplicationService } from "./services.js";
import { applyServiceOverride, deleteServiceOverride, normalizeServiceOverrideStore, serviceOverrideForSocket, upsertServiceOverride } from "./service-overrides.js";
import { TABLE_STATE_STORAGE_KEY, buildSocketOptionSets, buildVisibleColumnOrder, normalizeTableState, resetTableColumns, resetTableSort, setTableColumnVisibility, tableFilterCacheKey, tableStateSnapshot, toggleTableColumnPin, toggleTableColumnVisibility } from "./table-state.js";
import { ACCESS_ROLES, COMMON_TIME_ZONES, EXPERT_DEFAULT_THRESHOLDS, INGEST_RAW_EAGER_LIMIT, LINUX_PROFILES, UBUNTU_PROFILES, cloneThresholds } from "./expert-config.js";
import { applyTableColumnSearchFilter, renderTableSettingsDrawer as renderTableSettingsDrawerView, renderTableSettingsMenu as renderTableSettingsMenuView, renderTableSettingsTrigger as renderTableSettingsTriggerView, tableSettingsPlacement } from "./table-settings-view.js";
import { columnHelp as columnHelpView, renderColumnTooltip as renderColumnTooltipView, renderThresholdSummary as renderThresholdSummaryView } from "./column-help-view.js";
import { createTableColumns } from "./table-columns.js";
import { renderSocketTableView, renderTableHeader } from "./socket-table-view.js";
import { createGuideView } from "./guide-view.js";
import { createModalView } from "./modal-view.js";
import { downloadBlob, drawPdfSection, drawPdfTextBlock, reportChartDataUrl, svgToPngBlob } from "./report-utils.js";
import { buildAdvisorFindings as buildAdvisorFindingsModel } from "./advisor-findings.js";
import { buildPrintableIncidentReportHtml } from "./printable-incident-report.js";
import { buildJiraReport as buildJiraReportModel } from "./jira-report.js";
import { renderIngestPage as renderIngestPageView } from "./ingest-view.js";
import { computeHealthScore } from "./health-score.js";
import { compressSnapshots, decompressSnapshot, iterateCompressed } from "./snapshot-compression.js";
import { sharedBufferAvailable, encodeShared } from "./shared-buffer.js";

const TABLE_COLUMNS = createTableColumns({
  riskRank,
  escapeHtml,
  applicationServiceSortKey: currentApplicationServiceSortKey,
  renderApplicationServiceChip,
  renderTableMetricCell,
  socketBandwidth,
  renderEndpointCell,
  renderPeerCell,
  metricValue
});

const TABLE_COLUMN_BY_KEY = new Map(TABLE_COLUMNS.map(column => [column.key, column]));
const TABLE_SORT_COLLATOR = new Intl.Collator("fr", { numeric: true });
const CONVERSATION_SORT_COLLATOR = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });
const SERVICE_MAP_SORT_COLLATOR = new Intl.Collator("en", { numeric: true });
const DEFAULT_TABLE_VISIBLE_COLUMNS = TABLE_COLUMNS.filter(col => col.defaultVisible !== false).map(col => col.key);
const DEFAULT_TABLE_ORDER = TABLE_COLUMNS.map(col => col.key);
const tableDefaultsCache = new Map();
const dateTimeFormatterCache = new Map();
const numberFormatterCache = new Map();
const numberSeparatorCache = new Map();
const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const APP_VERSION = "1.0.0.0";
const APP_SPLASH_IMAGE = "./images/ultimateNetworkExpert.png";
function defaultTableColumns() {
  return [...DEFAULT_TABLE_VISIBLE_COLUMNS];
}

function normalizeSsEditorTheme(value) {
  return SS_EDITOR_THEMES.some(theme => theme.id === value) ? value : DEFAULT_SS_EDITOR_THEME;
}

function normalizeBdpDirection(value) {
  return value === "outbound" ? "outbound" : "inbound";
}

function configuredLinkCapacityMbps() {
  const value = Number(state?.prefs?.configuredLinkCapacityMbps || 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function ssCommandTimestamp(date = new Date()) {
  const pad = value => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function defaultSsLogPath(date = new Date()) {
  return `/tmp/networkexpert_ss_${ssCommandTimestamp(date)}.log`;
}

function defaultSsCommandConfig() {
  return { timestamp: true, loop: false, intervalSeconds: "1", srcIp: "", srcPort: "", dstIp: "", dstPort: "", outputPath: defaultSsLogPath(), appendOutput: true };
}

function parseUiIntervalSeconds(value) {
  const number = Number(String(value || "1").trim().replace(",", "."));
  return Number.isFinite(number) ? number : 1;
}

function applySsEditorThemePreview(value) {
  const theme = normalizeSsEditorTheme(value);
  const panel = document.querySelector(".ingest-source-panel");
  if (!panel) return;
  SS_EDITOR_THEMES.forEach(item => panel.classList.remove(`ss-editor-theme-${item.id}`));
  panel.classList.add(`ss-editor-theme-${theme}`);
}

function resetSsEditorThemePreview() {
  applySsEditorThemePreview(state.prefs.ssEditorTheme);
}

function defaultTableFilters() {
  return {
    text: "",
    risk: "all",
    state: "all",
    family: "all",
    minRecvQ: "",
    minSendQ: "",
    minRtt: "",
    srcIp: "",
    dstIp: "",
    srcPort: "",
    dstPort: "",
    process: "",
    onlyAnomalies: false
  };
}

function hasActiveTableFilters(filters = state?.table?.filters) {
  const defaults = defaultTableFilters();
  return Object.keys(defaults).some(key => {
    if (key === "onlyAnomalies") return Boolean(filters?.onlyAnomalies);
    return String(filters?.[key] ?? defaults[key] ?? "").trim() !== String(defaults[key] ?? "").trim();
  });
}

function defaultTableState(pageSize = prefsDefault.defaultPageSize) {
  return {
    page: 1,
    pageSize,
    sortKey: "risk",
    sortDir: "desc",
    pinned: ["risk", "state", "local"],
    visible: defaultTableColumns(),
    order: [...DEFAULT_TABLE_ORDER],
    filters: defaultTableFilters()
  };
}

function tableDefaults() {
  const pageSize = Number(state?.prefs?.defaultPageSize || prefsDefault.defaultPageSize);
  if (!tableDefaultsCache.has(pageSize)) tableDefaultsCache.set(pageSize, defaultTableState(pageSize));
  return tableDefaultsCache.get(pageSize);
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

import { icons } from "./icons.js";
import { ANALYSIS_TAB_GUIDE, PRE_IMPORT_PRESETS, EXPERT_CORRELATIONS, SS_EDITOR_THEMES, DEFAULT_SS_EDITOR_THEME, SS_OPTION_INTEL, CONVERSATION_SORT_LABELS } from "./constants.js";
import { html, escapeHtml, truncateMiddle } from "./utils.js";
import { createAppContext } from "./app-context.js";
import { renderTimelineHeatmap as renderHeatmapView } from "./heatmap-view.js";
import { metricLabel as _metricLabel, METRIC_LABELS } from "./formatters.js";
import { renderBaselineNarrative as _renderBaselineNarrative, renderDelta as _renderDelta } from "./comparison-view.js";
import { renderAdvisorGlobalSummary as _renderAdvisorGlobalSummary } from "./advisor-summary-view.js";
import { renderMetricsStatsTable as _renderMetricsStatsTable } from "./stats-table-view.js";
import { renderChartsGlobalToolbar as _renderChartsGlobalToolbar } from "./charts-toolbar-view.js";
import { dashboardPresetIcon, renderDashboardPresetPicker as _renderDashboardPresetPicker, renderDashboardStudioInline as _renderDashboardStudioInline, renderDashboardStudio as _renderDashboardStudio } from "./dashboard-view.js";
import { renderCaptureQualityReportView } from "./capture-quality-view.js";
import { renderSsCommandBuilder as renderSsCommandBuilderView, renderSsOptionChip as renderSsOptionChipView, renderSsOptionControl as renderSsOptionControlView, renderSsOptionDetail as renderSsOptionDetailView, selectedSsOption as selectedSsOptionView, ssOptionIntel as ssOptionIntelView } from "./ss-command-view.js";
import { renderPrefsView } from "./preferences-view.js";
import { analysisTabGuide as analysisTabGuideView, renderAnalysisPageView, renderAnalysisTabsView } from "./analysis-shell-view.js";
import { metricCorrelations, metricDiagnosticGuidance, metricInterpretation, metricReliabilityProfile, metricSource } from "./metric-intelligence.js";
import { buildGuidedChecklistItems } from "./guided-checklist.js";
import { buildServiceMapData, buildServiceMapRoutes, serviceMapConnectivityOrder as orderServiceMapConnectivity } from "./service-map-model.js";

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
  localStorage.setItem("networkExpertPrefs", JSON.stringify(state.prefs));
}

function loadTableState(pageSize = prefsDefault.defaultPageSize) {
  const defaults = defaultTableState(pageSize);
  try {
    return normalizeTableState({
      ...defaults,
      ...JSON.parse(localStorage.getItem(TABLE_STATE_STORAGE_KEY) || "{}")
    }, TABLE_COLUMNS, defaults);
  } catch {
    return normalizeTableState(defaults, TABLE_COLUMNS, defaults);
  }
}

function saveTableState() {
  state.table = normalizeTableState(state.table, TABLE_COLUMNS, tableDefaults());
  localStorage.setItem(TABLE_STATE_STORAGE_KEY, JSON.stringify(tableStateSnapshot(state.table)));
}

function clearVisibleHistoryCache() {
  if (!state?.cache) return;
  state.cache.visibleHistoryKey = "";
  state.cache.visibleHistoryRows = null;
  state.cache.visibleHistoryRowsByKey?.clear();
}

function loadAnnotations() {
  try {
    return normalizeAnnotations(JSON.parse(localStorage.getItem("networkExpertAnnotations") || "[]"));
  } catch {
    return [];
  }
}

function saveAnnotations() {
  state.annotations = normalizeAnnotations(state.annotations);
  localStorage.setItem("networkExpertAnnotations", JSON.stringify(state.annotations));
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

function loadFilterHistory() {
  try {
    return JSON.parse(localStorage.getItem("networkExpertFilterHistory") || "[]");
  } catch {
    return [];
  }
}

function saveFilterHistory() {
  localStorage.setItem("networkExpertFilterHistory", JSON.stringify(state.filterHistory.slice(0, 40)));
}

function loadTableProfiles() {
  try {
    return JSON.parse(localStorage.getItem("networkExpertTableProfiles") || "[]");
  } catch {
    return [];
  }
}

function saveTableProfiles() {
  localStorage.setItem("networkExpertTableProfiles", JSON.stringify(state.tableProfiles.slice(0, 30)));
}

function loadDashboardProfiles() {
  try {
    return JSON.parse(localStorage.getItem("networkExpertDashboardProfiles") || "[]");
  } catch {
    return [];
  }
}

function saveDashboardProfiles() {
  localStorage.setItem("networkExpertDashboardProfiles", JSON.stringify(state.dashboardProfiles.slice(0, 24)));
}

function loadServiceAliases() {
  try {
    return normalizeAliasStore(JSON.parse(localStorage.getItem("networkExpertServiceAliases") || "{}"));
  } catch {
    return {};
  }
}

function saveServiceAliases() {
  localStorage.setItem("networkExpertServiceAliases", JSON.stringify(normalizeAliasStore(state.serviceAliases)));
}

function loadServiceOverrides() {
  try {
    return normalizeServiceOverrideStore(JSON.parse(localStorage.getItem("networkExpertServiceOverrides") || "{}"));
  } catch {
    return normalizeServiceOverrideStore({});
  }
}

function saveServiceOverrides() {
  localStorage.setItem("networkExpertServiceOverrides", JSON.stringify(normalizeServiceOverrideStore(state.serviceOverrides)));
}

function loadTopologyProfiles() {
  try {
    const saved = JSON.parse(localStorage.getItem("networkExpertTopologyProfiles") || "{}");
    return Object.fromEntries(Object.entries(saved).map(([scope, profile]) => [scope, normalizeTopologyProfile(profile)]));
  } catch {
    return {};
  }
}

function loadTopologyForSource(sourceName) {
  return normalizeTopologyProfile(loadTopologyProfiles()[topologyScopeKey(sourceName)]);
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
  localStorage.setItem("networkExpertTopologyProfiles", JSON.stringify(state.topologyProfiles));
}

function saveAlertRules() {
  persistAlertRules(state.alertRules);
}

function saveAlertAcks() {
  persistAlertAcks(state.alertAcks);
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
  return {
    timestamp: Boolean(document.querySelector("#ssCmdTimestamp")?.checked),
    loop: Boolean(document.querySelector("#ssCmdLoop")?.checked),
    intervalSeconds: document.querySelector("#ssCmdInterval")?.value.trim() || "1",
    srcIp: document.querySelector("#ssCmdSrcIp")?.value.trim() || "",
    srcPort: document.querySelector("#ssCmdSrcPort")?.value.trim() || "",
    dstIp: document.querySelector("#ssCmdDstIp")?.value.trim() || "",
    dstPort: document.querySelector("#ssCmdDstPort")?.value.trim() || "",
    outputPath: document.querySelector("#ssCmdOutputPath")?.value.trim() || "",
    appendOutput: Boolean(document.querySelector("#ssCmdAppend")?.checked)
  };
}

function updateSsCommandValidation(validation) {
  const ids = {
    intervalSeconds: "ssCmdInterval",
    srcIp: "ssCmdSrcIp",
    srcPort: "ssCmdSrcPort",
    dstIp: "ssCmdDstIp",
    dstPort: "ssCmdDstPort"
  };
  Object.entries(ids).forEach(([key, id]) => {
    const result = validation.fields[key] || { valid: true, message: "" };
    const input = document.querySelector(`#${id}`);
    const label = input?.closest(".ss-field");
    const message = document.querySelector(`[data-ss-field-msg="${key}"]`);
    input?.setAttribute("aria-invalid", result.valid === false ? "true" : "false");
    input?.setCustomValidity(result.valid === false ? result.message : "");
    label?.classList.toggle("invalid", result.valid === false);
    label?.classList.toggle("warning", result.valid !== false && result.level === "warning");
    if (message) message.textContent = result.message || (key === "intervalSeconds" ? "e.g. 0.01" : "");
  });
  document.querySelector("#commandInput")?.classList.toggle("ss-command-stale", !validation.valid);
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
  state.anomalies = analyzeAll(state.sockets);
  state.healthScore = computeHealthScore(state.sockets);
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
  state.anomalies = analyzeAll(state.sockets);
  state.healthScore = computeHealthScore(state.sockets);
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
    .filter(ip => !state.ipIntel[ip] || state.ipIntel[ip].status === "error")
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

function endpointPresentation(endpoint) {
  const alias = currentAliasForEndpoint(endpoint);
  return {
    endpoint,
    label: alias?.label || endpoint,
    role: alias?.role || "",
    note: alias?.note || "",
    alias
  };
}

function currentAliasForEndpoint(endpoint, options = {}) {
  return aliasForEndpoint(state.serviceAliases, endpoint, state.sourceName, options);
}

function currentAliasDisplay(endpoint, options = {}) {
  return aliasDisplay(endpoint, state.serviceAliases, state.sourceName, options);
}

function nodeLabel(node) {
  return node.alias?.label || node.label;
}

function nodeSubtitle(node) {
  if (node.kind === "process") return `${formatNumber(node.count)} socket(s)`;
  return node.alias?.label ? node.endpoint : "";
}

function serviceMapGroupBands(lanes, positions) {
  const bands = [];
  for (const lane of lanes.filter(item => item.key !== "processes")) {
    let run = null;
    const closeRun = () => {
      if (!run) return;
      const ys = run.nodes.map(node => positions[node.id]?.y).filter(Number.isFinite);
      if (ys.length) {
        const top = Math.min(...ys) - 60;
        const bottom = Math.max(...ys) + 42;
        bands.push({
          group: run.group,
          x: lane.x - 166,
          y: top,
          width: 332,
          height: bottom - top,
          labelY: top + 26
        });
      }
      run = null;
    };
    for (const node of lane.nodes) {
      const group = node.topologyGroup;
      if (!group) {
        closeRun();
        continue;
      }
      if (!run || run.group.id !== group.id) {
        closeRun();
        run = { group, nodes: [] };
      }
      run.nodes.push(node);
    }
    closeRun();
  }
  return bands;
}

function renderMapLegend() {
  return `<div class="map-legend" aria-label="Map legend">
    <span><i class="legend-line low"></i> normal</span>
    <span><i class="legend-line high"></i> high risk</span>
    <span><i class="legend-line critical"></i> critical</span>
    <span><i class="legend-box"></i> topology group</span>
    <span><i class="legend-dot"></i> editable endpoint</span>
  </div>`;
}

function edgeAnomalies(edge) {
  return state.anomalies
    .filter(anomaly => anomaly.socketId === edge.socket.id)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function renderHotPaths(hotPaths) {
  return `<aside class="map-side-panel hot-paths">
    <strong>Hot paths</strong>
    ${hotPaths.map(edge => {
      const peerAlias = currentAliasForEndpoint(edge.socket.peer);
      return `<article class="hot-path ${edge.risk}" data-socket="${escapeHtml(edge.socket.id)}">
      <span class="risk ${edge.risk}">${escapeHtml(edge.risk)}</span>
      <p>${escapeHtml(edge.socket.details.process?.name || "unknown")} -> ${escapeHtml(currentAliasDisplay(edge.socket.peer))}</p>
      ${peerAlias?.role ? `<em>${escapeHtml(peerAlias.role)}</em>` : ""}
      <small>${formatNumber(edge.anomalies)} anomaly signal(s), Send-Q ${formatMetricValue("sendQ", edge.socket.sendQ)}, RTT ${formatMetricValue("rtt", metricValue(edge.socket, "rtt"))}</small>
    </article>`;
    }).join("")}
  </aside>`;
}

function renderMapEdgeInsight(edge) {
  const socket = edge.socket;
  const anomalies = edgeAnomalies(edge);
  const localGroup = topologyGroupForEndpoint(state.topology, socket.local);
  const peerGroup = topologyGroupForEndpoint(state.topology, socket.peer);
  const topMetric = [
    ["TX", "tx_bps", socketBandwidth(socket, "tx_bps")],
    ["RX", "rx_bps", socketBandwidth(socket, "rx_bps")],
    ["Send-Q", "sendQ", socket.sendQ],
    ["Recv-Q", "recvQ", socket.recvQ],
    ["RTT", "rtt", metricValue(socket, "rtt")],
    ["RTO", "rto", metricValue(socket, "rto")],
    ["Drops", "skmem.d", metricValue(socket, "skmem.d")]
  ];
  return `<aside class="map-side-panel link-inspector ${edge.risk}">
    <header>
      <span class="tooltip-kicker">Link intelligence</span>
      <button class="icon" data-map-edge-close title="Close link inspector">${icons.x}</button>
    </header>
    <h3>${escapeHtml(currentAliasDisplay(socket.local))} -> ${escapeHtml(currentAliasDisplay(socket.peer))}</h3>
    <p class="link-endpoints">${escapeHtml(socket.local)} -> ${escapeHtml(socket.peer)}</p>
    <div class="link-badges">
      <span class="risk ${edge.risk}">${escapeHtml(edge.risk)}</span>
      <span>${escapeHtml(socket.family)} / ${escapeHtml(socket.state)}</span>
      <span>${formatNumber(anomalies.length)} anomalies</span>
    </div>
    <div class="link-groups">
      ${localGroup ? `<span><b>Local group</b>${escapeHtml(localGroup.name)}</span>` : ""}
      ${peerGroup ? `<span><b>Peer group</b>${escapeHtml(peerGroup.name)}</span>` : ""}
      ${socket.details.process?.name ? `<span><b>Process</b>${escapeHtml(socket.details.process.name)}${socket.details.process.pid ? `:${escapeHtml(socket.details.process.pid)}` : ""}</span>` : ""}
    </div>
    <div class="link-metrics">
      ${topMetric.map(([label, metric, value]) => `<article class="${thresholdSeverity(metric, Number(value || 0))}">
        <span>${escapeHtml(label)}</span>
        <strong>${formatMetricValue(metric, value)}</strong>
      </article>`).join("")}
    </div>
    ${anomalies.length ? `<section class="link-anomalies">
      <strong>Signals</strong>
      ${anomalies.slice(0, 4).map(anomaly => `<article class="${escapeHtml(anomaly.severity)}">
        <span class="risk ${escapeHtml(anomaly.severity)}">${escapeHtml(anomaly.severity)}</span>
        <div><b>${escapeHtml(anomaly.title)}</b><p>${escapeHtml(anomaly.detail || metricLabel(anomaly.metric || "socket"))}</p></div>
      </article>`).join("")}
    </section>` : `<div class="empty compact">No anomaly attached to this link.</div>`}
    <footer>
      <button data-map-edge-action="details" data-socket-id="${escapeHtml(socket.id)}">${icons.activity} Details</button>
      <button data-map-edge-action="chart" data-socket-id="${escapeHtml(socket.id)}">${icons.chart} Charts</button>
      ${anomalies.length ? `<button data-map-edge-action="anomalies" data-socket-id="${escapeHtml(socket.id)}">${icons.alert} Anomalies</button>` : ""}
    </footer>
  </aside>`;
}

function mapNodeTitle(node) {
  const lines = [];
  if (node.endpoint) lines.push(`Endpoint: ${node.endpoint}`);
  if (node.alias?.label) lines.push(`Label: ${node.alias.label}`);
  if (node.alias?.role) lines.push(`Role: ${node.alias.role}`);
  if (node.topologyGroup) {
    lines.push(`Topology group: ${node.topologyGroup.name}`);
    lines.push(`Match: ${node.topologyGroup.match}`);
    if (node.topologyGroup.note) lines.push(`Note: ${node.topologyGroup.note}`);
  }
  lines.push(`Risk: ${node.risk}`);
  lines.push(`Sockets: ${formatNumber(node.count)}`);
  if (node.anomalies) lines.push(`Anomalies: ${formatNumber(node.anomalies)}`);
  return lines.join("\n");
}

function buildServiceMap() {
  return buildServiceMapData({
    sockets: sortedFilteredSockets(),
    anomalyMap: anomaliesBySocketId(),
    topology: state.topology,
    endpointPresentation,
    topologyGroupForEndpoint,
    riskRank,
    socketBandwidth,
    sortCollator: SERVICE_MAP_SORT_COLLATOR
  });
}

function serviceMapConnectivityOrder(map) {
  return orderServiceMapConnectivity(map, { riskRank });
}

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
let _cachedDiagVersion = -1;
let _cachedDiagHypotheses = [];
let _cachedMatrixVersion = -1;
let _cachedMatrix = null;

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
    { icon: "ri-upload-cloud-line", title: "Import your ss capture", desc: "Paste output directly in the editor, open a file, or click <b>See it in action</b> for a demo.", view: "ingest" },
    { icon: "ri-brain-line", title: "Instant diagnosis", desc: "Click <b>Analyze</b> — the tool builds a Root Cause Matrix, causal stories, and multi-socket correlation.", view: "analysis" },
    { icon: "ri-line-chart-line", title: "Monitor in real-time", desc: "Charts with minimap, crosshair sync, zoom, and annotations. Toggle between chart and table view.", view: "charts" },
    { icon: "ri-file-pdf-line", title: "Export reports", desc: "PDF, HTML incident report, evidence ZIP, or Jira — one click to share findings.", view: "ingest" },
    { icon: "ri-settings-3-line", title: "Customize everything", desc: "Thresholds, layout, alerts, profiles — make it yours via the gear icon.", view: "ingest" }
  ];
  const step = steps[state.onboarding] || steps[0];
  const isLast = state.onboarding >= steps.length - 1;
  // Navigate to the correct view for this step
  if (step.view && state.view !== step.view) state.view = step.view;
  return `<div class="onboarding-overlay" data-tour-step="${state.onboarding}">
    <div class="onboarding-card">
      <div class="onboarding-progress">${steps.map((_, i) => `<span class="${i <= state.onboarding ? "active" : ""}"></span>`).join("")}</div>
      <div class="onboarding-icon"><i class="${step.icon}"></i></div>
      <h2>${step.title}</h2>
      <p>${step.desc}</p>
      <div class="onboarding-actions">
        <button data-action="skipOnboarding" class="onboarding-skip">Skip tour</button>
        <button data-action="${isLast ? "finishOnboarding" : "nextOnboarding"}" class="primary">${isLast ? "Start using" : "Next →"}</button>
      </div>
    </div>
  </div>`;
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
          <button class="icon" data-action="toggleDensity" title="Toggle compact/comfortable mode" aria-label="Toggle density"><i class="${state.prefs.density === "compact" ? "ri-expand-diagonal-line" : "ri-contract-line"}"></i></button>
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
      <nav class="breadcrumb" aria-label="Navigation">${state.view === "ingest" ? "Import" : state.view === "analysis" ? `Analysis → <button class="breadcrumb-dropdown-trigger" data-action="toggleBreadcrumbMenu">${state.activeTab} <i class="ri-arrow-down-s-line"></i></button>${state.breadcrumbMenuOpen ? `<div class="breadcrumb-menu">${["quality","diagnosis","advisor","templates","map","conversations","expert","timeline","alerts","compare","sockets","groups","anomalies","fields"].map(t => `<button data-tab="${t}" class="${t === state.activeTab ? "active" : ""}">${t}</button>`).join("")}</div>` : ""}` : state.view === "charts" ? `Monitoring → <button class="breadcrumb-dropdown-trigger" data-action="toggleBreadcrumbMenu">${state.chartsTab === "charts" ? "Metrics" : state.chartsTab === "bdp" ? "BDP" : state.chartsTab === "jvm" ? "JVM Stall" : state.chartsTab === "fix" ? "FIX Latency" : "Advisor"} <i class="ri-arrow-down-s-line"></i></button>${state.breadcrumbMenuOpen ? `<div class="breadcrumb-menu"><button data-charts-tab="charts">Metrics</button><button data-charts-tab="bdp">BDP</button><button data-charts-tab="jvm">JVM Stall</button><button data-charts-tab="fix">FIX Latency</button></div>` : ""}` : "Guide"}</nav>
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
          ${state.chartsTab === "charts" ? renderDashboardStudioInline() : ""}
        </nav>
        ${state.chartsTab === "charts" ? renderChartsGlobalToolbar() : ""}
        ${state.chartsTab === "charts" ? renderChartsPage() : ""}
        ${state.chartsTab === "bdp" ? renderBdpWindowPanel() : ""}
        ${state.chartsTab === "jvm" ? renderJvmGcPanel() : ""}
        ${state.chartsTab === "fix" ? renderFixLatencyPanel() : ""}
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

function renderIngestPage() {
  return renderIngestPageView(ingestViewDependencies());
}

function renderAnalysisPage() {
  return renderAnalysisPageView({
    state,
    html,
    icons,
    escapeHtml,
    formatNumber,
    formatMetricValue,
    renderExportMenu,
    renderAnalysisTabs,
    renderActiveTab,
    healthScore: state.healthScore || null
  });
}

function renderChartsGlobalToolbar() { return _renderChartsGlobalToolbar(ctx); }

function renderAdvisorGlobalSummary() { return _renderAdvisorGlobalSummary(ctx); }

function renderMetricsStatsTable(metrics) { return _renderMetricsStatsTable(ctx, metrics); }

function renderChartsPage() {
  const metrics = chartMetricList();
  const metricOptions = alphabeticalMetrics(metrics);
  const selected = socketsById().get(state.selectedId);
  const layout = state.prefs.chartLayout;
  const columns = clampChartColumns(layout.columns);
  const realTimeline = hasRealTimestampHistory();
  const orderedMetrics = orderedChartMetrics();
  const activeCorrelation = EXPERT_CORRELATIONS.find(item => item.x === state.correlation.x && item.y === state.correlation.y);
  const microburst = microburstSummary();
  return html`
    ${state.chartsTab === "advisor" ? `${renderInvestigationContext() || renderTailLatencyLensPanel() || renderAdvisorGlobalSummary()}` : ""}
    ${state.chartsTab === "charts" ? `<section class="panel ${layout.stickyToolbar ? "sticky-chart-panel" : ""}">
      <div class="panel-body">
        ${microburst ? `<div class="investigation-note ${microburst.severity}">
          <b>${escapeHtml(microburst.severity)}</b>
          <span>Microburst window ${escapeHtml(formatMicroburstWindow(microburst))} with RX peak ${escapeHtml(formatMetricValue("rx_bps", microburst.peakRxBps))}, Recv-Q ${escapeHtml(formatMetricValue("recvQ", microburst.peakRecvQ))}, skmem.r ${escapeHtml(formatMetricValue("skmem.r", microburst.peakSkmemR))}, and ${escapeHtml(formatMetricValue("skmem.d", microburst.dropDeltaTotal))} new drops.</span>
        </div>` : ""}
        <div class="metric-picks">
          ${metricOptions.map(m => `<label class="check inline"><input type="checkbox" data-chart-metric="${m}" ${state.chartMetrics.includes(m) ? "checked" : ""}/> ${escapeHtml(metricLabel(m))}</label>`).join("")}
        </div>
      </div>
    </section>

    ${state.metricsView === "table" ? renderMetricsStatsTable(orderedMetrics) : `<section class="chart-grid cols-${columns} density-${layout.density}">
      ${orderedMetrics.map((m, index) => `<div class="panel chart-card ${state.activeChartMetric === m ? "active-chart" : ""}${state.expandedChart === m ? " chart-expanded" : ""}" data-chart-card="${m}">
        ${state.storyMarkerPct != null && (!state.storyMarkerMetric || state.storyMarkerMetric === m) ? `<div class="story-marker-overlay" style="padding-left:${state.storyMarkerPct}%"><div class="story-marker-line"><span class="story-marker-label">${escapeHtml(state.storyMarkerTime || "")} ${escapeHtml((state.storyMarkerLabel || "").slice(0, 20))}</span></div></div>` : ""}
        <div class="panel-head">
          <div class="panel-title chart-title-wrap">
            <span>${escapeHtml(metricLabel(m))}</span>
            ${renderChartMetricTooltip(m)}
          </div>
          <div class="col-tools chart-card-tools">
            <button class="mini" data-action="expandChart" data-metric="${m}" title="${state.expandedChart === m ? "Collapse" : "Expand"}"><i class="${state.expandedChart === m ? "ri-collapse-diagonal-line" : "ri-expand-diagonal-line"}"></i></button>
            <button class="mini" data-chart-zoom="zoomIn" data-chart-zoom-metric="${m}" title="Zoom in">${icons.zoomIn}</button>
            <button class="mini" data-chart-zoom="zoomOut" data-chart-zoom-metric="${m}" title="Zoom out">${icons.zoomOut}</button>
            <button class="mini" data-chart-zoom="resetZoom" data-chart-zoom-metric="${m}" title="Reset zoom">${icons.reset}</button>
            <button class="mini" data-chart-zoom="panLeft" data-chart-zoom-metric="${m}" title="Pan left">${icons.arrowLeft}</button>
            <button class="mini" data-chart-zoom="panRight" data-chart-zoom-metric="${m}" title="Pan right">${icons.arrowRight}</button>
            <button class="mini" data-chart-png="${m}" title="Save as PNG"><i class="ri-image-line"></i></button>
            ${renderChartMoveMenu(m)}
          </div>
        </div>
        <div class="panel-body chart-card-body">
          <svg class="chart small-chart ${layout.density}" data-mini-chart="${m}" tabindex="0" role="img" aria-label="${escapeHtml(metricLabel(m))} chart"></svg>
          <canvas class="chart-minimap" data-minimap="${m}" aria-hidden="true"></canvas>
          ${renderMetricChartLegend(m)}
        </div>
      </div>`).join("")}
    </section>`}
    <section class="panel">
      <div class="panel-head"><div class="panel-title">Correlation between two stats</div></div>
      <div class="panel-body">
        <div class="chart-controls correlation-controls">
          <label class="chart-field">
            <span>Correlation</span>
            <select id="corrPreset">
              <option value="custom" ${activeCorrelation ? "" : "selected"}>Custom</option>
              ${EXPERT_CORRELATIONS.map(item => `<option value="${item.id}" ${activeCorrelation?.id === item.id ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
            </select>
          </label>
          <label class="chart-field">
            <span>X axis</span>
            <select id="corrX">${metricOptions.map(m => `<option value="${m}" ${state.correlation.x === m ? "selected" : ""}>${escapeHtml(metricLabel(m))}</option>`).join("")}</select>
          </label>
          <label class="chart-field">
            <span>Y axis</span>
            <select id="corrY">${metricOptions.map(m => `<option value="${m}" ${state.correlation.y === m ? "selected" : ""}>${escapeHtml(metricLabel(m))}</option>`).join("")}</select>
          </label>
        </div>
        ${activeCorrelation ? `<div class="correlation-advice"><i class="ri-lightbulb-flash-line"></i><div><strong>${escapeHtml(activeCorrelation.label)}</strong><span>${escapeHtml(activeCorrelation.reason)}</span></div></div>` : ""}
        <svg id="correlationChart" class="chart" role="img" aria-label="Correlation"></svg>
        <p class="hint">Each point corresponds to a timestamped snapshot or a local projection. Useful for checking whether RTT, queues, drops, or buffers rise together.</p>
      </div>
    </section>` : ""}
  `;
}

function renderDashboardPresetPicker(activePresetId, presetEntries) { return _renderDashboardPresetPicker(ctx, activePresetId, presetEntries); }
function renderDashboardStudioInline() { return _renderDashboardStudioInline(ctx); }
function renderDashboardStudio() { return _renderDashboardStudio(ctx); }
function renderTailLatencyLensPanel() {
  const lens = tailLatencyLens();
  if (!hasRealTimestampHistory() || !lens) return "";
  const rttStats = lens.stats.rtt;
  const rtoStats = lens.stats.rto;
  return `<section class="tail-latency-lens">
    <article class="tail-lens-card ${lens.severity}">
      <div class="tail-lens-head">
        <div>
          <span class="tooltip-kicker">Tail latency lens</span>
          <strong>${escapeHtml(lens.suspicion)}</strong>
          <p class="hint">This lens prioritizes extremes and short worst windows instead of averages, so the investigation can jump directly to the sharpest RTT/RTO tail behavior.</p>
        </div>
        <div class="tail-lens-actions">
          <span class="risk ${escapeHtml(lens.severity)}">${escapeHtml(lens.severity)}</span>
          <button data-action="zoomTailWindow">${icons.zoomIn} Zoom worst window</button>
        </div>
      </div>
      <div class="tail-lens-grid">
        <article><span>Worst window</span><strong>${escapeHtml(formatTailLatencyWindow(lens))}</strong></article>
        <article><span>RTT tail</span><strong>${escapeHtml(`${formatMetricValue("rtt", rttStats?.p99 || 0)} / ${formatMetricValue("rtt", rttStats?.p999 || 0)}`)}</strong><small>P99 / P99.9</small></article>
        <article><span>RTO tail</span><strong>${escapeHtml(`${formatMetricValue("rto", rtoStats?.p99 || 0)} / ${formatMetricValue("rto", rtoStats?.p999 || 0)}`)}</strong><small>P99 / P99.9</small></article>
        <article><span>Worst peaks</span><strong>${escapeHtml(`${formatMetricValue("rtt", lens.peaks.rtt)} RTT * ${formatMetricValue("rto", lens.peaks.rto)} RTO`)}</strong><small>${escapeHtml(`${formatMetricValue("recvQ", lens.peaks.recvQ)} Recv-Q * ${formatMetricValue("sendQ", lens.peaks.sendQ)} Send-Q`)}</small></article>
      </div>
    </article>
  </section>`;
}

function formatBytesHuman(value) {
  const bytes = Math.max(0, Number(value || 0));
  if (bytes >= 1024 * 1024) return `${numberFormatter(bytes >= 10 * 1024 * 1024 ? 0 : 1).format(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${numberFormatter(bytes >= 10 * 1024 ? 0 : 1).format(bytes / 1024)} KB`;
  return `${formatNumber(Math.round(bytes))} B`;
}

function bdpWindowAnalysis(rows = visibleHistory()) {
  const socket = socketsById().get(state.selectedId) || state.sockets[0] || null;
  return analyzeBdpWindowLimit(socket, {
    history: rows,
    direction: normalizeBdpDirection(state.prefs.bdpDirection),
    configuredLinkCapacityMbps: configuredLinkCapacityMbps(),
    recvWarn: thresholdFor("recvQ").warn
  });
}

function renderBdpSummaryCard(label, value, hint = "") {
  return `<article class="bdp-summary-card">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
    ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
  </article>`;
}

function renderBdpWindowPanel() {
  if (state._bdpCache && state._bdpCache.version === state.dataVersion && state._bdpCache.direction === state.prefs.bdpDirection && state._bdpCache.selectedId === state.selectedId) return state._bdpCache.html;
  const socket = socketsById().get(state.selectedId) || state.sockets[0] || null;
  const hasRealTimeline = hasRealTimestampHistory();
  const analysis = bdpWindowAnalysis();
  const stats = analysis.stats || {};
  const capacityValue = configuredLinkCapacityMbps();
  const capacityText = capacityValue ? `${capacityValue}` : "";
  const result = `<section class="panel bdp-window-panel">
    <div class="panel-head bdp-window-head">
      <div class="panel-title chart-title-wrap">
        <span>BDP & Window-Limited Throughput</span>
        ${renderChartInfo(
          "BDP & Window-Limited Throughput",
          "Compares observed socket throughput with the theoretical throughput allowed by the effective TCP window and RTT.",
          "Capacity is optional. Without configured capacity, this module does not claim the physical line rate."
        )}
      </div>
      <div class="bdp-controls">
        <label><span>Direction</span><select id="bdpDirectionSelect">
          <option value="inbound" ${state.prefs.bdpDirection !== "outbound" ? "selected" : ""}>Inbound - bytes_received</option>
          <option value="outbound" ${state.prefs.bdpDirection === "outbound" ? "selected" : ""}>Outbound - bytes_sent</option>
        </select></label>
        <label><span>Capacity</span><select id="bdpCapacityInput"><option value="" ${!capacityValue ? "selected" : ""}>unknown</option><option value="100" ${capacityValue === 100 ? "selected" : ""}>100 Mbps</option><option value="200" ${capacityValue === 200 ? "selected" : ""}>200 Mbps</option><option value="1000" ${capacityValue === 1000 ? "selected" : ""}>1 Gbps</option><option value="10000" ${capacityValue === 10000 ? "selected" : ""}>10 Gbps</option><option value="25000" ${capacityValue === 25000 ? "selected" : ""}>25 Gbps</option><option value="50000" ${capacityValue === 50000 ? "selected" : ""}>50 Gbps</option>${capacityValue && ![100,200,1000,10000,25000,50000].includes(capacityValue) ? `<option value="${capacityValue}" selected>${capacityValue} Mbps</option>` : ""}</select></label>
      </div>
    </div>
    <div class="panel-body">
      <div class="bdp-context-line ${analysis.status}">
        <span class="risk ${escapeHtml(analysis.severity)}">${escapeHtml(analysis.severity)}</span>
        <strong>${escapeHtml(analysis.hypothesis || "informational")}</strong>
        <em>${escapeHtml(analysis.evidence?.[0] || "capacity unknown; analysis based on observed throughput and TCP window.")}</em>
      </div>
      <div class="bdp-summary-grid">
        ${renderBdpSummaryCard("Socket", socket ? `${socket.local} -> ${socket.peer}` : "none", socket?.details?.process ? `${socket.details.process.name}:${socket.details.process.pid}` : "")}
        ${renderBdpSummaryCard("Observed peak", stats.peakObservedThroughputBps ? formatBitsPerSecond(stats.peakObservedThroughputBps) : "n/a", `${formatNumber(stats.computableSamples || 0)} computed samples`)}
        ${renderBdpSummaryCard("Window max peak", stats.peakWindowThroughputBps ? formatBitsPerSecond(stats.peakWindowThroughputBps) : "n/a", "rcv_space x 8 / RTT")}
        ${renderBdpSummaryCard("Observed BDP peak", stats.peakObservedBdpBytes ? formatBytesHuman(stats.peakObservedBdpBytes) : "n/a", "throughput x RTT")}
        ${renderBdpSummaryCard("Smallest window", stats.minEffectiveWindowBytes ? formatBytesHuman(stats.minEffectiveWindowBytes) : "n/a", analysis.series?.wscale?.scale != null ? `wscale ${analysis.series.wscale.scale}` : "no wscale")}
        ${renderBdpSummaryCard("Capacity", capacityValue ? formatBitsPerSecond(capacityValue * 1e6) : "unknown", capacityValue ? "user configured" : "no physical line-rate claim")}
      </div>
      ${hasRealTimeline ? `<div class="bdp-chart-toolbar">
          <button class="mini" data-chart-zoom="zoomIn" data-bdp-zoom title="Zoom in">${icons.zoomIn}</button>
          <button class="mini" data-chart-zoom="zoomOut" data-bdp-zoom title="Zoom out">${icons.zoomOut}</button>
          <button class="mini" data-chart-zoom="resetZoom" data-bdp-zoom title="Reset zoom">${icons.reset}</button>
          <button class="mini" data-chart-zoom="panLeft" data-bdp-zoom title="Pan left">${icons.arrowLeft}</button>
          <button class="mini" data-chart-zoom="panRight" data-bdp-zoom title="Pan right">${icons.arrowRight}</button>
        </div>
        <div class="bdp-chart-grid">
        <article>
          <div class="bdp-chart-title"><strong>Window-limited theoretical throughput</strong><span>Mbps over time</span></div>
          <svg class="chart bdp-chart" data-bdp-chart="throughput" role="img" aria-label="BDP throughput chart"></svg>
          <div class="bdp-legend" data-bdp-legend="1">
            ${bdpChartSeries({series: {capacityBps: null}}, "throughput").map(item => `<span data-series-key="${item.key}" style="cursor:pointer;${state.hiddenBdpSeries.has(item.key) ? "opacity:.4;text-decoration:line-through" : ""}"><i style="--legend-color:${item.color}"></i>${escapeHtml(item.label)}</span>`).join("")}
          </div>
        </article>
        <article>
          <div class="bdp-chart-title"><strong>Observed BDP vs effective window</strong><span>bytes over time</span></div>
          <svg class="chart bdp-chart" data-bdp-chart="bdp" role="img" aria-label="BDP and window chart"></svg>
          <div class="bdp-legend" data-bdp-legend="1">
            ${bdpChartSeries({series: {capacityBps: null}}, "bdp").map(item => `<span data-series-key="${item.key}" style="cursor:pointer;${state.hiddenBdpSeries.has(item.key) ? "opacity:.4;text-decoration:line-through" : ""}"><i style="--legend-color:${item.color}"></i>${escapeHtml(item.label)}</span>`).join("")}
          </div>
        </article>
      </div>` : `<div class="bdp-empty"><strong>Timestamped snapshots required</strong><span>Add timestamp markers before each ss snapshot to compute byte deltas, BDP, and window-limited throughput over time.</span></div>`}
      <details class="diagnosis-learn-more bdp-learn-more">
        <summary><i class="ri-book-open-line"></i> What this module can and cannot conclude</summary>
        <ul>${analysis.learnMore.map(entry => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>
      </details>
    </div>
  </section>`;
  state._bdpCache = { version: state.dataVersion, direction: state.prefs.bdpDirection, selectedId: state.selectedId, html: result };
  return result;
}

function renderJvmGcPanel() {
  const gc = state.jvmGc;
  const hasPauses = gc.pauses.length > 0;
  const corr = gc.correlation;
  const summary = corr?.summary;
  const jvmRows = jvmPagedRows(corr?.results || [], gc.safepoints || []);
  return `<section class="panel jvm-gc-panel">
    <div class="panel-head" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:8px 12px">
      <span style="font-weight:700;font-size:13px;color:var(--text);white-space:nowrap">JVM Stall / GC Correlation</span>
      ${hasPauses ? `<button class="jvm-clear-btn" data-action="clearJvmGcLog" title="Clear GC data"><i class="ri-delete-bin-line"></i> Clear</button>` : ""}
      ${hasPauses ? `<span class="jvm-sep"></span><div style="display:flex;gap:4px;margin:0 auto">
        <button class="mini" data-chart-zoom="zoomIn" data-jvm-zoom title="Zoom in">${icons.zoomIn}</button>
        <button class="mini" data-chart-zoom="zoomOut" data-jvm-zoom title="Zoom out">${icons.zoomOut}</button>
        <button class="mini" data-chart-zoom="resetZoom" data-jvm-zoom title="Reset zoom">${icons.reset}</button>
        <button class="mini" data-chart-zoom="panLeft" data-jvm-zoom title="Pan left">${icons.arrowLeft}</button>
        <button class="mini" data-chart-zoom="panRight" data-jvm-zoom title="Pan right">${icons.arrowRight}</button>
      </div><span class="jvm-sep"></span>` : ""}
      <div class="bdp-controls" style="margin-left:auto">

        <label style="margin-left:10px"><span>Severity</span><select id="jvmSeverityFilter"><option value="all"${state.jvmGc.severityFilter === "all" || !state.jvmGc.severityFilter ? " selected" : ""}>All</option><option value="info"${state.jvmGc.severityFilter === "info" ? " selected" : ""} style="color:#39d6d6">? Info+</option><option value="warning"${state.jvmGc.severityFilter === "warning" ? " selected" : ""} style="color:#ffd166">? Warning+</option><option value="warning_high"${state.jvmGc.severityFilter === "warning_high" ? " selected" : ""} style="color:#ff9f43">? Warning high+</option><option value="critical"${state.jvmGc.severityFilter === "critical" ? " selected" : ""} style="color:#ff5c77">? Critical</option></select></label>
        <label style="margin-left:10px"><span>Sync crosshair</span><input id="jvmSyncCrosshair" type="checkbox" ${state.jvmGc.syncCrosshair !== false ? "checked" : ""} style="width:auto;min-height:auto;height:16px"/></label>
        <label style="margin-left:10px"><span>Clock offset (ms)</span><input id="jvmClockOffset" type="number" value="${gc.clockOffsetMs}" step="1" style="width:80px"/></label>
      </div>
    </div>
    <div class="panel-body">
      ${!hasPauses ? `<div class="jvm-gc-import"><p>No GC log loaded. Use <strong>Auto-detect dir</strong> or the <strong>GC</strong> button in the Import tab to load a Java GC log.</p></div>` : `
        <div class="bdp-context-line ${summary?.overallSeverity || "info"}">
          <span class="field-info" tabindex="0" aria-label="Score interpretation" style="position:relative"><i class="ri-information-line"></i><span class="field-info-card" role="tooltip" style="left:0;right:auto"><span class="tooltip-kicker">Correlation score interpretation</span><strong>0.00 - 0.20</strong><p>No correlation. GC pause detected but no TCP symptom change observed in the time window.</p><strong>0.20 - 0.40 (info)</strong><p>Weak temporal correlation. A TCP signal appeared near the pause but counter-evidence or low buffer pressure reduces confidence.</p><strong>0.40 - 0.60 (warning)</strong><p>Moderate correlation. Multiple TCP symptoms (Recv-Q rise, rcv_space drop) coincide with the pause. Buffer pressure is significant.</p><strong>0.60 - 0.80 (warning_high)</strong><p>Strong correlation. Pause + buffer overflow risk + rcv_space collapse. JVM stall is a likely contributor to slow consumer behavior.</p><strong>0.80 - 1.00 (critical)</strong><p>Very strong correlation. Long pause or Full GC + persist/zero-window + confirmed flow disruption. JVM stall is the probable root cause.</p><strong>Counter-evidence reduces score:</strong><p>Pre-existing Recv-Q, retransmissions, RTT spikes, high Send-Q (downstream), or app_limited each subtract 0.15 from the score to avoid false positives.</p></span></span>
          <span class="risk ${escapeHtml(summary?.overallSeverity || "info")}">${escapeHtml(summary?.overallSeverity || "info")}</span>
          <strong>${summary?.correlatedCount || 0} correlated pauses / ${summary?.totalPauses || 0} in window${gc.analysisWindow ? ` (${gc.analysisWindow.filteredPauses}/${gc.analysisWindow.totalPauses} pauses in ss period)` : ""}</strong>
          <em>Max correlation score: ${(summary?.maxScore || 0).toFixed(2)}${gc.analysisWindow?.start ? ` · Analysis window: ${preciseDateTimeLabel(gc.analysisWindow.start)} → ${preciseDateTimeLabel(gc.analysisWindow.end)}` : ""}</em>
          <span style="margin-left:auto;font-size:11px;color:var(--soft)">${summary?.recommendations?.map(r => `<b style="color:${r.severity === "critical" ? "#ff5c77" : r.severity === "warning" ? "#ffd166" : "#39d6d6"}">${escapeHtml(r.severity)}</b> ${escapeHtml(r.text)}`).join(" · ") || ""}</span>
        </div>
        ${gc.cpuCorrelation?.summary ? `<div class="bdp-context-line info" style="margin-top:8px">
          <i class="ri-cpu-line" style="font-size:16px;color:#a78bfa"></i>
          <strong>CPU correlation: ${gc.cpuCorrelation.summary.correlatedCount} GC pause(s) with CPU scheduling issues</strong>
          <em>Max wait: ${gc.cpuCorrelation.summary.maxWaitObserved.toFixed(1)}% · Saturation events: ${gc.cpuCorrelation.summary.cpuSaturationEvents} · High cswch: ${gc.cpuCorrelation.summary.highContextSwitchEvents}</em>
        </div>` : ""}
        ${gc.nstat ? `<div class="bdp-context-line info" style="margin-top:4px">
          <i class="ri-bar-chart-line" style="font-size:16px;color:#7dd3fc"></i>
          <strong>nstat counters</strong>
          <em>Retrans: ${gc.nstat.retransSegs} · Timeouts: ${gc.nstat.timeouts} · ListenDrops: ${gc.nstat.listenDrops} · MemPressure: ${gc.nstat.tcpMemoryPressures} · RcvPruned: ${gc.nstat.rcvPruned}</em>
        </div>` : ""}
        <details style="padding:6px 12px;border-radius:8px;background:rgba(140,183,255,0.06);border:1px solid rgba(140,183,255,0.12);font-size:11px;color:var(--muted);line-height:1.5;margin:0 0 0 0"><summary style="cursor:pointer;color:var(--text);font-weight:600">How to read</summary>
          Each dot is a FIX message with lag > threshold. Dot color = <strong style="color:#ff5c77">correlation strength</strong> (not lag severity). 
          <br/><span style="color:#ff5c77">● critical</span> = strong evidence of network/GC/CPU cause.<br/>
          <span style="color:#ff9f43">● warning_high</span> = moderate-strong evidence.<br/>
          <span style="color:#ffd166">● warning</span> = moderate evidence.<br/>
          <span style="color:#39d6d6">● info</span> = weak.<br/>
          <span style="color:#8c9aab">● none</span> = no cause found (healthy socket at spike time).<br/>
          The scatter plot shows lag (X) vs correlation score (Y) — top-right = high lag with strong cause.
          <br/><strong>Note:</strong> nstat counters are host-wide (all sockets), not per-connection. On a busy host with many connections, nstat retrans may be coincidental — ss per-socket evidence is more reliable.
        </details>
        <div class="jvm-chart-section">
          <div class="bdp-chart-grid jvm-chart-grid">
            <article>
              <div class="bdp-chart-title"><strong>Recv-Q + GC pauses</strong><span>local receiver timeline</span></div>
              <svg class="chart bdp-chart" data-jvm-chart="recvq" role="img" aria-label="JVM GC correlation chart"></svg>
              ${renderJvmLegend("timeline")}
            </article>
            <article>
              <div class="bdp-chart-title"><strong>Pause duration vs Delta Recv-Q</strong><span>scatter</span></div>
              <svg class="chart bdp-chart" data-jvm-chart="scatter" role="img" aria-label="GC pause scatter plot"></svg>
              ${renderJvmLegend("scatter")}
            </article>
          </div>
        </div>
        ${corr?.results?.length > 5 ? `<div style="margin:8px 0"><div class="bdp-chart-title"><strong>Spike density heatmap</strong><span>time x lag</span></div><canvas data-fix-heatmap style="width:100%;height:80px;border-radius:6px;background:rgba(30,42,56,0.6)"></canvas></div>` : ""}
        <div class="jvm-gc-results">
          <div class="jvm-table-head">
            <strong>Correlated JVM stall events</strong>
            <span>${formatNumber(jvmRows.total)} row(s)</span>
          </div>
          ${renderJvmPagination(jvmRows.total, jvmRows.totalPages, jvmRows.start)}
          <div class="table-wrap jvm-table-wrap"><table class="mini-table jvm-gc-table"><thead><tr>
            ${renderJvmSortHeader("time", "Timestamp")}
            ${renderJvmSortHeader("nature", "Stall nature")}
            ${renderJvmSortHeader("id", "GC#")}
            ${renderJvmSortHeader("type", "Type")}
            ${renderJvmSortHeader("cause", "Cause")}
            ${renderJvmSortHeader("duration", "Duration")}
            ${renderJvmSortHeader("score", "Score")}
            ${renderJvmSortHeader("severity", "Severity")}
            ${renderJvmSortHeader("signals", "Signals")}
          </tr></thead><tbody>
            ${jvmRows.rows.map(r => `<tr class="jvm-severity-${escapeHtml(jvmSeverityClass(r.severity))}" data-jvm-row-epoch="${r.timestampMs || r.epochMs || ""}" style="cursor:pointer">
              <td class="mono-cell">${escapeHtml(preciseDateTimeLabel(r.timestampMs))}</td>
              <td><span class="jvm-nature">${escapeHtml(jvmStallNature(r))}</span></td>
              <td>${escapeHtml(String(r.eventId ?? r.pause.id))}</td>
              <td>${escapeHtml(r.pause.type || "-")}</td>
              <td>${escapeHtml(r.pause.cause || "-")}</td>
              <td>${Number(r.durationMs || 0).toFixed(1)} ms</td>
              <td>${Number(r.score || 0).toFixed(2)}</td>
              <td><span class="jvm-severity-pill ${escapeHtml(jvmSeverityClass(r.severity))}">${escapeHtml(jvmSeverityLabel(r.severity))}</span></td>
              <td>${escapeHtml(r.symptoms?.signals?.map(s => s.signal).join(", ") || "-")}</td>
            </tr>`).join("")}
          </tbody></table></div>
          ${renderJvmPagination(jvmRows.total, jvmRows.totalPages, jvmRows.start)}
          
          ${jvmRows.total === 0 ? "<p>No correlated pauses detected. GC pauses did not coincide with TCP symptom changes in the available snapshots.</p>" : ""}
        </div>
      `}
    </div>
  </section>`;
}

function jvmLegendSeries(kind) {
  if (kind === "scatter") {
    return [
      { key: "scatter_warning", label: "Warning pauses", color: "#fbbf24", tip: "GC pauses with correlation score 0.20-0.50. Temporal overlap with TCP symptoms but moderate confidence." },
      { key: "scatter_high", label: "High score pauses", color: "#ef4444", tip: "GC pauses with correlation score > 0.50. Strong evidence of JVM-induced slow consumer behavior." },
      { key: "scatter_low", label: "Low score pauses", color: "#7dd3fc", tip: "GC pauses with correlation score < 0.20. Pause detected but no significant TCP impact observed." }
    ];
  }
  return [
    { key: "recvq", label: "Recv-Q", color: "#7dd3fc", tip: "TCP receive queue depth in bytes. Rises when the local JVM cannot drain incoming data fast enough - a key slow consumer signal." },
    { key: "gc_young", label: "Young GC", color: "#4ade80", tip: "Minor/young generation collections. Usually short (1-20 ms) but frequent. Under high allocation rate they can accumulate and starve the application." },
    { key: "gc_mixed", label: "Mixed GC", color: "#fbbf24", tip: "G1 mixed collections evacuating both young and old regions. Typically longer than young GC and may indicate heap pressure building up." },
    { key: "gc_full", label: "Full / Remark", color: "#ef4444", tip: "Full GC, Remark, or Cleanup pauses. These are the longest and most disruptive. Full GC indicates heap exhaustion or fragmentation." },
    { key: "gc_safepoint", label: "Safepoint", color: "#a78bfa", tip: "JVM safepoint pauses not related to GC (e.g. deoptimization, biased locking revocation). Can still block application threads." }
  ];
}

function jvmSeriesHidden(key) {
  return state.hiddenJvmSeries?.has(key);
}

function renderJvmLegend(kind) {
  return `<div class="bdp-legend jvm-legend" data-jvm-legend="${escapeHtml(kind)}">
    ${jvmLegendSeries(kind).map(item => `<span class="jvm-legend-item" data-jvm-series-key="${escapeHtml(item.key)}" style="cursor:pointer;${jvmSeriesHidden(item.key) ? "opacity:.4;text-decoration:line-through" : ""}"><i style="--legend-color:${item.color}"></i>${escapeHtml(item.label)}<span class="jvm-legend-tip">${escapeHtml(item.tip)}</span></span>`).join("")}
  </div>`;
}

function jvmSeverityClass(severity) {
  return String(severity || "info").replace(/_/g, "-");
}

function jvmSeverityLabel(severity) {
  return {
    warning_high: "warning high",
    warning: "warning",
    critical: "critical",
    info: "info",
    none: "none"
  }[severity] || String(severity || "info").replace(/_/g, " ");
}

function jvmSeverityRank(severity) {
  return { critical: 5, warning_high: 4, warning: 3, info: 2, none: 1 }[severity] || 0;
}

function jvmStallNature(row) {
  if (row.kind === "safepoint") return "Safepoint";
  const pause = row.pause || {};
  const labels = [];
  if (pause.type) labels.push(`${pause.type} GC`);
  if (pause.evacuationFailure) labels.push("evacuation failure");
  if (pause.humongousAllocation) labels.push("humongous allocation");
  if (pause.cause) labels.push(pause.cause);
  return labels.length ? labels.join(" / ") : "Other JVM pause";
}

function preciseDateTimeLabel(epochMs) {
  if (!epochMs) return "-";
  const d = new Date(epochMs);
  const tz = resolvedTimeZone();
  const base = dateTimeFormatter(resolvedNumberLocale(), {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }, "precise-date-time-noms").format(d);
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${base}.${ms}`;
}

function jvmTableRows(results = [], safepoints = []) {
  const history = visibleHistory().filter(sample => sample.epochMs);
  const alignedSafepoints = alignTimestamps(safepoints.map(item => ({ ...item, durationMs: item.totalMs })), history, state.jvmGc.clockOffsetMs);
  return [
    ...results.filter(row => row.score > 0).map(row => ({ ...row, kind: "gc", eventId: row.pause.id, durationMs: row.pause.durationMs, timestampMs: row.epochMs })),
    ...alignedSafepoints.map((pause, index) => ({
      kind: "safepoint",
      eventId: `SP-${index + 1}`,
      pause: { id: `SP-${index + 1}`, type: "Safepoint", cause: "JVM safepoint", durationMs: pause.durationMs || pause.totalMs || 0 },
      epochMs: pause.alignedEpochMs || pause.epochMs,
      timestampMs: pause.alignedEpochMs || pause.epochMs,
      durationMs: pause.durationMs || pause.totalMs || 0,
      score: 0,
      severity: "info",
      symptoms: { signals: [{ signal: "safepoint" }] },
      classification: ["safepoint"]
    }))
  ];
}

function sortedJvmRows(results = [], safepoints = []) {
  const table = state.jvmTable || (state.jvmTable = { page: 1, pageSize: 20, sortKey: "time", sortDir: "desc" });
  const direction = table.sortDir === "asc" ? 1 : -1;
  const valueFor = row => ({
    time: row.timestampMs || 0,
    nature: jvmStallNature(row),
    id: String(row.eventId ?? row.pause?.id ?? ""),
    type: row.pause?.type || "",
    cause: row.pause?.cause || "",
    duration: row.durationMs || 0,
    score: row.score || 0,
    severity: jvmSeverityRank(row.severity),
    signals: row.symptoms?.signals?.map(signal => signal.signal).join(", ") || ""
  }[table.sortKey] ?? "");
  return jvmTableRows(results, safepoints).filter(row => {
    const f = state.jvmGc.severityFilter;
    if (!f || f === "all") return true;
    const order = ["info", "warning", "warning_high", "critical"];
    return order.indexOf(row.severity) >= order.indexOf(f);
  }).sort((a, b) => {
    const av = valueFor(a);
    const bv = valueFor(b);
    const order = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
    return order * direction || (b.timestampMs || 0) - (a.timestampMs || 0);
  });
}

function jvmPagedRows(results = [], safepoints = []) {
  const rows = sortedJvmRows(results, safepoints);
  const table = state.jvmTable || (state.jvmTable = { page: 1, pageSize: 20, sortKey: "time", sortDir: "desc" });
  const totalPages = Math.max(1, Math.ceil(rows.length / table.pageSize));
  table.page = Math.min(Math.max(1, table.page), totalPages);
  const start = (table.page - 1) * table.pageSize;
  return { rows: rows.slice(start, start + table.pageSize), total: rows.length, totalPages, start };
}

function renderJvmSortHeader(key, label) {
  const active = state.jvmTable?.sortKey === key;
  const icon = !active ? icons.sortNeutral : state.jvmTable.sortDir === "asc" ? icons.sortAsc : icons.sortDesc;
  return `<th><button class="table-sort jvm-sort ${active ? "active" : ""}" data-jvm-sort="${escapeHtml(key)}">${escapeHtml(label)} ${icon}</button></th>`;
}

function renderJvmPagination(total, totalPages, start) {
  if (!total) return "";
  const table = state.jvmTable;
  const end = Math.min(total, start + table.pageSize);
  return `<div class="pager jvm-pager">
    <span class="pager-filter-count">${formatNumber(total)} JVM event row(s)</span>
    <select class="pager-size" data-jvm-page-size title="Rows per page" aria-label="JVM rows per page">${[10, 20, 50, 100].map(value => `<option value="${value}" ${table.pageSize === value ? "selected" : ""}>${value}/p</option>`).join("")}</select>
    <button class="icon" data-jvm-page="first" title="First page" aria-label="First JVM page">${icons.first}</button>
    <button class="icon" data-jvm-page="prev" title="Previous page" aria-label="Previous JVM page">${icons.previous}</button>
    <span>${formatNumber(start + 1)}-${formatNumber(end)} / ${formatNumber(total)} - page ${table.page}/${totalPages}</span>
    <button class="icon" data-jvm-page="next" title="Next page" aria-label="Next JVM page">${icons.next}</button>
    <button class="icon" data-jvm-page="last" data-total-pages="${totalPages}" title="Last page" aria-label="Last JVM page">${icons.last}</button>
  </div>`;
}

function runJvmCorrelation() {
  const gc = state.jvmGc;
  if (!gc.pauses.length) { gc.correlation = null; return; }
  const history = visibleHistory().filter(s => s.epochMs);
  // Filter pauses to ss observation window (exclude startup/unrelated pauses)
  const ssStart = history.length ? history[0].epochMs : 0;
  const ssEnd = history.length ? history[history.length - 1].epochMs : Infinity;
  const aligned = alignTimestamps(gc.pauses, history, gc.clockOffsetMs);
  const windowPauses = aligned.filter(p => (p.alignedEpochMs || p.epochMs || 0) >= ssStart - 60000 && (p.alignedEpochMs || p.epochMs || 0) <= ssEnd + 60000);
  gc.analysisWindow = { start: ssStart, end: ssEnd, totalPauses: gc.pauses.length, filteredPauses: windowPauses.length };
  gc.correlation = correlateJvmStalls({
    pauses: windowPauses,
    safepoints: gc.safepoints,
    history,
    clockOffsetMs: gc.clockOffsetMs
  });
  if (state.fixLatency.records.length) runFixCorrelation();
}

function jvmDrawDependencies() {
  return {
    root: document,
    state,
    drawJvmTimelineChartInteractive,
    drawJvmScatterChartInteractive,
    attachJvmTimelineInteractions,
    attachJvmScatterInteractions,
    drawJvmCharts
  };
}

function drawJvmCharts(deps = jvmDrawDependencies()) {
  const {
    root = document,
    state: appState = state,
    drawJvmTimelineChartInteractive: drawTimeline = drawJvmTimelineChartInteractive,
    drawJvmScatterChartInteractive: drawScatter = drawJvmScatterChartInteractive
  } = deps;
  const gc = appState.jvmGc;
  if (!gc.correlation?.results?.length) return;
  const history = visibleHistory().filter(s => s.epochMs);
  if (!history.length) return;
  const sevOrder = ["none", "info", "warning", "warning_high", "critical"];
  const minSev = gc.severityFilter && gc.severityFilter !== "all" ? sevOrder.indexOf(gc.severityFilter) : 0;
  const t0 = history[0].epochMs, t1 = history[history.length - 1].epochMs;
  const filtered = gc.correlation.results.filter(r => r.epochMs >= t0 && r.epochMs <= t1 && sevOrder.indexOf(r.severity) >= minSev);
  const selected = gc.selectedEpoch ? filtered.filter(r => r.epochMs === gc.selectedEpoch) : filtered;

  // Timeline chart: Recv-Q + GC bars
  const svg1 = root.querySelector("[data-jvm-chart='recvq']");
  if (svg1) drawTimeline(svg1, selected, history, deps);

  // Scatter plot
  const svg2 = root.querySelector("[data-jvm-chart='scatter']");
  if (svg2) drawScatter(svg2, selected, deps);
}

function jvmPauseColor(score) {
  return score > 0.5 ? "#ef4444" : score > 0.2 ? "#fbbf24" : "#7dd3fc";
}

function drawJvmTimelineChartInteractive(svg, results, history, deps = jvmDrawDependencies()) {
  const { state: appState = state, attachJvmTimelineInteractions: attachTimeline = attachJvmTimelineInteractions } = deps;
  const w = svg.clientWidth || 700;
  const h = svg.clientHeight || 300;
  const pad = { l: 96, r: 22, t: 28, b: 46 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const t0 = history[0].epochMs;
  const t1 = history[history.length - 1].epochMs;
  const span = Math.max(1, t1 - t0);
  const x = t => pad.l + ((t - t0) / span) * plotW;
  const primaryMetric = "recvQ";
  const primaryLabel = "Recv-Q (bytes)";
  const primaryColor = "#7dd3fc";
  const maxPrimary = Math.max(1, ...history.map(s => s[primaryMetric] || 0));
  const y = value => pad.t + plotH - (value / maxPrimary) * plotH;
  const line = history.map((sample, index) => `${index ? "L" : "M"}${x(sample.epochMs).toFixed(1)},${y(sample[primaryMetric] || 0).toFixed(1)}`).join(" ");
  const pauseTypeColor = type => {
    if (type === "Young") return "#4ade80";
    if (type === "Mixed") return "#fbbf24";
    if (type === "Full" || type === "Remark" || type === "Cleanup") return "#ef4444";
    return "#a78bfa"; // safepoint or other
  };
  const bars = results.filter(result => {
    const t = result.pause?.type || "";
    if (t === "Young" && jvmSeriesHidden("gc_young")) return false;
    if (t === "Mixed" && jvmSeriesHidden("gc_mixed")) return false;
    if ((t === "Full" || t === "Remark" || t === "Cleanup") && jvmSeriesHidden("gc_full")) return false;
    if (t === "Safepoint" && jvmSeriesHidden("gc_safepoint")) return false;
    return true;
  }).map(result => {
    const bx = x(result.epochMs);
    const bw = Math.max(1, (result.pause.durationMs / span) * plotW);
    const color = pauseTypeColor(result.pause.type);
    const hasAnnotation = result.pause.type === "Full" || result.pause.type === "Remark" || result.pause.type === "Cleanup";
    return `<rect x="${bx.toFixed(1)}" y="${pad.t}" width="${bw.toFixed(1)}" height="${plotH}" fill="${color}" opacity=".35">${hasAnnotation ? "" : `<title>GC(${result.pause.id}) ${escapeHtml(result.pause.type)} ${result.pause.durationMs.toFixed(1)}ms score=${result.score.toFixed(2)}</title>`}</rect>`;
  }).join("");
  const annotations = results.filter(r => {
    const t = r.pause?.type;
    if ((t === "Full" || t === "Remark" || t === "Cleanup") && !jvmSeriesHidden("gc_full")) return true;
    if (t === "Mixed" && !jvmSeriesHidden("gc_mixed")) return true;
    if (t === "Young" && !jvmSeriesHidden("gc_young")) return true;
    return false;
  }).filter((r, i, arr) => arr.findIndex(x => x.pause.id === r.pause.id) === i).map(r => {
    const ax = x(r.epochMs);
    const color = r.pause.type === "Mixed" ? "#fbbf24" : r.pause.type === "Young" ? "#4ade80" : "#ef4444";
    return { ax, color, label: `${r.pause.type} #${r.pause.id}` };
  });
  // Anti-overlap: assign levels based on horizontal proximity
  const minGap = 50;
  const levelHeight = 12;
  const levels = [];
  for (const a of annotations) {
    let level = 0;
    while (levels[level]?.some(prev => Math.abs(prev - a.ax) < minGap)) level++;
    if (!levels[level]) levels[level] = [];
    levels[level].push(a.ax);
    a.level = level;
  }
  const annotationsSvg = annotations.map(a => {
    const ay = pad.t - 4 + a.level * levelHeight;
    const timeStr = a.epochMs ? new Date(a.epochMs).toISOString().slice(11, 23) : "";
    return `<text x="${a.ax.toFixed(1)}" y="${ay}" text-anchor="middle" fill="${a.color}" font-size="9" font-weight="700">${escapeHtml(a.label)}</text>${timeStr ? `<text x="${a.ax.toFixed(1)}" y="${ay + 10}" text-anchor="middle" fill="${a.color}" font-size="8" opacity="0.7">${timeStr}</text>` : ""}`;
  }).join("");
  // Detect TCP state changes from raw timestamped snapshots
  const stateChanges = [];
  const rawSnaps = parsedTimestampSnapshots();
  const selected = socketsById().get(appState.selectedId) || appState.sockets[0];
  if (selected && rawSnaps.length) {
    const localPeer = `${selected.local}|${selected.peer}`;
    let prevState = "";
    for (const snap of rawSnaps) {
      if (!snap.epochMs || snap.epochMs < t0 || snap.epochMs > t1) continue;
      const match = (snap.sockets || []).find(s => `${s.local}|${s.peer}` === localPeer);
      if (match && match.state && match.state !== prevState) {
        if (prevState) stateChanges.push({ epochMs: snap.epochMs, from: prevState, to: match.state });
        prevState = match.state;
      }
    }
  }
  const stateChangesSvg = stateChanges.map(sc => {
    const sx = x(sc.epochMs);
    return `<line x1="${sx.toFixed(1)}" x2="${sx.toFixed(1)}" y1="${pad.t}" y2="${pad.t + plotH}" stroke="#e879f9" stroke-width="1.5" stroke-dasharray="4 2"/>` +
      `<rect x="${sx.toFixed(1) - 1}" y="${pad.t + plotH - 16}" width="${(sc.from + " ? " + sc.to).length * 5 + 10}" height="14" rx="3" fill="rgba(10,16,24,.85)"/>` +
      `<text x="${(Number(sx.toFixed(1)) + 4)}" y="${pad.t + plotH - 6}" fill="#e879f9" font-size="8" font-weight="600">${escapeHtml(sc.from)} ? ${escapeHtml(sc.to)}</text>`;
  }).join("");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => f * maxPrimary);
  const yTicksSvg = yTicks.map(v => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#1a2636"/><text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end" fill="#8c9aab" font-size="10">${formatMetricValue(primaryMetric, v)}</text>`).join("");
  const xTimeTicks = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const epoch = t0 + f * span;
    const sample = history.reduce((best, s) => Math.abs(s.epochMs - epoch) < Math.abs(best.epochMs - epoch) ? s : best, history[0]);
    return { px: pad.l + f * plotW, label: timeLabel(sample.t || 0, sample.epochMs) };
  });
  const xTimeTicksSvg = xTimeTicks.map((t, i) => `<line x1="${t.px}" x2="${t.px}" y1="${pad.t}" y2="${h - pad.b}" stroke="#1a2636"/><text x="${t.px}" y="${h - pad.b + 14}" text-anchor="${i === xTimeTicks.length - 1 ? "end" : i === 0 ? "start" : "middle"}" fill="#8c9aab" font-size="10">${escapeHtml(t.label)}</text>`).join("");
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="${chartBgColor()}"/>
    ${xTimeTicksSvg}
    ${yTicksSvg}
    ${bars}
    ${annotationsSvg}
    ${stateChangesSvg}
    ${jvmSeriesHidden("recvq") ? "" : `<path d="${line}" fill="none" stroke="${primaryColor}" stroke-width="2.4"/>`}
    <text x="${w / 2}" y="${h - 7}" text-anchor="middle" fill="#8c9aab" font-size="11">Time (${escapeHtml(resolvedTimeZone())})</text>
    <text x="16" y="${h / 2}" transform="rotate(-90 16 ${h / 2})" text-anchor="middle" fill="#8c9aab" font-size="11">${escapeHtml(primaryLabel)}</text>
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="#52657a"/>
    <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="#52657a"/>
    <rect class="jvm-hover-zone" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="transparent" pointer-events="all"/>
    <g class="jvm-crosshair" visibility="hidden" pointer-events="none"></g>
  `;
  attachTimeline(svg, results, history, x, pad, w, h, t0, span, deps);
  // Expose for cross-chart sync
  svg._jvmShowTooltipForId = (gcId) => {
    const r = results.find(item => item.pause.id === gcId);
    if (!r) return;
    const layer = svg.querySelector(".jvm-crosshair");
    if (!layer) return;
    const cx = x(r.epochMs);
    const sample = history.reduce((best, item) => Math.abs(item.epochMs - r.epochMs) < Math.abs(best.epochMs - r.epochMs) ? item : best, history[0]);
    const tooltipW = 230;
    const tooltipX = cx + tooltipW + 14 > w - pad.r ? cx - tooltipW - 14 : cx + 14;
    layer.setAttribute("visibility", "visible");
    layer.innerHTML = `
      <line x1="${cx}" x2="${cx}" y1="${pad.t}" y2="${h - pad.b}" stroke="${chartBgColor() === `#f0f3f7` ? `#1a2533cc` : `#ffffffaa`}" stroke-width="1" stroke-dasharray="3 2"/>
      <rect x="${tooltipX}" y="${pad.t + 8}" width="${tooltipW}" height="78" rx="7" fill="${chartBgColor() === `#f0f3f7` ? `#ffffff` : `#0b1018`}" fill-opacity="${chartTooltipOpacity()}" stroke="#52657a"/>
      <text x="${tooltipX + 9}" y="${pad.t + 25}" fill="#edf4ff" font-size="11" font-weight="800">${escapeHtml(preciseDateTimeLabel(sample.epochMs))}</text>
      <text x="${tooltipX + 9}" y="${pad.t + 43}" fill="${primaryColor}" font-size="10.5">Recv-Q: ${escapeHtml(formatMetricValue(primaryMetric, sample[primaryMetric] || 0))}</text>
      <text x="${tooltipX + 9}" y="${pad.t + 59}" fill="${jvmPauseColor(r.score)}" font-size="10.5">GC #${r.pause.id} ${r.pause.durationMs.toFixed(1)}ms score ${r.score.toFixed(2)}</text>
      <text x="${tooltipX + 9}" y="${pad.t + 73}" fill="#cbd5e1" font-size="10">${escapeHtml(r.symptoms?.signals?.map(s => s.signal).join(", ") || "none")}</text>
    `;
  };
  svg._jvmHideTooltip = () => { const l = svg.querySelector(".jvm-crosshair"); if (l) l.setAttribute("visibility", "hidden"); };
}

function drawJvmScatterChartInteractive(svg, results, deps = jvmDrawDependencies()) {
  const { attachJvmScatterInteractions: attachScatter = attachJvmScatterInteractions } = deps;
  const w = svg.clientWidth || 700;
  const h = svg.clientHeight || 300;
  const pad = { l: 96, r: 22, t: 28, b: 46 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const points = results.filter(result => result.symptoms.detected).map(result => {
    const delta = result.symptoms.signals.find(signal => signal.signal === "recvQ_rise")?.delta || 0;
    return {
      id: result.pause.id,
      type: result.pause.type,
      durationMs: result.pause.durationMs,
      delta,
      score: result.score,
      severity: result.severity,
      signals: result.symptoms.signals.map(signal => signal.signal).join(", "),
      epochMs: result.epochMs
    };
  }).filter(point => {
    if (point.score > 0.5) return !jvmSeriesHidden("scatter_high");
    if (point.score > 0.2) return !jvmSeriesHidden("scatter_warning");
    return !jvmSeriesHidden("scatter_low");
  });
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  if (!points.length) {
    svg.innerHTML = `<rect x="0" y="0" width="${w}" height="${h}" fill="${chartBgColor()}"/><text x="24" y="42" fill="#c4d0de" font-size="12">No visible correlated data points.</text>`;
    return;
  }
  const maxDuration = Math.max(1, ...points.map(point => point.durationMs));
  const maxDelta = Math.max(1, ...points.map(point => point.delta));
  const x = value => pad.l + (value / maxDuration) * plotW;
  const y = value => pad.t + plotH - (value / maxDelta) * plotH;
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map(f => { const v = f * maxDuration; return v < 10 ? Math.round(v * 10) / 10 : Math.round(v); });
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * maxDelta));
  const xTicksSvg = xTicks.map(v => `<line x1="${x(v)}" x2="${x(v)}" y1="${pad.t}" y2="${h - pad.b}" stroke="#1a2636"/><text x="${x(v)}" y="${h - pad.b + 14}" text-anchor="middle" fill="#8c9aab" font-size="10">${v} ms</text>`).join("");
  const yTicksSvg = yTicks.map(v => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#1a2636"/><text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end" fill="#8c9aab" font-size="10">${formatMetricValue("recvQ", v)}</text>`).join("");
  const dots = points.map(point => `<circle cx="${x(point.durationMs).toFixed(1)}" cy="${y(point.delta).toFixed(1)}" r="4" fill="${jvmPauseColor(point.score)}" opacity=".82"><title>${point.durationMs.toFixed(1)}ms -> Delta Recv-Q ${point.delta}</title></circle>`).join("");
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="${chartBgColor()}"/>
    ${xTicksSvg}
    ${yTicksSvg}
    ${dots}
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="#8c9aab" font-size="11">Pause duration (ms)</text>
    <text x="16" y="${h / 2}" transform="rotate(-90 16 ${h / 2})" text-anchor="middle" fill="#8c9aab" font-size="11">Delta Recv-Q (bytes)</text>
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="#52657a"/>
    <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="#52657a"/>
    <rect class="jvm-hover-zone" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="transparent" pointer-events="all"/>
    <g class="jvm-crosshair" visibility="hidden" pointer-events="none"></g>
  `;
  attachScatter(svg, points, x, y, pad, w, h, deps);
  // Expose coordinate fns for cross-chart sync
  svg._jvmScatterX = r => { const p = points.find(pt => pt.id === r.pause?.id); return p ? x(p.durationMs) : 0; };
  svg._jvmScatterY = r => { const p = points.find(pt => pt.id === r.pause?.id); return p ? y(p.delta) : 0; };
}

function attachJvmTimelineInteractions(svg, results, history, xFn, pad, w, h, t0, span, deps = jvmDrawDependencies()) {
  const { root = document, state: appState = state, drawJvmCharts: drawJvm = drawJvmCharts } = deps;
  const zone = svg.querySelector(".jvm-hover-zone");
  const layer = svg.querySelector(".jvm-crosshair");
  if (!zone || !layer) return;
  const plotW = w - pad.l - pad.r;
  zone.addEventListener("mousemove", event => {
    const rect = svg.getBoundingClientRect();
    const scaleX = w / rect.width;
    const locX = (event.clientX - rect.left) * scaleX;
    const pct = Math.max(0, Math.min(1, (locX - pad.l) / plotW));
    const targetEpoch = t0 + pct * span;
    const sample = history.reduce((best, item) => Math.abs(item.epochMs - targetEpoch) < Math.abs(best.epochMs - targetEpoch) ? item : best, history[0]);
    const pause = results.reduce((best, item) => !best || Math.abs(item.epochMs - targetEpoch) < Math.abs(best.epochMs - targetEpoch) ? item : best, null);
    const cx = xFn(sample.epochMs);
    // Drag selection overlay
    const dragSel = svg._jvmDragStart != null
      ? `<rect x="${Math.min(pad.l + svg._jvmDragStart * plotW, locX)}" y="${pad.t}" width="${Math.abs(locX - (pad.l + svg._jvmDragStart * plotW))}" height="${h - pad.t - pad.b}" fill="#5db7ff" opacity=".18" stroke="#5db7ff" stroke-width="1" stroke-dasharray="5 4"/>`
      : "";
    const tooltipW = 230;
    const tooltipX = cx + tooltipW + 14 > w - pad.r ? cx - tooltipW - 14 : cx + 14;
    layer.setAttribute("visibility", "visible");
    layer.innerHTML = `
      ${dragSel}
      <line x1="${cx}" x2="${cx}" y1="${pad.t}" y2="${h - pad.b}" stroke="${chartBgColor() === `#f0f3f7` ? `#1a2533cc` : `#ffffffaa`}" stroke-width="1" stroke-dasharray="3 2"/>
      <rect x="${tooltipX}" y="${pad.t + 8}" width="${tooltipW}" height="78" rx="7" fill="${chartBgColor() === `#f0f3f7` ? `#ffffff` : `#0b1018`}" fill-opacity="${chartTooltipOpacity()}" stroke="#52657a"/>
      <text x="${tooltipX + 9}" y="${pad.t + 25}" fill="#edf4ff" font-size="11" font-weight="800">${escapeHtml(preciseDateTimeLabel(sample.epochMs))}</text>
      <text x="${tooltipX + 9}" y="${pad.t + 43}" fill="#7dd3fc" font-size="10.5">Recv-Q: ${escapeHtml(formatMetricValue("recvQ", sample.recvQ || 0))}</text>
      <text x="${tooltipX + 9}" y="${pad.t + 59}" fill="${pause ? jvmPauseColor(pause.score) : "#94a3b8"}" font-size="10.5">Nearest GC: ${pause ? escapeHtml(`#${pause.pause.id} ${pause.pause.durationMs.toFixed(1)}ms score ${pause.score.toFixed(2)}`) : "n/a"}</text>
      <text x="${tooltipX + 9}" y="${pad.t + 73}" fill="#cbd5e1" font-size="10">Signals: ${escapeHtml(pause?.symptoms?.signals?.map(signal => signal.signal).join(", ") || "none")}</text>
    `;
    // Sync crosshair to scatter chart
    if (appState.jvmGc.syncCrosshair !== false && pause) {
      const scatterSvg = root.querySelector("[data-jvm-chart='scatter']");
      if (scatterSvg?._jvmShowTooltipForId) scatterSvg._jvmShowTooltipForId(pause.pause.id);
    }
  });
  zone.addEventListener("mousedown", event => {
    svg._jvmDragStart = Math.max(0, Math.min(1, (((event.clientX - svg.getBoundingClientRect().left) * (w / svg.getBoundingClientRect().width)) - pad.l) / plotW));
  });
  zone.addEventListener("mouseup", event => {
    if (svg._jvmDragStart == null) return;
    const rect = svg.getBoundingClientRect();
    const end = Math.max(0, Math.min(1, (((event.clientX - rect.left) * (w / rect.width)) - pad.l) / plotW));
    const start = svg._jvmDragStart;
    svg._jvmDragStart = null;
    if (Math.abs(end - start) < 0.02) return;
    const current = appState.chartZoom;
    const range = current.end - current.start;
    setZoom(current.start + Math.min(start, end) * range, current.start + Math.max(start, end) * range);
    drawJvm(deps);
  });
  zone.addEventListener("mouseleave", () => {
    svg._jvmDragStart = null;
    layer.setAttribute("visibility", "hidden");
    if (appState.jvmGc.syncCrosshair !== false) {
      const scatterSvg = root.querySelector("[data-jvm-chart='scatter']");
      if (scatterSvg?._jvmHideTooltip) scatterSvg._jvmHideTooltip();
    }
  });
}

function attachJvmScatterInteractions(svg, points, xFn, yFn, pad, w, h, deps = jvmDrawDependencies()) {
  const { root = document, state: appState = state, drawJvmCharts: drawJvm = drawJvmCharts } = deps;
  const dom = root.ownerDocument || root;
  const zone = svg.querySelector(".jvm-hover-zone");
  const layer = svg.querySelector(".jvm-crosshair");
  if (!zone || !layer) return;
  zone.addEventListener("mousemove", event => {
    const rect = svg.getBoundingClientRect();
    const scaleX = w / rect.width;
    const scaleY = h / rect.height;
    const px = (event.clientX - rect.left) * scaleX;
    const py = (event.clientY - rect.top) * scaleY;
    const point = points.reduce((best, item) => {
      const dx = xFn(item.durationMs) - px;
      const dy = yFn(item.delta) - py;
      const distance = dx * dx + dy * dy;
      return !best || distance < best.distance ? { item, distance } : best;
    }, null)?.item;
    if (!point) return;
    const cx = xFn(point.durationMs);
    const cy = yFn(point.delta);
    const tooltipW = 220;
    const tooltipX = cx + tooltipW + 14 > w - pad.r ? cx - tooltipW - 14 : cx + 14;
    const tooltipY = Math.max(pad.t + 8, Math.min(h - pad.b - 82, cy - 36));
    layer.setAttribute("visibility", "visible");
    layer.innerHTML = `
      <line x1="${cx}" x2="${cx}" y1="${pad.t}" y2="${h - pad.b}" stroke="#ffffff88" stroke-width="1" stroke-dasharray="3 2"/>
      <line x1="${pad.l}" x2="${w - pad.r}" y1="${cy}" y2="${cy}" stroke="#ffffff55" stroke-width="1" stroke-dasharray="3 2"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="${jvmPauseColor(point.score)}" stroke-width="2"/>
      <rect x="${tooltipX}" y="${tooltipY}" width="${tooltipW}" height="76" rx="7" fill="${chartBgColor() === `#f0f3f7` ? `#ffffff` : `#0b1018`}" fill-opacity="${chartTooltipOpacity()}" stroke="#52657a"/>
      <text x="${tooltipX + 9}" y="${tooltipY + 18}" fill="#edf4ff" font-size="11" font-weight="800">GC #${escapeHtml(String(point.id))} - ${escapeHtml(point.type)}</text>
      <text x="${tooltipX + 9}" y="${tooltipY + 36}" fill="${jvmPauseColor(point.score)}" font-size="10.5">${point.durationMs.toFixed(1)} ms, score ${point.score.toFixed(2)}</text>
      <text x="${tooltipX + 9}" y="${tooltipY + 52}" fill="#7dd3fc" font-size="10.5">Delta Recv-Q: ${escapeHtml(formatMetricValue("recvQ", point.delta))}</text>
      <text x="${tooltipX + 9}" y="${tooltipY + 68}" fill="#cbd5e1" font-size="10">${escapeHtml(point.signals || "no signals")}</text>
    `;
    // Sync to timeline chart
    if (appState.jvmGc.syncCrosshair !== false) {
      const tlSvg = root.querySelector("[data-jvm-chart='recvq']");
      if (tlSvg?._jvmShowTooltipForId) tlSvg._jvmShowTooltipForId(point.id);
    }
  });
  zone.addEventListener("mouseleave", () => {
    layer.setAttribute("visibility", "hidden");
    if (appState.jvmGc.syncCrosshair !== false) {
      const tlSvg = root.querySelector("[data-jvm-chart='recvq']");
      if (tlSvg?._jvmHideTooltip) tlSvg._jvmHideTooltip();
    }
  });
  zone.addEventListener("click", event => {
    const rect = svg.getBoundingClientRect();
    const px = (event.clientX - rect.left) * (w / rect.width);
    const py = (event.clientY - rect.top) * (h / rect.height);
    const point = points.reduce((best, item) => {
      const dx = xFn(item.durationMs) - px;
      const dy = yFn(item.delta) - py;
      const d = dx * dx + dy * dy;
      return !best || d < best.d ? { item, d } : best;
    }, null)?.item;
    if (!point || !point.epochMs) return;
    // Zoom timeline to ±5s around this pause
    const history = visibleHistory().filter(s => s.epochMs);
    if (!history.length) return;
    const t0 = history[0].epochMs, t1 = history[history.length - 1].epochMs;
    const totalSpan = Math.max(1, t1 - t0);
    const windowMs = 5000;
    const center = (point.epochMs - t0) / totalSpan;
    const halfW = windowMs / totalSpan;
    const current = appState.chartZoom;
    const range = current.end - current.start;
    const absCenter = current.start + center * range;
    setZoom(Math.max(0, absCenter - halfW), Math.min(1, absCenter + halfW));
    appState._bdpCache = null;
    appState.jvmGc.selectedEpoch = null;
    drawJvm(deps);
    // Show a red vertical marker on the timeline at the clicked point
    const tlSvg = root.querySelector("[data-jvm-chart='recvq']");
    if (tlSvg) {
      const marker = dom.createElementNS("http://www.w3.org/2000/svg", "g");
      marker.setAttribute("class", "jvm-click-marker");
      const history2 = visibleHistory().filter(s => s.epochMs);
      if (history2.length) {
        const tt0 = history2[0].epochMs, tt1 = history2[history2.length - 1].epochMs;
        const tSpan = Math.max(1, tt1 - tt0);
        const mw = tlSvg.clientWidth || 700;
        const mPad = 96;
        const mPlotW = mw - mPad - 22;
        const mx = mPad + ((point.epochMs - tt0) / tSpan) * mPlotW;
        marker.innerHTML = `<line x1="${mx}" x2="${mx}" y1="28" y2="${(tlSvg.clientHeight || 300) - 46}" stroke="#ff3355" stroke-width="2.5" opacity="1"/><polygon points="${mx - 5},28 ${mx + 5},28 ${mx},36" fill="#ff3355"/>`;
        marker.style.transition = "opacity .5s";
        tlSvg.appendChild(marker);
        setTimeout(() => { marker.style.opacity = "0"; }, 1500);
        setTimeout(() => { marker.remove(); }, 2000);
      }
    }
  });
  // Expose function for cross-chart sync
  svg._jvmShowTooltipForId = (gcId) => {
    const point = points.find(p => p.id === gcId);
    if (!point) { layer.setAttribute("visibility", "hidden"); return; }
    const cx = xFn(point.durationMs);
    const cy = yFn(point.delta);
    const tooltipW = 220;
    const tooltipX = cx + tooltipW + 14 > w - pad.r ? cx - tooltipW - 14 : cx + 14;
    const tooltipY = Math.max(pad.t + 8, Math.min(h - pad.b - 82, cy - 36));
    layer.setAttribute("visibility", "visible");
    layer.innerHTML = `
      <line x1="${cx}" x2="${cx}" y1="${pad.t}" y2="${h - pad.b}" stroke="#ffffff88" stroke-width="1" stroke-dasharray="3 2"/>
      <line x1="${pad.l}" x2="${w - pad.r}" y1="${cy}" y2="${cy}" stroke="#ffffff55" stroke-width="1" stroke-dasharray="3 2"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="${jvmPauseColor(point.score)}" stroke-width="2"/>
      <rect x="${tooltipX}" y="${tooltipY}" width="${tooltipW}" height="76" rx="7" fill="${chartBgColor() === `#f0f3f7` ? `#ffffff` : `#0b1018`}" fill-opacity="${chartTooltipOpacity()}" stroke="#52657a"/>
      <text x="${tooltipX + 9}" y="${tooltipY + 18}" fill="#edf4ff" font-size="11" font-weight="800">GC #${escapeHtml(String(point.id))} - ${escapeHtml(point.type)}</text>
      <text x="${tooltipX + 9}" y="${tooltipY + 36}" fill="${jvmPauseColor(point.score)}" font-size="10.5">${point.durationMs.toFixed(1)} ms, score ${point.score.toFixed(2)}</text>
      <text x="${tooltipX + 9}" y="${tooltipY + 52}" fill="#7dd3fc" font-size="10.5">Delta Recv-Q: ${escapeHtml(formatMetricValue("recvQ", point.delta))}</text>
      <text x="${tooltipX + 9}" y="${tooltipY + 68}" fill="#cbd5e1" font-size="10">${escapeHtml(point.signals || "no signals")}</text>
    `;
  };
  svg._jvmHideTooltip = () => layer.setAttribute("visibility", "hidden");
}

function renderChartInfo(title, summary, detail) {
  return `<span class="field-info" tabindex="0" aria-label="${escapeHtml(title)} help"><i class="ri-information-line"></i><span class="field-info-card" role="tooltip"><span class="tooltip-kicker">Chart intelligence</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(summary)}</p><p>${escapeHtml(detail)}</p></span></span>`;
}

function metricHelp(metric) {
  const key = chartMetricList().includes(metric) ? metric : state.prefs.graphMetric;
  const threshold = thresholdFor(key);
  return {
    metric: key,
    label: metricLabel(key),
    source: metricSource(key),
    unit: metricUnit(key) || "raw value",
    summary: metricInterpretation(key),
    correlations: metricCorrelations(key),
    profile: metricReliabilityProfile(key),
    guidance: metricDiagnosticGuidance(key),
    threshold,
    rationale: EXPERT_DEFAULT_THRESHOLDS[key]?.rationale || "Use this metric with queue, timer, process, and peer context. Prefer trends across snapshots over one isolated point."
  };
}

function renderChartMetricTooltip(metric) {
  const t = thresholdFor(metric);
  const color = metricColor(metric);
  const unit = metricUnit(metric) || "raw value";
  const hasThresholds = Number.isFinite(t.warn) || Number.isFinite(t.danger);
  return `<span class="chart-info" tabindex="0" aria-label="${escapeHtml(metricLabel(metric))} metric guide" style="--metric-color:${color}">
    <i class="ri-information-line"></i>
    <span class="chart-tooltip" role="tooltip">
      <span class="tooltip-kicker">Chart metric intelligence</span>
      <strong>${escapeHtml(metricLabel(metric))}</strong>
      <small>${escapeHtml(metricSource(metric))} - unit: ${escapeHtml(unit)}</small>
      <p>${escapeHtml(metricInterpretation(metric))}</p>
      ${hasThresholds ? renderThresholdSummary({ metric, threshold: t }) : `<span class="tooltip-none">No universal warning threshold is applied for this metric.</span>`}
      <div class="chart-tooltip-correlate">
        <b>Correlate with</b>
        <span>${metricCorrelations(metric).map(item => `<em>${escapeHtml(item)}</em>`).join("")}</span>
      </div>
      <button data-metric-help="${escapeHtml(metric)}" type="button"><i class="ri-expand-diagonal-line"></i> Expand intelligence</button>
    </span>
  </span>`;
}

let chartTooltipEl = null;
let chartTooltipHideTimer = 0;

function ensureFloatingChartTooltip() {
  if (chartTooltipEl?.isConnected) return chartTooltipEl;
  chartTooltipEl = document.createElement("div");
  chartTooltipEl.id = "floatingChartTooltip";
  chartTooltipEl.className = "chart-tooltip chart-tooltip-floating";
  chartTooltipEl.setAttribute("role", "tooltip");
  chartTooltipEl.addEventListener("mouseenter", () => clearTimeout(chartTooltipHideTimer));
  chartTooltipEl.addEventListener("mouseleave", hideFloatingChartTooltipSoon);
  chartTooltipEl.addEventListener("click", event => {
    const help = event.target.closest("[data-metric-help]");
    if (!help) return;
    event.stopPropagation();
    state.helpMetric = help.dataset.metricHelp;
    state.modal = "metricHelp";
    hideFloatingChartTooltipNow();
    render();
  });
  document.body.appendChild(chartTooltipEl);
  return chartTooltipEl;
}

function positionFloatingChartTooltip(info, tooltip) {
  if (!tooltip) return;
  const gutter = 12;
  tooltip.style.visibility = "hidden";
  tooltip.classList.add("open");
  const infoRect = info.getBoundingClientRect();
  const rect = tooltip.getBoundingClientRect();
  const below = infoRect.bottom + 10;
  const above = infoRect.top - rect.height - 10;
  const top = below + rect.height <= window.innerHeight - gutter ? below : Math.max(gutter, above);
  const idealLeft = infoRect.left + infoRect.width / 2 - rect.width / 2;
  const left = Math.min(Math.max(gutter, idealLeft), Math.max(gutter, window.innerWidth - rect.width - gutter));
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
  tooltip.style.visibility = "visible";
}

function showFloatingChartTooltip(info) {
  const inlineTooltip = info?.querySelector(".chart-tooltip:not(.chart-tooltip-floating)");
  if (!inlineTooltip) return;
  clearTimeout(chartTooltipHideTimer);
  const tooltip = ensureFloatingChartTooltip();
  tooltip.innerHTML = inlineTooltip.innerHTML;
  tooltip.style.setProperty("--metric-color", getComputedStyle(info).getPropertyValue("--metric-color") || "var(--cyan)");
  positionFloatingChartTooltip(info, tooltip);
}

function hideFloatingChartTooltipSoon() {
  clearTimeout(chartTooltipHideTimer);
  chartTooltipHideTimer = setTimeout(hideFloatingChartTooltipNow, 180);
}

function hideFloatingChartTooltipNow() {
  clearTimeout(chartTooltipHideTimer);
  chartTooltipEl?.classList.remove("open");
}

function ensureAppServiceTooltip() {
  let tooltip = document.querySelector("#appServiceTooltip");
  if (tooltip) return tooltip;
  tooltip = document.createElement("div");
  tooltip.id = "appServiceTooltip";
  tooltip.className = "app-service-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.innerHTML = `
    <span class="tooltip-kicker"></span>
    <strong></strong>
    <small></small>
    <p></p>
    <em></em>
  `;
  document.body.appendChild(tooltip);
  return tooltip;
}

function positionAppServiceTooltip(chip, tooltip) {
  if (!tooltip) return;
  const gutter = 12;
  tooltip.style.removeProperty("--app-tooltip-top");
  tooltip.style.removeProperty("--app-tooltip-left");

  const chipRect = chip.getBoundingClientRect();
  const rect = tooltip.getBoundingClientRect();
  const below = chipRect.bottom + 8;
  const above = chipRect.top - rect.height - 8;
  const top = below + rect.height <= window.innerHeight - gutter ? below : Math.max(gutter, above);
  const idealLeft = chipRect.left + chipRect.width / 2 - rect.width / 2;
  const left = Math.min(Math.max(gutter, idealLeft), Math.max(gutter, window.innerWidth - rect.width - gutter));

  tooltip.style.setProperty("--app-tooltip-top", `${Math.round(top)}px`);
  tooltip.style.setProperty("--app-tooltip-left", `${Math.round(left)}px`);
}

function showAppServiceTooltip(chip) {
  const tooltip = ensureAppServiceTooltip();
  tooltip.querySelector(".tooltip-kicker").textContent = "Service classification";
  tooltip.querySelector("strong").textContent = chip.dataset.appTooltipLabel || "Service";
  tooltip.querySelector("small").textContent = `${chip.dataset.appTooltipSource || "Source"} - ${chip.dataset.appTooltipScope || "scope"}`;
  tooltip.querySelector("p").textContent = chip.dataset.appTooltipDetail || "";
  tooltip.querySelector("em").textContent = "Click to correct, hide, or scope this service classification.";
  tooltip.classList.add("open");
  positionAppServiceTooltip(chip, tooltip);
}

function hideAppServiceTooltip() {
  document.querySelector("#appServiceTooltip")?.classList.remove("open");
}

let columnTooltipEl = null;
let columnTooltipHideTimer = 0;

function ensureFloatingColumnTooltip() {
  if (columnTooltipEl?.isConnected) return columnTooltipEl;
  columnTooltipEl = document.createElement("div");
  columnTooltipEl.id = "floatingColumnTooltip";
  columnTooltipEl.className = "column-tooltip column-tooltip-floating";
  columnTooltipEl.setAttribute("role", "tooltip");
  columnTooltipEl.addEventListener("mouseenter", () => clearTimeout(columnTooltipHideTimer));
  columnTooltipEl.addEventListener("mouseleave", hideFloatingColumnTooltipSoon);
  columnTooltipEl.addEventListener("click", event => {
    const help = event.target.closest("[data-column-help]");
    if (!help) return;
    event.stopPropagation();
    state.helpColumn = help.dataset.columnHelp;
    state.modal = "columnHelp";
    hideFloatingColumnTooltipNow();
    render();
  });
  document.body.appendChild(columnTooltipEl);
  return columnTooltipEl;
}

function positionFloatingColumnTooltip(header, tooltip) {
  const gutter = 12;
  const headerRect = header.getBoundingClientRect();
  tooltip.style.visibility = "hidden";
  tooltip.classList.add("open");
  const rect = tooltip.getBoundingClientRect();
  const below = headerRect.bottom + 8;
  const above = headerRect.top - rect.height - 8;
  const top = below + rect.height <= window.innerHeight - gutter ? below : Math.max(gutter, above);
  const idealLeft = headerRect.left + headerRect.width / 2 - rect.width / 2;
  const left = Math.min(Math.max(gutter, idealLeft), Math.max(gutter, window.innerWidth - rect.width - gutter));
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
  tooltip.style.visibility = "visible";
}

function showFloatingColumnTooltip(header) {
  const inlineTooltip = header.querySelector(".column-tooltip:not(.column-tooltip-floating)");
  if (!inlineTooltip) return;
  clearTimeout(columnTooltipHideTimer);
  const tooltip = ensureFloatingColumnTooltip();
  tooltip.innerHTML = inlineTooltip.innerHTML;
  positionFloatingColumnTooltip(header, tooltip);
}

function hideFloatingColumnTooltipSoon() {
  clearTimeout(columnTooltipHideTimer);
  columnTooltipHideTimer = setTimeout(hideFloatingColumnTooltipNow, 120);
}

function hideFloatingColumnTooltipNow() {
  clearTimeout(columnTooltipHideTimer);
  columnTooltipEl?.classList.remove("open");
}

function bindSmartChartTooltips() {
  document.querySelectorAll(".chart-info").forEach(info => {
    info.addEventListener("mouseenter", () => showFloatingChartTooltip(info));
    info.addEventListener("focusin", () => showFloatingChartTooltip(info));
    info.addEventListener("mouseleave", hideFloatingChartTooltipSoon);
    info.addEventListener("focusout", hideFloatingChartTooltipSoon);
  });
}

function bindColumnHelpTooltips() {
  document.querySelectorAll("th .column-tooltip").forEach(inlineTooltip => {
    const header = inlineTooltip.closest("th");
    if (!header) return;
    header.addEventListener("mouseenter", () => showFloatingColumnTooltip(header));
    header.addEventListener("focusin", () => showFloatingColumnTooltip(header));
    header.addEventListener("mouseleave", hideFloatingColumnTooltipSoon);
    header.addEventListener("focusout", hideFloatingColumnTooltipSoon);
  });
}

function runFixCorrelation(callback) {
  const fix = state.fixLatency;
  if (!fix.records.length) { fix.correlation = null; if (callback) callback(); return; }
  const snapshots = parsedTimestampSnapshots();
  const history = [];
  for (const snap of snapshots) {
    for (const socket of snap.sockets) {
      history.push({
        epochMs: snap.epochMs,
        peer: socket.peer || '',
        local: socket.local || '',
        recvQ: metricValue(socket, 'recvQ') || 0,
        sendQ: metricValue(socket, 'sendQ') || 0,
        rtt: metricValue(socket, 'rtt') || 0,
        retrans: metricValue(socket, 'retrans') || 0,
        cwnd: metricValue(socket, 'cwnd') || 0,
        backoff: metricValue(socket, 'backoff') || 0,
        'skmem.d': metricValue(socket, 'skmem.d') || 0
      });
    }
  }
  const params = {
    records: fix.records,
    history,
    threshold: fix.threshold,
    vmstatSamples: fix.vmstat,
    nstatSamples: fix.nstat,
    gcPauses: state.jvmGc.correlation?.results?.map(r => ({ ...r.pause, alignedEpochMs: r.epochMs })) || state.jvmGc.pauses,
    gcWindowMs: fix.gcWindowMs || (() => { const pauses = state.jvmGc.pauses; if (!pauses.length) return 200; const durations = pauses.map(p => p.durationMs || 0).filter(d => d > 0); if (!durations.length) return 200; const avg = durations.reduce((s, d) => s + d, 0) / durations.length; return Math.round(Math.max(50, avg * 2)); })(),
    cpuCores: fix.cpuCores
  };
  if (fix.records.length > 10000 && window.Worker) {
    const worker = new Worker(new URL("./parse-worker.js", import.meta.url), { type: "module" });
    worker.postMessage({ type: "correlateFixLatency", payload: params });
    worker.onmessage = msg => {
      worker.terminate();
      if (msg.data.type === "correlateFixLatency:done") {
        fix.correlation = msg.data.payload;
      }
      if (callback) callback();
      else { render(); setTimeout(drawFixCharts, 50); }
    };
    return;
  }
  fix.correlation = correlateFixLatency(params);
  if (callback) callback();
}

function fixPagedRows() {
  const fix = state.fixLatency;
  const corr = fix.correlation;
  if (!corr?.results?.length) return { rows: [], total: 0, totalPages: 0, start: 0 };
  const table = state.fixTable;
  let rows = [...corr.results];
  if (table.causeFilter) rows = rows.filter(r => r.cause === table.causeFilter);
  if (table.sortKey === "lag") rows.sort((a, b) => table.sortDir === "desc" ? b.lagMs - a.lagMs : a.lagMs - b.lagMs);
  else if (table.sortKey === "score") rows.sort((a, b) => table.sortDir === "desc" ? b.score - a.score : a.score - b.score);
  else if (table.sortKey === "time") rows.sort((a, b) => table.sortDir === "desc" ? b.receiveMs - a.receiveMs : a.receiveMs - b.receiveMs);
  else if (table.sortKey === "cause") rows.sort((a, b) => table.sortDir === "desc" ? (b.cause || "").localeCompare(a.cause || "") : (a.cause || "").localeCompare(b.cause || ""));
  const total = rows.length;
  const totalPages = Math.ceil(total / table.pageSize);
  const start = (table.page - 1) * table.pageSize;
  return { rows: rows.slice(start, start + table.pageSize), total, totalPages, start };
}

function renderFixLatencyPanel() {
  const fix = state.fixLatency;
  const fixTools = (id) => `<span class="chart-card-tools"><button class="mini" data-fix-zoom-chart="${id}" data-fix-zoom-action="zoomIn" title="Zoom in">${icons.zoomIn}</button><button class="mini" data-fix-zoom-chart="${id}" data-fix-zoom-action="zoomOut" title="Zoom out">${icons.zoomOut}</button><button class="mini" data-fix-zoom-chart="${id}" data-fix-zoom-action="resetZoom" title="Reset">${icons.reset}</button><button class="mini" data-fix-zoom-chart="${id}" data-fix-zoom-action="panLeft" title="Pan left">${icons.arrowLeft}</button><button class="mini" data-fix-zoom-chart="${id}" data-fix-zoom-action="panRight" title="Pan right">${icons.arrowRight}</button><button class="mini" data-action="fixPlayback" title="Playback"><i class="${state.fixLatency.playing ? "ri-pause-line" : "ri-play-line"}"></i></button><button class="mini" data-action="expandFixChart" data-fix-chart-id="${id}" title="${fix.expandedChart === id ? "Collapse" : "Expand"}"><i class="${fix.expandedChart === id ? "ri-collapse-diagonal-line" : "ri-expand-diagonal-line"}"></i></button></span>`;
  const hasRecords = fix.records.length > 0;
  const corr = fix.correlation;
  const summary = corr?.summary;
  const stats = hasRecords ? computeFixStats(fix.records) : null;
  const paged = fixPagedRows();
  return `<section class="panel jvm-gc-panel">
    <div class="panel-head" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:8px 12px">
      <span style="font-weight:700;font-size:13px;color:var(--text);white-space:nowrap">FIX Latency Correlation</span>
      

      ${hasRecords ? `<div class="bdp-controls" style="margin-left:auto">
        <label><span>Lag threshold</span><select id="fixThresholdInput" style="width:auto"><option value="1"${fix.threshold===1?" selected":""}>1 ms</option><option value="2"${fix.threshold===2?" selected":""}>2 ms</option><option value="5"${fix.threshold===5?" selected":""}>5 ms (default)</option><option value="10"${fix.threshold===10?" selected":""}>10 ms</option><option value="20"${fix.threshold===20?" selected":""}>20 ms</option><option value="50"${fix.threshold===50?" selected":""}>50 ms</option><option value="100"${fix.threshold===100?" selected":""}>100 ms</option></select></label>
        <label><span>GC window</span><select id="fixGcWindowInput" style="width:auto"><option value="0"${!fix.gcWindowMs?" selected":""}>auto${state.jvmGc.pauses.length ? ` (${Math.round(Math.max(50, (state.jvmGc.pauses.reduce((s,p) => s + (p.durationMs||0), 0) / state.jvmGc.pauses.length) * 2))}ms)` : ""}</option><option value="50"${fix.gcWindowMs===50?" selected":""}>50 ms</option><option value="100"${fix.gcWindowMs===100?" selected":""}>100 ms</option><option value="200"${fix.gcWindowMs===200?" selected":""}>200 ms</option><option value="500"${fix.gcWindowMs===500?" selected":""}>500 ms</option><option value="1000"${fix.gcWindowMs===1000?" selected":""}>1000 ms</option></select></label>
        
        <label style="margin-left:6px"><span>CPUs</span><select id="fixCpuCores" style="width:auto"><option value="0"${!fix.cpuCores?" selected":""}>auto</option><option value="24"${fix.cpuCores===24?" selected":""}>24</option><option value="32"${fix.cpuCores===32?" selected":""}>32</option><option value="48"${fix.cpuCores===48?" selected":""}>48</option><option value="64"${fix.cpuCores===64?" selected":""}>64</option><option value="96"${fix.cpuCores===96?" selected":""}>96</option><option value="128"${fix.cpuCores===128?" selected":""}>128</option></select></label>
      </div>` : ""}
    </div>
    <div class="panel-body">
      <input type="file" id="fixFileInput" accept="*" multiple style="display:none"/>
      <input type="file" id="fixDirInput" webkitdirectory style="display:none"/>
      <input type="file" id="fixVmstatFileInput" accept=".log,.txt,.out" style="display:none"/>
      <input type="file" id="fixNstatFileInput" accept=".log,.txt,.out" style="display:none"/>
      ${!hasRecords ? `<div class="jvm-gc-import"><p>No FIX logs loaded. Use <strong>Auto-detect dir</strong> or the <strong>FIX</strong> button in the Import tab to load FIX connector logs.</p></div>` : `
        <div class="bdp-context-line ${summary?.overallSeverity || "info"}">
          <span class="risk ${escapeHtml(summary?.overallSeverity || "info")}">${escapeHtml(summary?.overallSeverity || "none")}</span>
          <span class="field-info" tabindex="0" style="position:relative"><i class="ri-information-line"></i><span class="field-info-card" role="tooltip" style="left:0;right:auto;min-width:520px;max-height:280px;overflow-y:auto;columns:2;column-gap:18px"><span class="tooltip-kicker">FIX Latency Correlation — How to read</span><strong>Messages</strong><p>Total FIX messages parsed from all loaded files.</p><strong>Spikes</strong><p>Messages where lag (server receive time − tag 52 SendingTime) exceeds the configured threshold. These are the candidates for root-cause investigation.</p><strong>With ss evidence</strong><p>Spikes for which a matching TCP socket was found in the ss snapshots (by IP:port). This means we could inspect the socket state at the time of the spike.</p><strong>Endpoint match %</strong><p>Proportion of spikes where the FIX connection IP:port was found in ss data. 0% means ss was captured on a different host or the socket was not included.</p><strong>Cause breakdown</strong><p><b style="color:#3b82f6">Network</b>: ss shows retransmissions, RTT spike, cwnd collapse, or backoff at spike time.<br/><b style="color:#a855f7">Kernel</b>: nstat shows backlog drops, listen overflows, or RcvQ drops.<br/><b style="color:#ff9f43">CPU</b>: vmstat shows high run queue, CPU saturation, or I/O wait.<br/><b style="color:#2cc62c">GC</b>: a JVM GC pause overlaps the spike.<br/><b style="color:#8c9aab">Unknown</b>: no symptom found in any source — likely application thread-pool scheduling or application-level delay.</p><strong>GC window</strong><p>A FIX spike is attributed to GC if it occurs during the pause or within this window after the pause ends. The JVM connector cannot read the socket during Stop-The-World, and needs time to drain the backlog after resuming. Shorter window = stricter attribution (only spikes very close to the pause). Longer window = catches backlog drain effects.</p><strong>If all causes are Unknown</strong><p>The network is innocent. The TCP socket was healthy at spike time (recvQ=0, retrans=0, RTT stable, cwnd normal). The lag is caused by something above TCP: thread scheduling, GC, or application processing. Load vmstat/nstat to investigate further.</p></span></span>
          <strong>${summary?.totalRecords || 0} messages · ${summary?.totalSpikes || 0} spikes (lag > ${fix.threshold}ms) · ${summary?.correlatedCount || 0} with ss evidence</strong>
          <em>Max score: ${(summary?.maxScore || 0).toFixed(2)} - Endpoint match: ${((summary?.endpointMatchRate || 0) * 100).toFixed(0)}%</em>
          ${stats ? `<span style="margin-left:auto;font-size:11px;color:var(--soft)">Median: ${stats.median.toFixed(1)}ms - P95: ${stats.p95.toFixed(1)}ms - P99: ${stats.p99.toFixed(1)}ms - Max: ${stats.max.toFixed(1)}ms</span>` : ""}
        </div>
        ${summary?.causeCounts ? `<div class="bdp-context-line info" style="margin-top:6px">
          <i class="ri-pie-chart-line" style="font-size:16px;color:#a78bfa"></i>
          <strong>Cause breakdown:</strong>
          <em>Network: ${summary.causeCounts.network} · GC: ${summary.causeCounts.gc || 0} · Kernel: ${summary.causeCounts.kernel} · CPU: ${summary.causeCounts.cpu} · Unknown: ${summary.causeCounts.unknown}</em>
          
          
          
          <span style="margin-left:auto;display:flex;gap:6px">
            ${!fix.vmstat ? '<button class="tiny-btn" data-action="pickFixVmstatFile"><i class="ri-cpu-line"></i> + vmstat</button>' : '<span class="chip" style="font-size:10px"><i class="ri-cpu-line"></i> vmstat ✓</span>'}
            ${!fix.nstat ? '<button class="tiny-btn" data-action="pickFixNstatFile"><i class="ri-bar-chart-line"></i> + nstat</button>' : '<span class="chip" style="font-size:10px"><i class="ri-bar-chart-line"></i> nstat ✓</span>'}
          </span>
        </div>` : ""}
        <details style="padding:6px 12px;border-radius:8px;background:rgba(140,183,255,0.06);border:1px solid rgba(140,183,255,0.12);font-size:11px;color:var(--muted);line-height:1.5;margin:0 0 0 0"><summary style="cursor:pointer;color:var(--text);font-weight:600">How to read</summary>
          Each dot is a FIX message with lag > threshold. Dot color = <strong style="color:#ff5c77">correlation strength</strong> (not lag severity). 
          <br/><span style="color:#ff5c77">● critical</span> = strong evidence of network/GC/CPU cause.<br/>
          <span style="color:#ff9f43">● warning_high</span> = moderate-strong evidence.<br/>
          <span style="color:#ffd166">● warning</span> = moderate evidence.<br/>
          <span style="color:#39d6d6">● info</span> = weak.<br/>
          <span style="color:#8c9aab">● none</span> = no cause found (healthy socket at spike time).<br/>
          The scatter plot shows lag (X) vs correlation score (Y) — top-right = high lag with strong cause.
          <br/><strong>Note:</strong> nstat counters are host-wide (all sockets), not per-connection. On a busy host with many connections, nstat retrans may be coincidental — ss per-socket evidence is more reliable.
        </div>
        ${buildMultiSourceSummary(fix)}
        <div class="jvm-chart-section">
          <div class="bdp-chart-grid jvm-chart-grid">
            <article class="${fix.expandedChart === "timeline" ? "fix-chart-expanded" : fix.expandedChart ? "fix-chart-hidden" : ""}">
              <div class="bdp-chart-title"><strong>FIX Lag + ss Recv-Q timeline</strong><span>overlay</span>${fixTools("timeline")}</div>
              <svg class="chart bdp-chart" data-fix-chart="timeline" role="img" aria-label="FIX latency timeline"></svg>
              <div class="chart-legend fix-chart-legend">
                <button class="chart-legend-item ${fix.hiddenSeries.has("lag") ? "is-muted" : ""}" data-fix-series="lag" title="Toggle lag spike dots. Colors indicate correlation severity: critical (strong network/GC cause), warning (moderate), info (weak)."><i style="--legend-color:#ff5c77"></i><span>critical</span></button><button class="chart-legend-item ${fix.hiddenSeries.has("sev_warning_high") ? "is-muted" : ""}" data-fix-series="sev_warning_high" title="Score 0.5-0.7: moderate correlation. Click to toggle."><i style="--legend-color:#ff9f43"></i><span>warning_high</span></button><button class="chart-legend-item ${fix.hiddenSeries.has("sev_warning") ? "is-muted" : ""}" data-fix-series="sev_warning" title="Score 0.3-0.5: weak correlation. Click to toggle."><i style="--legend-color:#ffd166"></i><span>warning</span></button><button class="chart-legend-item ${fix.hiddenSeries.has("sev_info") ? "is-muted" : ""}" data-fix-series="sev_info" title="Score 0.01-0.3: minimal correlation. Click to toggle."><i style="--legend-color:#39d6d6"></i><span>info</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("recvq") ? "is-muted" : ""}" data-fix-series="recvq" title="Toggle Recv-Q area. Shows unread bytes in the socket receive buffer from ss snapshots."><i style="--legend-color:rgba(59,130,246,0.8)"></i><span>Recv-Q</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("gczone") ? "is-muted" : ""}" data-fix-series="gczone" title="Toggle GC freeze zones. Red = JVM Stop-The-World (cannot read socket). Orange = drain window (backlog processing after STW)."><i style="--legend-color:rgba(255,92,119,0.4)"></i><span>GC zones</span></button>
              </div>
            </article>
            <article class="${fix.expandedChart === "scatter" ? "fix-chart-expanded" : fix.expandedChart ? "fix-chart-hidden" : ""}">
              <div class="bdp-chart-title"><strong>Lag vs Correlation Score</strong><span>scatter</span>${fixTools("scatter")}</div>
              <svg class="chart bdp-chart" data-fix-chart="scatter" role="img" aria-label="FIX lag scatter"></svg>
              <div class="chart-legend fix-chart-legend">
                <button class="chart-legend-item ${fix.hiddenSeries.has("sev_critical") ? "is-muted" : ""}" data-fix-series="sev_critical" title="Score 0.7-1.0: strong cause identified. Click to toggle."><i style="--legend-color:#ff5c77"></i><span>critical</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("sev_warning_high") ? "is-muted" : ""}" data-fix-series="sev_warning_high" title="Score 0.5-0.7: moderate correlation. Click to toggle."><i style="--legend-color:#ff9f43"></i><span>warning_high</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("sev_warning") ? "is-muted" : ""}" data-fix-series="sev_warning" title="Score 0.3-0.5: weak correlation. Click to toggle."><i style="--legend-color:#ffd166"></i><span>warning</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("sev_info") ? "is-muted" : ""}" data-fix-series="sev_info" title="Score 0.01-0.3: minimal correlation. Click to toggle."><i style="--legend-color:#39d6d6"></i><span>info</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("sev_none") ? "is-muted" : ""}" data-fix-series="sev_none" title="Score 0: no symptom found. Click to toggle."><i style="--legend-color:#8c9aab"></i><span>none</span></button>
              </div>
            </article>
            ${fix.vmstat ? `<article class="${fix.expandedChart === "vmstat" ? "fix-chart-expanded" : fix.expandedChart ? "fix-chart-hidden" : !fix.nstat ? "fix-chart-expanded" : ""}">
              <div class="bdp-chart-title"><strong>CPU + Run Queue (vmstat)</strong><span>timeline</span>${fixTools("vmstat")}</div>
              <svg class="chart bdp-chart" data-fix-chart="vmstat" role="img" aria-label="vmstat CPU timeline"></svg>
              <div class="chart-legend fix-chart-legend">
                <button class="chart-legend-item ${fix.hiddenSeries.has("us") ? "is-muted" : ""}" data-fix-series="us" title="Toggle user CPU %. Time spent in user-space code."><i style="--legend-color:#3b82f6"></i><span>us%</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("sy") ? "is-muted" : ""}" data-fix-series="sy" title="Toggle system CPU %. Time spent in kernel."><i style="--legend-color:#a855f7"></i><span>sy%</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("ussy") ? "is-muted" : ""}" data-fix-series="ussy" title="Toggle us+sy combined. Application + kernel CPU."><i style="--legend-color:#38bdf8"></i><span>us+sy%</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("wa") ? "is-muted" : ""}" data-fix-series="wa" title="Toggle I/O wait %. CPU idle waiting for disk. High values indicate storage bottleneck."><i style="--legend-color:#ff9f43"></i><span>wa%</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("total") ? "is-muted" : ""}" data-fix-series="total" title="Toggle us+sy+wa total. Combined CPU busy time."><i style="--legend-color:#d4ff00"></i><span>us+sy+wa%</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("blocked") ? "is-muted" : ""}" data-fix-series="blocked" title="Toggle blocked processes (b column). Processes in uninterruptible sleep (usually I/O)."><i style="--legend-color:#f472b6"></i><span>blocked</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("runqueue") ? "is-muted" : ""}" data-fix-series="runqueue" title="Toggle run queue (r column). Processes waiting for CPU. Above CPU count = scheduling contention."><i style="--legend-color:#4ade80"></i><span>runqueue</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("fixmarkers") ? "is-muted" : ""}" data-fix-series="fixmarkers" title="Toggle FIX spike markers. White vertical lines showing when FIX messages had lag > threshold."><i style="--legend-color:#ffffff"></i><span>FIX spikes</span></button>
              </div>
            </article>` : ""}
            ${fix.nstat ? `<article class="${fix.expandedChart === "nstat" ? "fix-chart-expanded" : fix.expandedChart ? "fix-chart-hidden" : ""}">
              <div class="bdp-chart-title"><strong>TCP Drops & Retrans (nstat)</strong><span>timeline</span>${fixTools("nstat")}</div>
              <svg class="chart bdp-chart" data-fix-chart="nstat" role="img" aria-label="nstat counters timeline"></svg>
              <div class="chart-legend fix-chart-legend">
                <button class="chart-legend-item ${fix.hiddenSeries.has("retrans") ? "is-muted" : ""}" data-fix-series="retrans" title="Toggle TcpRetransSegs/s. Retransmitted TCP segments per second — indicates packet loss."><i style="--legend-color:#ff5c77"></i><span>Retrans</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("timeouts") ? "is-muted" : ""}" data-fix-series="timeouts" title="Toggle TcpExtTCPTimeouts/s. TCP retransmission timeouts — severe loss or path failure."><i style="--legend-color:#ff9f43"></i><span>Timeouts</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("backlogdrop") ? "is-muted" : ""}" data-fix-series="backlogdrop" title="Toggle TcpExtTCPBacklogDrop/s. Packets dropped because socket backlog is full — application too slow to accept()."><i style="--legend-color:#a855f7"></i><span>BacklogDrop</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("listendrop") ? "is-muted" : ""}" data-fix-series="listendrop" title="Toggle TcpExtListenDrops/s. Incoming connections dropped — listen queue overflow."><i style="--legend-color:#ffd166"></i><span>ListenDrop</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("rcvqdrop") ? "is-muted" : ""}" data-fix-series="rcvqdrop" title="Toggle TcpExtTCPRcvQDrop/s. Packets dropped from receive queue — kernel memory pressure."><i style="--legend-color:#39d6d6"></i><span>RcvQDrop</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("fixmarkers") ? "is-muted" : ""}" data-fix-series="fixmarkers" title="Toggle FIX spike markers. White vertical lines showing when FIX messages had lag > threshold."><i style="--legend-color:#ffffff"></i><span>FIX spikes</span></button>
              </div>
            </article>` : ""}
          </div>
        </div>
        ${corr?.results?.length > 5 ? `<div style="margin:8px 0"><div class="bdp-chart-title"><strong>Spike density heatmap</strong><span>time x lag</span></div><canvas data-fix-heatmap style="width:100%;height:80px;border-radius:6px;background:rgba(30,42,56,0.6)"></canvas></div>` : ""}
        <div class="jvm-gc-results">
          <div class="jvm-table-head">
            <strong>Correlated FIX latency spikes</strong>
            <span>${formatNumber(paged.total)} spike(s) above ${fix.threshold}ms</span>
            <select id="fixCauseFilter" style="margin-left:auto;font-size:11px;padding:2px 6px;width:150px"><option value="">All causes</option><option value="network"${state.fixTable.causeFilter==="network"?" selected":""}>Network</option><option value="gc"${state.fixTable.causeFilter==="gc"?" selected":""}>GC</option><option value="kernel"${state.fixTable.causeFilter==="kernel"?" selected":""}>Kernel</option><option value="cpu"${state.fixTable.causeFilter==="cpu"?" selected":""}>CPU</option><option value="unknown"${state.fixTable.causeFilter==="unknown"?" selected":""}>Unknown</option></select>
            <span style="font-size:11px;color:var(--muted)">Page ${state.fixTable.page}/${paged.totalPages || 1}</span>
            <button class="tiny-btn" data-action="fixTablePrev" ${state.fixTable.page <= 1 ? "disabled" : ""}>←</button>
            <button class="tiny-btn" data-action="fixTableNext" ${state.fixTable.page >= paged.totalPages ? "disabled" : ""}>→</button>
          </div>
          <div class="table-wrap jvm-table-wrap"><table class="mini-table jvm-gc-table"><thead><tr>
            <th data-fix-sort="time" style="cursor:pointer">Time</th>
            <th data-fix-sort="lag" style="cursor:pointer">Lag (ms)</th>
            <th>Direction</th>
            <th>MsgType</th>
            <th>Symbol</th>
            <th>Endpoint</th>
            <th data-fix-sort="score" style="cursor:pointer">Score</th>
            <th>Severity</th>
            <th data-fix-sort="cause" style="cursor:pointer">Cause</th>
            <th>Signals</th>
          </tr></thead><tbody>
            ${paged.rows.map(r => `<tr class="jvm-severity-${escapeHtml(r.severity || "none")}${r.receiveMs === state.fixTable.selectedEpoch ? " fix-selected-row" : ""}" data-fix-epoch="${r.receiveMs}" style="cursor:pointer">
              <td class="mono-cell">${escapeHtml(preciseDateTimeLabel(r.receiveMs))}</td>
              <td><strong>${r.lagMs.toFixed(1)}</strong></td>
              <td>${escapeHtml(r.direction)}</td>
              <td>${escapeHtml(r.msgType)}</td>
              <td>${escapeHtml(r.symbol)}</td>
              <td class="mono-cell">${escapeHtml(r.endpoint)}</td>
              <td>${r.score.toFixed(2)}</td>
              <td><span class="risk ${escapeHtml(r.severity)}">${escapeHtml(r.severity)}</span></td>
              <td>${escapeHtml(r.cause || "")}</td>
              <td>${r.signals.map(s => `<span class="chip">${escapeHtml(s)}</span>`).join(" ")}</td>
            </tr>`).join("")}
          </tbody></table></div>
        </div>
      `}
    </div>
  </section>`;
}

function fixDrawDependencies() {
  return {
    root: document,
    state,
    drawFixTimelineChart,
    drawFixScatterChart,
    drawFixVmstatChart,
    drawFixNstatChart,
    drawFixHeatmap
  };
}

function drawFixCharts(deps = fixDrawDependencies()) {
 try {
  const {
    root = document,
    state: appState = state,
    drawFixTimelineChart: drawTimeline = drawFixTimelineChart,
    drawFixScatterChart: drawScatter = drawFixScatterChart,
    drawFixVmstatChart: drawVmstat = drawFixVmstatChart,
    drawFixNstatChart: drawNstat = drawFixNstatChart,
    drawFixHeatmap: drawHeatmap = drawFixHeatmap
  } = deps;
  const fix = appState.fixLatency;
  if (!fix.correlation?.results?.length) return;
  const history = visibleHistory().filter(s => s.epochMs);
  const allResults = fix.correlation.results;
  // Time range from all records
  const allTimes = fix.records.length ? [fix.records[0].receiveMs, fix.records[fix.records.length - 1].receiveMs] : allResults.map(r => r.receiveMs);
  const tMin = Math.min(...allTimes), tMax = Math.max(...allTimes);
  const tSpan = tMax - tMin || 1;
  function zoomRange(chartId) { const z = fix.zoom?.[chartId] || { start: 0, end: 1 }; return { start: tMin + z.start * tSpan, end: tMin + z.end * tSpan }; }
  const results = allResults;

  // Timeline chart
  const svg1 = root.querySelector("[data-fix-chart='timeline']");
  if (svg1 && results.length) {
    const tz = fix.zoom?.timeline || { start: 0, end: 1 };
    const ztStart = tMin + tz.start * tSpan;
    const ztEnd = tMin + tz.end * tSpan;
    const r1 = results.filter(r => r.receiveMs >= ztStart && r.receiveMs <= ztEnd);
    if (r1.length) drawTimeline(svg1, r1, history, appState.jvmGc.correlation?.results?.map(r => ({ ...r.pause, alignedEpochMs: r.epochMs })) || (appState.jvmGc.pauses.length ? appState.jvmGc.pauses : null), fix.gcWindowMs || 200, deps);
  }

  // Scatter chart
  const svg2 = root.querySelector("[data-fix-chart='scatter']");
  if (svg2 && results.length) drawScatter(svg2, results, deps);

  // vmstat chart (zoom based on vmstat own time range)
  const svg3 = root.querySelector("[data-fix-chart='vmstat']");
  if (svg3 && fix.vmstat?.length) {
    const vz = fix.zoom?.vmstat || { start: 0, end: 1 };
    const vt0 = fix.vmstat[0].epochMs, vt1 = fix.vmstat[fix.vmstat.length-1].epochMs, vspan = vt1-vt0||1;
    const vzStart = vt0 + vz.start * vspan, vzEnd = vt0 + vz.end * vspan;
    const vm = fix.vmstat.filter(s => s.epochMs >= vzStart && s.epochMs <= vzEnd);
    drawVmstat(svg3, vm.length ? vm : fix.vmstat, results, fix.cpuCores, deps);
  }

  // nstat chart (zoom based on nstat own time range)
  const svg4 = root.querySelector("[data-fix-chart='nstat']");
  if (svg4 && fix.nstat?.length) {
    const nz = fix.zoom?.nstat || { start: 0, end: 1 };
    const nt0 = fix.nstat[0].epochMs, nt1 = fix.nstat[fix.nstat.length-1].epochMs, nspan = nt1-nt0||1;
    const nzStart = nt0 + nz.start * nspan, nzEnd = nt0 + nz.end * nspan;
    const ns = fix.nstat.filter(s => s.epochMs >= nzStart && s.epochMs <= nzEnd);
    drawNstat(svg4, ns.length ? ns : fix.nstat, results, deps);
  }
  // Heatmap
  const heatCanvases = root.querySelectorAll("[data-fix-heatmap]");
  if (results.length > 5) heatCanvases.forEach(c => drawHeatmap(c, results, tMin, tMax, deps));
 } catch(e) { console.error("drawFixCharts error:", e); }
}

function drawFixHeatmap(canvas, results, fullT0, fullT1, deps = fixDrawDependencies()) {
  const w = canvas.clientWidth || 600, h = canvas.clientHeight || 80;
  canvas.width = w * 2; canvas.height = h * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  ctx.clearRect(0, 0, w, h);
  const pad = { l: 50, r: 10, t: 10, b: 20 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
  const t0 = fullT0 != null ? fullT0 : Math.min(...results.map(r => r.receiveMs));
  const t1 = fullT1 != null ? fullT1 : Math.max(...results.map(r => r.receiveMs));
  const tSpan = t1 - t0 || 1;
  const maxLag = Math.max(...results.map(r => r.lagMs), 1);
  const cols = Math.max(10, Math.min(80, Math.ceil(tSpan / 1000)));
  const rows = 6;
  const cellW = plotW / cols, cellH = plotH / rows;
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (const r of results) {
    const col = Math.min(cols - 1, Math.max(0, Math.floor(((r.receiveMs - t0) / tSpan) * cols)));
    const row = Math.min(rows - 1, Math.floor((r.lagMs / maxLag) * rows));
    grid[rows - 1 - row][col]++;
  }
  const maxCount = Math.max(1, ...grid.flat());
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const intensity = grid[r][c] / maxCount;
      if (intensity > 0) {
        const hue = 60 - intensity * 60;
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${0.3 + intensity * 0.7})`;
        ctx.fillRect(pad.l + c * cellW, pad.t + r * cellH, cellW - 1, cellH - 1);
      }
    }
  }
  // Y axis (lag)
  ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "9px sans-serif"; ctx.textAlign = "right";
  ctx.fillText(`${maxLag.toFixed(0)}ms`, pad.l - 4, pad.t + 9);
  ctx.fillText("0ms", pad.l - 4, pad.t + plotH);
  // X axis (time) - 5 evenly spaced chronological ticks
  const tickCount = 5;
  for (let i = 0; i < tickCount; i++) {
    const f = i / (tickCount - 1);
    const epoch = t0 + f * tSpan;
    const px = pad.l + f * plotW;
    const align = i === 0 ? "left" : i === tickCount - 1 ? "right" : "center";
    ctx.textAlign = align;
    ctx.fillText(fixTimeLabel(epoch), px, h - 2);
  }
  // Interactive crosshair tooltip + sync
  attachFixHeatmapCrosshair(canvas, pad, w, h, t0, tSpan, plotW, results, maxLag);
}

function attachFixHeatmapCrosshair(canvas, pad, w, h, t0, tSpan, plotW, results, maxLag) {
  if (canvas._heatmapCrosshairAttached) return;
  canvas._heatmapCrosshairAttached = true;
  canvas.style.cursor = "crosshair";
  // Overlay for tooltip
  let overlay = canvas.parentElement.querySelector(".heatmap-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "heatmap-overlay";
    overlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none";
    canvas.parentElement.style.position = "relative";
    canvas.parentElement.appendChild(overlay);
  }
  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const scaleX = w / rect.width;
    const px = mx * scaleX;
    if (px < pad.l || px > pad.l + plotW) { overlay.innerHTML = ""; syncFixCrosshairs(null, canvas); return; }
    const frac = (px - pad.l) / plotW;
    const epoch = t0 + frac * tSpan;
    // Find spikes near this time (within 1 column width)
    const colWidth = tSpan / Math.max(10, Math.min(80, Math.ceil(tSpan / 1000)));
    const nearby = results.filter(r => Math.abs(r.receiveMs - epoch) < colWidth);
    const count = nearby.length;
    const avgLag = count ? (nearby.reduce((s, r) => s + r.lagMs, 0) / count) : 0;
    const maxL = count ? Math.max(...nearby.map(r => r.lagMs)) : 0;
    // Draw crosshair line + tooltip
    const leftPct = (mx / rect.width) * 100;
    overlay.innerHTML = `<div style="position:absolute;left:${leftPct}%;top:0;bottom:20px;width:1px;background:rgba(255,209,102,0.7)"></div>${count ? `<div style="position:absolute;left:${Math.min(leftPct, 85)}%;top:4px;background:rgba(11,16,24,0.85);border:1px solid #52657a;border-radius:6px;padding:4px 8px;font-size:10px;color:#edf4ff;white-space:nowrap"><strong>${fixTimeLabel(epoch)}</strong><br><span style="color:#ffd166">${count} spike${count > 1 ? "s" : ""}</span> · avg ${avgLag.toFixed(1)}ms · max ${maxL.toFixed(1)}ms</div>` : `<div style="position:absolute;left:${Math.min(leftPct, 85)}%;top:4px;background:rgba(11,16,24,0.85);border:1px solid #52657a;border-radius:6px;padding:4px 8px;font-size:10px;color:#8c9aab;white-space:nowrap">${fixTimeLabel(epoch)}</div>`}`;
    syncFixCrosshairs(epoch, canvas);
  }
  canvas.style.pointerEvents = "auto";
  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("mouseleave", () => { overlay.innerHTML = ""; syncFixCrosshairs(null, canvas); });
}

function fixTimeLabel(epochMs) {
  const d = new Date(epochMs);
  return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}:${String(d.getUTCSeconds()).padStart(2,"0")}`;
}

function fixChartXTicks(t0, t1, pad, w, count = 5) {
  const span = t1 - t0 || 1;
  return Array.from({ length: count }, (_, i) => {
    const f = i / (count - 1);
    const epoch = t0 + f * span;
    const px = pad.l + f * (w - pad.l - pad.r);
    return { px, label: fixTimeLabel(epoch) };
  });
}

function fixChartYTicks(min, max, pad, h, count = 5) {
  const span = max - min || 1;
  return Array.from({ length: count }, (_, i) => {
    const f = i / (count - 1);
    const val = min + f * span;
    const py = pad.t + (h - pad.t - pad.b) * (1 - f);
    return { py, val };
  });
}

function fixChartGrid(xTicks, yTicks, pad, w, h) {
  const yLines = yTicks.map(t => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${t.py}" y2="${t.py}" stroke="var(--line)" stroke-width="0.5"/>`).join("");
  const xLines = xTicks.map(t => `<line x1="${t.px}" x2="${t.px}" y1="${pad.t}" y2="${h - pad.b}" stroke="var(--line)" stroke-width="0.3"/>`).join("");
  return yLines + xLines;
}

function fixChartXLabels(xTicks, h) {
  return xTicks.map((t, i) => `<text x="${t.px}" y="${h - 20}" text-anchor="${i === xTicks.length - 1 ? "end" : i === 0 ? "start" : "middle"}" fill="var(--muted)" font-size="10">${t.label}</text>`).join("");
}

function fixChartYLabels(yTicks, pad, formatter) {
  return yTicks.map(t => `<text x="${pad.l - 6}" y="${t.py + 3}" text-anchor="end" fill="var(--muted)" font-size="10">${formatter(t.val)}</text>`).join("");
}

function fixSeverityColor(severity) {
  return severity === "critical" ? "#ff5c77" : severity === "warning_high" ? "#ff9f43" : severity === "warning" ? "#ffd166" : severity === "info" ? "#39d6d6" : "#8c9aab";
}

function drawFixTimelineChart(svg, results, history, gcPauses = null, gcWindowMs = 200, deps = fixDrawDependencies()) {
  const { state: appState = state } = deps;
  const w = svg.clientWidth || svg.parentElement?.clientWidth || 640, h = svg.clientHeight || 200;
  const pad = { t: 32, r: 60, b: 48, l: 70 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;

  const allTimes = [...history.map(s => s.epochMs), ...results.map(r => r.receiveMs)];
  const t0 = Math.min(...allTimes), t1 = Math.max(...allTimes);
  const span = t1 - t0 || 1;
  const x = t => pad.l + ((t - t0) / span) * plotW;

  const maxLag = Math.max(...results.map(r => r.lagMs), 1);
  const maxRecvQ = Math.max(...history.map(s => s.recvQ || 0), 1);
  const yLag = v => pad.t + plotH - (v / maxLag) * plotH;
  const yRecvQ = v => pad.t + plotH - (v / maxRecvQ) * plotH;

  const xTicks = fixChartXTicks(t0, t1, pad, w);
  const yTicksLag = fixChartYTicks(0, maxLag, pad, h);
  const grid = fixChartGrid(xTicks, yTicksLag, pad, w, h);
  const xLabels = fixChartXLabels(xTicks, h);
  const yLabelsLag = fixChartYLabels(yTicksLag, pad, v => v >= 1000 ? `${(v/1000).toFixed(1)}s` : `${Math.round(v)}ms`);
  const yLabelsRecvQ = yTicksLag.map(t => {
    const val = (t.val / maxLag) * maxRecvQ;
    return `<text x="${w - pad.r + 6}" y="${t.py + 3}" text-anchor="start" fill="rgba(59,130,246,0.8)" font-size="10">${val >= 1024 ? `${(val/1024).toFixed(0)}K` : Math.round(val)}B</text>`;
  }).join("");

  // RecvQ area
  let recvQPath = "";
  for (let i = 0; i < history.length; i++) {
    const px = x(history[i].epochMs), py = yRecvQ(history[i].recvQ || 0);
    recvQPath += i === 0 ? `M${px},${py}` : `L${px},${py}`;
  }
  const recvQArea = recvQPath ? `${recvQPath}L${x(history[history.length - 1].epochMs)},${pad.t + plotH}L${x(history[0].epochMs)},${pad.t + plotH}Z` : "";

  // Lag points
  const hidden = appState.fixLatency.hiddenSeries;
  const points = results.filter(r => !hidden.has(`sev_${r.severity || "none"}`)).map(r => {
    const color = fixSeverityColor(r.severity);
    return `<circle cx="${x(r.receiveMs)}" cy="${yLag(r.lagMs)}" r="3.5" fill="${color}" opacity="0.85" style="cursor:pointer"><title>${r.lagMs.toFixed(1)}ms | ${r.direction} ${r.msgType} | ${r.endpoint} | ${r.severity}${r.cause ? " | cause: " + r.cause : ""}${r.signals.length ? "\nsignals: " + r.signals.join(", ") : ""}</title></circle>`;
  }).join("");

  const legend = "";

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="rgba(0,0,0,0.15)"/>
    ${grid}${xLabels}${yLabelsLag}${yLabelsRecvQ}
    ${gcPauses && !hidden.has("gczone") ? gcPauses.filter(p => { const ps = p.alignedEpochMs || p.epochMs || 0; return ps >= t0 - gcWindowMs && ps <= t1; }).map(p => { const ps = p.alignedEpochMs || p.epochMs || 0; const pe = ps + (p.durationMs || 0); const x1 = Math.max(pad.l, x(ps)); const x2 = Math.min(pad.l + plotW, x(pe)); const x3 = Math.min(pad.l + plotW, x(pe + gcWindowMs)); return `<rect x="${x1}" y="${pad.t}" width="${Math.max(1, x2 - x1)}" height="${plotH}" fill="rgba(255,92,119,0.5)"/><rect x="${x2}" y="${pad.t}" width="${Math.max(0, x3 - x2)}" height="${plotH}" fill="rgba(255,159,67,0.3)"/>`; }).join("") : ""}
    ${!hidden.has("recvq") ? `<path d="${recvQArea}" fill="rgba(59,130,246,0.12)" stroke="rgba(59,130,246,0.5)" stroke-width="1.2"/>` : ""}
    ${!hidden.has("lag") ? points : ""}
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="var(--muted)" font-size="11">Time (UTC)</text>
    <text x="12" y="${h / 2}" transform="rotate(-90 12 ${h / 2})" text-anchor="middle" fill="var(--muted)" font-size="11">Lag (ms)</text>
    <text x="${w - 12}" y="${h / 2}" transform="rotate(90 ${w - 12} ${h / 2})" text-anchor="middle" fill="rgba(59,130,246,0.8)" font-size="11">Recv-Q (bytes)</text>

    ${legend}
    <rect class="fix-hover-zone" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="transparent"/>
    ${(() => { const sel = results.find(r => r.receiveMs === appState.fixTable.selectedEpoch); if (!sel) return ""; const sx = x(sel.receiveMs), sy = yLag(sel.lagMs); return `<line x1="${sx}" y1="${pad.t}" x2="${sx}" y2="${pad.t + plotH}" stroke="#fff" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.9"/><circle cx="${sx}" cy="${sy}" r="7" fill="none" stroke="#fff" stroke-width="2"/><text x="${sx}" y="${pad.t - 6}" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">${sel.lagMs.toFixed(1)}ms ${sel.cause || ""}</text>`; })()}
  `;
  attachFixChartCrosshair(svg, pad, w, h, t0, span, results, r => `${r.lagMs.toFixed(1)}ms · ${r.direction} ${r.msgType} ${r.symbol} · ${r.endpoint} · Cause: ${r.cause || "unknown"} · Score: ${r.score ? r.score.toFixed(2) : "0"}`);
}

function drawFixScatterChart(svg, results, deps = fixDrawDependencies()) {
  const { state: appState = state } = deps;
  const w = svg.clientWidth || svg.parentElement?.clientWidth || 640, h = svg.clientHeight || 200;
  const pad = { t: 32, r: 26, b: 48, l: 70 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;

  const maxLag = Math.max(...results.map(r => r.lagMs), 1);
  const x = v => pad.l + (v / maxLag) * plotW;
  const y = v => pad.t + plotH - v * plotH;

  const xTicks = fixChartYTicks(0, maxLag, { t: pad.t, l: pad.l, r: pad.r }, w).map(t => ({ px: pad.l + (t.val / maxLag) * plotW, val: t.val }));
  const yTicks = fixChartYTicks(0, 1, pad, h);
  const grid = fixChartGrid(xTicks.map(t => ({ px: t.px })), yTicks, pad, w, h);
  const xLabels = xTicks.map(t => `<text x="${t.px}" y="${h - 20}" text-anchor="middle" fill="var(--muted)" font-size="10">${t.val >= 1000 ? `${(t.val/1000).toFixed(1)}s` : `${Math.round(t.val)}ms`}</text>`).join("");
  const yLabels = yTicks.map(t => `<text x="${pad.l - 6}" y="${t.py + 3}" text-anchor="end" fill="var(--muted)" font-size="10">${t.val.toFixed(2)}</text>`).join("");

  const hidden = appState.fixLatency.hiddenSeries;
  const points = results.filter(r => !hidden.has(`sev_${r.severity || "none"}`)).map(r => {
    const color = fixSeverityColor(r.severity);
    return `<circle cx="${x(r.lagMs)}" cy="${y(r.score)}" r="3.5" fill="${color}" opacity="0.8" style="cursor:pointer"><title>Lag: ${r.lagMs.toFixed(1)}ms | Score: ${r.score.toFixed(2)} | ${r.severity}\nCause: ${r.cause || "unknown"}\nSignals: ${r.signals.join(", ") || "none"}\n${r.endpoint} ${r.direction} ${r.msgType}</title></circle>`;
  }).join("");

  const legend = "";

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="rgba(0,0,0,0.15)"/>
    ${grid}${xLabels}${yLabels}
    ${points}
    <text x="${w / 2}" y="${h - 2}" text-anchor="middle" fill="var(--muted)" font-size="11">Lag (ms)</text>
    <text x="12" y="${h / 2}" transform="rotate(-90 12 ${h / 2})" text-anchor="middle" fill="var(--muted)" font-size="11">Correlation Score</text>

    ${legend}
    ${(() => { const sel = results.find(r => r.receiveMs === appState.fixTable.selectedEpoch); if (!sel) return ""; const sx = x(sel.lagMs), sy = y(sel.score); return `<circle cx="${sx}" cy="${sy}" r="7" fill="none" stroke="#fff" stroke-width="2"/><text x="${sx + 10}" y="${sy - 4}" fill="#fff" font-size="10" font-weight="700">${sel.lagMs.toFixed(1)}ms</text>`; })()}
  `;
}
function renderWhatIfSimulation() {
  const rows = state.history;
  if (!rows || rows.length < 2) return "";
  const drops = dropRateSummary(rows);
  if (!drops || !drops.totalDropDelta) return "";
  const socket = state.sockets.find(s => s.id === state.selectedId) || state.sockets[0];
  if (!socket) return "";
  const currentRb = metricValue(socket, "skmem.rb") || 212992;
  const currentRcvSpace = metricValue(socket, "rcv_space") || 65536;
  const multiplier = state.whatIfMultiplier || 2;
  // Estimate: drops happen when recvQ > rcv_space. With bigger buffer, fewer overflows.
  let dropsAvoided = 0;
  const threshold = currentRcvSpace;
  const newThreshold = threshold * multiplier;
  for (let i = 1; i < rows.length; i++) {
    const recvQ = rows[i].recvQ || rows[i]["recvQ"] || 0;
    if (recvQ > threshold && recvQ <= newThreshold) dropsAvoided++;
  }
  const pct = drops.totalDropDelta > 0 ? Math.min(100, Math.round((dropsAvoided / drops.totalDropDelta) * 100)) : 0;
  return `<div class="advisor-whatif" style="margin:8px 0;padding:10px 14px;border-radius:8px;background:rgba(77,222,138,0.06);border:1px solid rgba(77,222,138,0.2)">
    <strong style="color:#4cde8a"><i class="ri-flask-line"></i> What-if simulation</strong>
    <div style="margin-top:6px;font-size:12px;color:var(--text)">
      If <code>rcv_space</code> was <strong><select id="whatIfMultiplier" style="background:var(--panel-2);color:var(--text);border:1px solid var(--line);border-radius:4px;padding:1px 4px;font-size:12px">
        <option value="2"${multiplier===2?" selected":""}>2×</option><option value="4"${multiplier===4?" selected":""}>4×</option><option value="8"${multiplier===8?" selected":""}>8×</option><option value="16"${multiplier===16?" selected":""}>16×</option>
      </select></strong> larger (${formatBytesHuman(currentRcvSpace)} → ${formatBytesHuman(currentRcvSpace * multiplier)}):
      <div style="margin-top:4px;font-size:13px"><strong style="color:${pct > 50 ? "#4cde8a" : pct > 0 ? "#ffd166" : "#8c9aab"}">${pct}%</strong> of drops potentially avoided (${dropsAvoided}/${drops.totalDropDelta})</div>
      <div style="margin-top:2px;font-size:10px;color:var(--muted)">Current skmem.rb=${formatBytesHuman(currentRb)} · Suggested: <code>sysctl net.core.rmem_max=${currentRb * multiplier}</code></div>
    </div>
  </div>`;
}

let _fixPlaybackTimer = null;
function toggleFixPlayback() {
  const fix = state.fixLatency;
  if (fix.playing) {
    fix.playing = false;
    if (_fixPlaybackTimer) { cancelAnimationFrame(_fixPlaybackTimer); _fixPlaybackTimer = null; }
    return;
  }
  if (!fix.correlation?.results?.length) return;
  fix.playing = true;
  const results = fix.correlation.results;
  const t0 = Math.min(...results.map(r => r.receiveMs));
  const t1 = Math.max(...results.map(r => r.receiveMs));
  const duration = 10000; // 10s playback
  const startReal = performance.now();
  function tick() {
    if (!fix.playing) return;
    const elapsed = performance.now() - startReal;
    const frac = Math.min(1, elapsed / duration);
    const epoch = t0 + frac * (t1 - t0);
    syncFixCrosshairs(epoch, null);
    // Also update heatmap overlay
    document.querySelectorAll("[data-fix-heatmap]").forEach(c => {
      if (c._heatmapCrosshairAttached) {
        const overlay = c.parentElement?.querySelector(".heatmap-overlay");
        if (overlay) overlay.innerHTML = `<div style="position:absolute;left:${frac * 100}%;top:0;bottom:20px;width:2px;background:#ffd166"></div>`;
      }
    });
    if (frac >= 1) { fix.playing = false; syncFixCrosshairs(null, null); return; }
    _fixPlaybackTimer = requestAnimationFrame(tick);
  }
  _fixPlaybackTimer = requestAnimationFrame(tick);
}

function buildMultiSourceSummary(fix) {
  if (!fix.correlation?.results?.length || (!fix.vmstat?.length && !fix.nstat?.length)) return "";
  const results = fix.correlation.results;
  const groups = fixSpikeGroups(results, 2000);
  const events = [];
  for (const g of groups.slice(0, 5)) {
    const peakSpike = g.spikes.reduce((best, s) => s.lagMs > best.lagMs ? s : best, g.spikes[0]);
    const t = peakSpike.receiveMs;
    const parts = [`FIX lag ${peakSpike.lagMs.toFixed(1)}ms`];
    if (fix.vmstat?.length) {
      const vm = fix.vmstat.reduce((best, s) => Math.abs(s.epochMs - t) < Math.abs(best.epochMs - t) ? s : best, fix.vmstat[0]);
      if (Math.abs(vm.epochMs - t) < 5000) {
        const cpu = vm.us + vm.sy + vm.wa;
        if (cpu > 50) parts.push(`CPU ${cpu}%`);
        if (vm.r > 4) parts.push(`runqueue ${vm.r}`);
      }
    }
    if (fix.nstat?.length) {
      const ns = fix.nstat.reduce((best, s) => Math.abs(s.epochMs - t) < Math.abs(best.epochMs - t) ? s : best, fix.nstat[0]);
      if (Math.abs(ns.epochMs - t) < 5000) {
        const retrans = ns.counters?.TcpRetransSegs || 0;
        const prev = fix.nstat[Math.max(0, fix.nstat.indexOf(ns) - 1)];
        const delta = prev ? retrans - (prev.counters?.TcpRetransSegs || 0) : 0;
        if (delta > 0) parts.push(`retrans +${formatNumber(delta)}`);
      }
    }
    if (parts.length > 1) {
      const time = fixTimeLabel(t);
      const cause = peakSpike.cause || "unknown";
      events.push(`<li><strong>${time}</strong> — ${parts.join(" + ")} → <em>${cause}</em></li>`);
    }
  }
  if (!events.length) return "";
  return `<div class="bdp-context-line" style="margin:8px 0;padding:8px 12px;border-radius:8px;background:rgba(93,183,255,0.06);border:1px solid rgba(93,183,255,0.15)">
    <div style="font-weight:700;font-size:12px;color:var(--text);margin-bottom:4px"><i class="ri-links-line"></i> Multi-source correlation</div>
    <ul style="margin:0;padding:0 0 0 16px;font-size:11px;color:var(--soft);line-height:1.7">${events.join("")}</ul>
  </div>`;
}



function fixSpikeGroups(fixResults, gapMs = 2000) {
  if (!fixResults.length) return [];
  const sorted = [...fixResults].sort((a, b) => a.receiveMs - b.receiveMs);
  const groups = [];
  let cur = { id: 1, startMs: sorted[0].receiveMs, endMs: sorted[0].receiveMs, spikes: [sorted[0]] };
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].receiveMs - cur.endMs > gapMs) {
      groups.push(cur);
      cur = { id: groups.length + 1, startMs: sorted[i].receiveMs, endMs: sorted[i].receiveMs, spikes: [sorted[i]] };
    } else {
      cur.endMs = sorted[i].receiveMs;
      cur.spikes.push(sorted[i]);
    }
  }
  groups.push(cur);
  return groups;
}

function renderFixSpikeMarkers(fixResults, t0, t1, x, pad, plotH, hidden) {
  if (hidden.has("fixmarkers") || !fixResults.length) return "";
  const visible = fixResults.filter(r => r.receiveMs >= t0 && r.receiveMs <= t1);
  if (!visible.length) return "";
  const visibleSpan = t1 - t0 || 1;
  const gapMs = Math.max(200, visibleSpan * 0.03);
  const groups = fixSpikeGroups(visible, gapMs);
  return groups.map(g => {
    const midMs = (g.startMs + g.endMs) / 2;
    const px = x(midMs);
    return `<line x1="${px}" y1="${pad.t}" x2="${px}" y2="${pad.t + plotH}" stroke="#ffffff" stroke-width="0.7" opacity="0.3"/><text x="${px}" y="${pad.t - 3}" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="8">FIX#${g.id}</text>`;
  }).join("") + visible.map(r => {
    const px = x(r.receiveMs);
    return `<line x1="${px}" y1="${pad.t}" x2="${px}" y2="${pad.t + plotH}" stroke="#ffffff" stroke-width="0.3" opacity="0.15"/>`;
  }).join("");
}

function drawFixVmstatChart(svg, vmsamples, fixResults, cpuCores = 0, deps = fixDrawDependencies()) {
  const { state: appState = state } = deps;
  const w = svg.clientWidth || svg.parentElement?.clientWidth || 640, h = svg.clientHeight || 200;
  const pad = { t: 32, r: 50, b: 48, l: 70 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;

  const t0 = vmsamples[0].epochMs, t1 = vmsamples[vmsamples.length - 1].epochMs;
  const span = t1 - t0 || 1;
  const x = t => pad.l + ((t - t0) / span) * plotW;

  const maxR = Math.max(...vmsamples.map(s => s.r), 4);
  const yCpu = v => pad.t + plotH - (v / 100) * plotH;
  const yR = v => pad.t + plotH - (v / maxR) * plotH;

  const xTicks = fixChartXTicks(t0, t1, pad, w);
  const yTicksCpu = fixChartYTicks(0, 100, pad, h);
  const grid = fixChartGrid(xTicks, yTicksCpu, pad, w, h);
  const xLabels = fixChartXLabels(xTicks, h);
  const yLabelsCpu = fixChartYLabels(yTicksCpu, pad, v => `${Math.round(v)}%`);
  const yLabelsR = yTicksCpu.map(t => {
    const val = (t.val / 100) * maxR;
    return `<text x="${w - pad.r + 6}" y="${t.py + 3}" text-anchor="start" fill="#2cc62c" font-size="10">${Math.round(val)}</text>`;
  }).join("");

  // CPU lines
  let usPath = "", syPath = "", ussyPath = "", waPath = "", totalPath = "", blockedPath = "";
  for (let i = 0; i < vmsamples.length; i++) {
    const s = vmsamples[i], px = x(s.epochMs);
    usPath += (i === 0 ? "M" : "L") + `${px},${yCpu(s.us)}`;
    syPath += (i === 0 ? "M" : "L") + `${px},${yCpu(s.sy)}`;
    ussyPath += (i === 0 ? "M" : "L") + `${px},${yCpu(s.us + s.sy)}`;
    waPath += (i === 0 ? "M" : "L") + `${px},${yCpu(s.wa)}`;
    totalPath += (i === 0 ? "M" : "L") + `${px},${yCpu(s.us + s.sy + s.wa)}`;
    blockedPath += (i === 0 ? "M" : "L") + `${px},${yR(s.b || 0)}`;
  }
  // Run queue
  let rPath = "";
  for (let i = 0; i < vmsamples.length; i++) {
    rPath += (i === 0 ? "M" : "L") + `${x(vmsamples[i].epochMs)},${yR(vmsamples[i].r)}`;
  }
  const hidden = appState.fixLatency.hiddenSeries;
  // FIX spike markers
  const markers = renderFixSpikeMarkers(fixResults, t0, t1, x, pad, plotH, hidden);
  const legend = "";

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="rgba(0,0,0,0.15)"/>
    ${grid}${xLabels}${yLabelsCpu}${yLabelsR}
    ${markers}
    ${!hidden.has("total") ? `<path d="${totalPath}" fill="none" stroke="#d4ff00" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.7"/>` : ""}
    ${!hidden.has("ussy") ? `<path d="${ussyPath}" fill="none" stroke="#38bdf8" stroke-width="2"/>` : ""}
    ${!hidden.has("wa") ? `<path d="${waPath}" fill="none" stroke="#ff9f43" stroke-width="1.5" opacity="0.7"/>` : ""}
    ${!hidden.has("sy") ? `<path d="${syPath}" fill="none" stroke="#a855f7" stroke-width="1.5" opacity="0.7"/>` : ""}
    ${!hidden.has("us") ? `<path d="${usPath}" fill="none" stroke="#3b82f6" stroke-width="2"/>` : ""}
    ${!hidden.has("runqueue") ? `<path d="${rPath}" fill="none" stroke="#4ade80" stroke-width="2" stroke-dasharray="4,2"/>` : ""}
    ${!hidden.has("blocked") ? `<path d="${blockedPath}" fill="none" stroke="#f472b6" stroke-width="1.5" stroke-dasharray="6,3"/>` : ""}
    ${cpuCores > 0 ? `<line x1="${pad.l}" x2="${w - pad.r}" y1="${yR(cpuCores)}" y2="${yR(cpuCores)}" stroke="#ff5c77" stroke-width="1" stroke-dasharray="6,4" opacity="0.7"/><text x="${w - pad.r - 4}" y="${yR(cpuCores) - 4}" text-anchor="end" fill="#ff5c77" font-size="9">${cpuCores} CPUs</text>` : ""}
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="var(--muted)" font-size="11">Time (UTC)</text>
    <text x="12" y="${h / 2}" transform="rotate(-90 12 ${h / 2})" text-anchor="middle" fill="var(--muted)" font-size="11">CPU %</text>
    <text x="${w - 12}" y="${h / 2}" transform="rotate(90 ${w - 12} ${h / 2})" text-anchor="middle" fill="#2cc62c" font-size="11">Run Queue</text>

    ${legend}
    <rect class="fix-hover-zone" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="transparent"/>
  `;
  attachFixChartCrosshair(svg, pad, w, h, t0, span, vmsamples, s => `r=${s.r} · b=${s.b || 0} · us=${s.us}% · sy=${s.sy}% · wa=${s.wa}% · us+sy+wa=${s.us + s.sy + s.wa}% · idle=${s.id}% · cs=${formatNumber(s.cs)} · bo=${s.bo}`);
}

function drawFixNstatChart(svg, nsamples, fixResults, deps = fixDrawDependencies()) {
  const { state: appState = state } = deps;
  const w = svg.clientWidth || svg.parentElement?.clientWidth || 640, h = svg.clientHeight || 200;
  const pad = { t: 32, r: 26, b: 48, l: 70 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;

  const t0 = nsamples[0].epochMs, t1 = nsamples[nsamples.length - 1].epochMs;
  const span = t1 - t0 || 1;
  const x = t => pad.l + ((t - t0) / span) * plotW;

  const keys = ["TcpRetransSegs", "TcpExtTCPTimeouts", "TcpExtTCPBacklogDrop", "TcpExtListenDrops", "TcpExtTCPRcvQDrop"];
  const colors = ["#ff5c77", "#ff9f43", "#a855f7", "#ffd166", "#39d6d6"];
  const labels = ["Retrans", "Timeouts", "BacklogDrop", "ListenDrop", "RcvQDrop"];

  const hidden = appState.fixLatency.hiddenSeries;
  const seriesKeys = ["retrans", "timeouts", "backlogdrop", "listendrop", "rcvqdrop"];
  const visibleKeys = keys.filter((_, i) => !hidden?.has(seriesKeys[i]));
  const visibleValues = nsamples.flatMap(s => visibleKeys.map(k => s.counters[k] || 0));
  const rawMin = visibleValues.length ? Math.min(...visibleValues) : 0;
  const rawMax = visibleValues.length ? Math.max(...visibleValues) : 1;
  const range = rawMax - rawMin || 1;
  const yMin = visibleKeys.length === 1 ? Math.max(0, rawMin - range * 0.1) : 0;
  const maxVal = visibleKeys.length === 1 ? rawMax + range * 0.1 : Math.max(1, rawMax);
  const ySpan = maxVal - yMin || 1;
  const y = v => pad.t + plotH - ((v - yMin) / ySpan) * plotH;

  const xTicks = fixChartXTicks(t0, t1, pad, w);
  const yTicks = fixChartYTicks(yMin, maxVal, pad, h);
  const grid = fixChartGrid(xTicks, yTicks, pad, w, h);
  const xLabelsHtml = fixChartXLabels(xTicks, h);
  const yLabelsHtml = fixChartYLabels(yTicks, pad, v => String(Math.round(v)));

  const lines = keys.map((key, ki) => {
    if (hidden?.has(seriesKeys[ki])) return "";
    let path = "";
    for (let i = 0; i < nsamples.length; i++) {
      const px = x(nsamples[i].epochMs), py = y(nsamples[i].counters[key] || 0);
      path += (i === 0 ? "M" : "L") + `${px},${py}`;
    }
    return path ? `<path d="${path}" fill="none" stroke="${colors[ki]}" stroke-width="1.5" opacity="0.85"/>` : "";
  }).join("");

  const markers = renderFixSpikeMarkers(fixResults, t0, t1, x, pad, plotH, hidden);

  const legend = "";

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="rgba(0,0,0,0.15)"/>
    ${grid}${xLabelsHtml}${yLabelsHtml}
    ${markers}
    ${lines}
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="var(--muted)" font-size="11">Time (UTC)</text>
    <text x="12" y="${h / 2}" transform="rotate(-90 12 ${h / 2})" text-anchor="middle" fill="var(--muted)" font-size="11">Count / second</text>

    ${legend}
    <rect class="fix-hover-zone" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="transparent"/>
  `;
  attachFixChartCrosshair(svg, pad, w, h, t0, span, nsamples, s => keys.map((k, i) => `${labels[i]}=${s.counters[k] || 0}`).filter(v => !v.endsWith("=0")).join(" · ") || "all zero");
}

let _fixCrosshairEpoch = null;
function syncFixCrosshairs(epoch, sourceSvg) {
  _fixCrosshairEpoch = epoch;
  document.querySelectorAll("[data-fix-chart]").forEach(svg => {
    if (svg === sourceSvg) return;
    const g = svg.querySelector(".fix-crosshair-g");
    if (!g) return;
    if (epoch === null) { g.style.display = "none"; return; }
    if (svg._fixCrosshairUpdate) svg._fixCrosshairUpdate(epoch);
  });
}

function attachFixChartCrosshair(svg, pad, w, h, t0, span, data, labelFn) {
  const zone = svg.querySelector(".fix-hover-zone");
  if (!zone || !data.length) return;
  let g = svg.querySelector(".fix-crosshair-g");
  if (g) g.remove();
  g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.classList.add("fix-crosshair-g");
  g.style.pointerEvents = "none";
  g.style.display = "none";
  g.innerHTML = `<line class="xh-v" y1="${pad.t}" y2="${h - pad.b}" stroke="#ffd166" stroke-width="1" stroke-dasharray="4,3" opacity="0.8"/><line class="xh-h" x1="${pad.l}" x2="${w - pad.r}" stroke="#ffd166" stroke-width="1" stroke-dasharray="4,3" opacity="0.5"/><rect class="xh-bg" rx="6" ry="6" fill="rgba(14,17,22,0.35)" stroke="rgba(140,183,255,0.25)" stroke-width="1"/><text class="xh-title" font-size="12" font-weight="700" fill="#edf4ff"></text><g class="xh-rows"></g>`;
  svg.appendChild(g);
  function updateCrosshair(epoch, my) {
    const frac = Math.max(0, Math.min(1, (epoch - t0) / span));
    const closest = data.reduce((best, item) => Math.abs((item.epochMs || item.receiveMs) - epoch) < Math.abs((best.epochMs || best.receiveMs) - epoch) ? item : best, data[0]);
    const cx = pad.l + (((closest.epochMs || closest.receiveMs) - t0) / span) * (w - pad.l - pad.r);
    g.style.display = "";
    g.querySelector(".xh-v").setAttribute("x1", cx);
    g.querySelector(".xh-v").setAttribute("x2", cx);
    g.querySelector(".xh-h").setAttribute("y1", my);
    g.querySelector(".xh-h").setAttribute("y2", my);
    const label = labelFn(closest);
    const time = fixTimeLabel(closest.epochMs || closest.receiveMs);
    const lines = label.split(" · ");
    const tooltipX = cx + 14 + 160 > w ? cx - 170 : cx + 14;
    const tooltipY = Math.max(pad.t + 4, Math.min(h - pad.b - (lines.length * 16 + 30), my - 20));
    const titleEl = g.querySelector(".xh-title");
    titleEl.setAttribute("x", tooltipX + 10); titleEl.setAttribute("y", tooltipY + 18); titleEl.textContent = time;
    const rowsG = g.querySelector(".xh-rows");
    rowsG.innerHTML = lines.map((line, i) => {
      const c = line.startsWith("r=") ? "#4ade80" : line.startsWith("b=") ? "#f472b6" : line.startsWith("us=") ? "#3b82f6" : line.startsWith("sy=") ? "#a855f7" : line.startsWith("wa=") ? "#ff9f43" : line.startsWith("us+sy+wa") ? "#d4ff00" : line.startsWith("us+sy") ? "#38bdf8" : line.startsWith("idle") ? "#94a3b8" : line.startsWith("Retrans") ? "#ff5c77" : line.startsWith("Timeouts") ? "#ff9f43" : line.startsWith("Backlog") ? "#a855f7" : line.startsWith("Listen") ? "#ffd166" : line.startsWith("RcvQ") ? "#39d6d6" : "#8cb7ff";
      return `<text x="${tooltipX + 10}" y="${tooltipY + 34 + i * 16}" font-size="11" fill="#c4d0de"><tspan fill="${c}">● </tspan>${line}</text>`;
    }).join("");
    const bgEl = g.querySelector(".xh-bg");
    const tw = Math.max(150, Math.max(time.length, ...lines.map(l => l.length)) * 7 + 20);
    const th = lines.length * 16 + 28;
    bgEl.setAttribute("x", tooltipX); bgEl.setAttribute("y", tooltipY); bgEl.setAttribute("width", tw); bgEl.setAttribute("height", th);
  }
  svg._fixCrosshairUpdate = (epoch) => { updateCrosshair(epoch, pad.t + 30); };
  zone.addEventListener("mousemove", e => {
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const epoch = t0 + Math.max(0, Math.min(1, (mx - pad.l) / (w - pad.l - pad.r))) * span;
    updateCrosshair(epoch, my);
    syncFixCrosshairs(epoch, svg);
  });
  zone.addEventListener("mouseleave", () => { g.style.display = "none"; syncFixCrosshairs(null, svg); });
  // Drag-to-zoom
  let dragStart = null;
  let dragOverlay = svg.querySelector(".fix-drag-overlay");
  if (!dragOverlay) { dragOverlay = document.createElementNS("http://www.w3.org/2000/svg", "rect"); dragOverlay.classList.add("fix-drag-overlay"); dragOverlay.setAttribute("y", pad.t); dragOverlay.setAttribute("height", h - pad.t - pad.b); dragOverlay.setAttribute("fill", "rgba(93,183,255,0.12)"); dragOverlay.setAttribute("stroke", "#5db7ff"); dragOverlay.setAttribute("stroke-width", "1"); dragOverlay.style.display = "none"; dragOverlay.style.pointerEvents = "none"; svg.appendChild(dragOverlay); }
  zone.addEventListener("pointerdown", e => { if (e.button !== 0) return; const rect = svg.getBoundingClientRect(); dragStart = e.clientX - rect.left; zone.setPointerCapture(e.pointerId); });
  zone.addEventListener("pointermove", e => { if (dragStart === null) return; const rect = svg.getBoundingClientRect(); const mx = e.clientX - rect.left; const x1 = Math.max(pad.l, Math.min(w - pad.r, dragStart)); const x2 = Math.max(pad.l, Math.min(w - pad.r, mx)); dragOverlay.setAttribute("x", Math.min(x1, x2)); dragOverlay.setAttribute("width", Math.abs(x2 - x1)); dragOverlay.style.display = Math.abs(x2 - x1) > 5 ? "" : "none"; });
  zone.addEventListener("pointerup", e => { if (dragStart === null) return; const rect = svg.getBoundingClientRect(); const mx = e.clientX - rect.left; const plotW = w - pad.l - pad.r; const dist = Math.abs(mx - dragStart); dragOverlay.style.display = "none"; dragStart = null; if (dist < 12) return; const left = Math.max(0, Math.min(1, (Math.min(mx, dragStart) - pad.l) / plotW)); const right = Math.max(0, Math.min(1, (Math.max(mx, dragStart) - pad.l) / plotW)); if (right - left < 0.01) return; const chartId = svg.dataset.fixChart; if (!chartId) return; const z = state.fixLatency.zoom[chartId] || { start: 0, end: 1 }; const zSpan = z.end - z.start; state.fixLatency.zoom[chartId] = { start: z.start + left * zSpan, end: z.start + right * zSpan }; drawFixCharts(); });
}

function renderActiveTab() {
  if (state.activeTab === "quality") return renderCaptureQualityReport();
  if (state.activeTab === "diagnosis") return renderDiagnosis();
  if (state.activeTab === "advisor") return renderAdvisor();
  if (state.activeTab === "templates") return renderAnalysisTemplates();
  if (state.activeTab === "map") return renderServiceMap();
  if (state.activeTab === "conversations") return renderConversations();
  if (state.activeTab === "expert") return renderExpertInformation();
  if (state.activeTab === "timeline") return renderTimeline();
  if (state.activeTab === "alerts") return renderAlerting();
  if (state.activeTab === "compare") return renderComparison();
  if (state.activeTab === "groups") return renderGroupedSockets();
  if (state.activeTab === "anomalies") return renderAnomalies(state.anomalies.filter(a => severityVisible(a.severity)));
  if (state.activeTab === "fields") return renderFields();
  return renderSocketTable();
}

function captureQualityReport() {
  return analyzeCaptureQuality({
    raw: state.raw,
    sockets: state.sockets,
    sourceName: state.sourceName,
    command: state.command
  });
}

function renderCaptureQualityReport() {
  return renderCaptureQualityReportView(captureQualityReport(), {
    escapeHtml,
    formatNumber,
    numberFormatterWith,
    icons
  });
}

function diagnosticHypotheses() {
  if (_cachedDiagVersion === state.dataVersion) return _cachedDiagHypotheses;
  const rows = sortedFilteredSockets();
  const hypotheses = buildDiagnosticHypotheses({
    sockets: rows.length ? rows : state.sockets,
    anomalies: state.anomalies,
    history: state.history,
    thresholds: thresholdFor,
    bdpWindow: {
      direction: normalizeBdpDirection(state.prefs.bdpDirection),
      configuredLinkCapacityMbps: configuredLinkCapacityMbps()
    }
  }).slice(0, 8);
  const quality = captureQualityReport();
  const qualityScore = quality.score || 0;
  if (qualityScore < 55) {
    const cap = qualityScore < 35 ? 0.3 : 0.5;
    for (const h of hypotheses) {
      if (h.confidenceScore > cap) {
        h.confidenceScore = cap;
        h.confidenceCapped = true;
        h.confidenceCapReason = qualityScore < 35 ? `Capped at ${Math.round(cap * 100)}% - capture quality is ${quality.grade} (${qualityScore}/100)` : `Capped at ${Math.round(cap * 100)}% - capture quality is only ${quality.grade} (${qualityScore}/100). Need stronger evidence.`;
      }
    }
  }
  _cachedDiagVersion = state.dataVersion;
  _cachedDiagHypotheses = hypotheses;
  return hypotheses;
}

function cachedRootCauseMatrix() {
  if (_cachedMatrixVersion === state.dataVersion && _cachedMatrix) return _cachedMatrix;
  _cachedMatrixVersion = state.dataVersion;
  _cachedMatrix = buildRootCauseMatrix(state.sockets);
  return _cachedMatrix;
}

function renderDiagnosis() {
  const hypotheses = diagnosticHypotheses();
  const top = hypotheses[0];
  const matrix = cachedRootCauseMatrix();
  const qualityCap = (captureQualityReport().score || 0) < 55;
  if (qualityCap) {
    const cap = (captureQualityReport().score || 0) < 35 ? 0.3 : 0.5;
    for (const c of matrix.causes) { if (c.confidence > cap) c.confidence = cap; }
  }
  const view = state.diagnosisView || "matrix";
  const aiSummary = buildAiSummary({
    matrix,
    stories: cachedStories(),
    multiSocket: state._multiSocketEvents || cachedMultiSocket(),
    rateAlerts: state._rateAlerts || cachedRateAlerts(),
    captureQuality: captureQualityReport(),
    hypotheses,
    comparison: state.baseline ? buildBaselineNarrative(buildComparison(), state.baseline.anomalies || [], state.anomalies) : null
  });
  return `<div class="diagnosis-shell">
    <section class="ai-summary-block">
      <div class="ai-summary-icon"><i class="ri-sparkling-2-line"></i></div>
      <div class="ai-summary-lines">${aiSummary.split(". ").filter(Boolean).map((s, i) => {
        const text = s.endsWith(".") ? s : s + ".";
        const formatted = text
          .replace(/(\d+:\d+:\d+\s*UTC)/g, "<b>$1</b>")
          .replace(/(\d+\.?\d*[KMG]B\/s)/g, "<b>$1</b>")
          .replace(/(\d+[KMG]B\s*?\s*\d+\.?\d*[KMG]B)/g, "<b>$1</b>")
          .replace(/(java:\d+|nginx:\d+)/g, "<b>$1</b>")
          .replace(/(\d+%)/g, "<b>$1</b>")
          .replace(/(ambiguous|More evidence needed)/g, "<i>$1</i>")
          .replace(/(Network path appears healthy|not network|application-side)/gi, "<i>$1</i>")
          .replace(/(Most likely cause|Root cause is)/g, "<i>$1</i>");
        if (i === 0) return `<p class="ai-lead">${formatted}</p>`;
        if (text.includes("Root cause") || text.includes("Most likely")) return `<p class="ai-cause">${formatted}</p>`;
        return `<p class="ai-detail">${formatted}</p>`;
      }).join("")}</div>
    </section>
    <div class="pill-toggle" data-active="${view === "hypotheses" ? "1" : "0"}">
      <div class="pill-slider"></div>
      <button class="${view === "matrix" ? "active" : ""}" data-action="diagnosisView" data-value="matrix"><i class="ri-grid-line"></i> Root Cause Matrix</button>
      <button class="${view === "hypotheses" ? "active" : ""}" data-action="diagnosisView" data-value="hypotheses"><i class="ri-file-list-3-line"></i> Hypotheses</button>
    </div>
    ${view === "matrix" ? (matrix.causes.length ? renderRootCauseMatrix(matrix) : "<div class=\"empty\">No socket data to build the matrix.</div>") : `<div class="diagnosis-grid">${hypotheses.map(renderDiagnosticHypothesis).join("")}</div>`}
  </div>`;
}

function renderRootCauseMatrix(matrix) {
  return `<section class="root-cause-matrix">
    <header>
      <h4><i class="ri-grid-line"></i> Root Cause Matrix</h4>
      ${matrix.ambiguous ? `<span class="risk medium">Ambiguous - multiple causes compete</span>` : ""}
    </header>
    <div class="matrix-grid">
      <div class="matrix-header"><span>Confidence</span><span>Signals</span><span>Probable cause</span></div>
      ${matrix.causes.map(cause => {
        const pct = Math.round(cause.confidence * 100);
        const level = pct >= 60 ? "high" : pct >= 30 ? "medium" : "low";
        return `<div class="matrix-cell ${level}${matrix.topCause?.id === cause.id ? " top" : ""}">
          <div class="matrix-bar" style="width:${pct}%"></div>
          <span class="matrix-pct">${pct}%</span>
          <small>${cause.signalCount}/${cause.totalSignals}</small>
          <strong>${escapeHtml(cause.label)}</strong>
        </div>`;
      }).join("")}
    </div>
  </section>`;
}

function renderDiagnosticHypothesis(item) {
  return `<article class="advisor-card diagnosis-card ${escapeHtml(item.severity)}">
    <header>
      <div>
        <span class="risk ${escapeHtml(item.severity)}">${escapeHtml(item.severity)}</span>
        <strong>${escapeHtml(item.title)}</strong>
      </div>
      <span class="confidence${item.confidenceCapped ? " capped" : ""}" title="${item.confidenceCapped ? escapeHtml(item.confidenceCapReason) : `${item.confidenceSignals} converging signal(s), ${item.confidenceCounters} counter-evidence(s)`}"><span class="confidence-bar" style="width:${Math.round((item.confidenceScore || 0) * 100)}%"></span>${Math.round((item.confidenceScore || 0) * 100)}% confidence${item.confidenceCapped ? " ?? capped" : ""}</span>
    </header>
    <p>${escapeHtml(item.summary)}</p>
    <div class="evidence-row">
      <span><i class="ri-radar-line"></i> ${escapeHtml(item.category)}</span>
      <span><i class="ri-plug-line"></i> ${formatNumber(item.count)} socket(s)</span>
      ${item.processes.length ? `<span><i class="ri-cpu-line"></i> ${escapeHtml(item.processes.join(", "))}</span>` : ""}
      ${item.peers.length ? `<span><i class="ri-exchange-line"></i> ${escapeHtml(item.peers.join(", "))}</span>` : ""}
    </div>
    <div class="diagnosis-confidence-summary" style="font-size:11px;color:var(--muted);padding:4px 0;border-top:1px solid var(--line);margin-top:4px">
      <span style="color:#2cc62c" title="Signals supporting this hypothesis"><i class="ri-check-line"></i> ${item.confidenceDetail?.strong?.length || item.evidence.length} present</span>
      <span style="color:#ff9f43;margin-left:10px" title="Counter-evidence weakening this hypothesis"><i class="ri-close-line"></i> ${item.confidenceDetail?.contra?.length || item.counterEvidence.length} counter</span>
      <span style="color:#8c9aab;margin-left:10px" title="Expected signals not found in this capture"><i class="ri-question-line"></i> ${item.confidenceDetail?.missing?.length || 0} missing</span>
    </div>
    <div class="advisor-columns">
      <div>
        <b style="color:#2cc62c">Signals present</b>
        <ul>${item.evidence.length ? item.evidence.map(entry => `<li>${escapeHtml(entry)}</li>`).join("") : "<li>No strong signal.</li>"}</ul>
      </div>
      <div>
        <b style="color:#ff9f43">Counter-evidence</b>
        <ul>${item.counterEvidence.length ? item.counterEvidence.map(entry => `<li>${escapeHtml(entry)}</li>`).join("") : "<li>None obvious.</li>"}</ul>
      </div>
      ${item.confidenceDetail?.missing?.length ? `<div>
        <b style="color:#8c9aab">Missing evidence</b>
        <ul>${item.confidenceDetail.missing.map(entry => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>
      </div>` : ""}
    </div>
    <details>
      <summary><i class="ri-terminal-box-line"></i> Validation commands</summary>
      <pre class="code">${escapeHtml(item.commands.join("\n"))}</pre>
    </details>
    ${item.actionableCommands?.length ? `<details class="diagnosis-actionable">
      <summary><i class="ri-tools-line"></i> Actionable tuning (computed from observed values)</summary>
      <pre class="code">${escapeHtml(item.actionableCommands.join("\n"))}</pre>
    </details>` : ""}
    ${item.learnMore?.length ? `<details class="diagnosis-learn-more">
      <summary><i class="ri-book-open-line"></i> Learn more</summary>
      <ul>${item.learnMore.map(entry => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>
    </details>` : ""}
    ${item.confidenceDetail ? `<details class="diagnosis-confidence-detail">
      <summary><i class="ri-scales-3-line"></i> What would confirm or reject</summary>
      <div class="confidence-confirm-reject">
        <div><b><i class="ri-checkbox-circle-line"></i> Would confirm:</b> ${escapeHtml(item.confidenceDetail.wouldConfirm)}</div>
        <div><b><i class="ri-close-circle-line"></i> Would reject:</b> ${escapeHtml(item.confidenceDetail.wouldReject)}</div>
        ${item.confidenceDetail.missing?.length ? `<div><b><i class="ri-question-line"></i> Missing evidence:</b> ${item.confidenceDetail.missing.map(m => escapeHtml(m)).join("; ")}</div>` : ""}
      </div>
    </details>` : ""}
    ${renderDiagnosticPlaybook(item)}
    <footer>
      ${item.topSocketId ? `<button data-jump="${escapeHtml(item.topSocketId)}">${icons.focus} Show context row</button>` : ""}
    </footer>
  </article>`;
}

function renderDiagnosticPlaybook(item) {
  const pb = playbookForHypothesis(item.id);
  if (!pb) return "";
  const topSocket = state.sockets.find(s => s.id === item.topSocketId);
  const resolved = resolvePlaybook(pb, topSocket);
  if (!resolved) return "";
  return `<details class="diagnosis-playbook">
    <summary><i class="ri-route-line"></i> Playbook: ${escapeHtml(resolved.title)}</summary>
    <div class="playbook-content">
      <div class="playbook-section">
        <h5><i class="ri-computer-line"></i> Local (receiver/sender)</h5>
        <pre class="code">${escapeHtml(resolved.local.join("\n"))}</pre>
      </div>
      <div class="playbook-section">
        <h5><i class="ri-remote-control-line"></i> Peer side</h5>
        <pre class="code">${escapeHtml(resolved.peer.join("\n"))}</pre>
      </div>
      <div class="playbook-section">
        <h5><i class="ri-server-line"></i> Host / infra</h5>
        <pre class="code">${escapeHtml(resolved.host.join("\n"))}</pre>
      </div>
      <div class="playbook-section warn">
        <h5><i class="ri-error-warning-line"></i> Do NOT conclude</h5>
        <ul>${resolved.doNotConclude.map(w => `<li>${escapeHtml(w)}</li>`).join("")}</ul>
      </div>
      <div class="playbook-section safe">
        <h5><i class="ri-shield-check-line"></i> Prudent mitigation</h5>
        <ul>${resolved.mitigation.map(m => `<li>${escapeHtml(m)}</li>`).join("")}</ul>
      </div>
    </div>
  </details>`;
}

function renderAdvisor() {
  const findings = state.advisorFindings;
  const top = findings[0];
  const hidden = Math.max(0, state.anomalies.length - findings.reduce((sum, finding) => sum + finding.count, 0));
  return `<div class="advisor-shell">
    <section class="advisor-hero">
      <div>
        <span class="tooltip-kicker">Background advisor</span>
        <h3>${escapeHtml(top?.title || "No diagnosis yet")}</h3>
        <p>${escapeHtml(top?.pattern || "Import or parse ss output to generate expert guidance.")}</p>
      </div>
      <div class="advisor-score">
        <span>${formatNumber(findings.length)}</span>
        <small>prioritized finding(s)</small>
      </div>
    </section>
    ${hidden > 0 ? `<div class="advisor-note"><i class="ri-filter-3-line"></i> ${formatNumber(hidden)} lower-level anomaly signals are compressed into higher-value findings to keep the action list readable.</div>` : ""}
    ${state.peerCapture.correlations?.length ? `<div class="advisor-peer-correlation" style="margin:8px 0;padding:8px 12px;border-radius:6px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25)"><strong style="color:#3b82f6"><i class="ri-links-line"></i> Multi-host correlation (${state.peerCapture.sourceName})</strong>${state.peerCapture.correlations.slice(0, 5).map(c => `<div style="margin-top:6px;font-size:12px;color:var(--text)"><span style="color:var(--muted)">${escapeHtml(c.localSocket.local)} → ${escapeHtml(c.localSocket.peer)}</span><br/>${c.localSendQ > 0 && c.peerRecvQ > 0 ? `<span style="color:#ff9f43">⚠ Local Send-Q: <b>${formatNumber(c.localSendQ)}</b> bytes — Peer Recv-Q: <b>${formatNumber(c.peerRecvQ)}</b> bytes → <em>peer is not reading fast enough</em></span>` : c.localRecvQ > 0 && c.peerSendQ > 0 ? `<span style="color:#ff9f43">⚠ Local Recv-Q: <b>${formatNumber(c.localRecvQ)}</b> bytes — Peer Send-Q: <b>${formatNumber(c.peerSendQ)}</b> bytes → <em>local app is not reading fast enough</em></span>` : `<span style="color:#2cc62c">✓ Both sides healthy (queues empty)</span>`}</div>`).join("")}</div>` : ""}
    ${(() => { const trends = detectTrends(); return trends.length ? `<div class="advisor-trends" style="margin:8px 0;padding:8px 12px;border-radius:6px;background:rgba(255,159,67,0.08);border:1px solid rgba(255,159,67,0.25)"><strong style="color:#ff9f43"><i class="ri-timer-flash-line"></i> Predictive alerts</strong>${trends.map(t => `<div style="margin-top:4px;font-size:12px;color:var(--text)"><b>${t.metric}</b> growing ${t.rate}/window — current ${formatNumber(t.current)} ${t.unit}, overflow in <b style="color:#ff5c77">~${t.eta} min</b></div>`).join("")}</div>` : ""; })()}
    ${renderWhatIfSimulation()}
    <div class="advisor-grid">
      ${findings.map(renderAdvisorFinding).join("")}
    </div>
  </div>`;
}

function renderRemediationWizard(finding) {
  const fixes = remediationForFinding(finding);
  if (!fixes.length) return "";
  return `<div class="remediation-wizard" style="margin:8px 0;padding:10px 12px;border-radius:8px;background:rgba(77,222,138,0.05);border:1px solid rgba(77,222,138,0.2)">
    <strong style="color:#4cde8a;font-size:11px"><i class="ri-first-aid-kit-line"></i> Auto-remediation</strong>
    ${fixes.map(f => `<div style="margin-top:6px">
      <div style="font-size:11px;color:var(--text);margin-bottom:3px">${escapeHtml(f.description)}</div>
      <pre class="code" style="margin:0;font-size:11px;padding:6px 10px;border-radius:6px;background:rgba(0,0,0,0.3);cursor:pointer" data-copy-cmd="${escapeHtml(f.command)}" title="Click to copy">${escapeHtml(f.command)}</pre>
    </div>`).join("")}
  </div>`;
}

function remediationForFinding(finding) {
  const t = finding.title?.toLowerCase() || "";
  const fixes = [];
  if (t.includes("drop") || t.includes("buffer")) {
    fixes.push({ description: "Increase receive buffer max:", command: "sudo sysctl -w net.core.rmem_max=16777216" });
    fixes.push({ description: "Increase socket buffer:", command: "sudo sysctl -w net.ipv4.tcp_rmem='4096 131072 16777216'" });
  }
  if (t.includes("retrans") || t.includes("loss") || t.includes("congestion")) {
    fixes.push({ description: "Check path loss with mtr:", command: "mtr --report --report-cycles 100 <PEER_IP>" });
    fixes.push({ description: "Check NIC errors:", command: "ethtool -S <INTERFACE> | grep -i error" });
  }
  if (t.includes("rtt") || t.includes("latency") || t.includes("slow")) {
    fixes.push({ description: "Trace route latency:", command: "mtr --tcp --port 443 --report <PEER_IP>" });
  }
  if (t.includes("backoff") || t.includes("timeout") || t.includes("rto")) {
    fixes.push({ description: "Check TCP keepalive settings:", command: "sysctl net.ipv4.tcp_keepalive_time net.ipv4.tcp_keepalive_intvl net.ipv4.tcp_keepalive_probes" });
  }
  if (t.includes("queue") || t.includes("recv-q") || t.includes("consumer")) {
    fixes.push({ description: "Check application read rate:", command: "ss -tnp | grep <PORT> | awk '{print $2}'" });
    fixes.push({ description: "Increase backlog:", command: "sudo sysctl -w net.core.somaxconn=4096" });
  }
  if (t.includes("window") || t.includes("scale") || t.includes("autotuning")) {
    fixes.push({ description: "Enable window scaling:", command: "sudo sysctl -w net.ipv4.tcp_window_scaling=1" });
    fixes.push({ description: "Increase max window:", command: "sudo sysctl -w net.ipv4.tcp_rmem='4096 131072 67108864'" });
  }
  return fixes.slice(0, 3);
}

function renderAdvisorFinding(finding) {
  return `<article class="advisor-card ${finding.severity}">
    <header>
      <div>
        <span class="risk ${finding.severity}">${escapeHtml(finding.severity)}</span>
        <strong>${escapeHtml(finding.title)}</strong>
      </div>
      <span class="confidence">${escapeHtml(finding.confidence)} confidence</span>
    </header>
    <p>${escapeHtml(finding.why)}</p>
    <div class="evidence-row">
      <span><i class="ri-plug-line"></i> ${formatNumber(finding.count)} socket(s)</span>
      ${finding.processes.length ? `<span><i class="ri-cpu-line"></i> ${escapeHtml(finding.processes.join(", "))}</span>` : ""}
      ${finding.peer.length ? `<span><i class="ri-exchange-line"></i> ${escapeHtml(finding.peer.join(", "))}</span>` : ""}
    </div>
    <div class="advisor-columns">
      <div>
        <b>Next checks</b>
        <ul>${finding.next.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div>
        <b>Mitigation path</b>
        <ul>${finding.mitigate.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
    </div>
    <details>
      <summary><i class="ri-terminal-box-line"></i> Suggested command line evidence</summary>
      <pre class="code">${escapeHtml(finding.commands.join("\n"))}</pre>
    </details>
    ${renderRemediationWizard(finding)}
    <footer>
      ${finding.socketId ? `<button data-jump="${escapeHtml(finding.socketId)}">${icons.focus} Show context row</button>` : ""}
      <button data-action="copyAdvisorCommands" data-finding-id="${escapeHtml(finding.id)}">${icons.copy} Copy commands</button>
    </footer>
  </article>`;
}

function renderAnalysisTemplates() {
  return `<div class="template-workbench">
    <section class="advisor-hero">
      <div>
        <span class="tooltip-kicker">Analysis templates</span>
        <h3>Apply expert context in one click</h3>
        <p>Templates tune filters, table columns, chart widgets, and the starting investigation view for common Linux network workloads.</p>
      </div>
      <div class="advisor-score">
        <span>${formatNumber(Object.keys(ANALYSIS_TEMPLATES).length)}</span>
        <small>templates</small>
      </div>
    </section>
    <div class="template-grid">
      ${Object.entries(ANALYSIS_TEMPLATES).map(([id, template]) => `<article class="template-card">
        <header><i class="${template.icon}"></i><strong>${escapeHtml(template.name)}</strong></header>
        <p>${escapeHtml(template.focus)}</p>
        <div class="template-meta">
          <span>${template.filter ? escapeHtml(template.filter) : "no filter"}</span>
          <span>${formatNumber(template.columns.length)} columns</span>
          <span>${formatNumber(template.charts.length)} charts</span>
        </div>
        <ul>${template.checks.map(check => `<li>${escapeHtml(check)}</li>`).join("")}</ul>
        <footer><button class="primary" data-template-apply="${id}">${icons.focus} Apply template</button></footer>
      </article>`).join("")}
    </div>
  </div>`;
}

function renderSocketTable() {
  return renderSocketTableView({
    state,
    html,
    escapeHtml,
    renderGridControls,
    renderPagination,
    sortedFilteredSockets,
    pagedRows,
    visibleColumns,
    renderHeader,
    renderRowActions,
    renderTableSettingsTrigger,
    renderTableSettingsMenu
  });
}

function tableSettingsViewContext() {
  return { state, tableColumns: TABLE_COLUMNS, tableDefaults, icons, escapeHtml, formatNumber };
}

function renderTableSettingsTrigger() {
  return renderTableSettingsTriggerView({ icons });
}

function renderTableSettingsDrawer() {
  return renderTableSettingsDrawerView(tableSettingsViewContext());
}

function renderTableSettingsMenu() {
  return renderTableSettingsMenuView(tableSettingsViewContext());
}

function renderRowActions(socket) {
  const pos = state.openMenuId === socket.id && state.openMenuPos
    ? `style="left:${state.openMenuPos.left}px;top:${state.openMenuPos.top}px"`
    : "";
  return `<div class="row-actions">
    <button class="icon mini-menu" data-action-menu="${escapeHtml(socket.id)}" title="Socket actions"><i class="ri-menu-3-line"></i></button>
    <div class="row-menu ${state.openMenuId === socket.id ? "open" : ""}" ${pos}>
      <button data-row-action="chart" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-line-chart-line"></i> Go to Chart pane</button>
      <button data-row-action="details" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-search-eye-line"></i> Open details</button>
      <button data-row-action="filter-src" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-filter-3-line"></i> Filter source IP</button>
      <button data-row-action="filter-dst" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-filter-2-line"></i> Filter destination IP</button>
      <button data-row-action="copy" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-file-copy-line"></i> Copy raw row</button>
    </div>
  </div>`;
}

function renderEndpointCell(endpoint, extra = "") {
  const alias = currentAliasForEndpoint(endpoint);
  if (!alias?.label) return `<span>${escapeHtml(endpoint)}</span>${extra}`;
  return `<div class="endpoint-cell" title="${escapeHtml(endpoint)}">
    <strong>${escapeHtml(alias.label)}</strong>
    ${alias.role ? `<em>${escapeHtml(alias.role)}</em>` : ""}
    <small>${escapeHtml(endpoint)}</small>
    ${extra}
  </div>`;
}

function renderPeerCell(socket) {
  const host = socket.peerAddress?.host || "";
  const intel = state.ipIntel[host];
  const summary = ipIntelSummary(intel);
  const detail = ipIntelDetail(intel);
  return `<div class="peer-cell">
    ${renderEndpointCell(socket.peer)}
    ${summary ? `<small class="ip-intel" title="${escapeHtml(detail || summary)}"><i class="ri-building-4-line"></i> ${escapeHtml(summary)}</small>` : ""}
    ${intel?.status === "loading" ? `<small class="ip-intel loading"><i class="ri-loader-4-line"></i> enriching public IP...</small>` : ""}
  </div>`;
}

function renderHeader(col) {
  return renderTableHeader(col, { state, icons, escapeHtml, renderColumnTooltip });
}

function columnHelpContext() {
  return { fieldDocs: FIELD_DOCS, thresholdFor, formatMetricValue, escapeHtml };
}

function columnHelp(col) {
  return columnHelpView(col, columnHelpContext());
}

function renderThresholdSummary(help) {
  return renderThresholdSummaryView(help, columnHelpContext());
}

function renderColumnTooltip(col) {
  return renderColumnTooltipView(col, columnHelpContext());
}

function gridOptionSets() {
  const key = `${state.dataVersion}|${state.sockets.length}`;
  if (state.cache.optionKey === key && state.cache.optionSets) return state.cache.optionSets;
  const optionSets = buildSocketOptionSets(state.sockets);
  state.cache.optionKey = key;
  state.cache.optionSets = optionSets;
  return optionSets;
}

function renderGridControls(total) {
  const { states, families, srcIps, dstIps, srcPorts, dstPorts, processes } = gridOptionSets();
  const anomaliesOnly = state.table.filters.onlyAnomalies;
  return `<div class="grid-controls-shell">
    <div class="grid-controls">
      <section class="filter-cluster filter-cluster--scope">
        <span class="filter-cluster-title">Scope</span>
        <div class="filter-cluster-grid filter-cluster-grid--scope">
          <select id="riskFilter">${["all", "critical", "high", "medium", "low"].map(v => `<option value="${v}" ${state.table.filters.risk === v ? "selected" : ""}>risk ${v}</option>`).join("")}</select>
          <select id="stateFilter"><option value="all">all states</option>${states.map(v => `<option ${state.table.filters.state === v ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select>
          <select id="familyFilter"><option value="all">all protocols</option>${families.map(v => `<option ${state.table.filters.family === v ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select>
          <input id="processFilter" list="processOptions" placeholder="process" value="${escapeHtml(state.table.filters.process)}" />
        </div>
      </section>

      <section class="filter-cluster filter-cluster--metrics">
        <span class="filter-cluster-title">Flow health</span>
        <div class="filter-cluster-grid filter-cluster-grid--metrics">
          <input id="minRtt" type="number" min="0" placeholder="RTT min (ms)" value="${escapeHtml(state.table.filters.minRtt)}" />
          <input id="minRecvQ" type="number" min="0" placeholder="Recv-Q min" value="${escapeHtml(state.table.filters.minRecvQ)}" />
          <input id="minSendQ" type="number" min="0" placeholder="Send-Q min" value="${escapeHtml(state.table.filters.minSendQ)}" />
        </div>
      </section>

      <aside class="filter-side-actions">
        <label class="filter-toggle ${anomaliesOnly ? "active" : ""}">
          <input id="onlyAnomalies" type="checkbox" ${anomaliesOnly ? "checked" : ""}/>
          <span class="filter-toggle-mark" aria-hidden="true"></span>
          <span>anomalies only</span>
        </label>
        <button class="filter-history-button" data-action="clearFilterHistory">${icons.clear}<span>Clear history</span></button>
      </aside>

      <section class="filter-cluster filter-cluster--endpoint">
        <span class="filter-cluster-title">Source endpoint</span>
        <div class="filter-cluster-grid filter-cluster-grid--endpoint">
          <input id="srcIpFilter" list="srcIpOptions" placeholder="source IP" value="${escapeHtml(state.table.filters.srcIp)}" />
          <input id="srcPortFilter" list="srcPortOptions" placeholder="port" value="${escapeHtml(state.table.filters.srcPort)}" />
        </div>
      </section>

      <section class="filter-cluster filter-cluster--endpoint">
        <span class="filter-cluster-title">Destination endpoint</span>
        <div class="filter-cluster-grid filter-cluster-grid--endpoint">
          <input id="dstIpFilter" list="dstIpOptions" placeholder="destination IP" value="${escapeHtml(state.table.filters.dstIp)}" />
          <input id="dstPortFilter" list="dstPortOptions" placeholder="port" value="${escapeHtml(state.table.filters.dstPort)}" />
        </div>
      </section>
    </div>
    ${renderDatalist("processOptions", processes)}
    ${renderDatalist("srcIpOptions", [...srcIps, ...state.filterHistory.map(h => h.srcIp)])}
    ${renderDatalist("dstIpOptions", [...dstIps, ...state.filterHistory.map(h => h.dstIp)])}
    ${renderDatalist("srcPortOptions", [...srcPorts, ...state.filterHistory.map(h => h.srcPort)])}
    ${renderDatalist("dstPortOptions", [...dstPorts, ...state.filterHistory.map(h => h.dstPort)])}
  </div>`;
}

function renderPagination(total, totalPages, start) {
  if (!total) return `<div class="empty"><svg width="56" height="56" viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="22" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/><path d="M20 28h16M28 20v16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/><path d="M18 18l20 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><strong>No sockets match your filters</strong>Try broadening the filter criteria or reset filters.<div class="empty-cta"><button data-action="clearFilters"><i class="ri-filter-off-line"></i> Clear filters</button></div></div>`;
  const end = Math.min(total, start + state.table.pageSize);
  const filteredCount = hasActiveTableFilters() ? `<span class="pager-filter-count">${formatNumber(total)} filtered row(s)</span>` : "";
  return `<div class="pager">
    ${filteredCount}
    <select class="pager-size" data-page-size title="Rows per page" aria-label="Rows per page">${[10, 20, 50, 100].map(v => `<option value="${v}" ${state.table.pageSize === v ? "selected" : ""}>${v}/p</option>`).join("")}</select>
    <button class="icon" data-page="first" title="First page" aria-label="First page">${icons.first}</button>
    <button class="icon" data-page="prev" title="Previous page" aria-label="Previous page">${icons.previous}</button>
    <span>${formatNumber(start + 1)}-${formatNumber(end)} / ${formatNumber(total)} - page ${state.table.page}/${totalPages}</span>
    <button class="icon" data-page="next" title="Next page" aria-label="Next page">${icons.next}</button>
    <button class="icon" data-page="last" data-total-pages="${totalPages}" title="Last page" aria-label="Last page">${icons.last}</button>
  </div>`;
}

function renderGroupedSockets() {
  const groups = groupedSockets();
  const page = pagedRows(groups);
  if (!groups.length) return `<div class="empty">No group matches the filters.</div>`;
  const pager = renderPagination(groups.length, page.totalPages, page.start);
  const topPager = ["top", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  const bottomPager = ["bottom", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  return `${renderGridControls(groups.length)}${topPager}<div class="table-wrap"><table>
    <thead><tr><th>Max risk</th><th>Snapshots</th><th>Local</th><th>Peer</th><th>Process</th><th>Anomalies</th><th>Max Recv-Q</th><th>Max Send-Q</th><th>Max RTT</th><th>Max RTO</th><th>Max drops</th></tr></thead>
    <tbody>${page.rows.map(g => `<tr data-socket="${escapeHtml(g.socket.id)}" class="${g.socket.id === state.selectedId ? "selected" : ""}">
      <td><span class="risk ${g.maxRisk}">${g.maxRisk}</span></td>
      <td>${formatNumber(g.count)}</td>
      <td>${escapeHtml(g.socket.local)}</td>
      <td>${escapeHtml(g.socket.peer)}</td>
      <td>${escapeHtml(g.socket.details.process ? `${g.socket.details.process.name}:${g.socket.details.process.pid}` : "-")}</td>
      <td>${formatNumber(g.anomalies)}</td>
      <td>${renderTableMetricCell("recvQ", g.maxRecvQ)}</td>
      <td>${renderTableMetricCell("sendQ", g.maxSendQ)}</td>
      <td>${renderTableMetricCell("rtt", g.maxRtt)}</td>
      <td>${renderTableMetricCell("rto", g.maxRto)}</td>
      <td>${renderTableMetricCell("skmem.d", g.maxDrops)}</td>
    </tr>`).join("")}</tbody>
  </table></div>${bottomPager}`;
}

function renderConversations() {
  const conversations = buildConversations();
  const page = pagedRows(conversations);
  if (!conversations.length) return `<div class="empty">No conversation matches the current filters.</div>`;
  const pager = renderPagination(conversations.length, page.totalPages, page.start);
  const topPager = ["top", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  const bottomPager = ["bottom", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  return `<div class="conversation-workbench">
    <div class="expert-strip">
      <article><span>Conversations</span><strong>${formatNumber(conversations.length)}</strong></article>
      <article><span>Critical/high paths</span><strong>${formatNumber(conversations.filter(c => riskRank(c.maxRisk) >= 3).length)}</strong></article>
      <article><span>Total TX</span><strong>${formatMetricValue("tx_bps", conversations.reduce((sum, c) => sum + c.txBps, 0))}</strong></article>
      <article><span>Total RX</span><strong>${formatMetricValue("rx_bps", conversations.reduce((sum, c) => sum + c.rxBps, 0))}</strong></article>
    </div>
    ${renderGridControls(conversations.length)}
    ${topPager}
    <div class="table-wrap"><table>
      <thead><tr>${renderConversationSortHeader("risk", "Risk")}${renderConversationSortHeader("flow", "Flow")}${renderConversationSortHeader("proto", "Proto/state")}${renderConversationSortHeader("process", "Process")}${renderConversationSortHeader("sockets", "Sockets")}${renderConversationSortHeader("anomalies", "Anomalies")}${renderConversationSortHeader("tx", "TX")}${renderConversationSortHeader("rx", "RX")}${renderConversationSortHeader("sendQ", "Send-Q")}${renderConversationSortHeader("recvQ", "Recv-Q")}${renderConversationSortHeader("rtt", "RTT")}${renderConversationSortHeader("rto", "RTO")}${renderConversationSortHeader("drops", "Drops")}</tr></thead>
      <tbody>${page.rows.map(c => `<tr data-socket="${escapeHtml(c.socket.id)}" class="${c.socket.id === state.selectedId ? "selected" : ""}">
        <td><span class="risk ${c.maxRisk}">${c.maxRisk}</span></td>
        <td><div class="flow-cell"><strong>${escapeHtml(c.local)}</strong><span>${icons.arrowRight}</span>${renderPeerEndpoint(c.peer)}</div></td>
        <td><span class="badge ${c.family.includes("udp") ? "udp" : "tcp"}">${escapeHtml(c.family)}</span> ${[...c.states].map(stateName => `<span class="badge ${stateName === "LISTEN" ? "listen" : ""}">${escapeHtml(stateName)}</span>`).join(" ")} ${renderApplicationServiceChip(c.socket, "compact")}</td>
        <td>${escapeHtml([...c.processes].slice(0, 3).join(", ") || "-")}</td>
        <td>${formatNumber(c.count)}</td>
        <td>${renderConversationAnomalyCell(c)}</td>
        <td>${renderTableMetricCell("tx_bps", c.txBps)}</td>
        <td>${renderTableMetricCell("rx_bps", c.rxBps)}</td>
        <td>${renderTableMetricCell("sendQ", c.sendQ)}</td>
        <td>${renderTableMetricCell("recvQ", c.recvQ)}</td>
        <td>${renderTableMetricCell("rtt", c.maxRtt)}</td>
        <td>${renderTableMetricCell("rto", c.maxRto)}</td>
        <td>${renderTableMetricCell("skmem.d", c.drops)}</td>
      </tr>`).join("")}</tbody>
    </table></div>
    ${bottomPager}
  </div>`;
}

function renderConversationAnomalyCell(conv) {
  if (!conv.anomalies) return `<span class="conversation-anomaly-zero">0</span>`;
  const summary = conversationAnomalySummary(conv);
  const pos = state.openConversationInsightKey === conv.key && state.openConversationInsightPos
    ? `style="left:${state.openConversationInsightPos.left}px;top:${state.openConversationInsightPos.top}px"`
    : "";
  const counts = Object.entries(summary.counts).filter(([, count]) => count);
  return `<div class="conversation-anomaly-cell">
    <button class="conversation-anomaly-trigger" data-conversation-insight="${escapeHtml(conv.key)}" aria-label="Open anomaly detail dialog">
      <i class="ri-menu-search-line"></i>
    </button>
    <span class="conversation-anomaly-badge ${summary.dominantSeverity}" aria-label="${escapeHtml(formatConversationAnomalyTitle(conv, summary))}">
      <span>${formatNumber(conv.anomalies)}</span>
      <small>${escapeHtml(summary.dominantSeverity)}</small>
    </span>
    <div class="conversation-insight-popover ${state.openConversationInsightKey === conv.key ? "open" : ""}" ${pos} role="dialog" aria-label="Conversation anomaly details">
      <div class="conversation-insight-titlebar">
        <div class="conversation-insight-head">
          <span class="tooltip-kicker">Conversation anomaly lens</span>
          <strong>${formatNumber(conv.anomalies)} signal(s) on this flow</strong>
          <small>${escapeHtml(conv.local)} -> ${escapeHtml(conv.peer)}</small>
        </div>
        <button class="icon mini" data-conversation-close title="Close anomaly dialog" aria-label="Close anomaly dialog">${icons.x}</button>
      </div>
      <div class="conversation-severity-strip">
        ${counts.map(([severity, count]) => `<span class="${severity}"><b>${escapeHtml(severity)}</b>${formatNumber(count)}</span>`).join("")}
      </div>
      <div class="conversation-metric-strip">
        ${summary.metrics.map(([metric, count]) => `<em>${escapeHtml(metricLabel(metric))}<b>${formatNumber(count)}</b></em>`).join("")}
      </div>
      <div class="conversation-anomaly-list">
        ${summary.topItems.map(item => `<article class="${item.severity}">
          <header><span class="risk ${item.severity}">${escapeHtml(item.severity)}</span><b>${escapeHtml(item.title)}</b><em>${escapeHtml(metricLabel(item.metric || "socket"))}${item.count > 1 ? ` x${formatNumber(item.count)}` : ""}</em></header>
          <p>${escapeHtml(item.detail)}</p>
        </article>`).join("")}
      </div>
      <footer>
        <button data-conversation-action="chart" data-socket-id="${escapeHtml(conv.socket.id)}" data-metric="${escapeHtml(summary.topMetric)}">${icons.chart} Open charts</button>
        <button data-conversation-action="details" data-socket-id="${escapeHtml(conv.socket.id)}">${icons.focus} Socket context</button>
        <button data-conversation-action="anomalies" data-socket-id="${escapeHtml(conv.socket.id)}" data-metric="${escapeHtml(summary.topMetric)}">${icons.alert} Details</button>
      </footer>
    </div>
  </div>`;
}

function formatConversationAnomalyTitle(conv, summary) {
  const counts = Object.entries(summary.counts).filter(([, count]) => count).map(([severity, count]) => `${severity}: ${count}`).join(", ");
  const top = summary.topItems[0];
  return `${conv.anomalies} anomalies (${counts}). Top: ${top?.title || "none"}`;
}

function positionConversationInsight(button) {
  const key = button.dataset.conversationInsight;
  const rect = button.getBoundingClientRect();
  const rowRect = button.closest("tr")?.getBoundingClientRect() || rect;
  const panelWidth = Math.min(620, window.innerWidth - 16);
  const panelHeight = Math.min(520, window.innerHeight - 16);
  const rightSideLeft = rect.right + 12;
  const leftSideLeft = rect.left - panelWidth - 12;
  const preferredLeft = rightSideLeft + panelWidth <= window.innerWidth - 8 ? rightSideLeft : leftSideLeft;
  const left = Math.min(Math.max(8, preferredLeft), window.innerWidth - panelWidth - 8);
  const top = Math.min(Math.max(8, rowRect.top - 12), window.innerHeight - panelHeight - 8);
  state.openConversationInsightKey = key;
  state.openConversationInsightPos = { left: Math.round(left), top: Math.round(top) };
}

function renderPeerEndpoint(endpoint) {
  const address = parseEndpointAddress(endpoint);
  const intel = state.ipIntel[address.host];
  const summary = ipIntelSummary(intel);
  const detail = ipIntelDetail(intel);
  return `<div class="peer-cell">
    <strong>${escapeHtml(endpoint)}</strong>
    ${summary ? `<small class="ip-intel" title="${escapeHtml(detail || summary)}"><i class="ri-building-4-line"></i> ${escapeHtml(summary)}</small>` : ""}
    ${intel?.status === "loading" ? `<small class="ip-intel loading"><i class="ri-loader-4-line"></i> enriching public IP...</small>` : ""}
  </div>`;
}

function parseEndpointAddress(endpoint = "") {
  const text = String(endpoint);
  if (text.startsWith("[")) {
    const idx = text.lastIndexOf("]:");
    return { host: idx > -1 ? text.slice(1, idx) : text.replace(/^\[|\]$/g, "") };
  }
  const idx = text.lastIndexOf(":");
  return { host: idx > -1 ? text.slice(0, idx) : text };
}

function renderServiceMap() {
  const map = buildServiceMap();
  const ordered = serviceMapConnectivityOrder(map);
  const allNodes = [...ordered.processes, ...ordered.locals, ...ordered.peers];
  if (!allNodes.length) return `<div class="empty">No service map is available for the current filters.</div>`;
  const lanes = [
    { key: "processes", title: "Processes", x: 160, nodes: ordered.processes },
    { key: "locals", title: "Local sockets", x: 520, nodes: ordered.locals },
    { key: "peers", title: "Peers", x: 920, nodes: ordered.peers }
  ];
  const positions = layoutTopologyLanePositions(lanes, { nodeGap: 86 });
  const maxY = Math.max(...Object.values(positions).map(position => position.y));
  const height = Math.max(420, maxY + 104);
  const groupBands = serviceMapGroupBands(lanes, positions);
  const visibleEdges = map.edges.filter(edge => positions[edge.from] && positions[edge.mid] && positions[edge.to]).slice(0, 160);
  const routes = buildServiceMapRoutes(visibleEdges, positions);
  const selectedEdge = visibleEdges.find(edge => edge.id === state.selectedMapEdgeId) || null;
  const hotPaths = [...map.edges].sort((a, b) =>
    riskRank(b.risk) - riskRank(a.risk) ||
    b.anomalies - a.anomalies ||
    b.weight - a.weight
  ).slice(0, 8);
  return `<div class="service-map-workbench">
    <div class="service-map-head">
      <div class="expert-strip">
        <article><span>Processes</span><strong>${formatNumber(map.processes.length)}</strong></article>
        <article><span>Local sockets</span><strong>${formatNumber(map.locals.length)}</strong></article>
        <article><span>Peers</span><strong>${formatNumber(map.peers.length)}</strong></article>
        <article><span>Labels</span><strong>${formatNumber(aliasCountForSource(state.serviceAliases, state.sourceName))}</strong></article>
        <article><span>Mapped flows</span><strong>${formatNumber(visibleEdges.length)}</strong></article>
      </div>
      <div class="service-map-actions">
        <button class="service-labels-button topology" type="button" data-topology-open aria-haspopup="dialog"><i class="ri-node-tree"></i> Topology</button>
        <button class="service-labels-button" data-action="serviceAliases"><i class="ri-price-tag-3-line"></i> Labels</button>
      </div>
    </div>
    <div class="service-map-layout">
      <div class="service-map-canvas">
        ${renderMapLegend()}
        <svg viewBox="0 0 1100 ${height}" role="img" aria-label="Service dependency map">
          <defs>
            <linearGradient id="editButtonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#42e7f2"/>
              <stop offset="48%" stop-color="#1586c5"/>
              <stop offset="100%" stop-color="#12315f"/>
            </linearGradient>
          </defs>
          ${lanes.map(lane => `<text x="${lane.x}" y="28" class="map-lane-title">${escapeHtml(lane.title)}</text>`).join("")}
          ${groupBands.map(band => `<g class="map-group-band ${escapeHtml(band.group.color)}">
            <rect x="${band.x}" y="${band.y}" width="${band.width}" height="${band.height}" rx="14"/>
            <text x="${band.x + 14}" y="${band.labelY}">${escapeHtml(band.group.name)}</text>
          </g>`).join("")}
          ${visibleEdges.map(edge => {
            const color = edge.risk === "critical" ? "#ff5c77" : edge.risk === "high" ? "#ff9f43" : edge.risk === "medium" ? "#ffd166" : "#39d6d6";
            const width = Math.min(5, 1.5 + Math.log10(edge.weight + 1));
            const d = routes.get(edge.id)?.d || "";
            return `<g class="map-link-wrap ${edge.id === state.selectedMapEdgeId ? "selected" : ""} ${edge.risk}" data-map-edge="${escapeHtml(edge.id)}" style="--link-color:${color};--link-width:${width}px;--link-hover-width:${Math.max(width + 2, 5.5)}px">
              <path class="map-link-hit" d="${d}"/>
              <path class="map-link" d="${d}"/>
              <title>${escapeHtml(edge.socket.local)} -> ${escapeHtml(edge.socket.peer)} | ${edge.risk} | ${formatNumber(edge.anomalies)} anomaly signal(s)</title>
            </g>`;
          }).join("")}
          ${lanes.flatMap(lane => lane.nodes.map(node => {
            const p = positions[node.id];
            const isDark = state.prefs.theme !== "light";
            const fill = isDark
              ? (node.risk === "critical" ? "#1a0a10" : node.risk === "high" ? "#1a1008" : node.risk === "medium" ? "#161408" : "#0a1520")
              : (node.risk === "critical" ? "#fff1f3" : node.risk === "high" ? "#fff4e6" : node.risk === "medium" ? "#fffbe6" : "#e8f4fd");
            const stroke = node.risk === "critical" ? "#ff5c77" : node.risk === "high" ? "#ff9f43" : node.risk === "medium" ? "#ffd166" : "#39d6d6";
            const subtitle = nodeSubtitle(node);
            const nodeH = Math.max(48, Math.min(80, 36 + (node.count || 1) * 4));
            return `<g class="map-node ${node.endpoint ? "has-edit" : ""}">
              <rect x="${p.x - 146}" y="${p.y - nodeH / 2}" width="292" height="${nodeH}" rx="8" fill="${fill}" stroke="${stroke}" opacity=".96"/>
              <text x="${p.x - 134}" y="${subtitle ? p.y - 3 : p.y + 5}" class="map-node-label">${escapeHtml(truncateMiddle(nodeLabel(node), 30))}</text>
              ${subtitle ? `<text x="${p.x - 134}" y="${p.y + 14}" class="map-node-subtitle">${escapeHtml(subtitle)}</text>` : ""}
              ${node.endpoint ? `<g class="map-node-edit-action" data-map-alias="${escapeHtml(node.endpoint)}" role="button" tabindex="0" aria-label="Edit ${escapeHtml(node.endpoint)} label">
                <title>Edit service label for ${escapeHtml(node.endpoint)}</title>
                <rect x="${p.x + 96}" y="${p.y - 16}" width="31" height="32" rx="10"/>
                <g class="map-node-edit-glyph" transform="translate(${p.x + 101} ${p.y - 10}) scale(.74)">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                </g>
              </g>` : ""}
              <circle cx="${p.x + 134}" cy="${p.y}" r="5" fill="${stroke}"/>
              <title>${escapeHtml(mapNodeTitle(node))}</title>
            </g>`;
          })).join("")}
        </svg>
      </div>
      ${selectedEdge ? renderMapEdgeInsight(selectedEdge) : renderHotPaths(hotPaths)}
    </div>
  </div>`;
}

function renderExpertInformation() {
  const items = buildExpertInformation();
  if (!items.length) return `<div class="empty">No expert information matches the current filters.</div>`;
  const corrMatrix = buildCorrelationMatrix();
  return `<div class="expert-workbench">
    ${corrMatrix ? `<details class="correlation-matrix-section" style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:600;font-size:13px"><i class="ri-grid-line"></i> Auto-correlation matrix (Pearson)</summary><div style="overflow-x:auto;margin-top:8px">${corrMatrix}</div></details>` : ""}
    <div class="anomaly-controls">
      <select id="anomalySeverity"><option value="all">all severities</option>${["critical", "high", "medium", "low"].map(v => `<option value="${v}" ${state.anomalyFilters.severity === v ? "selected" : ""}>${v}</option>`).join("")}</select>
      <select id="anomalyMetric"><option value="all">all metrics</option>${[...new Set(state.anomalies.map(item => item.metric).filter(Boolean))].sort().map(v => `<option value="${escapeHtml(v)}" ${state.anomalyFilters.metric === v ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select>
      <select id="anomalySort">${[
        ["priority", "priority"],
        ["metric", "metric"],
        ["title", "title"],
        ["socket", "socket context"]
      ].map(([value, label]) => `<option value="${value}" ${state.anomalyFilters.sort === value ? "selected" : ""}>sort ${label}</option>`).join("")}</select>
      <input id="anomalyText" placeholder="filter expert title, detail, metric..." value="${escapeHtml(state.anomalyFilters.text)}" />
      <span class="hint">${formatNumber(items.length)} grouped expert item(s)</span>
    </div>
    <div class="expert-list">
      ${items.map(item => `<article class="expert-item ${item.severity}">
        <div class="expert-severity"><span class="risk ${item.severity}">${escapeHtml(item.severity)}</span><strong>${formatNumber(item.count)}</strong></div>
        <div>
          <header><strong>${escapeHtml(item.title)}</strong><span class="metric-chip">${escapeHtml(item.metric || "socket")}</span></header>
          <p>${escapeHtml(item.detail)}</p>
          <div class="evidence-row">
            ${item.processes.size ? `<span><i class="ri-cpu-line"></i> ${escapeHtml([...item.processes].slice(0, 4).join(", "))}</span>` : ""}
            ${item.peers.size ? `<span><i class="ri-exchange-line"></i> ${escapeHtml([...item.peers].slice(0, 4).join(", "))}</span>` : ""}
          </div>
        </div>
        <footer>${item.socketId ? `<button data-jump="${escapeHtml(item.socketId)}">${icons.focus} Inspect</button>` : ""}</footer>
      </article>`).join("")}
    </div>
  </div>`;
}

function renderTimeline() {
  const events = buildTimelineEvents();
  if (!events.length) return `<div class="empty"><svg width="56" height="56" viewBox="0 0 56 56" fill="none"><rect x="8" y="24" width="40" height="8" rx="4" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="28" r="3" fill="currentColor" opacity="0.3"/><circle cx="28" cy="28" r="3" fill="currentColor" opacity="0.3"/><circle cx="40" cy="28" r="3" fill="currentColor" opacity="0.3"/></svg><strong>No timeline events available</strong>Import multiple timestamped ss snapshots to see how metrics evolve over time.<div class="empty-cta"><button data-action="pickFile" class="primary"><i class="ri-upload-2-line"></i> Import snapshots</button></div></div>`;
  const first = events[0]?.epochMs || Date.now();
  const last = events[events.length - 1]?.epochMs || first;
  const stories = cachedStories();
  state._multiSocketEvents = cachedMultiSocket();
  state._rateAlerts = cachedRateAlerts();
  const view = state.timelineView || "stories";
  return `<div class="timeline-workbench">
    <div class="timeline-strip">
      <span><b>${formatNumber(events.length)}</b> events</span>
      <span><b>${formatNumber(Math.max(0, Math.round((last - first) / 1000)))}s</b> window</span>
      <span><b>${formatNumber(events.filter(event => riskRank(event.severity) >= 3).length)}</b> high/critical</span>
      ${stories.length ? `<span><b>${formatNumber(stories.length)}</b> stories</span>` : ""}
    </div>
    <div class="pill-toggle" data-active="${view === "events" ? "1" : view === "heatmap" ? "2" : "0"}">
      <div class="pill-slider"></div>
      <button class="${view === "stories" ? "active" : ""}" data-action="timelineView" data-value="stories"><i class="ri-book-open-line"></i> Stories</button>
      <button class="${view === "events" ? "active" : ""}" data-action="timelineView" data-value="events"><i class="ri-list-unordered"></i> All events</button>
      <button class="${view === "heatmap" ? "active" : ""}" data-action="timelineView" data-value="heatmap"><i class="ri-fire-line"></i> Heatmap</button>
    </div>
    ${view === "heatmap" ? renderTimelineHeatmap(events) : view === "stories" ? renderTimelineStoriesView(stories) : renderTimelineEventsView(events)}
  </div>`;
}

function storyStepMetric(key) {
  const map = { "sendQ-grow": "sendQ", "persist-appears": "sendQ", "backoff-rises": "backoff", "fin-or-close": "sendQ", "recvQ-grow": "recvQ", "drops-appear": "skmem.d", "rcv-space-shrink": "rcv_space", "rto-grow": "rto", "backoff-high": "backoff", "cwnd-collapse": "cwnd", "retrans-appear": "retrans", "rwnd-high": "sendQ", "sendQ-present": "sendQ", "no-retrans": "rto", "skmem-r-grow": "skmem.r", "recvQ-high": "recvQ", "rwnd-limited": "sendQ" };
  return map[key] || "";
}

function renderTimelineHeatmap(events) {
  return renderHeatmapView(ctx);
}

function renderTimelineStoriesView(stories) {
  if (!stories.length && !state._multiSocketEvents?.length) return `<div class="timeline-stories-empty"><i class="ri-movie-2-line"></i><p>No causal pattern detected yet. Need more snapshots or stronger signals.</p></div>`;
  const groupEvents = state._multiSocketEvents || [];
  const _rawRates = state._rateAlerts || [];
  const _rateGroupMap = new Map();
  for (const a of _rawRates) { const k = `${a.process || a.peer}|${a.metric}|${a.epochMs}`; const g = _rateGroupMap.get(k); if (g) { g.count++; } else { _rateGroupMap.set(k, { ...a, count: 1 }); } }
  const rateAlerts = [..._rateGroupMap.values()].slice(0, 3);
  const rateTotal = _rateGroupMap.size;
  return `<section class="timeline-stories">
    ${rateAlerts.length ? `<div class="rate-alerts">
      ${rateAlerts.map(a => {
        const isBytes = a.metric === "recvQ" || a.metric === "sendQ" || a.metric === "skmem.r";
        const prev = isBytes ? `${Math.round(a.prevValue / 1024)} KB` : String(a.prevValue);
        const curr = isBytes ? `${Math.round(a.currValue / 1024)} KB` : String(a.currValue);
        const dt = a.dtMs >= 1000 ? `${(a.dtMs / 1000).toFixed(1)}s` : `${Math.round(a.dtMs)} ms`;
        const explain = a.metric === "sendQ" ? "App is writing faster than TCP can drain - peer or path cannot keep up."
          : a.metric === "recvQ" ? "Data arriving faster than the app reads - local process may be stalled."
          : a.metric === "skmem.r" ? "Kernel receive buffer filling rapidly - app not consuming."
          : a.metric === "skmem.d" ? "Packets being dropped - buffer overflow."
          : a.metric === "rto" ? "Retransmission timeout escalating - path or peer unresponsive."
          : a.metric === "backoff" ? "TCP retry backoff jumped - prolonged wait before next probe."
          : "";
        const time = a.epochMs ? new Date(a.epochMs).toISOString().slice(11, 23) + " UTC" : "";
        const countBadge = a.count > 1 ? ` <span class="rate-count">\u00d7${a.count} sockets</span>` : "";
        return `<div class="rate-alert ${a.severity}"><span class="risk ${a.severity}">${escapeHtml(a.severity)}</span>${time ? ` <span class="rate-time">${escapeHtml(time)}</span>` : ""} <b>${escapeHtml(a.label)}</b> on ${escapeHtml(a.process || a.peer)}${countBadge} &middot; <span class="rate-value">${escapeHtml(a.rateFormatted)}</span> <small>(${prev} &rarr; ${curr} in ${dt})</small> <span class="rate-explain">${explain}</span></div>`;
      }).join("")}
      ${rateTotal > 3 ? `<div class="rate-more"><button data-action="timelineView" data-value="events"><i class="ri-list-unordered"></i> +${rateTotal - 3} more velocity alerts ? All Events</button></div>` : ""}
    </div>` : ""}
    ${groupEvents.length ? `<div class="multi-socket-events">
      ${(() => {
        const byProcess = new Map();
        for (const event of groupEvents) {
          const k = event.narrative.title;
          const g = byProcess.get(k);
          if (g) { g.lines.push(event.narrative.line); } else { byProcess.set(k, { title: event.narrative.title, socketCount: event.socketCount, conclusion: event.narrative.conclusion, lines: [event.narrative.line] }); }
        }
        return [...byProcess.values()].slice(0, 2).map(g => `<article class="timeline-story group-event">
          <div class="story-header">
            <strong>${escapeHtml(g.title)}</strong>
            <span class="story-completeness">${g.socketCount} sockets</span>
          </div>
          <div class="story-narrative">
            ${g.lines.map(line => `<div class="story-step"><span class="story-dot group-dot"></span><span class="story-text">${escapeHtml(line)}</span></div>`).join("")}
            <div class="story-conclusion">${escapeHtml(g.conclusion)}</div>
          </div>
        </article>`).join("");
      })()}
    </div>` : ""}
    ${stories.length ? (() => {
      const socketKeys = [...new Set(stories.map(s => s.socketKey))];
      const socketCount = socketKeys.length;
      const patternTypes = [...new Set(stories.map(s => s.title))];
      const scope = socketCount === 1 ? `1 socket affected` : `${socketCount} sockets affected`;
      const peerLabel = socketCount === 1 && stories[0].socket ? (stories[0].socket.peer || stories[0].socketKey) : "";
      const socketNav = socketCount > 1 ? `<div class="stories-socket-nav">${socketKeys.map((sk, i) => { const s = stories.find(st => st.socketKey === sk); const label = s?.socket?.details?.process ? `${s.socket.details.process.name}:${s.socket.details.process.pid}` : sk.slice(0, 24); const peer = s?.socket?.peer || ""; const active = (!state.storySocketFilter && i === 0) || state.storySocketFilter === sk; return `<button class="story-socket-pill ${active ? "active" : ""}" data-action="filterStorySocket" data-socket-key="${escapeHtml(sk)}" title="${escapeHtml(sk)}">${escapeHtml(label)} → ${escapeHtml(peer.slice(0, 20))}</button>`; }).join("")}</div>` : "";
      return `${socketNav}<div class="stories-summary"><i class="ri-git-merge-line"></i> <b>${stories.length} ${stories.length === 1 ? "story" : "stories"}</b> - ${scope}${socketCount > 1 ? ` - ${patternTypes.length} distinct ${patternTypes.length === 1 ? "pattern" : "patterns"} (${escapeHtml(patternTypes.join(", "))})` : peerLabel ? ` - ${escapeHtml(peerLabel)}` : ""}</div>`;
    })() : ""}
    ${(() => { const filtered = state.storySocketFilter ? stories.filter(s => s.socketKey === state.storySocketFilter) : stories; return filtered.slice(0, 6); })().map(story => `<article class="timeline-story">
      <div class="story-header">
        <strong>${escapeHtml(story.title)}</strong>
        <span class="story-socket" title="${escapeHtml(story.socketKey)}">${escapeHtml((() => { const p = story.socket?.details?.process; const local = p ? `${p.name}:${p.pid}` : "local"; const peer = story.socket?.peer || story.socketKey.slice(0, 28); return `${local} \u2192 ${peer}`; })())}</span>
        <span class="story-completeness" title="${story.matchedSteps.length}/${story.totalSteps} expected steps observed in sequence">${story.matchedSteps.length}/${story.totalSteps} steps matched</span>
      </div>
      <div class="story-narrative">
        ${story.narrative.map((line, i) => i === story.narrative.length - 1
          ? `<div class="story-conclusion">${escapeHtml(line)}</div>`
          : `<div class="story-step${i === story.narrative.length - 2 && /torn down|abandoned|critical/i.test(line) ? " story-step-critical" : ""}"><button class="story-jump" data-action="storyJumpToChart" data-epoch="${story.matchedSteps[i]?.epochMs || ""}" data-metric="${storyStepMetric(story.matchedSteps[i]?.key || "")}" data-label="${escapeHtml(story.matchedSteps[i]?.label || "")}" title="Zoom chart to this moment"><i class="ri-line-chart-line"></i></button><span class="story-dot"></span><span class="story-text">${escapeHtml(line)}</span></div>`
        ).join("")}
      </div>
    </article>`).join("")}
  </section>`;
}

function renderTimelineEventsView(events) {
  return `<div class="timeline-list">
    ${events.map(event => `<article class="timeline-event ${event.severity}">
      <div class="timeline-pin"></div>
      <div class="timeline-time"><strong>${escapeHtml(formatTimelineTime(event))}</strong><span>t+${formatTimelineOffset(event.t || 0)}s</span></div>
      <div class="timeline-body">
        <header><span class="risk ${event.severity}">${escapeHtml(event.severity)}</span><strong>${escapeHtml(event.title)}</strong><span class="metric-chip">${escapeHtml(event.metric)}</span></header>
        <p>${escapeHtml(event.detail)}</p>
      </div>
      <footer>${event.socketId ? `<button data-jump="${escapeHtml(event.socketId)}">${icons.focus} Context</button>` : ""}</footer>
    </article>`).join("")}
  </div>`;
}

function renderTimelineStories(stories) {
  return renderTimelineStoriesView(stories);
}

function renderAlerting() {
  const active = state.alertEvents.filter(event => !event.acknowledged);
  const acked = state.alertEvents.filter(event => event.acknowledged);
  const metrics = alphabeticalMetrics(["sendQ", "recvQ", "rtt", "rto", "skmem.d", "skmem.r", "skmem.t", "cwnd", "tx_bps", "rx_bps", "backoff", "retrans"]);
  return `<div class="alert-workbench">
    <div class="expert-strip">
      <article><span>Active alerts</span><strong>${formatNumber(active.length)}</strong></article>
      <article><span>Acknowledged</span><strong>${formatNumber(acked.length)}</strong></article>
      <article><span>Enabled rules</span><strong>${formatNumber(state.alertRules.filter(rule => rule.enabled).length)}</strong></article>
      <article><span>Total rules</span><strong>${formatNumber(state.alertRules.length)}</strong></article>
    </div>
    <section class="alert-rule-builder">
      <input id="alertRuleName" placeholder="Rule name" />
      <select id="alertRuleMetric">${metrics.map(metric => `<option value="${metric}">${escapeHtml(metricLabel(metric))}</option>`).join("")}</select>
      <select id="alertRuleOp">${[">=", ">", "<=", "<", "=", "!="].map(op => `<option value="${escapeHtml(op)}">${escapeHtml(op)}</option>`).join("")}</select>
      <input id="alertRuleValue" type="number" min="0" placeholder="Threshold" />
      <select id="alertRuleSeverity">${["critical", "high", "medium", "low"].map(sev => `<option value="${sev}">${sev}</option>`).join("")}</select>
      <button class="primary" data-action="addAlertRule">${icons.alert} Add rule</button>
    </section>
    <section class="alert-layout">
      <div class="alert-column">
        <div class="panel-title">Triggered alerts</div>
        <div class="alert-list">
          ${state.alertEvents.length ? state.alertEvents.map(event => `<article class="alert-event ${event.severity} ${event.acknowledged ? "ack" : ""}">
            <header><span class="risk ${event.severity}">${escapeHtml(event.severity)}</span><strong>${escapeHtml(event.ruleName)}</strong><span class="metric-chip">${escapeHtml(metricLabel(event.metric))}</span></header>
            <p>${escapeHtml(event.socket.local)} -> ${escapeHtml(event.socket.peer)}</p>
            <p>${escapeHtml(metricLabel(event.metric))}: ${formatMetricValue(event.metric, event.value)} ${escapeHtml(event.op)} ${formatMetricValue(event.metric, event.threshold)}</p>
            <footer>
              <button data-jump="${escapeHtml(event.socketId)}">${icons.focus} Context</button>
              <button data-alert-ack="${escapeHtml(event.id)}">${event.acknowledged ? icons.reset : icons.saveDisk} ${event.acknowledged ? "Unack" : "Ack"}</button>
            </footer>
          </article>`).join("") : `<div class="empty"><svg width="56" height="56" viewBox="0 0 56 56" fill="none"><path d="M28 12L44 40H12L28 12z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M28 24v8M28 36v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/></svg><strong>No active alerts</strong>All configured alert rules are passing. Alerts trigger when thresholds are exceeded.</div>`}
        </div>
      </div>
      <div class="alert-column">
        <div class="panel-title">Rules</div>
        <div class="rule-list">
          ${state.alertRules.map(rule => `<article class="rule-card ${rule.enabled ? "" : "muted-card"}">
            <label class="check inline"><input type="checkbox" data-alert-rule-toggle="${escapeHtml(rule.id)}" ${rule.enabled ? "checked" : ""}/> ${escapeHtml(rule.name)}</label>
            <p><span class="risk ${rule.severity}">${escapeHtml(rule.severity)}</span> ${escapeHtml(metricLabel(rule.metric))} ${escapeHtml(rule.op)} ${formatMetricValue(rule.metric, rule.value)}</p>
            <button class="icon" data-alert-rule-delete="${escapeHtml(rule.id)}" title="Delete rule">${icons.trash}</button>
          </article>`).join("")}
        </div>
        <div class="toolbar"><button data-action="ackAllAlerts">${icons.saveDisk} Ack all active</button><button data-action="resetAlertRules">${icons.reset} Restore defaults</button></div>
      </div>
    </section>
  </div>`;
}

function renderBaselineNarrative(comparison) { return _renderBaselineNarrative(ctx, comparison); }

function renderComparison() {
  const comparison = buildComparison();
  if (!comparison) {
    return `<div class="compare-empty">
      <i class="ri-scales-3-line"></i>
      <strong>Before / After comparison</strong>
      <p>Detect exactly what changed between two captures - in either direction.</p>
      <div class="compare-steps">
        <div class="compare-step"><span>1</span><b>Load your first capture</b><small>Either the healthy state or the incident - order doesn't matter</small></div>
        <div class="compare-step"><span>2</span><b>Set as baseline</b><small>Click one of the buttons below to mark it</small></div>
        <div class="compare-step"><span>3</span><b>Load the second capture</b><small>The diff will show what changed between the two</small></div>
      </div>
      <p class="compare-hint">You'll see: what metrics exploded or recovered, new/disappeared peers, new anomalies, and an automatic verdict.</p>
      <div class="compare-actions">
        <button class="primary" data-action="setBaseline"><i class="ri-checkbox-circle-line"></i> This is the healthy baseline</button>
        <button class="secondary" data-action="setBaselineAsIncident"><i class="ri-alarm-warning-line"></i> This is the incident (compare after fix)</button>
      </div>
    </div>`;
  }
  const deviations = baselineDeviations();
  const s = comparison.summary;
  const rows = comparison.rows.slice(0, 80);
  return `<div class="compare-workbench">
    <div class="compare-header">
      <div>
        <span class="tooltip-kicker">${state.baseline.role === "incident" ? "Incident ? After fix" : "Healthy ? Incident"}</span>
        <h3>${escapeHtml(state.baseline.sourceName)} ? ${escapeHtml(state.sourceName)}</h3>
        <p>Baseline captured ${escapeHtml(new Date(state.baseline.createdAt).toLocaleString(resolvedNumberLocale()))}</p>
      </div>
      <div class="toolbar"><button data-action="setBaseline"><i class="ri-scales-3-line"></i> Replace baseline</button><button data-action="clearBaseline">${icons.clear} Clear baseline</button></div>
      ${deviations.length ? `<div class="compare-deviations" style="margin-top:8px;padding:6px 10px;border-radius:6px;background:rgba(255,92,119,0.08);border:1px solid rgba(255,92,119,0.2)"><strong style="color:#ff5c77"><i class="ri-alarm-warning-line"></i> ${deviations.length} metric(s) deviated from baseline</strong><div style="margin-top:4px;font-size:11px;color:var(--muted)">${deviations.map(d => `<span style="margin-right:12px"><b>${d.metric}</b>: P95 ${d.baseP95.toFixed(1)} → ${d.currP95.toFixed(1)} (×${d.ratio})</span>`).join("")}</div></div>` : ""}
    </div>
    <div class="expert-strip">
      <article><span>Before</span><strong>${formatNumber(s.before)}</strong></article>
      <article><span>After</span><strong>${formatNumber(s.after)}</strong></article>
      <article><span>New/Gone</span><strong>${formatNumber(s.added)} / ${formatNumber(s.removed)}</strong></article>
      <article><span>Worse/Better</span><strong>${formatNumber(s.worsened)} / ${formatNumber(s.improved)}</strong></article>
    </div>
    ${renderBaselineNarrative(comparison)}
    <div class="table-wrap"><table>
      <thead><tr><th>Status</th><th>Flow</th><th>Risk</th><th>Send-Q delta</th><th>Recv-Q delta</th><th>RTT delta</th><th>RTO delta</th><th>Drops delta</th><th>TX delta</th><th>RX delta</th></tr></thead>
      <tbody>${rows.map(row => {
        const current = row.after || row.before;
        return `<tr class="compare-row ${row.status}">
          <td><span class="compare-status ${row.status}">${escapeHtml(row.status)}</span></td>
          <td>${escapeHtml(current.local)} -> ${escapeHtml(current.peer)}<br><span class="hint">${escapeHtml(current.process || "-")}</span></td>
          <td>${row.before ? `<span class="risk ${row.before.risk}">${row.before.risk}</span>` : "-"} ${icons.arrowRight} ${row.after ? `<span class="risk ${row.after.risk}">${row.after.risk}</span>` : "-"}</td>
          <td>${renderDelta("sendQ", row.deltas.sendQ)}</td>
          <td>${renderDelta("recvQ", row.deltas.recvQ)}</td>
          <td>${renderDelta("rtt", row.deltas.rtt)}</td>
          <td>${renderDelta("rto", row.deltas.rto)}</td>
          <td>${renderDelta("skmem.d", row.deltas.drops)}</td>
          <td>${renderDelta("tx_bps", row.deltas.tx_bps)}</td>
          <td>${renderDelta("rx_bps", row.deltas.rx_bps)}</td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>
  </div>`;
}

function renderDelta(metric, value) { return _renderDelta(ctx, metric, value); }

function renderAnomalies(items) {
  const filtered = filteredAnomalies(items);
  const metrics = [...new Set(items.map(item => item.metric).filter(Boolean))].sort();
  return `<div class="anomaly-workbench">
    <div class="anomaly-controls">
      <select id="anomalySeverity"><option value="all">all severities</option>${["critical", "high", "medium", "low"].map(v => `<option value="${v}" ${state.anomalyFilters.severity === v ? "selected" : ""}>${v}</option>`).join("")}</select>
      <select id="anomalyMetric"><option value="all">all metrics</option>${metrics.map(v => `<option value="${escapeHtml(v)}" ${state.anomalyFilters.metric === v ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select>
      <select id="anomalySort">${[
        ["priority", "priority"],
        ["metric", "metric"],
        ["title", "title"],
        ["socket", "socket context"]
      ].map(([value, label]) => `<option value="${value}" ${state.anomalyFilters.sort === value ? "selected" : ""}>sort ${label}</option>`).join("")}</select>
      <input id="anomalyText" placeholder="filter title, detail, metric..." value="${escapeHtml(state.anomalyFilters.text)}" />
      <span class="hint">${formatNumber(filtered.length)} / ${formatNumber(items.length)} shown</span>
    </div>
    ${filtered.length ? `<div class="anomaly-list dense">${filtered.map(a => `<article class="anomaly ${a.severity}">
      <header><strong><span class="risk ${a.severity}">${a.severity}</span> ${escapeHtml(a.title)}</strong><span class="metric-chip">${escapeHtml(a.metric || "socket")}</span></header>
      <p>${escapeHtml(a.detail)}</p>
      <footer><button data-jump="${escapeHtml(a.socketId)}"><i class="ri-focus-3-line"></i> View context</button></footer>
    </article>`).join("")}</div>` : `<div class="empty"><svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin-bottom:8px;opacity:0.4"><path d="M24 8l18 32H6L24 8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M24 20v10M24 34v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><br>No anomaly matches the current filters.</div>`}
  </div>`;
}

function filteredAnomalies(items) {
  const f = state.anomalyFilters;
  const rank = { critical: 4, high: 3, medium: 2, low: 1 };
  return items.filter(item => {
    if (f.severity !== "all" && item.severity !== f.severity) return false;
    if (f.metric !== "all" && item.metric !== f.metric) return false;
    const haystack = `${item.title} ${item.detail} ${item.metric} ${item.socketId}`.toLowerCase();
    return !f.text || haystack.includes(f.text.toLowerCase());
  }).sort((a, b) => {
    if (f.sort === "metric") return String(a.metric).localeCompare(String(b.metric)) || rank[b.severity] - rank[a.severity];
    if (f.sort === "title") return a.title.localeCompare(b.title) || rank[b.severity] - rank[a.severity];
    if (f.sort === "socket") return String(a.socketId).localeCompare(String(b.socketId)) || rank[b.severity] - rank[a.severity];
    return rank[b.severity] - rank[a.severity] || a.title.localeCompare(b.title);
  });
}

function renderFields() {
  const entries = Object.entries(FIELD_DOCS).sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const midpoint = Math.ceil(entries.length / 2);
  const columns = [entries.slice(0, midpoint), entries.slice(midpoint)];
  return `<div class="field-directory">
    ${columns.map((items, index) => `<section class="field-column" aria-label="Fields ${index === 0 ? "A-M" : "N-Z"}">
      ${items.map(([key, text]) => renderFieldDocCard(key, text)).join("")}
    </section>`).join("")}
  </div>`;
}

function renderFieldDocCard(key, text) {
  const sentences = String(text || "").split(/(?<=\.)\s+/).filter(Boolean);
  const body = sentences.length > 1
    ? `<p>${escapeHtml(sentences[0])}</p><ul>${sentences.slice(1).map(sentence => `<li>${escapeHtml(sentence)}</li>`).join("")}</ul>`
    : `<p>${escapeHtml(text)}</p>`;
  const firstSentence = String(text || "").split(/(?<=\.)\s+/)[0] || ""; return `<div class="field-row" data-action="openMetricIntelligence" data-field="${escapeHtml(key)}" title="Click for full metric intelligence"><strong>${escapeHtml(key)}</strong><span class="field-desc">${escapeHtml(firstSentence)}</span></div>`;
}

function renderFieldHealth(key) {
  const guidance = FIELD_GUIDANCE[key];
  if (!guidance) return "";
  const thresholdRefs = guidance.thresholds || (guidance.metric ? [{ label: metricLabel(guidance.metric), metric: guidance.metric }] : []);
  const thresholdRows = thresholdRefs
    .map(ref => {
      const t = thresholdFor(ref.metric);
      if (!Number.isFinite(t.warn) && !Number.isFinite(t.danger)) return "";
      const op = t.inverse ? "<=" : ">=";
      return `<span class="field-threshold-row">
        <b>${escapeHtml(ref.label || metricLabel(ref.metric))}</b>
        ${Number.isFinite(t.warn) ? `<em class="warn">Warn ${op} ${escapeHtml(formatMetricValue(ref.metric, t.warn))}</em>` : ""}
        ${Number.isFinite(t.danger) ? `<em class="danger">Critical ${op} ${escapeHtml(formatMetricValue(ref.metric, t.danger))}</em>` : ""}
      </span>`;
    })
    .filter(Boolean)
    .join("");
  return `<div class="field-health">
    ${guidance.typical ? `<span class="field-typical"><b>Typical</b><em>${escapeHtml(guidance.typical)}</em></span>` : ""}
    ${thresholdRows ? `<div class="field-thresholds">${thresholdRows}</div>` : ""}
  </div>`;
}

function renderRightPane() {
  const selected = socketsById().get(state.selectedId);
  return html`
    <section class="section">
      <h2>Priority anomalies</h2>
      ${renderAnomalies(state.anomalies.filter(a => severityVisible(a.severity)).slice(0, 5))}
    </section>
    <section class="section">
      <h2>Selected socket</h2>
      ${selected ? renderSocketDetail(selected) : `<div class="empty">No socket selected.</div>`}
    </section>
  `;
}

function renderSocketDetail(s) {
  return html`
    <div class="field-list">
      ${renderSocketInsights(s)}
      <div class="field-card"><strong>${escapeHtml(s.local)} -> ${escapeHtml(s.peer)}</strong>${renderPeerIntelCard(s)}<p>${escapeHtml(s.raw)}</p></div>
      <div class="field-card"><strong>Internal TCP</strong><p>${renderMetricFields(s, Object.entries(s.details.values).filter(([, v]) => typeof v !== "object")) || "No -i field detected."}</p></div>
      <div class="field-card"><strong>Socket memory</strong><p>${renderMetricFields(s, Object.entries(s.details.skmem).map(([k, v]) => [`skmem.${k}`, v])) || "Add -m for skmem."}</p></div>
    </div>
  `;
}

function renderMetricFields(socket, entries) {
  return entries.map(([key, value]) => {
    const metric = key === "send" ? "pacing_rate" : key;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return `<span class="metric-token">${escapeHtml(key)}=${escapeHtml(value)}</span>`;
    const cls = thresholdSeverity(metric, numeric);
    return `<span class="metric-token ${cls}" title="${escapeHtml(metricLabel(metric))}: ${formatMetricValue(metric, numeric)}">${escapeHtml(key)}=${formatMetricValue(metric, numeric)}</span>`;
  }).join(" ");
}

function renderPeerIntelCard(socket) {
  const host = socket.peerAddress?.host || "";
  const intel = state.ipIntel[host];
  const summary = ipIntelSummary(intel);
  const detail = ipIntelDetail(intel);
  if (!summary && intel?.status !== "loading") return "";
  return `<div class="ip-intel-card">
    <strong><i class="ri-building-4-line"></i> Public IP intelligence</strong>
    ${intel?.status === "loading" ? `<p>Looking up public registry and reverse DNS data in the background.</p>` : `<p>${escapeHtml(summary)}</p>`}
    ${detail ? `<pre>${escapeHtml(detail)}</pre>` : ""}
    <small>Attribution comes from public registry/reverse-DNS data and may identify the owner, carrier, cloud, datacenter, or intermediary, not always the final business user.</small>
  </div>`;
}

function socketInsights(socket) {
  const insights = [];
  const rtt = metricValue(socket, "rtt");
  const rto = metricValue(socket, "rto");
  const drops = metricValue(socket, "skmem.d");
  const recvPressure = socket.details.skmem.rb ? (socket.details.skmem.r || 0) / socket.details.skmem.rb : 0;
  const sendPressure = socket.details.skmem.tb ? ((socket.details.skmem.t || 0) + (socket.details.skmem.w || 0)) / socket.details.skmem.tb : 0;
  if (socket.sendQ > 262144 && rtt > 100) insights.push(["Slow peer or congested path", "Local side has a large Send-Q while RTT is elevated. The peer may be reading slowly, the network path may be congested, or pacing/congestion control is limiting sends."]);
  if (socket.recvQ > 131072) insights.push(["Local slow consumer", "Recv-Q is high. The local application or kernel path is not draining data fast enough. Check process CPU, event loop stalls, disk writes, or backpressure handling."]);
  if (recvPressure > 0.8) insights.push(["Receive buffer pressure", "Socket receive memory is above 80% of its limit. Consider whether the application is consuming slowly or tcp_rmem limits are too low for the path."]);
  if (sendPressure > 0.8) insights.push(["Transmit buffer pressure", "Socket transmit memory is near the cap. This often points to peer slow-consumption, congestion, or an application writing faster than the network can drain."]);
  if (drops > 0) insights.push(["Socket drops detected", "Drops in skmem indicate packets were discarded before delivery. Investigate receive pressure, backlog pressure, CPU softirq saturation, or buffer sizing."]);
  if (rto > 1000) insights.push(["Retransmission timeout risk", "High RTO means loss or severe jitter may be present. Correlate with retransmission timers, backoff, RTT variance, and network interface errors."]);
  if (!insights.length) insights.push(["No obvious bottleneck", "No major queue, memory, drop, or RTT symptom is visible for this socket in the current snapshot. Use the Charts tab to inspect evolution over time."]);
  return insights;
}

function renderSocketInsights(socket) {
  return `<div class="insight-list">${socketInsights(socket).map(([title, text]) => `<article class="field-card insight-card"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></article>`).join("")}</div>`;
}


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

function renderPreImportFilters() {
  const h = state.filterHistory;
  const f = normalizePreImportFilters();
  const pendingName = state.pendingFile?.name || "";
  return `<div class="pref-grid">
    <article class="field-card">
      ${pendingName ? `<div class="preimport-file-card">
        <i class="ri-file-text-line" aria-hidden="true"></i>
        <div><strong>${escapeHtml(pendingName)}</strong><span>Choose a full import, or narrow the capture while it is read.</span></div>
      </div>` : ""}
      <strong>Optional import-time filters</strong>
      <p class="hint">Use filters only for very large captures or targeted investigations. A full import keeps the complete raw timeline.</p>
      <div class="preimport-presets">
        ${PRE_IMPORT_PRESETS.map(preset => `<button type="button" data-preimport-preset="${preset.id}"><strong>${escapeHtml(preset.label)}</strong><span>${escapeHtml(preset.description)}</span></button>`).join("")}
      </div>
      <div class="preimport-grid">
        <label>Protocol<select id="preProtocol">
          <option value="">tcp + udp + other</option>
          <option value="tcp" ${f.protocol === "tcp" ? "selected" : ""}>tcp / tcp6</option>
          <option value="udp" ${f.protocol === "udp" ? "selected" : ""}>udp / udp6</option>
        </select></label>
        <label>State<select id="preState">
          <option value="">all states</option>
          ${["ESTAB", "LISTEN", "UNCONN", "SYN-SENT", "SYN-RECV", "TIME-WAIT", "CLOSE-WAIT", "FIN-WAIT-1", "FIN-WAIT-2"].map(value => `<option value="${value}" ${f.state === value ? "selected" : ""}>${value}</option>`).join("")}
        </select></label>
        <label>Any port<input id="preAnyPort" list="histAnyPort" placeholder="comma separated" value="${escapeHtml(f.anyPort)}" /></label>
        <label>Source IP<input id="preSrcIp" list="histSrcIp" placeholder="contains" value="${escapeHtml(f.srcIp)}" /></label>
        <label>Dest IP<input id="preDstIp" list="histDstIp" placeholder="contains" value="${escapeHtml(f.dstIp)}" /></label>
        <label>Source port<input id="preSrcPort" list="histSrcPort" placeholder="equals" value="${escapeHtml(f.srcPort)}" /></label>
        <label>Dest port<input id="preDstPort" list="histDstPort" placeholder="equals" value="${escapeHtml(f.dstPort)}" /></label>
      </div>
      ${renderDatalist("histAnyPort", [...h.map(x => x.anyPort), ...h.map(x => x.srcPort), ...h.map(x => x.dstPort)])}
      ${renderDatalist("histSrcIp", h.map(x => x.srcIp))}
      ${renderDatalist("histDstIp", h.map(x => x.dstIp))}
      ${renderDatalist("histSrcPort", h.map(x => x.srcPort))}
      ${renderDatalist("histDstPort", h.map(x => x.dstPort))}
      <div class="toolbar preimport-actions">
        <button class="primary" data-action="startImportAll">${icons.upload} Import full file</button>
        <button data-action="startImportWithFilters"><i class="ri-filter-3-line"></i> Import with filters</button>
        <button data-action="clearFilterHistory">${icons.clear} Clear history</button>
      </div>
    </article>
  </div>`;
}

function renderLayoutPrefs() {
  const l = state.prefs.chartLayout;
  const tooltipOpacity = chartTooltipOpacity();
  const metrics = chartMetricList();
  return `<div class="layout-config">
    <article class="field-card">
      <strong>Grid layout</strong>
      <label>Charts per row<select id="layoutColumns">${[1, 2, 3].map(v => `<option value="${v}" ${clampChartColumns(l.columns) === v ? "selected" : ""}>${v} columns</option>`).join("")}</select></label>
      <label>Panel density<select id="layoutDensity">${["compact", "standard", "tall"].map(v => `<option value="${v}" ${l.density === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label>Preset<select id="layoutPreset">
        <option value="">Choose preset</option>
        <option value="noc">NOC overview: 3 columns, compact</option>
        <option value="deep">Deep diagnosis: 2 columns, tall</option>
        <option value="single">Focused review: 1 column, tall</option>
      </select></label>
    </article>
    <article class="field-card">
      <strong>Chart behavior</strong>
      <label class="check inline"><input id="layoutMainChart" type="checkbox" ${l.mainChart ? "checked" : ""}/> Show main chart</label>
      <label class="check inline"><input id="layoutSharedZoom" type="checkbox" ${l.sharedZoom ? "checked" : ""}/> Shared zoom across charts</label>
      <label class="check inline"><input id="layoutLegend" type="checkbox" ${l.showLegend ? "checked" : ""}/> Show legend/status</label>
      <label class="check inline"><input id="layoutCrosshair" type="checkbox" ${l.showCrosshair ? "checked" : ""}/> Enable crosshair and drag zoom</label>
      <label class="check inline"><input id="layoutSyncCrosshair" type="checkbox" ${l.syncCrosshair !== false ? "checked" : ""}/> Sync crosshairs across charts</label>
      <label class="range-preference"><span>Crosshair tooltip background</span><input id="layoutTooltipOpacity" type="range" min="0.35" max="1" step="0.05" value="${tooltipOpacity}"/><small><b>${Math.round(tooltipOpacity * 100)}%</b> opacity - keeps the chart slightly visible behind the tooltip.</small></label>
      <label class="check inline"><input id="layoutThresholds" type="checkbox" ${l.showThresholds ? "checked" : ""}/> Show threshold lines and colors</label>
      <label class="check inline"><input id="layoutStickyToolbar" type="checkbox" ${l.stickyToolbar ? "checked" : ""}/> Sticky chart controls</label>
    </article>
    <article class="field-card layout-order">
      <strong>Panel order</strong>
      ${metrics.map(metric => `<div class="layout-row"><span>${escapeHtml(metricLabel(metric))}</span><button data-move-chart="${metric}" data-dir="-1">${icons.up} Up</button><button data-move-chart="${metric}" data-dir="1">${icons.down} Down</button></div>`).join("")}
    </article>
    <div class="layout-actions"><button class="primary compact-action" data-action="saveLayout">${icons.saveDisk} Save</button></div>
  </div>`;
}

function renderThresholdConfig() {
  const metrics = Object.keys(state.thresholds).filter(metric => {
    const t = state.thresholds[metric];
    return Number.isFinite(t.warn) || Number.isFinite(t.danger);
  });
  return `<div class="threshold-grid">
    ${metrics.map(metric => {
      const t = state.thresholds[metric];
      return `<article class="field-card threshold-card">
        <strong>${escapeHtml(metricLabel(metric))}</strong>
        <p>Unit: ${escapeHtml(t.unit)} ${t.inverse ? "- lower is worse" : "- higher is worse"}</p>
        <p class="hint">${escapeHtml(t.rationale || EXPERT_DEFAULT_THRESHOLDS[metric]?.rationale || "Expert default based on sustained socket-level symptoms.")}</p>
        <label class="threshold-label comfort-label"><span>Comfort zone (${escapeHtml(t.unit)})</span><input data-threshold="${metric}" data-threshold-key="comfort" inputmode="numeric" value="${formatMetricNumber(metric, t.comfort)}"/></label>
        <label class="threshold-label warning-label"><span><i class="ri-alert-line"></i> Warning zone (${escapeHtml(t.unit)})</span><input data-threshold="${metric}" data-threshold-key="warn" inputmode="numeric" value="${formatMetricNumber(metric, t.warn)}"/></label>
        <label class="threshold-label danger-label"><span><i class="ri-alarm-warning-line"></i> Danger zone (${escapeHtml(t.unit)})</span><input data-threshold="${metric}" data-threshold-key="danger" inputmode="numeric" value="${formatMetricNumber(metric, t.danger)}"/></label>
      </article>`;
    }).join("")}
  </div>`;
}

function renderColumnChooser() {
  const visibleCount = state.table.visible.length;
  return `<div class="column-layout-editor">
    <article class="field-card table-profile-card">
      <div>
        <strong>Named table layouts</strong>
        <p class="hint">Save column order, pinned columns, hidden columns, sort, and page size.</p>
      </div>
      <div class="profile-row">
        <input id="tableLayoutName" placeholder="Layout name" />
        <button class="primary" data-action="saveTableLayout">${icons.saveDisk} Save layout</button>
      </div>
      <div class="profile-list">
        ${state.tableProfiles.length ? state.tableProfiles.map(profile => `<div class="profile-item">
          <span>${escapeHtml(profile.name)}</span>
          <button class="icon" data-load-table-layout="${profile.id}" title="Apply layout"><i class="ri-check-line"></i></button>
          <button class="icon" data-delete-table-layout="${profile.id}" title="Delete layout">${icons.trash}</button>
        </div>`).join("") : `<span class="hint">No saved table layout yet.</span>`}
      </div>
    </article>
    <div class="column-list-head">
      <strong>${formatNumber(visibleCount)} visible columns</strong>
      <span class="hint">Drag cards to reorder. Toggle checkboxes without losing your place.</span>
    </div>
    <div class="field-list column-list">
    ${state.table.order.map((key, index) => {
      const col = getColumn(key);
      const visible = state.table.visible.includes(key);
      const pinned = state.table.pinned.includes(key);
      return `<article class="field-card column-card ${visible ? "" : "muted-card"}" draggable="true" data-col-key="${key}">
        <span class="drag-handle">${icons.drag}</span>
        <label class="check inline"><input type="checkbox" data-visible-col="${key}" ${visible ? "checked" : ""}/> ${escapeHtml(col.label)}</label>
        <div class="toolbar">
          <button class="icon" data-pin-col="${key}" title="${pinned ? "Unpin column" : "Pin column"}">${pinned ? icons.unpin : icons.pin}</button>
          <button class="icon" data-hide-col="${key}" title="Hide column">${icons.hide}</button>
        </div>
      </article>`;
    }).join("")}
    </div>
  </div>`;
}

function resolvedNumberLocale() {
  return state?.prefs?.numberLocale && state.prefs.numberLocale !== "auto"
    ? state.prefs.numberLocale
    : navigator.language || "en-US";
}

function resolvedTimeZone() {
  return state?.prefs?.chartTimeZone && state.prefs.chartTimeZone !== "auto"
    ? state.prefs.chartTimeZone
    : BROWSER_TIME_ZONE;
}

function timeZoneOptions() {
  const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return [...new Set([resolvedTimeZone(), ...COMMON_TIME_ZONES, ...supported])].filter(Boolean);
}

function rememberBounded(cache, key, create, limit = 32) {
  if (cache.has(key)) return cache.get(key);
  const value = create();
  cache.set(key, value);
  if (cache.size > limit) cache.delete(cache.keys().next().value);
  return value;
}

function numberFormatterWith(minimumFractionDigits, maximumFractionDigits) {
  const locale = resolvedNumberLocale();
  const grouping = state?.prefs?.numberGrouping !== false;
  const key = `${locale}|${grouping ? 1 : 0}|${minimumFractionDigits}|${maximumFractionDigits}`;
  return rememberBounded(numberFormatterCache, key, () => new Intl.NumberFormat(locale, {
    useGrouping: grouping,
    minimumFractionDigits,
    maximumFractionDigits
  }));
}

function numberFormatter(maximumFractionDigits) {
  return numberFormatterWith(0, maximumFractionDigits);
}

function numberSeparators() {
  const locale = resolvedNumberLocale();
  return rememberBounded(numberSeparatorCache, locale, () => {
    const sample = new Intl.NumberFormat(locale).formatToParts(12345.6);
    return {
      group: sample.find(part => part.type === "group")?.value || ",",
      decimal: sample.find(part => part.type === "decimal")?.value || "."
    };
  });
}

function dateTimeFormatter(locale, options, cacheId = "") {
  const key = `${cacheId}|${locale}|${options.timeZone || ""}|${options.year || ""}|${options.month || ""}|${options.day || ""}|${options.hour || ""}|${options.minute || ""}|${options.second || ""}|${options.fractionalSecondDigits || ""}|${options.hour12 ?? ""}`;
  return rememberBounded(dateTimeFormatterCache, key, () => new Intl.DateTimeFormat(locale, options));
}

function formatNumber(value) {
  const numeric = Number(value || 0);
  const decimals = Number.isInteger(numeric) ? 0 : 2;
  return numberFormatter(decimals).format(numeric);
}

function formatTimelineTime(event) {
  if (!event?.epochMs) return "snapshot";
  const epochMs = Number(event.epochMs);
  const hasMilliseconds = Number.isFinite(epochMs) && Math.abs(Math.round(epochMs)) % 1000 !== 0;
  try {
    return dateTimeFormatter(resolvedNumberLocale(), {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      ...(hasMilliseconds ? { fractionalSecondDigits: 3 } : {}),
      timeZone: resolvedTimeZone()
    }, hasMilliseconds ? "timeline-ms" : "timeline").format(new Date(epochMs));
  } catch {
    return "snapshot";
  }
}

function formatTimelineOffset(seconds) {
  const numeric = Number(seconds || 0);
  if (!Number.isFinite(numeric)) return "0";
  if (Math.abs(numeric % 1) > 0.0005) return numberFormatterWith(3, 3).format(numeric);
  return formatNumber(numeric);
}

function metricUnit(metric) {
  return thresholdFor(metric).unit || "";
}

function metricFractionDigits(metric, value) {
  const numeric = Math.abs(Number(value || 0));
  if (["pacing_rate", "delivery_rate", "tx_bps", "rx_bps", "sendQ", "recvQ", "rcv_space", "rcv_ssthresh", "skmem.r", "skmem.rb", "skmem.t", "skmem.d", "bytes_sent", "bytes_acked", "bytes_received", "segs_out", "segs_in", "cwnd", "backoff", "retrans"].includes(metric)) return 0;
  if (metric === "skmem.d_rate") return numeric > 0 && numeric < 1 ? 3 : 2;
  if (["rtt", "rto", "ato", "rttvar", "rcv_rtt"].includes(metric)) return numeric > 0 && numeric < 10 ? 3 : Number.isInteger(Number(value)) ? 0 : 3;
  return Number.isInteger(Number(value)) ? 0 : 2;
}

function formatMetricNumber(metric, value) {
  const digits = metricFractionDigits(metric, value);
  const minimumDigits = ["rtt", "rto", "ato", "rcv_rtt"].includes(metric) && Math.abs(Number(value || 0)) > 0 && Math.abs(Number(value || 0)) < 10 ? digits : 0;
  return numberFormatterWith(minimumDigits, digits).format(Number(value || 0));
}

function formatBitsPerSecond(value) {
  const numeric = Number(value || 0);
  const sign = numeric < 0 ? -1 : 1;
  let scaled = Math.abs(numeric);
  const units = ["bps", "kbps", "Mbps", "Gbps", "Tbps"];
  let unitIndex = 0;
  while (scaled >= 1000 && unitIndex < units.length - 1) {
    scaled /= 1000;
    unitIndex += 1;
  }
  const digits = unitIndex === 0 ? 0 : scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const formatted = numberFormatter(digits).format(sign * scaled);
  return `${formatted} ${units[unitIndex]}`;
}

function formatMetricValue(metric, value) {
  const unit = metricUnit(metric);
  if (unit === "bps") return formatBitsPerSecond(value);
  return `${formatMetricNumber(metric, value)}${unit ? ` ${unit}` : ""}`;
}

function formatTableMetricValue(metric, value) {
  return state?.prefs?.tableUnits === false ? formatMetricNumber(metric, value) : formatMetricValue(metric, value);
}

function renderTableMetricCell(metric, value) {
  const severity = thresholdSeverity(metric, Number(value || 0));
  return `<span class="table-metric ${severity}" title="${escapeHtml(metricLabel(metric))}: ${formatMetricValue(metric, value)}">${formatTableMetricValue(metric, value)}</span>`;
}

function parseFormattedNumber(value) {
  if (typeof value === "number") return value;
  const { group, decimal } = numberSeparators();
  const normalized = String(value || "")
    .split(group).join("")
    .replace(/\s|\u202f|\u00a0/g, "")
    .replace(decimal, ".")
    .replace(/[^\d.-]/g, "");
  return Number(normalized || 0);
}

function metricLabel(metric) {
  return _metricLabel(metric);
}

function metricColor(metric) {
  return {
    rtt: "#5db7ff",
    rto: "#ff9f43",
    rcv_rtt: "#93c5fd",
    rcv_space: "#34d399",
    rcv_ssthresh: "#fbbf24",
    sendQ: "#39d6d6",
    recvQ: "#d38cff",
    cwnd: "#4cde8a",
    ato: "#ffd166",
    "skmem.r": "#7dd3fc",
    "skmem.rb": "#60a5fa",
    "skmem.t": "#f472b6",
    "skmem.d": "#ff5c77",
    "skmem.d_rate": "#ff2e63",
    pacing_rate: "#a3e635",
    delivery_rate: "#67e8f9",
    tx_bps: "#22d3ee",
    rx_bps: "#818cf8",
    bytes_sent: "#2dd4bf",
    bytes_acked: "#38bdf8",
    bytes_received: "#a78bfa",
    rttvar: "#fb7185",
    segs_out: "#2dd4bf",
    segs_in: "#c084fc",
    backoff: "#f97316",
    retrans: "#f43f5e"
  }[metric] || "#5db7ff";
}

function thresholdFor(metric) {
  return state.thresholds[metric] || { comfort: 0, warn: Number.POSITIVE_INFINITY, danger: Number.POSITIVE_INFINITY, unit: "" };
}

function thresholdSeverity(metric, value) {
  const t = thresholdFor(metric);
  if (t.inverse) {
    if (value <= t.danger) return "danger";
    if (value <= t.warn) return "warn";
    return "comfort";
  }
  if (value >= t.danger) return "danger";
  if (value >= t.warn) return "warn";
  return "comfort";
}

function thresholdColor(metric, value) {
  const sev = thresholdSeverity(metric, value);
  return sev === "danger" ? "#ff5c77" : sev === "warn" ? "#ff9f43" : metricColor(metric);
}

function percentile(sortedValues, p) {
  if (!sortedValues.length) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const rank = (p / 100) * (sortedValues.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const weight = rank - lo;
  return sortedValues[lo] + (sortedValues[hi] - sortedValues[lo]) * weight;
}

function chartStats(metric) {
  const rows = visibleHistory();
  const values = rows
    .map(row => Number(row?.[metric]))
    .filter(value => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (!values.length) return { count: 0, metric };
  return {
    metric,
    count: values.length,
    first: rows[0],
    last: rows[rows.length - 1],
    min: values[0],
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    p90: percentile(values, 90),
    p99: percentile(values, 99),
    p999: percentile(values, 99.9),
    p9999: percentile(values, 99.99),
    max: values[values.length - 1],
    curve: Array.from({ length: 101 }, (_, p) => ({ p, value: percentile(values, p) }))
  };
}

function renderPercentileDistribution(metric, stats) {
  const w = 520;
  const h = 260;
  const values = stats.curve || [];
  const rawMin = Math.min(...values.map(point => point.value));
  const rawMax = Math.max(...values.map(point => point.value), 1);
  const range = rawMax - rawMin || 1;
  const min = rawMin > range * 2 ? rawMin - range * 0.1 : 0;
  const max = rawMax + range * 0.05;
  const span = Math.max(1, max - min);
  const yTicks = [0, .25, .5, .75, 1].map(f => min + f * span);
  const longestLabel = yTicks.map(v => formatMetricValue(metric, v)).reduce((a, b) => a.length > b.length ? a : b, "");
  const padL = Math.min(160, Math.max(76, longestLabel.length * 7 + 16));
  const pad = { l: padL, r: 32, t: 28, b: 52 };
  const x = p => pad.l + (Math.max(0, Math.min(100, p)) / 100) * (w - pad.l - pad.r);
  const y = value => h - pad.b - ((value - min) / span) * (h - pad.t - pad.b);
  const path = values.map((point, index) => `${index ? "L" : "M"}${x(point.p).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const percentilePoints = values.map(point => `<circle cx="${x(point.p)}" cy="${y(point.value)}" r="1.9" fill="${metricColor(metric)}" opacity=".95"><title>P${point.p}: ${formatMetricValue(metric, point.value)}</title></circle>`).join("");
  const markers = [
    ["P50", 50, stats.p50],
    ["P90", 90, stats.p90],
    ["P99", 99, stats.p99],
    ["P99.9", 99.9, stats.p999],
    ["P99.99", 99.99, stats.p9999]
  ];
  return `<svg class="percentile-chart" data-percentile-chart="1" data-chart-width="${w}" data-chart-height="${h}" data-pad-left="${pad.l}" data-pad-right="${pad.r}" data-pad-top="${pad.t}" data-pad-bottom="${pad.b}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeHtml(metricLabel(metric))} percentile distribution">
      <rect x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="${chartBgColor()}"/>
      ${yTicks.map(value => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(value)}" y2="${y(value)}" stroke="#263241"/><text x="${pad.l - 10}" y="${y(value) + 4}" text-anchor="end" fill="#8c9aab" font-size="11">${formatMetricValue(metric, value)}</text>`).join("")}
      ${[0, 25, 50, 75, 90, 99, 100].map((p, i, arr) => `<line x1="${x(p)}" x2="${x(p)}" y1="${pad.t}" y2="${h - pad.b}" stroke="#182434"/><text x="${x(p)}" y="${h - 20}" text-anchor="${i === arr.length - 1 ? "end" : i === 0 ? "start" : "middle"}" fill="#8c9aab" font-size="11">${p === 100 ? "P100" : `P${p}`}</text>`).join("")}
      <path d="${path}" fill="none" stroke="${metricColor(metric)}" stroke-width="1.5"/>
      ${percentilePoints}
      ${markers.map(([label, p, value]) => `<circle cx="${x(p)}" cy="${y(value)}" r="3" fill="${thresholdColor(metric, value)}"><title>${label}: ${formatMetricValue(metric, value)}</title></circle>`).join("")}
      <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="#52657a"/>
      <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="#52657a"/>
      <g class="percentile-focus-layer" data-percentile-focus-layer="1"></g>
    <text x="${pad.l}" y="18" fill="#edf4ff" font-size="13" font-weight="700">${escapeHtml(metricLabel(metric))} percentile curve</text>
    <text x="${w / 2}" y="${h - 5}" text-anchor="middle" fill="#c4d0de" font-size="12">Percentile rank</text>
  </svg>`;
}

function showPercentileTableCrosshair(percentile, label, value) {
  const svg = document.querySelector("[data-percentile-chart]");
  const layer = svg?.querySelector("[data-percentile-focus-layer]");
  if (!svg || !layer) return;
  const w = Number(svg.dataset.chartWidth || 520);
  const h = Number(svg.dataset.chartHeight || 260);
  const left = Number(svg.dataset.padLeft || 76);
  const right = Number(svg.dataset.padRight || 24);
  const top = Number(svg.dataset.padTop || 28);
  const bottom = Number(svg.dataset.padBottom || 52);
  const x = left + (Math.max(0, Math.min(100, Number(percentile) || 0)) / 100) * (w - left - right);
  const badgeX = Math.max(left + 6, Math.min(w - right - 112, x + 10));
  layer.innerHTML = `
    <line x1="${x}" x2="${x}" y1="${top}" y2="${h - bottom}" class="percentile-focus-line"/>
    <rect x="${badgeX}" y="${top + 6}" width="104" height="28" rx="7" class="percentile-focus-badge"/>
    <text x="${badgeX + 10}" y="${top + 24}" class="percentile-focus-text">${escapeHtml(label)}: ${formatMetricValue(state.statsMetric || state.prefs.graphMetric, value)}</text>
  `;
}

function clearPercentileTableCrosshair() {
  const layer = document.querySelector("[data-percentile-focus-layer]");
  if (layer) layer.innerHTML = "";
}

function chartPointRadius(pointCount, style) {
  const base = { XS: 1, S: 2, M: 3.2, L: 4.6 }[state.prefs.chartPointSize || "S"] || 2;
  if (base <= 1) return 1;
  const count = Math.max(1, Number(pointCount || 1));
  const densityFactor = count <= 80 ? 1 : count <= 180 ? 0.78 : count <= 400 ? 0.58 : count <= 900 ? 0.42 : 0.3;
  const styleFactor = style === "points" || style === "xy" ? 1.15 : 1;
  return Math.max(1, Math.min(base * styleFactor, base * densityFactor * styleFactor));
}

function hasRealTimestampHistory() {
  return state.history.some(row => row?.epochMs);
}

function chartResolutionLabel() {
  const visible = visibleHistory().length;
  const mode = hasRealTimestampHistory() ? "real timestamps" : "synthetic timeline";
  return `${formatNumber(visible)} visible point(s), ${mode}`;
}

function visibleHistory(metric = null) {
  const rows = state.history.length ? state.history : [];
  if (rows.length <= 2) return rows;
  const zoom = chartZoomFor(metric);
  const cacheKey = `${state.dataVersion}|${state.selectedId}|${metric || "shared"}|${rows.length}|${rows[0]?.epochMs || 0}|${rows[rows.length - 1]?.epochMs || 0}|${zoom.start}|${zoom.end}`;
  const historyCache = state.cache.visibleHistoryRowsByKey || (state.cache.visibleHistoryRowsByKey = new Map());
  if (historyCache.has(cacheKey)) return historyCache.get(cacheKey);
  const start = Math.floor(zoom.start * (rows.length - 1));
  const end = Math.max(start + 1, Math.ceil(zoom.end * (rows.length - 1)));
  const visibleRows = rows.slice(start, end + 1);
  state.cache.visibleHistoryKey = cacheKey;
  state.cache.visibleHistoryRows = visibleRows;
  historyCache.set(cacheKey, visibleRows);
  if (historyCache.size > 16) historyCache.delete(historyCache.keys().next().value);
  return visibleRows;
}

function chartPointBudget(style, width) {
  const pxBudget = Math.max(1200, Math.round((width || 640) * 8));
  const styleBudget = style === "bars" ? 5000 : style === "points" || style === "xy" ? 8000 : 16000;
  return Math.min(styleBudget, pxBudget);
}

function renderableHistory(rows, metric, style, width) {
  const budget = chartPointBudget(style, width);
  if (rows.length <= budget) return { rows, total: rows.length, reduced: false };
  return {
    rows: preserveExtremesDownsample(rows, metric, budget),
    total: rows.length,
    reduced: true
  };
}

function chartRowTime(row) {
  return row?.epochMs ?? (row?.t || 0) * 1000;
}

function nearestChartRow(rows, pct) {
  if (!rows.length) return {};
  const first = chartRowTime(rows[0]);
  const last = chartRowTime(rows[rows.length - 1]);
  const target = first + Math.max(0, Math.min(1, pct)) * Math.max(1, last - first);
  return rows.reduce((best, row) => (
    Math.abs(chartRowTime(row) - target) < Math.abs(chartRowTime(best) - target) ? row : best
  ), rows[0]);
}

function nearestChartRowIndex(rows, pct) {
  if (!rows.length) return -1;
  const first = chartRowTime(rows[0]);
  const last = chartRowTime(rows[rows.length - 1]);
  const target = first + Math.max(0, Math.min(1, pct)) * Math.max(1, last - first);
  let bestIndex = 0;
  let bestDistance = Infinity;
  rows.forEach((row, index) => {
    const distance = Math.abs(chartRowTime(row) - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function preserveExtremesDownsample(rows, metric, budget) {
  if (rows.length <= budget || budget < 8) return rows;
  const middleBudget = Math.max(2, budget - 2);
  const bucketCount = Math.max(1, Math.floor(middleBudget / 2));
  const bucketSize = Math.max(1, Math.ceil((rows.length - 2) / bucketCount));
  const picked = new Map([[0, rows[0]], [rows.length - 1, rows[rows.length - 1]]]);
  for (let start = 1; start < rows.length - 1; start += bucketSize) {
    const end = Math.min(rows.length - 1, start + bucketSize);
    let minIndex = start;
    let maxIndex = start;
    for (let i = start + 1; i < end; i += 1) {
      const value = rows[i][metric] || 0;
      if (value < (rows[minIndex][metric] || 0)) minIndex = i;
      if (value > (rows[maxIndex][metric] || 0)) maxIndex = i;
    }
    picked.set(minIndex, rows[minIndex]);
    picked.set(maxIndex, rows[maxIndex]);
  }
  return [...picked.entries()].sort((a, b) => a[0] - b[0]).slice(0, budget).map(([, row]) => row);
}

function chartBgColor() {
  return document.documentElement.getAttribute("data-theme") === "light" ? "#f0f3f7" : "#050910";
}

function chartXMinorTicks(data, pad, w, h, firstTime, lastTime) {
  const span = lastTime - firstTime;
  if (span <= 0 || !data.length) return "";
  const plotW = w - pad.l - pad.r;
  let interval;
  if (span <= 5000) interval = 1000;
  else if (span <= 30000) interval = 5000;
  else if (span <= 120000) interval = 15000;
  else if (span <= 600000) interval = 60000;
  else interval = 300000;
  const ticks = [];
  const start = Math.ceil(firstTime / interval) * interval;
  for (let t = start; t <= lastTime; t += interval) {
    const xPos = pad.l + ((t - firstTime) / span) * plotW;
    if (xPos <= pad.l + 20 || xPos >= w - pad.r - 20) continue;
    const d = new Date(t);
    const label = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
    ticks.push({ x: xPos, label });
  }
  return ticks.map(tick => `<line x1="${tick.x}" x2="${tick.x}" y1="${h - pad.b}" y2="${h - pad.b + 5}" stroke="#8c9aab" opacity="0.4"/><text x="${tick.x}" y="${h - 6}" text-anchor="middle" fill="#8c9aab" font-size="9" opacity="0.5">${tick.label}</text>`).join("");
}

function timeLabel(seconds, epochMs = null) {
  if (epochMs) {
    const d = new Date(epochMs);
    const h = String(d.getUTCHours()).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    const s = String(d.getUTCSeconds()).padStart(2, "0");
    const ms = String(d.getUTCMilliseconds()).padStart(3, "0");
    return `${h}:${m}:${s}.${ms}`;
  }
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}h`;
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)}m`;
  return `${Math.round(seconds)}s`;
}

function dateTimePartsInZone(epochMs) {
  const parts = dateTimeFormatter("en-CA", {
    timeZone: resolvedTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }, "parts-zone").formatToParts(new Date(epochMs));
  const value = type => parts.find(part => part.type === type)?.value || "00";
  const hour = value("hour") === "24" ? "00" : value("hour");
  return `${value("year")}-${value("month")}-${value("day")}T${hour}:${value("minute")}:${value("second")}`;
}

function timeZoneOffsetMs(timeZone, epochMs) {
  const parts = dateTimeFormatter("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }, "offset").formatToParts(new Date(epochMs));
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const hour = map.hour === "24" ? "00" : map.hour;
  return Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), Number(hour), Number(map.minute), Number(map.second)) - epochMs;
}

function zonedDateTimeToEpoch(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return NaN;
  const [, year, month, day, hour, minute, second = 0] = match.map(value => Number(value || 0));
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const zone = resolvedTimeZone();
  const firstPass = utcGuess - timeZoneOffsetMs(zone, utcGuess);
  return utcGuess - timeZoneOffsetMs(zone, firstPass);
}

function chartZoomFor(metric = null) {
  return zoomForMetric(state.chartZoomByMetric, state.chartZoom, metric);
}
function setZoom(start, end, metric = null) {
  const next = clampZoomRange(start, end);
  if (metric) state.chartZoomByMetric[metric] = next;
  else state.chartZoom = next;
  clearVisibleHistoryCache();
}
function applyChartZoomAction(action, metric = null) {
  const result = applyChartZoomOperation({
    action,
    metric,
    sharedZoom: state.chartZoom,
    chartZoomByMetric: state.chartZoomByMetric
  });
  state.chartZoom = result.sharedZoom;
  state.chartZoomByMetric = result.chartZoomByMetric;
  if (!metric) state.chartZoomByMetric = {};
  state.activeChartMetric = result.activeChartMetric || metric || state.prefs.graphMetric;
  state.activeChartAction = result.activeChartAction;
  clearVisibleHistoryCache();
}

function orderedChartMetrics() {
  const order = state.prefs.chartLayout.panelOrder || [];
  return [...state.chartMetrics].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

function chartMoveTargetIndex(metric, direction) {
  const visible = orderedChartMetrics();
  const current = visible.indexOf(metric);
  const columns = clampChartColumns(state.prefs.chartLayout.columns);
  if (current < 0) return -1;
  const column = current % columns;
  if (direction === "left") return column > 0 ? current - 1 : -1;
  if (direction === "right") return column < columns - 1 && current + 1 < visible.length ? current + 1 : -1;
  if (direction === "up") return current - columns >= 0 ? current - columns : -1;
  if (direction === "down") return current + columns < visible.length ? current + columns : -1;
  if (typeof direction === "number") return current + direction;
  return -1;
}

function chartMoveOptions(metric) {
  const visible = orderedChartMetrics();
  const current = visible.indexOf(metric);
  if (current < 0) return [];
  const options = [
    { direction: "left", label: "Move left", icon: icons.arrowLeft },
    { direction: "right", label: "Move right", icon: icons.arrowRight },
    { direction: "up", label: "Move up", icon: icons.up },
    { direction: "down", label: "Move down", icon: icons.down }
  ].filter(option => {
    const targetIndex = chartMoveTargetIndex(metric, option.direction);
    return targetIndex >= 0 && targetIndex < visible.length;
  }).map(option => ({
    ...option,
    targetMetric: visible[chartMoveTargetIndex(metric, option.direction)]
  }));
  return options;
}

function renderChartMoveMenu(metric) {
  return `<button class="mini chart-drag-handle" draggable="true" data-chart-drag="${escapeHtml(metric)}" title="Drag to reorder"><i class="ri-draggable"></i></button>`;
}

function positionChartMoveMenu(button, metric) {
  const options = chartMoveOptions(metric);
  const menuWidth = 220;
  const menuHeight = Math.max(56, 16 + options.length * 38);
  const rect = button.getBoundingClientRect();
  const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
  const preferBelow = rect.bottom + menuHeight + 8 <= window.innerHeight;
  const top = preferBelow ? rect.bottom + 6 : Math.max(8, rect.top - menuHeight - 6);
  state.openChartMoveMetric = metric;
  state.openChartMovePos = { left: Math.round(left), top: Math.round(top) };
}

function moveVisibleChartMetric(metric, directionOrTarget) {
  const visible = orderedChartMetrics();
  const current = visible.indexOf(metric);
  let targetMetric;
  if (visible.includes(directionOrTarget)) {
    targetMetric = directionOrTarget;
  } else {
    const targetIndex = chartMoveTargetIndex(metric, directionOrTarget);
    targetMetric = visible[targetIndex];
  }
  if (current < 0 || !targetMetric || metric === targetMetric) return false;
  const order = [...state.prefs.chartLayout.panelOrder];
  const currentOrderIndex = order.indexOf(metric);
  const targetOrderIndex = order.indexOf(targetMetric);
  if (currentOrderIndex < 0 || targetOrderIndex < 0) return false;
  [order[currentOrderIndex], order[targetOrderIndex]] = [order[targetOrderIndex], order[currentOrderIndex]];
  state.prefs.chartLayout.panelOrder = order;
  savePrefs();
  return true;
}

function resetAllState() {
  state.raw = "";
  state.command = "ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all";
  state.ssCommandConfig = defaultSsCommandConfig();
  setSourceName("empty workspace");
  state.sockets = [];
  state.healthScore = null;
  state.selectedId = null;
  setActiveInvestigation(state, null);
  state.anomalies = [];
  state.alertEvents = [];
  state.baseline = null;
  state.view = "ingest";
  state.activeTab = "sockets";
  state.drawer = null;
  state.modal = null;
  state.annotationContext = null;
  state.statsMetric = null;
  state.ingestRawExpanded = true;
  state.openChartMoveMetric = null;
  state.openChartMovePos = null;
  state.openMenuPos = null;
  state.openMenuId = null;
  state.openExportMenu = null;
  state.openExportMenuPos = null;
  state.openDashboardPresetMenu = false;
  state.activeDashboardPreset = Object.keys(DASHBOARD_PRESETS)[0] || "noc";
  state.openConversationInsightKey = null;
  state.openConversationInsightPos = null;
  state.conversationSort = { key: "anomalies", dir: "desc" };
  state.selectedMapEdgeId = null;
  state.history = [];
  state.chartMetrics = ["tx_bps", "rx_bps", "rtt", "rto", "sendQ", "skmem.d"];
  state.hiddenChartSeries = new Set();
  state.hiddenJvmSeries = new Set();
  state.jvmTable = { page: 1, pageSize: 20, sortKey: "time", sortDir: "desc" };
  state.correlation = { x: "rtt", y: "sendQ" };
  state.analysisDirty = true;
  state.bandwidthIndex = {};
  state.cache = {
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
  };
  state.rawVersion += 1;
  setZoom(0, 1);
  state.table = {
    page: 1,
    pageSize: state.prefs.defaultPageSize,
    sortKey: "risk",
    sortDir: "desc",
    pinned: ["risk", "state", "local"],
    visible: defaultTableColumns(),
    order: [...DEFAULT_TABLE_ORDER],
    filters: { text: "", risk: "all", state: "all", family: "all", minRecvQ: "", minSendQ: "", minRtt: "", srcIp: "", dstIp: "", srcPort: "", dstPort: "", process: "", onlyAnomalies: false }
  };
}

function chartEpochAt(which) {
  const rows = state.history;
  if (!rows.length) return null;
  const first = rows[0]?.epochMs || Date.now();
  const last = rows[rows.length - 1]?.epochMs || (first + (rows[rows.length - 1]?.t || 0) * 1000);
  const ratio = which === "start" ? state.chartZoom.start : state.chartZoom.end;
  return first + ratio * (last - first);
}

function zoomDateTimeValue(which) {
  const epoch = chartEpochAt(which);
  if (!epoch) return "";
  return dateTimePartsInZone(epoch);
}

function setZoomFromDateInputs() {
  const startValue = document.querySelector("#startTimeInput")?.value;
  const endValue = document.querySelector("#endTimeInput")?.value;
  if (!startValue || !endValue || !state.history.length) return;
  const first = state.history[0]?.epochMs || Date.now();
  const last = state.history[state.history.length - 1]?.epochMs || (first + (state.history[state.history.length - 1]?.t || 0) * 1000);
  const start = zonedDateTimeToEpoch(startValue);
  const end = zonedDateTimeToEpoch(endValue);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || last <= first) return;
  setZoom((start - first) / (last - first), (end - first) / (last - first));
}

function zoomToTailLatencyWindow() {
  const lens = tailLatencyLens();
  if (!lens || !state.history.length) return false;
  const first = state.history[0]?.epochMs || 0;
  const last = state.history[state.history.length - 1]?.epochMs || first;
  if (!Number.isFinite(first) || !Number.isFinite(last) || last <= first) return false;
  const paddingMs = Math.max(1000, ((lens.endEpochMs - lens.startEpochMs) || 0) * 0.2);
  const start = Math.max(first, lens.startEpochMs - paddingMs);
  const end = Math.min(last, lens.endEpochMs + paddingMs);
  setZoom((start - first) / (last - first), (end - first) / (last - first));
  return true;
}

const COUNTER_AXIS_METRICS = new Set([
  "bytes_acked",
  "bytes_received",
  "bytes_sent",
  "bytes_retrans",
  "segs_out",
  "segs_in",
  "data_segs_out",
  "data_segs_in",
  "delivered"
]);

function chartAxisDomain(metric, values, thresholds = []) {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) return { min: 0, max: 1, span: 1, zoomed: false };
  const rawMin = Math.min(...finiteValues);
  const rawMax = Math.max(...finiteValues);
  const rawRange = rawMax - rawMin;
  const finiteThresholds = thresholds.filter(Number.isFinite);
  const thresholdMax = finiteThresholds.length ? Math.max(...finiteThresholds) : 0;
  const defaultMax = Math.max(rawMax, thresholdMax, 1);
  const defaultMin = Math.min(0, rawMin);
  const defaultSpan = Math.max(1, defaultMax - defaultMin);
  const canZoomCounter = COUNTER_AXIS_METRICS.has(metric) && rawMin > 0 && rawMax > 0;
  const compressed = canZoomCounter && rawRange > 0 && rawRange / Math.max(rawMax, 1) <= 0.08;
  const nearFlat = canZoomCounter && rawRange === 0 && rawMax >= 1000;
  if (!compressed && !nearFlat) return { min: defaultMin, max: defaultMax, span: defaultSpan, zoomed: false };
  const padding = Math.max(rawRange * 0.18, rawMax * 0.002, 1);
  const min = Math.max(0, rawMin - padding);
  const max = rawMax + padding;
  return { min, max, span: Math.max(1, max - min), zoomed: true };
}

function chartSeriesKey(metric, key) {
  return `${metric}:${key}`;
}

function chartSeriesHidden(metric, key) {
  return state.hiddenChartSeries?.has(chartSeriesKey(metric, key));
}

function metricChartSeries(metric, showThreshold = true) {
  const threshold = thresholdFor(metric);
  const series = [
    { key: "value", label: metricLabel(metric), color: metricColor(metric), kind: "metric" }
  ];
  if (showThreshold && state.prefs.chartLayout.showThresholds) {
    if (Number.isFinite(threshold.warn)) {
      series.push({ key: "warn", label: "Warning", color: "#ff9f43", kind: "threshold", value: threshold.warn });
    }
    if (Number.isFinite(threshold.danger)) {
      series.push({ key: "danger", label: "Danger", color: "#ff5c77", kind: "threshold", value: threshold.danger });
    }
  }
  return series;
}

function renderMetricChartLegend(metric) {
  if (!state.prefs.chartLayout.showLegend) return "";
  const items = metricChartSeries(metric, true);
  return `<div class="chart-legend metric-chart-legend" data-chart-legend="${escapeHtml(metric)}" aria-label="${escapeHtml(metricLabel(metric))} series">
    ${items.map(item => {
      const hidden = chartSeriesHidden(metric, item.key);
      const detail = item.kind === "threshold" ? ` - ${formatMetricValue(metric, item.value)}` : "";
      return `<button type="button" class="chart-legend-item ${hidden ? "is-muted" : ""}" data-chart-series-toggle="${escapeHtml(metric)}" data-chart-series-key="${escapeHtml(item.key)}" aria-pressed="${hidden ? "false" : "true"}" title="Toggle ${escapeHtml(item.label)}${escapeHtml(detail)}">
        <i style="--legend-color:${item.color}"></i>
        <span>${escapeHtml(item.label)}</span>
        ${detail ? `<small>${escapeHtml(detail.replace(/^ - /, ""))}</small>` : ""}
      </button>`;
    }).join("")}
  </div>`;
}

function renderChartThresholdOverlay(items, pad, w, h) {
  const labels = items
    .filter(item => item.show)
    .map(item => ({ ...item, lineY: item.y, label: `${item.name} ${item.formatted}` }))
    .sort((a, b) => a.lineY - b.lineY);
  if (!labels.length) return "";
  const midY = (pad.t + h - pad.b) / 2;
  return `<g class="threshold-overlay">
    ${labels.map(label => {
      const textWidth = Math.min(130, Math.max(60, label.label.length * 6 + 12));
      const pillX = pad.l + 6;
      // Place label on the side with more space (away from data center)
      const above = label.lineY > midY;
      const pillY = above ? label.lineY - 19 : label.lineY + 4;
      const textY = above ? label.lineY - 8 : label.lineY + 15;
      return `<g>
        <line x1="${pad.l}" x2="${w - pad.r}" y1="${label.lineY}" y2="${label.lineY}" stroke="${label.color}" stroke-dasharray="${label.dash}" opacity=".45"/>
        <rect x="${pillX}" y="${pillY}" width="${textWidth}" height="15" rx="7.5" fill="${chartBgColor()}" opacity=".85"/>
        <rect x="${pillX}" y="${pillY}" width="${textWidth}" height="15" rx="7.5" fill="${label.color}" opacity=".25"/>
        <text x="${pillX + 7}" y="${textY}" fill="${label.textColor || label.color}" font-size="9.5" font-weight="600">${escapeHtml(label.label)}</text>
      </g>`;
    }).join("")}
  </g>`;
}
function drawChart(deps = chartDrawDependencies()) {
  const { root = document, state: appState = state, drawChartInto: drawInto = drawChartInto } = deps;
  const svg = root.querySelector("#chart");
  if (!svg) return;
  drawInto(svg, appState.prefs.graphMetric, appState.prefs.graphStyle, true, deps);
}

function chartDrawDependencies() {
  return {
    root: document,
    state,
    drawChartInto,
    drawSingleMinimap,
    drawMinimaps,
    attachChartInteractions,
    chartRenderStyle,
    chartCardForMetric,
    updateChartActiveChrome
  };
}

function drawChartInto(svg, metric, style = null, showThreshold = false, deps = chartDrawDependencies()) {
  const { state: appState = state, attachChartInteractions: attachInteractions = attachChartInteractions } = deps;
  const renderStyle = style || appState.prefs.graphStyle;
  const w = svg.clientWidth || 640;
  const h = svg.clientHeight || 300;
  const visibleData = visibleHistory(metric);
  const renderData = renderableHistory(visibleData, metric, renderStyle, w);
  const data = renderData.rows;
  const values = data.map(d => d[metric] || 0);
  const t = thresholdFor(metric);
  const finiteThresholds = [t.warn, t.danger].filter(Number.isFinite);
  const axis = chartAxisDomain(metric, values, finiteThresholds);
  const max = axis.max;
  const min = axis.min;
  const span = axis.span;
  const yTicks = [0, .25, .5, .75, 1].map(f => min + f * span);
  const longestTick = yTicks.map(v => formatMetricValue(metric, v)).reduce((longest, value) => value.length > longest.length ? value : longest, "");
  const tickWidth = Math.min(150, Math.max(48, longestTick.length * 6.4));
  const pad = { l: Math.min(Math.max(76, tickWidth + 54), Math.max(110, w * 0.28)), r: 26, t: 34, b: 58 };
  const axisLabelX = Math.max(14, pad.l - tickWidth - 34);
  const firstTime = chartRowTime(data[0]);
  const lastTime = chartRowTime(data[data.length - 1]);
  const microburst = microburstSummary();
  const x = (row, i) => {
    const timeSpan = Math.max(1, lastTime - firstTime);
    if (data.length > 1 && timeSpan > 1) return pad.l + ((chartRowTime(row) - firstTime) / timeSpan) * (w - pad.l - pad.r);
    return pad.l + (i / Math.max(1, data.length - 1)) * (w - pad.l - pad.r);
  };
  const y = v => h - pad.b - ((v - min) / span) * (h - pad.t - pad.b);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(data[i], i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const base = `${x(data[values.length - 1], values.length - 1)},${h - pad.b} L${pad.l},${h - pad.b} Z`;
  const barWidth = Math.max(4, Math.min(18, (w - pad.l - pad.r) / Math.max(8, data.length) * 0.55));
  const pointRadius = chartPointRadius(data.length, renderStyle);
  const showPoints = renderStyle === "points" || renderStyle === "xy" || data.length <= 1500;
  const showMetricSeries = !chartSeriesHidden(metric, "value");
  const anyDanger = values.some(v => thresholdSeverity(metric, v) === "danger");
  const anyWarn = values.some(v => thresholdSeverity(metric, v) === "warn");
  const stroke = anyDanger ? "#ff5c77" : anyWarn ? "#ff9f43" : metricColor(metric);
  const singlePointLine = data.length === 1 ? `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(values[0] || 0)}" y2="${y(values[0] || 0)}" stroke="${stroke}" stroke-width="1.5" opacity=".85"/>` : "";
  const bars = values.map((v, i) => `<rect x="${x(data[i], i) - barWidth / 2}" y="${y(v)}" width="${barWidth}" height="${h - pad.b - y(v)}" fill="${thresholdColor(metric, v)}" opacity=".86"/>`).join("");
  const points = showPoints ? values.map((v, i) => `<circle cx="${x(data[i], i)}" cy="${y(v)}" r="${pointRadius.toFixed(2)}" fill="${thresholdColor(metric, v)}"><title>${metricLabel(metric)}=${formatMetricValue(metric, v)} at ${timeLabel(data[i]?.t || 0, data[i]?.epochMs)}</title></circle>`).join("") : "";
  const xTickFractions = w < 520 ? [0, .5, 1] : [0, .25, .5, .75, 1];
  const xTicks = xTickFractions.map(f => {
    const targetTime = firstTime + f * Math.max(1, lastTime - firstTime);
    const row = data.reduce((best, item) => Math.abs(chartRowTime(item) - targetTime) < Math.abs(chartRowTime(best) - targetTime) ? item : best, data[0] || {});
    const epoch = row?.epochMs;
    let label;
    if (epoch) {
      const d = new Date(epoch);
      label = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
    } else {
      label = `t+${Math.round(row?.t || 0)}s`;
    }
    return { x: pad.l + f * (w - pad.l - pad.r), label };
  });
  const showWarnLine = showThreshold && appState.prefs.chartLayout.showThresholds && Number.isFinite(t.warn) && !chartSeriesHidden(metric, "warn");
  const showDangerLine = showThreshold && appState.prefs.chartLayout.showThresholds && Number.isFinite(t.danger) && !chartSeriesHidden(metric, "danger");
  const warnY = showWarnLine ? y(t.warn) : 0;
  const dangerY = showDangerLine ? y(t.danger) : 0;
  const thresholdOverlay = renderChartThresholdOverlay([
    { show: showWarnLine, name: "warn", formatted: formatMetricValue(metric, t.warn), y: warnY, color: "#ff9f43", textColor: "#ffcb80", dash: "7 6" },
    { show: showDangerLine, name: "danger", formatted: formatMetricValue(metric, t.danger), y: dangerY, color: "#ff5c77", textColor: "#ff9eb0", dash: "4 4" }
  ], pad, w, h);
  const microburstBand = chartMicroburstBand(microburst, data, pad, w, h, firstTime, lastTime);
  const annotationOverlay = chartAnnotationOverlay(metric, data, pad, w, h, firstTime, lastTime);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.dataset.metric = metric;
  svg.dataset.plotLeft = String(pad.l);
  svg.dataset.plotRight = String(w - pad.r);
  svg.dataset.plotTop = String(pad.t);
  svg.dataset.plotBottom = String(h - pad.b);
  svg.dataset.renderStyle = renderStyle;
  svg.innerHTML = `
    <defs><linearGradient id="areaFill-${metric.replace(/\W/g, "")}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${stroke}" stop-opacity=".48"/><stop offset="1" stop-color="${stroke}" stop-opacity="0"/></linearGradient></defs>
    <rect x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="${chartBgColor()}"/>
    ${yTicks.map(v => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#263241"/><text x="${pad.l - 10}" y="${y(v) + 4}" text-anchor="end" fill="#8c9aab" font-size="11">${formatMetricValue(metric, v)}</text>`).join("")}
    ${xTicks.map((tick, i) => `<line x1="${tick.x}" x2="${tick.x}" y1="${pad.t}" y2="${h - pad.b}" stroke="#182434"/><text x="${tick.x}" y="${h - 18}" text-anchor="${i === xTicks.length - 1 ? "end" : i === 0 ? "start" : "middle"}" fill="#8c9aab" font-size="11">${tick.label}</text>`).join("")}
    ${microburstBand}
    ${thresholdOverlay}
    <text x="${pad.l}" y="18" fill="#edf4ff" font-size="13" font-weight="700">${metricLabel(metric)}${axis.zoomed ? " - zoomed Y" : ""}${renderData.reduced ? ` (${formatNumber(data.length)}/${formatNumber(renderData.total)} pts)` : ""}</text>
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="#c4d0de" font-size="12">Time since first snapshot (${escapeHtml(resolvedTimeZone())})</text>
    <text x="${axisLabelX}" y="${h / 2}" transform="rotate(-90 ${axisLabelX} ${h / 2})" text-anchor="middle" fill="#c4d0de" font-size="12">${metricLabel(metric)} ${metricUnit(metric) ? `(${metricUnit(metric)})` : ""}</text>
    ${showMetricSeries && renderStyle === "area" ? `${singlePointLine}<path d="${line} L${base}" fill="url(#areaFill-${metric.replace(/\W/g, "")})"/><path d="${line}" fill="none" stroke="${stroke}" stroke-width="1.5"/>${points}` : ""}
    ${showMetricSeries && renderStyle === "bars" ? bars : ""}
    ${showMetricSeries && renderStyle === "line" ? `${singlePointLine}<path d="${line}" fill="none" stroke="${stroke}" stroke-width="1.5"/>${points}` : ""}
    ${showMetricSeries && (renderStyle === "points" || renderStyle === "xy") ? points : ""}
    ${annotationOverlay}
    ${appState.baseline?.history?.length && !chartSeriesHidden(metric, "baseline") ? (() => { const bh = appState.baseline.history; const bValues = bh.map(d => d[metric] || 0); if (!bValues.some(v => v > 0)) return ""; const bLine = bValues.map((v, i) => `${i ? "L" : "M"}${(pad.l + (i / Math.max(1, bh.length - 1)) * (w - pad.l - pad.r)).toFixed(1)},${y(v).toFixed(1)}`).join(" "); return `<path d="${bLine}" fill="none" stroke="#ffd166" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.6"/>`; })() : ""}
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="#52657a"/>
    <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="#52657a"/>
    <g class="crosshair-layer" data-crosshair-layer="1" pointer-events="none"></g>
    <rect class="zoom-capture" x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="transparent" pointer-events="all"/>
  `;
  attachChartContextAnnotation(svg);
  if (appState.prefs.chartLayout.showCrosshair) attachInteractions(svg, deps);
}

function scheduleMultiChartDraw(deps = chartDrawDependencies()) {
  const { root = document, state: appState = state, drawChartInto: drawInto = drawChartInto, drawMinimaps: drawMaps = drawMinimaps } = deps;
  const charts = [...root.querySelectorAll("[data-mini-chart]")];
  if (!charts.length) return;
  const token = appState.chartRenderToken + 1;
  appState.chartRenderToken = token;
  const renderStyle = appState.prefs.graphStyle === "xy" ? "points" : appState.prefs.graphStyle;
  let index = 0;
  const drawSlice = () => {
    if (appState.chartRenderToken !== token) return;
    const frameStart = performance.now();
    while (index < charts.length && performance.now() - frameStart < 12) {
      const svg = charts[index];
      if (svg?.isConnected) drawInto(svg, svg.dataset.miniChart, renderStyle, true, deps);
      index += 1;
    }
    if (index < charts.length) requestAnimationFrame(drawSlice);
    else drawMaps(deps);
  };
  requestAnimationFrame(drawSlice);
}

function drawMinimaps(deps = chartDrawDependencies()) {
  const { root = document, drawSingleMinimap: drawMinimap = drawSingleMinimap } = deps;
  root.querySelectorAll("[data-minimap]").forEach(canvas => drawMinimap(canvas, canvas.dataset.minimap, deps));
}

function drawSingleMinimap(canvas, metric, deps = chartDrawDependencies()) {
    const { state: appState = state } = deps;
    const history = appState.history;
    if (!history.length) return;
    const vals = history.map(r => Number(r[metric]) || 0);
    if (!vals.some(v => v > 0)) return;
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 200;
    const h = 24;
    canvas.width = w * 2; canvas.height = h * 2;
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    // Draw full waveform
    const max = Math.max(...vals, 1);
    const step = Math.max(1, Math.floor(vals.length / w));
    ctx.fillStyle = "rgba(93,183,255,0.25)";
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i < w; i++) {
      const idx = Math.min(vals.length - 1, Math.floor((i / w) * vals.length));
      const v = vals[idx] / max;
      ctx.lineTo(i, h - v * (h - 2));
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    // Draw line on top
    ctx.strokeStyle = "rgba(93,183,255,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < w; i++) {
      const idx = Math.min(vals.length - 1, Math.floor((i / w) * vals.length));
      const v = vals[idx] / max;
      if (i === 0) ctx.moveTo(i, h - v * (h - 2));
      else ctx.lineTo(i, h - v * (h - 2));
    }
    ctx.stroke();
    // Draw zoom window highlight
    const zoom = chartZoomFor(metric);
    if (zoom && (zoom.start > 0.001 || zoom.end < 0.999)) {
      const x1 = zoom.start * w, x2 = zoom.end * w;
      // Dim outside
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, x1, h);
      ctx.fillRect(x2, 0, w - x2, h);
      // Window border
      ctx.strokeStyle = "rgba(93,183,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x1, 0.5, x2 - x1, h - 1);
    }
}

function chartRenderStyle() {
  return state.prefs.graphStyle === "xy" ? "points" : state.prefs.graphStyle;
}

function chartCardForMetric(metric, deps = chartDrawDependencies()) {
  const { root = document } = deps;
  return [...root.querySelectorAll("[data-chart-card]")].find(card => card.dataset.chartCard === metric) || null;
}

function updateChartActiveChrome(metric, action, deps = chartDrawDependencies()) {
  const { root = document } = deps;
  root.querySelectorAll(".chart-card.active-chart").forEach(card => card.classList.remove("active-chart"));
  root.querySelectorAll(".chart-card-tools .active-chart-tool").forEach(button => button.classList.remove("active-chart-tool"));
  const card = chartCardForMetric(metric, deps);
  if (!card) return;
  card.classList.add("active-chart");
  const button = [...card.querySelectorAll("[data-chart-zoom]")].find(item => item.dataset.chartZoom === action);
  if (button) {
    button.classList.remove("active-chart-tool");
    void button.offsetWidth;
    button.classList.add("active-chart-tool");
  }
}

function redrawChartCardMetric(metric, action = state.activeChartAction, deps = chartDrawDependencies()) {
  const { state: appState = state, drawChartInto: drawInto = drawChartInto, drawSingleMinimap: drawMinimap = drawSingleMinimap } = deps;
  const card = chartCardForMetric(metric, deps);
  const svg = card?.querySelector("[data-mini-chart]");
  if (!svg?.isConnected) return false;
  appState.chartRenderToken += 1;
  drawInto(svg, metric, chartRenderStyle(), true, deps);
  const minimap = card?.querySelector("[data-minimap]");
  if (minimap) drawMinimap(minimap, metric, deps);
  updateChartActiveChrome(metric, action, deps);
  return true;
}
function drawCorrelation(deps = chartDrawDependencies()) {
  const { root = document, state: appState = state } = deps;
  const svg = root.querySelector("#correlationChart");
  if (!svg) return;
  const w = svg.clientWidth || 640;
  const h = svg.clientHeight || 300;
  const rows = renderableHistory(visibleHistory(), appState.correlation.y, "xy", w).rows;
  const xs = rows.map(d => d[appState.correlation.x] || 0);
  const ys = rows.map(d => d[appState.correlation.y] || 0);
  const maxX = Math.max(...xs, 1);
  const maxY = Math.max(...ys, 1);
  const yTicks = [0, .25, .5, .75, 1].map(f => f * maxY);
  const longestYTick = yTicks.map(v => formatMetricValue(appState.correlation.y, v)).reduce((longest, value) => value.length > longest.length ? value : longest, "");
  const yTickWidth = Math.min(150, Math.max(48, longestYTick.length * 6.4));
  const pad = { l: Math.min(Math.max(78, yTickWidth + 54), Math.max(112, w * 0.3)), r: 24, t: 32, b: 58 };
  const axisLabelX = Math.max(14, pad.l - yTickWidth - 34);
  const x = v => pad.l + (v / maxX) * (w - pad.l - pad.r);
  const y = v => h - pad.b - (v / maxY) * (h - pad.t - pad.b);
  const xTicks = [0, .25, .5, .75, 1].map(f => f * maxX);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="${chartBgColor()}"/>
    ${yTicks.map(v => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#263241"/><text x="${pad.l - 10}" y="${y(v) + 4}" text-anchor="end" fill="#8c9aab" font-size="11">${formatMetricValue(appState.correlation.y, v)}</text>`).join("")}
    ${xTicks.map(v => `<line x1="${x(v)}" x2="${x(v)}" y1="${pad.t}" y2="${h - pad.b}" stroke="#182434"/><text x="${x(v)}" y="${h - 18}" text-anchor="middle" fill="#8c9aab" font-size="11">${formatMetricValue(appState.correlation.x, v)}</text>`).join("")}
    ${xs.map((value, i) => `<circle cx="${x(value)}" cy="${y(ys[i])}" r="1" fill="${thresholdColor(appState.correlation.y, ys[i])}" opacity=".9"><title>${metricLabel(appState.correlation.x)}=${formatMetricValue(appState.correlation.x, value)}, ${metricLabel(appState.correlation.y)}=${formatMetricValue(appState.correlation.y, ys[i])}</title></circle>`).join("")}
    <text x="${pad.l}" y="18" fill="#edf4ff" font-size="13" font-weight="700">${metricLabel(appState.correlation.x)} vs ${metricLabel(appState.correlation.y)}</text>
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="#c4d0de" font-size="12">${metricLabel(appState.correlation.x)} (${metricUnit(appState.correlation.x)})</text>
    <text x="${axisLabelX}" y="${h / 2}" transform="rotate(-90 ${axisLabelX} ${h / 2})" text-anchor="middle" fill="#c4d0de" font-size="12">${metricLabel(appState.correlation.y)} (${metricUnit(appState.correlation.y)})</text>
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="#52657a"/>
    <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="#52657a"/>
  `;
}

function drawBdpWindowCharts(deps = chartDrawDependencies()) {
  const { root = document, state: appState = state } = deps;
  const charts = [...root.querySelectorAll("[data-bdp-chart]")];
  if (!charts.length) return;
  const analysis = bdpWindowAnalysis(visibleHistory());
  charts.forEach(svg => drawBdpWindowChart(svg, analysis, svg.dataset.bdpChart));
  root.querySelectorAll("[data-bdp-legend] [data-series-key]").forEach(el => {
    el.onclick = () => {
      const key = el.dataset.seriesKey;
      appState.hiddenBdpSeries.has(key) ? appState.hiddenBdpSeries.delete(key) : appState.hiddenBdpSeries.add(key);
      root.querySelectorAll(`[data-series-key="${key}"]`).forEach(span => {
        span.style.opacity = appState.hiddenBdpSeries.has(key) ? ".4" : "";
        span.style.textDecoration = appState.hiddenBdpSeries.has(key) ? "line-through" : "";
      });
      drawBdpWindowCharts(deps);
    };
  });
}

function bdpChartSeries(analysis, kind) {
  const capacity = analysis.series?.capacityBps || null;
  if (kind === "bdp") {
    return [
      { key: "observedBdpBytes", label: "Observed BDP", color: "#7dd3fc", dash: "", value: sample => sample.observedBdpBytes },
      { key: "effectiveWindowBytes", label: "rcv_space/window", color: "#fbbf24", dash: "", value: sample => sample.effectiveWindowBytes },
      { key: "skmemRb", label: "skmem.rb", color: "#a78bfa", dash: "6 5", value: sample => sample.skmemRb },
      { key: "targetBdpBytes", label: "Target BDP", color: "#22c55e", dash: "7 5", value: sample => sample.targetBdpBytes }
    ];
  }
  return [
    { key: "observedThroughputBps", label: "Observed", color: "#7dd3fc", dash: "", value: sample => sample.observedThroughputBps == null ? null : sample.observedThroughputBps / 1e6 },
    { key: "throughputMaxByRcvSpaceBps", label: "Max by window", color: "#fbbf24", dash: "", value: sample => sample.throughputMaxByRcvSpaceBps == null ? null : sample.throughputMaxByRcvSpaceBps / 1e6 },
    { key: "deliveryRateBps", label: "delivery_rate", color: "#a78bfa", dash: "6 5", value: sample => sample.deliveryRateBps == null ? null : sample.deliveryRateBps / 1e6 },
    { key: "scaleCapabilityThroughputBps", label: "Scaling capacity", color: "#64748b", dash: "4 6", value: sample => sample.scaleCapabilityThroughputBps == null ? null : sample.scaleCapabilityThroughputBps / 1e6 },
    { key: "noScaleThroughputBps", label: "64 KB no scaling", color: "#94a3b8", dash: "2 6", value: sample => sample.noScaleThroughputBps == null ? null : sample.noScaleThroughputBps / 1e6 },
    { key: "capacityBps", label: "Configured capacity", color: "#22c55e", dash: "8 5", value: () => capacity ? capacity / 1e6 : null }
  ];
}

function bdpSeriesValues(data, series) {
  return data
    .map(series.value)
    .filter(value => Number.isFinite(value) && value >= 0);
}

function bdpPath(data, series, x, y) {
  const segments = [];
  let current = [];
  data.forEach((sample, index) => {
    const value = series.value(sample);
    if (!Number.isFinite(value) || value < 0) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push(`${current.length ? "L" : "M"}${x(sample, index).toFixed(1)},${y(value).toFixed(1)}`);
  });
  if (current.length) segments.push(current);
  return segments.map(segment => `<path d="${segment.join(" ")}" fill="none" stroke="${series.color}" stroke-width="2.4" stroke-dasharray="${series.dash}" opacity=".95"/>`).join("");
}

function bdpMarkerOverlay(data, kind, x, pad, h) {
  const labels = [];
  data.forEach((sample, index) => {
    const marker = sample.markers || {};
    const entries = kind === "bdp"
      ? [
          marker.bdpNearWindow ? { color: "#fbbf24", label: "BDP near/exceeds window" } : null,
          marker.counterReset ? { color: "#fb7185", label: "counter reset / reconnect" } : null
        ]
      : [
          marker.retrans ? { color: "#fb7185", label: "retrans" } : null,
          marker.rttSpike ? { color: "#f97316", label: "RTT spike" } : null,
          marker.rcvSpaceCollapse ? { color: "#fbbf24", label: "rcv_space collapse" } : null,
          marker.persist ? { color: "#ef4444", label: "persist" } : null,
          marker.counterReset ? { color: "#94a3b8", label: "counter reset / reconnect" } : null
        ];
    entries.filter(Boolean).slice(0, 2).forEach((entry, offset) => {
      labels.push(`<circle cx="${x(sample, index).toFixed(1)}" cy="${pad.t + 10 + offset * 12}" r="4" fill="${entry.color}" opacity=".92"><title>${escapeHtml(entry.label)} at ${escapeHtml(timeLabel(sample.t || 0, sample.epochMs))}</title></circle>`);
    });
  });
  return labels.join("");
}

function drawBdpWindowChart(svg, analysis, kind) {
  const w = svg.clientWidth || 820;
  const h = svg.clientHeight || 300;
  const downsampleMetric = kind === "bdp" ? "observedBdpBytes" : "observedThroughputBps";
  const data = renderableHistory(analysis.series.samples.filter(sample => sample.epochMs || sample.t != null), downsampleMetric, "line", w).rows;
  const series = bdpChartSeries(analysis, kind).filter(item => bdpSeriesValues(data, item).length);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  if (!data.length || !series.length) {
    svg.innerHTML = `<rect x="0" y="0" width="${w}" height="${h}" fill="${chartBgColor()}"/><text x="24" y="40" fill="#c4d0de" font-size="13">Not enough timestamped samples for this BDP chart.</text>`;
    return;
  }
  const values = series.filter(item => !state.hiddenBdpSeries.has(item.key)).flatMap(item => bdpSeriesValues(data, item));
  const max = Math.max(...values, kind === "bdp" ? 1024 : 1);
  const yTicks = [0, .25, .5, .75, 1].map(f => f * max);
  const formatY = kind === "bdp" ? formatBytesHuman : value => `${numberFormatter(value >= 100 ? 0 : value >= 10 ? 1 : 2).format(value)} Mbps`;
  const longestTick = yTicks.map(formatY).reduce((longest, value) => value.length > longest.length ? value : longest, "");
  const tickWidth = Math.min(150, Math.max(58, longestTick.length * 6.5));
  const pad = { l: Math.min(Math.max(82, tickWidth + 50), Math.max(118, w * 0.28)), r: 28, t: 36, b: 56 };
  const firstTime = chartRowTime(data[0]);
  const lastTime = chartRowTime(data[data.length - 1]);
  const timeSpan = Math.max(1, lastTime - firstTime);
  const x = (sample, index) => data.length > 1 && timeSpan > 1
    ? pad.l + ((chartRowTime(sample) - firstTime) / timeSpan) * (w - pad.l - pad.r)
    : pad.l + (index / Math.max(1, data.length - 1)) * (w - pad.l - pad.r);
  const y = value => h - pad.b - (value / max) * (h - pad.t - pad.b);
  const xTicks = (w < 560 ? [0, .5, 1] : [0, .25, .5, .75, 1]).map(f => {
    const targetTime = firstTime + f * timeSpan;
    const row = data.reduce((best, item) => Math.abs(chartRowTime(item) - targetTime) < Math.abs(chartRowTime(best) - targetTime) ? item : best, data[0]);
    return { x: pad.l + f * (w - pad.l - pad.r), label: timeLabel(row?.t || 0, row?.epochMs) };
  });
  const yLabel = kind === "bdp" ? "Bytes / window" : "Throughput (Mbps)";
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="${chartBgColor()}"/>
    ${yTicks.map(value => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(value)}" y2="${y(value)}" stroke="#263241"/><text x="${pad.l - 10}" y="${y(value) + 4}" text-anchor="end" fill="#8c9aab" font-size="11">${escapeHtml(formatY(value))}</text>`).join("")}
    ${xTicks.map((tick, i) => `<line x1="${tick.x}" x2="${tick.x}" y1="${pad.t}" y2="${h - pad.b}" stroke="#182434"/><text x="${tick.x}" y="${h - 18}" text-anchor="${i === xTicks.length - 1 ? "end" : i === 0 ? "start" : "middle"}" fill="#8c9aab" font-size="11">${escapeHtml(tick.label)}</text>`).join("")}
    ${series.filter(item => !state.hiddenBdpSeries.has(item.key)).map(item => bdpPath(data, item, x, y)).join("")}
    ${bdpMarkerOverlay(data, kind, x, pad, h)}
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="#c4d0de" font-size="12">Time (${escapeHtml(resolvedTimeZone())})</text>
    <text x="${Math.max(14, pad.l - tickWidth - 34)}" y="${h / 2}" transform="rotate(-90 ${Math.max(14, pad.l - tickWidth - 34)} ${h / 2})" text-anchor="middle" fill="#c4d0de" font-size="12">${escapeHtml(yLabel)}</text>
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="#52657a"/>
    <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="#52657a"/>
    <rect class="bdp-hover-zone" x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="transparent" pointer-events="all"/>
    <g class="bdp-crosshair" visibility="hidden" pointer-events="none"></g>
  `;
  attachBdpCrosshair(svg, data, series, x, y, pad, w, h, kind, formatY, max);
}

function attachBdpCrosshair(svg, data, series, xFn, yFn, pad, w, h, kind, formatY, max) {
  const zone = svg.querySelector(".bdp-hover-zone");
  const crosshairG = svg.querySelector(".bdp-crosshair");
  if (!zone || !crosshairG) return;
  const formatVal = kind === "bdp" ? formatBytesHuman : v => `${numberFormatter(v >= 100 ? 0 : v >= 10 ? 1 : 2).format(v)} Mbps`;
  const plotW = w - pad.l - pad.r;

  function showCrosshairAtIndex(idx) {
    const sample = data[idx];
    if (!sample) return;
    const cx = xFn(sample, idx);
    const visible = series.filter(item => !state.hiddenBdpSeries.has(item.key));
    const rows = visible.map(item => ({ label: item.label, color: item.color, value: item.value(sample) }));
    const time = timeLabel(sample.t || 0, sample.epochMs);
    const tooltipW = 150;
    const tooltipX = cx + 14 + tooltipW > w - pad.r ? cx - tooltipW - 14 : cx + 14;
    const lineH = 14;
    const tooltipH = (rows.length + 1) * lineH + 10;
    const tooltipY = pad.t + 30;
    crosshairG.setAttribute("visibility", "visible");
    crosshairG.innerHTML = `
      <line x1="${cx}" x2="${cx}" y1="${pad.t}" y2="${h - pad.b}" stroke="${chartBgColor() === `#f0f3f7` ? `#1a2533cc` : `#ffffffaa`}" stroke-width="1" stroke-dasharray="3 2"/>
      <rect x="${tooltipX}" y="${tooltipY}" width="${tooltipW}" height="${tooltipH}" rx="4" fill="rgba(10,16,24,.8)" stroke="#52657a"/>
      <text x="${tooltipX + 8}" y="${tooltipY + 14}" fill="#8cc8e8" font-size="10" font-weight="700">${escapeHtml(time)}</text>
      ${rows.map((r, i) => `<circle cx="${tooltipX + 10}" cy="${tooltipY + (i + 1) * lineH + 11}" r="3" fill="${r.color}"/><text x="${tooltipX + 18}" y="${tooltipY + (i + 1) * lineH + 14}" fill="#dde8f4" font-size="10">${escapeHtml(r.label)}: ${Number.isFinite(r.value) ? escapeHtml(formatVal(r.value)) : "-"}</text>`).join("")}
    `;
  }
  svg._bdpShowCrosshair = showCrosshairAtIndex;
  svg._bdpHideCrosshair = () => crosshairG.setAttribute("visibility", "hidden");
  svg._bdpData = data;
  svg._bdpPad = pad;
  svg._bdpW = w;

  let dragStart = null;
  zone.addEventListener("mousedown", event => {
    const rect = svg.getBoundingClientRect();
    const scaleX = w / rect.width;
    const locX = (event.clientX - rect.left) * scaleX;
    dragStart = Math.max(0, Math.min(1, (locX - pad.l) / plotW));
  });
  zone.addEventListener("mousemove", event => {
    const rect = svg.getBoundingClientRect();
    const scaleX = w / rect.width;
    const locX = (event.clientX - rect.left) * scaleX;
    const pct = Math.max(0, Math.min(1, (locX - pad.l) / plotW));
    const idx = Math.round(pct * (data.length - 1));
    // Sync crosshairs on both BDP charts
    document.querySelectorAll("[data-bdp-chart]").forEach(other => {
      if (other._bdpShowCrosshair) other._bdpShowCrosshair(idx);
    });
  });
  zone.addEventListener("mouseup", event => {
    if (dragStart == null) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = w / rect.width;
    const locX = (event.clientX - rect.left) * scaleX;
    const dragEnd = Math.max(0, Math.min(1, (locX - pad.l) / plotW));
    const minPct = Math.min(dragStart, dragEnd);
    const maxPct = Math.max(dragStart, dragEnd);
    dragStart = null;
    if (maxPct - minPct < 0.02) return; // too small, ignore
    // Apply zoom based on percentage of current visible range
    const currentStart = state.chartZoom.start;
    const currentEnd = state.chartZoom.end;
    const range = currentEnd - currentStart;
    state.chartZoom = clampZoomRange({ start: currentStart + minPct * range, end: currentStart + maxPct * range });
    clearVisibleHistoryCache();
    state._bdpCache = null;
    drawBdpWindowCharts();
  });
  zone.addEventListener("mouseleave", () => {
    dragStart = null;
    document.querySelectorAll("[data-bdp-chart]").forEach(other => {
      if (other._bdpHideCrosshair) other._bdpHideCrosshair();
    });
  });
}

function svgPoint(svg, event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

function chartPointerContext(svg, event) {
  const metric = svg.dataset.metric || state.prefs.graphMetric;
  const renderStyle = svg.dataset.renderStyle || state.prefs.graphStyle;
  const rows = renderableHistory(visibleHistory(metric), metric, renderStyle, svg.clientWidth || 640).rows;
  if (!rows.length) return null;
  const left = Number(svg.dataset.plotLeft);
  const right = Number(svg.dataset.plotRight);
  if (!Number.isFinite(left) || !Number.isFinite(right) || right <= left) return null;
  const point = svgPoint(svg, event);
  const x = Math.max(left, Math.min(right, point.x));
  const pct = (x - left) / Math.max(1, right - left);
  const row = nearestChartRow(rows, pct);
  const rawValue = Number(row?.[metric]);
  const value = Number.isFinite(rawValue) ? rawValue : 0;
  return {
    metric,
    row,
    value,
    epochMs: chartRowTime(row),
    kind: annotationKindForChartContext(metric, value),
    label: annotationLabelForChartContext(metric, value),
    note: `Created from chart right-click at ${timeLabel(row?.t || 0, row?.epochMs)} with ${metricLabel(metric)}=${formatMetricValue(metric, value)}.`
  };
}

function chartContextMenuPosition(event) {
  const menuWidth = 250;
  const menuHeight = 86;
  const left = Math.min(Math.max(8, event.clientX), window.innerWidth - menuWidth - 8);
  const top = Math.min(Math.max(8, event.clientY), window.innerHeight - menuHeight - 8);
  return { left: Math.round(left), top: Math.round(top) };
}

function attachChartContextAnnotation(svg) {
  if (svg.dataset.contextAnnotation === "1") return;
  svg.dataset.contextAnnotation = "1";
  svg.addEventListener("contextmenu", event => {
    event.preventDefault();
    event.stopPropagation();
    const context = chartPointerContext(svg, event);
    if (!context || !Number.isFinite(context.epochMs)) {
      toast("No chart point", "No captured sample is available at this position.", "warn");
      return;
    }
    state.chartAnnotationMenuContext = context;
    state.chartAnnotationMenuPos = chartContextMenuPosition(event);
    const existing = document.querySelector(".chart-context-menu");
    if (existing) existing.remove();
    const pos = state.chartAnnotationMenuPos;
    const menuHtml = `<div class="chart-context-menu open" style="left:${pos.left}px;top:${pos.top}px" role="menu" aria-label="Chart context menu">
      <button data-chart-annotation-menu="annotate" role="menuitem" title="${escapeHtml(metricLabel(context.metric))} at ${escapeHtml(timeLabel(context.row?.t || 0, context.row?.epochMs))}">
        <span class="chart-context-menu-icon">${icons.note}</span>
        <span class="chart-context-menu-copy">
          <strong>Annotate here</strong>
          <small>${escapeHtml(metricLabel(context.metric))} - ${escapeHtml(timeLabel(context.row?.t || 0, context.row?.epochMs))}</small>
        </span>
      </button>
    </div>`;
    document.body.insertAdjacentHTML("beforeend", menuHtml);
    const menuEl = document.querySelector(".chart-context-menu");
    menuEl?.querySelector("[data-chart-annotation-menu]")?.addEventListener("click", () => {
      const ctx = state.chartAnnotationMenuContext;
      state.chartAnnotationMenuContext = null;
      state.chartAnnotationMenuPos = null;
      menuEl.remove();
      if (ctx) {
        state.modal = "annotation";
        state.annotationDraft = { kind: "custom", label: "Analyst note", note: "", metric: ctx.metric, anchor: "cursor", epochMs: ctx.epochMs, sourceName: state.sourceName, socketId: state.selectedId || "" };
        render();
      }
    });
  });
}
function attachChartInteractions(svg, deps = chartDrawDependencies()) {
  const { root = document, state: appState = state } = deps;
  if (svg.dataset.interactive === "1") return;
  svg.dataset.interactive = "1";
  let dragging = false;
  let startX = 0;
  const layer = () => svg.querySelector("[data-crosshair-layer]");
  const bounds = () => ({
    left: Number(svg.dataset.plotLeft),
    right: Number(svg.dataset.plotRight),
    top: Number(svg.dataset.plotTop),
    bottom: Number(svg.dataset.plotBottom)
  });
  const clampX = x => Math.max(bounds().left, Math.min(bounds().right, x));
  const tooltipMarkup = (metric, rows, pct, x, b, subtle = false) => {
    const idx = nearestChartRowIndex(rows, pct);
    const row = rows[idx] || {};
    const prev = idx > 0 ? rows[idx - 1] : null;
    const value = Number(row[metric] || 0);
    const prevValue = prev ? Number(prev[metric] || 0) : null;
    const delta = Number.isFinite(prevValue) ? value - prevValue : null;
    const severity = thresholdSeverity(metric, value);
    const threshold = thresholdFor(metric);
    const items = [
      !chartSeriesHidden(metric, "value") ? { label: metricLabel(metric), color: thresholdColor(metric, value), value: formatMetricValue(metric, value) } : null,
      Number.isFinite(delta) ? { label: "Delta", color: delta > 0 ? "#7dd3fc" : delta < 0 ? "#a7f3d0" : "#94a3b8", value: `${delta >= 0 ? "+" : ""}${formatMetricValue(metric, delta)}` } : null,
      Number.isFinite(threshold.warn) && !chartSeriesHidden(metric, "warn") ? { label: "Warn", color: "#ff9f43", value: formatMetricValue(metric, threshold.warn) } : null,
      Number.isFinite(threshold.danger) && !chartSeriesHidden(metric, "danger") ? { label: "Danger", color: "#ff5c77", value: formatMetricValue(metric, threshold.danger) } : null
    ].filter(Boolean).slice(0, 5);
    const tooltipOpacity = chartTooltipOpacity();
    const width = 222;
    const lineH = 16;
    const showSeverity = severity === "warn" || severity === "danger";
    const height = Math.max(62, 36 + items.length * lineH + (showSeverity ? 15 : 0));
    const tooltipX = Math.max(b.left + 6, Math.min(x + 12, b.right - width - 6));
    const tooltipY = b.top + 28;
    return `
      <rect x="${tooltipX}" y="${tooltipY}" width="${width}" height="${height}" rx="8" fill="${chartBgColor() === `#f0f3f7` ? `#ffffff` : `#0b1018`}" fill-opacity="${tooltipOpacity}" stroke="#52657a"/>
      <text x="${tooltipX + 10}" y="${tooltipY + 18}" fill="#edf4ff" font-size="11" font-weight="700">${escapeHtml(timeLabel(row.t || 0, row.epochMs))}</text>
      ${showSeverity ? `<text x="${tooltipX + 142}" y="${tooltipY + 18}" fill="${thresholdColor(metric, value)}" font-size="10" font-weight="800">${escapeHtml(severity.toUpperCase())}</text>` : ""}
      ${items.map((item, itemIndex) => `<circle cx="${tooltipX + 12}" cy="${tooltipY + 34 + itemIndex * lineH}" r="${subtle ? 2.6 : 3.2}" fill="${item.color}"/><text x="${tooltipX + 20}" y="${tooltipY + 38 + itemIndex * lineH}" fill="#dde8f4" font-size="10.5">${escapeHtml(item.label)}: ${escapeHtml(item.value)}</text>`).join("")}
    `;
  };
  const annotationDeltaBadges = (metric, rows, pct, b) => {
    const idx = nearestChartRowIndex(rows, pct);
    const row = rows[idx];
    if (!row) return "";
    const cursorMs = chartRowTime(row);
    const annotations = currentSourceAnnotations(metric).filter(a => Number.isFinite(a.resolvedEpochMs));
    if (!annotations.length) return "";
    const firstTime = chartRowTime(rows[0]);
    const lastTime = chartRowTime(rows[rows.length - 1]);
    const timeSpan = Math.max(1, lastTime - firstTime);
    const plotW = b.right - b.left;
    return annotations.filter(a => a.resolvedEpochMs >= firstTime && a.resolvedEpochMs <= lastTime).slice(0, 4).map(a => {
      const ax = b.left + ((a.resolvedEpochMs - firstTime) / timeSpan) * plotW;
      const deltaMs = cursorMs - a.resolvedEpochMs;
      const absDelta = Math.abs(deltaMs);
      const sign = deltaMs >= 0 ? "+" : "-";
      const label = absDelta < 1000 ? `${sign}${absDelta}ms` : absDelta < 60000 ? `${sign}${(absDelta / 1000).toFixed(absDelta < 10000 ? 2 : 1)}s` : `${sign}${(absDelta / 60000).toFixed(1)}m`;
      const color = annotationColor(a.kind);
      const badgeW = Math.max(48, label.length * 7 + 12);
      const badgeX = Math.min(Math.max(ax - badgeW / 2, b.left), b.right - badgeW);
      const badgeY = b.bottom + 4;
      return `<rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="18" rx="9" fill="${color}" opacity=".9"/><text x="${badgeX + badgeW / 2}" y="${badgeY + 13}" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">? ${escapeHtml(label)}</text>`;
    }).join("");
  };
  const drawOverlay = (x, dragX = null) => {
    const b = bounds();
    const lx = layer();
    if (!lx) return;
    const pct = (x - b.left) / Math.max(1, b.right - b.left);
    const metric = svg.dataset.metric || appState.prefs.graphMetric;
    const renderStyle = svg.dataset.renderStyle || appState.prefs.graphStyle;
    const rows = renderableHistory(visibleHistory(metric), metric, renderStyle, svg.clientWidth || 640).rows;
    const selection = dragX == null ? "" : `<rect x="${Math.min(startX, dragX)}" y="${b.top}" width="${Math.abs(dragX - startX)}" height="${b.bottom - b.top}" fill="#5db7ff" opacity=".18" stroke="#5db7ff" stroke-dasharray="5 4"/>`;
    lx.innerHTML = `
      ${selection}
      <line x1="${x}" x2="${x}" y1="${b.top}" y2="${b.bottom}" stroke="#edf4ff" stroke-width="1.4" stroke-dasharray="4 4"/>
      <line x1="${b.left}" x2="${b.right}" y1="${b.bottom}" y2="${b.bottom}" stroke="#52657a"/>
      ${tooltipMarkup(metric, rows, pct, x, b)}
      ${annotationDeltaBadges(metric, rows, pct, b)}
    `;
  };
  svg.addEventListener("pointermove", event => {
    const p = svgPoint(svg, event);
    const x = clampX(p.x);
    drawOverlay(x, dragging ? x : null);
    if (!dragging && appState.prefs.chartLayout.syncCrosshair !== false) {
      const b = bounds();
      const pct = (x - b.left) / Math.max(1, b.right - b.left);
      root.querySelectorAll("svg.chart[data-interactive='1']").forEach(other => {
        if (other === svg) return;
        const ol = other.querySelector("[data-crosshair-layer]");
        if (!ol) return;
        const oLeft = Number(other.dataset.plotLeft);
        const oRight = Number(other.dataset.plotRight);
        const oTop = Number(other.dataset.plotTop);
        const oBottom = Number(other.dataset.plotBottom);
        if (!Number.isFinite(oLeft) || oRight <= oLeft) return;
        const ox = oLeft + pct * (oRight - oLeft);
        const m = other.dataset.metric || appState.prefs.graphMetric;
        const rs = other.dataset.renderStyle || appState.prefs.graphStyle;
        const rows = renderableHistory(visibleHistory(m), m, rs, other.clientWidth || 640).rows;
        ol.innerHTML = `
          <line x1="${ox}" x2="${ox}" y1="${oTop}" y2="${oBottom}" stroke="#edf4ff" stroke-width="1" stroke-dasharray="4 4" opacity=".5"/>
          ${tooltipMarkup(m, rows, pct, ox, { left: oLeft, right: oRight, top: oTop, bottom: oBottom }, true)}
        `;
      });
    }
  });
  svg.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    const p = svgPoint(svg, event);
    startX = clampX(p.x);
    dragging = true;
    svg.setPointerCapture(event.pointerId);
    drawOverlay(startX, startX);
  });
  svg.addEventListener("pointerup", event => {
    if (!dragging) return;
    const b = bounds();
    const endX = clampX(svgPoint(svg, event).x);
    dragging = false;
    const span = Math.abs(endX - startX);
    if (span > 12) {
      const a = (Math.min(startX, endX) - b.left) / (b.right - b.left);
      const z = (Math.max(startX, endX) - b.left) / (b.right - b.left);
      const metric = svg.dataset.metric || null;
      const zoom = chartZoomFor(metric);
      const nextZoom = zoomRangeFromDragSelection(zoom, a, z);
      setZoom(nextZoom.start, nextZoom.end, metric);
      appState.activeChartMetric = metric;
      appState.activeChartAction = "dragZoom";
      if (svg.matches("[data-mini-chart]") && redrawChartCardMetric(metric, "dragZoom", deps)) return;
      if (svg.id === "chart") drawChart(deps);
    } else {
      drawOverlay(endX);
    }
  });
  svg.addEventListener("pointerleave", () => {
    if (!dragging) {
      if (layer()) layer().innerHTML = "";
      if (appState.prefs.chartLayout.syncCrosshair !== false) {
        root.querySelectorAll("svg.chart[data-interactive='1']").forEach(other => {
          if (other === svg) return;
          const ol = other.querySelector("[data-crosshair-layer]");
          if (ol) ol.innerHTML = "";
        });
      }
    }
  });
  // Keyboard navigation for accessibility
  let kbX = null;
  svg.addEventListener("keydown", e => {
    if (!["ArrowLeft", "ArrowRight", "Escape"].includes(e.key)) return;
    e.preventDefault();
    const b = bounds();
    const step = (b.right - b.left) / 40;
    if (e.key === "Escape") { if (layer()) layer().innerHTML = ""; kbX = null; return; }
    if (kbX === null) kbX = (b.left + b.right) / 2;
    kbX = clampX(kbX + (e.key === "ArrowRight" ? step : -step));
    drawOverlay(kbX);
  });
}

function exportChartAsPng(svg, metric) {
  const w = svg.clientWidth || 640;
  const h = svg.clientHeight || 300;
  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#05070b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    canvas.toBlob(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${metric || "chart"}-${new Date().toISOString().slice(0, 19).replace(/:/g, "")}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
    toast("Chart exported", `${metricLabel(metric)} saved as PNG.`);
  };
  img.src = url;
}

async function saveChartsPng() {
  const svgs = [...document.querySelectorAll("svg.chart")];
  if (!svgs.length) {
    toast("No chart to save", "Open the Charts tab first.", "warn");
    return;
  }
  const width = Math.max(...svgs.map(svg => svg.clientWidth || 640));
  const gap = 24;
  const heights = svgs.map(svg => svg.clientHeight || 300);
  const totalHeight = heights.reduce((sum, height) => sum + height, 0) + gap * (svgs.length - 1);
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = totalHeight * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  ctx.fillStyle = "#05070b";
  ctx.fillRect(0, 0, width, totalHeight);
  let y = 0;
  for (let i = 0; i < svgs.length; i += 1) {
    const svg = svgs[i];
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    ctx.drawImage(img, 0, y, svg.clientWidth || width, heights[i]);
    URL.revokeObjectURL(url);
    y += heights[i] + gap;
  }
  const png = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  const url = URL.createObjectURL(png);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ultimate-network-expert-charts-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast("Charts exported", "PNG export has been generated.");
}

function reportChartWindowLabel(rows = visibleHistory()) {
  if (!rows.length) return `No visible timeline (${resolvedTimeZone()})`;
  return `${timeLabel(rows[0]?.t || 0, rows[0]?.epochMs)} -> ${timeLabel(rows[rows.length - 1]?.t || 0, rows[rows.length - 1]?.epochMs)} (${resolvedTimeZone()})`;
}

function reportDefaultChartMetrics(limit = 4) {
  const selected = selectedSocket();
  const anomalyMetrics = (selected
    ? anomaliesBySocketId().get(selected.id) || []
    : reportRelevantAnomalies()).map(item => item.metric).filter(Boolean);
  const preferred = [
    state.prefs.graphMetric,
    ...anomalyMetrics,
    "skmem.d",
    "sendQ",
    "recvQ",
    "rtt",
    "rto",
    "rx_bps",
    "tx_bps"
  ];
  return [...new Set(preferred.filter(Boolean))].slice(0, limit);
}

function buildReportChartSvg(metric, width = 760, height = 280) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  drawChartInto(svg, metric, state.prefs.graphStyle === "xy" ? "points" : state.prefs.graphStyle, true);
  return svg;
}

function jiraReportDependencies() {
  return {
    state,
    reportVisibleSockets,
    reportRelevantAnomalies,
    diagnosticHypotheses,
    reportTopSockets,
    appVersion: APP_VERSION
  };
}

function buildJiraReport() {
  return buildJiraReportModel(jiraReportDependencies());
}

function captureIncidentReportCharts(limit = 5) {
  const captures = [];
  const seen = new Set();
  const microburst = microburstSummary();
  const pushCapture = (metric, title, svg, context, hero = false) => {
    if (!metric || !svg || seen.has(metric) || captures.length >= limit) return;
    const image = reportChartDataUrl(svg);
    if (!image) return;
    seen.add(metric);
    captures.push({
      metric,
      title,
      image,
      context,
      hero
    });
  };

  if (state.view === "charts") {
    const heroSvg = document.querySelector("#chart");
    const heroMetric = heroSvg?.dataset.metric || state.prefs.graphMetric;
    if (heroSvg) {
      pushCapture(
        heroMetric,
        `${metricLabel(heroMetric)} overview`,
        heroSvg,
        `${microburst ? `Microburst ${formatMicroburstWindow(microburst)} * ` : ""}Current visible chart window * ${reportChartWindowLabel()}`,
        true
      );
    }
    // Drag & drop chart reorder
  // Chart reorder via move buttons (reliable alternative to drag & drop)
  document.querySelectorAll("[data-chart-move]").forEach(btn => btn.addEventListener("click", () => {
    const metric = btn.dataset.chartMove;
    const dir = btn.dataset.chartMoveDir;
    const metrics = [...(state.prefs.visibleMetrics?.length ? state.prefs.visibleMetrics : state.chartMetrics)];
    const idx = metrics.indexOf(metric);
    if (idx < 0) return;
    const target = dir === "left" ? idx - 1 : idx + 1;
    if (target < 0 || target >= metrics.length) return;
    [metrics[idx], metrics[target]] = [metrics[target], metrics[idx]];
    state.prefs.visibleMetrics = metrics;
    render(); setTimeout(scheduleChartPageDraw, 50);
  }));
  document.querySelectorAll("[data-chart-card]").forEach(card => {
      if (captures.length >= limit) return;
      const metric = card.dataset.chartCard;
      const svg = card.querySelector("[data-mini-chart]");
      pushCapture(metric, metricLabel(metric), svg, `${microburst ? `Microburst ${formatMicroburstWindow(microburst)} * ` : ""}Chart card * ${reportChartWindowLabel()}`);
    });
  }

  reportDefaultChartMetrics(limit).forEach(metric => {
    if (captures.length >= limit || seen.has(metric)) return;
    pushCapture(
      metric,
      `${metricLabel(metric)} snapshot`,
      buildReportChartSvg(metric),
      `${microburst ? `Microburst ${formatMicroburstWindow(microburst)} * ` : ""}Generated from current filtered history * ${reportChartWindowLabel()}`
    );
  });

  return captures;
}

function reportVisibleSockets() {
  return sortedFilteredSockets();
}

function reportMetricSeries(metric, sockets = reportVisibleSockets()) {
  return sockets
    .map(socket => metric === "tx_bps" || metric === "rx_bps"
      ? socketBandwidth(socket, metric)
      : metricValue(socket, metric))
    .filter(value => Number.isFinite(value));
}

function reportMetricSummary(metric, sockets = reportVisibleSockets()) {
  const values = reportMetricSeries(metric, sockets).sort((a, b) => a - b);
  if (!values.length) return null;
  return {
    count: values.length,
    p50: percentile(values, 50),
    p90: percentile(values, 90),
    p99: percentile(values, 99),
    max: values[values.length - 1]
  };
}

function reportFilterTokens() {
  const filters = state.table.filters || {};
  const tokens = [];
  if (filters.text) tokens.push(`query:${filters.text}`);
  if (filters.risk && filters.risk !== "all") tokens.push(`risk:${filters.risk}`);
  if (filters.state && filters.state !== "all") tokens.push(`state:${filters.state}`);
  if (filters.family && filters.family !== "all") tokens.push(`protocol:${filters.family}`);
  if (filters.process) tokens.push(`process:${filters.process}`);
  if (filters.srcIp) tokens.push(`src ip:${filters.srcIp}`);
  if (filters.dstIp) tokens.push(`dst ip:${filters.dstIp}`);
  if (filters.srcPort) tokens.push(`src port:${filters.srcPort}`);
  if (filters.dstPort) tokens.push(`dst port:${filters.dstPort}`);
  if (filters.minRecvQ) tokens.push(`Recv-Q >= ${filters.minRecvQ}`);
  if (filters.minSendQ) tokens.push(`Send-Q >= ${filters.minSendQ}`);
  if (filters.minRtt) tokens.push(`RTT >= ${filters.minRtt} ms`);
  if (filters.onlyAnomalies) tokens.push("anomalies only");
  return tokens;
}

function reportRelevantAnomalies(sockets = reportVisibleSockets()) {
  const ids = new Set(sockets.map(socket => socket.id));
  return state.anomalies
    .filter(item => ids.has(item.socketId))
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.title.localeCompare(b.title));
}

function reportTopSockets(sockets = reportVisibleSockets(), limit = 12) {
  return sockets.slice(0, limit);
}

function reportPercentileTable(sockets = reportVisibleSockets()) {
  const metrics = ["rtt", "rto", "sendQ", "recvQ", "skmem.d", "tx_bps", "rx_bps"];
  return metrics
    .map(metric => ({ metric, stats: reportMetricSummary(metric, sockets) }))
    .filter(row => row.stats);
}

function reportFindings(limit = 5) {
  return (state.advisorFindings || []).slice(0, limit);
}

function reportAnnotations(socket = selectedSocket()) {
  return currentSourceAnnotations(null, socket?.id || annotationSocketId(), visibleHistory());
}

function printableIncidentReportDependencies() {
  return {
    state,
    reportVisibleSockets,
    selectedSocket,
    microburstSummary,
    reportRelevantAnomalies,
    reportTopSockets,
    reportPercentileTable,
    reportFindings,
    reportAnnotations,
    reportFilterTokens,
    buildComparison,
    anomaliesBySocketId,
    metricLabel,
    socketsById,
    formatNumber,
    resolvedNumberLocale,
    resolvedTimeZone,
    linuxProfileLabel,
    accessRoleLabel,
    escapeHtml,
    buildAiSummary,
    buildRootCauseMatrix,
    cachedStories,
    cachedMultiSocket,
    cachedRateAlerts,
    captureQualityReport,
    diagnosticHypotheses,
    buildBaselineNarrative,
    formatMetricValue,
    metricValue,
    socketBandwidth,
    annotationTypeLabel,
    timeLabel,
    formatMicroburstWindow
  };
}

function buildIncidentReportHtml(chartCaptures = []) {
  return buildPrintableIncidentReportHtml(printableIncidentReportDependencies(), chartCaptures);
}


async function captureEvidenceChartAssets(captures = []) {
  const assets = [];
  for (let i = 0; i < captures.length; i += 1) {
    const capture = captures[i];
    const width = 1280;
    const height = capture.hero ? 420 : 320;
    const svg = buildReportChartSvg(capture.metric, width, height);
    const pngBlob = await svgToPngBlob(svg, width, height);
    const bytes = new Uint8Array(await pngBlob.arrayBuffer());
    assets.push({
      ...capture,
      width,
      height,
      bytes,
      fileName: `${String(i + 1).padStart(2, "0")}-${safeEvidenceFileName(capture.metric)}.png`
    });
  }
  return assets;
}

async function buildIncidentReportPdf(chartAssets = []) {
  if (typeof PDFLib === "undefined") throw new Error("PDF engine unavailable");
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  };
  const colors = {
    ink: rgb(0.09, 0.14, 0.2),
    muted: rgb(0.35, 0.41, 0.48),
    accent: rgb(0.05, 0.43, 0.62),
    line: rgb(0.83, 0.88, 0.92),
    panel: rgb(0.96, 0.98, 0.99)
  };
  const selected = selectedSocket();
  const visibleSockets = reportVisibleSockets();
  const anomalies = reportRelevantAnomalies(visibleSockets);
  const focusSocket = pickExecutiveFocusSocket(selected, visibleSockets);
  const annotations = reportAnnotations(selected);
  const microburst = microburstSummary();
  const tailLatency = tailLatencyLens();
  const checklistItems = focusSocket ? guidedChecklistItems(focusSocket) : [];
  const snapshot = buildExecutiveSummary({
    focusSocket,
    anomalies,
    advisorFindings: state.advisorFindings || [],
    microburst,
    tailLatency,
    checklistItems,
    formatMicroburstWindow,
    formatTailLatencyWindow,
    formatMetricValue
  });
  const generatedAt = new Date().toLocaleString(resolvedNumberLocale(), { timeZone: resolvedTimeZone() });
  const page = pdfDoc.addPage([595.28, 841.89]);
  const margin = 36;
  const gutter = 18;
  const contentWidth = page.getWidth() - margin * 2;
  const columnWidth = (contentWidth - gutter) / 2;
  let y = page.getHeight() - margin;

  page.drawText("NetworkExpert Incident Snapshot", { x: margin, y, size: 11, font: fonts.bold, color: colors.accent });
  y -= 24;
  page.drawText(state.sourceName || "Current workspace", { x: margin, y, size: 22, font: fonts.bold, color: colors.ink });
  y -= 18;
  y = drawPdfTextBlock(page, "Portable incident evidence generated from the current workspace, including prioritized signals, focused context, and chart captures.", {
    x: margin,
    y,
    width: contentWidth,
    size: 10,
    font: fonts.regular,
    color: colors.muted,
    lineHeight: 13
  }) - 10;

  const metaLines = [
    `Generated: ${generatedAt}`,
    `Timezone: ${resolvedTimeZone()}`,
    `Visible sockets: ${formatNumber(visibleSockets.length)}`,
    `Relevant anomalies: ${formatNumber(anomalies.length)}`,
    `Critical sockets: ${formatNumber(visibleSockets.filter(socket => socket.risk === "critical").length)}`,
    `ss command: ${state.command || "n/a"}`
  ];
  y = drawPdfSection(page, "Incident frame", metaLines, margin, y, contentWidth, fonts, colors) - 8;

  const leftLines = [];
  if (snapshot) {
    leftLines.push(`${snapshot.title} [${snapshot.severity}]`);
    leftLines.push(snapshot.headline);
    leftLines.push(snapshot.summary);
    leftLines.push(`Next step: ${snapshot.next}`);
  }
  if (focusSocket) {
    leftLines.push(`Focus flow: ${focusSocket.local} -> ${focusSocket.peer}`);
    leftLines.push(`Focus process: ${focusSocket.details.process ? `${focusSocket.details.process.name}:${focusSocket.details.process.pid}` : "unknown process"}`);
    leftLines.push(`Focus metrics: RTT ${formatMetricValue("rtt", metricValue(focusSocket, "rtt"))}, RTO ${formatMetricValue("rto", metricValue(focusSocket, "rto"))}, Send-Q ${formatMetricValue("sendQ", focusSocket.sendQ)}, Recv-Q ${formatMetricValue("recvQ", focusSocket.recvQ)}`);
  }
  if (microburst) leftLines.push(`Microburst: ${formatMicroburstWindow(microburst)} with RX ${formatMetricValue("rx_bps", microburst.peakRxBps)} and ${formatMetricValue("skmem.d", microburst.dropDeltaTotal)} new drops.`);
  if (tailLatency) leftLines.push(`Tail lens: ${formatTailLatencyWindow(tailLatency)} with suspicion ${tailLatency.suspicion || "tail latency spike"}.`);
  leftLines.push(`Filters: ${reportFilterTokens().join(", ") || "none"}`);

  const rightLines = [];
  if (anomalies.length) {
    rightLines.push("Top anomalies:");
    anomalies.slice(0, 5).forEach(item => {
      const socket = socketsById().get(item.socketId);
      rightLines.push(`${item.severity.toUpperCase()} - ${item.title}${socket ? ` - ${socket.local} -> ${socket.peer}` : ""}`);
    });
  }
  if (annotations.length) {
    rightLines.push("Annotations:");
    annotations.slice(0, 5).forEach(item => {
      rightLines.push(`${item.label} - ${item.metric === "*" ? "socket-wide" : metricLabel(item.metric)} - ${timeLabel(0, item.resolvedEpochMs)}`);
    });
  }
  if (!rightLines.length) rightLines.push("No annotations or scoped anomalies are currently attached to the active incident view.");

  const leftBottom = drawPdfSection(page, "Snapshot and focus", leftLines, margin, y, columnWidth, fonts, colors);
  const rightBottom = drawPdfSection(page, "Signals and analyst notes", rightLines, margin + columnWidth + gutter, y, columnWidth, fonts, colors);

  let tableY = Math.min(leftBottom, rightBottom) - 8;
  const topSockets = reportTopSockets(visibleSockets, 5);
  if (topSockets.length && tableY > 190) {
    page.drawText("Top flows in scope", { x: margin, y: tableY, size: 12, font: fonts.bold, color: colors.accent });
    tableY -= 18;
    const rows = [
      ["Risk", "Flow", "Process", "RTT", "RTO", "Drops"],
      ...topSockets.map(socket => [
        socket.risk,
        `${socket.local} -> ${socket.peer}`,
        socket.details.process ? `${socket.details.process.name}:${socket.details.process.pid}` : "-",
        formatMetricValue("rtt", metricValue(socket, "rtt")),
        formatMetricValue("rto", metricValue(socket, "rto")),
        formatMetricValue("skmem.d", metricValue(socket, "skmem.d"))
      ])
    ];
    const columns = [50, 205, 110, 55, 55, 48];
    rows.forEach((row, rowIndex) => {
      let x = margin;
      if (rowIndex === 0) {
        page.drawRectangle({ x, y: tableY - 4, width: contentWidth, height: 18, color: colors.panel, borderColor: colors.line, borderWidth: 1 });
      }
      row.forEach((value, index) => {
        const cellFont = rowIndex === 0 ? fonts.bold : fonts.regular;
        const cellSize = rowIndex === 0 ? 9 : 8.5;
        const clipped = String(value).length > 34 ? `${String(value).slice(0, 31)}...` : String(value);
        page.drawText(clipped, { x: x + 4, y: tableY + 2, size: cellSize, font: cellFont, color: rowIndex === 0 ? colors.ink : colors.muted, maxWidth: columns[index] - 8 });
        x += columns[index];
      });
      tableY -= 18;
    });
  }

  for (const asset of chartAssets) {
    const chartPage = pdfDoc.addPage([841.89, 595.28]);
    const pageMargin = 28;
    const pageWidth = chartPage.getWidth() - pageMargin * 2;
    const pageHeight = chartPage.getHeight() - pageMargin * 2;
    let cursor = chartPage.getHeight() - pageMargin;
    chartPage.drawText(asset.title, { x: pageMargin, y: cursor, size: 18, font: fonts.bold, color: colors.ink });
    cursor -= 18;
    cursor = drawPdfTextBlock(chartPage, asset.context || "Chart evidence from the current visible incident window.", {
      x: pageMargin,
      y: cursor,
      width: pageWidth,
      size: 10,
      font: fonts.regular,
      color: colors.muted,
      lineHeight: 13
    }) - 8;
    const image = await pdfDoc.embedPng(asset.bytes);
    const availableWidth = pageWidth;
    const availableHeight = pageHeight - 64;
    const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const imageX = pageMargin + (availableWidth - drawWidth) / 2;
    const imageY = Math.max(pageMargin, cursor - drawHeight);
    chartPage.drawRectangle({ x: imageX - 1, y: imageY - 1, width: drawWidth + 2, height: drawHeight + 2, borderColor: colors.line, borderWidth: 1 });
    chartPage.drawImage(image, { x: imageX, y: imageY, width: drawWidth, height: drawHeight });
    chartPage.drawText(metricLabel(asset.metric), { x: pageMargin, y: pageMargin + 8, size: 10, font: fonts.bold, color: colors.accent });
  }

  return await pdfDoc.save();
}

async function exportEvidencePack() {
  if (!state.sockets.length) {
    toast("No data to export", "Import or parse a capture before generating an evidence pack.", "warn");
    return;
  }
  if (typeof JSZip === "undefined") {
    toast("ZIP helper missing", "JSZip is not available in this browser session.", "danger");
    return;
  }
  if (typeof PDFLib === "undefined") {
    toast("PDF engine missing", "pdf-lib is not available in this browser session.", "danger");
    return;
  }
  const zip = new JSZip();
  const captures = captureIncidentReportCharts(6);
  const chartAssets = await captureEvidenceChartAssets(captures);
  const visibleSockets = reportVisibleSockets();
  const anomalies = reportRelevantAnomalies(visibleSockets);
  const socketLookup = Object.fromEntries(state.sockets.map(socket => [socket.id, socket]));
  const annotations = reportAnnotations(selectedSocket());
  const safeName = safeEvidenceFileName(state.sourceName || "networkexpert");
  const pdfBytes = await buildIncidentReportPdf(chartAssets);
  zip.file("incident-report.pdf", pdfBytes);
  zip.file("incident-report.html", buildIncidentReportHtml(captures));
  zip.file("anomalies.csv", buildAnomaliesCsv(anomalies, socketLookup, { metricLabel, formatMetricValue }));
  zip.file("top-sockets.csv", buildTopSocketsCsv(reportTopSockets(visibleSockets, 50), { metricValue, socketBandwidth, formatMetricValue }));
  zip.file("timeline.json", JSON.stringify(buildTimelinePayload(visibleHistory(), { sourceName: state.sourceName, timezone: resolvedTimeZone(), filters: reportFilterTokens(), annotations }), null, 2));
  zip.file("annotations.json", JSON.stringify(annotations, null, 2));
  zip.file("README.txt", buildEvidenceManifest({
    sourceName: state.sourceName,
    generatedAt: new Date().toLocaleString(resolvedNumberLocale(), { timeZone: resolvedTimeZone() }),
    visibleSockets: visibleSockets.length,
    anomalyCount: anomalies.length,
    chartCount: chartAssets.length,
    annotationCount: annotations.length
  }));
  const chartFolder = zip.folder("charts");
  chartAssets.forEach(asset => {
    chartFolder.file(asset.fileName, asset.bytes);
  });
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${safeName}-evidence-pack.zip`);
  toast("Evidence pack exported", "ZIP downloaded with PDF report, HTML report, anomalies, sockets, timeline, annotations, and chart PNGs.");
}
function exportIncidentReportHtml() {
  const quality = captureQualityReport();
  const hyps = diagnosticHypotheses();
  const matrixData = cachedRootCauseMatrix();
  const storiesData = cachedStories();
  const multiData = cachedMultiSocket();
  const rateData = cachedRateAlerts();
  const topHyp = hyps[0];
  const pb = topHyp ? resolvePlaybook(playbookForHypothesis(topHyp.id), state.sockets.find(s => s.id === topHyp.topSocketId)) : null;
  const narrativeData = state.baseline ? buildBaselineNarrative(buildComparison(), state.baseline.anomalies || [], state.anomalies) : null;
  const summaryText = buildAiSummary({ matrix: matrixData, stories: storiesData, multiSocket: multiData, rateAlerts: rateData, captureQuality: quality, hypotheses: hyps, comparison: narrativeData });
  const html = generateIncidentReport({ sourceName: state.sourceName, captureQuality: quality, matrix: matrixData, hypotheses: hyps, stories: storiesData, multiSocket: multiData, rateAlerts: rateData, playbook: pb, comparison: narrativeData, aiSummary: summaryText, theme: state.prefs.theme || "dark", fixLatency: state.fixLatency.correlation?.summary ? { summary: state.fixLatency.correlation.summary, topSpikes: state.fixLatency.correlation.results?.slice(0, 10) } : null, jvmGc: state.jvmGc.correlation?.summary ? { summary: state.jvmGc.correlation.summary, analysisWindow: state.jvmGc.analysisWindow } : null });
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `incident-report-${state.sourceName.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Report exported", "Standalone HTML incident report downloaded.");
}

function exportFixSpikeCsv() {
  const results = state.fixLatency.correlation?.results;
  if (!results?.length) { toast("No FIX data", "Load FIX logs first.", "warn"); return; }
  const header = "timestamp,lag_ms,direction,msgType,symbol,sender,target,endpoint,thread,score,severity,cause,signals,endpoint_matched";
  const rows = results.map(r => [new Date(r.receiveMs).toISOString(), r.lagMs.toFixed(1), r.direction, r.msgType, r.symbol, r.sender, r.target, r.endpoint, r.thread, r.score.toFixed(3), r.severity, r.cause || "", `"${(r.signals || []).join(";")}"`, r.endpointMatched ? "yes" : "no"].join(","));
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `fix-spikes-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(a.href);
  toast("CSV exported", `${results.length} spikes with correlations exported.`);
}

function openIncidentReport() {
  if (!state.sockets.length) {
    toast("No data to export", "Import or parse a capture before generating an incident report.", "warn");
    return;
  }
  const chartCaptures = captureIncidentReportCharts();
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    toast("Popup blocked", "Allow popups for this app to open the printable incident report.", "danger");
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(buildIncidentReportHtml(chartCaptures));
  reportWindow.document.close();
}

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
  saveFilterHistory();
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
    render,
    renderKeepingWorkspacePosition,
    drawBdpWindowCharts,
    drawJvmCharts,
    drawFixCharts,
    redrawChartCardMetric,
    applyChartZoomAction,
    chartZoomFor,
    clearVisibleHistoryCache,
    chartSeriesKey
  };
}

function bindChartMinimapEvents(deps = appEventDependencies()) {
  const {
    root = document,
    state: appState = state,
    drawSingleMinimap: drawMinimap = drawSingleMinimap,
    drawChartInto: drawInto = drawChartInto,
    chartZoomFor: zoomFor = chartZoomFor,
    clearVisibleHistoryCache: clearVisible = clearVisibleHistoryCache
  } = deps;
  root.querySelectorAll("[data-minimap]").forEach(canvas => {
    let dragging = false;
    const getMetric = () => canvas.dataset.minimap;
    const panTo = (e) => {
      const rect = canvas.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const metric = getMetric();
      const zoom = zoomFor(metric);
      const span = zoom.end - zoom.start;
      const newStart = Math.max(0, Math.min(1 - span, frac - span / 2));
      if (!appState.chartZoomByMetric) appState.chartZoomByMetric = {};
      appState.chartZoomByMetric[metric] = { start: newStart, end: newStart + span };
      clearVisible();
      drawMinimap(canvas, metric, deps);
      const svg = canvas.parentElement?.querySelector(`[data-mini-chart="${metric}"]`);
      if (svg) drawInto(svg, metric, appState.prefs.graphStyle === "xy" ? "points" : appState.prefs.graphStyle, true, deps);
    };
    canvas.addEventListener("mousedown", e => { dragging = true; panTo(e); e.preventDefault(); });
    canvas.addEventListener("mousemove", e => { if (dragging) panTo(e); });
    canvas.addEventListener("mouseup", () => { dragging = false; });
    canvas.addEventListener("mouseleave", () => { dragging = false; });
  });
}

function bindChartChromeEvents(deps = appEventDependencies()) {
  const {
    root = document,
    state: appState = state,
    render: renderView = render,
    renderKeepingWorkspacePosition: renderStable = renderKeepingWorkspacePosition,
    drawBdpWindowCharts: drawBdp = drawBdpWindowCharts,
    drawJvmCharts: drawJvm = drawJvmCharts,
    drawFixCharts: drawFix = drawFixCharts,
    redrawChartCardMetric: redrawMetric = redrawChartCardMetric,
    applyChartZoomAction: applyZoom = applyChartZoomAction
  } = deps;
  root.querySelectorAll("[data-charts-tab]").forEach(btn => {
    btn.addEventListener("click", event => {
      const tab = event.currentTarget.dataset.chartsTab;
      if (appState.chartsTab === tab) return;
      appState.chartsTab = tab;
      renderView();
      if (tab === "fix") setTimeout(() => drawFix(deps), 100);
      if (tab === "jvm") setTimeout(() => drawJvm(deps), 100);
    });
  });
  root.querySelectorAll("[data-style-toggle]").forEach(btn => {
    btn.addEventListener("click", event => {
      event.stopPropagation();
      appState.openStyleMenu = !appState.openStyleMenu;
      const menu = btn.closest(".style-picker")?.querySelector(".style-picker-menu");
      if (menu) menu.classList.toggle("open", appState.openStyleMenu);
    });
  });
  root.querySelectorAll("[data-style-choice]").forEach(btn => {
    btn.addEventListener("click", event => {
      event.stopPropagation();
      appState.prefs.graphStyle = event.currentTarget.dataset.styleChoice;
      appState.openStyleMenu = false;
      renderStable();
    });
  });
  root.querySelectorAll("[data-chart-zoom]").forEach(btn => {
    btn.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const action = event.currentTarget.dataset.chartZoom;
      const metric = event.currentTarget.dataset.chartZoomMetric;
      applyZoom(action, metric);
      if (event.currentTarget.hasAttribute("data-bdp-zoom")) {
        appState._bdpCache = null;
        drawBdp(deps);
      } else if (event.currentTarget.hasAttribute("data-jvm-zoom")) {
        appState.jvmGc.selectedEpoch = null;
        drawJvm(deps);
      } else if (event.currentTarget.hasAttribute("data-fix-zoom")) {
        drawFix(deps);
      } else if (!redrawMetric(metric, action, deps)) renderStable();
    });
  });
}

function bindChartSeriesEvents(deps = appEventDependencies()) {
  const {
    root = document,
    state: appState = state,
    redrawChartCardMetric: redrawMetric = redrawChartCardMetric,
    drawJvmCharts: drawJvm = drawJvmCharts,
    chartSeriesKey: seriesKey = chartSeriesKey
  } = deps;
  root.querySelectorAll("[data-chart-series-toggle]").forEach(button => button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const metric = event.currentTarget.dataset.chartSeriesToggle;
    const key = event.currentTarget.dataset.chartSeriesKey;
    const fullKey = seriesKey(metric, key);
    if (!appState.hiddenChartSeries) appState.hiddenChartSeries = new Set();
    appState.hiddenChartSeries.has(fullKey) ? appState.hiddenChartSeries.delete(fullKey) : appState.hiddenChartSeries.add(fullKey);
    root.querySelectorAll("[data-chart-series-toggle]").forEach(item => {
      if (item.dataset.chartSeriesToggle !== metric || item.dataset.chartSeriesKey !== key) return;
      const hidden = appState.hiddenChartSeries.has(fullKey);
      item.classList.toggle("is-muted", hidden);
      item.setAttribute("aria-pressed", hidden ? "false" : "true");
    });
    redrawMetric(metric, `series:${key}`, deps);
  }));
  root.querySelectorAll("[data-jvm-series-key]").forEach(item => item.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const key = event.currentTarget.dataset.jvmSeriesKey;
    if (!appState.hiddenJvmSeries) appState.hiddenJvmSeries = new Set();
    appState.hiddenJvmSeries.has(key) ? appState.hiddenJvmSeries.delete(key) : appState.hiddenJvmSeries.add(key);
    root.querySelectorAll(`[data-jvm-series-key="${key}"]`).forEach(span => {
      span.style.opacity = appState.hiddenJvmSeries.has(key) ? ".4" : "";
      span.style.textDecoration = appState.hiddenJvmSeries.has(key) ? "line-through" : "";
    });
    drawJvm(deps);
  }));
}

function bindEvents(deps = appEventDependencies()) {
  document.onkeydown = handleGlobalKeydown;
  bindSmartChartTooltips();
  bindColumnHelpTooltips();
  // Virtual table scroll
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
      if (!cmInstance) return;
      const query = btn.dataset.cmSearch;
      cmInstance.execCommand("findPersistent");
      setTimeout(() => {
        const input = document.querySelector(".cm-container .CodeMirror-dialog input");
        if (input) { input.value = query; input.dispatchEvent(new Event("input")); input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13 })); }
      }, 50);
    });
  });
  document.querySelectorAll("[data-action]").forEach(btn => btn.addEventListener("click", async event => {
    const action = event.currentTarget.dataset.action;
    if (action === "parse") {
      const rawInput = document.querySelector("#rawInput");
      const cmValue = cmInstance ? cmInstance.getValue() : "";
      state.raw = rawInput ? rawInput.value : (cmValue || state.raw);
      setActiveInvestigation(state, null);
      resetDerivedCaches({ raw: true });
      const parseStart = performance.now();
      if (state.raw.length > 5000000 && window.Worker) {
        _showBusy();
        const ws = document.querySelector(".workspace");
        if (ws) ws.innerHTML = _renderSkeleton("analysis");
        const worker = new Worker(new URL("./parse-worker.js", import.meta.url), { type: "module" });
        if (sharedBufferAvailable()) {
          const { buffer, byteLength } = encodeShared(state.raw);
          worker.postMessage({ type: "parseSs", payload: { sharedBuffer: buffer, byteLength } });
        } else {
          worker.postMessage({ type: "parseSs", payload: { raw: state.raw } });
        }
        worker.onmessage = msg => {
          if (msg.data.type === "parseSs:progress") {
            const { parsed, progress } = msg.data.payload;
            const busyLabel = document.querySelector(".busy-label");
            if (busyLabel) busyLabel.textContent = `Parsing... ${parsed} sockets (${progress}%)`;
          }
          if (msg.data.type === "parseSs:done") {
            worker.terminate();
            _hideBusy();
            recompute();
            const elapsed = ((performance.now() - parseStart) / 1000).toFixed(1);
            toast("Analysis complete", `${state.sockets.length} sockets parsed in ${elapsed}s (background worker).`);
            state.view = "analysis"; state.activeTab = "advisor"; render();
          }
        };
        return;
      }
      recompute();
      const elapsed = ((performance.now() - parseStart) / 1000).toFixed(1);
      if (state.prefs.autoToast) {
        const top = state.anomalies[0];
        toast("Analysis complete", `${state.sockets.length} sockets in ${elapsed}s. ${top ? `${top.severity}: ${top.title}` : "No major anomaly."}`, top?.severity === "critical" ? "danger" : "warn");
      }
      state.view = "analysis";
      state.activeTab = "advisor";
      render();
    }
    if (action === "copySsCommand") {
      const result = syncSsCommandFromBuilder();
      if (!result.validation.valid) {
        const first = result.validation.errors[0];
        toast("Invalid ss command fields", first?.message || "Fix the highlighted fields before copying.", "danger");
        return;
      }
      const ok = await copyTextToClipboard(result.command);
      if (!ok) {
        toast("Copy failed", "The ss command could not be copied by the browser.", "danger");
        return;
      }
      toast("ss command copied", "Paste it on the target server to collect the ss evidence.");
    }
    if (action === "copyQualityCommand") {
      const report = captureQualityReport();
      const ok = await copyTextToClipboard(report.recommendedCommand);
      if (!ok) {
        toast("Copy failed", "The recommended capture command could not be copied by the browser.", "danger");
        return;
      }
      toast("Capture command copied", "Paste it on the target server to collect stronger ss evidence.");
    }
    if (action === "loadSsCommandEndpointExample") {
      const commandInput = document.querySelector("#commandInput");
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
    }
    if (action === "sample") { state.raw = SAMPLE; state.ingestRawExpanded = true; setSourceName("built-in sample"); setActiveInvestigation(state, null); markAnalysisDirty({ raw: true }); toast("Sample loaded", "Demo ss snapshot loaded."); render(); }
    if (action === "toggleSsOptions") {
      state.showSsOptions = true;
      renderKeepingWorkspacePosition();
    }
    if (action === "showEditor") {
      state.showSsOptions = false;
      renderKeepingWorkspacePosition();
    }
    if (action === "showRawEditor") {
      state.showEditor = true;
      renderKeepingWorkspacePosition();
    }
    if (action === "toggleAnalysisSidebar") {
      state.analysisSidebarCollapsed = !state.analysisSidebarCollapsed;
      renderKeepingWorkspacePosition();
    }
    if (action === "toggleBreadcrumbMenu") {
      state.breadcrumbMenuOpen = !state.breadcrumbMenuOpen;
      renderKeepingWorkspacePosition();
    }
    if (action === "toggleWordWrap") {
      state.editorWordWrap = !state.editorWordWrap;
      if (cmInstance) cmInstance.setOption("lineWrapping", state.editorWordWrap);
    }
    if (action === "toggleSsEditorThemeMenu") {
      event.preventDefault();
      event.stopPropagation();
      state.openSsEditorThemeMenu = !state.openSsEditorThemeMenu;
      renderKeepingWorkspacePosition();
    }
    if (action === "toggleGuidedChecklist") {
      state.prefs.guidedChecklistCollapsed = !state.prefs.guidedChecklistCollapsed;
      savePrefs();
      renderKeepingWorkspacePosition();
    }
    if (action === "sampleIncidentDemo") {
      state.raw = generateIncidentDemoSample();
      state.ingestRawExpanded = false;
      setSourceName("JVM GC stall incident (demo)");
      // Generate synthetic GC pauses for the demo
      const demoBase = Date.now() - 60000;
      state.jvmGc.pauses = Array.from({ length: 8 }, (_, i) => ({ id: i, epochMs: demoBase + i * 8000, durationMs: i === 5 ? 450 : 5 + Math.random() * 15, type: i === 5 ? "Full" : "Young", cause: i === 5 ? "Heap exhausted" : "G1 Evacuation Pause" }));
      state.jvmGc.safepoints = [];
      state.jvmGc.rawLog = "[demo]";
      state.selectedId = null;
      setActiveInvestigation(state, null);
      state.showSsOptions = false;
      setZoom(0, 1);
      markAnalysisDirty({ raw: true });
      toast("🔥 Incident demo loaded", "Press Analyze to see stories, matrix, and multi-socket correlation in action.");
      render();
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
    }
    if (action === "clear") {
      state.raw = "";
      state.importStatus = null;
      state.ingestRawExpanded = true;
      markAnalysisDirty({ raw: true });
      toast("Input cleared", "Only the ss text input was emptied. Current parsed analysis is unchanged until you parse again.");
      render();
    }
    if (action === "exportReport") { openIncidentReport(); }
    if (action === "exportEvidencePack") { exportEvidencePack().catch(error => toast("Evidence pack failed", error.message || "Evidence pack export failed.", "danger")); }
    if (action === "saveAnnotation") {
      const anchors = annotationAnchorOptions();
      const kind = document.querySelector("#annotationKind")?.value || "custom";
      const metric = document.querySelector("#annotationMetric")?.value || "*";
      const anchor = document.querySelector("#annotationAnchor")?.value || "visible-end";
      const label = (document.querySelector("#annotationLabel")?.value || "").trim() || annotationDefaultLabel(kind);
      const note = (document.querySelector("#annotationNote")?.value || "").trim();
      const draftEpoch = Number(state.annotationDraft?.epochMs);
      const epochMs = anchor === "cursor" && Number.isFinite(draftEpoch)
        ? draftEpoch
        : anchors.find(item => item.id === anchor)?.epochMs || visibleHistory()[visibleHistory().length - 1]?.epochMs || Date.now();
      state.annotations = [...state.annotations, { id: `annotation-${Date.now()}-${Math.random().toString(16).slice(2)}`, sourceName: state.sourceName, socketId: annotationSocketId(), metric, kind, label, note, anchor, epochMs, createdAt: Date.now() }];
      saveAnnotations();
      state.modal = null;
      state.annotationContext = null;
      toast("Annotation saved", `${label} was attached to the current socket.`);
      renderKeepingWorkspacePosition();
    }
    if (action === "deleteAnnotation") {
      const annotation = state.annotations.find(item => item.id === event.currentTarget.dataset.annotationId);
      state.annotations = state.annotations.filter(item => item.id !== event.currentTarget.dataset.annotationId);
      saveAnnotations();
      toast("Annotation deleted", `${annotation?.label || "Annotation"} was removed from this socket.`);
      renderKeepingWorkspacePosition();
    }
    if (action === "zoomTailWindow") {
      const preset = event.currentTarget.dataset.dashboardPresetJump;
      state.view = "charts";
      state.chartsTab = "charts";
      if (preset) applyDashboardPreset(preset);
      if (zoomToTailLatencyWindow()) renderKeepingWorkspacePosition();
      else toast("No tail window", "No significant tail-latency window is available on the current visible history.", "warn");
    }
    if (action === "openChecklistCharts") {
      const preset = event.currentTarget.dataset.dashboardPresetJump;
      state.view = "charts";
      state.chartsTab = "charts";
      if (preset) applyDashboardPreset(preset);
      renderKeepingWorkspacePosition();
    }
    if (action === "openChecklistAdvisor") {
      state.view = "analysis";
      state.activeTab = "advisor";
      renderKeepingWorkspacePosition();
    }
    if (action === "requestResetWorkspace") {
      state.modal = "resetWorkspace";
      render();
    }
    if (action === "showSplash") {
      state.modal = "splash";
      render();
    }
    if (action === "showAnalysisViewGuide") {
      state.modal = "analysisViewGuide";
      render();
    }
    if (action === "confirmResetWorkspace") {
      resetAllState();
      toast("Workspace reset", "All loaded data, filters, zoom, and UI selections have been cleared.");
      render();
    }
    if (action === "pickFile") { document.querySelector("#fileInput")?.click(); }
    if (action === "guide") { state.drawer = "guide"; render(); }
    if (action === "prefs") { state.drawer = "prefs"; render(); }
    if (action === "toggleGearMenu") { state.gearMenuOpen = !state.gearMenuOpen; render(); return; }
    if (state.gearMenuOpen) { state.gearMenuOpen = false; }
    if (action === "undo") { _undo(); return; }
    if (action === "redo") { _redo(); return; }
    _undoSnapshot();
    if (action === "setMetricsView") { state.metricsView = event.currentTarget.dataset.metricsView; render(); }
    if (action === "prefs") { state.drawer = "prefs"; render(); }
    if (action === "showShortcuts") { state.modal = "shortcuts"; state.drawer = null; render(); }
    if (action === "startTour") { state.onboarding = 0; render(); }
    if (action === "details") { state.drawer = "details"; render(); }
    if (action === "columns") { state.modal = "columns"; render(); }
    if (action === "thresholds") { state.drawer = "thresholds"; renderKeepingWorkspacePosition(); }
    if (action === "layoutPrefs") {
      state.modal = "layout";
      const modalContainer = document.querySelector("#app .app-shell") || document.querySelector("#app");
      const existing = modalContainer.querySelector(".modal-overlay-fast");
      if (existing) existing.remove();
      const div = document.createElement("div");
      div.className = "modal-overlay-fast";
      div.innerHTML = renderModal();
      modalContainer.appendChild(div);
      bindEvents();
    }
    if (action === "serviceAliases") { state.modal = "serviceAliases"; render(); }
    if (action === "topology") {
      openTopologyModal(state);
      renderKeepingWorkspacePosition();
    }
    if (action === "pickJvmGcFile") { (document.querySelector("#ingestGcFileInput") || document.querySelector("#jvmGcFileInput"))?.click(); }
    if (action === "pickPidstatFile") { document.querySelector("#pidstatFileInput")?.click(); }
    if (action === "pickNstatFile") { document.querySelector("#nstatFileInput")?.click(); }
    if (action === "parseJvmGcLog") {
      const text = document.querySelector("#jvmGcLogInput")?.value || "";
      if (!text.trim()) { toast("No GC log", "Paste a GC log or load a file first.", "warn"); return; }
      const { pauses, safepoints } = parseGcLog(text);
      state.jvmGc.rawLog = text;
      state.jvmGc.pauses = pauses;
      state.jvmGc.safepoints = safepoints;
      runJvmCorrelation();
      toast("GC log parsed", `${pauses.length} pauses, ${safepoints.length} safepoints detected.`);
      render();
      requestAnimationFrame(drawJvmCharts);
    }
    if (action === "clearJvmGcLog") {
      state.jvmGc = { rawLog: "", pauses: [], safepoints: [], correlation: null, clockOffsetMs: 0 };
      render();
    }
    if (action === "expandFixChart") { const id = event.currentTarget.dataset.fixChartId; state.fixLatency.expandedChart = state.fixLatency.expandedChart === id ? null : id; render(); setTimeout(drawFixCharts, 50); }
    if (action === "fixPlayback") { toggleFixPlayback(); }
    if (action === "fixTablePrev") { state.fixTable.page = Math.max(1, state.fixTable.page - 1); render(); }
    if (action === "fixTableNext") { state.fixTable.page++; render(); }
    if (action === "openMetricIntelligence") { state.helpColumn = event.currentTarget.dataset.field; state.modal = "columnHelp"; render(); }
    if (action === "filterStorySocket") { state.storySocketFilter = event.currentTarget.dataset.socketKey; render(); }
    if (action === "dismissOnboarding") { localStorage.setItem("onboarded", "1"); render(); }
    if (action === "closeCmdPalette") { state.modal = null; render(); }
    if (action === "cmdPaletteSelect") { state.selectedId = event.currentTarget.dataset.socketId; state.modal = null; state.view = "analysis"; state.activeTab = "sockets"; render(); }
    if (action === "cmdPaletteTab") { state.activeTab = event.currentTarget.dataset.tab; state.modal = null; state.view = "analysis"; render(); }
    if (action === "cmdPaletteMetric") { state.prefs.graphMetric = event.currentTarget.dataset.metric; state.modal = null; state.view = "charts"; state.chartsTab = "charts"; render(); }
    if (action === "pickPeerSs") { document.querySelector("#ingestPeerSsInput")?.click(); }
    if (action === "pickAutoDir") { document.querySelector("#ingestAutoDir")?.click(); }
    if (action === "pickFixFile") { (document.querySelector("#ingestFixFileInput") || document.querySelector("#fixFileInput"))?.click(); }
    if (action === "pickFixDir") { const el = document.querySelector("#ingestFixDirInput") || document.querySelector("#fixDirInput"); if (el) el.click(); }
    if (action === "pickFixVmstatFile") { (document.querySelector("#ingestVmstatFileInput") || document.querySelector("#fixVmstatFileInput"))?.click(); }
    if (action === "pickFixNstatFile") { (document.querySelector("#ingestNstatFileInput") || document.querySelector("#fixNstatFileInput"))?.click(); }
    if (action === "clearFixLog") {
      state.fixLatency = { records: [], correlation: null, threshold: 5, fileStats: [], vmstat: null, nstat: null };
      state.fixTable = { page: 1, pageSize: 20, sortKey: "lag", sortDir: "desc" };
      render();
    }
    if (action === "setBaseline") {
      state.baseline = createBaseline();
      state.baseline.role = "healthy";
      state.activeTab = "compare";
      toast("Healthy baseline captured", `${formatNumber(state.baseline.sockets.length)} sockets saved. Now load the incident capture.`);
      render();
    }
    if (action === "setBaselineAsIncident") {
      state.baseline = createBaseline();
      state.baseline.role = "incident";
      state.activeTab = "compare";
      toast("Incident baseline captured", `${formatNumber(state.baseline.sockets.length)} sockets saved. Now load the post-fix capture to see what recovered.`);
      render();
    }
    if (action === "clearBaseline") {
      state.baseline = null;
      toast("Baseline cleared", "Before/after comparison is reset.");
      render();
    }
    if (action === "timelineView") {
      state.timelineView = event.currentTarget.dataset.value || "stories";
      render();
    }
    if (action === "heatmapRes") {
      state._heatmapResMs = Number(event.currentTarget.value);
      render();
    }
    if (action === "diagnosisView") {
      state.diagnosisView = event.currentTarget.dataset.value || "matrix";
      render();
    }
    if (action === "expandChart") {
      const metric = event.currentTarget.dataset.metric;
      state.expandedChart = state.expandedChart === metric ? null : metric;
      render();
      if (state.expandedChart) requestAnimationFrame(() => {
        const card = document.querySelector(`[data-chart-card="${metric}"]`);
        if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    if (action === "toggleTheme") {
      state.prefs.theme = state.prefs.theme === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", state.prefs.theme);
      savePrefs();
      render();
    }
    if (action === "toggleDensity") {
      state.prefs.density = state.prefs.density === "compact" ? "comfortable" : "compact";
      if (state.prefs.density === "compact") { document.documentElement.setAttribute("data-density", "compact"); }
      else { document.documentElement.removeAttribute("data-density"); }
      savePrefs();
      render();
    }
    if (action === "nextOnboarding") {
      state.onboarding += 1;
      render();
    }
    if (action === "skipOnboarding" || action === "finishOnboarding") {
      state.onboarding = -1;
      localStorage.setItem("networkExpertOnboarded", "1");
      render();
    }
    if (action === "storyJumpToChart") {
      const epoch = Number(event.currentTarget.dataset.epoch);
      const metric = event.currentTarget.dataset.metric || "";
      const label = event.currentTarget.dataset.label || "";
      const history = state.history || [];
      if (history.length >= 2 && epoch) {
        const first = history[0].epochMs;
        const last = history[history.length - 1].epochMs;
        const range = last - first;
        if (range > 0) {
          const pos = (epoch - first) / range;
          const window = Math.min(0.2, 8000 / range);
          const zoomStart = Math.max(0, pos - window);
          const zoomEnd = Math.min(1, pos + window);
          setZoom(zoomStart, zoomEnd);
          const actualRange = zoomEnd - zoomStart;
          state.storyMarkerPct = actualRange > 0 ? ((pos - zoomStart) / actualRange) * 100 : 50;
          state.storyMarkerMetric = metric;
          if (metric && !state.chartMetrics.includes(metric)) {
            state.chartMetrics.push(metric);
          }
          clearTimeout(state._storyMarkerTimer);
          const annotationId = `story-${epoch}-${metric}`;
          if (!state.annotations.some(a => a.id === annotationId)) {
            state.annotations = [...state.annotations, { id: annotationId, sourceName: state.sourceName, socketId: state.selectedId || "", metric: metric || "*", kind: "story", label: label || "story event", note: "", anchor: "cursor", epochMs: epoch, createdAt: Date.now() }];
            saveAnnotations();
          }
        }
      }
      state.view = "charts";
      state.chartsTab = "charts";
      render();
      if (metric) requestAnimationFrame(() => {
        const card = document.querySelector(`[data-chart-card="${metric}"]`);
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      toast("Chart zoomed", `Focused on ${metric || "event"} at this timestamp.`);
    }
    if (action === "copyAdvisorCommands") {
      const finding = state.advisorFindings.find(item => item.id === event.currentTarget.dataset.findingId);
      await copyTextToClipboard((finding?.commands || []).join("\n"));
      toast("Advisor commands copied", "Suggested command line evidence has been copied.");
    }
    if (action === "copyGuideCommand") {
      const card = event.currentTarget.closest("[data-guide-command-card]");
      const command = card?.querySelector("pre")?.textContent || "";
      let ok = false;
      try {
        ok = await copyTextToClipboard(command);
      } catch {
        ok = false;
      }
      if (!ok) {
        toast("Copy failed", "The command could not be copied by the browser.", "danger");
        return;
      }
      const key = event.currentTarget.dataset.commandKey || "";
      state.copiedGuideCommand = key;
      event.currentTarget.classList.add("copied");
      event.currentTarget.innerHTML = `<i class="ri-check-line"></i> Copied`;
      toast("Command copied", "The command line is now in the clipboard.");
      setTimeout(() => {
        if (state.copiedGuideCommand === key) state.copiedGuideCommand = "";
        const button = [...document.querySelectorAll("[data-command-key]")].find(item => item.dataset.commandKey === key);
        if (button) {
          button.classList.remove("copied");
          button.innerHTML = `${icons.copy} Copy`;
        }
      }, 2200);
    }
    if (action === "addAlertRule") {
      const name = document.querySelector("#alertRuleName")?.value.trim() || "";
      const metric = document.querySelector("#alertRuleMetric")?.value || "rtt";
      const op = document.querySelector("#alertRuleOp")?.value || ">=";
      const value = Number(document.querySelector("#alertRuleValue")?.value || 0);
      const severity = document.querySelector("#alertRuleSeverity")?.value || "medium";
      if (!name || !Number.isFinite(value)) {
        toast("Alert rule incomplete", "Add a name and numeric threshold before saving the rule.", "danger");
        return;
      }
      state.alertRules = [{ id: `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`, name, metric, op, value, severity, enabled: true }, ...state.alertRules];
      saveAlertRules();
      toast("Alert rule added", `${name} is now evaluated against parsed sockets.`);
      render();
    }
    if (action === "ackAllAlerts") {
      state.alertEvents.filter(event => !event.acknowledged).forEach(event => { state.alertAcks[event.id] = Date.now(); });
      saveAlertAcks();
      toast("Alerts acknowledged", "All current active alerts were acknowledged.");
      render();
    }
    if (action === "resetAlertRules") {
      state.alertRules = defaultAlertRules();
      state.alertAcks = {};
      saveAlertRules();
      saveAlertAcks();
      toast("Default alert rules restored", "Alert rules and acknowledgements were reset.");
      render();
    }
    if (action === "clearFilterHistory") {
      state.filterHistory = [];
      saveFilterHistory();
      toast("Filter history cleared", "Saved filter suggestions have been removed.");
      render();
    }
    if (action === "startImportWithFilters") {
      const nextFilters = {
        enabled: true,
        protocol: document.querySelector("#preProtocol")?.value || "",
        state: document.querySelector("#preState")?.value || "",
        srcIp: document.querySelector("#preSrcIp")?.value.trim() || "",
        dstIp: document.querySelector("#preDstIp")?.value.trim() || "",
        anyPort: document.querySelector("#preAnyPort")?.value.trim() || "",
        srcPort: document.querySelector("#preSrcPort")?.value.trim() || "",
        dstPort: document.querySelector("#preDstPort")?.value.trim() || ""
      };
      const hasFilterValue = hasPreImportFilterValue(nextFilters);
      nextFilters.enabled = hasFilterValue;
      state.preImportFilters = nextFilters;
      if (!hasFilterValue) {
        toast("No filter selected", "Use Import full file, or choose at least one preset or field filter.", "warn");
        return;
      }
      const file = state.pendingFile;
      state.pendingFile = null;
      state.modal = null;
      if (!file) {
        toast("Choose a file", "Select an ss capture before applying import-time filters.", "warn");
        document.querySelector("#fileInput")?.click();
        return;
      }
      if (file) importFile(file).catch(error => {
        state.importStatus = null;
        toast("Import failed", error.message || "The selected file could not be read.", "danger");
        render();
      });
    }
    if (action === "startImportAll") {
      state.preImportFilters = emptyPreImportFilters();
      const file = state.pendingFile;
      state.pendingFile = null;
      state.modal = null;
      if (!file) {
        document.querySelector("#fileInput")?.click();
        return;
      }
      if (file) importFile(file).catch(error => {
        state.importStatus = null;
        toast("Import failed", error.message || "The selected file could not be read.", "danger");
        render();
      });
    }
    if (action === "zoomIn" || action === "zoomOut" || action === "panLeft" || action === "panRight" || action === "resetZoom") {
      applyChartZoomAction(action);
      renderKeepingWorkspacePosition();
    }
    if (action === "saveCharts") { saveChartsPng().catch(error => toast("Export failed", error.message || "PNG export failed.", "danger")); }
    if (action === "saveThresholds") {
      document.querySelectorAll("[data-threshold]").forEach(input => {
        const metric = input.dataset.threshold;
        const key = input.dataset.thresholdKey;
        state.thresholds[metric][key] = parseFormattedNumber(input.value);
      });
      toast("Thresholds saved", "Chart comfort, warning, and danger zones have been updated.");
      state.drawer = null;
      render();
    }
    if (action === "resetThresholdDefaults") {
      state.thresholds = cloneThresholds();
      toast("Expert defaults restored", "Thresholds have been reset to the built-in network analysis baseline.");
      render();
    }
    if (action === "saveLayout") {
      const l = state.prefs.chartLayout;
      l.columns = clampChartColumns(document.querySelector("#layoutColumns")?.value || l.columns);
      l.density = document.querySelector("#layoutDensity")?.value || l.density;
      l.mainChart = Boolean(document.querySelector("#layoutMainChart")?.checked);
      l.sharedZoom = Boolean(document.querySelector("#layoutSharedZoom")?.checked);
      l.showLegend = Boolean(document.querySelector("#layoutLegend")?.checked);
      l.showCrosshair = Boolean(document.querySelector("#layoutCrosshair")?.checked);
      l.syncCrosshair = Boolean(document.querySelector("#layoutSyncCrosshair")?.checked);
      l.tooltipOpacity = clampChartTooltipOpacity(document.querySelector("#layoutTooltipOpacity")?.value ?? l.tooltipOpacity);
      l.showThresholds = Boolean(document.querySelector("#layoutThresholds")?.checked);
      l.stickyToolbar = Boolean(document.querySelector("#layoutStickyToolbar")?.checked);
      const preset = document.querySelector("#layoutPreset")?.value;
      if (preset === "noc") Object.assign(l, { columns: 3, density: "compact", mainChart: true, sharedZoom: true, showLegend: true });
      if (preset === "deep") Object.assign(l, { columns: 2, density: "tall", mainChart: true, sharedZoom: true, showLegend: true });
      if (preset === "single") Object.assign(l, { columns: 1, density: "tall", mainChart: true, sharedZoom: true, showLegend: true });
      savePrefs();
      toast("Layout saved", "Chart layout preferences have been stored in this browser.");
      state.modal = null;
      const fast = document.querySelector(".modal-overlay-fast");
      if (fast) fast.remove();
      render();
    }
    if (action === "resetGrid") {
      state.table = {
        ...state.table,
        page: 1,
        pageSize: state.prefs.defaultPageSize,
        sortKey: "risk",
        sortDir: "desc",
        pinned: ["risk", "state", "local"],
        visible: defaultTableColumns(),
        order: [...DEFAULT_TABLE_ORDER],
        filters: { text: "", risk: "all", state: "all", family: "all", minRecvQ: "", minSendQ: "", minRtt: "", srcIp: "", dstIp: "", srcPort: "", dstPort: "", process: "", onlyAnomalies: false }
      };
      saveTableState();
      render();
    }
    if (action === "saveTableLayout") {
      const name = document.querySelector("#tableLayoutName")?.value?.trim() || "";
      if (!name) {
        toast("Layout name required", "Give this table layout a name before saving.", "danger");
        return;
      }
      const next = tableLayoutSnapshot(name);
      state.tableProfiles = [next, ...state.tableProfiles.filter(profile => profile.name.toLowerCase() !== name.toLowerCase())];
      saveTableProfiles();
      toast("Table layout saved", `"${name}" is now available in named table layouts.`);
      render();
    }

    if (action === "loadSelectedDashboard") {
      const id = document.querySelector("#savedDashboardSelect")?.value || "";
      applyDashboardProfile(state.dashboardProfiles.find(profile => profile.id === id));
      toast("Dashboard loaded", "Saved widgets, layout, style, and correlation were restored.");
      renderKeepingWorkspacePosition();
    }
    if (action === "deleteSelectedDashboard") {
      const id = document.querySelector("#savedDashboardSelect")?.value || "";
      state.dashboardProfiles = state.dashboardProfiles.filter(profile => profile.id !== id);
      saveDashboardProfiles();
      toast("Dashboard deleted", "The saved dashboard has been removed.");
      renderKeepingWorkspacePosition();
    }
    if (action === "saveDashboard") {
      const name = document.querySelector("#dashboardName")?.value?.trim() || "";
      if (!name) {
        toast("Dashboard name required", "Give this dashboard a name before saving.", "danger");
        return;
      }
      const next = dashboardSnapshot(name);
      state.dashboardProfiles = [next, ...state.dashboardProfiles.filter(profile => profile.name.toLowerCase() !== name.toLowerCase())];
      saveDashboardProfiles();
      toast("Dashboard saved", `"${name}" is ready in saved dashboards.`);
      render();
    }
    if (action === "saveServiceAlias") {
      const endpoint = document.querySelector("#aliasEndpoint")?.value?.trim() || "";
      if (!endpoint) {
        toast("Endpoint required", "Choose an IP:port endpoint before saving a service label.", "danger");
        return;
      }
      const scope = document.querySelector("#aliasGlobal")?.checked ? "global" : "source";
      state.serviceAliases = upsertEndpointAlias(state.serviceAliases, endpoint, {
        label: document.querySelector("#aliasLabel")?.value || "",
        role: document.querySelector("#aliasRole")?.value || "",
        note: document.querySelector("#aliasNote")?.value || ""
      }, Date.now(), {
        sourceName: state.sourceName,
        scope
      });
      state.aliasEditKey = endpoint;
      state.aliasEditScope = scope;
      saveServiceAliases();
      toast("Service label saved", `${currentAliasDisplay(endpoint, { scope })} is now shown ${scope === "global" ? "globally" : "for this recording"}.`);
      render();
    }
    if (action === "deleteServiceAlias") {
      const endpoint = document.querySelector("#aliasEndpoint")?.value?.trim() || "";
      const scope = document.querySelector("#aliasGlobal")?.checked ? "global" : "source";
      state.serviceAliases = deleteEndpointAlias(state.serviceAliases, endpoint, state.sourceName, { scope });
      saveServiceAliases();
      toast("Service label deleted", scope === "global" ? "Global endpoint label removed." : "Recording endpoint label removed.");
      render();
    }
    if (action === "saveServiceOverride") {
      const hidden = Boolean(document.querySelector("#serviceOverrideHidden")?.checked);
      const label = document.querySelector("#serviceOverrideLabel")?.value?.trim() || "";
      if (!hidden && !label) {
        toast("Service name required", "Set a replacement service name, or choose to hide the inferred service.", "danger");
        return;
      }
      const scope = document.querySelector("#serviceOverrideGlobal")?.checked ? "global" : "source";
      state.serviceOverrides = upsertServiceOverride(state.serviceOverrides, {
        target: document.querySelector("#serviceOverrideTarget")?.value || "port",
        endpoint: document.querySelector("#serviceOverrideEndpoint")?.value || "",
        port: document.querySelector("#serviceOverridePort")?.value || "",
        transport: document.querySelector("#serviceOverrideTransport")?.value || "",
        label,
        hidden,
        note: document.querySelector("#serviceOverrideNote")?.value || ""
      }, Date.now(), {
        sourceName: state.sourceName,
        scope
      });
      saveServiceOverrides();
      toast("Service classification saved", hidden ? "The inferred service is hidden for this scope." : `${label} now overrides the port heuristic for this scope.`);
      render();
    }
    if (action === "deleteServiceOverride") {
      const scope = document.querySelector("#serviceOverrideGlobal")?.checked ? "global" : "source";
      state.serviceOverrides = deleteServiceOverride(state.serviceOverrides, {
        target: document.querySelector("#serviceOverrideTarget")?.value || "port",
        endpoint: document.querySelector("#serviceOverrideEndpoint")?.value || "",
        port: document.querySelector("#serviceOverridePort")?.value || "",
        transport: document.querySelector("#serviceOverrideTransport")?.value || ""
      }, {
        sourceName: state.sourceName,
        scope
      });
      saveServiceOverrides();
      toast("Service classification deleted", scope === "global" ? "Global override removed." : "Recording override removed.");
      render();
    }
    if (action === "saveTopologyGroup") {
      const name = document.querySelector("#topologyName")?.value?.trim() || "";
      const match = document.querySelector("#topologyMatch")?.value?.trim() || "";
      if (!name || !match) {
        toast("Topology group incomplete", "Add a group name and at least one IP or IP:port matcher.", "danger");
        return;
      }
      state.topology = upsertTopologyGroup(state.topology, {
        id: state.topologyEditId || "",
        name,
        match,
        color: document.querySelector("#topologyColor")?.value || "cyan",
        note: document.querySelector("#topologyNote")?.value || ""
      });
      state.topologyEditId = state.topology.groups[0]?.id || "";
      state.topologyDraftMatch = "";
      saveCurrentTopology();
      toast("Topology group saved", `${name} is mapped for ${state.sourceName}.`);
      render();
    }
    if (action === "deleteTopologyGroup") {
      if (!state.topologyEditId) return;
      state.topology = deleteTopologyGroup(state.topology, state.topologyEditId);
      state.topologyEditId = "";
      state.topologyDraftMatch = "";
      saveCurrentTopology();
      toast("Topology group deleted", "This recording topology was updated.");
      render();
    }
    if (action === "closeDrawer") {
      const wasThresholds = state.drawer === "thresholds";
      state.drawer = null;
      if (wasThresholds && state.view === "charts") {
        const drawerEl = document.querySelector(".drawer-overlay, .drawer");
        if (drawerEl) drawerEl.remove();
        const backdrop = document.querySelector(".drawer-backdrop");
        if (backdrop) backdrop.remove();
      } else {
        render();
      }
    }
    if (action === "closeModal") {
      state.modal = null; state.helpColumn = null; state.helpMetric = null; state.annotationContext = null;
      const fast = document.querySelector(".modal-overlay-fast");
      if (fast) { fast.remove(); return; }
      render();
    }
    if (action === "savePrefs") {
      state.prefs.severityFloor = document.querySelector("#prefSeverity")?.value || state.prefs.severityFloor;
      state.prefs.autoToast = document.querySelector("#prefToast")?.checked ?? state.prefs.autoToast;
      state.prefs.deepAnalysis = true;
      state.prefs.compactRows = document.querySelector("#prefCompact")?.checked ?? state.prefs.compactRows;
      state.prefs.tableUnits = document.querySelector("#prefTableUnits")?.checked ?? state.prefs.tableUnits;
      state.prefs.colorBlind = document.querySelector("#prefColorBlind")?.checked ?? state.prefs.colorBlind;
      state.prefs.linuxProfile = document.querySelector("#prefLinuxProfile")?.value || state.prefs.linuxProfile;
      state.prefs.accessRole = document.querySelector("#prefAccessRole")?.value || state.prefs.accessRole;
      state.prefs.ubuntuVersion = document.querySelector("#prefUbuntuVersion")?.value || state.prefs.ubuntuVersion;
      state.prefs.numberLocale = document.querySelector("#prefNumberLocale")?.value || state.prefs.numberLocale;
      state.prefs.numberGrouping = document.querySelector("#prefNumberGrouping")?.checked ?? state.prefs.numberGrouping;
      state.prefs.chartTimeZone = document.querySelector("#prefChartTimeZone")?.value || state.prefs.chartTimeZone;
      state.prefs.chartPointSize = document.querySelector("#prefChartPointSize")?.value || state.prefs.chartPointSize;
      state.prefs.defaultDashboardPreset = dashboardPresetIdOrDefault(document.querySelector("#prefDefaultDashboardPreset")?.value || state.prefs.defaultDashboardPreset);
      state.prefs.chartLayout.tooltipOpacity = clampChartTooltipOpacity(document.querySelector("#prefTooltipOpacity")?.value ?? state.prefs.chartLayout.tooltipOpacity);
      state.prefs.paginationPosition = document.querySelector("#prefPagination")?.value || state.prefs.paginationPosition;
      state.prefs.defaultPageSize = Number(document.querySelector("#prefPageSize")?.value || state.prefs.defaultPageSize);
      state.table.pageSize = state.prefs.defaultPageSize;
      state.prefs.graphWindow = Number(document.querySelector("#prefWindow")?.value || state.prefs.graphWindow);
      savePrefs();
      toast("Preferences saved", "Your settings will be kept in this browser.");
      render();
    }
  }));

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
    state.aliasEditScope = "source";
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
  document.querySelectorAll("[data-table-settings-menu]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    if (state.openTableSettings) {
      state.openTableSettings = false;
      state.openTableSettingsPos = null;
    } else {
      const placement = tableSettingsPlacement(event.currentTarget);
      if (placement.drawer) {
        state.openTableSettings = false;
        state.openTableSettingsPos = null;
        state.drawer = "tableSettings";
      } else {
        state.drawer = state.drawer === "tableSettings" ? null : state.drawer;
        state.openTableSettings = true;
        state.openTableSettingsPos = { left: placement.left, top: placement.top, width: placement.width, height: placement.height };
      }
    }
    renderKeepingWorkspacePosition();
  }));
  document.querySelectorAll(".table-settings-menu").forEach(menu => menu.addEventListener("click", event => {
    event.stopPropagation();
  }));
  document.querySelectorAll("[data-table-column-search]").forEach(input => input.addEventListener("input", event => {
    event.stopPropagation();
    state.tableColumnSearch = event.currentTarget.value;
    applyTableColumnSearchFilter(event.currentTarget.closest(".table-settings-menu, .table-settings-drawer"), state.tableColumnSearch);
  }));
  document.querySelectorAll("[data-table-column-search-clear]").forEach(btn => btn.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    state.tableColumnSearch = "";
    const panel = event.currentTarget.closest(".table-settings-menu, .table-settings-drawer");
    const input = panel?.querySelector("[data-table-column-search]");
    if (input) {
      input.value = "";
      input.focus();
    }
    applyTableColumnSearchFilter(panel, "");
  }));
  document.querySelectorAll("[data-table-menu-action]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const action = event.currentTarget.dataset.tableMenuAction;
    if (action === "clearSort") {
      state.table = resetTableSort(state.table, TABLE_COLUMNS, tableDefaults());
    }
    if (action === "resetColumns") {
      state.table = resetTableColumns(state.table, TABLE_COLUMNS, tableDefaults());
    }
    saveTableState();
    renderKeepingWorkspacePosition();
  }));
  document.querySelectorAll("[data-export-menu]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const scope = event.currentTarget.dataset.exportMenu;
    const wrap = event.currentTarget.closest(".export-menu-wrap");
    const menu = wrap?.querySelector(".export-menu");
    if (!menu) return;
    if (state.openExportMenu === scope) {
      state.openExportMenu = null;
      state.openExportMenuPos = null;
      menu.classList.remove("open");
      menu.removeAttribute("style");
    } else {
      document.querySelectorAll(".export-menu.open").forEach(m => { m.classList.remove("open"); m.removeAttribute("style"); });
      const rect = event.currentTarget.getBoundingClientRect();
      const menuWidth = 260;
      const menuHeight = 110;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8);
      const preferBelow = rect.bottom + menuHeight + 8 <= window.innerHeight;
      const top = preferBelow ? rect.bottom + 6 : Math.max(8, rect.top - menuHeight - 6);
      state.openExportMenu = scope;
      state.openExportMenuPos = { left: Math.round(left), top: Math.round(top) };
      menu.style.left = `${Math.round(left)}px`;
      menu.style.top = `${Math.round(top)}px`;
      menu.classList.add("open");
    }
  }));
  document.querySelectorAll(".export-menu").forEach(menu => menu.addEventListener("click", event => {
    event.stopPropagation();
  }));
  document.querySelectorAll("[data-export-action]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const action = event.currentTarget.dataset.exportAction;
    state.openExportMenu = null;
    state.openExportMenuPos = null;
    const reportEl = document.getElementById("inlineReport");
    if (reportEl) reportEl.classList.add("visible");
    setTimeout(() => {
      try {
        if (action === "pdf") openIncidentReport();
        if (action === "incident-html") exportIncidentReportHtml();
        if (action === "pack") exportEvidencePack().catch(error => toast("Evidence pack failed", error.message || "Evidence pack export failed.", "danger")).finally(() => { if (reportEl) reportEl.classList.remove("visible"); });
        if (action === "jira") { copyTextToClipboard(buildJiraReport()); toast("Jira report copied", "Paste into a Jira ticket description or comment."); }
        if (action === "fix-csv") { exportFixSpikeCsv(); }
      } finally { if (action !== "pack" && reportEl) reportEl.classList.remove("visible"); }
    }, 16);
  }));
  document.querySelectorAll("[data-action-menu]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const id = event.currentTarget.dataset.actionMenu;
    if (state.openMenuId === id) {
      state.openMenuId = null;
      state.openMenuPos = null;
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const menuWidth = 250;
      const menuHeight = 188;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8);
      const preferBelow = rect.bottom + menuHeight + 8 <= window.innerHeight;
      const top = preferBelow ? rect.bottom + 6 : Math.max(8, rect.top - menuHeight - 6);
      state.openMenuId = id;
      state.openMenuPos = { left: Math.round(left), top: Math.round(top) };
    }
    render();
  }));
  document.querySelectorAll("[data-conversation-sort]").forEach(btn => btn.addEventListener("click", event => {
    const key = event.currentTarget.dataset.conversationSort;
    if (!CONVERSATION_SORT_LABELS[key]) return;
    const current = state.conversationSort || { key: "anomalies", dir: "desc" };
    const nextDir = current.key === key ? (current.dir === "asc" ? "desc" : "asc") : conversationDefaultSortDir(key);
    state.conversationSort = { key, dir: nextDir };
    state.table.page = 1;
    state.openConversationInsightKey = null;
    state.openConversationInsightPos = null;
    renderKeepingWorkspacePosition();
  }));
  document.querySelectorAll("[data-conversation-insight]").forEach(btn => {
    btn.addEventListener("click", event => {
      event.stopPropagation();
      const key = event.currentTarget.dataset.conversationInsight;
      if (state.openConversationInsightKey === key) {
        state.openConversationInsightKey = null;
        state.openConversationInsightPos = null;
      } else {
        positionConversationInsight(event.currentTarget);
      }
      renderKeepingWorkspacePosition();
    });
  });
  document.querySelectorAll(".conversation-insight-popover").forEach(popover => popover.addEventListener("click", event => {
    event.stopPropagation();
  }));
  document.querySelectorAll("[data-conversation-close]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    state.openConversationInsightKey = null;
    state.openConversationInsightPos = null;
    renderKeepingWorkspacePosition();
  }));
  document.querySelectorAll("[data-conversation-action]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const socket = socketsById().get(event.currentTarget.dataset.socketId);
    if (!socket) return;
    const action = event.currentTarget.dataset.conversationAction;
    const metric = event.currentTarget.dataset.metric || "rtt";
    focusSocket(socket.id, "Chosen from conversation action");
    state.openConversationInsightKey = null;
    state.openConversationInsightPos = null;
    if (action === "chart") {
      state.view = "charts";
      if (chartMetricList().includes(metric)) {
        state.prefs.graphMetric = metric;
        state.chartMetrics = [...new Set([metric, ...state.chartMetrics])];
      }
      toast("Conversation chart opened", `${metricLabel(metric)} for ${socket.local} -> ${socket.peer}.`);
    }
    if (action === "details") {
      state.activeTab = "sockets";
      state.drawer = "details";
      toast("Conversation context selected", `${socket.local} -> ${socket.peer}.`);
    }
    if (action === "anomalies") {
      state.view = "analysis";
      state.activeTab = "anomalies";
      state.anomalyFilters = { ...state.anomalyFilters, severity: "all", metric: metric === "socket" ? "all" : metric, text: socket.id, sort: "priority" };
      toast("Anomalies filtered", "Showing detailed signals for this conversation.");
    }
    render();
  }));
  document.querySelectorAll("[data-row-action]").forEach(btn => btn.addEventListener("click", async event => {
    event.stopPropagation();
    const socket = socketsById().get(event.currentTarget.dataset.socketId);
    if (!socket) return;
    const action = event.currentTarget.dataset.rowAction;
    focusSocket(socket.id, "Chosen from row action");
    state.openMenuId = null;
    state.openMenuPos = null;
    if (action === "chart") {
      state.view = "charts";
      toast("Chart context selected", `${socket.local} -> ${socket.peer}`);
    }
    if (action === "details") {
      state.drawer = "details";
    }
    if (action === "filter-src") {
      state.table.filters.srcIp = socket.localAddress.host;
      state.table.page = 1;
    }
    if (action === "filter-dst") {
      state.table.filters.dstIp = socket.peerAddress.host;
      state.table.page = 1;
    }
    if (action === "copy") {
      const p = socket.details?.process;
      const summary = [
        `${socket.state} ${socket.local} -> ${socket.peer}`,
        p ? `Process: ${p.name}:${p.pid}` : "",
        `Send-Q: ${formatNumber(socket.sendQ)} | Recv-Q: ${formatNumber(socket.recvQ)}`,
        metricValue(socket, "rtt") ? `RTT: ${metricValue(socket, "rtt").toFixed(1)}ms | RTO: ${metricValue(socket, "rto")}ms` : "",
        metricValue(socket, "cwnd") ? `cwnd: ${metricValue(socket, "cwnd")} | retrans: ${socket.details?.timer?.retrans || 0}` : "",
        metricValue(socket, "skmem.d") ? `drops: ${metricValue(socket, "skmem.d")}` : "",
        socket.risk !== "none" ? `Risk: ${socket.risk}` : ""
      ].filter(Boolean).join("\\n");
      await navigator.clipboard?.writeText(summary);
      toast("Socket copied", "Formatted summary copied to clipboard (paste in Slack/email).");
    }
    render();
  }));
  document.querySelectorAll("[data-pin-col]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const key = event.currentTarget.dataset.pinCol;
    state.table = toggleTableColumnPin(state.table, key, TABLE_COLUMNS, tableDefaults());
    saveTableState();
    event.currentTarget.closest(".modal") ? renderKeepingModalPosition() : render();
  }));
  document.querySelectorAll("[data-column-help]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    state.helpColumn = event.currentTarget.dataset.columnHelp;
    state.modal = "columnHelp";
    render();
  }));
  document.querySelectorAll("[data-metric-help]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    state.helpMetric = event.currentTarget.dataset.metricHelp;
    state.modal = "metricHelp";
    render();
  }));
  document.querySelectorAll("[data-hide-col]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const key = event.currentTarget.dataset.hideCol;
    state.table = setTableColumnVisibility(state.table, key, false, TABLE_COLUMNS, tableDefaults());
    saveTableState();
    event.currentTarget.closest(".modal") ? renderKeepingModalPosition() : render();
  }));
  document.querySelectorAll("[data-load-table-layout]").forEach(btn => btn.addEventListener("click", event => {
    applyTableLayout(state.tableProfiles.find(profile => profile.id === event.currentTarget.dataset.loadTableLayout));
    toast("Table layout applied", "Column order, visibility, pinning, sort, and page size have been restored.");
    render();
  }));
  document.querySelectorAll("[data-delete-table-layout]").forEach(btn => btn.addEventListener("click", event => {
    state.tableProfiles = state.tableProfiles.filter(profile => profile.id !== event.currentTarget.dataset.deleteTableLayout);
    saveTableProfiles();
    toast("Table layout deleted", "The saved table layout has been removed.");
    render();
  }));
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
  document.querySelectorAll("[draggable][data-col-key]").forEach(item => {
    item.addEventListener("dragstart", event => {
      event.dataTransfer.setData("text/plain", event.currentTarget.dataset.colKey);
      event.dataTransfer.effectAllowed = "move";
      event.currentTarget.classList.add("dragging");
    });
    item.addEventListener("dragend", event => {
      event.currentTarget.classList.remove("dragging");
      document.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
    });
    item.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      event.currentTarget.classList.add("drag-over");
    });
    item.addEventListener("dragleave", event => {
      event.currentTarget.classList.remove("drag-over");
    });
    item.addEventListener("drop", event => {
      event.preventDefault();
      const from = event.dataTransfer.getData("text/plain");
      const to = event.currentTarget.dataset.colKey;
      if (moveTableColumn(from, to)) {
        saveTableState();
        render();
      }
    });
  });
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
  document.querySelectorAll("[data-visible-col]").forEach(input => input.addEventListener("change", event => {
    event.stopPropagation();
    const key = event.currentTarget.dataset.visibleCol;
    state.table = setTableColumnVisibility(state.table, key, event.currentTarget.checked, TABLE_COLUMNS, tableDefaults());
    saveTableState();
    event.currentTarget.closest(".modal") ? renderKeepingModalPosition() : renderKeepingWorkspacePosition();
  }));
  document.querySelectorAll("[data-menu-visible-col]").forEach(btn => btn.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const key = event.currentTarget.dataset.menuVisibleCol;
    state.table = toggleTableColumnVisibility(state.table, key, TABLE_COLUMNS, tableDefaults());
    saveTableState();
    renderKeepingWorkspacePosition();
  }));
  document.querySelectorAll("[data-menu-pin-col]").forEach(btn => btn.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const key = event.currentTarget.dataset.menuPinCol;
    state.table = toggleTableColumnPin(state.table, key, TABLE_COLUMNS, tableDefaults());
    saveTableState();
    renderKeepingWorkspacePosition();
  }));
  document.querySelectorAll("[data-opt]").forEach(input => {
    const stopOptionBubble = event => event.stopPropagation();
    input.addEventListener("pointerdown", stopOptionBubble);
    input.addEventListener("click", stopOptionBubble);
    input.addEventListener("change", event => {
      event.stopPropagation();
      const opt = event.currentTarget.dataset.opt;
      state.ssOptionHelpKey = opt;
      state.command = toggleCommandOption(state.command, opt, event.currentTarget.checked);
      const cmdEl = document.querySelector(".ss-command-text");
      if (cmdEl) { cmdEl.textContent = state.command; return; }
      renderKeepingWorkspacePosition();
    });
  });
  document.querySelectorAll("[id^='ssCmd']").forEach(input => {
    const eventName = input.type === "checkbox" ? "change" : "input";
    input.addEventListener(eventName, () => syncSsCommandFromBuilder());
  });
  document.querySelector("#commandInput")?.addEventListener("input", event => {
    state.command = event.currentTarget.value;
  });
  document.querySelectorAll("[data-ss-option-help]").forEach(button => {
    const showHelp = event => {
      if (event.target?.closest("label.ss-option-check")) return;
      event.stopPropagation();
      const nextKey = event.currentTarget.dataset.ssOptionHelp;
      if (!nextKey || nextKey === state.ssOptionHelpKey) return;
      state.ssOptionHelpKey = nextKey;
      renderKeepingWorkspacePosition();
    };
    button.addEventListener("click", showHelp);
    button.addEventListener("focus", showHelp);
    button.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      showHelp(event);
    });
  });
  for (const [id, key] of [["metricSelect", "graphMetric"], ["styleSelect", "graphStyle"]]) {
    document.querySelector(`#${id}`)?.addEventListener("change", e => { state.prefs[key] = e.target.value; savePrefs(); renderKeepingWorkspacePosition(); });
  }
  document.querySelector("[data-ss-theme-picker]")?.addEventListener("pointerleave", () => {
    if (state.openSsEditorThemeMenu) resetSsEditorThemePreview();
  });
  document.querySelectorAll("[data-ss-editor-theme-preview]").forEach(button => {
    const preview = event => {
      event.stopPropagation();
      applySsEditorThemePreview(event.currentTarget.dataset.ssEditorThemePreview);
    };
    button.addEventListener("pointerenter", preview);
    button.addEventListener("focus", preview);
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      syncFromCodeMirror();
      state.prefs.ssEditorTheme = normalizeSsEditorTheme(event.currentTarget.dataset.ssEditorThemePreview);
      state.openSsEditorThemeMenu = false;
      savePrefs();
      renderKeepingWorkspacePosition();
    });
    button.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        state.openSsEditorThemeMenu = false;
        resetSsEditorThemePreview();
        renderKeepingWorkspacePosition();
      }
    });
  });
  document.querySelector("#chartTimeZoneSelect")?.addEventListener("change", e => { state.prefs.chartTimeZone = e.target.value; savePrefs(); renderKeepingWorkspacePosition(); });
  document.querySelector("#jvmSyncCrosshair")?.addEventListener("change", e => {
    state.jvmGc.syncCrosshair = e.target.checked;
  });
  document.querySelector("#jvmSeverityFilter")?.addEventListener("change", e => {
    state.jvmGc.severityFilter = e.target.value;
    if (state.jvmTable) state.jvmTable.page = 1;
    render();
    requestAnimationFrame(drawJvmCharts);
  });
  document.querySelector("#jvmClockOffset")?.addEventListener("change", e => {
    state.jvmGc.clockOffsetMs = Number(e.target.value) || 0;
    runJvmCorrelation();
    render();
    requestAnimationFrame(drawJvmCharts);
  });
  document.querySelector("#jvmGcFileInput")?.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;
    _showBusy();
    const reader = file.stream().getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let lines = "";
    const gcPattern = /GC\(\d+\)|Pause |Safepoint|safepoint|stopped.*seconds|User=.*Sys=.*Real=|Eden:|Survivor|Old:|Humongous|->.*M\(|Evacuation Failure|To-space exhausted/i;
    function pump() {
      reader.read().then(({ done, value }) => {
        if (done) {
          if (buffer) { if (gcPattern.test(buffer)) lines += buffer + "\n"; }
          finishParse();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop();
        for (const line of parts) {
          if (gcPattern.test(line)) lines += line + "\n";
        }
        setTimeout(pump, 0);
      });
    }
    function finishParse() {
      const { pauses, safepoints } = parseGcLog(lines);
      state.jvmGc.rawLog = `[${file.name}: ${pauses.length} pauses extracted from ${(file.size / 1e6).toFixed(1)} MB]`;
      state.jvmGc.pauses = pauses;
      state.jvmGc.safepoints = safepoints;
      runJvmCorrelation();
      _hideBusy();
      toast("GC log loaded & parsed", `${pauses.length} pauses, ${safepoints.length} safepoints from ${file.name} (${(file.size / 1e6).toFixed(1)} MB).`);
      render();
      requestAnimationFrame(drawJvmCharts);
    }
    pump();
  });
  document.querySelector("#pidstatFileInput")?.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const { samples } = parsePidstat(text);
      state.jvmGc.pidstat = samples;
      // Run CPU correlation if GC pauses exist
      if (state.jvmGc.pauses.length) {
        state.jvmGc.cpuCorrelation = correlateCpuWithStalls({
          pidstatSamples: samples,
          gcPauses: state.jvmGc.correlation?.results?.map(r => ({ ...r.pause, alignedEpochMs: r.epochMs })) || state.jvmGc.pauses,
          history: visibleHistory().filter(s => s.epochMs),
          clockOffsetMs: state.jvmGc.clockOffsetMs
        });
      }
      toast("pidstat loaded", `${samples.length} CPU samples parsed from ${file.name}.`);
      render();
    });
  });
  document.querySelector("#nstatFileInput")?.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const { counters } = parseNstat(text);
      state.jvmGc.nstat = extractTcpCounters(counters);
      toast("nstat loaded", `${counters.size} counters parsed. Key: retrans=${state.jvmGc.nstat.retransSegs}, timeouts=${state.jvmGc.nstat.timeouts}, listenDrops=${state.jvmGc.nstat.listenDrops}.`);
      render();
    });
  });
  async function readFixFileText(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".gz")) {
      if ("DecompressionStream" in window) {
        const stream = file.stream().pipeThrough(new DecompressionStream("gzip"));
        const reader = stream.getReader();
        const chunks = [];
        while (true) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
        return new TextDecoder().decode(await new Blob(chunks).arrayBuffer());
      }
    }
    if (name.endsWith(".zip") && window.JSZip) {
      const zip = await window.JSZip.loadAsync(file);
      const entries = Object.values(zip.files).filter(e => !e.dir && /\.(log|txt|gz)$/i.test(e.name));
      const texts = [];
      for (const entry of entries) {
        let t = await entry.async("string");
        if (entry.name.toLowerCase().endsWith(".gz") && window.pako) {
          const buf = await entry.async("uint8array");
          t = window.pako.ungzip(buf, { to: "string" });
        }
        texts.push({ name: entry.name, text: t });
      }
      return texts;
    }
    return file.text();
  }
  async function ingestFixFiles(files) {
    if (!files.length) return;
    const progressEl = document.querySelector("#fixProgressBar");
    const progressLabel = document.querySelector("#fixProgressLabel");
    if (progressEl) { progressEl.style.width = "0%"; progressEl.parentElement.style.display = "flex"; }
    let allRecords = [...state.fixLatency.records];
    const total = files.length;
    for (let i = 0; i < total; i++) {
      const file = files[i];
      const pct = Math.round(((i) / total) * 100);
      if (progressEl) progressEl.style.width = `${pct}%`;
      if (progressLabel) progressLabel.textContent = `Parsing ${file.name} (${i + 1}/${total})`;
      await new Promise(r => setTimeout(r, 0));
      try {
        const result = await readFixFileText(file);
        if (Array.isArray(result)) {
          for (const { name, text } of result) {
            const { records, stats } = parseFixLog(text, name);
            allRecords.push(...records);
            state.fixLatency.fileStats.push({ fileName: name, size: text.length, ...stats });
          }
        } else {
          const { records, stats } = parseFixLog(result, file.name);
          allRecords.push(...records);
          state.fixLatency.fileStats.push({ fileName: file.name, size: file.size, ...stats });
        }
      } catch (err) {
        state.fixLatency.fileStats.push({ fileName: file.name, size: file.size, parsed: 0, rejected: 0, error: err.message });
      }
    }
    if (progressEl) progressEl.style.width = "100%";
    if (progressLabel) progressLabel.textContent = "Done";
    allRecords.sort((a, b) => a.receiveMs - b.receiveMs);
    state.fixLatency.records = allRecords;
    runFixCorrelation();
    toast("FIX logs loaded", `${allRecords.length} messages from ${total} file(s). ${state.fixLatency.correlation?.summary?.totalSpikes || 0} spikes above ${state.fixLatency.threshold}ms.`);
    setTimeout(() => { if (progressEl) progressEl.parentElement.style.display = "none"; }, 1500);
    render();
    requestAnimationFrame(drawFixCharts);
  }
  document.querySelector("#fixFileInput")?.addEventListener("change", e => {
    const files = Array.from(e.target.files || []);
    ingestFixFiles(files);
  });
  document.querySelector("#fixDirInput")?.addEventListener("change", e => {
    const files = Array.from(e.target.files || []);
    ingestFixFiles(files);
  });
  document.querySelector("#fixThresholdInput")?.addEventListener("change", e => {
    state.fixLatency.threshold = parseInt(e.target.value, 10) || 5;
    runFixCorrelation();
    render();
    setTimeout(drawFixCharts, 50);
  });
  document.querySelector("#cmdPaletteInput")?.addEventListener("input", e => { state.commandPaletteQuery = e.target.value; state.cmdPaletteIdx = 0; render(); setTimeout(() => document.querySelector("#cmdPaletteInput")?.focus(), 10); });
  document.querySelector("#cmdPaletteInput")?.addEventListener("keydown", e => {
    const items = document.querySelectorAll(".cmd-palette-results button");
    if (e.key === "ArrowDown") { e.preventDefault(); state.cmdPaletteIdx = Math.min((state.cmdPaletteIdx || 0) + 1, items.length - 1); items.forEach((b, i) => b.classList.toggle("active", i === state.cmdPaletteIdx)); }
    if (e.key === "ArrowUp") { e.preventDefault(); state.cmdPaletteIdx = Math.max((state.cmdPaletteIdx || 0) - 1, 0); items.forEach((b, i) => b.classList.toggle("active", i === state.cmdPaletteIdx)); }
    if (e.key === "Enter") { e.preventDefault(); const active = items[state.cmdPaletteIdx || 0]; if (active) active.click(); }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && state.modal === "commandPalette") { state.modal = null; render(); } });
  document.querySelector("#ingestPeerSsInput")?.addEventListener("change", async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { parseSs } = await import("./parser.js");
    const sockets = parseSs(text);
    state.peerCapture = { raw: text, sockets, sourceName: file.name };
    // Auto-correlate: match local sockets with peer sockets by inverted 4-tuple
    const correlations = [];
    for (const local of state.sockets) {
      const peer = sockets.find(s => s.local?.includes(local.peerAddress?.host) && s.peer?.includes(local.localAddress?.host));
      if (peer) correlations.push({ localSocket: local, peerSocket: peer, localSendQ: local.sendQ, peerRecvQ: peer.recvQ, localRecvQ: local.recvQ, peerSendQ: peer.sendQ });
    }
    state.peerCapture.correlations = correlations;
    toast("Peer ss loaded", `${sockets.length} sockets from ${file.name}. ${correlations.length} cross-host correlation(s) found.`);
    render();
  });
  document.querySelector("#ingestAutoDir")?.addEventListener("change", async e => {
    const files = Array.from(e.target.files || []).filter(f => /\.(log|txt|out|gz|zip|ss)$/i.test(f.name));
    if (!files.length) return;
    _showBusy();
    const classified = { ss: [], fix: [], gc: [], vmstat: [], nstat: [] };
    for (const file of files) {
      try {
        const slice = await file.slice(0, 4096).text();
        if (/^===\s*\d{4}-/.test(slice) && /Tcp/.test(slice)) classified.nstat.push(file);
        else if (/^procs\s+---/.test(slice) || /^\s*\d+\s+\d+\s+\d+\s+\d+.*\d{4}-\d{2}-\d{2}/m.test(slice)) classified.vmstat.push(file);
        else if (/GC\(\d+\)|Pause (Young|Full|G1)|\[gc[\],]|Using G1|Using ZGC|Using Shenandoah|gc,init/i.test(slice)) classified.gc.push(file);
        else if (/FIXTcpConnection|\\|52=\d{8}/.test(slice)) classified.fix.push(file);
        else if (/tcp\s+(ESTAB|LISTEN|TIME-WAIT|CLOSE-WAIT)/i.test(slice) || /^tcp\s/m.test(slice)) classified.ss.push(file);
      } catch(err) {}
    }
    const summary = [];
    // Load ss FIRST and wait for it to be parsed before loading other sources
    if (classified.ss.length) {
      const ssFile = classified.ss[0];
      const ssText = await ssFile.text();
      const cmEl = document.querySelector("#rawInput") || document.querySelector(".CodeMirror");
      if (cmInstance) cmInstance.setValue(ssText);
      else if (cmEl) cmEl.value = ssText;
      state.raw = ssText; state.rawVersion = (state.rawVersion || 0) + 1; state.sourceName = ssFile.name;
      state.cache = {};
      document.querySelector("[data-action='parse']")?.click();
      await new Promise(resolve => { const check = () => state.sockets.length > 0 ? resolve() : setTimeout(check, 300); check(); });
      summary.push(`ss: ${ssFile.name}`);
    }
    if (classified.gc.length) { const file = classified.gc[0]; file.text().then(text => { const gcPattern = /GC\(\d+\)|Pause |Safepoint|safepoint|stopped.*seconds|User=.*Sys=.*Real=|Eden:|Survivor|Old:|Humongous|->.*M\(|Evacuation Failure|To-space exhausted/i; const lines = text.split("\n").filter(l => gcPattern.test(l)).join("\n"); const { pauses, safepoints } = parseGcLog(lines); state.jvmGc.rawLog = `[${file.name}]`; state.jvmGc.pauses = pauses; state.jvmGc.safepoints = safepoints; }); summary.push(`GC: ${classified.gc[0].name}`); }
    if (classified.vmstat.length) { classified.vmstat[0].text().then(text => { state.fixLatency.vmstat = parseVmstat(text).samples; render(); }); summary.push(`vmstat: ${classified.vmstat[0].name}`); }
    if (classified.nstat.length) { classified.nstat[0].text().then(text => { state.fixLatency.nstat = parseNstatTimestamped(text).samples; render(); }); summary.push(`nstat: ${classified.nstat[0].name}`); }
    if (classified.fix.length) { await ingestFixFiles(classified.fix); summary.push(`FIX: ${classified.fix.length} file(s)`); }
    _hideBusy();
    toast("Auto-detect complete", summary.length ? summary.join(" · ") : "No recognized files found");
    render();
    // Wait for ss to be fully parsed, then run correlations
    const waitForSs = () => { if (state.sockets.length > 0) { setTimeout(() => { if (state.jvmGc.pauses.length) runJvmCorrelation(); if (state.fixLatency.records.length) runFixCorrelation(); render(); }, 500); } else { setTimeout(waitForSs, 500); } }; waitForSs();
  });
  document.querySelector("#ingestGcFileInput")?.addEventListener("change", e => { document.querySelector("#jvmGcFileInput")?.dispatchEvent || null; const el = document.querySelector("#jvmGcFileInput"); if (el) { el.files = e.target.files; el.dispatchEvent(new Event("change")); } else { const file = e.target.files?.[0]; if (!file) return; _showBusy(); const reader = file.stream().getReader(); const decoder = new TextDecoder(); let buffer = ""; let lines = ""; const gcPattern = /GC\(\d+\)|Pause |Safepoint|safepoint|stopped.*seconds|User=.*Sys=.*Real=|Eden:|Survivor|Old:|Humongous|->.*M\(|Evacuation Failure|To-space exhausted/i; function pump() { reader.read().then(({ done, value }) => { if (done) { if (buffer && gcPattern.test(buffer)) lines += buffer + "\n"; const { pauses, safepoints } = parseGcLog(lines); state.jvmGc.rawLog = `[${file.name}]`; state.jvmGc.pauses = pauses; state.jvmGc.safepoints = safepoints; runJvmCorrelation(); _hideBusy(); toast("GC log loaded", `${pauses.length} pauses from ${file.name}`); render(); return; } buffer += decoder.decode(value, { stream: true }); const parts = buffer.split("\n"); buffer = parts.pop(); for (const line of parts) { if (gcPattern.test(line)) lines += line + "\n"; } setTimeout(pump, 0); }); } pump(); } });
  document.querySelector("#ingestVmstatFileInput")?.addEventListener("change", e => { const file = e.target.files?.[0]; if (!file) return; file.text().then(text => { const { samples } = parseVmstat(text); state.fixLatency.vmstat = samples; toast("vmstat loaded", `${samples.length} samples from ${file.name}`); render(); }); });
  document.querySelector("#ingestNstatFileInput")?.addEventListener("change", e => { const file = e.target.files?.[0]; if (!file) return; file.text().then(text => { const { samples } = parseNstatTimestamped(text); state.fixLatency.nstat = samples; toast("nstat loaded", `${samples.length} samples from ${file.name}`); render(); }); });
  document.querySelector("#ingestFixFileInput")?.addEventListener("change", e => { const files = Array.from(e.target.files || []).filter(f => /\.(log|txt|gz|zip)$/i.test(f.name)); ingestFixFiles(files); });
  document.querySelector("#ingestFixDirInput")?.addEventListener("change", e => { const files = Array.from(e.target.files || []).filter(f => /\.(log|txt|gz|zip)$/i.test(f.name)); ingestFixFiles(files); });
  document.querySelector("#fixVmstatFileInput")?.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const { samples } = parseVmstat(text);
      state.fixLatency.vmstat = samples;
      runFixCorrelation();
      toast("vmstat loaded", `${samples.length} samples parsed from ${file.name}. CPU/scheduling correlation active.`);
      render();
      requestAnimationFrame(drawFixCharts);
    });
  });
  document.querySelector("#fixNstatFileInput")?.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const { samples } = parseNstatTimestamped(text);
      state.fixLatency.nstat = samples;
      runFixCorrelation();
      toast("nstat loaded", `${samples.length} per-second samples parsed from ${file.name}. Kernel/network correlation active.`);
      render();
      requestAnimationFrame(drawFixCharts);
    });
  });
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

// === DELEGATED EVENT HANDLING (installed once, never re-attached) ===
document.addEventListener("keydown", event => {
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.isContentEditable) return;
  if (event.key === "Escape") {
    if (state.onboarding >= 0) { state.onboarding = -1; localStorage.setItem("networkExpertOnboarded", "1"); render(); return; }
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
  const file = e.dataTransfer?.files?.[0];
  if (file) importFile(file);
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
