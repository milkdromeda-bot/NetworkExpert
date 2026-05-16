import assert from "node:assert/strict";
import { test } from "node:test";

import { buildIncidentReportHtml } from "../../src/incident-report.js";

test("incident report generates valid HTML with doctype", () => {
  const html = buildIncidentReportHtml({ sourceName: "test.log" });
  assert.equal(html.startsWith("<!DOCTYPE html>"), true);
  assert.equal(html.includes("</html>"), true);
});

test("incident report includes source name and timestamp", () => {
  const html = buildIncidentReportHtml({ sourceName: "incident-2026.log", timestamp: "2026-05-16T14:00:00Z" });
  assert.equal(html.includes("incident-2026.log"), true);
  assert.equal(html.includes("2026-05-16"), true);
});

test("incident report renders root cause matrix", () => {
  const html = buildIncidentReportHtml({
    sourceName: "test.log",
    matrix: { causes: [{ label: "Slow consumer", confidence: 0.8, present: ["high-recvQ", "drops"], absent: [] }], ambiguous: false }
  });
  assert.equal(html.includes("Root Cause Matrix"), true);
  assert.equal(html.includes("Slow consumer"), true);
  assert.equal(html.includes("80%"), true);
});

test("incident report renders stories", () => {
  const html = buildIncidentReportHtml({
    sourceName: "test.log",
    stories: [{ title: "Peer stopped reading", matchedSteps: [{}, {}, {}], totalSteps: 4, narrative: ["13:29:00 — Send-Q grows", "13:29:01 — persist", "→ conclusion"] }]
  });
  assert.equal(html.includes("Peer stopped reading"), true);
  assert.equal(html.includes("Send-Q grows"), true);
});

test("incident report renders rate alerts", () => {
  const html = buildIncidentReportHtml({
    sourceName: "test.log",
    rateAlerts: [{ epochMs: 1700000000000, label: "Recv-Q", process: "java:42", rateFormatted: "500KB/s", prevValue: 0, currValue: 500000, dtMs: 1000, severity: "critical" }]
  });
  assert.equal(html.includes("Velocity Alerts"), true);
  assert.equal(html.includes("500KB/s"), true);
});

test("incident report renders playbook", () => {
  const html = buildIncidentReportHtml({
    sourceName: "test.log",
    playbook: { title: "Slow consumer", local: ["pidstat -p 42"], peer: ["ss -tinpm"], host: ["vmstat"], doNotConclude: ["Do not blame network"], mitigation: ["Check GC"] }
  });
  assert.equal(html.includes("Slow consumer"), true);
  assert.equal(html.includes("pidstat -p 42"), true);
  assert.equal(html.includes("Do not blame network"), true);
});

test("incident report renders comparison verdict", () => {
  const html = buildIncidentReportHtml({
    sourceName: "test.log",
    comparison: { verdict: "Slow consumer onset", changes: ["Recv-Q exploded"], stable: ["RTT stable"] }
  });
  assert.equal(html.includes("Slow consumer onset"), true);
  assert.equal(html.includes("Recv-Q exploded"), true);
  assert.equal(html.includes("RTT stable"), true);
});

test("incident report renders capture quality", () => {
  const html = buildIncidentReportHtml({
    sourceName: "test.log",
    captureQuality: { grade: "excellent", score: 92, summary: "High-confidence capture." }
  });
  assert.equal(html.includes("excellent"), true);
  assert.equal(html.includes("92/100"), true);
});

test("incident report is standalone with embedded CSS", () => {
  const html = buildIncidentReportHtml({ sourceName: "test.log" });
  assert.equal(html.includes("<style>"), true);
  assert.equal(html.includes("</style>"), true);
  assert.equal(html.includes("<link"), false);
});

test("incident report escapes HTML in user content", () => {
  const html = buildIncidentReportHtml({ sourceName: "<script>alert(1)</script>" });
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("&lt;script&gt;"), true);
});
