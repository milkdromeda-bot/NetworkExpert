import assert from "node:assert/strict";
import { test } from "node:test";

import { formatQualityDuration, renderCaptureQualityReportView } from "../../src/capture-quality-view.js";
import { escapeHtml } from "../../src/utils.js";

const formatNumber = value => new Intl.NumberFormat("en-US").format(value);
const numberFormatterWith = (min, max) => new Intl.NumberFormat("en-US", {
  minimumFractionDigits: min,
  maximumFractionDigits: max
});

function baseReport(overrides = {}) {
  return {
    grade: "good",
    score: 82,
    summary: "Enough cadence and expert fields for a useful diagnosis.",
    sourceName: "sample.log",
    recommendedCommand: "while true; do date --iso-8601=ns; ss -HOntepmi; sleep 0.05; done",
    metrics: {
      snapshotCount: 10,
      timestampBlockCount: 10,
      durationMs: 950,
      intervalCount: 9,
      minIntervalMs: 45,
      medianIntervalMs: 50,
      maxIntervalMs: 60,
      requestedIntervalMs: 50,
      cadenceDriftRatio: 1.1,
      parsedSocketCount: 25,
      activeSocketRows: 25,
      observedRateRows: 24,
      uniqueSocketIdentities: 2,
      oneShotSocketIdentities: 0,
      medianSocketContinuity: 0.9
    },
    diagnosticReadiness: [
      { label: "Congestion", detail: "RTT and retrans are available.", status: "strong", blockers: [], helpfulMissing: [] },
      { label: "Slow consumer", detail: "Queues and memory are available.", status: "partial", blockers: ["process owner"], helpfulMissing: ["GC log"] }
    ],
    featureCards: [
      { label: "Timestamps", detail: "Repeated timestamps found.", status: "ok", points: 10, weight: 10, commandDetected: true },
      { label: "TCP internals", detail: "ss -i data found.", status: "partial", points: 7, weight: 10 },
      { label: "Rates", detail: "No rate field found.", status: "missing", points: 0, weight: 10 }
    ],
    warnings: ["Short capture"],
    missing: ["pid/user context"],
    dataIntegrity: [{ severity: "warning", message: "Counter reset detected" }],
    strengths: ["Stable timestamp cadence", "Socket identity is stable"],
    recommendations: ["Capture for at least 30 seconds"],
    limits: ["Do not infer physical link capacity"],
    ...overrides
  };
}

function render(report = baseReport()) {
  return renderCaptureQualityReportView(report, {
    escapeHtml,
    formatNumber,
    numberFormatterWith,
    icons: { copy: "[copy]" }
  });
}

test("formats capture durations across unavailable, millisecond, second, and minute ranges", () => {
  const ctx = { formatNumber, numberFormatterWith };
  assert.equal(formatQualityDuration(0, ctx), "n/a");
  assert.equal(formatQualityDuration(Number.NaN, ctx), "n/a");
  assert.equal(formatQualityDuration(49, ctx), "49 ms");
  assert.equal(formatQualityDuration(1500, ctx), "1.5 s");
  assert.equal(formatQualityDuration(120000, ctx), "2.0 min");
});

test("renders the capture quality hero with score, grade, summary, and source", () => {
  const html = render();
  assert.match(html, /Capture Quality Report/);
  assert.match(html, /good evidence readiness/);
  assert.match(html, /82%/);
  assert.match(html, /Enough cadence/);
  assert.match(html, /sample\.log/);
});

test("renders all core quality metrics in one compact metrics band", () => {
  const html = render();
  assert.match(html, /Snapshots/);
  assert.match(html, /Duration/);
  assert.match(html, /Cadence/);
  assert.match(html, /Parsed sockets/);
  assert.match(html, /Rows with rates/);
  assert.match(html, /Socket coverage/);
  assert.match(html, /2 unique \/ 0 one-shot - 90% median continuity/);
});

test("shows command sleep context only when a requested interval is known", () => {
  assert.match(render(), /command sleep 50 ms/);
  const html = render(baseReport({ metrics: { ...baseReport().metrics, requestedIntervalMs: 0 } }));
  assert.doesNotMatch(html, /command sleep/);
});

test("renders diagnostic readiness blockers and helpful next evidence", () => {
  const html = render();
  assert.match(html, /Diagnostic readiness/);
  assert.match(html, /Blocking gaps: process owner/);
  assert.match(html, /Helpful next: GC log/);
  assert.match(html, /capture-quality-readiness strong/);
  assert.match(html, /capture-quality-readiness partial/);
});

test("renders evidence coverage cards with command detection status", () => {
  const html = render();
  assert.match(html, /Evidence coverage/);
  assert.match(html, /Timestamps/);
  assert.match(html, /10\/10 pts - command\/evidence detected/);
  assert.match(html, /TCP internals/);
  assert.match(html, /Rates/);
  assert.match(html, /capture-quality-feature missing/);
});

test("renders warnings, missing evidence, integrity, strengths, recommendations, and limits", () => {
  const html = render();
  assert.match(html, /Warnings/);
  assert.match(html, /Short capture/);
  assert.match(html, /Missing evidence/);
  assert.match(html, /pid\/user context/);
  assert.match(html, /Data integrity/);
  assert.match(html, /Counter reset detected/);
  assert.match(html, /Strengths/);
  assert.match(html, /Practical recommendations/);
  assert.match(html, /Interpretation limits/);
});

test("renders friendly empty-state text for optional report lists", () => {
  const html = render(baseReport({
    warnings: [],
    missing: [],
    strengths: [],
    recommendations: [],
    limits: [],
    dataIntegrity: []
  }));
  assert.match(html, /No capture-quality warning detected/);
  assert.match(html, /No important evidence gap detected/);
  assert.match(html, /No strong capture signal yet/);
  assert.match(html, /The current capture pattern is already strong/);
  assert.match(html, /No limits listed/);
});

test("escapes report content and recommended command", () => {
  const html = render(baseReport({
    sourceName: "<capture.log>",
    summary: "bad <script>alert(1)</script>",
    recommendedCommand: "ss '<unsafe>'",
    warnings: ["<warn>"]
  }));
  assert.match(html, /&lt;capture\.log&gt;/);
  assert.match(html, /bad &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /ss &#039;&lt;unsafe&gt;&#039;/);
  assert.match(html, /&lt;warn&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("keeps the copy action stable for the recommended collection command", () => {
  const html = render();
  assert.match(html, /data-action="copyQualityCommand"/);
  assert.match(html, /\[copy\] Copy recommended command/);
  assert.match(html, /while true; do date --iso-8601=ns/);
});
