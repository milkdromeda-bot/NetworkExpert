import assert from "node:assert/strict";
import { test } from "node:test";

import {
  metricCorrelations,
  metricDiagnosticGuidance,
  metricInterpretation,
  metricReliabilityProfile,
  metricSource
} from "../../src/metric-intelligence.js";

test("metric source describes direct ss fields and derived rates", () => {
  assert.equal(metricSource("rtt"), "ss -i field rtt:<avg>/<var>");
  assert.equal(metricSource("recvQ"), "ss table column Recv-Q");
  assert.equal(metricSource("skmem.d_rate"), "derived from skmem d deltas / elapsed time");
  assert.equal(metricSource("unknown_metric"), "parsed ss metric");
});

test("metric interpretation keeps TCP window wording cautious", () => {
  assert.match(metricInterpretation("rcv_space"), /Current receive space Linux can advertise/);
  assert.match(metricInterpretation("rcv_ssthresh"), /Use trends, not a single value/);
  assert.match(metricInterpretation("retrans"), /Active retransmission timer count/);
  assert.equal(metricInterpretation("unknown_metric"), "Metric parsed from the current socket timeline.");
});

test("metric correlations expose practical investigation neighbors", () => {
  assert.deepEqual(metricCorrelations("sendQ"), ["TX bandwidth", "RTO", "cwnd", "skmem.t"]);
  assert.deepEqual(metricCorrelations("rcv_space"), ["Observed BDP", "Recv-Q", "skmem.r", "persist"]);
  assert.deepEqual(metricCorrelations("unknown_metric"), ["RTT", "queues", "process", "peer"]);
});

test("metric reliability profile distinguishes direct, cumulative, and derived evidence", () => {
  assert.match(metricReliabilityProfile("rtt").confidence, /Direct Linux TCP RTT estimator/);
  assert.match(metricReliabilityProfile("bytes_received").confidence, /Direct counter/);
  assert.match(metricReliabilityProfile("rx_bps").confidence, /Derived from timeline deltas/);
  assert.match(metricReliabilityProfile("unknown_metric").confidence, /Direct ss field/);
});

test("receiver-side reliability wording stays scoped to local receive evidence", () => {
  const recv = metricReliabilityProfile("recvQ");
  assert.match(recv.scope, /Local unread receive queue/);
  assert.match(recv.limits, /confirm with skmem\.r/);
});

test("diagnostic guidance avoids overclaiming network root cause", () => {
  const backoff = metricDiagnosticGuidance("backoff");
  assert.ok(backoff.investigate.some(item => item.includes("Backoff increases progressively")));
  assert.ok(backoff.avoid.some(item => item.includes("bad network automatically")));
  const sendQ = metricDiagnosticGuidance("sendQ");
  assert.ok(sendQ.avoid.some(item => item.includes("Do not label this as network congestion")));
});

test("default diagnostic guidance remains useful for unknown metrics", () => {
  const guidance = metricDiagnosticGuidance("not_real");
  assert.deepEqual(guidance.benign, ["Flat or stable values around the normal baseline.", "Short isolated blips that recover without queue growth."]);
  assert.ok(guidance.checks.includes("Compare before/after baseline."));
});
