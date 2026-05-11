import { metricValue } from "./parser.js";

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
    pacingRate: metricValue(socket, "pacing_rate")
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
  commands = []
}) {
  const affectedSocketIds = unique(sockets.map(socket => socket.id), 24);
  const peers = unique(sockets.map(socket => socket.peer), 5);
  const locals = unique(sockets.map(socket => socket.local), 5);
  const processes = unique(sockets.map(processName), 5);
  return {
    id,
    title,
    category,
    severity,
    confidence,
    summary,
    evidence: unique(evidence, 8),
    counterEvidence: unique(counterEvidence, 8),
    commands: unique(commands, 8),
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
  thresholds = {}
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
  const loss = withMetrics.filter(({ socket, metrics }) =>
    metrics.rto >= rtoWarn || metrics.backoff > 0 || metrics.retrans > 0 || hasAnomaly(byAnomaly, socket, ["rto", "backoff", "timer", "mss"])
  );
  const lowCwnd = withMetrics.filter(({ metrics }) => metrics.cwnd > 0 && metrics.cwnd <= cwndWarn);
  const drops = withMetrics.filter(({ socket, metrics }) => metrics.drops > 0 || hasAnomaly(byAnomaly, socket, ["skmem.d", "skmem.d_rate"]));
  const listeners = sockets.filter(socket => socket.state === "LISTEN" && ["0.0.0.0", "::", "*"].includes(socket.localAddress?.host));
  const closeWait = sockets.filter(socket => socket.state === "CLOSE-WAIT");
  const timeWait = sockets.filter(socket => socket.state === "TIME-WAIT");
  const hypotheses = [];

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
        drops.length ? "Socket drops are also present, so receive pressure may already be losing data." : ""
      ],
      counterEvidence: [
        loss.length ? "TCP loss/recovery is also visible; validate path symptoms before blaming only the application." : "",
        !processKnown ? "Process ownership is missing, lowering attribution confidence." : ""
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
        loss.length ? "RTO, retransmission, or backoff signals reinforce an egress/path hypothesis." : "",
        lowCwnd.length ? "Low cwnd appears on affected traffic, limiting in-flight data." : ""
      ],
      counterEvidence: [
        highRecv.length ? "Receive-side pressure is also visible; check if this is a bidirectional application stall." : "",
        !loss.length ? "No strong TCP recovery signal is present, so a slow peer may be more likely than packet loss." : ""
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

  if (loss.length || lowCwnd.length) {
    const affected = unique([...loss, ...lowCwnd].map(item => item.socket), sockets.length);
    hypotheses.push(makeHypothesis({
      id: "path-congestion-or-loss",
      title: "Path congestion, packet loss, or TCP recovery",
      category: "path",
      severity: loss.some(({ metrics }) => metrics.rto >= rtoDanger || metrics.backoff > 1) ? "critical" : "high",
      confidence: loss.length && lowCwnd.length ? "high" : "medium",
      summary: "RTO, retransmission, backoff, or low congestion window suggest TCP recovery below the application layer.",
      sockets: affected,
      evidence: [
        `${loss.length} socket(s) show RTO/retransmission/backoff evidence.`,
        lowCwnd.length ? `${lowCwnd.length} socket(s) have a constrained congestion window.` : ""
      ],
      counterEvidence: [
        !drops.length ? "No socket drops are visible in this capture." : "",
        !highSend.length ? "Send-Q is not dominant, so the issue may be intermittent or already recovered." : ""
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
