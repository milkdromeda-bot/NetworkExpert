import { createFixChartDrawing } from "./fix-chart-drawing.js";
import { createJvmChartDrawing } from "./jvm-chart-drawing.js";
import { createJvmPanelModel } from "./jvm-panel-model.js";

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

  const jvmPanel = createJvmPanelModel({
    state,
    icons,
    alignTimestamps,
    dateTimeFormatter,
    escapeHtml,
    formatNumber,
    renderJvmGcPanelView,
    resolvedNumberLocale,
    resolvedTimeZone,
    visibleHistory
  });
  const { renderJvmGcPanel, jvmSeriesHidden, preciseDateTimeLabel } = jvmPanel;

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

  const _jvmDrawing = createJvmChartDrawing({
    state,
    getDocument,
    chartBgColor,
    chartTooltipOpacity,
    escapeHtml,
    formatMetricValue,
    jvmSeriesHidden,
    parsedTimestampSnapshots,
    preciseDateTimeLabel,
    resolvedTimeZone,
    setZoom,
    socketsById,
    timeLabel,
    visibleHistory
  });
  const { drawJvmCharts } = _jvmDrawing;

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
