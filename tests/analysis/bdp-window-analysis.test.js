import assert from "node:assert/strict";
import { test } from "node:test";

import { analyzeBdpWindowLimit, bdpWindowTechnicalNotes, buildBdpWindowSeries } from "../../src/analysis/bdp-window-analysis.js";
import { parseSs } from "../../src/parsing/parser.js";
import { withStableSocketIds } from "../../src/timeline/timeline.js";

function socketFrom(line) {
  return withStableSocketIds(parseSs(line))[0];
}

function inboundHistory(socket, values) {
  return values.map((value, index) => ({
    socketId: socket.id,
    epochMs: index * 1000,
    bytes_received: value.bytesReceived,
    rtt: value.rtt ?? 10,
    rcv_space: value.rcvSpace,
    rcv_wnd: value.rcvWnd,
    delivery_rate: value.deliveryRate,
    recvQ: value.recvQ ?? 0,
    "skmem.r": value.skmemR ?? 0,
    "skmem.rb": value.skmemRb ?? 100000,
    retrans: value.retrans ?? 0,
    cwnd: value.cwnd ?? 20,
    timerName: value.timerName || ""
  }));
}

test("BDP window series computes observed throughput, BDP, and max throughput by rcv_space", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:20002 10.0.0.2:53000 cubic wscale:7:7");
  const history = inboundHistory(socket, [
    { bytesReceived: 0, rcvSpace: 125000, rtt: 10 },
    { bytesReceived: 1000000, rcvSpace: 125000, rtt: 10 }
  ]);

  const result = buildBdpWindowSeries(socket, { history, direction: "inbound" });
  const sample = result.samples[1];

  assert.equal(sample.observedThroughputBps, 8000000);
  assert.equal(sample.observedBdpBytes, 10000);
  assert.equal(sample.throughputMaxByRcvSpaceBps, 100000000);
  assert.equal(sample.effectiveWindowSource, "rcv_space");
});

test("BDP window series uses bytes_sent for outbound analysis", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:20002 10.0.0.2:53000 cubic wscale:7:7");
  const history = [
    { socketId: socket.id, epochMs: 0, bytes_sent: 0, bytes_received: 10000000, rtt: 20, rcv_space: 200000 },
    { socketId: socket.id, epochMs: 2000, bytes_sent: 2000000, bytes_received: 10000000, rtt: 20, rcv_space: 200000 }
  ];

  const result = buildBdpWindowSeries(socket, { history, direction: "outbound" });

  assert.equal(result.samples[1].observedThroughputBps, 8000000);
});

test("BDP window series falls back to advertised receive window with wscale when rcv_space is absent", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:20002 10.0.0.2:53000 cubic wscale:7:7");
  const history = inboundHistory(socket, [
    { bytesReceived: 0, rcvWnd: 1000, rtt: 10 },
    { bytesReceived: 1000000, rcvWnd: 1000, rtt: 10 }
  ]);

  const result = buildBdpWindowSeries(socket, { history, direction: "inbound" });

  assert.equal(result.samples[1].effectiveWindowBytes, 128000);
  assert.equal(result.samples[1].effectiveWindowSource, "rcv_wnd+wscale");
});

test("BDP analysis does not use wscale alone as an effective window", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:20002 10.0.0.2:53000 cubic wscale:7:7");
  const history = inboundHistory(socket, [
    { bytesReceived: 0, rtt: 10 },
    { bytesReceived: 1000000, rtt: 10 }
  ]);

  const result = buildBdpWindowSeries(socket, { history, direction: "inbound" });

  assert.equal(result.samples[1].effectiveWindowBytes, null);
  assert.equal(result.samples[1].throughputMaxByRcvSpaceBps, null);
});

test("BDP analysis warns when observed throughput stays near max by rcv_space", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:20002 10.0.0.2:53000 cubic wscale:7:7");
  const history = inboundHistory(socket, [
    { bytesReceived: 0, rcvSpace: 100000, rtt: 100 },
    { bytesReceived: 800000, rcvSpace: 100000, rtt: 100 },
    { bytesReceived: 1600000, rcvSpace: 100000, rtt: 100 },
    { bytesReceived: 2400000, rcvSpace: 100000, rtt: 100 }
  ]);

  const result = analyzeBdpWindowLimit(socket, { history, direction: "inbound" });

  assert.equal(result.status, "warning");
  assert.equal(result.severity, "medium");
  assert.equal(result.stats.nearWindowRun, 3);
  assert.equal(result.evidence.some(item => item.includes("at least 3 consecutive snapshots")), true);
});

test("BDP analysis raises strong warning over 90 percent for three snapshots without critical severity", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:20002 10.0.0.2:53000 cubic wscale:7:7");
  const history = inboundHistory(socket, [
    { bytesReceived: 0, rcvSpace: 100000, rtt: 100 },
    { bytesReceived: 950000, rcvSpace: 100000, rtt: 100 },
    { bytesReceived: 1900000, rcvSpace: 100000, rtt: 100 },
    { bytesReceived: 2850000, rcvSpace: 100000, rtt: 100 }
  ]);

  const result = analyzeBdpWindowLimit(socket, { history, direction: "inbound" });

  assert.equal(result.status, "warning");
  assert.equal(result.severity, "high");
  assert.notEqual(result.severity, "critical");
  assert.equal(result.stats.strongWindowRun, 3);
});

test("BDP analysis points to slow consumer when window pressure has receive memory pressure", () => {
  const socket = socketFrom("ESTAB 200000 0 10.0.0.1:20002 10.0.0.2:53000 timer:(persist,3sec,2) cubic wscale:7:7");
  const history = inboundHistory(socket, [
    { bytesReceived: 0, rcvSpace: 2048, rtt: 10, recvQ: 200000, skmemR: 95000, skmemRb: 100000, timerName: "persist" },
    { bytesReceived: 2000, rcvSpace: 2048, rtt: 10, recvQ: 200000, skmemR: 95000, skmemRb: 100000, timerName: "persist" },
    { bytesReceived: 4000, rcvSpace: 2048, rtt: 10, recvQ: 200000, skmemR: 95000, skmemRb: 100000, timerName: "persist" },
    { bytesReceived: 6000, rcvSpace: 2048, rtt: 10, recvQ: 200000, skmemR: 95000, skmemRb: 100000, timerName: "persist" }
  ]);

  const result = analyzeBdpWindowLimit(socket, { history, direction: "inbound", recvWarn: 131072 });

  assert.equal(result.hypothesis, "slow-consumer-window-pressure");
  assert.equal(result.severity, "high");
  assert.match(result.evidence.join(" "), /slow-consumer/);
});

test("BDP analysis keeps retrans high RTT and low cwnd as path recovery context", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:20002 10.0.0.2:53000 cubic wscale:7:7");
  const history = inboundHistory(socket, [
    { bytesReceived: 0, rcvSpace: 1000000, rtt: 180, retrans: 3, cwnd: 2 },
    { bytesReceived: 1000, rcvSpace: 1000000, rtt: 180, retrans: 3, cwnd: 2 },
    { bytesReceived: 2000, rcvSpace: 1000000, rtt: 180, retrans: 3, cwnd: 2 },
    { bytesReceived: 3000, rcvSpace: 1000000, rtt: 180, retrans: 3, cwnd: 2 }
  ]);

  const result = analyzeBdpWindowLimit(socket, { history, direction: "inbound" });

  assert.equal(result.status, "warning");
  assert.equal(result.hypothesis, "path-recovery-more-likely");
  assert.equal(result.counterEvidence.some(item => item.includes("do not blame the receive window first")), true);
});

test("BDP analysis treats configured capacity as optional user input, not inferred capacity", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:20002 10.0.0.2:53000 cubic wscale:7:7 delivery_rate 20000000bps");
  const history = inboundHistory(socket, [
    { bytesReceived: 0, rcvSpace: 500000, rtt: 10 },
    { bytesReceived: 1000000, rcvSpace: 500000, rtt: 10 }
  ]);

  const withoutCapacity = analyzeBdpWindowLimit(socket, { history });
  const withCapacity = analyzeBdpWindowLimit(socket, { history, configuredLinkCapacityMbps: 100 });

  assert.equal(withoutCapacity.evidence.some(item => item.includes("Capacity unknown")), true);
  assert.equal(withCapacity.evidence.some(item => item.includes("Configured link capacity")), true);
  assert.match(bdpWindowTechnicalNotes().join(" "), /does not infer/);
});
