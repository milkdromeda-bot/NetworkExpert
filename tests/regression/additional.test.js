import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAddress, parseDuration, parseDetails, parseNumber, parseSs, parseTimestampLine, stripAnsi, inferFamily, metricValue } from "../../src/parsing/parser.js";
import { parseAdvancedSearch, socketMatchesAdvancedQuery } from "../../src/config/search.js";
import { normalizeAnnotations, annotationSummary, annotationTypeList, annotationTypeLabel, resolveAnnotationEpoch, buildAnnotationAnchorOptions } from "../../src/timeline/annotations.js";
import { defaultAlertRules, evaluateAlertRules } from "../../src/config/alerts.js";
import { clearConversationScopeFilters, setActiveInvestigation, applyContextAction } from "../../src/core/navigation.js";
import { socketKey, stableSocketId, withStableSocketIds, timestampBlocks, parsedTimestampSnapshots } from "../../src/timeline/timeline.js";
import { endpointHost, endpointMatchesPattern, normalizeTopologyProfile, topologyGroupForEndpoint, topologyScopeKey } from "../../src/config/topology.js";
import { inferApplicationService, applicationServiceLabel, serviceInferenceKey } from "../../src/services/services.js";

function socketFrom(line) {
  return withStableSocketIds(parseSs(line))[0];
}

function makeSocket({ family = "tcp", state = "ESTAB", local = "10.0.0.1:1000", peer = "10.0.0.2:443", raw = "", recvQ = 0, sendQ = 0, details = null } = {}) {
  const parse = ep => { const i = ep.lastIndexOf(":"); return { host: ep.slice(0, i), port: ep.slice(i + 1) }; };
  return {
    id: `${local}-${peer}-${state}`,
    family, state, local, peer, raw,
    recvQ, sendQ,
    localAddress: parse(local),
    peerAddress: parse(peer),
    details: details || { values: {}, skmem: {}, process: null, timer: null },
    risk: "low"
  };
}

// --- parser.js edge cases ---

test("parseAddress handles empty input gracefully", () => {
  assert.deepEqual(parseAddress(""), { host: "", port: "" });
  assert.deepEqual(parseAddress(undefined), { host: "", port: "" });
});

test("parseAddress handles IPv6 without port", () => {
  assert.deepEqual(parseAddress("[::1]"), { host: "[::1]", port: "" });
});

test("parseDuration returns null for non-numeric input", () => {
  assert.equal(parseDuration("abc"), null);
  assert.equal(parseDuration(""), null);
});

test("stripAnsi removes ANSI escape sequences", () => {
  assert.equal(stripAnsi("\x1B[31mERROR\x1B[0m"), "ERROR");
  assert.equal(stripAnsi("plain text"), "plain text");
});

test("parseNumber handles negative numbers", () => {
  assert.equal(parseNumber("-42"), -42);
});

test("parseNumber handles whitespace-only input", () => {
  assert.equal(parseNumber("   "), null);
});

test("parseDetails extracts wscale send and receive factors", () => {
  const d = parseDetails("wscale:7:9 rtt:1.5/0.3");
  assert.deepEqual(d.values.wscale, { send: 7, receive: 9 });
});

test("parseDetails extracts pacing_rate current and max", () => {
  const d = parseDetails("pacing_rate 256000bps/1200000bps");
  assert.equal(d.values.pacing_rate.current, 256000);
  assert.equal(d.values.pacing_rate.max, 1200000);
});

test("parseDetails detects congestion algorithm flags", () => {
  const d = parseDetails("cubic sack ts ecn");
  assert.ok(d.flags.includes("cubic"));
  assert.ok(d.flags.includes("sack"));
  assert.ok(d.flags.includes("ts"));
  assert.ok(d.flags.includes("ecn"));
});

test("parseTimestampLine returns null for non-timestamp lines", () => {
  assert.equal(parseTimestampLine("ESTAB 0 0 10.0.0.1:80 10.0.0.2:443"), null);
  assert.equal(parseTimestampLine(""), null);
  assert.equal(parseTimestampLine(null), null);
});

test("parseTimestampLine parses ISO 8601 with timezone offset", () => {
  const ts = parseTimestampLine("2026-04-27T16:24:16+0200");
  assert.equal(ts, Date.parse("2026-04-27T16:24:16+02:00"));
});

test("inferFamily detects mptcp from text", () => {
  assert.equal(inferFamily("10.0.0.1:80", "10.0.0.2:443", "tcp-ulp-mptcp"), "mptcp");
});

test("inferFamily detects unix from path-like endpoints", () => {
  assert.equal(inferFamily("/var/run/docker.sock", "*", ""), "unix");
});

test("metricValue returns recvQ from socket directly", () => {
  const s = socketFrom("ESTAB 4096 8192 10.0.0.1:80 10.0.0.2:443 rtt:1/0.1");
  assert.equal(metricValue(s, "recvQ"), 4096);
  assert.equal(metricValue(s, "sendQ"), 8192);
});

test("metricValue returns 0 for null socket", () => {
  assert.equal(metricValue(null, "rtt"), 0);
});

// --- search.js ---

test("parseAdvancedSearch returns empty for blank query", () => {
  assert.deepEqual(parseAdvancedSearch(""), []);
  assert.deepEqual(parseAdvancedSearch("   "), []);
});

test("parseAdvancedSearch parses plain text terms", () => {
  const terms = parseAdvancedSearch("nginx ESTAB");
  assert.equal(terms.length, 2);
  assert.equal(terms[0].type, "plain");
  assert.equal(terms[0].value, "nginx");
});

test("parseAdvancedSearch parses field operators", () => {
  const terms = parseAdvancedSearch("rtt>=150 state=ESTAB drops>0");
  assert.equal(terms.length, 3);
  assert.equal(terms[0].key, "rtt");
  assert.equal(terms[0].op, ">=");
  assert.equal(terms[0].value, "150");
  assert.equal(terms[1].op, "=");
  assert.equal(terms[2].op, ">");
});

test("parseAdvancedSearch treats colon as equals operator", () => {
  const [term] = parseAdvancedSearch("state:ESTAB");
  assert.equal(term.op, "=");
  assert.equal(term.key, "state");
});

test("socketMatchesAdvancedQuery returns true for empty query", () => {
  const s = makeSocket();
  assert.equal(socketMatchesAdvancedQuery(s, "", { metricValue, socketBandwidth: () => 0 }), true);
});

test("socketMatchesAdvancedQuery matches plain text in raw", () => {
  const s = makeSocket({ raw: "cubic wscale:7:7 rto:200" });
  const deps = { metricValue, socketBandwidth: () => 0 };
  assert.equal(socketMatchesAdvancedQuery(s, "cubic", deps), true);
  assert.equal(socketMatchesAdvancedQuery(s, "bbr", deps), false);
});

test("socketMatchesAdvancedQuery matches field comparison", () => {
  const s = socketFrom("ESTAB 0 300000 10.0.0.1:80 10.0.0.2:443 rtt:200/10");
  s.risk = "medium";
  const deps = { metricValue, socketBandwidth: () => 0 };
  assert.equal(socketMatchesAdvancedQuery(s, "rtt>=150", deps), true);
  assert.equal(socketMatchesAdvancedQuery(s, "rtt<100", deps), false);
});

// --- annotations.js ---

test("normalizeAnnotations filters out invalid items", () => {
  const result = normalizeAnnotations([null, undefined, "string", { id: "a1", epochMs: 1000 }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "a1");
});

test("normalizeAnnotations assigns default kind and label", () => {
  const [item] = normalizeAnnotations([{ id: "x", epochMs: 500 }]);
  assert.equal(item.kind, "custom");
  assert.equal(item.label, "Analyst note");
});

test("annotationSummary counts and returns latest", () => {
  const items = [
    { id: "a1", epochMs: 100, createdAt: 10 },
    { id: "a2", epochMs: 200, createdAt: 20 }
  ];
  const summary = annotationSummary(items);
  assert.equal(summary.count, 2);
  assert.equal(summary.latest.id, "a2");
});

test("annotationTypeList returns all known types", () => {
  const list = annotationTypeList();
  assert.ok(list.length >= 5);
  assert.ok(list.some(t => t.id === "custom"));
  assert.ok(list.some(t => t.id === "failover"));
});

test("annotationTypeLabel falls back for unknown kind", () => {
  assert.equal(annotationTypeLabel("nonexistent"), "Custom marker");
});

test("resolveAnnotationEpoch uses explicit epochMs when present", () => {
  assert.equal(resolveAnnotationEpoch({ epochMs: 42000 }, {}), 42000);
});

test("buildAnnotationAnchorOptions returns empty for empty history", () => {
  const options = buildAnnotationAnchorOptions({ history: [] });
  assert.equal(options.length, 0);
});

// --- alerts.js ---

test("defaultAlertRules returns four enabled rules", () => {
  const rules = defaultAlertRules();
  assert.equal(rules.length, 4);
  assert.ok(rules.every(r => r.enabled));
});

test("evaluateAlertRules fires on matching socket", () => {
  const rules = [{ id: "r1", name: "High Send-Q", metric: "sendQ", op: ">=", value: 100000, severity: "high", enabled: true }];
  const s = makeSocket({ sendQ: 200000 });
  s.details = { values: {}, skmem: {}, process: null, timer: null };
  const deps = { metricValue, socketBandwidth: () => 0, riskRank: sev => ({ low: 1, medium: 2, high: 3, critical: 4 }[sev] || 0) };
  const events = evaluateAlertRules({ rules, sockets: [s], alertAcks: {} }, deps);
  assert.equal(events.length, 1);
  assert.equal(events[0].ruleId, "r1");
  assert.equal(events[0].value, 200000);
});

test("evaluateAlertRules skips disabled rules", () => {
  const rules = [{ id: "r1", name: "test", metric: "sendQ", op: ">=", value: 0, severity: "low", enabled: false }];
  const s = makeSocket({ sendQ: 999 });
  s.details = { values: {}, skmem: {}, process: null, timer: null };
  const deps = { metricValue, socketBandwidth: () => 0, riskRank: () => 0 };
  assert.equal(evaluateAlertRules({ rules, sockets: [s], alertAcks: {} }, deps).length, 0);
});

test("evaluateAlertRules marks acknowledged alerts", () => {
  const rules = [{ id: "r1", name: "test", metric: "sendQ", op: ">=", value: 100, severity: "low", enabled: true }];
  const s = makeSocket({ sendQ: 200 });
  s.details = { values: {}, skmem: {}, process: null, timer: null };
  const acks = { [`r1:${s.id}`]: true };
  const deps = { metricValue, socketBandwidth: () => 0, riskRank: () => 1 };
  const events = evaluateAlertRules({ rules, sockets: [s], alertAcks: acks }, deps);
  assert.equal(events[0].acknowledged, true);
});

// --- navigation.js ---

test("clearConversationScopeFilters resets all filter fields", () => {
  const filters = { text: "nginx", process: "java", srcIp: "10.0.0.1", dstIp: "10.0.0.2", srcPort: "80", dstPort: "443", onlyAnomalies: true };
  clearConversationScopeFilters(filters);
  assert.equal(filters.text, "");
  assert.equal(filters.process, "");
  assert.equal(filters.onlyAnomalies, false);
});

test("setActiveInvestigation sets context id and reason", () => {
  const state = { activeContextId: null, activeContextReason: "" };
  setActiveInvestigation(state, "socket-abc", "Test reason");
  assert.equal(state.activeContextId, "socket-abc");
  assert.equal(state.activeContextReason, "Test reason");
});

test("setActiveInvestigation clears context when null", () => {
  const state = { activeContextId: "socket-abc", activeContextReason: "old" };
  setActiveInvestigation(state, null);
  assert.equal(state.activeContextId, null);
  assert.equal(state.activeContextReason, "");
});

test("applyContextAction clear resets investigation state", () => {
  const state = { activeContextId: "x", activeContextReason: "y", drawer: "details", openConversationInsightKey: "k", openConversationInsightPos: 1 };
  applyContextAction(state, "clear", null);
  assert.equal(state.activeContextId, null);
  assert.equal(state.drawer, null);
});

test("applyContextAction details opens the details drawer", () => {
  const socket = { id: "s1" };
  const state = { selectedId: null, activeContextId: null, activeContextReason: "", drawer: null, openConversationInsightKey: null, openConversationInsightPos: null };
  applyContextAction(state, "details", socket);
  assert.equal(state.drawer, "details");
  assert.equal(state.selectedId, "s1");
});

// --- topology.js edge cases ---

test("normalizeTopologyProfile handles null input", () => {
  const profile = normalizeTopologyProfile(null);
  assert.deepEqual(profile.groups, []);
});

test("normalizeTopologyProfile filters groups without name or match", () => {
  const profile = normalizeTopologyProfile({ groups: [{ id: "a", name: "", match: "10.0.0.1", color: "cyan" }] });
  assert.equal(profile.groups.length, 0);
});

test("endpointHost returns raw value for plain host without port", () => {
  assert.equal(endpointHost("localhost"), "localhost");
});

test("endpointMatchesPattern returns false for empty inputs", () => {
  assert.equal(endpointMatchesPattern("", "10.0.0.1"), false);
  assert.equal(endpointMatchesPattern("10.0.0.1:80", ""), false);
});

test("topologyGroupForEndpoint returns null when no group matches", () => {
  const profile = { groups: [{ id: "a", name: "A", match: "10.0.0.1", color: "cyan" }] };
  assert.equal(topologyGroupForEndpoint(profile, "192.168.1.1:80"), null);
});

test("topologyGroupForEndpoint supports comma-separated patterns", () => {
  const profile = { groups: [{ id: "a", name: "Cluster", match: "10.0.0.1,10.0.0.2", color: "cyan" }] };
  assert.equal(topologyGroupForEndpoint(profile, "10.0.0.2:8080").name, "Cluster");
});

test("topologyScopeKey normalizes whitespace and case", () => {
  assert.equal(topologyScopeKey("  MyFile.LOG  "), "myfile.log");
});

// --- timeline.js edge cases ---

test("stableSocketId produces consistent hash for same key", () => {
  const s = makeSocket({ local: "10.0.0.1:80", peer: "10.0.0.2:443", state: "ESTAB" });
  const id1 = stableSocketId(s);
  const id2 = stableSocketId(s);
  assert.equal(id1, id2);
  assert.ok(id1.startsWith("socket-"));
});

test("socketKey includes local, peer, and state", () => {
  const s = makeSocket({ local: "10.0.0.1:80", peer: "10.0.0.2:443", state: "ESTAB" });
  assert.equal(socketKey(s), "10.0.0.1:80|10.0.0.2:443|ESTAB");
});

test("parsedTimestampSnapshots parses sockets within each block", () => {
  const raw = [
    "2026-05-01T10:00:00Z",
    "ESTAB 0 0 10.0.0.1:80 10.0.0.2:443 rtt:1/0.1",
    "2026-05-01T10:00:01Z",
    "ESTAB 0 0 10.0.0.1:80 10.0.0.2:443 rtt:2/0.2"
  ].join("\n");
  const snapshots = parsedTimestampSnapshots(raw);
  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[0].sockets.length, 1);
  assert.equal(snapshots[1].sockets[0].details.values.rtt.avg, 2);
});

// --- services.js edge cases ---

test("inferApplicationService returns null for null input", () => {
  assert.equal(inferApplicationService(null), null);
});

test("applicationServiceLabel returns empty string for unknown ports", () => {
  const s = makeSocket({ local: "10.0.0.1:55000", peer: "10.0.0.2:55001" });
  assert.equal(applicationServiceLabel(s), "");
});

test("serviceInferenceKey includes all identity fields", () => {
  const s = makeSocket({ family: "tcp6", state: "LISTEN", local: "[::]:443", peer: "[::]:*" });
  const key = serviceInferenceKey(s);
  assert.ok(key.includes("tcp"));
  assert.ok(key.includes("LISTEN"));
  assert.ok(key.includes("443"));
});
