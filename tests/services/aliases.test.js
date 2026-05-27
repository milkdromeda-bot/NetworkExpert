import assert from "node:assert/strict";
import { test } from "node:test";
import { aliasCountForSource, aliasDisplay, aliasForEndpoint, aliasListForSource, deleteEndpointAlias, endpointAliasKey, normalizeAliasStore, upsertEndpointAlias } from "../../src/services/aliases.js";

test("endpoint alias keys are stable across spaces and case", () => {
  assert.equal(endpointAliasKey(" [::FFFF:10.0.0.1]:9100 "), "endpoint:[::ffff:10.0.0.1]:9100");
});

test("empty endpoint does not create a key", () => {
  assert.equal(endpointAliasKey("   "), "");
});

test("upsertEndpointAlias stores business metadata without losing the endpoint", () => {
  const store = upsertEndpointAlias({}, "192.168.1.10:20002", {
    label: "FIX stream",
    role: "Aggregator A",
    note: "Market data"
  }, 123);

  assert.deepEqual(aliasForEndpoint(store, "192.168.1.10:20002"), {
    endpoint: "192.168.1.10:20002",
    label: "FIX stream",
    role: "Aggregator A",
    note: "Market data",
    updatedAt: 123
  });
});

test("upsertEndpointAlias trims fields before saving", () => {
  const store = upsertEndpointAlias({}, "10.0.0.2:443", {
    label: "  nginx ingress  ",
    role: "  edge proxy  ",
    note: "  prod  "
  }, 456);

  assert.equal(aliasForEndpoint(store, "10.0.0.2:443").label, "nginx ingress");
  assert.equal(aliasForEndpoint(store, "10.0.0.2:443").role, "edge proxy");
  assert.equal(aliasForEndpoint(store, "10.0.0.2:443").note, "prod");
});

test("blank alias fields remove an existing endpoint alias", () => {
  const store = upsertEndpointAlias({}, "10.0.0.2:443", { label: "nginx" }, 1);
  const next = upsertEndpointAlias(store, "10.0.0.2:443", { label: "", role: "", note: "" }, 2);

  assert.equal(aliasForEndpoint(next, "10.0.0.2:443"), null);
});

test("deleteEndpointAlias removes only the selected endpoint", () => {
  const store = upsertEndpointAlias(
    upsertEndpointAlias({}, "10.0.0.2:443", { label: "nginx" }, 1),
    "10.0.0.3:9100",
    { label: "fix" },
    2
  );
  const next = deleteEndpointAlias(store, "10.0.0.2:443");

  assert.equal(aliasForEndpoint(next, "10.0.0.2:443"), null);
  assert.equal(aliasForEndpoint(next, "10.0.0.3:9100").label, "fix");
});

test("normalizeAliasStore drops invalid and empty scoped records", () => {
  const store = normalizeAliasStore({
    global: {
      "endpoint:10.0.0.1:80": { endpoint: "10.0.0.1:80", label: "" },
      "process:java": { label: "ignored" },
      "endpoint:10.0.0.2:443": { endpoint: "10.0.0.2:443", label: "ingress" }
    }
  });

  assert.deepEqual(Object.keys(store.global), ["endpoint:10.0.0.2:443"]);
  assert.deepEqual(Object.keys(store.scopes), []);
});

test("normalizeAliasStore ignores legacy flat endpoint labels", () => {
  const store = normalizeAliasStore({
    "endpoint:10.0.0.2:443": { endpoint: "10.0.0.2:443", label: "old global shape" }
  });

  assert.equal(aliasForEndpoint(store, "10.0.0.2:443"), null);
});

test("source labels do not bleed into other recordings", () => {
  const store = upsertEndpointAlias({}, "10.0.0.2:443", { label: "LALO" }, 1, { sourceName: "capture-a" });

  assert.equal(aliasDisplay("10.0.0.2:443", store, "capture-a"), "LALO");
  assert.equal(aliasDisplay("10.0.0.2:443", store, "capture-b"), "10.0.0.2:443");
});

test("global labels are explicit fallbacks", () => {
  const store = upsertEndpointAlias({}, "10.0.0.2:443", { label: "shared ingress" }, 1, { scope: "global" });

  assert.equal(aliasDisplay("10.0.0.2:443", store, "capture-a"), "shared ingress");
  assert.equal(aliasForEndpoint(store, "10.0.0.2:443", "capture-a", { scope: "source" }), null);
  assert.equal(aliasForEndpoint(store, "10.0.0.2:443", "capture-a", { scope: "global" }).label, "shared ingress");
});

test("local labels override global labels for the same endpoint", () => {
  const global = upsertEndpointAlias({}, "10.0.0.2:443", { label: "shared ingress" }, 1, { scope: "global" });
  const local = upsertEndpointAlias(global, "10.0.0.2:443", { label: "LALO" }, 2, { sourceName: "capture-a" });

  assert.equal(aliasDisplay("10.0.0.2:443", local, "capture-a"), "LALO");
  assert.equal(aliasDisplay("10.0.0.2:443", local, "capture-b"), "shared ingress");
});

test("alias list and count are scoped to the active recording", () => {
  const global = upsertEndpointAlias({}, "10.0.0.2:443", { label: "shared ingress" }, 1, { scope: "global" });
  const store = upsertEndpointAlias(global, "10.0.0.3:9100", { label: "FIX stream" }, 2, { sourceName: "capture-a" });

  assert.deepEqual(aliasListForSource(store, "capture-b").map(item => item.label), ["shared ingress"]);
  assert.equal(aliasCountForSource(store, "capture-a"), 2);
  assert.equal(aliasCountForSource(store, "capture-a", { includeGlobal: false }), 1);
});

test("aliasDisplay falls back to the raw endpoint when no label exists", () => {
  assert.equal(aliasDisplay("10.0.0.2:443", {}), "10.0.0.2:443");
});

test("aliasDisplay prefers the saved business label", () => {
  const store = upsertEndpointAlias({}, "10.0.0.2:443", { label: "edge proxy" }, 1);

  assert.equal(aliasDisplay("10.0.0.2:443", store), "edge proxy");
});

test("alias lookup is case insensitive for IPv6 mapped endpoints", () => {
  const store = upsertEndpointAlias({}, "[::FFFF:10.0.0.1]:9100", { label: "printer feed" }, 1);

  assert.equal(aliasForEndpoint(store, "[::ffff:10.0.0.1]:9100").label, "printer feed");
});
