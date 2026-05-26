import assert from "node:assert/strict";
import { test } from "node:test";
import { bindSocketInteractionEvents } from "../../src/socket-interaction-events.js";

function node(dataset = {}) {
  const listeners = new Map();
  return {
    dataset,
    style: {},
    classList: { add() {}, remove() {} },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    closest() {
      return null;
    },
    getBoundingClientRect() {
      return { left: 10, top: 20, bottom: 40, right: 80 };
    },
    dispatch(type, extra = {}) {
      const handler = listeners.get(type);
      assert.equal(typeof handler, "function", `${type} listener should be registered`);
      return handler({
        currentTarget: this,
        target: this,
        stopPropagation() {},
        preventDefault() {},
        ...extra
      });
    }
  };
}

function fakeDocument(lists = {}) {
  return {
    querySelectorAll(selector) {
      return lists[selector] || [];
    },
    getElementById() {
      return null;
    }
  };
}

function deps(lists = {}) {
  const calls = [];
  const socket = {
    id: "s1",
    state: "ESTAB",
    local: "10.0.0.1:50000",
    peer: "10.0.0.2:443",
    localAddress: { host: "10.0.0.1" },
    peerAddress: { host: "10.0.0.2" },
    sendQ: 128,
    recvQ: 64,
    risk: "high",
    details: { process: { name: "java", pid: 42 }, timer: { retrans: 1 } }
  };
  const state = {
    table: { page: 3, filters: { srcIp: "", dstIp: "" } },
    prefs: {},
    chartMetrics: [],
    anomalyFilters: {},
    conversationSort: null
  };
  return {
    calls,
    state,
    deps: {
      document: fakeDocument(lists),
      window: { innerWidth: 1200, innerHeight: 800 },
      state,
      CONVERSATION_SORT_LABELS: { anomalies: "Anomalies" },
      conversationDefaultSortDir: () => "desc",
      positionConversationInsight: () => calls.push("positionConversationInsight"),
      socketsById: () => new Map([["s1", socket]]),
      focusSocket: id => calls.push(`focus:${id}`),
      chartMetricList: () => ["rtt"],
      metricLabel: key => key.toUpperCase(),
      anomaliesBySocketId: () => new Map(),
      metricValue: (item, key) => key === "rtt" ? 1.2 : key === "rto" ? 200 : null,
      formatNumber: value => String(value),
      openIncidentReport: () => calls.push("openIncidentReport"),
      exportIncidentReportHtml: () => calls.push("exportIncidentReportHtml"),
      exportEvidencePack: async () => calls.push("exportEvidencePack"),
      buildJiraReport: () => "jira",
      exportFixSpikeCsv: () => calls.push("exportFixSpikeCsv"),
      copyTextToClipboard: text => calls.push(`copy:${text}`),
      toast: title => calls.push(`toast:${title}`),
      renderKeepingWorkspacePosition: () => calls.push("renderStable"),
      render: () => calls.push("render")
    }
  };
}

test("socket interaction binder sorts conversations with injected helpers", () => {
  const sort = node({ conversationSort: "anomalies" });
  const ctx = deps({ "[data-conversation-sort]": [sort] });

  bindSocketInteractionEvents(ctx.deps);
  sort.dispatch("click");

  assert.deepEqual(ctx.state.conversationSort, { key: "anomalies", dir: "asc" });
  assert.equal(ctx.state.table.page, 1);
  assert.ok(ctx.calls.includes("renderStable"));
});

test("socket interaction binder applies source endpoint row filters", async () => {
  const row = node({ rowAction: "filter-src", socketId: "s1" });
  const ctx = deps({ "[data-row-action]": [row] });

  bindSocketInteractionEvents(ctx.deps);
  await row.dispatch("click");

  assert.equal(ctx.state.table.filters.srcIp, "10.0.0.1");
  assert.equal(ctx.state.table.page, 1);
  assert.ok(ctx.calls.includes("focus:s1"));
  assert.ok(ctx.calls.includes("render"));
});
