import assert from "node:assert/strict";
import { test } from "node:test";
import { deleteTopologyGroup, endpointHost, endpointMatchesPattern, layoutTopologyLanePositions, normalizeTopologyProfile, topologyGroupForEndpoint, topologyScopeKey, upsertTopologyGroup } from "../../src/config/topology.js";

// topologyScopeKey
test("topologyScopeKey lowercases input", () => {
  assert.equal(topologyScopeKey("MyFile.log"), "myfile.log");
});
test("topologyScopeKey trims whitespace", () => {
  assert.equal(topologyScopeKey("  file.log  "), "file.log");
});
test("topologyScopeKey returns workspace for empty", () => {
  assert.equal(topologyScopeKey(""), "workspace");
});
test("topologyScopeKey returns workspace for null", () => {
  assert.equal(topologyScopeKey(null), "workspace");
});
test("topologyScopeKey returns workspace for undefined", () => {
  assert.equal(topologyScopeKey(undefined), "workspace");
});
test("topologyScopeKey returns workspace for whitespace only", () => {
  assert.equal(topologyScopeKey("   "), "workspace");
});

// endpointHost
test("endpointHost extracts IPv4 host", () => {
  assert.equal(endpointHost("192.168.1.1:8080"), "192.168.1.1");
});
test("endpointHost extracts bracketed IPv6", () => {
  assert.equal(endpointHost("[::1]:443"), "::1");
});
test("endpointHost returns raw for host without port", () => {
  assert.equal(endpointHost("192.168.1.1"), "192.168.1.1");
});
test("endpointHost handles empty string", () => {
  assert.equal(endpointHost(""), "");
});
test("endpointHost handles null", () => {
  assert.equal(endpointHost(null), "");
});
test("endpointHost handles IPv6 mapped address", () => {
  assert.equal(endpointHost("[::ffff:10.0.0.1]:9100"), "::ffff:10.0.0.1");
});

// endpointMatchesPattern
test("endpointMatchesPattern exact match", () => {
  assert.equal(endpointMatchesPattern("10.0.0.1:443", "10.0.0.1:443"), true);
});
test("endpointMatchesPattern host-only match", () => {
  assert.equal(endpointMatchesPattern("10.0.0.1:443", "10.0.0.1"), true);
});
test("endpointMatchesPattern wildcard port", () => {
  assert.equal(endpointMatchesPattern("10.0.0.1:8080", "10.0.0.1:*"), true);
});
test("endpointMatchesPattern case insensitive", () => {
  assert.equal(endpointMatchesPattern("[::FFFF:10.0.0.1]:80", "[::ffff:10.0.0.1]:80"), true);
});
test("endpointMatchesPattern rejects mismatch", () => {
  assert.equal(endpointMatchesPattern("10.0.0.1:443", "10.0.0.2:443"), false);
});
test("endpointMatchesPattern rejects empty endpoint", () => {
  assert.equal(endpointMatchesPattern("", "10.0.0.1"), false);
});
test("endpointMatchesPattern rejects empty pattern", () => {
  assert.equal(endpointMatchesPattern("10.0.0.1:443", ""), false);
});
test("endpointMatchesPattern rejects null endpoint", () => {
  assert.equal(endpointMatchesPattern(null, "10.0.0.1"), false);
});
test("endpointMatchesPattern rejects null pattern", () => {
  assert.equal(endpointMatchesPattern("10.0.0.1:443", null), false);
});

// normalizeTopologyProfile
test("normalizeTopologyProfile handles null", () => {
  const p = normalizeTopologyProfile(null);
  assert.deepEqual(p.groups, []);
});
test("normalizeTopologyProfile handles undefined", () => {
  const p = normalizeTopologyProfile(undefined);
  assert.deepEqual(p.groups, []);
});
test("normalizeTopologyProfile filters groups without name", () => {
  const p = normalizeTopologyProfile({ groups: [{ match: "10.0.0.*" }] });
  assert.equal(p.groups.length, 0);
});
test("normalizeTopologyProfile filters groups without match", () => {
  const p = normalizeTopologyProfile({ groups: [{ name: "Group A" }] });
  assert.equal(p.groups.length, 0);
});
test("normalizeTopologyProfile keeps valid groups", () => {
  const p = normalizeTopologyProfile({ groups: [{ name: "A", match: "10.0.0.*" }] });
  assert.equal(p.groups.length, 1);
  assert.equal(p.groups[0].name, "A");
});
test("normalizeTopologyProfile assigns default color", () => {
  const p = normalizeTopologyProfile({ groups: [{ name: "A", match: "10.*" }] });
  assert.ok(p.groups[0].color);
});

// topologyGroupForEndpoint
test("topologyGroupForEndpoint returns matching group", () => {
  const profile = { groups: [{ name: "Web", match: "10.0.0.1" }] };
  const group = topologyGroupForEndpoint(profile, "10.0.0.1:443");
  assert.equal(group.name, "Web");
});
test("topologyGroupForEndpoint returns null for no match", () => {
  const profile = { groups: [{ name: "Web", match: "10.0.0.1" }] };
  assert.equal(topologyGroupForEndpoint(profile, "10.0.0.2:443"), null);
});
test("topologyGroupForEndpoint supports comma patterns", () => {
  const profile = { groups: [{ name: "Cluster", match: "10.0.0.1, 10.0.0.2" }] };
  assert.equal(topologyGroupForEndpoint(profile, "10.0.0.2:80").name, "Cluster");
});

// upsertTopologyGroup
test("upsertTopologyGroup creates new group", () => {
  const profile = upsertTopologyGroup(null, { name: "DB", match: "10.0.1.*" }, 1000);
  assert.equal(profile.groups.length, 1);
  assert.equal(profile.groups[0].name, "DB");
});
test("upsertTopologyGroup replaces existing by id", () => {
  let profile = upsertTopologyGroup(null, { id: "g1", name: "A", match: "10.*" }, 1000);
  profile = upsertTopologyGroup(profile, { id: "g1", name: "B", match: "10.*" }, 2000);
  assert.equal(profile.groups.length, 1);
  assert.equal(profile.groups[0].name, "B");
});
test("upsertTopologyGroup ignores blank name", () => {
  const profile = upsertTopologyGroup(null, { name: "", match: "10.*" }, 1000);
  assert.equal(profile.groups.length, 0);
});
test("upsertTopologyGroup ignores blank match", () => {
  const profile = upsertTopologyGroup(null, { name: "A", match: "" }, 1000);
  assert.equal(profile.groups.length, 0);
});

// deleteTopologyGroup
test("deleteTopologyGroup removes by id", () => {
  let profile = upsertTopologyGroup(null, { id: "g1", name: "A", match: "10.*" }, 1000);
  profile = upsertTopologyGroup(profile, { id: "g2", name: "B", match: "20.*" }, 2000);
  profile = deleteTopologyGroup(profile, "g1");
  assert.equal(profile.groups.length, 1);
  assert.equal(profile.groups[0].id, "g2");
});
test("deleteTopologyGroup is safe for non-existent id", () => {
  const profile = upsertTopologyGroup(null, { id: "g1", name: "A", match: "10.*" }, 1000);
  const result = deleteTopologyGroup(profile, "nonexistent");
  assert.equal(result.groups.length, 1);
});

// layoutTopologyLanePositions
test("layoutTopologyLanePositions assigns y positions", () => {
  const lanes = [{ x: 100, nodes: [{ id: "n1" }, { id: "n2" }] }];
  const positions = layoutTopologyLanePositions(lanes);
  assert.ok(positions.n1.y < positions.n2.y);
  assert.equal(positions.n1.x, 100);
});
test("layoutTopologyLanePositions adds group entry gap", () => {
  const lanes = [{ x: 100, nodes: [{ id: "n1" }, { id: "n2", topologyGroup: { id: "g1" } }] }];
  const positions = layoutTopologyLanePositions(lanes);
  const gap = positions.n2.y - positions.n1.y;
  assert.ok(gap > 66);
});
test("layoutTopologyLanePositions no extra gap within same group", () => {
  const lanes = [{ x: 100, nodes: [{ id: "n1", topologyGroup: { id: "g1" } }, { id: "n2", topologyGroup: { id: "g1" } }] }];
  const positions = layoutTopologyLanePositions(lanes);
  const gap = positions.n2.y - positions.n1.y;
  assert.equal(gap, 66);
});
test("layoutTopologyLanePositions handles empty lanes", () => {
  const positions = layoutTopologyLanePositions([]);
  assert.deepEqual(positions, {});
});
