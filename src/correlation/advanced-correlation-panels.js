import { createFixChartDrawing } from "./fix-chart-drawing.js";

export function createAdvancedCorrelationPanels(getDeps) {
  const current = () => getDeps();
  const call = (name, ...args) => {
    const fn = current()[name];
    if (typeof fn !== "function") throw new Error(`Missing advanced correlation dependency: ${name}`);
    return fn(...args);
  };
  const proxiedObject = name => new Proxy({}, {
    get(_target, prop) {
      const source = current()[name];
      const value = source?.[prop];
      return typeof value === "function" ? value.bind(source) : value;
    },
    set(_target, prop, value) {
      const source = current()[name];
      if (!source) return false;
      source[prop] = value;
      return true;
    },
    has(_target, prop) { return prop in (current()[name] || {}); },
    ownKeys() { return Reflect.ownKeys(current()[name] || {}); },
    getOwnPropertyDescriptor(_target, prop) {
      const source = current()[name] || {};
      return Object.getOwnPropertyDescriptor(source, prop) || { configurable: true, enumerable: true, writable: true, value: source[prop] };
    }
  });

  const state = proxiedObject("state");
  const icons = proxiedObject("icons");

  function getDocument() { return current().document || globalThis.document; }
  function WorkerCtor() { return current().Worker || globalThis.Worker; }
  function performanceRef() { return current().performance || globalThis.performance || { now: Date.now }; }
  function requestAnimationFrameRef(callback) {
    const raf = current().requestAnimationFrame || globalThis.requestAnimationFrame || (fn => setTimeout(() => fn(performanceRef().now()), 16));
    return raf(callback);
  }
  function cancelAnimationFrameRef(handle) {
    const cancel = current().cancelAnimationFrame || globalThis.cancelAnimationFrame || clearTimeout;
    return cancel(handle);
  }

  function alignTimestamps(...args) { return call("alignTimestamps", ...args); }
  function chartBgColor(...args) { return call("chartBgColor", ...args); }
  function chartTooltipOpacity(...args) { return call("chartTooltipOpacity", ...args); }
  function computeFixStats(...args) { return call("computeFixStats", ...args); }
  function correlateFixLatency(...args) { return call("correlateFixLatency", ...args); }
  function correlateJvmStalls(...args) { return call("correlateJvmStalls", ...args); }
  function dateTimeFormatter(...args) { return call("dateTimeFormatter", ...args); }
  function dropRateSummary(...args) { return call("dropRateSummary", ...args); }
  function escapeHtml(...args) { return call("escapeHtml", ...args); }
  function formatBytesHuman(...args) { return call("formatBytesHuman", ...args); }
  function formatMetricValue(...args) { return call("formatMetricValue", ...args); }
  function formatNumber(...args) { return call("formatNumber", ...args); }
  function metricValue(...args) { return call("metricValue", ...args); }
  function parsedTimestampSnapshots(...args) { return call("parsedTimestampSnapshots", ...args); }
  function render(...args) { return call("render", ...args); }
  function renderFixLatencyPanelView(...args) { return call("renderFixLatencyPanelView", ...args); }
  function renderJvmGcPanelView(...args) { return call("renderJvmGcPanelView", ...args); }
  function resolvedNumberLocale(...args) { return call("resolvedNumberLocale", ...args); }
  function resolvedTimeZone(...args) { return call("resolvedTimeZone", ...args); }
  function setZoom(...args) { return call("setZoom", ...args); }
  function socketsById(...args) { return call("socketsById", ...args); }
  function timeLabel(...args) { return call("timeLabel", ...args); }
  function visibleHistory(...args) { return call("visibleHistory", ...args); }

function renderJvmGcPanel() {
  return renderJvmGcPanelView({
    state,
    icons,
    jvmPagedRows,
    renderJvmLegend,
    renderJvmPagination,
    renderJvmSortHeader,
    jvmSeverityClass,
    jvmSeverityLabel,
    jvmStallNature,
    escapeHtml,
    formatNumber,
    preciseDateTimeLabel
  });
}

function jvmLegendSeries(kind) {
  if (kind === "scatter") {
    return [
      { key: "scatter_warning", label: "Warning pauses", color: "#fbbf24", tip: "GC pauses with correlation score 0.20-0.50. Temporal overlap with TCP symptoms but moderate confidence." },
      { key: "scatter_high", label: "High score pauses", color: "#ef4444", tip: "GC pauses with correlation score > 0.50. Strong evidence of JVM-induced slow consumer behavior." },
      { key: "scatter_low", label: "Low score pauses", color: "#7dd3fc", tip: "GC pauses with correlation score < 0.20. Pause detected but no significant TCP impact observed." }
    ];
  }
  return [
    { key: "recvq", label: "Recv-Q", color: "#7dd3fc", tip: "TCP receive queue depth in bytes. Rises when the local JVM cannot drain incoming data fast enough - a key slow consumer signal." },
    { key: "gc_young", label: "Young GC", color: "#4ade80", tip: "Minor/young generation collections. Usually short (1-20 ms) but frequent. Under high allocation rate they can accumulate and starve the application." },
    { key: "gc_mixed", label: "Mixed GC", color: "#fbbf24", tip: "G1 mixed collections evacuating both young and old regions. Typically longer than young GC and may indicate heap pressure building up." },
    { key: "gc_full", label: "Full / Remark", color: "#ef4444", tip: "Full GC, Remark, or Cleanup pauses. These are the longest and most disruptive. Full GC indicates heap exhaustion or fragmentation." },
    { key: "gc_safepoint", label: "Safepoint", color: "#a78bfa", tip: "JVM safepoint pauses not related to GC (e.g. deoptimization, biased locking revocation). Can still block application threads." }
  ];
}

function jvmSeriesHidden(key) {
  return state.hiddenJvmSeries?.has(key);
}

function renderJvmLegend(kind) {
  return `<div class="bdp-legend jvm-legend" data-jvm-legend="${escapeHtml(kind)}">
    ${jvmLegendSeries(kind).map(item => `<span class="jvm-legend-item" data-jvm-series-key="${escapeHtml(item.key)}" style="cursor:pointer;${jvmSeriesHidden(item.key) ? "opacity:.4;text-decoration:line-through" : ""}"><i style="--legend-color:${item.color}"></i>${escapeHtml(item.label)}<span class="jvm-legend-tip">${escapeHtml(item.tip)}</span></span>`).join("")}
  </div>`;
}

function jvmSeverityClass(severity) {
  return String(severity || "info").replace(/_/g, "-");
}

function jvmSeverityLabel(severity) {
  return {
    warning_high: "warning high",
    warning: "warning",
    critical: "critical",
    info: "info",
    none: "none"
  }[severity] || String(severity || "info").replace(/_/g, " ");
}

function jvmSeverityRank(severity) {
  return { critical: 5, warning_high: 4, warning: 3, info: 2, none: 1 }[severity] || 0;
}

function jvmStallNature(row) {
  if (row.kind === "safepoint") return "Safepoint";
  const pause = row.pause || {};
  const labels = [];
  if (pause.type) labels.push(`${pause.type} GC`);
  if (pause.evacuationFailure) labels.push("evacuation failure");
  if (pause.humongousAllocation) labels.push("humongous allocation");
  if (pause.cause) labels.push(pause.cause);
  return labels.length ? labels.join(" / ") : "Other JVM pause";
}

function preciseDateTimeLabel(epochMs) {
  if (!epochMs) return "-";
  const d = new Date(epochMs);
  const tz = resolvedTimeZone();
  const base = dateTimeFormatter(resolvedNumberLocale(), {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }, "precise-date-time-noms").format(d);
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${base}.${ms}`;
}

function jvmTableRows(results = [], safepoints = []) {
  const history = visibleHistory().filter(sample => sample.epochMs);
  const alignedSafepoints = alignTimestamps(safepoints.map(item => ({ ...item, durationMs: item.totalMs })), history, state.jvmGc.clockOffsetMs);
  return [
    ...results.filter(row => row.score > 0).map(row => ({ ...row, kind: "gc", eventId: row.pause.id, durationMs: row.pause.durationMs, timestampMs: row.epochMs })),
    ...alignedSafepoints.map((pause, index) => ({
      kind: "safepoint",
      eventId: `SP-${index + 1}`,
      pause: { id: `SP-${index + 1}`, type: "Safepoint", cause: "JVM safepoint", durationMs: pause.durationMs || pause.totalMs || 0 },
      epochMs: pause.alignedEpochMs || pause.epochMs,
      timestampMs: pause.alignedEpochMs || pause.epochMs,
      durationMs: pause.durationMs || pause.totalMs || 0,
      score: 0,
      severity: "info",
      symptoms: { signals: [{ signal: "safepoint" }] },
      classification: ["safepoint"]
    }))
  ];
}

function sortedJvmRows(results = [], safepoints = []) {
  const table = state.jvmTable || (state.jvmTable = { page: 1, pageSize: 20, sortKey: "time", sortDir: "desc" });
  const direction = table.sortDir === "asc" ? 1 : -1;
  const valueFor = row => ({
    time: row.timestampMs || 0,
    nature: jvmStallNature(row),
    id: String(row.eventId ?? row.pause?.id ?? ""),
    type: row.pause?.type || "",
    cause: row.pause?.cause || "",
    duration: row.durationMs || 0,
    score: row.score || 0,
    severity: jvmSeverityRank(row.severity),
    signals: row.symptoms?.signals?.map(signal => signal.signal).join(", ") || ""
  }[table.sortKey] ?? "");
  return jvmTableRows(results, safepoints).filter(row => {
    const f = state.jvmGc.severityFilter;
    if (!f || f === "all") return true;
    const order = ["info", "warning", "warning_high", "critical"];
    return order.indexOf(row.severity) >= order.indexOf(f);
  }).sort((a, b) => {
    const av = valueFor(a);
    const bv = valueFor(b);
    const order = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
    return order * direction || (b.timestampMs || 0) - (a.timestampMs || 0);
  });
}

function jvmPagedRows(results = [], safepoints = []) {
  const rows = sortedJvmRows(results, safepoints);
  const table = state.jvmTable || (state.jvmTable = { page: 1, pageSize: 20, sortKey: "time", sortDir: "desc" });
  const totalPages = Math.max(1, Math.ceil(rows.length / table.pageSize));
  table.page = Math.min(Math.max(1, table.page), totalPages);
  const start = (table.page - 1) * table.pageSize;
  return { rows: rows.slice(start, start + table.pageSize), total: rows.length, totalPages, start };
}

function renderJvmSortHeader(key, label) {
  const active = state.jvmTable?.sortKey === key;
  const icon = !active ? icons.sortNeutral : state.jvmTable.sortDir === "asc" ? icons.sortAsc : icons.sortDesc;
  return `<th><button class="table-sort jvm-sort ${active ? "active" : ""}" data-jvm-sort="${escapeHtml(key)}">${escapeHtml(label)} ${icon}</button></th>`;
}

function renderJvmPagination(total, totalPages, start) {
  if (!total) return "";
  const table = state.jvmTable;
  const end = Math.min(total, start + table.pageSize);
  return `<div class="pager jvm-pager">
    <span class="pager-filter-count">${formatNumber(total)} JVM event row(s)</span>
    <select class="pager-size" data-jvm-page-size title="Rows per page" aria-label="JVM rows per page">${[10, 20, 50, 100].map(value => `<option value="${value}" ${table.pageSize === value ? "selected" : ""}>${value}/p</option>`).join("")}</select>
    <button class="icon" data-jvm-page="first" title="First page" aria-label="First JVM page">${icons.first}</button>
    <button class="icon" data-jvm-page="prev" title="Previous page" aria-label="Previous JVM page">${icons.previous}</button>
    <span>${formatNumber(start + 1)}-${formatNumber(end)} / ${formatNumber(total)} - page ${table.page}/${totalPages}</span>
    <button class="icon" data-jvm-page="next" title="Next page" aria-label="Next JVM page">${icons.next}</button>
    <button class="icon" data-jvm-page="last" data-total-pages="${totalPages}" title="Last page" aria-label="Last JVM page">${icons.last}</button>
  </div>`;
}

function runJvmCorrelation() {
  const gc = state.jvmGc;
  if (!gc.pauses.length) { gc.correlation = null; return; }
  const history = visibleHistory().filter(s => s.epochMs);
  // Filter pauses to ss observation window (exclude startup/unrelated pauses)
  const ssStart = history.length ? history[0].epochMs : 0;
  const ssEnd = history.length ? history[history.length - 1].epochMs : Infinity;
  const aligned = alignTimestamps(gc.pauses, history, gc.clockOffsetMs);
  const windowPauses = aligned.filter(p => (p.alignedEpochMs || p.epochMs || 0) >= ssStart - 60000 && (p.alignedEpochMs || p.epochMs || 0) <= ssEnd + 60000);
  gc.analysisWindow = { start: ssStart, end: ssEnd, totalPauses: gc.pauses.length, filteredPauses: windowPauses.length };
  gc.correlation = correlateJvmStalls({
    pauses: windowPauses,
    safepoints: gc.safepoints,
    history,
    clockOffsetMs: gc.clockOffsetMs
  });
  if (state.fixLatency.records.length) runFixCorrelation();
}

function jvmDrawDependencies() {
  return {
    root: getDocument(),
    state,
    drawJvmTimelineChartInteractive,
    drawJvmScatterChartInteractive,
    attachJvmTimelineInteractions,
    attachJvmScatterInteractions,
    drawJvmCharts
  };
}

function drawJvmCharts(deps = jvmDrawDependencies()) {
  const {
    root = getDocument(),
    state: appState = state,
    drawJvmTimelineChartInteractive: drawTimeline = drawJvmTimelineChartInteractive,
    drawJvmScatterChartInteractive: drawScatter = drawJvmScatterChartInteractive
  } = deps;
  const gc = appState.jvmGc;
  if (!gc.correlation?.results?.length) return;
  const history = visibleHistory().filter(s => s.epochMs);
  if (!history.length) return;
  const sevOrder = ["none", "info", "warning", "warning_high", "critical"];
  const minSev = gc.severityFilter && gc.severityFilter !== "all" ? sevOrder.indexOf(gc.severityFilter) : 0;
  const t0 = history[0].epochMs, t1 = history[history.length - 1].epochMs;
  const filtered = gc.correlation.results.filter(r => r.epochMs >= t0 && r.epochMs <= t1 && sevOrder.indexOf(r.severity) >= minSev);
  const selected = gc.selectedEpoch ? filtered.filter(r => r.epochMs === gc.selectedEpoch) : filtered;

  // Timeline chart: Recv-Q + GC bars
  const svg1 = root.querySelector("[data-jvm-chart='recvq']");
  if (svg1) drawTimeline(svg1, selected, history, deps);

  // Scatter plot
  const svg2 = root.querySelector("[data-jvm-chart='scatter']");
  if (svg2) drawScatter(svg2, selected, deps);
}

function jvmPauseColor(score) {
  return score > 0.5 ? "#ef4444" : score > 0.2 ? "#fbbf24" : "#7dd3fc";
}

function drawJvmTimelineChartInteractive(svg, results, history, deps = jvmDrawDependencies()) {
  const { state: appState = state, attachJvmTimelineInteractions: attachTimeline = attachJvmTimelineInteractions } = deps;
  const w = svg.clientWidth || 700;
  const h = svg.clientHeight || 300;
  const pad = { l: 96, r: 22, t: 28, b: 46 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const t0 = history[0].epochMs;
  const t1 = history[history.length - 1].epochMs;
  const span = Math.max(1, t1 - t0);
  const x = t => pad.l + ((t - t0) / span) * plotW;
  const primaryMetric = "recvQ";
  const primaryLabel = "Recv-Q (bytes)";
  const primaryColor = "#7dd3fc";
  const maxPrimary = Math.max(1, ...history.map(s => s[primaryMetric] || 0));
  const y = value => pad.t + plotH - (value / maxPrimary) * plotH;
  const line = history.map((sample, index) => `${index ? "L" : "M"}${x(sample.epochMs).toFixed(1)},${y(sample[primaryMetric] || 0).toFixed(1)}`).join(" ");
  const pauseTypeColor = type => {
    if (type === "Young") return "#4ade80";
    if (type === "Mixed") return "#fbbf24";
    if (type === "Full" || type === "Remark" || type === "Cleanup") return "#ef4444";
    return "#a78bfa"; // safepoint or other
  };
  const bars = results.filter(result => {
    const t = result.pause?.type || "";
    if (t === "Young" && jvmSeriesHidden("gc_young")) return false;
    if (t === "Mixed" && jvmSeriesHidden("gc_mixed")) return false;
    if ((t === "Full" || t === "Remark" || t === "Cleanup") && jvmSeriesHidden("gc_full")) return false;
    if (t === "Safepoint" && jvmSeriesHidden("gc_safepoint")) return false;
    return true;
  }).map(result => {
    const bx = x(result.epochMs);
    const bw = Math.max(1, (result.pause.durationMs / span) * plotW);
    const color = pauseTypeColor(result.pause.type);
    const hasAnnotation = result.pause.type === "Full" || result.pause.type === "Remark" || result.pause.type === "Cleanup";
    return `<rect x="${bx.toFixed(1)}" y="${pad.t}" width="${bw.toFixed(1)}" height="${plotH}" fill="${color}" opacity=".35">${hasAnnotation ? "" : `<title>GC(${result.pause.id}) ${escapeHtml(result.pause.type)} ${result.pause.durationMs.toFixed(1)}ms score=${result.score.toFixed(2)}</title>`}</rect>`;
  }).join("");
  const annotations = results.filter(r => {
    const t = r.pause?.type;
    if ((t === "Full" || t === "Remark" || t === "Cleanup") && !jvmSeriesHidden("gc_full")) return true;
    if (t === "Mixed" && !jvmSeriesHidden("gc_mixed")) return true;
    if (t === "Young" && !jvmSeriesHidden("gc_young")) return true;
    return false;
  }).filter((r, i, arr) => arr.findIndex(x => x.pause.id === r.pause.id) === i).map(r => {
    const ax = x(r.epochMs);
    const color = r.pause.type === "Mixed" ? "#fbbf24" : r.pause.type === "Young" ? "#4ade80" : "#ef4444";
    return { ax, color, label: `${r.pause.type} #${r.pause.id}` };
  });
  // Anti-overlap: assign levels based on horizontal proximity
  const minGap = 50;
  const levelHeight = 12;
  const levels = [];
  for (const a of annotations) {
    let level = 0;
    while (levels[level]?.some(prev => Math.abs(prev - a.ax) < minGap)) level++;
    if (!levels[level]) levels[level] = [];
    levels[level].push(a.ax);
    a.level = level;
  }
  const annotationsSvg = annotations.map(a => {
    const ay = pad.t - 4 + a.level * levelHeight;
    const timeStr = a.epochMs ? new Date(a.epochMs).toISOString().slice(11, 23) : "";
    return `<text x="${a.ax.toFixed(1)}" y="${ay}" text-anchor="middle" fill="${a.color}" font-size="9" font-weight="700">${escapeHtml(a.label)}</text>${timeStr ? `<text x="${a.ax.toFixed(1)}" y="${ay + 10}" text-anchor="middle" fill="${a.color}" font-size="8" opacity="0.7">${timeStr}</text>` : ""}`;
  }).join("");
  // Detect TCP state changes from raw timestamped snapshots
  const stateChanges = [];
  const rawSnaps = parsedTimestampSnapshots();
  const selected = socketsById().get(appState.selectedId) || appState.sockets[0];
  if (selected && rawSnaps.length) {
    const localPeer = `${selected.local}|${selected.peer}`;
    let prevState = "";
    for (const snap of rawSnaps) {
      if (!snap.epochMs || snap.epochMs < t0 || snap.epochMs > t1) continue;
      const match = (snap.sockets || []).find(s => `${s.local}|${s.peer}` === localPeer);
      if (match && match.state && match.state !== prevState) {
        if (prevState) stateChanges.push({ epochMs: snap.epochMs, from: prevState, to: match.state });
        prevState = match.state;
      }
    }
  }
  const stateChangesSvg = stateChanges.map(sc => {
    const sx = x(sc.epochMs);
    return `<line x1="${sx.toFixed(1)}" x2="${sx.toFixed(1)}" y1="${pad.t}" y2="${pad.t + plotH}" stroke="#e879f9" stroke-width="1.5" stroke-dasharray="4 2"/>` +
      `<rect x="${sx.toFixed(1) - 1}" y="${pad.t + plotH - 16}" width="${(sc.from + " ? " + sc.to).length * 5 + 10}" height="14" rx="3" fill="rgba(10,16,24,.85)"/>` +
      `<text x="${(Number(sx.toFixed(1)) + 4)}" y="${pad.t + plotH - 6}" fill="#e879f9" font-size="8" font-weight="600">${escapeHtml(sc.from)} ? ${escapeHtml(sc.to)}</text>`;
  }).join("");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => f * maxPrimary);
  const yTicksSvg = yTicks.map(v => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#1a2636"/><text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end" fill="#8c9aab" font-size="10">${formatMetricValue(primaryMetric, v)}</text>`).join("");
  const xTimeTicks = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const epoch = t0 + f * span;
    const sample = history.reduce((best, s) => Math.abs(s.epochMs - epoch) < Math.abs(best.epochMs - epoch) ? s : best, history[0]);
    return { px: pad.l + f * plotW, label: timeLabel(sample.t || 0, sample.epochMs) };
  });
  const xTimeTicksSvg = xTimeTicks.map((t, i) => `<line x1="${t.px}" x2="${t.px}" y1="${pad.t}" y2="${h - pad.b}" stroke="#1a2636"/><text x="${t.px}" y="${h - pad.b + 14}" text-anchor="${i === xTimeTicks.length - 1 ? "end" : i === 0 ? "start" : "middle"}" fill="#8c9aab" font-size="10">${escapeHtml(t.label)}</text>`).join("");
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="${chartBgColor()}"/>
    ${xTimeTicksSvg}
    ${yTicksSvg}
    ${bars}
    ${annotationsSvg}
    ${stateChangesSvg}
    ${jvmSeriesHidden("recvq") ? "" : `<path d="${line}" fill="none" stroke="${primaryColor}" stroke-width="2.4"/>`}
    <text x="${w / 2}" y="${h - 7}" text-anchor="middle" fill="#8c9aab" font-size="11">Time (${escapeHtml(resolvedTimeZone())})</text>
    <text x="16" y="${h / 2}" transform="rotate(-90 16 ${h / 2})" text-anchor="middle" fill="#8c9aab" font-size="11">${escapeHtml(primaryLabel)}</text>
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="#52657a"/>
    <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="#52657a"/>
    <rect class="jvm-hover-zone" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="transparent" pointer-events="all"/>
    <g class="jvm-crosshair" visibility="hidden" pointer-events="none"></g>
  `;
  attachTimeline(svg, results, history, x, pad, w, h, t0, span, deps);
  // Expose for cross-chart sync
  svg._jvmShowTooltipForId = (gcId) => {
    const r = results.find(item => item.pause.id === gcId);
    if (!r) return;
    const layer = svg.querySelector(".jvm-crosshair");
    if (!layer) return;
    const cx = x(r.epochMs);
    const sample = history.reduce((best, item) => Math.abs(item.epochMs - r.epochMs) < Math.abs(best.epochMs - r.epochMs) ? item : best, history[0]);
    const tooltipW = 230;
    const tooltipX = cx + tooltipW + 14 > w - pad.r ? cx - tooltipW - 14 : cx + 14;
    layer.setAttribute("visibility", "visible");
    layer.innerHTML = `
      <line x1="${cx}" x2="${cx}" y1="${pad.t}" y2="${h - pad.b}" stroke="${chartBgColor() === `#f0f3f7` ? `#1a2533cc` : `#ffffffaa`}" stroke-width="1" stroke-dasharray="3 2"/>
      <rect x="${tooltipX}" y="${pad.t + 8}" width="${tooltipW}" height="78" rx="7" fill="${chartBgColor() === `#f0f3f7` ? `#ffffff` : `#0b1018`}" fill-opacity="${chartTooltipOpacity()}" stroke="#52657a"/>
      <text x="${tooltipX + 9}" y="${pad.t + 25}" fill="#edf4ff" font-size="11" font-weight="800">${escapeHtml(preciseDateTimeLabel(sample.epochMs))}</text>
      <text x="${tooltipX + 9}" y="${pad.t + 43}" fill="${primaryColor}" font-size="10.5">Recv-Q: ${escapeHtml(formatMetricValue(primaryMetric, sample[primaryMetric] || 0))}</text>
      <text x="${tooltipX + 9}" y="${pad.t + 59}" fill="${jvmPauseColor(r.score)}" font-size="10.5">GC #${r.pause.id} ${r.pause.durationMs.toFixed(1)}ms score ${r.score.toFixed(2)}</text>
      <text x="${tooltipX + 9}" y="${pad.t + 73}" fill="#cbd5e1" font-size="10">${escapeHtml(r.symptoms?.signals?.map(s => s.signal).join(", ") || "none")}</text>
    `;
  };
  svg._jvmHideTooltip = () => { const l = svg.querySelector(".jvm-crosshair"); if (l) l.setAttribute("visibility", "hidden"); };
}

function drawJvmScatterChartInteractive(svg, results, deps = jvmDrawDependencies()) {
  const { attachJvmScatterInteractions: attachScatter = attachJvmScatterInteractions } = deps;
  const w = svg.clientWidth || 700;
  const h = svg.clientHeight || 300;
  const pad = { l: 96, r: 22, t: 28, b: 46 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const points = results.filter(result => result.symptoms.detected).map(result => {
    const delta = result.symptoms.signals.find(signal => signal.signal === "recvQ_rise")?.delta || 0;
    return {
      id: result.pause.id,
      type: result.pause.type,
      durationMs: result.pause.durationMs,
      delta,
      score: result.score,
      severity: result.severity,
      signals: result.symptoms.signals.map(signal => signal.signal).join(", "),
      epochMs: result.epochMs
    };
  }).filter(point => {
    if (point.score > 0.5) return !jvmSeriesHidden("scatter_high");
    if (point.score > 0.2) return !jvmSeriesHidden("scatter_warning");
    return !jvmSeriesHidden("scatter_low");
  });
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  if (!points.length) {
    svg.innerHTML = `<rect x="0" y="0" width="${w}" height="${h}" fill="${chartBgColor()}"/><text x="24" y="42" fill="#c4d0de" font-size="12">No visible correlated data points.</text>`;
    return;
  }
  const maxDuration = Math.max(1, ...points.map(point => point.durationMs));
  const maxDelta = Math.max(1, ...points.map(point => point.delta));
  const x = value => pad.l + (value / maxDuration) * plotW;
  const y = value => pad.t + plotH - (value / maxDelta) * plotH;
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map(f => { const v = f * maxDuration; return v < 10 ? Math.round(v * 10) / 10 : Math.round(v); });
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * maxDelta));
  const xTicksSvg = xTicks.map(v => `<line x1="${x(v)}" x2="${x(v)}" y1="${pad.t}" y2="${h - pad.b}" stroke="#1a2636"/><text x="${x(v)}" y="${h - pad.b + 14}" text-anchor="middle" fill="#8c9aab" font-size="10">${v} ms</text>`).join("");
  const yTicksSvg = yTicks.map(v => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#1a2636"/><text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end" fill="#8c9aab" font-size="10">${formatMetricValue("recvQ", v)}</text>`).join("");
  const dots = points.map(point => `<circle cx="${x(point.durationMs).toFixed(1)}" cy="${y(point.delta).toFixed(1)}" r="4" fill="${jvmPauseColor(point.score)}" opacity=".82"><title>${point.durationMs.toFixed(1)}ms -> Delta Recv-Q ${point.delta}</title></circle>`).join("");
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="${chartBgColor()}"/>
    ${xTicksSvg}
    ${yTicksSvg}
    ${dots}
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="#8c9aab" font-size="11">Pause duration (ms)</text>
    <text x="16" y="${h / 2}" transform="rotate(-90 16 ${h / 2})" text-anchor="middle" fill="#8c9aab" font-size="11">Delta Recv-Q (bytes)</text>
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="#52657a"/>
    <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="#52657a"/>
    <rect class="jvm-hover-zone" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="transparent" pointer-events="all"/>
    <g class="jvm-crosshair" visibility="hidden" pointer-events="none"></g>
  `;
  attachScatter(svg, points, x, y, pad, w, h, deps);
  // Expose coordinate fns for cross-chart sync
  svg._jvmScatterX = r => { const p = points.find(pt => pt.id === r.pause?.id); return p ? x(p.durationMs) : 0; };
  svg._jvmScatterY = r => { const p = points.find(pt => pt.id === r.pause?.id); return p ? y(p.delta) : 0; };
}

function attachJvmTimelineInteractions(svg, results, history, xFn, pad, w, h, t0, span, deps = jvmDrawDependencies()) {
  const { root = getDocument(), state: appState = state, drawJvmCharts: drawJvm = drawJvmCharts } = deps;
  const zone = svg.querySelector(".jvm-hover-zone");
  const layer = svg.querySelector(".jvm-crosshair");
  if (!zone || !layer) return;
  const plotW = w - pad.l - pad.r;
  zone.addEventListener("mousemove", event => {
    const rect = svg.getBoundingClientRect();
    const scaleX = w / rect.width;
    const locX = (event.clientX - rect.left) * scaleX;
    const pct = Math.max(0, Math.min(1, (locX - pad.l) / plotW));
    const targetEpoch = t0 + pct * span;
    const sample = history.reduce((best, item) => Math.abs(item.epochMs - targetEpoch) < Math.abs(best.epochMs - targetEpoch) ? item : best, history[0]);
    const pause = results.reduce((best, item) => !best || Math.abs(item.epochMs - targetEpoch) < Math.abs(best.epochMs - targetEpoch) ? item : best, null);
    const cx = xFn(sample.epochMs);
    // Drag selection overlay
    const dragSel = svg._jvmDragStart != null
      ? `<rect x="${Math.min(pad.l + svg._jvmDragStart * plotW, locX)}" y="${pad.t}" width="${Math.abs(locX - (pad.l + svg._jvmDragStart * plotW))}" height="${h - pad.t - pad.b}" fill="#5db7ff" opacity=".18" stroke="#5db7ff" stroke-width="1" stroke-dasharray="5 4"/>`
      : "";
    const tooltipW = 230;
    const tooltipX = cx + tooltipW + 14 > w - pad.r ? cx - tooltipW - 14 : cx + 14;
    layer.setAttribute("visibility", "visible");
    layer.innerHTML = `
      ${dragSel}
      <line x1="${cx}" x2="${cx}" y1="${pad.t}" y2="${h - pad.b}" stroke="${chartBgColor() === `#f0f3f7` ? `#1a2533cc` : `#ffffffaa`}" stroke-width="1" stroke-dasharray="3 2"/>
      <rect x="${tooltipX}" y="${pad.t + 8}" width="${tooltipW}" height="78" rx="7" fill="${chartBgColor() === `#f0f3f7` ? `#ffffff` : `#0b1018`}" fill-opacity="${chartTooltipOpacity()}" stroke="#52657a"/>
      <text x="${tooltipX + 9}" y="${pad.t + 25}" fill="#edf4ff" font-size="11" font-weight="800">${escapeHtml(preciseDateTimeLabel(sample.epochMs))}</text>
      <text x="${tooltipX + 9}" y="${pad.t + 43}" fill="#7dd3fc" font-size="10.5">Recv-Q: ${escapeHtml(formatMetricValue("recvQ", sample.recvQ || 0))}</text>
      <text x="${tooltipX + 9}" y="${pad.t + 59}" fill="${pause ? jvmPauseColor(pause.score) : "#94a3b8"}" font-size="10.5">Nearest GC: ${pause ? escapeHtml(`#${pause.pause.id} ${pause.pause.durationMs.toFixed(1)}ms score ${pause.score.toFixed(2)}`) : "n/a"}</text>
      <text x="${tooltipX + 9}" y="${pad.t + 73}" fill="#cbd5e1" font-size="10">Signals: ${escapeHtml(pause?.symptoms?.signals?.map(signal => signal.signal).join(", ") || "none")}</text>
    `;
    // Sync crosshair to scatter chart
    if (appState.jvmGc.syncCrosshair !== false && pause) {
      const scatterSvg = root.querySelector("[data-jvm-chart='scatter']");
      if (scatterSvg?._jvmShowTooltipForId) scatterSvg._jvmShowTooltipForId(pause.pause.id);
    }
  });
  zone.addEventListener("mousedown", event => {
    svg._jvmDragStart = Math.max(0, Math.min(1, (((event.clientX - svg.getBoundingClientRect().left) * (w / svg.getBoundingClientRect().width)) - pad.l) / plotW));
  });
  zone.addEventListener("mouseup", event => {
    if (svg._jvmDragStart == null) return;
    const rect = svg.getBoundingClientRect();
    const end = Math.max(0, Math.min(1, (((event.clientX - rect.left) * (w / rect.width)) - pad.l) / plotW));
    const start = svg._jvmDragStart;
    svg._jvmDragStart = null;
    if (Math.abs(end - start) < 0.02) return;
    const current = appState.chartZoom;
    const range = current.end - current.start;
    setZoom(current.start + Math.min(start, end) * range, current.start + Math.max(start, end) * range);
    drawJvm(deps);
  });
  zone.addEventListener("mouseleave", () => {
    svg._jvmDragStart = null;
    layer.setAttribute("visibility", "hidden");
    if (appState.jvmGc.syncCrosshair !== false) {
      const scatterSvg = root.querySelector("[data-jvm-chart='scatter']");
      if (scatterSvg?._jvmHideTooltip) scatterSvg._jvmHideTooltip();
    }
  });
}

function attachJvmScatterInteractions(svg, points, xFn, yFn, pad, w, h, deps = jvmDrawDependencies()) {
  const { root = getDocument(), state: appState = state, drawJvmCharts: drawJvm = drawJvmCharts } = deps;
  const dom = root.ownerDocument || root;
  const zone = svg.querySelector(".jvm-hover-zone");
  const layer = svg.querySelector(".jvm-crosshair");
  if (!zone || !layer) return;
  zone.addEventListener("mousemove", event => {
    const rect = svg.getBoundingClientRect();
    const scaleX = w / rect.width;
    const scaleY = h / rect.height;
    const px = (event.clientX - rect.left) * scaleX;
    const py = (event.clientY - rect.top) * scaleY;
    const point = points.reduce((best, item) => {
      const dx = xFn(item.durationMs) - px;
      const dy = yFn(item.delta) - py;
      const distance = dx * dx + dy * dy;
      return !best || distance < best.distance ? { item, distance } : best;
    }, null)?.item;
    if (!point) return;
    const cx = xFn(point.durationMs);
    const cy = yFn(point.delta);
    const tooltipW = 220;
    const tooltipX = cx + tooltipW + 14 > w - pad.r ? cx - tooltipW - 14 : cx + 14;
    const tooltipY = Math.max(pad.t + 8, Math.min(h - pad.b - 82, cy - 36));
    layer.setAttribute("visibility", "visible");
    layer.innerHTML = `
      <line x1="${cx}" x2="${cx}" y1="${pad.t}" y2="${h - pad.b}" stroke="#ffffff88" stroke-width="1" stroke-dasharray="3 2"/>
      <line x1="${pad.l}" x2="${w - pad.r}" y1="${cy}" y2="${cy}" stroke="#ffffff55" stroke-width="1" stroke-dasharray="3 2"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="${jvmPauseColor(point.score)}" stroke-width="2"/>
      <rect x="${tooltipX}" y="${tooltipY}" width="${tooltipW}" height="76" rx="7" fill="${chartBgColor() === `#f0f3f7` ? `#ffffff` : `#0b1018`}" fill-opacity="${chartTooltipOpacity()}" stroke="#52657a"/>
      <text x="${tooltipX + 9}" y="${tooltipY + 18}" fill="#edf4ff" font-size="11" font-weight="800">GC #${escapeHtml(String(point.id))} - ${escapeHtml(point.type)}</text>
      <text x="${tooltipX + 9}" y="${tooltipY + 36}" fill="${jvmPauseColor(point.score)}" font-size="10.5">${point.durationMs.toFixed(1)} ms, score ${point.score.toFixed(2)}</text>
      <text x="${tooltipX + 9}" y="${tooltipY + 52}" fill="#7dd3fc" font-size="10.5">Delta Recv-Q: ${escapeHtml(formatMetricValue("recvQ", point.delta))}</text>
      <text x="${tooltipX + 9}" y="${tooltipY + 68}" fill="#cbd5e1" font-size="10">${escapeHtml(point.signals || "no signals")}</text>
    `;
    // Sync to timeline chart
    if (appState.jvmGc.syncCrosshair !== false) {
      const tlSvg = root.querySelector("[data-jvm-chart='recvq']");
      if (tlSvg?._jvmShowTooltipForId) tlSvg._jvmShowTooltipForId(point.id);
    }
  });
  zone.addEventListener("mouseleave", () => {
    layer.setAttribute("visibility", "hidden");
    if (appState.jvmGc.syncCrosshair !== false) {
      const tlSvg = root.querySelector("[data-jvm-chart='recvq']");
      if (tlSvg?._jvmHideTooltip) tlSvg._jvmHideTooltip();
    }
  });
  zone.addEventListener("click", event => {
    const rect = svg.getBoundingClientRect();
    const px = (event.clientX - rect.left) * (w / rect.width);
    const py = (event.clientY - rect.top) * (h / rect.height);
    const point = points.reduce((best, item) => {
      const dx = xFn(item.durationMs) - px;
      const dy = yFn(item.delta) - py;
      const d = dx * dx + dy * dy;
      return !best || d < best.d ? { item, d } : best;
    }, null)?.item;
    if (!point || !point.epochMs) return;
    // Zoom timeline to ±5s around this pause
    const history = visibleHistory().filter(s => s.epochMs);
    if (!history.length) return;
    const t0 = history[0].epochMs, t1 = history[history.length - 1].epochMs;
    const totalSpan = Math.max(1, t1 - t0);
    const windowMs = 5000;
    const center = (point.epochMs - t0) / totalSpan;
    const halfW = windowMs / totalSpan;
    const current = appState.chartZoom;
    const range = current.end - current.start;
    const absCenter = current.start + center * range;
    setZoom(Math.max(0, absCenter - halfW), Math.min(1, absCenter + halfW));
    appState._bdpCache = null;
    appState.jvmGc.selectedEpoch = null;
    drawJvm(deps);
    // Show a red vertical marker on the timeline at the clicked point
    const tlSvg = root.querySelector("[data-jvm-chart='recvq']");
    if (tlSvg) {
      const marker = dom.createElementNS("http://www.w3.org/2000/svg", "g");
      marker.setAttribute("class", "jvm-click-marker");
      const history2 = visibleHistory().filter(s => s.epochMs);
      if (history2.length) {
        const tt0 = history2[0].epochMs, tt1 = history2[history2.length - 1].epochMs;
        const tSpan = Math.max(1, tt1 - tt0);
        const mw = tlSvg.clientWidth || 700;
        const mPad = 96;
        const mPlotW = mw - mPad - 22;
        const mx = mPad + ((point.epochMs - tt0) / tSpan) * mPlotW;
        marker.innerHTML = `<line x1="${mx}" x2="${mx}" y1="28" y2="${(tlSvg.clientHeight || 300) - 46}" stroke="#ff3355" stroke-width="2.5" opacity="1"/><polygon points="${mx - 5},28 ${mx + 5},28 ${mx},36" fill="#ff3355"/>`;
        marker.style.transition = "opacity .5s";
        tlSvg.appendChild(marker);
        setTimeout(() => { marker.style.opacity = "0"; }, 1500);
        setTimeout(() => { marker.remove(); }, 2000);
      }
    }
  });
  // Expose function for cross-chart sync
  svg._jvmShowTooltipForId = (gcId) => {
    const point = points.find(p => p.id === gcId);
    if (!point) { layer.setAttribute("visibility", "hidden"); return; }
    const cx = xFn(point.durationMs);
    const cy = yFn(point.delta);
    const tooltipW = 220;
    const tooltipX = cx + tooltipW + 14 > w - pad.r ? cx - tooltipW - 14 : cx + 14;
    const tooltipY = Math.max(pad.t + 8, Math.min(h - pad.b - 82, cy - 36));
    layer.setAttribute("visibility", "visible");
    layer.innerHTML = `
      <line x1="${cx}" x2="${cx}" y1="${pad.t}" y2="${h - pad.b}" stroke="#ffffff88" stroke-width="1" stroke-dasharray="3 2"/>
      <line x1="${pad.l}" x2="${w - pad.r}" y1="${cy}" y2="${cy}" stroke="#ffffff55" stroke-width="1" stroke-dasharray="3 2"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="${jvmPauseColor(point.score)}" stroke-width="2"/>
      <rect x="${tooltipX}" y="${tooltipY}" width="${tooltipW}" height="76" rx="7" fill="${chartBgColor() === `#f0f3f7` ? `#ffffff` : `#0b1018`}" fill-opacity="${chartTooltipOpacity()}" stroke="#52657a"/>
      <text x="${tooltipX + 9}" y="${tooltipY + 18}" fill="#edf4ff" font-size="11" font-weight="800">GC #${escapeHtml(String(point.id))} - ${escapeHtml(point.type)}</text>
      <text x="${tooltipX + 9}" y="${tooltipY + 36}" fill="${jvmPauseColor(point.score)}" font-size="10.5">${point.durationMs.toFixed(1)} ms, score ${point.score.toFixed(2)}</text>
      <text x="${tooltipX + 9}" y="${tooltipY + 52}" fill="#7dd3fc" font-size="10.5">Delta Recv-Q: ${escapeHtml(formatMetricValue("recvQ", point.delta))}</text>
      <text x="${tooltipX + 9}" y="${tooltipY + 68}" fill="#cbd5e1" font-size="10">${escapeHtml(point.signals || "no signals")}</text>
    `;
  };
  svg._jvmHideTooltip = () => layer.setAttribute("visibility", "hidden");
}



  // --- FIX Latency (delegated to fix-chart-drawing.js) ---
  const _fixDrawing = createFixChartDrawing({
    state, icons, getDocument, WorkerCtor, performanceRef, requestAnimationFrameRef, cancelAnimationFrameRef,
    correlateFixLatency, computeFixStats, escapeHtml, formatBytesHuman, formatMetricValue, formatNumber,
    metricValue, parsedTimestampSnapshots, render, renderFixLatencyPanelView, resolvedNumberLocale,
    resolvedTimeZone, setZoom, socketsById, timeLabel, visibleHistory, chartBgColor, chartTooltipOpacity,
    dateTimeFormatter, dropRateSummary, preciseDateTimeLabel,
    drawFixCharts: (...a) => _fixDrawing.drawFixCharts(...a)
  });
  const { runFixCorrelation, renderFixLatencyPanel, drawFixCharts, buildMultiSourceSummary, renderWhatIfSimulation, toggleFixPlayback } = _fixDrawing;

  return {
    buildMultiSourceSummary,
    drawFixCharts,
    drawJvmCharts,
    renderFixLatencyPanel,
    renderJvmGcPanel,
    renderWhatIfSimulation,
    runFixCorrelation,
    runJvmCorrelation,
    toggleFixPlayback
  };
}