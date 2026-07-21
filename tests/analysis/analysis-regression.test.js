import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeAll, analyzeSocket, applyRisks, riskForSocket } from "../../src/analysis/analysis.js";
import { parseSs } from "../../src/parsing/parser.js";
import { withStableSocketIds } from "../../src/timeline/timeline.js";

function socketFrom(line) {
  return withStableSocketIds(parseSs(line))[0];
}

// riskForSocket edge cases
test("riskForSocket returns low for clean socket", () => {
  assert.equal(riskForSocket(socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1 cwnd:21")), "low");
});
test("riskForSocket returns medium for moderate RTT", () => {
  assert.equal(riskForSocket(socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:200/10 cwnd:21")), "medium");
});
test("riskForSocket returns high for very high RTT", () => {
  assert.equal(riskForSocket(socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:350/20 cwnd:21")), "high");
});
test("riskForSocket returns high for high RTO", () => {
  assert.equal(riskForSocket(socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rto:1500 cwnd:21")), "high");
});
test("riskForSocket returns medium for static drops in single snapshot", () => {
  assert.equal(riskForSocket(socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d50)")), "medium");
});
test("riskForSocket returns critical for backoff > 2", () => {
  assert.equal(riskForSocket(socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 backoff:3")), "critical");
});
test("riskForSocket returns high for backoff = 1", () => {
  assert.equal(riskForSocket(socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 backoff:1")), "high");
});

// analyzeSocket specific anomaly detection
test("analyzeSocket detects receive buffer pressure at 90%", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r90000,rb100000,t0,tb100,f0,w0,o0,bl0,d0)");
  const findings = analyzeSocket(socket);
  assert.ok(findings.some(f => f.metric === "skmem.r"));
});
test("analyzeSocket does not flag receive buffer at 50%", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r50000,rb100000,t0,tb100,f0,w0,o0,bl0,d0)");
  const findings = analyzeSocket(socket);
  assert.ok(!findings.some(f => f.metric === "skmem.r"));
});
test("analyzeSocket detects send buffer pressure", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb100,t85000,tb100000,f0,w0,o0,bl0,d0)");
  const findings = analyzeSocket(socket);
  assert.ok(findings.some(f => f.metric === "skmem.t"));
});
test("analyzeSocket detects globally exposed listener on 0.0.0.0", () => {
  const socket = socketFrom("LISTEN 0 128 0.0.0.0:22 0.0.0.0:*");
  const findings = analyzeSocket(socket);
  assert.ok(findings.some(f => f.metric === "listen"));
});
test("analyzeSocket detects globally exposed listener on ::", () => {
  const socket = socketFrom("LISTEN 0 128 [::]:80 [::]:*");
  const findings = analyzeSocket(socket);
  assert.ok(findings.some(f => f.metric === "listen"));
});
test("analyzeSocket does not flag loopback listener", () => {
  const socket = socketFrom("LISTEN 0 128 127.0.0.1:3000 0.0.0.0:*");
  const findings = analyzeSocket(socket);
  assert.ok(!findings.some(f => f.metric === "listen"));
});
test("analyzeSocket detects missing process on LISTEN", () => {
  const socket = socketFrom("LISTEN 0 128 0.0.0.0:22 0.0.0.0:*");
  const findings = analyzeSocket(socket);
  assert.ok(findings.some(f => f.metric === "process"));
});
test("analyzeSocket detects missing process on ESTAB", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443");
  const findings = analyzeSocket(socket);
  assert.ok(findings.some(f => f.metric === "process"));
});
test("analyzeSocket does not flag process when present", () => {
  const socket = socketFrom('ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 users:(("java",pid=100,fd=5))');
  const findings = analyzeSocket(socket);
  assert.ok(!findings.some(f => f.metric === "process"));
});
test("analyzeSocket detects cwnd=1 on established socket", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 cwnd:1");
  const findings = analyzeSocket(socket);
  assert.ok(findings.some(f => f.metric === "cwnd"));
});
test("analyzeSocket does not flag cwnd on LISTEN", () => {
  const socket = socketFrom("LISTEN 0 128 0.0.0.0:22 0.0.0.0:* cwnd:1");
  const findings = analyzeSocket(socket);
  assert.ok(!findings.some(f => f.metric === "cwnd"));
});
test("analyzeSocket does not flag cwnd=10", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 cwnd:10");
  const findings = analyzeSocket(socket);
  assert.ok(!findings.some(f => f.metric === "cwnd"));
});
test("analyzeSocket detects sendQ above warning", () => {
  const socket = socketFrom("ESTAB 0 300000 10.0.0.1:1000 10.0.0.2:443");
  const findings = analyzeSocket(socket);
  assert.ok(findings.some(f => f.metric === "sendQ"));
});
test("analyzeSocket detects sendQ above danger as critical", () => {
  const socket = socketFrom("ESTAB 0 2000000 10.0.0.1:1000 10.0.0.2:443");
  const findings = analyzeSocket(socket);
  const sendQFinding = findings.find(f => f.metric === "sendQ");
  assert.equal(sendQFinding.severity, "critical");
});
test("analyzeSocket does not flag sendQ below threshold", () => {
  const socket = socketFrom("ESTAB 0 1000 10.0.0.1:1000 10.0.0.2:443");
  const findings = analyzeSocket(socket);
  assert.ok(!findings.some(f => f.metric === "sendQ"));
});
test("analyzeSocket detects recvQ above warning", () => {
  const socket = socketFrom("ESTAB 200000 0 10.0.0.1:1000 10.0.0.2:443");
  const findings = analyzeSocket(socket);
  assert.ok(findings.some(f => f.metric === "recvQ"));
});
test("analyzeSocket detects recvQ above danger as critical", () => {
  const socket = socketFrom("ESTAB 600000 0 10.0.0.1:1000 10.0.0.2:443");
  const findings = analyzeSocket(socket);
  const recvQFinding = findings.find(f => f.metric === "recvQ");
  assert.equal(recvQFinding.severity, "critical");
});
test("analyzeSocket detects single drop as low without context", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d5)");
  const findings = analyzeSocket(socket);
  const dropFinding = findings.find(f => f.metric === "skmem.d");
  assert.equal(dropFinding.severity, "low");
});
test("analyzeSocket detects timer retrans=1 as medium", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 timer:(on,200ms,1)");
  const findings = analyzeSocket(socket);
  const timerFinding = findings.find(f => f.metric === "timer");
  assert.equal(timerFinding.severity, "medium");
});
test("analyzeSocket detects timer retrans=5 as high", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 timer:(on,200ms,5)");
  const findings = analyzeSocket(socket);
  const timerFinding = findings.find(f => f.metric === "timer");
  assert.equal(timerFinding.severity, "high");
});

// analyzeAll sorting
test("analyzeAll returns empty for clean sockets", () => {
  const sockets = withStableSocketIds(parseSs("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1 cwnd:21"));
  // add process to avoid process finding
  sockets[0].details.process = { name: "test", pid: 1, fd: 1 };
  const anomalies = analyzeAll(sockets);
  assert.equal(anomalies.length, 0);
});
test("analyzeAll sorts critical before high", () => {
  const sockets = withStableSocketIds(parseSs([
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:200/10",
    "ESTAB 0 2000000 10.0.0.3:1000 10.0.0.4:443"
  ].join("\n")));
  sockets.forEach(s => { s.details.process = { name: "t", pid: 1, fd: 1 }; });
  const anomalies = analyzeAll(sockets);
  assert.equal(anomalies[0].severity, "critical");
});
test("analyzeAll includes findings from multiple sockets", () => {
  const sockets = withStableSocketIds(parseSs([
    "ESTAB 0 300000 10.0.0.1:1000 10.0.0.2:443",
    "ESTAB 200000 0 10.0.0.3:1000 10.0.0.4:443"
  ].join("\n")));
  const anomalies = analyzeAll(sockets);
  assert.ok(anomalies.some(f => f.metric === "sendQ"));
  assert.ok(anomalies.some(f => f.metric === "recvQ"));
});

// applyRisks
test("applyRisks adds risk field to each socket", () => {
  const sockets = withStableSocketIds(parseSs("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1 cwnd:21"));
  const result = applyRisks(sockets);
  assert.ok(result[0].risk);
});
test("applyRisks preserves original socket fields", () => {
  const sockets = withStableSocketIds(parseSs("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1"));
  const result = applyRisks(sockets);
  assert.equal(result[0].state, "ESTAB");
  assert.equal(result[0].localAddress.host, "10.0.0.1");
});
test("applyRisks handles empty array", () => {
  assert.deepEqual(applyRisks([]), []);
});

// Tiny MSS detection
test("analyzeSocket detects tiny MSS with normal PMTU", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 mss:200 advmss:1460 pmtu:1500 cwnd:21");
  const findings = analyzeSocket(socket);
  assert.ok(findings.some(f => f.metric === "mss"));
});
test("analyzeSocket does not flag MSS when PMTU is also small", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 mss:200 advmss:200 pmtu:300 cwnd:21");
  const findings = analyzeSocket(socket);
  assert.ok(!findings.some(f => f.metric === "mss"));
});
test("analyzeSocket does not flag normal MSS", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 mss:1460 advmss:1460 pmtu:1500 cwnd:21");
  const findings = analyzeSocket(socket);
  assert.ok(!findings.some(f => f.metric === "mss"));
});

// Multiple anomalies on same socket
test("analyzeSocket can return multiple findings", () => {
  const socket = socketFrom("ESTAB 600000 2000000 10.0.0.1:1000 10.0.0.2:443 rtt:400/50 rto:3500 backoff:4 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d100)");
  const findings = analyzeSocket(socket);
  assert.ok(findings.length >= 5);
});
test("riskForSocket picks highest severity from multiple findings", () => {
  const socket = socketFrom("ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:200/10 backoff:4");
  assert.equal(riskForSocket(socket), "critical");
});

// Generated regression: various RTT thresholds
const rttCases = [
  { rtt: 10, expected: "low" },
  { rtt: 100, expected: "low" },
  { rtt: 149, expected: "low" },
  { rtt: 150, expected: "medium" },
  { rtt: 200, expected: "medium" },
  { rtt: 299, expected: "medium" },
  { rtt: 300, expected: "medium" },
  { rtt: 301, expected: "high" },
  { rtt: 500, expected: "high" },
  { rtt: 1000, expected: "high" }
];
for (const { rtt, expected } of rttCases) {
  test(`analyzeSocket RTT ${rtt}ms yields ${expected} severity`, () => {
    const socket = socketFrom(`ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:${rtt}/1 cwnd:21`);
    socket.details.process = { name: "t", pid: 1, fd: 1 };
    const risk = riskForSocket(socket);
    if (expected === "low") {
      assert.equal(risk, "low");
    } else {
      const findings = analyzeSocket(socket);
      const rttFinding = findings.find(f => f.metric === "rtt");
      assert.equal(rttFinding?.severity || "low", expected);
    }
  });
}

// Generated regression: sendQ thresholds
const sendQCases = [
  { sendQ: 0, hasAnomaly: false },
  { sendQ: 100000, hasAnomaly: false },
  { sendQ: 262143, hasAnomaly: false },
  { sendQ: 262145, hasAnomaly: true },
  { sendQ: 500000, hasAnomaly: true },
  { sendQ: 1048575, hasAnomaly: true },
  { sendQ: 1048577, hasAnomaly: true },
  { sendQ: 2000000, hasAnomaly: true }
];
for (const { sendQ, hasAnomaly } of sendQCases) {
  test(`analyzeSocket sendQ=${sendQ} ${hasAnomaly ? "triggers" : "does not trigger"} anomaly`, () => {
    const socket = socketFrom(`ESTAB 0 ${sendQ} 10.0.0.1:1000 10.0.0.2:443 cwnd:21`);
    socket.details.process = { name: "t", pid: 1, fd: 1 };
    const findings = analyzeSocket(socket);
    assert.equal(findings.some(f => f.metric === "sendQ"), hasAnomaly);
  });
}


// Generated regression: recvQ thresholds
const recvQCases = [
  { recvQ: 0, hasAnomaly: false },
  { recvQ: 50000, hasAnomaly: false },
  { recvQ: 131071, hasAnomaly: false },
  { recvQ: 131073, hasAnomaly: true },
  { recvQ: 300000, hasAnomaly: true },
  { recvQ: 524287, hasAnomaly: true },
  { recvQ: 524289, hasAnomaly: true },
  { recvQ: 1000000, hasAnomaly: true }
];
for (const { recvQ, hasAnomaly } of recvQCases) {
  test(`analyzeSocket recvQ=${recvQ} ${hasAnomaly ? "triggers" : "does not trigger"} anomaly`, () => {
    const socket = socketFrom(`ESTAB ${recvQ} 0 10.0.0.1:1000 10.0.0.2:443 cwnd:21`);
    socket.details.process = { name: "t", pid: 1, fd: 1 };
    const findings = analyzeSocket(socket);
    assert.equal(findings.some(f => f.metric === "recvQ"), hasAnomaly);
  });
}

// Generated regression: drop count thresholds (single snapshot, no correlation)
const dropCases = [
  { drops: 0, hasAnomaly: false },
  { drops: 1, severity: "low" },
  { drops: 5, severity: "low" },
  { drops: 10, severity: "low" },
  { drops: 11, severity: "medium" },
  { drops: 50, severity: "medium" },
  { drops: 100, severity: "medium" },
  { drops: 1000, severity: "high" }
];
for (const { drops, hasAnomaly, severity } of dropCases) {
  test(`analyzeSocket drops=${drops} ${hasAnomaly === false ? "no anomaly" : severity}`, () => {
    const socket = socketFrom(`ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 skmem:(r0,rb100,t0,tb100,f0,w0,o0,bl0,d${drops}) cwnd:21`);
    socket.details.process = { name: "t", pid: 1, fd: 1 };
    const findings = analyzeSocket(socket);
    if (hasAnomaly === false) {
      assert.ok(!findings.some(f => f.metric === "skmem.d"));
    } else {
      const finding = findings.find(f => f.metric === "skmem.d");
      assert.equal(finding.severity, severity);
    }
  });
}
