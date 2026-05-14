import assert from "node:assert/strict";
import { test } from "node:test";

import { buildAnomaliesCsv, buildEvidenceManifest, buildTimelinePayload, buildTopSocketsCsv, safeEvidenceFileName } from "../../src/evidence-pack.js";

test("safe evidence filenames normalize mixed input", () => {
  assert.equal(safeEvidenceFileName("My Capture 01 / Paris"), "my-capture-01-paris");
});

test("timeline payload keeps annotations and points", () => {
  const payload = buildTimelinePayload([{ epochMs: 1, rtt: 2 }], { sourceName: "sample", timezone: "Europe/Paris", filters: ["risk:high"], annotations: [{ id: "a1" }] });
  assert.equal(payload.sourceName, "sample");
  assert.equal(payload.points.length, 1);
  assert.equal(payload.annotations.length, 1);
});

test("anomalies csv includes socket flow and process", () => {
  const csv = buildAnomaliesCsv([
    { socketId: "s1", severity: "critical", title: "Socket drops", metric: "skmem.d", detail: "Drops growing" }
  ], {
    s1: { local: "10.0.0.1:443", peer: "10.0.0.2:55144", risk: "critical", sendQ: 42, recvQ: 12, details: { process: { name: "nginx", pid: 12 } } }
  }, {
    metricLabel: metric => metric,
    formatMetricValue: (_metric, value) => String(value)
  });
  assert.match(csv, /10\.0\.0\.1:443 -> 10\.0\.0\.2:55144/);
  assert.match(csv, /nginx:12/);
});

test("top sockets csv includes bandwidth and queue metrics", () => {
  const csv = buildTopSocketsCsv([
    { risk: "high", family: "tcp", state: "ESTAB", local: "a", peer: "b", anomalyCount: 2, sendQ: 10, recvQ: 5, details: { process: { name: "java", pid: 7 } } }
  ], {
    metricValue: (_socket, metric) => ({ rtt: 3, rto: 200, "skmem.d": 1 }[metric] || 0),
    socketBandwidth: (_socket, metric) => ({ tx_bps: 1000, rx_bps: 2000 }[metric] || 0),
    formatMetricValue: (_metric, value) => String(value)
  });
  assert.match(csv, /java:7/);
  assert.match(csv, /1000/);
  assert.match(csv, /2000/);
});

test("evidence manifest explains printable report workflow", () => {
  const manifest = buildEvidenceManifest({ sourceName: "sample", visibleSockets: 12, anomalyCount: 3, chartCount: 4, annotationCount: 2 });
  assert.match(manifest, /incident-report\.pdf/);
  assert.match(manifest, /incident-report\.html/);
});

