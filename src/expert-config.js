export const EXPERT_DEFAULT_THRESHOLDS = {
  rtt: { comfort: 50, warn: 150, danger: 300, unit: "ms", rationale: "Interactive workloads usually feel healthy below 50 ms; sustained values above 150 ms deserve path and peer investigation." },
  rto: { comfort: 250, warn: 1000, danger: 3000, unit: "ms", rationale: "RTO around seconds signals loss, severe jitter, or delayed ACK/recovery pressure." },
  sendQ: { comfort: 65536, warn: 262144, danger: 1048576, unit: "bytes", rationale: "Growing Send-Q often means peer slow-consumption, congestion, or an application producing faster than the path drains." },
  recvQ: { comfort: 32768, warn: 131072, danger: 524288, unit: "bytes", rationale: "Large Recv-Q points to local application read latency or scheduling pressure." },
  cwnd: { comfort: 16, warn: 4, danger: 2, unit: "segments", inverse: true, rationale: "Very small congestion windows suggest loss recovery, pacing collapse, or a path repeatedly backing off." },
  ato: { comfort: 40, warn: 100, danger: 250, unit: "ms", rationale: "High delayed ACK timeout can amplify latency-sensitive flows and should be correlated with RTT and send stalls." },
  "skmem.r": { comfort: 131072, warn: 262144, danger: 524288, unit: "bytes", rationale: "Receive socket memory near large buffer levels can indicate local consumer lag or burst absorption pressure." },
  "skmem.t": { comfort: 131072, warn: 262144, danger: 524288, unit: "bytes", rationale: "Transmit socket memory pressure is a strong sign of peer slowness, congestion, or send buffering buildup." },
  "skmem.d": { comfort: 0, warn: 1, danger: 10, unit: "drops", rationale: "Any socket memory drop is worth attention; repeated drops are a high-confidence loss symptom." },
  "skmem.d_rate": { comfort: 0, warn: 0.1, danger: 1, unit: "drops/s", rationale: "Drop cadence is stronger than a static counter: one drop every 10 seconds is worth watching; one drop per second is usually an active pressure symptom." },
  pacing_rate: { comfort: 1000000, warn: 250000, danger: 64000, unit: "bps", inverse: true, rationale: "Very low pacing rate after a previously healthy flow can reveal congestion-control backoff or app-limited stalls." },
  delivery_rate: { comfort: 1000000, warn: 250000, danger: 64000, unit: "bps", inverse: true, rationale: "Low delivery rate with queued data can reveal throughput collapse after loss, pacing, or peer-side slowness." },
  tx_bps: { comfort: 0, warn: Number.POSITIVE_INFINITY, danger: Number.POSITIVE_INFINITY, unit: "bps", rationale: "Estimated transmit bandwidth from bytes_acked deltas between timestamped snapshots." },
  rx_bps: { comfort: 0, warn: Number.POSITIVE_INFINITY, danger: Number.POSITIVE_INFINITY, unit: "bps", rationale: "Estimated receive bandwidth from bytes_received deltas between timestamped snapshots." },
  bytes_acked: { comfort: 0, warn: Number.POSITIVE_INFINITY, danger: Number.POSITIVE_INFINITY, unit: "bytes", rationale: "Cumulative bytes acknowledged by the peer. Use deltas over time for transmit bandwidth." },
  bytes_received: { comfort: 0, warn: Number.POSITIVE_INFINITY, danger: Number.POSITIVE_INFINITY, unit: "bytes", rationale: "Cumulative bytes received locally. Use deltas over time for receive bandwidth." },
  rttvar: { comfort: 20, warn: 80, danger: 200, unit: "ms", rationale: "RTT variance indicates jitter. High variance often matters as much as high average RTT." },
  segs_out: { comfort: 0, warn: Number.POSITIVE_INFINITY, danger: Number.POSITIVE_INFINITY, unit: "segments", rationale: "Cumulative outbound TCP segments." },
  segs_in: { comfort: 0, warn: Number.POSITIVE_INFINITY, danger: Number.POSITIVE_INFINITY, unit: "segments", rationale: "Cumulative inbound TCP segments." },
  backoff: { comfort: 0, warn: 1, danger: 3, unit: "steps", rationale: "TCP backoff increases effective retransmission timeout and is a strong recovery signal." },
  retrans: { comfort: 0, warn: 1, danger: 3, unit: "retrans", rationale: "Active retransmission timer count for the socket." }
};

export const COLUMN_HELP = {
  risk: {
    summary: "Aggregated severity computed from socket counters, queues, timers, memory pressure, and detected symptoms.",
    detail: "Use Risk as the triage entry point. High or critical rows deserve correlation with RTT/RTO, Send-Q, Recv-Q, cwnd, skmem, and process identity before deciding whether the fault is local, peer-side, or path-related.",
    use: "Sort descending, then open row details or jump to charts for the same socket."
  },
  state: {
    summary: "TCP or UDP socket state reported by ss.",
    detail: "ESTAB rows show live flows. LISTEN rows are service endpoints. SYN-SENT, SYN-RECV, FIN-WAIT, CLOSE-WAIT, and TIME-WAIT can expose connection churn, failed handshakes, application close delays, or load-balancer behavior.",
    use: "Filter by state when separating active bottlenecks from listener inventory or connection lifecycle noise."
  },
  family: {
    summary: "Protocol family detected from the ss output, usually tcp, udp, tcp6, or udp6.",
    detail: "Protocol changes how queues and timers should be interpreted. TCP has congestion control, RTT, RTO, cwnd, retransmission, and pacing signals; UDP usually needs queue, drop, process, and rate-focused interpretation.",
    use: "Compare TCP and UDP separately when diagnosing mixed workloads."
  },
  recvQ: {
    summary: "Bytes queued locally waiting for the application to read.",
    detail: "Sustained Recv-Q growth usually points to a local slow consumer: the local process is not draining data fast enough, is blocked, CPU-starved, or constrained by scheduler/runtime latency.",
    use: "Correlate with process, CPU symptoms, skmem.r, drops, and application logs."
  },
  sendQ: {
    summary: "Bytes queued locally waiting to be sent or acknowledged.",
    detail: "Sustained Send-Q growth often means the peer is reading slowly, the network path is congested, TCP is backing off, or the application writes faster than the socket can drain.",
    use: "Correlate with RTT, RTO, cwnd, pacing_rate, retransmission timers, and peer-side health."
  },
  tx_bps: {
    summary: "Estimated transmit bandwidth for this socket, in bits per second.",
    detail: "When timestamped snapshots contain bytes_acked, Ultimate Network Expert computes TX bps from byte deltas between samples. If only a single snapshot is available, it falls back to delivery_rate or pacing_rate when ss exposes them.",
    use: "Chart TX bps with Send-Q, RTT, RTO, and cwnd. Falling TX bps while Send-Q rises usually points to congestion, retransmission recovery, or a slow peer."
  },
  rx_bps: {
    summary: "Estimated receive bandwidth for this socket, in bits per second.",
    detail: "When timestamped snapshots contain bytes_received, Ultimate Network Expert computes RX bps from byte deltas between samples. This is strongest with regular one-second or millisecond collection intervals.",
    use: "Chart RX bps with Recv-Q and skmem.r. Low RX bps plus high Recv-Q can indicate a local consumer or scheduling problem."
  },
  local: {
    summary: "Local endpoint address and port for the socket.",
    detail: "This identifies the host-side service or client port. It is the best anchor for grouping sockets by local workload, service port, bind address, or namespace exposure.",
    use: "Filter local IP/port to isolate one service, listener, pod, namespace, or test target."
  },
  peer: {
    summary: "Remote endpoint address and port for the socket.",
    detail: "This identifies the other side of the conversation. Repeated anomalies against the same peer often reveal remote slow consumers, overloaded upstreams, path asymmetry, or a problematic client population.",
    use: "Group by peer to separate one bad remote endpoint from a global host issue."
  },
  process: {
    summary: "Process name and PID reported by ss when process visibility is available.",
    detail: "Process attribution turns socket symptoms into actionable ownership. Missing process data usually means ss was not run with enough privilege or process flags.",
    use: "Collect with sudo and process options such as ss -p when possible."
  },
  rtt: {
    summary: "Smoothed TCP round-trip time observed by the kernel for this socket.",
    detail: "RTT is the latency baseline for the flow. A high or rising RTT can mean path congestion, queueing, distance, overloaded peers, or wireless/virtualization jitter. It becomes much more actionable when it rises together with Send-Q, RTO, low cwnd, or low pacing rate.",
    use: "Chart RTT with RTO, Send-Q, and cwnd for the same socket to separate latency from loss recovery."
  },
  rttvar: {
    summary: "RTT variance / deviation reported by ss, in milliseconds.",
    detail: "RTT variance is the jitter side of latency. A moderate average RTT can still be unhealthy when variance is high because TCP recovery and application tail latency become unstable.",
    use: "Correlate RTT variance with RTO jumps, backoff, retransmission timers, and application timeouts."
  },
  rto: {
    summary: "TCP retransmission timeout currently calculated for the socket.",
    detail: "RTO is how long TCP waits before retransmitting when acknowledgements do not arrive. High RTO is usually a stronger warning than high RTT because it reflects loss, severe jitter, delayed acknowledgements, or unstable recovery behavior.",
    use: "Investigate when RTO jumps while RTT variance, Send-Q, retransmission timers, or low cwnd are also present."
  },
  cwnd: {
    summary: "TCP congestion window: how many segments TCP may keep in flight.",
    detail: "A small cwnd limits throughput even when the application wants to send. It often drops after loss, ECN/congestion signals, route instability, or aggressive congestion-control backoff.",
    use: "Correlate low cwnd with high RTO, Send-Q buildup, pacing rate collapse, and retransmission indicators."
  },
  ato: {
    summary: "ACK timeout / delayed ACK timer exposed by ss for the TCP socket.",
    detail: "High ato can add latency to request/response or small-message workloads. It is not always bad by itself, but it matters when paired with elevated RTT, slow application reads, or bursty bidirectional traffic.",
    use: "Use ato as a supporting signal for latency-sensitive flows, not as a standalone incident trigger."
  },
  "skmem.r": {
    summary: "Socket receive memory currently allocated by the kernel for inbound data and receive-side bookkeeping.",
    detail: "In ss skmem, r is the receive memory in use. High skmem.r means the kernel is holding more receive-side socket memory. Common causes include a local application that reads too slowly, bursty inbound traffic, receive buffer growth, scheduler stalls, or memory pressure around many active sockets.",
    use: "Correlate skmem.r with Recv-Q, process identity, socket drops, CPU saturation, and whether only one service or many sockets are affected."
  },
  "skmem.t": {
    summary: "Socket transmit memory currently allocated by the kernel for outbound data and transmit-side bookkeeping.",
    detail: "In ss skmem, t is the transmit memory in use. High skmem.t often appears when the local process writes faster than TCP can drain, when the peer reads slowly, when the path is congested, or when congestion control is limiting flight size.",
    use: "Correlate skmem.t with Send-Q, RTT, RTO, cwnd, pacing_rate, and peer grouping to identify slow consumers."
  },
  "skmem.d": {
    summary: "Socket memory drops counted for this socket.",
    detail: "In ss skmem, d is the drop counter: packets/data dropped before demultiplexing in the kernel receive path. Any non-zero value deserves attention, but it is not a standalone proof of NIC ring-buffer overflow. Treat it as receive-side loss to correlate with Recv-Q, skmem.r, softnet backlog, qdisc/interface drops, NIC driver counters, and net.core.netdev_max_backlog. A backlog of 1000 is often conservative for burst-heavy low-latency captures, but only tune it after confirming softnet/backlog pressure.",
    use: "Chart drops over time, then compare with Recv-Q, skmem.r, burst timing, /proc/net/softnet_stat, ip -s link, ethtool -S counters such as rx_missed_errors or rx_no_buffer_count, and sysctl net.core.netdev_max_backlog."
  },
  pacing_rate: {
    summary: "Kernel TCP pacing rate, usually in bits per second.",
    detail: "Pacing rate is how fast TCP is currently allowed to put data on the wire. A sudden collapse after a previously healthy value can indicate congestion-control backoff, loss recovery, or app-limited behavior.",
    use: "Compare pacing_rate with TX bps, delivery_rate, Send-Q, cwnd, and RTO."
  },
  delivery_rate: {
    summary: "Kernel-estimated delivered throughput for the socket, in bits per second.",
    detail: "delivery_rate is TCP's estimate of real delivered bandwidth. It is often more useful than a raw queue size when diagnosing throughput collapse because it reflects what the path is actually delivering.",
    use: "Compare delivery_rate with TX bps and pacing_rate to separate path limits from application-limited sends."
  },
  bytes_acked: {
    summary: "Cumulative bytes acknowledged by the peer.",
    detail: "This counter is best used over time. Ultimate Network Expert derives TX bandwidth from the delta of bytes_acked between timestamped snapshots.",
    use: "Enable this column when validating computed TX bps or checking whether a connection is still making forward progress."
  },
  bytes_received: {
    summary: "Cumulative bytes received locally.",
    detail: "This counter is best used over time. Ultimate Network Expert derives RX bandwidth from the delta of bytes_received between timestamped snapshots.",
    use: "Enable this column when validating computed RX bps or checking receive-side progress."
  },
  segs_out: {
    summary: "Cumulative TCP segments sent.",
    detail: "Segments out helps distinguish byte throughput from packet/segment activity. Many segments with low bytes can indicate tiny writes or inefficient application framing.",
    use: "Compare with bytes_acked, MSS, retransmission, and pacing rate."
  },
  segs_in: {
    summary: "Cumulative TCP segments received.",
    detail: "Segments in helps reveal receive-side packet activity and can expose tiny packet patterns when compared with bytes_received.",
    use: "Compare with bytes_received, Recv-Q, skmem.r, and application read behavior."
  },
  backoff: {
    summary: "TCP retransmission backoff level.",
    detail: "Backoff increases effective retransmission timeout after repeated recovery trouble. Non-zero values are usually more important than a single high queue sample.",
    use: "Prioritize sockets with backoff plus high RTO, Send-Q growth, or low delivery rate."
  },
  retrans: {
    summary: "Retransmission timer count from ss timer data.",
    detail: "This reflects active retransmission recovery state exposed in timer:(...). It is a compact signal that ACKs are not arriving as expected.",
    use: "Correlate with RTO, backoff, RTT variance, cwnd, and interface or path loss counters."
  }
};

export const INGEST_RAW_EAGER_LIMIT = 200000;

export const COMMON_TIME_ZONES = [
  "UTC",
  "Europe/Paris",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Australia/Sydney"
];

export const LINUX_PROFILES = {
  native: {
    label: "Linux Ubuntu native",
    note: "Commands run directly on the Ubuntu host. ss, ip route, tc, ethtool, nstat, pidstat, and sysctl can observe the host network namespace when executed with sufficient privileges."
  },
  lxc: {
    label: "Linux Container LXC/LXD",
    note: "Default. ss inside a container observes the container network namespace, not the host. Analysts usually run commands from inside the container; ops/root can collect host interface, qdisc, ethtool, route, and LXD evidence."
  }
};

export const UBUNTU_PROFILES = {
  "22.04": "Ubuntu 22.04 LTS",
  "24.04": "Ubuntu 24.04 LTS",
  "26.04": "Ubuntu 26.04 LTS / next LTS"
};

export const ACCESS_ROLES = {
  analyst: {
    label: "Analyst inside container, no root",
    note: "Default. Commands are meant to be run from inside the LXC/LXD container with non-root privileges. Host/LXD evidence is shown as an ops handoff request, not as a command you are expected to run."
  },
  opsRoot: {
    label: "Ops/root with host or sudo access",
    note: "Commands may include lxc exec, host interface counters, qdisc, ethtool, sysctl, lsof, or other privileged evidence."
  }
};

export function cloneThresholds() {
  return Object.fromEntries(Object.entries(EXPERT_DEFAULT_THRESHOLDS).map(([metric, threshold]) => [metric, { ...threshold }]));
}
