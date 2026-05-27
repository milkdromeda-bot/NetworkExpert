export function buildGuidedChecklistItems({
  socket,
  lens = null,
  burst = null,
  anomalies = [],
  thresholdFor = () => ({ warn: Infinity, danger: Infinity }),
  formatMicroburstWindow = () => "the detected window",
  formatTailLatencyWindow = () => "the worst tail window"
} = {}) {
  if (!socket) return [];

  const values = socket.details?.values || {};
  const skmem = socket.details?.skmem || {};
  const recvThreshold = thresholdFor("recvQ");
  const sendThreshold = thresholdFor("sendQ");
  const rtoThreshold = thresholdFor("rto");
  const recvPressure = socket.recvQ >= recvThreshold.warn || (skmem.rb && skmem.r && skmem.r / skmem.rb > 0.75);
  const sendPressure = socket.sendQ >= sendThreshold.warn || (skmem.tb && (skmem.t + (skmem.w || 0)) / skmem.tb > 0.75);
  const dropPressure = (skmem.d || 0) > 0 || anomalies.some(item => item.metric === "skmem.d");
  const pathSignals = (socket.details?.timer?.retrans || 0) > 0
    || (values.backoff || 0) > 0
    || (values.rto || 0) >= rtoThreshold.warn
    || anomalies.some(item => ["rto", "backoff", "timer", "mss"].includes(item.metric));
  const items = [];

  if (recvPressure) {
    items.push({
      id: "slow-consumer",
      severity: socket.recvQ >= recvThreshold.danger ? "critical" : "high",
      title: "slow consumer probable",
      why: socket.details?.process
        ? `Recv-Q and receive memory suggest ${socket.details.process.name}:${socket.details.process.pid} may not be draining data fast enough.`
        : "Recv-Q and receive memory are rising in a way that usually points to a local reader stall or scheduler delay.",
      next: "Open charts with the Microburst investigation preset and compare Recv-Q, RX bandwidth, skmem.r, and drops.",
      action: "openChecklistCharts",
      actionLabel: "Open microburst charts",
      preset: "microburst"
    });
  }

  if (burst || (recvPressure && dropPressure)) {
    items.push({
      id: "receive-pressure",
      severity: burst?.severity || "high",
      title: "receive-side pressure",
      why: burst
        ? `A short burst window was detected at ${formatMicroburstWindow(burst)} with queue, receive-memory, and drop growth together.`
        : "Receive pressure is visible in the current socket, and drops suggest the kernel burst absorber is being stressed.",
      next: "Keep the yellow microburst band in view and verify whether the same process or peer repeats it.",
      action: "openChecklistCharts",
      actionLabel: "Review burst window",
      preset: "microburst"
    });
  }

  if (lens?.suspicion === "path instability" || pathSignals) {
    items.push({
      id: "path-instability",
      severity: lens?.severity || "high",
      title: "path instability",
      why: lens
        ? `The tail-latency lens isolated ${formatTailLatencyWindow(lens)} as the worst short RTT/RTO window, which is more informative than the average latency.`
        : "RTO, retransmission, backoff, or tiny-MSS symptoms suggest the path or negotiation is unstable.",
      next: "Use the Tail latency preset, then zoom to the worst window and correlate RTT variance, RTO, Send-Q, and retransmission signals.",
      action: lens ? "zoomTailWindow" : "openChecklistCharts",
      actionLabel: lens ? "Zoom worst tail window" : "Open tail charts",
      preset: "tail"
    });
  }

  if (sendPressure || lens?.suspicion === "peer-side drain issue") {
    items.push({
      id: "peer-drain",
      severity: socket.sendQ >= sendThreshold.danger ? "critical" : "high",
      title: "peer-side drain issue",
      why: "Outbound data is not draining cleanly. This can be a slow peer, congested path, or TCP recovery rather than a purely local sender problem.",
      next: "Compare Send-Q, TX bandwidth, RTO, and cwnd on the worst tail window before blaming application throughput.",
      action: "openChecklistCharts",
      actionLabel: "Open tail charts",
      preset: "tail"
    });
  }

  if ((recvPressure || sendPressure || dropPressure) && (pathSignals || burst || lens)) {
    items.push({
      id: "buffer-tuning",
      severity: "medium",
      title: "buffer tuning suspicious but not root cause",
      why: "Queue and socket-memory pressure are visible, but the surrounding symptoms suggest an upstream bottleneck, tail spike, or burst pattern is the primary issue.",
      next: "Do not jump straight to rmem/wmem tuning. Prove whether the root cause is local draining, peer-side slowness, or path instability first.",
      action: "openChecklistAdvisor",
      actionLabel: "Review advisor path"
    });
  }

  return items.slice(0, 5);
}
