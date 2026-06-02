const CHART_METRICS = [
  "tx_bps",
  "rx_bps",
  "delivery_rate",
  "pacing_rate",
  "rtt",
  "rttvar",
  "rto",
  "rcv_rtt",
  "rcv_space",
  "rcv_ssthresh",
  "sendQ",
  "recvQ",
  "cwnd",
  "ato",
  "skmem.r",
  "skmem.rb",
  "skmem.t",
  "skmem.d",
  "skmem.d_rate",
  "bytes_sent",
  "bytes_acked",
  "bytes_received",
  "segs_out",
  "segs_in",
  "backoff",
  "retrans"
];

export function chartMetricList() {
  return [...CHART_METRICS];
}

export function createHistoryController(getDeps) {
  const current = () => getDeps();

  function selectedSocket() {
    const { socketsById, state } = current();
    return socketsById().get(state.selectedId) || state.sockets[0];
  }

  function buildHistory() {
    const { metricValue, state } = current();
    const realHistory = buildHistoryFromTimestampedSnapshots();
    if (realHistory.length >= 1) {
      state.history = realHistory;
      return;
    }
    const base = selectedSocket();
    const syntheticStart = Date.now();
    state.history = Array.from({ length: state.prefs.graphWindow }, (_, i) => {
      const wobble = Math.sin(i / 2.7) * 0.16 + Math.cos(i / 4.3) * 0.09;
      const row = { t: i * state.prefs.sampling, epochMs: syntheticStart + i * state.prefs.sampling * 1000 };
      for (const metric of chartMetricList()) row[metric] = Math.max(0, metricValue(base, metric) * (1 + wobble + (i % 7 === 0 ? 0.18 : 0)));
      row.tx_bps = metricValue(base, "delivery_rate") || metricValue(base, "pacing_rate") || 0;
      row.rx_bps = 0;
      return row;
    });
  }

  function buildHistoryFromTimestampedSnapshots() {
    const { buildSocketHistoryFromSnapshots } = current();
    const snapshots = parsedTimestampSnapshots();
    if (!snapshots.length) return [];
    const selected = selectedSocket();
    if (!selected) return [];
    return addBandwidthDerivatives(buildSocketHistoryFromSnapshots(snapshots, selected));
  }

  function timestampBlocks() {
    const { splitTimestampBlocks, state } = current();
    if (state.cache.timestampRawVersion === state.rawVersion) return state.cache.timestampBlocks;
    const blocks = splitTimestampBlocks(state.raw);
    state.cache.timestampRawVersion = state.rawVersion;
    state.cache.timestampBlocks = blocks;
    return blocks;
  }

  function parsedTimestampSnapshots() {
    const { compressSnapshots, iterateCompressed, parseTimestampedSnapshots, state } = current();
    if (state.cache.snapshotRawVersion === state.rawVersion) {
      if (state.cache.compressedSnapshots) {
        return [...iterateCompressed(state.cache.compressedSnapshots)];
      }
      return state.cache.timestampSnapshots;
    }
    const snapshots = parseTimestampedSnapshots(state.raw);
    state.cache.snapshotRawVersion = state.rawVersion;
    if (snapshots.length > 20) {
      state.cache.compressedSnapshots = compressSnapshots(snapshots);
      state.cache.timestampSnapshots = null;
    } else {
      state.cache.compressedSnapshots = null;
      state.cache.timestampSnapshots = snapshots;
    }
    return snapshots;
  }

  function buildSocketBandwidthIndex() {
    const { metricValue, socketIdentityKey } = current();
    const samples = {};
    for (const block of parsedTimestampSnapshots()) {
      for (const socket of block.sockets) {
        const key = socketIdentityKey(socket);
        const currentSample = {
          epochMs: block.epochMs,
          bytes_acked: metricValue(socket, "bytes_acked"),
          bytes_received: metricValue(socket, "bytes_received"),
          delivery_rate: metricValue(socket, "delivery_rate"),
          pacing_rate: metricValue(socket, "pacing_rate")
        };
        samples[key] = samples[key] ? [samples[key][1], currentSample] : [null, currentSample];
      }
    }
    return Object.fromEntries(Object.entries(samples).map(([key, [prev, currentSample]]) => {
      const elapsed = prev ? Math.max(0.001, (currentSample.epochMs - prev.epochMs) / 1000) : 0;
      const txBytes = prev ? Math.max(0, currentSample.bytes_acked - prev.bytes_acked) : 0;
      const rxBytes = prev ? Math.max(0, currentSample.bytes_received - prev.bytes_received) : 0;
      return [key, {
        tx_bps: elapsed ? (txBytes * 8) / elapsed : (currentSample.delivery_rate || currentSample.pacing_rate || 0),
        rx_bps: elapsed ? (rxBytes * 8) / elapsed : 0,
        delivery_rate: currentSample.delivery_rate,
        pacing_rate: currentSample.pacing_rate
      }];
    }));
  }

  function socketBandwidth(socket, metric) {
    const { metricValue, socketIdentityKey, state } = current();
    if (!socket) return 0;
    const indexed = state.bandwidthIndex?.[socketIdentityKey(socket)];
    if (indexed?.[metric] != null) return indexed[metric];
    if (metric === "tx_bps") return metricValue(socket, "delivery_rate") || metricValue(socket, "pacing_rate") || 0;
    return 0;
  }

  function addBandwidthDerivatives(rows) {
    return rows.map((row, index) => {
      const prev = rows[index - 1];
      const elapsed = prev ? Math.max(0.001, (row.epochMs - prev.epochMs) / 1000) : 0;
      const txBytes = prev ? Math.max(0, (row.bytes_acked || 0) - (prev.bytes_acked || 0)) : 0;
      const rxBytes = prev ? Math.max(0, (row.bytes_received || 0) - (prev.bytes_received || 0)) : 0;
      const sameObservedSocket = prev && row.socketPresent !== false && prev.socketPresent !== false;
      const dropDelta = sameObservedSocket ? Math.max(0, (row["skmem.d"] || 0) - (prev["skmem.d"] || 0)) : 0;
      return {
        ...row,
        tx_bps: elapsed ? (txBytes * 8) / elapsed : 0,
        rx_bps: elapsed ? (rxBytes * 8) / elapsed : 0,
        "skmem.d_rate": elapsed ? dropDelta / elapsed : 0
      };
    });
  }

  function hasTimestampedRawData() {
    return timestampBlocks().length >= 2;
  }

  function dropRateSummary(rows) {
    const { state } = current();
    const historyRows = rows === undefined ? state.history : rows;
    if (!hasTimestampedRawData() || historyRows.length < 2) return null;
    let totalDropDelta = 0;
    let peakDropRate = 0;
    let intervals = 0;
    let firstGrowth = null;
    let lastGrowth = null;
    for (let i = 1; i < historyRows.length; i += 1) {
      const prev = historyRows[i - 1];
      const row = historyRows[i];
      if (row.socketPresent === false || prev.socketPresent === false) continue;
      const elapsed = Math.max(0.001, ((row.epochMs || 0) - (prev.epochMs || 0)) / 1000);
      if (!Number.isFinite(elapsed) || elapsed <= 0) continue;
      const dropDelta = Math.max(0, Number(row["skmem.d"] || 0) - Number(prev["skmem.d"] || 0));
      if (!dropDelta) continue;
      const rate = dropDelta / elapsed;
      totalDropDelta += dropDelta;
      peakDropRate = Math.max(peakDropRate, rate);
      intervals += 1;
      firstGrowth ??= prev.epochMs;
      lastGrowth = row.epochMs;
    }
    if (!totalDropDelta) return null;
    const observedSeconds = Math.max(0.001, ((historyRows[historyRows.length - 1].epochMs || 0) - (historyRows[0].epochMs || 0)) / 1000);
    const avgDropRate = totalDropDelta / observedSeconds;
    return {
      totalDropDelta,
      observedSeconds,
      avgDropRate,
      peakDropRate,
      cadenceSeconds: avgDropRate ? 1 / avgDropRate : Number.POSITIVE_INFINITY,
      intervals,
      firstGrowth,
      lastGrowth
    };
  }

  function dropRateSeverity(summary) {
    if (!summary) return "low";
    if (summary.avgDropRate >= 1 || summary.peakDropRate >= 5 || summary.totalDropDelta >= 100) return "critical";
    if (summary.avgDropRate >= 0.1 || summary.peakDropRate >= 1 || summary.totalDropDelta >= 10) return "high";
    return "medium";
  }

  function microburstSummary(rows) {
    const { detectMicroburstWindow, state, thresholdFor } = current();
    const historyRows = rows === undefined ? state.history : (rows || []);
    const useCache = rows === undefined || rows === state.history;
    const key = `${state.selectedId || "none"}|${historyRows.length}|${historyRows[0]?.epochMs || 0}|${historyRows[historyRows.length - 1]?.epochMs || 0}|${state.dataVersion}`;
    if (useCache && state.cache.microburstKey === key) return state.cache.microburstSummary;
    const summary = detectMicroburstWindow(historyRows, {
      recvQ: thresholdFor("recvQ"),
      skmemR: thresholdFor("skmem.r"),
      dropRate: thresholdFor("skmem.d_rate")
    });
    if (useCache) {
      state.cache.microburstKey = key;
      state.cache.microburstSummary = summary;
    }
    return summary;
  }

  function tailLatencyLens(rows) {
    const { detectTailLatencyLens, state, thresholdFor } = current();
    const historyRows = rows === undefined ? state.history : (rows || []);
    const useCache = rows === undefined || rows === state.history;
    const key = `${state.selectedId || "none"}|${historyRows.length}|${historyRows[0]?.epochMs || 0}|${historyRows[historyRows.length - 1]?.epochMs || 0}|${state.dataVersion}`;
    if (useCache && state.cache.tailLatencyKey === key) return state.cache.tailLatencySummary;
    const summary = detectTailLatencyLens(historyRows, {
      rtt: thresholdFor("rtt"),
      rttvar: thresholdFor("rttvar"),
      rto: thresholdFor("rto"),
      sendQ: thresholdFor("sendQ"),
      recvQ: thresholdFor("recvQ"),
      dropRate: thresholdFor("skmem.d_rate")
    });
    if (useCache) {
      state.cache.tailLatencyKey = key;
      state.cache.tailLatencySummary = summary;
    }
    return summary;
  }

  function formatDurationCompact(seconds) {
    const { formatNumber } = current();
    const value = Number(seconds || 0);
    if (!Number.isFinite(value)) return "unknown duration";
    if (value < 1) return `${formatNumber(value * 1000)} ms`;
    if (value < 60) return `${formatNumber(value)} s`;
    if (value < 3600) return `${formatNumber(value / 60)} min`;
    return `${formatNumber(value / 3600)} h`;
  }

  function formatDropCadence(summary) {
    if (!summary?.avgDropRate) return "no increasing drop cadence";
    return `1 drop every ${formatDurationCompact(summary.cadenceSeconds)}`;
  }

  function formatMicroburstWindow(summary) {
    const { timeLabel } = current();
    if (!summary) return "no microburst window";
    return `${timeLabel(0, summary.startEpochMs)} -> ${timeLabel(0, summary.endEpochMs)} over ${formatDurationCompact(summary.durationSeconds)}`;
  }

  function formatTailLatencyWindow(summary) {
    const { timeLabel } = current();
    if (!summary) return "no tail window";
    return `${timeLabel(0, summary.startEpochMs)} -> ${timeLabel(0, summary.endEpochMs)} over ${formatDurationCompact(summary.durationSeconds)}`;
  }

  return {
    addBandwidthDerivatives,
    buildHistory,
    buildHistoryFromTimestampedSnapshots,
    buildSocketBandwidthIndex,
    dropRateSeverity,
    dropRateSummary,
    formatDropCadence,
    formatDurationCompact,
    formatMicroburstWindow,
    formatTailLatencyWindow,
    hasTimestampedRawData,
    microburstSummary,
    parsedTimestampSnapshots,
    socketBandwidth,
    tailLatencyLens,
    timestampBlocks
  };
}
