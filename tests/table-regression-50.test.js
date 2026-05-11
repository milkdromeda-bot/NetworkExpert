import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildVisibleColumnOrder,
  columnControlMatchesSearch,
  columnControlSearchText,
  defaultVisibleColumns,
  normalizeColumnSearchQuery,
  normalizeTableState,
  resetTableColumns,
  resetTableSort,
  setTableColumnVisibility,
  tableColumnControlModels,
  tableFilterCacheKey,
  tableSettingsMenuLayout,
  tableStateSnapshot,
  toggleTableColumnPin,
  toggleTableColumnVisibility
} from "../src/table-state.js";

const columns = [
  { key: "risk", label: "Risk" },
  { key: "state", label: "State" },
  { key: "family", label: "Proto" },
  { key: "application", label: "App" },
  { key: "recvQ", label: "Recv-Q" },
  { key: "sendQ", label: "Send-Q" },
  { key: "tx_bps", label: "TX bps", defaultVisible: false },
  { key: "rx_bps", label: "RX bps", defaultVisible: false },
  { key: "local", label: "Local" },
  { key: "peer", label: "Peer" },
  { key: "process", label: "Process" },
  { key: "rtt", label: "RTT" },
  { key: "skmem.r", label: "skmem.r" },
  { key: "delivery_rate", label: "Delivery rate", defaultVisible: false }
];

const defaults = {
  page: 1,
  pageSize: 20,
  sortKey: "risk",
  sortDir: "desc",
  pinned: ["risk", "state", "local"],
  visible: defaultVisibleColumns(columns),
  order: columns.map(col => col.key),
  filters: {
    text: "",
    risk: "all",
    state: "all",
    family: "all",
    minRecvQ: "",
    minSendQ: "",
    minRtt: "",
    srcIp: "",
    dstIp: "",
    srcPort: "",
    dstPort: "",
    process: "",
    onlyAnomalies: false
  }
};

const cases = [
  ["column search normalizes null to empty string", () => assert.equal(normalizeColumnSearchQuery(null), "")],
  ["column search trims lowercases and folds whitespace", () => assert.equal(normalizeColumnSearchQuery("  Recv   Q  "), "recv q")],
  ["column search text contains label and key", () => assert.equal(columnControlSearchText({ key: "recvQ", label: "Recv-Q" }), "recv-q recvq")],
  ["column search matches labels case-insensitively", () => assert.equal(columnControlMatchesSearch({ key: "state", label: "State" }, "STA"), true)],
  ["column search matches dotted keys", () => assert.equal(columnControlMatchesSearch({ key: "skmem.r", label: "skmem.r" }, "mem.r"), true)],
  ["column search matches underscored keys", () => assert.equal(columnControlMatchesSearch({ key: "delivery_rate", label: "Delivery rate" }, "delivery_"), true)],
  ["column search rejects unrelated text", () => assert.equal(columnControlMatchesSearch({ key: "risk", label: "Risk" }, "peer"), false)],
  ["column search accepts blank query", () => assert.equal(columnControlMatchesSearch({ key: "risk", label: "Risk" }, ""), true)],
  ["column search accepts whitespace-only query", () => assert.equal(columnControlMatchesSearch({ key: "risk", label: "Risk" }, "   "), true)],
  ["column search matches hyphenated labels", () => assert.equal(columnControlMatchesSearch({ key: "recvQ", label: "Recv-Q" }, "recv-q"), true)],

  ["filter cache key is stable across object insertion order", () => assert.equal(tableFilterCacheKey({ text: "ssh", risk: "high" }), tableFilterCacheKey({ risk: "high", text: "ssh" }))],
  ["filter cache key ignores unknown fields", () => assert.equal(tableFilterCacheKey({ text: "ssh", extra: "ignored" }), tableFilterCacheKey({ text: "ssh" }))],
  ["filter cache key changes when text changes", () => assert.notEqual(tableFilterCacheKey({ text: "ssh" }), tableFilterCacheKey({ text: "nginx" }))],
  ["filter cache key changes when risk changes", () => assert.notEqual(tableFilterCacheKey({ risk: "all" }), tableFilterCacheKey({ risk: "critical" }))],
  ["filter cache key changes when anomaly flag changes", () => assert.notEqual(tableFilterCacheKey({ onlyAnomalies: false }), tableFilterCacheKey({ onlyAnomalies: true }))],
  ["filter cache key treats null and empty text equally", () => assert.equal(tableFilterCacheKey({ text: null }), tableFilterCacheKey({ text: "" }))],
  ["filter cache key preserves zero numeric filters", () => assert.notEqual(tableFilterCacheKey({ minRtt: 0 }), tableFilterCacheKey({ minRtt: "" }))],
  ["filter cache key separates source and destination IP filters", () => assert.notEqual(tableFilterCacheKey({ srcIp: "10.0.0.1" }), tableFilterCacheKey({ dstIp: "10.0.0.1" }))],
  ["filter cache key separates source and destination port filters", () => assert.notEqual(tableFilterCacheKey({ srcPort: "443" }), tableFilterCacheKey({ dstPort: "443" }))],
  ["filter cache key changes when process filter changes", () => assert.notEqual(tableFilterCacheKey({ process: "nginx" }), tableFilterCacheKey({ process: "postgres" }))],

  ["table settings layout uses drawer on narrow screens", () => assert.equal(tableSettingsMenuLayout({ viewportWidth: 340, viewportHeight: 700 }).drawer, true)],
  ["table settings layout uses drawer on short screens", () => assert.equal(tableSettingsMenuLayout({ viewportWidth: 800, viewportHeight: 400 }).drawer, true)],
  ["table settings layout opens as floating menu on regular screens", () => assert.equal(tableSettingsMenuLayout({ viewportWidth: 800, viewportHeight: 700 }).drawer, false)],
  ["table settings layout fits height to viewport", () => assert.equal(tableSettingsMenuLayout({ viewportWidth: 800, viewportHeight: 500 }).height, 484)],
  ["table settings layout caps tall menus", () => assert.equal(tableSettingsMenuLayout({ viewportWidth: 1200, viewportHeight: 900 }).height, 620)],
  ["table settings layout caps floating menu width", () => assert.equal(tableSettingsMenuLayout({ viewportWidth: 1200, viewportHeight: 900 }).width, 320)],
  ["table settings layout clamps left edge", () => assert.equal(tableSettingsMenuLayout({ viewportWidth: 800, viewportHeight: 700, anchorRect: { right: 100, top: 20, bottom: 40 } }).left, 8)],
  ["table settings layout clamps right edge", () => assert.equal(tableSettingsMenuLayout({ viewportWidth: 420, viewportHeight: 700, anchorRect: { right: 1000, top: 20, bottom: 40 } }).left, 92)],
  ["table settings layout prefers opening below when possible", () => assert.equal(tableSettingsMenuLayout({ viewportWidth: 800, viewportHeight: 700, anchorRect: { right: 780, top: 20, bottom: 40 } }).top, 46)],
  ["table settings layout opens above when the lower space is insufficient", () => assert.equal(tableSettingsMenuLayout({ viewportWidth: 800, viewportHeight: 700, anchorRect: { right: 780, top: 660, bottom: 690 } }).top, 34)],

  ["visible column order puts pinned visible keys first", () => assert.deepEqual(buildVisibleColumnOrder({ ...defaults, pinned: ["local", "risk"] }, columns, defaults).slice(0, 2), ["risk", "local"])],
  ["visible column order skips hidden pinned keys", () => assert.deepEqual(buildVisibleColumnOrder({ ...defaults, visible: ["risk", "peer"], pinned: ["local", "risk"] }, columns, defaults), ["risk", "peer"])],
  ["visible column order repairs missing order keys", () => assert.equal(buildVisibleColumnOrder({ ...defaults, order: ["peer"] }, columns, defaults).includes("risk"), true)],
  ["visible column order removes duplicate order keys", () => assert.deepEqual(buildVisibleColumnOrder({ ...defaults, visible: ["risk", "state"], order: ["state", "state", "risk"] }, columns, defaults), ["state", "risk"])],
  ["normalization keeps at least one fallback column visible", () => assert.deepEqual(normalizeTableState({ ...defaults, visible: [] }, columns, defaults).visible, ["risk"])],
  ["default visible columns exclude opt-in metrics", () => assert.equal(defaultVisibleColumns(columns).includes("delivery_rate"), false)],
  ["hiding a column removes its pin", () => assert.deepEqual(setTableColumnVisibility({ ...defaults, visible: ["risk", "local"], pinned: ["risk", "local"] }, "local", false, columns, defaults).pinned, ["risk"])],
  ["showing a hidden column appends it only once", () => assert.deepEqual(setTableColumnVisibility({ ...defaults, visible: ["risk"] }, "peer", true, columns, defaults).visible, ["risk", "peer"])],
  ["pinning a hidden column is a no-op", () => assert.deepEqual(toggleTableColumnPin({ ...defaults, visible: ["risk"], pinned: ["risk"] }, "peer", columns, defaults).pinned, ["risk"])],
  ["reset columns restores default order", () => assert.deepEqual(resetTableColumns({ ...defaults, order: ["peer", "risk"], visible: ["peer"], pinned: ["peer"] }, columns, defaults).order, defaults.order)],

  ["normalization falls back to default sort key", () => assert.equal(normalizeTableState({ ...defaults, sortKey: "missing" }, columns, defaults).sortKey, "risk")],
  ["normalization falls back to default sort direction", () => assert.equal(normalizeTableState({ ...defaults, sortDir: "sideways" }, columns, defaults).sortDir, "desc")],
  ["normalization clamps page to one", () => assert.equal(normalizeTableState({ ...defaults, page: -5 }, columns, defaults).page, 1)],
  ["normalization keeps explicit page size", () => assert.equal(normalizeTableState({ ...defaults, pageSize: 50 }, columns, defaults).pageSize, 50)],
  ["normalization merges default filters", () => assert.equal(normalizeTableState({ filters: { text: "ssh" } }, columns, defaults).filters.risk, "all")],
  ["table state snapshot excludes volatile filters", () => assert.equal(Object.hasOwn(tableStateSnapshot({ ...defaults, filters: { text: "ssh" } }), "filters"), false)],
  ["column controls expose search text", () => assert.equal(tableColumnControlModels(defaults, columns, defaults).find(item => item.key === "recvQ").searchText, "recv-q recvq")],
  ["column controls expose checked visibility state", () => assert.equal(tableColumnControlModels({ ...defaults, visible: ["risk"] }, columns, defaults).find(item => item.key === "peer").visible, false)],
  ["reset sort resets page to one", () => assert.equal(resetTableSort({ ...defaults, page: 4, sortKey: "peer", sortDir: "asc" }, columns, defaults).page, 1)],
  ["toggling visibility twice restores the original visible set", () => assert.deepEqual(toggleTableColumnVisibility(toggleTableColumnVisibility({ ...defaults, visible: ["risk", "peer"] }, "peer", columns, defaults), "peer", columns, defaults).visible, ["risk", "peer"])]
];

assert.equal(cases.length, 50);

for (const [name, run] of cases) {
  test(`table regression: ${name}`, run);
}
