import { metricValue, parseSs } from "./parser.js";
import { parsedTimestampSnapshots, timestampBlocks } from "./timeline.js";

const REQUIRED_FEATURES = [
  { key: "timestamps", label: "Timestamped snapshots", weight: 16 },
  { key: "snapshotDepth", label: "Repeated samples", weight: 10 },
  { key: "cadence", label: "Cadence stability", weight: 8 },
  { key: "duration", label: "Useful observation window", weight: 7 },
  { key: "tcpInfo", label: "TCP internals (-i)", weight: 14 },
  { key: "timers", label: "Timers (-o)", weight: 8 },
  { key: "socketMemory", label: "Socket memory (-m)", weight: 12 },
  { key: "process", label: "Process owner (-p)", weight: 7 },
  { key: "identity", label: "Kernel identity", weight: 5 },
  { key: "counters", label: "Byte/segment counters", weight: 6 },
  { key: "cgroup", label: "Container/cgroup context", weight: 3 },
  { key: "extendedContext", label: "Extended socket context", weight: 4 }
];

const TCP_INFO_FIELDS = ["rtt", "rto", "cwnd", "wscale", "mss", "rcv_space", "rcv_ssthresh", "delivery_rate", "pacing_rate", "send", "bytes_acked"];
const COUNTER_FIELDS = ["bytes_sent", "bytes_received", "bytes_acked", "bytes_retrans", "segs_in", "segs_out", "data_segs_in", "data_segs_out"];

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function average(values) {
  const safe = values.filter(Number.isFinite);
  return safe.length ? safe.reduce((sum, value) => sum + value, 0) / safe.length : 0;
}

function percentile(values, pct) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[index];
}

function median(values) {
  return percentile(values, 50);
}

function dateStamp(date = new Date()) {
  const pad = value => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function commandTokens(command = "") {
  return String(command || "")
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);
}

function commandHasShort(command = "", letter = "") {
  return commandTokens(command)
    .filter(token => /^-[A-Za-z]+$/.test(token) && !token.startsWith("--"))
    .some(token => token.slice(1).includes(letter));
}

function commandHasLong(command = "", name = "") {
  return commandTokens(command).some(token => token === `--${name}` || token.startsWith(`--${name}=`));
}

function commandSleepIntervalMs(command = "") {
  const match = String(command || "").match(/\bsleep\s+([0-9]+(?:[.,][0-9]+)?)/);
  if (!match) return 0;
  const seconds = Number(match[1].replace(",", "."));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
}

function featureStatus(ok, partial = false) {
  if (ok) return "ok";
  return partial ? "partial" : "missing";
}

function featurePoints(weight, status) {
  if (status === "ok") return weight;
  if (status === "partial") return Math.round(weight * 0.5);
  return 0;
}

function qualityGrade(score) {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 55) return "usable";
  if (score >= 35) return "weak";
  return "poor";
}

function qualitySummary(grade) {
  if (grade === "excellent") return "High-confidence capture for timeline, congestion, slow-consumer, timer, memory, and process correlation.";
  if (grade === "good") return "Good capture. Most core evidence is present, with a few context gaps to improve next time.";
  if (grade === "usable") return "Usable capture, but several conclusions should stay cautious because some evidence is missing.";
  if (grade === "weak") return "Weak capture. It can explain visible symptoms, but root-cause confidence is limited.";
  return "Poor capture. Collect again with timestamped ss options before relying on conclusions.";
}

function socketList(raw, providedSockets) {
  if (Array.isArray(providedSockets) && providedSockets.length) return providedSockets;
  return parseSs(raw);
}

function allSnapshotSockets(snapshots, fallbackSockets) {
  const rows = snapshots.flatMap(snapshot => snapshot.sockets || []);
  return rows.length ? rows : fallbackSockets;
}

function buildRecommendedCommand(now = new Date()) {
  return `while true; do date --iso-8601=ns; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep 1; done | tee -a '/tmp/networkexpert_ss_${dateStamp(now)}.log'`;
}

function countSocketLikeLines(raw = "") {
  return String(raw || "")
    .split(/\r?\n/)
    .filter(line => /\b(ESTAB|LISTEN|SYN-SENT|SYN-RECV|FIN-WAIT-1|FIN-WAIT-2|TIME-WAIT|CLOSE-WAIT|LAST-ACK|CLOSING|UNCONN)\b/.test(line))
    .length;
}

function buildFeatureCards({ features, commandSignals, stats }) {
  return REQUIRED_FEATURES.map(item => {
    const feature = features[item.key];
    const command = commandSignals[item.key];
    const status = feature?.status || "missing";
    return {
      key: item.key,
      label: item.label,
      status,
      weight: item.weight,
      points: featurePoints(item.weight, status),
      detail: feature?.detail || "No evidence detected.",
      commandDetected: Boolean(command),
      sample: feature?.sample || "",
      stats
    };
  });
}

function detectFeatures({ raw, command, sockets, snapshots, blocks, intervalsMs, durationMs }) {
  const rows = allSnapshotSockets(snapshots, sockets);
  const values = rows.map(socket => socket.details?.values || {});
  const rawText = String(raw || "");
  const socketCounts = snapshots.map(snapshot => snapshot.sockets?.length || 0);
  const medianInterval = median(intervalsMs);
  const p95Interval = percentile(intervalsMs, 95);
  const cadenceRatio = medianInterval > 0 ? p95Interval / medianInterval : 0;
  const stableCadence = intervalsMs.length >= 2 && cadenceRatio <= 1.8;
  const looseCadence = intervalsMs.length >= 1;
  const hasTimer = rows.some(socket => socket.details?.timer);
  const hasSkmem = rows.some(socket => Object.keys(socket.details?.skmem || {}).length > 0);
  const hasProcess = rows.some(socket => socket.details?.process);
  const hasIdentity = rows.some(socket => socket.details?.values?.sk || socket.details?.values?.ino);
  const hasTcpInfo = values.some(value => TCP_INFO_FIELDS.some(field => value[field] != null));
  const hasCounters = values.some(value => COUNTER_FIELDS.some(field => value[field] != null));
  const hasCgroup = /\bcgroup:/.test(rawText);
  const hasTos = /\btos:/.test(rawText);
  const hasInetSockopt = /\binet-sockopt:/.test(rawText);
  const highPrecisionTimestamps = blocks.some(block => finiteNumber(block.epochMs) % 1000 !== 0);
  const commandSignals = {
    timestamps: /\bdate\s+--iso-8601=ns\b/.test(command) || /\bdate\b/.test(command),
    snapshotDepth: /\bwhile\s+true\b/.test(command) || /\bsleep\s+/.test(command),
    cadence: /\bsleep\s+([0-9.]+)/.test(command),
    duration: /\bwhile\s+true\b/.test(command),
    tcpInfo: commandHasShort(command, "i") || hasTcpInfo,
    timers: commandHasShort(command, "o") || hasTimer,
    socketMemory: commandHasShort(command, "m") || hasSkmem,
    process: commandHasShort(command, "p") || hasProcess,
    identity: commandHasShort(command, "e") || hasIdentity,
    counters: commandHasShort(command, "i") || hasCounters,
    cgroup: commandHasLong(command, "cgroup") || hasCgroup,
    extendedContext: commandHasLong(command, "tos") || commandHasLong(command, "inet-sockopt") || hasTos || hasInetSockopt
  };

  const features = {
    timestamps: {
      status: featureStatus(blocks.length > 0),
      detail: blocks.length ? `${blocks.length} timestamped snapshot(s) detected${highPrecisionTimestamps ? " with millisecond precision." : "."}` : "No timestamp lines detected, so ordering and correlation are weak.",
      sample: highPrecisionTimestamps ? "ms precision available" : ""
    },
    snapshotDepth: {
      status: featureStatus(snapshots.length >= 3, snapshots.length === 2),
      detail: snapshots.length >= 3 ? `${snapshots.length} snapshots are enough for trend detection.` : `${snapshots.length || 0} snapshot(s); trend confidence needs at least 3.`
    },
    cadence: {
      status: featureStatus(stableCadence, looseCadence),
      detail: intervalsMs.length ? `Median interval ${Math.round(medianInterval)} ms, p95 ${Math.round(p95Interval)} ms.` : "No repeated timestamp interval available.",
      sample: stableCadence ? "stable" : looseCadence ? "variable" : ""
    },
    duration: {
      status: featureStatus(durationMs >= 10_000, durationMs >= 1_000),
      detail: durationMs ? `Observation window is ${(durationMs / 1000).toFixed(durationMs < 10_000 ? 2 : 1)} seconds.` : "Single snapshot or no timestamp duration."
    },
    tcpInfo: {
      status: featureStatus(hasTcpInfo),
      detail: hasTcpInfo ? "TCP internals are available: RTT/RTO/cwnd/window/rate fields can be correlated." : "Missing -i style TCP internals; root-cause analysis loses key timing and recovery signals."
    },
    timers: {
      status: featureStatus(hasTimer),
      detail: hasTimer ? "Timer state is available, including retransmission, keepalive, on, or persist timers." : "Missing -o timer data; persist, retransmission timer, and keepalive evidence may be invisible."
    },
    socketMemory: {
      status: featureStatus(hasSkmem),
      detail: hasSkmem ? "Socket memory is available, including receive/transmit pressure and drops." : "Missing -m skmem data; slow-consumer and buffer pressure confidence is reduced."
    },
    process: {
      status: featureStatus(hasProcess),
      detail: hasProcess ? "Process owner is available for application-level triage." : "Missing -p process owner; attribution to JVM/service/process is weaker."
    },
    identity: {
      status: featureStatus(hasIdentity),
      detail: hasIdentity ? "Kernel socket identity is available, helping track one socket across state changes." : "Missing sk/ino identity; reconnects and state transitions can be ambiguous."
    },
    counters: {
      status: featureStatus(hasCounters),
      detail: hasCounters ? "Byte and segment counters are available for deltas, throughput, and retransmission context." : "Missing byte/segment counters; rate and trend calculations are limited."
    },
    cgroup: {
      status: featureStatus(hasCgroup, commandSignals.cgroup),
      detail: hasCgroup ? "cgroup context is present for container/session attribution." : "No cgroup context detected."
    },
    extendedContext: {
      status: featureStatus(hasTos || hasInetSockopt, commandSignals.extendedContext),
      detail: hasTos || hasInetSockopt ? "QoS and socket option context is present." : "No --tos or --inet-sockopt context detected."
    }
  };

  return {
    rows,
    socketCounts,
    commandSignals,
    features,
    stats: {
      highPrecisionTimestamps,
      medianIntervalMs: medianInterval,
      p95IntervalMs: p95Interval,
      cadenceRatio,
      stableCadence
    }
  };
}

function detectCounterResets(snapshots) {
  const resets = [];
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1].sockets || [];
    const curr = snapshots[i].sockets || [];
    for (const socket of curr) {
      const sk = socket.details?.values?.sk;
      const ino = socket.details?.values?.ino;
      if (!sk && !ino) continue;
      const match = prev.find(p => (sk && p.details?.values?.sk === sk) || (ino && p.details?.values?.ino === ino));
      if (!match) continue;
      for (const field of COUNTER_FIELDS) {
        const prevVal = Number(match.details?.values?.[field] || 0);
        const currVal = Number(socket.details?.values?.[field] || 0);
        if (prevVal > 0 && currVal < prevVal) {
          resets.push({ snapshot: i, field, prev: prevVal, curr: currVal, sk: sk || ino });
          break;
        }
      }
    }
  }
  return resets;
}

function detectIdentityChanges(snapshots) {
  const changes = [];
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1].sockets || [];
    const curr = snapshots[i].sockets || [];
    const prevByAddr = new Map(prev.map(s => [`${s.local}|${s.peer}`, s]));
    for (const socket of curr) {
      const key = `${socket.local}|${socket.peer}`;
      const match = prevByAddr.get(key);
      if (!match) continue;
      const prevSk = match.details?.values?.sk;
      const currSk = socket.details?.values?.sk;
      if (prevSk && currSk && prevSk !== currSk) {
        changes.push({ snapshot: i, addr: key, prevSk, currSk });
      }
    }
  }
  return changes;
}

function detectTimestampIrregularities(intervalsMs) {
  if (intervalsMs.length < 2) return { gaps: [], duplicates: 0, jitter: 0 };
  const med = median(intervalsMs);
  const gaps = [];
  let duplicates = 0;
  const deviations = [];
  for (let i = 0; i < intervalsMs.length; i++) {
    const interval = intervalsMs[i];
    if (interval === 0) { duplicates++; continue; }
    if (med > 0) {
      const ratio = interval / med;
      deviations.push(Math.abs(ratio - 1));
      if (ratio > 3) gaps.push({ index: i + 1, intervalMs: interval, expectedMs: med });
    }
  }
  const jitter = deviations.length ? average(deviations) : 0;
  return { gaps, duplicates, jitter };
}

function buildDataIntegrityWarnings(snapshots, intervalsMs, stats) {
  const warnings = [];
  const counterResets = detectCounterResets(snapshots);
  const identityChanges = detectIdentityChanges(snapshots);
  const irregularities = detectTimestampIrregularities(intervalsMs);

  if (counterResets.length) {
    warnings.push({ type: "counter-reset", severity: "high", message: `${counterResets.length} counter reset(s) detected across snapshots — socket may have been recreated or kernel recycled the sk.`, details: counterResets.slice(0, 3) });
  }
  if (identityChanges.length) {
    warnings.push({ type: "identity-change", severity: "high", message: `${identityChanges.length} socket identity change(s) detected (same addr:port, different sk) — connection was likely recycled.`, details: identityChanges.slice(0, 3) });
  }
  if (irregularities.gaps.length) {
    warnings.push({ type: "timestamp-gap", severity: "medium", message: `${irregularities.gaps.length} timestamp gap(s) >3x median interval — possible collection stall or system load spike.`, details: irregularities.gaps.slice(0, 3) });
  }
  if (irregularities.duplicates > 0) {
    warnings.push({ type: "duplicate-timestamp", severity: "low", message: `${irregularities.duplicates} duplicate timestamp(s) — sub-second precision may be missing.`, details: [] });
  }
  if (irregularities.jitter > 0.5) {
    warnings.push({ type: "high-jitter", severity: "medium", message: `Timestamp jitter is ${(irregularities.jitter * 100).toFixed(0)}% of median interval — cadence is unreliable for rate calculations.`, details: [] });
  }
  if (stats.medianIntervalMs > 0 && stats.medianIntervalMs < 100 && !stats.highPrecisionTimestamps) {
    warnings.push({ type: "no-ms-precision", severity: "high", message: "Sub-100ms sampling without millisecond timestamps — intervals cannot be measured accurately.", details: [] });
  }

  return warnings;
}

function buildMessages({ score, grade, featureCards, stats, raw, snapshots, command, dataIntegrity }) {
  const strengths = [];
  const warnings = [];
  const missing = [];
  const recommendations = [];
  const byKey = Object.fromEntries(featureCards.map(card => [card.key, card]));

  for (const card of featureCards) {
    if (card.status === "ok") strengths.push(`${card.label}: ${card.detail}`);
    if (card.status === "partial") warnings.push(`${card.label}: ${card.detail}`);
    if (card.status === "missing") missing.push(`${card.label}: ${card.detail}`);
  }

  for (const issue of dataIntegrity) {
    warnings.push(issue.message);
  }

  if (!raw.trim()) {
    warnings.unshift("No capture text is loaded yet.");
    recommendations.push("Paste ss output or open a timestamped collection before judging capture quality.");
  }
  if (byKey.timestamps?.status === "missing") {
    recommendations.push("Wrap collection with date --iso-8601=ns before every ss run so events can be ordered precisely.");
  }
  if (byKey.snapshotDepth?.status !== "ok") {
    recommendations.push("Collect at least 3 to 5 snapshots; 30 seconds or more is better for intermittent slow-consumer and recovery patterns.");
  }
  if (byKey.tcpInfo?.status === "missing" || byKey.socketMemory?.status === "missing" || byKey.timers?.status === "missing") {
    recommendations.push("Prefer ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all for expert diagnosis.");
  }
  const requestedIntervalMs = commandSleepIntervalMs(command);
  if (((stats.medianIntervalMs > 0 && stats.medianIntervalMs <= 50) || (requestedIntervalMs > 0 && requestedIntervalMs <= 50)) && /\|\s*tee\b/.test(command)) {
    warnings.push("Very short interval with tee can distort cadence or become the recorder bottleneck.");
    recommendations.push("For 0.05s or faster captures, validate disk/terminal overhead or redirect to a fast local file.");
  }
  if (dataIntegrity.some(i => i.type === "counter-reset")) {
    recommendations.push("Counter resets suggest socket recycling — correlate with connection lifecycle before trusting delta calculations.");
  }
  if (dataIntegrity.some(i => i.type === "no-ms-precision")) {
    recommendations.push("Use date --iso-8601=ns for sub-second captures to get accurate interval measurements.");
  }
  if (score >= 85) recommendations.push("This capture is strong enough for timeline, chart, and diagnostic correlation. Keep the same collection pattern for incident runs.");
  if (grade === "usable") recommendations.push("Keep diagnostics cautious: use the report to identify which missing evidence blocks a firmer conclusion.");

  return { strengths, warnings, missing, recommendations };
}

export function analyzeCaptureQuality({ raw = "", sockets = [], sourceName = "", command = "", now = new Date() } = {}) {
  const text = String(raw || "");
  const parsedSockets = socketList(text, sockets);
  const blocks = timestampBlocks(text);
  const snapshots = parsedTimestampSnapshots(text).filter(snapshot => (snapshot.sockets || []).length > 0);
  const epochs = snapshots.map(snapshot => finiteNumber(snapshot.epochMs)).filter(Number.isFinite);
  const intervalsMs = epochs.slice(1).map((epoch, index) => epoch - epochs[index]).filter(value => value >= 0);
  const durationMs = epochs.length >= 2 ? epochs[epochs.length - 1] - epochs[0] : 0;
  const detected = detectFeatures({ raw: text, command, sockets: parsedSockets, snapshots, blocks, intervalsMs, durationMs });
  const featureCards = buildFeatureCards({ features: detected.features, commandSignals: detected.commandSignals, stats: detected.stats });
  const dataIntegrity = buildDataIntegrityWarnings(snapshots, intervalsMs, detected.stats);
  const integrityPenalty = Math.min(15, dataIntegrity.filter(i => i.severity === "high").length * 5 + dataIntegrity.filter(i => i.severity === "medium").length * 2);
  const score = Math.max(0, Math.min(100, featureCards.reduce((sum, card) => sum + card.points, 0) - integrityPenalty));
  const grade = qualityGrade(score);
  const messages = buildMessages({ score, grade, featureCards, stats: detected.stats, raw: text, snapshots, command, dataIntegrity });
  const socketCounts = detected.socketCounts;
  const activeSocketRows = snapshots.length ? socketCounts.reduce((sum, count) => sum + count, 0) : parsedSockets.length;
  const observedRateRows = detected.rows.filter(socket => metricValue(socket, "delivery_rate") || metricValue(socket, "pacing_rate") || metricValue(socket, "send"));

  return {
    score,
    grade,
    summary: qualitySummary(grade),
    sourceName: sourceName || "current capture",
    recommendedCommand: buildRecommendedCommand(now),
    metrics: {
      rawLineCount: text.split(/\r?\n/).filter(Boolean).length,
      socketLikeLineCount: countSocketLikeLines(text),
      parsedSocketCount: parsedSockets.length,
      activeSocketRows,
      snapshotCount: snapshots.length,
      timestampBlockCount: blocks.length,
      durationMs,
      intervalCount: intervalsMs.length,
      medianIntervalMs: detected.stats.medianIntervalMs,
      minIntervalMs: intervalsMs.length ? Math.min(...intervalsMs) : 0,
      maxIntervalMs: intervalsMs.length ? Math.max(...intervalsMs) : 0,
      p95IntervalMs: detected.stats.p95IntervalMs,
      avgSocketsPerSnapshot: socketCounts.length ? average(socketCounts) : parsedSockets.length,
      minSocketsPerSnapshot: socketCounts.length ? Math.min(...socketCounts) : parsedSockets.length,
      maxSocketsPerSnapshot: socketCounts.length ? Math.max(...socketCounts) : parsedSockets.length,
      highPrecisionTimestamps: detected.stats.highPrecisionTimestamps,
      observedRateRows: observedRateRows.length
    },
    featureCards,
    dataIntegrity,
    strengths: messages.strengths,
    warnings: messages.warnings,
    missing: messages.missing,
    recommendations: messages.recommendations,
    limits: [
      "Capture quality does not prove root cause; it only describes how much evidence is available.",
      "A good ss capture can still miss the TCP handshake, packet loss location, NIC drops outside the socket, or application-level stalls.",
      "Do not infer physical link capacity from ss alone unless a configured capacity is provided elsewhere."
    ]
  };
}

export function captureQualityGrade(score) {
  return qualityGrade(score);
}
