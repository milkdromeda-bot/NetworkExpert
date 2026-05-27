import assert from "node:assert/strict";
import { test } from "node:test";

import { buildServiceMapData, buildServiceMapRoutes, serviceMapConnectivityOrder } from "../../src/services/service-map-model.js";

const riskRank = risk => ({ low: 1, medium: 2, high: 3, critical: 4 }[risk] || 0);

function socket(id, overrides = {}) {
  return {
    id,
    risk: "low",
    local: "10.0.0.1:1000",
    peer: "10.0.0.2:2000",
    sendQ: 0,
    recvQ: 0,
    details: { process: { name: "java", pid: 42 } },
    ...overrides
  };
}

test("service map data builds process local peer nodes and weighted edges", () => {
  const map = buildServiceMapData({
    sockets: [
      socket("s1", { risk: "critical", sendQ: 500, recvQ: 25 }),
      socket("s2", { peer: "10.0.0.3:2001", details: { process: { name: "nginx", pid: 7 } } })
    ],
    anomalyMap: new Map([["s1", [{ severity: "critical" }]]]),
    riskRank,
    socketBandwidth: socket => socket.id === "s1" ? 1000000 : 0
  });
  assert.equal(map.processes.length, 2);
  assert.equal(map.locals.length, 1);
  assert.equal(map.peers.length, 2);
  assert.equal(map.edges.length, 2);
  assert.equal(map.edges[0].anomalies, 1);
  assert.equal(map.edges[0].weight, 535);
  assert.equal(map.locals[0].risk, "critical");
});

test("service map data applies endpoint presentation and topology groups", () => {
  const map = buildServiceMapData({
    sockets: [socket("s1")],
    riskRank,
    endpointPresentation: endpoint => ({ label: `label:${endpoint}`, alias: { label: "alias" } }),
    topology: { groups: [] },
    topologyGroupForEndpoint: (topology, endpoint) => endpoint.includes("10.0.0.2") ? { name: "Market Data", color: "blue" } : null
  });
  assert.equal(map.peers[0].label, "label:10.0.0.2:2000");
  assert.equal(map.peers[0].alias.label, "alias");
  assert.equal(map.peers[0].topologyGroup.name, "Market Data");
});

test("service map data limits sockets and nodes for rendering safety", () => {
  const sockets = Array.from({ length: 10 }, (_, index) => socket(`s${index}`, {
    local: `10.0.0.${index}:1000`,
    peer: `10.0.1.${index}:2000`
  }));
  const map = buildServiceMapData({ sockets, riskRank, maxSockets: 4, maxNodes: 3 });
  assert.equal(map.edges.length, 4);
  assert.equal(map.locals.length, 3);
  assert.equal(map.peers.length, 3);
});

test("service map connectivity order keeps connected lanes near each other", () => {
  const map = {
    processes: [
      { id: "process:p1", risk: "low", anomalies: 0, count: 1 },
      { id: "process:p2", risk: "critical", anomalies: 2, count: 1 }
    ],
    locals: [
      { id: "local:l1", risk: "low", anomalies: 0, count: 1 },
      { id: "local:l2", risk: "critical", anomalies: 2, count: 1 }
    ],
    peers: [
      { id: "peer:a", risk: "low", anomalies: 0, count: 1 },
      { id: "peer:b", risk: "critical", anomalies: 2, count: 1 }
    ],
    edges: [
      { id: "e1", from: "process:p1", mid: "local:l1", to: "peer:a" },
      { id: "e2", from: "process:p2", mid: "local:l2", to: "peer:b" }
    ]
  };
  const ordered = serviceMapConnectivityOrder(map, { riskRank });
  assert.equal(ordered.processes[0].id, "process:p1");
  assert.equal(ordered.locals[0].id, "local:l1");
  assert.equal(ordered.peers[0].id, "peer:a");
  assert.equal(ordered.locals[1].id, "local:l2");
  assert.equal(ordered.peers[1].id, "peer:b");
  assert.equal("_mapOrder" in ordered.processes[0], false);
});

test("service map connectivity order handles empty maps", () => {
  assert.deepEqual(serviceMapConnectivityOrder({}, { riskRank }), { processes: [], locals: [], peers: [] });
});

test("service map routes generate two bezier segments per edge", () => {
  const routes = buildServiceMapRoutes([
    { id: "e1", from: "process:p1", mid: "local:l1", to: "peer:a" }
  ], {
    "process:p1": { x: 160, y: 100 },
    "local:l1": { x: 520, y: 140 },
    "peer:a": { x: 920, y: 160 }
  });
  const route = routes.get("e1")?.d || "";
  assert.match(route, /^M /);
  assert.equal((route.match(/ C /g) || []).length, 2);
  assert.match(route, /306 100/);
});

test("service map routes tolerate missing node positions", () => {
  const routes = buildServiceMapRoutes([
    { id: "e1", from: "process:p1", mid: "local:l1", to: "peer:a" }
  ], {
    "process:p1": { x: 160, y: 100 }
  });
  assert.equal(routes.get("e1")?.d, "");
});
