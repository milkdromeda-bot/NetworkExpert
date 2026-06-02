import assert from "node:assert/strict";
import { test } from "node:test";

import { createConversationModel } from "../../src/rendering/conversation-model.js";

const sortLabels = { anomalies: "Anomalies", flow: "Flow", process: "Process", risk: "Risk", tx: "TX" };
const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

function socket(overrides = {}) {
  return {
    id: overrides.id || "s1",
    local: overrides.local || "10.0.0.1:1000",
    peer: overrides.peer || "10.0.0.2:2000",
    localAddress: overrides.localAddress || { host: "10.0.0.1", port: "1000" },
    peerAddress: overrides.peerAddress || { host: "10.0.0.2", port: "2000" },
    family: overrides.family || "tcp",
    state: overrides.state || "ESTAB",
    risk: overrides.risk || "low",
    recvQ: overrides.recvQ || 0,
    sendQ: overrides.sendQ || 0,
    details: { process: { name: overrides.process || "" } },
    metrics: {
      rtt: overrides.rtt || 0,
      rto: overrides.rto || 0,
      "skmem.d": overrides.drops || 0,
      tx_bps: overrides.txBps || 0,
      rx_bps: overrides.rxBps || 0
    }
  };
}

function createSubject(overrides = {}) {
  const sockets = overrides.sockets || [
    socket({ id: "a", process: "feed", risk: "high", sendQ: 3, txBps: 100 }),
    socket({ id: "b", process: "feed", recvQ: 4, rtt: 20, txBps: 60 }),
    socket({ id: "c", localAddress: { host: "10.0.0.3", port: "1000" }, peerAddress: { host: "10.0.0.4", port: "2000" }, risk: "medium", txBps: 300 })
  ];
  const state = {
    anomalies: overrides.anomalies || [
      { socketId: "a", severity: "high", metric: "rtt", title: "RTT high" },
      { socketId: "a", severity: "critical", metric: "rtt", title: "RTT high" },
      { socketId: "c", severity: "medium", metric: "sendQ", title: "SendQ high" }
    ],
    cache: {},
    conversationSort: overrides.conversationSort || { key: "anomalies", dir: "desc" },
    dataVersion: 1,
    sockets
  };
  const context = {
    state,
    CONVERSATION_SORT_COLLATOR: new Intl.Collator("en", { numeric: true }),
    CONVERSATION_SORT_LABELS: sortLabels,
    currentApplicationServiceSortKey: item => item.process || "svc",
    escapeHtml: value => String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    metricValue: (item, metric) => Number(item.metrics?.[metric] || 0),
    riskRank: risk => severityOrder[risk] || 0,
    severityRank: severity => severityOrder[severity] || 0,
    socketBandwidth: (item, metric) => Number(item.metrics?.[metric] || 0),
    socketKey: item => `${item.localAddress.host}|${item.peerAddress.host}|${item.family}`,
    sortedFilteredSockets: () => sockets,
    ...overrides.context
  };
  return { context, model: createConversationModel(() => context), sockets, state };
}

test("conversation model groups sockets and caches lookups", () => {
  const { model, state } = createSubject();

  const groups = model.groupedSockets();

  assert.equal(groups[0].key, "10.0.0.1|10.0.0.2|tcp");
  assert.equal(groups[0].count, 2);
  assert.equal(groups[0].maxRisk, "high");
  assert.equal(groups[0].anomalies, 2);
  assert.equal(model.socketsById().get("a").id, "a");
  assert.equal(model.anomaliesBySocketId(), state.cache.anomaliesBySocketId);
});

test("conversation model builds and sorts conversation aggregates", () => {
  const { model, state } = createSubject({ conversationSort: { key: "tx", dir: "asc" } });

  const conversations = model.buildConversations();

  assert.equal(conversations[0].key, "10.0.0.1|1000|10.0.0.2|2000|tcp");
  assert.equal(conversations[0].count, 2);
  assert.equal(conversations[0].txBps, 160);
  assert.equal(conversations[0].anomalies, 2);
  assert.deepEqual([...conversations[0].processes], ["feed"]);
  assert.equal(conversations[1].txBps, 300);

  state.conversationSort = { key: "flow", dir: "asc" };
  assert.equal(model.sortConversations([...conversations])[0].local, "10.0.0.1:1000");
});

test("conversation model summarizes anomalies and renders sort headers", () => {
  const { model } = createSubject();
  const conv = {
    anomalyItems: [
      { severity: "medium", metric: "sendQ", title: "Queue" },
      { severity: "critical", metric: "rtt", title: "Latency" },
      { severity: "critical", metric: "rtt", title: "Latency" }
    ]
  };

  const summary = model.conversationAnomalySummary(conv);

  assert.equal(model.conversationDefaultSortDir("flow"), "asc");
  assert.equal(model.conversationDefaultSortDir("tx"), "desc");
  assert.equal(summary.dominantSeverity, "critical");
  assert.equal(summary.topMetric, "rtt");
  assert.equal(summary.topItems[0].count, 2);
  assert.match(model.renderConversationSortHeader("anomalies", "<Anom>"), /&lt;Anom&gt;/);
  assert.match(model.renderConversationSortHeader("anomalies", "Anomalies"), /DESC/);
});
