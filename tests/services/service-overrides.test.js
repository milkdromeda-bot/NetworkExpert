import assert from "node:assert/strict";
import { test } from "node:test";
import { inferApplicationService } from "../../src/services.js";
import {
  applyServiceOverride,
  deleteServiceOverride,
  normalizeServiceOverrideStore,
  serviceOverrideForSocket,
  upsertServiceOverride
} from "../../src/service-overrides.js";

function socket({ family = "tcp", state = "ESTAB", local = "10.0.0.10:50000", peer = "10.0.0.20:9200" } = {}) {
  const parse = endpoint => {
    const idx = endpoint.lastIndexOf(":");
    return { host: endpoint.slice(0, idx), port: endpoint.slice(idx + 1) };
  };
  return {
    id: `${local}-${peer}`,
    family,
    state,
    local,
    peer,
    localAddress: parse(local),
    peerAddress: parse(peer),
    details: { values: {}, skmem: {} }
  };
}

test("service override changes port 9200 from Elasticsearch to stunnel for one recording", () => {
  const target = socket();
  const inferred = inferApplicationService(target);
  const store = upsertServiceOverride({}, {
    target: "port",
    port: 9200,
    transport: "tcp",
    label: "stunnel"
  }, 1, { sourceName: "capture-a" });

  assert.equal(inferred.label, "Elasticsearch");
  assert.equal(applyServiceOverride(target, store, "capture-a", inferred).label, "stunnel");
  assert.equal(applyServiceOverride(target, store, "capture-b", inferred).label, "Elasticsearch");
});

test("service override can hide a false inferred service", () => {
  const target = socket();
  const store = upsertServiceOverride({}, {
    target: "port",
    port: 9200,
    transport: "tcp",
    hidden: true,
    note: "stunnel terminates elsewhere"
  }, 1, { sourceName: "capture-a" });
  const app = applyServiceOverride(target, store, "capture-a", inferApplicationService(target));

  assert.equal(app.source, "suppressed");
  assert.equal(app.label, "Unknown");
});

test("global service override is explicit and reusable", () => {
  const target = socket();
  const store = upsertServiceOverride({}, {
    target: "port",
    port: 9200,
    transport: "tcp",
    label: "stunnel"
  }, 1, { scope: "global" });

  assert.equal(applyServiceOverride(target, store, "capture-a", inferApplicationService(target)).label, "stunnel");
  assert.equal(serviceOverrideForSocket(store, target, "capture-b", inferApplicationService(target)).scope, "global");
});

test("recording endpoint override wins over recording port override", () => {
  const target = socket();
  const portStore = upsertServiceOverride({}, {
    target: "port",
    port: 9200,
    transport: "tcp",
    label: "stunnel"
  }, 1, { sourceName: "capture-a" });
  const endpointStore = upsertServiceOverride(portStore, {
    target: "endpoint",
    endpoint: "10.0.0.20:9200",
    label: "custom tunnel"
  }, 2, { sourceName: "capture-a" });

  assert.equal(applyServiceOverride(target, endpointStore, "capture-a", inferApplicationService(target)).label, "custom tunnel");
});

test("deleteServiceOverride removes only the chosen scope", () => {
  const global = upsertServiceOverride({}, {
    target: "port",
    port: 9200,
    transport: "tcp",
    label: "global tunnel"
  }, 1, { scope: "global" });
  const local = upsertServiceOverride(global, {
    target: "port",
    port: 9200,
    transport: "tcp",
    label: "local tunnel"
  }, 2, { sourceName: "capture-a" });
  const next = deleteServiceOverride(local, { target: "port", port: 9200, transport: "tcp" }, { sourceName: "capture-a" });

  assert.equal(applyServiceOverride(socket(), next, "capture-a", inferApplicationService(socket())).label, "global tunnel");
});

test("normalizeServiceOverrideStore ignores legacy flat shapes", () => {
  const store = normalizeServiceOverrideStore({
    "port:tcp:9200": { target: "port", port: 9200, label: "old shape" }
  });

  assert.deepEqual(store, { global: {}, scopes: {} });
});
