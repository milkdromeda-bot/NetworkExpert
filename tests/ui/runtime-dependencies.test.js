import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const main = readFileSync(new URL("../../src/rendering/main.js", import.meta.url), "utf8");
const advanced = readFileSync(new URL("../../src/correlation/advanced-correlation-panels.js", import.meta.url), "utf8");
const fixDrawing = readFileSync(new URL("../../src/correlation/fix-chart-drawing.js", import.meta.url), "utf8");
const metricCharts = readFileSync(new URL("../../src/charts/metric-chart-engine.js", import.meta.url), "utf8");
const appRendering = readFileSync(new URL("../../src/rendering/app-rendering.js", import.meta.url), "utf8");
const reportActions = readFileSync(new URL("../../src/reporting/report-actions.js", import.meta.url), "utf8");
const appEvents = readFileSync(new URL("../../src/events/app-event-bindings.js", import.meta.url), "utf8");

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
  assert.match(advanced, /function jvmDrawDependencies\(\)\s*\{/);
  assert.match(advanced, /function drawJvmCharts\(deps = jvmDrawDependencies\(\)\)/);
  assert.match(advanced, /function drawJvmTimelineChartInteractive\(svg, results, history, deps = jvmDrawDependencies\(\)\)/);
  assert.match(advanced, /function drawJvmScatterChartInteractive\(svg, results, deps = jvmDrawDependencies\(\)\)/);
  assert.match(advanced, /function attachJvmTimelineInteractions\(svg, results, history[\s\S]*deps = jvmDrawDependencies\(\)\)/);
  assert.match(advanced, /function attachJvmScatterInteractions\(svg, points[\s\S]*deps = jvmDrawDependencies\(\)\)/);
});

test("FIX chart draw functions accept injectable runtime dependencies", () => {
  assert.match(main, /function drawFixCharts\(\.\.\.args\) \{ return appRendering\.drawFixCharts\(\.\.\.args\); \}/);
  assert.match(appRendering, /function drawFixCharts\(deps\) \{ return advancedCorrelationPanels\.drawFixCharts\(deps\); \}/);
  assert.match(fixDrawing, /function fixDrawDependencies\(\)\s*\{/);
  assert.match(fixDrawing, /function drawFixCharts\(deps = fixDrawDependencies\(\)\)/);
  assert.match(fixDrawing, /function drawFixHeatmap\(canvas, results, fullT0, fullT1, deps = fixDrawDependencies\(\)\)/);
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
  assert.match(appEvents, /handleServiceConfigAction\(action, event, serviceConfigActionDependencies\(\)\)/);
  assert.match(appEvents, /bindTableInteractionEvents\(tableInteractionDependencies\(\)\);/);
  assert.match(appEvents, /bindSocketInteractionEvents\(socketInteractionDependencies\(\)\);/);
  assert.match(appEvents, /handleLayoutProfileAction\(action, event, layoutProfileActionDependencies\(\)\)/);
  assert.match(appEvents, /bindChartMinimapEvents\(deps\);/);
  assert.match(appEvents, /bindChartChromeEvents\(deps\);/);
  assert.match(appEvents, /bindChartSeriesEvents\(deps\);/);
});

test("large rendering and report actions stay behind small dependency factories", () => {
  assert.match(main, /const appRendering = createAppRendering\(appRenderingDependencies\);/);
  assert.match(main, /function appRenderingDependencies\(\)\s*\{/);
  assert.match(appRendering, /export function createAppRendering\(getDeps\)/);
  assert.match(appRendering, /function renderChartsPage\(\)/);
  assert.match(appRendering, /function renderSocketTable\(\)/);

  assert.match(main, /const reportActions = createReportActions\(reportActionDependencies\);/);
  assert.match(main, /function reportActionDependencies\(\)\s*\{/);
  assert.match(reportActions, /export function createReportActions\(getDeps\)/);
  assert.match(reportActions, /async function exportEvidencePack\(\)/);
  assert.match(reportActions, /function openIncidentReport\(\)/);
});

test("event dependency factory keeps render callback executable", () => {
  const appDeps = functionBlock("appEventDependencies");
  const chromeBinder = functionBlock("bindChartChromeEvents", appEvents);
  assert.match(appDeps, /\r?\n\s*render,\r?\n/);
  assert.doesNotMatch(appDeps, /render:\s*renderView\s*=\s*render/);
  assert.match(chromeBinder, /render:\s*renderView\s*=\s*render/);
  assert.match(chromeBinder, /renderView\(\);/);
});

test("chart event binders use injected root state and redraw callbacks", () => {
  assert.match(appEvents, /root\.querySelectorAll\("\[data-chart-zoom\]"\)\.forEach/);
  assert.match(appEvents, /applyZoom\(action, metric\);/);
  assert.match(appEvents, /drawBdp\(deps\);/);
  assert.match(appEvents, /drawJvm\(deps\);/);
  assert.match(appEvents, /drawFix\(deps\);/);
  assert.match(appEvents, /root\.querySelectorAll\("\[data-chart-series-toggle\]"\)\.forEach/);
  assert.match(appEvents, /root\.querySelectorAll\("\[data-jvm-series-key\]"\)\.forEach/);
  assert.match(appEvents, /redrawMetric\(metric, `series:\$\{key\}`, deps\)/);
});

test("JVM chart interactions use injected DOM root and redraw callback", () => {
  assert.match(advanced, /const \{ root = getDocument\(\), state: appState = state, drawJvmCharts: drawJvm = drawJvmCharts \} = deps;/);
  assert.match(advanced, /root\.querySelector\("\[data-jvm-chart='scatter'\]"\)/);
  assert.match(advanced, /root\.querySelector\("\[data-jvm-chart='recvq'\]"\)/);
  assert.match(advanced, /drawJvm\(deps\);/);
  assert.match(advanced, /const dom = root\.ownerDocument \|\| root;/);
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
