import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseSs } from "../src/parser.js";
import { aggregateTimestampedSockets, timestampBlocks } from "../src/timeline.js";

const lightSample = readFileSync(new URL("../samples/lplalo-light.log", import.meta.url), "utf8");

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
