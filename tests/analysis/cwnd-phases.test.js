import assert from "node:assert/strict";
import { test } from "node:test";
import { detectCwndPhases } from "../../src/analysis/cwnd-phases.js";

test("empty history returns empty phases", () => {
  const { phases, summary } = detectCwndPhases([]);
  assert.equal(phases.length, 0);
  assert.equal(summary.slowStart, 0);
});

test("exponential cwnd growth is classified as slow-start", () => {
  const history = [
    { t: 0, cwnd: 2 },
    { t: 1, cwnd: 4 },
    { t: 2, cwnd: 8 },
    { t: 3, cwnd: 16 }
  ];
  const { phases } = detectCwndPhases(history);
  assert.equal(phases[1].phase, "slow-start");
  assert.equal(phases[2].phase, "slow-start");
  assert.equal(phases[3].phase, "slow-start");
});

test("stable cwnd is classified as congestion-avoidance", () => {
  const history = [
    { t: 0, cwnd: 100 },
    { t: 1, cwnd: 101 },
    { t: 2, cwnd: 102 },
    { t: 3, cwnd: 103 }
  ];
  const { phases } = detectCwndPhases(history);
  assert.equal(phases[2].phase, "congestion-avoidance");
  assert.equal(phases[3].phase, "congestion-avoidance");
});

test("cwnd drop with retransmission is classified as loss", () => {
  const history = [
    { t: 0, cwnd: 100 },
    { t: 1, cwnd: 100 },
    { t: 2, cwnd: 40, retrans: 1 }
  ];
  const { phases } = detectCwndPhases(history);
  assert.equal(phases[2].phase, "loss");
});

test("recovery after loss is classified as fast-recovery", () => {
  const history = [
    { t: 0, cwnd: 100 },
    { t: 1, cwnd: 40, retrans: 1 },
    { t: 2, cwnd: 50 },
    { t: 3, cwnd: 60 },
    { t: 4, cwnd: 95 }
  ];
  const { phases } = detectCwndPhases(history);
  assert.equal(phases[1].phase, "loss");
  assert.equal(phases[2].phase, "fast-recovery");
  assert.equal(phases[3].phase, "fast-recovery");
});

test("summary counts match phase array", () => {
  const history = [
    { t: 0, cwnd: 2 },
    { t: 1, cwnd: 4 },
    { t: 2, cwnd: 8 },
    { t: 3, cwnd: 8 },
    { t: 4, cwnd: 3, retrans: 1 }
  ];
  const { phases, summary } = detectCwndPhases(history);
  const total = summary.slowStart + summary.congestionAvoidance + summary.fastRecovery + summary.loss + summary.idle;
  assert.equal(total, phases.length);
});
