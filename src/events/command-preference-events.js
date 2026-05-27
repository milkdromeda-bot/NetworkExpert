export function bindCommandPreferenceEvents(deps = {}) {
  const {
    document,
    state,
    applySsEditorThemePreview,
    drawJvmCharts,
    normalizeSsEditorTheme,
    render,
    renderKeepingWorkspacePosition,
    requestAnimationFrame = globalThis.requestAnimationFrame || (fn => setTimeout(fn, 16)),
    resetSsEditorThemePreview,
    runJvmCorrelation,
    savePrefs,
    syncFromCodeMirror = () => {},
    syncSsCommandFromBuilder,
    toggleCommandOption
  } = deps;

  document.querySelectorAll("[data-opt]").forEach(input => {
    const stopOptionBubble = event => event.stopPropagation();
    input.addEventListener("pointerdown", stopOptionBubble);
    input.addEventListener("click", stopOptionBubble);
    input.addEventListener("change", event => {
      event.stopPropagation();
      const opt = event.currentTarget.dataset.opt;
      state.ssOptionHelpKey = opt;
      state.command = toggleCommandOption(state.command, opt, event.currentTarget.checked);
      const cmdEl = document.querySelector(".ss-command-text");
      if (cmdEl) { cmdEl.textContent = state.command; return; }
      renderKeepingWorkspacePosition();
    });
  });
  document.querySelectorAll("[id^='ssCmd']").forEach(input => {
    const eventName = input.type === "checkbox" ? "change" : "input";
    input.addEventListener(eventName, () => syncSsCommandFromBuilder());
  });
  document.querySelector("#commandInput")?.addEventListener("input", event => {
    state.command = event.currentTarget.value;
  });
  document.querySelectorAll("[data-ss-option-help]").forEach(button => {
    const showHelp = event => {
      if (event.target?.closest("label.ss-option-check")) return;
      event.stopPropagation();
      const nextKey = event.currentTarget.dataset.ssOptionHelp;
      if (!nextKey || nextKey === state.ssOptionHelpKey) return;
      state.ssOptionHelpKey = nextKey;
      renderKeepingWorkspacePosition();
    };
    button.addEventListener("click", showHelp);
    button.addEventListener("focus", showHelp);
    button.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      showHelp(event);
    });
  });
  for (const [id, key] of [["metricSelect", "graphMetric"], ["styleSelect", "graphStyle"]]) {
    document.querySelector(`#${id}`)?.addEventListener("change", event => {
      state.prefs[key] = event.target.value;
      savePrefs();
      renderKeepingWorkspacePosition();
    });
  }
  document.querySelector("[data-ss-theme-picker]")?.addEventListener("pointerleave", () => {
    if (state.openSsEditorThemeMenu) resetSsEditorThemePreview();
  });
  document.querySelectorAll("[data-ss-editor-theme-preview]").forEach(button => {
    const preview = event => {
      event.stopPropagation();
      applySsEditorThemePreview(event.currentTarget.dataset.ssEditorThemePreview);
    };
    button.addEventListener("pointerenter", preview);
    button.addEventListener("focus", preview);
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      syncFromCodeMirror();
      state.prefs.ssEditorTheme = normalizeSsEditorTheme(event.currentTarget.dataset.ssEditorThemePreview);
      state.openSsEditorThemeMenu = false;
      savePrefs();
      renderKeepingWorkspacePosition();
    });
    button.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        state.openSsEditorThemeMenu = false;
        resetSsEditorThemePreview();
        renderKeepingWorkspacePosition();
      }
    });
  });
  document.querySelector("#chartTimeZoneSelect")?.addEventListener("change", event => {
    state.prefs.chartTimeZone = event.target.value;
    savePrefs();
    renderKeepingWorkspacePosition();
  });
  document.querySelector("#jvmSyncCrosshair")?.addEventListener("change", event => {
    state.jvmGc.syncCrosshair = event.target.checked;
  });
  document.querySelector("#jvmSeverityFilter")?.addEventListener("change", event => {
    state.jvmGc.severityFilter = event.target.value;
    if (state.jvmTable) state.jvmTable.page = 1;
    render();
    requestAnimationFrame(drawJvmCharts);
  });
  document.querySelector("#jvmClockOffset")?.addEventListener("change", event => {
    state.jvmGc.clockOffsetMs = Number(event.target.value) || 0;
    runJvmCorrelation();
    render();
    requestAnimationFrame(drawJvmCharts);
  });
}
