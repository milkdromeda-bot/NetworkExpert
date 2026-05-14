import assert from "node:assert/strict";
import { test } from "node:test";

import {
  normalizeTableState,
  resetTableColumns,
  resetTableSort,
  setTableColumnVisibility,
  tableStateSnapshot,
  tableColumnControlModels,
  toggleTableColumnPin,
  toggleTableColumnVisibility
} from "../../src/table-state.js";

const columns = [
  { key: "risk", label: "Risk" },
  { key: "state", label: "State" },
  { key: "local", label: "Local" },
  { key: "peer", label: "Peer" },
  { key: "rtt", label: "RTT", defaultVisible: false }
];

const defaults = {
  page: 1,
  pageSize: 20,
  sortKey: "risk",
  sortDir: "desc",
  pinned: ["risk", "state", "local"],
  visible: ["risk", "state", "local", "peer"],
  order: columns.map(col => col.key),
  filters: { text: "", risk: "all" }
};

test("normalizeTableState repairs stale saved keys while preserving filters", () => {
  const table = normalizeTableState({
    page: 3,
    pageSize: 50,
    sortKey: "missing",
    sortDir: "sideways",
    visible: ["peer", "missing"],
    pinned: ["peer", "missing", "rtt"],
    order: ["peer", "missing"],
    filters: { text: "nginx" }
  }, columns, defaults);

  assert.equal(table.page, 3);
  assert.equal(table.pageSize, 50);
  assert.equal(table.sortKey, "risk");
  assert.equal(table.sortDir, "desc");
  assert.deepEqual(table.visible, ["peer"]);
  assert.deepEqual(table.pinned, ["peer"]);
  assert.deepEqual(table.order, ["peer", "risk", "state", "local", "rtt"]);
  assert.deepEqual(table.filters, { text: "nginx", risk: "all" });
});

test("toggleTableColumnVisibility hides a column and unpins it", () => {
  const table = toggleTableColumnVisibility({
    ...defaults,
    visible: ["risk", "state", "local"],
    pinned: ["risk", "local"]
  }, "local", columns, defaults);

  assert.deepEqual(table.visible, ["risk", "state"]);
  assert.deepEqual(table.pinned, ["risk"]);
  assert.equal(table.page, 1);
});

test("toggleTableColumnVisibility shows a hidden column once", () => {
  const table = toggleTableColumnVisibility({
    ...defaults,
    visible: ["risk", "state"],
    pinned: ["risk"]
  }, "rtt", columns, defaults);

  assert.deepEqual(table.visible, ["risk", "state", "rtt"]);
  assert.deepEqual(toggleTableColumnVisibility(table, "unknown", columns, defaults), table);
});

test("setTableColumnVisibility keeps one fallback column visible", () => {
  const table = setTableColumnVisibility({
    ...defaults,
    visible: ["risk"],
    pinned: ["risk"]
  }, "risk", false, columns, defaults);

  assert.deepEqual(table.visible, ["risk"]);
  assert.deepEqual(table.pinned, []);
});

test("toggleTableColumnPin only changes visible columns", () => {
  const table = toggleTableColumnPin({
    ...defaults,
    visible: ["risk", "state"],
    pinned: ["risk"]
  }, "state", columns, defaults);

  assert.deepEqual(table.pinned, ["risk", "state"]);
  assert.deepEqual(toggleTableColumnPin(table, "rtt", columns, defaults).pinned, ["risk", "state"]);
  assert.deepEqual(toggleTableColumnPin(table, "state", columns, defaults).pinned, ["risk"]);
});

test("resetTableColumns restores default visibility order and pins", () => {
  const table = resetTableColumns({
    ...defaults,
    page: 4,
    visible: ["rtt"],
    pinned: ["rtt"],
    order: ["rtt", "peer"],
    sortKey: "peer",
    sortDir: "asc"
  }, columns, defaults);

  assert.equal(table.page, 1);
  assert.equal(table.sortKey, "peer");
  assert.equal(table.sortDir, "asc");
  assert.deepEqual(table.visible, defaults.visible);
  assert.deepEqual(table.order, defaults.order);
  assert.deepEqual(table.pinned, defaults.pinned);
});

test("resetTableSort restores default sort without changing columns", () => {
  const table = resetTableSort({
    ...defaults,
    page: 4,
    sortKey: "peer",
    sortDir: "asc",
    visible: ["risk", "peer"],
    pinned: ["risk"]
  }, columns, defaults);

  assert.equal(table.page, 1);
  assert.equal(table.sortKey, "risk");
  assert.equal(table.sortDir, "desc");
  assert.deepEqual(table.visible, ["risk", "peer"]);
  assert.deepEqual(table.pinned, ["risk"]);
});

test("tableStateSnapshot stores layout preferences without volatile filters", () => {
  const snapshot = tableStateSnapshot({
    ...defaults,
    page: 7,
    filters: { text: "temporary" }
  });

  assert.deepEqual(Object.keys(snapshot).sort(), ["order", "pageSize", "pinned", "sortDir", "sortKey", "visible"]);
  assert.equal(snapshot.pageSize, 20);
});

test("tableColumnControlModels exposes checked renderer state for visible columns", () => {
  const controls = tableColumnControlModels({
    ...defaults,
    visible: ["risk", "peer"],
    pinned: ["risk"]
  }, columns, defaults);

  assert.deepEqual(
    controls.map(item => [item.key, item.visible, item.pinned]),
    [
      ["risk", true, true],
      ["state", false, false],
      ["local", false, false],
      ["peer", true, false],
      ["rtt", false, false]
    ]
  );
});
