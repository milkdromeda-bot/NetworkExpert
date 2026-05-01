import assert from "node:assert/strict";
import { test } from "node:test";
import { metricValue, parseNumber, parseSs, parseTimestampLine } from "../src/parser.js";

test("parseNumber handles bandwidth units consistently", () => {
  assert.equal(parseNumber("328kbps"), 328000);
  assert.equal(parseNumber("2.5Mbps"), 2500000);
  assert.equal(parseNumber("1.25Gbps"), 1250000000);
  assert.equal(parseNumber("5406728bps"), 5406728);
});

test("parseTimestampLine accepts decorated timestamp markers", () => {
  assert.equal(
    parseTimestampLine("--- 2026-04-27 16:24:16 ---"),
    Date.parse("2026-04-27T16:24:16")
  );
});

test("parseSs parses IPv6-mapped endpoints and ports", () => {
  const [socket] = parseSs("ESTAB 0 0 [::ffff:10.200.75.171]:32883 [::ffff:162.220.64.62]:9100 rtt:78.228/3.396");

  assert.equal(socket.localAddress.host, "::ffff:10.200.75.171");
  assert.equal(socket.localAddress.port, "32883");
  assert.equal(socket.peerAddress.host, "::ffff:162.220.64.62");
  assert.equal(socket.peerAddress.port, "9100");
  assert.equal(metricValue(socket, "rtt"), 78.228);
});

test("parseSs merges continuation lines into details", () => {
  const [socket] = parseSs([
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 timer:(keepalive,60min,0)",
    "skmem:(r0,rb1309976,t0,tb262144,f4096,w0,o0,bl0,d160) cwnd:21 bytes_acked:3118343"
  ].join("\n"));

  assert.equal(metricValue(socket, "cwnd"), 21);
  assert.equal(metricValue(socket, "bytes_acked"), 3118343);
  assert.equal(metricValue(socket, "skmem.d"), 160);
});

test("parseSs ignores headers and command metadata", () => {
  const sockets = parseSs([
    "Command to be executed: ss -ti",
    "State Recv-Q Send-Q Local Address:Port Peer Address:Port",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1"
  ].join("\n"));

  assert.equal(sockets.length, 1);
  assert.equal(sockets[0].state, "ESTAB");
});

test("metricValue falls back to send for pacing rate when pacing_rate is absent", () => {
  const [socket] = parseSs("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 send 1480800bps");

  assert.equal(metricValue(socket, "pacing_rate"), 1480800);
});
