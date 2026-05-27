const SEVERITY_SCORE = { low: 1, medium: 2, high: 3, critical: 4 };

function scoreSeverity(value) {
  return SEVERITY_SCORE[String(value || "").toLowerCase()] || 0;
}

export function pickExecutiveFocusSocket(selectedSocket, sockets = []) {
  if (selectedSocket) return selectedSocket;
  return [...sockets].sort((a, b) => {
    const aScore = scoreSeverity(a?.risk) * 1000 + Number(a?.anomalyCount || 0) * 10 + Number(a?.sendQ || 0) + Number(a?.recvQ || 0);
    const bScore = scoreSeverity(b?.risk) * 1000 + Number(b?.anomalyCount || 0) * 10 + Number(b?.sendQ || 0) + Number(b?.recvQ || 0);
    return bScore - aScore;
  })[0] || null;
}

export function buildExecutiveSummary({
  focusSocket = null,
  anomalies = [],
  advisorFindings = [],
  microburst = null,
  tailLatency = null,
  checklistItems = [],
  formatMicroburstWindow = () => "microburst window",
  formatTailLatencyWindow = () => "tail window",
  formatMetricValue = (_metric, value) => String(value ?? 0)
} = {}) {
  if (!focusSocket && !anomalies.length && !advisorFindings.length && !microburst && !tailLatency && !checklistItems.length) return null;

  const topAnomaly = anomalies.slice().sort((a, b) => scoreSeverity(b.severity) - scoreSeverity(a.severity))[0] || null;
  const topAdvisor = advisorFindings[0] || null;

  let severity = focusSocket?.risk || "low";
  let title = "No dominant signal yet";
  let headline = "No burst, tail, or advisor pattern clearly dominates yet.";
  let summary = "Start with the riskiest visible flow, then compare queues, RTT, RTO, and drops on the same time window.";
  let next = "Open charts for the focus flow and keep the filtered socket table sorted by risk.";

  if (microburst) {
    severity = microburst.severity;
    title = "Receive-side microburst";
    headline = "A short receive-side burst is dominating the current incident view.";
    summary = `Window ${formatMicroburstWindow(microburst)} with RX peak ${formatMetricValue("rx_bps", microburst.peakRxBps)}, Recv-Q ${formatMetricValue("recvQ", microburst.peakRecvQ)}, and ${formatMetricValue("skmem.d", microburst.dropDeltaTotal)} new drops.`;
    next = "Keep the yellow band in view and compare the same window across RX bandwidth, Recv-Q, skmem.r, and drops.";
  } else if (tailLatency) {
    severity = tailLatency.severity;
    title = tailLatency.suspicion === "path instability"
      ? "Path instability"
      : tailLatency.suspicion === "peer-side drain issue"
        ? "Peer-side drain issue"
        : tailLatency.suspicion === "receive-side pressure"
          ? "Receive-side pressure"
          : "Tail latency spike";
    headline = "Short tail behavior matters more than the average on this view.";
    summary = `Worst window ${formatTailLatencyWindow(tailLatency)} with RTT tail ${formatMetricValue("rtt", tailLatency.stats?.rtt?.p99 || 0)} / ${formatMetricValue("rtt", tailLatency.stats?.rtt?.p999 || 0)} and RTO tail ${formatMetricValue("rto", tailLatency.stats?.rto?.p99 || 0)} / ${formatMetricValue("rto", tailLatency.stats?.rto?.p999 || 0)}.`;
    next = "Use Tail latency charts and zoom the worst short window before reasoning from medians.";
  } else if (checklistItems.length) {
    severity = checklistItems[0].severity;
    title = checklistItems[0].title;
    headline = "The current socket evidence already suggests a concrete next move.";
    summary = checklistItems[0].why;
    next = checklistItems[0].next;
  } else if (topAdvisor) {
    severity = topAdvisor.severity;
    title = topAdvisor.title;
    headline = "Background analysis found a higher-value path to investigate first.";
    summary = topAdvisor.pattern || topAdvisor.why || "Advisor findings are available for the current dataset.";
    next = Array.isArray(topAdvisor.next) ? topAdvisor.next[0] : topAdvisor.next || "Open the advisor tab to review the suggested evidence path.";
  } else if (topAnomaly) {
    severity = topAnomaly.severity;
    title = topAnomaly.title;
    headline = "One anomaly is stronger than the rest and should anchor the first check.";
    summary = topAnomaly.detail;
    next = "Open details or charts for the focus flow and validate whether the anomaly is growing over time.";
  }

  return {
    severity,
    title,
    headline,
    summary,
    next,
    focusSocket
  };
}
