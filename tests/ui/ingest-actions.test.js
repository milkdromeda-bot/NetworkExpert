import assert from "node:assert/strict";
import { test } from "node:test";
import { handleIngestAction } from "../../src/events/ingest-actions.js";

function createDeps(overrides = {}) {
  const calls = [];
  const rawInput = { value: overrides.rawInputValue ?? "tcp ESTAB 0 0 10.0.0.1:1 10.0.0.2:2" };
  const commandInput = { value: "ss -HOntepmi" };
  const workspace = { innerHTML: "" };
  const state = {
    raw: "existing",
    importStatus: { label: "loading" },
    ingestRawExpanded: false,
    showSsOptions: false,
    showEditor: false,
    editorWordWrap: false,
    openSsEditorThemeMenu: false,
    analysisSidebarCollapsed: false,
    breadcrumbMenuOpen: false,
    prefs: { autoToast: false, guidedChecklistCollapsed: false },
    anomalies: [],
    sockets: [],
    jvmGc: { pauses: [], safepoints: [], rawLog: "" },
    selectedId: "socket-1",
    drawer: "guide",
    view: "import",
    activeTab: "diagnosis",
    ssCommandConfig: {},
    command: "ss",
    ...overrides.state
  };

  const deps = {
    document: {
      querySelector(selector) {
        if (selector === "#rawInput") return rawInput;
        if (selector === "#commandInput") return commandInput;
        if (selector === ".workspace") return workspace;
        return null;
      }
    },
    state,
    cmInstance: overrides.cmInstance ?? null,
    performance: { now: () => overrides.now ?? 1000 },
    SAMPLE: "sample raw",
    INGEST_RAW_EAGER_LIMIT: 100,
    generateIncidentDemoSample: () => "incident raw",
    generateSlowConsumerSample: () => "slow consumer raw",
    generateMicroburstSample: () => "microburst raw",
    generateTailLatencySample: () => "tail raw",
    setSourceName: name => calls.push(["source", name]),
    setActiveInvestigation: (_state, value) => calls.push(["activeInvestigation", value]),
    resetDerivedCaches: options => calls.push(["resetDerivedCaches", options]),
    markAnalysisDirty: options => calls.push(["markAnalysisDirty", options]),
    recompute: () => {
      calls.push(["recompute"]);
      state.sockets = [{ id: "s1" }];
    },
    applyDashboardPreset: preset => calls.push(["preset", preset]),
    setZoom: (start, end) => calls.push(["zoom", start, end]),
    syncSsCommandFromBuilder: () => overrides.syncResult ?? ({ command: "ss copied", validation: { valid: true, errors: [] } }),
    copyTextToClipboard: async text => {
      calls.push(["copy", text]);
      return overrides.copyOk ?? true;
    },
    captureQualityReport: () => ({ recommendedCommand: "ss quality" }),
    defaultSsLogPath: () => "/tmp/networkexpert_ss_test.log",
    buildSsCollectionCommand: (_base, config) => `built ${config.srcIp}:${config.srcPort}`,
    render: () => calls.push(["render"]),
    renderKeepingWorkspacePosition: () => calls.push(["renderKeepingWorkspacePosition"]),
    _showBusy: () => calls.push(["showBusy"]),
    _hideBusy: () => calls.push(["hideBusy"]),
    _renderSkeleton: type => `<div>${type}</div>`,
    toast: (...args) => calls.push(["toast", ...args]),
    savePrefs: () => calls.push(["savePrefs"]),
    calls,
    rawInput,
    commandInput,
    workspace
  };
  return deps;
}

test("parse action reads the editor input and opens advisor analysis", async () => {
  const deps = createDeps();
  const result = await handleIngestAction("parse", { preventDefault() {}, stopPropagation() {} }, deps);

  assert.equal(result.handled, true);
  assert.equal(result.stop, false);
  assert.equal(deps.state.raw, deps.rawInput.value);
  assert.equal(deps.state.view, "analysis");
  assert.equal(deps.state.activeTab, "advisor");
  assert.deepEqual(deps.calls.filter(([name]) => name === "recompute"), [["recompute"]]);
  assert.deepEqual(deps.calls.filter(([name]) => name === "render"), [["render"]]);
});

test("copy ss command refuses invalid fields before touching the clipboard", async () => {
  const deps = createDeps({
    syncResult: {
      command: "",
      validation: { valid: false, errors: [{ message: "Source IP is invalid." }] }
    }
  });
  const result = await handleIngestAction("copySsCommand", {}, deps);

  assert.equal(result.stop, true);
  assert.equal(deps.calls.some(([name]) => name === "copy"), false);
  assert.deepEqual(deps.calls.at(-1), ["toast", "Invalid ss command fields", "Source IP is invalid.", "danger"]);
});

test("copy ss command copies the live generated command", async () => {
  const deps = createDeps();
  const result = await handleIngestAction("copySsCommand", {}, deps);

  assert.equal(result.handled, true);
  assert.equal(result.stop, false);
  assert.deepEqual(deps.calls.find(([name]) => name === "copy"), ["copy", "ss copied"]);
  assert.deepEqual(deps.calls.at(-1), ["toast", "ss command copied", "Paste it on the target server to collect the ss evidence."]);
});

test("clear action empties only the raw input state and leaves parsed data untouched", async () => {
  const deps = createDeps({ state: { sockets: [{ id: "keep" }] } });
  const result = await handleIngestAction("clear", {}, deps);

  assert.equal(result.stop, false);
  assert.equal(deps.state.raw, "");
  assert.equal(deps.state.importStatus, null);
  assert.equal(deps.state.ingestRawExpanded, true);
  assert.deepEqual(deps.state.sockets, [{ id: "keep" }]);
  assert.deepEqual(deps.calls.filter(([name]) => name === "markAnalysisDirty"), [["markAnalysisDirty", { raw: true }]]);
});

test("sample guide actions prepare the right chart preset", async () => {
  const deps = createDeps();
  const result = await handleIngestAction("sampleMicroburst", {}, deps);

  assert.equal(result.handled, true);
  assert.equal(deps.state.raw, "microburst raw");
  assert.equal(deps.state.view, "charts");
  assert.equal(deps.state.drawer, null);
  assert.deepEqual(deps.calls.filter(([name]) => name === "preset"), [["preset", "microburst"]]);
  assert.deepEqual(deps.calls.filter(([name]) => name === "zoom"), [["zoom", 0, 1]]);
});

test("ss editor menu action remains hover-safe and does not stop outer undo flow", async () => {
  let prevented = false;
  let stopped = false;
  const deps = createDeps();
  const result = await handleIngestAction("toggleSsEditorThemeMenu", {
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; }
  }, deps);

  assert.equal(result.handled, true);
  assert.equal(result.stop, false);
  assert.equal(prevented, true);
  assert.equal(stopped, true);
  assert.equal(deps.state.openSsEditorThemeMenu, true);
  assert.deepEqual(deps.calls.filter(([name]) => name === "renderKeepingWorkspacePosition"), [["renderKeepingWorkspacePosition"]]);
});
