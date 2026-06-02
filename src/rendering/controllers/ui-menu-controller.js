export function createUiMenuController(getDeps) {
  const current = () => getDeps();
  let dashboardPresetRenderFrame = 0;

  function closeDashboardPresetMenu(cancel = false) {
    const { dashboardPresetIdOrDefault, state } = current();
    if (!state.openDashboardPresetMenu) return false;
    if (cancel) {
      state.activeDashboardPreset = dashboardPresetIdOrDefault(state.dashboardPresetBeforeOpen || state.activeDashboardPreset);
    }
    state.openDashboardPresetMenu = false;
    state.dashboardPresetBeforeOpen = null;
    return true;
  }

  function updateDashboardPresetPickerChrome(presetId) {
    const { DASHBOARD_PRESETS, dashboardPresetIcon, document } = current();
    const preset = DASHBOARD_PRESETS[presetId];
    const picker = document.querySelector("#dashboardPresetPicker");
    if (!preset || !picker) return;
    const trigger = picker.querySelector("[data-dashboard-preset-toggle]");
    const label = picker.querySelector(".dashboard-preset-current");
    const icon = picker.querySelector(".dashboard-preset-trigger .dashboard-preset-icon i");
    const menu = picker.querySelector(".dashboard-preset-menu");
    trigger?.setAttribute("aria-expanded", "false");
    trigger?.setAttribute("title", preset.description || "Choose an expert dashboard preset.");
    if (label) label.textContent = preset.name || "Choose preset";
    if (icon) icon.className = dashboardPresetIcon(presetId);
    menu?.classList.remove("open");
    picker.querySelectorAll("[data-dashboard-preset-choice]").forEach(option => {
      const selected = option.dataset.dashboardPresetChoice === presetId;
      option.classList.toggle("selected", selected);
      option.setAttribute("aria-selected", selected ? "true" : "false");
    });
  }

  function scheduleDashboardPresetRender() {
    const { cancelAnimationFrame, renderKeepingWorkspacePosition, requestAnimationFrame } = current();
    if (dashboardPresetRenderFrame) cancelAnimationFrame(dashboardPresetRenderFrame);
    dashboardPresetRenderFrame = requestAnimationFrame(() => {
      dashboardPresetRenderFrame = requestAnimationFrame(() => {
        dashboardPresetRenderFrame = 0;
        renderKeepingWorkspacePosition();
      });
    });
  }

  function commitDashboardPresetChoice(presetId) {
    const { DASHBOARD_PRESETS, applyDashboardPreset, state, toast } = current();
    const preset = DASHBOARD_PRESETS[presetId];
    if (!preset) return;
    state.openDashboardPresetMenu = false;
    state.dashboardPresetBeforeOpen = null;
    applyDashboardPreset(presetId);
    updateDashboardPresetPickerChrome(presetId);
    toast("Dashboard preset applied", preset.name || "Preset applied.");
    scheduleDashboardPresetRender();
  }

  function closeFloatingMenus(options = {}) {
    const { resetSsEditorThemePreview, state } = current();
    let changed = closeDashboardPresetMenu(Boolean(options.cancelDashboard));
    if (state.openStyleMenu) {
      state.openStyleMenu = false;
      changed = true;
    }
    if (state.openSsEditorThemeMenu) {
      state.openSsEditorThemeMenu = false;
      resetSsEditorThemePreview();
      changed = true;
    }
    if (state.openExportMenu || state.openExportMenuPos) {
      state.openExportMenu = null;
      state.openExportMenuPos = null;
      changed = true;
    }
    if (state.openTableSettings || state.openTableSettingsPos) {
      state.openTableSettings = false;
      state.openTableSettingsPos = null;
      changed = true;
    }
    if (state.openMenuId || state.openMenuPos) {
      state.openMenuId = null;
      state.openMenuPos = null;
      changed = true;
    }
    if (state.openChartMoveMetric || state.openChartMovePos) {
      state.openChartMoveMetric = null;
      state.openChartMovePos = null;
      changed = true;
    }
    if (state.openConversationInsightKey || state.openConversationInsightPos) {
      state.openConversationInsightKey = null;
      state.openConversationInsightPos = null;
      changed = true;
    }
    if (state.drawer === "tableSettings") {
      state.drawer = null;
      changed = true;
    }
    return changed;
  }

  function handleGlobalKeydown(event) {
    const { renderKeepingWorkspacePosition, redo, undo } = current();
    if (event.ctrlKey && event.key === "z" && !event.shiftKey) {
      event.preventDefault();
      undo();
      return;
    }
    if (event.ctrlKey && (event.key === "y" || (event.key === "z" && event.shiftKey))) {
      event.preventDefault();
      redo();
      return;
    }
    if (event.key !== "Escape") return;
    if (!closeFloatingMenus({ cancelDashboard: true })) return;
    event.preventDefault();
    renderKeepingWorkspacePosition();
  }

  return {
    closeDashboardPresetMenu,
    closeFloatingMenus,
    commitDashboardPresetChoice,
    handleGlobalKeydown,
    scheduleDashboardPresetRender,
    updateDashboardPresetPickerChrome
  };
}
