export function createSocketDetailRendering(ctx) {
  const {
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
  } = ctx;

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

  return {
    renderRightPane,
    renderSocketDetail,
    renderMetricFields,
    renderPeerIntelCard,
    socketInsights,
    renderSocketInsights
  };
}
