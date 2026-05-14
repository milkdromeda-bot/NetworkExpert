import assert from "node:assert/strict";
import { test } from "node:test";
import { detectMicroburstWindow } from "../../src/microburst.js";

const thresholds = {
  recvQ: { warn: 131072, danger: 524288 },
  skmemR: { warn: 262144, danger: 524288 },
  dropRate: { warn: 0.1, danger: 1 }
};

test("detectMicroburstWindow finds a short receive-side burst with drops", () => {
  const burst = detectMicroburstWindow([
    { epochMs: 0, socketPresent: true, recvQ: 4096, "skmem.r": 8192, "skmem.d": 0, "skmem.d_rate": 0, rx_bps: 16000 },
    { epochMs: 1000, socketPresent: true, recvQ: 180000, "skmem.r": 280000, "skmem.d": 2, "skmem.d_rate": 2, rx_bps: 1800000 },
    { epochMs: 2000, socketPresent: true, recvQ: 620000, "skmem.r": 700000, "skmem.d": 14, "skmem.d_rate": 12, rx_bps: 3200000 },
    { epochMs: 3000, socketPresent: true, recvQ: 64000, "skmem.r": 90000, "skmem.d": 14, "skmem.d_rate": 0, rx_bps: 32000 }
  ], thresholds);

  assert.ok(burst);
  assert.equal(burst.severity, "critical");
  assert.equal(burst.dropDeltaTotal, 14);
  assert.ok(burst.peakRecvQ >= 620000);
  assert.ok(burst.peakSkmemR >= 700000);
  assert.ok(burst.peakRxBps >= 3200000);
});

test("detectMicroburstWindow ignores long-gap pressure changes", () => {
  const burst = detectMicroburstWindow([
    { epochMs: 0, socketPresent: true, recvQ: 0, "skmem.r": 0, "skmem.d": 0, "skmem.d_rate": 0, rx_bps: 10000 },
    { epochMs: 12000, socketPresent: true, recvQ: 300000, "skmem.r": 400000, "skmem.d": 3, "skmem.d_rate": 0.25, rx_bps: 2500000 }
  ], thresholds);

  assert.equal(burst, null);
});

test("detectMicroburstWindow rejects isolated drop spikes without receive pressure", () => {
  const burst = detectMicroburstWindow([
    { epochMs: 0, socketPresent: true, recvQ: 0, "skmem.r": 0, "skmem.d": 0, "skmem.d_rate": 0, rx_bps: 1000000 },
    { epochMs: 1000, socketPresent: true, recvQ: 0, "skmem.r": 0, "skmem.d": 4, "skmem.d_rate": 4, rx_bps: 1100000 },
    { epochMs: 2000, socketPresent: true, recvQ: 0, "skmem.r": 0, "skmem.d": 4, "skmem.d_rate": 0, rx_bps: 1000000 }
  ], thresholds);

  assert.equal(burst, null);
});
