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

function renderJvmGcPanel() { return advancedCorrelationPanels.renderJvmGcPanel(); }
function runJvmCorrelation() { return advancedCorrelationPanels.runJvmCorrelation(); }
function drawJvmCharts(deps) { return advancedCorrelationPanels.drawJvmCharts(deps); }
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
  return renderServiceMapView({
    state,
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
    snapshotCount: parsedTimestampSnapshots().length,
    buildServiceMapForSnapshot: (idx) => {
      const snapshots = parsedTimestampSnapshots();
      if (idx == null || !snapshots[idx]) return null;
      return buildServiceMapData({
        sockets: snapshots[idx].sockets.map(s => ({ ...s, id: s.id || `${s.local}-${s.peer}` })),
        anomalyMap: anomaliesBySocketId(),
        topology: state.topology,
        endpointPresentation,
        topologyGroupForEndpoint,
        riskRank,
        socketBandwidth,
        sortCollator: SERVICE_MAP_SORT_COLLATOR
      });
    }
  });
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
  return renderTimelineStoriesViewModel(stories, {
    state,
    escapeHtml,
    storyStepMetric
  });
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
