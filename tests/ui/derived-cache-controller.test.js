import assert from "node:assert/strict";
import { test } from "node:test";

import { createDerivedCacheController } from "../../src/rendering/derived-cache-controller.js";

function stateFixture() {
  return {
    analysisDirty: false,
    dataVersion: 1,
    rawVersion: 2,
    cache: {
      filteredKey: "x",
      filteredRows: [1],
      optionKey: "x",
      optionSets: {},
      anomalyMapKey: "x",
      anomaliesBySocketId: new Map(),
      socketMapKey: "x",
      socketsById: new Map(),
      microburstKey: "x",
      microburstSummary: {},
      tailLatencyKey: "x",
      tailLatencySummary: {},
      timestampRawVersion: 3,
      timestampBlocks: [1],
      snapshotRawVersion: 4,
      timestampSnapshots: [1]
    }
  };
}

test("derived cache controller resets cached rows and raw snapshots", () => {
  let cleared = false;
  const state = stateFixture();
  const controller = createDerivedCacheController(() => ({
    state,
    clearVisibleHistoryCache: () => { cleared = true; },
    setTimeoutRef: fn => fn(),
    clearTimeoutRef: () => {},
    renderBdpWindowPanel: () => {}
  }));

  controller.resetDerivedCaches({ raw: true });

  assert.equal(state.dataVersion, 2);
  assert.equal(state.rawVersion, 3);
  assert.equal(state.cache.filteredKey, "");
  assert.equal(state.cache.filteredRows, null);
  assert.equal(state.cache.timestampRawVersion, -1);
  assert.deepEqual(state.cache.timestampBlocks, []);
  assert.equal(cleared, true);
});

test("derived cache controller marks dirty and schedules BDP precompute", () => {
  let rendered = 0;
  const state = stateFixture();
  const controller = createDerivedCacheController(() => ({
    state,
    clearVisibleHistoryCache: () => {},
    setTimeoutRef: fn => { fn(); return 42; },
    clearTimeoutRef: () => {},
    renderBdpWindowPanel: () => { rendered += 1; }
  }));

  controller.markAnalysisDirty();

  assert.equal(state.analysisDirty, true);
  assert.equal(state.dataVersion, 2);
  assert.equal(rendered, 1);
});
