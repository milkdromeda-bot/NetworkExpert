export function renderMetricsStatsTable(ctx, metrics) {
  const { state, escapeHtml, formatMetricValue, formatNumber, thresholdFor, thresholdSeverity, metricLabel, visibleHistory } = ctx;
  const rows = visibleHistory();
  if (!rows.length) return `<div class="empty">No timestamped data for stats.</div>`;
  const sortKey = state.statsTableSort || "metric";
  const sortDir = state.statsTableDir || "asc";
  const cols = ["Min", "Median", "P75", "P95", "P99", "P99.9", "Max", "Avg", "StdDev", "Samples"];
  const colKeys = ["min", "median", "p75", "p95", "p99", "p999", "max", "avg", "stddev", "samples"];
  const data = metrics.map(m => {
    const vals = rows.map(r => Number(r[m]) || 0).filter(v => Number.isFinite(v)).sort((a, b) => a - b);
    if (!vals.length) return null;
    const p = f => vals[Math.min(vals.length - 1, Math.floor(f * vals.length))];
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    const stddev = Math.sqrt(vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length);
    return { metric: m, label: metricLabel(m), min: vals[0], median: p(0.5), p75: p(0.75), p95: p(0.95), p99: p(0.99), p999: p(0.999), max: vals[vals.length - 1], avg, stddev, samples: vals.length };
  }).filter(Boolean);
  if (sortKey !== "metric") data.sort((a, b) => sortDir === "asc" ? (a[sortKey] || 0) - (b[sortKey] || 0) : (b[sortKey] || 0) - (a[sortKey] || 0));
  else data.sort((a, b) => sortDir === "asc" ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label));
  const cellColor = (m, val) => { const sev = thresholdSeverity(m, val); return sev === "danger" ? "color:#ff9eb0;font-weight:700" : sev === "warn" ? "color:#ffcb80;font-weight:600" : ""; };
  const arrow = k => sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : "";
  return `<div class="panel" style="overflow-x:auto"><table class="stats-table" style="width:100%;font-size:12px;border-collapse:collapse">
    <thead><tr><th style="text-align:left;padding:6px 10px;cursor:pointer" data-stats-sort="metric">METRIC${arrow("metric")}</th>${cols.map((c, i) => `<th style="cursor:pointer${colKeys[i] === "max" ? ";color:#ff5c77" : ""}" data-stats-sort="${colKeys[i]}">${c}${arrow(colKeys[i])}</th>`).join("")}</tr></thead>
    <tbody>${data.map(d => {
      const maxStyle = cellColor(d.metric, d.max), p99Style = cellColor(d.metric, d.p99), p95Style = cellColor(d.metric, d.p95);
      return `<tr><td style="text-align:left;padding:6px 10px;font-weight:600;color:var(--text);background:rgba(255,255,255,0.03)"><button class="mini" data-chart-stats="${d.metric}" title="Detailed statistics" style="margin-right:6px;vertical-align:middle"><i class="ri-bar-chart-grouped-line"></i></button>${escapeHtml(d.label)}</td><td>${formatMetricValue(d.metric, d.min)}</td><td>${formatMetricValue(d.metric, d.median)}</td><td>${formatMetricValue(d.metric, d.p75)}</td><td style="${p95Style}">${formatMetricValue(d.metric, d.p95)}</td><td style="${p99Style}">${formatMetricValue(d.metric, d.p99)}</td><td style="${p99Style}">${formatMetricValue(d.metric, d.p999)}</td><td style="background:rgba(255,92,119,0.06);${maxStyle}">${formatMetricValue(d.metric, d.max)}</td><td>${formatMetricValue(d.metric, d.avg)}</td><td style="color:var(--muted)">${d.stddev < 0.01 ? "0" : formatMetricValue(d.metric, d.stddev)}</td><td style="color:var(--muted)">${formatNumber(d.samples)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
}
