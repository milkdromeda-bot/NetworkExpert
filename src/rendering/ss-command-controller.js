export function createSsCommandController(getDeps) {
  const current = () => getDeps();

  function ssOptionIntel(short, long, desc, group) {
    const { SS_OPTION_INTEL, ssOptionIntelView } = current();
    return ssOptionIntelView(SS_OPTION_INTEL, short, long, desc, group);
  }

  function selectedSsOption(options, active) {
    const { selectedSsOptionView, state } = current();
    return selectedSsOptionView(options, active, state.ssOptionHelpKey);
  }

  function renderSsOptionDetail(option) {
    const { escapeHtml, renderSsOptionDetailView } = current();
    return renderSsOptionDetailView(option, { escapeHtml, ssOptionIntel });
  }

  function renderSsOptionChip(option) {
    const { escapeHtml, renderSsOptionChipView } = current();
    return renderSsOptionChipView(option, { escapeHtml, ssOptionIntel });
  }

  function renderExportMenu(scope = "analysis") {
    const { escapeHtml, icons, state } = current();
    const open = state.openExportMenu === scope;
    const pos = open && state.openExportMenuPos
      ? `style="left:${state.openExportMenuPos.left}px;top:${state.openExportMenuPos.top}px"`
      : "";
    return `<span class="export-menu-wrap">
    <button data-export-menu="${escapeHtml(scope)}" title="Export report or evidence pack">${icons.pack} Export</button>
    <div class="row-menu export-menu gdrive-menu ${open ? "open" : ""}" ${pos}>
      <button data-export-action="pdf"><i class="ri-file-pdf-line"></i><span>Executive summary PDF</span><kbd>Ctrl+Shift+P</kbd></button>
      <button data-export-action="incident-html"><i class="ri-file-code-line"></i><span>Full incident report HTML</span><kbd>Ctrl+Shift+H</kbd></button>
      <button data-export-action="pack"><i class="ri-folder-zip-line"></i><span>Evidence pack ZIP</span><kbd>Ctrl+Shift+Z</kbd></button>
      <button data-export-action="jira"><i class="ri-clipboard-line"></i><span>Copy Jira report</span><kbd>Ctrl+Shift+J</kbd></button>
      ${state.fixLatency.correlation?.results?.length ? `<button data-export-action="fix-csv"><i class="ri-file-excel-line"></i><span>FIX spikes CSV</span><kbd>Ctrl+Shift+F</kbd></button>` : ""}
    </div>
  </span>`;
  }

  function renderSsOptionControl(option, coverage, selectedKey) {
    const { escapeHtml, renderSsOptionControlView } = current();
    return renderSsOptionControlView(option, coverage, selectedKey, { escapeHtml, ssOptionIntel });
  }

  function renderSsCommandBuilder() {
    const { defaultSsLogPath, escapeHtml, parseUiIntervalSeconds, renderSsCommandBuilderView, state, validateSsCommandConfig } = current();
    return renderSsCommandBuilderView({ state, parseUiIntervalSeconds, validateSsCommandConfig, escapeHtml, defaultSsLogPath });
  }

  function readSsCommandConfig() {
    const { document, readSsCommandConfigFromDocument } = current();
    return readSsCommandConfigFromDocument(document);
  }

  function updateSsCommandValidation(validation) {
    const { document, updateSsCommandValidationInDocument } = current();
    updateSsCommandValidationInDocument(validation, document);
  }

  function syncSsCommandFromBuilder({ updateWarning = true } = {}) {
    const { buildSsCollectionCommand, document, parseUiIntervalSeconds, state, validateSsCommandConfig } = current();
    const commandInput = document.querySelector("#commandInput");
    state.ssCommandConfig = readSsCommandConfig();
    const validation = validateSsCommandConfig(state.ssCommandConfig);
    updateSsCommandValidation(validation);
    if (validation.valid) {
      state.command = buildSsCollectionCommand(commandInput ? commandInput.value : state.command, state.ssCommandConfig);
      if (commandInput) commandInput.value = state.command;
    }
    if (updateWarning) {
      const interval = parseUiIntervalSeconds(state.ssCommandConfig.intervalSeconds);
      const risky = Boolean(state.ssCommandConfig.outputPath && state.ssCommandConfig.appendOutput !== false && state.ssCommandConfig.loop && interval <= 0.05);
      document.querySelector("[data-ss-command-warning]")?.classList.toggle("hidden", !risky);
      const intervalNode = document.querySelector("[data-ss-warning-interval]");
      if (intervalNode) intervalNode.textContent = state.ssCommandConfig.intervalSeconds || "1";
    }
    return { command: state.command, validation };
  }

  return {
    readSsCommandConfig,
    renderExportMenu,
    renderSsCommandBuilder,
    renderSsOptionChip,
    renderSsOptionControl,
    renderSsOptionDetail,
    selectedSsOption,
    ssOptionIntel,
    syncSsCommandFromBuilder,
    updateSsCommandValidation
  };
}
