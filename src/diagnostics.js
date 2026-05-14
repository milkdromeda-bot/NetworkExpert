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

function isNetworkCongestionPattern(metrics, rtoWarn, cwndWarn) {
  return metrics.rto >= rtoWarn && (metrics.backoff > 0 || metrics.retrans > 0) && (metrics.cwnd > 0 && metrics.cwnd <= cwndWarn || metrics.rtt >= 150);
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
  const backoffGrowth = historyMetricGrowth(history, "backoff");
  const retransGrowth = historyMetricGrowth(history, "retrans");
  const receiverLimited = withMetrics.filter(({ metrics }) => isReceiverWindowLimited(metrics));
  const networkCongestion = withMetrics.filter(({ metrics }) => isNetworkCongestionPattern(metrics, rtoWarn, cwndWarn));
  const blackhole = withMetrics.filter(({ metrics }) =>
    metrics.backoff >= 6 || metrics.rto >= rtoDanger && metrics.retrans >= 3 && !isReceiverWindowLimited(metrics)
  );
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
        highRecv.some(({ metrics }) => metrics.hasRcvSpace && metrics.rcvSpace > 0 && metrics.rcvSpace < 8192) ? "rcv_space is very small on at least one socket, which reinforces a local receive-window drain problem." : "",
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

  if (receiverLimited.length) {
    const affected = receiverLimited.map(item => item.socket);
    const persist = receiverLimited.some(({ metrics }) => metrics.persist);
    const zeroWindow = receiverLimited.some(({ metrics }) => metrics.persist || metrics.hasSndWnd && metrics.sndWnd === 0);
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
        receiverLimited.some(({ metrics }) => metrics.backoff > 0) ? "backoff is present while waiting, so the wait is getting stretched." : ""
      ],
      counterEvidence: [
        networkCongestion.length ? "RTO/RTT/cwnd/retrans also indicate possible network congestion; do not conclude Zero Window from rwnd_limited alone." : "",
        "rwnd_limited alone is ambiguous: it measures receiver-window-limited time, not the root cause."
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
        loss.length ? "RTO, retransmission, or backoff signals reinforce an egress/path hypothesis." : "",
        receiverLimited.length ? "Receiver-window limitation is also present; this may be slow consumer / Zero Window rather than network-only congestion." : "",
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

  if (blackhole.length) {
    const affected = blackhole.map(item => item.socket);
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
        backoffGrowth.increased ? `backoff increased from ${backoffGrowth.first} to ${backoffGrowth.last} in the selected history.` : "",
        retransGrowth.increased ? `retrans increased by ${retransGrowth.delta} in the selected history.` : ""
      ],
      counterEvidence: [
        receiverLimited.length ? "Receiver-window limitation is also visible; a prolonged Zero Window can also drive waiting/probing behavior." : "",
        "backoff means TCP is waiting longer; it does not by itself name the root cause."
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
        backoffGrowth.increased ? `backoff increased from ${backoffGrowth.first} to ${backoffGrowth.last}; this makes the condition serious.` : "",
        retransGrowth.increased ? `retrans increased by ${retransGrowth.delta}; TCP is not just waiting, it is retrying.` : ""
      ],
      counterEvidence: [
        !drops.length ? "No socket drops are visible in this capture." : "",
        receiverLimited.length ? "Receiver-window limitation is also visible; slow consumer / Zero Window remains a competing explanation." : "",
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
