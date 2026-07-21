import assert from "node:assert/strict";
import { test } from "node:test";

import { createFocusViewController } from "../../src/rendering/controllers/focus-view-controller.js";

const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

test("focus view renders only metrics with non-zero history", () => {
  const state = { selectedId: "s1" };
  const sockets = new Map([["s1", { id: "s1", local: "10.0.0.1:5000", peer: "10.0.0.2:443" }]]);
  const controller = createFocusViewController(() => ({
    chartMetricList: () => ["rtt", "sendQ"],
    currentAliasForEndpoint: () => null,
    escapeHtml,
    formatMetricValue: (metric, value) => String(value),
    icons: { arrowLeft: "left", arrowRight: "right", reset: "reset", zoomIn: "in", zoomOut: "out" },
    metricLabel: metric => metric.toUpperCase(),
    percentile: (sorted, p) => sorted[Math.floor(p * (sorted.length - 1))],
    socketsById: () => sockets,
    state,
    visibleHistory: () => [{ rtt: 12, sendQ: 0 }, { rtt: 15, sendQ: 0 }]
  }));

  const html = controller.renderFocusView();

  assert.match(html, /focus-panel/);
  assert.match(html, /data-mini-chart="rtt"/);
  assert.doesNotMatch(html, /data-mini-chart="sendQ"/);
  assert.match(html, /focus-metric-key/);
  assert.match(html, /focus-quartile-table/);
});

test("focus view handles missing socket and empty history", () => {
  const state = { selectedId: "missing" };
  const base = {
    chartMetricList: () => ["rtt"],
    currentAliasForEndpoint: () => null,
    escapeHtml,
    formatMetricValue: (metric, value) => String(value),
    icons: {},
    metricLabel: metric => metric,
    percentile: (sorted, p) => sorted[Math.floor(p * (sorted.length - 1))],
    socketsById: () => new Map(),
    state,
    visibleHistory: () => []
  };
  let controller = createFocusViewController(() => base);
  assert.match(controller.renderFocusView(), /Select a socket/);

  controller = createFocusViewController(() => ({
    ...base,
    socketsById: () => new Map([["missing", { id: "missing", local: "a", peer: "b" }]])
  }));
  assert.match(controller.renderFocusView(), /No metric data/);
});
