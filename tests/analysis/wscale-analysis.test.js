import assert from "node:assert/strict";
import { test } from "node:test";

import { analyzeWscaleContext, estimateWscaleBdpBytes } from "../../src/wscale-analysis.js";
import { parseSs } from "../../src/parser.js";
import { withStableSocketIds } from "../../src/timeline.js";

function socketFrom(line) {
  return withStableSocketIds(parseSs(line))[0];
}

test("wscale analysis treats normal negotiated scaling as informational", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.10:20002 10.0.0.20:53000 cubic wscale:7,7 rtt:1/0.1 delivery_rate 40000000bps rcv_space:262144 skmem:(r0,rb425984,t0,tb425984,d0)");

  const result = analyzeWscaleContext(socket);

  assert.equal(result.status, "info");
  assert.equal(result.severity, "low");
  assert.equal(result.hasWscale, true);
  assert.equal(result.sendScale, 7);
  assert.equal(result.receiveScale, 7);
  assert.match(result.learnMore.join(" "), /wscale:<snd_wscale>:<rcv_wscale>/);
});

test("wscale analysis warns when scaling is absent and estimated BDP exceeds 64 KB", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.10:20002 10.0.0.20:53000 cubic rtt:80/8 delivery_rate 20000000bps rcv_space:262144 skmem:(r0,rb425984,t0,tb425984,d0)");

  const result = analyzeWscaleContext(socket);

  assert.equal(result.status, "warning");
  assert.equal(result.severity, "medium");
  assert.equal(result.evidence.some(item => item.includes("BDP exceeds 64 KB")), true);
  assert.equal(result.counterEvidence.some(item => item.includes("handshake validation")), true);
  assert.equal(result.severity === "critical", false);
});

test("wscale analysis warns on low scaling with elevated RTT and high BDP", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.10:20002 10.0.0.20:53000 cubic wscale:1:1 rtt:120/18 delivery_rate 20000000bps rcv_space:262144 skmem:(r0,rb425984,t0,tb425984,d0)");

  const result = analyzeWscaleContext(socket);

  assert.equal(result.status, "warning");
  assert.equal(result.evidence.some(item => item.includes("very low")), true);
  assert.equal(estimateWscaleBdpBytes(socket) > 64 * 1024, true);
});

test("wscale analysis warns when rcv_space is low and receive memory is near rb", () => {
  const socket = socketFrom("ESTAB 300000 0 10.0.0.10:20002 10.0.0.20:53000 cubic wscale:7:7 rtt:1/0.1 delivery_rate 40000000bps rcv_space:2048 skmem:(r390000,rb400000,t0,tb425984,d0)");

  const result = analyzeWscaleContext(socket);

  assert.equal(result.status, "warning");
  assert.equal(result.evidence.some(item => item.includes("rcv_space is very small")), true);
  assert.match(result.evidence.join(" "), /receive socket memory is near its rb limit/);
});

test("wscale analysis keeps retransmission plus high RTT as path evidence, not wscale proof", () => {
  const socket = socketFrom("ESTAB 0 500000 10.0.0.10:20002 10.0.0.20:53000 timer:(on,1sec,5) cubic wscale:7:7 rto:3200 rtt:420/180 cwnd:2 skmem:(r0,rb425984,t0,tb425984,d0)");

  const result = analyzeWscaleContext(socket);

  assert.equal(result.status, "info");
  assert.equal(result.severity, "low");
  assert.equal(result.counterEvidence.some(item => item.includes("stronger path-recovery evidence than wscale")), true);
});
