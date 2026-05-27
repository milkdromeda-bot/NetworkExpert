import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const main = readFileSync(new URL("../../src/main.js", import.meta.url), "utf8");
const advanced = readFileSync(new URL("../../src/advanced-correlation-panels.js", import.meta.url), "utf8");

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
  assert.match(main, /function drawJvmCharts\(deps\) \{ return advancedCorrelationPanels\.drawJvmCharts\(deps\); \}/);
  assert.match(advanced, /function jvmDrawDependencies\(\)\s*\{/);
  assert.match(advanced, /function drawJvmCharts\(deps = jvmDrawDependencies\(\)\)/);
  assert.match(advanced, /function drawJvmTimelineChartInteractive\(svg, results, history, deps = jvmDrawDependencies\(\)\)/);
  assert.match(advanced, /function drawJvmScatterChartInteractive\(svg, results, deps = jvmDrawDependencies\(\)\)/);
  assert.match(advanced, /function attachJvmTimelineInteractions\(svg, results, history[\s\S]*deps = jvmDrawDependencies\(\)\)/);
  assert.match(advanced, /function attachJvmScatterInteractions\(svg, points[\s\S]*deps = jvmDrawDependencies\(\)\)/);
});

test("FIX chart draw functions accept injectable runtime dependencies", () => {
  assert.match(main, /function drawFixCharts\(deps\) \{ return advancedCorrelationPanels\.drawFixCharts\(deps\); \}/);
  assert.match(advanced, /function fixDrawDependencies\(\)\s*\{/);
  assert.match(advanced, /function drawFixCharts\(deps = fixDrawDependencies\(\)\)/);
  assert.match(advanced, /function drawFixHeatmap\(canvas, results, fullT0, fullT1, deps = fixDrawDependencies\(\)\)/);
  assert.match(advanced, /function drawFixTimelineChart\(svg, results, history, gcPauses = null, gcWindowMs = 200, deps = fixDrawDependencies\(\)\)/);
  assert.match(advanced, /function drawFixScatterChart\(svg, results, deps = fixDrawDependencies\(\)\)/);
  assert.match(advanced, /function drawFixVmstatChart\(svg, vmsamples, fixResults, cpuCores = 0, deps = fixDrawDependencies\(\)\)/);
  assert.match(advanced, /function drawFixNstatChart\(svg, nsamples, fixResults, deps = fixDrawDependencies\(\)\)/);
});

test("chart draw dependencies isolate DOM and mutable app state", () => {
  assert.match(main, /const \{ root = document, state: appState = state, drawChartInto: drawInto = drawChartInto \} = deps;/);
  assert.match(main, /const \{ state: appState = state, attachChartInteractions: attachInteractions = attachChartInteractions \} = deps;/);
  assert.match(main, /root\.querySelectorAll\("\[data-mini-chart\]"\)/);
  assert.match(main, /root\.querySelectorAll\("\[data-minimap\]"\)/);
  assert.match(main, /appState\.prefs\.chartLayout\.showThresholds/);
  assert.match(main, /attachInteractions\(svg, deps\)/);
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
  assert.match(main, /bindSourceFileEvents\(sourceFileEventDependencies\(\)\);/);
  assert.match(main, /handleServiceConfigAction\(action, event, serviceConfigActionDependencies\(\)\)/);
  assert.match(main, /bindTableInteractionEvents\(tableInteractionDependencies\(\)\);/);
  assert.match(main, /bindSocketInteractionEvents\(socketInteractionDependencies\(\)\);/);
  assert.match(main, /handleLayoutProfileAction\(action, event, layoutProfileActionDependencies\(\)\)/);
  assert.match(main, /bindChartMinimapEvents\(deps\);/);
  assert.match(main, /bindChartChromeEvents\(deps\);/);
  assert.match(main, /bindChartSeriesEvents\(deps\);/);
});

test("event dependency factory keeps render callback executable", () => {
  const appDeps = functionBlock("appEventDependencies");
  const chromeBinder = functionBlock("bindChartChromeEvents");
  assert.match(appDeps, /\r?\n\s*render,\r?\n/);
  assert.doesNotMatch(appDeps, /render:\s*renderView\s*=\s*render/);
  assert.match(chromeBinder, /render:\s*renderView\s*=\s*render/);
  assert.match(chromeBinder, /renderView\(\);/);
});

test("chart event binders use injected root state and redraw callbacks", () => {
  assert.match(main, /root\.querySelectorAll\("\[data-chart-zoom\]"\)\.forEach/);
  assert.match(main, /applyZoom\(action, metric\);/);
  assert.match(main, /drawBdp\(deps\);/);
  assert.match(main, /drawJvm\(deps\);/);
  assert.match(main, /drawFix\(deps\);/);
  assert.match(main, /root\.querySelectorAll\("\[data-chart-series-toggle\]"\)\.forEach/);
  assert.match(main, /root\.querySelectorAll\("\[data-jvm-series-key\]"\)\.forEach/);
  assert.match(main, /redrawMetric\(metric, `series:\$\{key\}`, deps\)/);
});

test("JVM chart interactions use injected DOM root and redraw callback", () => {
  assert.match(advanced, /const \{ root = getDocument\(\), state: appState = state, drawJvmCharts: drawJvm = drawJvmCharts \} = deps;/);
  assert.match(advanced, /root\.querySelector\("\[data-jvm-chart='scatter'\]"\)/);
  assert.match(advanced, /root\.querySelector\("\[data-jvm-chart='recvq'\]"\)/);
  assert.match(advanced, /drawJvm\(deps\);/);
  assert.match(advanced, /const dom = root\.ownerDocument \|\| root;/);
});

test("FIX chart draw orchestration uses injected root and chart callbacks", () => {
  assert.match(advanced, /const \{[\s\S]*root = getDocument\(\),[\s\S]*drawFixTimelineChart: drawTimeline = drawFixTimelineChart[\s\S]*drawFixHeatmap: drawHeatmap = drawFixHeatmap[\s\S]*\} = deps;/);
  assert.match(advanced, /root\.querySelector\("\[data-fix-chart='timeline'\]"\)/);
  assert.match(advanced, /root\.querySelector\("\[data-fix-chart='scatter'\]"\)/);
  assert.match(advanced, /root\.querySelector\("\[data-fix-chart='vmstat'\]"\)/);
  assert.match(advanced, /root\.querySelector\("\[data-fix-chart='nstat'\]"\)/);
  assert.match(advanced, /root\.querySelectorAll\("\[data-fix-heatmap\]"\)/);
  assert.match(advanced, /drawHeatmap\(c, results, tMin, tMax, deps\)/);
});
