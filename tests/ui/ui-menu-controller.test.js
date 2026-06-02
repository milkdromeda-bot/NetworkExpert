import assert from "node:assert/strict";
import { test } from "node:test";

import { createUiMenuController } from "../../src/rendering/controllers/ui-menu-controller.js";

test("ui menu controller closes floating menus and cancels dashboard preview", () => {
  let resetThemePreview = 0;
  const state = {
    activeDashboardPreset: "preview",
    dashboardPresetBeforeOpen: "ops",
    drawer: "tableSettings",
    openChartMoveMetric: "rtt",
    openChartMovePos: { x: 1 },
    openConversationInsightKey: "conv",
    openConversationInsightPos: { x: 2 },
    openDashboardPresetMenu: true,
    openExportMenu: "analysis",
    openExportMenuPos: { x: 3 },
    openMenuId: "row",
    openMenuPos: { x: 4 },
    openSsEditorThemeMenu: true,
    openStyleMenu: true,
    openTableSettings: true,
    openTableSettingsPos: { x: 5 }
  };
  const controller = createUiMenuController(() => ({
    dashboardPresetIdOrDefault: value => `default:${value}`,
    resetSsEditorThemePreview: () => { resetThemePreview += 1; },
    state
  }));

  assert.equal(controller.closeFloatingMenus({ cancelDashboard: true }), true);
  assert.equal(state.activeDashboardPreset, "default:ops");
  assert.equal(state.openDashboardPresetMenu, false);
  assert.equal(state.openSsEditorThemeMenu, false);
  assert.equal(state.openExportMenu, null);
  assert.equal(state.openTableSettings, false);
  assert.equal(state.openMenuId, null);
  assert.equal(state.openChartMoveMetric, null);
  assert.equal(state.openConversationInsightKey, null);
  assert.equal(state.drawer, null);
  assert.equal(resetThemePreview, 1);
});

test("escape key renders only when a floating menu was closed", () => {
  let rendered = 0;
  let prevented = 0;
  const state = { openDashboardPresetMenu: false };
  const controller = createUiMenuController(() => ({
    redo: () => {},
    renderKeepingWorkspacePosition: () => { rendered += 1; },
    resetSsEditorThemePreview: () => {},
    state,
    undo: () => {}
  }));

  controller.handleGlobalKeydown({ key: "Escape", preventDefault: () => { prevented += 1; } });
  assert.equal(rendered, 0);
  state.openExportMenu = "analysis";
  controller.handleGlobalKeydown({ key: "Escape", preventDefault: () => { prevented += 1; } });
  assert.equal(rendered, 1);
  assert.equal(prevented, 1);
});
