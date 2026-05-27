export function buildAiSummary({ matrix, stories, multiSocket, rateAlerts, captureQuality, hypotheses, comparison }) {
  const lines = [];

  // What happened
  if (multiSocket?.length) {
    const top = multiSocket[0];
    if (top.type === "process-wide") {
      lines.push(`${top.groupKey} experienced a simultaneous stall across ${top.socketCount} connections at ${formatT(top.epochMs)}, showing ${top.symptomLabel}.`);
    } else if (top.type === "container-wide") {
      lines.push(`Container ${top.groupKey} had ${top.socketCount} sockets affected across multiple processes at ${formatT(top.epochMs)} — suspect host-level issue.`);
    } else {
      lines.push(`Peer ${top.groupKey} showed degradation on ${top.socketCount} connections at ${formatT(top.epochMs)}.`);
    }
  } else if (stories?.length) {
    const top = stories[0];
    lines.push(`${top.title} detected: ${top.matchedSteps.length} causal steps observed between ${formatT(top.startMs)} and ${formatT(top.endMs)}.`);
  }

  // Severity
  if (rateAlerts?.length) {
    const worst = rateAlerts[0];
    lines.push(`Peak velocity: ${worst.label} on ${worst.process || worst.peer} reached ${worst.rateFormatted} (${formatVal(worst.prevValue)} → ${formatVal(worst.currValue)} in ${worst.dtMs}ms).`);
  }

  // Root cause
  if (matrix?.topCause && matrix.topCause.confidence > 0.3) {
    const c = matrix.topCause;
    const pct = Math.round(c.confidence * 100);
    if (matrix.ambiguous) {
      lines.push(`Root cause is ambiguous: ${matrix.causes.slice(0, 2).map(x => `${x.label} (${Math.round(x.confidence * 100)}%)`).join(" vs ")}. More evidence needed.`);
    } else {
      lines.push(`Most likely cause: ${c.label} (${pct}% confidence, ${c.signalCount}/${c.totalSignals} signals present).`);
    }
  }

  // Network exoneration
  const hyps = hypotheses || [];
  const networkHyp = hyps.find(h => h.id === "path-congestion-or-loss" || h.id === "network-congestion-pattern");
  const appHyp = hyps.find(h => h.id === "local-app-not-reading" || h.id === "zero-window-or-slow-consumer");
  if (appHyp && (!networkHyp || networkHyp.confidenceScore < 0.3)) {
    lines.push("Network path appears healthy (RTT stable, no retransmission growth). The issue is application-side, not network.");
  } else if (networkHyp && networkHyp.confidenceScore > 0.5) {
    lines.push("Network path shows degradation signals (RTO/retrans/cwnd). Investigate path with mtr and NIC counters.");
  }

  // Comparison verdict
  if (comparison?.verdict) {
    lines.push(`Baseline comparison: ${comparison.verdict}`);
  }

  // Recommendation
  if (lines.length) {
    const topHyp = hyps[0];
    if (topHyp?.confidenceDetail?.wouldConfirm) {
      lines.push(`Next step: ${topHyp.confidenceDetail.wouldConfirm}`);
    }
  }

  // Quality caveat
  if (captureQuality && captureQuality.score < 55) {
    lines.push(`⚠️ Capture quality is ${captureQuality.grade} (${captureQuality.score}/100) — conclusions should remain cautious.`);
  }

  if (!lines.length) {
    return "No significant pattern detected. Load a timestamped capture with multiple snapshots for deeper analysis.";
  }

  return lines.slice(0, 3).join(" ");
}

function formatT(epochMs) {
  if (!epochMs) return "??:??:??";
  const d = new Date(epochMs);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")} UTC`;
}

function formatVal(v) {
  if (v >= 1048576) return `${(v / 1048576).toFixed(1)}MB`;
  if (v >= 1024) return `${Math.round(v / 1024)}KB`;
  return String(v);
}
