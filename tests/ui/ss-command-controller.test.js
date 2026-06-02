import assert from "node:assert/strict";
import { test } from "node:test";

import { createSsCommandController } from "../../src/rendering/ss-command-controller.js";

function fakeDocument() {
  const commandInput = { value: "ss -t" };
  const warning = { classList: { toggled: null, toggle(_name, value) { this.toggled = value; } } };
  const warningInterval = { textContent: "" };
  return {
    commandInput,
    warning,
    warningInterval,
    querySelector(selector) {
      if (selector === "#commandInput") return commandInput;
      if (selector === "[data-ss-command-warning]") return warning;
      if (selector === "[data-ss-warning-interval]") return warningInterval;
      return null;
    }
  };
}

function deps(overrides = {}) {
  const document = fakeDocument();
  const state = {
    command: "ss",
    fixLatency: { correlation: { results: [1] } },
    openExportMenu: "analysis",
    openExportMenuPos: { left: 10, top: 20 },
    ssCommandConfig: {},
    ssOptionHelpKey: "-i"
  };
  return {
    state,
    document,
    SS_OPTION_INTEL: { "-i": { title: "Info" } },
    buildSsCollectionCommand: (command, config) => `${command} every ${config.intervalSeconds}`,
    defaultSsLogPath: () => "/tmp/ss.log",
    escapeHtml: value => String(value ?? ""),
    icons: { pack: "pack" },
    parseUiIntervalSeconds: value => Number(String(value).replace(",", ".")),
    readSsCommandConfigFromDocument: () => ({ intervalSeconds: "0.01", loop: true, outputPath: "/tmp/ss.log", appendOutput: true }),
    renderSsCommandBuilderView: ctx => `builder:${ctx.defaultSsLogPath()}`,
    renderSsOptionChipView: (_option, ctx) => ctx.ssOptionIntel("-i").title,
    renderSsOptionControlView: (_option, _coverage, selected) => `control:${selected}`,
    renderSsOptionDetailView: (_option, ctx) => ctx.ssOptionIntel("-i").title,
    selectedSsOptionView: (_options, active, helpKey) => `${active}:${helpKey}`,
    ssOptionIntelView: (intel, key) => intel[key],
    updateSsCommandValidationInDocument: validation => { state.validation = validation; },
    validateSsCommandConfig: () => ({ valid: true }),
    ...overrides
  };
}

test("ss command controller renders options and export menu", () => {
  const controller = createSsCommandController(() => deps());

  assert.equal(controller.selectedSsOption([], "active"), "active:-i");
  assert.equal(controller.renderSsOptionChip({}), "Info");
  assert.match(controller.renderExportMenu("analysis"), /data-export-action="fix-csv"/);
  assert.equal(controller.renderSsCommandBuilder(), "builder:/tmp/ss.log");
});

test("ss command controller syncs command and warning state", () => {
  const context = deps();
  const controller = createSsCommandController(() => context);

  const result = controller.syncSsCommandFromBuilder();

  assert.deepEqual(result.validation, { valid: true });
  assert.equal(context.state.command, "ss -t every 0.01");
  assert.equal(context.document.commandInput.value, "ss -t every 0.01");
  assert.equal(context.document.warning.classList.toggled, false);
  assert.equal(context.document.warningInterval.textContent, "0.01");
});
