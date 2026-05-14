import assert from "node:assert/strict";
import { test } from "node:test";

import { analyzeRcvSsthreshTrend, calculateRcvSsthreshChange, rcvSsthreshTechnicalNotes } from "../../src/rcv-ssthresh-analysis.js";
import { parseSs } from "../../src/parser.js";
import { withStableSocketIds } from "../../src/timeline.js";

function socketFrom(line) {
  return withStableSocketIds(parseSs(line))[0];
}

test("rcv_ssthresh analysis treats one sample as informational only", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.10:20002 10.0.0.20:53000 cubic rcv_ssthresh:798320 rcv_space:262144 rtt:1/0.1 skmem:(r0,rb425984,t0,tb425984,d0)");

  const result = analyzeRcvSsthreshTrend(socket);

  assert.equal(result.status, "info");
  assert.equal(result.severity, "low");
  assert.equal(result.trend.sampleCount, 1);
  assert.equal(result.counterEvidence.some(item => item.includes("At least two timestamped snapshots")), true);
});

test("rcv_ssthresh analysis keeps stable or elevated values informational", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.10:20002 10.0.0.20:53000 cubic rcv_ssthresh:820000 rcv_space:262144 rtt:1/0.1 skmem:(r0,rb425984,t0,tb425984,d0)");
  const history = [
    { socketId: socket.id, epochMs: 1000, rcv_ssthresh: 798320, rcv_space: 262144, recvQ: 0, "skmem.r": 0, "skmem.rb": 425984 },
    { socketId: socket.id, epochMs: 2000, rcv_ssthresh: 820000, rcv_space: 262144, recvQ: 0, "skmem.r": 0, "skmem.rb": 425984 }
  ];

  const result = analyzeRcvSsthreshTrend(socket, { history });

  assert.equal(result.status, "info");
  assert.equal(result.trend.relativeDropPct, 0);
  assert.match(result.learnMore.join(" "), /not the same signal as sender-side snd_ssthresh/);
});

test("rcv_ssthresh analysis warns on a moderate multi-snapshot decline", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.10:20002 10.0.0.20:53000 cubic rcv_ssthresh:650000 rcv_space:131072 rtt:1/0.1 skmem:(r0,rb425984,t0,tb425984,d0)");
  const history = [
    { socketId: socket.id, epochMs: 1000, rcv_ssthresh: 1000000, rcv_space: 262144, recvQ: 0, "skmem.r": 0, "skmem.rb": 425984 },
    { socketId: socket.id, epochMs: 61_000, rcv_ssthresh: 650000, rcv_space: 131072, recvQ: 0, "skmem.r": 0, "skmem.rb": 425984 }
  ];

  const result = analyzeRcvSsthreshTrend(socket, { history });

  assert.equal(result.status, "warning");
  assert.equal(result.severity, "low");
  assert.equal(result.trend.level, "moderate");
  assert.equal(result.evidence.some(item => item.includes("Drop threshold crossed: moderate")), true);
});

test("rcv_ssthresh exact case computes the 798320 to 375680 decline", () => {
  const change = calculateRcvSsthreshChange(798320, 375680);

  assert.equal(change.absoluteDrop, 422640);
  assert.equal(Number(change.relativeDropPct.toFixed(2)), 52.94);
  assert.equal(Number(change.currentToPreviousRatioPct.toFixed(2)), 47.06);
});

test("rcv_ssthresh analysis escalates drop with receive pressure as slow-consumer suspicion", () => {
  const socket = socketFrom("ESTAB 300000 0 10.0.0.10:20002 10.0.0.20:53000 timer:(persist,3sec,2) cubic rcv_ssthresh:375680 rcv_space:2048 rtt:1/0.1 rcv_rtt:8.5 skmem:(r390000,rb400000,t0,tb425984,d0)");
  const history = [
    { socketId: socket.id, epochMs: 1000, rcv_ssthresh: 798320, rcv_space: 65536, recvQ: 20000, "skmem.r": 100000, "skmem.rb": 400000, bytes_received: 10_000_000, segs_in: 10_000 },
    { socketId: socket.id, epochMs: 3_121_000, rcv_ssthresh: 375680, rcv_space: 2048, recvQ: 300000, "skmem.r": 390000, "skmem.rb": 400000, bytes_received: 20_000_000, segs_in: 20_500, timerName: "persist" }
  ];

  const result = analyzeRcvSsthreshTrend(socket, { history });

  assert.equal(result.status, "warning");
  assert.equal(result.severity, "high");
  assert.equal(result.confidence, "high");
  assert.equal(result.hypothesis, "slow-consumer-suspected");
  assert.equal(result.evidence.some(item => item.includes("52.9%")), true);
  assert.equal(result.evidence.some(item => item.includes("Recv-Q is high")), true);
  assert.equal(result.evidence.some(item => item.includes("skmem:r is close to skmem:rb")), true);
  assert.equal(result.evidence.some(item => item.includes("timer:persist")), true);
});

test("rcv_ssthresh analysis keeps high RTT and retrans as ambiguous network context", () => {
  const socket = socketFrom("ESTAB 0 400000 10.0.0.10:20002 10.0.0.20:53000 timer:(on,3sec,5) cubic rcv_ssthresh:300000 rcv_space:131072 rtt:420/180 skmem:(r0,rb425984,t0,tb425984,d0)");
  const history = [
    { socketId: socket.id, epochMs: 1000, rcv_ssthresh: 900000, rcv_space: 262144, recvQ: 0, "skmem.r": 0, "skmem.rb": 425984 },
    { socketId: socket.id, epochMs: 6000, rcv_ssthresh: 300000, rcv_space: 131072, recvQ: 0, "skmem.r": 0, "skmem.rb": 425984, rtt: 420, retrans: 5 }
  ];

  const result = analyzeRcvSsthreshTrend(socket, { history });

  assert.equal(result.status, "warning");
  assert.equal(result.hypothesis, "network-or-receiver-ambiguous");
  assert.equal(result.counterEvidence.some(item => item.includes("network/path congestion")), true);
  assert.notEqual(result.hypothesis, "slow-consumer-suspected");
});

test("rcv_ssthresh notes explicitly avoid overinterpretation", () => {
  const notes = rcvSsthreshTechnicalNotes().join(" ");

  assert.match(notes, /receive-side autotuning/);
  assert.match(notes, /not isolated proof/);
  assert.match(notes, /sender-side snd_ssthresh/);
});
