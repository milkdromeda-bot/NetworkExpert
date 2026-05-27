export function createAlertingRendering(ctx) {
  const {
    state,
    icons,
    escapeHtml,
    formatNumber,
    formatMetricValue,
    alphabeticalMetrics,
    metricLabel
  } = ctx;

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

  return { renderAlerting };
}
