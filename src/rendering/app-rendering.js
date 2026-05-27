import { createBdpPanelView } from "../views/bdp-panel-view.js";
import { createDiagnosisAdvisorView } from "../views/diagnosis-advisor-view.js";
import { createSocketTableRendering } from "../views/socket-table-rendering.js";
import { createConversationRendering } from "../views/conversation-rendering.js";
import { createTimelineRendering } from "../views/timeline-rendering.js";
import { createAlertingRendering } from "../views/alerting-rendering.js";
import { createAnomalyFieldsRendering } from "../views/anomaly-fields-rendering.js";
import { createConfigPanelsRendering } from "../views/config-panels-rendering.js";
import { createTooltipRendering } from "../views/tooltip-rendering.js";
import { createChartsPageRendering } from "../views/charts-page-rendering.js";
import { createComparisonRendering } from "../views/comparison-rendering.js";
import { createSocketDetailRendering } from "../views/socket-detail-rendering.js";
import { createServiceExpertRendering } from "../views/service-expert-rendering.js";
import { createAnalysisTemplatesRendering } from "../views/analysis-templates-rendering.js";
import { createModalShellRendering } from "../views/modal-shell-rendering.js";

export function createAppRendering(getDeps) {
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

  const state = proxiedObject("state");
  const ctx = proxiedObject("ctx");
  const icons = proxiedObject("icons");
  const document = proxiedObject("document");
  const window = proxiedObject("window");
  const performance = proxiedObject("performance");
  const ACCESS_ROLES = proxiedObject("ACCESS_ROLES");
  const ANALYSIS_TAB_GUIDE = proxiedObject("ANALYSIS_TAB_GUIDE");
  const ANALYSIS_TEMPLATES = proxiedObject("ANALYSIS_TEMPLATES");
  const DASHBOARD_PRESETS = proxiedObject("DASHBOARD_PRESETS");
  const EXPERT_CORRELATIONS = proxiedObject("EXPERT_CORRELATIONS");
  const EXPERT_DEFAULT_THRESHOLDS = proxiedObject("EXPERT_DEFAULT_THRESHOLDS");
  const FIELD_DOCS = proxiedObject("FIELD_DOCS");
  const FIELD_GUIDANCE = proxiedObject("FIELD_GUIDANCE");
  const LINUX_PROFILES = proxiedObject("LINUX_PROFILES");
  const PRE_IMPORT_PRESETS = proxiedObject("PRE_IMPORT_PRESETS");
  const SERVICE_MAP_SORT_COLLATOR = proxiedObject("SERVICE_MAP_SORT_COLLATOR");
  const TABLE_COLUMNS = proxiedObject("TABLE_COLUMNS");
  const UBUNTU_PROFILES = proxiedObject("UBUNTU_PROFILES");
  const advancedCorrelationPanels = proxiedObject("advancedCorrelationPanels");
  const APP_VERSION = proxiedValue("APP_VERSION");
  const APP_SPLASH_IMAGE = proxiedValue("APP_SPLASH_IMAGE");
  function html(...args) { return call("html", ...args); }
  function ingestViewDependencies(...args) { return call("ingestViewDependencies", ...args); }
  function renderIngestPageView(...args) { return call("renderIngestPageView", ...args); }
  function renderAnalysisPageView(...args) { return call("renderAnalysisPageView", ...args); }
  function renderExportMenu(...args) { return call("renderExportMenu", ...args); }
  function renderAnalysisTabs(...args) { return call("renderAnalysisTabs", ...args); }
  function computeHealthScore(...args) { return call("computeHealthScore", ...args); }
  function _renderChartsGlobalToolbar(...args) { return call("_renderChartsGlobalToolbar", ...args); }
  function _renderAdvisorGlobalSummary(...args) { return call("_renderAdvisorGlobalSummary", ...args); }
  function _renderMetricsStatsTable(...args) { return call("_renderMetricsStatsTable", ...args); }
  function chartMetricList(...args) { return call("chartMetricList", ...args); }
  function alphabeticalMetrics(...args) { return call("alphabeticalMetrics", ...args); }
  function microburstSummary(...args) { return call("microburstSummary", ...args); }
  function formatMicroburstWindow(...args) { return call("formatMicroburstWindow", ...args); }
  function metricLabel(...args) { return call("metricLabel", ...args); }
  function orderedChartMetrics(...args) { return call("orderedChartMetrics", ...args); }
  function clampChartColumns(...args) { return call("clampChartColumns", ...args); }
  function hasRealTimestampHistory(...args) { return call("hasRealTimestampHistory", ...args); }
  function renderInvestigationContext(...args) { return call("renderInvestigationContext", ...args); }
  function formatMetricValue(...args) { return call("formatMetricValue", ...args); }
  function renderMetricChartLegend(...args) { return call("renderMetricChartLegend", ...args); }
  function renderChartMoveMenu(...args) { return call("renderChartMoveMenu", ...args); }
  function _renderDashboardPresetPicker(...args) { return call("_renderDashboardPresetPicker", ...args); }
  function _renderDashboardStudioInline(...args) { return call("_renderDashboardStudioInline", ...args); }
  function _renderDashboardStudio(...args) { return call("_renderDashboardStudio", ...args); }
  function tailLatencyLens(...args) { return call("tailLatencyLens", ...args); }
  function formatTailLatencyWindow(...args) { return call("formatTailLatencyWindow", ...args); }
  function numberFormatter(...args) { return call("numberFormatter", ...args); }
  function formatNumber(...args) { return call("formatNumber", ...args); }
  function visibleHistory(...args) { return call("visibleHistory", ...args); }
  function socketsById(...args) { return call("socketsById", ...args); }
  function analyzeBdpWindowLimit(...args) { return call("analyzeBdpWindowLimit", ...args); }
  function normalizeBdpDirection(...args) { return call("normalizeBdpDirection", ...args); }
  function configuredLinkCapacityMbps(...args) { return call("configuredLinkCapacityMbps", ...args); }
  function thresholdFor(...args) { return call("thresholdFor", ...args); }
  function formatBitsPerSecond(...args) { return call("formatBitsPerSecond", ...args); }
  function bdpChartSeries(...args) { return call("bdpChartSeries", ...args); }
  function metricUnit(...args) { return call("metricUnit", ...args); }
  function metricColor(...args) { return call("metricColor", ...args); }
  function formatMetricNumber(...args) { return call("formatMetricNumber", ...args); }
  function renderTableMetricCell(...args) { return call("renderTableMetricCell", ...args); }
  function thresholdSeverity(...args) { return call("thresholdSeverity", ...args); }
  function renderPercentileDistribution(...args) { return call("renderPercentileDistribution", ...args); }
  function metricSource(...args) { return call("metricSource", ...args); }
  function metricInterpretation(...args) { return call("metricInterpretation", ...args); }
  function metricCorrelations(...args) { return call("metricCorrelations", ...args); }
  function metricReliabilityProfile(...args) { return call("metricReliabilityProfile", ...args); }
  function metricDiagnosticGuidance(...args) { return call("metricDiagnosticGuidance", ...args); }
  function escapeHtml(...args) { return call("escapeHtml", ...args); }
  function render(...args) { return call("render", ...args); }
  function buildAiSummary(...args) { return call("buildAiSummary", ...args); }
  function analyzeCaptureQuality(...args) { return call("analyzeCaptureQuality", ...args); }
  function renderCaptureQualityReportView(...args) { return call("renderCaptureQualityReportView", ...args); }
  function buildDiagnosticHypotheses(...args) { return call("buildDiagnosticHypotheses", ...args); }
  function buildRootCauseMatrix(...args) { return call("buildRootCauseMatrix", ...args); }
  function detectCwndPhases(...args) { return call("detectCwndPhases", ...args); }
  function buildSparklineIndex(...args) { return call("buildSparklineIndex", ...args); }
  function anomaliesBySocketId(...args) { return call("anomaliesBySocketId", ...args); }
  function riskRank(...args) { return call("riskRank", ...args); }
  function resolvePlaybook(...args) { return call("resolvePlaybook", ...args); }
  function playbookForHypothesis(...args) { return call("playbookForHypothesis", ...args); }
  function runAdvisorAnalysis(...args) { return call("runAdvisorAnalysis", ...args); }
  function renderSocketTableView(...args) { return call("renderSocketTableView", ...args); }
  function tableSettingsPlacement(...args) { return call("tableSettingsPlacement", ...args); }
  function buildSocketOptionSets(...args) { return call("buildSocketOptionSets", ...args); }
  function tableDefaults(...args) { return call("tableDefaults", ...args); }
  function visibleColumns(...args) { return call("visibleColumns", ...args); }
  function sortedFilteredSockets(...args) { return call("sortedFilteredSockets", ...args); }
  function tableStateSnapshot(...args) { return call("tableStateSnapshot", ...args); }
  function renderTableSettingsTriggerView(...args) { return call("renderTableSettingsTriggerView", ...args); }
  function renderTableSettingsDrawerView(...args) { return call("renderTableSettingsDrawerView", ...args); }
  function renderTableSettingsMenuView(...args) { return call("renderTableSettingsMenuView", ...args); }
  function renderTableHeader(...args) { return call("renderTableHeader", ...args); }
  function getColumn(...args) { return call("getColumn", ...args); }
  function columnHelpView(...args) { return call("columnHelpView", ...args); }
  function renderThresholdSummaryView(...args) { return call("renderThresholdSummaryView", ...args); }
  function renderColumnTooltipView(...args) { return call("renderColumnTooltipView", ...args); }
  function pagedRows(...args) { return call("pagedRows", ...args); }
  function groupedSockets(...args) { return call("groupedSockets", ...args); }
  function buildConversations(...args) { return call("buildConversations", ...args); }
  function conversationAnomalySummary(...args) { return call("conversationAnomalySummary", ...args); }
  function renderConversationSortHeader(...args) { return call("renderConversationSortHeader", ...args); }
  function currentAliasForEndpoint(...args) { return call("currentAliasForEndpoint", ...args); }
  function aliasCountForSource(...args) { return call("aliasCountForSource", ...args); }
  function aliasForEndpoint(...args) { return call("aliasForEndpoint", ...args); }
  function aliasListForSource(...args) { return call("aliasListForSource", ...args); }
  function ipIntelSummary(...args) { return call("ipIntelSummary", ...args); }
  function ipIntelDetail(...args) { return call("ipIntelDetail", ...args); }
  function buildServiceMap(...args) { return call("buildServiceMap", ...args); }
  function buildServiceMapData(...args) { return call("buildServiceMapData", ...args); }
  function buildServiceMapRoutes(...args) { return call("buildServiceMapRoutes", ...args); }
  function layoutTopologyLanePositions(...args) { return call("layoutTopologyLanePositions", ...args); }
  function renderGeoMapSvg(...args) { return call("renderGeoMapSvg", ...args); }
  function buildGeoMarkers(...args) { return call("buildGeoMarkers", ...args); }
  function renderSankeySvg(...args) { return call("renderSankeySvg", ...args); }
  function orderServiceMapConnectivity(...args) { return call("orderServiceMapConnectivity", ...args); }
  function serviceMapGroupBands(...args) { return call("serviceMapGroupBands", ...args); }
  function endpointHost(...args) { return call("endpointHost", ...args); }
  function topologyGroupForEndpoint(...args) { return call("topologyGroupForEndpoint", ...args); }
  function topologyScopeKey(...args) { return call("topologyScopeKey", ...args); }
  function nodeLabel(...args) { return call("nodeLabel", ...args); }
  function nodeSubtitle(...args) { return call("nodeSubtitle", ...args); }
  function mapNodeTitle(...args) { return call("mapNodeTitle", ...args); }
  function renderMapLegend(...args) { return call("renderMapLegend", ...args); }
  function renderHotPaths(...args) { return call("renderHotPaths", ...args); }
  function renderMapEdgeInsight(...args) { return call("renderMapEdgeInsight", ...args); }
  function buildExpertInformation(...args) { return call("buildExpertInformation", ...args); }
  function buildTimelineEvents(...args) { return call("buildTimelineEvents", ...args); }
  function cachedStories(...args) { return call("cachedStories", ...args); }
  function cachedMultiSocket(...args) { return call("cachedMultiSocket", ...args); }
  function cachedRateAlerts(...args) { return call("cachedRateAlerts", ...args); }
  function detectTrends(...args) { return call("detectTrends", ...args); }
  function formatTimelineTime(...args) { return call("formatTimelineTime", ...args); }
  function formatTimelineOffset(...args) { return call("formatTimelineOffset", ...args); }
  function renderHeatmapView(...args) { return call("renderHeatmapView", ...args); }
  function renderTimelineStoriesViewModel(...args) { return call("renderTimelineStoriesViewModel", ...args); }
  function severityVisible(...args) { return call("severityVisible", ...args); }
  function defaultAlertRules(...args) { return call("defaultAlertRules", ...args); }
  function baselineDeviations(...args) { return call("baselineDeviations", ...args); }
  function buildComparison(...args) { return call("buildComparison", ...args); }
  function buildBaselineNarrative(...args) { return call("buildBaselineNarrative", ...args); }
  function _renderBaselineNarrative(...args) { return call("_renderBaselineNarrative", ...args); }
  function _renderDelta(...args) { return call("_renderDelta", ...args); }
  function selectedSocket(...args) { return call("selectedSocket", ...args); }
  function metricValue(...args) { return call("metricValue", ...args); }
  function renderApplicationServiceChip(...args) { return call("renderApplicationServiceChip", ...args); }
  function currentApplicationService(...args) { return call("currentApplicationService", ...args); }
  function currentSourceAnnotations(...args) { return call("currentSourceAnnotations", ...args); }
  function annotationTypeList(...args) { return call("annotationTypeList", ...args); }
  function buildAnnotationDraft(...args) { return call("buildAnnotationDraft", ...args); }
  function annotationAnchorOptions(...args) { return call("annotationAnchorOptions", ...args); }
  function annotationMetricChoices(...args) { return call("annotationMetricChoices", ...args); }
  function annotationDefaultLabel(...args) { return call("annotationDefaultLabel", ...args); }
  function annotationTypeLabel(...args) { return call("annotationTypeLabel", ...args); }
  function createModalView(...args) { return call("createModalView", ...args); }
  function renderPrefsView(...args) { return call("renderPrefsView", ...args); }
  function timeZoneOptions(...args) { return call("timeZoneOptions", ...args); }
  function createGuideView(...args) { return call("createGuideView", ...args); }
  function normalizePreImportFilters(...args) { return call("normalizePreImportFilters", ...args); }
  function renderDashboardPresetOptions(...args) { return call("renderDashboardPresetOptions", ...args); }
  function renderDatalist(...args) { return call("renderDatalist", ...args); }
  function accessRoleLabel(...args) { return call("accessRoleLabel", ...args); }
  function linuxProfileLabel(...args) { return call("linuxProfileLabel", ...args); }
  function ubuntuProfileLabel(...args) { return call("ubuntuProfileLabel", ...args); }
  function hasActiveTableFilters(...args) { return call("hasActiveTableFilters", ...args); }
  function currentApplicationServiceSortKey(...args) { return call("currentApplicationServiceSortKey", ...args); }
  function socketBandwidth(...args) { return call("socketBandwidth", ...args); }
  function truncateMiddle(...args) { return call("truncateMiddle", ...args); }
  function parsedTimestampSnapshots(...args) { return call("parsedTimestampSnapshots", ...args); }
  function chartTooltipOpacity(...args) { return call("chartTooltipOpacity", ...args); }
  function annotationSocketId(...args) { return call("annotationSocketId", ...args); }
  function buildCorrelationMatrix(...args) { return call("buildCorrelationMatrix", ...args); }
  function endpointPresentation(...args) { return call("endpointPresentation", ...args); }
  function commandForPeer(...args) { return call("commandForPeer", ...args); }
  function envCommand(...args) { return call("envCommand", ...args); }
  function inferredApplicationService(...args) { return call("inferredApplicationService", ...args); }
  function normalizeAliasStore(...args) { return call("normalizeAliasStore", ...args); }
  function normalizeTopologyProfile(...args) { return call("normalizeTopologyProfile", ...args); }
  function numberFormatterWith(...args) { return call("numberFormatterWith", ...args); }
  function renderServiceMapView(...args) { return call("renderServiceMapView", ...args); }
  function resolvedNumberLocale(...args) { return call("resolvedNumberLocale", ...args); }
  function resolvedTimeZone(...args) { return call("resolvedTimeZone", ...args); }
  function serviceOverrideForSocket(...args) { return call("serviceOverrideForSocket", ...args); }
  function serviceMapConnectivityOrder(...args) { return call("serviceMapConnectivityOrder", ...args); }
  function chartStats(...args) { return call("chartStats", ...args); }
  function isAnalystRole(...args) { return call("isAnalystRole", ...args); }
  function isLxcProfile(...args) { return call("isLxcProfile", ...args); }
  function timeLabel(...args) { return call("timeLabel", ...args); }
  function analysisTabGuide(...args) { return call("analysisTabGuide", ...args); }

const bdpPanelView = createBdpPanelView({
  state,
  icons,
  numberFormatter,
  formatNumber,
  visibleHistory,
  socketsById,
  analyzeBdpWindowLimit,
  normalizeBdpDirection,
  configuredLinkCapacityMbps,
  thresholdFor,
  hasRealTimestampHistory,
  escapeHtml,
  formatBitsPerSecond,
  bdpChartSeries,
  renderChartInfo
});

function formatBytesHuman(...args) { return bdpPanelView.formatBytesHuman(...args); }
function bdpWindowAnalysis(...args) { return bdpPanelView.bdpWindowAnalysis(...args); }
function renderBdpSummaryCard(...args) { return bdpPanelView.renderBdpSummaryCard(...args); }
function renderBdpWindowPanel(...args) { return bdpPanelView.renderBdpWindowPanel(...args); }

let _cachedDiagVersion = -1;
let _cachedDiagHypotheses = [];
let _cachedMatrixVersion = -1;
let _cachedMatrix = null;
let _cachedCwndPhasesVersion = -1;
let _cachedCwndPhases = null;

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

const chartsPageRendering = createChartsPageRendering({
  state,
  icons,
  html,
  EXPERT_CORRELATIONS,
  escapeHtml,
  chartMetricList,
  alphabeticalMetrics,
  socketsById,
  clampChartColumns,
  hasRealTimestampHistory,
  orderedChartMetrics,
  microburstSummary,
  renderInvestigationContext,
  renderTailLatencyLensPanel,
  renderAdvisorGlobalSummary,
  formatMicroburstWindow,
  formatMetricValue,
  metricLabel,
  renderMetricsStatsTable,
  renderChartMetricTooltip,
  renderChartMoveMenu,
  renderMetricChartLegend
});

function renderChartsPage(...args) { return chartsPageRendering.renderChartsPage(...args); }

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

function renderJvmGcPanel() { return advancedCorrelationPanels.renderJvmGcPanel(); }
function runJvmCorrelation() { return advancedCorrelationPanels.runJvmCorrelation(); }
function drawJvmCharts(deps) { return advancedCorrelationPanels.drawJvmCharts(deps); }
const tooltipRendering = createTooltipRendering({
  state,
  document,
  window,
  EXPERT_DEFAULT_THRESHOLDS,
  escapeHtml,
  chartMetricList,
  thresholdFor,
  metricLabel,
  metricColor,
  metricSource,
  metricUnit,
  metricInterpretation,
  metricCorrelations,
  metricReliabilityProfile,
  metricDiagnosticGuidance,
  formatMetricValue,
  renderThresholdSummary,
  currentApplicationService,
  inferredApplicationService,
  chartTooltipOpacity,
  renderColumnTooltip,
  render
});

function renderChartInfo(...args) { return tooltipRendering.renderChartInfo(...args); }
function metricHelp(...args) { return tooltipRendering.metricHelp(...args); }
function renderChartMetricTooltip(...args) { return tooltipRendering.renderChartMetricTooltip(...args); }
function ensureFloatingChartTooltip(...args) { return tooltipRendering.ensureFloatingChartTooltip(...args); }
function positionFloatingChartTooltip(...args) { return tooltipRendering.positionFloatingChartTooltip(...args); }
function showFloatingChartTooltip(...args) { return tooltipRendering.showFloatingChartTooltip(...args); }
function hideFloatingChartTooltipSoon(...args) { return tooltipRendering.hideFloatingChartTooltipSoon(...args); }
function hideFloatingChartTooltipNow(...args) { return tooltipRendering.hideFloatingChartTooltipNow(...args); }
function ensureAppServiceTooltip(...args) { return tooltipRendering.ensureAppServiceTooltip(...args); }
function positionAppServiceTooltip(...args) { return tooltipRendering.positionAppServiceTooltip(...args); }
function showAppServiceTooltip(...args) { return tooltipRendering.showAppServiceTooltip(...args); }
function hideAppServiceTooltip(...args) { return tooltipRendering.hideAppServiceTooltip(...args); }
function ensureFloatingColumnTooltip(...args) { return tooltipRendering.ensureFloatingColumnTooltip(...args); }
function positionFloatingColumnTooltip(...args) { return tooltipRendering.positionFloatingColumnTooltip(...args); }
function showFloatingColumnTooltip(...args) { return tooltipRendering.showFloatingColumnTooltip(...args); }
function hideFloatingColumnTooltipSoon(...args) { return tooltipRendering.hideFloatingColumnTooltipSoon(...args); }
function hideFloatingColumnTooltipNow(...args) { return tooltipRendering.hideFloatingColumnTooltipNow(...args); }
function bindSmartChartTooltips(...args) { return tooltipRendering.bindSmartChartTooltips(...args); }
function bindColumnHelpTooltips(...args) { return tooltipRendering.bindColumnHelpTooltips(...args); }

function runFixCorrelation(callback) { return advancedCorrelationPanels.runFixCorrelation(callback); }
function renderFixLatencyPanel() { return advancedCorrelationPanels.renderFixLatencyPanel(); }
function drawFixCharts(deps) { return advancedCorrelationPanels.drawFixCharts(deps); }
function renderWhatIfSimulation() { return advancedCorrelationPanels.renderWhatIfSimulation(); }
function toggleFixPlayback() { return advancedCorrelationPanels.toggleFixPlayback(); }
function buildMultiSourceSummary(fix) { return advancedCorrelationPanels.buildMultiSourceSummary(fix); }
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

function cachedCwndPhases() {
  const key = `${state.dataVersion}|${state.selectedId}`;
  if (_cachedCwndPhasesVersion === key && _cachedCwndPhases) return _cachedCwndPhases;
  _cachedCwndPhasesVersion = key;
  _cachedCwndPhases = detectCwndPhases(state.history);
  return _cachedCwndPhases;
}

let _sparklineVersion = -1;
function lazySparklineIndex() {
  if (state.sparklineIndex && _sparklineVersion === state.dataVersion) return state.sparklineIndex;
  if (!hasRealTimestampHistory()) return null;
  const snapshots = parsedTimestampSnapshots();
  if (snapshots.length < 3 || snapshots.length > 300) return null; // skip for huge captures
  _sparklineVersion = state.dataVersion;
  state.sparklineIndex = buildSparklineIndex(snapshots, socketIdentityKey, metricValue);
  return state.sparklineIndex;
}

const diagnosisAdvisorView = createDiagnosisAdvisorView({
  state,
  icons,
  escapeHtml,
  formatNumber,
  diagnosticHypotheses,
  cachedRootCauseMatrix,
  captureQualityReport,
  buildAiSummary,
  cachedStories,
  cachedMultiSocket,
  cachedRateAlerts,
  buildBaselineNarrative,
  buildComparison,
  playbookForHypothesis,
  resolvePlaybook,
  detectTrends,
  renderWhatIfSimulation
});

function renderDiagnosis(...args) { return diagnosisAdvisorView.renderDiagnosis(...args); }
function renderRootCauseMatrix(...args) { return diagnosisAdvisorView.renderRootCauseMatrix(...args); }
function renderDiagnosticHypothesis(...args) { return diagnosisAdvisorView.renderDiagnosticHypothesis(...args); }
function renderDiagnosticPlaybook(...args) { return diagnosisAdvisorView.renderDiagnosticPlaybook(...args); }
function renderAdvisor(...args) { return diagnosisAdvisorView.renderAdvisor(...args); }
function renderRemediationWizard(...args) { return diagnosisAdvisorView.renderRemediationWizard(...args); }
function remediationForFinding(...args) { return diagnosisAdvisorView.remediationForFinding(...args); }
function renderAdvisorFinding(...args) { return diagnosisAdvisorView.renderAdvisorFinding(...args); }

const analysisTemplatesRendering = createAnalysisTemplatesRendering({
  ANALYSIS_TEMPLATES,
  icons,
  escapeHtml,
  formatNumber
});

function renderAnalysisTemplates(...args) { return analysisTemplatesRendering.renderAnalysisTemplates(...args); }

const socketTableRendering = createSocketTableRendering({
  state,
  html,
  icons,
  escapeHtml,
  formatNumber,
  formatMetricValue,
  FIELD_DOCS,
  TABLE_COLUMNS,
  renderSocketTableView,
  renderTableSettingsTriggerView,
  renderTableSettingsDrawerView,
  renderTableSettingsMenuView,
  renderTableHeader,
  tableDefaults,
  currentAliasForEndpoint,
  ipIntelSummary,
  ipIntelDetail,
  columnHelpView,
  thresholdFor,
  renderThresholdSummaryView,
  renderColumnTooltipView,
  buildSocketOptionSets,
  renderDatalist,
  hasActiveTableFilters,
  sortedFilteredSockets,
  pagedRows,
  visibleColumns
});

function renderSocketTable(...args) { return socketTableRendering.renderSocketTable(...args); }
function tableSettingsViewContext(...args) { return socketTableRendering.tableSettingsViewContext(...args); }
function renderTableSettingsTrigger(...args) { return socketTableRendering.renderTableSettingsTrigger(...args); }
function renderTableSettingsDrawer(...args) { return socketTableRendering.renderTableSettingsDrawer(...args); }
function renderTableSettingsMenu(...args) { return socketTableRendering.renderTableSettingsMenu(...args); }
function renderRowActions(...args) { return socketTableRendering.renderRowActions(...args); }
function renderEndpointCell(...args) { return socketTableRendering.renderEndpointCell(...args); }
function renderPeerCell(...args) { return socketTableRendering.renderPeerCell(...args); }
function renderHeader(...args) { return socketTableRendering.renderHeader(...args); }
function columnHelpContext(...args) { return socketTableRendering.columnHelpContext(...args); }
function columnHelp(...args) { return socketTableRendering.columnHelp(...args); }
function renderThresholdSummary(...args) { return socketTableRendering.renderThresholdSummary(...args); }
function renderColumnTooltip(...args) { return socketTableRendering.renderColumnTooltip(...args); }
function gridOptionSets(...args) { return socketTableRendering.gridOptionSets(...args); }
function renderGridControls(...args) { return socketTableRendering.renderGridControls(...args); }
function renderPagination(...args) { return socketTableRendering.renderPagination(...args); }

const conversationRendering = createConversationRendering({
  state,
  icons,
  window,
  escapeHtml,
  formatNumber,
  formatMetricValue,
  renderTableMetricCell,
  groupedSockets,
  pagedRows,
  renderPagination,
  renderGridControls,
  renderApplicationServiceChip,
  buildConversations,
  riskRank,
  renderConversationSortHeader,
  conversationAnomalySummary,
  metricLabel,
  ipIntelSummary,
  ipIntelDetail
});

function renderGroupedSockets(...args) { return conversationRendering.renderGroupedSockets(...args); }
function renderConversations(...args) { return conversationRendering.renderConversations(...args); }
function renderConversationAnomalyCell(...args) { return conversationRendering.renderConversationAnomalyCell(...args); }
function formatConversationAnomalyTitle(...args) { return conversationRendering.formatConversationAnomalyTitle(...args); }
function positionConversationInsight(...args) { return conversationRendering.positionConversationInsight(...args); }
function renderPeerEndpoint(...args) { return conversationRendering.renderPeerEndpoint(...args); }
function parseEndpointAddress(...args) { return conversationRendering.parseEndpointAddress(...args); }

const serviceExpertRendering = createServiceExpertRendering({
  state,
  icons,
  SERVICE_MAP_SORT_COLLATOR,
  buildServiceMap,
  serviceMapConnectivityOrder,
  layoutTopologyLanePositions,
  serviceMapGroupBands,
  buildServiceMapRoutes,
  riskRank,
  formatNumber,
  aliasCountForSource,
  renderMapLegend,
  escapeHtml,
  renderMapEdgeInsight,
  renderHotPaths,
  buildGeoMarkers,
  renderGeoMapSvg,
  renderSankeySvg,
  nodeSubtitle,
  truncateMiddle,
  nodeLabel,
  mapNodeTitle,
  parsedTimestampSnapshots,
  buildServiceMapData,
  anomaliesBySocketId,
  endpointPresentation,
  topologyGroupForEndpoint,
  socketBandwidth,
  buildExpertInformation,
  buildCorrelationMatrix,
  metricLabel,
  renderServiceMapView
});

function renderServiceMap(...args) { return serviceExpertRendering.renderServiceMap(...args); }
function renderExpertInformation(...args) { return serviceExpertRendering.renderExpertInformation(...args); }

const timelineRendering = createTimelineRendering({
  state,
  icons,
  ctx,
  escapeHtml,
  formatNumber,
  formatTimelineTime,
  formatTimelineOffset,
  buildTimelineEvents,
  cachedStories,
  cachedMultiSocket,
  cachedRateAlerts,
  riskRank,
  renderHeatmapView,
  renderTimelineStoriesViewModel
});

function renderTimeline(...args) { return timelineRendering.renderTimeline(...args); }
function storyStepMetric(...args) { return timelineRendering.storyStepMetric(...args); }
function renderTimelineHeatmap(...args) { return timelineRendering.renderTimelineHeatmap(...args); }
function renderTimelineStoriesView(...args) { return timelineRendering.renderTimelineStoriesView(...args); }
function renderTimelineEventsView(...args) { return timelineRendering.renderTimelineEventsView(...args); }
function renderTimelineStories(...args) { return timelineRendering.renderTimelineStories(...args); }

const alertingRendering = createAlertingRendering({
  state,
  icons,
  escapeHtml,
  formatNumber,
  formatMetricValue,
  alphabeticalMetrics,
  metricLabel
});

function renderAlerting(...args) { return alertingRendering.renderAlerting(...args); }

function renderBaselineNarrative(comparison) { return _renderBaselineNarrative(ctx, comparison); }

const comparisonRendering = createComparisonRendering({
  state,
  icons,
  escapeHtml,
  formatNumber,
  formatMetricValue,
  buildComparison,
  renderBaselineNarrative,
  renderDelta
});

function renderComparison(...args) { return comparisonRendering.renderComparison(...args); }

function renderDelta(metric, value) { return _renderDelta(ctx, metric, value); }

const anomalyFieldsRendering = createAnomalyFieldsRendering({
  state,
  FIELD_DOCS,
  FIELD_GUIDANCE,
  escapeHtml,
  formatNumber,
  formatMetricValue,
  metricLabel,
  thresholdFor
});

function renderAnomalies(...args) { return anomalyFieldsRendering.renderAnomalies(...args); }
function filteredAnomalies(...args) { return anomalyFieldsRendering.filteredAnomalies(...args); }
function renderFields(...args) { return anomalyFieldsRendering.renderFields(...args); }
function renderFieldDocCard(...args) { return anomalyFieldsRendering.renderFieldDocCard(...args); }
function renderFieldHealth(...args) { return anomalyFieldsRendering.renderFieldHealth(...args); }

const socketDetailRendering = createSocketDetailRendering({
  state,
  html,
  escapeHtml,
  formatMetricValue,
  metricLabel,
  metricValue,
  thresholdSeverity,
  socketsById,
  severityVisible,
  renderAnomalies,
  ipIntelSummary,
  ipIntelDetail
});

function renderRightPane(...args) { return socketDetailRendering.renderRightPane(...args); }
function renderSocketDetail(...args) { return socketDetailRendering.renderSocketDetail(...args); }
function renderMetricFields(...args) { return socketDetailRendering.renderMetricFields(...args); }
function renderPeerIntelCard(...args) { return socketDetailRendering.renderPeerIntelCard(...args); }
function socketInsights(...args) { return socketDetailRendering.socketInsights(...args); }
function renderSocketInsights(...args) { return socketDetailRendering.renderSocketInsights(...args); }

const modalShellRendering = createModalShellRendering({
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
});

function renderChartAnnotationMenu(...args) { return modalShellRendering.renderChartAnnotationMenu(...args); }
function renderDrawer(...args) { return modalShellRendering.renderDrawer(...args); }
function renderPrefs(...args) { return modalShellRendering.renderPrefs(...args); }
function renderTimeZoneOptions(...args) { return modalShellRendering.renderTimeZoneOptions(...args); }
function renderGuide(...args) { return modalShellRendering.renderGuide(...args); }
function modalView(...args) { return modalShellRendering.modalView(...args); }
function serviceAliasEndpointOptions(...args) { return modalShellRendering.serviceAliasEndpointOptions(...args); }
function selectedAliasTarget(...args) { return modalShellRendering.selectedAliasTarget(...args); }
function renderServiceAliasesModal(...args) { return modalShellRendering.renderServiceAliasesModal(...args); }
function renderServiceOverrideModal(...args) { return modalShellRendering.renderServiceOverrideModal(...args); }
function renderTopologyModal(...args) { return modalShellRendering.renderTopologyModal(...args); }
function renderModal(...args) { return modalShellRendering.renderModal(...args); }

const configPanelsRendering = createConfigPanelsRendering({
  state,
  icons,
  PRE_IMPORT_PRESETS,
  EXPERT_DEFAULT_THRESHOLDS,
  TABLE_COLUMNS,
  escapeHtml,
  formatNumber,
  formatMetricNumber,
  metricLabel,
  normalizePreImportFilters,
  renderDatalist,
  chartTooltipOpacity,
  chartMetricList,
  clampChartColumns
});

function renderPreImportFilters(...args) { return configPanelsRendering.renderPreImportFilters(...args); }
function renderLayoutPrefs(...args) { return configPanelsRendering.renderLayoutPrefs(...args); }
function renderThresholdConfig(...args) { return configPanelsRendering.renderThresholdConfig(...args); }
function renderColumnChooser(...args) { return configPanelsRendering.renderColumnChooser(...args); }

  return {
    renderIngestPage,
    renderAnalysisPage,
    renderChartsGlobalToolbar,
    renderAdvisorGlobalSummary,
    renderMetricsStatsTable,
    renderChartsPage,
    renderDashboardPresetPicker,
    renderDashboardStudioInline,
    renderDashboardStudio,
    renderTailLatencyLensPanel,
    formatBytesHuman,
    bdpWindowAnalysis,
    renderBdpSummaryCard,
    renderBdpWindowPanel,
    renderJvmGcPanel,
    runJvmCorrelation,
    drawJvmCharts,
    renderChartInfo,
    metricHelp,
    renderChartMetricTooltip,
    ensureFloatingChartTooltip,
    positionFloatingChartTooltip,
    showFloatingChartTooltip,
    hideFloatingChartTooltipSoon,
    hideFloatingChartTooltipNow,
    ensureAppServiceTooltip,
    positionAppServiceTooltip,
    showAppServiceTooltip,
    hideAppServiceTooltip,
    ensureFloatingColumnTooltip,
    positionFloatingColumnTooltip,
    showFloatingColumnTooltip,
    hideFloatingColumnTooltipSoon,
    hideFloatingColumnTooltipNow,
    bindSmartChartTooltips,
    bindColumnHelpTooltips,
    runFixCorrelation,
    renderFixLatencyPanel,
    drawFixCharts,
    renderWhatIfSimulation,
    toggleFixPlayback,
    buildMultiSourceSummary,
    renderActiveTab,
    captureQualityReport,
    renderCaptureQualityReport,
    diagnosticHypotheses,
    cachedRootCauseMatrix,
    cachedCwndPhases,
    lazySparklineIndex,
    renderDiagnosis,
    renderRootCauseMatrix,
    renderDiagnosticHypothesis,
    renderDiagnosticPlaybook,
    renderAdvisor,
    renderRemediationWizard,
    remediationForFinding,
    renderAdvisorFinding,
    renderAnalysisTemplates,
    renderSocketTable,
    tableSettingsViewContext,
    renderTableSettingsTrigger,
    renderTableSettingsDrawer,
    renderTableSettingsMenu,
    renderRowActions,
    renderEndpointCell,
    renderPeerCell,
    renderHeader,
    columnHelpContext,
    columnHelp,
    renderThresholdSummary,
    renderColumnTooltip,
    gridOptionSets,
    renderGridControls,
    renderPagination,
    renderGroupedSockets,
    renderConversations,
    renderConversationAnomalyCell,
    formatConversationAnomalyTitle,
    positionConversationInsight,
    renderPeerEndpoint,
    parseEndpointAddress,
    renderServiceMap,
    renderExpertInformation,
    renderTimeline,
    storyStepMetric,
    renderTimelineHeatmap,
    renderTimelineStoriesView,
    renderTimelineEventsView,
    renderTimelineStories,
    renderAlerting,
    renderBaselineNarrative,
    renderComparison,
    renderDelta,
    renderAnomalies,
    filteredAnomalies,
    renderFields,
    renderFieldDocCard,
    renderFieldHealth,
    renderRightPane,
    renderSocketDetail,
    renderMetricFields,
    renderPeerIntelCard,
    socketInsights,
    renderSocketInsights,
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
    renderModal,
    renderPreImportFilters,
    renderLayoutPrefs,
    renderThresholdConfig,
    renderColumnChooser
  };
}
