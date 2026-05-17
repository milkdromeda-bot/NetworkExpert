import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRootCauseMatrix, ROOT_CAUSES } from "../../src/root-cause-matrix.js";

function makeSocket(overrides = {}) {
  return {
    id: "socket-test",
    state: "ESTAB",
    sendQ: 0,
    recvQ: 0,
    local: "10.0.0.1:5000",
    peer: "10.0.0.2:443",
    details: {
      timer: null,
      process: null,
      values: {},
      skmem: {},
      raw: "",
      ...overrides.details
    },
    ...overrides
  };
}

test("root-cause-matrix returns empty result for no sockets", () => {
  const result = buildRootCauseMatrix([]);
  assert.equal(result.topCause, null);
  assert.equal(result.causes.length, 0);
  assert.equal(result.ambiguous, false);
});

test("root-cause-matrix detects network congestion pattern", () => {
  const socket = makeSocket({
    sendQ: 500000,
    details: {
      timer: { name: "on", retrans: 3 },
      values: { rto: 2000, cwnd: 2, rtt: 200, backoff: 3 },
      skmem: {},
      raw: ""
    }
  });
  const result = buildRootCauseMatrix([socket]);

  assert.equal(result.topCause.id, "network-congestion");
  assert.equal(result.topCause.confidence > 0.5, true);
  assert.equal(result.topCause.present.includes("high-rto"), true);
  assert.equal(result.topCause.present.includes("retrans"), true);
});

test("root-cause-matrix detects slow consumer pattern", () => {
  const socket = makeSocket({
    recvQ: 500000,
    details: {
      timer: null,
      process: { name: "java", pid: 42 },
      values: { rcv_space: 4096, rwnd_limited_pct: 45 },
      skmem: { r: 400000, d: 5 },
      raw: ""
    }
  });
  const result = buildRootCauseMatrix([socket]);

  assert.equal(result.topCause.id, "slow-consumer");
  assert.equal(result.topCause.confidence > 0.7, true);
});

test("root-cause-matrix detects zero-window persist", () => {
  const socket = makeSocket({
    sendQ: 100000,
    details: {
      timer: { name: "persist" },
      values: { snd_wnd: 0, rwnd_limited_pct: 80, backoff: 2 },
      skmem: {},
      raw: ""
    }
  });
  const result = buildRootCauseMatrix([socket]);

  assert.equal(result.topCause.id, "zero-window-persist");
  assert.equal(result.topCause.confidence > 0.8, true);
});

test("root-cause-matrix detects buffer pressure from drops", () => {
  const socket = makeSocket({
    recvQ: 200000,
    details: {
      timer: null,
      values: {},
      skmem: { r: 300000, t: 100000, d: 50 },
      raw: ""
    }
  });
  const result = buildRootCauseMatrix([socket]);

  assert.equal(result.topCause.id, "buffer-pressure");
  assert.equal(result.topCause.present.includes("drops"), true);
});

test("root-cause-matrix detects app overproduction", () => {
  const socket = makeSocket({
    sendQ: 1000000,
    details: {
      timer: null,
      process: { name: "producer", pid: 99 },
      values: { rto: 200, cwnd: 20 },
      skmem: { t: 500000 },
      raw: ""
    }
  });
  const result = buildRootCauseMatrix([socket]);

  assert.equal(result.topCause.id, "app-overproduction");
  assert.equal(result.topCause.present.includes("high-sendQ"), true);
  assert.equal(result.topCause.present.includes("no-retrans"), true);
});

test("root-cause-matrix flags ambiguous when two causes are close", () => {
  const socket = makeSocket({
    recvQ: 500000,
    sendQ: 500000,
    details: {
      timer: { name: "on", retrans: 2 },
      process: { name: "java", pid: 42 },
      values: { rto: 1500, cwnd: 3, rcv_space: 4096, rwnd_limited_pct: 30 },
      skmem: { r: 300000, t: 200000, d: 10 },
      raw: ""
    }
  });
  const result = buildRootCauseMatrix([socket]);

  assert.equal(result.causes.length, ROOT_CAUSES.length);
  assert.equal(result.causes[0].confidence > 0, true);
});

test("root-cause-matrix returns all causes sorted by confidence", () => {
  const socket = makeSocket({
    details: {
      timer: { name: "persist" },
      values: { snd_wnd: 0 },
      skmem: {},
      raw: ""
    }
  });
  const result = buildRootCauseMatrix([socket]);

  for (let i = 1; i < result.causes.length; i++) {
    assert.equal(result.causes[i - 1].confidence >= result.causes[i].confidence, true);
  }
});

test("root-cause-matrix exposes present and absent signals", () => {
  const socket = makeSocket({
    details: {
      timer: { name: "on", retrans: 1 },
      values: { rto: 500, cwnd: 10 },
      skmem: {},
      raw: ""
    }
  });
  const result = buildRootCauseMatrix([socket]);
  const retransLoss = result.causes.find(c => c.id === "retrans-loss");

  assert.equal(retransLoss.present.includes("retrans"), true);
  assert.equal(retransLoss.absent.length > 0, true);
  assert.equal(retransLoss.totalSignals, ROOT_CAUSES.find(c => c.id === "retrans-loss").signals.length);
});

test("root-cause-matrix detects JVM/GC stall pattern", () => {
  const socket = makeSocket({
    recvQ: 300000,
    details: {
      timer: { name: "persist" },
      process: { name: "java", pid: 1234 },
      values: { rwnd_limited_pct: 50 },
      skmem: { d: 3 },
      raw: ""
    }
  });
  const result = buildRootCauseMatrix([socket]);
  const jvm = result.causes.find(c => c.id === "jvm-gc-stall");

  assert.equal(jvm.confidence > 0.5, true);
  assert.equal(jvm.present.includes("java-process"), true);
  assert.equal(jvm.present.includes("persist-timer"), true);
});
