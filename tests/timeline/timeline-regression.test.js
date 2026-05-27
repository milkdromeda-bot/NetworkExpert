import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSs } from "../../src/parsing/parser.js";
import { socketKey, stableSocketId, withStableSocketIds, timestampBlocks, parsedTimestampSnapshots, aggregateParsedSocketsByKey } from "../../src/timeline/timeline.js";
import { applyChartZoomOperation, clampZoomRange, nextZoomRange, zoomForMetric, zoomRangeFromDragSelection, DEFAULT_ZOOM, MIN_ZOOM_SPAN } from "../../src/charts/chart-zoom.js";

// socketKey
test("socketKey includes all three components", () => {
  const socket = { local: "10.0.0.1:80", peer: "10.0.0.2:443", state: "ESTAB" };
  assert.equal(socketKey(socket), "10.0.0.1:80|10.0.0.2:443|ESTAB");
});
test("socketKey differs for different states", () => {
  const s1 = { local: "10.0.0.1:80", peer: "10.0.0.2:443", state: "ESTAB" };
  const s2 = { local: "10.0.0.1:80", peer: "10.0.0.2:443", state: "CLOSE-WAIT" };
  assert.notEqual(socketKey(s1), socketKey(s2));
});
test("socketKey differs for different peers", () => {
  const s1 = { local: "10.0.0.1:80", peer: "10.0.0.2:443", state: "ESTAB" };
  const s2 = { local: "10.0.0.1:80", peer: "10.0.0.3:443", state: "ESTAB" };
  assert.notEqual(socketKey(s1), socketKey(s2));
});

// stableSocketId
test("stableSocketId is deterministic", () => {
  const socket = { local: "10.0.0.1:80", peer: "10.0.0.2:443", state: "ESTAB" };
  assert.equal(stableSocketId(socket), stableSocketId(socket));
});
test("stableSocketId starts with socket- prefix", () => {
  const socket = { local: "10.0.0.1:80", peer: "10.0.0.2:443", state: "ESTAB" };
  assert.ok(stableSocketId(socket).startsWith("socket-"));
});
test("stableSocketId differs for different sockets", () => {
  const s1 = { local: "10.0.0.1:80", peer: "10.0.0.2:443", state: "ESTAB" };
  const s2 = { local: "10.0.0.1:80", peer: "10.0.0.3:443", state: "ESTAB" };
  assert.notEqual(stableSocketId(s1), stableSocketId(s2));
});

// withStableSocketIds
test("withStableSocketIds adds id to each socket", () => {
  const sockets = parseSs("ESTAB 0 0 10.0.0.1:80 10.0.0.2:443\nESTAB 0 0 10.0.0.3:22 10.0.0.4:55555");
  const result = withStableSocketIds(sockets);
  assert.ok(result[0].id);
  assert.ok(result[1].id);
  assert.notEqual(result[0].id, result[1].id);
});
test("withStableSocketIds preserves socket fields", () => {
  const [socket] = withStableSocketIds(parseSs("ESTAB 0 0 10.0.0.1:80 10.0.0.2:443 rtt:5/0.5"));
  assert.equal(socket.state, "ESTAB");
  assert.equal(socket.localAddress.host, "10.0.0.1");
});

// timestampBlocks
test("timestampBlocks returns empty for empty input", () => {
  assert.deepEqual(timestampBlocks(""), []);
});
test("timestampBlocks returns empty for non-timestamped input", () => {
  assert.deepEqual(timestampBlocks("ESTAB 0 0 10.0.0.1:80 10.0.0.2:443"), []);
});
test("timestampBlocks parses single block", () => {
  const blocks = timestampBlocks("--- 2026-01-01 00:00:00 ---\nESTAB 0 0 10.0.0.1:80 10.0.0.2:443");
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].lines.length, 1);
});
test("timestampBlocks parses multiple blocks", () => {
  const raw = "--- 2026-01-01 00:00:00 ---\nESTAB 0 0 10.0.0.1:80 10.0.0.2:443\n--- 2026-01-01 00:00:01 ---\nESTAB 0 0 10.0.0.3:22 10.0.0.4:55555";
  const blocks = timestampBlocks(raw);
  assert.equal(blocks.length, 2);
});
test("timestampBlocks keeps multiple lines per block", () => {
  const raw = "--- 2026-01-01 00:00:00 ---\nESTAB 0 0 10.0.0.1:80 10.0.0.2:443\nESTAB 0 0 10.0.0.3:22 10.0.0.4:55555";
  const blocks = timestampBlocks(raw);
  assert.equal(blocks[0].lines.length, 2);
});

// parsedTimestampSnapshots
test("parsedTimestampSnapshots returns parsed sockets per block", () => {
  const raw = "--- 2026-01-01 00:00:00 ---\nESTAB 0 0 10.0.0.1:80 10.0.0.2:443 rtt:1/0.1";
  const snapshots = parsedTimestampSnapshots(raw);
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].sockets.length, 1);
  assert.ok(snapshots[0].epochMs > 0);
});

// aggregateParsedSocketsByKey
test("aggregateParsedSocketsByKey deduplicates by key", () => {
  const sockets = parseSs("ESTAB 0 0 10.0.0.1:80 10.0.0.2:443\nESTAB 0 0 10.0.0.1:80 10.0.0.2:443");
  const result = aggregateParsedSocketsByKey(sockets);
  assert.equal(result.length, 1);
  assert.equal(result[0].snapshotCount, 2);
});
test("aggregateParsedSocketsByKey keeps distinct sockets separate", () => {
  const sockets = parseSs("ESTAB 0 0 10.0.0.1:80 10.0.0.2:443\nESTAB 0 0 10.0.0.3:22 10.0.0.4:55555");
  const result = aggregateParsedSocketsByKey(sockets);
  assert.equal(result.length, 2);
});

// clampZoomRange
test("clampZoomRange clamps negative start", () => {
  const r = clampZoomRange(-0.5, 0.5);
  assert.equal(r.start, 0);
});
test("clampZoomRange clamps end above 1", () => {
  const r = clampZoomRange(0.5, 1.5);
  assert.equal(r.end, 1);
});
test("clampZoomRange enforces minimum span", () => {
  const r = clampZoomRange(0.5, 0.5);
  assert.ok(r.end - r.start >= MIN_ZOOM_SPAN);
});
test("clampZoomRange handles NaN start", () => {
  const r = clampZoomRange(NaN, 0.5);
  assert.equal(r.start, 0);
});
test("clampZoomRange handles NaN end", () => {
  const r = clampZoomRange(0, NaN);
  assert.equal(r.end, 1);
});
test("clampZoomRange handles both NaN", () => {
  const r = clampZoomRange(NaN, NaN);
  assert.deepEqual(r, { start: 0, end: 1 });
});

// zoomForMetric
test("zoomForMetric returns shared zoom when no metric", () => {
  const r = zoomForMetric({}, { start: 0.2, end: 0.8 }, null);
  assert.equal(r.start, 0.2);
  assert.equal(r.end, 0.8);
});
test("zoomForMetric returns metric zoom when available", () => {
  const r = zoomForMetric({ rtt: { start: 0.3, end: 0.7 } }, DEFAULT_ZOOM, "rtt");
  assert.equal(r.start, 0.3);
  assert.equal(r.end, 0.7);
});
test("zoomForMetric falls back to shared when metric not set", () => {
  const r = zoomForMetric({}, { start: 0.1, end: 0.9 }, "rtt");
  assert.equal(r.start, 0.1);
  assert.equal(r.end, 0.9);
});

// nextZoomRange
test("nextZoomRange resetZoom returns full range", () => {
  const r = nextZoomRange({ start: 0.3, end: 0.7 }, "resetZoom");
  assert.deepEqual(r, { start: 0, end: 1 });
});
test("nextZoomRange zoomIn narrows the range", () => {
  const r = nextZoomRange({ start: 0, end: 1 }, "zoomIn");
  assert.ok(r.end - r.start < 1);
});
test("nextZoomRange zoomOut widens the range", () => {
  const r = nextZoomRange({ start: 0.3, end: 0.7 }, "zoomOut");
  assert.ok(r.end - r.start > 0.4);
});
test("nextZoomRange panLeft shifts left", () => {
  const r = nextZoomRange({ start: 0.4, end: 0.6 }, "panLeft");
  assert.ok(r.start < 0.4);
});
test("nextZoomRange panRight shifts right", () => {
  const r = nextZoomRange({ start: 0.4, end: 0.6 }, "panRight");
  assert.ok(r.start > 0.4);
});
test("nextZoomRange panLeft does not go below 0", () => {
  const r = nextZoomRange({ start: 0, end: 0.1 }, "panLeft");
  assert.ok(r.start >= 0);
});
test("nextZoomRange panRight does not go above 1", () => {
  const r = nextZoomRange({ start: 0.9, end: 1 }, "panRight");
  assert.ok(r.end <= 1);
});
test("nextZoomRange unknown action returns current", () => {
  const r = nextZoomRange({ start: 0.3, end: 0.7 }, "unknownAction");
  assert.equal(r.start, 0.3);
  assert.equal(r.end, 0.7);
});

// zoomRangeFromDragSelection
test("zoomRangeFromDragSelection computes nested range", () => {
  const r = zoomRangeFromDragSelection({ start: 0, end: 1 }, 0.2, 0.8);
  assert.equal(r.start, 0.2);
  assert.equal(r.end, 0.8);
});
test("zoomRangeFromDragSelection handles reversed selection", () => {
  const r = zoomRangeFromDragSelection({ start: 0, end: 1 }, 0.8, 0.2);
  assert.equal(r.start, 0.2);
  assert.equal(r.end, 0.8);
});
test("zoomRangeFromDragSelection respects minimum span", () => {
  const r = zoomRangeFromDragSelection({ start: 0, end: 1 }, 0.5, 0.5);
  assert.ok(r.end - r.start >= MIN_ZOOM_SPAN);
});

// applyChartZoomOperation
test("applyChartZoomOperation shared zoom updates sharedZoom", () => {
  const result = applyChartZoomOperation({ action: "zoomIn", sharedZoom: DEFAULT_ZOOM, chartZoomByMetric: {} });
  assert.ok(result.sharedZoom.end - result.sharedZoom.start < 1);
  assert.equal(result.activeChartMetric, null);
});
test("applyChartZoomOperation metric zoom updates chartZoomByMetric", () => {
  const result = applyChartZoomOperation({ action: "zoomIn", metric: "rtt", sharedZoom: DEFAULT_ZOOM, chartZoomByMetric: {} });
  assert.ok(result.chartZoomByMetric.rtt);
  assert.equal(result.activeChartMetric, "rtt");
});
test("applyChartZoomOperation resetZoom on metric resets to full", () => {
  const result = applyChartZoomOperation({ action: "resetZoom", metric: "rtt", sharedZoom: DEFAULT_ZOOM, chartZoomByMetric: { rtt: { start: 0.3, end: 0.7 } } });
  assert.deepEqual(result.chartZoomByMetric.rtt, { start: 0, end: 1 });
});

// Generated: zoom boundary tests
const zoomBoundarySeeds = Array.from({ length: 20 }, (_, i) => ({
  start: (i * 3 % 20) / 20,
  end: Math.min(1, (i * 3 % 20) / 20 + 0.1 + (i % 5) * 0.15)
}));
for (const [i, seed] of zoomBoundarySeeds.entries()) {
  test(`zoom boundary ${i}: zoomIn stays bounded`, () => {
    const r = nextZoomRange(seed, "zoomIn");
    assert.ok(r.start >= 0);
    assert.ok(r.end <= 1);
    assert.ok(r.end - r.start >= MIN_ZOOM_SPAN);
  });
  test(`zoom boundary ${i}: zoomOut stays bounded`, () => {
    const r = nextZoomRange(seed, "zoomOut");
    assert.ok(r.start >= 0);
    assert.ok(r.end <= 1);
    assert.ok(r.end - r.start >= MIN_ZOOM_SPAN);
  });
}


// Generated: extensive panLeft/panRight boundary tests
const panSeeds = Array.from({ length: 25 }, (_, i) => ({
  start: i / 25,
  end: Math.min(1, i / 25 + 0.15)
}));
for (const [i, seed] of panSeeds.entries()) {
  test(`pan boundary ${i}: panLeft stays bounded`, () => {
    const r = nextZoomRange(seed, "panLeft");
    assert.ok(r.start >= 0);
    assert.ok(r.end <= 1);
    assert.ok(r.end - r.start >= MIN_ZOOM_SPAN);
  });
  test(`pan boundary ${i}: panRight stays bounded`, () => {
    const r = nextZoomRange(seed, "panRight");
    assert.ok(r.start >= 0);
    assert.ok(r.end <= 1);
    assert.ok(r.end - r.start >= MIN_ZOOM_SPAN);
  });
}

// Generated: drag selection boundary tests
const dragSeeds = Array.from({ length: 15 }, (_, i) => ({
  selStart: (i * 7 % 100) / 100,
  selEnd: Math.min(1, (i * 7 % 100) / 100 + 0.1 + (i % 4) * 0.2)
}));
for (const [i, { selStart, selEnd }] of dragSeeds.entries()) {
  test(`drag selection ${i}: produces valid range`, () => {
    const r = zoomRangeFromDragSelection(DEFAULT_ZOOM, selStart, selEnd);
    assert.ok(r.start >= 0);
    assert.ok(r.end <= 1);
    assert.ok(r.end - r.start >= MIN_ZOOM_SPAN);
  });
}
