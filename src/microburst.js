function percentile(sortedValues, p) {
  if (!sortedValues.length) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const rank = (p / 100) * (sortedValues.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const weight = rank - lo;
  return sortedValues[lo] + (sortedValues[hi] - sortedValues[lo]) * weight;
}

function sortedMetric(rows, metric) {
  return rows
    .map(row => Number(row?.[metric] || 0))
    .filter(value => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
}

function microburstSeverity(burst, thresholds, rxP90, rxP99) {
  if (!burst) return "low";
  if (
    burst.dropDeltaTotal >= 10
    || burst.peakDropRate >= (thresholds.dropRate?.danger ?? 1)
    || burst.peakRecvQ >= (thresholds.recvQ?.danger ?? 524288)
    || burst.peakSkmemR >= (thresholds.skmemR?.danger ?? 524288)
    || (burst.peakRxBps >= rxP99 && burst.dropDeltaTotal > 0)
  ) return "critical";
  if (
    burst.dropDeltaTotal > 0
    || burst.peakRecvQ >= (thresholds.recvQ?.warn ?? 131072)
    || burst.peakSkmemR >= (thresholds.skmemR?.warn ?? 262144)
    || burst.peakRxBps >= rxP90
  ) return "high";
  return "medium";
}

export function detectMicroburstWindow(rows = [], thresholds = {}) {
  const samples = rows
    .filter(row => row?.socketPresent !== false && Number.isFinite(row?.epochMs))
    .map(row => ({
      ...row,
      recvQ: Number(row.recvQ || 0),
      skmemR: Number(row["skmem.r"] || 0),
      drops: Number(row["skmem.d"] || 0),
      dropRate: Number(row["skmem.d_rate"] || 0),
      rxBps: Number(row.rx_bps || 0)
    }));
  if (samples.length < 2) return null;

  const intervalSeconds = [];
  for (let i = 1; i < samples.length; i += 1) {
    const elapsed = (samples[i].epochMs - samples[i - 1].epochMs) / 1000;
    if (Number.isFinite(elapsed) && elapsed > 0) intervalSeconds.push(elapsed);
  }
  if (!intervalSeconds.length) return null;

  const shortWindowSeconds = Math.min(5, Math.max(1, percentile([...intervalSeconds].sort((a, b) => a - b), 50) * 3));
  const rxValues = sortedMetric(samples, "rxBps");
  if (!rxValues.length) return null;
  const rxMedian = percentile(rxValues, 50);
  const rxP90 = percentile(rxValues, 90);
  const rxP99 = percentile(rxValues, 99);
  const recvWarn = thresholds.recvQ?.warn ?? 131072;
  const recvDanger = thresholds.recvQ?.danger ?? 524288;
  const memWarn = thresholds.skmemR?.warn ?? 262144;
  const memDanger = thresholds.skmemR?.danger ?? 524288;
  const dropRateWarn = thresholds.dropRate?.warn ?? 0.1;

  const bursts = [];
  let current = null;

  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1];
    const row = samples[i];
    const elapsed = (row.epochMs - prev.epochMs) / 1000;
    if (!Number.isFinite(elapsed) || elapsed <= 0 || elapsed > shortWindowSeconds) {
      current = null;
      continue;
    }

    const dropDelta = Math.max(0, row.drops - prev.drops);
    const recvRise = Math.max(0, row.recvQ - prev.recvQ);
    const memRise = Math.max(0, row.skmemR - prev.skmemR);
    const rxRise = Math.max(0, row.rxBps - prev.rxBps);

    const recvSpike = row.recvQ >= recvWarn || (row.recvQ >= Math.max(recvWarn * 0.75, prev.recvQ * 1.5) && recvRise >= recvWarn * 0.5);
    const memSpike = row.skmemR >= memWarn || (row.skmemR >= Math.max(memWarn * 0.75, prev.skmemR * 1.35) && memRise >= memWarn * 0.35);
    const rxSpike = row.rxBps >= Math.max(rxP90, rxMedian * 2, 128000) || (prev.rxBps > 0 && row.rxBps >= prev.rxBps * 1.5 && rxRise >= Math.max(rxMedian, 64000));
    const dropSpike = dropDelta > 0 || row.dropRate >= dropRateWarn;
    const signalCount = [recvSpike, memSpike, rxSpike, dropSpike].filter(Boolean).length;
    const candidate = dropSpike && rxSpike && (recvSpike || memSpike) && signalCount >= 3;

    if (!candidate) {
      current = null;
      continue;
    }

    if (!current || prev.epochMs > current.endEpochMs + shortWindowSeconds * 1000) {
      current = {
        startEpochMs: prev.epochMs,
        endEpochMs: row.epochMs,
        durationSeconds: elapsed,
        intervals: 1,
        dropDeltaTotal: dropDelta,
        peakDropRate: Math.max(row.dropRate, elapsed ? dropDelta / elapsed : 0),
        peakRecvQ: row.recvQ,
        peakSkmemR: row.skmemR,
        peakRxBps: row.rxBps,
        signalCount,
        score: 0
      };
      bursts.push(current);
    } else {
      current.endEpochMs = row.epochMs;
      current.durationSeconds = Math.max(0.001, (current.endEpochMs - current.startEpochMs) / 1000);
      current.intervals += 1;
      current.dropDeltaTotal += dropDelta;
      current.peakDropRate = Math.max(current.peakDropRate, row.dropRate, elapsed ? dropDelta / elapsed : 0);
      current.peakRecvQ = Math.max(current.peakRecvQ, row.recvQ);
      current.peakSkmemR = Math.max(current.peakSkmemR, row.skmemR);
      current.peakRxBps = Math.max(current.peakRxBps, row.rxBps);
      current.signalCount = Math.max(current.signalCount, signalCount);
    }

    current.score = (
      current.dropDeltaTotal * 200
      + current.peakDropRate * 120
      + current.peakRecvQ / Math.max(1, recvDanger)
      + current.peakSkmemR / Math.max(1, memDanger)
      + current.peakRxBps / Math.max(1, rxP90 || current.peakRxBps || 1)
      + current.intervals * 12
    );
  }

  const best = bursts.sort((a, b) => b.score - a.score || b.dropDeltaTotal - a.dropDeltaTotal)[0];
  if (!best) return null;

  return {
    ...best,
    severity: microburstSeverity(best, thresholds, rxP90, rxP99),
    shortWindowSeconds,
    rxMedian,
    rxP90,
    rxP99
  };
}
