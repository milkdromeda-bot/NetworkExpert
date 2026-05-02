import assert from "node:assert/strict";
import { test } from "node:test";
import { applyContextAction } from "../src/navigation.js";

function baseState() {
  return {
    selectedId: "socket-a",
    drawer: null,
    openConversationInsightKey: "flow-a",
    openConversationInsightPos: { left: 10, top: 20 },
    view: "analysis",
    activeTab: "sockets",
    prefs: { graphMetric: "rtt" },
    chartMetrics: ["rtt"],
    anomalyFilters: { severity: "high", metric: "rtt", text: "old", sort: "metric" },
    table: {
      page: 3,
      filters: {
        text: "state:ESTAB",
        risk: "all",
        state: "all",
        family: "all",
        minRecvQ: "",
        minSendQ: "",
        minRtt: "",
        srcIp: "192.168.145.205",
        dstIp: "192.168.145.115",
        srcPort: "20002",
        dstPort: "41476",
        process: "java",
        onlyAnomalies: true
      }
    }
  };
}

const socket = {
  id: "socket-a",
  localAddress: { host: "192.168.145.205", port: "20002" },
  peerAddress: { host: "192.168.145.115", port: "41476" }
};

test("context Conversations navigates without preserving endpoint filters", () => {
  const state = baseState();

  applyContextAction(state, "conversations", socket);

  assert.equal(state.view, "analysis");
  assert.equal(state.activeTab, "conversations");
  assert.equal(state.table.page, 1);
  assert.equal(state.table.filters.srcIp, "");
  assert.equal(state.table.filters.dstIp, "");
  assert.equal(state.table.filters.srcPort, "");
  assert.equal(state.table.filters.dstPort, "");
  assert.equal(state.table.filters.text, "");
  assert.equal(state.table.filters.process, "");
  assert.equal(state.table.filters.onlyAnomalies, false);
  assert.equal(state.table.filters.risk, "all");
});

test("context Charts adds the suggested metric without removing existing charts", () => {
  const state = baseState();

  applyContextAction(state, "charts", socket, { chartMetrics: ["rtt", "skmem.d"], suggestedMetric: "skmem.d" });

  assert.equal(state.view, "charts");
  assert.equal(state.prefs.graphMetric, "skmem.d");
  assert.deepEqual(state.chartMetrics, ["skmem.d", "rtt"]);
});

test("context Charts ignores unknown suggested metrics", () => {
  const state = baseState();

  applyContextAction(state, "charts", socket, { chartMetrics: ["rtt", "skmem.d"], suggestedMetric: "not_a_metric" });

  assert.equal(state.view, "charts");
  assert.equal(state.prefs.graphMetric, "rtt");
  assert.deepEqual(state.chartMetrics, ["rtt"]);
});

test("context Anomalies scopes the anomaly list to the active socket id", () => {
  const state = baseState();

  applyContextAction(state, "anomalies", socket);

  assert.equal(state.view, "analysis");
  assert.equal(state.activeTab, "anomalies");
  assert.deepEqual(state.anomalyFilters, { severity: "all", metric: "all", text: "socket-a", sort: "priority" });
});

test("context Clear removes active socket and open dialog state", () => {
  const state = baseState();

  applyContextAction(state, "clear", socket);

  assert.equal(state.selectedId, null);
  assert.equal(state.drawer, null);
  assert.equal(state.openConversationInsightKey, null);
  assert.equal(state.openConversationInsightPos, null);
});

test("context Details opens details drawer without changing table filters", () => {
  const state = baseState();
  const before = { ...state.table.filters };

  applyContextAction(state, "details", socket);

  assert.equal(state.drawer, "details");
  assert.deepEqual(state.table.filters, before);
});

test("context action with no socket is a no-op except clear", () => {
  const state = baseState();
  const before = structuredClone(state);

  applyContextAction(state, "charts", null, { chartMetrics: ["rtt"], suggestedMetric: "rtt" });

  assert.deepEqual(state, before);
});

test("context Clear does not erase current table filters", () => {
  const state = baseState();
  const before = { ...state.table.filters };

  applyContextAction(state, "clear", socket);

  assert.deepEqual(state.table.filters, before);
});

test("context Charts avoids duplicate metrics", () => {
  const state = baseState();

  applyContextAction(state, "charts", socket, { chartMetrics: ["rtt"], suggestedMetric: "rtt" });

  assert.deepEqual(state.chartMetrics, ["rtt"]);
});
