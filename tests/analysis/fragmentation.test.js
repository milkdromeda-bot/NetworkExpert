import assert from "node:assert/strict";
import { test } from "node:test";
import { detectFragmentation } from "../../src/fragmentation.js";
import { parseSs } from "../../src/parser.js";
import { withStableSocketIds } from "../../src/timeline.js";

function socketsFrom(lines) { return withStableSocketIds(parseSs(lines)); }

test("no findings on healthy sockets", () => {
  const sockets = socketsFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 cubic mss:1460 pmtu:1500 advmss:1460 rcvmss:1460");
  const { findings } = detectFragmentation(sockets);
  assert.equal(findings.length, 0);
});

test("detects MSS clamping (tiny MSS with normal PMTU)", () => {
  const sockets = socketsFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 cubic mss:536 pmtu:1500 advmss:1460 rcvmss:536");
  const { findings, summary } = detectFragmentation(sockets);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].issue, "mss-clamped");
  assert.equal(findings[0].severity, "high");
  assert.equal(summary.mssClamp, 1);
});

test("detects reduced PMTU (tunnel/VPN)", () => {
  const sockets = socketsFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 cubic mss:1380 pmtu:1420 advmss:1460 rcvmss:1380");
  const { findings, summary } = detectFragmentation(sockets);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].issue, "pmtu-reduced");
  assert.equal(summary.pmtuReduced, 1);
});

test("detects MSS/advmss mismatch", () => {
  const sockets = socketsFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 cubic mss:900 pmtu:1500 advmss:1460 rcvmss:900");
  const { findings, summary } = detectFragmentation(sockets);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].issue, "mss-mismatch");
  assert.equal(summary.mismatch, 1);
});

test("detects jumbo frames", () => {
  const sockets = socketsFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 cubic mss:8960 pmtu:9000 advmss:8960 rcvmss:8960");
  const { findings, summary } = detectFragmentation(sockets);
  assert.equal(summary.jumbo, 1);
});
