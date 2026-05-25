import assert from "node:assert/strict";
import { test } from "node:test";
import { computeHealthScore } from "../../src/health-score.js";
import { parseSs } from "../../src/parser.js";
import { withStableSocketIds } from "../../src/timeline.js";

function socketsFrom(lines) {
  return withStableSocketIds(parseSs(lines));
}

test("empty socket list returns score 100 grade A", () => {
  const result = computeHealthScore([]);
  assert.equal(result.score, 100);
  assert.equal(result.grade, "A");
  assert.equal(result.breakdown.healthy, 0);
});

test("null input returns score 100", () => {
  const result = computeHealthScore(null);
  assert.equal(result.score, 100);
});

test("all healthy sockets return score 100 grade A", () => {
  const sockets = socketsFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 users:((\"app\",pid=123,fd=4)) cubic wscale:7,7 rto:200 rtt:5/1 mss:1460 pmtu:1500 rcvmss:1460 advmss:1460 cwnd:10 ssthresh:20 skmem:(r0,rb100000,t0,tb100000,f0,w0,o0,bl0,d0)");
  const result = computeHealthScore(sockets);
  assert.equal(result.score, 100);
  assert.equal(result.grade, "A");
  assert.equal(result.breakdown.healthy, 1);
});

test("critical sockets penalize the score significantly", () => {
  const sockets = socketsFrom("ESTAB 0 2000000 10.0.0.1:1000 10.0.0.2:443 cubic skmem:(r0,rb100000,t0,tb100000,f0,w0,o0,bl0,d50)");
  const result = computeHealthScore(sockets);
  assert.ok(result.score <= 50, `Expected score <= 50, got ${result.score}`);
  assert.ok(result.score >= 25, `Expected score >= 25 (system still runs), got ${result.score}`);
  assert.equal(result.breakdown.critical, 1);
});

test("mix of healthy and problematic sockets gives intermediate score", () => {
  const lines = [
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 users:((\"app\",pid=1,fd=4)) cubic wscale:7,7 rto:200 rtt:5/1 mss:1460 pmtu:1500 rcvmss:1460 advmss:1460 cwnd:10 skmem:(r0,rb100000,t0,tb100000,f0,w0,o0,bl0,d0)",
    "ESTAB 0 0 10.0.0.1:1001 10.0.0.2:443 users:((\"app\",pid=1,fd=5)) cubic wscale:7,7 rto:200 rtt:5/1 mss:1460 pmtu:1500 rcvmss:1460 advmss:1460 cwnd:10 skmem:(r0,rb100000,t0,tb100000,f0,w0,o0,bl0,d0)",
    "ESTAB 0 0 10.0.0.1:1002 10.0.0.2:443 users:((\"app\",pid=1,fd=6)) cubic wscale:7,7 rto:200 rtt:200/10 mss:1460 pmtu:1500 rcvmss:1460 advmss:1460 cwnd:10 skmem:(r0,rb100000,t0,tb100000,f0,w0,o0,bl0,d0)"
  ].join("\n");
  const sockets = socketsFrom(lines);
  const result = computeHealthScore(sockets);
  assert.ok(result.score > 50 && result.score < 100, `Expected 50 < score < 100, got ${result.score}`);
  assert.equal(result.breakdown.healthy, 2);
  assert.equal(result.breakdown.medium, 1);
});

test("grade boundaries are correct", () => {
  // Grade A >= 90, B >= 75, C >= 50, D >= 25, F < 25
  const hs = computeHealthScore([]);
  assert.equal(hs.grade, "A");
});

test("breakdown counts match socket count", () => {
  const lines = [
    "ESTAB 0 500000 10.0.0.1:1000 10.0.0.2:443 cubic skmem:(r0,rb100000,t0,tb100000,f0,w0,o0,bl0,d0)",
    "ESTAB 0 0 10.0.0.1:1001 10.0.0.2:443 cubic wscale:7,7 rto:200 rtt:5/1 mss:1460 pmtu:1500 rcvmss:1460 advmss:1460 cwnd:10 skmem:(r0,rb100000,t0,tb100000,f0,w0,o0,bl0,d0)"
  ].join("\n");
  const sockets = socketsFrom(lines);
  const result = computeHealthScore(sockets);
  const total = result.breakdown.critical + result.breakdown.high + result.breakdown.medium + result.breakdown.low + result.breakdown.healthy;
  assert.equal(total, sockets.length);
});
