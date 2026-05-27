function percentile(sortedValues, p) {
  if (!sortedValues.length) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const rank = (p / 100) * (sortedValues.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const weight = rank - lo;
  return sortedValues[lo] + (sortedValues[hi] - sortedValues[lo]) * weight;
}

function metricStats(rows, metric) {
  const values = rows
    .map(row => Number(row?.[metric] || 0))
    .filter(value => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (!values.length) return null;
  return {
    count: values.length,
    p95: percentile(values, 95),
    p99: percentile(values, 99),
    p999: percentile(values, 99.9),
    max: values[values.length - 1]
  };
}

function windowSuspicion(peaks, thresholds, stats) {
  if (peaks.recvQ >= (thresholds.recvQ?.warn ?? 131072) && peaks.rtt >= Math.max(stats.rtt?.p95 || 0, thresholds.rtt?.warn ?? 150)) {
    return "receive-side pressure";
  }
  if (peaks.sendQ >= (thresholds.sendQ?.warn ?? 262144) && (peaks.rto >= Math.max(stats.rto?.p95 || 0, thresholds.rto?.warn ?? 1000) || peaks.rttvar >= Math.max(stats.rttvar?.p95 || 0, thresholds.rttvar?.warn ?? 80))) {
    return "peer-side drain issue";
  }
  if (peaks.rto >= Math.max(stats.rto?.p99 || 0, thresholds.rto?.warn ?? 1000) || peaks.rttvar >= Math.max(stats.rttvar?.p99 || 0, thresholds.rttvar?.warn ?? 80)) {
    return "path instability";
  }
  if (peaks.dropRate >= (thresholds.dropRate?.warn ?? 0.1)) {
    return "loss-driven tail";
  }
  return "tail latency spike";
}

function severityForTail(best, stats, thresholds) {
  if (!best) return "low";
  if (
    best.peaks.rto >= Math.max(stats.rto?.p999 || 0, thresholds.rto?.danger ?? 3000)
    || best.peaks.rtt >= Math.max(stats.rtt?.p999 || 0, thresholds.rtt?.danger ?? 300)
    || best.peaks.sendQ >= (thresholds.sendQ?.danger ?? 1048576)
    || best.peaks.recvQ >= (thresholds.recvQ?.danger ?? 524288)
    || best.peaks.dropRate >= (thresholds.dropRate?.danger ?? 1)
  ) return "critical";
  if (
    best.peaks.rto >= Math.max(stats.rto?.p99 || 0, thresholds.rto?.warn ?? 1000)
    || best.peaks.rtt >= Math.max(stats.rtt?.p99 || 0, thresholds.rtt?.warn ?? 150)
    || best.peaks.sendQ >= (thresholds.sendQ?.warn ?? 262144)
    || best.peaks.recvQ >= (thresholds.recvQ?.warn ?? 131072)
  ) return "high";
  return "medium";
}

export function detectTailLatencyLens(rows = [], thresholds = {}) {
  const samples = rows
    .filter(row => row?.socketPresent !== false && Number.isFinite(row?.epochMs))
    .map(row => ({
      ...row,
      rtt: Number(row.rtt || 0),
      rttvar: Number(row.rttvar || 0),
      rto: Number(row.rto || 0),
      sendQ: Number(row.sendQ || 0),
      recvQ: Number(row.recvQ || 0),
      dropRate: Number(row["skmem.d_rate"] || 0)
    }));
  if (samples.length < 3) return null;

  const stats = {
    rtt: metricStats(samples, "rtt"),
    rttvar: metricStats(samples, "rttvar"),
    rto: metricStats(samples, "rto"),
    sendQ: metricStats(samples, "sendQ"),
    recvQ: metricStats(samples, "recvQ"),
    dropRate: metricStats(samples, "dropRate")
  };
  if (!stats.rtt && !stats.rto) return null;

  const intervals = [];
  for (let i = 1; i < samples.length; i += 1) {
    const elapsed = (samples[i].epochMs - samples[i - 1].epochMs) / 1000;
    if (Number.isFinite(elapsed) && elapsed > 0) intervals.push(elapsed);
  }
  const medianInterval = percentile([...intervals].sort((a, b) => a - b), 50) || 1;
  const windowSeconds = Math.min(15, Math.max(4, medianInterval * 8));

  let best = null;
  for (let start = 0; start < samples.length - 1; start += 1) {
    const startEpochMs = samples[start].epochMs;
    let end = start;
    while (end + 1 < samples.length && (samples[end + 1].epochMs - startEpochMs) / 1000 <= windowSeconds) end += 1;
    if (end <= start) continue;
    const slice = samples.slice(start, end + 1);
    const peaks = {
      rtt: Math.max(...slice.map(row => row.rtt)),
      rttvar: Math.max(...slice.map(row => row.rttvar)),
      rto: Math.max(...slice.map(row => row.rto)),
      sendQ: Math.max(...slice.map(row => row.sendQ)),
      recvQ: Math.max(...slice.map(row => row.recvQ)),
      dropRate: Math.max(...slice.map(row => row.dropRate))
    };
    const score = (
      (stats.rtt?.p99 ? peaks.rtt / Math.max(1, stats.rtt.p99) : 0) * 2.2
      + (stats.rto?.p99 ? peaks.rto / Math.max(1, stats.rto.p99) : 0) * 2.3
      + (stats.rttvar?.p99 ? peaks.rttvar / Math.max(1, stats.rttvar.p99) : 0) * 1.4
      + peaks.sendQ / Math.max(1, thresholds.sendQ?.warn ?? 262144)
      + peaks.recvQ / Math.max(1, thresholds.recvQ?.warn ?? 131072)
      + peaks.dropRate / Math.max(0.01, thresholds.dropRate?.warn ?? 0.1)
    );
    const significant = peaks.rtt >= Math.max(stats.rtt?.p95 || 0, thresholds.rtt?.warn ?? 150)
      || peaks.rto >= Math.max(stats.rto?.p95 || 0, thresholds.rto?.warn ?? 1000)
      || peaks.sendQ >= (thresholds.sendQ?.warn ?? 262144)
      || peaks.recvQ >= (thresholds.recvQ?.warn ?? 131072)
      || peaks.dropRate >= (thresholds.dropRate?.warn ?? 0.1);
    if (!significant) continue;
    const candidate = {
      startEpochMs,
      endEpochMs: samples[end].epochMs,
      durationSeconds: Math.max(0.001, (samples[end].epochMs - startEpochMs) / 1000),
      peaks,
      score
    };
    if (!best || candidate.score > best.score) best = candidate;
  }

  if (!best) return null;
  const suspicion = windowSuspicion(best.peaks, thresholds, stats);
  return {
    severity: severityForTail(best, stats, thresholds),
    windowSeconds,
    suspicion,
    stats,
    ...best
  };
}
