export function renderAdvisorGlobalSummary(ctx) {
  const { state, escapeHtml, formatMetricValue, formatNumber, metricValue, visibleHistory, renderWhatIfSimulation, renderInvestigationContext, renderTailLatencyLensPanel } = ctx;
  const sockets = state.sockets;
  const anomalies = state.anomalies;
  const history = visibleHistory();
  const drops = ctx.dropRateSummary ? ctx.dropRateSummary(history) : null;
  const critical = anomalies.filter(a => a.severity === "critical" || a.severity === "high");
  const hasTimeline = history.length > 1;
  const score = Math.max(0, 100 - critical.length * 15 - anomalies.length * 3 - (drops?.totalDropDelta || 0 > 0 ? 20 : 0));
  const scoreColor = score >= 80 ? "#4cde8a" : score >= 50 ? "#ffd166" : "#ff5c77";
  const issues = critical.slice(0, 5).map(a => `<li style="margin:4px 0"><span style="color:${a.severity === "critical" ? "#ff5c77" : "#ff9f43"};font-weight:700">${escapeHtml(a.severity)}</span> — ${escapeHtml(a.title)}${a.detail ? `: <span style="color:var(--muted)">${escapeHtml(a.detail.slice(0, 100))}</span>` : ""}</li>`);
  const retransSockets = sockets.filter(s => (metricValue(s, "retrans") || 0) > 0).length;
  const backoffSockets = sockets.filter(s => (metricValue(s, "backoff") || 0) > 0).length;
  const highRtt = sockets.filter(s => (metricValue(s, "rtt") || 0) > 100).length;
  const queuedSockets = sockets.filter(s => (metricValue(s, "recvQ") || 0) > 0 || (metricValue(s, "sendQ") || 0) > 0).length;
  return `<div class="advisor-global-summary" style="padding:16px">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
      <div style="width:64px;height:64px;border-radius:50%;border:3px solid ${scoreColor};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:${scoreColor}">${score}</div>
      <div><h3 style="margin:0;color:var(--text)">Network Health Score</h3><p style="margin:2px 0 0;color:var(--muted);font-size:12px">${sockets.length} sockets · ${anomalies.length} anomalies · ${hasTimeline ? history.length + " snapshots" : "no timeline"}</p></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px">
      <div class="panel" style="padding:10px;text-align:center"><div style="font-size:20px;font-weight:700;color:${retransSockets ? "#ff5c77" : "#4cde8a"}">${retransSockets}</div><div style="font-size:10px;color:var(--muted)">Retransmitting</div></div>
      <div class="panel" style="padding:10px;text-align:center"><div style="font-size:20px;font-weight:700;color:${backoffSockets ? "#ff9f43" : "#4cde8a"}">${backoffSockets}</div><div style="font-size:10px;color:var(--muted)">Backoff active</div></div>
      <div class="panel" style="padding:10px;text-align:center"><div style="font-size:20px;font-weight:700;color:${highRtt ? "#ff9f43" : "#4cde8a"}">${highRtt}</div><div style="font-size:10px;color:var(--muted)">RTT > 100ms</div></div>
      <div class="panel" style="padding:10px;text-align:center"><div style="font-size:20px;font-weight:700;color:${queuedSockets ? "#ffd166" : "#4cde8a"}">${queuedSockets}</div><div style="font-size:10px;color:var(--muted)">Queued (Recv/Send)</div></div>
      <div class="panel" style="padding:10px;text-align:center"><div style="font-size:20px;font-weight:700;color:${drops?.totalDropDelta ? "#ff5c77" : "#4cde8a"}">${drops?.totalDropDelta || 0}</div><div style="font-size:10px;color:var(--muted)">Socket drops</div></div>
    </div>
    ${issues.length ? `<div style="margin-bottom:12px"><strong style="color:var(--text)"><i class="ri-alarm-warning-line" style="color:#ff5c77"></i> Top issues</strong><ul style="margin:6px 0 0 16px;padding:0;font-size:12px;color:var(--soft)">${issues.join("")}</ul></div>` : `<div style="padding:12px;border-radius:8px;background:rgba(77,222,138,0.08);border:1px solid rgba(77,222,138,0.2);color:#4cde8a;font-weight:600"><i class="ri-shield-check-line"></i> No critical issues detected. All sockets appear healthy.</div>`}
    ${renderWhatIfSimulation ? renderWhatIfSimulation() : ""}
    <div style="margin-top:12px;font-size:11px;color:var(--muted)"><i class="ri-lightbulb-line"></i> Tip: Select a socket in Analysis to see per-connection investigation context and tail-latency lens here.</div>
  </div>`;
}
