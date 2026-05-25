import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const main = readFileSync(new URL("../../src/main.js", import.meta.url), "utf8");

function functionBlock(name) {
  const start = main.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  let depth = 0;
  let started = false;
  for (let index = start; index < main.length; index += 1) {
    const char = main[index];
    if (char === "{") {
      depth += 1;
      started = true;
    } else if (char === "}") {
      depth -= 1;
      if (started && depth === 0) return main.slice(start, index + 1);
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
  assert.match(main, /function jvmDrawDependencies\(\)\s*\{/);
  assert.match(main, /function drawJvmCharts\(deps = jvmDrawDependencies\(\)\)/);
  assert.match(main, /function drawJvmTimelineChartInteractive\(svg, results, history, deps = jvmDrawDependencies\(\)\)/);
  assert.match(main, /function drawJvmScatterChartInteractive\(svg, results, deps = jvmDrawDependencies\(\)\)/);
  assert.match(main, /function attachJvmTimelineInteractions\(svg, results, history[\s\S]*deps = jvmDrawDependencies\(\)\)/);
  assert.match(main, /function attachJvmScatterInteractions\(svg, points[\s\S]*deps = jvmDrawDependencies\(\)\)/);
});

test("FIX chart draw functions accept injectable runtime dependencies", () => {
  assert.match(main, /function fixDrawDependencies\(\)\s*\{/);
  assert.match(main, /function drawFixCharts\(deps = fixDrawDependencies\(\)\)/);
  assert.match(main, /function drawFixHeatmap\(canvas, results, fullT0, fullT1, deps = fixDrawDependencies\(\)\)/);
  assert.match(main, /function drawFixTimelineChart\(svg, results, history, gcPauses = null, gcWindowMs = 200, deps = fixDrawDependencies\(\)\)/);
  assert.match(main, /function drawFixScatterChart\(svg, results, deps = fixDrawDependencies\(\)\)/);
  assert.match(main, /function drawFixVmstatChart\(svg, vmsamples, fixResults, cpuCores = 0, deps = fixDrawDependencies\(\)\)/);
  assert.match(main, /function drawFixNstatChart\(svg, nsamples, fixResults, deps = fixDrawDependencies\(\)\)/);
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
  assert.match(main, /function bindEvents\(deps = appEventDependencies\(\)\)/);
  assert.match(main, /function bindChartMinimapEvents\(deps = appEventDependencies\(\)\)/);
  assert.match(main, /function bindChartChromeEvents\(deps = appEventDependencies\(\)\)/);
  assert.match(main, /function bindChartSeriesEvents\(deps = appEventDependencies\(\)\)/);
  assert.match(main, /bindChartMinimapEvents\(deps\);/);
  assert.match(main, /bindChartChromeEvents\(deps\);/);
  assert.match(main, /bindChartSeriesEvents\(deps\);/);
});

test("event dependency factory keeps render callback executable", () => {
  const appDeps = functionBlock("appEventDependencies");
  const chromeBinder = functionBlock("bindChartChromeEvents");
  assert.match(appDeps, /\n\s*render,\n/);
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
  assert.match(main, /const \{ root = document, state: appState = state, drawJvmCharts: drawJvm = drawJvmCharts \} = deps;/);
  assert.match(main, /root\.querySelector\("\[data-jvm-chart='scatter'\]"\)/);
  assert.match(main, /root\.querySelector\("\[data-jvm-chart='recvq'\]"\)/);
  assert.match(main, /drawJvm\(deps\);/);
  assert.match(main, /const dom = root\.ownerDocument \|\| root;/);
});

test("FIX chart draw orchestration uses injected root and chart callbacks", () => {
  assert.match(main, /const \{[\s\S]*root = document,[\s\S]*drawFixTimelineChart: drawTimeline = drawFixTimelineChart[\s\S]*drawFixHeatmap: drawHeatmap = drawFixHeatmap[\s\S]*\} = deps;/);
  assert.match(main, /root\.querySelector\("\[data-fix-chart='timeline'\]"\)/);
  assert.match(main, /root\.querySelector\("\[data-fix-chart='scatter'\]"\)/);
  assert.match(main, /root\.querySelector\("\[data-fix-chart='vmstat'\]"\)/);
  assert.match(main, /root\.querySelector\("\[data-fix-chart='nstat'\]"\)/);
  assert.match(main, /root\.querySelectorAll\("\[data-fix-heatmap\]"\)/);
  assert.match(main, /drawHeatmap\(c, results, tMin, tMax, deps\)/);
});
