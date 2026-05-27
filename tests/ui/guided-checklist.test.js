import assert from "node:assert/strict";
import { test } from "node:test";

import { buildGuidedChecklistItems } from "../../src/views/guided-checklist.js";

const thresholds = {
  recvQ: { warn: 100, danger: 500 },
  sendQ: { warn: 200, danger: 1000 },
  rto: { warn: 250, danger: 1000 }
};

function thresholdFor(metric) {
  return thresholds[metric] || { warn: Infinity, danger: Infinity };
}

function socket(overrides = {}) {
  return {
    id: "s1",
    recvQ: 0,
    sendQ: 0,
    details: {
      values: {},
      skmem: {},
      timer: {},
      process: null
    },
    ...overrides,
    details: {
      values: {},
      skmem: {},
      timer: {},
      process: null,
      ...(overrides.details || {})
    }
  };
}

test("guided checklist returns no items without a socket", () => {
  assert.deepEqual(buildGuidedChecklistItems({ thresholdFor }), []);
});

test("guided checklist detects local slow consumer from receive pressure", () => {
  const items = buildGuidedChecklistItems({
    socket: socket({ recvQ: 600, details: { process: { name: "java", pid: 42 }, skmem: { r: 800, rb: 1000 } } }),
    thresholdFor
  });
  assert.equal(items[0].id, "slow-consumer");
  assert.equal(items[0].severity, "critical");
  assert.match(items[0].why, /java:42/);
  assert.equal(items[0].preset, "microburst");
});

test("guided checklist adds receive pressure when burst evidence exists", () => {
  const items = buildGuidedChecklistItems({
    socket: socket({ recvQ: 150, details: { skmem: { d: 3 } } }),
    burst: { severity: "high" },
    thresholdFor,
    formatMicroburstWindow: () => "13:29:00 to 13:29:02"
  });
  assert.ok(items.some(item => item.id === "receive-pressure"));
  assert.ok(items.some(item => item.why.includes("13:29:00 to 13:29:02")));
});

test("guided checklist detects path instability from timers and backoff", () => {
  const items = buildGuidedChecklistItems({
    socket: socket({ details: { values: { backoff: 2, rto: 400 }, timer: { retrans: 1 } } }),
    thresholdFor
  });
  const item = items.find(entry => entry.id === "path-instability");
  assert.equal(item?.severity, "high");
  assert.equal(item?.preset, "tail");
});

test("guided checklist uses tail-latency lens for zoom action", () => {
  const items = buildGuidedChecklistItems({
    socket: socket(),
    lens: { suspicion: "path instability", severity: "medium" },
    thresholdFor,
    formatTailLatencyWindow: () => "worst 5s window"
  });
  assert.equal(items[0].id, "path-instability");
  assert.equal(items[0].action, "zoomTailWindow");
  assert.match(items[0].why, /worst 5s window/);
});

test("guided checklist detects peer drain from send pressure", () => {
  const items = buildGuidedChecklistItems({
    socket: socket({ sendQ: 1200, details: { skmem: { t: 900, w: 100, tb: 1000 } } }),
    thresholdFor
  });
  const item = items.find(entry => entry.id === "peer-drain");
  assert.equal(item?.severity, "critical");
  assert.equal(item?.actionLabel, "Open tail charts");
});

test("guided checklist limits noisy combinations to five items", () => {
  const items = buildGuidedChecklistItems({
    socket: socket({ recvQ: 600, sendQ: 1200, details: { values: { backoff: 2, rto: 400 }, skmem: { r: 900, rb: 1000, t: 900, w: 100, tb: 1000, d: 4 }, timer: { retrans: 1 } } }),
    burst: { severity: "critical" },
    lens: { suspicion: "peer-side drain issue", severity: "high" },
    anomalies: [{ metric: "skmem.d" }, { metric: "rto" }],
    thresholdFor
  });
  assert.equal(items.length, 5);
  assert.deepEqual(items.map(item => item.id), ["slow-consumer", "receive-pressure", "path-instability", "peer-drain", "buffer-tuning"]);
});
