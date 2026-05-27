import assert from "node:assert/strict";
import { test } from "node:test";

import { analysisTabGuide, renderAnalysisPageView, renderAnalysisTabsView } from "../../src/views/analysis-shell-view.js";
import { escapeHtml, html } from "../../src/core/utils.js";

const tabs = [
  { id: "diagnosis", label: "diagnosis", short: "Prioritized hypotheses." },
  { id: "sockets", label: "sockets", short: "Detailed socket table." },
  { id: "unknown<id>", label: "<custom>", short: "Custom <unsafe> view." }
];

test("analysis tab guide returns requested tab or first tab fallback", () => {
  assert.equal(analysisTabGuide(tabs, "sockets").label, "sockets");
  assert.equal(analysisTabGuide(tabs, "missing").label, "diagnosis");
  assert.equal(analysisTabGuide(null, "missing"), undefined);
});

test("analysis tabs render active state, collapse toggle, key hints, icons, and escaped labels", () => {
  const output = renderAnalysisTabsView({
    tabs,
    activeTab: "sockets",
    collapsed: true,
    escapeHtml
  });
  assert.match(output, /analysis-tabs collapsed/);
  assert.match(output, /title="Expand tabs"/);
  assert.match(output, /data-tab="sockets"/);
  assert.match(output, /class="tab analysis-tab active"/);
  assert.match(output, /aria-selected="true"/);
  assert.match(output, /data-key-hint="2"/);
  assert.match(output, /ri-plug-line/);
  assert.match(output, /ri-checkbox-blank-circle-line/);
  assert.match(output, /data-tab="unknown&lt;id&gt;"/);
  assert.match(output, /&lt;custom&gt;/);
  assert.match(output, /Custom &lt;unsafe&gt; view/);
});

test("analysis page shell renders KPIs, toolbar, tabs, and active content", () => {
  const output = renderAnalysisPageView({
    state: {
      prefs: {},
      sockets: [
        { sendQ: 100, details: { skmem: { d: 2 } } },
        { sendQ: 50, details: { skmem: { d: 3 } } }
      ],
      anomalies: [{ severity: "critical" }, { severity: "high" }],
      table: { filters: { text: "state:<ESTAB>" } }
    },
    html,
    icons: { activity: "[activity]" },
    escapeHtml,
    formatNumber: value => `n:${value}`,
    formatMetricValue: (metric, value) => `${metric}:${value}`,
    renderExportMenu: scope => `<button data-export-menu="${scope}">Export</button>`,
    renderAnalysisTabs: () => "<nav>tabs</nav>",
    renderActiveTab: () => "<section>active body</section>"
  });
  assert.match(output, /Sockets/);
  assert.match(output, /n:2/);
  assert.match(output, /Critical/);
  assert.match(output, /n:1/);
  assert.match(output, /sendQ:150/);
  assert.match(output, /skmem\.d:5/);
  assert.match(output, /data-export-menu="analysis"/);
  assert.match(output, /state:&lt;ESTAB&gt;/);
  assert.match(output, /<nav>tabs<\/nav>/);
  assert.match(output, /<section>active body<\/section>/);
});

test("analysis page shell renders health score when provided", () => {
  const output = renderAnalysisPageView({
    state: {
      prefs: {},
      sockets: [],
      anomalies: [],
      table: { filters: { text: "" } }
    },
    html,
    escapeHtml,
    renderAnalysisTabs: () => "",
    renderActiveTab: () => "",
    healthScore: { score: 85, grade: "B", breakdown: { critical: 0, high: 1, medium: 2, low: 0, healthy: 5 } }
  });
  assert.match(output, /health-score-kpi grade-B/);
  assert.match(output, /85<small>\/100<\/small>/);
});
