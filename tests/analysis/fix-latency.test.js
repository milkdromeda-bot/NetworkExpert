import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseFixLine, parseFixLog, parseLogTime, parseSendingTime, extractTag, computeFixStats, extractEndpoints } from "../../src/fix-log-parser.js";
import { correlateFixLatency } from "../../src/fix-correlation.js";
import { parseVmstat, parseNstatTimestamped, vmstatSummary } from "../../src/vmstat-parser.js";

describe("fix-log-parser", () => {
  const TRADING_LINE = '260506-08:50:41.227 TRACE app_connector [ca_ctb_colo-fixInitiator--3][message](FIXTcpConnection [/10.20.30.40:20867]) IN 8=FIX.4.4|9=273|35=8|49=BROKER-A|56=CLIENT-B|34=1450|50=FXSPOT|52=20260506-08:50:41.212|1=107000222|6=0|11=ORDER123|15=XAU|14=0|17=EXEC001|150=A|151=100|37=ORD001|38=100|39=A|40=D|54=2|55=XAUUSD|59=4|60=20260506-08:50:41.212|10=107|';
  const PRICE_LINE = '260506-08:50:41.193 TRACE app_connector [ca_ctb_colo-fixInitiator--4][message](FIXTcpConnection [/10.20.30.40:10867]) IN 8=FIX.4.4|9=968|35=i|49=BROKER-A|56=CLIENT-B-QUOTE|34=4369556|50=FXSPOT|52=20260506-08:50:41.188|117=QUOTE001|55=XAUUSD|10=205|';
  const OUT_LINE = '260506-08:50:41.194 TRACE app_connector [ca_sttp-tcpAcceptor--1][message](FIXTcpConnection [/10.20.30.40:20867]) OUT 8=FIX.4.4|9=0239|35=D|49=CLIENT-B|56=BROKER-A|34=1423|57=FXSPOT|52=20260506-08:50:41.194|11=ORDER123|55=XAUUSD|54=2|10=191|';

  it("parseLogTime extracts server timestamp", () => {
    const ms = parseLogTime(TRADING_LINE);
    assert.equal(ms, Date.UTC(2026, 4, 6, 8, 50, 41, 227));
  });

  it("parseSendingTime extracts tag 52", () => {
    const ms = parseSendingTime(TRADING_LINE);
    assert.equal(ms, Date.UTC(2026, 4, 6, 8, 50, 41, 212));
  });

  it("extractTag extracts FIX tags", () => {
    assert.equal(extractTag(TRADING_LINE, 35), "8");
    assert.equal(extractTag(TRADING_LINE, 49), "BROKER-A");
    assert.equal(extractTag(TRADING_LINE, 56), "CLIENT-B");
    assert.equal(extractTag(TRADING_LINE, 55), "XAUUSD");
  });

  it("parseFixLine parses trading IN message", () => {
    const r = parseFixLine(TRADING_LINE, "test.log", 1);
    assert.ok(r);
    assert.equal(r.lagMs, 15); // 227 - 212
    assert.equal(r.endpoint, "10.20.30.40:20867");
    assert.equal(r.direction, "IN");
    assert.equal(r.thread, "ca_ctb_colo-fixInitiator--3");
    assert.equal(r.msgType, "8");
    assert.equal(r.symbol, "XAUUSD");
    assert.equal(r.sender, "BROKER-A");
    assert.equal(r.target, "CLIENT-B");
  });

  it("parseFixLine parses price IN message", () => {
    const r = parseFixLine(PRICE_LINE, "test.log", 2);
    assert.ok(r);
    assert.equal(r.lagMs, 5); // 193 - 188
    assert.equal(r.endpoint, "10.20.30.40:10867");
    assert.equal(r.direction, "IN");
    assert.equal(r.msgType, "i");
  });

  it("parseFixLine parses OUT message with 0 lag", () => {
    const r = parseFixLine(OUT_LINE, "test.log", 3);
    assert.ok(r);
    assert.equal(r.lagMs, 0);
    assert.equal(r.direction, "OUT");
    assert.equal(r.msgType, "D");
  });

  it("parseFixLine rejects invalid lines", () => {
    assert.equal(parseFixLine("", "f", 1), null);
    assert.equal(parseFixLine("short line", "f", 1), null);
    assert.equal(parseFixLine("260506-08:50:41.227 no FIX content here at all", "f", 1), null);
  });

  it("parseFixLog parses multiple lines", () => {
    const text = [TRADING_LINE, PRICE_LINE, OUT_LINE, "garbage line"].join("\n");
    const { records, stats } = parseFixLog(text, "multi.log");
    assert.equal(records.length, 3);
    assert.equal(stats.parsed, 3);
    assert.equal(stats.rejected, 0);
    // Sorted by receiveMs
    assert.ok(records[0].receiveMs <= records[1].receiveMs);
  });

  it("computeFixStats computes percentiles", () => {
    const records = [{ lagMs: 1 }, { lagMs: 5 }, { lagMs: 10 }, { lagMs: 50 }, { lagMs: 100 }];
    const s = computeFixStats(records);
    assert.equal(s.count, 5);
    assert.equal(s.max, 100);
    assert.ok(s.median >= 5 && s.median <= 10);
  });

  it("extractEndpoints returns unique endpoints", () => {
    const records = [
      { endpoint: "10.1.2.3:100" },
      { endpoint: "10.1.2.3:200" },
      { endpoint: "10.1.2.3:100" },
      { endpoint: "" }
    ];
    const eps = extractEndpoints(records);
    assert.equal(eps.length, 2);
    assert.ok(eps.includes("10.1.2.3:100"));
    assert.ok(eps.includes("10.1.2.3:200"));
  });
});

describe("fix-correlation", () => {
  const baseTime = Date.UTC(2026, 4, 6, 8, 50, 41, 0);

  it("correlates spikes with ss history", () => {
    const records = [
      { receiveMs: baseTime + 200, sendingMs: baseTime + 180, lagMs: 20, endpoint: "10.1.2.3:100", direction: "IN", msgType: "8", symbol: "EUR", sender: "A", target: "B", thread: "t1", fileName: "f", lineNumber: 1 },
      { receiveMs: baseTime + 500, sendingMs: baseTime + 498, lagMs: 2, endpoint: "10.1.2.3:100", direction: "IN", msgType: "8", symbol: "EUR", sender: "A", target: "B", thread: "t1", fileName: "f", lineNumber: 2 }
    ];
    const history = [
      { epochMs: baseTime, peer: "10.1.2.3:100", recvQ: 5000, retrans: 2, rtt: 80, sendQ: 0, cwnd: 5 }
    ];
    const result = correlateFixLatency({ records, history, threshold: 5 });
    assert.equal(result.results.length, 1); // Only lagMs > 5
    assert.ok(result.results[0].score > 0);
    assert.ok(result.results[0].signals.includes("retrans"));
    assert.ok(result.results[0].signals.includes("rtt_high"));
    assert.equal(result.summary.totalSpikes, 1);
  });

  it("returns empty when no records", () => {
    const result = correlateFixLatency({ records: [], history: [], threshold: 5 });
    assert.equal(result.results.length, 0);
    assert.equal(result.summary, null);
  });

  it("works without ss history (vmstat/nstat only)", () => {
    const records = [
      { receiveMs: baseTime + 200, sendingMs: baseTime + 150, lagMs: 50, endpoint: "10.1.2.3:100", direction: "IN", msgType: "8", symbol: "X", sender: "A", target: "B", thread: "t1", fileName: "f", lineNumber: 1 }
    ];
    const vmstatSamples = [{ epochMs: baseTime + 100, r: 12, b: 0, us: 85, sy: 10, wa: 2, id: 3, cs: 5000, si: 0, so: 0 }];
    const result = correlateFixLatency({ records, history: [], threshold: 5, vmstatSamples });
    assert.equal(result.results.length, 1);
    assert.ok(result.results[0].score > 0);
    assert.ok(result.results[0].signals.includes("runqueue_high"));
    assert.ok(result.results[0].signals.includes("cpu_saturated"));
    assert.equal(result.results[0].cause, "cpu");
  });

  it("correlates with nstat samples", () => {
    const records = [
      { receiveMs: baseTime + 200, sendingMs: baseTime + 150, lagMs: 50, endpoint: "10.1.2.3:100", direction: "IN", msgType: "8", symbol: "X", sender: "A", target: "B", thread: "t1", fileName: "f", lineNumber: 1 }
    ];
    const nstatSamples = [{ epochMs: baseTime + 100, counters: { TcpRetransSegs: 5, TcpExtTCPTimeouts: 1 } }];
    const result = correlateFixLatency({ records, history: [], threshold: 5, nstatSamples });
    assert.equal(result.results.length, 1);
    assert.ok(result.results[0].signals.includes("nstat_retrans"));
    assert.ok(result.results[0].signals.includes("nstat_timeouts"));
    assert.equal(result.results[0].cause, "network");
  });

  it("determines kernel cause from nstat drops", () => {
    const records = [
      { receiveMs: baseTime + 200, sendingMs: baseTime + 150, lagMs: 50, endpoint: "10.1.2.3:100", direction: "IN", msgType: "8", symbol: "X", sender: "A", target: "B", thread: "t1", fileName: "f", lineNumber: 1 }
    ];
    const nstatSamples = [{ epochMs: baseTime + 100, counters: { TcpExtTCPBacklogDrop: 3, TcpExtTCPRcvQDrop: 1 } }];
    const result = correlateFixLatency({ records, history: [], threshold: 5, nstatSamples });
    assert.equal(result.results[0].cause, "kernel");
  });
});

describe("vmstat-parser", () => {
  it("parseVmstat parses vmstat -t 1 output", () => {
    const text = `procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu----- -----timestamp-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st                 UTC
 6  0      0 133807824      0 33235612    0    0     0 22920 242548 624537  2  3 95  0  0 2026-05-18 11:47:23
21  0      0 133832912      0 33205752    0    0     0 13584 290181 858563  5  3 92  0  0 2026-05-18 11:47:24
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu----- -----timestamp-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st                 UTC
 0  0      0 133824384      0 33218540    0    0     0  4636 259734 757811  3  3 94  0  0 2026-05-18 11:47:25`;
    const { samples } = parseVmstat(text);
    assert.equal(samples.length, 3);
    assert.equal(samples[0].r, 6);
    assert.equal(samples[0].us, 2);
    assert.equal(samples[0].sy, 3);
    assert.equal(samples[0].wa, 0);
    assert.equal(samples[0].cs, 624537);
    assert.equal(samples[0].free, 133807824);
    assert.equal(samples[1].r, 21);
    assert.equal(samples[1].cs, 858563);
    assert.ok(samples[0].epochMs < samples[1].epochMs);
    assert.equal(samples[2].r, 0);
  });

  it("parseNstatTimestamped parses timestamped nstat", () => {
    const text = `=== 2026-05-18T11:47:08,606571792+00:00 ===
TcpRetransSegs                  10                 0.0
TcpExtTCPTimeouts               0                  0.0
TcpExtTCPBacklogCoalesce        41                 0.0
=== 2026-05-18T11:47:09,612628626+00:00 ===
TcpRetransSegs                  8                  0.0
TcpExtTCPBacklogDrop            0                  0.0
TcpExtTCPSACKReorder            0                  0.0`;
    const { samples } = parseNstatTimestamped(text);
    assert.equal(samples.length, 2);
    assert.equal(samples[0].counters.TcpRetransSegs, 10);
    assert.equal(samples[0].counters.TcpExtTCPTimeouts, 0);
    assert.equal(samples[0].counters.TcpExtTCPBacklogCoalesce, 41);
    assert.equal(samples[1].counters.TcpRetransSegs, 8);
    assert.ok(samples[0].epochMs < samples[1].epochMs);
    assert.ok(samples[0].epochMs > 0);
  });

  it("vmstatSummary computes stats", () => {
    const samples = [
      { r: 2, b: 0, cs: 1000, us: 10, sy: 5, wa: 1, id: 84 },
      { r: 8, b: 1, cs: 3000, us: 60, sy: 20, wa: 5, id: 15 }
    ];
    const s = vmstatSummary(samples);
    assert.equal(s.count, 2);
    assert.equal(s.maxRunQueue, 8);
    assert.equal(s.avgRunQueue, 5);
    assert.equal(s.maxCs, 3000);
    assert.equal(s.maxWa, 5);
  });

  it("parseVmstat ignores header lines", () => {
    const text = `procs -----------memory----------
 r  b   swpd   free
------- ------`;
    const { samples } = parseVmstat(text);
    assert.equal(samples.length, 0);
  });
});
