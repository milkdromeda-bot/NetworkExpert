import assert from "node:assert/strict";
import { test } from "node:test";

import { SS_OPTIONS, FIELD_DOCS, generateMicroburstSample, generateTailLatencySample, generateTenMinuteSample, prefsDefault } from "../src/data.js";
import { analyzeSocket, riskForSocket } from "../src/analysis.js";
import { DASHBOARD_PRESETS, dashboardSnapshot, applyAnalysisTemplate, applyDashboardPreset, applyDashboardProfile } from "../src/profiles.js";
import { parseSs, metricValue } from "../src/parser.js";
import { parseAdvancedSearch, socketMatchesAdvancedQuery } from "../src/search.js";
import { commandCoverage, toggleCommandOption } from "../src/ss-command.js";
import { withStableSocketIds } from "../src/timeline.js";

function socketFrom(line, bandwidth = {}) {
  return withStableSocketIds(parseSs(line)).map(socket => ({ ...socket, bandwidth }))[0];
}

function profileState() {
  return {
    prefs: {
      graphMetric: "rtt",
      graphStyle: "line",
      chartLayout: { columns: 2, density: "standard", panelOrder: ["rtt"] }
    },
    chartMetrics: ["rtt"],
    correlation: { x: "rtt", y: "sendQ" },
    table: {
      visible: ["risk"],
      pinned: [],
      order: ["risk"],
      filters: { text: "" },
      page: 3
    },
    activeTab: "advisor",
    view: "analysis"
  };
}

const deps = {
  metricValue,
  socketBandwidth: (socket, metric) => socket.bandwidth?.[metric] || 0
};

test("data docs keep MSS documentation available", () => {
  assert.match(FIELD_DOCS.mss, /segment size/i);
});

test("ss options include cgroup process collection", () => {
  const option = SS_OPTIONS.find(item => item[1] === "--cgroup");
  assert.equal(option[3], "process");
});

test("default prefs collapse guided checklist by default", () => {
  assert.equal(prefsDefault.guidedChecklistCollapsed, true);
});

test("default dashboard preset points to an expert preset", () => {
  assert.ok(DASHBOARD_PRESETS[prefsDefault.defaultDashboardPreset]);
});

test("ten minute sample emits 600 timestamp markers", () => {
  const count = (generateTenMinuteSample().match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z/g) || []).length;
  assert.equal(count, 600);
});

test("ten minute sample keeps repeated listener inventory", () => {
  const count = (generateTenMinuteSample().match(/LISTEN 0 4096 0\.0\.0\.0:443/g) || []).length;
  assert.equal(count, 600);
});

test("microburst sample reaches critical receive memory levels", () => {
  const values = Array.from(generateMicroburstSample().matchAll(/skmem:\(r(\d+),/g), match => Number(match[1]));
  assert.ok(Math.max(...values) >= 524288);
});

test("microburst sample contains cumulative socket drops", () => {
  const values = Array.from(generateMicroburstSample().matchAll(/,d(\d+)\)/g), match => Number(match[1]));
  assert.ok(Math.max(...values) > 0);
});

test("tail latency sample includes active backoff window", () => {
  assert.match(generateTailLatencySample(), /backoff:1/);
});

test("tail latency sample targets the worst-window peer", () => {
  assert.match(generateTailLatencySample(), /\[::ffff:160\.43\.172\.2\]:8228/);
});

test("all built-in samples start with the ss header line", () => {
  for (const sample of [generateTenMinuteSample(), generateMicroburstSample(), generateTailLatencySample()]) {
    assert.equal(sample.split("\n")[0], "State Recv-Q Send-Q Local Address:Port Peer Address:Port Process");
  }
});

test("advanced search with empty text matches every socket", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443");
  assert.equal(socketMatchesAdvancedQuery(socket, "", deps), true);
});

test("advanced search parses a quoted plain token as lowercase plain text", () => {
  assert.deepEqual(parseAdvancedSearch('"Java Worker"'), [{ type: "plain", value: "java worker" }]);
});

test("advanced search normalizes colon operators to equals", () => {
  assert.deepEqual(parseAdvancedSearch("risk:high"), [{ type: "field", key: "risk", op: "=", value: "high" }]);
});

test("advanced search keeps dotted metric keys intact", () => {
  assert.deepEqual(parseAdvancedSearch("skmem.d>5"), [{ type: "field", key: "skmem.d", op: ">", value: "5" }]);
});

test("advanced search compares severity with less-than operators", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:200/10");
  socket.risk = "medium";
  assert.equal(socketMatchesAdvancedQuery(socket, "risk<critical", deps), true);
});

test("advanced search compares numeric RTT thresholds", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:220/10");
  assert.equal(socketMatchesAdvancedQuery(socket, "rtt>100", deps), true);
});

test("advanced search rejects numeric RTT thresholds when not met", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:22/2");
  assert.equal(socketMatchesAdvancedQuery(socket, "rtt>100", deps), false);
});

test("advanced search matches partial process names", () => {
  const socket = socketFrom('ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 users:(("java-worker",pid=12,fd=3))');
  assert.equal(socketMatchesAdvancedQuery(socket, "process=java", deps), true);
});

test("advanced search supports numeric PID equality", () => {
  const socket = socketFrom('ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 users:(("java",pid=345,fd=3))');
  assert.equal(socketMatchesAdvancedQuery(socket, "pid=345", deps), true);
});

test("advanced search matches source IP aliases", () => {
  const socket = socketFrom("ESTAB 0 0 10.10.0.5:1000 10.0.0.2:443");
  assert.equal(socketMatchesAdvancedQuery(socket, "srcip=10.10.0.5", deps), true);
});

test("advanced search matches destination IP aliases", () => {
  const socket = socketFrom("ESTAB 0 0 10.10.0.5:1000 198.51.100.77:443");
  assert.equal(socketMatchesAdvancedQuery(socket, "dstip=198.51.100.77", deps), true);
});

test("advanced search matches source port fields", () => {
  const socket = socketFrom("ESTAB 0 0 10.10.0.5:18000 198.51.100.77:443");
  assert.equal(socketMatchesAdvancedQuery(socket, "srcport=18000", deps), true);
});

test("advanced search matches destination port fields", () => {
  const socket = socketFrom("ESTAB 0 0 10.10.0.5:18000 198.51.100.77:443");
  assert.equal(socketMatchesAdvancedQuery(socket, "dstport=443", deps), true);
});

test("advanced search rejects destination port mismatches", () => {
  const socket = socketFrom("ESTAB 0 0 10.10.0.5:18000 198.51.100.77:443");
  assert.equal(socketMatchesAdvancedQuery(socket, "dstport=8443", deps), false);
});

test("advanced search matches family aliases through proto", () => {
  const socket = socketFrom("ESTAB 0 0 10.10.0.5:18000 198.51.100.77:443");
  assert.equal(socketMatchesAdvancedQuery(socket, "proto=tcp", deps), true);
});

test("advanced search plain terms can match the raw line", () => {
  const socket = socketFrom("ESTAB 0 0 10.10.0.5:18000 198.51.100.77:443 cubic rtt:2/0.5");
  assert.equal(socketMatchesAdvancedQuery(socket, "cubic", deps), true);
});

test("advanced search can combine field and plain terms", () => {
  const socket = socketFrom('ESTAB 0 0 10.10.0.5:18000 198.51.100.77:443 users:(("nginx",pid=41,fd=3)) rtt:2/0.5');
  assert.equal(socketMatchesAdvancedQuery(socket, "process=nginx 198.51.100.77", deps), true);
});

test("advanced search compares TX bandwidth through derived metrics", () => {
  const socket = socketFrom("ESTAB 0 0 10.10.0.5:18000 198.51.100.77:443", { tx_bps: 800000 });
  assert.equal(socketMatchesAdvancedQuery(socket, "tx>=500000", deps), true);
});

test("analysis marks moderate backoff as high severity", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 backoff:1");
  const finding = analyzeSocket(socket).find(item => item.metric === "backoff");
  assert.equal(finding.severity, "high");
});

test("analysis marks steep backoff as critical severity", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 backoff:3");
  const finding = analyzeSocket(socket).find(item => item.metric === "backoff");
  assert.equal(finding.severity, "critical");
});

test("analysis flags high RTO as high severity", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rto:1800");
  const finding = analyzeSocket(socket).find(item => item.metric === "rto");
  assert.equal(finding.severity, "high");
});

test("analysis marks RTT above 150 ms as medium", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:200/20");
  const finding = analyzeSocket(socket).find(item => item.metric === "rtt");
  assert.equal(finding.severity, "medium");
});

test("analysis marks RTT above 300 ms as high", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:320/20");
  const finding = analyzeSocket(socket).find(item => item.metric === "rtt");
  assert.equal(finding.severity, "high");
});

test("analysis flags low cwnd on established flows", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 cwnd:4");
  const finding = analyzeSocket(socket).find(item => item.metric === "cwnd");
  assert.equal(finding.severity, "medium");
});

test("analysis does not flag cwnd on listening sockets", () => {
  const socket = socketFrom("LISTEN 0 0 0.0.0.0:443 0.0.0.0:* cwnd:2");
  const finding = analyzeSocket(socket).find(item => item.metric === "cwnd");
  assert.equal(finding, undefined);
});

test("analysis marks send queue above warning as high", () => {
  const socket = socketFrom("ESTAB 0 300000 10.0.0.1:1000 10.0.0.2:443");
  const finding = analyzeSocket(socket).find(item => item.metric === "sendQ");
  assert.equal(finding.severity, "high");
});

test("analysis ignores send queue below warning threshold", () => {
  const socket = socketFrom("ESTAB 0 200000 10.0.0.1:1000 10.0.0.2:443");
  const finding = analyzeSocket(socket).find(item => item.metric === "sendQ");
  assert.equal(finding, undefined);
});

test("analysis flags receive buffer pressure above eighty percent", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r210,rb240,t0,tb100,f0,w0,o0,bl0,d0)");
  const finding = analyzeSocket(socket).find(item => item.metric === "skmem.r");
  assert.equal(finding.severity, "high");
});

test("analysis flags send buffer pressure above eighty percent", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb240,t120,tb140,f0,w10,o0,bl0,d0)");
  const finding = analyzeSocket(socket).find(item => item.metric === "skmem.t");
  assert.equal(finding.severity, "high");
});

test("analysis does not flag tiny MSS when PMTU is already small", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 mss:536 advmss:536 rcvmss:536 pmtu:576");
  const finding = analyzeSocket(socket).find(item => item.metric === "mss");
  assert.equal(finding, undefined);
});

test("analysis does not expose loopback listeners as globally exposed", () => {
  const socket = socketFrom('LISTEN 0 128 127.0.0.1:22 0.0.0.0:* users:(("sshd",pid=100,fd=3))');
  const finding = analyzeSocket(socket).find(item => item.metric === "listen");
  assert.equal(finding, undefined);
});

test("analysis marks missing process owner on listeners as low severity", () => {
  const socket = socketFrom("LISTEN 0 128 0.0.0.0:443 0.0.0.0:*");
  const finding = analyzeSocket(socket).find(item => item.metric === "process");
  assert.equal(finding.severity, "low");
});

test("analysis risk keeps the highest severity across multiple findings", () => {
  const socket = socketFrom("ESTAB 600000 1200000 10.0.0.1:1000 10.0.0.2:443 backoff:3 rto:1800");
  assert.equal(riskForSocket(socket), "critical");
});

test("analysis marks retransmission timers with three retries as high", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 timer:(on,1sec,3)");
  const finding = analyzeSocket(socket).find(item => item.metric === "timer");
  assert.equal(finding.severity, "high");
});

test("analysis marks retransmission timers with one retry as medium", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 timer:(on,1sec,1)");
  const finding = analyzeSocket(socket).find(item => item.metric === "timer");
  assert.equal(finding.severity, "medium");
});

test("dashboard snapshot trims the saved name", () => {
  const state = profileState();
  const snap = dashboardSnapshot(state, "  War room  ");
  assert.equal(snap.name, "War room");
});

test("dashboard snapshot clones chart metrics instead of reusing references", () => {
  const state = profileState();
  const snap = dashboardSnapshot(state, "Latency");
  state.chartMetrics.push("rto");
  assert.deepEqual(snap.chartMetrics, ["rtt"]);
});

test("apply dashboard profile ignores missing profiles", () => {
  const state = profileState();
  applyDashboardProfile(state, null, () => ["rtt", "rto"]);
  assert.deepEqual(state.chartMetrics, ["rtt"]);
});

test("apply dashboard profile falls back to default metrics when none survive filtering", () => {
  const state = profileState();
  applyDashboardProfile(state, { chartMetrics: ["unknown"] }, () => ["rtt"]);
  assert.deepEqual(state.chartMetrics, ["rtt", "rto", "sendQ", "recvQ"]);
});

test("apply dashboard profile merges correlation axes", () => {
  const state = profileState();
  applyDashboardProfile(state, { correlation: { y: "recvQ" } }, () => ["rtt", "recvQ"]);
  assert.deepEqual(state.correlation, { x: "rtt", y: "recvQ" });
});

test("apply dashboard profile extends panel order without duplicates", () => {
  const state = profileState();
  applyDashboardProfile(state, { chartLayout: { panelOrder: ["sendQ"] } }, () => ["rtt", "sendQ"]);
  assert.deepEqual(state.prefs.chartLayout.panelOrder, ["sendQ", "rtt"]);
});

test("apply dashboard preset ignores unknown preset ids", () => {
  const state = profileState();
  applyDashboardPreset(state, "unknown", () => ["rtt", "rto"]);
  assert.deepEqual(state.chartMetrics, ["rtt"]);
});

test("apply analysis template ignores unknown template ids", () => {
  const state = profileState();
  applyAnalysisTemplate(state, "unknown", ["risk", "state"], () => ["rtt"]);
  assert.equal(state.activeTab, "advisor");
});

test("apply analysis template filters visible columns to available ones", () => {
  const state = profileState();
  applyAnalysisTemplate(state, "web", ["risk", "state", "local", "peer"], () => ["rtt"]);
  assert.deepEqual(state.table.visible, ["risk", "state", "local", "peer"]);
});

test("apply analysis template opens conversations for non-kubernetes templates", () => {
  const state = profileState();
  applyAnalysisTemplate(state, "web", ["risk", "state", "local", "peer", "process", "recvQ", "sendQ", "rtt", "rto", "family", "cwnd", "skmem.t", "skmem.d"], () => ["sendQ", "recvQ", "rtt", "rto", "tx_bps", "rx_bps", "cwnd", "skmem.d"]);
  assert.equal(state.activeTab, "conversations");
});

test("toggleCommandOption removes an active ss flag", () => {
  assert.equal(toggleCommandOption("ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all", "-H", false), "ss -O -n -t -e -p -m -i --tos --cgroup --inet-sockopt -a -A all");
});

test("toggleCommandOption adds a missing ss flag", () => {
  assert.equal(toggleCommandOption("ss -H -n -a", "-p", true), "ss -H -n -a -p");
});

test("toggleCommandOption does not duplicate an already active flag", () => {
  assert.equal(toggleCommandOption("ss -H -n -a", "-n", true), "ss -H -n -a");
});


test("command coverage detects compact and long ss options", () => {
  const coverage = commandCoverage("ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all", SS_OPTIONS);
  const active = key => coverage.find(item => (item.short || item.long) === key)?.active;
  assert.equal(active("-H"), true);
  assert.equal(active("-O"), true);
  assert.equal(active("-n"), true);
  assert.equal(active("-t"), true);
  assert.equal(active("-e"), true);
  assert.equal(active("-p"), true);
  assert.equal(active("-m"), true);
  assert.equal(active("-i"), true);
  assert.equal(active("--tos"), true);
  assert.equal(active("--cgroup"), true);
  assert.equal(active("--inet-sockopt"), true);
  assert.equal(active("-a"), true);
  assert.equal(active("-A"), true);
});
