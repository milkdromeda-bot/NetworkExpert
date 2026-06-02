import assert from "node:assert/strict";
import { test } from "node:test";

import { createChartOverlayRenderer } from "../../src/rendering/chart-overlays.js";

function createRenderer(overrides = {}) {
  const context = {
    annotationDefaultLabel: kind => `Default ${kind}`,
    annotationSocketId: () => "socket-1",
    chartBgColor: () => "#081019",
    currentSourceAnnotations: () => [],
    escapeHtml: value => String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    ...overrides
  };
  return createChartOverlayRenderer(() => context);
}

test("chart overlays render bounded microburst bands", () => {
  const overlays = createRenderer();
  const svg = overlays.chartMicroburstBand(
    { endEpochMs: 3000, startEpochMs: 2000 },
    [{ epochMs: 1000 }, { epochMs: 4000 }],
    { b: 20, l: 10, r: 10, t: 5 },
    210,
    120,
    1000,
    4000
  );

  assert.match(svg, /MICROBURST/);
  assert.match(svg, /x="73\.33333333333333"/);
  assert.equal(overlays.chartMicroburstBand(null, [{ epochMs: 1 }], { b: 0, l: 0, r: 0, t: 0 }, 10, 10, 0, 1), "");
});

test("chart overlays render visible and escaped annotations", () => {
  const overlays = createRenderer({
    chartBgColor: () => "#f0f3f7",
    currentSourceAnnotations: (metric, socketId, data) => {
      assert.equal(metric, "rtt");
      assert.equal(socketId, "socket-1");
      assert.equal(data.length, 2);
      return [
        { kind: "rtt-peak", label: "<peak>", resolvedEpochMs: 1500 },
        { kind: "custom", resolvedEpochMs: 5000 }
      ];
    }
  });

  const svg = overlays.chartAnnotationOverlay("rtt", [{}, {}], { b: 8, l: 10, r: 10, t: 6 }, 200, 100, 1000, 2000);

  assert.equal(overlays.annotationColor("failover"), "#ff9f43");
  assert.equal(overlays.annotationColor("unknown"), "#7bdff6");
  assert.match(svg, /annotation-overlay-item/);
  assert.match(svg, /stroke="#1a5fb4"/);
  assert.match(svg, /&lt;peak&gt;/);
  assert.doesNotMatch(svg, /Default custom/);
});
