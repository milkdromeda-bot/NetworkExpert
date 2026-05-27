import { commandSleepIntervalMs } from "./capture-quality-helpers.js";

export function buildDiagnosisReadiness(featureCards, dataIntegrity) {
  const byKey = Object.fromEntries(featureCards.map(card => [card.key, card]));
  const statusOf = key => byKey[key]?.status || "missing";
  const hasHighIntegrityIssue = dataIntegrity.some(issue => issue.severity === "high");
  const card = (key, label, required, helpful, detailOk, detailPartial) => {
    const missingRequired = required.filter(item => statusOf(item) === "missing");
    const partialRequired = required.filter(item => statusOf(item) === "partial");
    const missingHelpful = helpful.filter(item => statusOf(item) === "missing");
    const status = missingRequired.length ? "weak" : (partialRequired.length || missingHelpful.length || hasHighIntegrityIssue) ? "partial" : "strong";
    return {
      key,
      label,
      status,
      detail: status === "strong" ? detailOk : detailPartial,
      blockers: [...missingRequired, ...partialRequired].map(item => byKey[item]?.label || item),
      helpfulMissing: missingHelpful.map(item => byKey[item]?.label || item)
    };
  };

  return [
    card(
      "slowConsumer",
      "Slow consumer / Zero Window",
      ["timestamps", "snapshotDepth", "tcpInfo", "timers", "socketMemory"],
      ["process", "identity", "counters"],
      "Strong enough to correlate Recv-Q, rcv_space, skmem, timers, and process context.",
      "Slow-consumer diagnosis must stay cautious until queue, memory, timer, and trend evidence are complete."
    ),
    card(
      "networkCongestion",
      "Network congestion / loss",
      ["timestamps", "snapshotDepth", "tcpInfo", "counters"],
      ["timers", "duration", "identity"],
      "Strong enough to compare RTT/RTO, retransmission counters, cwnd, rates, and time evolution.",
      "Congestion/loss diagnosis needs repeated TCP internals and counters; avoid blaming the network from one snapshot."
    ),
    card(
      "bdpWindow",
      "BDP / window-limited throughput",
      ["timestamps", "snapshotDepth", "tcpInfo", "counters"],
      ["duration", "cadence"],
      "Strong enough to compute observed throughput, BDP, and window-limited theoretical throughput.",
      "BDP/window analysis needs reliable byte deltas, RTT, rcv_space, and repeated timestamps."
    ),
    card(
      "lifecycle",
      "Socket lifecycle / reconnects",
      ["timestamps", "snapshotDepth", "identity"],
      ["process", "cgroup"],
      "Strong enough to track one socket across state changes and distinguish reconnects from state transitions.",
      "Lifecycle analysis is fragile without sk/ino identity and repeated timestamped snapshots."
    )
  ];
}

export function buildMessages({ score, grade, featureCards, stats, raw, command, dataIntegrity }) {
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

  for (const issue of dataIntegrity) warnings.push(issue.message);

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
    recommendations.push("Counter resets suggest socket recycling - correlate with connection lifecycle before trusting delta calculations.");
  }
  if (dataIntegrity.some(i => i.type === "cadence-drift")) {
    recommendations.push("Observed cadence is slower than requested; increase sleep interval or write to a fast local file before chasing sub-second events.");
  }
  if (dataIntegrity.some(i => i.type === "socket-churn" || i.type === "state-transitions")) {
    recommendations.push("Review socket lifecycle before counting rows as independent sockets; prefer sk/ino identity over local/peer alone.");
  }
  if (dataIntegrity.some(i => i.type === "no-ms-precision")) {
    recommendations.push("Use date --iso-8601=ns for sub-second captures to get accurate interval measurements.");
  }
  if (score >= 85) {
    recommendations.push("This capture is strong enough for timeline, chart, and diagnostic correlation. Keep the same collection pattern for incident runs.");
  }
  if (grade === "usable") {
    recommendations.push("Keep diagnostics cautious: use the report to identify which missing evidence blocks a firmer conclusion.");
  }

  return { strengths, warnings, missing, recommendations };
}
