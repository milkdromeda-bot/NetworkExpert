import assert from "node:assert/strict";
import { test } from "node:test";

import { createServiceMapPresenter } from "../../src/views/service-map-presenter.js";

function deps(overrides = {}) {
  const socket = {
    id: "s1",
    local: "10.0.0.1:5000",
    peer: "10.0.0.2:443",
    family: "tcp",
    state: "ESTAB",
    sendQ: 42,
    recvQ: 0,
    details: { process: { name: "api", pid: "123" } }
  };
  return {
    state: {
      sourceName: "capture",
      serviceAliases: { capture: { "10.0.0.2:443": { label: "db", role: "database" } } },
      topology: {},
      anomalies: [{ socketId: "s1", severity: "high", title: "High RTT", detail: "slow", metric: "rtt" }]
    },
    icons: { activity: "activity", alert: "alert", chart: "chart", x: "x" },
    SERVICE_MAP_SORT_COLLATOR: new Intl.Collator("en"),
    aliasDisplay: (endpoint, aliases) => aliases.capture?.[endpoint]?.label || endpoint,
    aliasForEndpoint: (aliases, endpoint) => aliases.capture?.[endpoint] || null,
    anomaliesBySocketId: () => new Map([["s1", [{ severity: "high" }]]]),
    buildServiceMapData: input => ({ input, processes: [], locals: [], peers: [], edges: [] }),
    escapeHtml: value => String(value ?? ""),
    formatMetricValue: (_metric, value) => String(value ?? 0),
    formatNumber: value => String(value),
    metricLabel: metric => metric,
    metricValue: () => 12,
    orderServiceMapConnectivity: (map, options) => ({ map, options }),
    riskRank: risk => ({ low: 1, high: 3 }[risk] || 0),
    severityRank: severity => ({ low: 1, high: 3 }[severity] || 0),
    socketBandwidth: () => 100,
    sortedFilteredSockets: () => [socket],
    thresholdSeverity: () => "low",
    topologyGroupForEndpoint: () => null,
    ...overrides
  };
}

test("service map presenter applies aliases and delegates map building", () => {
  const presenter = createServiceMapPresenter(() => deps());

  assert.deepEqual(presenter.endpointPresentation("10.0.0.2:443"), {
    endpoint: "10.0.0.2:443",
    label: "db",
    role: "database",
    note: "",
    alias: { label: "db", role: "database" }
  });
  assert.equal(presenter.buildServiceMap().input.sockets.length, 1);
  assert.equal(presenter.serviceMapConnectivityOrder({ edges: [] }).options.riskRank("high"), 3);
});

test("service map presenter renders link insight and grouped bands", () => {
  const presenter = createServiceMapPresenter(() => deps());
  const edge = { risk: "high", socket: deps().sortedFilteredSockets()[0] };
  const html = presenter.renderMapEdgeInsight(edge);

  assert.match(html, /Link intelligence/);
  assert.match(html, /10\.0\.0\.1:5000 -> db/);
  assert.match(html, /High RTT/);
  assert.deepEqual(presenter.serviceMapGroupBands([
    { key: "peers", x: 400, nodes: [{ id: "a", topologyGroup: { id: "g1", name: "G1" } }] }
  ], { a: { y: 120 } })[0], { group: { id: "g1", name: "G1" }, x: 234, y: 60, width: 332, height: 102, labelY: 86 });
});
