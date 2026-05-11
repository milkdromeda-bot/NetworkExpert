import assert from "node:assert/strict";
import { test } from "node:test";

import { analyzeAll } from "../src/analysis.js";
import { buildDiagnosticHypotheses } from "../src/diagnostics.js";
import { parseSs } from "../src/parser.js";
import { withStableSocketIds } from "../src/timeline.js";

const thresholds = {
  sendQ: { warn: 262144, danger: 1048576 },
  recvQ: { warn: 131072, danger: 524288 },
  rto: { warn: 1000, danger: 3000 },
  cwnd: { warn: 4 },
  "skmem.d": { danger: 10 }
};

function socketsFrom(lines) {
  return withStableSocketIds(parseSs(Array.isArray(lines) ? lines.join("\n") : lines));
}

function diagnose(lines, options = {}) {
  const sockets = socketsFrom(lines);
  return buildDiagnosticHypotheses({
    sockets,
    anomalies: options.anomalies ?? analyzeAll(sockets),
    history: options.history || [],
    thresholds
  });
}

function byId(hypotheses, id) {
  return hypotheses.find(item => item.id === id);
}

test("diagnostics detects local application read pressure from Recv-Q", () => {
  const hypotheses = diagnose("ESTAB 700000 0 10.0.0.1:9200 10.0.0.2:54321 users:((\"java\",pid=42,fd=9)) skmem:(r600000,rb700000,t0,tb100,w0,d0) rtt:2/0.2");

  const local = byId(hypotheses, "local-app-not-reading");

  assert.equal(local.severity, "critical");
  assert.equal(local.confidence, "high");
  assert.match(local.summary, /not draining/i);
  assert.equal(local.processes.includes("java:42"), true);
});

test("diagnostics detects peer slow consumer or egress bottleneck from Send-Q", () => {
  const hypotheses = diagnose("ESTAB 0 1400000 10.0.0.1:9200 10.0.0.2:443 users:((\"nginx\",pid=12,fd=3)) skmem:(r0,rb100,t900000,tb1000000,w0,d0) rto:200 rtt:10/1 cwnd:10");

  const peer = byId(hypotheses, "peer-slow-consumer-or-egress");

  assert.equal(peer.severity, "critical");
  assert.equal(peer.confidence, "medium");
  assert.match(peer.summary, /sender is blocked/i);
  assert.equal(peer.commands.some(command => command.includes("ip route get")), true);
});

test("diagnostics raises egress confidence when Send-Q is paired with RTO recovery", () => {
  const hypotheses = diagnose("ESTAB 0 400000 10.0.0.1:9200 10.0.0.2:443 timer:(on,1sec,2) rto:1300 backoff:1 rtt:200/50 cwnd:3");

  const peer = byId(hypotheses, "peer-slow-consumer-or-egress");
  const path = byId(hypotheses, "path-congestion-or-loss");

  assert.equal(peer.confidence, "high");
  assert.equal(path.severity, "high");
  assert.equal(path.evidence.some(item => item.includes("RTO")), true);
});

test("diagnostics detects critical path congestion on high RTO and backoff", () => {
  const hypotheses = diagnose("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 timer:(on,1sec,3) rto:5000 backoff:2 rtt:500/200 cwnd:2");

  const path = byId(hypotheses, "path-congestion-or-loss");

  assert.equal(path.severity, "critical");
  assert.equal(path.confidence, "high");
  assert.equal(path.commands.some(command => command.includes("tracepath")), true);
});

test("diagnostics detects socket memory pressure from skmem drops", () => {
  const hypotheses = diagnose("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb100,t0,tb100,w0,d25)");

  const pressure = byId(hypotheses, "socket-memory-pressure");

  assert.equal(pressure.severity, "critical");
  assert.match(pressure.counterEvidence.join(" "), /does not prove NIC ring/i);
  assert.equal(pressure.commands.some(command => command.includes("softnet_stat")), true);
});

test("diagnostics increases drop confidence when history shows growth", () => {
  const hypotheses = diagnose(
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb100,t0,tb100,w0,d1)",
    { history: [{ epochMs: 1000, "skmem.d": 1 }, { epochMs: 2000, "skmem.d": 12 }] }
  );

  const pressure = byId(hypotheses, "socket-memory-pressure");

  assert.equal(pressure.confidence, "high");
  assert.equal(pressure.evidence.some(item => item.includes("increased by 11")), true);
});

test("diagnostics detects CLOSE-WAIT leak candidates", () => {
  const lines = Array.from({ length: 25 }, (_, index) => `CLOSE-WAIT 0 0 10.0.0.1:${3000 + index} 10.0.0.2:443 users:((\"api\",pid=77,fd=${index + 3}))`);

  const closeWait = byId(diagnose(lines), "close-wait-leak");

  assert.equal(closeWait.severity, "high");
  assert.equal(closeWait.confidence, "high");
  assert.match(closeWait.summary, /has not closed/i);
});

test("diagnostics detects TIME-WAIT concentration", () => {
  const lines = Array.from({ length: 120 }, (_, index) => `TIME-WAIT 0 0 10.0.0.1:${4000 + index} 10.0.0.2:443`);

  const timeWait = byId(diagnose(lines), "time-wait-flood");

  assert.equal(timeWait.severity, "medium");
  assert.match(timeWait.summary, /connection churn/i);
});

test("diagnostics detects wildcard listener exposure", () => {
  const hypotheses = diagnose("LISTEN 0 128 0.0.0.0:22 0.0.0.0:* users:((\"sshd\",pid=100,fd=3))");

  const exposure = byId(hypotheses, "listener-exposure");

  assert.equal(exposure.severity, "medium");
  assert.match(exposure.summary, /all interfaces/i);
  assert.equal(exposure.commands.some(command => command.includes("nft")), true);
});

test("diagnostics returns low confidence no-dominant finding for clean captures", () => {
  const hypotheses = diagnose("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 users:((\"curl\",pid=9,fd=4)) rtt:1/0.1 cwnd:10");

  assert.equal(hypotheses[0].id, "no-dominant-bottleneck");
  assert.equal(hypotheses[0].severity, "low");
  assert.match(hypotheses[0].counterEvidence.join(" "), /single snapshot/i);
});

test("diagnostics returns a collection hint when no sockets are loaded", () => {
  const hypotheses = buildDiagnosticHypotheses({ sockets: [], thresholds });

  assert.equal(hypotheses[0].id, "no-data");
  assert.equal(hypotheses[0].commands[0].includes("ss -HOntepmi"), true);
});

test("diagnostics sorts high-confidence severe hypotheses first", () => {
  const hypotheses = diagnose([
    "ESTAB 700000 0 10.0.0.1:9200 10.0.0.2:54321 skmem:(r600000,rb700000,t0,tb100,w0,d0)",
    "ESTAB 0 400000 10.0.0.1:1000 10.0.0.3:443 timer:(on,1sec,3) rto:5000 backoff:2 cwnd:2",
    "LISTEN 0 128 0.0.0.0:22 0.0.0.0:*"
  ]);

  assert.equal(hypotheses[0].severity, "critical");
  assert.notEqual(hypotheses[0].id, "listener-exposure");
});
