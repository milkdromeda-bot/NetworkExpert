import assert from "node:assert/strict";
import { test } from "node:test";
import { buildIncidentReportPdf } from "../../src/incident-report-pdf.js";

function fakePdfLib() {
  const page = {
    getWidth: () => 595.28,
    getHeight: () => 841.89,
    drawText() {},
    drawRectangle() {},
    drawImage() {}
  };
  return {
    StandardFonts: { Helvetica: "Helvetica", HelveticaBold: "HelveticaBold" },
    rgb: (r, g, b) => ({ r, g, b }),
    PDFDocument: {
      create: async () => ({
        embedFont: async font => ({ font }),
        addPage: () => page,
        embedPng: async () => ({ width: 640, height: 320 }),
        save: async () => new Uint8Array([1, 2, 3])
      })
    }
  };
}

function deps(overrides = {}) {
  return {
    PDFLib: fakePdfLib(),
    selectedSocket: () => null,
    reportVisibleSockets: () => [],
    reportRelevantAnomalies: () => [],
    pickExecutiveFocusSocket: () => null,
    reportAnnotations: () => [],
    microburstSummary: () => null,
    tailLatencyLens: () => null,
    guidedChecklistItems: () => [],
    state: { advisorFindings: [], sourceName: "unit-test", command: "ss -H" },
    buildExecutiveSummary: () => null,
    formatMicroburstWindow: () => "",
    formatTailLatencyWindow: () => "",
    formatMetricValue: (_metric, value) => String(value ?? 0),
    resolvedNumberLocale: () => "en-US",
    resolvedTimeZone: () => "UTC",
    formatNumber: value => String(value),
    drawPdfTextBlock: (_page, _text, options) => options.y - 10,
    drawPdfSection: (_page, _title, _lines, _x, y) => y - 20,
    metricValue: () => 0,
    socketsById: () => new Map(),
    metricLabel: metric => metric,
    timeLabel: () => "00:00:00",
    reportFilterTokens: () => [],
    reportTopSockets: () => [],
    ...overrides
  };
}

test("incident report PDF builder fails clearly when PDF engine is missing", async () => {
  await assert.rejects(
    () => buildIncidentReportPdf([], deps({ PDFLib: null })),
    /PDF engine unavailable/
  );
});

test("incident report PDF builder returns bytes through injected report dependencies", async () => {
  const bytes = await buildIncidentReportPdf([{ metric: "rtt", title: "RTT", bytes: new Uint8Array([9]), context: "chart", width: 640, height: 320 }], deps());

  assert.ok(bytes instanceof Uint8Array);
  assert.deepEqual([...bytes], [1, 2, 3]);
});
