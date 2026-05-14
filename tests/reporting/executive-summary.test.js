import assert from "node:assert/strict";
import { test } from "node:test";
import { buildExecutiveSummary, pickExecutiveFocusSocket } from "../../src/executive-summary.js";

test("pickExecutiveFocusSocket prefers explicit selection", () => {
  const selected = { id: "selected", risk: "low", sendQ: 0, recvQ: 0 };
  const picked = pickExecutiveFocusSocket(selected, [{ id: "other", risk: "critical", sendQ: 1000, recvQ: 0 }]);
  assert.equal(picked.id, "selected");
});

test("pickExecutiveFocusSocket falls back to the riskiest socket", () => {
  const picked = pickExecutiveFocusSocket(null, [
    { id: "a", risk: "medium", sendQ: 100, recvQ: 0 },
    { id: "b", risk: "critical", sendQ: 0, recvQ: 0 }
  ]);
  assert.equal(picked.id, "b");
});

test("buildExecutiveSummary prioritizes microburst over tail latency", () => {
  const summary = buildExecutiveSummary({
    focusSocket: { id: "a", risk: "critical" },
    microburst: { severity: "critical", peakRxBps: 200000, peakRecvQ: 500000, dropDeltaTotal: 10 },
    tailLatency: { severity: "high", suspicion: "path instability", stats: { rtt: { p99: 10, p999: 20 }, rto: { p99: 100, p999: 200 } } },
    formatMicroburstWindow: () => "10:00 -> 10:01",
    formatTailLatencyWindow: () => "10:02 -> 10:03",
    formatMetricValue: (_metric, value) => String(value)
  });
  assert.equal(summary.title, "Receive-side microburst");
  assert.equal(summary.severity, "critical");
});

test("buildExecutiveSummary uses checklist guidance before advisor", () => {
  const summary = buildExecutiveSummary({
    focusSocket: { id: "a", risk: "high" },
    checklistItems: [{ severity: "high", title: "slow consumer probable", why: "Recv-Q is rising.", next: "Open microburst charts." }],
    advisorFindings: [{ severity: "critical", title: "Advisor says something else" }]
  });
  assert.equal(summary.title, "slow consumer probable");
  assert.match(summary.next, /microburst/i);
});

test("buildExecutiveSummary falls back to top anomaly when no higher-order signal exists", () => {
  const summary = buildExecutiveSummary({
    focusSocket: { id: "a", risk: "medium" },
    anomalies: [{ severity: "high", title: "High RTO", detail: "RTO is elevated." }]
  });
  assert.equal(summary.title, "High RTO");
  assert.equal(summary.severity, "high");
});
