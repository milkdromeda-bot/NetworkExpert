import { metricValue } from "./parser.js";
import { analyzeBdpWindowLimit } from "./bdp-window-analysis.js";
import { analyzeRcvSsthreshTrend } from "./rcv-ssthresh-analysis.js";
import { analyzeWscaleContext } from "./wscale-analysis.js";

const SEVERITY_SCORE = { low: 1, medium: 2, high: 3, critical: 4 };
const CONFIDENCE_SCORE = { low: 1, medium: 2, high: 3 };

function severityScore(value) {
  return SEVERITY_SCORE[String(value || "").toLowerCase()] || 0;
}

function confidenceScore(value) {
  return CONFIDENCE_SCORE[String(value || "").toLowerCase()] || 0;
}

function threshold(thresholds, metric, level, fallback) {
  const config = typeof thresholds === "function" ? thresholds(metric) : thresholds?.[metric];
  const value = Number(config?.[level]);
  return Number.isFinite(value) ? value : fallback;
}

function unique(values, limit = 6) {
  return [...new Set(values.filter(Boolean))].slice(0, limit);
}

function processName(socket) {
  const process = socket?.details?.process;
  return process ? `${process.name}:${process.pid}` : "";
}

function hasAnomaly(anomaliesBySocket, socket, metrics) {
  const wanted = new Set(metrics);
  return (anomaliesBySocket.get(socket.id) || []).some(item => wanted.has(item.metric) || wanted.has(item.title));
}

function anomalyMap(anomalies = []) {
  const map = new Map();
  for (const anomaly of anomalies) {
    if (!anomaly?.socketId) continue;
    if (!map.has(anomaly.socketId)) map.set(anomaly.socketId, []);
    map.get(anomaly.socketId).push(anomaly);
  }
  return map;
}

function socketMetrics(socket) {
  const timerName = String(socket?.details?.timer?.name || "").toLowerCase();
  const values = socket?.details?.values || {};
  const hasSndWnd = Object.hasOwn(values, "snd_wnd");
  const hasRcvWnd = Object.hasOwn(values, "rcv_wnd");
  const hasRcvSpace = Object.hasOwn(values, "rcv_space");
  return {
    sendQ: Number(socket?.sendQ || 0),
    recvQ: Number(socket?.recvQ || 0),
    rtt: metricValue(socket, "rtt"),
    rto: metricValue(socket, "rto"),
    cwnd: metricValue(socket, "cwnd"),
    backoff: metricValue(socket, "backoff"),
    retrans: Number(socket?.details?.timer?.retrans || 0),
    drops: metricValue(socket, "skmem.d"),
    skmemR: metricValue(socket, "skmem.r"),
    skmemT: metricValue(socket, "skmem.t"),
    deliveryRate: metricValue(socket, "delivery_rate"),
    pacingRate: metricValue(socket, "pacing_rate"),
    rwndLimitedMs: metricValue(socket, "rwnd_limited"),
    rwndLimitedPct: metricValue(socket, "rwnd_limited_pct"),
    sndWnd: hasSndWnd ? metricValue(socket, "snd_wnd") : null,
    rcvWnd: hasRcvWnd ? metricValue(socket, "rcv_wnd") : null,
    rcvSpace: hasRcvSpace ? metricValue(socket, "rcv_space") : null,
    hasSndWnd,
    hasRcvWnd,
    hasRcvSpace,
    timerName,
    persist: timerName === "persist"
  };
}

function historyDropGrowth(history = []) {
  let total = 0;
  let peakRate = 0;
  for (let i = 1; i < history.length; i += 1) {
    const prev = history[i - 1];
    const row = history[i];
    if (prev?.socketPresent === false || row?.socketPresent === false) continue;
    const elapsed = Math.max(0.001, Number(row.epochMs || 0) - Number(prev.epochMs || 0)) / 1000;
    const delta = Math.max(0, Number(row["skmem.d"] || 0) - Number(prev["skmem.d"] || 0));
    if (!delta) continue;
    total += delta;
    peakRate = Math.max(peakRate, delta / elapsed);
  }
  return { total, peakRate };
}

function historyMetricGrowth(history = [], metric) {
  const values = history
    .filter(row => row?.socketPresent !== false)
    .map(row => Number(row?.[metric] || 0))
    .filter(Number.isFinite);
  if (values.length < 2) return { increased: false, delta: 0, first: values[0] || 0, last: values.at(-1) || 0, max: values[0] || 0 };
  const first = values[0];
  const last = values.at(-1);
  const max = Math.max(...values);
  return { increased: last > first, delta: last - first, first, last, max };
}

function isReceiverWindowLimited(metrics) {
  return metrics.persist || metrics.hasSndWnd && metrics.sndWnd === 0 || metrics.rwndLimitedPct >= 20 || metrics.rwndLimitedMs >= 1000;
}

function isLocalReceiveWindowCollapse(metrics, recvWarn) {
  const receivePressure = metrics.recvQ > recvWarn || metrics.skmemR > 0;
  const lowReceiveSpace = metrics.hasRcvSpace && metrics.rcvSpace <= 8192;
  const zeroReceiveWindow = metrics.hasRcvWnd && metrics.rcvWnd === 0;
  return receivePressure && (lowReceiveSpace || zeroReceiveWindow);
}

function isTcpRecoverySignal(metrics, rtoWarn) {
  return metrics.retrans > 0 || metrics.rto >= rtoWarn || metrics.backoff >= 4 && (metrics.rtt >= 150 || metrics.cwnd > 0 && metrics.cwnd <= 4);
}

function isNetworkCongestionPattern(metrics, rtoWarn, cwndWarn) {
  return metrics.rto >= rtoWarn && (metrics.backoff > 0 || metrics.retrans > 0) && (metrics.cwnd > 0 && metrics.cwnd <= cwndWarn || metrics.rtt >= 150);
}

function backoffWaitSummary(metrics) {
  if (!metrics.backoff) return "";
  if (!metrics.rto) return `backoff:${metrics.backoff} means TCP is waiting longer before the next recovery/probe attempt.`;
  const multiplier = 2 ** Math.min(12, metrics.backoff);
  const waitMs = metrics.rto * multiplier;
  const waitLabel = waitMs >= 1000 ? `${(waitMs / 1000).toFixed(waitMs >= 10000 ? 0 : 1)}s` : `${Math.round(waitMs)}ms`;
  return `backoff:${metrics.backoff} with rto:${metrics.rto}ms implies an approximate wait near ${waitLabel} before the next retry/probe.`;
}

function computeActionableCommands(id, sockets, evidence) {
  const top = sockets[0];
  if (!top) return [];
  const pid = top.details?.process?.pid;
  const peer = top.peerAddress?.host || top.peer;
  const local = top.localAddress?.host || top.local;
  const iface = "eth0";
  const rb = top.details?.skmem?.rb || 0;
  const recvQ = top.recvQ || 0;
  const sendQ = top.sendQ || 0;
  const rtt = top.details?.rtt || 0;
  const cwnd = top.details?.cwnd || 0;
  const cmds = [];

  if (id === "local-receive-window-collapse" || id === "local-app-not-reading" || id === "zero-window-or-slow-consumer") {
    if (pid) cmds.push(`# Inspect receiver process\npidstat -druwt -p ${pid} 1 5`);
    if (pid) cmds.push(`strace -tt -T -p ${pid} -e trace=read,recvfrom,recvmsg,epoll_wait -c`);
    if (rb && recvQ > rb * 0.7) {
      const newRb = Math.min(rb * 4, 16777216);
      cmds.push(`# Receive buffer is ${Math.round(rb / 1024)}KB, ${Math.round(recvQ * 100 / rb)}% used — consider increasing\nsudo sysctl -w net.ipv4.tcp_rmem='4096 ${Math.round(newRb / 2)} ${newRb}'`);
      cmds.push(`sudo sysctl -w net.core.rmem_max=${newRb}`);
    }
    if (peer) cmds.push(`tcpdump -i ${iface} -nn 'host ${peer} and tcp[tcpflags] & (tcp-rst|tcp-fin) != 0' -c 50`);
  }

  if (id === "peer-slow-consumer-or-egress") {
    if (sendQ > 0) {
      const tb = top.details?.skmem?.tb || 0;
      if (tb && sendQ > tb * 0.7) {
        const newTb = Math.min(tb * 4, 16777216);
        cmds.push(`# Send buffer is ${Math.round(tb / 1024)}KB, ${Math.round(sendQ * 100 / tb)}% used\nsudo sysctl -w net.ipv4.tcp_wmem='4096 ${Math.round(newTb / 2)} ${newTb}'`);
        cmds.push(`sudo sysctl -w net.core.wmem_max=${newTb}`);
      }
    }
    if (peer) cmds.push(`ss -tinpm dst ${peer}`);
    if (peer) cmds.push(`ip route get ${peer}`);
    cmds.push(`tc -s qdisc show dev ${iface}`);
  }

  if (id === "path-congestion-or-loss" || id === "peer-dead-or-blackhole") {
    if (peer) cmds.push(`mtr -n -c 20 ${peer}`);
    if (peer) cmds.push(`ip route get ${peer}`);
    cmds.push(`ethtool -S ${iface} | egrep -i 'drop|err|crc|miss'`);
    cmds.push(`nstat -az | egrep 'Retrans|Timeout|TCPLoss|TCPAbort'`);
    if (cwnd > 0 && cwnd <= 4 && rtt > 0) {
      const idealCwnd = Math.ceil((rtt / 1000) * 1000000 / 1448);
      cmds.push(`# cwnd=${cwnd} is very low. BDP suggests ~${idealCwnd} segments for ${rtt}ms RTT at 1Gbps`);
    }
  }

  if (id === "socket-memory-pressure") {
    cmds.push(`sysctl net.ipv4.tcp_mem net.ipv4.tcp_rmem net.ipv4.tcp_wmem net.core.rmem_max net.core.wmem_max`);
    cmds.push(`cat /proc/net/sockstat`);
    const drops = top.details?.skmem?.d || 0;
    if (drops > 0) cmds.push(`# ${drops} drops detected — check backlog\nsudo sysctl -w net.core.netdev_max_backlog=10000`);
  }

  if (id === "tcp-backoff-watch") {
    if (peer) cmds.push(`ss -tinpm dst ${peer} | egrep 'rto|backoff|retrans|cwnd'`);
    cmds.push(`nstat -az TcpRetransSegs TcpTimeouts`);
  }

  return cmds;
}

function makeHypothesis({
  id,
  title,
  category,
  severity,
  confidence,
  summary,
  sockets = [],
  evidence = [],
  counterEvidence = [],
  learnMore = [],
  commands = []
}) {
  const affectedSocketIds = unique(sockets.map(socket => socket.id), 24);
  const peers = unique(sockets.map(socket => socket.peer), 5);
  const locals = unique(sockets.map(socket => socket.local), 5);
  const processes = unique(sockets.map(processName), 5);
  const signalCount = evidence.filter(Boolean).length;
  const counterCount = counterEvidence.filter(Boolean).length;
  const baseConf = CONFIDENCE_SCORE[confidence] || 1;
  const numericConfidence = Math.max(0, Math.min(1, (baseConf / 3) * 0.5 + Math.min(1, signalCount / 5) * 0.35 + (sockets.length > 0 ? 0.15 : 0) - counterCount * 0.12));
  return {
    id,
    title,
    category,
    severity,
    confidence,
    confidenceScore: Math.round(numericConfidence * 100) / 100,
    confidenceSignals: signalCount,
    confidenceCounters: counterCount,
    summary,
    evidence: unique(evidence, 8),
    counterEvidence: unique(counterEvidence, 8),
    learnMore: unique(learnMore, 10),
    commands: unique(commands, 8),
    actionableCommands: computeActionableCommands(id, sockets, evidence),
    affectedSocketIds,
    count: affectedSocketIds.length,
    topSocketId: affectedSocketIds[0] || null,
    peers,
    locals,
    processes,
    score: severityScore(severity) * 100 + confidenceScore(confidence) * 20 + Math.min(19, affectedSocketIds.length)
  };
}

export function buildDiagnosticHypotheses({
  sockets = [],
  anomalies = [],
  history = [],
  thresholds = {},
  bdpWindow = {}
} = {}) {
  if (!sockets.length) {
    return [makeHypothesis({
      id: "no-data",
      title: "No socket evidence loaded",
      category: "collection",
      severity: "low",
      confidence: "high",
      summary: "Import ss output before building network hypotheses.",
      evidence: ["No parsed sockets are available."],
      commands: ["ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all"]
    })];
  }

  const byAnomaly = anomalyMap(anomalies);
  const sendWarn = threshold(thresholds, "sendQ", "warn", 262144);
  const sendDanger = threshold(thresholds, "sendQ", "danger", 1048576);
  const recvWarn = threshold(thresholds, "recvQ", "warn", 131072);
  const recvDanger = threshold(thresholds, "recvQ", "danger", 524288);
  const rtoWarn = threshold(thresholds, "rto", "warn", 1000);
  const rtoDanger = threshold(thresholds, "rto", "danger", 3000);
  const cwndWarn = threshold(thresholds, "cwnd", "warn", 4);
  const dropDanger = threshold(thresholds, "skmem.d", "danger", 10);

  const withMetrics = sockets.map(socket => ({ socket, metrics: socketMetrics(socket) }));
  const highSend = withMetrics.filter(({ socket, metrics }) =>
    metrics.sendQ > sendWarn || metrics.skmemT > 0 || hasAnomaly(byAnomaly, socket, ["sendQ", "skmem.t"])
  );
  const highRecv = withMetrics.filter(({ socket, metrics }) =>
    metrics.recvQ > recvWarn || metrics.skmemR > 0 || hasAnomaly(byAnomaly, socket, ["recvQ", "skmem.r"])
  );
  const localReceiveWindowCollapse = highRecv.filter(({ metrics }) => isLocalReceiveWindowCollapse(metrics, recvWarn));
  const loss = withMetrics.filter(({ socket, metrics }) =>
    !isReceiverWindowLimited(metrics) && (isTcpRecoverySignal(metrics, rtoWarn) || hasAnomaly(byAnomaly, socket, ["rto", "timer", "mss"]))
  );
  const isolatedBackoff = withMetrics.filter(({ metrics }) =>
    metrics.backoff > 0
    && !metrics.persist
    && metrics.retrans === 0
    && metrics.rto < rtoWarn
    && metrics.rtt < 150
    && !(metrics.cwnd > 0 && metrics.cwnd <= cwndWarn)
    && !isReceiverWindowLimited(metrics)
  );
  const lowCwnd = withMetrics.filter(({ metrics }) => metrics.cwnd > 0 && metrics.cwnd <= cwndWarn);
  const backoffGrowth = historyMetricGrowth(history, "backoff");
  const retransGrowth = historyMetricGrowth(history, "retrans");
  const receiverLimited = withMetrics.filter(({ metrics }) => isReceiverWindowLimited(metrics));
  const networkCongestion = withMetrics.filter(({ metrics }) => isNetworkCongestionPattern(metrics, rtoWarn, cwndWarn));
  const wscaleAnalyses = withMetrics.map(({ socket }) => analyzeWscaleContext(socket, { history }));
  const wscaleWarnings = wscaleAnalyses.filter(item => item.status === "warning");
  const rcvSsthreshAnalyses = withMetrics.map(({ socket }) => analyzeRcvSsthreshTrend(socket, { history, recvWarn }));
  const rcvSsthreshWarnings = rcvSsthreshAnalyses.filter(item => item.status === "warning");
  const bdpWindowAnalyses = withMetrics.map(({ socket }) => analyzeBdpWindowLimit(socket, {
    history,
    recvWarn,
    direction: bdpWindow.direction || "inbound",
    configuredLinkCapacityMbps: bdpWindow.configuredLinkCapacityMbps
  }));
  const bdpWindowWarnings = bdpWindowAnalyses.filter(item => item.status === "warning");
  const blackhole = withMetrics.filter(({ metrics }) =>
    metrics.backoff >= 6 || metrics.rto >= rtoDanger && metrics.retrans >= 3 && !isReceiverWindowLimited(metrics)
  );
  const drops = withMetrics.filter(({ socket, metrics }) => metrics.drops > 0 || hasAnomaly(byAnomaly, socket, ["skmem.d", "skmem.d_rate"]));
  const listeners = sockets.filter(socket => socket.state === "LISTEN" && ["0.0.0.0", "::", "*"].includes(socket.localAddress?.host));
  const closeWait = sockets.filter(socket => socket.state === "CLOSE-WAIT");
  const timeWait = sockets.filter(socket => socket.state === "TIME-WAIT");
  const hypotheses = [];

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

  if (localReceiveWindowCollapse.length) {
    const affected = localReceiveWindowCollapse.map(item => item.socket);
    const processKnown = affected.some(socket => socket.details?.process);
    hypotheses.push(makeHypothesis({
      id: "local-receive-window-collapse",
      title: "Local receiver backpressure / Zero Window risk",
      category: "flow-control",
      severity: localReceiveWindowCollapse.some(({ metrics }) => metrics.hasRcvWnd && metrics.rcvWnd === 0 || metrics.recvQ > recvDanger) ? "critical" : "high",
      confidence: processKnown ? "high" : "medium",
      summary: "The local receiver appears to be advertising little or no receive space. This is TCP backpressure from the receiver side, most often caused by the application consuming data too slowly, not by IP congestion.",
      sockets: affected,
      evidence: [
        `${affected.length} socket(s) combine receive pressure with a collapsed receive window signal.`,
        localReceiveWindowCollapse.some(({ metrics }) => metrics.skmemR > 0) ? "skmem:r is populated, so the kernel receive buffer is holding data." : "",
        localReceiveWindowCollapse.some(({ metrics }) => metrics.recvQ > recvWarn) ? "Recv-Q is above the warning threshold: userspace is not draining fast enough." : "",
        localReceiveWindowCollapse.some(({ metrics }) => metrics.hasRcvSpace && metrics.rcvSpace <= 8192) ? "rcv_space is very small, meaning Linux has little room left to advertise for receive." : "",
        localReceiveWindowCollapse.some(({ metrics }) => metrics.hasRcvWnd && metrics.rcvWnd === 0) ? "rcv_wnd is zero on at least one socket: this is receiver-side Zero Window evidence." : ""
      ],
      counterEvidence: [
        "This is not, by itself, packet loss, IP congestion, or a saturated switch.",
        loss.length ? "TCP recovery signals also exist elsewhere; correlate per-flow before mixing receiver backpressure with network congestion." : "",
        !processKnown ? "Process ownership is missing, so the exact slow consumer process still needs confirmation." : ""
      ],
      learnMore: [
        "What happens: the sender pushes data, the receiver application does not read fast enough, and the kernel receive buffer fills.",
        "As the receive buffer fills, Linux reduces the advertised receive space. rcv_space falling near zero is the local receiver saying it has little room left.",
        "If rcv_wnd reaches zero, the peer must stop sending normal payload and may enter Zero Window probing. That is TCP flow-control backpressure, not proof of packet loss.",
        "Most frequent causes are JVM pauses, GC, blocked threads, slow parsing, slow disk writes, application freeze, or a saturated internal queue.",
        "Investigation priority: prove whether the owning process is blocked or overloaded before tuning network devices."
      ],
      commands: [
        "ss -tinpm state established | egrep 'Recv-Q|skmem|rcv_space|rcv_wnd|rwnd_limited|persist'",
        "pidstat -druwt -p <pid> 1",
        "top -H -p <pid>",
        "perf top -p <pid>",
        "strace -tt -p <pid> -e trace=read,recvfrom,recvmsg,epoll_wait,poll,select",
        "tcpdump -i <iface> -nn 'host <peer-ip> and tcp' -w receiver-window-check.pcap",
        "tshark -r receiver-window-check.pcap -Y 'tcp.analysis.zero_window or tcp.analysis.window_full'"
      ]
    }));
  }

  if (highRecv.length) {
    const affected = highRecv.map(item => item.socket);
    const processKnown = affected.some(socket => socket.details?.process);
    hypotheses.push(makeHypothesis({
      id: "local-app-not-reading",
      title: "Local application is probably not reading fast enough",
      category: "application",
      severity: highRecv.some(({ metrics }) => metrics.recvQ > recvDanger) ? "critical" : "high",
      confidence: processKnown ? "high" : "medium",
      summary: "Recv-Q or receive socket memory is building on the local side, which usually means the local process is not draining data fast enough.",
      sockets: affected,
      evidence: [
        `${affected.length} socket(s) show receive-side queue or memory pressure.`,
        processKnown ? "At least one affected socket has process ownership." : "",
        highRecv.some(({ metrics }) => metrics.hasRcvSpace && metrics.rcvSpace > 0 && metrics.rcvSpace < 8192) ? "rcv_space is very small on at least one socket, which reinforces a local receive-window drain problem." : "",
        localReceiveWindowCollapse.length ? "A receiver-side window collapse hypothesis is present; prioritize application consumption checks before network tuning." : "",
        drops.length ? "Socket drops are also present, so receive pressure may already be losing data." : ""
      ],
      counterEvidence: [
        loss.length ? "TCP loss/recovery is also visible; validate path symptoms before blaming only the application." : "",
        !processKnown ? "Process ownership is missing, lowering attribution confidence." : ""
      ],
      learnMore: [
        "Recv-Q growth means data reached the local kernel but userspace has not consumed it quickly enough.",
        "This often points to a blocked reader, GC pause, slow parser, saturated worker queue, or disk/API dependency behind the process.",
        "If rcv_space is also tiny or rcv_wnd reaches zero, the problem becomes receiver backpressure / Zero Window risk rather than simple backlog.",
        "Network loss can coexist, but Recv-Q and skmem:r are local receive-side symptoms first."
      ],
      commands: [
        "ss -tinpm state established",
        "pidstat -druwt -p <pid> 1",
        "top -H -p <pid>",
        "strace -tt -p <pid> -e trace=network",
        "sysctl net.ipv4.tcp_rmem net.core.rmem_max"
      ]
    }));
  }

  if (receiverLimited.length) {
    const affected = receiverLimited.map(item => item.socket);
    const persist = receiverLimited.some(({ metrics }) => metrics.persist);
    const zeroWindow = receiverLimited.some(({ metrics }) => metrics.persist || metrics.hasSndWnd && metrics.sndWnd === 0);
    const maxBackoffItem = receiverLimited.reduce((best, item) => item.metrics.backoff > (best?.metrics.backoff || 0) ? item : best, null);
    hypotheses.push(makeHypothesis({
      id: "zero-window-or-slow-consumer",
      title: zeroWindow ? "Zero Window / slow consumer is probable" : "Receiver-window limited sender",
      category: "flow-control",
      severity: persist && receiverLimited.some(({ metrics }) => metrics.backoff >= 2) ? "critical" : "high",
      confidence: persist || receiverLimited.some(({ metrics }) => metrics.sndWnd === 0) ? "high" : "medium",
      summary: "The sender appears limited by the receiver window. This points to a slow consumer or Zero Window condition more than pure network congestion.",
      sockets: affected,
      evidence: [
        `${affected.length} socket(s) show receiver-window limitation.`,
        persist ? "timer:(persist,...) is present: TCP is probing a closed or too-small receive window." : "",
        receiverLimited.some(({ metrics }) => metrics.hasSndWnd && metrics.sndWnd === 0) ? "snd_wnd is zero on at least one socket." : "",
        receiverLimited.some(({ metrics }) => metrics.rwndLimitedPct >= 20) ? "rwnd_limited consumes a large share of busy time." : "",
        receiverLimited.some(({ metrics }) => metrics.backoff > 0) ? "backoff is present while waiting, so the wait is getting stretched." : "",
        maxBackoffItem ? backoffWaitSummary(maxBackoffItem.metrics) : ""
      ],
      counterEvidence: [
        networkCongestion.length ? "RTO/RTT/cwnd/retrans also indicate possible network congestion; do not conclude Zero Window from rwnd_limited alone." : "",
        "rwnd_limited alone is ambiguous: it measures receiver-window-limited time, not the root cause.",
        "backoff + persist points to defensive probing of a receiver that is not opening its window, not automatically a bad network path."
      ],
      learnMore: [
        "Zero Window from the sender side means the peer advertised no room, so the sender must wait instead of sending more payload.",
        "persist indicates TCP is probing the peer to see whether the receive window reopened.",
        "rwnd_limited is useful but ambiguous: it says time was spent limited by the receive window, not whether the receiver is slow, frozen, overloaded, or intentionally applying backpressure.",
        "backoff during persist stretches probe timing. It means TCP is waiting longer; it does not automatically identify network loss.",
        "Treat this as slow consumer / receiver saturation until RTT, RTO, retransmission, cwnd, and packet captures prove a path issue."
      ],
      commands: [
        "ss -tinpm dst <peer-ip>",
        "tcpdump -i <iface> -nn 'host <peer-ip> and tcp' -w zero-window-check.pcap",
        "tshark -r zero-window-check.pcap -Y 'tcp.analysis.zero_window or tcp.analysis.window_full or tcp.analysis.zero_window_probe'",
        "pidstat -druwt -p <peer-or-local-pid> 1",
        "ss -tinpm state established | egrep 'persist|rwnd_limited|snd_wnd|rcv_space|backoff|retrans'"
      ]
    }));
  }

  if (highSend.length) {
    const affected = highSend.map(item => item.socket);
    hypotheses.push(makeHypothesis({
      id: "peer-slow-consumer-or-egress",
      title: "Peer slow consumer, congested path, or egress bottleneck",
      category: "egress",
      severity: highSend.some(({ metrics }) => metrics.sendQ > sendDanger) ? "critical" : "high",
      confidence: loss.length || lowCwnd.length ? "high" : "medium",
      summary: "Send-Q or transmit socket memory is building before data can drain, so the sender is blocked by ACK/peer/path progress.",
      sockets: affected,
      evidence: [
        `${affected.length} socket(s) show outbound queue or transmit memory pressure.`,
        loss.length ? "RTO, retransmission, or sustained backoff signals reinforce an egress/path hypothesis." : "",
        receiverLimited.length ? "Receiver-window limitation is also present; this may be slow consumer / Zero Window rather than network-only congestion." : "",
        lowCwnd.length ? "Low cwnd appears on affected traffic, limiting in-flight data." : ""
      ],
      counterEvidence: [
        highRecv.length ? "Receive-side pressure is also visible; check if this is a bidirectional application stall." : "",
        !loss.length ? "No strong TCP recovery signal is present, so a slow peer may be more likely than packet loss." : "",
        isolatedBackoff.length ? "Short isolated backoff exists elsewhere, but isolated backoff is not enough to label this a bad network." : ""
      ],
      learnMore: [
        "Send-Q growth means bytes are queued locally because the sender cannot make forward progress quickly enough.",
        "The causes split into three families: the peer is not consuming fast enough, the receiver window is closing, or the path is suffering loss/congestion.",
        "If Send-Q is high without RTO/retrans/backoff, suspect slow peer consumption first.",
        "If Send-Q is high with retrans, RTO growth, RTT growth, or cwnd reduction, the network/path hypothesis becomes stronger.",
        "Do not tune socket buffers first. Determine whether the bottleneck is peer application drain, receiver-window backpressure, or path recovery."
      ],
      commands: [
        "ip route get <peer-ip>",
        "ss -tinpm state established",
        "tc -s qdisc show",
        "ip -s link show",
        "nstat -az | egrep 'Retrans|Timeout|TCPLoss|TCPAbort'"
      ]
    }));
  }

  if (blackhole.length) {
    const affected = blackhole.map(item => item.socket);
    const maxBackoffItem = blackhole.reduce((best, item) => item.metrics.backoff > (best?.metrics.backoff || 0) ? item : best, null);
    hypotheses.push(makeHypothesis({
      id: "peer-dead-or-blackhole",
      title: "Peer frozen, blackhole, or severe loss is possible",
      category: "path",
      severity: "critical",
      confidence: blackhole.some(({ metrics }) => metrics.backoff >= 6) ? "high" : "medium",
      summary: "Very high backoff with retransmission/RTO means TCP is waiting much longer than expected. Causes include severe congestion, peer freeze, firewall blackhole, or a broken path.",
      sockets: affected,
      evidence: [
        `${affected.length} socket(s) show very severe backoff/RTO/retransmission behavior.`,
        maxBackoffItem ? backoffWaitSummary(maxBackoffItem.metrics) : "",
        backoffGrowth.increased ? `backoff increased from ${backoffGrowth.first} to ${backoffGrowth.last} in the selected history.` : "",
        retransGrowth.increased ? `retrans increased by ${retransGrowth.delta} in the selected history.` : ""
      ],
      counterEvidence: [
        receiverLimited.length ? "Receiver-window limitation is also visible; a prolonged Zero Window can also drive waiting/probing behavior." : "",
        "backoff means TCP is waiting longer; it does not by itself name the root cause.",
        "Possible causes include severe congestion, peer freeze, firewall blackhole, cable/path failure, or prolonged Zero Window."
      ],
      learnMore: [
        "Very high backoff means TCP is now waiting a long time before the next retry or probe.",
        "This is serious because the flow has stopped making normal progress for multiple recovery intervals.",
        "Possible root causes include severe congestion, a frozen peer, firewall blackhole, cable/path failure, VM pause, or a prolonged Zero Window.",
        "Use packet capture and route/interface counters to distinguish no ACKs, retransmissions, closed receiver window, and asymmetric path failure.",
        "Avoid saying 'network bad' until receiver-window evidence has been excluded."
      ],
      commands: [
        "ss -tinpm dst <peer-ip>",
        "ip route get <peer-ip>",
        "tracepath <peer-ip>",
        "tcpdump -i <iface> -nn 'host <peer-ip> and tcp retransmission' -w retrans-check.pcap",
        "nstat -az | egrep 'Retrans|Timeout|TCPLoss|TCPAbort'"
      ]
    }));
  }

  if (loss.length || lowCwnd.length) {
    const affected = unique([...loss, ...lowCwnd].map(item => item.socket), sockets.length);
    const maxBackoffItem = [...loss, ...lowCwnd].reduce((best, item) => item.metrics.backoff > (best?.metrics.backoff || 0) ? item : best, null);
    hypotheses.push(makeHypothesis({
      id: "path-congestion-or-loss",
      title: networkCongestion.length ? "Network congestion is probable" : "Path congestion, packet loss, or TCP recovery",
      category: "path",
      severity: loss.some(({ metrics }) => metrics.rto >= rtoDanger || metrics.backoff > 1) || backoffGrowth.last >= 4 ? "critical" : "high",
      confidence: networkCongestion.length || loss.length && lowCwnd.length ? "high" : "medium",
      summary: networkCongestion.length
        ? "The combined pattern backoff + retrans/RTO + rising RTT or low cwnd points to real network congestion/loss more strongly than a slow consumer."
        : "RTO, retransmission, backoff, or low congestion window suggest TCP recovery below the application layer.",
      sockets: affected,
      evidence: [
        `${loss.length} socket(s) show RTO/retransmission/backoff evidence.`,
        lowCwnd.length ? `${lowCwnd.length} socket(s) have a constrained congestion window.` : "",
        networkCongestion.length ? "The congestion signature matches: retrans/backoff with RTT pressure and reduced cwnd." : "",
        maxBackoffItem && maxBackoffItem.metrics.backoff > 0 ? backoffWaitSummary(maxBackoffItem.metrics) : "",
        backoffGrowth.increased ? `backoff increased from ${backoffGrowth.first} to ${backoffGrowth.last}; this makes the condition serious.` : "",
        retransGrowth.increased ? `retrans increased by ${retransGrowth.delta}; TCP is not just waiting, it is retrying.` : ""
      ],
      counterEvidence: [
        !drops.length ? "No socket drops are visible in this capture." : "",
        receiverLimited.length ? "Receiver-window limitation is also visible; slow consumer / Zero Window remains a competing explanation." : "",
        !highSend.length ? "Send-Q is not dominant, so the issue may be intermittent or already recovered." : "",
        isolatedBackoff.length ? "Some backoff is isolated and short; that part alone would usually be watch-only." : ""
      ],
      learnMore: [
        "The strong network-congestion signature is retransmission or RTO pressure plus RTT growth and a reduced cwnd.",
        "backoff becomes serious here because it is paired with recovery evidence: TCP is not only waiting, it is retrying or shrinking flight size.",
        "A falling cwnd means congestion control is deliberately limiting how much data can be in flight.",
        "This differs from Zero Window: in Zero Window the sender is blocked by the receiver window; in path congestion the path/ACK progress is degraded.",
        "Check interface errors, qdisc drops, routing changes, MTU issues, and packet captures before changing application code."
      ],
      commands: [
        "ip route get <peer-ip>",
        "tracepath <peer-ip>",
        "ss -ti dst <peer-ip>",
        "ip -s link show dev <iface>",
        "ethtool -S <iface> | egrep -i 'drop|err|timeout|reset|miss|crc'"
      ]
    }));
  }

  if (isolatedBackoff.length) {
    const affected = isolatedBackoff.map(item => item.socket);
    const maxBackoffItem = isolatedBackoff.reduce((best, item) => item.metrics.backoff > (best?.metrics.backoff || 0) ? item : best, null);
    hypotheses.push(makeHypothesis({
      id: "tcp-backoff-watch",
      title: "TCP backoff is present but not diagnostic by itself",
      category: "tcp-recovery",
      severity: isolatedBackoff.some(({ metrics }) => metrics.backoff >= 3) ? "medium" : "low",
      confidence: "high",
      summary: "A short isolated backoff means TCP waited longer than expected, but without retrans/RTO/RTT/cwnd/persist evidence it is usually a watch signal rather than proof of a bad network.",
      sockets: affected,
      evidence: [
        `${affected.length} socket(s) show isolated backoff without matching retransmission, RTO, RTT, cwnd, or receiver-window pressure.`,
        maxBackoffItem ? backoffWaitSummary(maxBackoffItem.metrics) : ""
      ],
      counterEvidence: [
        "This isolated backoff is not proof of a bad network: no retransmission timer, high RTO, rising RTT, low cwnd, or persist timer was paired with it.",
        "Escalate only if it becomes frequent, grows toward 2-3 under load, or appears with retrans/RTO/RTT/cwnd symptoms."
      ],
      learnMore: [
        "TCP backoff means TCP waits longer than planned before the next recovery or probe attempt.",
        "It does not automatically mean the network is bad. It can also appear with a slow receiver, Zero Window probing, peer pause, or transient recovery.",
        "backoff:1 for a short time can be acceptable on WAN or Internet paths.",
        "backoff:2-3 under load deserves monitoring, especially with RTT growth, retransmission, or cwnd reduction.",
        "backoff:6+ with multi-second RTO is very concerning and should be treated as severe congestion, peer freeze, firewall blackhole, or prolonged Zero Window until proven otherwise."
      ],
      commands: [
        "ss -tinpm dst <peer-ip>",
        "ss -tinpm state established | egrep 'backoff|retrans|rto|rtt|cwnd|persist|rwnd_limited'",
        "nstat -az | egrep 'Retrans|Timeout|TCPLoss|TCPAbort'"
      ]
    }));
  }

  if (drops.length) {
    const affected = drops.map(item => item.socket);
    const growth = historyDropGrowth(history);
    hypotheses.push(makeHypothesis({
      id: "socket-memory-pressure",
      title: "Socket memory pressure or receive-path drops",
      category: "kernel",
      severity: drops.some(({ metrics }) => metrics.drops >= dropDanger) || growth.total >= dropDanger ? "critical" : "high",
      confidence: growth.total ? "high" : "medium",
      summary: "skmem.d or drop-rate evidence means packets/data were dropped before normal socket consumption completed.",
      sockets: affected,
      evidence: [
        `${affected.length} socket(s) show socket drop evidence.`,
        growth.total ? `Drops increased by ${growth.total} in the selected history window.` : "Drop counters may be historical unless timestamped growth is visible."
      ],
      counterEvidence: [
        "skmem.d alone does not prove NIC ring overflow; validate softnet, qdisc, and interface counters."
      ],
      commands: [
        "ss -tinpm",
        "ip -s link show",
        "tc -s qdisc show",
        "cat /proc/net/softnet_stat",
        "ethtool -S <iface> | egrep -i 'rx.*drop|rx.*miss|no.?buffer|fifo|overrun'",
        "sysctl net.core.netdev_max_backlog net.core.rmem_max net.ipv4.tcp_rmem"
      ]
    }));
  }

  if (closeWait.length) {
    hypotheses.push(makeHypothesis({
      id: "close-wait-leak",
      title: "Possible CLOSE-WAIT leak",
      category: "lifecycle",
      severity: closeWait.length >= 20 ? "high" : "medium",
      confidence: closeWait.some(socket => socket.details?.process) ? "high" : "medium",
      summary: "CLOSE-WAIT sockets mean the peer closed and the local application has not closed its side yet.",
      sockets: closeWait,
      evidence: [`${closeWait.length} CLOSE-WAIT socket(s) are present.`],
      counterEvidence: [closeWait.length < 5 ? "A small transient count can be normal during connection churn." : ""],
      commands: ["ss -tanp state close-wait", "lsof -nP -iTCP -sTCP:CLOSE-WAIT", "pidstat -druwt -p <pid> 1"]
    }));
  }

  if (timeWait.length >= Math.max(100, sockets.length * 0.25)) {
    hypotheses.push(makeHypothesis({
      id: "time-wait-flood",
      title: "TIME-WAIT concentration or connection churn",
      category: "lifecycle",
      severity: timeWait.length >= 1000 ? "high" : "medium",
      confidence: "medium",
      summary: "A large TIME-WAIT population can indicate short-lived connection churn or missing pooling.",
      sockets: timeWait,
      evidence: [`${timeWait.length} TIME-WAIT socket(s) represent a large share of the capture.`],
      counterEvidence: ["TIME-WAIT protects TCP correctness; it is not automatically a bug."],
      commands: ["ss -tan state time-wait | wc -l", "ss -s", "nstat -az | egrep 'TW|Attempt|ActiveOpens|PassiveOpens'"]
    }));
  }

  if (listeners.length) {
    hypotheses.push(makeHypothesis({
      id: "listener-exposure",
      title: "Wildcard listener exposure needs validation",
      category: "security",
      severity: "medium",
      confidence: "medium",
      summary: "One or more services listen on all interfaces. That may be intended, but it should be mapped to service boundaries.",
      sockets: listeners,
      evidence: [`${listeners.length} wildcard listener(s) found.`],
      counterEvidence: ["Wildcard bind can be normal behind host firewalling, service mesh, or container networking."],
      commands: ["ss -Hlnptu", "lsof -nP -iTCP -sTCP:LISTEN", "ip addr", "nft list ruleset"]
    }));
  }

  if (!hypotheses.length) {
    hypotheses.push(makeHypothesis({
      id: "no-dominant-bottleneck",
      title: "No dominant bottleneck pattern found",
      category: "collection",
      severity: "low",
      confidence: "medium",
      summary: "The current capture does not show strong queue, loss, drop, lifecycle, or exposure signatures.",
      sockets: sockets.slice(0, 5),
      evidence: ["No major diagnostic rule crossed its threshold."],
      counterEvidence: ["A single snapshot can miss intermittent incidents; timestamped samples are stronger."],
      commands: ["ss -s", "ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all", "nstat -az"]
    }));
  }

  return hypotheses.sort((a, b) => b.score - a.score || b.count - a.count || a.title.localeCompare(b.title));
}
