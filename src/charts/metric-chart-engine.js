import { createBdpChartDrawing } from "./bdp-chart-drawing.js";
import { createMetricStatsView } from "./metric-stats-view.js";
import { createMetricChartState } from "./metric-chart-state.js";
import { createMetricValueFormatting } from "./metric-value-formatting.js";
import { createMetricSeriesView } from "./metric-series-view.js";

export function createMetricChartEngine(getDeps) {
  const current = () => getDeps();
  const call = (name, ...args) => {
    const fn = current()[name];
    if (typeof fn !== "function") throw new Error(`Missing metric chart dependency: ${name}`);
    return fn(...args);
  };
  const proxiedObject = name => new Proxy({}, {
    get(_target, prop) {
      const source = current()[name] || globalThis[name];
      const value = source?.[prop];
      return typeof value === "function" ? value.bind(source) : value;
    },
    set(_target, prop, value) {
      const source = current()[name] || globalThis[name];
      if (!source) return false;
      source[prop] = value;
      return true;
    },
    has(_target, prop) { return prop in ((current()[name] || globalThis[name]) || {}); },
    ownKeys() { return Reflect.ownKeys((current()[name] || globalThis[name]) || {}); },
    getOwnPropertyDescriptor(_target, prop) {
      const source = (current()[name] || globalThis[name]) || {};
      return Object.getOwnPropertyDescriptor(source, prop) || { configurable: true, enumerable: true, writable: true, value: source[prop] };
    }
  });

  const state = proxiedObject("state");
  const icons = proxiedObject("icons");
  const document = proxiedObject("document");
  const window = proxiedObject("window");
  const performance = proxiedObject("performance");
  const DASHBOARD_PRESETS = current().DASHBOARD_PRESETS || {};
  const DEFAULT_TABLE_ORDER = current().DEFAULT_TABLE_ORDER || [];

  function requestAnimationFrame(callback) {
    const raf = current().requestAnimationFrame || globalThis.requestAnimationFrame || (fn => setTimeout(() => fn(performance.now()), 16));
    return raf(callback);
  }
  function _metricLabel(...args) { return call("metricLabel", ...args); }
  function numberFormatter(...args) { return call("numberFormatter", ...args); }
  function numberFormatterWith(...args) { return call("numberFormatterWith", ...args); }
  function numberSeparators(...args) { return call("numberSeparators", ...args); }
  function formatNumber(...args) { return call("formatNumber", ...args); }
  function escapeHtml(...args) { return call("escapeHtml", ...args); }
  function lazySparklineIndex(...args) { return call("lazySparklineIndex", ...args); }
  function renderSparkline(...args) { return call("renderSparkline", ...args); }
  function dateTimeFormatter(...args) { return call("dateTimeFormatter", ...args); }
  function resolvedNumberLocale(...args) { return call("resolvedNumberLocale", ...args); }
  function resolvedTimeZone(...args) { return call("resolvedTimeZone", ...args); }
  function clearVisibleHistoryCache(...args) { return call("clearVisibleHistoryCache", ...args); }
  function tailLatencyLens(...args) { return call("tailLatencyLens", ...args); }
  function microburstSummary(...args) { return call("microburstSummary", ...args); }
  function chartMicroburstBand(...args) { return call("chartMicroburstBand", ...args); }
  function chartAnnotationOverlay(...args) { return call("chartAnnotationOverlay", ...args); }
  function bdpWindowAnalysis(...args) { return call("bdpWindowAnalysis", ...args); }
  function formatBytesHuman(...args) { return call("formatBytesHuman", ...args); }
  function annotationKindForChartContext(...args) { return call("annotationKindForChartContext", ...args); }
  function annotationLabelForChartContext(...args) { return call("annotationLabelForChartContext", ...args); }
  function currentSourceAnnotations(...args) { return call("currentSourceAnnotations", ...args); }
  function annotationColor(...args) { return call("annotationColor", ...args); }
  function toast(...args) { return call("toast", ...args); }
  function render(...args) { return call("render", ...args); }
  function setSourceName(...args) { return call("setSourceName", ...args); }
  function setActiveInvestigation(...args) { return call("setActiveInvestigation", ...args); }
  function defaultSsCommandConfig(...args) { return call("defaultSsCommandConfig", ...args); }
  function defaultTableColumns(...args) { return call("defaultTableColumns", ...args); }
  function clampChartColumns(...args) { return call("clampChartColumns", ...args); }
  function applyChartZoomOperation(...args) { return call("applyChartZoomOperation", ...args); }
  function clampZoomRange(...args) { return call("clampZoomRange", ...args); }
  function zoomForMetric(...args) { return call("zoomForMetric", ...args); }
  function zoomRangeFromDragSelection(...args) { return call("zoomRangeFromDragSelection", ...args); }
  function savePrefs(...args) { return call("savePrefs", ...args); }

  const metricValueFormatting = createMetricValueFormatting({
    state,
    numberFormatter,
    numberFormatterWith,
    numberSeparators,
    lazySparklineIndex,
    renderSparkline,
    escapeHtml,
    metricLabel: _metricLabel
  });
  const {
    metricUnit,
    metricFractionDigits,
    formatMetricNumber,
    formatBitsPerSecond,
    formatMetricValue,
    formatTableMetricValue,
    renderTableMetricCell,
    parseFormattedNumber,
    metricLabel,
    metricColor,
    thresholdFor,
    thresholdSeverity,
    thresholdColor
  } = metricValueFormatting;

const metricChartState = createMetricChartState({
  state,
  document,
  window,
  icons,
  DASHBOARD_PRESETS,
  DEFAULT_TABLE_ORDER,
  formatNumber,
  escapeHtml,
  dateTimeFormatter,
  resolvedTimeZone,
  clearVisibleHistoryCache,
  tailLatencyLens,
  defaultSsCommandConfig,
  setSourceName,
  setActiveInvestigation,
  defaultTableColumns,
  clampChartColumns,
  applyChartZoomOperation,
  clampZoomRange,
  zoomForMetric,
  savePrefs
});
const {
  chartPointRadius,
  hasRealTimestampHistory,
  chartResolutionLabel,
  visibleHistory,
  chartPointBudget,
  renderableHistory,
  chartRowTime,
  nearestChartRow,
  nearestChartRowIndex,
  preserveExtremesDownsample,
  chartBgColor,
  chartXMinorTicks,
  timeLabel,
  dateTimePartsInZone,
  timeZoneOffsetMs,
  zonedDateTimeToEpoch,
  chartZoomFor,
  setZoom,
  applyChartZoomAction,
  orderedChartMetrics,
  chartMoveTargetIndex,
  chartMoveOptions,
  renderChartMoveMenu,
  positionChartMoveMenu,
  moveVisibleChartMetric,
  resetAllState,
  chartEpochAt,
  zoomDateTimeValue,
  setZoomFromDateInputs,
  zoomToTailLatencyWindow
} = metricChartState;

const metricStatsView = createMetricStatsView({ state, document, visibleHistory, formatMetricValue, metricColor, thresholdColor, chartBgColor, escapeHtml, metricLabel });
const { percentile, chartStats, renderPercentileDistribution, showPercentileTableCrosshair, clearPercentileTableCrosshair } = metricStatsView;

const COUNTER_AXIS_METRICS = new Set([
  "bytes_acked",
  "bytes_received",
  "bytes_sent",
  "bytes_retrans",
  "segs_out",
  "segs_in",
  "data_segs_out",
  "data_segs_in",
  "delivered"
]);

const metricSeriesView = createMetricSeriesView({ state, escapeHtml, metricLabel, metricColor, formatMetricValue, thresholdFor, chartBgColor });
const { chartSeriesKey, chartSeriesHidden, metricChartSeries, renderMetricChartLegend, renderChartThresholdOverlay } = metricSeriesView;

function chartAxisDomain(metric, values, thresholds = []) {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) return { min: 0, max: 1, span: 1, zoomed: false };
  const rawMin = Math.min(...finiteValues);
  const rawMax = Math.max(...finiteValues);
  const rawRange = rawMax - rawMin;
  const finiteThresholds = thresholds.filter(Number.isFinite);
  const thresholdMax = finiteThresholds.length ? Math.max(...finiteThresholds) : 0;
  const defaultMax = Math.max(rawMax, thresholdMax, 1);
  const defaultMin = Math.min(0, rawMin);
  const defaultSpan = Math.max(1, defaultMax - defaultMin);
  const canZoomCounter = COUNTER_AXIS_METRICS.has(metric) && rawMin > 0 && rawMax > 0;
  const compressed = canZoomCounter && rawRange > 0 && rawRange / Math.max(rawMax, 1) <= 0.08;
  const nearFlat = canZoomCounter && rawRange === 0 && rawMax >= 1000;
  if (!compressed && !nearFlat) return { min: defaultMin, max: defaultMax, span: defaultSpan, zoomed: false };
  const padding = Math.max(rawRange * 0.18, rawMax * 0.002, 1);
  const min = Math.max(0, rawMin - padding);
  const max = rawMax + padding;
  return { min, max, span: Math.max(1, max - min), zoomed: true };
}

function drawChart(deps = chartDrawDependencies()) {
  const { root = document, state: appState = state, drawChartInto: drawInto = drawChartInto } = deps;
  const svg = root.querySelector("#chart");
  if (!svg) return;
  drawInto(svg, appState.prefs.graphMetric, appState.prefs.graphStyle, true, deps);
}

function chartDrawDependencies() {
  return {
    root: document,
    state,
    drawChartInto,
    drawSingleMinimap,
    drawMinimaps,
    attachChartInteractions,
    chartRenderStyle,
    chartCardForMetric,
    updateChartActiveChrome
  };
}

function drawChartInto(svg, metric, style = null, showThreshold = false, deps = chartDrawDependencies()) {
  const { state: appState = state, attachChartInteractions: attachInteractions = attachChartInteractions } = deps;
  const renderStyle = style || appState.prefs.graphStyle;
  const w = svg.clientWidth || 640;
  const h = svg.clientHeight || 300;
  const visibleData = visibleHistory(metric);
  const renderData = renderableHistory(visibleData, metric, renderStyle, w);
  const data = renderData.rows;
  const values = data.map(d => d[metric] || 0);
  const t = thresholdFor(metric);
  const finiteThresholds = [t.warn, t.danger].filter(Number.isFinite);
  const axis = chartAxisDomain(metric, values, finiteThresholds);
  const max = axis.max;
  const min = axis.min;
  const span = axis.span;
  const yTicks = [0, .25, .5, .75, 1].map(f => min + f * span);
  const longestTick = yTicks.map(v => formatMetricValue(metric, v)).reduce((longest, value) => value.length > longest.length ? value : longest, "");
  const tickWidth = Math.min(150, Math.max(48, longestTick.length * 6.4));
  const pad = { l: Math.min(Math.max(76, tickWidth + 54), Math.max(110, w * 0.28)), r: 26, t: 34, b: 58 };
  const axisLabelX = Math.max(14, pad.l - tickWidth - 34);
  const firstTime = chartRowTime(data[0]);
  const lastTime = chartRowTime(data[data.length - 1]);
  const microburst = microburstSummary();
  const x = (row, i) => {
    const timeSpan = Math.max(1, lastTime - firstTime);
    if (data.length > 1 && timeSpan > 1) return pad.l + ((chartRowTime(row) - firstTime) / timeSpan) * (w - pad.l - pad.r);
    return pad.l + (i / Math.max(1, data.length - 1)) * (w - pad.l - pad.r);
  };
  const y = v => h - pad.b - ((v - min) / span) * (h - pad.t - pad.b);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(data[i], i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const base = `${x(data[values.length - 1], values.length - 1)},${h - pad.b} L${pad.l},${h - pad.b} Z`;
  const barWidth = Math.max(4, Math.min(18, (w - pad.l - pad.r) / Math.max(8, data.length) * 0.55));
  const pointRadius = chartPointRadius(data.length, renderStyle);
  const showPoints = renderStyle === "points" || renderStyle === "xy" || data.length <= 1500;
  const showMetricSeries = !chartSeriesHidden(metric, "value");
  const anyDanger = values.some(v => thresholdSeverity(metric, v) === "danger");
  const anyWarn = values.some(v => thresholdSeverity(metric, v) === "warn");
  const stroke = anyDanger ? "#ff5c77" : anyWarn ? "#ff9f43" : metricColor(metric);
  const singlePointLine = data.length === 1 ? `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(values[0] || 0)}" y2="${y(values[0] || 0)}" stroke="${stroke}" stroke-width="1.5" opacity=".85"/>` : "";
  const bars = values.map((v, i) => `<rect x="${x(data[i], i) - barWidth / 2}" y="${y(v)}" width="${barWidth}" height="${h - pad.b - y(v)}" fill="${thresholdColor(metric, v)}" opacity=".86"/>`).join("");
  const points = showPoints ? values.map((v, i) => `<circle cx="${x(data[i], i)}" cy="${y(v)}" r="${pointRadius.toFixed(2)}" fill="${thresholdColor(metric, v)}"><title>${metricLabel(metric)}=${formatMetricValue(metric, v)} at ${timeLabel(data[i]?.t || 0, data[i]?.epochMs)}</title></circle>`).join("") : "";
  const xTickFractions = w < 520 ? [0, .5, 1] : [0, .25, .5, .75, 1];
  const xTicks = xTickFractions.map(f => {
    const targetTime = firstTime + f * Math.max(1, lastTime - firstTime);
    const row = data.reduce((best, item) => Math.abs(chartRowTime(item) - targetTime) < Math.abs(chartRowTime(best) - targetTime) ? item : best, data[0] || {});
    const epoch = row?.epochMs;
    let label;
    if (epoch) {
      const d = new Date(epoch);
      label = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
    } else {
      label = `t+${Math.round(row?.t || 0)}s`;
    }
    return { x: pad.l + f * (w - pad.l - pad.r), label };
  });
  const showWarnLine = showThreshold && appState.prefs.chartLayout.showThresholds && Number.isFinite(t.warn) && !chartSeriesHidden(metric, "warn");
  const showDangerLine = showThreshold && appState.prefs.chartLayout.showThresholds && Number.isFinite(t.danger) && !chartSeriesHidden(metric, "danger");
  const warnY = showWarnLine ? y(t.warn) : 0;
  const dangerY = showDangerLine ? y(t.danger) : 0;
  const thresholdOverlay = renderChartThresholdOverlay([
    { show: showWarnLine, name: "warn", formatted: formatMetricValue(metric, t.warn), y: warnY, color: "#ff9f43", textColor: "#ffcb80", dash: "7 6" },
    { show: showDangerLine, name: "danger", formatted: formatMetricValue(metric, t.danger), y: dangerY, color: "#ff5c77", textColor: "#ff9eb0", dash: "4 4" }
  ], pad, w, h);
  const microburstBand = chartMicroburstBand(microburst, data, pad, w, h, firstTime, lastTime);
  const annotationOverlay = chartAnnotationOverlay(metric, data, pad, w, h, firstTime, lastTime);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.dataset.metric = metric;
  svg.dataset.plotLeft = String(pad.l);
  svg.dataset.plotRight = String(w - pad.r);
  svg.dataset.plotTop = String(pad.t);
  svg.dataset.plotBottom = String(h - pad.b);
  svg.dataset.renderStyle = renderStyle;
  svg.innerHTML = `
    <defs><linearGradient id="areaFill-${metric.replace(/\W/g, "")}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${stroke}" stop-opacity=".48"/><stop offset="1" stop-color="${stroke}" stop-opacity="0"/></linearGradient></defs>
    <rect x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="${chartBgColor()}"/>
    ${yTicks.map(v => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#263241"/><text x="${pad.l - 10}" y="${y(v) + 4}" text-anchor="end" fill="#8c9aab" font-size="11">${formatMetricValue(metric, v)}</text>`).join("")}
    ${xTicks.map((tick, i) => `<line x1="${tick.x}" x2="${tick.x}" y1="${pad.t}" y2="${h - pad.b}" stroke="#182434"/><text x="${tick.x}" y="${h - 18}" text-anchor="${i === xTicks.length - 1 ? "end" : i === 0 ? "start" : "middle"}" fill="#8c9aab" font-size="11">${tick.label}</text>`).join("")}
    ${microburstBand}
    ${thresholdOverlay}
    <text x="${pad.l}" y="18" fill="#edf4ff" font-size="13" font-weight="700">${metricLabel(metric)}${axis.zoomed ? " - zoomed Y" : ""}${renderData.reduced ? ` (${formatNumber(data.length)}/${formatNumber(renderData.total)} pts)` : ""}</text>
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="#c4d0de" font-size="12">Time since first snapshot (${escapeHtml(resolvedTimeZone())})</text>
    <text x="${axisLabelX}" y="${h / 2}" transform="rotate(-90 ${axisLabelX} ${h / 2})" text-anchor="middle" fill="#c4d0de" font-size="12">${metricLabel(metric)} ${metricUnit(metric) ? `(${metricUnit(metric)})` : ""}</text>
    ${showMetricSeries && renderStyle === "area" ? `${singlePointLine}<path d="${line} L${base}" fill="url(#areaFill-${metric.replace(/\W/g, "")})"/><path d="${line}" fill="none" stroke="${stroke}" stroke-width="1.5"/>${points}` : ""}
    ${showMetricSeries && renderStyle === "bars" ? bars : ""}
    ${showMetricSeries && renderStyle === "line" ? `${singlePointLine}<path d="${line}" fill="none" stroke="${stroke}" stroke-width="1.5"/>${points}` : ""}
    ${showMetricSeries && (renderStyle === "points" || renderStyle === "xy") ? points : ""}
    ${annotationOverlay}
    ${appState.baseline?.history?.length && !chartSeriesHidden(metric, "baseline") ? (() => { const bh = appState.baseline.history; const bValues = bh.map(d => d[metric] || 0); if (!bValues.some(v => v > 0)) return ""; const bLine = bValues.map((v, i) => `${i ? "L" : "M"}${(pad.l + (i / Math.max(1, bh.length - 1)) * (w - pad.l - pad.r)).toFixed(1)},${y(v).toFixed(1)}`).join(" "); return `<path d="${bLine}" fill="none" stroke="#ffd166" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.6"/>`; })() : ""}
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="#52657a"/>
    <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="#52657a"/>
    <g class="crosshair-layer" data-crosshair-layer="1" pointer-events="none"></g>
    <rect class="zoom-capture" x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="transparent" pointer-events="all"/>
  `;
  attachChartContextAnnotation(svg);
  if (appState.prefs.chartLayout.showCrosshair) attachInteractions(svg, deps);
}

function scheduleMultiChartDraw(deps = chartDrawDependencies()) {
  const { root = document, state: appState = state, drawChartInto: drawInto = drawChartInto, drawMinimaps: drawMaps = drawMinimaps } = deps;
  const charts = [...root.querySelectorAll("[data-mini-chart]")];
  if (!charts.length) return;
  const token = appState.chartRenderToken + 1;
  appState.chartRenderToken = token;
  const renderStyle = appState.prefs.graphStyle === "xy" ? "points" : appState.prefs.graphStyle;
  let index = 0;
  const drawSlice = () => {
    if (appState.chartRenderToken !== token) return;
    const frameStart = performance.now();
    while (index < charts.length && performance.now() - frameStart < 12) {
      const svg = charts[index];
      if (svg?.isConnected) drawInto(svg, svg.dataset.miniChart, renderStyle, true, deps);
      index += 1;
    }
    if (index < charts.length) requestAnimationFrame(drawSlice);
    else drawMaps(deps);
  };
  requestAnimationFrame(drawSlice);
}

function drawMinimaps(deps = chartDrawDependencies()) {
  const { root = document, drawSingleMinimap: drawMinimap = drawSingleMinimap } = deps;
  root.querySelectorAll("[data-minimap]").forEach(canvas => drawMinimap(canvas, canvas.dataset.minimap, deps));
}

function drawSingleMinimap(canvas, metric, deps = chartDrawDependencies()) {
    const { state: appState = state } = deps;
    const history = appState.history;
    if (!history.length) return;
    const vals = history.map(r => Number(r[metric]) || 0);
    if (!vals.some(v => v > 0)) return;
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 200;
    const h = 24;
    canvas.width = w * 2; canvas.height = h * 2;
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    // Draw full waveform
    const max = Math.max(...vals, 1);
    const step = Math.max(1, Math.floor(vals.length / w));
    ctx.fillStyle = "rgba(93,183,255,0.25)";
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i < w; i++) {
      const idx = Math.min(vals.length - 1, Math.floor((i / w) * vals.length));
      const v = vals[idx] / max;
      ctx.lineTo(i, h - v * (h - 2));
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    // Draw line on top
    ctx.strokeStyle = "rgba(93,183,255,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < w; i++) {
      const idx = Math.min(vals.length - 1, Math.floor((i / w) * vals.length));
      const v = vals[idx] / max;
      if (i === 0) ctx.moveTo(i, h - v * (h - 2));
      else ctx.lineTo(i, h - v * (h - 2));
    }
    ctx.stroke();
    // Draw zoom window highlight
    const zoom = chartZoomFor(metric);
    if (zoom && (zoom.start > 0.001 || zoom.end < 0.999)) {
      const x1 = zoom.start * w, x2 = zoom.end * w;
      // Dim outside
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, x1, h);
      ctx.fillRect(x2, 0, w - x2, h);
      // Window border
      ctx.strokeStyle = "rgba(93,183,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x1, 0.5, x2 - x1, h - 1);
    }
}

function chartRenderStyle() {
  return state.prefs.graphStyle === "xy" ? "points" : state.prefs.graphStyle;
}

function chartCardForMetric(metric, deps = chartDrawDependencies()) {
  const { root = document } = deps;
  return [...root.querySelectorAll("[data-chart-card]")].find(card => card.dataset.chartCard === metric) || null;
}

function updateChartActiveChrome(metric, action, deps = chartDrawDependencies()) {
  const { root = document } = deps;
  root.querySelectorAll(".chart-card.active-chart").forEach(card => card.classList.remove("active-chart"));
  root.querySelectorAll(".chart-card-tools .active-chart-tool").forEach(button => button.classList.remove("active-chart-tool"));
  const card = chartCardForMetric(metric, deps);
  if (!card) return;
  card.classList.add("active-chart");
  const button = [...card.querySelectorAll("[data-chart-zoom]")].find(item => item.dataset.chartZoom === action);
  if (button) {
    button.classList.remove("active-chart-tool");
    void button.offsetWidth;
    button.classList.add("active-chart-tool");
  }
}

function redrawChartCardMetric(metric, action = state.activeChartAction, deps = chartDrawDependencies()) {
  const { state: appState = state, drawChartInto: drawInto = drawChartInto, drawSingleMinimap: drawMinimap = drawSingleMinimap } = deps;
  const card = chartCardForMetric(metric, deps);
  const svg = card?.querySelector("[data-mini-chart]");
  if (!svg?.isConnected) return false;
  appState.chartRenderToken += 1;
  drawInto(svg, metric, chartRenderStyle(), true, deps);
  const minimap = card?.querySelector("[data-minimap]");
  if (minimap) drawMinimap(minimap, metric, deps);
  updateChartActiveChrome(metric, action, deps);
  return true;
}

  // --- BDP charts & interactions (delegated to bdp-chart-drawing.js) ---
  const _bdpDrawing = createBdpChartDrawing({
    state, document, chartDrawDependencies, chartBgColor,
    chartTooltipOpacity: (...a) => call("chartTooltipOpacity", ...a),
    escapeHtml, formatNumber, numberFormatter,
    formatMetricValue, formatBitsPerSecond, formatBytesHuman, metricLabel, metricUnit, metricColor, thresholdFor,
    thresholdSeverity, thresholdColor, timeLabel, dateTimeFormatter, resolvedNumberLocale, resolvedTimeZone,
    bdpWindowAnalysis: (...a) => call("bdpWindowAnalysis", ...a),
    chartAnnotationOverlay: (...a) => call("chartAnnotationOverlay", ...a),
    annotationKindForChartContext: (...a) => call("annotationKindForChartContext", ...a),
    annotationLabelForChartContext: (...a) => call("annotationLabelForChartContext", ...a),
    currentSourceAnnotations: (...a) => call("currentSourceAnnotations", ...a),
    annotationColor: (...a) => call("annotationColor", ...a),
    toast: (...a) => call("toast", ...a),
    render: (...a) => call("render", ...a),
    visibleHistory, chartRowTime, nearestChartRow,
    nearestChartRowIndex, chartPointBudget, renderableHistory, chartAxisDomain, chartSeriesKey,
    chartSeriesHidden, metricChartSeries, drawChartInto, chartZoomFor, zoomRangeFromDragSelection,
    setZoom, redrawChartCardMetric, drawChart
  });
  const { drawCorrelation, drawBdpWindowCharts, bdpChartSeries, bdpSeriesValues, bdpPath, bdpMarkerOverlay, drawBdpWindowChart, attachBdpCrosshair, svgPoint, chartPointerContext, chartContextMenuPosition, attachChartContextAnnotation, attachChartInteractions } = _bdpDrawing;

  return {
    metricUnit, metricFractionDigits, formatMetricNumber, formatBitsPerSecond, formatMetricValue, formatTableMetricValue, renderTableMetricCell, parseFormattedNumber,
    metricLabel, metricColor, thresholdFor, thresholdSeverity, thresholdColor, percentile, chartStats, renderPercentileDistribution, showPercentileTableCrosshair, clearPercentileTableCrosshair,
    chartPointRadius, hasRealTimestampHistory, chartResolutionLabel, visibleHistory, chartPointBudget, renderableHistory, chartRowTime, nearestChartRow, nearestChartRowIndex, preserveExtremesDownsample,
    chartBgColor, chartXMinorTicks, timeLabel, dateTimePartsInZone, timeZoneOffsetMs, zonedDateTimeToEpoch, chartZoomFor, setZoom, applyChartZoomAction, orderedChartMetrics,
    chartMoveTargetIndex, chartMoveOptions, renderChartMoveMenu, positionChartMoveMenu, moveVisibleChartMetric, resetAllState, chartEpochAt, zoomDateTimeValue, setZoomFromDateInputs, zoomToTailLatencyWindow,
    chartAxisDomain, chartSeriesKey, chartSeriesHidden, metricChartSeries, renderMetricChartLegend, renderChartThresholdOverlay, drawChart, chartDrawDependencies, drawChartInto, scheduleMultiChartDraw,
    drawMinimaps, drawSingleMinimap, chartRenderStyle, chartCardForMetric, updateChartActiveChrome, redrawChartCardMetric, drawCorrelation, drawBdpWindowCharts, bdpChartSeries, bdpSeriesValues,
    bdpPath, bdpMarkerOverlay, drawBdpWindowChart, attachBdpCrosshair, svgPoint, chartPointerContext, chartContextMenuPosition, attachChartContextAnnotation, attachChartInteractions
  };
}
