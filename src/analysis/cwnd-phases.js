/**
 * TCP congestion window phase detection.
 * Classifies each history row into: slow-start, congestion-avoidance, fast-recovery, or loss.
 * Uses cwnd growth patterns, ssthresh relationship, and retransmission signals.
 */

/**
 * @typedef {"slow-start"|"congestion-avoidance"|"fast-recovery"|"loss"|"idle"} CwndPhase
 * @typedef {{ epochMs: number, t: number, cwnd: number, phase: CwndPhase }} PhaseRow
 */

/**
 * Detect cwnd phases from a socket history timeline.
 * @param {Array<{epochMs?: number, t: number, cwnd: number, retrans?: number, backoff?: number, rto?: number}>} history
 * @returns {{ phases: PhaseRow[], summary: { slowStart: number, congestionAvoidance: number, fastRecovery: number, loss: number, idle: number } }}
 */
export function detectCwndPhases(history) {
  if (!history || history.length < 2) return { phases: [], summary: { slowStart: 0, congestionAvoidance: 0, fastRecovery: 0, loss: 0, idle: 0 } };

  const phases = [];
  let prevCwnd = 0;
  let peakCwnd = 0;
  let inRecovery = false;

  for (let i = 0; i < history.length; i++) {
    const row = history[i];
    const cwnd = row.cwnd || 0;
    const retrans = row.retrans || 0;
    const backoff = row.backoff || 0;

    let phase;
    if (cwnd === 0) {
      phase = "idle";
    } else if (retrans > 0 || backoff > 0) {
      // Loss event or recovery
      if (cwnd < prevCwnd * 0.7) {
        phase = "loss";
        inRecovery = true;
        peakCwnd = prevCwnd;
      } else {
        phase = "fast-recovery";
        inRecovery = true;
      }
    } else if (inRecovery && cwnd < peakCwnd * 0.9) {
      // Still recovering toward previous peak
      phase = "fast-recovery";
      if (cwnd >= peakCwnd * 0.9) inRecovery = false;
    } else {
      inRecovery = false;
      const growth = prevCwnd > 0 ? (cwnd - prevCwnd) / prevCwnd : 0;
      if (growth > 0.3 && cwnd > prevCwnd) {
        // Exponential growth = slow start
        phase = "slow-start";
      } else {
        // Linear or stable = congestion avoidance
        phase = "congestion-avoidance";
      }
    }

    phases.push({ epochMs: row.epochMs || 0, t: row.t, cwnd, phase });
    prevCwnd = cwnd;
  }

  const summary = { slowStart: 0, congestionAvoidance: 0, fastRecovery: 0, loss: 0, idle: 0 };
  for (const p of phases) {
    if (p.phase === "slow-start") summary.slowStart++;
    else if (p.phase === "congestion-avoidance") summary.congestionAvoidance++;
    else if (p.phase === "fast-recovery") summary.fastRecovery++;
    else if (p.phase === "loss") summary.loss++;
    else summary.idle++;
  }
  return { phases, summary };
}
