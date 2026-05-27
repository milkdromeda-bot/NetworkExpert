import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const main = readFileSync(new URL("../../src/rendering/main.js", import.meta.url), "utf8");
const advanced = readFileSync(new URL("../../src/correlation/advanced-correlation-panels.js", import.meta.url), "utf8");
const fixDrawing = readFileSync(new URL("../../src/correlation/fix-chart-drawing.js", import.meta.url), "utf8");
const fixHeatmapDrawing = readFileSync(new URL("../../src/correlation/fix-heatmap-drawing.js", import.meta.url), "utf8");
const jvmChartDrawing = readFileSync(new URL("../../src/correlation/jvm-chart-drawing.js", import.meta.url), "utf8");
const metricCharts = readFileSync(new URL("../../src/charts/metric-chart-engine.js", import.meta.url), "utf8");
const appRendering = readFileSync(new URL("../../src/rendering/app-rendering.js", import.meta.url), "utf8");
const chartsPageRendering = readFileSync(new URL("../../src/views/charts-page-rendering.js", import.meta.url), "utf8");
const socketTableRendering = readFileSync(new URL("../../src/views/socket-table-rendering.js", import.meta.url), "utf8");
const reportActions = readFileSync(new URL("../../src/reporting/report-actions.js", import.meta.url), "utf8");
const reportChartActions = readFileSync(new URL("../../src/reporting/report-chart-actions.js", import.meta.url), "utf8");
const reportDataActions = readFileSync(new URL("../../src/reporting/report-data-actions.js", import.meta.url), "utf8");
const reportExportActions = readFileSync(new URL("../../src/reporting/report-export-actions.js", import.meta.url), "utf8");
const appEvents = readFileSync(new URL("../../src/events/app-event-bindings.js", import.meta.url), "utf8");
const chartEvents = readFileSync(new URL("../../src/events/chart-event-bindings.js", import.meta.url), "utf8");
const actionEvents = readFileSync(new URL("../../src/events/action-button-events.js", import.meta.url), "utf8");

function functionBlock(name, source = main) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  let depth = 0;
  let started = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
      started = true;
    } else if (char === "}") {
      depth -= 1;
      if (started && depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${name} function block was not closed`);
}

test("chart draw functions accept injectable runtime dependencies", () => {
  assert.match(main, /function chartDrawDependencies\(\)\s*\{/);
  assert.match(main, /function drawChart\(deps = chartDrawDependencies\(\)\)/);
  assert.match(main, /function drawChartInto\(svg, metric, style = null, showThreshold = false, deps = chartDrawDependencies\(\)\)/);
  assert.match(main, /function scheduleMultiChartDraw\(deps = chartDrawDependencies\(\)\)/);
  assert.match(main, /function drawMinimaps\(deps = chartDrawDependencies\(\)\)/);
  assert.match(main, /function drawSingleMinimap\(canvas, metric, deps = chartDrawDependencies\(\)\)/);
  assert.match(main, /function attachChartInteractions\(svg, deps = chartDrawDependencies\(\)\)/);
});

test("JVM chart draw functions accept injectable runtime dependencies", () => {
  assert.match(main, /function drawJvmCharts\(\.\.\.args\) \{ return appRendering\.drawJvmCharts\(\.\.\.args\); \}/);
  assert.match(appRendering, /function drawJvmCharts\(deps\) \{ return advancedCorrelationPanels\.drawJvmCharts\(deps\); \}/);
  assert.match(jvmChartDrawing, /function jvmDrawDependencies\(\)\s*\{/);
  assert.match(jvmChartDrawing, /function drawJvmCharts\(deps = jvmDrawDependencies\(\)\)/);
  assert.match(jvmChartDrawing, /function drawJvmTimelineChartInteractive\(svg, results, history, deps = jvmDrawDependencies\(\)\)/);
  assert.match(jvmChartDrawing, /function drawJvmScatterChartInteractive\(svg, results, deps = jvmDrawDependencies\(\)\)/);
  assert.match(jvmChartDrawing, /function attachJvmTimelineInteractions\(svg, results, history[\s\S]*deps = jvmDrawDependencies\(\)\)/);
  assert.match(jvmChartDrawing, /function attachJvmScatterInteractions\(svg, points[\s\S]*deps = jvmDrawDependencies\(\)\)/);
});

test("FIX chart draw functions accept injectable runtime dependencies", () => {
  assert.match(main, /function drawFixCharts\(\.\.\.args\) \{ return appRendering\.drawFixCharts\(\.\.\.args\); \}/);
  assert.match(appRendering, /function drawFixCharts\(deps\) \{ return advancedCorrelationPanels\.drawFixCharts\(deps\); \}/);
  assert.match(fixDrawing, /function fixDrawDependencies\(\)\s*\{/);
  assert.match(fixDrawing, /function drawFixCharts\(deps = fixDrawDependencies\(\)\)/);
  assert.match(fixDrawing, /createFixHeatmapDrawing\(\{ getDocument, fixTimeLabel, syncFixCrosshairs \}\)/);
  assert.match(fixHeatmapDrawing, /function drawFixHeatmap\(canvas, results, fullT0, fullT1\)/);
  assert.match(fixDrawing, /function drawFixTimelineChart\(svg, results, history, gcPauses = null, gcWindowMs = 200, deps = fixDrawDependencies\(\)\)/);
  assert.match(fixDrawing, /function drawFixScatterChart\(svg, results, deps = fixDrawDependencies\(\)\)/);
  assert.match(fixDrawing, /function drawFixVmstatChart\(svg, vmsamples, fixResults, cpuCores = 0, deps = fixDrawDependencies\(\)\)/);
  assert.match(fixDrawing, /function drawFixNstatChart\(svg, nsamples, fixResults, deps = fixDrawDependencies\(\)\)/);
});

test("chart draw dependencies isolate DOM and mutable app state", () => {
  assert.match(metricCharts, /const \{ root = document, state: appState = state, drawChartInto: drawInto = drawChartInto \} = deps;/);
  assert.match(metricCharts, /const \{ state: appState = state, attachChartInteractions: attachInteractions = attachChartInteractions \} = deps;/);
  assert.match(metricCharts, /root\.querySelectorAll\("\[data-mini-chart\]"\)/);
  assert.match(metricCharts, /root\.querySelectorAll\("\[data-minimap\]"\)/);
  assert.match(metricCharts, /appState\.prefs\.chartLayout\.showThresholds/);
  assert.match(metricCharts, /attachInteractions\(svg, deps\)/);
});

test("bindEvents is split into dependency-injected chart binders", () => {
  assert.match(main, /function appEventDependencies\(\)\s*\{/);
  assert.match(main, /function sourceFileEventDependencies\(\)\s*\{/);
  assert.match(main, /function serviceConfigActionDependencies\(\)\s*\{/);
  assert.match(main, /function tableInteractionDependencies\(\)\s*\{/);
  assert.match(main, /function socketInteractionDependencies\(\)\s*\{/);
  assert.match(main, /function layoutProfileActionDependencies\(\)\s*\{/);
  assert.match(main, /function bindEvents\(deps = appEventDependencies\(\)\)/);
  assert.match(main, /function bindChartMinimapEvents\(deps = appEventDependencies\(\)\)/);
  assert.match(main, /function bindChartChromeEvents\(deps = appEventDependencies\(\)\)/);
  assert.match(main, /function bindChartSeriesEvents\(deps = appEventDependencies\(\)\)/);
  assert.match(appEvents, /bindSourceFileEvents\(sourceFileEventDependencies\(\)\);/);
  assert.match(actionEvents, /handleServiceConfigAction\(action, event, serviceConfigActionDependencies\(\)\)/);
  assert.match(appEvents, /bindTableInteractionEvents\(tableInteractionDependencies\(\)\);/);
  assert.match(appEvents, /bindSocketInteractionEvents\(socketInteractionDependencies\(\)\);/);
  assert.match(actionEvents, /handleLayoutProfileAction\(action, event, layoutProfileActionDependencies\(\)\)/);
  assert.match(appEvents, /bindChartMinimapEvents\(deps\);/);
  assert.match(appEvents, /bindChartChromeEvents\(deps\);/);
  assert.match(appEvents, /bindChartSeriesEvents\(deps\);/);
});

test("large rendering and report actions stay behind small dependency factories", () => {
  assert.match(main, /const appRendering = createAppRendering\(appRenderingDependencies\);/);
  assert.match(main, /function appRenderingDependencies\(\)\s*\{/);
  assert.match(appRendering, /export function createAppRendering\(getDeps\)/);
  assert.match(appRendering, /function renderChartsPage\(\.\.\.args\) \{ return chartsPageRendering\.renderChartsPage\(\.\.\.args\); \}/);
  assert.match(chartsPageRendering, /function renderChartsPage\(\)/);
  assert.match(appRendering, /function renderSocketTable\(\.\.\.args\) \{ return socketTableRendering\.renderSocketTable\(\.\.\.args\); \}/);
  assert.match(socketTableRendering, /function renderSocketTable\(\)/);

  assert.match(main, /const reportActions = createReportActions\(reportActionDependencies\);/);
  assert.match(main, /function reportActionDependencies\(\)\s*\{/);
  assert.match(reportActions, /export function createReportActions\(getDeps\)/);
  assert.match(reportActions, /createReportActionRuntime\(getDeps\)/);
  assert.match(reportChartActions, /function captureIncidentReportCharts\(limit = 5\)/);
  assert.match(reportDataActions, /function reportFilterTokens\(\)/);
  assert.match(reportExportActions, /async function exportEvidencePack\(\)/);
  assert.match(reportExportActions, /function openIncidentReport\(\)/);
});

test("event dependency factory keeps render callback executable", () => {
  const appDeps = functionBlock("appEventDependencies");
  const chromeBinder = functionBlock("bindChartChromeEvents", chartEvents);
  assert.match(appDeps, /\r?\n\s*render,\r?\n/);
  assert.doesNotMatch(appDeps, /render:\s*renderView\s*=\s*render/);
  assert.match(chromeBinder, /render:\s*renderView/);
  assert.match(chromeBinder, /renderView\(\);/);
});

test("chart event binders use injected root state and redraw callbacks", () => {
  assert.match(chartEvents, /root\?\.querySelectorAll\("\[data-chart-zoom\]"\)\.forEach/);
  assert.match(chartEvents, /applyZoom\(action, metric\);/);
  assert.match(chartEvents, /drawBdp\(deps\);/);
  assert.match(chartEvents, /drawJvm\(deps\);/);
  assert.match(chartEvents, /drawFix\(deps\);/);
  assert.match(chartEvents, /root\?\.querySelectorAll\("\[data-chart-series-toggle\]"\)\.forEach/);
  assert.match(chartEvents, /root\?\.querySelectorAll\("\[data-jvm-series-key\]"\)\.forEach/);
  assert.match(chartEvents, /redrawMetric\(metric, `series:\$\{key\}`, deps\)/);
});

test("JVM chart interactions use injected DOM root and redraw callback", () => {
  assert.match(jvmChartDrawing, /const \{ root = getDocument\(\), state: appState = state, drawJvmCharts: drawJvm = drawJvmCharts \} = deps;/);
  assert.match(jvmChartDrawing, /root\.querySelector\("\[data-jvm-chart='scatter'\]"\)/);
  assert.match(jvmChartDrawing, /root\.querySelector\("\[data-jvm-chart='recvq'\]"\)/);
  assert.match(jvmChartDrawing, /drawJvm\(deps\);/);
  assert.match(jvmChartDrawing, /const dom = root\.ownerDocument \|\| root;/);
});

test("FIX chart draw orchestration uses injected root and chart callbacks", () => {
  assert.match(fixDrawing, /const \{[\s\S]*root = getDocument\(\),[\s\S]*drawFixTimelineChart: drawTimeline = drawFixTimelineChart[\s\S]*drawFixHeatmap: drawHeatmap = drawFixHeatmap[\s\S]*\} = deps;/);
  assert.match(fixDrawing, /root\.querySelector\("\[data-fix-chart='timeline'\]"\)/);
  assert.match(fixDrawing, /root\.querySelector\("\[data-fix-chart='scatter'\]"\)/);
  assert.match(fixDrawing, /root\.querySelector\("\[data-fix-chart='vmstat'\]"\)/);
  assert.match(fixDrawing, /root\.querySelector\("\[data-fix-chart='nstat'\]"\)/);
  assert.match(fixDrawing, /root\.querySelectorAll\("\[data-fix-heatmap\]"\)/);
  assert.match(fixDrawing, /drawHeatmap\(c, results, tMin, tMax, deps\)/);
});
