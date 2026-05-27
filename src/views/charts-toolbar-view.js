export function renderChartsGlobalToolbar(ctx) {
  const { state, icons, escapeHtml, renderExportMenu, renderTimeZoneOptions, zoomDateTimeValue } = ctx;
  const styles = [
    { id: "line", icon: "ri-line-chart-line", label: "Line" },
    { id: "area", icon: "ri-bar-chart-grouped-line", label: "Area" },
    { id: "bars", icon: "ri-bar-chart-line", label: "Bars" },
    { id: "points", icon: "ri-drag-move-2-fill", label: "Points" }
  ];
  const activeStyle = styles.find(s => s.id === state.prefs.graphStyle) || styles[0];
  const open = state.openStyleMenu;
  return `<div class="charts-global-toolbar">
    <div class="chart-tool-group">
      <div class="style-picker">
        <button class="style-picker-trigger" data-style-toggle title="Chart style: ${activeStyle.label}"><i class="${activeStyle.icon}"></i><span>${activeStyle.label}</span><i class="ri-arrow-down-s-line"></i></button>
        <div class="style-picker-menu ${open ? "open" : ""}" role="listbox">${styles.map(s => `<button class="style-picker-option ${s.id === state.prefs.graphStyle ? "selected" : ""}" data-style-choice="${s.id}" role="option"><i class="${s.icon}"></i><span>${s.label}</span></button>`).join("")}</div>
      </div>
    </div>
    <div class="chart-tool-group">
      <button data-action="thresholds">${icons.threshold} Thresholds</button>
      ${renderExportMenu("charts")}
      <div class="app-tabs" role="radiogroup" aria-label="Metrics view mode" style="padding:3px;gap:2px;margin-left:6px">
        <button class="app-tab ${state.metricsView !== "table" ? "active" : ""}" data-action="setMetricsView" data-metrics-view="charts" title="Charts view"><i class="ri-bar-chart-box-line"></i></button>
        <button class="app-tab ${state.metricsView === "table" ? "active" : ""}" data-action="setMetricsView" data-metrics-view="table" title="Stats table"><i class="ri-table-line"></i></button>
      </div>
    </div>
    <div class="chart-tool-group chart-time-group">
      <label class="chart-time-field">TZ <select id="chartTimeZoneSelect" title="Chart timezone">${renderTimeZoneOptions()}</select></label>
      <span class="chart-tool-separator" aria-hidden="true"></span>
      <label class="chart-time-field">Start <input id="startTimeInput" type="datetime-local" step="1" value="${zoomDateTimeValue("start")}"/></label>
      <label class="chart-time-field">End <input id="endTimeInput" type="datetime-local" step="1" value="${zoomDateTimeValue("end")}"/></label>
    </div>
    <div class="chart-tool-group">
      <button data-action="layoutPrefs">${icons.layout} Layout</button>
      <button class="icon" data-action="details" title="Details">${icons.activity}</button>
    </div>
  </div>`;
}
