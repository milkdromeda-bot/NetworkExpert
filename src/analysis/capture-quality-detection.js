import { socketIdentityKey } from "../timeline/timeline.js";
import {
  COUNTER_FIELDS,
  TCP_INFO_FIELDS,
  average,
  commandHasLong,
  commandHasShort,
  commandSleepIntervalMs,
  featureStatus,
  finiteNumber,
  median,
  percentile
} from "./capture-quality-helpers.js";

function allSnapshotSockets(snapshots, fallbackSockets) {
  const rows = snapshots.flatMap(snapshot => snapshot.sockets || []);
  return rows.length ? rows : fallbackSockets;
}

export function detectFeatures({ raw, command, sockets, snapshots, blocks, intervalsMs, durationMs }) {
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
    stats: { highPrecisionTimestamps, medianIntervalMs: medianInterval, p95IntervalMs: p95Interval, cadenceRatio, stableCadence }
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
    const prevByAddr = new Map((snapshots[i - 1].sockets || []).map(s => [`${s.local}|${s.peer}`, s]));
    for (const socket of snapshots[i].sockets || []) {
      const match = prevByAddr.get(`${socket.local}|${socket.peer}`);
      const prevSk = match?.details?.values?.sk;
      const currSk = socket.details?.values?.sk;
      if (prevSk && currSk && prevSk !== currSk) changes.push({ snapshot: i, addr: `${socket.local}|${socket.peer}`, prevSk, currSk });
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
    if (!med) continue;
    const ratio = interval / med;
    deviations.push(Math.abs(ratio - 1));
    if (ratio > 3) gaps.push({ index: i + 1, intervalMs: interval, expectedMs: med });
  }
  return { gaps, duplicates, jitter: deviations.length ? average(deviations) : 0 };
}

export function summarizeSocketCoverage(snapshots, fallbackSockets = []) {
  const seen = new Map();
  const stateByEndpoint = new Map();
  let totalRows = 0;
  for (const snapshot of snapshots) {
    const sockets = snapshot.sockets || [];
    totalRows += sockets.length;
    for (const socket of sockets) {
      const key = socketIdentityKey(socket);
      const entry = seen.get(key) || { key, local: socket.local || "", peer: socket.peer || "", firstSeenMs: snapshot.epochMs, lastSeenMs: snapshot.epochMs, snapshots: 0, states: new Set() };
      entry.snapshots += 1;
      entry.lastSeenMs = snapshot.epochMs;
      if (socket.state) entry.states.add(socket.state);
      seen.set(key, entry);

      const endpointKey = `${socket.local || ""}|${socket.peer || ""}`;
      const states = stateByEndpoint.get(endpointKey) || new Set();
      if (socket.state) states.add(socket.state);
      stateByEndpoint.set(endpointKey, states);
    }
  }
  if (!seen.size && fallbackSockets.length) {
    for (const socket of fallbackSockets) {
      const key = socketIdentityKey(socket);
      seen.set(key, { key, local: socket.local || "", peer: socket.peer || "", firstSeenMs: 0, lastSeenMs: 0, snapshots: 1, states: new Set(socket.state ? [socket.state] : []) });
    }
    totalRows = fallbackSockets.length;
  }
  const entries = [...seen.values()];
  const oneShot = entries.filter(entry => entry.snapshots === 1);
  const statefulEndpoints = [...stateByEndpoint.entries()].filter(([, states]) => states.size > 1);
  const continuityScores = entries.map(entry => entry.snapshots / (snapshots.length || 1));
  return {
    uniqueSockets: entries.length,
    totalRows,
    oneShotSockets: oneShot.length,
    oneShotRatio: entries.length ? oneShot.length / entries.length : 0,
    avgSnapshotsPerSocket: entries.length ? average(entries.map(entry => entry.snapshots)) : 0,
    medianContinuity: median(continuityScores),
    endpointsWithStateTransitions: statefulEndpoints.length,
    examples: oneShot.slice(0, 3).map(entry => `${entry.local} -> ${entry.peer}`),
    stateTransitionExamples: statefulEndpoints.slice(0, 3).map(([endpoint, states]) => `${endpoint.replace("|", " -> ")} (${[...states].join(" -> ")})`)
  };
}

export function buildDataIntegrityWarnings(snapshots, intervalsMs, stats, command = "", coverage = {}) {
  const warnings = [];
  const counterResets = detectCounterResets(snapshots);
  const identityChanges = detectIdentityChanges(snapshots);
  const irregularities = detectTimestampIrregularities(intervalsMs);
  const requestedIntervalMs = commandSleepIntervalMs(command);

  if (counterResets.length) warnings.push({ type: "counter-reset", severity: "high", message: `${counterResets.length} counter reset(s) detected across snapshots - socket may have been recreated or kernel recycled the sk.`, details: counterResets.slice(0, 3) });
  if (identityChanges.length) warnings.push({ type: "identity-change", severity: "high", message: `${identityChanges.length} socket identity change(s) detected (same addr:port, different sk) - connection was likely recycled.`, details: identityChanges.slice(0, 3) });
  if (irregularities.gaps.length) warnings.push({ type: "timestamp-gap", severity: "medium", message: `${irregularities.gaps.length} timestamp gap(s) >3x median interval - possible collection stall or system load spike.`, details: irregularities.gaps.slice(0, 3) });
  if (irregularities.duplicates > 0) warnings.push({ type: "duplicate-timestamp", severity: "low", message: `${irregularities.duplicates} duplicate timestamp(s) - sub-second precision may be missing.`, details: [] });
  if (irregularities.jitter > 0.5) warnings.push({ type: "high-jitter", severity: "medium", message: `Timestamp jitter is ${(irregularities.jitter * 100).toFixed(0)}% of median interval - cadence is unreliable for rate calculations.`, details: [] });
  if (stats.medianIntervalMs > 0 && stats.medianIntervalMs < 100 && !stats.highPrecisionTimestamps) warnings.push({ type: "no-ms-precision", severity: "high", message: "Sub-100ms sampling without millisecond timestamps - intervals cannot be measured accurately.", details: [] });
  if (requestedIntervalMs > 0 && stats.medianIntervalMs > requestedIntervalMs * 2.5) warnings.push({ type: "cadence-drift", severity: "medium", message: `Observed median cadence is ${Math.round(stats.medianIntervalMs)} ms while command requests ${Math.round(requestedIntervalMs)} ms - collection overhead or host load may hide short events.`, details: [] });
  if ((coverage.uniqueSockets || 0) >= 5 && (coverage.oneShotRatio || 0) > 0.5) warnings.push({ type: "socket-churn", severity: "medium", message: `${Math.round(coverage.oneShotRatio * 100)}% of socket identities appear in only one snapshot - lifecycle churn may limit per-socket trend confidence.`, details: coverage.examples || [] });
  if ((coverage.endpointsWithStateTransitions || 0) > 0) warnings.push({ type: "state-transitions", severity: "low", message: `${coverage.endpointsWithStateTransitions} endpoint(s) show TCP state transitions; treat them as one lifecycle before counting sockets.`, details: coverage.stateTransitionExamples || [] });
  return warnings;
}
