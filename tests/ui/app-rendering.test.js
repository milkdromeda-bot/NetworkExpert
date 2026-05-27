import assert from "node:assert/strict";
import { test } from "node:test";
import { createAppRendering } from "../../src/app-rendering.js";

const escapeHtml = value => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

test("app rendering module keeps pure formatting helpers callable without main.js", () => {
  const rendering = createAppRendering(() => ({
    numberFormatter: () => ({ format: value => String(Number(value).toLocaleString("en-US")) }),
    formatNumber: value => String(value),
    escapeHtml
  }));

  assert.equal(rendering.formatBytesHuman(512), "512 B");
  assert.equal(rendering.formatBytesHuman(2048), "2 KB");
  assert.equal(rendering.formatBytesHuman(2 * 1024 * 1024), "2 MB");
});

test("chart info rendering remains escaped after extraction", () => {
  const rendering = createAppRendering(() => ({ escapeHtml }));

  const html = rendering.renderChartInfo("<RTT>", "queue & latency", "use <carefully>");
  assert.match(html, /&lt;RTT&gt;/);
  assert.match(html, /queue &amp; latency/);
  assert.match(html, /use &lt;carefully&gt;/);
});

test("timezone options use injected timezone helpers", () => {
  const rendering = createAppRendering(() => ({
    state: { prefs: { chartTimeZone: "Europe/Paris" } },
    escapeHtml,
    resolvedTimeZone: () => "Europe/Paris",
    timeZoneOptions: () => ["Europe/Paris", "UTC"]
  }));

  const html = rendering.renderTimeZoneOptions();
  assert.match(html, /Browser timezone \(Europe\/Paris\)/);
  assert.match(html, /value="Europe\/Paris" selected/);
  assert.match(html, /value="UTC"/);
});

test("charts toolbar can render timezone options after extraction", () => {
  const rendering = createAppRendering(() => ({
    ctx: {
      renderTimeZoneOptions: () => rendering.renderTimeZoneOptions()
    },
    state: { prefs: { chartTimeZone: "UTC" } },
    escapeHtml,
    resolvedTimeZone: () => "Europe/Paris",
    timeZoneOptions: () => ["Europe/Paris", "UTC"],
    _renderChartsGlobalToolbar: ctx => `<select>${ctx.renderTimeZoneOptions()}</select>`
  }));

  const html = rendering.renderChartsGlobalToolbar();
  assert.match(html, /value="UTC" selected/);
});

test("modal rendering receives alias, topology, and service dependencies", () => {
  const rendering = createAppRendering(() => ({
    state: { modal: null },
    html: String.raw,
    icons: {},
    escapeHtml,
    sortedFilteredSockets: () => [],
    aliasForEndpoint: () => "",
    aliasListForSource: () => [],
    normalizeAliasStore: value => value || {},
    currentApplicationService: () => null,
    inferredApplicationService: () => null,
    serviceOverrideForSocket: () => null,
    normalizeTopologyProfile: profile => profile || { groups: [] },
    endpointHost: value => value,
    topologyScopeKey: value => value,
    topologyGroupForEndpoint: () => null,
    selectedSocket: () => null,
    renderSocketDetail: () => "",
    renderPrefs: () => "",
    renderGuide: () => "",
    renderThresholdConfig: () => "",
    renderTableSettingsDrawer: () => "",
    metricLabel: value => value,
    renderColumnChooser: () => "",
    renderLayoutPrefs: () => "",
    renderPreImportFilters: () => "",
    renderFields: () => "",
    getColumn: key => ({ key, label: key }),
    columnHelp: () => ({}),
    metricHelp: () => ({}),
    renderThresholdSummary: () => "",
    annotationSocketId: () => "",
    currentSourceAnnotations: () => [],
    visibleHistory: () => [],
    annotationTypeList: () => [],
    buildAnnotationDraft: () => ({}),
    timeLabel: () => "",
    annotationAnchorOptions: () => [],
    annotationMetricChoices: () => [],
    formatMetricValue: () => "",
    annotationDefaultLabel: () => "",
    annotationTypeLabel: () => "",
    chartStats: () => ({}),
    formatNumber: value => String(value),
    renderPercentileDistribution: () => "",
    renderDatalist: () => "",
    createModalView: deps => {
      assert.equal(typeof deps.normalizeAliasStore, "function");
      assert.equal(typeof deps.normalizeTopologyProfile, "function");
      assert.equal(typeof deps.serviceOverrideForSocket, "function");
      assert.equal(typeof deps.inferredApplicationService, "function");
      return { renderModal: () => "modal-ok" };
    }
  }));

  assert.equal(rendering.renderModal(), "modal-ok");
});
