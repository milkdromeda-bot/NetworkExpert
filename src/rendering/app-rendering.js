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
import { createAppAnalysisState } from "./app-analysis-state.js";
import { createAppRenderingContext } from "./app-rendering-context.js";

export function createAppRendering(getDeps) {
  const {
    state, ctx, icons, document, window, performance,
    ACCESS_ROLES, ANALYSIS_TAB_GUIDE, ANALYSIS_TEMPLATES, DASHBOARD_PRESETS, EXPERT_CORRELATIONS, EXPERT_DEFAULT_THRESHOLDS,
    FIELD_DOCS, FIELD_GUIDANCE, LINUX_PROFILES, PRE_IMPORT_PRESETS, SERVICE_MAP_SORT_COLLATOR, TABLE_COLUMNS,
    UBUNTU_PROFILES, advancedCorrelationPanels, APP_VERSION, APP_SPLASH_IMAGE, html, ingestViewDependencies,
    renderIngestPageView, renderAnalysisPageView, renderExportMenu, renderAnalysisTabs, computeHealthScore, _renderChartsGlobalToolbar,
    _renderAdvisorGlobalSummary, _renderMetricsStatsTable, chartMetricList, alphabeticalMetrics, microburstSummary, formatMicroburstWindow,
    metricLabel, orderedChartMetrics, clampChartColumns, hasRealTimestampHistory, renderInvestigationContext, formatMetricValue,
    renderMetricChartLegend, renderChartMoveMenu, _renderDashboardPresetPicker, _renderDashboardStudioInline, _renderDashboardStudio, tailLatencyLens,
    formatTailLatencyWindow, numberFormatter, formatNumber, visibleHistory, socketsById, analyzeBdpWindowLimit,
    normalizeBdpDirection, configuredLinkCapacityMbps, thresholdFor, formatBitsPerSecond, bdpChartSeries, metricUnit,
    metricColor, formatMetricNumber, renderTableMetricCell, thresholdSeverity, renderPercentileDistribution, metricSource,
    metricInterpretation, metricCorrelations, metricReliabilityProfile, metricDiagnosticGuidance, escapeHtml, render,
    buildAiSummary, analyzeCaptureQuality, renderCaptureQualityReportView, buildDiagnosticHypotheses, buildRootCauseMatrix, detectCwndPhases,
    buildSparklineIndex, socketIdentityKey, anomaliesBySocketId, riskRank, resolvePlaybook, playbookForHypothesis,
    runAdvisorAnalysis, renderSocketTableView, tableSettingsPlacement, buildSocketOptionSets, tableDefaults, visibleColumns,
    sortedFilteredSockets, tableStateSnapshot, renderTableSettingsTriggerView, renderTableSettingsDrawerView, renderTableSettingsMenuView, renderTableHeader,
    getColumn, columnHelpView, renderThresholdSummaryView, renderColumnTooltipView, pagedRows, groupedSockets,
    buildConversations, conversationAnomalySummary, renderConversationSortHeader, currentAliasForEndpoint, aliasCountForSource, aliasForEndpoint,
    aliasListForSource, ipIntelSummary, ipIntelDetail, buildServiceMap, buildServiceMapData, buildServiceMapRoutes,
    layoutTopologyLanePositions, renderGeoMapSvg, buildGeoMarkers, renderSankeySvg, orderServiceMapConnectivity, serviceMapGroupBands,
    endpointHost, topologyGroupForEndpoint, topologyScopeKey, nodeLabel, nodeSubtitle, mapNodeTitle,
    renderMapLegend, renderHotPaths, renderMapEdgeInsight, buildExpertInformation, buildTimelineEvents, cachedStories,
    cachedMultiSocket, cachedRateAlerts, detectTrends, formatTimelineTime, formatTimelineOffset, renderHeatmapView,
    renderTimelineStoriesViewModel, severityVisible, defaultAlertRules, baselineDeviations, buildComparison, buildBaselineNarrative,
    _renderBaselineNarrative, _renderDelta, selectedSocket, metricValue, renderApplicationServiceChip, currentApplicationService,
    currentSourceAnnotations, annotationTypeList, buildAnnotationDraft, annotationAnchorOptions, annotationMetricChoices, annotationDefaultLabel,
    annotationTypeLabel, createModalView, renderPrefsView, timeZoneOptions, createGuideView, normalizePreImportFilters,
    renderDashboardPresetOptions, renderDatalist, accessRoleLabel, linuxProfileLabel, ubuntuProfileLabel, hasActiveTableFilters,
    currentApplicationServiceSortKey, socketBandwidth, truncateMiddle, parsedTimestampSnapshots, chartTooltipOpacity, annotationSocketId,
    buildCorrelationMatrix, endpointPresentation, commandForPeer, envCommand, inferredApplicationService, normalizeAliasStore,
    normalizeTopologyProfile, numberFormatterWith, renderServiceMapView, resolvedNumberLocale, resolvedTimeZone, serviceOverrideForSocket,
    serviceMapConnectivityOrder, chartStats, isAnalystRole, isLxcProfile, timeLabel, analysisTabGuide
  } = createAppRenderingContext(getDeps);

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

const appAnalysisState = createAppAnalysisState(() => ({
  state,
  icons,
  escapeHtml,
  formatMetricValue,
  formatTailLatencyWindow,
  hasRealTimestampHistory,
  tailLatencyLens,
  analyzeCaptureQuality,
  formatNumber,
  numberFormatterWith,
  renderCaptureQualityReportView,
  buildDiagnosticHypotheses,
  configuredLinkCapacityMbps,
  normalizeBdpDirection,
  sortedFilteredSockets,
  thresholdFor,
  buildRootCauseMatrix,
  detectCwndPhases,
  buildSparklineIndex,
  metricValue,
  parsedTimestampSnapshots,
  socketIdentityKey
}));

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
  visibleHistory,
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
  return appAnalysisState.renderTailLatencyLensPanel();
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
  return appAnalysisState.captureQualityReport();
}

function renderCaptureQualityReport() {
  return appAnalysisState.renderCaptureQualityReport();
}

function diagnosticHypotheses() {
  return appAnalysisState.diagnosticHypotheses();
}

function cachedRootCauseMatrix() {
  return appAnalysisState.cachedRootCauseMatrix();
}

function cachedCwndPhases() {
  return appAnalysisState.cachedCwndPhases();
}

function lazySparklineIndex() {
  return appAnalysisState.lazySparklineIndex();
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
  ipIntelDetail,
  currentAliasForEndpoint
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
