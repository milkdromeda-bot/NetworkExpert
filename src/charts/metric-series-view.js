export function createMetricSeriesView(ctx) {
  const { state, escapeHtml, metricLabel, metricColor, formatMetricValue, thresholdFor, chartBgColor } = ctx;

  function chartSeriesKey(metric, key) {
    return `${metric}:${key}`;
  }
  
  function chartSeriesHidden(metric, key) {
    return state.hiddenChartSeries?.has(chartSeriesKey(metric, key));
  }
  
  function metricChartSeries(metric, showThreshold = true) {
    const threshold = thresholdFor(metric);
    const series = [
      { key: "value", label: metricLabel(metric), color: metricColor(metric), kind: "metric" }
    ];
    if (showThreshold && state.prefs.chartLayout.showThresholds) {
      if (Number.isFinite(threshold.warn)) {
        series.push({ key: "warn", label: "Warning", color: "#ff9f43", kind: "threshold", value: threshold.warn });
      }
      if (Number.isFinite(threshold.danger)) {
        series.push({ key: "danger", label: "Danger", color: "#ff5c77", kind: "threshold", value: threshold.danger });
      }
    }
    return series;
  }
  
  function renderMetricChartLegend(metric) {
    if (!state.prefs.chartLayout.showLegend) return "";
    const items = metricChartSeries(metric, true);
    return `<div class="chart-legend metric-chart-legend" data-chart-legend="${escapeHtml(metric)}" aria-label="${escapeHtml(metricLabel(metric))} series">
      ${items.map(item => {
        const hidden = chartSeriesHidden(metric, item.key);
        const detail = item.kind === "threshold" ? ` - ${formatMetricValue(metric, item.value)}` : "";
        return `<button type="button" class="chart-legend-item ${hidden ? "is-muted" : ""}" data-chart-series-toggle="${escapeHtml(metric)}" data-chart-series-key="${escapeHtml(item.key)}" aria-pressed="${hidden ? "false" : "true"}" title="Toggle ${escapeHtml(item.label)}${escapeHtml(detail)}">
          <i style="--legend-color:${item.color}"></i>
          <span>${escapeHtml(item.label)}</span>
          ${detail ? `<small>${escapeHtml(detail.replace(/^ - /, ""))}</small>` : ""}
        </button>`;
      }).join("")}
    </div>`;
  }
  
  function renderChartThresholdOverlay(items, pad, w, h) {
    const labels = items
      .filter(item => item.show)
      .map(item => ({ ...item, lineY: item.y, label: `${item.name} ${item.formatted}` }))
      .sort((a, b) => a.lineY - b.lineY);
    if (!labels.length) return "";
    const midY = (pad.t + h - pad.b) / 2;
    return `<g class="threshold-overlay">
      ${labels.map(label => {
        const textWidth = Math.min(130, Math.max(60, label.label.length * 6 + 12));
        const pillX = pad.l + 6;
        // Place label on the side with more space (away from data center)
        const above = label.lineY > midY;
        const pillY = above ? label.lineY - 19 : label.lineY + 4;
        const textY = above ? label.lineY - 8 : label.lineY + 15;
        return `<g>
          <line x1="${pad.l}" x2="${w - pad.r}" y1="${label.lineY}" y2="${label.lineY}" stroke="${label.color}" stroke-dasharray="${label.dash}" opacity=".45"/>
          <rect x="${pillX}" y="${pillY}" width="${textWidth}" height="15" rx="7.5" fill="${chartBgColor()}" opacity=".85"/>
          <rect x="${pillX}" y="${pillY}" width="${textWidth}" height="15" rx="7.5" fill="${label.color}" opacity=".25"/>
          <text x="${pillX + 7}" y="${textY}" fill="${label.textColor || label.color}" font-size="9.5" font-weight="600">${escapeHtml(label.label)}</text>
        </g>`;
      }).join("")}
    </g>`;
  }

  return { chartSeriesKey, chartSeriesHidden, metricChartSeries, renderMetricChartLegend, renderChartThresholdOverlay };
}
