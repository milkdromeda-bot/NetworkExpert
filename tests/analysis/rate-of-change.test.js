import assert from "node:assert/strict";
import { test } from "node:test";

import { detectRateOfChange, RATE_METRICS } from "../../src/analysis/rate-of-change.js";

function snap(timestamp, sockets) {
  return [timestamp, ...sockets].join("\n");
}

function socket(recvQ = 0, sendQ = 0, extra = "") {
  return `tcp ESTAB ${recvQ} ${sendQ} 10.0.0.1:5000 10.0.0.2:443 users:(("java",pid=42,fd=7)) ino:12345 sk:abc skmem:(r0,rb4225792,t0,tb870400,f0,w0,o0,bl0,d0) rto:201 rtt:0.1/0.01 cwnd:10 ${extra}`;
}

test("rate-of-change returns empty for single snapshot", () => {
  const result = detectRateOfChange("2026-05-15T10:00:00,000+00:00\n" + socket(0, 0));
  assert.equal(result.length, 0);
});

test("rate-of-change detects Recv-Q velocity spike", () => {
  const raw = [
    snap("2026-05-15T10:00:00,000+00:00", [socket(0, 0)]),
    snap("2026-05-15T10:00:01,000+00:00", [socket(500000, 0)])
  ].join("\n");

  const result = detectRateOfChange(raw);
  const alert = result.find(a => a.metric === "recvQ");

  assert.notEqual(alert, undefined);
  assert.equal(alert.rate, 500000);
  assert.equal(alert.delta, 500000);
  assert.equal(alert.severity === "critical" || alert.severity === "high", true);
  assert.equal(alert.process, "java:42");
});

test("rate-of-change detects Send-Q velocity spike", () => {
  const raw = [
    snap("2026-05-15T10:00:00,000+00:00", [socket(0, 0)]),
    snap("2026-05-15T10:00:02,000+00:00", [socket(0, 600000)])
  ].join("\n");

  const result = detectRateOfChange(raw);
  const alert = result.find(a => a.metric === "sendQ");

  assert.notEqual(alert, undefined);
  assert.equal(alert.rate, 300000);
  assert.equal(alert.dtMs, 2000);
});

test("rate-of-change ignores decreasing values", () => {
  const raw = [
    snap("2026-05-15T10:00:00,000+00:00", [socket(500000, 0)]),
    snap("2026-05-15T10:00:01,000+00:00", [socket(0, 0)])
  ].join("\n");

  const result = detectRateOfChange(raw);
  assert.equal(result.filter(a => a.metric === "recvQ").length, 0);
});

test("rate-of-change ignores slow changes below threshold", () => {
  const raw = [
    snap("2026-05-15T10:00:00,000+00:00", [socket(0, 0)]),
    snap("2026-05-15T10:00:10,000+00:00", [socket(100000, 0)])
  ].join("\n");

  const result = detectRateOfChange(raw);
  assert.equal(result.filter(a => a.metric === "recvQ").length, 0);
});

test("rate-of-change respects custom thresholds", () => {
  const raw = [
    snap("2026-05-15T10:00:00,000+00:00", [socket(0, 0)]),
    snap("2026-05-15T10:00:01,000+00:00", [socket(50000, 0)])
  ].join("\n");

  const strict = detectRateOfChange(raw, { recvQ: { dangerRate: 10000 } });
  const relaxed = detectRateOfChange(raw, { recvQ: { dangerRate: 100000 } });

  assert.equal(strict.some(a => a.metric === "recvQ"), true);
  assert.equal(relaxed.some(a => a.metric === "recvQ"), false);
});

test("rate-of-change assigns severity based on rate magnitude", () => {
  const raw = [
    snap("2026-05-15T10:00:00,000+00:00", [socket(0, 0)]),
    snap("2026-05-15T10:00:01,000+00:00", [socket(1000000, 0)])
  ].join("\n");

  const result = detectRateOfChange(raw);
  const alert = result.find(a => a.metric === "recvQ");

  assert.equal(alert.severity, "critical");
});

test("rate-of-change formats rate with human units", () => {
  const raw = [
    snap("2026-05-15T10:00:00,000+00:00", [socket(0, 0)]),
    snap("2026-05-15T10:00:01,000+00:00", [socket(2000000, 0)])
  ].join("\n");

  const result = detectRateOfChange(raw);
  const alert = result.find(a => a.metric === "recvQ");

  assert.equal(alert.rateFormatted.includes("MB/s"), true);
});

test("rate-of-change keeps worst per socket+metric", () => {
  const raw = [
    snap("2026-05-15T10:00:00,000+00:00", [socket(0, 0)]),
    snap("2026-05-15T10:00:01,000+00:00", [socket(300000, 0)]),
    snap("2026-05-15T10:00:02,000+00:00", [socket(900000, 0)])
  ].join("\n");

  const result = detectRateOfChange(raw);
  const recvAlerts = result.filter(a => a.metric === "recvQ");

  assert.equal(recvAlerts.length, 1);
  assert.equal(recvAlerts[0].rate, 600000);
});

test("rate-of-change exposes RATE_METRICS", () => {
  assert.equal(Array.isArray(RATE_METRICS), true);
  assert.equal(RATE_METRICS.length >= 5, true);
});
