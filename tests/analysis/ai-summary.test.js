import assert from "node:assert/strict";
import { test } from "node:test";

import { buildAiSummary } from "../../src/ai-summary.js";

test("ai-summary returns default message when no data", () => {
  const result = buildAiSummary({});
  assert.equal(result.includes("No significant pattern"), true);
});

test("ai-summary describes multi-socket process-wide stall", () => {
  const result = buildAiSummary({
    multiSocket: [{ type: "process-wide", groupKey: "java:42", socketCount: 5, epochMs: 1700000000000, symptomLabel: "persist timer" }],
    matrix: { topCause: { label: "Slow consumer", confidence: 0.8, signalCount: 5, totalSignals: 6 }, ambiguous: false, causes: [] }
  });
  assert.equal(result.includes("java:42"), true);
  assert.equal(result.includes("5 connections"), true);
  assert.equal(result.includes("Slow consumer"), true);
});

test("ai-summary describes rate alert velocity", () => {
  const result = buildAiSummary({
    rateAlerts: [{ label: "Recv-Q", process: "java:42", rateFormatted: "500KB/s", prevValue: 0, currValue: 500000, dtMs: 1000 }],
    matrix: { topCause: null, causes: [] }
  });
  assert.equal(result.includes("500KB/s"), true);
  assert.equal(result.includes("Recv-Q"), true);
});

test("ai-summary exonerates network when app hypothesis is strong", () => {
  const result = buildAiSummary({
    stories: [{ title: "Local overload", matchedSteps: [{}, {}], startMs: 1700000000000, endMs: 1700000005000 }],
    hypotheses: [
      { id: "local-app-not-reading", confidenceScore: 0.7, confidenceDetail: { wouldConfirm: "Check GC logs" } },
      { id: "path-congestion-or-loss", confidenceScore: 0.2, confidenceDetail: {} }
    ],
    matrix: { topCause: { label: "Slow consumer", confidence: 0.7, signalCount: 4, totalSignals: 6 }, ambiguous: false, causes: [] }
  });
  assert.equal(result.includes("Network path appears healthy"), true);
  assert.equal(result.includes("Check GC logs"), true);
});

test("ai-summary flags network degradation when present", () => {
  const result = buildAiSummary({
    hypotheses: [{ id: "path-congestion-or-loss", confidenceScore: 0.6, confidenceDetail: { wouldConfirm: "mtr showing loss" } }],
    matrix: { topCause: { label: "Network congestion", confidence: 0.6, signalCount: 4, totalSignals: 6 }, ambiguous: false, causes: [] }
  });
  assert.equal(result.includes("Network path shows degradation"), true);
});

test("ai-summary includes ambiguous warning", () => {
  const result = buildAiSummary({
    matrix: { topCause: { label: "Slow consumer", confidence: 0.5, signalCount: 3, totalSignals: 6 }, ambiguous: true, causes: [{ label: "Slow consumer", confidence: 0.5 }, { label: "Buffer pressure", confidence: 0.45 }] }
  });
  assert.equal(result.includes("ambiguous"), true);
  assert.equal(result.includes("Slow consumer"), true);
  assert.equal(result.includes("Buffer pressure"), true);
});

test("ai-summary adds quality caveat when capture is weak", () => {
  const result = buildAiSummary({
    stories: [{ title: "Test", matchedSteps: [{}], startMs: 1700000000000, endMs: 1700000001000 }],
    captureQuality: { grade: "weak", score: 40 },
    matrix: { topCause: null, causes: [] }
  });
  assert.equal(result.includes("⚠️"), true);
  assert.equal(result.includes("weak"), true);
});

test("ai-summary includes comparison verdict", () => {
  const result = buildAiSummary({
    comparison: { verdict: "Slow consumer onset — network is fine." },
    matrix: { topCause: { label: "Slow consumer", confidence: 0.7, signalCount: 4, totalSignals: 6 }, ambiguous: false, causes: [] }
  });
  assert.equal(result.includes("Slow consumer onset"), true);
});
