import assert from "node:assert/strict";
import { test } from "node:test";

import { analyzeAll } from "../../src/analysis.js";
import { buildDiagnosticHypotheses } from "../../src/diagnostics.js";
import { parseSs } from "../../src/parser.js";
import { withStableSocketIds } from "../../src/timeline.js";

const thresholds = {
  sendQ: { warn: 262144, danger: 1048576 },
  recvQ: { warn: 131072, danger: 524288 },
  rto: { warn: 1000, danger: 3000 },
  cwnd: { warn: 4 },
  "skmem.d": { danger: 10 }
};

function socketsFrom(lines) {
  return withStableSocketIds(parseSs(Array.isArray(lines) ? lines.join("\n") : lines));
}

function diagnose(lines, options = {}) {
  const sockets = socketsFrom(lines);
  return buildDiagnosticHypotheses({
    sockets,
    anomalies: options.anomalies ?? analyzeAll(sockets),
    history: options.history || [],
    thresholds
  });
}

function byId(hypotheses, id) {
  return hypotheses.find(item => item.id === id);
}

test("diagnostics detects local application read pressure from Recv-Q", () => {
  const hypotheses = diagnose("ESTAB 700000 0 10.0.0.1:9200 10.0.0.2:54321 users:((\"java\",pid=42,fd=9)) skmem:(r600000,rb700000,t0,tb100,w0,d0) rtt:2/0.2");

  const local = byId(hypotheses, "local-app-not-reading");

  assert.equal(local.severity, "critical");
  assert.equal(local.confidence, "high");
  assert.match(local.summary, /not draining/i);
  assert.equal(local.processes.includes("java:42"), true);
});

test("diagnostics detects peer slow consumer or egress bottleneck from Send-Q", () => {
  const hypotheses = diagnose("ESTAB 0 1400000 10.0.0.1:9200 10.0.0.2:443 users:((\"nginx\",pid=12,fd=3)) skmem:(r0,rb100,t900000,tb1000000,w0,d0) rto:200 rtt:10/1 cwnd:10");

  const peer = byId(hypotheses, "peer-slow-consumer-or-egress");

  assert.equal(peer.severity, "critical");
  assert.equal(peer.confidence, "medium");
  assert.match(peer.summary, /sender is blocked/i);
  assert.equal(peer.commands.some(command => command.includes("ip route get")), true);
});

test("diagnostics parses receiver-window limited ss fields", () => {
  const [socket] = socketsFrom("ESTAB 0 20 10.0.0.1:9200 10.0.0.2:443 busy:10000ms rwnd_limited:4500ms(45.0%) snd_wnd:0 rcv_space:4096 rcv_wnd:8192");

  assert.equal(socket.details.values.rwnd_limited.ms, 4500);
  assert.equal(socket.details.values.rwnd_limited.percent, 45);
  assert.equal(socket.details.values.snd_wnd, 0);
  assert.equal(socket.details.values.rcv_space, 4096);
});

test("diagnostics detects receiver-side window collapse from rcv_space and skmem receive pressure", () => {
  const hypotheses = diagnose("ESTAB 300000 0 10.0.0.1:9200 10.0.0.2:443 users:((\"java\",pid=42,fd=9)) skmem:(r290000,rb300000,t0,tb100,w0,d0) rcv_space:2048 rcv_wnd:4096 rto:200 rtt:1/0.1 cwnd:20");

  const receiveWindow = byId(hypotheses, "local-receive-window-collapse");

  assert.equal(receiveWindow.severity, "high");
  assert.equal(receiveWindow.confidence, "high");
  assert.match(receiveWindow.summary, /TCP backpressure/i);
  assert.match(receiveWindow.summary, /not by IP congestion/i);
  assert.equal(receiveWindow.evidence.some(item => item.includes("rcv_space")), true);
  assert.equal(receiveWindow.evidence.some(item => item.includes("skmem:r")), true);
  assert.equal(receiveWindow.counterEvidence.some(item => item.includes("not, by itself, packet loss")), true);
  assert.match(receiveWindow.learnMore.join(" "), /rcv_space falling near zero/i);
  assert.match(receiveWindow.learnMore.join(" "), /TCP flow-control backpressure/i);
  assert.match(receiveWindow.learnMore.join(" "), /JVM pauses, GC, blocked threads/i);
  assert.equal(receiveWindow.commands.some(command => command.includes("epoll_wait")), true);
});

test("diagnostics adds a capped warning for suspicious TCP window scaling context", () => {
  const hypotheses = diagnose("ESTAB 0 0 10.0.0.1:20002 10.0.0.2:53000 cubic rtt:100/12 delivery_rate 20000000bps rcv_space:262144 skmem:(r0,rb425984,t0,tb425984,d0)");

  const wscale = byId(hypotheses, "tcp-window-scale-context");

  assert.equal(wscale.severity, "medium");
  assert.match(wscale.summary, /not a root cause by itself/i);
  assert.equal(wscale.evidence.some(item => item.includes("BDP exceeds 64 KB")), true);
  assert.equal(wscale.counterEvidence.some(item => item.includes("never creates a critical")), true);
  assert.equal(wscale.commands.some(command => command.includes("tcp-handshake-wscale.pcap")), true);
});

test("diagnostics does not create a wscale anomaly when normal scaling is present", () => {
  const hypotheses = diagnose("ESTAB 0 0 10.0.0.1:20002 10.0.0.2:53000 cubic wscale:7:7 rtt:1/0.1 delivery_rate 20000000bps rcv_space:262144 skmem:(r0,rb425984,t0,tb425984,d0)");

  assert.equal(byId(hypotheses, "tcp-window-scale-context"), undefined);
});

test("diagnostics adds receive autotuning hypothesis from multi-snapshot rcv_ssthresh decline", () => {
  const sockets = socketsFrom("ESTAB 300000 0 10.0.0.1:20002 10.0.0.2:53000 timer:(persist,3sec,2) cubic rcv_ssthresh:375680 rcv_space:2048 rtt:1/0.1 skmem:(r390000,rb400000,t0,tb425984,d0)");
  const [socket] = sockets;
  const hypotheses = buildDiagnosticHypotheses({
    sockets,
    anomalies: analyzeAll(sockets),
    history: [
      { socketId: socket.id, epochMs: 1000, rcv_ssthresh: 798320, rcv_space: 65536, recvQ: 20000, "skmem.r": 100000, "skmem.rb": 400000 },
      { socketId: socket.id, epochMs: 3_121_000, rcv_ssthresh: 375680, rcv_space: 2048, recvQ: 300000, "skmem.r": 390000, "skmem.rb": 400000, timerName: "persist" }
    ],
    thresholds
  });

  const receiveSsthresh = byId(hypotheses, "tcp-receive-ssthresh-trend");

  assert.equal(receiveSsthresh.severity, "high");
  assert.match(receiveSsthresh.summary, /slow-consumer/i);
  assert.equal(receiveSsthresh.evidence.some(item => item.includes("52.9%")), true);
  assert.equal(receiveSsthresh.counterEvidence.some(item => item.includes("single rcv_ssthresh sample")), true);
});

test("diagnostics does not alert on a single rcv_ssthresh sample", () => {
  const hypotheses = diagnose("ESTAB 0 0 10.0.0.1:20002 10.0.0.2:53000 cubic rcv_ssthresh:375680 rcv_space:262144 rtt:1/0.1 skmem:(r0,rb400000,t0,tb425984,d0)");

  assert.equal(byId(hypotheses, "tcp-receive-ssthresh-trend"), undefined);
});

test("diagnostics marks receiver-side zero window as critical when rcv_wnd is zero", () => {
  const hypotheses = diagnose("ESTAB 700000 0 10.0.0.1:9200 10.0.0.2:443 users:((\"java\",pid=42,fd=9)) skmem:(r690000,rb700000,t0,tb100,w0,d0) rcv_space:0 rcv_wnd:0 rto:200 rtt:1/0.1 cwnd:20");

  const receiveWindow = byId(hypotheses, "local-receive-window-collapse");

  assert.equal(receiveWindow.severity, "critical");
  assert.equal(receiveWindow.evidence.some(item => item.includes("rcv_wnd is zero")), true);
});

test("diagnostics treats rwnd_limited alone as receiver-window limited but ambiguous", () => {
  const hypotheses = diagnose("ESTAB 0 20 10.0.0.1:9200 10.0.0.2:443 busy:10000ms rwnd_limited:4500ms(45.0%) rto:200 rtt:1/0.1 cwnd:20");

  const window = byId(hypotheses, "zero-window-or-slow-consumer");

  assert.equal(window.confidence, "medium");
  assert.match(window.counterEvidence.join(" "), /ambiguous/i);
  assert.equal(byId(hypotheses, "path-congestion-or-loss"), undefined);
});

test("diagnostics detects Zero Window from persist timer and backoff", () => {
  const hypotheses = diagnose("ESTAB 0 900000 10.0.0.1:9200 10.0.0.2:443 timer:(persist,3sec,4) busy:20000ms rwnd_limited:18000ms(90.0%) backoff:3 snd_wnd:0 rto:800 rtt:2/0.2 cwnd:20");

  const window = byId(hypotheses, "zero-window-or-slow-consumer");

  assert.equal(window.severity, "critical");
  assert.equal(window.confidence, "high");
  assert.match(window.summary, /Zero Window/i);
  assert.equal(window.evidence.some(item => item.includes("persist")), true);
  assert.equal(window.counterEvidence.some(item => item.includes("backoff + persist")), true);
  assert.match(window.learnMore.join(" "), /rwnd_limited is useful but ambiguous/i);
  assert.match(window.learnMore.join(" "), /slow consumer \/ receiver saturation/i);
  assert.equal(byId(hypotheses, "path-congestion-or-loss"), undefined);
});

test("diagnostics treats short isolated backoff as watch-only", () => {
  const hypotheses = diagnose("ESTAB 0 0 10.0.0.1:9200 10.0.0.2:443 rto:200 backoff:1 rtt:12/1 cwnd:20");

  const watch = byId(hypotheses, "tcp-backoff-watch");

  assert.equal(watch.severity, "low");
  assert.equal(watch.confidence, "high");
  assert.match(watch.summary, /watch signal/i);
  assert.match(watch.counterEvidence.join(" "), /not proof/i);
  assert.match(watch.learnMore.join(" "), /does not automatically mean the network is bad/i);
  assert.match(watch.learnMore.join(" "), /backoff:6\+ with multi-second RTO/i);
  assert.equal(byId(hypotheses, "path-congestion-or-loss"), undefined);
});

test("diagnostics escalates frequent backoff 2-3 to watch but not network blame", () => {
  const hypotheses = diagnose("ESTAB 0 0 10.0.0.1:9200 10.0.0.2:443 rto:240 backoff:3 rtt:10/1 cwnd:20");

  const watch = byId(hypotheses, "tcp-backoff-watch");

  assert.equal(watch.severity, "medium");
  assert.match(watch.counterEvidence.join(" "), /retrans\/RTO\/RTT\/cwnd/i);
});

test("diagnostics separates network congestion from Zero Window when cwnd drops and RTO rises", () => {
  const hypotheses = diagnose("ESTAB 0 500000 10.0.0.1:9200 10.0.0.2:443 timer:(on,3sec,3) rto:3200 backoff:4 rtt:420/180 cwnd:2");

  const path = byId(hypotheses, "path-congestion-or-loss");

  assert.equal(path.title, "Network congestion is probable");
  assert.equal(path.severity, "critical");
  assert.equal(path.confidence, "high");
  assert.match(path.learnMore.join(" "), /retransmission or RTO pressure plus RTT growth and a reduced cwnd/i);
  assert.match(path.learnMore.join(" "), /differs from Zero Window/i);
  assert.equal(byId(hypotheses, "zero-window-or-slow-consumer"), undefined);
});

test("diagnostics marks increasing backoff and retrans as serious", () => {
  const hypotheses = diagnose(
    "ESTAB 0 500000 10.0.0.1:9200 10.0.0.2:443 timer:(on,3sec,3) rto:3200 backoff:4 rtt:420/180 cwnd:2",
    { history: [{ epochMs: 1000, backoff: 1, retrans: 1 }, { epochMs: 2000, backoff: 4, retrans: 5 }] }
  );

  const path = byId(hypotheses, "path-congestion-or-loss");

  assert.equal(path.evidence.some(item => item.includes("backoff increased from 1 to 4")), true);
  assert.equal(path.evidence.some(item => item.includes("retrans increased by 4")), true);
  assert.equal(path.evidence.some(item => item.includes("approximate wait")), true);
});

test("diagnostics detects peer dead or blackhole pattern from huge backoff", () => {
  const hypotheses = diagnose("ESTAB 0 800000 10.0.0.1:9200 10.0.0.2:443 timer:(on,12sec,8) rto:6000 backoff:7 rtt:100/20 cwnd:10");

  const blackhole = byId(hypotheses, "peer-dead-or-blackhole");

  assert.equal(blackhole.severity, "critical");
  assert.equal(blackhole.confidence, "high");
  assert.match(blackhole.summary, /blackhole/i);
  assert.match(blackhole.counterEvidence.join(" "), /does not by itself/i);
  assert.match(blackhole.counterEvidence.join(" "), /peer freeze|firewall blackhole/i);
  assert.equal(blackhole.evidence.some(item => item.includes("approximate wait")), true);
});

test("diagnostics raises egress confidence when Send-Q is paired with RTO recovery", () => {
  const hypotheses = diagnose("ESTAB 0 400000 10.0.0.1:9200 10.0.0.2:443 timer:(on,1sec,2) rto:1300 backoff:1 rtt:200/50 cwnd:3");

  const peer = byId(hypotheses, "peer-slow-consumer-or-egress");
  const path = byId(hypotheses, "path-congestion-or-loss");

  assert.equal(peer.confidence, "high");
  assert.equal(path.severity, "high");
  assert.equal(path.evidence.some(item => item.includes("RTO")), true);
});

test("diagnostics detects critical path congestion on high RTO and backoff", () => {
  const hypotheses = diagnose("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 timer:(on,1sec,3) rto:5000 backoff:2 rtt:500/200 cwnd:2");

  const path = byId(hypotheses, "path-congestion-or-loss");

  assert.equal(path.severity, "critical");
  assert.equal(path.confidence, "high");
  assert.equal(path.commands.some(command => command.includes("tracepath")), true);
});

test("diagnostics detects socket memory pressure from skmem drops", () => {
  const hypotheses = diagnose("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb100,t0,tb100,w0,d25)");

  const pressure = byId(hypotheses, "socket-memory-pressure");

  assert.equal(pressure.severity, "critical");
  assert.match(pressure.counterEvidence.join(" "), /does not prove NIC ring/i);
  assert.equal(pressure.commands.some(command => command.includes("softnet_stat")), true);
});

test("diagnostics increases drop confidence when history shows growth", () => {
  const hypotheses = diagnose(
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb100,t0,tb100,w0,d1)",
    { history: [{ epochMs: 1000, "skmem.d": 1 }, { epochMs: 2000, "skmem.d": 12 }] }
  );

  const pressure = byId(hypotheses, "socket-memory-pressure");

  assert.equal(pressure.confidence, "high");
  assert.equal(pressure.evidence.some(item => item.includes("increased by 11")), true);
});

test("diagnostics detects CLOSE-WAIT leak candidates", () => {
  const lines = Array.from({ length: 25 }, (_, index) => `CLOSE-WAIT 0 0 10.0.0.1:${3000 + index} 10.0.0.2:443 users:((\"api\",pid=77,fd=${index + 3}))`);

  const closeWait = byId(diagnose(lines), "close-wait-leak");

  assert.equal(closeWait.severity, "high");
  assert.equal(closeWait.confidence, "high");
  assert.match(closeWait.summary, /has not closed/i);
});

test("diagnostics detects TIME-WAIT concentration", () => {
  const lines = Array.from({ length: 120 }, (_, index) => `TIME-WAIT 0 0 10.0.0.1:${4000 + index} 10.0.0.2:443`);

  const timeWait = byId(diagnose(lines), "time-wait-flood");

  assert.equal(timeWait.severity, "medium");
  assert.match(timeWait.summary, /connection churn/i);
});

test("diagnostics detects wildcard listener exposure", () => {
  const hypotheses = diagnose("LISTEN 0 128 0.0.0.0:22 0.0.0.0:* users:((\"sshd\",pid=100,fd=3))");

  const exposure = byId(hypotheses, "listener-exposure");

  assert.equal(exposure.severity, "medium");
  assert.match(exposure.summary, /all interfaces/i);
  assert.equal(exposure.commands.some(command => command.includes("nft")), true);
});

test("diagnostics returns low confidence no-dominant finding for clean captures", () => {
  const hypotheses = diagnose("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 users:((\"curl\",pid=9,fd=4)) rtt:1/0.1 cwnd:10");

  assert.equal(hypotheses[0].id, "no-dominant-bottleneck");
  assert.equal(hypotheses[0].severity, "low");
  assert.match(hypotheses[0].counterEvidence.join(" "), /single snapshot/i);
});

test("diagnostics returns a collection hint when no sockets are loaded", () => {
  const hypotheses = buildDiagnosticHypotheses({ sockets: [], thresholds });

  assert.equal(hypotheses[0].id, "no-data");
  assert.equal(hypotheses[0].commands[0].includes("ss -HOntepmi"), true);
});

test("diagnostics sorts high-confidence severe hypotheses first", () => {
  const hypotheses = diagnose([
    "ESTAB 700000 0 10.0.0.1:9200 10.0.0.2:54321 skmem:(r600000,rb700000,t0,tb100,w0,d0)",
    "ESTAB 0 400000 10.0.0.1:1000 10.0.0.3:443 timer:(on,1sec,3) rto:5000 backoff:2 cwnd:2",
    "LISTEN 0 128 0.0.0.0:22 0.0.0.0:*"
  ]);

  assert.equal(hypotheses[0].severity, "critical");
  assert.notEqual(hypotheses[0].id, "listener-exposure");
});
