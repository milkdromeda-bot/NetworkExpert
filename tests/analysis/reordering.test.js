import assert from "node:assert/strict";
import { test } from "node:test";
import { detectReordering } from "../../src/reordering.js";
import { parseSs } from "../../src/parser.js";
import { withStableSocketIds } from "../../src/timeline.js";

function socketsFrom(lines) { return withStableSocketIds(parseSs(lines)); }

test("no findings when reord_seen and dsack_dups are absent", () => {
  const sockets = socketsFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 cubic rtt:5/1 mss:1460 pmtu:1500 cwnd:10");
  const { findings } = detectReordering(sockets);
  assert.equal(findings.length, 0);
});

test("detects reordering via reord_seen", () => {
  const sockets = socketsFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 cubic rtt:5/1 reord_seen:42 mss:1460 cwnd:10");
  const { findings, summary } = detectReordering(sockets);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].reordSeen, 42);
  assert.equal(findings[0].severity, "medium");
  assert.equal(summary.totalReordSeen, 42);
});

test("high severity for large reord_seen", () => {
  const sockets = socketsFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 cubic rtt:5/1 reord_seen:200 mss:1460 cwnd:10");
  const { findings } = detectReordering(sockets);
  assert.equal(findings[0].severity, "high");
});

test("detects spurious retransmissions via dsack_dups", () => {
  const sockets = socketsFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 cubic rtt:5/1 dsack_dups:60 bytes_retrans:5000 mss:1460 cwnd:10");
  const { findings } = detectReordering(sockets);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].dsackDups, 60);
  assert.match(findings[0].detail, /spurious retransmissions/);
});
