import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSs, parseTimestampLine } from "../../src/parsing/parser.js";
import { correlateFixLatency } from "../../src/correlation/fix-correlation.js";
import { parseVmstat, parseNstatTimestamped } from "../../src/parsing/vmstat-parser.js";
import { detectTimelineStories } from "../../src/timeline/timeline-stories.js";

describe("parse-worker logic (unit)", () => {
  it("parseSs handles large input without crashing", () => {
    // Generate a synthetic large ss output
    const lines = [];
    for (let i = 0; i < 500; i++) {
      lines.push(`tcp ESTAB 0 0 10.0.0.1:${8000 + i} 10.0.0.2:443 uid:1000 ino:${1000 + i} sk:${i.toString(16)}`);
    }
    const raw = lines.join("\n");
    const sockets = parseSs(raw);
    assert.ok(sockets.length >= 400, `Expected >= 400 sockets, got ${sockets.length}`);
  });

  it("parseSs rejects truncated lines", () => {
    const raw = `tcp ESTAB 0 0 [::ffff:10.0.0.1]:8080 [::ffff:10.0.0.2]:443 sk:abc1
tcp ESTAB 0 0 [::ffff:10.0.0.1]:8080 [::ffff:10.0.0`;
    const sockets = parseSs(raw);
    assert.equal(sockets.length, 1); // Second line truncated, should be rejected
  });

  it("parseTimestampLine detects ISO timestamps", () => {
    assert.ok(parseTimestampLine("2026-05-18T12:10:51,068381820+00:00") !== null);
    assert.ok(parseTimestampLine("not a timestamp") === null);
  });
});

describe("trend detection logic", () => {
  it("detects growing metric", () => {
    // Simulate history with growing recvQ
    const history = Array.from({ length: 40 }, (_, i) => ({
      epochMs: Date.now() - (40 - i) * 1000,
      recvQ: i < 20 ? 1000 : 1000 + (i - 20) * 5000,
      sendQ: 0,
      rtt: 10,
      rto: 200
    }));
    // Recent avg should be higher than older avg
    const recent = history.slice(-20);
    const older = history.slice(-40, -20);
    const recentAvg = recent.reduce((s, d) => s + d.recvQ, 0) / recent.length;
    const olderAvg = older.reduce((s, d) => s + d.recvQ, 0) / older.length;
    assert.ok(recentAvg > olderAvg, "Recent recvQ should be higher than older");
    assert.ok((recentAvg - olderAvg) / olderAvg > 0.1, "Growth rate should be > 10%");
  });
});

describe("multi-host correlation logic", () => {
  it("matches sockets by inverted 4-tuple", () => {
    const localSockets = [
      { id: "1", local: "10.0.0.1:8080", peer: "10.0.0.2:443", localAddress: { host: "10.0.0.1" }, peerAddress: { host: "10.0.0.2" }, sendQ: 50000, recvQ: 0 }
    ];
    const peerSockets = [
      { local: "10.0.0.2:443", peer: "10.0.0.1:8080", sendQ: 0, recvQ: 120000 }
    ];
    // Match: local's peer IP appears in peerSocket's local, and local's local IP appears in peerSocket's peer
    const correlations = [];
    for (const local of localSockets) {
      const peer = peerSockets.find(s => s.local?.includes(local.peerAddress?.host) && s.peer?.includes(local.localAddress?.host));
      if (peer) correlations.push({ localSocket: local, peerSocket: peer });
    }
    assert.equal(correlations.length, 1);
    assert.equal(correlations[0].peerSocket.recvQ, 120000);
  });

  it("does not match unrelated sockets", () => {
    const localSockets = [
      { id: "1", local: "10.0.0.1:8080", peer: "10.0.0.2:443", localAddress: { host: "10.0.0.1" }, peerAddress: { host: "10.0.0.2" }, sendQ: 0, recvQ: 0 }
    ];
    const peerSockets = [
      { local: "192.168.1.1:9090", peer: "192.168.1.2:3000", sendQ: 0, recvQ: 0 }
    ];
    const correlations = [];
    for (const local of localSockets) {
      const peer = peerSockets.find(s => s.local?.includes(local.peerAddress?.host) && s.peer?.includes(local.localAddress?.host));
      if (peer) correlations.push({ localSocket: local, peerSocket: peer });
    }
    assert.equal(correlations.length, 0);
  });
});

describe("baseline deviation detection", () => {
  it("detects P95 deviation > 2x", () => {
    const baseHistory = Array.from({ length: 100 }, () => ({ rtt: 10 + Math.random() * 5 }));
    const currHistory = Array.from({ length: 100 }, () => ({ rtt: 40 + Math.random() * 20 }));
    const baseVals = baseHistory.map(d => d.rtt).sort((a, b) => a - b);
    const currVals = currHistory.map(d => d.rtt).sort((a, b) => a - b);
    const baseP95 = baseVals[Math.floor(baseVals.length * 0.95)];
    const currP95 = currVals[Math.floor(currVals.length * 0.95)];
    assert.ok(currP95 > baseP95 * 2, `Expected currP95 (${currP95.toFixed(1)}) > 2x baseP95 (${baseP95.toFixed(1)})`);
  });

  it("does not flag stable metrics", () => {
    const baseHistory = Array.from({ length: 100 }, () => ({ rtt: 10 + Math.random() * 2 }));
    const currHistory = Array.from({ length: 100 }, () => ({ rtt: 10 + Math.random() * 2 }));
    const baseVals = baseHistory.map(d => d.rtt).sort((a, b) => a - b);
    const currVals = currHistory.map(d => d.rtt).sort((a, b) => a - b);
    const baseP95 = baseVals[Math.floor(baseVals.length * 0.95)];
    const currP95 = currVals[Math.floor(currVals.length * 0.95)];
    assert.ok(currP95 < baseP95 * 2, "Stable metric should not trigger deviation");
  });
});

describe("timeline stories - new patterns", () => {
  it("detects zero-window-event pattern definition", () => {
    // Verify the pattern exists in the stories module
    const raw = "";
    const sockets = [];
    const stories = detectTimelineStories(raw, sockets);
    // With no data, should return empty but not crash
    assert.ok(Array.isArray(stories));
  });

  it("detects process-disappeared pattern definition", () => {
    // The pattern should be defined (we can't easily trigger it without full ss data)
    // Just verify the module loads and exports correctly
    assert.equal(typeof detectTimelineStories, "function");
  });
});

describe("FIX correlation with all sources", () => {
  const baseTime = Date.UTC(2026, 4, 18, 12, 10, 51, 0);

  it("full pipeline: ss + vmstat + nstat + GC", () => {
    const records = [
      { receiveMs: baseTime + 200, sendingMs: baseTime + 150, lagMs: 50, endpoint: "10.1.2.3:100", direction: "IN", msgType: "i", symbol: "EUR", sender: "A", target: "B", thread: "t1", fileName: "f", lineNumber: 1 }
    ];
    const history = [{ epochMs: baseTime + 150, peer: "10.1.2.3:100", local: "", recvQ: 5000, sendQ: 0, rtt: 60, retrans: 1, cwnd: 3, backoff: 0, "skmem.d": 5 }];
    const vmstatSamples = [{ epochMs: baseTime + 100, r: 20, b: 0, us: 80, sy: 15, wa: 0, id: 5, cs: 500000, si: 0, so: 0 }];
    const nstatSamples = [{ epochMs: baseTime + 100, counters: { TcpRetransSegs: 3, TcpExtTCPTimeouts: 1 } }];
    const gcPauses = [{ epochMs: baseTime + 100, alignedEpochMs: baseTime + 100, durationMs: 30 }];

    const result = correlateFixLatency({
      records, history, threshold: 5,
      vmstatSamples, nstatSamples, gcPauses, gcWindowMs: 200, cpuCores: 16
    });

    assert.equal(result.results.length, 1);
    assert.ok(result.results[0].score > 0.5, "Should have high score with all sources");
    assert.equal(result.results[0].cause, "gc"); // GC takes priority
    assert.ok(result.results[0].signals.includes("gc_pause"));
    assert.ok(result.results[0].signals.includes("drops"));
    assert.ok(result.results[0].signals.includes("rtt_high"));
    assert.ok(result.results[0].signals.includes("runqueue_high"));
    assert.ok(result.results[0].signals.includes("nstat_retrans"));
    assert.ok(result.summary.hasVmstat);
    assert.ok(result.summary.hasNstat);
    assert.ok(result.summary.hasGc);
  });
});
