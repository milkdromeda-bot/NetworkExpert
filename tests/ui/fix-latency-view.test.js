import assert from "node:assert/strict";
import { test } from "node:test";
import { renderFixLatencyPanelView } from "../../src/fix-latency-view.js";

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

function baseDeps(overrides = {}) {
  const state = {
    fixLatency: {
      records: [],
      correlation: null,
      threshold: 5,
      gcWindowMs: 0,
      cpuCores: 0,
      playing: false,
      expandedChart: null,
      hiddenSeries: new Set(),
      vmstat: null,
      nstat: null,
      ...overrides.fixLatency
    },
    jvmGc: { pauses: [] },
    fixTable: { page: 1, pageSize: 20, sortKey: "lag", sortDir: "desc", causeFilter: "", selectedEpoch: 0 },
    ...overrides.state
  };
  return {
    state,
    icons,
    computeFixStats: () => ({ median: 2, p95: 8, p99: 12, max: 30 }),
    fixPagedRows: () => ({ rows: [], total: 0, totalPages: 1, start: 0 }),
    escapeHtml,
    buildMultiSourceSummary: () => "<section data-test-summary></section>",
    formatNumber: value => String(value),
    preciseDateTimeLabel: value => new Date(value).toISOString(),
    ...overrides.deps
  };
}

test("FIX latency view keeps the empty state in the extracted module", () => {
  const html = renderFixLatencyPanelView(baseDeps());

  assert.match(html, /FIX Latency Correlation/);
  assert.match(html, /No FIX logs loaded/);
  assert.match(html, /Auto-detect dir/);
  assert.match(html, /id="fixFileInput"/);
});

test("FIX latency view renders charts and paged rows from injected dependencies", () => {
  const receiveMs = Date.UTC(2026, 4, 15, 13, 28, 10, 123);
  const deps = baseDeps({
    fixLatency: {
      records: [{ id: "r1" }],
      correlation: {
        summary: {
          overallSeverity: "warning_high",
          totalRecords: 10,
          totalSpikes: 2,
          correlatedCount: 1,
          maxScore: 0.75,
          endpointMatchRate: 0.5,
          causeCounts: { network: 1, gc: 0, kernel: 0, cpu: 0, unknown: 1 }
        },
        results: [{ id: "r1" }, { id: "r2" }, { id: "r3" }, { id: "r4" }, { id: "r5" }, { id: "r6" }]
      }
    },
    deps: {
      fixPagedRows: () => ({
        rows: [{
          receiveMs,
          lagMs: 7.5,
          direction: "in",
          msgType: "X",
          symbol: "EURUSD",
          endpoint: "10.0.0.1:50000",
          score: 0.75,
          severity: "warning_high",
          cause: "network",
          signals: ["rtt_spike", "retrans"]
        }],
        total: 1,
        totalPages: 1,
        start: 0
      })
    }
  });

  const html = renderFixLatencyPanelView(deps);

  assert.match(html, /Lag threshold/);
  assert.match(html, /FIX Lag \+ ss Recv-Q timeline/);
  assert.match(html, /Lag vs Correlation Score/);
  assert.match(html, /Spike density heatmap/);
  assert.match(html, /10 messages/);
  assert.match(html, /7\.5/);
  assert.match(html, /10\.0\.0\.1:50000/);
  assert.match(html, /warning_high/);
  assert.match(html, /rtt_spike/);
});
