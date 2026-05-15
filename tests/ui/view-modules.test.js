import assert from "node:assert/strict";
import { test } from "node:test";

import { renderColumnTooltip } from "../../src/column-help-view.js";
import { EXPERT_DEFAULT_THRESHOLDS } from "../../src/expert-config.js";
import { createGuideView } from "../../src/guide-view.js";
import { createModalView } from "../../src/modal-view.js";
import { renderSocketTableView, renderTableHeader } from "../../src/socket-table-view.js";
import { createTableColumns } from "../../src/table-columns.js";
import { renderTableSettingsContent } from "../../src/table-settings-view.js";

const icons = {
  settings: "<i>settings</i>",
  columns: "<i>columns</i>",
  sortNeutral: "<i>sort</i>",
  reset: "<i>reset</i>",
  x: "<i>x</i>",
  pin: "<i>pin</i>",
  unpin: "<i>unpin</i>",
  drag: "<i>drag</i>",
  copy: "<i>copy</i>",
  chart: "<i>chart</i>",
  note: "<i>note</i>",
  trash: "<i>trash</i>",
  resetWorkspace: "<i>reset-workspace</i>"
};

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c]));
const html = (strings, ...values) => strings.map((part, index) => part + (values[index] ?? "")).join("");

function tableColumns() {
  return createTableColumns({
    riskRank: risk => ({ low: 1, critical: 4 }[risk] || 0),
    escapeHtml,
    applicationServiceSortKey: () => "app",
    renderApplicationServiceChip: () => "",
    renderTableMetricCell: (metric, value) => `<b>${metric}:${value}</b>`,
    socketBandwidth: () => 0,
    renderEndpointCell: endpoint => `<span>${escapeHtml(endpoint)}</span>`,
    renderPeerCell: socket => `<span>${escapeHtml(socket.peer)}</span>`,
    metricValue: (socket, metric) => socket.metrics?.[metric] || 0
  });
}

test("table columns factory keeps core table shape outside main", () => {
  const columns = tableColumns();
  assert.equal(columns[0].key, "risk");
  assert.equal(columns.some(column => column.key === "delivery_rate" && column.defaultVisible === false), true);
  assert.match(columns.find(column => column.key === "local").render({ local: "127.0.0.1:22" }), /127\.0\.0\.1/);
});

test("table settings view renders checked visible columns and search input", () => {
  const columns = tableColumns().slice(0, 4);
  const state = {
    tableColumnSearch: "sta",
    table: {
      visible: ["risk", "state"],
      pinned: ["risk"],
      order: columns.map(column => column.key),
      sortKey: "risk",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
      filters: {}
    }
  };
  const markup = renderTableSettingsContent({
    state,
    tableColumns: columns,
    tableDefaults: () => ({ ...state.table, visible: ["risk", "state"], pinned: ["risk"], order: columns.map(column => column.key), filters: {} }),
    icons,
    escapeHtml,
    formatNumber: String
  });
  assert.match(markup, /data-table-column-search/);
  assert.match(markup, /aria-checked="true"/);
  assert.match(markup, /data-menu-visible-col="state"/);
  assert.match(markup, /data-menu-visible-col="risk"[^]*hidden/);
});

test("column help view renders threshold intelligence without main", () => {
  const markup = renderColumnTooltip(
    { key: "rtt", label: "RTT" },
    {
      fieldDocs: {},
      thresholdFor: metric => EXPERT_DEFAULT_THRESHOLDS[metric],
      formatMetricValue: (metric, value) => `${value} ${metric}`,
      escapeHtml
    }
  );
  assert.match(markup, /Column intelligence/);
  assert.match(markup, /Warning/);
  assert.match(markup, /data-column-help="rtt"/);
});

test("socket table view renders rows through injected dependencies", () => {
  const state = {
    sockets: [{ id: "s1", risk: "low", state: "ESTAB", family: "tcp", local: "l", peer: "p", details: {}, metrics: {} }],
    selectedId: "s1",
    prefs: { paginationPosition: "bottom" },
    table: { pinned: ["risk"] }
  };
  const columns = tableColumns().slice(0, 2);
  const markup = renderSocketTableView({
    state,
    html,
    escapeHtml,
    renderGridControls: total => `<div>${total}</div>`,
    renderPagination: () => "<nav>pager</nav>",
    sortedFilteredSockets: () => state.sockets,
    pagedRows: rows => ({ rows, totalPages: 1, start: 0 }),
    visibleColumns: () => columns,
    renderHeader: column => renderTableHeader(column, { state, icons, escapeHtml, renderColumnTooltip: () => "" }),
    renderRowActions: () => "<button>row</button>",
    renderTableSettingsTrigger: () => "<button>settings</button>",
    renderTableSettingsMenu: () => "<div>menu</div>"
  });
  assert.match(markup, /data-socket="s1"/);
  assert.match(markup, /pinned-cell/);
  assert.match(markup, /settings/);
});

test("guide view renders best-practice shell through injected dependencies", () => {
  const state = { guideTab: "best", prefs: { accessRole: "analyst", linuxProfile: "lxc" }, sockets: [] };
  const guide = createGuideView({
    state,
    html,
    icons,
    escapeHtml,
    isAnalystRole: () => true,
    isLxcProfile: () => true,
    envCommand: command => command,
    linuxProfileLabel: () => "LXC",
    accessRoleLabel: () => "Analyst",
    ubuntuProfileLabel: () => "Ubuntu",
    renderFields: () => "<section>fields</section>",
    commandForPeer: () => "ss"
  }).renderGuide();
  assert.match(guide, /guide-shell/);
  assert.match(guide, /Best Practices/);
  assert.match(guide, /LXC/);
});

test("guide references omit dead youtube resource cards", () => {
  const state = { guideTab: "refs", prefs: { accessRole: "analyst", linuxProfile: "lxc" }, sockets: [] };
  const guide = createGuideView({
    state,
    html,
    icons,
    escapeHtml,
    isAnalystRole: () => true,
    isLxcProfile: () => true,
    envCommand: command => command,
    linuxProfileLabel: () => "LXC",
    accessRoleLabel: () => "Analyst",
    ubuntuProfileLabel: () => "Ubuntu",
    renderFields: () => "<section>fields</section>",
    commandForPeer: () => "ss"
  }).renderGuide();
  assert.match(guide, /Video Resources/);
  assert.match(guide, /Brendan Gregg - Linux Performance Tools/);
  assert.match(guide, /Cloudflare - How TCP Sockets Work/);
  assert.doesNotMatch(guide, /Van Jacobson - Networking, A Retrospective/);
  assert.doesNotMatch(guide, /Netdev 0x14 - TCP and the Linux Kernel/);
  assert.doesNotMatch(guide, /Linux tc and Traffic Control/);
});

test("modal view renders service aliases and delegates modal body", () => {
  const state = {
    modal: "serviceAliases",
    serviceAliases: {},
    aliasEditKey: "",
    aliasEditScope: "source",
    sourceName: "sample",
    topology: { groups: [] },
    topologyDraftMatch: "",
    topologyEditId: ""
  };
  const view = createModalView({
    state,
    html,
    icons,
    escapeHtml,
    sortedFilteredSockets: () => [{ local: "127.0.0.1:22", peer: "10.0.0.1:443" }],
    aliasForEndpoint: () => null,
    aliasListForSource: () => [],
    normalizeAliasStore: store => store,
    normalizeTopologyProfile: profile => ({ groups: profile?.groups || [] }),
    topologyScopeKey: sourceName => sourceName,
    topologyGroupForEndpoint: () => null,
    selectedSocket: () => null,
    renderSocketDetail: () => "",
    renderPrefs: () => "",
    renderGuide: () => "",
    renderThresholdConfig: () => "",
    renderTableSettingsDrawer: () => "",
    metricLabel: metric => metric,
    renderColumnChooser: () => "",
    renderLayoutPrefs: () => "",
    renderPreImportFilters: () => "",
    renderFields: () => "",
    getColumn: key => ({ key, label: key }),
    columnHelp: () => ({ summary: "", detail: "", use: "", metric: null, threshold: null }),
    renderThresholdSummary: () => "",
    expertDefaultThresholds: EXPERT_DEFAULT_THRESHOLDS,
    annotationSocketId: () => "",
    currentSourceAnnotations: () => [],
    visibleHistory: () => [],
    annotationTypeList: () => [],
    buildAnnotationDraft: () => ({}),
    timeLabel: () => "now",
    annotationAnchorOptions: () => [],
    annotationMetricChoices: () => [],
    formatMetricValue: (metric, value) => `${metric}:${value}`,
    annotationDefaultLabel: () => "",
    annotationTypeLabel: value => value,
    chartStats: () => ({ count: 0 }),
    formatNumber: String,
    renderPercentileDistribution: () => "",
    renderDatalist: () => ""
  });
  assert.deepEqual(view.serviceAliasEndpointOptions(), ["10.0.0.1:443", "127.0.0.1:22"]);
  assert.match(view.renderModal(), /Service labels/);
});

test("modal view renders topology modal with host suggestions", () => {
  const state = {
    modal: "topology",
    serviceAliases: {},
    aliasEditKey: "",
    aliasEditScope: "source",
    sourceName: "market-data.log",
    topology: { groups: [] },
    topologyDraftMatch: "",
    topologyEditId: ""
  };
  const view = createModalView({
    state,
    html,
    icons,
    escapeHtml,
    sortedFilteredSockets: () => [
      { local: "172.16.0.10:50000", peer: "10.0.0.20:9200" },
      { local: "172.16.0.10:50001", peer: "10.0.0.21:9200" }
    ],
    aliasForEndpoint: () => null,
    aliasListForSource: () => [],
    normalizeAliasStore: store => store,
    topologyScopeKey: sourceName => sourceName,
    topologyGroupForEndpoint: () => null,
    selectedSocket: () => null,
    renderSocketDetail: () => "",
    renderPrefs: () => "",
    renderGuide: () => "",
    renderThresholdConfig: () => "",
    renderTableSettingsDrawer: () => "",
    metricLabel: metric => metric,
    renderColumnChooser: () => "",
    renderLayoutPrefs: () => "",
    renderPreImportFilters: () => "",
    renderFields: () => "",
    getColumn: key => ({ key, label: key }),
    columnHelp: () => ({ summary: "", detail: "", use: "", metric: null, threshold: null }),
    renderThresholdSummary: () => "",
    expertDefaultThresholds: EXPERT_DEFAULT_THRESHOLDS,
    annotationSocketId: () => "",
    currentSourceAnnotations: () => [],
    visibleHistory: () => [],
    annotationTypeList: () => [],
    buildAnnotationDraft: () => ({}),
    timeLabel: () => "now",
    annotationAnchorOptions: () => [],
    annotationMetricChoices: () => [],
    formatMetricValue: (metric, value) => `${metric}:${value}`,
    annotationDefaultLabel: () => "",
    annotationTypeLabel: value => value,
    chartStats: () => ({ count: 0 }),
    formatNumber: String,
    renderPercentileDistribution: () => "",
    renderDatalist: (id, values) => `<datalist id="${id}">${values.map(value => `<option value="${value}"></option>`).join("")}</datalist>`
  });

  const modal = view.renderModal();
  assert.match(modal, /Recording topology/);
  assert.match(modal, /Scope: market-data\.log/);
  assert.match(modal, /data-topology-suggest="10\.0\.0\.20"/);
  assert.match(modal, /data-action="saveTopologyGroup"/);
});

test("modal view renders service override as recording scoped classification", () => {
  const socket = {
    id: "s1",
    family: "tcp",
    local: "10.0.0.1:50000",
    peer: "10.0.0.2:9200",
    localAddress: { host: "10.0.0.1", port: "50000" },
    peerAddress: { host: "10.0.0.2", port: "9200" },
    details: { values: {}, skmem: {} }
  };
  const state = {
    modal: "serviceOverride",
    serviceOverrideSocketId: "s1",
    serviceOverrides: {},
    sourceName: "capture-a",
    serviceAliases: {},
    aliasEditKey: "",
    aliasEditScope: "source",
    topology: { groups: [] },
    topologyDraftMatch: "",
    topologyEditId: ""
  };
  const view = createModalView({
    state,
    html,
    icons,
    escapeHtml,
    sortedFilteredSockets: () => [socket],
    aliasForEndpoint: () => null,
    aliasListForSource: () => [],
    normalizeAliasStore: store => store,
    currentApplicationService: () => ({ label: "Elasticsearch", source: "inferred", port: 9200, side: "peer" }),
    inferredApplicationService: () => ({ label: "Elasticsearch", source: "inferred", port: 9200, side: "peer", transport: "tcp" }),
    serviceOverrideForSocket: () => null,
    topologyScopeKey: sourceName => sourceName,
    topologyGroupForEndpoint: () => null,
    selectedSocket: () => socket,
    renderSocketDetail: () => "",
    renderPrefs: () => "",
    renderGuide: () => "",
    renderThresholdConfig: () => "",
    renderTableSettingsDrawer: () => "",
    metricLabel: metric => metric,
    renderColumnChooser: () => "",
    renderLayoutPrefs: () => "",
    renderPreImportFilters: () => "",
    renderFields: () => "",
    getColumn: key => ({ key, label: key }),
    columnHelp: () => ({ summary: "", detail: "", use: "", metric: null, threshold: null }),
    renderThresholdSummary: () => "",
    expertDefaultThresholds: EXPERT_DEFAULT_THRESHOLDS,
    annotationSocketId: () => "",
    currentSourceAnnotations: () => [],
    visibleHistory: () => [],
    annotationTypeList: () => [],
    buildAnnotationDraft: () => ({}),
    timeLabel: () => "now",
    annotationAnchorOptions: () => [],
    annotationMetricChoices: () => [],
    formatMetricValue: (metric, value) => `${metric}:${value}`,
    annotationDefaultLabel: () => "",
    annotationTypeLabel: value => value,
    chartStats: () => ({ count: 0 }),
    formatNumber: String,
    renderPercentileDistribution: () => "",
    renderDatalist: () => ""
  });

  const modal = view.renderModal();
  assert.match(modal, /Service classification/);
  assert.match(modal, /stunnel/);
  assert.match(modal, /All tcp port 9200 in this recording/);
});

test("modal view renders reset workspace confirmation", () => {
  const state = {
    modal: "resetWorkspace",
    serviceAliases: {},
    aliasEditKey: "",
    aliasEditScope: "source",
    sourceName: "capture-a",
    topology: { groups: [] },
    topologyDraftMatch: "",
    topologyEditId: ""
  };
  const view = createModalView({
    state,
    html,
    icons,
    escapeHtml,
    sortedFilteredSockets: () => [],
    aliasForEndpoint: () => null,
    aliasListForSource: () => [],
    normalizeAliasStore: store => store,
    currentApplicationService: () => null,
    inferredApplicationService: () => null,
    serviceOverrideForSocket: () => null,
    topologyScopeKey: sourceName => sourceName,
    topologyGroupForEndpoint: () => null,
    selectedSocket: () => null,
    renderSocketDetail: () => "",
    renderPrefs: () => "",
    renderGuide: () => "",
    renderThresholdConfig: () => "",
    renderTableSettingsDrawer: () => "",
    metricLabel: metric => metric,
    renderColumnChooser: () => "",
    renderLayoutPrefs: () => "",
    renderPreImportFilters: () => "",
    renderFields: () => "",
    getColumn: key => ({ key, label: key }),
    columnHelp: () => ({ summary: "", detail: "", use: "", metric: null, threshold: null }),
    renderThresholdSummary: () => "",
    expertDefaultThresholds: EXPERT_DEFAULT_THRESHOLDS,
    annotationSocketId: () => "",
    currentSourceAnnotations: () => [],
    visibleHistory: () => [],
    annotationTypeList: () => [],
    buildAnnotationDraft: () => ({}),
    timeLabel: () => "now",
    annotationAnchorOptions: () => [],
    annotationMetricChoices: () => [],
    formatMetricValue: (metric, value) => `${metric}:${value}`,
    annotationDefaultLabel: () => "",
    annotationTypeLabel: value => value,
    chartStats: () => ({ count: 0 }),
    formatNumber: String,
    renderPercentileDistribution: () => "",
    renderDatalist: () => ""
  });

  const modal = view.renderModal();
  assert.match(modal, /Reset workspace/);
  assert.match(modal, /data-action="confirmResetWorkspace"/);
  assert.match(modal, /Saved preferences, thresholds, labels, service classifications, and topology rules stay available/);
});

test("modal view renders product splash with version", () => {
  const state = {
    modal: "splash",
    serviceAliases: {},
    aliasEditKey: "",
    aliasEditScope: "source",
    sourceName: "capture-a",
    topology: { groups: [] },
    topologyDraftMatch: "",
    topologyEditId: ""
  };
  const view = createModalView({
    state,
    html,
    icons,
    escapeHtml,
    sortedFilteredSockets: () => [],
    aliasForEndpoint: () => null,
    aliasListForSource: () => [],
    normalizeAliasStore: store => store,
    currentApplicationService: () => null,
    inferredApplicationService: () => null,
    serviceOverrideForSocket: () => null,
    topologyScopeKey: sourceName => sourceName,
    topologyGroupForEndpoint: () => null,
    selectedSocket: () => null,
    renderSocketDetail: () => "",
    renderPrefs: () => "",
    renderGuide: () => "",
    renderThresholdConfig: () => "",
    renderTableSettingsDrawer: () => "",
    metricLabel: metric => metric,
    renderColumnChooser: () => "",
    renderLayoutPrefs: () => "",
    renderPreImportFilters: () => "",
    renderFields: () => "",
    getColumn: key => ({ key, label: key }),
    columnHelp: () => ({ summary: "", detail: "", use: "", metric: null, threshold: null }),
    renderThresholdSummary: () => "",
    expertDefaultThresholds: EXPERT_DEFAULT_THRESHOLDS,
    annotationSocketId: () => "",
    currentSourceAnnotations: () => [],
    visibleHistory: () => [],
    annotationTypeList: () => [],
    buildAnnotationDraft: () => ({}),
    timeLabel: () => "now",
    annotationAnchorOptions: () => [],
    annotationMetricChoices: () => [],
    formatMetricValue: (metric, value) => `${metric}:${value}`,
    annotationDefaultLabel: () => "",
    annotationTypeLabel: value => value,
    chartStats: () => ({ count: 0 }),
    formatNumber: String,
    renderPercentileDistribution: () => "",
    renderDatalist: () => "",
    appVersion: "1.0.0.0",
    splashImageUrl: "./images/ultimateNetworkExpert.png"
  });

  const modal = view.renderModal();
  assert.match(modal, /Ultimate Network Expert/);
  assert.match(modal, /src="\.\/images\/ultimateNetworkExpert\.png"/);
  assert.match(modal, /v1\.0\.0\.0/);
  assert.match(modal, /class="splash-modal"/);
});
