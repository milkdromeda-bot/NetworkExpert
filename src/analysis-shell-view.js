export const ANALYSIS_TAB_ICONS = {
  quality: "ri-shield-check-line",
  diagnosis: "ri-stethoscope-line",
  advisor: "ri-lightbulb-line",
  templates: "ri-layout-grid-line",
  map: "ri-mind-map",
  conversations: "ri-chat-3-line",
  expert: "ri-brain-line",
  timeline: "ri-time-line",
  alerts: "ri-alarm-warning-line",
  compare: "ri-scales-3-line",
  sockets: "ri-plug-line",
  groups: "ri-folder-line",
  anomalies: "ri-error-warning-line",
  fields: "ri-list-settings-line"
};

export function analysisTabGuide(tabs = [], tabId) {
  const list = Array.isArray(tabs) ? tabs : [];
  return list.find(tab => tab.id === tabId) || list[0];
}

export function renderAnalysisTabsView(ctx = {}) {
  const {
    tabs = [],
    activeTab = "",
    collapsed = false,
    escapeHtml = value => String(value ?? "")
  } = ctx;

  return `<div class="tabs analysis-tabs ${collapsed ? "collapsed" : ""}" role="tablist" aria-label="Analysis views">
    <button class="icon sidebar-toggle" data-action="toggleAnalysisSidebar" title="${collapsed ? "Expand tabs" : "Collapse tabs"}"><i class="${collapsed ? "ri-menu-unfold-line" : "ri-menu-fold-line"}"></i></button>
    <div class="analysis-tab-scroll">
      ${tabs.map((tab, idx) => `<button class="tab analysis-tab ${activeTab === tab.id ? "active" : ""}" data-tab="${escapeHtml(tab.id)}" data-key-hint="${idx < 9 ? idx + 1 : ""}" role="tab" aria-selected="${activeTab === tab.id ? "true" : "false"}" aria-label="${escapeHtml(`${tab.label}: ${tab.short}`)}" title="${escapeHtml(tab.short)}">
        <i class="${ANALYSIS_TAB_ICONS[tab.id] || "ri-checkbox-blank-circle-line"}"></i><span class="nav-label">${escapeHtml(tab.label)}</span>
      </button>`).join("")}
    </div>
  </div>`;
}

export function renderAnalysisPageView(ctx = {}) {
  const {
    state = {},
    html = (strings, ...values) => strings.map((part, index) => part + (values[index] ?? "")).join(""),
    icons = {},
    escapeHtml = value => String(value ?? ""),
    formatNumber = value => String(value ?? ""),
    formatMetricValue = (metric, value) => `${value} ${metric}`,
    renderExportMenu = () => "",
    renderAnalysisTabs = () => "",
    renderActiveTab = () => "",
    healthScore = null
  } = ctx;
  const sockets = state.sockets || [];
  const anomalies = state.anomalies || [];
  const table = state.table || { filters: { text: "" } };
  const deepAnalysisOn = Boolean(state.prefs?.deepAnalysis);
  const deepAnalysisTitle = deepAnalysisOn
    ? "Deep analysis is on. Click to pause the background advisor."
    : "Deep analysis is paused. Click to enable the background advisor.";
  const criticalCount = anomalies.filter(a => a.severity === "critical").length;
  const totalSendQ = sockets.reduce((sum, socket) => sum + (socket.sendQ || 0), 0);
  const totalDrops = sockets.reduce((sum, socket) => sum + (socket.details?.skmem?.d || 0), 0);
  const hs = healthScore;

  return html`
    <section class="kpis compact">
      ${hs ? `<span class="kpi-inline health-score-kpi grade-${hs.grade}" title="Health: ${hs.breakdown.critical} critical, ${hs.breakdown.high} high, ${hs.breakdown.medium} medium, ${hs.breakdown.low} low, ${hs.breakdown.healthy} healthy"><label>Health</label><strong>${hs.score}<small>/100</small></strong><span class="health-grade">${hs.grade}</span></span>` : ""}
      <span class="kpi-inline"><label>Sockets</label><strong data-countup="${sockets.length}">${formatNumber(sockets.length)}</strong></span>
      <span class="kpi-inline"><label>Critical</label><strong data-countup="${criticalCount}">${formatNumber(criticalCount)}</strong></span>
      <span class="kpi-inline"><label>Send-Q</label><strong>${formatMetricValue("sendQ", totalSendQ)}</strong></span>
      <span class="kpi-inline"><label>Drops</label><strong data-countup="${totalDrops}">${formatMetricValue("skmem.d", totalDrops)}</strong></span>
    </section>
    <section class="analysis-layout">
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">Detected sockets</div>
          <div class="toolbar">
            <button data-action="toggleDeepAnalysis" class="deep-analysis-toggle ${deepAnalysisOn ? "is-on" : "is-off"}" role="switch" aria-checked="${deepAnalysisOn ? "true" : "false"}" title="${escapeHtml(deepAnalysisTitle)}">
              <span class="deep-analysis-icon"><i class="ri-brain-line"></i></span>
              <span class="deep-analysis-label"><strong>Deep analysis</strong><small>${deepAnalysisOn ? "On" : "Paused"}</small></span>
              <span class="deep-analysis-switch" aria-hidden="true"><span></span></span>
            </button>
            <button data-action="setBaseline" title="Use current parsed sockets as before baseline"><i class="ri-scales-3-line"></i> Set baseline</button>
            ${renderExportMenu("analysis")}
            <input id="searchInput" placeholder='Filter: state:ESTAB risk>=high port:443 process:nginx rtt>100' value="${escapeHtml(table.filters?.text || "")}" />
            <button class="icon" data-action="details" title="Socket details">${icons.activity || ""}</button>
          </div>
        </div>
        ${renderAnalysisTabs()}
        <div class="panel-body">${renderActiveTab()}</div>
      </div>
    </section>
  `;
}
