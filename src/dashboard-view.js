export function dashboardPresetIcon(presetId) {
  return { noc: "ri-dashboard-3-line", latency: "ri-pulse-line", tail: "ri-line-chart-line", drops: "ri-error-warning-line", microburst: "ri-flashlight-line", throughput: "ri-route-line", bdp: "ri-speed-up-line", warroom: "ri-team-line" }[presetId] || "ri-dashboard-3-line";
}

export function renderDashboardPresetPicker(ctx, activePresetId, presetEntries) {
  const { state, escapeHtml } = ctx;
  const DASHBOARD_PRESETS = ctx.DASHBOARD_PRESETS;
  const activePreset = DASHBOARD_PRESETS[activePresetId] || presetEntries[0]?.[1];
  const activeIcon = dashboardPresetIcon(activePresetId);
  const open = state.openDashboardPresetMenu;
  return `<div class="dashboard-preset-picker" id="dashboardPresetPicker">
    <button class="dashboard-preset-trigger" data-dashboard-preset-toggle aria-expanded="${open ? "true" : "false"}" title="${escapeHtml(activePreset?.description || "Choose an expert dashboard preset.")}">
      <span class="dashboard-preset-icon"><i class="${escapeHtml(activeIcon)}"></i></span>
      <span class="dashboard-preset-current">${escapeHtml(activePreset?.name || "Choose preset")}</span>
      <i class="ri-arrow-down-s-line dashboard-preset-chevron"></i>
    </button>
    <div class="dashboard-preset-menu ${open ? "open" : ""}" role="listbox" aria-label="Expert dashboard presets">
      ${presetEntries.map(([id, preset]) => `<button class="dashboard-preset-option ${id === activePresetId ? "selected" : ""}" data-dashboard-preset-choice="${escapeHtml(id)}" role="option" aria-selected="${id === activePresetId ? "true" : "false"}" aria-label="${escapeHtml(`${preset.name}: ${preset.description}`)}"><span class="dashboard-preset-icon"><i class="${escapeHtml(dashboardPresetIcon(id))}"></i></span><span class="dashboard-preset-option-copy"><strong>${escapeHtml(preset.name)}</strong><small>${escapeHtml(preset.description)}</small></span></button>`).join("")}
    </div>
  </div>`;
}

export function renderDashboardStudioInline(ctx) {
  const { state, escapeHtml, icons } = ctx;
  const DASHBOARD_PRESETS = ctx.DASHBOARD_PRESETS;
  const presetEntries = Object.entries(DASHBOARD_PRESETS);
  const activePresetId = DASHBOARD_PRESETS[state.activeDashboardPreset] ? state.activeDashboardPreset : presetEntries[0]?.[0];
  const presetPicker = renderDashboardPresetPicker(ctx, activePresetId, presetEntries);
  const savedOptions = state.dashboardProfiles.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");
  return `<div class="dashboard-studio-inline">
    <div class="dashboard-inline-control"><span>Preset</span>${presetPicker}</div>
    <div class="dashboard-inline-control"><select id="savedDashboardSelect" ${state.dashboardProfiles.length ? "" : "disabled"}>${state.dashboardProfiles.length ? savedOptions : `<option>No saved</option>`}</select><button data-action="loadSelectedDashboard" ${state.dashboardProfiles.length ? "" : "disabled"} title="Load">${icons.load}</button></div>
    <div class="dashboard-inline-control"><input id="dashboardName" placeholder="Save as..." /><button class="primary" data-action="saveDashboard" title="Save">${icons.saveDisk}</button></div>
  </div>`;
}

export function renderDashboardStudio(ctx) {
  const { state, escapeHtml, icons, resolvedNumberLocale } = ctx;
  const DASHBOARD_PRESETS = ctx.DASHBOARD_PRESETS;
  const presetEntries = Object.entries(DASHBOARD_PRESETS);
  const activePresetId = DASHBOARD_PRESETS[state.activeDashboardPreset] ? state.activeDashboardPreset : presetEntries[0]?.[0];
  const presetPicker = renderDashboardPresetPicker(ctx, activePresetId, presetEntries);
  const savedOptions = state.dashboardProfiles.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} - ${escapeHtml(new Date(p.createdAt).toLocaleString(resolvedNumberLocale()))}</option>`).join("");
  return `<section class="dashboard-studio compact">
    <div class="dashboard-compact-bar dashboard-compact-bar--single">
      <div class="dashboard-compact-title"><span class="tooltip-kicker">Dashboard studio</span><strong>Operational dashboards</strong></div>
      <div class="dashboard-control dashboard-preset-control"><span>Expert preset</span>${presetPicker}</div>
      <div class="dashboard-divider" aria-hidden="true"></div>
      <label class="dashboard-control dashboard-saved-select"><span>Saved dashboards</span><select id="savedDashboardSelect" ${state.dashboardProfiles.length ? "" : "disabled"}>${state.dashboardProfiles.length ? savedOptions : `<option>No saved dashboard yet</option>`}</select></label>
      <div class="dashboard-saved-actions"><button data-action="loadSelectedDashboard" ${state.dashboardProfiles.length ? "" : "disabled"} title="Load selected dashboard">${icons.load} Load</button><button data-action="deleteSelectedDashboard" ${state.dashboardProfiles.length ? "" : "disabled"} title="Delete selected dashboard">${icons.trash} Delete</button></div>
      <label class="dashboard-control dashboard-save-name"><span>Save current</span><input id="dashboardName" placeholder="Dashboard name" /></label>
      <button class="primary dashboard-save-button" data-action="saveDashboard" title="Save current chart layout">${icons.saveDisk} Save</button>
    </div>
  </section>`;
}
