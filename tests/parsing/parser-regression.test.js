import assert from "node:assert/strict";
import { test } from "node:test";
import { inferFamily, metricValue, parseAddress, parseDuration, parseNumber, parseDetails, parseSs, parseTimestampLine, stripAnsi } from "../../src/parsing/parser.js";

// parseAddress edge cases
test("parseAddress handles IPv6 loopback with port", () => {
  assert.deepEqual(parseAddress("[::1]:8080"), { host: "::1", port: "8080" });
});
test("parseAddress handles IPv6 full address", () => {
  assert.deepEqual(parseAddress("[2001:db8::1]:443"), { host: "2001:db8::1", port: "443" });
});
test("parseAddress handles IPv4 with high port", () => {
  assert.deepEqual(parseAddress("172.16.0.1:65535"), { host: "172.16.0.1", port: "65535" });
});
test("parseAddress handles port zero", () => {
  assert.deepEqual(parseAddress("10.0.0.1:0"), { host: "10.0.0.1", port: "0" });
});
test("parseAddress handles IPv6 without port bracket only", () => {
  const result = parseAddress("[fe80::1]");
  assert.equal(result.host, "[fe80::1]");
});
test("parseAddress handles colon-only string", () => {
  assert.deepEqual(parseAddress(":"), { host: "", port: "" });
});
test("parseAddress handles undefined", () => {
  assert.deepEqual(parseAddress(undefined), { host: "", port: "" });
});
test("parseAddress handles null by throwing", () => {
  assert.throws(() => parseAddress(null));
});

// parseDuration edge cases
test("parseDuration handles zero microseconds", () => {
  assert.equal(parseDuration("0us"), 0);
});
test("parseDuration handles fractional seconds", () => {
  assert.equal(parseDuration("1.5s"), 1500);
});
test("parseDuration handles fractional minutes", () => {
  assert.equal(parseDuration("0.5min"), 30000);
});
test("parseDuration handles large hour values", () => {
  assert.equal(parseDuration("24hour"), 86400000);
});
test("parseDuration handles empty string", () => {
  assert.equal(parseDuration(""), null);
});
test("parseDuration handles undefined", () => {
  assert.equal(parseDuration(undefined), null);
});
test("parseDuration handles plain zero", () => {
  assert.equal(parseDuration("0"), 0);
});

// stripAnsi edge cases
test("stripAnsi handles empty string", () => {
  assert.equal(stripAnsi(""), "");
});
test("stripAnsi handles null", () => {
  assert.equal(stripAnsi(null), "null");
});
test("stripAnsi handles multiple escape sequences", () => {
  assert.equal(stripAnsi("\x1B[31mred\x1B[0m \x1B[32mgreen\x1B[0m"), "red green");
});
test("stripAnsi handles bold and underline codes", () => {
  assert.equal(stripAnsi("\x1B[1m\x1B[4mtext\x1B[0m"), "text");
});
test("stripAnsi preserves text without escapes", () => {
  assert.equal(stripAnsi("plain text"), "plain text");
});

// parseNumber edge cases
test("parseNumber handles zero", () => {
  assert.equal(parseNumber("0"), 0);
});
test("parseNumber handles negative with unit", () => {
  assert.equal(parseNumber("-5"), -5);
});
test("parseNumber handles empty string", () => {
  assert.equal(parseNumber(""), null);
});
test("parseNumber handles Kbps lowercase", () => {
  assert.equal(parseNumber("100kbps"), 100000);
});
test("parseNumber handles decimal Gbps", () => {
  assert.equal(parseNumber("0.5Gbps"), 500000000);
});
test("parseNumber handles plain integer", () => {
  assert.equal(parseNumber("42"), 42);
});
test("parseNumber handles float", () => {
  assert.equal(parseNumber("3.14"), 3.14);
});
test("parseNumber handles Infinity", () => {
  assert.equal(parseNumber("Infinity"), null);
});

// parseTimestampLine edge cases
test("parseTimestampLine handles plain ISO date", () => {
  assert.equal(parseTimestampLine("2026-01-01 00:00:00"), Date.parse("2026-01-01T00:00:00"));
});
test("parseTimestampLine returns null for socket line", () => {
  assert.equal(parseTimestampLine("ESTAB 0 0 10.0.0.1:80 10.0.0.2:443"), null);
});
test("parseTimestampLine returns null for empty string", () => {
  assert.equal(parseTimestampLine(""), null);
});
test("parseTimestampLine returns null for whitespace", () => {
  assert.equal(parseTimestampLine("   "), null);
});

// inferFamily edge cases
test("inferFamily detects tcp6 from IPv6 mapped address", () => {
  assert.equal(inferFamily("[::ffff:10.0.0.1]:80", "[::ffff:10.0.0.2]:443", "ESTAB"), "tcp6");
});
test("inferFamily defaults to tcp for standard IPv4", () => {
  assert.equal(inferFamily("10.0.0.1:80", "10.0.0.2:443", "ESTAB"), "tcp");
});
test("inferFamily detects udp for UNCONN with wildcard peer", () => {
  assert.equal(inferFamily("0.0.0.0:53", "0.0.0.0:*", "UNCONN"), "udp");
});

// parseSs edge cases
test("parseSs returns empty array for empty input", () => {
  assert.deepEqual(parseSs(""), []);
});
test("parseSs returns empty array for whitespace only", () => {
  assert.deepEqual(parseSs("   \n  \n  "), []);
});
test("parseSs handles multiple sockets", () => {
  const sockets = parseSs("ESTAB 0 0 10.0.0.1:80 10.0.0.2:443 rtt:1/0.1\nESTAB 0 0 10.0.0.3:22 10.0.0.4:55555 rtt:2/0.2");
  assert.equal(sockets.length, 2);
});
test("parseSs handles LISTEN state with wildcard", () => {
  const [socket] = parseSs("LISTEN 0 128 0.0.0.0:22 0.0.0.0:*");
  assert.equal(socket.state, "LISTEN");
  assert.equal(socket.localAddress.port, "22");
});
test("parseSs handles CLOSE-WAIT state", () => {
  const [socket] = parseSs("CLOSE-WAIT 0 0 10.0.0.1:443 10.0.0.2:55555");
  assert.equal(socket.state, "CLOSE-WAIT");
});
test("parseSs handles TIME-WAIT state", () => {
  const [socket] = parseSs("TIME-WAIT 0 0 10.0.0.1:80 10.0.0.2:44444");
  assert.equal(socket.state, "TIME-WAIT");
});
test("parseSs handles SYN-SENT state", () => {
  const [socket] = parseSs("SYN-SENT 0 1 10.0.0.1:55555 10.0.0.2:443");
  assert.equal(socket.state, "SYN-SENT");
  assert.equal(socket.sendQ, 1);
});
test("parseSs handles large sendQ values", () => {
  const [socket] = parseSs("ESTAB 0 1048576 10.0.0.1:80 10.0.0.2:443");
  assert.equal(socket.sendQ, 1048576);
});
test("parseSs handles large recvQ values", () => {
  const [socket] = parseSs("ESTAB 524288 0 10.0.0.1:80 10.0.0.2:443");
  assert.equal(socket.recvQ, 524288);
});

// parseDetails edge cases
test("parseDetails extracts skmem with all fields", () => {
  const details = parseDetails("skmem:(r4096,rb131072,t0,tb16384,f0,w0,o0,bl0,d0)");
  assert.equal(details.skmem.r, 4096);
  assert.equal(details.skmem.rb, 131072);
  assert.equal(details.skmem.t, 0);
  assert.equal(details.skmem.tb, 16384);
  assert.equal(details.skmem.d, 0);
});
test("parseDetails extracts timer with retrans count", () => {
  const details = parseDetails("timer:(on,200ms,3)");
  assert.equal(details.timer.name, "on");
  assert.equal(details.timer.retrans, 3);
});
test("parseDetails extracts keepalive timer", () => {
  const details = parseDetails("timer:(keepalive,45min,0)");
  assert.equal(details.timer.name, "keepalive");
  assert.equal(details.timer.retrans, 0);
});
test("parseDetails extracts process info", () => {
  const details = parseDetails('users:(("nginx",pid=1234,fd=5))');
  assert.deepEqual(details.process, { name: "nginx", pid: 1234, fd: 5 });
});
test("parseDetails handles empty string", () => {
  const details = parseDetails("");
  assert.deepEqual(details.skmem, {});
  assert.equal(details.timer, null);
  assert.equal(details.process, null);
});

// metricValue edge cases
test("metricValue returns sendQ directly", () => {
  const socket = { sendQ: 1000, recvQ: 0, details: { values: {}, skmem: {} } };
  assert.equal(metricValue(socket, "sendQ"), 1000);
});
test("metricValue returns 0 for missing metric", () => {
  const socket = { sendQ: 0, recvQ: 0, details: { values: {}, skmem: {} } };
  assert.equal(metricValue(socket, "nonexistent"), 0);
});
test("metricValue returns skmem.r from nested skmem", () => {
  const socket = { sendQ: 0, recvQ: 0, details: { values: {}, skmem: { r: 8192 } } };
  assert.equal(metricValue(socket, "skmem.r"), 8192);
});
test("metricValue returns skmem.t from nested skmem", () => {
  const socket = { sendQ: 0, recvQ: 0, details: { values: {}, skmem: { t: 4096 } } };
  assert.equal(metricValue(socket, "skmem.t"), 4096);
});
test("metricValue returns cwnd from values", () => {
  const socket = { sendQ: 0, recvQ: 0, details: { values: { cwnd: 10 }, skmem: {} } };
  assert.equal(metricValue(socket, "cwnd"), 10);
});
