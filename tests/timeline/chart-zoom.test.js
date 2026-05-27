import test from "node:test";
import assert from "node:assert/strict";
import { applyChartZoomOperation, clampZoomRange, nextZoomRange, zoomForMetric, zoomRangeFromDragSelection } from "../../src/charts/chart-zoom.js";

const actions = ["zoomIn", "zoomOut", "panLeft", "panRight", "resetZoom"];
const seeds = Array.from({ length: 40 }, (_, index) => {
  const start = (index % 20) / 25;
  const width = 0.04 + ((index * 7) % 18) / 25;
  return clampZoomRange(start, start + width);
});

test("chart zoom actions keep ranges bounded across generated cases", async t => {
  let cases = 0;
  for (const seed of seeds) {
    for (const action of actions) {
      cases += 1;
      await t.test(`case ${cases}: ${action} from ${seed.start.toFixed(3)}-${seed.end.toFixed(3)}`, () => {
        const next = nextZoomRange(seed, action);
        assert.ok(next.start >= 0);
        assert.ok(next.end <= 1);
        assert.ok(next.end - next.start >= 0.02);
      });
    }
  }
  assert.equal(cases, 200);
});

test("metric zoom actions are isolated from other metrics", async t => {
  const metrics = Array.from({ length: 50 }, (_, index) => `metric-${index}`);
  for (const metric of metrics) {
    await t.test(`isolates ${metric}`, () => {
      const before = { other: { start: 0.1, end: 0.9 } };
      const result = applyChartZoomOperation({
        action: "zoomIn",
        metric,
        sharedZoom: { start: 0, end: 1 },
        chartZoomByMetric: before
      });
      assert.notEqual(result.chartZoomByMetric[metric], undefined);
      assert.deepEqual(result.chartZoomByMetric.other, before.other);
      assert.deepEqual(result.sharedZoom, { start: 0, end: 1 });
      assert.equal(result.activeChartMetric, metric);
    });
  }
});

test("shared zoom actions do not create metric-specific zoom state", async t => {
  for (const action of actions) {
    await t.test(`shared ${action}`, () => {
      const chartZoomByMetric = { rtt: { start: 0.2, end: 0.4 } };
      const result = applyChartZoomOperation({
        action,
        metric: null,
        sharedZoom: { start: 0, end: 1 },
        chartZoomByMetric
      });
      assert.equal(result.chartZoomByMetric, chartZoomByMetric);
      assert.ok(result.sharedZoom.start >= 0);
      assert.ok(result.sharedZoom.end <= 1);
    });
  }
});

test("metric zoom falls back to shared zoom until customized", () => {
  assert.deepEqual(
    zoomForMetric({}, { start: 0.25, end: 0.75 }, "rx_bps"),
    { start: 0.25, end: 0.75 }
  );
  assert.deepEqual(
    zoomForMetric({ rx_bps: { start: 0.4, end: 0.6 } }, { start: 0.25, end: 0.75 }, "rx_bps"),
    { start: 0.4, end: 0.6 }
  );
});
test("drag selection computes a nested metric-local zoom range", () => {
  const next = zoomRangeFromDragSelection({ start: 0.2, end: 0.8 }, 0.25, 0.75);
  assert.ok(Math.abs(next.start - 0.35) < 1e-12);
  assert.ok(Math.abs(next.end - 0.65) < 1e-12);
});

test("drag selection is direction independent and bounded", () => {
  const next = zoomRangeFromDragSelection({ start: 0.1, end: 0.3 }, 0.9, 0.1);
  assert.ok(next.start >= 0);
  assert.ok(next.end <= 1);
  assert.ok(next.end > next.start);
  assert.deepEqual(next, zoomRangeFromDragSelection({ start: 0.1, end: 0.3 }, 0.1, 0.9));
});
