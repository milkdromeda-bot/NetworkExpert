import assert from "node:assert/strict";
import { test } from "node:test";

import { detectTimelineStories, STORY_PATTERNS } from "../../src/timeline/timeline-stories.js";

function snap(timestamp, socketOverrides = {}) {
  const base = `${timestamp}
tcp ESTAB ${socketOverrides.recvQ || 0} ${socketOverrides.sendQ || 0} 10.0.0.10:50000 10.0.0.20:443 users:(("java",pid=42,fd=7)) ${socketOverrides.timer || ""} uid:1002 ino:12345 sk:abc skmem:(r${socketOverrides.skmemR || 0},rb4225792,t${socketOverrides.skmemT || 0},tb870400,f1280,w0,o0,bl0,d${socketOverrides.skmemD || 0}) ts sack cubic wscale:7,7 rto:${socketOverrides.rto || 201} rtt:0.051/0.009 mss:1448 cwnd:${socketOverrides.cwnd || 10} bytes_sent:1000 bytes_received:1000 segs_out:100 segs_in:100 send 2271372549bps delivery_rate 827428568bps rcv_space:${socketOverrides.rcvSpace || 245059} rcv_ssthresh:1171997${socketOverrides.backoff ? ` backoff:${socketOverrides.backoff}` : ""}${socketOverrides.rwndLimited ? ` rwnd_limited:${socketOverrides.rwndLimited}ms(${socketOverrides.rwndLimitedPct || 25}%)` : ""}`;
  return base;
}

function snapState(timestamp, state, socketOverrides = {}) {
  return `${timestamp}
tcp ${state} ${socketOverrides.recvQ || 0} ${socketOverrides.sendQ || 0} 10.0.0.10:50000 10.0.0.20:443 users:(("java",pid=42,fd=7)) ${socketOverrides.timer || ""} uid:1002 ino:12345 sk:abc skmem:(r${socketOverrides.skmemR || 0},rb4225792,t0,tb870400,f1280,w0,o0,bl0,d${socketOverrides.skmemD || 0}) ts sack cubic wscale:7,7 rto:${socketOverrides.rto || 201} rtt:0.051/0.009 mss:1448 cwnd:${socketOverrides.cwnd || 10} bytes_sent:1000 bytes_received:1000 segs_out:100 segs_in:100 send 2271372549bps delivery_rate 827428568bps rcv_space:${socketOverrides.rcvSpace || 245059} rcv_ssthresh:1171997${socketOverrides.backoff ? ` backoff:${socketOverrides.backoff}` : ""}`;
}

test("timeline stories returns empty for insufficient snapshots", () => {
  const stories = detectTimelineStories("tcp ESTAB 0 0 10.0.0.1:5000 10.0.0.2:443");
  assert.equal(stories.length, 0);
});

test("timeline stories detects peer-stopped-reading pattern", () => {
  const raw = [
    snap("2026-05-15T13:28:58,000+00:00", { sendQ: 100000 }),
    snap("2026-05-15T13:28:59,000+00:00", { sendQ: 512000 }),
    snap("2026-05-15T13:29:00,000+00:00", { sendQ: 600000, timer: "timer:(persist,1sec,0)", backoff: 1 }),
    snap("2026-05-15T13:29:02,000+00:00", { sendQ: 600000, timer: "timer:(persist,3sec,0)", backoff: 3 }),
    snapState("2026-05-15T13:29:04,000+00:00", "FIN-WAIT-1", { sendQ: 0 })
  ].join("\n");

  const stories = detectTimelineStories(raw);
  const peer = stories.find(s => s.patternId === "peer-stopped-reading");

  assert.notEqual(peer, undefined);
  assert.equal(peer.matchedSteps.length >= 2, true);
  assert.equal(peer.narrative.length >= 2, true);
  assert.equal(peer.narrative.at(-1).includes("peer"), true);
});

test("timeline stories detects local-overload pattern", () => {
  const raw = [
    snap("2026-05-15T13:28:58,000+00:00", { recvQ: 50000, skmemR: 50000, rcvSpace: 200000 }),
    snap("2026-05-15T13:28:59,000+00:00", { recvQ: 200000, skmemR: 200000, rcvSpace: 200000 }),
    snap("2026-05-15T13:29:00,000+00:00", { recvQ: 400000, skmemR: 400000, skmemD: 5, rcvSpace: 80000 })
  ].join("\n");

  const stories = detectTimelineStories(raw);
  const local = stories.find(s => s.patternId === "local-overload");

  assert.notEqual(local, undefined);
  assert.equal(local.matchedSteps.some(s => s.key === "recvQ-grow"), true);
});

test("timeline stories detects congestion-event pattern", () => {
  const raw = [
    snap("2026-05-15T13:28:58,000+00:00", { cwnd: 20, rto: 200 }),
    snap("2026-05-15T13:28:59,000+00:00", { cwnd: 3, rto: 200, timer: "timer:(on,200ms,1)" }),
    snap("2026-05-15T13:29:00,000+00:00", { cwnd: 3, rto: 1500, timer: "timer:(on,1500ms,2)" })
  ].join("\n");

  const stories = detectTimelineStories(raw);
  const congestion = stories.find(s => s.patternId === "congestion-event");

  assert.notEqual(congestion, undefined);
  assert.equal(congestion.matchedSteps.some(s => s.key === "cwnd-collapse"), true);
});

test("timeline stories includes narrative with timestamps", () => {
  const raw = [
    snap("2026-05-15T13:28:58,000+00:00", { sendQ: 100000 }),
    snap("2026-05-15T13:28:59,000+00:00", { sendQ: 512000 }),
    snap("2026-05-15T13:29:00,000+00:00", { sendQ: 600000, timer: "timer:(persist,1sec,0)", backoff: 2 })
  ].join("\n");

  const stories = detectTimelineStories(raw);
  assert.equal(stories.length > 0, true);
  const story = stories[0];
  assert.equal(story.narrative.some(line => /\d{2}:\d{2}:\d{2}/.test(line)), true);
});

test("timeline stories does not match when pattern is incomplete", () => {
  const raw = [
    snap("2026-05-15T13:28:58,000+00:00", { sendQ: 100 }),
    snap("2026-05-15T13:28:59,000+00:00", { sendQ: 200 }),
    snap("2026-05-15T13:29:00,000+00:00", { sendQ: 300 })
  ].join("\n");

  const stories = detectTimelineStories(raw);
  const peer = stories.find(s => s.patternId === "peer-stopped-reading");
  assert.equal(peer, undefined);
});

test("timeline stories sorts by completeness", () => {
  const raw = [
    snap("2026-05-15T13:28:58,000+00:00", { sendQ: 100000, recvQ: 50000, skmemR: 50000, rcvSpace: 200000 }),
    snap("2026-05-15T13:28:59,000+00:00", { sendQ: 512000, recvQ: 200000, skmemR: 200000, rcvSpace: 200000 }),
    snap("2026-05-15T13:29:00,000+00:00", { sendQ: 600000, timer: "timer:(persist,1sec,0)", backoff: 2, recvQ: 400000, skmemR: 400000, skmemD: 5, rcvSpace: 80000 })
  ].join("\n");

  const stories = detectTimelineStories(raw);
  if (stories.length >= 2) {
    assert.equal(stories[0].completeness >= stories[1].completeness, true);
  }
});

test("timeline stories exposes STORY_PATTERNS for extensibility", () => {
  assert.equal(Array.isArray(STORY_PATTERNS), true);
  assert.equal(STORY_PATTERNS.length >= 6, true);
  assert.equal(STORY_PATTERNS.every(p => p.id && p.title && p.steps.length >= 2), true);
});
