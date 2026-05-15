/**
 * JVM Stall / GC Correlation Engine
 * Correlates GC pauses with TCP symptoms from ss snapshots.
 */
import { classifyPause, g1Recommendations } from "./gc-log-parser.js";

const DEFAULT_WINDOWS = { beforeMs: 500, afterShortMs: 500, afterLongMs: 5000 };

/**
 * Align GC timestamps with ss snapshot timestamps.
 * @param {Array} pauses - Parsed GC pauses with epochMs/uptimeS
 * @param {Array} snapshots - ss history snapshots with epochMs
 * @param {number} clockOffsetMs - Manual clock skew correction
 * @returns {Array} pauses with aligned epochMs
 */
export function alignTimestamps(pauses, snapshots, clockOffsetMs = 0) {
  if (!pauses.length) return pauses;
  // If pauses have absolute timestamps, just apply offset
  if (pauses[0].epochMs) {
    return pauses.map(p => ({ ...p, alignedEpochMs: p.epochMs + clockOffsetMs }));
  }
  // Fallback: use uptime relative to first snapshot
  const firstSnap = snapshots[0]?.epochMs || 0;
  const firstUptime = pauses[0].uptimeS || 0;
  return pauses.map(p => ({
    ...p,
    alignedEpochMs: firstSnap + ((p.uptimeS || 0) - firstUptime) * 1000 + clockOffsetMs
  }));
}

/**
 * Find ss snapshots within a time window around a GC pause.
 */
function snapshotsInWindow(snapshots, centerMs, beforeMs, afterMs) {
  const before = [], during = [], after = [];
  for (const s of snapshots) {
    const t = s.epochMs;
    if (t >= centerMs - beforeMs && t < centerMs) before.push(s);
    else if (t >= centerMs && t <= centerMs + 1) during.push(s); // pause instant
    else if (t > centerMs && t <= centerMs + afterMs) after.push(s);
  }
  return { before, during, after };
}

/**
 * Calculate buffer pressure for a pause.
 */
function bufferPressure(pause, snapshotsBefore) {
  if (!snapshotsBefore.length || !pause.durationMs) return null;
  const last = snapshotsBefore[snapshotsBefore.length - 1];
  const inboundBps = last.rx_bps || last.bytes_received_delta_bps || 0;
  const inboundBytesPerSec = inboundBps / 8;
  const accumulated = inboundBytesPerSec * (pause.durationMs / 1000);
  const freeBuffer = (last.skmem_rb || 0) - (last.skmem_r || 0);
  const rcvSpace = last.rcv_space || 0;
  const recvQ = last.recvQ || 0;
  return {
    accumulatedBytes: accumulated,
    freeBuffer: Math.max(0, freeBuffer),
    rcvSpace,
    recvQ,
    pressureRatio: freeBuffer > 0 ? accumulated / freeBuffer : accumulated > 0 ? Infinity : 0
  };
}

/**
 * Detect TCP symptom deltas around a pause.
 */
function detectSymptoms(before, after) {
  if (!before.length || !after.length) return { detected: false, signals: [] };
  const b = before[before.length - 1];
  const a = after[0];
  const signals = [];

  const dRecvQ = (a.recvQ || 0) - (b.recvQ || 0);
  if (dRecvQ > 0) signals.push({ signal: "recvQ_rise", delta: dRecvQ });

  const dSkmemR = (a.skmem_r || 0) - (b.skmem_r || 0);
  if (dSkmemR > 0) signals.push({ signal: "skmem_r_rise", delta: dSkmemR });

  const dRcvSpace = (a.rcv_space || 0) - (b.rcv_space || 0);
  if (dRcvSpace < 0) signals.push({ signal: "rcv_space_drop", delta: dRcvSpace });

  const dRcvSsthresh = (a.rcv_ssthresh || 0) - (b.rcv_ssthresh || 0);
  if (dRcvSsthresh < 0) signals.push({ signal: "rcv_ssthresh_drop", delta: dRcvSsthresh });

  if (a.persist && !b.persist) signals.push({ signal: "persist_appeared" });
  if (a.zero_window && !b.zero_window) signals.push({ signal: "zero_window_appeared" });

  return { detected: signals.length > 0, signals };
}

/**
 * Detect sender-side TCP symptoms when GC is on the remote receiver.
 */
function detectSenderSymptoms(before, after) {
  if (!before.length || !after.length) return { detected: false, signals: [] };
  const b = before[before.length - 1];
  const a = after[0];
  const signals = [];

  const dSendQ = (a.sendQ || 0) - (b.sendQ || 0);
  if (dSendQ > 0) signals.push({ signal: "sendQ_rise", delta: dSendQ });

  const dRtt = (a.rtt || 0) - (b.rtt || 0);
  if (dRtt > 5) signals.push({ signal: "rtt_spike", delta: dRtt });

  const dCwnd = (a.cwnd || 0) - (b.cwnd || 0);
  if (dCwnd < 0) signals.push({ signal: "cwnd_drop", delta: dCwnd });

  const dPacing = (a.pacing_rate || 0) - (b.pacing_rate || 0);
  if (dPacing < 0 && b.pacing_rate > 0) signals.push({ signal: "pacing_drop", delta: dPacing });

  if ((a.rwnd || a.rcv_wnd || 0) < (b.rwnd || b.rcv_wnd || 0)) signals.push({ signal: "rwnd_drop", delta: (a.rwnd || a.rcv_wnd || 0) - (b.rwnd || b.rcv_wnd || 0) });

  if (a.retrans > b.retrans) signals.push({ signal: "retrans_increase", delta: (a.retrans || 0) - (b.retrans || 0) });

  return { detected: signals.length > 0, signals };
}

/**
 * Check counter-evidence that TCP symptoms are NOT caused by GC.
 */
function counterEvidence(before, after) {
  if (!before.length || !after.length) return [];
  const b = before[before.length - 1];
  const a = after[0];
  const ce = [];

  // Symptoms started before pause
  if ((b.recvQ || 0) > 1000) ce.push("recvQ already elevated before pause");
  // Retrans/RTT dominate
  const dRetrans = (a.retrans || 0) - (b.retrans || 0);
  if (dRetrans > 2) ce.push("retransmissions suggest network congestion");
  const dRtt = (a.rtt || 0) - (b.rtt || 0);
  if (dRtt > 50) ce.push("RTT spike suggests network issue, not JVM stall");
  // Send-Q indicates downstream
  if ((a.sendQ || 0) > 10000) ce.push("high Send-Q suggests downstream slow consumer");
  // app_limited
  if (a.app_limited) ce.push("app_limited indicates application not pushing data");

  return ce;
}

/**
 * Compute correlation score (0-1) for a single pause.
 */
function correlationScore(symptoms, pressure, counter, pause) {
  let score = 0;
  if (!symptoms.detected) return 0;

  // Signal strength
  score += Math.min(0.3, symptoms.signals.length * 0.1);
  // Buffer pressure
  if (pressure && pressure.pressureRatio > 0.5) score += 0.2;
  if (pressure && pressure.pressureRatio > 1.0) score += 0.1;
  // Pause severity
  if (pause.durationMs > 20) score += 0.1;
  if (pause.durationMs > 100) score += 0.1;
  if (pause.type === "Full" || pause.evacuationFailure) score += 0.15;
  // Counter-evidence reduces score
  score -= counter.length * 0.15;

  return Math.max(0, Math.min(1, score));
}

/**
 * Determine severity from correlation score.
 */
function scoreSeverity(score, pause) {
  if (score >= 0.7 && (pause.durationMs > 50 || pause.type === "Full")) return "critical";
  if (score >= 0.5) return "warning_high";
  if (score >= 0.25) return "warning";
  if (score > 0) return "info";
  return "none";
}

/**
 * Main correlation function.
 * @param {Object} opts
 * @param {Array} opts.pauses - Aligned GC pauses
 * @param {Array} opts.safepoints - Aligned safepoints
 * @param {Array} opts.history - ss snapshot history with epochMs
 * @param {Object} opts.windows - Correlation window config
 * @param {number} opts.clockOffsetMs - Clock skew
 * @returns {Object} Correlation results
 */
export function correlateJvmStalls({ pauses, safepoints = [], history, windows = DEFAULT_WINDOWS, clockOffsetMs = 0, mode = "receiver" }) {
  const aligned = alignTimestamps(pauses, history, clockOffsetMs);
  const alignedSp = alignTimestamps(safepoints.map(s => ({ ...s, durationMs: s.totalMs })), history, clockOffsetMs);
  const detect = mode === "sender" ? detectSenderSymptoms : detectSymptoms;
  const results = [];

  for (const pause of aligned) {
    const t = pause.alignedEpochMs;
    if (!t) continue;
    const { before, after } = snapshotsInWindow(history, t, windows.beforeMs, windows.afterShortMs);
    const afterLong = snapshotsInWindow(history, t, 0, windows.afterLongMs).after;
    const symptoms = detect(before, after.length ? after : afterLong);
    const pressure = bufferPressure(pause, before);
    const counter = counterEvidence(before, after.length ? after : afterLong);
    const score = correlationScore(symptoms, pressure, counter, pause);
    const severity = scoreSeverity(score, pause);

    results.push({
      pause,
      epochMs: t,
      symptoms,
      pressure,
      counterEvidence: counter,
      score,
      severity,
      classification: classifyPause(pause)
    });
  }

  // Overall summary
  const maxScore = results.reduce((m, r) => Math.max(m, r.score), 0);
  const correlated = results.filter(r => r.score > 0.2);
  const overallSeverity = results.reduce((s, r) => {
    const order = ["none", "info", "warning", "warning_high", "critical"];
    return order.indexOf(r.severity) > order.indexOf(s) ? r.severity : s;
  }, "none");

  return {
    results,
    summary: {
      totalPauses: aligned.length,
      totalSafepoints: alignedSp.length,
      correlatedCount: correlated.length,
      maxScore,
      overallSeverity,
      recommendations: g1Recommendations(pauses)
    }
  };
}

export { DEFAULT_WINDOWS };
