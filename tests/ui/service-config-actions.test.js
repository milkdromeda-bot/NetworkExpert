import assert from "node:assert/strict";
import { test } from "node:test";
import { handleServiceConfigAction } from "../../src/services/service-config-actions.js";

function fakeDocument(values = {}) {
  return {
    querySelector(selector) {
      if (!(selector in values)) return null;
      const value = values[selector];
      if (typeof value === "object") return value;
      return { value, checked: Boolean(value) };
    }
  };
}

function deps(values = {}) {
  const calls = [];
  const state = {
    sourceName: "capture.log",
    serviceAliases: {},
    serviceOverrides: {},
    topology: { groups: [] },
    topologyEditId: "",
    topologyDraftMatch: ""
  };
  return {
    calls,
    state,
    deps: {
      document: fakeDocument(values),
      state,
      currentAliasDisplay: endpoint => `label:${endpoint}`,
      upsertEndpointAlias: (store, endpoint, payload) => ({ ...store, [endpoint]: payload }),
      deleteEndpointAlias: (store, endpoint) => ({ ...store, [endpoint]: undefined }),
      saveServiceAliases: () => calls.push("saveServiceAliases"),
      upsertServiceOverride: (store, payload) => ({ ...store, last: payload }),
      deleteServiceOverride: () => ({ removed: true }),
      saveServiceOverrides: () => calls.push("saveServiceOverrides"),
      upsertTopologyGroup: (topology, group) => ({ ...topology, groups: [{ id: group.id || "group-1", ...group }] }),
      deleteTopologyGroup: (topology, id) => ({ ...topology, groups: topology.groups.filter(group => group.id !== id) }),
      saveCurrentTopology: () => calls.push("saveCurrentTopology"),
      toast: title => calls.push(`toast:${title}`),
      render: () => calls.push("render")
    }
  };
}

test("service config action saves a scoped service alias", () => {
  const ctx = deps({
    "#aliasEndpoint": "10.0.0.2:443",
    "#aliasLabel": "stunnel",
    "#aliasRole": "gateway",
    "#aliasNote": "verified",
    "#aliasGlobal": { checked: false }
  });

  const handled = handleServiceConfigAction("saveServiceAlias", {}, ctx.deps);

  assert.equal(handled, true);
  assert.deepEqual(ctx.state.serviceAliases["10.0.0.2:443"], { label: "stunnel", role: "gateway", note: "verified" });
  assert.equal(ctx.state.aliasEditScope, "source");
  assert.ok(ctx.calls.includes("saveServiceAliases"));
  assert.ok(ctx.calls.includes("toast:Service label saved"));
  assert.ok(ctx.calls.includes("render"));
});

test("service config action rejects incomplete topology groups without saving", () => {
  const ctx = deps({
    "#topologyName": "Trading VLAN",
    "#topologyMatch": ""
  });

  const handled = handleServiceConfigAction("saveTopologyGroup", {}, ctx.deps);

  assert.equal(handled, true);
  assert.deepEqual(ctx.state.topology.groups, []);
  assert.deepEqual(ctx.calls, ["toast:Topology group incomplete"]);
});

test("service config action deletes an existing topology group", () => {
  const ctx = deps();
  ctx.state.topology = { groups: [{ id: "group-1", name: "old" }] };
  ctx.state.topologyEditId = "group-1";

  const handled = handleServiceConfigAction("deleteTopologyGroup", {}, ctx.deps);

  assert.equal(handled, true);
  assert.deepEqual(ctx.state.topology.groups, []);
  assert.equal(ctx.state.topologyEditId, "");
  assert.ok(ctx.calls.includes("saveCurrentTopology"));
});
