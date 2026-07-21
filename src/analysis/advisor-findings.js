export function buildAdvisorFindings(deps) {
  const {
    state,
    socketsById,
    socketsWhere,
    thresholdFor,
    metricValue,
    dropRateSummary,
    microburstSummary,
    parseTimestampLine,
    isLxcProfile,
    isAnalystRole,
    makeFinding,
    envCommand,
    commandForPeer,
    processSamples,
    dropRateSeverity,
    formatMetricValue,
    formatDurationCompact,
    formatDropCadence,
    formatMicroburstWindow
  } = deps;
  if (!state.sockets.length) return [];
  const findings = [];
  const selected = socketsById().get(state.selectedId) || state.sockets[0];
  const highSend = socketsWhere(socket => socket.sendQ > thresholdFor("sendQ").warn);
  const highRecv = socketsWhere(socket => socket.recvQ > thresholdFor("recvQ").warn);
  const txPressure = socketsWhere(socket => socket.details.skmem.tb && ((socket.details.skmem.t || 0) + (socket.details.skmem.w || 0)) / socket.details.skmem.tb > 0.75);
  const rxPressure = socketsWhere(socket => socket.details.skmem.rb && (socket.details.skmem.r || 0) / socket.details.skmem.rb > 0.75);
  const drops = socketsWhere(socket => metricValue(socket, "skmem.d") > 0);
  const dropRate = dropRateSummary();
  const microburst = microburstSummary();
  const loss = socketsWhere(socket => metricValue(socket, "rto") >= thresholdFor("rto").warn || (socket.details.values.backoff || 0) > 0 || (socket.details.timer?.retrans || 0) > 0);
  const lowCwnd = socketsWhere(socket => socket.state === "ESTAB" && metricValue(socket, "cwnd") > 0 && metricValue(socket, "cwnd") <= thresholdFor("cwnd").warn);
  const missingProcess = socketsWhere(socket => ["ESTAB", "LISTEN"].includes(socket.state) && !socket.details.process);
  const exposed = socketsWhere(socket => socket.state === "LISTEN" && ["0.0.0.0", "::", "*"].includes(socket.localAddress.host));
  const noTimestamp = state.raw.trim() && !state.raw.split(/\r?\n/).some(line => parseTimestampLine(line.trim()) != null);

  if (isLxcProfile()) {
    findings.push(makeFinding({
      id: "lxc-lxd-visibility",
      severity: "medium",
      title: "LXC/LXD network namespace visibility limits",
      pattern: "The selected profile is Linux Container LXC/LXD, so socket evidence may be container-local while host path evidence lives outside the container.",
      sockets: state.sockets.slice(0, 20),
      confidence: "High",
      why: "Inside LXC/LXD, ss sees the container network namespace. veth, bridge, qdisc, physical NIC drops, host routing, and ethtool counters generally require host-side collection. Process and cgroup attribution can also differ for unprivileged containers.",
      next: isAnalystRole()
        ? ["Collect container-local ss and route evidence from inside the container", "Keep timestamps aligned with the incident window", "Request host route/interface/qdisc counters from ops/root only if container evidence points to path loss"]
        : ["Confirm whether the ss file was collected inside the container or on the host", "Collect container-local ss with lxc exec", "Collect host route/interface/qdisc counters from the LXD host"],
      mitigate: ["Do not tune container TCP buffers before checking host veth/bridge/NIC drops", "Compare container socket queues with host interface counters", "Escalate with both namespace-local and host evidence"],
      commands: [
        envCommand("ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all"),
        envCommand("ip route"),
        envCommand("ip -s link show", { host: true }),
        envCommand("tc -s qdisc show", { host: true }),
        envCommand("lxc info <container> --show-log", { host: true }),
        envCommand("lxc config show <container> --expanded", { host: true })
      ]
    }));
  }

  if (highSend.length || txPressure.length) {
    const sockets = [...new Map([...highSend, ...txPressure].map(socket => [socket.id, socket])).values()];
    findings.push(makeFinding({
      id: "slow-peer-or-egress",
      severity: sockets.some(socket => socket.sendQ > thresholdFor("sendQ").danger) ? "critical" : "high",
      title: "Probable slow peer, congested path, or egress bottleneck",
      pattern: "Send-Q or transmit socket memory is building up before data can drain.",
      sockets,
      confidence: loss.length || lowCwnd.length ? "High" : "Medium",
      why: "This is the classic slow-consumer/egress pattern: the application has written data, but TCP cannot deliver or get ACKs fast enough. If it clusters by peer, suspect the peer. If it is global, suspect route, NIC, qdisc, host CPU, or upstream congestion.",
      next: ["Group by Peer and Process", "Open Charts for Send-Q, skmem.t, RTT, RTO, cwnd", "Check if the same peer appears across many sockets"],
      mitigate: ["Apply application backpressure or rate limits", "Scale or fix the peer consumer", "Check route/qdisc/NIC drops before increasing buffers", "Avoid raising tcp_wmem blindly without proving memory headroom"],
      commands: [commandForPeer(selected), envCommand("ss -tinpm state established"), envCommand("ip -s link show", { host: true }), envCommand("tc -s qdisc show", { host: true }), envCommand("nstat -az | egrep 'Retrans|Timeout|Listen|TCPLoss|TCPAbort'", { host: true })]
    }));
  }

  if (highRecv.length || rxPressure.length) {
    const sockets = [...new Map([...highRecv, ...rxPressure].map(socket => [socket.id, socket])).values()];
    findings.push(makeFinding({
      id: "local-slow-consumer",
      severity: sockets.some(socket => socket.recvQ > thresholdFor("recvQ").danger) ? "critical" : "high",
      title: "Local application is probably not reading fast enough",
      pattern: "Recv-Q or receive socket memory is high on the local host.",
      sockets,
      confidence: processSamples(sockets).length ? "High" : "Medium",
      why: "The kernel has received data that the local application has not drained. This is usually application CPU saturation, event-loop stalls, blocking disk/DB calls, small worker pools, or missing backpressure.",
      next: ["Group by Process and Local port", "Inspect the busiest PID", "Compare Recv-Q growth with CPU and scheduler latency"],
      mitigate: ["Fix application read loop or backpressure", "Scale workers for the affected service", "Investigate GC/event loop stalls or blocking I/O", "Tune rmem only after proving the app can drain bursts"],
      commands: [envCommand("ss -tinpm state established"), envCommand("pidstat -druwt -p <pid> 1"), envCommand("top -H -p <pid>"), envCommand("strace -tt -p <pid> -e trace=network"), envCommand("sysctl net.ipv4.tcp_rmem net.core.rmem_max")]
    }));
  }

  if (drops.length && !dropRate) {
    const hasMultiSnapshot = drops.some(socket => socket.snapshotCount > 1);
    const hasCorrelation = drops.some(socket => socket.recvQ > 131072 || (socket.details.skmem.rb && (socket.details.skmem.r || 0) / socket.details.skmem.rb > 0.6));
    const maxDrops = Math.max(...drops.map(socket => metricValue(socket, "skmem.d")));
    const staticSeverity = hasCorrelation ? "high" : maxDrops >= thresholdFor("skmem.d").danger ? "medium" : "low";
    findings.push(makeFinding({
      id: "socket-drops",
      severity: hasMultiSnapshot ? staticSeverity : (maxDrops >= thresholdFor("skmem.d").danger ? "high" : "medium"),
      title: "Socket memory drops detected",
      pattern: "skmem.d is non-zero: packets/data were dropped before demultiplexing in the kernel receive path.",
      sockets: drops,
      confidence: "High",
      why: "A static skmem.d counter is common on long-running sockets and does not prove active loss. The key question is rate of change: is the counter growing during the observation window? Without timestamped snapshots showing growth, these may be historical drops from past events. Severity is elevated only when correlated with Recv-Q pressure, receive buffer saturation, or confirmed drop-rate growth.",
      next: ["Chart skmem.d over time", "Correlate with Recv-Q and skmem.r", "Check netdev_max_backlog, softnet drops/time_squeeze, and NIC driver counters before concluding ring-buffer overflow"],
      mitigate: ["Reduce burst rate or add backpressure", "Fix CPU/softirq pressure", "If softnet drops increase and netdev_max_backlog is 1000, test net.core.netdev_max_backlog=10000 under change control", "Increase buffers only with memory guardrails", "Investigate packet drops before blaming the application protocol"],
      commands: [envCommand("ss -tinpm"), envCommand("ip -s link show", { host: true }), envCommand("ethtool -S <iface> | egrep -i 'rx.*drop|rx.*miss|no.?buffer|timeout|fifo|overrun'", { host: true }), envCommand("nstat -az | egrep 'Rcv|Drop|Prune|Collapse|Listen'", { host: true }), envCommand("cat /proc/net/softnet_stat", { host: true }), envCommand("sysctl net.core.netdev_max_backlog net.core.rmem_max net.ipv4.tcp_rmem"), envCommand("sudo sysctl -w net.core.netdev_max_backlog=10000", { host: true })]
    }));
  }

  if (dropRate) {
    findings.push(makeFinding({
      id: "socket-drop-cadence",
      severity: dropRateSeverity(dropRate),
      title: "Socket drop cadence is active",
      pattern: `skmem.d increased by ${formatMetricValue("skmem.d", dropRate.totalDropDelta)} over ${formatDurationCompact(dropRate.observedSeconds)} (${formatDropCadence(dropRate)}).`,
      sockets: selected ? [selected] : state.sockets.slice(0, 1),
      confidence: "High",
      why: `A static drop counter can be old evidence; an increasing counter is current pressure. Average cadence is ${formatMetricValue("skmem.d_rate", dropRate.avgDropRate)} and the worst interval reached ${formatMetricValue("skmem.d_rate", dropRate.peakDropRate)}.`,
      next: ["Enable the Socket drop rate chart", "Look for bursts aligned with RX bandwidth or Recv-Q", "Compare this cadence with incident timestamps"],
      mitigate: ["If cadence is bursty, reduce producer burst size or add backpressure", "If cadence is steady, investigate CPU/softirq and receive buffer pressure", "If netdev_max_backlog is 1000 and softnet drops rise during bursts, test 10000 then persist only after before/after evidence", "Validate host NIC ring/qdisc/softnet counters before tuning socket buffers"],
      commands: [envCommand("ss -tinpm"), envCommand("watch -n 1 'ss -tinpm | grep -A1 skmem'"), envCommand("ip -s link show", { host: true }), envCommand("ethtool -S <iface> | egrep -i 'rx.*drop|rx.*miss|no.?buffer|timeout|fifo|overrun'", { host: true }), envCommand("cat /proc/net/softnet_stat", { host: true }), envCommand("sysctl net.core.netdev_max_backlog"), envCommand("sudo sysctl -w net.core.netdev_max_backlog=10000", { host: true }), envCommand("nstat -az | egrep 'Rcv|Drop|Prune|Collapse|Listen'", { host: true })]
    }));
  }

  if (microburst && selected) {
    findings.push(makeFinding({
      id: "receive-microburst",
      severity: microburst.severity,
      title: "Receive-side microburst on the active flow",
      pattern: `${formatMicroburstWindow(microburst)} with simultaneous RX bandwidth, Recv-Q, socket receive memory, and drop growth.`,
      sockets: [selected],
      confidence: microburst.dropDeltaTotal >= 1 ? "High" : "Medium",
      why: `This is a classic short receive-pressure window: RX peaked at ${formatMetricValue("rx_bps", microburst.peakRxBps)}, Recv-Q at ${formatMetricValue("recvQ", microburst.peakRecvQ)}, skmem.r at ${formatMetricValue("skmem.r", microburst.peakSkmemR)}, and new drops reached ${formatMetricValue("skmem.d", microburst.dropDeltaTotal)}. That usually means burst absorption exceeded what the local reader path could drain in time; if netdev_max_backlog is still 1000, validate softnet drops because the software receive backlog may be the limiting queue before demultiplexing.`,
      next: ["Narrow the chart zoom around the detected window", "Enable Recv-Q, RX bandwidth, Socket drops, and Socket memory receive together", "Check whether the same process or peer repeats the pattern"],
      mitigate: ["Reduce producer burst size or add backpressure", "Check local CPU, scheduler latency, softirq pressure, and netdev_max_backlog", "If softnet drops rise with bursts, test net.core.netdev_max_backlog=10000 before larger socket buffers", "Tune receive buffers only after proving the consumer cannot drain bursts fast enough"],
      commands: [envCommand("ss -tinpm state established"), envCommand("pidstat -druwt -p <pid> 1"), envCommand("cat /proc/net/softnet_stat", { host: true }), envCommand("sysctl net.core.netdev_max_backlog"), envCommand("sudo sysctl -w net.core.netdev_max_backlog=10000", { host: true }), envCommand("nstat -az | egrep 'Rcv|Drop|Prune|Collapse|Listen'", { host: true }), envCommand("ip -s link show", { host: true })]
    }));
  }

  if (loss.length || lowCwnd.length) {
    const sockets = [...new Map([...loss, ...lowCwnd].map(socket => [socket.id, socket])).values()];
    findings.push(makeFinding({
      id: "loss-or-congestion-control",
      severity: loss.some(socket => metricValue(socket, "rto") >= thresholdFor("rto").danger || (socket.details.values.backoff || 0) > 1) ? "critical" : "high",
      title: "Packet loss, jitter, or congestion-control backoff",
      pattern: "RTO/backoff/retransmission/cwnd signals indicate TCP recovery or constrained flight size.",
      sockets,
      confidence: loss.length && lowCwnd.length ? "High" : "Medium",
      why: "This pattern points below the application layer. It can be path loss, ECN/congestion, qdisc shaping, NIC issues, overloaded virtual networking, or an asymmetric route.",
      next: ["Check route and interface for the affected peers", "Compare one bad peer against healthy peers", "Look for RTO spikes aligned with Send-Q growth"],
      mitigate: ["Fix physical/virtual network drops", "Review qdisc/shaping policies", "Check MTU and route asymmetry", "Escalate with peer/path evidence rather than raw socket dumps"],
      commands: [commandForPeer(selected), envCommand("ss -ti dst <peer-ip>"), envCommand("ip -s route get <peer-ip>", { host: true }), envCommand("ip -s link show dev <iface>", { host: true }), envCommand("ethtool -S <iface> | egrep -i 'drop|err|timeout|reset|miss|crc'", { host: true }), envCommand("tracepath <peer-ip>", { host: true })]
    }));
  }

  if (exposed.length || missingProcess.length) {
    const sockets = [...new Map([...exposed, ...missingProcess].map(socket => [socket.id, socket])).values()];
    findings.push(makeFinding({
      id: "visibility-and-exposure",
      severity: exposed.length ? "medium" : "low",
      title: "Ownership or exposure needs confirmation",
      pattern: "Some sockets are globally listening or missing process attribution.",
      sockets,
      confidence: "Medium",
      why: "World-class diagnosis needs ownership. Missing PID/process prevents accountability; wildcard listeners should be intentional and mapped to service boundaries.",
      next: ["Recollect with process ownership", "Validate wildcard listeners against expected services", "Check namespace/container context"],
      mitigate: ["Run ss with sudo and -p", "Bind services to explicit addresses when possible", "Document or firewall intentional wildcard listeners"],
      commands: [envCommand("ss -Hlnptu"), envCommand("ss -HOntepmi --cgroup --inet-sockopt -a -A all"), envCommand("ip netns list", { host: true }), envCommand("systemctl status <service>", { host: true }), envCommand("lsof -nP -iTCP -sTCP:LISTEN", { host: true })]
    }));
  }

  if (state.sockets.length >= 5000 || noTimestamp) {
    findings.push(makeFinding({
      id: "collection-quality",
      severity: state.sockets.length >= 5000 ? "medium" : "low",
      title: "Collection quality or overhead risk",
      pattern: "The capture either has very high socket volume or lacks timestamps.",
      sockets: state.sockets.slice(0, 20),
      confidence: "High",
      why: "For large fleets, raw ss collection can become noisy and expensive. Without timestamps the app can find static symptoms, but it cannot prove growth rate, trend, or causality.",
      next: ["Use timestamped sampling", "Filter before parsing huge files", "Keep raw compressed evidence"],
      mitigate: ["Use -n -H -O to reduce overhead", "Avoid DNS resolution", "Increase interval when socket count is very high", "Collect narrow filters during incidents"],
      commands: [envCommand("t=5; while true; do date --iso-8601=ns; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep \"$t\"; done | gzip -c >> ss-timeseries.log.gz"), envCommand("ss -s"), envCommand("ss -HOntepmi state established '( sport = :443 or dport = :443 )'")]
    }));
  }

  if (!findings.length) {
    findings.push(makeFinding({
      id: "no-critical-pattern",
      severity: "low",
      title: "No dominant bottleneck pattern found",
      pattern: "The current snapshot does not show a strong queue, memory, drop, or TCP recovery signature.",
      sockets: state.sockets.slice(0, 5),
      confidence: "Medium",
      why: "This is good news for the current sample, but one snapshot can miss intermittent incidents. Trend data is still more valuable than a static view.",
      next: ["Collect timestamped samples during the incident window", "Watch the same socket over time", "Compare healthy and unhealthy peers"],
      mitigate: ["Keep the current collection command as baseline", "Add EPOCH_MS timestamps for future captures"],
      commands: [envCommand("ss -s"), envCommand("ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all"), envCommand("nstat -az", { host: true })]
    }));
  }

  return findings.sort((a, b) => b.score - a.score).slice(0, 8);

}
