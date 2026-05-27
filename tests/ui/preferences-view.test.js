import assert from "node:assert/strict";
import { test } from "node:test";

import { renderPrefsView } from "../../src/views/preferences-view.js";
import { escapeHtml, html } from "../../src/core/utils.js";

const basePrefs = {
  numberLocale: "fr-FR",
  numberGrouping: true,
  colorBlind: false,
  compactRows: true,
  tableUnits: true,
  paginationPosition: "both",
  defaultPageSize: 50,
  chartPointSize: "XS",
  defaultDashboardPreset: "noc",
  graphWindow: 60,
  linuxProfile: "lxc",
  accessRole: "analyst",
  ubuntuVersion: "22.04",
  deepAnalysis: true,
  severityFloor: "high",
  autoToast: true
};

const roles = {
  analyst: { label: "Analyst", note: "No root required." },
  root: { label: "Root", note: "Full host access." }
};

const linuxProfiles = {
  lxc: { note: "Container namespace view." },
  native: { note: "Native host view." }
};

function render(tab, overrides = {}) {
  const prefs = { ...basePrefs, ...(overrides.prefs || {}) };
  return renderPrefsView({
    state: { prefsTab: tab, prefs },
    html,
    icons: { columns: "[columns]", reset: "[reset]", threshold: "[threshold]", layout: "[layout]", saveDisk: "[save]" },
    escapeHtml,
    formatNumber: value => new Intl.NumberFormat("en-US").format(value),
    resolvedNumberLocale: () => "en-US",
    hasRealTimestampHistory: () => Boolean(overrides.realTimeline),
    chartTooltipOpacity: () => overrides.tooltipOpacity ?? 0.8,
    renderTimeZoneOptions: () => "<option>UTC</option>",
    renderDashboardPresetOptions: value => `<option value="${value}" selected>${value}</option>`,
    ACCESS_ROLES: overrides.roles || roles,
    UBUNTU_PROFILES: { "22.04": "Ubuntu 22.04 LTS", "24.04": "Ubuntu 24.04 LTS" },
    LINUX_PROFILES: overrides.linuxProfiles || linuxProfiles,
    linuxProfileLabel: () => overrides.linuxLabel || "Linux Container LXC/LXD",
    accessRoleLabel: () => overrides.roleLabel || "Analyst",
    ubuntuProfileLabel: () => overrides.ubuntuLabel || "Ubuntu 22.04 LTS"
  });
}

test("preferences display tab renders locale choices, preview, and save action", () => {
  const output = render("display");
  assert.match(output, /prefs-shell/);
  assert.match(output, /data-pref-tab="display"/);
  assert.match(output, /class="app-tab active" data-pref-tab="display"/);
  assert.match(output, /Number and visual formatting/);
  assert.match(output, /id="prefNumberLocale"/);
  assert.match(output, /value="fr-FR" selected/);
  assert.match(output, /id="prefNumberGrouping" type="checkbox" checked/);
  assert.match(output, /1,048,576/);
  assert.match(output, /data-action="savePrefs"/);
});

test("preferences table tab renders table controls and grid actions", () => {
  const output = render("table");
  assert.match(output, /Table ergonomics/);
  assert.match(output, /id="prefCompact" type="checkbox" checked/);
  assert.match(output, /id="prefTableUnits" type="checkbox" checked/);
  assert.match(output, /id="prefPagination"/);
  assert.match(output, /value="both" selected/);
  assert.match(output, /id="prefPageSize"/);
  assert.match(output, /50 rows/);
  assert.match(output, /data-action="columns"/);
  assert.match(output, /data-action="resetGrid"/);
});

test("preferences charts tab renders chart defaults and disables synthetic fallback for real timelines", () => {
  const output = render("charts", { realTimeline: true, tooltipOpacity: 0.75 });
  assert.match(output, /Chart defaults/);
  assert.match(output, /id="prefChartTimeZone"/);
  assert.match(output, /<option>UTC<\/option>/);
  assert.match(output, /id="prefChartPointSize"/);
  assert.match(output, /XS - 1 px/);
  assert.match(output, /id="prefDefaultDashboardPreset"/);
  assert.match(output, /<option value="noc" selected>noc<\/option>/);
  assert.match(output, /id="prefTooltipOpacity" type="range"[^>]+value="0.75"/);
  assert.match(output, /<b>75%<\/b> opacity/);
  assert.match(output, /synthetic-pref disabled/);
  assert.match(output, /id="prefWindow"[^>]+disabled/);
  assert.match(output, /data-action="layoutPrefs"/);
});

test("preferences system tab renders Linux profile, role, Ubuntu baseline, and escaped notes", () => {
  const output = render("system", {
    linuxLabel: "LXC <container>",
    roleLabel: "Analyst <safe>",
    ubuntuLabel: "Ubuntu <22.04>",
    roles: { analyst: { label: "Analyst", note: "No <root> required." } },
    linuxProfiles: { lxc: { note: "Container <namespace> view." } }
  });
  assert.match(output, /Linux collection target/);
  assert.match(output, /id="prefLinuxProfile"/);
  assert.match(output, /value="lxc" selected/);
  assert.match(output, /id="prefAccessRole"/);
  assert.match(output, /id="prefUbuntuVersion"/);
  assert.match(output, /LXC &lt;container&gt; - Analyst &lt;safe&gt; - Ubuntu &lt;22\.04&gt;/);
  assert.match(output, /No &lt;root&gt; required/);
  assert.match(output, /Container &lt;namespace&gt; view/);
  assert.doesNotMatch(output, /<root>/);
});

test("preferences alerts tab renders analysis and anomaly behavior controls", () => {
  const output = render("alerts");
  assert.match(output, /Alert behavior/);
  assert.match(output, /id="prefSeverity"/);
  assert.match(output, /<option selected>high<\/option>/);
  assert.match(output, /id="prefToast" type="checkbox" checked/);
});
