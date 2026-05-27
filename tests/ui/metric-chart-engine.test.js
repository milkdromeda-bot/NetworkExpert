import assert from "node:assert/strict";
import { test } from "node:test";
import { createMetricChartEngine } from "../../src/metric-chart-engine.js";

function engine(overrides = {}) {
  const state = {
    prefs: { tableUnits: true, graphMetric: "rtt", graphStyle: "line", chartLayout: { showLegend: true, showThresholds: true } },
    thresholds: { rtt: { comfort: 5, warn: 10, danger: 50, unit: "ms" } },
    hiddenChartSeries: new Set(),
    chartZoom: { start: 0, end: 1 },
    chartZoomByMetric: {},
    cache: {},
    history: []
  };
  const deps = {
    state,
    document: { documentElement: { getAttribute: () => "dark" } },
    window: { innerWidth: 1200, innerHeight: 800 },
    metricLabel: metric => ({ rtt: "RTT" }[metric] || metric),
    escapeHtml: value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char])),
    numberFormatter: digits => new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }),
    numberFormatterWith: (min, max) => new Intl.NumberFormat("en-US", { minimumFractionDigits: min, maximumFractionDigits: max }),
    numberSeparators: () => ({ group: ",", decimal: "." }),
    lazySparklineIndex: () => new Map(),
    renderSparkline: () => "<svg></svg>",
    clearVisibleHistoryCache: () => { deps.cacheCleared = true; },
    applyChartZoomOperation: ({ action, metric }) => ({
      sharedZoom: { start: 0.25, end: 0.75 },
      chartZoomByMetric: metric ? { [metric]: { start: 0.25, end: 0.75 } } : {},
      activeChartMetric: metric,
      activeChartAction: action
    }),
    clampZoomRange: value => value,
    zoomForMetric: (byMetric, shared, metric) => byMetric?.[metric] || shared,
    ...overrides
  };
  return { api: createMetricChartEngine(() => deps), deps, state };
}

test("metric chart engine formats values and threshold legend without main.js", () => {
  const { api } = engine();
  assert.equal(api.formatBitsPerSecond(12_500_000), "12.5 Mbps");
  assert.match(api.renderMetricChartLegend("rtt"), /data-chart-series-toggle="rtt"/);
  assert.match(api.renderMetricChartLegend("rtt"), /Warning/);
  assert.equal(api.thresholdSeverity("rtt", 51), "danger");
});

test("metric chart engine applies zoom through injected operation", () => {
  const { api, deps, state } = engine();
  api.applyChartZoomAction("zoomIn", "rtt");
  assert.deepEqual(state.chartZoomByMetric.rtt, { start: 0.25, end: 0.75 });
  assert.equal(state.activeChartMetric, "rtt");
  assert.equal(state.activeChartAction, "zoomIn");
  assert.equal(deps.cacheCleared, true);
});

test("metric chart engine renders table metric cells from injected helpers", () => {
  const { api } = engine();
  const html = api.renderTableMetricCell("rtt", 12.345, "socket-1");
  assert.match(html, /table-metric warn/);
  assert.match(html, /RTT: 12\.345 ms/);
});
