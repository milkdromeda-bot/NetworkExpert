const PLAYBOOKS = [
  {
    id: "slow-consumer",
    matches: ["local-app-not-reading", "local-receive-window-collapse", "zero-window-or-slow-consumer", "slow-consumer-backpressure", "local-overload"],
    title: "Slow consumer investigation",
    local: [
      "pidstat -druwt -p {pid} 1 5",
      "top -H -p {pid}",
      "strace -tt -T -p {pid} -e trace=read,recvfrom,recvmsg,epoll_wait -c",
      "jstack {pid} > /tmp/thread_dump_$(date +%s).txt"
    ],
    peer: [
      "ss -tinpm dst {localIp}",
      "ss -tinpm state established | grep {localIp}"
    ],
    host: [
      "sysctl net.ipv4.tcp_rmem net.core.rmem_max",
      "cat /proc/net/sockstat",
      "vmstat 1 5"
    ],
    doNotConclude: [
      "Do not increase receive buffers without understanding why the app is not reading",
      "Do not blame the network if Recv-Q is growing locally",
      "A single snapshot with high Recv-Q can be a transient burst, not a sustained problem"
    ],
    mitigation: [
      "Check GC logs for STW pauses correlating with Recv-Q growth",
      "Check thread dumps for blocked reader threads",
      "Check disk I/O and downstream dependencies of the consuming process",
      "If buffer is genuinely too small: sysctl -w net.ipv4.tcp_rmem='4096 262144 {newRb}'"
    ]
  },
  {
    id: "network-congestion",
    matches: ["path-congestion-or-loss", "network-congestion-pattern", "congestion-event", "retrans-loss"],
    title: "Network congestion / path loss investigation",
    local: [
      "mtr -n -c 20 {peerIp}",
      "ip route get {peerIp}",
      "ethtool -S {iface} | egrep -i 'drop|err|crc|miss'",
      "nstat -az | egrep 'Retrans|Timeout|TCPLoss|TCPAbort'"
    ],
    peer: [
      "mtr -n -c 20 {localIp}",
      "ethtool -S {iface} | egrep -i 'drop|err|crc|miss'",
      "nstat -az | egrep 'Retrans|Timeout|TCPLoss'"
    ],
    host: [
      "tc -s qdisc show dev {iface}",
      "ip -s link show {iface}",
      "cat /proc/net/softnet_stat"
    ],
    doNotConclude: [
      "High RTO alone does not prove packet loss — it can be a side effect of persist/Zero Window",
      "Low cwnd can be normal after idle or slow-start",
      "Retransmission counters are cumulative — check delta, not absolute value"
    ],
    mitigation: [
      "Identify the lossy hop with mtr/traceroute",
      "Check NIC ring buffer drops: ethtool -g / ethtool -G",
      "Check qdisc drops: tc -s qdisc show",
      "If congestion is confirmed: consider ECN, pacing, or alternate path"
    ]
  },
  {
    id: "zero-window",
    matches: ["zero-window-or-slow-consumer", "zero-window-persist", "peer-stopped-reading", "rwnd-limited-sender"],
    title: "Zero Window / persist investigation",
    local: [
      "ss -tinpm dst {peerIp} | egrep 'persist|rwnd_limited|snd_wnd|backoff'",
      "tcpdump -i {iface} -nn 'host {peerIp} and tcp' -w /tmp/zw_check.pcap -c 200"
    ],
    peer: [
      "ss -tinpm src {peerIp} | egrep 'Recv-Q|skmem|rcv_space|rcv_wnd'",
      "pidstat -druwt -p {peerPid} 1 5",
      "jstack {peerPid} > /tmp/peer_threads.txt"
    ],
    host: [
      "tshark -r /tmp/zw_check.pcap -Y 'tcp.analysis.zero_window or tcp.analysis.window_full or tcp.analysis.zero_window_probe'",
      "nstat -az | egrep 'TCPAbort|PruneCalled|RcvPruned'"
    ],
    doNotConclude: [
      "rwnd_limited alone is ambiguous — it measures time, not root cause",
      "backoff during persist is defensive probing, not proof of network loss",
      "Do not tune send buffers if the problem is the receiver not reading"
    ],
    mitigation: [
      "Identify which side is the slow consumer (local or peer)",
      "Check if GC/thread stall correlates with Zero Window timing",
      "If receiver is intentionally throttling: this may be correct backpressure",
      "If receiver is stuck: fix the application, not the network"
    ]
  },
  {
    id: "jvm-gc-stall",
    matches: ["jvm-gc-stall"],
    title: "JVM GC stall investigation",
    local: [
      "jstat -gcutil {pid} 1000 10",
      "jstack {pid} > /tmp/jstack_$(date +%s).txt",
      "cat {gcLogPath} | grep 'pause' | tail -20",
      "pidstat -druwt -p {pid} 1 10"
    ],
    peer: [
      "ss -tinpm dst {localIp} | egrep 'persist|rwnd_limited|Send-Q'"
    ],
    host: [
      "vmstat 1 5",
      "free -m",
      "cat /proc/{pid}/status | grep -i vm"
    ],
    doNotConclude: [
      "Recv-Q growth during GC is expected — it is not a network problem",
      "Do not blame TCP tuning for a JVM pause",
      "Short GC pauses (<50ms) rarely cause visible socket symptoms"
    ],
    mitigation: [
      "Correlate GC pause timestamps with Recv-Q/persist appearance",
      "If G1GC: check -XX:MaxGCPauseMillis and humongous allocations",
      "If ZGC/Shenandoah: check allocation rate vs concurrent capacity",
      "Consider -XX:+UseStringDeduplication, heap sizing, or GC tuning"
    ]
  },
  {
    id: "buffer-pressure",
    matches: ["socket-memory-pressure", "buffer-exhaustion", "buffer-pressure"],
    title: "Buffer pressure / drops investigation",
    local: [
      "cat /proc/net/sockstat",
      "sysctl net.ipv4.tcp_mem net.ipv4.tcp_rmem net.ipv4.tcp_wmem net.core.rmem_max net.core.wmem_max",
      "ss -tinpm | egrep 'skmem.*d[1-9]'",
      "cat /proc/net/softnet_stat"
    ],
    peer: [
      "ss -tinpm dst {localIp}"
    ],
    host: [
      "ethtool -S {iface} | egrep -i 'rx.*drop|rx.*miss|no.?buffer|fifo|overrun'",
      "sysctl net.core.netdev_max_backlog",
      "ip -s link show {iface}"
    ],
    doNotConclude: [
      "skmem.d alone does not prove NIC ring overflow — it is socket-level drops",
      "Historical drops (stable counter) are not active drops",
      "Do not increase buffers blindly — find why consumption is slow first"
    ],
    mitigation: [
      "If drops are growing: increase net.core.netdev_max_backlog",
      "If rb is full: sysctl -w net.core.rmem_max=16777216",
      "If softnet drops: increase netdev_budget or add RPS/RFS",
      "Fix the root cause (slow consumer) before tuning buffers"
    ]
  },
  {
    id: "app-overproduction",
    matches: ["peer-slow-consumer-or-egress", "app-overproduction"],
    title: "Application overproduction / egress investigation",
    local: [
      "ss -tinpm state established | egrep 'Send-Q|skmem.*t[1-9]'",
      "tc -s qdisc show dev {iface}",
      "ip -s link show {iface}",
      "nstat -az | egrep 'Retrans|Timeout'"
    ],
    peer: [
      "ss -tinpm src {peerIp} | egrep 'Recv-Q|skmem|rcv_space'",
      "pidstat -druwt -p {peerPid} 1 5"
    ],
    host: [
      "sar -n DEV 1 5",
      "ethtool -S {iface} | egrep -i 'tx.*drop|tx.*err'"
    ],
    doNotConclude: [
      "High Send-Q without retransmission is more likely slow peer than network loss",
      "Do not increase send buffers if the peer cannot consume faster",
      "Transient Send-Q spikes during bursts can be normal"
    ],
    mitigation: [
      "Identify if peer is slow (check peer Recv-Q) or path is lossy (check retrans)",
      "If peer is slow: fix peer consumption or add backpressure in the application",
      "If path is lossy: investigate with mtr, check qdisc, NIC errors",
      "Consider application-level rate limiting or batching"
    ]
  }
];

function substituteVars(command, context) {
  return command
    .replace(/\{pid\}/g, context.pid || "<pid>")
    .replace(/\{peerIp\}/g, context.peerIp || "<peer-ip>")
    .replace(/\{localIp\}/g, context.localIp || "<local-ip>")
    .replace(/\{iface\}/g, context.iface || "<iface>")
    .replace(/\{peerPid\}/g, context.peerPid || "<peer-pid>")
    .replace(/\{gcLogPath\}/g, context.gcLogPath || "/var/log/gc.log")
    .replace(/\{newRb\}/g, context.newRb || "16777216");
}

export function playbookForHypothesis(hypothesisId) {
  return PLAYBOOKS.find(pb => pb.matches.includes(hypothesisId)) || null;
}

export function resolvePlaybook(playbook, socket) {
  if (!playbook) return null;
  const context = {
    pid: socket?.details?.process?.pid || "",
    peerIp: socket?.peerAddress?.host || socket?.peer?.split(":")[0] || "",
    localIp: socket?.localAddress?.host || socket?.local?.split(":")[0] || "",
    iface: "eth0",
    peerPid: "",
    gcLogPath: "/var/log/gc.log",
    newRb: String(Math.min((socket?.details?.skmem?.rb || 4194304) * 4, 16777216))
  };
  return {
    id: playbook.id,
    title: playbook.title,
    local: playbook.local.map(cmd => substituteVars(cmd, context)),
    peer: playbook.peer.map(cmd => substituteVars(cmd, context)),
    host: playbook.host.map(cmd => substituteVars(cmd, context)),
    doNotConclude: playbook.doNotConclude,
    mitigation: playbook.mitigation
  };
}

export { PLAYBOOKS };
