import assert from "node:assert/strict";
import { test } from "node:test";
import { aliasDisplay, aliasForEndpoint, normalizeAliasStore, upsertEndpointAlias } from "../src/aliases.js";
import { applyRisks } from "../src/analysis.js";
import { defaultAlertRules, evaluateAlertRules } from "../src/alerts.js";
import { buildComparison, createBaseline } from "../src/compare.js";
import { applyAnalysisTemplate, applyDashboardPreset, applyDashboardProfile } from "../src/profiles.js";
import { inferFamily, metricValue, parseAddress, parseDetails, parseNumber, parseSs, parseTimestampLine } from "../src/parser.js";
import { parseAdvancedSearch, socketMatchesAdvancedQuery } from "../src/search.js";
import { aggregateParsedSocketsByKey, aggregateTimestampedSockets, socketKey, stableSocketId, timestampBlocks, withStableSocketIds } from "../src/timeline.js";
import { endpointMatchesPattern, normalizeTopologyProfile, topologyGroupForEndpoint, upsertTopologyGroup } from "../src/topology.js";

const riskRank = severity => ({ low: 1, medium: 2, high: 3, critical: 4 }[severity] || 0);
const socketBandwidth = (socket, metric) => socket.bandwidth?.[metric] || 0;
const deps = { metricValue, socketBandwidth, socketKey, riskRank };

function socketFrom(line, bandwidth = {}) {
  return applyRisks(withStableSocketIds(parseSs(line)).map(socket => ({ ...socket, bandwidth })))[0];
}

function profileState() {
  return {
    prefs: {
      graphMetric: "rtt",
      graphStyle: "line",
      chartLayout: { columns: 2, panelOrder: ["rtt"] }
    },
    chartMetrics: ["rtt"],
    correlation: { x: "rtt", y: "sendQ" },
    table: {
      visible: ["risk"],
      pinned: [],
      order: ["risk"],
      filters: { text: "old" },
      page: 9
    },
    activeTab: "advisor",
    view: "analysis"
  };
}

test("parseDetails extracts timer expiry and retransmission count", () => {
  const details = parseDetails("timer:(keepalive,60min,3)");

  assert.equal(details.timer.name, "keepalive");
  assert.equal(details.timer.expireMs, 3600000);
  assert.equal(details.timer.retrans, 3);
});

test("parseDetails extracts asymmetric window scaling", () => {
  const details = parseDetails("wscale:8:9");

  assert.deepEqual(details.values.wscale, { send: 8, receive: 9 });
});

test("parseDetails extracts pacing current and max rates", () => {
  const details = parseDetails("pacing_rate 2961584bps/5406728bps");

  assert.deepEqual(details.values.pacing_rate, { current: 2961584, max: 5406728 });
});

test("parseDetails extracts delivery and send rates separately", () => {
  const details = parseDetails("send 1480800bps delivery_rate 5406728bps");

  assert.equal(details.values.send, 1480800);
  assert.equal(details.values.delivery_rate, 5406728);
});

test("parseDetails extracts socket memory drops and buffers", () => {
  const details = parseDetails("skmem:(r64,rb1309976,t128,tb262144,f4096,w8,o0,bl4,d161)");

  assert.equal(details.skmem.r, 64);
  assert.equal(details.skmem.rb, 1309976);
  assert.equal(details.skmem.d, 161);
});

test("parseDetails keeps TCP capability flags", () => {
  const details = parseDetails("ts sack cubic bbr ecn ecnseen");

  assert.deepEqual(details.flags.sort(), ["bbr", "cubic", "ecn", "ecnseen", "sack", "ts"].sort());
});

test("parseSs parses netid-prefixed TCP rows", () => {
  const [socket] = parseSs("tcp ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1");

  assert.equal(socket.family, "tcp");
  assert.equal(socket.state, "ESTAB");
});

test("parseSs parses UDP rows without inventing TCP", () => {
  const [socket] = parseSs("udp UNCONN 10 0 0.0.0.0:53 0.0.0.0:* skmem:(r10,rb100,t0,tb100,f0,w0,o0,bl0,d0)");

  assert.equal(socket.family, "udp");
  assert.equal(socket.state, "UNCONN");
});

test("parseTimestampLine accepts prefixed timestamp assignments", () => {
  assert.equal(parseTimestampLine("timestamp=2026-04-27 16:24:16"), Date.parse("2026-04-27T16:24:16"));
});

test("parseTimestampLine accepts epoch millisecond markers", () => {
  assert.equal(parseTimestampLine("EPOCH_MS: 1770000000123"), 1770000000123);
});

test("metricValue returns receive socket memory by dotted key", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r42,rb100,t0,tb100,f0,w0,o0,bl0,d0)");

  assert.equal(metricValue(socket, "skmem.r"), 42);
});

test("parseNumber handles bits per second spelling", () => {
  assert.equal(parseNumber("2.5Mbits/sec"), 2500000);
});

test("inferFamily detects unix socket paths", () => {
  assert.equal(inferFamily("/run/app.sock", "*", ""), "unix");
});

test("parseAddress keeps blank tokens harmless", () => {
  assert.deepEqual(parseAddress("   "), { host: "", port: "" });
});

test("stableSocketId changes when socket state changes", () => {
  const estab = parseSs("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443")[0];
  const closeWait = parseSs("CLOSE-WAIT 0 0 10.0.0.1:1000 10.0.0.2:443")[0];

  assert.notEqual(stableSocketId(estab), stableSocketId(closeWait));
});

test("aggregateParsedSocketsByKey keeps latest values and counts observations", () => {
  const sockets = parseSs([
    "ESTAB 0 1 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1",
    "ESTAB 0 9 10.0.0.1:1000 10.0.0.2:443 rtt:9/0.9"
  ].join("\n"));

  const [aggregated] = aggregateParsedSocketsByKey(sockets);

  assert.equal(aggregated.sendQ, 9);
  assert.equal(aggregated.snapshotCount, 2);
  assert.equal(metricValue(aggregated, "rtt"), 9);
});

test("aggregateTimestampedSockets keeps a single timestamp capture uncollapsed", () => {
  const raw = [
    "--- 2026-04-27 16:24:13 ---",
    "ESTAB 0 1 10.0.0.1:1000 10.0.0.2:443",
    "ESTAB 0 2 10.0.0.1:1000 10.0.0.2:443"
  ].join("\n");

  assert.equal(aggregateTimestampedSockets(raw).length, 2);
});

test("timestampBlocks keeps multiple socket lines inside the same block", () => {
  const blocks = timestampBlocks([
    "--- 2026-04-27 16:24:13 ---",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443",
    "ESTAB 0 0 10.0.0.3:1001 10.0.0.4:443"
  ].join("\n"));

  assert.equal(blocks[0].lines.length, 2);
});

test("normalizeAliasStore normalizes endpoint keys from raw records", () => {
  const store = normalizeAliasStore({
    "endpoint:WRONG": { endpoint: " 10.0.0.5:9100 ", label: " FIX " }
  });

  assert.equal(aliasForEndpoint(store, "10.0.0.5:9100").label, "FIX");
});

test("upsertEndpointAlias can store role-only metadata", () => {
  const store = upsertEndpointAlias({}, "10.0.0.5:9100", { role: "Market data simulator" }, 12);

  assert.equal(aliasDisplay("10.0.0.5:9100", store), "10.0.0.5:9100");
  assert.equal(aliasForEndpoint(store, "10.0.0.5:9100").role, "Market data simulator");
});

test("normalizeTopologyProfile drops incomplete groups and repairs colors", () => {
  const profile = normalizeTopologyProfile({
    groups: [
      { id: "bad", name: "", match: "10.0.0.1", color: "nope" },
      { id: "ok", name: "LPs", match: "10.0.0.2", color: "nope" }
    ]
  });

  assert.equal(profile.groups.length, 1);
  assert.equal(profile.groups[0].color, "blue");
});

test("upsertTopologyGroup ignores blank groups", () => {
  const profile = upsertTopologyGroup({ groups: [] }, { name: "", match: "10.0.0.1" }, 5);

  assert.deepEqual(profile.groups, []);
});

test("topologyGroupForEndpoint supports comma-separated patterns", () => {
  const profile = { groups: [{ id: "g", name: "Distributors", match: "10.0.0.1, 10.0.0.2:57067", color: "pink" }] };

  assert.equal(topologyGroupForEndpoint(profile, "10.0.0.2:57067").name, "Distributors");
});

test("endpointMatchesPattern treats wildcard host rules case-insensitively", () => {
  assert.equal(endpointMatchesPattern("HOST-A:443", "host-a:*"), true);
});

test("parseAdvancedSearch keeps quoted values together", () => {
  assert.deepEqual(parseAdvancedSearch('process:"java worker" risk>=high'), [
    { type: "field", key: "process", op: "=", value: "java worker" },
    { type: "field", key: "risk", op: ">=", value: "high" }
  ]);
});

test("socketMatchesAdvancedQuery evaluates severity comparisons", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d25)");

  assert.equal(socketMatchesAdvancedQuery(socket, "risk>=high", deps), true);
});

test("socketMatchesAdvancedQuery evaluates port filters against both endpoints", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443");

  assert.equal(socketMatchesAdvancedQuery(socket, "port:443", deps), true);
});

test("socketMatchesAdvancedQuery evaluates negative string filters", () => {
  const socket = socketFrom('ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 users:(("java",pid=12,fd=3))');

  assert.equal(socketMatchesAdvancedQuery(socket, "process!=nginx", deps), true);
  assert.equal(socketMatchesAdvancedQuery(socket, "process!=java", deps), false);
});

test("applyDashboardPreset filters metrics through the available metric list", () => {
  const state = profileState();

  applyDashboardPreset(state, "latency", () => ["rtt", "rto"]);

  assert.deepEqual(state.chartMetrics, ["rtt", "rto"]);
  assert.equal(state.prefs.graphMetric, "rtt");
});

test("applyDashboardProfile falls back when saved metrics are unavailable", () => {
  const state = profileState();

  applyDashboardProfile(state, { chartMetrics: ["missing"], graphMetric: "sendQ", correlation: { y: "rto" }, chartLayout: { density: "compact" } }, () => ["rtt", "rto"]);

  assert.deepEqual(state.chartMetrics, ["rtt", "rto", "sendQ", "recvQ"]);
  assert.equal(state.correlation.y, "rto");
  assert.equal(state.prefs.chartLayout.density, "compact");
});

test("applyAnalysisTemplate switches Kubernetes template to the map tab", () => {
  const state = profileState();
  const columns = ["risk", "state", "family", "recvQ", "sendQ", "local", "peer", "process", "rtt", "rto", "pacing_rate", "delivery_rate", "skmem.d"];

  applyAnalysisTemplate(state, "kube", columns, () => ["tx_bps", "rx_bps", "delivery_rate", "pacing_rate", "rtt", "rto", "sendQ", "skmem.d"]);

  assert.equal(state.activeTab, "map");
  assert.equal(state.view, "analysis");
  assert.equal(state.table.page, 1);
});

test("createBaseline snapshots sockets with stable comparison keys", () => {
  const socket = socketFrom("ESTAB 0 42 10.0.0.1:1000 10.0.0.2:443 rtt:2/0.2");
  const baseline = createBaseline({ sourceName: "capture.log", sockets: [socket], anomalies: [] }, deps);

  assert.equal(baseline.sourceName, "capture.log");
  assert.equal(baseline.sockets[0].key, socketKey(socket));
  assert.equal(baseline.sockets[0].sendQ, 42);
});

test("buildComparison reports new and gone sockets", () => {
  const oldSocket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443");
  const newSocket = socketFrom("ESTAB 0 0 10.0.0.3:1001 10.0.0.4:443");
  const state = {
    sourceName: "now",
    sockets: [newSocket],
    anomalies: [],
    baseline: createBaseline({ sourceName: "before", sockets: [oldSocket], anomalies: [] }, deps)
  };

  const comparison = buildComparison(state, deps);

  assert.equal(comparison.summary.added, 1);
  assert.equal(comparison.summary.removed, 1);
});

test("buildComparison marks pressure growth as worse", () => {
  const before = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443");
  const after = socketFrom("ESTAB 0 300000 10.0.0.1:1000 10.0.0.2:443");
  const state = {
    sockets: [after],
    anomalies: [],
    baseline: createBaseline({ sourceName: "before", sockets: [before], anomalies: [] }, deps)
  };

  assert.equal(buildComparison(state, deps).summary.worsened, 1);
});

test("defaultAlertRules include a critical drop detector", () => {
  const rule = defaultAlertRules().find(item => item.id === "rule-drops-any");

  assert.equal(rule.metric, "skmem.d");
  assert.equal(rule.severity, "critical");
});

test("evaluateAlertRules marks acknowledged alerts and sorts them last", () => {
  const critical = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d2)");
  const high = socketFrom("ESTAB 0 300000 10.0.0.3:1001 10.0.0.4:443 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d0)");
  const rules = defaultAlertRules();
  const ackId = `rule-drops-any:${critical.id}`;

  const events = evaluateAlertRules({ rules, sockets: [critical, high], alertAcks: { [ackId]: true } }, deps);

  assert.equal(events.at(-1).id, ackId);
  assert.equal(events.at(-1).acknowledged, true);
  assert.equal(events[0].ruleId, "rule-sendq-high");
});
