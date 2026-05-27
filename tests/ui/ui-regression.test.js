import assert from "node:assert/strict";
import { test } from "node:test";
import { applyContextAction, clearConversationScopeFilters, setActiveInvestigation } from "../../src/core/navigation.js";
import { defaultVisibleColumns, normalizeTableState, tableColumnKeys, tableColumnMetadata } from "../../src/views/table-state.js";

const columns = [
  { key: "risk", label: "Risk" },
  { key: "state", label: "State" },
  { key: "family", label: "Proto" },
  { key: "local", label: "Local" },
  { key: "peer", label: "Peer" },
  { key: "rtt", label: "RTT", defaultVisible: false },
  { key: "rto", label: "RTO", defaultVisible: false },
  { key: "cwnd", label: "cwnd", defaultVisible: false },
  { key: "sendQ", label: "Send-Q" },
  { key: "recvQ", label: "Recv-Q" }
];

function baseState() {
  return {
    selectedId: null,
    activeContextId: null,
    activeContextReason: "",
    drawer: null,
    openConversationInsightKey: null,
    openConversationInsightPos: null,
    view: "analysis",
    activeTab: "sockets",
    prefs: { graphMetric: "rtt" },
    chartMetrics: ["rtt"],
    anomalyFilters: { severity: "all", metric: "all", text: "", sort: "priority" },
    table: { page: 1, filters: { text: "", process: "", srcIp: "", dstIp: "", srcPort: "", dstPort: "", onlyAnomalies: false } }
  };
}

// clearConversationScopeFilters
test("clearConversationScopeFilters resets text", () => {
  const f = { text: "hello", process: "nginx", srcIp: "10.0.0.1", dstIp: "10.0.0.2", srcPort: "80", dstPort: "443", onlyAnomalies: true };
  clearConversationScopeFilters(f);
  assert.equal(f.text, "");
  assert.equal(f.process, "");
  assert.equal(f.srcIp, "");
  assert.equal(f.dstIp, "");
  assert.equal(f.srcPort, "");
  assert.equal(f.dstPort, "");
  assert.equal(f.onlyAnomalies, false);
});
test("clearConversationScopeFilters is idempotent", () => {
  const f = { text: "", process: "", srcIp: "", dstIp: "", srcPort: "", dstPort: "", onlyAnomalies: false };
  clearConversationScopeFilters(f);
  assert.equal(f.text, "");
});

// setActiveInvestigation
test("setActiveInvestigation sets id and reason", () => {
  const state = baseState();
  setActiveInvestigation(state, "socket-abc", "User clicked");
  assert.equal(state.activeContextId, "socket-abc");
  assert.equal(state.activeContextReason, "User clicked");
});
test("setActiveInvestigation clears when null", () => {
  const state = baseState();
  state.activeContextId = "socket-abc";
  setActiveInvestigation(state, null);
  assert.equal(state.activeContextId, null);
  assert.equal(state.activeContextReason, "");
});
test("setActiveInvestigation uses default reason", () => {
  const state = baseState();
  setActiveInvestigation(state, "socket-abc");
  assert.equal(state.activeContextReason, "Selected by user");
});

// applyContextAction - clear
test("applyContextAction clear resets investigation", () => {
  const state = baseState();
  state.activeContextId = "socket-abc";
  state.drawer = "details";
  applyContextAction(state, "clear", null);
  assert.equal(state.activeContextId, null);
  assert.equal(state.drawer, null);
});
test("applyContextAction clear resets insight key", () => {
  const state = baseState();
  state.openConversationInsightKey = "flow-1";
  applyContextAction(state, "clear", null);
  assert.equal(state.openConversationInsightKey, null);
});

// applyContextAction - details
test("applyContextAction details opens drawer", () => {
  const state = baseState();
  const socket = { id: "socket-abc" };
  applyContextAction(state, "details", socket);
  assert.equal(state.drawer, "details");
  assert.equal(state.selectedId, "socket-abc");
});

// applyContextAction - charts
test("applyContextAction charts switches view", () => {
  const state = baseState();
  const socket = { id: "socket-abc" };
  applyContextAction(state, "charts", socket, { chartMetrics: ["rtt", "rto"], suggestedMetric: "rto" });
  assert.equal(state.view, "charts");
  assert.equal(state.prefs.graphMetric, "rto");
});
test("applyContextAction charts adds metric without duplicates", () => {
  const state = baseState();
  state.chartMetrics = ["rtt"];
  const socket = { id: "socket-abc" };
  applyContextAction(state, "charts", socket, { chartMetrics: ["rtt", "rto"], suggestedMetric: "rto" });
  assert.ok(state.chartMetrics.includes("rto"));
  assert.equal(state.chartMetrics.filter(m => m === "rto").length, 1);
});
test("applyContextAction charts ignores unknown metric", () => {
  const state = baseState();
  const socket = { id: "socket-abc" };
  applyContextAction(state, "charts", socket, { chartMetrics: ["rtt"], suggestedMetric: "unknown" });
  assert.equal(state.prefs.graphMetric, "rtt");
});

// applyContextAction - anomalies
test("applyContextAction anomalies sets filters", () => {
  const state = baseState();
  const socket = { id: "socket-abc" };
  applyContextAction(state, "anomalies", socket);
  assert.equal(state.view, "analysis");
  assert.equal(state.activeTab, "anomalies");
  assert.equal(state.anomalyFilters.text, "socket-abc");
});

// applyContextAction - conversations
test("applyContextAction conversations clears filters", () => {
  const state = baseState();
  state.table.filters.srcIp = "10.0.0.1";
  const socket = { id: "socket-abc" };
  applyContextAction(state, "conversations", socket);
  assert.equal(state.table.filters.srcIp, "");
  assert.equal(state.table.page, 1);
});

// applyContextAction - no socket
test("applyContextAction with no socket is no-op for details", () => {
  const state = baseState();
  applyContextAction(state, "details", null);
  assert.equal(state.drawer, null);
});

// tableColumnMetadata
test("tableColumnMetadata returns keys array", () => {
  const meta = tableColumnMetadata(columns);
  assert.equal(meta.keys.length, columns.length);
});
test("tableColumnMetadata returns keySet", () => {
  const meta = tableColumnMetadata(columns);
  assert.ok(meta.keySet.has("risk"));
  assert.ok(!meta.keySet.has("unknown"));
});
test("tableColumnMetadata returns defaultVisible without opt-in columns", () => {
  const meta = tableColumnMetadata(columns);
  assert.ok(!meta.defaultVisible.includes("rtt"));
  assert.ok(meta.defaultVisible.includes("risk"));
});
test("tableColumnMetadata caches results", () => {
  const meta1 = tableColumnMetadata(columns);
  const meta2 = tableColumnMetadata(columns);
  assert.equal(meta1, meta2);
});

// defaultVisibleColumns
test("defaultVisibleColumns excludes opt-in columns", () => {
  const visible = defaultVisibleColumns(columns);
  assert.ok(!visible.includes("rtt"));
  assert.ok(!visible.includes("rto"));
  assert.ok(!visible.includes("cwnd"));
});
test("defaultVisibleColumns includes standard columns", () => {
  const visible = defaultVisibleColumns(columns);
  assert.ok(visible.includes("risk"));
  assert.ok(visible.includes("state"));
  assert.ok(visible.includes("local"));
});

// tableColumnKeys
test("tableColumnKeys returns all keys in order", () => {
  const keys = tableColumnKeys(columns);
  assert.deepEqual(keys, columns.map(c => c.key));
});

// normalizeTableState
test("normalizeTableState handles empty input", () => {
  const state = normalizeTableState({}, columns);
  assert.ok(state.visible.length > 0);
  assert.ok(state.order.length === columns.length);
});
test("normalizeTableState clamps page to 1", () => {
  const state = normalizeTableState({ page: -5 }, columns);
  assert.equal(state.page, 1);
});
test("normalizeTableState uses default sort key", () => {
  const state = normalizeTableState({}, columns, { sortKey: "state" });
  assert.equal(state.sortKey, "state");
});
test("normalizeTableState falls back to first key for unknown sortKey", () => {
  const state = normalizeTableState({ sortKey: "nonexistent" }, columns);
  assert.equal(state.sortKey, "risk");
});
test("normalizeTableState normalizes sortDir", () => {
  const state = normalizeTableState({ sortDir: "invalid" }, columns);
  assert.equal(state.sortDir, "desc");
});
test("normalizeTableState keeps valid sortDir asc", () => {
  const state = normalizeTableState({ sortDir: "asc" }, columns);
  assert.equal(state.sortDir, "asc");
});
test("normalizeTableState removes unknown keys from visible", () => {
  const state = normalizeTableState({ visible: ["risk", "unknown", "state"] }, columns);
  assert.ok(!state.visible.includes("unknown"));
  assert.ok(state.visible.includes("risk"));
});
test("normalizeTableState removes unknown keys from pinned", () => {
  const state = normalizeTableState({ visible: ["risk", "state"], pinned: ["risk", "unknown"] }, columns);
  assert.ok(!state.pinned.includes("unknown"));
});
test("normalizeTableState removes pinned keys not in visible", () => {
  const state = normalizeTableState({ visible: ["risk"], pinned: ["state"] }, columns);
  assert.ok(!state.pinned.includes("state"));
});
test("normalizeTableState deduplicates order", () => {
  const state = normalizeTableState({ order: ["risk", "risk", "state"] }, columns);
  assert.equal(state.order.filter(k => k === "risk").length, 1);
});
test("normalizeTableState merges default filters", () => {
  const state = normalizeTableState({ filters: { text: "hello" } }, columns, { filters: { text: "", risk: "all" } });
  assert.equal(state.filters.text, "hello");
  assert.equal(state.filters.risk, "all");
});
test("normalizeTableState keeps explicit pageSize", () => {
  const state = normalizeTableState({ pageSize: 50 }, columns);
  assert.equal(state.pageSize, 50);
});
test("normalizeTableState defaults pageSize to 25", () => {
  const state = normalizeTableState({}, columns);
  assert.equal(state.pageSize, 25);
});
test("normalizeTableState ensures at least one visible column", () => {
  const state = normalizeTableState({ visible: [] }, columns);
  assert.ok(state.visible.length >= 1);
});

// Generated: normalizeTableState with various stale states
const staleStates = Array.from({ length: 20 }, (_, i) => ({
  visible: columns.slice(0, (i % columns.length) + 1).map(c => c.key),
  pinned: i % 3 === 0 ? [columns[0].key] : [],
  sortKey: columns[i % columns.length].key,
  sortDir: i % 2 === 0 ? "asc" : "desc",
  page: i + 1
}));
for (const [i, stale] of staleStates.entries()) {
  test(`normalizeTableState repairs stale state variant ${i}`, () => {
    const state = normalizeTableState(stale, columns);
    assert.ok(state.visible.length >= 1);
    assert.ok(state.order.length === columns.length);
    assert.ok(state.page >= 1);
    assert.ok(["asc", "desc"].includes(state.sortDir));
  });
}
