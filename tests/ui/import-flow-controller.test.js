import assert from "node:assert/strict";
import { test } from "node:test";

import { createImportFlowController } from "../../src/rendering/controllers/import-flow-controller.js";

test("import flow remembers normalized pre-import filters with de-dupe and cap", () => {
  let saved = null;
  const state = {
    filterHistory: Array.from({ length: 45 }, (_, index) => ({
      enabled: true,
      protocol: "tcp",
      state: "ESTAB",
      srcIp: `10.0.0.${index}`,
      dstIp: "",
      anyPort: "",
      srcPort: "",
      dstPort: "",
      at: index
    }))
  };
  const controller = createImportFlowController(() => ({
    hasPreImportFilterValue: () => true,
    normalizePreImportFilters: filters => ({ ...filters, protocol: "tcp", srcIp: "10.0.0.1" }),
    saveFilterHistory: value => { saved = value; },
    state
  }));

  controller.rememberFilterHistory({
    enabled: true,
    protocol: "",
    state: "ESTAB",
    srcIp: "10.0.0.1",
    dstIp: "",
    anyPort: "",
    srcPort: "",
    dstPort: ""
  });

  assert.equal(state.filterHistory.length, 40);
  assert.equal(state.filterHistory[0].protocol, "tcp");
  assert.equal(state.filterHistory.filter(item => item.srcIp === "10.0.0.1").length, 1);
  assert.equal(saved, state.filterHistory);
});

test("import flow ignores empty or disabled filters", () => {
  let saved = false;
  const state = { filterHistory: [] };
  const controller = createImportFlowController(() => ({
    hasPreImportFilterValue: () => false,
    normalizePreImportFilters: filters => filters,
    saveFilterHistory: () => { saved = true; },
    state
  }));

  controller.rememberFilterHistory({ enabled: true });
  controller.rememberFilterHistory({ enabled: false });

  assert.deepEqual(state.filterHistory, []);
  assert.equal(saved, false);
});
