import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeAll, analyzeSocket, applyRisks, riskForSocket } from "../../src/analysis/analysis.js";
import { parseSs } from "../../src/parsing/parser.js";
import { withStableSocketIds } from "../../src/timeline/timeline.js";

function socketFrom(line) {
  return withStableSocketIds(parseSs(line))[0];
}

test("socket drops above ten are critical", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d25)");

  const drops = analyzeSocket(socket).find(item => item.metric === "skmem.d");

  assert.equal(drops.severity, "critical");
  assert.match(drops.detail, /does not by itself prove/i);
  assert.match(drops.detail, /ethtool -S/i);
  assert.match(drops.detail, /netdev_max_backlog/i);
  assert.equal(riskForSocket(socket), "critical");
});

test("socket drop wording does not claim NIC ring overflow without evidence", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d1)");

  const drops = analyzeSocket(socket).find(item => item.metric === "skmem.d");

  assert.match(drops.detail, /kernel receive-side\/socket-memory loss/i);
  assert.match(drops.detail, /does not by itself prove/i);
});


test("socket drop wording points to netdev backlog validation", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d26)");

  const drops = analyzeSocket(socket).find(item => item.metric === "skmem.d");

  assert.match(drops.detail, /net\.core\.netdev_max_backlog/i);
  assert.match(drops.detail, /1000/i);
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

test("tiny MSS with normal PMTU is flagged as suspicious", () => {
  const socket = socketFrom("ESTAB 0 0 [::ffff:172.97.127.44]:52711 [::ffff:162.220.65.96]:10069 cubic wscale:7:9 rto:201 rtt:0.197/0.146 ato:40 mss:536 pmtu:1500 rcvmss:536 advmss:1460 cwnd:10");

  const mss = analyzeSocket(socket).find(item => item.metric === "mss");

  assert.equal(mss.severity, "medium");
  assert.match(mss.title, /MSS/i);
});

test("tiny MSS becomes high when paired with retransmission symptoms", () => {
  const socket = socketFrom("ESTAB 0 400000 [::ffff:172.97.127.44]:52711 [::ffff:162.220.65.96]:10069 timer:(on,1sec,2) cubic wscale:7:9 rto:1200 backoff:1 rtt:0.197/0.146 ato:40 mss:536 pmtu:1500 rcvmss:536 advmss:1460 cwnd:10");

  const mss = analyzeSocket(socket).find(item => item.metric === "mss");

  assert.equal(mss.severity, "high");
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
