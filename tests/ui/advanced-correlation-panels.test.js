import assert from "node:assert/strict";
import { test } from "node:test";
import { createAdvancedCorrelationPanels } from "../../src/advanced-correlation-panels.js";

function baseState() {
  return {
    sockets: [],
    selectedId: null,
    history: [],
    whatIfMultiplier: 2,
    jvmGc: { pauses: [], safepoints: [], correlation: null, clockOffsetMs: 0 },
    jvmTable: { page: 1, pageSize: 20, sortKey: "time", sortDir: "desc" },
    fixLatency: {
      records: [],
      correlation: null,
      threshold: 5,
      vmstat: null,
      nstat: null,
      playing: false,
      hiddenSeries: new Set(),
      zoom: { timeline: { start: 0, end: 1 }, scatter: { start: 0, end: 1 }, vmstat: { start: 0, end: 1 }, nstat: { start: 0, end: 1 } }
    },
    fixTable: { page: 1, pageSize: 20, sortKey: "score", sortDir: "desc", causeFilter: "", selectedEpoch: null },
    hiddenJvmSeries: new Set(),
    chartZoom: { start: 0, end: 1 }
  };
}

function deps(overrides = {}) {
  const state = overrides.state || baseState();
  const calls = [];
  return {
    calls,
    state,
    icons: { sortNeutral: "=", sortAsc: "^", sortDesc: "v" },
    document: { querySelector() { return null; }, querySelectorAll() { return []; } },
    window: {},
    Worker: null,
    performance: { now: () => 0 },
    requestAnimationFrame: callback => { callback(); return 1; },
    cancelAnimationFrame: () => {},
    alignTimestamps: pauses => pauses.map(p => ({ ...p, alignedEpochMs: p.epochMs })),
    chartBgColor: () => "#000",
    chartTooltipOpacity: () => 0.8,
    computeFixStats: () => ({ count: 1 }),
    correlateFixLatency: () => ({ results: [] }),
    correlateJvmStalls: () => ({ results: [{ pause: { id: "1", type: "Young", durationMs: 1 }, epochMs: 10, score: 0.2, severity: "warning", symptoms: { detected: true, signals: [] } }] }),
    dateTimeFormatter: () => ({ format: () => "15/05/2026 13:29:00" }),
    dropRateSummary: () => ({ totalDropDelta: 2 }),
    escapeHtml: value => String(value ?? ""),
    formatBytesHuman: value => `${value}B`,
    formatMetricValue: (_metric, value) => `${value}`,
    formatNumber: value => String(value),
    metricValue: (socket, key) => socket.metrics?.[key] ?? 0,
    parsedTimestampSnapshots: () => [],
    render: () => calls.push("render"),
    renderFixLatencyPanelView: view => {
      const page = view.fixPagedRows();
      return `fix:${page.total}`;
    },
    renderJvmGcPanelView: view => `${view.jvmSeverityLabel("warning_high")}:${view.jvmStallNature({ kind: "safepoint" })}`,
    resolvedNumberLocale: () => "en",
    resolvedTimeZone: () => "UTC",
    setZoom: (start, end) => calls.push(`zoom:${start}-${end}`),
    socketsById: () => new Map(state.sockets.map(socket => [socket.id, socket])),
    timeLabel: () => "13:29:00",
    visibleHistory: () => state.history,
    ...overrides
  };
}

test("advanced correlation panels keep JVM rendering behind an injected view", () => {
  const ctx = deps();
  const panels = createAdvancedCorrelationPanels(() => ctx);

  assert.equal(panels.renderJvmGcPanel(), "warning high:Safepoint");
});

test("advanced correlation panels compute JVM correlation without requiring the full app", () => {
  const state = baseState();
  state.jvmGc.pauses = [{ id: "1", type: "Young", durationMs: 2, epochMs: 10 }];
  state.history = [{ epochMs: 0 }, { epochMs: 20 }];
  const ctx = deps({ state });
  const panels = createAdvancedCorrelationPanels(() => ctx);

  panels.runJvmCorrelation();

  assert.equal(state.jvmGc.analysisWindow.filteredPauses, 1);
  assert.equal(state.jvmGc.correlation.results[0].severity, "warning");
});

test("advanced correlation panels paginate FIX rows through the extracted module", () => {
  const state = baseState();
  state.fixLatency.correlation = { results: [{ receiveMs: 2, score: 0.5 }, { receiveMs: 1, score: 0.9 }] };
  state.fixTable.pageSize = 1;
  const ctx = deps({ state });
  const panels = createAdvancedCorrelationPanels(() => ctx);

  assert.equal(panels.renderFixLatencyPanel(), "fix:2");
});

test("advanced correlation panels render what-if guidance from injected metric helpers", () => {
  const state = baseState();
  state.history = [{ recvQ: 1 }, { recvQ: 150 }];
  state.sockets = [{ id: "s1", metrics: { "skmem.rb": 4096, rcv_space: 100 } }];
  state.selectedId = "s1";
  const ctx = deps({ state });
  const panels = createAdvancedCorrelationPanels(() => ctx);

  const html = panels.renderWhatIfSimulation();

  assert.match(html, /What-if simulation/);
  assert.match(html, /100B/);
  assert.match(html, /200B/);
});

test("advanced correlation panels keep empty what-if simulations silent", () => {
  const state = baseState();
  state.history = [{ recvQ: 1 }];
  const ctx = deps({ state, dropRateSummary: () => ({ totalDropDelta: 0 }) });
  const panels = createAdvancedCorrelationPanels(() => ctx);

  assert.equal(panels.renderWhatIfSimulation(), "");
});
