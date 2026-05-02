import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeAll, analyzeSocket, applyRisks, riskForSocket } from "../src/analysis.js";
import { parseSs } from "../src/parser.js";
import { withStableSocketIds } from "../src/timeline.js";

function socketFrom(line) {
  return withStableSocketIds(parseSs(line))[0];
}

test("socket drops above ten are critical", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d25)");

  const drops = analyzeSocket(socket).find(item => item.metric === "skmem.d");

  assert.equal(drops.severity, "critical");
  assert.equal(riskForSocket(socket), "critical");
});

test("large receive queue creates critical risk", () => {
  const socket = socketFrom("ESTAB 600000 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1");

  const recv = analyzeSocket(socket).find(item => item.metric === "recvQ");

  assert.equal(recv.severity, "critical");
  assert.equal(riskForSocket(socket), "critical");
});

test("listen on all interfaces is flagged as globally exposed", () => {
  const socket = socketFrom("LISTEN 0 128 0.0.0.0:22 0.0.0.0:* users:((\"sshd\",pid=100,fd=3))");

  const exposed = analyzeSocket(socket).find(item => item.metric === "listen");

  assert.equal(exposed.severity, "medium");
  assert.match(exposed.title, /exposed/i);
});

test("missing process owner is low risk for established sockets", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1");

  const missing = analyzeSocket(socket).find(item => item.metric === "process");

  assert.equal(missing.severity, "low");
});

test("analyzeAll sorts highest severity first", () => {
  const sockets = withStableSocketIds(parseSs([
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d25)",
    "ESTAB 0 0 10.0.0.3:1001 10.0.0.4:443 rtt:1/0.1"
  ].join("\n")));

  const all = analyzeAll(sockets);

  assert.equal(all[0].severity, "critical");
});

test("applyRisks annotates sockets without dropping parsed fields", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:200/10");

  const [withRisk] = applyRisks([socket]);

  assert.equal(withRisk.risk, "medium");
  assert.equal(withRisk.local, socket.local);
  assert.equal(withRisk.details.values.rtt.avg, 200);
});
