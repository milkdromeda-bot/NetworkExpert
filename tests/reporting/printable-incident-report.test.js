import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildPrintableIncidentReportHtml } from "../../src/reporting/printable-incident-report.js";

function deps(overrides = {}) {
  const state = {
    sourceName: "sample.ss",
    command: "ss -HOntepmi",
    activeTab: "sockets",
    baseline: null,
    sockets: [],
    ...overrides.state
  };
  return {
    state,
    reportVisibleSockets: () => [],
    selectedSocket: () => null,
    microburstSummary: () => null,
    reportRelevantAnomalies: () => [],
    reportTopSockets: () => [],
    reportPercentileTable: () => [],
    reportFindings: () => [],
    reportAnnotations: () => [],
    reportFilterTokens: () => [],
    buildComparison: () => null,
    anomaliesBySocketId: () => new Map(),
    metricLabel: metric => metric,
    socketsById: () => new Map(),
    formatNumber: value => String(value),
    resolvedNumberLocale: () => "en-US",
    resolvedTimeZone: () => "UTC",
    linuxProfileLabel: () => "Linux",
    accessRoleLabel: () => "Analyst",
    escapeHtml: value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
    buildAiSummary: () => "No dominant issue in this test fixture.",
    buildRootCauseMatrix: () => ({ causes: [] }),
    cachedStories: () => [],
    cachedMultiSocket: () => [],
    cachedRateAlerts: () => [],
    captureQualityReport: () => null,
    diagnosticHypotheses: () => [],
    buildBaselineNarrative: () => null,
    formatMetricValue: (_metric, value) => String(value),
    metricValue: () => 0,
    socketBandwidth: () => 0,
    annotationTypeLabel: type => type,
    timeLabel: (_offset, epoch) => String(epoch),
    formatMicroburstWindow: () => "short window",
    ...overrides
  };
}

test("printable incident report renders the current workspace frame", () => {
  const html = buildPrintableIncidentReportHtml(deps());

  assert.match(html, /<!doctype html>/i);
  assert.match(html, /sample\.ss/);
  assert.match(html, /ss -HOntepmi/);
  assert.match(html, /No table filter is currently applied/);
});

test("main delegates printable incident report rendering to the extracted module", () => {
  const main = readFileSync(new URL("../../src/rendering/main.js", import.meta.url), "utf8");

  assert.match(main, /import \{ buildPrintableIncidentReportHtml \} from "\.\/printable-incident-report\.js";/);
  assert.match(main, /function printableIncidentReportDependencies\(\)/);
  assert.match(main, /return buildPrintableIncidentReportHtml\(printableIncidentReportDependencies\(\), chartCaptures\);/);
  assert.doesNotMatch(main, /const reportCss = `[\s\S]*NetworkExpert Incident Report/);
});
