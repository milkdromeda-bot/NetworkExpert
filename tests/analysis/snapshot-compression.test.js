import assert from "node:assert/strict";
import { test } from "node:test";
import { compressSnapshots, decompressSnapshot, iterateCompressed } from "../../src/snapshot-compression.js";

const base = [
  { local: "10.0.0.1:1000", peer: "10.0.0.2:443", state: "ESTAB", sendQ: 0, recvQ: 0, family: "tcp", details: { values: { rtt: { avg: 5, var: 1 }, cwnd: 10 }, skmem: { r: 0, rb: 100000, t: 0, tb: 100000, d: 0 }, timer: null } }
];

function makeSnapshots() {
  return [
    { epochMs: 1000, sockets: base },
    { epochMs: 2000, sockets: [{ ...base[0], sendQ: 100, details: { ...base[0].details, skmem: { ...base[0].details.skmem, d: 5 } } }] },
    { epochMs: 3000, sockets: [{ ...base[0], sendQ: 100, details: { ...base[0].details, skmem: { ...base[0].details.skmem, d: 5 } } }] },
    { epochMs: 4000, sockets: [{ ...base[0], sendQ: 0, recvQ: 200, details: { ...base[0].details, values: { ...base[0].details.values, cwnd: 4 } } }] }
  ];
}

test("compressSnapshots produces fewer full objects than raw", () => {
  const snapshots = makeSnapshots();
  const compressed = compressSnapshots(snapshots);
  assert.equal(compressed.length, 4);
  assert.ok(compressed[0].base);
  assert.ok(compressed[1].deltas);
});

test("decompressSnapshot at index 0 returns base", () => {
  const compressed = compressSnapshots(makeSnapshots());
  const s0 = decompressSnapshot(compressed, 0);
  assert.equal(s0.epochMs, 1000);
  assert.equal(s0.sockets[0].sendQ, 0);
});

test("decompressSnapshot at index 1 applies delta", () => {
  const compressed = compressSnapshots(makeSnapshots());
  const s1 = decompressSnapshot(compressed, 1);
  assert.equal(s1.epochMs, 2000);
  assert.equal(s1.sockets[0].sendQ, 100);
  assert.equal(s1.sockets[0].details.skmem.d, 5);
});

test("unchanged snapshot produces no delta", () => {
  const compressed = compressSnapshots(makeSnapshots());
  // snapshot 2 is same as 1, so deltas should be empty
  assert.equal(compressed[2].deltas.size, 0);
});

test("iterateCompressed yields all snapshots correctly", () => {
  const snapshots = makeSnapshots();
  const compressed = compressSnapshots(snapshots);
  const results = [...iterateCompressed(compressed)];
  assert.equal(results.length, 4);
  assert.equal(results[0].sockets[0].sendQ, 0);
  assert.equal(results[1].sockets[0].sendQ, 100);
  assert.equal(results[3].sockets[0].recvQ, 200);
  assert.equal(results[3].sockets[0].details.values.cwnd, 4);
});
