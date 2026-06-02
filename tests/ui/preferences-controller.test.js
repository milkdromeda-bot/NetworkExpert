import assert from "node:assert/strict";
import { test } from "node:test";

import { createPreferencesController } from "../../src/rendering/preferences-controller.js";

function deps(overrides = {}) {
  const saved = {
    chartLayout: { columns: 99, tooltipOpacity: "bad" },
    defaultDashboardPreset: "missing",
    ssEditorTheme: "bright",
    bdpDirection: "sideways",
    sampling: 5,
    chartResolutionDefault: "auto",
    configuredLinkCapacityMbps: "1000"
  };
  const state = {
    annotations: [{ id: "a" }],
    cache: { visibleHistoryKey: "x", visibleHistoryRows: [1], visibleHistoryRowsByKey: new Map([["a", 1]]) },
    prefs: { chartLayout: { columns: 4, tooltipOpacity: 0.9 }, defaultDashboardPreset: "ops", ssEditorTheme: "bright", bdpDirection: "inbound" },
    table: { page: 2 }
  };
  return {
    state,
    DASHBOARD_PRESETS: { noc: { name: "NOC" }, ops: { name: "Ops" } },
    TABLE_COLUMNS: [{ key: "risk" }],
    clampChartColumns: value => Math.min(Number(value) || 1, 12),
    configuredLinkCapacityMbps: () => 2500,
    defaultTableState: pageSize => ({ page: 1, pageSize, visible: ["risk"] }),
    escapeHtml: value => String(value ?? "").replaceAll("&", "&amp;"),
    loadPrefsRaw: () => saved,
    loadTableStateRaw: () => ({ page: 3 }),
    normalizeBdpDirection: value => value === "outbound" ? "outbound" : "inbound",
    normalizeSsEditorTheme: value => value === "bright" ? value : "dark",
    normalizeTableState: table => ({ normalized: true, ...table }),
    prefsDefault: { defaultDashboardPreset: "noc", defaultPageSize: 25, chartLayout: { columns: 2, tooltipOpacity: 0.5 } },
    saveAnnotationsRaw: annotations => [...annotations, { id: "saved" }],
    savePrefsRaw: prefs => { state.savedPrefs = prefs; },
    saveTableStateRaw: table => ({ ...table, saved: true }),
    tableDefaults: () => ({ page: 1 }),
    ...overrides
  };
}

test("preferences controller normalizes loaded preferences", () => {
  const controller = createPreferencesController(() => deps());
  const prefs = controller.loadPrefs();

  assert.equal(prefs.chartLayout.columns, 12);
  assert.equal(prefs.chartLayout.tooltipOpacity, 0.3);
  assert.equal(prefs.defaultDashboardPreset, "noc");
  assert.equal(prefs.ssEditorTheme, "bright");
  assert.equal(prefs.bdpDirection, "inbound");
  assert.equal(prefs.sampling, 1);
  assert.equal(prefs.chartResolutionDefault, "max");
  assert.equal(prefs.configuredLinkCapacityMbps, 1000);
});

test("preferences controller saves state and clears visible history cache", () => {
  const context = deps();
  const controller = createPreferencesController(() => context);

  controller.savePrefs();
  assert.equal(context.state.savedPrefs.chartLayout.tooltipOpacity, 0.9);
  assert.equal(context.state.savedPrefs.configuredLinkCapacityMbps, 2500);
  assert.deepEqual(controller.loadTableState(50), { normalized: true, page: 3, pageSize: 50, visible: ["risk"] });
  controller.saveTableState();
  assert.equal(context.state.table.saved, true);
  controller.clearVisibleHistoryCache();
  assert.equal(context.state.cache.visibleHistoryKey, "");
  assert.equal(context.state.cache.visibleHistoryRows, null);
  assert.equal(context.state.cache.visibleHistoryRowsByKey.size, 0);
  controller.saveAnnotations();
  assert.deepEqual(context.state.annotations, [{ id: "a" }, { id: "saved" }]);
});
