import { metricValue } from "../parsing/parser.js";

const SEVERITY_SCORE = { low: 1, medium: 2, high: 3, critical: 4 };
const CONFIDENCE_SCORE = { low: 1, medium: 2, high: 3 };

export function severityScore(value) {
  return SEVERITY_SCORE[String(value || "").toLowerCase()] || 0;
}

export function confidenceScore(value) {
  return CONFIDENCE_SCORE[String(value || "").toLowerCase()] || 0;
}

export function threshold(thresholds, metric, level, fallback) {
  const config = typeof thresholds === "function" ? thresholds(metric) : thresholds?.[metric];
  const value = Number(config?.[level]);
  return Number.isFinite(value) ? value : fallback;
}

export function unique(values, limit = 6) {
  return [...new Set(values.filter(Boolean))].slice(0, limit);
}

export function processName(socket) {
  const process = socket?.details?.process;
  return process ? `${process.name}:${process.pid}` : "";
}

export function hasAnomaly(anomaliesBySocket, socket, metrics) {
  const wanted = new Set(metrics);
  return (anomaliesBySocket.get(socket.id) || []).some(item => wanted.has(item.metric) || wanted.has(item.title));
}

export function anomalyMap(anomalies = []) {
  const map = new Map();
  for (const anomaly of anomalies) {
    if (!anomaly?.socketId) continue;
    if (!map.has(anomaly.socketId)) map.set(anomaly.socketId, []);
    map.get(anomaly.socketId).push(anomaly);
  }
  return map;
}

export function socketMetrics(socket) {
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

export function historyDropGrowth(history = []) {
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

export function historyMetricGrowth(history = [], metric) {
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

export function isReceiverWindowLimited(metrics) {
  return metrics.persist || metrics.hasSndWnd && metrics.sndWnd === 0 || metrics.rwndLimitedPct >= 20 || metrics.rwndLimitedMs >= 1000;
}

export function isLocalReceiveWindowCollapse(metrics, recvWarn) {
  const receivePressure = metrics.recvQ > recvWarn || metrics.skmemR > 0;
  const lowReceiveSpace = metrics.hasRcvSpace && metrics.rcvSpace <= 8192;
  const zeroReceiveWindow = metrics.hasRcvWnd && metrics.rcvWnd === 0;
  return receivePressure && (lowReceiveSpace || zeroReceiveWindow);
}

export function isTcpRecoverySignal(metrics, rtoWarn) {
  return metrics.retrans > 0 || metrics.rto >= rtoWarn || metrics.backoff >= 4 && (metrics.rtt >= 150 || metrics.cwnd > 0 && metrics.cwnd <= 4);
}

export function isNetworkCongestionPattern(metrics, rtoWarn, cwndWarn) {
  return metrics.rto >= rtoWarn && (metrics.backoff > 0 || metrics.retrans > 0) && (metrics.cwnd > 0 && metrics.cwnd <= cwndWarn || metrics.rtt >= 150);
}

export function backoffWaitSummary(metrics) {
  if (!metrics.backoff) return "";
  if (!metrics.rto) return `backoff:${metrics.backoff} means TCP is waiting longer before the next recovery/probe attempt.`;
  const multiplier = 2 ** Math.min(12, metrics.backoff);
  const waitMs = metrics.rto * multiplier;
  const waitLabel = waitMs >= 1000 ? `${(waitMs / 1000).toFixed(waitMs >= 10000 ? 0 : 1)}s` : `${Math.round(waitMs)}ms`;
  return `backoff:${metrics.backoff} with rto:${metrics.rto}ms implies an approximate wait near ${waitLabel} before the next retry/probe.`;
}

export function computeActionableCommands(id, sockets, evidence) {
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

export function makeHypothesis({
  id,
  title,
  category,
  severity,
  confidence,
  summary,
  sockets = [],
  evidence = [],
  counterEvidence = [],
  missingEvidence = [],
  wouldConfirm = "",
  wouldReject = "",
  learnMore = [],
  commands = []
}) {
  const affectedSocketIds = unique(sockets.map(socket => socket.id), 24);
  const peers = unique(sockets.map(socket => socket.peer), 5);
  const locals = unique(sockets.map(socket => socket.local), 5);
  const processes = unique(sockets.map(processName), 5);
  const strong = evidence.filter(Boolean);
  const contra = counterEvidence.filter(Boolean);
  const missing = missingEvidence.filter(Boolean);
  const signalCount = strong.length;
  const counterCount = contra.length;
  const missingCount = missing.length;
  const baseConf = CONFIDENCE_SCORE[confidence] || 1;
  const numericConfidence = Math.max(0, Math.min(1,
    (baseConf / 3) * 0.5
    + Math.min(1, signalCount / 5) * 0.35
    + (sockets.length > 0 ? 0.15 : 0)
    - counterCount * 0.12
    - missingCount * 0.05
  ));
  return {
    id,
    title,
    category,
    severity,
    confidence,
    confidenceScore: Math.round(numericConfidence * 100) / 100,
    confidenceDetail: {
      strong,
      weak: strong.length <= 2 ? strong : [],
      contra,
      missing,
      wouldConfirm: wouldConfirm || defaultWouldConfirm(id),
      wouldReject: wouldReject || defaultWouldReject(id)
    },
    confidenceSignals: signalCount,
    confidenceCounters: counterCount,
    summary,
    evidence: unique(strong, 8),
    counterEvidence: unique(contra, 8),
    learnMore: unique(learnMore, 10),
    commands: unique(commands, 8),
    actionableCommands: computeActionableCommands(id, sockets, strong),
    affectedSocketIds,
    count: affectedSocketIds.length,
    topSocketId: affectedSocketIds[0] || null,
    peers,
    locals,
    processes,
    score: severityScore(severity) * 100 + confidenceScore(confidence) * 20 + Math.min(19, affectedSocketIds.length)
  };
}

export function defaultWouldConfirm(id) {
  const map = {
    "local-receive-window-collapse": "tcpdump showing Zero Window from local side + strace showing blocked read/epoll in the process",
    "local-app-not-reading": "pidstat/strace showing the process is blocked or GC log showing long pause during Recv-Q growth",
    "zero-window-or-slow-consumer": "pcap with tcp.analysis.zero_window from the peer + peer-side process evidence of slow consumption",
    "peer-slow-consumer-or-egress": "Send-Q growth correlating with peer-side Recv-Q growth or pcap showing delayed ACKs",
    "path-congestion-or-loss": "mtr showing packet loss at a specific hop + nstat TcpRetransSegs growing",
    "peer-dead-or-blackhole": "No response to probes for >30s + mtr showing 100% loss at destination",
    "socket-memory-pressure": "skmem.d growing across snapshots + softnet_stat showing drops",
    "tcp-backoff-watch": "Backoff increasing across snapshots while retrans counter grows",
    "tcp-window-scale-context": "SYN/SYN-ACK capture showing negotiated wscale + BDP calculation showing window is the bottleneck",
    "tcp-receive-ssthresh-trend": "rcv_ssthresh falling while Recv-Q grows and process shows slow consumption",
    "bdp-window-limited-throughput": "Configured link capacity + window math proving throughput cannot exceed window/RTT",
    "close-wait-leak": "lsof showing the process holding CLOSE-WAIT sockets without closing them",
    "network-congestion-pattern": "nstat showing growing retransmissions + mtr showing loss at intermediate hop"
  };
  return map[id] || "Additional timestamped snapshots showing the pattern persists or worsens";
}

export function defaultWouldReject(id) {
  const map = {
    "local-receive-window-collapse": "Process consuming at full speed with no GC/block + Recv-Q draining between snapshots",
    "local-app-not-reading": "Recv-Q draining to zero between snapshots + process CPU/IO normal",
    "zero-window-or-slow-consumer": "pcap showing no Zero Window + rwnd_limited disappearing in next snapshot",
    "peer-slow-consumer-or-egress": "Send-Q draining between snapshots + no retransmission growth",
    "path-congestion-or-loss": "mtr showing 0% loss + RTT stable + cwnd growing normally",
    "peer-dead-or-blackhole": "Peer responding to probes + connection recovering",
    "socket-memory-pressure": "skmem.d stable across snapshots (historical drops, not active)",
    "tcp-backoff-watch": "Backoff returning to 0 in next snapshot + connection recovering",
    "tcp-window-scale-context": "BDP calculation showing window is not the bottleneck + throughput matching expected rate",
    "tcp-receive-ssthresh-trend": "rcv_ssthresh stable or growing + no receive pressure",
    "bdp-window-limited-throughput": "Throughput well below window/RTT limit + congestion signals present",
    "close-wait-leak": "CLOSE-WAIT count stable and small + normal connection lifecycle",
    "network-congestion-pattern": "nstat retrans stable + RTT stable + cwnd normal"
  };
  return map[id] || "Pattern disappearing in subsequent snapshots or contradicted by packet capture";
}

