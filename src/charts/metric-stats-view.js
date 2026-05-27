export function createMetricStatsView(ctx) {
  const { state, document, visibleHistory, formatMetricValue, metricColor, thresholdColor, chartBgColor, escapeHtml, metricLabel } = ctx;

  function percentile(sortedValues, p) {
    if (!sortedValues.length) return 0;
    if (sortedValues.length === 1) return sortedValues[0];
    const rank = (p / 100) * (sortedValues.length - 1);
    const lo = Math.floor(rank);
    const hi = Math.ceil(rank);
    const weight = rank - lo;
    return sortedValues[lo] + (sortedValues[hi] - sortedValues[lo]) * weight;
  }
  
  function chartStats(metric) {
    const rows = visibleHistory();
    const values = rows
      .map(row => Number(row?.[metric]))
      .filter(value => Number.isFinite(value))
      .sort((a, b) => a - b);
    if (!values.length) return { count: 0, metric };
    return {
      metric,
      count: values.length,
      first: rows[0],
      last: rows[rows.length - 1],
      min: values[0],
      p50: percentile(values, 50),
      p95: percentile(values, 95),
      p90: percentile(values, 90),
      p99: percentile(values, 99),
      p999: percentile(values, 99.9),
      p9999: percentile(values, 99.99),
      max: values[values.length - 1],
      curve: Array.from({ length: 101 }, (_, p) => ({ p, value: percentile(values, p) }))
    };
  }
  
  function renderPercentileDistribution(metric, stats) {
    const w = 520;
    const h = 260;
    const values = stats.curve || [];
    const rawMin = Math.min(...values.map(point => point.value));
    const rawMax = Math.max(...values.map(point => point.value), 1);
    const range = rawMax - rawMin || 1;
    const min = rawMin > range * 2 ? rawMin - range * 0.1 : 0;
    const max = rawMax + range * 0.05;
    const span = Math.max(1, max - min);
    const yTicks = [0, .25, .5, .75, 1].map(f => min + f * span);
    const longestLabel = yTicks.map(v => formatMetricValue(metric, v)).reduce((a, b) => a.length > b.length ? a : b, "");
    const padL = Math.min(160, Math.max(76, longestLabel.length * 7 + 16));
    const pad = { l: padL, r: 32, t: 28, b: 52 };
    const x = p => pad.l + (Math.max(0, Math.min(100, p)) / 100) * (w - pad.l - pad.r);
    const y = value => h - pad.b - ((value - min) / span) * (h - pad.t - pad.b);
    const path = values.map((point, index) => `${index ? "L" : "M"}${x(point.p).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
    const percentilePoints = values.map(point => `<circle cx="${x(point.p)}" cy="${y(point.value)}" r="1.9" fill="${metricColor(metric)}" opacity=".95"><title>P${point.p}: ${formatMetricValue(metric, point.value)}</title></circle>`).join("");
    const markers = [
      ["P50", 50, stats.p50],
      ["P90", 90, stats.p90],
      ["P99", 99, stats.p99],
      ["P99.9", 99.9, stats.p999],
      ["P99.99", 99.99, stats.p9999]
    ];
    return `<svg class="percentile-chart" data-percentile-chart="1" data-chart-width="${w}" data-chart-height="${h}" data-pad-left="${pad.l}" data-pad-right="${pad.r}" data-pad-top="${pad.t}" data-pad-bottom="${pad.b}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeHtml(metricLabel(metric))} percentile distribution">
        <rect x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="${chartBgColor()}"/>
        ${yTicks.map(value => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(value)}" y2="${y(value)}" stroke="#263241"/><text x="${pad.l - 10}" y="${y(value) + 4}" text-anchor="end" fill="#8c9aab" font-size="11">${formatMetricValue(metric, value)}</text>`).join("")}
        ${[0, 25, 50, 75, 90, 99, 100].map((p, i, arr) => `<line x1="${x(p)}" x2="${x(p)}" y1="${pad.t}" y2="${h - pad.b}" stroke="#182434"/><text x="${x(p)}" y="${h - 20}" text-anchor="${i === arr.length - 1 ? "end" : i === 0 ? "start" : "middle"}" fill="#8c9aab" font-size="11">${p === 100 ? "P100" : `P${p}`}</text>`).join("")}
        <path d="${path}" fill="none" stroke="${metricColor(metric)}" stroke-width="1.5"/>
        ${percentilePoints}
        ${markers.map(([label, p, value]) => `<circle cx="${x(p)}" cy="${y(value)}" r="3" fill="${thresholdColor(metric, value)}"><title>${label}: ${formatMetricValue(metric, value)}</title></circle>`).join("")}
        <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="#52657a"/>
        <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="#52657a"/>
        <g class="percentile-focus-layer" data-percentile-focus-layer="1"></g>
      <text x="${pad.l}" y="18" fill="#edf4ff" font-size="13" font-weight="700">${escapeHtml(metricLabel(metric))} percentile curve</text>
      <text x="${w / 2}" y="${h - 5}" text-anchor="middle" fill="#c4d0de" font-size="12">Percentile rank</text>
    </svg>`;
  }
  
  function showPercentileTableCrosshair(percentile, label, value) {
    const svg = document.querySelector("[data-percentile-chart]");
    const layer = svg?.querySelector("[data-percentile-focus-layer]");
    if (!svg || !layer) return;
    const w = Number(svg.dataset.chartWidth || 520);
    const h = Number(svg.dataset.chartHeight || 260);
    const left = Number(svg.dataset.padLeft || 76);
    const right = Number(svg.dataset.padRight || 24);
    const top = Number(svg.dataset.padTop || 28);
    const bottom = Number(svg.dataset.padBottom || 52);
    const x = left + (Math.max(0, Math.min(100, Number(percentile) || 0)) / 100) * (w - left - right);
    const badgeX = Math.max(left + 6, Math.min(w - right - 112, x + 10));
    layer.innerHTML = `
      <line x1="${x}" x2="${x}" y1="${top}" y2="${h - bottom}" class="percentile-focus-line"/>
      <rect x="${badgeX}" y="${top + 6}" width="104" height="28" rx="7" class="percentile-focus-badge"/>
      <text x="${badgeX + 10}" y="${top + 24}" class="percentile-focus-text">${escapeHtml(label)}: ${formatMetricValue(state.statsMetric || state.prefs.graphMetric, value)}</text>
    `;
  }
  
  function clearPercentileTableCrosshair() {
    const layer = document.querySelector("[data-percentile-focus-layer]");
    if (layer) layer.innerHTML = "";
  }

  return { percentile, chartStats, renderPercentileDistribution, showPercentileTableCrosshair, clearPercentileTableCrosshair };
}
