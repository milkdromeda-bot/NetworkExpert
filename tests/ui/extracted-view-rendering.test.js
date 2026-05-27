import assert from "node:assert/strict";
import { test } from "node:test";
import { createConversationRendering } from "../../src/views/conversation-rendering.js";
import { createTooltipRendering } from "../../src/views/tooltip-rendering.js";

const escapeHtml = value => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

test("chart metric tooltip receives color and render dependencies", () => {
  const view = createTooltipRendering({
    state: { prefs: { graphMetric: "rtt" } },
    document: { querySelectorAll: () => [], querySelector: () => null, createElement: () => ({ addEventListener() {}, setAttribute() {}, classList: { add() {}, remove() {} } }), body: { appendChild() {} } },
    window: { innerHeight: 800, innerWidth: 1200 },
    EXPERT_DEFAULT_THRESHOLDS: {},
    escapeHtml,
    chartMetricList: () => ["rtt"],
    thresholdFor: () => ({ warn: 100, danger: 300, unit: "ms" }),
    metricLabel: metric => metric.toUpperCase(),
    metricColor: () => "#5db7ff",
    metricSource: () => "ss -i",
    metricUnit: () => "ms",
    metricInterpretation: () => "Latency signal.",
    metricCorrelations: () => ["rto", "retrans"],
    metricReliabilityProfile: () => ({}),
    metricDiagnosticGuidance: () => ({}),
    formatMetricValue: (_metric, value) => `${value} ms`,
    renderThresholdSummary: () => "<span>thresholds</span>",
    currentApplicationService: () => null,
    inferredApplicationService: () => null,
    chartTooltipOpacity: () => 0.8,
    renderColumnTooltip: () => "",
    render: () => {}
  });

  const html = view.renderChartMetricTooltip("rtt");

  assert.match(html, /--metric-color:#5db7ff/);
  assert.match(html, /RTT/);
});

test("conversation rendering receives shared grid controls", () => {
  const state = {
    prefs: { paginationPosition: "top" },
    selectedId: "s1",
    openConversationInsightKey: null,
    openConversationInsightPos: null,
    ipIntel: {}
  };
  const socket = { id: "s1", local: "10.0.0.1:1", peer: "10.0.0.2:2", details: { process: null } };
  const view = createConversationRendering({
    state,
    icons: { arrowRight: "->", chart: "chart", focus: "focus", alert: "alert", x: "x" },
    window: { innerWidth: 1200, innerHeight: 800 },
    escapeHtml,
    formatNumber: value => String(value),
    formatMetricValue: (_metric, value) => String(value),
    renderTableMetricCell: (_metric, value) => String(value),
    groupedSockets: () => [],
    pagedRows: rows => ({ rows, totalPages: 1, start: 0 }),
    renderPagination: () => "<nav>pager</nav>",
    renderGridControls: count => `<div>grid ${count}</div>`,
    renderApplicationServiceChip: () => "",
    buildConversations: () => [{
      socket,
      local: socket.local,
      peer: socket.peer,
      maxRisk: "low",
      family: "tcp",
      states: new Set(["ESTAB"]),
      processes: new Set(["-"]),
      count: 1,
      process: "-",
      txBps: 0,
      rxBps: 0,
      anomalies: 0,
      sendQ: 0,
      recvQ: 0,
      maxRtt: 0,
      maxRto: 0,
      drops: 0
    }],
    riskRank: () => 1,
    renderConversationSortHeader: (_key, label) => `<th>${label}</th>`,
    conversationAnomalySummary: () => ({ counts: {}, dominantSeverity: "low", topMetric: "socket", topItems: [], metrics: [] }),
    metricLabel: metric => metric,
    ipIntelSummary: () => "",
    ipIntelDetail: () => ""
  });

  const html = view.renderConversations();

  assert.match(html, /grid 1/);
  assert.match(html, /10\.0\.0\.1:1/);
});
