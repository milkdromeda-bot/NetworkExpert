import { metricValue } from "../parsing/parser.js";

const LOW_RCV_SPACE_BYTES = 8 * 1024;
const RECEIVE_MEMORY_PRESSURE_RATIO = 0.85;
const DEFAULT_RECV_Q_WARN_BYTES = 128 * 1024;
const HIGH_RTT_MS = 100;
const HIGH_RETRANS_COUNT = 3;
const DROP_WARN_PCT = 30;
const DROP_MAJOR_PCT = 50;
const DROP_SEVERE_PCT = 70;

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveNumber(value) {
  const number = finiteNumber(value);
  return number != null && number > 0 ? number : null;
}

function formatBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes)} B`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDuration(ms) {
  const value = Number(ms || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value < 60_000) return `${Math.round(value / 1000)}s`;
  if (value < 3_600_000) return `${Math.round(value / 60_000)}min`;
  return `${(value / 3_600_000).toFixed(value >= 36_000_000 ? 0 : 1)}h`;
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

function socketHasValue(socket, metric) {
  if (metric.startsWith("skmem.")) {
    const key = metric.split(".")[1];
    return Object.hasOwn(socket?.details?.skmem || {}, key);
  }
  return Object.hasOwn(socket?.details?.values || {}, metric);
}

function socketMetricOrNull(socket, metric) {
  if (!socket) return null;
  if (metric === "recvQ") return finiteNumber(socket.recvQ) ?? 0;
  if (metric === "sendQ") return finiteNumber(socket.sendQ) ?? 0;
  if (!socketHasValue(socket, metric)) return null;
  return finiteNumber(metricValue(socket, metric));
}

function retransCount(socket, fallback = 0) {
  return Math.max(
    Number(socket?.details?.timer?.retrans || 0),
    Number(metricValue(socket, "retrans") || 0),
    Number(fallback || 0)
  );
}

function rowMatchesSocket(row, socket) {
  if (!row?.socketId || !socket?.id) return true;
  return row.socketId === socket.id;
}

function sampleFromRow(row, socket) {
  if (!rowMatchesSocket(row, socket) || row?.socketPresent === false) return null;
  const value = positiveNumber(rowNumber(row, "rcv_ssthresh", "rcvSsthresh"));
  if (value == null) return null;
  return {
    value,
    epochMs: finiteNumber(row.epochMs),
    t: finiteNumber(row.t),
    recvQ: rowNumber(row, "recvQ", "recv_q"),
    rcvSpace: rowNumber(row, "rcv_space", "rcvSpace"),
    skmemR: rowNumber(row, "skmem.r", "skmemR"),
    skmemRb: rowNumber(row, "skmem.rb", "skmemRb"),
    rcvRtt: rowNumber(row, "rcv_rtt", "rcvRtt"),
    rtt: rowNumber(row, "rtt"),
    retrans: rowNumber(row, "retrans"),
    bytesReceived: rowNumber(row, "bytes_received", "bytesReceived"),
    segsIn: rowNumber(row, "segs_in", "segsIn"),
    drops: rowNumber(row, "skmem.d", "drops"),
    timerName: String(row.timerName || row.timer || "").toLowerCase()
  };
}

function currentSample(socket) {
  const value = positiveNumber(socketMetricOrNull(socket, "rcv_ssthresh"));
  if (value == null) return null;
  const timerName = String(socket?.details?.timer?.name || "").toLowerCase();
  return {
    value,
    epochMs: finiteNumber(socket?.lastSeenMs),
    recvQ: finiteNumber(socket?.recvQ) ?? 0,
    rcvSpace: socketMetricOrNull(socket, "rcv_space"),
    skmemR: socketMetricOrNull(socket, "skmem.r"),
    skmemRb: socketMetricOrNull(socket, "skmem.rb"),
    rcvRtt: socketMetricOrNull(socket, "rcv_rtt"),
    rtt: socketMetricOrNull(socket, "rtt"),
    retrans: retransCount(socket),
    bytesReceived: socketMetricOrNull(socket, "bytes_received"),
    segsIn: socketMetricOrNull(socket, "segs_in"),
    drops: socketMetricOrNull(socket, "skmem.d"),
    timerName
  };
}

function collectSamples(socket, history = []) {
  const samples = history.map(row => sampleFromRow(row, socket)).filter(Boolean);
  const current = currentSample(socket);
  if (current) {
    const last = samples.at(-1);
    const sameEpoch = last?.epochMs != null && current.epochMs != null && last.epochMs === current.epochMs;
    if (!last || !sameEpoch && last.value !== current.value) samples.push(current);
  }
  return samples;
}

function latestContext(socket, samples) {
  const latest = samples.at(-1) || {};
  const timerName = String(socket?.details?.timer?.name || latest.timerName || "").toLowerCase();
  const rcvSpace = socketMetricOrNull(socket, "rcv_space") ?? latest.rcvSpace ?? null;
  const skmemR = socketMetricOrNull(socket, "skmem.r") ?? latest.skmemR ?? 0;
  const skmemRb = socketMetricOrNull(socket, "skmem.rb") ?? latest.skmemRb ?? 0;
  return {
    recvQ: finiteNumber(socket?.recvQ) ?? latest.recvQ ?? 0,
    rcvSpace,
    skmemR,
    skmemRb,
    receiveMemoryRatio: skmemRb > 0 ? skmemR / skmemRb : 0,
    rcvRtt: socketMetricOrNull(socket, "rcv_rtt") ?? latest.rcvRtt ?? null,
    rtt: socketMetricOrNull(socket, "rtt") ?? latest.rtt ?? null,
    retrans: retransCount(socket, latest.retrans),
    bytesReceived: socketMetricOrNull(socket, "bytes_received") ?? latest.bytesReceived ?? null,
    segsIn: socketMetricOrNull(socket, "segs_in") ?? latest.segsIn ?? null,
    drops: socketMetricOrNull(socket, "skmem.d") ?? latest.drops ?? 0,
    timerName,
    persist: timerName === "persist"
  };
}

function metricTrend(history, socket, ...keys) {
  const values = history
    .filter(row => rowMatchesSocket(row, socket) && row?.socketPresent !== false)
    .map(row => rowNumber(row, ...keys))
    .filter(value => value != null);
  if (values.length < 2) return { count: values.length, first: values[0] ?? null, last: values.at(-1) ?? null, delta: 0 };
  return { count: values.length, first: values[0], last: values.at(-1), delta: values.at(-1) - values[0] };
}

function dropLevel(dropPercent) {
  if (dropPercent >= DROP_SEVERE_PCT) return "severe";
  if (dropPercent >= DROP_MAJOR_PCT) return "major";
  if (dropPercent >= DROP_WARN_PCT) return "moderate";
  return "none";
}

export function calculateRcvSsthreshChange(previous, current) {
  const previousValue = positiveNumber(previous);
  const currentValue = finiteNumber(current);
  if (previousValue == null || currentValue == null) {
    return {
      previous: previousValue,
      current: currentValue,
      absoluteChange: 0,
      absoluteDrop: 0,
      relativeDropPct: 0,
      currentToPreviousRatioPct: 0
    };
  }
  const absoluteChange = currentValue - previousValue;
  const absoluteDrop = Math.max(0, previousValue - currentValue);
  const relativeDropPct = absoluteDrop / previousValue * 100;
  return {
    previous: previousValue,
    current: currentValue,
    absoluteChange,
    absoluteDrop,
    relativeDropPct,
    currentToPreviousRatioPct: currentValue / previousValue * 100
  };
}

function summarizeSamples(samples) {
  if (samples.length < 2) {
    return {
      sampleCount: samples.length,
      first: samples[0]?.value ?? null,
      current: samples.at(-1)?.value ?? null,
      maxObserved: samples[0]?.value ?? null,
      minObserved: samples[0]?.value ?? null,
      absoluteDrop: 0,
      relativeDropPct: 0,
      currentToMaxRatioPct: samples[0]?.value ? 100 : 0,
      durationMs: 0,
      level: "none"
    };
  }
  const first = samples[0];
  const current = samples.at(-1);
  const maxSample = samples.reduce((best, sample) => sample.value > best.value ? sample : best, first);
  const minSample = samples.reduce((best, sample) => sample.value < best.value ? sample : best, first);
  const absoluteDrop = Math.max(0, maxSample.value - current.value);
  const relativeDropPct = maxSample.value > 0 ? absoluteDrop / maxSample.value * 100 : 0;
  const durationStart = maxSample.epochMs ?? first.epochMs;
  const durationEnd = current.epochMs;
  const durationMs = durationStart != null && durationEnd != null && durationEnd >= durationStart ? durationEnd - durationStart : 0;
  return {
    sampleCount: samples.length,
    first: first.value,
    current: current.value,
    maxObserved: maxSample.value,
    minObserved: minSample.value,
    absoluteDrop,
    relativeDropPct,
    currentToMaxRatioPct: maxSample.value > 0 ? current.value / maxSample.value * 100 : 0,
    durationMs,
    level: dropLevel(relativeDropPct)
  };
}

export function rcvSsthreshTechnicalNotes() {
  return [
    "Linux rcv_ssthresh is a receive-side autotuning threshold / current window clamp used around the advertised receive window.",
    "It is not the same signal as sender-side snd_ssthresh, which belongs to congestion control and slow-start recovery.",
    "A falling rcv_ssthresh can mean Linux is constraining receive-window growth because receive memory, application drain, or memory pressure changed.",
    "It is not isolated proof of a slow consumer. Confirm with Recv-Q, skmem:r close to skmem:rb, low rcv_space, persist/Zero Window evidence, and application read latency.",
    "If rcv_ssthresh is low while RTT and retransmission are high, keep network/path congestion as a competing hypothesis instead of forcing a receiver-only diagnosis."
  ];
}

export function analyzeRcvSsthreshTrend(socket, { history = [], recvWarn = DEFAULT_RECV_Q_WARN_BYTES } = {}) {
  const samples = collectSamples(socket, history);
  const trend = summarizeSamples(samples);
  const context = latestContext(socket, samples);
  const byteTrend = metricTrend(history, socket, "bytes_received", "bytesReceived");
  const segmentTrend = metricTrend(history, socket, "segs_in", "segsIn");
  const lowRcvSpace = context.rcvSpace != null && context.rcvSpace <= LOW_RCV_SPACE_BYTES;
  const highRecvQ = context.recvQ >= recvWarn;
  const receiveMemoryNearLimit = context.receiveMemoryRatio >= RECEIVE_MEMORY_PRESSURE_RATIO;
  const localPressureSignals = [
    highRecvQ ? `Recv-Q is high (${formatBytes(context.recvQ)}).` : "",
    lowRcvSpace ? `rcv_space is low (${formatBytes(context.rcvSpace)}).` : "",
    receiveMemoryNearLimit ? `skmem:r is close to skmem:rb (${Math.round(context.receiveMemoryRatio * 100)}%).` : "",
    context.persist ? "timer:persist is present, so TCP is probing/handling a constrained receive window." : "",
    context.drops > 0 ? `Socket drops are present (${context.drops}).` : ""
  ].filter(Boolean);
  const strongLocalPressure = localPressureSignals.length >= 2 || context.persist && (lowRcvSpace || receiveMemoryNearLimit);
  const networkRecovery = context.rtt >= HIGH_RTT_MS && context.retrans >= HIGH_RETRANS_COUNT;
  const evidence = [];
  const counterEvidence = [
    "rcv_ssthresh alone is not proof of a slow consumer.",
    "This is receive-window autotuning context, not sender-side congestion ssthresh."
  ];

  if (!trend.sampleCount) {
    return {
      id: "rcv-ssthresh-trend",
      status: "info",
      severity: "low",
      confidence: "low",
      score: 5,
      socket,
      trend,
      context,
      evidence: ["No positive rcv_ssthresh sample is available in the selected data."],
      counterEvidence,
      learnMore: rcvSsthreshTechnicalNotes(),
      commands: [
        "ss -tinpm state established | egrep 'rcv_ssthresh|rcv_space|rcv_rtt|Recv-Q|skmem|persist|retrans|rtt'"
      ]
    };
  }

  if (trend.sampleCount < 2) {
    evidence.push(`Current rcv_ssthresh is ${formatBytes(trend.current)}; a single sample is informational only.`);
    return {
      id: "rcv-ssthresh-trend",
      status: "info",
      severity: "low",
      confidence: "high",
      score: 10,
      socket,
      trend,
      context,
      evidence,
      counterEvidence: [...counterEvidence, "At least two timestamped snapshots are required before scoring a decline."],
      learnMore: rcvSsthreshTechnicalNotes(),
      commands: [
        "ss -tinpm state established | egrep 'rcv_ssthresh|rcv_space|rcv_rtt|Recv-Q|skmem|persist|retrans|rtt'"
      ]
    };
  }

  const duration = formatDuration(trend.durationMs);
  evidence.push(`rcv_ssthresh changed from max ${formatBytes(trend.maxObserved)} to ${formatBytes(trend.current)}: drop ${formatBytes(trend.absoluteDrop)} (${formatPercent(trend.relativeDropPct)}), current/max ${formatPercent(trend.currentToMaxRatioPct)}${duration ? ` over ${duration}` : ""}.`);
  if (trend.level !== "none") evidence.push(`Drop threshold crossed: ${trend.level} (>${trend.level === "moderate" ? "30" : trend.level === "major" ? "50" : "70"}%).`);
  if (byteTrend.delta > 0) evidence.push(`bytes_received progressed by ${formatBytes(byteTrend.delta)} during the selected history.`);
  if (segmentTrend.delta > 0) evidence.push(`segs_in progressed by ${Math.round(segmentTrend.delta)} segment(s) during the selected history.`);
  evidence.push(...localPressureSignals);

  if (networkRecovery) {
    evidence.push(`RTT/retransmission context is also elevated (rtt ${context.rtt} ms, retrans ${context.retrans}).`);
    counterEvidence.push("Low rcv_ssthresh with high RTT and retransmission can indicate network/path congestion or recovery, not necessarily a local slow consumer.");
  }

  let status = "info";
  let severity = "low";
  let confidence = "medium";
  let score = 15;
  let hypothesis = "info";
  if (trend.relativeDropPct >= DROP_WARN_PCT) {
    status = "warning";
    severity = trend.relativeDropPct >= DROP_MAJOR_PCT ? "medium" : "low";
    confidence = trend.durationMs > 0 || trend.sampleCount >= 3 ? "medium" : "low";
    score = trend.relativeDropPct >= DROP_SEVERE_PCT ? 55 : trend.relativeDropPct >= DROP_MAJOR_PCT ? 45 : 35;
    hypothesis = "receive-autotuning-drop";
  }
  if (status === "warning" && strongLocalPressure) {
    severity = trend.relativeDropPct >= DROP_MAJOR_PCT || context.persist ? "high" : "medium";
    confidence = "high";
    score += 35;
    hypothesis = "slow-consumer-suspected";
    counterEvidence.push("Even with strong receive pressure, confirm the owning process and thread state before naming the application as root cause.");
  } else if (status === "warning" && networkRecovery) {
    severity = severity === "low" ? "medium" : severity;
    hypothesis = "network-or-receiver-ambiguous";
  }

  return {
    id: "rcv-ssthresh-trend",
    status,
    severity,
    confidence,
    score,
    hypothesis,
    socket,
    trend,
    context,
    evidence,
    counterEvidence,
    learnMore: rcvSsthreshTechnicalNotes(),
    commands: [
      "ss -tinpm state established | egrep 'rcv_ssthresh|rcv_space|rcv_rtt|Recv-Q|skmem|persist|retrans|rtt'",
      "pidstat -druwt -p <pid> 1",
      "top -H -p <pid>",
      "tcpdump -i <iface> -nn 'host <peer-ip> and tcp' -w rcv-ssthresh-check.pcap",
      "tshark -r rcv-ssthresh-check.pcap -Y 'tcp.analysis.zero_window or tcp.analysis.window_full or tcp.analysis.retransmission'"
    ]
  };
}
