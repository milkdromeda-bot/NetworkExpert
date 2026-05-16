import assert from "node:assert/strict";
import { test } from "node:test";

import { detectMultiSocketCorrelation, SYMPTOMS } from "../../src/multi-socket-correlation.js";

function socket(local, peer, overrides = {}) {
  return `tcp ESTAB ${overrides.recvQ || 0} ${overrides.sendQ || 0} ${local} ${peer} users:(("${overrides.process || "java"}",pid=${overrides.pid || 42},fd=7)) ${overrides.timer || ""} ino:${overrides.ino || Math.random().toString(36).slice(2)} sk:${overrides.sk || Math.random().toString(36).slice(2)} skmem:(r${overrides.skmemR || 0},rb4225792,t0,tb870400,f0,w0,o0,bl0,d${overrides.skmemD || 0}) rto:201 rtt:0.1/0.01 cwnd:10${overrides.backoff ? ` backoff:${overrides.backoff}` : ""}${overrides.rwndLimited ? ` rwnd_limited:500ms(${overrides.rwndLimited}%)` : ""}`;
}

test("multi-socket-correlation returns empty for insufficient snapshots", () => {
  const result = detectMultiSocketCorrelation("tcp ESTAB 0 0 10.0.0.1:5000 10.0.0.2:443");
  assert.equal(result.length, 0);
});

test("multi-socket-correlation detects process-wide persist onset", () => {
  const snap1 = [
    "2026-05-15T13:28:59,000+00:00",
    socket("10.0.0.1:5000", "10.0.0.2:443", { sk: "a1" }),
    socket("10.0.0.1:5001", "10.0.0.3:443", { sk: "a2" }),
    socket("10.0.0.1:5002", "10.0.0.4:443", { sk: "a3" })
  ].join("\n");
  const snap2 = [
    "2026-05-15T13:29:00,000+00:00",
    socket("10.0.0.1:5000", "10.0.0.2:443", { sk: "a1", timer: "timer:(persist,1sec,0)" }),
    socket("10.0.0.1:5001", "10.0.0.3:443", { sk: "a2", timer: "timer:(persist,1sec,0)" }),
    socket("10.0.0.1:5002", "10.0.0.4:443", { sk: "a3", timer: "timer:(persist,1sec,0)" })
  ].join("\n");

  const result = detectMultiSocketCorrelation(`${snap1}\n${snap2}`);
  const processEvent = result.find(e => e.type === "process-wide" && e.symptomId === "persist");

  assert.notEqual(processEvent, undefined);
  assert.equal(processEvent.socketCount, 3);
  assert.equal(processEvent.ratio, 1);
  assert.equal(processEvent.groupKey, "java:42");
  assert.equal(processEvent.narrative.title.includes("Process-wide symptom"), true);
  assert.equal(processEvent.narrative.conclusion.includes("Common cause"), true);
});

test("multi-socket-correlation detects process-wide Recv-Q onset", () => {
  const snap1 = [
    "2026-05-15T13:28:59,000+00:00",
    socket("10.0.0.1:5000", "10.0.0.2:443", { sk: "b1", recvQ: 0 }),
    socket("10.0.0.1:5001", "10.0.0.3:443", { sk: "b2", recvQ: 0 }),
    socket("10.0.0.1:5002", "10.0.0.4:443", { sk: "b3", recvQ: 0 })
  ].join("\n");
  const snap2 = [
    "2026-05-15T13:29:00,000+00:00",
    socket("10.0.0.1:5000", "10.0.0.2:443", { sk: "b1", recvQ: 500000 }),
    socket("10.0.0.1:5001", "10.0.0.3:443", { sk: "b2", recvQ: 400000 }),
    socket("10.0.0.1:5002", "10.0.0.4:443", { sk: "b3", recvQ: 300000 })
  ].join("\n");

  const result = detectMultiSocketCorrelation(`${snap1}\n${snap2}`);
  const event = result.find(e => e.type === "process-wide" && e.symptomId === "high-recvQ");

  assert.notEqual(event, undefined);
  assert.equal(event.socketCount, 3);
});

test("multi-socket-correlation detects peer-wide symptom", () => {
  const snap1 = [
    "2026-05-15T13:28:59,000+00:00",
    socket("10.0.0.1:5000", "10.0.0.2:443", { sk: "c1", pid: 100, process: "app1" }),
    socket("10.0.0.1:5001", "10.0.0.2:8080", { sk: "c2", pid: 200, process: "app2" })
  ].join("\n");
  const snap2 = [
    "2026-05-15T13:29:00,000+00:00",
    socket("10.0.0.1:5000", "10.0.0.2:443", { sk: "c1", pid: 100, process: "app1", sendQ: 500000 }),
    socket("10.0.0.1:5001", "10.0.0.2:8080", { sk: "c2", pid: 200, process: "app2", sendQ: 400000 })
  ].join("\n");

  const result = detectMultiSocketCorrelation(`${snap1}\n${snap2}`);
  const event = result.find(e => e.type === "peer-wide" && e.groupKey === "10.0.0.2");

  assert.notEqual(event, undefined);
  assert.equal(event.socketCount, 2);
  assert.equal(event.narrative.title.includes("Peer-wide"), true);
});

test("multi-socket-correlation does not fire for single socket", () => {
  const snap1 = [
    "2026-05-15T13:28:59,000+00:00",
    socket("10.0.0.1:5000", "10.0.0.2:443", { sk: "d1" })
  ].join("\n");
  const snap2 = [
    "2026-05-15T13:29:00,000+00:00",
    socket("10.0.0.1:5000", "10.0.0.2:443", { sk: "d1", timer: "timer:(persist,1sec,0)" })
  ].join("\n");

  const result = detectMultiSocketCorrelation(`${snap1}\n${snap2}`);
  assert.equal(result.filter(e => e.type === "process-wide").length, 0);
});

test("multi-socket-correlation does not fire when symptom already existed", () => {
  const snap1 = [
    "2026-05-15T13:28:59,000+00:00",
    socket("10.0.0.1:5000", "10.0.0.2:443", { sk: "e1", timer: "timer:(persist,1sec,0)" }),
    socket("10.0.0.1:5001", "10.0.0.3:443", { sk: "e2", timer: "timer:(persist,1sec,0)" }),
    socket("10.0.0.1:5002", "10.0.0.4:443", { sk: "e3", timer: "timer:(persist,1sec,0)" })
  ].join("\n");
  const snap2 = [
    "2026-05-15T13:29:00,000+00:00",
    socket("10.0.0.1:5000", "10.0.0.2:443", { sk: "e1", timer: "timer:(persist,1sec,0)" }),
    socket("10.0.0.1:5001", "10.0.0.3:443", { sk: "e2", timer: "timer:(persist,1sec,0)" }),
    socket("10.0.0.1:5002", "10.0.0.4:443", { sk: "e3", timer: "timer:(persist,1sec,0)" })
  ].join("\n");

  const result = detectMultiSocketCorrelation(`${snap1}\n${snap2}`);
  const persistEvents = result.filter(e => e.symptomId === "persist");
  assert.equal(persistEvents.length, 0);
});

test("multi-socket-correlation includes narrative with time and conclusion", () => {
  const snap1 = [
    "2026-05-15T13:28:59,000+00:00",
    socket("10.0.0.1:5000", "10.0.0.2:443", { sk: "f1" }),
    socket("10.0.0.1:5001", "10.0.0.3:443", { sk: "f2" }),
    socket("10.0.0.1:5002", "10.0.0.4:443", { sk: "f3" }),
    socket("10.0.0.1:5003", "10.0.0.5:443", { sk: "f4" })
  ].join("\n");
  const snap2 = [
    "2026-05-15T13:29:00,000+00:00",
    socket("10.0.0.1:5000", "10.0.0.2:443", { sk: "f1", timer: "timer:(persist,1sec,0)" }),
    socket("10.0.0.1:5001", "10.0.0.3:443", { sk: "f2", timer: "timer:(persist,1sec,0)" }),
    socket("10.0.0.1:5002", "10.0.0.4:443", { sk: "f3", timer: "timer:(persist,1sec,0)" }),
    socket("10.0.0.1:5003", "10.0.0.5:443", { sk: "f4", timer: "timer:(persist,1sec,0)" })
  ].join("\n");

  const result = detectMultiSocketCorrelation(`${snap1}\n${snap2}`);
  const event = result[0];

  assert.equal(event.narrative.line.includes("13:29:00.000 UTC"), true);
  assert.equal(event.narrative.line.includes("4/4 sockets"), true);
  assert.equal(event.narrative.conclusion.includes("Common cause"), true);
});

test("multi-socket-correlation exposes SYMPTOMS for extensibility", () => {
  assert.equal(Array.isArray(SYMPTOMS), true);
  assert.equal(SYMPTOMS.length >= 5, true);
});
