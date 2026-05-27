import { createFixPanelModel } from "./fix-panel-model.js";
import { fixChartGrid, fixChartXLabels, fixChartXTicks, fixChartYLabels, fixChartYTicks, fixSeverityColor, fixSpikeGroups, fixTimeLabel } from "./fix-chart-utils.js";
import { createFixHeatmapDrawing } from "./fix-heatmap-drawing.js";

/**
 * FIX Latency chart drawing functions.
 * Extracted from advanced-correlation-panels.js for maintainability.
 */
export function createFixChartDrawing(ctx) {
  const { state, icons, getDocument, WorkerCtor, performanceRef, requestAnimationFrameRef, cancelAnimationFrameRef, correlateFixLatency, computeFixStats, escapeHtml, formatBytesHuman, formatMetricValue, formatNumber, metricValue, parsedTimestampSnapshots, render, renderFixLatencyPanelView, resolvedNumberLocale, resolvedTimeZone, setZoom, socketsById, timeLabel, visibleHistory, chartBgColor, chartTooltipOpacity, dateTimeFormatter, dropRateSummary, drawFixCharts: _selfDrawFixCharts, preciseDateTimeLabel } = ctx;

  const fixPanel = createFixPanelModel({
    state,
    icons,
    WorkerCtor,
    performanceRef,
    requestAnimationFrameRef,
    cancelAnimationFrameRef,
    correlateFixLatency,
    computeFixStats,
    dropRateSummary,
    escapeHtml,
    formatBytesHuman,
    formatNumber,
    metricValue,
    parsedTimestampSnapshots,
    render,
    renderFixLatencyPanelView,
    preciseDateTimeLabel,
    getDocument,
    drawFixCharts,
    syncFixCrosshairs
  });
  const {
    buildMultiSourceSummary,
    fixPagedRows,
    renderFixLatencyPanel,
    renderWhatIfSimulation,
    runFixCorrelation,
    toggleFixPlayback
  } = fixPanel;
  const { drawFixHeatmap, attachFixHeatmapCrosshair } = createFixHeatmapDrawing({ getDocument, fixTimeLabel, syncFixCrosshairs });

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
    runFixCorrelation,
    fixPagedRows,
    renderFixLatencyPanel,
    fixDrawDependencies,
    drawFixCharts,
    drawFixHeatmap,
    drawFixTimelineChart,
    drawFixScatterChart,
    drawFixVmstatChart,
    drawFixNstatChart,
    buildMultiSourceSummary,
    fixSpikeGroups,
    renderFixSpikeMarkers,
    renderWhatIfSimulation,
    toggleFixPlayback,
    syncFixCrosshairs,
    attachFixChartCrosshair
  };
}
