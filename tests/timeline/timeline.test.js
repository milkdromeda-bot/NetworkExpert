import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSs } from "../../src/parser.js";
import { aggregateParsedSocketsByKey, aggregateTimestampedSockets, buildSocketHistoryFromSnapshots, parsedTimestampSnapshots, socketKey, timestampBlocks } from "../../src/timeline.js";

function generateLightSample() {
  const socketRows = Array.from({ length: 10 }, (_, index) => {
    const localPort = 10000 + index;
    const peerPort = 20000 + index;
    return `ESTAB 0 0 10.0.0.1:${localPort} 10.0.1.${index + 1}:${peerPort} rtt:${index + 1}.0/0.${index + 1} cwnd:${10 + index}`;
  });

  const blocks = Array.from({ length: 747 }, (_, index) => {
    const minute = String(Math.floor(index / 60)).padStart(2, "0");
    const second = String(index % 60).padStart(2, "0");
    return [
      `--- 2026-04-27 16:${minute}:${second} ---`,
      ...socketRows
    ].join("\n");
  });

  return blocks.join("\n");
}

const lightSample = generateLightSample();

test("timestamped captures are aggregated to unique sockets", () => {
  const rawSockets = parseSs(lightSample);
  const blocks = timestampBlocks(lightSample);
  const sockets = aggregateTimestampedSockets(lightSample);

  assert.equal(blocks.length, 747);
  assert.equal(rawSockets.length, 7470);
  assert.equal(sockets.length, 10);
  assert.equal(Math.max(...sockets.map(socket => socket.snapshotCount || 0)), 747);
});

test("timestamped aggregation keeps stable ids across repeated runs", () => {
  const first = aggregateTimestampedSockets(lightSample).map(socket => socket.id).sort();
  const second = aggregateTimestampedSockets(lightSample).map(socket => socket.id).sort();

  assert.deepEqual(second, first);
});

test("non timestamped captures are not collapsed by endpoint", () => {
  const raw = [
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1.5/0.2",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:2.5/0.3"
  ].join("\n");

  const sockets = aggregateTimestampedSockets(raw);

  assert.equal(sockets.length, 2);
  assert.equal(sockets[0].details.values.rtt.avg, 1.5);
  assert.equal(sockets[1].details.values.rtt.avg, 2.5);
});

test("timestamp blocks ignore preamble and keep socket lines under the right timestamp", () => {
  const raw = [
    "Command to be executed: ss -ti",
    "--- 2026-04-27 16:24:13 ---",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1",
    "--- 2026-04-27 16:24:14 ---",
    "ESTAB 0 0 10.0.0.3:1001 10.0.0.4:80 rtt:2/0.2"
  ].join("\n");

  const blocks = timestampBlocks(raw);

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].lines.length, 1);
  assert.equal(blocks[1].lines[0].includes("10.0.0.3:1001"), true);
});

test("timestamped aggregation keeps latest values while preserving first and last observation", () => {
  const raw = [
    "--- 2026-04-27 16:24:13 ---",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1 cwnd:7",
    "--- 2026-04-27 16:24:14 ---",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:5/0.2 cwnd:11"
  ].join("\n");

  const [socket] = aggregateTimestampedSockets(raw);

  assert.equal(socket.snapshotCount, 2);
  assert.equal(socket.details.values.rtt.avg, 5);
  assert.equal(socket.details.values.cwnd, 11);
  assert.ok(socket.lastSeenMs > socket.firstSeenMs);
});

test("streamed progress aggregation collapses repeated parsed sockets by key", () => {
  const sockets = parseSs([
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:2/0.2",
    "ESTAB 0 0 10.0.0.1:1001 10.0.0.3:443 rtt:3/0.3"
  ].join("\n"));

  const aggregated = aggregateParsedSocketsByKey(sockets);

  assert.equal(aggregated.length, 2);
  assert.equal(aggregated.find(socket => socket.local.endsWith(":1000")).snapshotCount, 2);
});

test("socket keys distinguish state for the same endpoints", () => {
  const [a, b] = parseSs([
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1",
    "CLOSE-WAIT 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1"
  ].join("\n"));

  assert.notEqual(socketKey(a), socketKey(b));
});

test("empty captures produce no timestamp blocks or sockets", () => {
  assert.deepEqual(timestampBlocks(""), []);
  assert.deepEqual(aggregateTimestampedSockets(""), []);
});

test("single timestamp captures do not collapse repeated rows", () => {
  const raw = [
    "--- 2026-04-27 16:24:13 ---",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:2/0.2"
  ].join("\n");

  assert.equal(aggregateTimestampedSockets(raw).length, 2);
});

test("timestamped aggregation keeps distinct peers for one local socket", () => {
  const raw = [
    "--- 2026-04-27 16:24:13 ---",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.3:443 rtt:2/0.2",
    "--- 2026-04-27 16:24:14 ---",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:3/0.3",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.3:443 rtt:4/0.4"
  ].join("\n");

  assert.equal(aggregateTimestampedSockets(raw).length, 2);
});

test("timestamp blocks accept EPOCH_MS markers", () => {
  const raw = [
    "EPOCH_MS=1777300000000",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1"
  ].join("\n");

  const [block] = timestampBlocks(raw);

  assert.equal(block.epochMs, 1777300000000);
  assert.equal(block.lines.length, 1);
});

test("progress aggregation keeps the latest socket values", () => {
  const sockets = parseSs([
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1 cwnd:4",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:9/0.9 cwnd:12"
  ].join("\n"));

  const [socket] = aggregateParsedSocketsByKey(sockets);

  assert.equal(socket.snapshotCount, 2);
  assert.equal(socket.details.values.rtt.avg, 9);
  assert.equal(socket.details.values.cwnd, 12);
});

test("socket history stays bound to the exact peer instead of reusing another conversation", () => {
  const raw = [
    "--- 2026-04-29 08:27:23 ---",
    "ESTAB 0 0 192.168.145.205:20002 192.168.145.204:57067 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d25) bytes_acked:100 bytes_received:200",
    "ESTAB 0 0 192.168.145.205:20002 192.168.145.115:53559 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d0) bytes_acked:10 bytes_received:20",
    "--- 2026-04-29 08:27:24 ---",
    "ESTAB 0 0 192.168.145.205:20002 192.168.145.115:53559 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d0) bytes_acked:11 bytes_received:21"
  ].join("\n");

  const snapshots = parsedTimestampSnapshots(raw);
  const [selectedSocket] = aggregateTimestampedSockets(raw)
    .filter(socket => socket.peer === "192.168.145.204:57067");

  const rows = buildSocketHistoryFromSnapshots(snapshots, selectedSocket);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]["skmem.d"], 25);
  assert.equal(rows[0].socketPresent, true);
});

test("socket history aligns the latest row with the selected socket values", () => {
  const raw = [
    "--- 2026-04-29 08:27:23 ---",
    "ESTAB 0 0 192.168.145.205:20002 192.168.145.204:57067 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d0) rtt:0.1/0.01 bytes_acked:100 bytes_received:200",
    "--- 2026-04-29 08:27:24 ---",
    "ESTAB 0 0 192.168.145.205:20002 192.168.145.204:57067 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d0) rtt:0.1/0.01 bytes_acked:110 bytes_received:210"
  ].join("\n");

  const snapshots = parsedTimestampSnapshots(raw);
  const [aggregatedSocket] = aggregateTimestampedSockets(raw);
  const selectedSocket = {
    ...aggregatedSocket,
    details: {
      ...aggregatedSocket.details,
      skmem: { ...aggregatedSocket.details.skmem, d: 25 },
      values: {
        ...aggregatedSocket.details.values,
        rtt: { avg: 0.8, var: 0.1 }
      }
    }
  };

  const rows = buildSocketHistoryFromSnapshots(snapshots, selectedSocket);
  const latest = rows.at(-1);

  assert.equal(latest.epochMs, selectedSocket.lastSeenMs);
  assert.equal(latest["skmem.d"], 25);
  assert.equal(latest.rtt, 0.8);
});
