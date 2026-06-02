import assert from "node:assert/strict";
import { test } from "node:test";

import { createInitialState } from "../../src/rendering/initial-state.js";

function createDeps(overrides = {}) {
  const initialPrefs = { defaultDashboardPreset: "noc", defaultPageSize: 50 };
  return {
    buildAnnotationDraft: input => ({ draftFor: input.sourceName }),
    cloneThresholds: () => ({ rtt: { warn: 100 } }),
    dashboardPresetIdOrDefault: value => `preset:${value}`,
    defaultSsCommandConfig: () => ({ timestamp: true }),
    initialPrefs,
    loadAlertAcks: () => ({ a1: true }),
    loadAlertRules: () => [{ id: "rule" }],
    loadAnnotations: () => [{ id: "ann" }],
    loadDashboardProfiles: () => [{ id: "dashboard" }],
    loadFilterHistory: () => ["risk:critical"],
    loadServiceAliases: () => ({ aliases: true }),
    loadServiceOverrides: () => ({ overrides: true }),
    loadTableProfiles: () => [{ id: "table" }],
    loadTableState: pageSize => ({ pageSize }),
    loadTopologyForSource: source => ({ source }),
    loadTopologyProfiles: () => ({ profile: true }),
    showOnboarding: true,
    ...overrides
  };
}

test("createInitialState wires persisted data and stable defaults", () => {
  const state = createInitialState(createDeps());

  assert.equal(state.raw, "");
  assert.equal(state.sourceName, "empty workspace");
  assert.deepEqual(state.ssCommandConfig, { timestamp: true });
  assert.equal(state.activeDashboardPreset, "preset:noc");
  assert.deepEqual(state.annotationDraft, { draftFor: "empty workspace" });
  assert.equal(state.onboarding, 0);
  assert.equal(state.ingestRawExpanded, true);
  assert.deepEqual(state.table, { pageSize: 50 });
  assert.deepEqual(state.topology, { source: "empty workspace" });
  assert.ok(state.hiddenFixSeries instanceof Set || state.fixLatency.hiddenSeries instanceof Set);
  assert.ok(state.cache.visibleHistoryRowsByKey instanceof Map);
});

test("createInitialState can skip onboarding", () => {
  const state = createInitialState(createDeps({ showOnboarding: false }));

  assert.equal(state.onboarding, -1);
});
