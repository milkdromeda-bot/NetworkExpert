export function createInvestigationSummaryController(getDeps) {
  const current = () => getDeps();

  function selectedSocket() {
    const { socketsById, state } = current();
    return state.activeContextId ? socketsById().get(state.activeContextId) || null : null;
  }

  function syncChartHistoryToSelection() {
    const { buildHistory, clearVisibleHistoryCache } = current();
    buildHistory();
    clearVisibleHistoryCache();
  }

  function focusSocket(socketId, reason = "Selected by user") {
    const { setActiveInvestigation, state } = current();
    if (!socketId) return;
    state.selectedId = socketId;
    setActiveInvestigation(state, socketId, reason);
    syncChartHistoryToSelection();
  }

  function renderInvestigationContext() {
    const { anomaliesBySocketId, escapeHtml, formatMetricValue, formatNumber, icons, metricValue, severityRank, socketBandwidth, state } = current();
    const socket = selectedSocket();
    if (!socket) return "";
    const socketAnomalies = state.anomalies.filter(anomaly => anomaly.socketId === socket.id);
    const topAnomaly = socketAnomalies.slice().sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];
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
    return current().inferApplicationService(socket);
  }

  function currentApplicationService(socket) {
    const { applyServiceOverride, state } = current();
    return applyServiceOverride(socket, state.serviceOverrides, state.sourceName, inferredApplicationService(socket));
  }

  function currentApplicationServiceSortKey(socket = {}) {
    const app = currentApplicationService(socket);
    if (!app || app.source === "suppressed") return "";
    return `${app.label} ${app.port || ""}`.trim();
  }

  function renderApplicationServiceChip(socket, extraClass = "") {
    const { escapeHtml } = current();
    const app = currentApplicationService(socket);
    if (!app) return "";
    const side = app.side === "local" ? "local port" : "peer port";
    const source = app.source === "override" ? "Analyst override" : app.source === "suppressed" ? "Port heuristic suppressed" : "Inferred from port";
    const title = app.source === "override"
      ? `${app.label} set by analyst override for this recording. ${app.description}`
      : app.source === "suppressed"
        ? "Port-based inference hidden by analyst override. Original heuristic is no longer shown for this scope."
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
    const { anomaliesBySocketId, buildGuidedChecklistItems, formatMicroburstWindow, formatTailLatencyWindow, microburstSummary, tailLatencyLens, thresholdFor } = current();
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
    const { escapeHtml, icons, state } = current();
    const items = guidedChecklistItems(socket);
    if (!items.length) return "";
    const collapsed = state.prefs.guidedChecklistCollapsed !== false;
    const summary = `${items.length} next step${items.length > 1 ? "s" : ""} - ${items[0].severity} - ${items[0].title}`;
    return `<div class="guided-checklist ${collapsed ? "collapsed" : "expanded"}" aria-label="Next best step checklist">
    <div class="guided-checklist-head">
      <div class="guided-checklist-title"><span class="tooltip-kicker">Guided checklist</span><strong>Next best step</strong><p class="hint">This panel turns the current socket evidence into concrete investigation moves, so you can avoid hopping between tabs without a hypothesis.</p></div>
      <div class="guided-checklist-tools"><span class="guided-checklist-summary">${escapeHtml(summary)}</span><button class="icon" data-action="toggleGuidedChecklist" aria-expanded="${collapsed ? "false" : "true"}" title="${collapsed ? "Expand guided checklist" : "Collapse guided checklist"}">${collapsed ? icons.down : icons.up}</button></div>
    </div>
    <div class="guided-checklist-grid">
      ${items.map(item => `<article class="guided-checklist-card ${item.severity}"><header><span class="risk ${item.severity}">${escapeHtml(item.severity)}</span><strong>${escapeHtml(item.title)}</strong></header><p>${escapeHtml(item.why)}</p><small>${escapeHtml(item.next)}</small><footer><button data-action="${item.action}" ${item.preset ? `data-dashboard-preset-jump="${escapeHtml(item.preset)}"` : ""}>${icons.focus} ${escapeHtml(item.actionLabel)}</button></footer></article>`).join("")}
    </div>
  </div>`;
  }

  function executiveSummarySignal() {
    const { anomaliesBySocketId, buildExecutiveSummary, formatMetricValue, formatMicroburstWindow, formatTailLatencyWindow, microburstSummary, pickExecutiveFocusSocket, sortedFilteredSockets, state, tailLatencyLens } = current();
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
    const { anomaliesBySocketId, escapeHtml, formatNumber, sortedFilteredSockets, state } = current();
    const rows = sortedFilteredSockets();
    const summary = executiveSummarySignal();
    if (!summary) return "";
    const focusSocket = summary.focusSocket;
    const anomalyMap = anomaliesBySocketId();
    const visibleAnomalies = focusSocket ? anomalyMap.get(focusSocket.id)?.length || 0 : state.anomalies.length;
    const criticalCount = state.anomalies.filter(item => item.severity === "critical").length;
    const checklist = focusSocket ? guidedChecklistItems(focusSocket) : [];
    const cards = [
      { label: "Dominant signal", value: summary.title, detail: summary.summary, tone: summary.severity },
      { label: "Focus flow", value: focusSocket ? `${focusSocket.local} -> ${focusSocket.peer}` : "No selected flow", detail: focusSocket ? `${focusSocket.family} / ${focusSocket.state} / ${summary.process}` : "Select a row to anchor the investigation on one socket.", tone: focusSocket?.risk || "low" },
      { label: "Visible scope", value: `${formatNumber(rows.length)} socket${rows.length > 1 ? "s" : ""}`, detail: `${formatNumber(visibleAnomalies)} anomaly signal(s) on the current focus${criticalCount ? ` - ${formatNumber(criticalCount)} critical globally` : ""}.`, tone: criticalCount ? "critical" : summary.severity },
      { label: "Next best step", value: checklist[0]?.actionLabel || "Open charts or advisor", detail: summary.next, tone: checklist[0]?.severity || summary.severity }
    ];
    return `<section class="executive-summary ${summary.severity}" aria-label="Incident snapshot">
    <div class="executive-summary-head"><div><span class="tooltip-kicker">Incident snapshot</span><h2>${escapeHtml(summary.headline)}</h2><p>${escapeHtml(summary.summary)}</p></div><div class="executive-summary-badge ${summary.severity}"><span>${escapeHtml(summary.severity)}</span><strong>${escapeHtml(summary.title)}</strong></div></div>
    <div class="executive-summary-grid">${cards.map(card => `<article class="executive-summary-card ${card.tone}"><span>${escapeHtml(card.label)}</span><strong>${escapeHtml(card.value)}</strong><small>${escapeHtml(card.detail)}</small></article>`).join("")}</div>
  </section>`;
  }

  return {
    currentApplicationService,
    currentApplicationServiceSortKey,
    executiveSummarySignal,
    focusSocket,
    guidedChecklistItems,
    inferredApplicationService,
    renderApplicationServiceChip,
    renderExecutiveSummary,
    renderGuidedChecklistPanel,
    renderInvestigationContext,
    selectedSocket,
    syncChartHistoryToSelection
  };
}
