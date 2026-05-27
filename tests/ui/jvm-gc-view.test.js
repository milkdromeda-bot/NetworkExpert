import assert from "node:assert/strict";
import { test } from "node:test";
import { renderJvmGcPanelView } from "../../src/views/jvm-gc-view.js";

const icons = {
  zoomIn: "+",
  zoomOut: "-",
  reset: "reset",
  arrowLeft: "left",
  arrowRight: "right"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function deps(overrides = {}) {
  const state = {
    jvmGc: {
      pauses: [],
      safepoints: [],
      correlation: null,
      clockOffsetMs: 0,
      severityFilter: "all",
      syncCrosshair: true,
      analysisWindow: null,
      ...overrides.jvmGc
    },
    ...overrides.state
  };
  return {
    state,
    icons,
    jvmPagedRows: () => ({ rows: [], total: 0, totalPages: 1, start: 0 }),
    renderJvmLegend: kind => `<div data-legend="${kind}"></div>`,
    renderJvmPagination: (total, pages, start) => `<nav data-pagination="${total}:${pages}:${start}"></nav>`,
    renderJvmSortHeader: (_key, label) => `<th>${escapeHtml(label)}</th>`,
    jvmSeverityClass: value => value || "info",
    jvmSeverityLabel: value => value || "info",
    jvmStallNature: row => row.nature || "Young GC",
    escapeHtml,
    formatNumber: value => String(value),
    preciseDateTimeLabel: value => new Date(value || 0).toISOString(),
    ...overrides.deps
  };
}

test("JVM GC view keeps the no-log import prompt", () => {
  const html = renderJvmGcPanelView(deps());

  assert.match(html, /JVM Stall \/ GC Correlation/);
  assert.match(html, /No GC log loaded/);
  assert.match(html, /Auto-detect dir/);
  assert.doesNotMatch(html, /data-jvm-chart="recvq"/);
});

test("JVM GC view renders charts and paginated stall rows", () => {
  const timestampMs = Date.UTC(2026, 4, 15, 13, 28, 10, 250);
  const html = renderJvmGcPanelView(deps({
    jvmGc: {
      pauses: [{ id: 42, durationMs: 12 }],
      safepoints: [],
      severityFilter: "warning",
      syncCrosshair: true,
      clockOffsetMs: 5,
      analysisWindow: { start: timestampMs - 1000, end: timestampMs + 1000, filteredPauses: 1, totalPauses: 1 },
      correlation: {
        summary: {
          overallSeverity: "warning_high",
          correlatedCount: 1,
          totalPauses: 1,
          maxScore: 0.66,
          recommendations: [{ severity: "warning", text: "Check JVM stalls." }]
        },
        results: [{ id: 42 }]
      }
    },
    deps: {
      jvmPagedRows: () => ({
        rows: [{
          timestampMs,
          eventId: 42,
          pause: { id: 42, type: "Young", cause: "G1 Evacuation Pause" },
          durationMs: 12.4,
          score: 0.66,
          severity: "warning_high",
          symptoms: { signals: [{ signal: "recvq_rise" }, { signal: "rcv_space_drop" }] },
          nature: "Young GC"
        }],
        total: 1,
        totalPages: 1,
        start: 0
      })
    }
  }));

  assert.match(html, /Clear GC data/);
  assert.match(html, /data-jvm-chart="recvq"/);
  assert.match(html, /data-jvm-chart="scatter"/);
  assert.match(html, /Correlated JVM stall events/);
  assert.match(html, /Young GC/);
  assert.match(html, /G1 Evacuation Pause/);
  assert.match(html, /recvq_rise, rcv_space_drop/);
  assert.match(html, /Max correlation score: 0\.66/);
});
