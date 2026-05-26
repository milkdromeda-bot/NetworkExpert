import assert from "node:assert/strict";
import { test } from "node:test";
import { renderServiceMapView } from "../../src/service-map-view.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const baseNode = {
  id: "process:java",
  kind: "process",
  label: "java",
  risk: "high",
  count: 1
};

function deps(overrides = {}) {
  const process = { ...baseNode };
  const local = { id: "local:10.0.0.1:50000", kind: "local", label: "10.0.0.1:50000", endpoint: "10.0.0.1:50000", risk: "high", count: 1 };
  const peer = { id: "peer:10.0.0.2:443", kind: "peer", label: "10.0.0.2:443", endpoint: "10.0.0.2:443", risk: "high", count: 1 };
  const edge = {
    id: "edge-1",
    from: process.id,
    mid: local.id,
    to: peer.id,
    risk: "high",
    anomalies: 2,
    weight: 5,
    socket: { id: "s1", local: local.endpoint, peer: peer.endpoint }
  };
  const map = overrides.map ?? {
    processes: [process],
    locals: [local],
    peers: [peer],
    edges: [edge]
  };
  return {
    state: { prefs: { theme: "dark" }, selectedMapEdgeId: "", serviceAliases: {}, sourceName: "unit", ipIntel: {}, sockets: [], ...overrides.state },
    buildServiceMap: () => map,
    serviceMapConnectivityOrder: value => ({ processes: value.processes, locals: value.locals, peers: value.peers }),
    layoutTopologyLanePositions: lanes => {
      const positions = {};
      for (const lane of lanes) lane.nodes.forEach((node, index) => { positions[node.id] = { x: lane.x, y: 80 + index * 80 }; });
      return positions;
    },
    serviceMapGroupBands: () => [],
    buildServiceMapRoutes: edges => new Map(edges.map(item => [item.id, { d: "M10 10 C20 20 30 30 40 40" }])),
    riskRank: risk => ({ critical: 4, high: 3, medium: 2, low: 1 }[risk] || 0),
    formatNumber: value => String(value),
    aliasCountForSource: () => 0,
    renderMapLegend: () => "<div class=\"map-legend\"></div>",
    escapeHtml,
    renderMapEdgeInsight: () => "<aside data-edge-insight></aside>",
    renderHotPaths: () => "<aside data-hot-paths></aside>",
    buildGeoMarkers: () => [],
    renderGeoMapSvg: () => "<svg></svg>",
    renderSankeySvg: () => "<svg data-sankey></svg>",
    nodeSubtitle: node => node.endpoint || "socket",
    truncateMiddle: value => value,
    nodeLabel: node => node.label,
    mapNodeTitle: node => node.label,
    ...overrides.deps
  };
}

test("service map view returns an empty state when no nodes exist", () => {
  const html = renderServiceMapView(deps({ map: { processes: [], locals: [], peers: [], edges: [] } }));

  assert.match(html, /No service map is available/);
});

test("service map view renders lanes, links, topology actions, and sankey", () => {
  const html = renderServiceMapView(deps({ state: { mapView: "sankey" } }));

  assert.match(html, /service-map-workbench/);
  assert.match(html, /Processes/);
  assert.match(html, /Local sockets/);
  assert.match(html, /Peers/);
  assert.match(html, /data-topology-open/);
  assert.match(html, /Flow Sankey/);
  assert.match(html, /data-sankey/);
});

test("service map view shows topology by default", () => {
  const html = renderServiceMapView(deps());

  assert.match(html, /data-map-edge="edge-1"/);
  assert.match(html, /data-hot-paths/);
  assert.doesNotMatch(html, /data-sankey/);
});
