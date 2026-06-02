import assert from "node:assert/strict";
import { test } from "node:test";

import { createIpIntelController } from "../../src/rendering/ip-intel-controller.js";

test("ip intel controller records successful and failed lookups", async () => {
  const state = { ipIntel: {}, sockets: [], ipIntelRunning: false };
  const controller = createIpIntelController(() => ({
    state,
    publicPeerIps: () => [],
    render: () => {},
    fetchRef: async url => {
      if (url.includes("10.0.0.2")) return { ok: false, status: 500 };
      return { ok: true, json: async () => ({ country: "FR" }) };
    }
  }));

  await controller.enrichIpIntelQueue(["10.0.0.1", "10.0.0.2"]);

  assert.deepEqual(state.ipIntel["10.0.0.1"], { status: "done", data: { country: "FR" } });
  assert.deepEqual(state.ipIntel["10.0.0.2"], { status: "error", error: "HTTP 500" });
});

test("ip intel controller schedules pending public peers once", async () => {
  let renders = 0;
  const state = { ipIntel: { "10.0.0.2": { status: "done" } }, sockets: [{ id: "s1" }], ipIntelRunning: false };
  const controller = createIpIntelController(() => ({
    state,
    publicPeerIps: () => ["10.0.0.1", "10.0.0.2"],
    render: () => { renders += 1; },
    fetchRef: async () => ({ ok: true, json: async () => ({ asn: 123 }) })
  }));

  controller.scheduleIpIntelEnrichment();
  assert.equal(state.ipIntelRunning, true);
  assert.deepEqual(state.ipIntel["10.0.0.1"], { status: "loading" });
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(state.ipIntelRunning, false);
  assert.deepEqual(state.ipIntel["10.0.0.1"], { status: "done", data: { asn: 123 } });
  assert.equal(renders, 1);
});
