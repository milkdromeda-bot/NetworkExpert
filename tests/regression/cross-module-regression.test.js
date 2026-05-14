import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAddress, parseDuration, parseNumber, parseSs, parseTimestampLine, metricValue, inferFamily, stripAnsi } from "../../src/parser.js";
import { analyzeSocket, applyRisks, riskForSocket } from "../../src/analysis.js";
import { socketKey, stableSocketId, withStableSocketIds, timestampBlocks, aggregateParsedSocketsByKey } from "../../src/timeline.js";
import { endpointMatchesPattern, topologyGroupForEndpoint, topologyScopeKey } from "../../src/topology.js";
import { inferApplicationService } from "../../src/services.js";
import { endpointAliasKey, normalizeAliasStore, upsertEndpointAlias, aliasForEndpoint } from "../../src/aliases.js";
import { clampZoomRange, nextZoomRange } from "../../src/chart-zoom.js";

function socketFrom(line) {
  return withStableSocketIds(parseSs(line))[0];
}

// Cross-module: parser + analysis
test("regression: high RTT socket gets correct risk from full pipeline", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:500/50 cwnd:21");
  socket.details.process = { name: "app", pid: 1, fd: 1 };
  assert.equal(riskForSocket(socket), "high");
});
test("regression: clean socket with process has no anomalies", () => {
  const socket = socketFrom('ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:5/0.5 cwnd:21 users:(("app",pid=1,fd=1))');
  assert.equal(analyzeSocket(socket).length, 0);
});
test("regression: drops + high RTT yields critical risk", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:400/50 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d20)");
  assert.equal(riskForSocket(socket), "critical");
});

// Cross-module: parser + timeline
test("regression: timestamped capture produces stable ids across parse", () => {
  const raw = "--- 2026-01-01 00:00:00 ---\nESTAB 0 0 10.0.0.1:80 10.0.0.2:443 rtt:1/0.1\n--- 2026-01-01 00:00:01 ---\nESTAB 0 0 10.0.0.1:80 10.0.0.2:443 rtt:2/0.2";
  const blocks = timestampBlocks(raw);
  assert.equal(blocks.length, 2);
  const sockets1 = withStableSocketIds(parseSs(blocks[0].lines.join("\n")));
  const sockets2 = withStableSocketIds(parseSs(blocks[1].lines.join("\n")));
  assert.equal(sockets1[0].id, sockets2[0].id);
});
test("regression: aggregation counts observations correctly", () => {
  const sockets = parseSs("ESTAB 0 0 10.0.0.1:80 10.0.0.2:443\nESTAB 0 0 10.0.0.1:80 10.0.0.2:443\nESTAB 0 0 10.0.0.1:80 10.0.0.2:443");
  const aggregated = aggregateParsedSocketsByKey(sockets);
  assert.equal(aggregated[0].snapshotCount, 3);
});

// Cross-module: parser + services
test("regression: service detection works on parsed socket", () => {
  const [socket] = parseSs("ESTAB 0 0 10.0.0.1:55555 10.0.0.2:443 rtt:1/0.1");
  const app = inferApplicationService(socket);
  assert.equal(app.label, "HTTPS/TLS");
});
test("regression: service detection on LISTEN socket", () => {
  const [socket] = parseSs("LISTEN 0 128 0.0.0.0:22 0.0.0.0:*");
  const app = inferApplicationService(socket);
  assert.equal(app.label, "SSH");
});

// Cross-module: topology + parser
test("regression: topology matches parsed endpoint", () => {
  const [socket] = parseSs("ESTAB 0 0 192.168.1.10:50000 192.168.1.20:3306 rtt:1/0.1");
  const profile = { groups: [{ name: "DB", match: "192.168.1.20" }] };
  const group = topologyGroupForEndpoint(profile, socket.peer);
  assert.equal(group.name, "DB");
});

// Cross-module: aliases + parser
test("regression: alias key works with parsed endpoint", () => {
  const [socket] = parseSs("ESTAB 0 0 10.0.0.1:55555 10.0.0.2:443 rtt:1/0.1");
  const key = endpointAliasKey(socket.peer);
  assert.equal(key, "endpoint:10.0.0.2:443");
});
test("regression: alias lookup works after upsert", () => {
  const [socket] = parseSs("ESTAB 0 0 10.0.0.1:55555 10.0.0.2:443 rtt:1/0.1");
  const store = upsertEndpointAlias({}, socket.peer, { label: "Gateway" }, 100);
  const alias = aliasForEndpoint(store, socket.peer);
  assert.equal(alias.label, "Gateway");
});

// Cross-module: chart-zoom stability
test("regression: repeated zoomIn converges to minimum span", () => {
  let zoom = { start: 0, end: 1 };
  for (let i = 0; i < 50; i++) zoom = nextZoomRange(zoom, "zoomIn");
  assert.ok(zoom.end - zoom.start >= 0.02);
  assert.ok(zoom.start >= 0);
  assert.ok(zoom.end <= 1);
});
test("regression: repeated zoomOut converges to full range", () => {
  let zoom = { start: 0.4, end: 0.6 };
  for (let i = 0; i < 50; i++) zoom = nextZoomRange(zoom, "zoomOut");
  assert.ok(zoom.end - zoom.start >= 0.98);
});
test("regression: alternating pan does not drift out of bounds", () => {
  let zoom = { start: 0.3, end: 0.7 };
  for (let i = 0; i < 100; i++) {
    zoom = nextZoomRange(zoom, i % 2 === 0 ? "panLeft" : "panRight");
    assert.ok(zoom.start >= 0);
    assert.ok(zoom.end <= 1);
  }
});

// Cross-module: applyRisks + timeline
test("regression: applyRisks works on timestamped aggregated sockets", () => {
  const raw = "--- 2026-01-01 00:00:00 ---\nESTAB 0 300000 10.0.0.1:80 10.0.0.2:443 rtt:1/0.1";
  const blocks = timestampBlocks(raw);
  const sockets = withStableSocketIds(parseSs(blocks[0].lines.join("\n")));
  const result = applyRisks(sockets);
  assert.ok(result[0].risk);
});

// Generated: parseNumber with various rate formats
const rateFormats = [
  { input: "1kbps", expected: 1000 },
  { input: "10kbps", expected: 10000 },
  { input: "100kbps", expected: 100000 },
  { input: "1Mbps", expected: 1000000 },
  { input: "10Mbps", expected: 10000000 },
  { input: "100Mbps", expected: 100000000 },
  { input: "1Gbps", expected: 1000000000 },
  { input: "2.5Gbps", expected: 2500000000 },
  { input: "500bps", expected: 500 },
  { input: "0bps", expected: 0 }
];
for (const { input, expected } of rateFormats) {
  test(`regression: parseNumber("${input}") = ${expected}`, () => {
    assert.equal(parseNumber(input), expected);
  });
}

// Generated: parseDuration with various units
const durationFormats = [
  { input: "100us", expected: 0.1 },
  { input: "1000us", expected: 1 },
  { input: "500ms", expected: 500 },
  { input: "1000ms", expected: 1000 },
  { input: "1s", expected: 1000 },
  { input: "60s", expected: 60000 },
  { input: "1min", expected: 60000 },
  { input: "5min", expected: 300000 },
  { input: "1hour", expected: 3600000 },
  { input: "2hour", expected: 7200000 }
];
for (const { input, expected } of durationFormats) {
  test(`regression: parseDuration("${input}") = ${expected}`, () => {
    assert.equal(parseDuration(input), expected);
  });
}
