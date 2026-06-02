import { createBdpChartUtils } from "./bdp-chart-utils.js";

/**
 * BDP window charts and chart interaction handlers.
 * Extracted from metric-chart-engine.js for maintainability.
 */
export function createBdpChartDrawing(ctx) {
  const { state, document, chartDrawDependencies, chartBgColor, chartTooltipOpacity, escapeHtml, formatNumber, numberFormatter, formatMetricValue, formatBitsPerSecond, formatBytesHuman, metricLabel, metricUnit, metricColor, thresholdFor, thresholdSeverity, thresholdColor, timeLabel, dateTimeFormatter, resolvedNumberLocale, resolvedTimeZone, bdpWindowAnalysis, chartAnnotationOverlay, annotationKindForChartContext, annotationLabelForChartContext, currentSourceAnnotations, annotationColor, toast, render, visibleHistory, chartRowTime, nearestChartRow, nearestChartRowIndex, chartPointBudget, renderableHistory, chartAxisDomain, chartSeriesKey, chartSeriesHidden, metricChartSeries, drawChartInto, chartZoomFor, zoomRangeFromDragSelection, setZoom, redrawChartCardMetric, drawChart } = ctx;
  const { bdpChartSeries, bdpSeriesValues, bdpPath, bdpMarkerOverlay } = createBdpChartUtils({ escapeHtml, timeLabel });

function drawCorrelation(deps = chartDrawDependencies()) {
  const { root = document, state: appState = state } = deps;
  const svg = root.querySelector("#correlationChart");
  if (!svg) return;
  const w = svg.clientWidth || 640;
  const h = svg.clientHeight || 300;
  const rows = renderableHistory(visibleHistory(), appState.correlation.y, "xy", w).rows;
  const xs = rows.map(d => d[appState.correlation.x] || 0);
  const ys = rows.map(d => d[appState.correlation.y] || 0);
  const maxX = Math.max(...xs, 1);
  const maxY = Math.max(...ys, 1);
  const yTicks = [0, .25, .5, .75, 1].map(f => f * maxY);
  const longestYTick = yTicks.map(v => formatMetricValue(appState.correlation.y, v)).reduce((longest, value) => value.length > longest.length ? value : longest, "");
  const yTickWidth = Math.min(150, Math.max(48, longestYTick.length * 6.4));
  const pad = { l: Math.min(Math.max(78, yTickWidth + 54), Math.max(112, w * 0.3)), r: 24, t: 32, b: 58 };
  const axisLabelX = Math.max(14, pad.l - yTickWidth - 34);
  const x = v => pad.l + (v / maxX) * (w - pad.l - pad.r);
  const y = v => h - pad.b - (v / maxY) * (h - pad.t - pad.b);
  const xTicks = [0, .25, .5, .75, 1].map(f => f * maxX);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="${chartBgColor()}"/>
    ${yTicks.map(v => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#263241"/><text x="${pad.l - 10}" y="${y(v) + 4}" text-anchor="end" fill="#8c9aab" font-size="11">${formatMetricValue(appState.correlation.y, v)}</text>`).join("")}
    ${xTicks.map(v => `<line x1="${x(v)}" x2="${x(v)}" y1="${pad.t}" y2="${h - pad.b}" stroke="#182434"/><text x="${x(v)}" y="${h - 18}" text-anchor="middle" fill="#8c9aab" font-size="11">${formatMetricValue(appState.correlation.x, v)}</text>`).join("")}
    ${xs.map((value, i) => `<circle cx="${x(value)}" cy="${y(ys[i])}" r="1" fill="${thresholdColor(appState.correlation.y, ys[i])}" opacity=".9"><title>${metricLabel(appState.correlation.x)}=${formatMetricValue(appState.correlation.x, value)}, ${metricLabel(appState.correlation.y)}=${formatMetricValue(appState.correlation.y, ys[i])}</title></circle>`).join("")}
    <text x="${pad.l}" y="18" fill="#edf4ff" font-size="13" font-weight="700">${metricLabel(appState.correlation.x)} vs ${metricLabel(appState.correlation.y)}</text>
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="#c4d0de" font-size="12">${metricLabel(appState.correlation.x)} (${metricUnit(appState.correlation.x)})</text>
    <text x="${axisLabelX}" y="${h / 2}" transform="rotate(-90 ${axisLabelX} ${h / 2})" text-anchor="middle" fill="#c4d0de" font-size="12">${metricLabel(appState.correlation.y)} (${metricUnit(appState.correlation.y)})</text>
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="#52657a"/>
    <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="#52657a"/>
  `;
}

function drawBdpWindowCharts(deps = chartDrawDependencies()) {
  const { root = document, state: appState = state } = deps;
  const charts = [...root.querySelectorAll("[data-bdp-chart]")];
  if (!charts.length) return;
  const analysis = bdpWindowAnalysis(visibleHistory());
  charts.forEach(svg => drawBdpWindowChart(svg, analysis, svg.dataset.bdpChart));
  root.querySelectorAll("[data-bdp-legend] [data-series-key]").forEach(el => {
    el.onclick = () => {
      const key = el.dataset.seriesKey;
      appState.hiddenBdpSeries.has(key) ? appState.hiddenBdpSeries.delete(key) : appState.hiddenBdpSeries.add(key);
      root.querySelectorAll(`[data-series-key="${key}"]`).forEach(span => {
        span.style.opacity = appState.hiddenBdpSeries.has(key) ? ".4" : "";
        span.style.textDecoration = appState.hiddenBdpSeries.has(key) ? "line-through" : "";
      });
      drawBdpWindowCharts(deps);
    };
  });
}

function drawBdpWindowChart(svg, analysis, kind) {
  const w = svg.clientWidth || 820;
  const h = svg.clientHeight || 300;
  const downsampleMetric = kind === "bdp" ? "observedBdpBytes" : "observedThroughputBps";
  const data = renderableHistory(analysis.series.samples.filter(sample => sample.epochMs || sample.t != null), downsampleMetric, "line", w).rows;
  const series = bdpChartSeries(analysis, kind).filter(item => bdpSeriesValues(data, item).length);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  if (!data.length || !series.length) {
    svg.innerHTML = `<rect x="0" y="0" width="${w}" height="${h}" fill="${chartBgColor()}"/><text x="24" y="40" fill="#c4d0de" font-size="13">Not enough timestamped samples for this BDP chart.</text>`;
    return;
  }
  const values = series.filter(item => !state.hiddenBdpSeries.has(item.key)).flatMap(item => bdpSeriesValues(data, item));
  const max = Math.max(...values, kind === "bdp" ? 1024 : 1);
  const yTicks = [0, .25, .5, .75, 1].map(f => f * max);
  const formatY = kind === "bdp" ? formatBytesHuman : value => `${numberFormatter(value >= 100 ? 0 : value >= 10 ? 1 : 2).format(value)} Mbps`;
  const longestTick = yTicks.map(formatY).reduce((longest, value) => value.length > longest.length ? value : longest, "");
  const tickWidth = Math.min(150, Math.max(58, longestTick.length * 6.5));
  const pad = { l: Math.min(Math.max(82, tickWidth + 50), Math.max(118, w * 0.28)), r: 28, t: 36, b: 56 };
  const firstTime = chartRowTime(data[0]);
  const lastTime = chartRowTime(data[data.length - 1]);
  const timeSpan = Math.max(1, lastTime - firstTime);
  const x = (sample, index) => data.length > 1 && timeSpan > 1
    ? pad.l + ((chartRowTime(sample) - firstTime) / timeSpan) * (w - pad.l - pad.r)
    : pad.l + (index / Math.max(1, data.length - 1)) * (w - pad.l - pad.r);
  const y = value => h - pad.b - (value / max) * (h - pad.t - pad.b);
  const xTicks = (w < 560 ? [0, .5, 1] : [0, .25, .5, .75, 1]).map(f => {
    const targetTime = firstTime + f * timeSpan;
    const row = data.reduce((best, item) => Math.abs(chartRowTime(item) - targetTime) < Math.abs(chartRowTime(best) - targetTime) ? item : best, data[0]);
    return { x: pad.l + f * (w - pad.l - pad.r), label: timeLabel(row?.t || 0, row?.epochMs) };
  });
  const yLabel = kind === "bdp" ? "Bytes / window" : "Throughput (Mbps)";
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="${chartBgColor()}"/>
    ${yTicks.map(value => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(value)}" y2="${y(value)}" stroke="#263241"/><text x="${pad.l - 10}" y="${y(value) + 4}" text-anchor="end" fill="#8c9aab" font-size="11">${escapeHtml(formatY(value))}</text>`).join("")}
    ${xTicks.map((tick, i) => `<line x1="${tick.x}" x2="${tick.x}" y1="${pad.t}" y2="${h - pad.b}" stroke="#182434"/><text x="${tick.x}" y="${h - 18}" text-anchor="${i === xTicks.length - 1 ? "end" : i === 0 ? "start" : "middle"}" fill="#8c9aab" font-size="11">${escapeHtml(tick.label)}</text>`).join("")}
    ${series.filter(item => !state.hiddenBdpSeries.has(item.key)).map(item => bdpPath(data, item, x, y)).join("")}
    ${bdpMarkerOverlay(data, kind, x, pad, h)}
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="#c4d0de" font-size="12">Time (${escapeHtml(resolvedTimeZone())})</text>
    <text x="${Math.max(14, pad.l - tickWidth - 34)}" y="${h / 2}" transform="rotate(-90 ${Math.max(14, pad.l - tickWidth - 34)} ${h / 2})" text-anchor="middle" fill="#c4d0de" font-size="12">${escapeHtml(yLabel)}</text>
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="#52657a"/>
    <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="#52657a"/>
    <rect class="bdp-hover-zone" x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="transparent" pointer-events="all"/>
    <g class="bdp-crosshair" visibility="hidden" pointer-events="none"></g>
  `;
  attachBdpCrosshair(svg, data, series, x, y, pad, w, h, kind, formatY, max);
}

function attachBdpCrosshair(svg, data, series, xFn, yFn, pad, w, h, kind, formatY, max) {
  const zone = svg.querySelector(".bdp-hover-zone");
  const crosshairG = svg.querySelector(".bdp-crosshair");
  if (!zone || !crosshairG) return;
  const formatVal = kind === "bdp" ? formatBytesHuman : v => `${numberFormatter(v >= 100 ? 0 : v >= 10 ? 1 : 2).format(v)} Mbps`;
  const plotW = w - pad.l - pad.r;

  function showCrosshairAtIndex(idx) {
    const sample = data[idx];
    if (!sample) return;
    const cx = xFn(sample, idx);
    const visible = series.filter(item => !state.hiddenBdpSeries.has(item.key));
    const rows = visible.map(item => ({ label: item.label, color: item.color, value: item.value(sample) }));
    const time = timeLabel(sample.t || 0, sample.epochMs);
    const tooltipW = 150;
    const tooltipX = cx + 14 + tooltipW > w - pad.r ? cx - tooltipW - 14 : cx + 14;
    const lineH = 14;
    const tooltipH = (rows.length + 1) * lineH + 10;
    const tooltipY = pad.t + 30;
    crosshairG.setAttribute("visibility", "visible");
    crosshairG.innerHTML = `
      <line x1="${cx}" x2="${cx}" y1="${pad.t}" y2="${h - pad.b}" stroke="${chartBgColor() === `#f0f3f7` ? `#1a2533cc` : `#ffffffaa`}" stroke-width="1" stroke-dasharray="3 2"/>
      <rect x="${tooltipX}" y="${tooltipY}" width="${tooltipW}" height="${tooltipH}" rx="4" fill="rgba(10,16,24,.8)" stroke="#52657a"/>
      <text x="${tooltipX + 8}" y="${tooltipY + 14}" fill="#8cc8e8" font-size="10" font-weight="700">${escapeHtml(time)}</text>
      ${rows.map((r, i) => `<circle cx="${tooltipX + 10}" cy="${tooltipY + (i + 1) * lineH + 11}" r="3" fill="${r.color}"/><text x="${tooltipX + 18}" y="${tooltipY + (i + 1) * lineH + 14}" fill="#dde8f4" font-size="10">${escapeHtml(r.label)}: ${Number.isFinite(r.value) ? escapeHtml(formatVal(r.value)) : "-"}</text>`).join("")}
    `;
  }
  svg._bdpShowCrosshair = showCrosshairAtIndex;
  svg._bdpHideCrosshair = () => crosshairG.setAttribute("visibility", "hidden");
  svg._bdpData = data;
  svg._bdpPad = pad;
  svg._bdpW = w;

  let dragStart = null;
  zone.addEventListener("mousedown", event => {
    const rect = svg.getBoundingClientRect();
    const scaleX = w / rect.width;
    const locX = (event.clientX - rect.left) * scaleX;
    dragStart = Math.max(0, Math.min(1, (locX - pad.l) / plotW));
  });
  zone.addEventListener("mousemove", event => {
    const rect = svg.getBoundingClientRect();
    const scaleX = w / rect.width;
    const locX = (event.clientX - rect.left) * scaleX;
    const pct = Math.max(0, Math.min(1, (locX - pad.l) / plotW));
    const idx = Math.round(pct * (data.length - 1));
    // Sync crosshairs on both BDP charts
    document.querySelectorAll("[data-bdp-chart]").forEach(other => {
      if (other._bdpShowCrosshair) other._bdpShowCrosshair(idx);
    });
  });
  zone.addEventListener("mouseup", event => {
    if (dragStart == null) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = w / rect.width;
    const locX = (event.clientX - rect.left) * scaleX;
    const dragEnd = Math.max(0, Math.min(1, (locX - pad.l) / plotW));
    const minPct = Math.min(dragStart, dragEnd);
    const maxPct = Math.max(dragStart, dragEnd);
    dragStart = null;
    if (maxPct - minPct < 0.02) return; // too small, ignore
    // Apply zoom based on percentage of current visible range
    const currentStart = state.chartZoom.start;
    const currentEnd = state.chartZoom.end;
    const range = currentEnd - currentStart;
    state.chartZoom = clampZoomRange({ start: currentStart + minPct * range, end: currentStart + maxPct * range });
    clearVisibleHistoryCache();
    state._bdpCache = null;
    drawBdpWindowCharts();
  });
  zone.addEventListener("mouseleave", () => {
    dragStart = null;
    document.querySelectorAll("[data-bdp-chart]").forEach(other => {
      if (other._bdpHideCrosshair) other._bdpHideCrosshair();
    });
  });
}

function svgPoint(svg, event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

function chartPointerContext(svg, event) {
  const metric = svg.dataset.metric || state.prefs.graphMetric;
  const renderStyle = svg.dataset.renderStyle || state.prefs.graphStyle;
  const rows = renderableHistory(visibleHistory(metric), metric, renderStyle, svg.clientWidth || 640).rows;
  if (!rows.length) return null;
  const left = Number(svg.dataset.plotLeft);
  const right = Number(svg.dataset.plotRight);
  if (!Number.isFinite(left) || !Number.isFinite(right) || right <= left) return null;
  const point = svgPoint(svg, event);
  const x = Math.max(left, Math.min(right, point.x));
  const pct = (x - left) / Math.max(1, right - left);
  const row = nearestChartRow(rows, pct);
  const rawValue = Number(row?.[metric]);
  const value = Number.isFinite(rawValue) ? rawValue : 0;
  return {
    metric,
    row,
    value,
    epochMs: chartRowTime(row),
    kind: annotationKindForChartContext(metric, value),
    label: annotationLabelForChartContext(metric, value),
    note: `Created from chart right-click at ${timeLabel(row?.t || 0, row?.epochMs)} with ${metricLabel(metric)}=${formatMetricValue(metric, value)}.`
  };
}

function chartContextMenuPosition(event) {
  const menuWidth = 250;
  const menuHeight = 86;
  const left = Math.min(Math.max(8, event.clientX), window.innerWidth - menuWidth - 8);
  const top = Math.min(Math.max(8, event.clientY), window.innerHeight - menuHeight - 8);
  return { left: Math.round(left), top: Math.round(top) };
}

function attachChartContextAnnotation(svg) {
  if (svg.dataset.contextAnnotation === "1") return;
  svg.dataset.contextAnnotation = "1";
  svg.addEventListener("contextmenu", event => {
    event.preventDefault();
    event.stopPropagation();
    const context = chartPointerContext(svg, event);
    if (!context || !Number.isFinite(context.epochMs)) {
      toast("No chart point", "No captured sample is available at this position.", "warn");
      return;
    }
    state.chartAnnotationMenuContext = context;
    state.chartAnnotationMenuPos = chartContextMenuPosition(event);
    const existing = document.querySelector(".chart-context-menu");
    if (existing) existing.remove();
    const pos = state.chartAnnotationMenuPos;
    const menuHtml = `<div class="chart-context-menu open" style="left:${pos.left}px;top:${pos.top}px" role="menu" aria-label="Chart context menu">
      <button data-chart-annotation-menu="annotate" role="menuitem" title="${escapeHtml(metricLabel(context.metric))} at ${escapeHtml(timeLabel(context.row?.t || 0, context.row?.epochMs))}">
        <span class="chart-context-menu-icon">${icons.note}</span>
        <span class="chart-context-menu-copy">
          <strong>Annotate here</strong>
          <small>${escapeHtml(metricLabel(context.metric))} - ${escapeHtml(timeLabel(context.row?.t || 0, context.row?.epochMs))}</small>
        </span>
      </button>
    </div>`;
    document.body.insertAdjacentHTML("beforeend", menuHtml);
    const menuEl = document.querySelector(".chart-context-menu");
    menuEl?.querySelector("[data-chart-annotation-menu]")?.addEventListener("click", () => {
      const ctx = state.chartAnnotationMenuContext;
      state.chartAnnotationMenuContext = null;
      state.chartAnnotationMenuPos = null;
      menuEl.remove();
      if (ctx) {
        state.modal = "annotation";
        state.annotationDraft = { kind: "custom", label: "Analyst note", note: "", metric: ctx.metric, anchor: "cursor", epochMs: ctx.epochMs, sourceName: state.sourceName, socketId: state.selectedId || "" };
        render();
      }
    });
  });
}
function attachChartInteractions(svg, deps = chartDrawDependencies()) {
  const { root = document, state: appState = state } = deps;
  if (svg.dataset.interactive === "1") return;
  svg.dataset.interactive = "1";
  let dragging = false;
  let startX = 0;
  const layer = () => svg.querySelector("[data-crosshair-layer]");
  const bounds = () => ({
    left: Number(svg.dataset.plotLeft),
    right: Number(svg.dataset.plotRight),
    top: Number(svg.dataset.plotTop),
    bottom: Number(svg.dataset.plotBottom)
  });
  const clampX = x => Math.max(bounds().left, Math.min(bounds().right, x));
  const tooltipMarkup = (metric, rows, pct, x, b, subtle = false) => {
    const idx = nearestChartRowIndex(rows, pct);
    const row = rows[idx] || {};
    const prev = idx > 0 ? rows[idx - 1] : null;
    const value = Number(row[metric] || 0);
    const prevValue = prev ? Number(prev[metric] || 0) : null;
    const delta = Number.isFinite(prevValue) ? value - prevValue : null;
    const severity = thresholdSeverity(metric, value);
    const threshold = thresholdFor(metric);
    const items = [
      !chartSeriesHidden(metric, "value") ? { label: metricLabel(metric), color: thresholdColor(metric, value), value: formatMetricValue(metric, value) } : null,
      Number.isFinite(delta) ? { label: "Delta", color: delta > 0 ? "#7dd3fc" : delta < 0 ? "#a7f3d0" : "#94a3b8", value: `${delta >= 0 ? "+" : ""}${formatMetricValue(metric, delta)}` } : null,
      Number.isFinite(threshold.warn) && !chartSeriesHidden(metric, "warn") ? { label: "Warn", color: "#ff9f43", value: formatMetricValue(metric, threshold.warn) } : null,
      Number.isFinite(threshold.danger) && !chartSeriesHidden(metric, "danger") ? { label: "Danger", color: "#ff5c77", value: formatMetricValue(metric, threshold.danger) } : null
    ].filter(Boolean).slice(0, 5);
    const tooltipOpacity = chartTooltipOpacity();
    const width = 222;
    const lineH = 16;
    const showSeverity = severity === "warn" || severity === "danger";
    const height = Math.max(62, 36 + items.length * lineH + (showSeverity ? 15 : 0));
    const tooltipX = Math.max(b.left + 6, Math.min(x + 12, b.right - width - 6));
    const tooltipY = b.top + 28;
    return `
      <rect x="${tooltipX}" y="${tooltipY}" width="${width}" height="${height}" rx="8" fill="${chartBgColor() === `#f0f3f7` ? `#ffffff` : `#0b1018`}" fill-opacity="${tooltipOpacity}" stroke="#52657a"/>
      <text x="${tooltipX + 10}" y="${tooltipY + 18}" fill="#edf4ff" font-size="11" font-weight="700">${escapeHtml(timeLabel(row.t || 0, row.epochMs))}</text>
      ${showSeverity ? `<text x="${tooltipX + 142}" y="${tooltipY + 18}" fill="${thresholdColor(metric, value)}" font-size="10" font-weight="800">${escapeHtml(severity.toUpperCase())}</text>` : ""}
      ${items.map((item, itemIndex) => `<circle cx="${tooltipX + 12}" cy="${tooltipY + 34 + itemIndex * lineH}" r="${subtle ? 2.6 : 3.2}" fill="${item.color}"/><text x="${tooltipX + 20}" y="${tooltipY + 38 + itemIndex * lineH}" fill="#dde8f4" font-size="10.5">${escapeHtml(item.label)}: ${escapeHtml(item.value)}</text>`).join("")}
    `;
  };
  const annotationDeltaBadges = (metric, rows, pct, b) => {
    const idx = nearestChartRowIndex(rows, pct);
    const row = rows[idx];
    if (!row) return "";
    const cursorMs = chartRowTime(row);
    const annotations = currentSourceAnnotations(metric).filter(a => Number.isFinite(a.resolvedEpochMs));
    if (!annotations.length) return "";
    const firstTime = chartRowTime(rows[0]);
    const lastTime = chartRowTime(rows[rows.length - 1]);
    const timeSpan = Math.max(1, lastTime - firstTime);
    const plotW = b.right - b.left;
    return annotations.filter(a => a.resolvedEpochMs >= firstTime && a.resolvedEpochMs <= lastTime).slice(0, 4).map(a => {
      const ax = b.left + ((a.resolvedEpochMs - firstTime) / timeSpan) * plotW;
      const deltaMs = cursorMs - a.resolvedEpochMs;
      const absDelta = Math.abs(deltaMs);
      const sign = deltaMs >= 0 ? "+" : "-";
      const label = absDelta < 1000 ? `${sign}${absDelta}ms` : absDelta < 60000 ? `${sign}${(absDelta / 1000).toFixed(absDelta < 10000 ? 2 : 1)}s` : `${sign}${(absDelta / 60000).toFixed(1)}m`;
      const color = annotationColor(a.kind);
      const badgeW = Math.max(48, label.length * 7 + 12);
      const badgeX = Math.min(Math.max(ax - badgeW / 2, b.left), b.right - badgeW);
      const badgeY = b.bottom + 4;
      return `<rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="18" rx="9" fill="${color}" opacity=".9"/><text x="${badgeX + badgeW / 2}" y="${badgeY + 13}" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">? ${escapeHtml(label)}</text>`;
    }).join("");
  };
  const drawOverlay = (x, dragX = null) => {
    const b = bounds();
    const lx = layer();
    if (!lx) return;
    const pct = (x - b.left) / Math.max(1, b.right - b.left);
    const metric = svg.dataset.metric || appState.prefs.graphMetric;
    const renderStyle = svg.dataset.renderStyle || appState.prefs.graphStyle;
    const rows = renderableHistory(visibleHistory(metric), metric, renderStyle, svg.clientWidth || 640).rows;
    const selection = dragX == null ? "" : `<rect x="${Math.min(startX, dragX)}" y="${b.top}" width="${Math.abs(dragX - startX)}" height="${b.bottom - b.top}" fill="#5db7ff" opacity=".18" stroke="#5db7ff" stroke-dasharray="5 4"/>`;
    lx.innerHTML = `
      ${selection}
      <line x1="${x}" x2="${x}" y1="${b.top}" y2="${b.bottom}" stroke="#edf4ff" stroke-width="1.4" stroke-dasharray="4 4"/>
      <line x1="${b.left}" x2="${b.right}" y1="${b.bottom}" y2="${b.bottom}" stroke="#52657a"/>
      ${tooltipMarkup(metric, rows, pct, x, b)}
      ${annotationDeltaBadges(metric, rows, pct, b)}
    `;
  };
  svg.addEventListener("pointermove", event => {
    const p = svgPoint(svg, event);
    const x = clampX(p.x);
    drawOverlay(x, dragging ? x : null);
    if (!dragging && appState.prefs.chartLayout.syncCrosshair !== false) {
      const b = bounds();
      const pct = (x - b.left) / Math.max(1, b.right - b.left);
      root.querySelectorAll("svg.chart[data-interactive='1']").forEach(other => {
        if (other === svg) return;
        const ol = other.querySelector("[data-crosshair-layer]");
        if (!ol) return;
        const oLeft = Number(other.dataset.plotLeft);
        const oRight = Number(other.dataset.plotRight);
        const oTop = Number(other.dataset.plotTop);
        const oBottom = Number(other.dataset.plotBottom);
        if (!Number.isFinite(oLeft) || oRight <= oLeft) return;
        const ox = oLeft + pct * (oRight - oLeft);
        const m = other.dataset.metric || appState.prefs.graphMetric;
        const rs = other.dataset.renderStyle || appState.prefs.graphStyle;
        const rows = renderableHistory(visibleHistory(m), m, rs, other.clientWidth || 640).rows;
        ol.innerHTML = `
          <line x1="${ox}" x2="${ox}" y1="${oTop}" y2="${oBottom}" stroke="#edf4ff" stroke-width="1" stroke-dasharray="4 4" opacity=".5"/>
          ${tooltipMarkup(m, rows, pct, ox, { left: oLeft, right: oRight, top: oTop, bottom: oBottom }, true)}
        `;
      });
    }
  });
  svg.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    const p = svgPoint(svg, event);
    startX = clampX(p.x);
    dragging = true;
    svg.setPointerCapture(event.pointerId);
    drawOverlay(startX, startX);
  });
  svg.addEventListener("pointerup", event => {
    if (!dragging) return;
    const b = bounds();
    const endX = clampX(svgPoint(svg, event).x);
    dragging = false;
    const span = Math.abs(endX - startX);
    if (span > 12) {
      const a = (Math.min(startX, endX) - b.left) / (b.right - b.left);
      const z = (Math.max(startX, endX) - b.left) / (b.right - b.left);
      const metric = svg.dataset.metric || null;
      const zoom = chartZoomFor(metric);
      const nextZoom = zoomRangeFromDragSelection(zoom, a, z);
      setZoom(nextZoom.start, nextZoom.end, metric);
      appState.activeChartMetric = metric;
      appState.activeChartAction = "dragZoom";
      if (svg.matches("[data-mini-chart]") && redrawChartCardMetric(metric, "dragZoom", deps)) return;
      if (svg.id === "chart") drawChart(deps);
    } else {
      drawOverlay(endX);
    }
  });
  svg.addEventListener("pointerleave", () => {
    if (!dragging) {
      if (layer()) layer().innerHTML = "";
      if (appState.prefs.chartLayout.syncCrosshair !== false) {
        root.querySelectorAll("svg.chart[data-interactive='1']").forEach(other => {
          if (other === svg) return;
          const ol = other.querySelector("[data-crosshair-layer]");
          if (ol) ol.innerHTML = "";
        });
      }
    }
  });
  // Keyboard navigation for accessibility
  let kbX = null;
  svg.addEventListener("keydown", e => {
    if (!["ArrowLeft", "ArrowRight", "Escape"].includes(e.key)) return;
    e.preventDefault();
    const b = bounds();
    const step = (b.right - b.left) / 40;
    if (e.key === "Escape") { if (layer()) layer().innerHTML = ""; kbX = null; return; }
    if (kbX === null) kbX = (b.left + b.right) / 2;
    kbX = clampX(kbX + (e.key === "ArrowRight" ? step : -step));
    drawOverlay(kbX);
  });
}


  return {
    drawCorrelation,
    drawBdpWindowCharts,
    bdpChartSeries,
    bdpSeriesValues,
    bdpPath,
    bdpMarkerOverlay,
    drawBdpWindowChart,
    attachBdpCrosshair,
    svgPoint,
    chartPointerContext,
    chartContextMenuPosition,
    attachChartContextAnnotation,
    attachChartInteractions
  };
}
