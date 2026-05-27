import { buildTcpContextHypotheses } from "./diagnostic-tcp-context.js";
import { anomalyMap, backoffWaitSummary, confidenceScore, hasAnomaly, historyDropGrowth, historyMetricGrowth, isLocalReceiveWindowCollapse, isNetworkCongestionPattern, isReceiverWindowLimited, isTcpRecoverySignal, makeHypothesis, severityScore, socketMetrics, threshold, unique } from "./diagnostic-helpers.js";
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
  const tcpContextHypotheses = buildTcpContextHypotheses({ withMetrics, history, recvWarn, bdpWindow });
  const blackhole = withMetrics.filter(({ metrics }) =>
    metrics.backoff >= 6 || metrics.rto >= rtoDanger && metrics.retrans >= 3 && !isReceiverWindowLimited(metrics)
  );
  const drops = withMetrics.filter(({ socket, metrics }) => metrics.drops > 0 || hasAnomaly(byAnomaly, socket, ["skmem.d", "skmem.d_rate"]));
  const listeners = sockets.filter(socket => socket.state === "LISTEN" && ["0.0.0.0", "::", "*"].includes(socket.localAddress?.host));
  const closeWait = sockets.filter(socket => socket.state === "CLOSE-WAIT");
  const timeWait = sockets.filter(socket => socket.state === "TIME-WAIT");
  const hypotheses = [];
  hypotheses.push(...tcpContextHypotheses);

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
