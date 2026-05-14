import assert from "node:assert/strict";
import { test } from "node:test";
import { detectTailLatencyLens } from "../../src/tail-latency.js";

const thresholds = {
  rtt: { warn: 150, danger: 300 },
  rttvar: { warn: 80, danger: 200 },
  rto: { warn: 1000, danger: 3000 },
  sendQ: { warn: 262144, danger: 1048576 },
  recvQ: { warn: 131072, danger: 524288 },
  dropRate: { warn: 0.1, danger: 1 }
};

test("detectTailLatencyLens finds the worst short tail window", () => {
  const lens = detectTailLatencyLens([
    { epochMs: 0, socketPresent: true, rtt: 4, rttvar: 0.6, rto: 180, sendQ: 0, recvQ: 0, "skmem.d_rate": 0 },
    { epochMs: 1000, socketPresent: true, rtt: 6, rttvar: 1.2, rto: 210, sendQ: 0, recvQ: 0, "skmem.d_rate": 0 },
    { epochMs: 2000, socketPresent: true, rtt: 12, rttvar: 2.5, rto: 260, sendQ: 0, recvQ: 0, "skmem.d_rate": 0 },
    { epochMs: 3000, socketPresent: true, rtt: 180, rttvar: 92, rto: 1350, sendQ: 320000, recvQ: 12000, "skmem.d_rate": 0.2 },
    { epochMs: 4000, socketPresent: true, rtt: 260, rttvar: 120, rto: 2200, sendQ: 480000, recvQ: 16000, "skmem.d_rate": 0.4 },
    { epochMs: 5000, socketPresent: true, rtt: 44, rttvar: 7, rto: 280, sendQ: 1000, recvQ: 0, "skmem.d_rate": 0 }
  ], thresholds);

  assert.ok(lens);
  assert.equal(lens.severity, "high");
  assert.equal(lens.suspicion, "peer-side drain issue");
  assert.ok(lens.peaks.rtt >= 260);
  assert.ok(lens.peaks.rto >= 2200);
  assert.ok(lens.startEpochMs <= 3000 && lens.endEpochMs >= 4000);
});

test("detectTailLatencyLens returns null when tails stay flat", () => {
  const lens = detectTailLatencyLens([
    { epochMs: 0, socketPresent: true, rtt: 1, rttvar: 0.1, rto: 200, sendQ: 0, recvQ: 0, "skmem.d_rate": 0 },
    { epochMs: 1000, socketPresent: true, rtt: 1.1, rttvar: 0.1, rto: 200, sendQ: 0, recvQ: 0, "skmem.d_rate": 0 },
    { epochMs: 2000, socketPresent: true, rtt: 1.2, rttvar: 0.1, rto: 201, sendQ: 0, recvQ: 0, "skmem.d_rate": 0 }
  ], thresholds);

  assert.equal(lens, null);
});
