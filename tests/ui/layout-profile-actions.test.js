import assert from "node:assert/strict";
import { test } from "node:test";
import { handleLayoutProfileAction } from "../../src/layout-profile-actions.js";

function fakeDocument(values = {}) {
  return {
    querySelector(selector) {
      return values[selector] || null;
    },
    querySelectorAll(selector) {
      return values[selector] || [];
    }
  };
}

function input(value, checked = false, dataset = {}) {
  return {
    value,
    checked,
    dataset,
    remove() {}
  };
}

function deps(values = {}) {
  const calls = [];
  const state = {
    drawer: "thresholds",
    modal: "layout",
    thresholds: { rtt: { warning: 10 } },
    prefs: {
      defaultPageSize: 20,
      defaultDashboardPreset: "noc",
      chartLayout: { columns: 2, density: "compact", tooltipOpacity: 0.8 }
    },
    table: { page: 2, pageSize: 50, filters: {}, visible: ["risk"] },
    tableProfiles: [],
    dashboardProfiles: [{ id: "d1", name: "old" }]
  };
  return {
    calls,
    state,
    deps: {
      document: fakeDocument(values),
      state,
      DEFAULT_TABLE_ORDER: ["risk", "state", "local"],
      parseFormattedNumber: value => Number(value),
      cloneThresholds: () => ({ rtt: { warning: 20 } }),
      clampChartColumns: value => Number(value),
      clampChartTooltipOpacity: value => Number(value),
      defaultTableColumns: () => ["risk", "state", "local"],
      saveTableState: () => calls.push("saveTableState"),
      tableLayoutSnapshot: name => ({ id: `layout-${name}`, name }),
      saveTableProfiles: () => calls.push("saveTableProfiles"),
      applyDashboardProfile: profile => calls.push(`applyDashboardProfile:${profile?.id}`),
      saveDashboardProfiles: () => calls.push("saveDashboardProfiles"),
      dashboardSnapshot: name => ({ id: `dashboard-${name}`, name }),
      dashboardPresetIdOrDefault: value => value || "noc",
      savePrefs: () => calls.push("savePrefs"),
      toast: title => calls.push(`toast:${title}`),
      renderKeepingWorkspacePosition: () => calls.push("renderStable"),
      render: () => calls.push("render")
    }
  };
}

test("layout profile action saves threshold values from form inputs", () => {
  const ctx = deps({
    "[data-threshold]": [input("42", false, { threshold: "rtt", thresholdKey: "warning" })]
  });

  const handled = handleLayoutProfileAction("saveThresholds", {}, ctx.deps);

  assert.equal(handled, true);
  assert.equal(ctx.state.thresholds.rtt.warning, 42);
  assert.equal(ctx.state.drawer, null);
  assert.deepEqual(ctx.calls, ["toast:Thresholds saved", "render"]);
});

test("layout profile action resets the socket table grid", () => {
  const ctx = deps();

  const handled = handleLayoutProfileAction("resetGrid", {}, ctx.deps);

  assert.equal(handled, true);
  assert.equal(ctx.state.table.page, 1);
  assert.deepEqual(ctx.state.table.pinned, ["risk", "state", "local"]);
  assert.deepEqual(ctx.state.table.order, ["risk", "state", "local"]);
  assert.ok(ctx.calls.includes("saveTableState"));
});

test("layout profile action saves preferences with dashboard defaults", () => {
  const ctx = deps({
    "#prefDefaultDashboardPreset": input("deep"),
    "#prefPageSize": input("50"),
    "#prefWindow": input("120"),
    "#prefTooltipOpacity": input("0.6")
  });

  const handled = handleLayoutProfileAction("savePrefs", {}, ctx.deps);

  assert.equal(handled, true);
  assert.equal(ctx.state.prefs.defaultDashboardPreset, "deep");
  assert.equal(ctx.state.prefs.defaultPageSize, 50);
  assert.equal(ctx.state.table.pageSize, 50);
  assert.equal(ctx.state.prefs.graphWindow, 120);
  assert.equal(ctx.state.prefs.chartLayout.tooltipOpacity, 0.6);
  assert.ok(ctx.calls.includes("savePrefs"));
});
