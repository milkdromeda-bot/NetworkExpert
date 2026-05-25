export function renderPrefsView(ctx = {}) {
  const {
    state = {},
    html = (strings, ...values) => strings.map((part, index) => part + (values[index] ?? "")).join(""),
    icons = {},
    escapeHtml = value => String(value ?? ""),
    formatNumber = value => String(value ?? ""),
    resolvedNumberLocale = () => "auto",
    hasRealTimestampHistory = () => false,
    chartTooltipOpacity = () => 0.8,
    renderTimeZoneOptions = () => "",
    renderDashboardPresetOptions = () => "",
    ACCESS_ROLES = {},
    UBUNTU_PROFILES = {},
    LINUX_PROFILES = {},
    linuxProfileLabel = () => "",
    accessRoleLabel = () => "",
    ubuntuProfileLabel = () => ""
  } = ctx;
  const prefs = state.prefs || {};
  const tab = state.prefsTab || "display";
  const realTimeline = hasRealTimestampHistory();
  const tooltipOpacity = chartTooltipOpacity();
  const localeChoices = [
    ["auto", `Browser default (${resolvedNumberLocale()})`],
    ["en-US", "English - United States"],
    ["fr-FR", "French - France"],
    ["de-DE", "German - Germany"],
    ["en-GB", "English - United Kingdom"]
  ];

  return html`<div class="prefs-shell">
    <div class="app-tabs" style="margin-bottom:12px">
      ${[
        ["display", "Display"],
        ["table", "Table"],
        ["charts", "Charts"],
        ["system", "System"],
        ["alerts", "Alerts"]
      ].map(([key, label]) => `<button class="app-tab ${tab === key ? "active" : ""}" data-pref-tab="${key}">${label}</button>`).join("")}
    </div>
    <div class="pref-grid professional">
      ${tab === "display" ? `<article class="field-card">
        <strong>Number and visual formatting</strong>
        <p class="hint">All counters, queues, chart ticks, threshold summaries, file sizes, and pagination totals use this locale-aware formatter.</p>
        <label>Number locale<select id="prefNumberLocale">${localeChoices.map(([value, label]) => `<option value="${value}" ${prefs.numberLocale === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <label class="check"><input id="prefNumberGrouping" type="checkbox" ${prefs.numberGrouping ? "checked" : ""}/> Use thousands separators</label>
        <label class="check"><input id="prefColorBlind" type="checkbox" ${prefs.colorBlind ? "checked" : ""}/> Enhanced color-blind palette</label>
        <div class="format-preview"><span>Preview</span><strong>${formatNumber(1048576)}</strong><strong>${formatNumber(262144.75)}</strong></div>
      </article>` : ""}
      ${tab === "table" ? `<article class="field-card">
        <strong>Table ergonomics</strong>
        <label class="check"><input id="prefCompact" type="checkbox" ${prefs.compactRows ? "checked" : ""}/> Compact tables</label>
        <label class="check"><input id="prefTableUnits" type="checkbox" ${prefs.tableUnits ? "checked" : ""}/> Show units in table cells</label>
        <label>Pagination controls position<select id="prefPagination">${["top", "bottom", "both"].map(v => `<option value="${v}" ${prefs.paginationPosition === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label>Default rows per page<select id="prefPageSize">${[10, 20, 50, 100].map(v => `<option value="${v}" ${prefs.defaultPageSize === v ? "selected" : ""}>${v} rows</option>`).join("")}</select></label>
        <div class="pref-button-row">
          <button data-action="columns">${icons.columns || ""} Configure columns</button>
          <button data-action="resetGrid">${icons.reset || ""} Reset grid</button>
        </div>
      </article>` : ""}
      ${tab === "charts" ? `<article class="field-card">
        <strong>Chart defaults</strong>
        <p class="hint">Timestamped captures always use their real timestamps. Synthetic settings are only a fallback for a single non-timestamped ss snapshot.</p>
        <label>Chart timezone<select id="prefChartTimeZone">${renderTimeZoneOptions()}</select></label>
        <label>Point size<select id="prefChartPointSize">
          ${["XS", "S", "M", "L"].map(size => `<option value="${size}" ${prefs.chartPointSize === size ? "selected" : ""}>${size}${size === "XS" ? " - 1 px" : ""}</option>`).join("")}
        </select></label>
        <label>Default expert preset<select id="prefDefaultDashboardPreset">${renderDashboardPresetOptions(prefs.defaultDashboardPreset)}</select></label>
        <label class="range-preference"><span>Crosshair tooltip background</span><input id="prefTooltipOpacity" type="range" min="0.35" max="1" step="0.05" value="${tooltipOpacity}"/><small><b>${Math.round(tooltipOpacity * 100)}%</b> opacity - 80% keeps the label readable while revealing the curve behind it.</small></label>
        <div class="synthetic-pref ${realTimeline ? "disabled" : ""}">
          <div>
            <strong>Fallback for data without timestamps</strong>
            <p class="hint">${realTimeline ? "Current workspace has real timestamps, so this fallback is not used." : "Used only to draw a visual preview when the pasted ss data has no timestamped samples."}</p>
          </div>
          <div class="range-row"><label>Preview points</label><input id="prefWindow" type="number" min="6" max="240" value="${prefs.graphWindow}" ${realTimeline ? "disabled" : ""}/></div>
        </div>
        <button data-action="thresholds">${icons.threshold || ""} Configure thresholds</button>
        <button data-action="layoutPrefs">${icons.layout || ""} Configure chart layout</button>
      </article>` : ""}
      ${tab === "system" ? `<article class="field-card">
        <strong>Linux collection target</strong>
        <p class="hint">These settings adapt collection commands, Advisor recommendations, and namespace warnings. They do not change the parsed ss data.</p>
        <label>Runtime profile<select id="prefLinuxProfile">
          <option value="lxc" ${prefs.linuxProfile === "lxc" ? "selected" : ""}>Linux Container LXC/LXD</option>
          <option value="native" ${prefs.linuxProfile === "native" ? "selected" : ""}>Linux Ubuntu native</option>
        </select></label>
        <label>Access role<select id="prefAccessRole">
          ${Object.entries(ACCESS_ROLES).map(([value, role]) => `<option value="${value}" ${prefs.accessRole === value ? "selected" : ""}>${role.label}</option>`).join("")}
        </select></label>
        <label>Ubuntu baseline<select id="prefUbuntuVersion">
          ${Object.entries(UBUNTU_PROFILES).map(([value, label]) => `<option value="${value}" ${prefs.ubuntuVersion === value ? "selected" : ""}>${label}</option>`).join("")}
        </select></label>
        <div class="system-note">
          <strong>${escapeHtml(linuxProfileLabel())} - ${escapeHtml(accessRoleLabel())} - ${escapeHtml(ubuntuProfileLabel())}</strong>
          <p>${escapeHtml(ACCESS_ROLES[prefs.accessRole]?.note || ACCESS_ROLES.analyst?.note || "")}</p>
          <p>${escapeHtml(LINUX_PROFILES[prefs.linuxProfile]?.note || LINUX_PROFILES.lxc?.note || "")}</p>
        </div>
      </article>` : ""}
      ${tab === "alerts" ? `<article class="field-card">
        <strong>Alert behavior</strong>
        <label class="check"><input id="prefDeepAnalysis" type="checkbox" ${prefs.deepAnalysis ? "checked" : ""}/> Run advanced advisor in the background</label>
        <label>Anomaly visibility floor<select id="prefSeverity">${["low", "medium", "high", "critical"].map(s => `<option ${prefs.severityFloor === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        <label class="check"><input id="prefToast" type="checkbox" ${prefs.autoToast ? "checked" : ""}/> Automatic toasts for important anomalies</label>
      </article>` : ""}
    </div>
    <div class="pref-actions"><button class="primary" data-action="savePrefs">${icons.saveDisk || ""} Save preferences</button></div>
  </div>`;
}
