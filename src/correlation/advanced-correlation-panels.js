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


function runFixCorrelation(callback) {
  const fix = state.fixLatency;
  if (!fix.records.length) { fix.correlation = null; if (callback) callback(); return; }
  const snapshots = parsedTimestampSnapshots();
  const history = [];
  for (const snap of snapshots) {
    for (const socket of snap.sockets) {
      history.push({
        epochMs: snap.epochMs,
        peer: socket.peer || '',
        local: socket.local || '',
        recvQ: metricValue(socket, 'recvQ') || 0,
        sendQ: metricValue(socket, 'sendQ') || 0,
        rtt: metricValue(socket, 'rtt') || 0,
        retrans: metricValue(socket, 'retrans') || 0,
        cwnd: metricValue(socket, 'cwnd') || 0,
        backoff: metricValue(socket, 'backoff') || 0,
        'skmem.d': metricValue(socket, 'skmem.d') || 0
      });
    }
  }
  const params = {
    records: fix.records,
    history,
    threshold: fix.threshold,
    vmstatSamples: fix.vmstat,
    nstatSamples: fix.nstat,
    gcPauses: state.jvmGc.correlation?.results?.map(r => ({ ...r.pause, alignedEpochMs: r.epochMs })) || state.jvmGc.pauses,
    gcWindowMs: fix.gcWindowMs || (() => { const pauses = state.jvmGc.pauses; if (!pauses.length) return 200; const durations = pauses.map(p => p.durationMs || 0).filter(d => d > 0); if (!durations.length) return 200; const avg = durations.reduce((s, d) => s + d, 0) / durations.length; return Math.round(Math.max(50, avg * 2)); })(),
    cpuCores: fix.cpuCores
  };
  if (fix.records.length > 10000 && WorkerCtor()) {
    const WorkerClass = WorkerCtor();
    const worker = new WorkerClass(new URL("../parsing/parse-worker.js", import.meta.url), { type: "module" });
    worker.postMessage({ type: "correlateFixLatency", payload: params });
    worker.onmessage = msg => {
      worker.terminate();
      if (msg.data.type === "correlateFixLatency:done") {
        fix.correlation = msg.data.payload;
      }
      if (callback) callback();
      else { render(); setTimeout(drawFixCharts, 50); }
    };
    return;
  }
  fix.correlation = correlateFixLatency(params);
  if (callback) callback();
}

function fixPagedRows() {
  const fix = state.fixLatency;
  const corr = fix.correlation;
  if (!corr?.results?.length) return { rows: [], total: 0, totalPages: 0, start: 0 };
  const table = state.fixTable;
  let rows = [...corr.results];
  if (table.causeFilter) rows = rows.filter(r => r.cause === table.causeFilter);
  if (table.sortKey === "lag") rows.sort((a, b) => table.sortDir === "desc" ? b.lagMs - a.lagMs : a.lagMs - b.lagMs);
  else if (table.sortKey === "score") rows.sort((a, b) => table.sortDir === "desc" ? b.score - a.score : a.score - b.score);
  else if (table.sortKey === "time") rows.sort((a, b) => table.sortDir === "desc" ? b.receiveMs - a.receiveMs : a.receiveMs - b.receiveMs);
  else if (table.sortKey === "cause") rows.sort((a, b) => table.sortDir === "desc" ? (b.cause || "").localeCompare(a.cause || "") : (a.cause || "").localeCompare(b.cause || ""));
  const total = rows.length;
  const totalPages = Math.ceil(total / table.pageSize);
  const start = (table.page - 1) * table.pageSize;
  return { rows: rows.slice(start, start + table.pageSize), total, totalPages, start };
}

function renderFixLatencyPanel() {
  return renderFixLatencyPanelView({
    state,
    icons,
    computeFixStats,
    fixPagedRows,
    escapeHtml,
    buildMultiSourceSummary,
    formatNumber,
    preciseDateTimeLabel
  });
}

function fixDrawDependencies() {
  return {
    root: getDocument(),
    state,
    drawFixTimelineChart,
    drawFixScatterChart,
    drawFixVmstatChart,
    drawFixNstatChart,
    drawFixHeatmap
  };
}

function drawFixCharts(deps = fixDrawDependencies()) {
 try {
  const {
    root = getDocument(),
    state: appState = state,
    drawFixTimelineChart: drawTimeline = drawFixTimelineChart,
    drawFixScatterChart: drawScatter = drawFixScatterChart,
    drawFixVmstatChart: drawVmstat = drawFixVmstatChart,
    drawFixNstatChart: drawNstat = drawFixNstatChart,
    drawFixHeatmap: drawHeatmap = drawFixHeatmap
  } = deps;
  const fix = appState.fixLatency;
  if (!fix.correlation?.results?.length) return;
  const history = visibleHistory().filter(s => s.epochMs);
  const allResults = fix.correlation.results;
  // Time range from all records
  const allTimes = fix.records.length ? [fix.records[0].receiveMs, fix.records[fix.records.length - 1].receiveMs] : allResults.map(r => r.receiveMs);
  const tMin = Math.min(...allTimes), tMax = Math.max(...allTimes);
  const tSpan = tMax - tMin || 1;
  function zoomRange(chartId) { const z = fix.zoom?.[chartId] || { start: 0, end: 1 }; return { start: tMin + z.start * tSpan, end: tMin + z.end * tSpan }; }
  const results = allResults;

  // Timeline chart
  const svg1 = root.querySelector("[data-fix-chart='timeline']");
  if (svg1 && results.length) {
    const tz = fix.zoom?.timeline || { start: 0, end: 1 };
    const ztStart = tMin + tz.start * tSpan;
    const ztEnd = tMin + tz.end * tSpan;
    const r1 = results.filter(r => r.receiveMs >= ztStart && r.receiveMs <= ztEnd);
    if (r1.length) drawTimeline(svg1, r1, history, appState.jvmGc.correlation?.results?.map(r => ({ ...r.pause, alignedEpochMs: r.epochMs })) || (appState.jvmGc.pauses.length ? appState.jvmGc.pauses : null), fix.gcWindowMs || 200, deps);
  }

  // Scatter chart
  const svg2 = root.querySelector("[data-fix-chart='scatter']");
  if (svg2 && results.length) drawScatter(svg2, results, deps);

  // vmstat chart (zoom based on vmstat own time range)
  const svg3 = root.querySelector("[data-fix-chart='vmstat']");
  if (svg3 && fix.vmstat?.length) {
    const vz = fix.zoom?.vmstat || { start: 0, end: 1 };
    const vt0 = fix.vmstat[0].epochMs, vt1 = fix.vmstat[fix.vmstat.length-1].epochMs, vspan = vt1-vt0||1;
    const vzStart = vt0 + vz.start * vspan, vzEnd = vt0 + vz.end * vspan;
    const vm = fix.vmstat.filter(s => s.epochMs >= vzStart && s.epochMs <= vzEnd);
    drawVmstat(svg3, vm.length ? vm : fix.vmstat, results, fix.cpuCores, deps);
  }

  // nstat chart (zoom based on nstat own time range)
  const svg4 = root.querySelector("[data-fix-chart='nstat']");
  if (svg4 && fix.nstat?.length) {
    const nz = fix.zoom?.nstat || { start: 0, end: 1 };
    const nt0 = fix.nstat[0].epochMs, nt1 = fix.nstat[fix.nstat.length-1].epochMs, nspan = nt1-nt0||1;
    const nzStart = nt0 + nz.start * nspan, nzEnd = nt0 + nz.end * nspan;
    const ns = fix.nstat.filter(s => s.epochMs >= nzStart && s.epochMs <= nzEnd);
    drawNstat(svg4, ns.length ? ns : fix.nstat, results, deps);
  }
  // Heatmap
  const heatCanvases = root.querySelectorAll("[data-fix-heatmap]");
  if (results.length > 5) heatCanvases.forEach(c => drawHeatmap(c, results, tMin, tMax, deps));
 } catch(e) { console.error("drawFixCharts error:", e); }
}

function drawFixHeatmap(canvas, results, fullT0, fullT1, deps = fixDrawDependencies()) {
  const w = canvas.clientWidth || 600, h = canvas.clientHeight || 80;
  canvas.width = w * 2; canvas.height = h * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  ctx.clearRect(0, 0, w, h);
  const pad = { l: 50, r: 10, t: 10, b: 20 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
  const t0 = fullT0 != null ? fullT0 : Math.min(...results.map(r => r.receiveMs));
  const t1 = fullT1 != null ? fullT1 : Math.max(...results.map(r => r.receiveMs));
  const tSpan = t1 - t0 || 1;
  const maxLag = Math.max(...results.map(r => r.lagMs), 1);
  const cols = Math.max(10, Math.min(80, Math.ceil(tSpan / 1000)));
  const rows = 6;
  const cellW = plotW / cols, cellH = plotH / rows;
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (const r of results) {
    const col = Math.min(cols - 1, Math.max(0, Math.floor(((r.receiveMs - t0) / tSpan) * cols)));
    const row = Math.min(rows - 1, Math.floor((r.lagMs / maxLag) * rows));
    grid[rows - 1 - row][col]++;
  }
  const maxCount = Math.max(1, ...grid.flat());
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const intensity = grid[r][c] / maxCount;
      if (intensity > 0) {
        const hue = 60 - intensity * 60;
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${0.3 + intensity * 0.7})`;
        ctx.fillRect(pad.l + c * cellW, pad.t + r * cellH, cellW - 1, cellH - 1);
      }
    }
  }
  // Y axis (lag)
  ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "9px sans-serif"; ctx.textAlign = "right";
  ctx.fillText(`${maxLag.toFixed(0)}ms`, pad.l - 4, pad.t + 9);
  ctx.fillText("0ms", pad.l - 4, pad.t + plotH);
  // X axis (time) - 5 evenly spaced chronological ticks
  const tickCount = 5;
  for (let i = 0; i < tickCount; i++) {
    const f = i / (tickCount - 1);
    const epoch = t0 + f * tSpan;
    const px = pad.l + f * plotW;
    const align = i === 0 ? "left" : i === tickCount - 1 ? "right" : "center";
    ctx.textAlign = align;
    ctx.fillText(fixTimeLabel(epoch), px, h - 2);
  }
  // Interactive crosshair tooltip + sync
  attachFixHeatmapCrosshair(canvas, pad, w, h, t0, tSpan, plotW, results, maxLag);
}

function attachFixHeatmapCrosshair(canvas, pad, w, h, t0, tSpan, plotW, results, maxLag) {
  if (canvas._heatmapCrosshairAttached) return;
  canvas._heatmapCrosshairAttached = true;
  canvas.style.cursor = "crosshair";
  // Overlay for tooltip
  let overlay = canvas.parentElement.querySelector(".heatmap-overlay");
  if (!overlay) {
    overlay = getDocument().createElement("div");
    overlay.className = "heatmap-overlay";
    overlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none";
    canvas.parentElement.style.position = "relative";
    canvas.parentElement.appendChild(overlay);
  }
  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const scaleX = w / rect.width;
    const px = mx * scaleX;
    if (px < pad.l || px > pad.l + plotW) { overlay.innerHTML = ""; syncFixCrosshairs(null, canvas); return; }
    const frac = (px - pad.l) / plotW;
    const epoch = t0 + frac * tSpan;
    // Find spikes near this time (within 1 column width)
    const colWidth = tSpan / Math.max(10, Math.min(80, Math.ceil(tSpan / 1000)));
    const nearby = results.filter(r => Math.abs(r.receiveMs - epoch) < colWidth);
    const count = nearby.length;
    const avgLag = count ? (nearby.reduce((s, r) => s + r.lagMs, 0) / count) : 0;
    const maxL = count ? Math.max(...nearby.map(r => r.lagMs)) : 0;
    // Draw crosshair line + tooltip
    const leftPct = (mx / rect.width) * 100;
    overlay.innerHTML = `<div style="position:absolute;left:${leftPct}%;top:0;bottom:20px;width:1px;background:rgba(255,209,102,0.7)"></div>${count ? `<div style="position:absolute;left:${Math.min(leftPct, 85)}%;top:4px;background:rgba(11,16,24,0.85);border:1px solid #52657a;border-radius:6px;padding:4px 8px;font-size:10px;color:#edf4ff;white-space:nowrap"><strong>${fixTimeLabel(epoch)}</strong><br><span style="color:#ffd166">${count} spike${count > 1 ? "s" : ""}</span> · avg ${avgLag.toFixed(1)}ms · max ${maxL.toFixed(1)}ms</div>` : `<div style="position:absolute;left:${Math.min(leftPct, 85)}%;top:4px;background:rgba(11,16,24,0.85);border:1px solid #52657a;border-radius:6px;padding:4px 8px;font-size:10px;color:#8c9aab;white-space:nowrap">${fixTimeLabel(epoch)}</div>`}`;
    syncFixCrosshairs(epoch, canvas);
  }
  canvas.style.pointerEvents = "auto";
  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("mouseleave", () => { overlay.innerHTML = ""; syncFixCrosshairs(null, canvas); });
}

function fixTimeLabel(epochMs) {
  const d = new Date(epochMs);
  return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}:${String(d.getUTCSeconds()).padStart(2,"0")}`;
}

function fixChartXTicks(t0, t1, pad, w, count = 5) {
  const span = t1 - t0 || 1;
  return Array.from({ length: count }, (_, i) => {
    const f = i / (count - 1);
    const epoch = t0 + f * span;
    const px = pad.l + f * (w - pad.l - pad.r);
    return { px, label: fixTimeLabel(epoch) };
  });
}

function fixChartYTicks(min, max, pad, h, count = 5) {
  const span = max - min || 1;
  return Array.from({ length: count }, (_, i) => {
    const f = i / (count - 1);
    const val = min + f * span;
    const py = pad.t + (h - pad.t - pad.b) * (1 - f);
    return { py, val };
  });
}

function fixChartGrid(xTicks, yTicks, pad, w, h) {
  const yLines = yTicks.map(t => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${t.py}" y2="${t.py}" stroke="var(--line)" stroke-width="0.5"/>`).join("");
  const xLines = xTicks.map(t => `<line x1="${t.px}" x2="${t.px}" y1="${pad.t}" y2="${h - pad.b}" stroke="var(--line)" stroke-width="0.3"/>`).join("");
  return yLines + xLines;
}

function fixChartXLabels(xTicks, h) {
  return xTicks.map((t, i) => `<text x="${t.px}" y="${h - 20}" text-anchor="${i === xTicks.length - 1 ? "end" : i === 0 ? "start" : "middle"}" fill="var(--muted)" font-size="10">${t.label}</text>`).join("");
}

function fixChartYLabels(yTicks, pad, formatter) {
  return yTicks.map(t => `<text x="${pad.l - 6}" y="${t.py + 3}" text-anchor="end" fill="var(--muted)" font-size="10">${formatter(t.val)}</text>`).join("");
}

function fixSeverityColor(severity) {
  return severity === "critical" ? "#ff5c77" : severity === "warning_high" ? "#ff9f43" : severity === "warning" ? "#ffd166" : severity === "info" ? "#39d6d6" : "#8c9aab";
}

function drawFixTimelineChart(svg, results, history, gcPauses = null, gcWindowMs = 200, deps = fixDrawDependencies()) {
  const { state: appState = state } = deps;
  const w = svg.clientWidth || svg.parentElement?.clientWidth || 640, h = svg.clientHeight || 200;
  const pad = { t: 32, r: 60, b: 48, l: 70 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;

  const allTimes = [...history.map(s => s.epochMs), ...results.map(r => r.receiveMs)];
  const t0 = Math.min(...allTimes), t1 = Math.max(...allTimes);
  const span = t1 - t0 || 1;
  const x = t => pad.l + ((t - t0) / span) * plotW;

  const maxLag = Math.max(...results.map(r => r.lagMs), 1);
  const maxRecvQ = Math.max(...history.map(s => s.recvQ || 0), 1);
  const yLag = v => pad.t + plotH - (v / maxLag) * plotH;
  const yRecvQ = v => pad.t + plotH - (v / maxRecvQ) * plotH;

  const xTicks = fixChartXTicks(t0, t1, pad, w);
  const yTicksLag = fixChartYTicks(0, maxLag, pad, h);
  const grid = fixChartGrid(xTicks, yTicksLag, pad, w, h);
  const xLabels = fixChartXLabels(xTicks, h);
  const yLabelsLag = fixChartYLabels(yTicksLag, pad, v => v >= 1000 ? `${(v/1000).toFixed(1)}s` : `${Math.round(v)}ms`);
  const yLabelsRecvQ = yTicksLag.map(t => {
    const val = (t.val / maxLag) * maxRecvQ;
    return `<text x="${w - pad.r + 6}" y="${t.py + 3}" text-anchor="start" fill="rgba(59,130,246,0.8)" font-size="10">${val >= 1024 ? `${(val/1024).toFixed(0)}K` : Math.round(val)}B</text>`;
  }).join("");

  // RecvQ area
  let recvQPath = "";
  for (let i = 0; i < history.length; i++) {
    const px = x(history[i].epochMs), py = yRecvQ(history[i].recvQ || 0);
    recvQPath += i === 0 ? `M${px},${py}` : `L${px},${py}`;
  }
  const recvQArea = recvQPath ? `${recvQPath}L${x(history[history.length - 1].epochMs)},${pad.t + plotH}L${x(history[0].epochMs)},${pad.t + plotH}Z` : "";

  // Lag points
  const hidden = appState.fixLatency.hiddenSeries;
  const points = results.filter(r => !hidden.has(`sev_${r.severity || "none"}`)).map(r => {
    const color = fixSeverityColor(r.severity);
    return `<circle cx="${x(r.receiveMs)}" cy="${yLag(r.lagMs)}" r="3.5" fill="${color}" opacity="0.85" style="cursor:pointer"><title>${r.lagMs.toFixed(1)}ms | ${r.direction} ${r.msgType} | ${r.endpoint} | ${r.severity}${r.cause ? " | cause: " + r.cause : ""}${r.signals.length ? "\nsignals: " + r.signals.join(", ") : ""}</title></circle>`;
  }).join("");

  const legend = "";

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="rgba(0,0,0,0.15)"/>
    ${grid}${xLabels}${yLabelsLag}${yLabelsRecvQ}
    ${gcPauses && !hidden.has("gczone") ? gcPauses.filter(p => { const ps = p.alignedEpochMs || p.epochMs || 0; return ps >= t0 - gcWindowMs && ps <= t1; }).map(p => { const ps = p.alignedEpochMs || p.epochMs || 0; const pe = ps + (p.durationMs || 0); const x1 = Math.max(pad.l, x(ps)); const x2 = Math.min(pad.l + plotW, x(pe)); const x3 = Math.min(pad.l + plotW, x(pe + gcWindowMs)); return `<rect x="${x1}" y="${pad.t}" width="${Math.max(1, x2 - x1)}" height="${plotH}" fill="rgba(255,92,119,0.5)"/><rect x="${x2}" y="${pad.t}" width="${Math.max(0, x3 - x2)}" height="${plotH}" fill="rgba(255,159,67,0.3)"/>`; }).join("") : ""}
    ${!hidden.has("recvq") ? `<path d="${recvQArea}" fill="rgba(59,130,246,0.12)" stroke="rgba(59,130,246,0.5)" stroke-width="1.2"/>` : ""}
    ${!hidden.has("lag") ? points : ""}
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="var(--muted)" font-size="11">Time (UTC)</text>
    <text x="12" y="${h / 2}" transform="rotate(-90 12 ${h / 2})" text-anchor="middle" fill="var(--muted)" font-size="11">Lag (ms)</text>
    <text x="${w - 12}" y="${h / 2}" transform="rotate(90 ${w - 12} ${h / 2})" text-anchor="middle" fill="rgba(59,130,246,0.8)" font-size="11">Recv-Q (bytes)</text>

    ${legend}
    <rect class="fix-hover-zone" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="transparent"/>
    ${(() => { const sel = results.find(r => r.receiveMs === appState.fixTable.selectedEpoch); if (!sel) return ""; const sx = x(sel.receiveMs), sy = yLag(sel.lagMs); return `<line x1="${sx}" y1="${pad.t}" x2="${sx}" y2="${pad.t + plotH}" stroke="#fff" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.9"/><circle cx="${sx}" cy="${sy}" r="7" fill="none" stroke="#fff" stroke-width="2"/><text x="${sx}" y="${pad.t - 6}" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">${sel.lagMs.toFixed(1)}ms ${sel.cause || ""}</text>`; })()}
  `;
  attachFixChartCrosshair(svg, pad, w, h, t0, span, results, r => `${r.lagMs.toFixed(1)}ms · ${r.direction} ${r.msgType} ${r.symbol} · ${r.endpoint} · Cause: ${r.cause || "unknown"} · Score: ${r.score ? r.score.toFixed(2) : "0"}`);
}

function drawFixScatterChart(svg, results, deps = fixDrawDependencies()) {
  const { state: appState = state } = deps;
  const w = svg.clientWidth || svg.parentElement?.clientWidth || 640, h = svg.clientHeight || 200;
  const pad = { t: 32, r: 26, b: 48, l: 70 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;

  const maxLag = Math.max(...results.map(r => r.lagMs), 1);
  const x = v => pad.l + (v / maxLag) * plotW;
  const y = v => pad.t + plotH - v * plotH;

  const xTicks = fixChartYTicks(0, maxLag, { t: pad.t, l: pad.l, r: pad.r }, w).map(t => ({ px: pad.l + (t.val / maxLag) * plotW, val: t.val }));
  const yTicks = fixChartYTicks(0, 1, pad, h);
  const grid = fixChartGrid(xTicks.map(t => ({ px: t.px })), yTicks, pad, w, h);
  const xLabels = xTicks.map(t => `<text x="${t.px}" y="${h - 20}" text-anchor="middle" fill="var(--muted)" font-size="10">${t.val >= 1000 ? `${(t.val/1000).toFixed(1)}s` : `${Math.round(t.val)}ms`}</text>`).join("");
  const yLabels = yTicks.map(t => `<text x="${pad.l - 6}" y="${t.py + 3}" text-anchor="end" fill="var(--muted)" font-size="10">${t.val.toFixed(2)}</text>`).join("");

  const hidden = appState.fixLatency.hiddenSeries;
  const points = results.filter(r => !hidden.has(`sev_${r.severity || "none"}`)).map(r => {
    const color = fixSeverityColor(r.severity);
    return `<circle cx="${x(r.lagMs)}" cy="${y(r.score)}" r="3.5" fill="${color}" opacity="0.8" style="cursor:pointer"><title>Lag: ${r.lagMs.toFixed(1)}ms | Score: ${r.score.toFixed(2)} | ${r.severity}\nCause: ${r.cause || "unknown"}\nSignals: ${r.signals.join(", ") || "none"}\n${r.endpoint} ${r.direction} ${r.msgType}</title></circle>`;
  }).join("");

  const legend = "";

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="rgba(0,0,0,0.15)"/>
    ${grid}${xLabels}${yLabels}
    ${points}
    <text x="${w / 2}" y="${h - 2}" text-anchor="middle" fill="var(--muted)" font-size="11">Lag (ms)</text>
    <text x="12" y="${h / 2}" transform="rotate(-90 12 ${h / 2})" text-anchor="middle" fill="var(--muted)" font-size="11">Correlation Score</text>

    ${legend}
    ${(() => { const sel = results.find(r => r.receiveMs === appState.fixTable.selectedEpoch); if (!sel) return ""; const sx = x(sel.lagMs), sy = y(sel.score); return `<circle cx="${sx}" cy="${sy}" r="7" fill="none" stroke="#fff" stroke-width="2"/><text x="${sx + 10}" y="${sy - 4}" fill="#fff" font-size="10" font-weight="700">${sel.lagMs.toFixed(1)}ms</text>`; })()}
  `;
}
function renderWhatIfSimulation() {
  const rows = state.history;
  if (!rows || rows.length < 2) return "";
  const drops = dropRateSummary(rows);
  if (!drops || !drops.totalDropDelta) return "";
  const socket = state.sockets.find(s => s.id === state.selectedId) || state.sockets[0];
  if (!socket) return "";
  const currentRb = metricValue(socket, "skmem.rb") || 212992;
  const currentRcvSpace = metricValue(socket, "rcv_space") || 65536;
  const multiplier = state.whatIfMultiplier || 2;
  // Estimate: drops happen when recvQ > rcv_space. With bigger buffer, fewer overflows.
  let dropsAvoided = 0;
  const threshold = currentRcvSpace;
  const newThreshold = threshold * multiplier;
  for (let i = 1; i < rows.length; i++) {
    const recvQ = rows[i].recvQ || rows[i]["recvQ"] || 0;
    if (recvQ > threshold && recvQ <= newThreshold) dropsAvoided++;
  }
  const pct = drops.totalDropDelta > 0 ? Math.min(100, Math.round((dropsAvoided / drops.totalDropDelta) * 100)) : 0;
  return `<div class="advisor-whatif" style="margin:8px 0;padding:10px 14px;border-radius:8px;background:rgba(77,222,138,0.06);border:1px solid rgba(77,222,138,0.2)">
    <strong style="color:#4cde8a"><i class="ri-flask-line"></i> What-if simulation</strong>
    <div style="margin-top:6px;font-size:12px;color:var(--text)">
      If <code>rcv_space</code> was <strong><select id="whatIfMultiplier" style="background:var(--panel-2);color:var(--text);border:1px solid var(--line);border-radius:4px;padding:1px 4px;font-size:12px">
        <option value="2"${multiplier===2?" selected":""}>2×</option><option value="4"${multiplier===4?" selected":""}>4×</option><option value="8"${multiplier===8?" selected":""}>8×</option><option value="16"${multiplier===16?" selected":""}>16×</option>
      </select></strong> larger (${formatBytesHuman(currentRcvSpace)} → ${formatBytesHuman(currentRcvSpace * multiplier)}):
      <div style="margin-top:4px;font-size:13px"><strong style="color:${pct > 50 ? "#4cde8a" : pct > 0 ? "#ffd166" : "#8c9aab"}">${pct}%</strong> of drops potentially avoided (${dropsAvoided}/${drops.totalDropDelta})</div>
      <div style="margin-top:2px;font-size:10px;color:var(--muted)">Current skmem.rb=${formatBytesHuman(currentRb)} · Suggested: <code>sysctl net.core.rmem_max=${currentRb * multiplier}</code></div>
    </div>
  </div>`;
}

let _fixPlaybackTimer = null;
function toggleFixPlayback() {
  const fix = state.fixLatency;
  if (fix.playing) {
    fix.playing = false;
    if (_fixPlaybackTimer) { cancelAnimationFrameRef(_fixPlaybackTimer); _fixPlaybackTimer = null; }
    return;
  }
  if (!fix.correlation?.results?.length) return;
  fix.playing = true;
  const results = fix.correlation.results;
  const t0 = Math.min(...results.map(r => r.receiveMs));
  const t1 = Math.max(...results.map(r => r.receiveMs));
  const duration = 10000; // 10s playback
  const startReal = performanceRef().now();
  function tick() {
    if (!fix.playing) return;
    const elapsed = performanceRef().now() - startReal;
    const frac = Math.min(1, elapsed / duration);
    const epoch = t0 + frac * (t1 - t0);
    syncFixCrosshairs(epoch, null);
    // Also update heatmap overlay
    getDocument().querySelectorAll("[data-fix-heatmap]").forEach(c => {
      if (c._heatmapCrosshairAttached) {
        const overlay = c.parentElement?.querySelector(".heatmap-overlay");
        if (overlay) overlay.innerHTML = `<div style="position:absolute;left:${frac * 100}%;top:0;bottom:20px;width:2px;background:#ffd166"></div>`;
      }
    });
    if (frac >= 1) { fix.playing = false; syncFixCrosshairs(null, null); return; }
    _fixPlaybackTimer = requestAnimationFrameRef(tick);
  }
  _fixPlaybackTimer = requestAnimationFrameRef(tick);
}

function buildMultiSourceSummary(fix) {
  if (!fix.correlation?.results?.length || (!fix.vmstat?.length && !fix.nstat?.length)) return "";
  const results = fix.correlation.results;
  const groups = fixSpikeGroups(results, 2000);
  const events = [];
  for (const g of groups.slice(0, 5)) {
    const peakSpike = g.spikes.reduce((best, s) => s.lagMs > best.lagMs ? s : best, g.spikes[0]);
    const t = peakSpike.receiveMs;
    const parts = [`FIX lag ${peakSpike.lagMs.toFixed(1)}ms`];
    if (fix.vmstat?.length) {
      const vm = fix.vmstat.reduce((best, s) => Math.abs(s.epochMs - t) < Math.abs(best.epochMs - t) ? s : best, fix.vmstat[0]);
      if (Math.abs(vm.epochMs - t) < 5000) {
        const cpu = vm.us + vm.sy + vm.wa;
        if (cpu > 50) parts.push(`CPU ${cpu}%`);
        if (vm.r > 4) parts.push(`runqueue ${vm.r}`);
      }
    }
    if (fix.nstat?.length) {
      const ns = fix.nstat.reduce((best, s) => Math.abs(s.epochMs - t) < Math.abs(best.epochMs - t) ? s : best, fix.nstat[0]);
      if (Math.abs(ns.epochMs - t) < 5000) {
        const retrans = ns.counters?.TcpRetransSegs || 0;
        const prev = fix.nstat[Math.max(0, fix.nstat.indexOf(ns) - 1)];
        const delta = prev ? retrans - (prev.counters?.TcpRetransSegs || 0) : 0;
        if (delta > 0) parts.push(`retrans +${formatNumber(delta)}`);
      }
    }
    if (parts.length > 1) {
      const time = fixTimeLabel(t);
      const cause = peakSpike.cause || "unknown";
      events.push(`<li><strong>${time}</strong> — ${parts.join(" + ")} → <em>${cause}</em></li>`);
    }
  }
  if (!events.length) return "";
  return `<div class="bdp-context-line" style="margin:8px 0;padding:8px 12px;border-radius:8px;background:rgba(93,183,255,0.06);border:1px solid rgba(93,183,255,0.15)">
    <div style="font-weight:700;font-size:12px;color:var(--text);margin-bottom:4px"><i class="ri-links-line"></i> Multi-source correlation</div>
    <ul style="margin:0;padding:0 0 0 16px;font-size:11px;color:var(--soft);line-height:1.7">${events.join("")}</ul>
  </div>`;
}



function fixSpikeGroups(fixResults, gapMs = 2000) {
  if (!fixResults.length) return [];
  const sorted = [...fixResults].sort((a, b) => a.receiveMs - b.receiveMs);
  const groups = [];
  let cur = { id: 1, startMs: sorted[0].receiveMs, endMs: sorted[0].receiveMs, spikes: [sorted[0]] };
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].receiveMs - cur.endMs > gapMs) {
      groups.push(cur);
      cur = { id: groups.length + 1, startMs: sorted[i].receiveMs, endMs: sorted[i].receiveMs, spikes: [sorted[i]] };
    } else {
      cur.endMs = sorted[i].receiveMs;
      cur.spikes.push(sorted[i]);
    }
  }
  groups.push(cur);
  return groups;
}

function renderFixSpikeMarkers(fixResults, t0, t1, x, pad, plotH, hidden) {
  if (hidden.has("fixmarkers") || !fixResults.length) return "";
  const visible = fixResults.filter(r => r.receiveMs >= t0 && r.receiveMs <= t1);
  if (!visible.length) return "";
  const visibleSpan = t1 - t0 || 1;
  const gapMs = Math.max(200, visibleSpan * 0.03);
  const groups = fixSpikeGroups(visible, gapMs);
  return groups.map(g => {
    const midMs = (g.startMs + g.endMs) / 2;
    const px = x(midMs);
    return `<line x1="${px}" y1="${pad.t}" x2="${px}" y2="${pad.t + plotH}" stroke="#ffffff" stroke-width="0.7" opacity="0.3"/><text x="${px}" y="${pad.t - 3}" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="8">FIX#${g.id}</text>`;
  }).join("") + visible.map(r => {
    const px = x(r.receiveMs);
    return `<line x1="${px}" y1="${pad.t}" x2="${px}" y2="${pad.t + plotH}" stroke="#ffffff" stroke-width="0.3" opacity="0.15"/>`;
  }).join("");
}

function drawFixVmstatChart(svg, vmsamples, fixResults, cpuCores = 0, deps = fixDrawDependencies()) {
  const { state: appState = state } = deps;
  const w = svg.clientWidth || svg.parentElement?.clientWidth || 640, h = svg.clientHeight || 200;
  const pad = { t: 32, r: 50, b: 48, l: 70 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;

  const t0 = vmsamples[0].epochMs, t1 = vmsamples[vmsamples.length - 1].epochMs;
  const span = t1 - t0 || 1;
  const x = t => pad.l + ((t - t0) / span) * plotW;

  const maxR = Math.max(...vmsamples.map(s => s.r), 4);
  const yCpu = v => pad.t + plotH - (v / 100) * plotH;
  const yR = v => pad.t + plotH - (v / maxR) * plotH;

  const xTicks = fixChartXTicks(t0, t1, pad, w);
  const yTicksCpu = fixChartYTicks(0, 100, pad, h);
  const grid = fixChartGrid(xTicks, yTicksCpu, pad, w, h);
  const xLabels = fixChartXLabels(xTicks, h);
  const yLabelsCpu = fixChartYLabels(yTicksCpu, pad, v => `${Math.round(v)}%`);
  const yLabelsR = yTicksCpu.map(t => {
    const val = (t.val / 100) * maxR;
    return `<text x="${w - pad.r + 6}" y="${t.py + 3}" text-anchor="start" fill="#2cc62c" font-size="10">${Math.round(val)}</text>`;
  }).join("");

  // CPU lines
  let usPath = "", syPath = "", ussyPath = "", waPath = "", totalPath = "", blockedPath = "";
  for (let i = 0; i < vmsamples.length; i++) {
    const s = vmsamples[i], px = x(s.epochMs);
    usPath += (i === 0 ? "M" : "L") + `${px},${yCpu(s.us)}`;
    syPath += (i === 0 ? "M" : "L") + `${px},${yCpu(s.sy)}`;
    ussyPath += (i === 0 ? "M" : "L") + `${px},${yCpu(s.us + s.sy)}`;
    waPath += (i === 0 ? "M" : "L") + `${px},${yCpu(s.wa)}`;
    totalPath += (i === 0 ? "M" : "L") + `${px},${yCpu(s.us + s.sy + s.wa)}`;
    blockedPath += (i === 0 ? "M" : "L") + `${px},${yR(s.b || 0)}`;
  }
  // Run queue
  let rPath = "";
  for (let i = 0; i < vmsamples.length; i++) {
    rPath += (i === 0 ? "M" : "L") + `${x(vmsamples[i].epochMs)},${yR(vmsamples[i].r)}`;
  }
  const hidden = appState.fixLatency.hiddenSeries;
  // FIX spike markers
  const markers = renderFixSpikeMarkers(fixResults, t0, t1, x, pad, plotH, hidden);
  const legend = "";

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="rgba(0,0,0,0.15)"/>
    ${grid}${xLabels}${yLabelsCpu}${yLabelsR}
    ${markers}
    ${!hidden.has("total") ? `<path d="${totalPath}" fill="none" stroke="#d4ff00" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.7"/>` : ""}
    ${!hidden.has("ussy") ? `<path d="${ussyPath}" fill="none" stroke="#38bdf8" stroke-width="2"/>` : ""}
    ${!hidden.has("wa") ? `<path d="${waPath}" fill="none" stroke="#ff9f43" stroke-width="1.5" opacity="0.7"/>` : ""}
    ${!hidden.has("sy") ? `<path d="${syPath}" fill="none" stroke="#a855f7" stroke-width="1.5" opacity="0.7"/>` : ""}
    ${!hidden.has("us") ? `<path d="${usPath}" fill="none" stroke="#3b82f6" stroke-width="2"/>` : ""}
    ${!hidden.has("runqueue") ? `<path d="${rPath}" fill="none" stroke="#4ade80" stroke-width="2" stroke-dasharray="4,2"/>` : ""}
    ${!hidden.has("blocked") ? `<path d="${blockedPath}" fill="none" stroke="#f472b6" stroke-width="1.5" stroke-dasharray="6,3"/>` : ""}
    ${cpuCores > 0 ? `<line x1="${pad.l}" x2="${w - pad.r}" y1="${yR(cpuCores)}" y2="${yR(cpuCores)}" stroke="#ff5c77" stroke-width="1" stroke-dasharray="6,4" opacity="0.7"/><text x="${w - pad.r - 4}" y="${yR(cpuCores) - 4}" text-anchor="end" fill="#ff5c77" font-size="9">${cpuCores} CPUs</text>` : ""}
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="var(--muted)" font-size="11">Time (UTC)</text>
    <text x="12" y="${h / 2}" transform="rotate(-90 12 ${h / 2})" text-anchor="middle" fill="var(--muted)" font-size="11">CPU %</text>
    <text x="${w - 12}" y="${h / 2}" transform="rotate(90 ${w - 12} ${h / 2})" text-anchor="middle" fill="#2cc62c" font-size="11">Run Queue</text>

    ${legend}
    <rect class="fix-hover-zone" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="transparent"/>
  `;
  attachFixChartCrosshair(svg, pad, w, h, t0, span, vmsamples, s => `r=${s.r} · b=${s.b || 0} · us=${s.us}% · sy=${s.sy}% · wa=${s.wa}% · us+sy+wa=${s.us + s.sy + s.wa}% · idle=${s.id}% · cs=${formatNumber(s.cs)} · bo=${s.bo}`);
}

function drawFixNstatChart(svg, nsamples, fixResults, deps = fixDrawDependencies()) {
  const { state: appState = state } = deps;
  const w = svg.clientWidth || svg.parentElement?.clientWidth || 640, h = svg.clientHeight || 200;
  const pad = { t: 32, r: 26, b: 48, l: 70 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;

  const t0 = nsamples[0].epochMs, t1 = nsamples[nsamples.length - 1].epochMs;
  const span = t1 - t0 || 1;
  const x = t => pad.l + ((t - t0) / span) * plotW;

  const keys = ["TcpRetransSegs", "TcpExtTCPTimeouts", "TcpExtTCPBacklogDrop", "TcpExtListenDrops", "TcpExtTCPRcvQDrop"];
  const colors = ["#ff5c77", "#ff9f43", "#a855f7", "#ffd166", "#39d6d6"];
  const labels = ["Retrans", "Timeouts", "BacklogDrop", "ListenDrop", "RcvQDrop"];

  const hidden = appState.fixLatency.hiddenSeries;
  const seriesKeys = ["retrans", "timeouts", "backlogdrop", "listendrop", "rcvqdrop"];
  const visibleKeys = keys.filter((_, i) => !hidden?.has(seriesKeys[i]));
  const visibleValues = nsamples.flatMap(s => visibleKeys.map(k => s.counters[k] || 0));
  const rawMin = visibleValues.length ? Math.min(...visibleValues) : 0;
  const rawMax = visibleValues.length ? Math.max(...visibleValues) : 1;
  const range = rawMax - rawMin || 1;
  const yMin = visibleKeys.length === 1 ? Math.max(0, rawMin - range * 0.1) : 0;
  const maxVal = visibleKeys.length === 1 ? rawMax + range * 0.1 : Math.max(1, rawMax);
  const ySpan = maxVal - yMin || 1;
  const y = v => pad.t + plotH - ((v - yMin) / ySpan) * plotH;

  const xTicks = fixChartXTicks(t0, t1, pad, w);
  const yTicks = fixChartYTicks(yMin, maxVal, pad, h);
  const grid = fixChartGrid(xTicks, yTicks, pad, w, h);
  const xLabelsHtml = fixChartXLabels(xTicks, h);
  const yLabelsHtml = fixChartYLabels(yTicks, pad, v => String(Math.round(v)));

  const lines = keys.map((key, ki) => {
    if (hidden?.has(seriesKeys[ki])) return "";
    let path = "";
    for (let i = 0; i < nsamples.length; i++) {
      const px = x(nsamples[i].epochMs), py = y(nsamples[i].counters[key] || 0);
      path += (i === 0 ? "M" : "L") + `${px},${py}`;
    }
    return path ? `<path d="${path}" fill="none" stroke="${colors[ki]}" stroke-width="1.5" opacity="0.85"/>` : "";
  }).join("");

  const markers = renderFixSpikeMarkers(fixResults, t0, t1, x, pad, plotH, hidden);

  const legend = "";

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="rgba(0,0,0,0.15)"/>
    ${grid}${xLabelsHtml}${yLabelsHtml}
    ${markers}
    ${lines}
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="var(--muted)" font-size="11">Time (UTC)</text>
    <text x="12" y="${h / 2}" transform="rotate(-90 12 ${h / 2})" text-anchor="middle" fill="var(--muted)" font-size="11">Count / second</text>

    ${legend}
    <rect class="fix-hover-zone" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="transparent"/>
  `;
  attachFixChartCrosshair(svg, pad, w, h, t0, span, nsamples, s => keys.map((k, i) => `${labels[i]}=${s.counters[k] || 0}`).filter(v => !v.endsWith("=0")).join(" · ") || "all zero");
}

let _fixCrosshairEpoch = null;
function syncFixCrosshairs(epoch, sourceSvg) {
  _fixCrosshairEpoch = epoch;
  getDocument().querySelectorAll("[data-fix-chart]").forEach(svg => {
    if (svg === sourceSvg) return;
    const g = svg.querySelector(".fix-crosshair-g");
    if (!g) return;
    if (epoch === null) { g.style.display = "none"; return; }
    if (svg._fixCrosshairUpdate) svg._fixCrosshairUpdate(epoch);
  });
}

function attachFixChartCrosshair(svg, pad, w, h, t0, span, data, labelFn) {
  const zone = svg.querySelector(".fix-hover-zone");
  if (!zone || !data.length) return;
  let g = svg.querySelector(".fix-crosshair-g");
  if (g) g.remove();
  g = getDocument().createElementNS("http://www.w3.org/2000/svg", "g");
  g.classList.add("fix-crosshair-g");
  g.style.pointerEvents = "none";
  g.style.display = "none";
  g.innerHTML = `<line class="xh-v" y1="${pad.t}" y2="${h - pad.b}" stroke="#ffd166" stroke-width="1" stroke-dasharray="4,3" opacity="0.8"/><line class="xh-h" x1="${pad.l}" x2="${w - pad.r}" stroke="#ffd166" stroke-width="1" stroke-dasharray="4,3" opacity="0.5"/><rect class="xh-bg" rx="6" ry="6" fill="rgba(14,17,22,0.35)" stroke="rgba(140,183,255,0.25)" stroke-width="1"/><text class="xh-title" font-size="12" font-weight="700" fill="#edf4ff"></text><g class="xh-rows"></g>`;
  svg.appendChild(g);
  function updateCrosshair(epoch, my) {
    const frac = Math.max(0, Math.min(1, (epoch - t0) / span));
    const closest = data.reduce((best, item) => Math.abs((item.epochMs || item.receiveMs) - epoch) < Math.abs((best.epochMs || best.receiveMs) - epoch) ? item : best, data[0]);
    const cx = pad.l + (((closest.epochMs || closest.receiveMs) - t0) / span) * (w - pad.l - pad.r);
    g.style.display = "";
    g.querySelector(".xh-v").setAttribute("x1", cx);
    g.querySelector(".xh-v").setAttribute("x2", cx);
    g.querySelector(".xh-h").setAttribute("y1", my);
    g.querySelector(".xh-h").setAttribute("y2", my);
    const label = labelFn(closest);
    const time = fixTimeLabel(closest.epochMs || closest.receiveMs);
    const lines = label.split(" · ");
    const tooltipX = cx + 14 + 160 > w ? cx - 170 : cx + 14;
    const tooltipY = Math.max(pad.t + 4, Math.min(h - pad.b - (lines.length * 16 + 30), my - 20));
    const titleEl = g.querySelector(".xh-title");
    titleEl.setAttribute("x", tooltipX + 10); titleEl.setAttribute("y", tooltipY + 18); titleEl.textContent = time;
    const rowsG = g.querySelector(".xh-rows");
    rowsG.innerHTML = lines.map((line, i) => {
      const c = line.startsWith("r=") ? "#4ade80" : line.startsWith("b=") ? "#f472b6" : line.startsWith("us=") ? "#3b82f6" : line.startsWith("sy=") ? "#a855f7" : line.startsWith("wa=") ? "#ff9f43" : line.startsWith("us+sy+wa") ? "#d4ff00" : line.startsWith("us+sy") ? "#38bdf8" : line.startsWith("idle") ? "#94a3b8" : line.startsWith("Retrans") ? "#ff5c77" : line.startsWith("Timeouts") ? "#ff9f43" : line.startsWith("Backlog") ? "#a855f7" : line.startsWith("Listen") ? "#ffd166" : line.startsWith("RcvQ") ? "#39d6d6" : "#8cb7ff";
      return `<text x="${tooltipX + 10}" y="${tooltipY + 34 + i * 16}" font-size="11" fill="#c4d0de"><tspan fill="${c}">● </tspan>${line}</text>`;
    }).join("");
    const bgEl = g.querySelector(".xh-bg");
    const tw = Math.max(150, Math.max(time.length, ...lines.map(l => l.length)) * 7 + 20);
    const th = lines.length * 16 + 28;
    bgEl.setAttribute("x", tooltipX); bgEl.setAttribute("y", tooltipY); bgEl.setAttribute("width", tw); bgEl.setAttribute("height", th);
  }
  svg._fixCrosshairUpdate = (epoch) => { updateCrosshair(epoch, pad.t + 30); };
  zone.addEventListener("mousemove", e => {
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const epoch = t0 + Math.max(0, Math.min(1, (mx - pad.l) / (w - pad.l - pad.r))) * span;
    updateCrosshair(epoch, my);
    syncFixCrosshairs(epoch, svg);
  });
  zone.addEventListener("mouseleave", () => { g.style.display = "none"; syncFixCrosshairs(null, svg); });
  // Drag-to-zoom
  let dragStart = null;
  let dragOverlay = svg.querySelector(".fix-drag-overlay");
  if (!dragOverlay) { dragOverlay = getDocument().createElementNS("http://www.w3.org/2000/svg", "rect"); dragOverlay.classList.add("fix-drag-overlay"); dragOverlay.setAttribute("y", pad.t); dragOverlay.setAttribute("height", h - pad.t - pad.b); dragOverlay.setAttribute("fill", "rgba(93,183,255,0.12)"); dragOverlay.setAttribute("stroke", "#5db7ff"); dragOverlay.setAttribute("stroke-width", "1"); dragOverlay.style.display = "none"; dragOverlay.style.pointerEvents = "none"; svg.appendChild(dragOverlay); }
  zone.addEventListener("pointerdown", e => { if (e.button !== 0) return; const rect = svg.getBoundingClientRect(); dragStart = e.clientX - rect.left; zone.setPointerCapture(e.pointerId); });
  zone.addEventListener("pointermove", e => { if (dragStart === null) return; const rect = svg.getBoundingClientRect(); const mx = e.clientX - rect.left; const x1 = Math.max(pad.l, Math.min(w - pad.r, dragStart)); const x2 = Math.max(pad.l, Math.min(w - pad.r, mx)); dragOverlay.setAttribute("x", Math.min(x1, x2)); dragOverlay.setAttribute("width", Math.abs(x2 - x1)); dragOverlay.style.display = Math.abs(x2 - x1) > 5 ? "" : "none"; });
  zone.addEventListener("pointerup", e => { if (dragStart === null) return; const rect = svg.getBoundingClientRect(); const mx = e.clientX - rect.left; const plotW = w - pad.l - pad.r; const dist = Math.abs(mx - dragStart); dragOverlay.style.display = "none"; dragStart = null; if (dist < 12) return; const left = Math.max(0, Math.min(1, (Math.min(mx, dragStart) - pad.l) / plotW)); const right = Math.max(0, Math.min(1, (Math.max(mx, dragStart) - pad.l) / plotW)); if (right - left < 0.01) return; const chartId = svg.dataset.fixChart; if (!chartId) return; const z = state.fixLatency.zoom[chartId] || { start: 0, end: 1 }; const zSpan = z.end - z.start; state.fixLatency.zoom[chartId] = { start: z.start + left * zSpan, end: z.start + right * zSpan }; drawFixCharts(); });
}



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
