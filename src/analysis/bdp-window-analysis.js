import { metricValue } from "../parsing/parser.js";

const TCP_WINDOW_NO_SCALE_BYTES = 65535;
const LOW_RCV_SPACE_BYTES = 8 * 1024;
const RECEIVE_MEMORY_PRESSURE_RATIO = 0.85;
const DEFAULT_RECV_Q_WARN_BYTES = 128 * 1024;
const HIGH_RTT_MS = 100;
const HIGH_RETRANS_COUNT = 3;
const LOW_CWND_SEGMENTS = 4;
const DEFAULT_NEAR_WINDOW_RATIO = 0.75;
const DEFAULT_STRONG_WINDOW_RATIO = 0.9;
const DEFAULT_MIN_CONSECUTIVE = 3;

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveNumber(value) {
  const number = finiteNumber(value);
  return number != null && number > 0 ? number : null;
}

function formatMbps(value) {
  const mbps = Number(value || 0) / 1e6;
  if (mbps >= 100) return `${mbps.toFixed(0)} Mbps`;
  if (mbps >= 10) return `${mbps.toFixed(1)} Mbps`;
  if (mbps > 0) return `${mbps.toFixed(2)} Mbps`;
  return "0 Mbps";
}

function formatBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes)} B`;
}

function formatRatio(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function rowNumber(row, ...keys) {
  for (const key of keys) {
    if (Object.hasOwn(row || {}, key)) {
      const value = finiteNumber(row[key]);
      if (value != null) return value;
    }
  }
  return null;
}

function socketMetricOrNull(socket, metric) {
  if (!socket) return null;
  if (metric === "recvQ") return finiteNumber(socket.recvQ) ?? 0;
  if (metric === "sendQ") return finiteNumber(socket.sendQ) ?? 0;
  if (metric.startsWith("skmem.")) {
    const key = metric.split(".")[1];
    if (!Object.hasOwn(socket?.details?.skmem || {}, key)) return null;
    return finiteNumber(metricValue(socket, metric));
  }
  if (!Object.hasOwn(socket?.details?.values || {}, metric)) return null;
  return finiteNumber(metricValue(socket, metric));
}

function socketScale(socket, direction) {
  const pair = socket?.details?.values?.wscale;
  if (!pair) return null;
  const value = direction === "outbound" ? pair.send : pair.receive;
  const scale = finiteNumber(value);
  return scale != null && scale >= 0 && scale <= 14 ? scale : null;
}

function scaleCapabilityBytes(scale) {
  return scale == null ? null : TCP_WINDOW_NO_SCALE_BYTES * (2 ** scale);
}

function effectiveWindowForSample(sample, scale, direction) {
  const rcvSpace = positiveNumber(sample.rcvSpace);
  if (rcvSpace != null) {
    return { bytes: rcvSpace, source: "rcv_space", estimated: false };
  }
  const advertised = direction === "outbound"
    ? positiveNumber(sample.sndWnd)
    : positiveNumber(sample.rcvWnd);
  if (advertised != null && scale != null) {
    return {
      bytes: advertised * (2 ** scale),
      source: `${direction === "outbound" ? "snd_wnd" : "rcv_wnd"}+wscale`,
      estimated: true
    };
  }
  return { bytes: null, source: "unavailable", estimated: true };
}

function rowToRawSample(row, socket, direction) {
  const timerName = String(row?.timerName || row?.timer || "").toLowerCase();
  return {
    socketId: row?.socketId || socket?.id || "",
    t: finiteNumber(row?.t),
    epochMs: finiteNumber(row?.epochMs),
    socketPresent: row?.socketPresent !== false,
    counterBytes: direction === "outbound"
      ? rowNumber(row, "bytes_sent", "bytesSent")
      : rowNumber(row, "bytes_received", "bytesReceived"),
    rttMs: rowNumber(row, "rtt", "minrtt", "rcv_rtt", "rcvRtt"),
    rcvSpace: rowNumber(row, "rcv_space", "rcvSpace"),
    rcvWnd: rowNumber(row, "rcv_wnd", "rcvWnd"),
    sndWnd: rowNumber(row, "snd_wnd", "sndWnd"),
    deliveryRateBps: rowNumber(row, "delivery_rate", "deliveryRate"),
    pacingRateBps: rowNumber(row, "pacing_rate", "pacingRate"),
    recvQ: rowNumber(row, "recvQ", "recv_q"),
    sendQ: rowNumber(row, "sendQ", "send_q"),
    skmemR: rowNumber(row, "skmem.r", "skmemR"),
    skmemRb: rowNumber(row, "skmem.rb", "skmemRb"),
    retrans: rowNumber(row, "retrans"),
    cwnd: rowNumber(row, "cwnd"),
    timerName,
    persist: timerName === "persist"
  };
}

function currentRawSample(socket, direction) {
  const timerName = String(socket?.details?.timer?.name || "").toLowerCase();
  return {
    socketId: socket?.id || "",
    t: null,
    epochMs: finiteNumber(socket?.lastSeenMs),
    socketPresent: Boolean(socket),
    counterBytes: direction === "outbound"
      ? socketMetricOrNull(socket, "bytes_sent")
      : socketMetricOrNull(socket, "bytes_received"),
    rttMs: socketMetricOrNull(socket, "rtt") ?? socketMetricOrNull(socket, "minrtt") ?? socketMetricOrNull(socket, "rcv_rtt"),
    rcvSpace: socketMetricOrNull(socket, "rcv_space"),
    rcvWnd: socketMetricOrNull(socket, "rcv_wnd"),
    sndWnd: socketMetricOrNull(socket, "snd_wnd"),
    deliveryRateBps: socketMetricOrNull(socket, "delivery_rate"),
    pacingRateBps: socketMetricOrNull(socket, "pacing_rate"),
    recvQ: finiteNumber(socket?.recvQ) ?? 0,
    sendQ: finiteNumber(socket?.sendQ) ?? 0,
    skmemR: socketMetricOrNull(socket, "skmem.r"),
    skmemRb: socketMetricOrNull(socket, "skmem.rb"),
    retrans: finiteNumber(socket?.details?.timer?.retrans) ?? 0,
    cwnd: socketMetricOrNull(socket, "cwnd"),
    timerName,
    persist: timerName === "persist"
  };
}

function samplesFromHistory(socket, history, direction) {
  const rows = history
    .filter(row => row?.socketPresent !== false)
    .filter(row => !row?.socketId || !socket?.id || row.socketId === socket.id)
    .map(row => rowToRawSample(row, socket, direction));
  if (rows.length) return rows;
  const current = currentRawSample(socket, direction);
  return current.socketPresent ? [current] : [];
}

function maxConsecutive(samples, predicate) {
  let best = 0;
  let current = 0;
  for (const sample of samples) {
    if (predicate(sample)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

function peak(samples, key) {
  return samples.reduce((best, sample) => {
    const value = finiteNumber(sample[key]);
    return value != null && value > best ? value : best;
  }, 0);
}

export function bdpWindowTechnicalNotes() {
  return [
    "Physical link capacity is the provisioned or negotiated line rate. This tool does not infer it unless the user configures it.",
    "Observed throughput is the measured byte delta over time for this socket and selected direction.",
    "Observed BDP is observed throughput multiplied by RTT; it estimates how much in-flight data this observed rate needs.",
    "Target BDP requires a known capacity: configured capacity multiplied by RTT. Without capacity, the analysis remains relative to observed throughput.",
    "Window-limited theoretical throughput is effective TCP window bytes multiplied by 8 and divided by RTT seconds.",
    "Window scaling only describes negotiated scaling capacity from the handshake; it is not the current receive window."
  ];
}

export function buildBdpWindowSeries(socket, {
  history = [],
  direction = "inbound",
  configuredLinkCapacityMbps = null
} = {}) {
  const scale = socketScale(socket, direction);
  const scaleWindowBytes = scaleCapabilityBytes(scale);
  const capacityBps = positiveNumber(configuredLinkCapacityMbps) != null ? Number(configuredLinkCapacityMbps) * 1e6 : null;
  const rawSamples = samplesFromHistory(socket, history, direction);
  const samples = rawSamples.map((sample, index) => {
    const prev = rawSamples[index - 1];
    const elapsedSeconds = prev?.epochMs != null && sample.epochMs != null
      ? (sample.epochMs - prev.epochMs) / 1000
      : sample.t != null && prev?.t != null
        ? sample.t - prev.t
        : 0;
    const deltaBytes = prev && sample.counterBytes != null && prev.counterBytes != null
      ? sample.counterBytes - prev.counterBytes
      : null;
    const counterReset = deltaBytes != null && deltaBytes < 0;
    const observedThroughputBps = elapsedSeconds > 0 && deltaBytes != null && deltaBytes >= 0
      ? deltaBytes * 8 / elapsedSeconds
      : null;
    const rttSeconds = positiveNumber(sample.rttMs) != null ? sample.rttMs / 1000 : null;
    const window = effectiveWindowForSample(sample, scale, direction);
    const throughputMaxByRcvSpaceBps = window.bytes != null && rttSeconds
      ? window.bytes * 8 / rttSeconds
      : null;
    const observedBdpBytes = observedThroughputBps != null && rttSeconds
      ? observedThroughputBps * rttSeconds / 8
      : null;
    const noScaleThroughputBps = rttSeconds
      ? TCP_WINDOW_NO_SCALE_BYTES * 8 / rttSeconds
      : null;
    const scaleCapabilityThroughputBps = scaleWindowBytes != null && rttSeconds
      ? scaleWindowBytes * 8 / rttSeconds
      : null;
    const targetBdpBytes = capacityBps != null && rttSeconds ? capacityBps * rttSeconds / 8 : null;
    const throughputToWindowRatio = observedThroughputBps != null && throughputMaxByRcvSpaceBps
      ? observedThroughputBps / throughputMaxByRcvSpaceBps
      : null;
    const bdpToWindowRatio = observedBdpBytes != null && window.bytes
      ? observedBdpBytes / window.bytes
      : null;
    const receiveRatio = sample.skmemRb > 0 ? (sample.skmemR || 0) / sample.skmemRb : 0;
    return {
      ...sample,
      direction,
      elapsedSeconds,
      deltaBytes,
      counterReset,
      observedThroughputBps,
      rttSeconds,
      effectiveWindowBytes: window.bytes,
      effectiveWindowSource: window.source,
      estimatedWindow: window.estimated,
      throughputMaxByRcvSpaceBps,
      observedBdpBytes,
      noScaleThroughputBps,
      scaleCapabilityBytes: scaleWindowBytes,
      scaleCapabilityThroughputBps,
      capacityBps,
      targetBdpBytes,
      throughputToWindowRatio,
      bdpToWindowRatio,
      receiveMemoryRatio: receiveRatio,
      markers: {
        retrans: (sample.retrans || 0) > 0,
        rttSpike: (sample.rttMs || 0) >= HIGH_RTT_MS,
        rcvSpaceCollapse: window.bytes != null && window.bytes <= LOW_RCV_SPACE_BYTES,
        persist: sample.persist,
        bdpNearWindow: bdpToWindowRatio != null && bdpToWindowRatio >= DEFAULT_NEAR_WINDOW_RATIO,
        counterReset
      }
    };
  });
  return {
    direction,
    configuredLinkCapacityMbps: capacityBps == null ? null : capacityBps / 1e6,
    capacityBps,
    hasCapacity: capacityBps != null,
    wscale: {
      scale,
      maxWindowBytes: scaleWindowBytes,
      noScaleWindowBytes: TCP_WINDOW_NO_SCALE_BYTES
    },
    samples
  };
}

export function analyzeBdpWindowLimit(socket, {
  history = [],
  direction = "inbound",
  configuredLinkCapacityMbps = null,
  recvWarn = DEFAULT_RECV_Q_WARN_BYTES,
  nearWindowRatio = DEFAULT_NEAR_WINDOW_RATIO,
  strongWindowRatio = DEFAULT_STRONG_WINDOW_RATIO,
  minConsecutive = DEFAULT_MIN_CONSECUTIVE
} = {}) {
  const series = buildBdpWindowSeries(socket, { history, direction, configuredLinkCapacityMbps });
  const samples = series.samples;
  const usefulSamples = samples.filter(sample => sample.observedThroughputBps != null && sample.throughputMaxByRcvSpaceBps != null);
  const nearWindowRun = maxConsecutive(samples, sample => (sample.throughputToWindowRatio || 0) >= nearWindowRatio);
  const strongWindowRun = maxConsecutive(samples, sample => (sample.throughputToWindowRatio || 0) >= strongWindowRatio);
  const tightBdpRun = maxConsecutive(samples, sample => (sample.bdpToWindowRatio || 0) >= nearWindowRatio);
  const receivePressureRun = maxConsecutive(samples, sample =>
    (sample.recvQ || 0) >= recvWarn
    && (sample.receiveMemoryRatio || 0) >= RECEIVE_MEMORY_PRESSURE_RATIO
    && (sample.effectiveWindowBytes || Number.POSITIVE_INFINITY) <= LOW_RCV_SPACE_BYTES
  );
  const pathRecoveryRun = maxConsecutive(samples, sample =>
    (sample.retrans || 0) >= HIGH_RETRANS_COUNT
    && (sample.rttMs || 0) >= HIGH_RTT_MS
    && (sample.cwnd || Number.POSITIVE_INFINITY) <= LOW_CWND_SEGMENTS
  );
  const peakObserved = peak(samples, "observedThroughputBps");
  const peakWindowMax = peak(samples, "throughputMaxByRcvSpaceBps");
  const peakBdp = peak(samples, "observedBdpBytes");
  const minWindow = samples.reduce((best, sample) => {
    const value = positiveNumber(sample.effectiveWindowBytes);
    return value == null ? best : Math.min(best, value);
  }, Number.POSITIVE_INFINITY);
  const evidence = [
    series.hasCapacity
      ? `Configured link capacity is ${formatMbps(series.capacityBps)}; target BDP is shown only against that configured value.`
      : "Capacity unknown; analysis is based on observed throughput and TCP window only.",
    usefulSamples.length
      ? `Peak observed throughput is ${formatMbps(peakObserved)}; peak window-limited theoretical throughput is ${formatMbps(peakWindowMax)}.`
      : "Not enough timestamped byte deltas and RTT/window samples to compute window-limited throughput.",
    peakBdp ? `Peak observed BDP is about ${formatBytes(peakBdp)}.` : "",
    Number.isFinite(minWindow) ? `Smallest effective observed window is ${formatBytes(minWindow)}.` : "",
    series.wscale.scale != null
      ? `wscale is present for ${direction}: scale ${series.wscale.scale}, theoretical scaled window capacity ${formatBytes(series.wscale.maxWindowBytes)}.`
      : "wscale is absent or not visible; scaling capacity cannot be validated from this snapshot."
  ].filter(Boolean);
  const counterEvidence = [
    "This module does not infer physical link capacity from delivery_rate, pacing_rate, or observed throughput.",
    "wscale alone is not a current window value and cannot prove a bottleneck.",
    "BDP evidence alone never creates a critical diagnosis."
  ];
  let status = "info";
  let severity = "low";
  let confidence = usefulSamples.length >= minConsecutive ? "medium" : "low";
  let hypothesis = "informational";

  if (nearWindowRun >= minConsecutive || tightBdpRun >= minConsecutive) {
    status = "warning";
    severity = "medium";
    hypothesis = "possible-receive-window-bottleneck";
    evidence.push(`Observed throughput or BDP is near the effective TCP window for at least ${minConsecutive} consecutive snapshots.`);
  }

  if (strongWindowRun >= minConsecutive) {
    status = "warning";
    severity = "high";
    hypothesis = "strong-window-pressure";
    evidence.push(`Observed throughput is above ${formatRatio(strongWindowRatio)} of window-limited theoretical throughput for at least ${minConsecutive} consecutive snapshots.`);
  }

  if (receivePressureRun >= minConsecutive) {
    status = "warning";
    severity = "high";
    hypothesis = "slow-consumer-window-pressure";
    evidence.push("Recv-Q is high while skmem:r is close to skmem:rb and the effective receive window is small; this supports slow-consumer / receiver backpressure.");
    counterEvidence.push("Confirm the owning process and thread state before calling the application the root cause.");
  }

  if (pathRecoveryRun >= minConsecutive) {
    if (status === "info") {
      status = "warning";
      severity = "medium";
    }
    hypothesis = hypothesis === "informational" ? "path-recovery-more-likely" : hypothesis;
    evidence.push("Retransmission, high RTT, and low cwnd are present together; congestion or loss is a competing explanation.");
    counterEvidence.push("If retrans + high RTT + low cwnd dominate, do not blame the receive window first.");
  }

  if (peakWindowMax > 0 && peakObserved > 0 && peakObserved / peakWindowMax < 0.35 && !receivePressureRun) {
    counterEvidence.push("Observed throughput is far below the window-limited theoretical throughput, so the TCP receive window is unlikely to be the main limiter in this interval.");
  }

  return {
    id: "bdp-window-limited-throughput",
    status,
    severity,
    confidence,
    score: status === "warning" ? (severity === "high" ? 80 : 55) : 15,
    hypothesis,
    socket,
    direction,
    series,
    stats: {
      sampleCount: samples.length,
      computableSamples: usefulSamples.length,
      nearWindowRun,
      strongWindowRun,
      tightBdpRun,
      receivePressureRun,
      pathRecoveryRun,
      peakObservedThroughputBps: peakObserved,
      peakWindowThroughputBps: peakWindowMax,
      peakObservedBdpBytes: peakBdp,
      minEffectiveWindowBytes: Number.isFinite(minWindow) ? minWindow : 0
    },
    evidence,
    counterEvidence,
    learnMore: bdpWindowTechnicalNotes(),
    commands: [
      "ss -tinpm state established | egrep 'bytes_sent|bytes_received|delivery_rate|pacing_rate|rtt|minrtt|rcv_rtt|rcv_space|snd_wnd|rcv_wnd|wscale|cwnd|retrans|persist|skmem'",
      "tcpdump -i <iface> -nn 'host <peer-ip> and tcp' -w bdp-window-check.pcap",
      "tshark -r bdp-window-check.pcap -Y 'tcp.analysis.window_full or tcp.analysis.zero_window or tcp.analysis.retransmission'"
    ]
  };
}
