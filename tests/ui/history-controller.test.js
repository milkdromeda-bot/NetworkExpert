import assert from "node:assert/strict";
import { test } from "node:test";

import { chartMetricList, createHistoryController } from "../../src/rendering/history-controller.js";

function createContext(overrides = {}) {
  const selectedSocket = { id: "s1", key: "socket-1", delivery_rate: 1200, pacing_rate: 900 };
  const state = {
    bandwidthIndex: null,
    cache: {},
    dataVersion: 1,
    history: [],
    prefs: { graphWindow: 3, sampling: 2 },
    raw: "raw",
    rawVersion: 1,
    selectedId: "s1",
    sockets: [selectedSocket]
  };
  const context = {
    state,
    buildSocketHistoryFromSnapshots: () => [],
    compressSnapshots: snapshots => ({ snapshots }),
    detectMicroburstWindow: () => null,
    detectTailLatencyLens: () => null,
    formatNumber: value => String(Number(value.toFixed ? value.toFixed(3) : value)),
    iterateCompressed: compressed => compressed.snapshots,
    metricValue: (socket, metric) => Number(socket?.[metric] || 0),
    parseTimestampedSnapshots: () => [],
    socketIdentityKey: socket => socket.key,
    socketsById: () => new Map([[selectedSocket.id, selectedSocket]]),
    splitTimestampBlocks: () => [0, 1],
    thresholdFor: metric => ({ recvQ: 10, "skmem.r": 20, "skmem.d_rate": 2, rtt: 3, rttvar: 4, rto: 5, sendQ: 6 }[metric] || 1),
    timeLabel: (_seconds, epochMs) => `t${epochMs}`,
    ...overrides
  };
  return { context, history: createHistoryController(() => context), selectedSocket, state };
}

test("history controller exposes chart metrics without shared mutation", () => {
  const metrics = chartMetricList();
  metrics.pop();

  assert.equal(chartMetricList().includes("retrans"), true);
  assert.equal(chartMetricList()[0], "tx_bps");
});

test("history controller builds timestamped history with bandwidth derivatives", () => {
  const rows = [
    { epochMs: 1000, bytes_acked: 0, bytes_received: 0, "skmem.d": 0, socketPresent: true },
    { epochMs: 2000, bytes_acked: 10, bytes_received: 4, "skmem.d": 2, socketPresent: true },
    { epochMs: 3000, bytes_acked: 25, bytes_received: 9, "skmem.d": 5, socketPresent: true }
  ];
  const { context, history, selectedSocket, state } = createContext({
    buildSocketHistoryFromSnapshots: (snapshots, socket) => {
      assert.deepEqual(snapshots, [{ sockets: [] }]);
      assert.equal(socket, selectedSocket);
      return rows;
    },
    parseTimestampedSnapshots: () => [{ sockets: [] }]
  });

  history.buildHistory();

  assert.equal(context.state.cache.snapshotRawVersion, 1);
  assert.equal(state.history.length, 3);
  assert.equal(state.history[1].tx_bps, 80);
  assert.equal(state.history[2].rx_bps, 40);
  assert.equal(state.history[2]["skmem.d_rate"], 3);
});

test("history controller builds bandwidth index from the latest socket samples", () => {
  const { history } = createContext({
    parseTimestampedSnapshots: () => [
      { epochMs: 1000, sockets: [{ key: "a", bytes_acked: 100, bytes_received: 40, delivery_rate: 500, pacing_rate: 700 }] },
      { epochMs: 3000, sockets: [{ key: "a", bytes_acked: 300, bytes_received: 90, delivery_rate: 600, pacing_rate: 800 }] }
    ]
  });

  const index = history.buildSocketBandwidthIndex();

  assert.equal(index.a.tx_bps, 800);
  assert.equal(index.a.rx_bps, 200);
  assert.equal(index.a.delivery_rate, 600);
});

test("history controller summarizes drop cadence and cached lenses", () => {
  let microburstCalls = 0;
  const { history, state } = createContext({
    detectMicroburstWindow: (rows, thresholds) => {
      microburstCalls += 1;
      assert.equal(rows, state.history);
      assert.deepEqual(thresholds, { recvQ: 10, skmemR: 20, dropRate: 2 });
      return { durationSeconds: 2, endEpochMs: 3000, startEpochMs: 1000 };
    }
  });
  state.history = [
    { epochMs: 1000, "skmem.d": 0, socketPresent: true },
    { epochMs: 2000, "skmem.d": 5, socketPresent: true },
    { epochMs: 3000, "skmem.d": 7, socketPresent: true }
  ];

  const summary = history.dropRateSummary();
  const microburst = history.microburstSummary();

  assert.equal(summary.totalDropDelta, 7);
  assert.equal(summary.peakDropRate, 5);
  assert.equal(history.dropRateSeverity(summary), "critical");
  assert.equal(history.formatDropCadence(summary), "1 drop every 285.714 ms");
  assert.equal(history.microburstSummary(), microburst);
  assert.equal(microburstCalls, 1);
  assert.equal(history.formatMicroburstWindow(microburst), "t1000 -> t3000 over 2 s");
});
