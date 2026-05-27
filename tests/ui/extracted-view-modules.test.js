import assert from "node:assert/strict";
import { test } from "node:test";

import { renderAdvisorGlobalSummary } from "../../src/views/advisor-summary-view.js";
import { renderChartsGlobalToolbar } from "../../src/views/charts-toolbar-view.js";
import { renderMetricsStatsTable } from "../../src/views/stats-table-view.js";
import { escapeHtml } from "../../src/core/utils.js";

const formatNumber = value => new Intl.NumberFormat("en-US").format(value);
const metricValue = (socket, key) => socket[key];
const formatMetricValue = (metric, value) => `${Math.round(Number(value) || 0)} ${metric}`;
const metricLabel = metric => ({ rtt: "RTT", sendQ: "Send-Q", recvQ: "Recv-Q" }[metric] || metric);

test("advisor global summary renders health score, top issues, counters, and optional panels", () => {
  const html = renderAdvisorGlobalSummary({
    state: {
      sockets: [
        { retrans: 2, backoff: 1, rtt: 120, recvQ: 0, sendQ: 500 },
        { retrans: 0, backoff: 0, rtt: 5, recvQ: 0, sendQ: 0 }
      ],
      anomalies: [{ severity: "critical", title: "Slow consumer", detail: "Send-Q is growing quickly." }]
    },
    escapeHtml,
    formatMetricValue,
    formatNumber,
    metricValue,
    visibleHistory: () => [{ timestamp: "t1" }, { timestamp: "t2" }],
    dropRateSummary: () => ({ totalDropDelta: 4 }),
    renderWhatIfSimulation: () => "<section>What-if block</section>"
  });

  assert.match(html, /Network Health Score/);
  assert.match(html, /2 sockets/);
  assert.match(html, /1 anomalies/);
  assert.match(html, /Top issues/);
  assert.match(html, /Slow consumer/);
  assert.match(html, /Retransmitting/);
  assert.match(html, /Backoff active/);
  assert.match(html, /Socket drops/);
  assert.match(html, /What-if block/);
});

test("advisor global summary renders a healthy empty state without critical issues", () => {
  const html = renderAdvisorGlobalSummary({
    state: { sockets: [], anomalies: [] },
    escapeHtml,
    formatMetricValue,
    formatNumber,
    metricValue,
    visibleHistory: () => [],
    dropRateSummary: () => ({ totalDropDelta: 0 })
  });
  assert.match(html, /Network Health Score/);
  assert.match(html, /No critical issues detected/);
  assert.match(html, /no timeline/);
});

test("metrics stats table renders percentile columns and sortable headers", () => {
  const html = renderMetricsStatsTable({
    state: { statsTableSort: "metric", statsTableDir: "asc" },
    escapeHtml,
    formatMetricValue,
    formatNumber,
    thresholdFor: () => null,
    thresholdSeverity: (metric, value) => value >= 100 ? "danger" : value >= 50 ? "warn" : "",
    metricLabel,
    visibleHistory: () => [
      { rtt: 10, sendQ: 0 },
      { rtt: 20, sendQ: 100 },
      { rtt: 30, sendQ: 200 }
    ]
  }, ["rtt", "sendQ"]);

  assert.match(html, /stats-table/);
  assert.match(html, /data-stats-sort="metric"/);
  assert.match(html, /P95/);
  assert.match(html, /P99\.9/);
  assert.match(html, /RTT/);
  assert.match(html, /Send-Q/);
  assert.match(html, /data-chart-stats="rtt"/);
  assert.match(html, /data-chart-stats="sendQ"/);
});

test("metrics stats table supports numeric descending sort", () => {
  const html = renderMetricsStatsTable({
    state: { statsTableSort: "max", statsTableDir: "desc" },
    escapeHtml,
    formatMetricValue,
    formatNumber,
    thresholdFor: () => null,
    thresholdSeverity: () => "",
    metricLabel,
    visibleHistory: () => [
      { rtt: 10, sendQ: 300 },
      { rtt: 20, sendQ: 100 }
    ]
  }, ["rtt", "sendQ"]);

  assert.match(html, /Max/);
  assert.match(html, /data-stats-sort="max">Max/);
  assert.ok(html.indexOf("Send-Q") < html.indexOf("RTT"));
});

test("metrics stats table renders an empty state when there is no timeline", () => {
  const html = renderMetricsStatsTable({
    state: {},
    escapeHtml,
    formatMetricValue,
    formatNumber,
    thresholdFor: () => null,
    thresholdSeverity: () => "",
    metricLabel,
    visibleHistory: () => []
  }, ["rtt"]);

  assert.match(html, /No timestamped data for stats/);
});

test("charts global toolbar renders chart style, thresholds, export, view mode, time, and layout controls", () => {
  const html = renderChartsGlobalToolbar({
    state: {
      prefs: { graphStyle: "area" },
      openStyleMenu: true,
      metricsView: "charts"
    },
    icons: { threshold: "[threshold]", layout: "[layout]", activity: "[activity]" },
    escapeHtml,
    renderExportMenu: scope => `<button data-export-menu="${scope}">Export</button>`,
    renderTimeZoneOptions: () => "<option>UTC</option>",
    zoomDateTimeValue: key => key === "start" ? "2026-05-15T13:00:00" : "2026-05-15T14:00:00"
  });

  assert.match(html, /charts-global-toolbar/);
  assert.match(html, /Area/);
  assert.match(html, /style-picker-menu open/);
  assert.match(html, /data-action="thresholds"/);
  assert.match(html, /data-export-menu="charts"/);
  assert.match(html, /data-metrics-view="charts"/);
  assert.match(html, /data-metrics-view="table"/);
  assert.match(html, /2026-05-15T13:00:00/);
  assert.match(html, /data-action="layoutPrefs"/);
});
