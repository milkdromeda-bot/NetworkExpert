import assert from "node:assert/strict";
import { test } from "node:test";

import { buildBaselineNarrative } from "../../src/analysis/compare.js";

function makeComparison({ rows = [], summary = {} } = {}) {
  return {
    summary: { before: 5, after: 5, added: 0, removed: 0, worsened: 0, improved: 0, unchanged: 5, ...summary },
    rows
  };
}

function makeRow({ status = "same", before = {}, after = {}, deltas = {} } = {}) {
  return {
    status,
    before: { peer: "10.0.0.2:443", local: "10.0.0.1:5000", timerName: "", ...before },
    after: { peer: "10.0.0.2:443", local: "10.0.0.1:5000", timerName: "", ...after },
    deltas: { recvQ: 0, sendQ: 0, rtt: 0, rto: 0, drops: 0, cwnd: 0, rcv_ssthresh: 0, backoff: 0, retrans: 0, tx_bps: 0, rx_bps: 0, ...deltas },
    deltaScore: 0
  };
}

test("buildBaselineNarrative returns null for null comparison", () => {
  assert.equal(buildBaselineNarrative(null), null);
});

test("buildBaselineNarrative detects no changes on stable capture", () => {
  const comparison = makeComparison({ rows: [makeRow(), makeRow(), makeRow()] });
  const narrative = buildBaselineNarrative(comparison, [], []);

  assert.equal(narrative.changes.length, 0);
  assert.equal(narrative.verdict.includes("No significant change"), true);
});

test("buildBaselineNarrative detects Recv-Q explosions", () => {
  const rows = [
    makeRow({ status: "worse", deltas: { recvQ: 500000 } }),
    makeRow({ status: "worse", deltas: { recvQ: 300000 } }),
    makeRow()
  ];
  const comparison = makeComparison({ rows, summary: { worsened: 2 } });
  const narrative = buildBaselineNarrative(comparison, [], []);

  assert.equal(narrative.changes.some(c => c.includes("Recv-Q exploded")), true);
});

test("buildBaselineNarrative detects new peers", () => {
  const rows = [
    makeRow({ status: "new", before: null, after: { peer: "10.0.0.50:8080", local: "10.0.0.1:5000", timerName: "" } }),
    makeRow()
  ];
  rows[0].before = null;
  const comparison = makeComparison({ rows, summary: { added: 1 } });
  const narrative = buildBaselineNarrative(comparison, [], []);

  assert.equal(narrative.newPeers.includes("10.0.0.50:8080"), true);
  assert.equal(narrative.changes.some(c => c.includes("new peer")), true);
});

test("buildBaselineNarrative detects persist timer appearance", () => {
  const rows = [
    makeRow({ status: "worse", before: { timerName: "", peer: "10.0.0.2:443", local: "10.0.0.1:5000" }, after: { timerName: "persist", peer: "10.0.0.2:443", local: "10.0.0.1:5000" }, deltas: { sendQ: 200000 } }),
    makeRow()
  ];
  const comparison = makeComparison({ rows, summary: { worsened: 1 } });
  const narrative = buildBaselineNarrative(comparison, [], []);

  assert.equal(narrative.changes.some(c => c.includes("persist timer appeared")), true);
});

test("buildBaselineNarrative produces slow consumer verdict when RTT stable but Recv-Q explodes", () => {
  const rows = [
    makeRow({ status: "worse", before: { timerName: "", peer: "10.0.0.2:443", local: "10.0.0.1:5000" }, after: { timerName: "persist", peer: "10.0.0.2:443", local: "10.0.0.1:5000" }, deltas: { recvQ: 500000, rtt: 0, retrans: 0 } }),
    makeRow({ deltas: { rtt: 0, retrans: 0 } }),
    makeRow({ deltas: { rtt: 0, retrans: 0 } }),
    makeRow({ deltas: { rtt: 0, retrans: 0 } })
  ];
  const comparison = makeComparison({ rows, summary: { worsened: 1 } });
  const narrative = buildBaselineNarrative(comparison, [], []);

  assert.equal(narrative.stable.some(s => s.includes("RTT stable")), true);
  assert.equal(narrative.verdict.includes("Slow consumer"), true);
});

test("buildBaselineNarrative identifies new anomalies vs pre-existing", () => {
  const baselineAnomalies = [{ metric: "rtt", socketId: "s1", severity: "medium", title: "RTT high" }];
  const currentAnomalies = [
    { metric: "rtt", socketId: "s1", severity: "medium", title: "RTT high" },
    { metric: "recvQ", socketId: "s2", severity: "critical", title: "Recv-Q critical" }
  ];
  const comparison = makeComparison({ rows: [makeRow()] });
  const narrative = buildBaselineNarrative(comparison, baselineAnomalies, currentAnomalies);

  assert.equal(narrative.newAnomalies.length, 1);
  assert.equal(narrative.newAnomalies[0].metric, "recvQ");
  assert.equal(narrative.preExistingAnomalies, 1);
});

test("buildBaselineNarrative detects drop growth", () => {
  const rows = [
    makeRow({ status: "worse", deltas: { drops: 47 } }),
    makeRow()
  ];
  const comparison = makeComparison({ rows, summary: { worsened: 1 } });
  const narrative = buildBaselineNarrative(comparison, [], []);

  assert.equal(narrative.changes.some(c => c.includes("Drops grew")), true);
});
