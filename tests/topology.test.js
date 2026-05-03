import assert from "node:assert/strict";
import { test } from "node:test";
import { deleteTopologyGroup, endpointHost, endpointMatchesPattern, layoutTopologyLanePositions, normalizeTopologyProfile, topologyGroupForEndpoint, topologyScopeKey, upsertTopologyGroup } from "../src/topology.js";

test("topologyScopeKey scopes profiles by recording source name", () => {
  assert.equal(topologyScopeKey(" LPLALO-light.log "), "lplalo-light.log");
  assert.equal(topologyScopeKey(""), "workspace");
});

test("endpointHost extracts IPv4 hosts from endpoint ports", () => {
  assert.equal(endpointHost("192.168.145.115:41476"), "192.168.145.115");
});

test("endpointHost extracts bracketed IPv6 hosts", () => {
  assert.equal(endpointHost("[::ffff:10.200.75.171]:32883"), "::ffff:10.200.75.171");
});

test("endpointMatchesPattern matches a host against any port on that host", () => {
  assert.equal(endpointMatchesPattern("192.168.145.115:41476", "192.168.145.115"), true);
});

test("endpointMatchesPattern matches a precise IP port endpoint", () => {
  assert.equal(endpointMatchesPattern("192.168.145.204:57067", "192.168.145.204:57067"), true);
  assert.equal(endpointMatchesPattern("192.168.145.204:57068", "192.168.145.204:57067"), false);
});

test("endpointMatchesPattern supports wildcard groups", () => {
  assert.equal(endpointMatchesPattern("192.168.145.118:31001", "192.168.145.118:*"), true);
});

test("topologyGroupForEndpoint returns the first matching group", () => {
  const profile = {
    groups: [
      { id: "a", name: "Market data simulators", match: "192.168.145.115", color: "cyan" },
      { id: "b", name: "Distributor", match: "192.168.145.204", color: "pink" }
    ]
  };

  assert.equal(topologyGroupForEndpoint(profile, "192.168.145.115:41476").name, "Market data simulators");
});

test("upsertTopologyGroup creates a clean group", () => {
  const profile = upsertTopologyGroup({}, {
    id: "dist",
    name: " Distributor ",
    match: " 192.168.145.204 ",
    color: "pink",
    note: " order fanout "
  }, 10);

  assert.deepEqual(profile.groups[0], {
    id: "dist",
    name: "Distributor",
    match: "192.168.145.204",
    color: "pink",
    note: "order fanout",
    updatedAt: 10
  });
});

test("upsertTopologyGroup replaces an existing group by id", () => {
  const profile = upsertTopologyGroup({ groups: [{ id: "dist", name: "old", match: "10.0.0.1", color: "cyan" }] }, {
    id: "dist",
    name: "Distributor",
    match: "192.168.145.204",
    color: "pink"
  }, 11);

  assert.equal(profile.groups.length, 1);
  assert.equal(profile.groups[0].name, "Distributor");
});

test("deleteTopologyGroup removes only one topology group", () => {
  const profile = normalizeTopologyProfile({
    groups: [
      { id: "a", name: "A", match: "10.0.0.1", color: "cyan" },
      { id: "b", name: "B", match: "10.0.0.2", color: "green" }
    ]
  });

  assert.deepEqual(deleteTopologyGroup(profile, "a").groups.map(group => group.id), ["b"]);
});

test("layoutTopologyLanePositions reserves space before a topology group after an ungrouped node", () => {
  const group = { id: "lps", name: "LPs" };
  const positions = layoutTopologyLanePositions([
    {
      key: "peers",
      x: 920,
      nodes: [
        { id: "distribution" },
        { id: "lp-1", topologyGroup: group },
        { id: "lp-2", topologyGroup: group }
      ]
    }
  ]);

  assert.equal(positions.distribution.y, 96);
  assert.equal(positions["lp-1"].y, 190);
  assert.equal(positions["lp-2"].y, 256);
});

test("layoutTopologyLanePositions does not add extra space inside one topology group", () => {
  const group = { id: "lps", name: "LPs" };
  const positions = layoutTopologyLanePositions([
    {
      key: "peers",
      x: 920,
      nodes: [
        { id: "lp-1", topologyGroup: group },
        { id: "lp-2", topologyGroup: group },
        { id: "distribution" }
      ]
    }
  ]);

  assert.equal(positions["lp-1"].y, 96);
  assert.equal(positions["lp-2"].y, 162);
  assert.equal(positions.distribution.y, 228);
});
