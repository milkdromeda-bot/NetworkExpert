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

function metricUnit(metric) {
  return thresholdFor(metric).unit || "";
}

function metricFractionDigits(metric, value) {
  const numeric = Math.abs(Number(value || 0));
  if (["pacing_rate", "delivery_rate", "tx_bps", "rx_bps", "sendQ", "recvQ", "rcv_space", "rcv_ssthresh", "skmem.r", "skmem.rb", "skmem.t", "skmem.d", "bytes_sent", "bytes_acked", "bytes_received", "segs_out", "segs_in", "cwnd", "backoff", "retrans"].includes(metric)) return 0;
  if (metric === "skmem.d_rate") return numeric > 0 && numeric < 1 ? 3 : 2;
  if (["rtt", "rto", "ato", "rttvar", "rcv_rtt"].includes(metric)) return numeric > 0 && numeric < 10 ? 3 : Number.isInteger(Number(value)) ? 0 : 3;
  return Number.isInteger(Number(value)) ? 0 : 2;
}

function formatMetricNumber(metric, value) {
  const digits = metricFractionDigits(metric, value);
  const minimumDigits = ["rtt", "rto", "ato", "rcv_rtt"].includes(metric) && Math.abs(Number(value || 0)) > 0 && Math.abs(Number(value || 0)) < 10 ? digits : 0;
  return numberFormatterWith(minimumDigits, digits).format(Number(value || 0));
}

function formatBitsPerSecond(value) {
  const numeric = Number(value || 0);
  const sign = numeric < 0 ? -1 : 1;
  let scaled = Math.abs(numeric);
  const units = ["bps", "kbps", "Mbps", "Gbps", "Tbps"];
  let unitIndex = 0;
  while (scaled >= 1000 && unitIndex < units.length - 1) {
    scaled /= 1000;
    unitIndex += 1;
  }
  const digits = unitIndex === 0 ? 0 : scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const formatted = numberFormatter(digits).format(sign * scaled);
  return `${formatted} ${units[unitIndex]}`;
}

function formatMetricValue(metric, value) {
  const unit = metricUnit(metric);
  if (unit === "bps") return formatBitsPerSecond(value);
  return `${formatMetricNumber(metric, value)}${unit ? ` ${unit}` : ""}`;
}

function formatTableMetricValue(metric, value) {
  return state?.prefs?.tableUnits === false ? formatMetricNumber(metric, value) : formatMetricValue(metric, value);
}

function renderTableMetricCell(metric, value, socketKey) {
  const severity = thresholdSeverity(metric, Number(value || 0));
  const idx = socketKey ? lazySparklineIndex() : null;
  const spark = idx?.get(socketKey)?.[metric];
  const sparkHtml = spark?.length > 2 ? ` ${renderSparkline(spark)}` : "";
  return `<span class="table-metric ${severity}" title="${escapeHtml(metricLabel(metric))}: ${formatMetricValue(metric, value)}">${formatTableMetricValue(metric, value)}${sparkHtml}</span>`;
}

function parseFormattedNumber(value) {
  if (typeof value === "number") return value;
  const { group, decimal } = numberSeparators();
  const normalized = String(value || "")
    .split(group).join("")
    .replace(/\s|\u202f|\u00a0/g, "")
    .replace(decimal, ".")
    .replace(/[^\d.-]/g, "");
  return Number(normalized || 0);
}

function metricLabel(metric) {
  return _metricLabel(metric);
}

function metricColor(metric) {
  return {
    rtt: "#5db7ff",
    rto: "#ff9f43",
    rcv_rtt: "#93c5fd",
    rcv_space: "#34d399",
    rcv_ssthresh: "#fbbf24",
    sendQ: "#39d6d6",
    recvQ: "#d38cff",
    cwnd: "#4cde8a",
    ato: "#ffd166",
    "skmem.r": "#7dd3fc",
    "skmem.rb": "#60a5fa",
    "skmem.t": "#f472b6",
    "skmem.d": "#ff5c77",
    "skmem.d_rate": "#ff2e63",
    pacing_rate: "#a3e635",
    delivery_rate: "#67e8f9",
    tx_bps: "#22d3ee",
    rx_bps: "#818cf8",
    bytes_sent: "#2dd4bf",
    bytes_acked: "#38bdf8",
    bytes_received: "#a78bfa",
    rttvar: "#fb7185",
    segs_out: "#2dd4bf",
    segs_in: "#c084fc",
    backoff: "#f97316",
    retrans: "#f43f5e"
  }[metric] || "#5db7ff";
}

function thresholdFor(metric) {
  return state.thresholds[metric] || { comfort: 0, warn: Number.POSITIVE_INFINITY, danger: Number.POSITIVE_INFINITY, unit: "" };
}

function thresholdSeverity(metric, value) {
  const t = thresholdFor(metric);
  if (t.inverse) {
    if (value <= t.danger) return "danger";
    if (value <= t.warn) return "warn";
    return "comfort";
  }
  if (value >= t.danger) return "danger";
  if (value >= t.warn) return "warn";
  return "comfort";
}

function thresholdColor(metric, value) {
  const sev = thresholdSeverity(metric, value);
  return sev === "danger" ? "#ff5c77" : sev === "warn" ? "#ff9f43" : metricColor(metric);
}

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

function chartPointRadius(pointCount, style) {
  const base = { XS: 1, S: 2, M: 3.2, L: 4.6 }[state.prefs.chartPointSize || "S"] || 2;
  if (base <= 1) return 1;
  const count = Math.max(1, Number(pointCount || 1));
  const densityFactor = count <= 80 ? 1 : count <= 180 ? 0.78 : count <= 400 ? 0.58 : count <= 900 ? 0.42 : 0.3;
  const styleFactor = style === "points" || style === "xy" ? 1.15 : 1;
  return Math.max(1, Math.min(base * styleFactor, base * densityFactor * styleFactor));
}

function hasRealTimestampHistory() {
  return state.history.some(row => row?.epochMs);
}

function chartResolutionLabel() {
  const visible = visibleHistory().length;
  const mode = hasRealTimestampHistory() ? "real timestamps" : "synthetic timeline";
  return `${formatNumber(visible)} visible point(s), ${mode}`;
}

function visibleHistory(metric = null) {
  const rows = state.history.length ? state.history : [];
  if (rows.length <= 2) return rows;
  const zoom = chartZoomFor(metric);
  const cacheKey = `${state.dataVersion}|${state.selectedId}|${metric || "shared"}|${rows.length}|${rows[0]?.epochMs || 0}|${rows[rows.length - 1]?.epochMs || 0}|${zoom.start}|${zoom.end}`;
  const historyCache = state.cache.visibleHistoryRowsByKey || (state.cache.visibleHistoryRowsByKey = new Map());
  if (historyCache.has(cacheKey)) return historyCache.get(cacheKey);
  const start = Math.floor(zoom.start * (rows.length - 1));
  const end = Math.max(start + 1, Math.ceil(zoom.end * (rows.length - 1)));
  const visibleRows = rows.slice(start, end + 1);
  state.cache.visibleHistoryKey = cacheKey;
  state.cache.visibleHistoryRows = visibleRows;
  historyCache.set(cacheKey, visibleRows);
  if (historyCache.size > 16) historyCache.delete(historyCache.keys().next().value);
  return visibleRows;
}

function chartPointBudget(style, width) {
  const pxBudget = Math.max(1200, Math.round((width || 640) * 8));
  const styleBudget = style === "bars" ? 5000 : style === "points" || style === "xy" ? 8000 : 16000;
  return Math.min(styleBudget, pxBudget);
}

function renderableHistory(rows, metric, style, width) {
  const budget = chartPointBudget(style, width);
  if (rows.length <= budget) return { rows, total: rows.length, reduced: false };
  return {
    rows: preserveExtremesDownsample(rows, metric, budget),
    total: rows.length,
    reduced: true
  };
}

function chartRowTime(row) {
  return row?.epochMs ?? (row?.t || 0) * 1000;
}

function nearestChartRow(rows, pct) {
  if (!rows.length) return {};
  const first = chartRowTime(rows[0]);
  const last = chartRowTime(rows[rows.length - 1]);
  const target = first + Math.max(0, Math.min(1, pct)) * Math.max(1, last - first);
  return rows.reduce((best, row) => (
    Math.abs(chartRowTime(row) - target) < Math.abs(chartRowTime(best) - target) ? row : best
  ), rows[0]);
}

function nearestChartRowIndex(rows, pct) {
  if (!rows.length) return -1;
  const first = chartRowTime(rows[0]);
  const last = chartRowTime(rows[rows.length - 1]);
  const target = first + Math.max(0, Math.min(1, pct)) * Math.max(1, last - first);
  let bestIndex = 0;
  let bestDistance = Infinity;
  rows.forEach((row, index) => {
    const distance = Math.abs(chartRowTime(row) - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function preserveExtremesDownsample(rows, metric, budget) {
  if (rows.length <= budget || budget < 8) return rows;
  const middleBudget = Math.max(2, budget - 2);
  const bucketCount = Math.max(1, Math.floor(middleBudget / 2));
  const bucketSize = Math.max(1, Math.ceil((rows.length - 2) / bucketCount));
  const picked = new Map([[0, rows[0]], [rows.length - 1, rows[rows.length - 1]]]);
  for (let start = 1; start < rows.length - 1; start += bucketSize) {
    const end = Math.min(rows.length - 1, start + bucketSize);
    let minIndex = start;
    let maxIndex = start;
    for (let i = start + 1; i < end; i += 1) {
      const value = rows[i][metric] || 0;
      if (value < (rows[minIndex][metric] || 0)) minIndex = i;
      if (value > (rows[maxIndex][metric] || 0)) maxIndex = i;
    }
    picked.set(minIndex, rows[minIndex]);
    picked.set(maxIndex, rows[maxIndex]);
  }
  return [...picked.entries()].sort((a, b) => a[0] - b[0]).slice(0, budget).map(([, row]) => row);
}

function chartBgColor() {
  return document.documentElement.getAttribute("data-theme") === "light" ? "#f0f3f7" : "#050910";
}

function chartXMinorTicks(data, pad, w, h, firstTime, lastTime) {
  const span = lastTime - firstTime;
  if (span <= 0 || !data.length) return "";
  const plotW = w - pad.l - pad.r;
  let interval;
  if (span <= 5000) interval = 1000;
  else if (span <= 30000) interval = 5000;
  else if (span <= 120000) interval = 15000;
  else if (span <= 600000) interval = 60000;
  else interval = 300000;
  const ticks = [];
  const start = Math.ceil(firstTime / interval) * interval;
  for (let t = start; t <= lastTime; t += interval) {
    const xPos = pad.l + ((t - firstTime) / span) * plotW;
    if (xPos <= pad.l + 20 || xPos >= w - pad.r - 20) continue;
    const d = new Date(t);
    const label = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
    ticks.push({ x: xPos, label });
  }
  return ticks.map(tick => `<line x1="${tick.x}" x2="${tick.x}" y1="${h - pad.b}" y2="${h - pad.b + 5}" stroke="#8c9aab" opacity="0.4"/><text x="${tick.x}" y="${h - 6}" text-anchor="middle" fill="#8c9aab" font-size="9" opacity="0.5">${tick.label}</text>`).join("");
}

function timeLabel(seconds, epochMs = null) {
  if (epochMs) {
    const d = new Date(epochMs);
    const h = String(d.getUTCHours()).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    const s = String(d.getUTCSeconds()).padStart(2, "0");
    const ms = String(d.getUTCMilliseconds()).padStart(3, "0");
    return `${h}:${m}:${s}.${ms}`;
  }
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}h`;
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)}m`;
  return `${Math.round(seconds)}s`;
}

function dateTimePartsInZone(epochMs) {
  const parts = dateTimeFormatter("en-CA", {
    timeZone: resolvedTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }, "parts-zone").formatToParts(new Date(epochMs));
  const value = type => parts.find(part => part.type === type)?.value || "00";
  const hour = value("hour") === "24" ? "00" : value("hour");
  return `${value("year")}-${value("month")}-${value("day")}T${hour}:${value("minute")}:${value("second")}`;
}

function timeZoneOffsetMs(timeZone, epochMs) {
  const parts = dateTimeFormatter("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }, "offset").formatToParts(new Date(epochMs));
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const hour = map.hour === "24" ? "00" : map.hour;
  return Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), Number(hour), Number(map.minute), Number(map.second)) - epochMs;
}

function zonedDateTimeToEpoch(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return NaN;
  const [, year, month, day, hour, minute, second = 0] = match.map(value => Number(value || 0));
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const zone = resolvedTimeZone();
  const firstPass = utcGuess - timeZoneOffsetMs(zone, utcGuess);
  return utcGuess - timeZoneOffsetMs(zone, firstPass);
}

function chartZoomFor(metric = null) {
  return zoomForMetric(state.chartZoomByMetric, state.chartZoom, metric);
}
function setZoom(start, end, metric = null) {
  const next = clampZoomRange(start, end);
  if (metric) state.chartZoomByMetric[metric] = next;
  else state.chartZoom = next;
  clearVisibleHistoryCache();
}
function applyChartZoomAction(action, metric = null) {
  const result = applyChartZoomOperation({
    action,
    metric,
    sharedZoom: state.chartZoom,
    chartZoomByMetric: state.chartZoomByMetric
  });
  state.chartZoom = result.sharedZoom;
  state.chartZoomByMetric = result.chartZoomByMetric;
  if (!metric) state.chartZoomByMetric = {};
  state.activeChartMetric = result.activeChartMetric || metric || state.prefs.graphMetric;
  state.activeChartAction = result.activeChartAction;
  clearVisibleHistoryCache();
}

function orderedChartMetrics() {
  const order = state.prefs.chartLayout.panelOrder || [];
  return [...state.chartMetrics].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

function chartMoveTargetIndex(metric, direction) {
  const visible = orderedChartMetrics();
  const current = visible.indexOf(metric);
  const columns = clampChartColumns(state.prefs.chartLayout.columns);
  if (current < 0) return -1;
  const column = current % columns;
  if (direction === "left") return column > 0 ? current - 1 : -1;
  if (direction === "right") return column < columns - 1 && current + 1 < visible.length ? current + 1 : -1;
  if (direction === "up") return current - columns >= 0 ? current - columns : -1;
  if (direction === "down") return current + columns < visible.length ? current + columns : -1;
  if (typeof direction === "number") return current + direction;
  return -1;
}

function chartMoveOptions(metric) {
  const visible = orderedChartMetrics();
  const current = visible.indexOf(metric);
  if (current < 0) return [];
  const options = [
    { direction: "left", label: "Move left", icon: icons.arrowLeft },
    { direction: "right", label: "Move right", icon: icons.arrowRight },
    { direction: "up", label: "Move up", icon: icons.up },
    { direction: "down", label: "Move down", icon: icons.down }
  ].filter(option => {
    const targetIndex = chartMoveTargetIndex(metric, option.direction);
    return targetIndex >= 0 && targetIndex < visible.length;
  }).map(option => ({
    ...option,
    targetMetric: visible[chartMoveTargetIndex(metric, option.direction)]
  }));
  return options;
}

function renderChartMoveMenu(metric) {
  return `<button class="mini chart-drag-handle" draggable="true" data-chart-drag="${escapeHtml(metric)}" title="Drag to reorder"><i class="ri-draggable"></i></button>`;
}

function positionChartMoveMenu(button, metric) {
  const options = chartMoveOptions(metric);
  const menuWidth = 220;
  const menuHeight = Math.max(56, 16 + options.length * 38);
  const rect = button.getBoundingClientRect();
  const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
  const preferBelow = rect.bottom + menuHeight + 8 <= window.innerHeight;
  const top = preferBelow ? rect.bottom + 6 : Math.max(8, rect.top - menuHeight - 6);
  state.openChartMoveMetric = metric;
  state.openChartMovePos = { left: Math.round(left), top: Math.round(top) };
}

function moveVisibleChartMetric(metric, directionOrTarget) {
  const visible = orderedChartMetrics();
  const current = visible.indexOf(metric);
  let targetMetric;
  if (visible.includes(directionOrTarget)) {
    targetMetric = directionOrTarget;
  } else {
    const targetIndex = chartMoveTargetIndex(metric, directionOrTarget);
    targetMetric = visible[targetIndex];
  }
  if (current < 0 || !targetMetric || metric === targetMetric) return false;
  const order = [...state.prefs.chartLayout.panelOrder];
  const currentOrderIndex = order.indexOf(metric);
  const targetOrderIndex = order.indexOf(targetMetric);
  if (currentOrderIndex < 0 || targetOrderIndex < 0) return false;
  [order[currentOrderIndex], order[targetOrderIndex]] = [order[targetOrderIndex], order[currentOrderIndex]];
  state.prefs.chartLayout.panelOrder = order;
  savePrefs();
  return true;
}

function resetAllState() {
  state.raw = "";
  state.command = "ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all";
  state.ssCommandConfig = defaultSsCommandConfig();
  setSourceName("empty workspace");
  state.sockets = [];
  state.healthScore = null;
  state.selectedId = null;
  setActiveInvestigation(state, null);
  state.anomalies = [];
  state.alertEvents = [];
  state.baseline = null;
  state.view = "ingest";
  state.activeTab = "sockets";
  state.drawer = null;
  state.modal = null;
  state.annotationContext = null;
  state.statsMetric = null;
  state.ingestRawExpanded = true;
  state.openChartMoveMetric = null;
  state.openChartMovePos = null;
  state.openMenuPos = null;
  state.openMenuId = null;
  state.openExportMenu = null;
  state.openExportMenuPos = null;
  state.openDashboardPresetMenu = false;
  state.activeDashboardPreset = Object.keys(DASHBOARD_PRESETS)[0] || "noc";
  state.openConversationInsightKey = null;
  state.openConversationInsightPos = null;
  state.conversationSort = { key: "anomalies", dir: "desc" };
  state.selectedMapEdgeId = null;
  state.history = [];
  state.chartMetrics = ["tx_bps", "rx_bps", "rtt", "rto", "sendQ", "skmem.d"];
  state.hiddenChartSeries = new Set();
  state.hiddenJvmSeries = new Set();
  state.jvmTable = { page: 1, pageSize: 20, sortKey: "time", sortDir: "desc" };
  state.correlation = { x: "rtt", y: "sendQ" };
  state.analysisDirty = true;
  state.bandwidthIndex = {};
  state.cache = {
    timestampRawVersion: -1,
    timestampBlocks: [],
    snapshotRawVersion: -1,
    timestampSnapshots: [],
    filteredKey: "",
    filteredRows: null,
    optionKey: "",
    optionSets: null,
    anomalyMapKey: "",
    anomaliesBySocketId: null,
    socketMapKey: "",
    socketsById: null,
    visibleHistoryKey: "",
    visibleHistoryRows: null,
    visibleHistoryRowsByKey: new Map(),
    microburstKey: "",
    microburstSummary: null,
    tailLatencyKey: "",
    tailLatencySummary: null
  };
  state.rawVersion += 1;
  setZoom(0, 1);
  state.table = {
    page: 1,
    pageSize: state.prefs.defaultPageSize,
    sortKey: "risk",
    sortDir: "desc",
    pinned: ["risk", "state", "local"],
    visible: defaultTableColumns(),
    order: [...DEFAULT_TABLE_ORDER],
    filters: { text: "", risk: "all", state: "all", family: "all", minRecvQ: "", minSendQ: "", minRtt: "", srcIp: "", dstIp: "", srcPort: "", dstPort: "", process: "", onlyAnomalies: false }
  };
}

function chartEpochAt(which) {
  const rows = state.history;
  if (!rows.length) return null;
  const first = rows[0]?.epochMs || Date.now();
  const last = rows[rows.length - 1]?.epochMs || (first + (rows[rows.length - 1]?.t || 0) * 1000);
  const ratio = which === "start" ? state.chartZoom.start : state.chartZoom.end;
  return first + ratio * (last - first);
}

function zoomDateTimeValue(which) {
  const epoch = chartEpochAt(which);
  if (!epoch) return "";
  return dateTimePartsInZone(epoch);
}

function setZoomFromDateInputs() {
  const startValue = document.querySelector("#startTimeInput")?.value;
  const endValue = document.querySelector("#endTimeInput")?.value;
  if (!startValue || !endValue || !state.history.length) return;
  const first = state.history[0]?.epochMs || Date.now();
  const last = state.history[state.history.length - 1]?.epochMs || (first + (state.history[state.history.length - 1]?.t || 0) * 1000);
  const start = zonedDateTimeToEpoch(startValue);
  const end = zonedDateTimeToEpoch(endValue);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || last <= first) return;
  setZoom((start - first) / (last - first), (end - first) / (last - first));
}

function zoomToTailLatencyWindow() {
  const lens = tailLatencyLens();
  if (!lens || !state.history.length) return false;
  const first = state.history[0]?.epochMs || 0;
  const last = state.history[state.history.length - 1]?.epochMs || first;
  if (!Number.isFinite(first) || !Number.isFinite(last) || last <= first) return false;
  const paddingMs = Math.max(1000, ((lens.endEpochMs - lens.startEpochMs) || 0) * 0.2);
  const start = Math.max(first, lens.startEpochMs - paddingMs);
  const end = Math.min(last, lens.endEpochMs + paddingMs);
  setZoom((start - first) / (last - first), (end - first) / (last - first));
  return true;
}

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

function bdpChartSeries(analysis, kind) {
  const capacity = analysis.series?.capacityBps || null;
  if (kind === "bdp") {
    return [
      { key: "observedBdpBytes", label: "Observed BDP", color: "#7dd3fc", dash: "", value: sample => sample.observedBdpBytes },
      { key: "effectiveWindowBytes", label: "rcv_space/window", color: "#fbbf24", dash: "", value: sample => sample.effectiveWindowBytes },
      { key: "skmemRb", label: "skmem.rb", color: "#a78bfa", dash: "6 5", value: sample => sample.skmemRb },
      { key: "targetBdpBytes", label: "Target BDP", color: "#22c55e", dash: "7 5", value: sample => sample.targetBdpBytes }
    ];
  }
  return [
    { key: "observedThroughputBps", label: "Observed", color: "#7dd3fc", dash: "", value: sample => sample.observedThroughputBps == null ? null : sample.observedThroughputBps / 1e6 },
    { key: "throughputMaxByRcvSpaceBps", label: "Max by window", color: "#fbbf24", dash: "", value: sample => sample.throughputMaxByRcvSpaceBps == null ? null : sample.throughputMaxByRcvSpaceBps / 1e6 },
    { key: "deliveryRateBps", label: "delivery_rate", color: "#a78bfa", dash: "6 5", value: sample => sample.deliveryRateBps == null ? null : sample.deliveryRateBps / 1e6 },
    { key: "scaleCapabilityThroughputBps", label: "Scaling capacity", color: "#64748b", dash: "4 6", value: sample => sample.scaleCapabilityThroughputBps == null ? null : sample.scaleCapabilityThroughputBps / 1e6 },
    { key: "noScaleThroughputBps", label: "64 KB no scaling", color: "#94a3b8", dash: "2 6", value: sample => sample.noScaleThroughputBps == null ? null : sample.noScaleThroughputBps / 1e6 },
    { key: "capacityBps", label: "Configured capacity", color: "#22c55e", dash: "8 5", value: () => capacity ? capacity / 1e6 : null }
  ];
}

function bdpSeriesValues(data, series) {
  return data
    .map(series.value)
    .filter(value => Number.isFinite(value) && value >= 0);
}

function bdpPath(data, series, x, y) {
  const segments = [];
  let current = [];
  data.forEach((sample, index) => {
    const value = series.value(sample);
    if (!Number.isFinite(value) || value < 0) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push(`${current.length ? "L" : "M"}${x(sample, index).toFixed(1)},${y(value).toFixed(1)}`);
  });
  if (current.length) segments.push(current);
  return segments.map(segment => `<path d="${segment.join(" ")}" fill="none" stroke="${series.color}" stroke-width="2.4" stroke-dasharray="${series.dash}" opacity=".95"/>`).join("");
}

function bdpMarkerOverlay(data, kind, x, pad, h) {
  const labels = [];
  data.forEach((sample, index) => {
    const marker = sample.markers || {};
    const entries = kind === "bdp"
      ? [
          marker.bdpNearWindow ? { color: "#fbbf24", label: "BDP near/exceeds window" } : null,
          marker.counterReset ? { color: "#fb7185", label: "counter reset / reconnect" } : null
        ]
      : [
          marker.retrans ? { color: "#fb7185", label: "retrans" } : null,
          marker.rttSpike ? { color: "#f97316", label: "RTT spike" } : null,
          marker.rcvSpaceCollapse ? { color: "#fbbf24", label: "rcv_space collapse" } : null,
          marker.persist ? { color: "#ef4444", label: "persist" } : null,
          marker.counterReset ? { color: "#94a3b8", label: "counter reset / reconnect" } : null
        ];
    entries.filter(Boolean).slice(0, 2).forEach((entry, offset) => {
      labels.push(`<circle cx="${x(sample, index).toFixed(1)}" cy="${pad.t + 10 + offset * 12}" r="4" fill="${entry.color}" opacity=".92"><title>${escapeHtml(entry.label)} at ${escapeHtml(timeLabel(sample.t || 0, sample.epochMs))}</title></circle>`);
    });
  });
  return labels.join("");
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
