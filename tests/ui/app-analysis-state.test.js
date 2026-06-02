import assert from "node:assert/strict";
import { test } from "node:test";

import { createAppAnalysisState } from "../../src/rendering/app-analysis-state.js";

function createContext(overrides = {}) {
  const state = {
    anomalies: [],
    command: "ss -tan",
    dataVersion: 1,
    history: [{ t: 0 }],
    prefs: { bdpDirection: "inbound" },
    raw: "raw",
    selectedId: "s1",
    sockets: [{ id: "s1" }],
    sourceName: "capture"
  };
  const context = {
    state,
    analyzeCaptureQuality: payload => ({ grade: "C", payload, score: 40 }),
    buildDiagnosticHypotheses: () => [{ confidenceScore: 0.9, title: "Hypothesis" }],
    buildRootCauseMatrix: sockets => ({ sockets }),
    buildSparklineIndex: snapshots => ({ snapshots }),
    configuredLinkCapacityMbps: () => 1000,
    detectCwndPhases: history => ({ history }),
    escapeHtml: value => String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    formatMetricValue: (metric, value) => `${metric}:${value}`,
    formatNumber: value => String(value),
    formatTailLatencyWindow: () => "window",
    hasRealTimestampHistory: () => true,
    icons: { zoomIn: "Z" },
    metricValue: socket => socket.id.length,
    normalizeBdpDirection: value => value,
    numberFormatterWith: () => new Intl.NumberFormat("en"),
    parsedTimestampSnapshots: () => [{ sockets: [] }, { sockets: [] }, { sockets: [] }],
    renderCaptureQualityReportView: (report, helpers) => `${report.grade}:${helpers.formatNumber(report.score)}`,
    socketIdentityKey: socket => socket.id,
    sortedFilteredSockets: () => [],
    tailLatencyLens: () => ({
      peaks: { recvQ: 3, rto: 2, rtt: 1, sendQ: 4 },
      severity: "high",
      stats: { rto: { p99: 20, p999: 30 }, rtt: { p99: 10, p999: 15 } },
      suspicion: "<tail>"
    }),
    thresholdFor: metric => ({ metric }),
    ...overrides
  };
  return { analysis: createAppAnalysisState(() => context), context, state };
}

test("app analysis state renders capture quality and caps low-confidence evidence", () => {
  const { analysis } = createContext();

  assert.equal(analysis.renderCaptureQualityReport(), "C:40");
  const hypotheses = analysis.diagnosticHypotheses();

  assert.equal(hypotheses[0].confidenceScore, 0.5);
  assert.equal(hypotheses[0].confidenceCapped, true);
  assert.match(hypotheses[0].confidenceCapReason, /capture quality/);
  assert.equal(analysis.diagnosticHypotheses(), hypotheses);
});

test("app analysis state caches matrices phases and sparklines", () => {
  let matrixCalls = 0;
  let phaseCalls = 0;
  const { analysis, state } = createContext({
    buildRootCauseMatrix: sockets => {
      matrixCalls += 1;
      return { count: sockets.length };
    },
    detectCwndPhases: () => {
      phaseCalls += 1;
      return { phaseCalls };
    }
  });

  assert.equal(analysis.cachedRootCauseMatrix(), analysis.cachedRootCauseMatrix());
  assert.equal(matrixCalls, 1);
  assert.equal(analysis.cachedCwndPhases(), analysis.cachedCwndPhases());
  assert.equal(phaseCalls, 1);
  assert.deepEqual(analysis.lazySparklineIndex(), { snapshots: [{ sockets: [] }, { sockets: [] }, { sockets: [] }] });
  assert.equal(analysis.lazySparklineIndex(), state.sparklineIndex);
});

test("app analysis state renders tail latency lens", () => {
  const { analysis } = createContext();

  const html = analysis.renderTailLatencyLensPanel();

  assert.match(html, /tail-latency-lens/);
  assert.match(html, /&lt;tail&gt;/);
  assert.match(html, /rtt:10 \/ rtt:15/);
  assert.match(html, /Z Zoom worst window/);
});
