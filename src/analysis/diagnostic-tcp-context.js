import { analyzeBdpWindowLimit } from "./bdp-window-analysis.js";
import { analyzeRcvSsthreshTrend } from "./rcv-ssthresh-analysis.js";
import { analyzeWscaleContext } from "./wscale-analysis.js";
import { confidenceScore, makeHypothesis, severityScore } from "./diagnostic-helpers.js";

export function buildTcpContextHypotheses({ withMetrics, history, recvWarn, bdpWindow = {} }) {
  const hypotheses = [];
  const wscaleWarnings = withMetrics
    .map(({ socket }) => analyzeWscaleContext(socket, { history }))
    .filter(item => item.status === "warning");
  const rcvSsthreshWarnings = withMetrics
    .map(({ socket }) => analyzeRcvSsthreshTrend(socket, { history, recvWarn }))
    .filter(item => item.status === "warning");
  const bdpWindowWarnings = withMetrics
    .map(({ socket }) => analyzeBdpWindowLimit(socket, {
      history,
      recvWarn,
      direction: bdpWindow.direction || "inbound",
      configuredLinkCapacityMbps: bdpWindow.configuredLinkCapacityMbps
    }))
    .filter(item => item.status === "warning");

  if (wscaleWarnings.length) {
    hypotheses.push(makeHypothesis({
      id: "tcp-window-scale-context",
      title: "TCP window scaling deserves validation",
      category: "tcp-flow-control",
      severity: "medium",
      confidence: "medium",
      summary: "wscale is handshake context, not a root cause by itself. The current evidence suggests validating TCP Window Scale against BDP, receive-window pressure, and the SYN/SYN-ACK capture before blaming the network.",
      sockets: wscaleWarnings.map(item => item.socket),
      evidence: wscaleWarnings.flatMap(item => item.evidence),
      counterEvidence: [
        ...wscaleWarnings.flatMap(item => item.counterEvidence),
        "This diagnostic is capped at warning level: wscale alone never creates a critical anomaly."
      ],
      learnMore: wscaleWarnings.flatMap(item => item.learnMore),
      commands: wscaleWarnings.flatMap(item => item.commands)
    }));
  }

  if (rcvSsthreshWarnings.length) {
    const top = rcvSsthreshWarnings.reduce((best, item) => item.score > (best?.score || 0) ? item : best, null);
    const strongSlowConsumer = rcvSsthreshWarnings.some(item => item.hypothesis === "slow-consumer-suspected");
    const ambiguousPath = rcvSsthreshWarnings.some(item => item.hypothesis === "network-or-receiver-ambiguous");
    hypotheses.push(makeHypothesis({
      id: "tcp-receive-ssthresh-trend",
      title: strongSlowConsumer ? "Receive autotuning drop supports slow-consumer suspicion" : "Receive autotuning threshold changed",
      category: "tcp-flow-control",
      severity: rcvSsthreshWarnings.reduce((level, item) => severityScore(item.severity) > severityScore(level) ? item.severity : level, "low"),
      confidence: rcvSsthreshWarnings.reduce((level, item) => confidenceScore(item.confidence) > confidenceScore(level) ? item.confidence : level, "low"),
      summary: strongSlowConsumer
        ? "rcv_ssthresh fell significantly and the same flow shows receive-side pressure. This supports a slow-consumer / receiver backpressure hypothesis, but it still needs process-level confirmation."
        : ambiguousPath
          ? "rcv_ssthresh fell, but RTT/retransmission context keeps network or path congestion as a competing hypothesis. Treat this as a correlated warning, not a receiver-only verdict."
          : "rcv_ssthresh fell across timestamped snapshots. This is receive-window autotuning context and deserves correlation with rcv_space, Recv-Q, skmem, RTT, retransmission, and progress counters.",
      sockets: rcvSsthreshWarnings.map(item => item.socket),
      evidence: rcvSsthreshWarnings.flatMap(item => item.evidence),
      counterEvidence: [
        ...rcvSsthreshWarnings.flatMap(item => item.counterEvidence),
        "This diagnostic does not fire from a single rcv_ssthresh sample.",
        top?.trend?.relativeDropPct ? `Largest observed rcv_ssthresh decline is ${top.trend.relativeDropPct.toFixed(1)}%.` : ""
      ],
      learnMore: rcvSsthreshWarnings.flatMap(item => item.learnMore),
      commands: rcvSsthreshWarnings.flatMap(item => item.commands)
    }));
  }

  if (bdpWindowWarnings.length) {
    const top = bdpWindowWarnings.reduce((best, item) => item.score > (best?.score || 0) ? item : best, null);
    const slowConsumer = bdpWindowWarnings.some(item => item.hypothesis === "slow-consumer-window-pressure");
    const pathRecovery = bdpWindowWarnings.some(item => item.hypothesis === "path-recovery-more-likely");
    hypotheses.push(makeHypothesis({
      id: "bdp-window-limited-throughput",
      title: slowConsumer ? "Window-limited throughput with receiver pressure" : "Possible TCP receive-window throughput limit",
      category: "tcp-flow-control",
      severity: bdpWindowWarnings.reduce((level, item) => severityScore(item.severity) > severityScore(level) ? item.severity : level, "low"),
      confidence: bdpWindowWarnings.reduce((level, item) => confidenceScore(item.confidence) > confidenceScore(level) ? item.confidence : level, "low"),
      summary: pathRecovery
        ? "BDP/window math shows a possible window limit, but retransmission, high RTT, and low cwnd keep congestion/loss as a competing explanation. Do not call the physical link saturated without configured capacity."
        : "Observed throughput is close to the theoretical throughput allowed by the effective TCP window for several snapshots. This suggests a possible receive-window bottleneck, not a measured physical link capacity.",
      sockets: bdpWindowWarnings.map(item => item.socket),
      evidence: bdpWindowWarnings.flatMap(item => item.evidence),
      counterEvidence: [
        ...bdpWindowWarnings.flatMap(item => item.counterEvidence),
        top?.stats?.strongWindowRun ? `Strongest window-pressure run lasts ${top.stats.strongWindowRun} consecutive snapshot(s).` : "",
        top?.stats?.nearWindowRun ? `Near-window run lasts ${top.stats.nearWindowRun} consecutive snapshot(s).` : ""
      ],
      learnMore: bdpWindowWarnings.flatMap(item => item.learnMore),
      commands: bdpWindowWarnings.flatMap(item => item.commands)
    }));
  }

  return hypotheses;
}
