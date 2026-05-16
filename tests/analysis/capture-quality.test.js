import assert from "node:assert/strict";
import { test } from "node:test";

import { analyzeCaptureQuality, captureQualityGrade } from "../../src/capture-quality.js";

const FULL_COMMAND = "while true; do date --iso-8601=ns; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep 1; done | tee -a '/tmp/networkexpert_ss_20260515_143152.log'";

function fullSnapshot(timestamp, bytesReceived = 1000, recvQ = 0) {
  return `${timestamp}
tcp ESTAB ${recvQ} 0 10.0.0.10:50000 10.0.0.20:443 users:(("java",pid=42,fd=7)) timer:(keepalive,116min,0) uid:1002 ino:12345 sk:abc cgroup:/user.slice/session.scope <-> tos:0 class_id:0 inet-sockopt: ( is_icsk mc_loop mc_all) skmem:(r${recvQ},rb4225792,t0,tb870400,f1280,w0,o0,bl0,d0) ts sack cubic wscale:7,7 rto:201 rtt:0.051/0.009 ato:40 mss:1448 pmtu:1500 rcvmss:1448 advmss:1448 cwnd:10 bytes_sent:1578545 bytes_retrans:0 bytes_acked:1576208 bytes_received:${bytesReceived} segs_out:6442824 segs_in:15349402 send 2271372549bps pacing_rate 4487748184bps delivery_rate 827428568bps delivered:2893 app_limited rwnd_limited:625ms(86.7%) retrans:0/0 rcv_rtt:0.59 rcv_space:245059 rcv_ssthresh:1171997 minrtt:0.018`;
}

function fullCapture() {
  return [
    fullSnapshot("2026-05-15T10:37:15,409215418+00:00", 1000),
    fullSnapshot("2026-05-15T10:37:26,409215418+00:00", 2000),
    fullSnapshot("2026-05-15T10:37:37,409215418+00:00", 3000)
  ].join("\n");
}

test("capture quality reports excellent evidence for timestamped expert ss collection", () => {
  const report = analyzeCaptureQuality({ raw: fullCapture(), command: FULL_COMMAND, sourceName: "incident.log", now: new Date("2026-05-16T10:11:12Z") });

  assert.equal(report.grade, "excellent");
  assert.equal(report.score >= 85, true);
  assert.equal(report.metrics.snapshotCount, 3);
  assert.equal(report.metrics.durationMs, 22_000);
  assert.equal(report.metrics.highPrecisionTimestamps, true);
  assert.equal(report.featureCards.every(card => card.status !== "missing"), true);
  assert.match(report.recommendedCommand, /networkexpert_ss_20260516_121112\.log/);
});

test("capture quality flags a single untimestamped snapshot as poor", () => {
  const raw = "tcp ESTAB 0 0 10.0.0.10:50000 10.0.0.20:443 cubic rtt:1/0.1";
  const report = analyzeCaptureQuality({ raw, command: "ss -ti" });

  assert.equal(report.grade, "poor");
  assert.equal(report.metrics.snapshotCount, 0);
  assert.equal(report.missing.some(item => item.includes("Timestamped snapshots")), true);
  assert.equal(report.recommendations.some(item => item.includes("date --iso-8601=ns")), true);
});

test("capture quality treats two snapshots as partial trend evidence", () => {
  const raw = [
    fullSnapshot("2026-05-15T10:37:15,409+00:00", 1000),
    fullSnapshot("2026-05-15T10:37:16,409+00:00", 2000)
  ].join("\n");
  const report = analyzeCaptureQuality({ raw, command: FULL_COMMAND });
  const depth = report.featureCards.find(card => card.key === "snapshotDepth");

  assert.equal(depth.status, "partial");
  assert.equal(report.warnings.some(item => item.includes("Repeated samples")), true);
});

test("capture quality detects unstable cadence", () => {
  const raw = [
    fullSnapshot("2026-05-15T10:37:15,000+00:00", 1000),
    fullSnapshot("2026-05-15T10:37:16,000+00:00", 2000),
    fullSnapshot("2026-05-15T10:37:30,000+00:00", 3000)
  ].join("\n");
  const report = analyzeCaptureQuality({ raw, command: FULL_COMMAND });
  const cadence = report.featureCards.find(card => card.key === "cadence");

  assert.equal(cadence.status, "partial");
  assert.match(cadence.detail, /Median interval/);
});

test("capture quality warns when tee is paired with very fast interval", () => {
  const report = analyzeCaptureQuality({
    raw: fullCapture(),
    command: "while true; do date --iso-8601=ns; ss -HOntepmi -a -A all; sleep 0.01; done | tee -a '/tmp/out.log'"
  });

  assert.equal(report.warnings.some(item => item.includes("tee can distort cadence")), true);
  assert.equal(report.recommendations.some(item => item.includes("0.05s or faster")), true);
});

test("capture quality marks missing skmem and timer fields", () => {
  const raw = `2026-05-15T10:37:15,000+00:00
tcp ESTAB 0 0 10.0.0.10:50000 10.0.0.20:443 cubic rtt:1/0.1 cwnd:10 bytes_sent:1 bytes_received:2
2026-05-15T10:37:16,000+00:00
tcp ESTAB 0 0 10.0.0.10:50000 10.0.0.20:443 cubic rtt:1/0.1 cwnd:10 bytes_sent:2 bytes_received:4
2026-05-15T10:37:17,000+00:00
tcp ESTAB 0 0 10.0.0.10:50000 10.0.0.20:443 cubic rtt:1/0.1 cwnd:10 bytes_sent:3 bytes_received:6`;
  const report = analyzeCaptureQuality({ raw, command: "while true; do date --iso-8601=ns; ss -Hnti; sleep 1; done" });

  assert.equal(report.featureCards.find(card => card.key === "socketMemory").status, "missing");
  assert.equal(report.featureCards.find(card => card.key === "timers").status, "missing");
  assert.equal(report.missing.some(item => item.includes("Socket memory")), true);
});

test("capture quality detects process owner and kernel identity", () => {
  const report = analyzeCaptureQuality({ raw: fullCapture(), command: FULL_COMMAND });

  assert.equal(report.featureCards.find(card => card.key === "process").status, "ok");
  assert.equal(report.featureCards.find(card => card.key === "identity").status, "ok");
});

test("capture quality detects extended context from raw even if command is unknown", () => {
  const report = analyzeCaptureQuality({ raw: fullCapture(), command: "" });

  assert.equal(report.featureCards.find(card => card.key === "cgroup").status, "ok");
  assert.equal(report.featureCards.find(card => card.key === "extendedContext").status, "ok");
});

test("capture quality exposes observed rate rows", () => {
  const report = analyzeCaptureQuality({ raw: fullCapture(), command: FULL_COMMAND });

  assert.equal(report.metrics.observedRateRows >= 3, true);
  assert.equal(report.strengths.some(item => item.includes("TCP internals")), true);
});

test("capture quality returns bounded grade labels", () => {
  assert.equal(captureQualityGrade(100), "excellent");
  assert.equal(captureQualityGrade(70), "good");
  assert.equal(captureQualityGrade(55), "usable");
  assert.equal(captureQualityGrade(35), "weak");
  assert.equal(captureQualityGrade(0), "poor");
});

test("capture quality keeps limits explicit and cautious", () => {
  const report = analyzeCaptureQuality({ raw: fullCapture(), command: FULL_COMMAND });

  assert.equal(report.limits.some(item => item.includes("does not prove root cause")), true);
  assert.equal(report.limits.some(item => item.includes("Do not infer physical link capacity")), true);
});

test("capture quality handles empty workspace without throwing", () => {
  const report = analyzeCaptureQuality();

  assert.equal(report.score, 0);
  assert.equal(report.grade, "poor");
  assert.equal(report.warnings.some(item => item.includes("No capture text")), true);
  assert.match(report.recommendedCommand, /ss -HOntepmi --tos --cgroup --inet-sockopt/);
});
