export function createComparisonRendering(ctx) {
  const {
    state,
    icons,
    escapeHtml,
    formatNumber,
    formatMetricValue,
    buildComparison,
    renderBaselineNarrative,
    renderDelta
  } = ctx;

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

  return { renderComparison };
}
