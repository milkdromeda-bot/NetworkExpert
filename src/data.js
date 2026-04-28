export const SS_OPTIONS = [
  ["-h", "--help", "Show ss help.", "general"],
  ["-V", "--version", "Show the iproute2 version.", "general"],
  ["-H", "--no-header", "Hide the header line.", "format"],
  ["-Q", "--no-queues", "Hide Recv-Q and Send-Q.", "format"],
  ["-O", "--oneline", "Force one socket per line, ideal for parsing.", "format"],
  ["-n", "--numeric", "Disable DNS/service resolution and keep exact values.", "format"],
  ["-r", "--resolve", "Resolve addresses and ports.", "format"],
  ["-a", "--all", "Show listening and non-listening sockets.", "scope"],
  ["-l", "--listening", "Show listening sockets only.", "scope"],
  ["-B", "--bound-inactive", "Show bound but inactive TCP sockets.", "scope"],
  ["-o", "--options", "Add TCP timers: retransmission, keepalive, timewait, persist.", "deep"],
  ["-e", "--extended", "Add uid, inode, and kernel socket cookie.", "deep"],
  ["-m", "--memory", "Add skmem: r/rb/t/tb/f/w/o/bl/d.", "deep"],
  ["-p", "--processes", "Add owning processes.", "process"],
  ["-T", "--threads", "Add threads and imply -p.", "process"],
  ["-i", "--info", "Add internal TCP data: rtt, cwnd, rto, wscale, ato, pacing.", "deep"],
  ["", "--tos", "Add ToS, traffic class, and priority/class_id.", "deep"],
  ["", "--cgroup", "Add cgroup v2 information.", "process"],
  ["", "--tipcinfo", "Add internal TIPC details.", "deep"],
  ["-K", "--kill", "Forcefully close compatible IPv4/IPv6 sockets.", "danger"],
  ["-s", "--summary", "Show a summary without parsing every socket.", "summary"],
  ["-E", "--events", "Show sockets as they are destroyed.", "stream"],
  ["-Z", "--context", "Add the process security context.", "security"],
  ["-z", "--contexts", "Add the socket security context too.", "security"],
  ["-N", "--net", "Switch into a network namespace.", "scope"],
  ["-b", "--bpf", "Show classic BPF filters.", "security"],
  ["-4", "--ipv4", "Filter IPv4, alias for -f inet.", "family"],
  ["-6", "--ipv6", "Filter IPv6, alias for -f inet6.", "family"],
  ["-0", "--packet", "Show PACKET sockets, alias for -f link.", "family"],
  ["-t", "--tcp", "Show TCP.", "family"],
  ["-u", "--udp", "Show UDP.", "family"],
  ["-d", "--dccp", "Show DCCP.", "family"],
  ["-w", "--raw", "Show RAW.", "family"],
  ["-x", "--unix", "Show Unix domain sockets.", "family"],
  ["-S", "--sctp", "Show SCTP.", "family"],
  ["", "--tipc", "Show TIPC.", "family"],
  ["", "--vsock", "Show VSOCK.", "family"],
  ["", "--xdp", "Show XDP.", "family"],
  ["-M", "--mptcp", "Show MPTCP.", "family"],
  ["", "--inet-sockopt", "Show inet socket options.", "deep"],
  ["-f", "--family", "Select a family: unix, inet, inet6, link, netlink, vsock, tipc, xdp.", "scope"],
  ["-A", "--query", "Select tables: all, inet, tcp, udp, raw, unix, packet, netlink, dccp, sctp, tipc, vsock, xdp, mptcp.", "scope"],
  ["", "--socket", "Alias for --query.", "scope"],
  ["-D", "--diag", "Dump raw TCP diagnostics to a file.", "export"],
  ["-F", "--filter", "Read filters from a file or stdin.", "scope"],
  ["", "--bpf-maps", "Pretty-print socket-local BPF data.", "security"],
  ["", "--bpf-map-id", "Pretty-print a BPF map by ID; repeatable.", "security"]
];

export const FIELD_DOCS = {
  ato: "ACK timeout in ms, useful for delayed ACK analysis. High values may accompany application latency.",
  wscale: "Send/receive window scaling factors. Asymmetric values can limit throughput by direction.",
  rto: "TCP retransmission timeout in ms. High or rising values suggest loss, latency, congestion, or an unstable path.",
  backoff: "Backoff exponent; effective RTO = rto << backoff. Any non-zero backoff deserves attention.",
  rtt: "Average round-trip time and deviation in ms. Core latency diagnostic.",
  cwnd: "Congestion window. Low cwnd with high RTT can become a throughput bottleneck.",
  ssthresh: "Slow-start threshold. Low values after loss suggest recent congestion.",
  pacing_rate: "TCP pacing rate and pacing cap.",
  rcv_space: "TCP receive buffer auto-tuning variable.",
  mss: "Maximum segment size.",
  pmtu: "Path MTU, useful for detecting fragmentation or a low path MTU.",
  bytes_acked: "Bytes acknowledged by ACKs.",
  bytes_received: "Bytes received.",
  segs_out: "Segments sent.",
  segs_in: "Segments received.",
  lastsnd: "Age of the last sent packet in ms.",
  lastrcv: "Age of the last received packet in ms.",
  lastack: "Age of the last received ACK in ms.",
  skmem: "Socket memory: r/rb receive, t/tb transmit, f cache, w queued, o options, bl backlog, d drops.",
  timer: "Active TCP timer: retransmission, keepalive, timewait, persist, or unknown.",
  cong_alg: "Congestion algorithm, often cubic or bbr.",
  cgroup: "Relative cgroup v2 path.",
  tos: "IPv4 Type-of-Service.",
  tclass: "IPv6 Traffic Class.",
  class_id: "net_cls class or SO_PRIORITY."
};

export const SAMPLE = `State Recv-Q Send-Q Local Address:Port Peer Address:Port Process
LISTEN 0 4096 0.0.0.0:443 0.0.0.0:* users:(("nginx",pid=1234,fd=6)) ino:991 sk:1 cgroup:/system.slice/nginx.service skmem:(r0,rb212992,t0,tb212992,f0,w0,o0,bl0,d0)
ESTAB 0 524288 10.0.0.5:443 203.0.113.22:55144 users:(("nginx",pid=1234,fd=32)) timer:(on,1.2sec,3) cubic wscale:7:7 rto:1200 backoff:2 rtt:260/80 ato:40 mss:1448 cwnd:4 pmtu:1500 ssthresh:7 bytes_acked:10485760 bytes_received:524288 segs_out:9234 segs_in:4012 send 128000bps lastsnd:4400 lastrcv:30 lastack:4400 pacing_rate 256000bps/1200000bps skmem:(r0,rb212992,t262144,tb425984,f4096,w262144,o0,bl0,d2)
UNCONN 245760 0 0.0.0.0:53 0.0.0.0:* users:(("systemd-resolve",pid=777,fd=14)) skmem:(r245760,rb262144,t0,tb212992,f0,w0,o0,bl4096,d19)
TIME-WAIT 0 0 10.0.0.5:443 198.51.100.8:60214 timer:(timewait,48sec,0)`;

export function generateTenMinuteSample() {
  const start = Date.parse("2026-04-25T08:00:00.000Z");
  const lines = ["State Recv-Q Send-Q Local Address:Port Peer Address:Port Process"];
  for (let i = 0; i < 600; i += 1) {
    const ts = new Date(start + i * 1000).toISOString();
    const wave = Math.sin(i / 28);
    const burst = i > 250 && i < 370 ? 1 : 0;
    const rtt = Math.round(42 + wave * 18 + burst * (80 + Math.sin(i / 5) * 50));
    const rto = Math.round(220 + rtt * 4 + burst * 900);
    const sendQ = Math.max(0, Math.round(12000 + Math.sin(i / 13) * 8000 + burst * (180000 + (i % 23) * 9000)));
    const recvQ = Math.max(0, Math.round(4000 + Math.cos(i / 17) * 3000 + (i > 410 && i < 455 ? 160000 : 0)));
    const cwnd = Math.max(2, Math.round(24 - burst * 18 + Math.sin(i / 19) * 4));
    const drops = burst && i % 17 === 0 ? 2 + (i % 5) : 0;
    const ato = Math.round(34 + burst * 55 + Math.sin(i / 9) * 8);
    const pacing = Math.max(64000, Math.round(1800000 - burst * 1300000 + Math.cos(i / 31) * 180000));
    lines.push(ts);
    lines.push(`ESTAB ${recvQ} ${sendQ} 10.0.0.5:443 203.0.113.22:55144 users:(("nginx",pid=1234,fd=32)) timer:(on,${Math.max(1, Math.round(rto / 1000))}sec,${drops ? 2 : 0}) cubic wscale:7:7 rto:${rto} ${burst ? "backoff:1" : ""} rtt:${rtt}/${Math.round(rtt / 4)} ato:${ato} mss:1448 cwnd:${cwnd} pmtu:1500 ssthresh:${Math.max(4, cwnd + 3)} bytes_acked:${10485760 + i * 22000} bytes_received:${524288 + i * 9000} segs_out:${9234 + i * 9} segs_in:${4012 + i * 7} send ${pacing}bps lastsnd:${Math.max(0, 1000 - i)} lastrcv:${20 + (i % 40)} lastack:${30 + (i % 70)} pacing_rate ${pacing}bps/${Math.round(pacing * 2.8)}bps skmem:(r${recvQ},rb262144,t${sendQ},tb425984,f4096,w${Math.round(sendQ / 2)},o0,bl${drops ? 4096 : 0},d${drops})`);
    lines.push(`ESTAB ${Math.round(recvQ / 3)} ${Math.round(sendQ / 5)} 10.0.0.5:5432 10.0.0.20:48122 users:(("postgres",pid=2222,fd=18)) timer:(keepalive,32sec,0) cubic wscale:7:7 rto:${Math.round(rto / 2)} rtt:${Math.round(rtt / 2)}/${Math.round(rtt / 9)} ato:40 mss:1448 cwnd:${Math.max(8, cwnd + 12)} pmtu:1500 bytes_acked:${60485760 + i * 12000} bytes_received:${10524288 + i * 11000} segs_out:${12000 + i * 5} segs_in:${9000 + i * 4} send ${Math.round(pacing * 1.4)}bps pacing_rate ${Math.round(pacing * 1.4)}bps/${Math.round(pacing * 3.2)}bps skmem:(r${Math.round(recvQ / 3)},rb425984,t${Math.round(sendQ / 5)},tb425984,f4096,w${Math.round(sendQ / 8)},o0,bl0,d0)`);
    lines.push(`LISTEN 0 4096 0.0.0.0:443 0.0.0.0:* users:(("nginx",pid=1234,fd=6)) ino:991 sk:1 cgroup:/system.slice/nginx.service skmem:(r0,rb212992,t0,tb212992,f0,w0,o0,bl0,d0)`);
  }
  return lines.join("\n");
}

export const prefsDefault = {
  severityFloor: "low",
  autoToast: true,
  compactRows: false,
  deepAnalysis: true,
  graphMetric: "rtt",
  graphStyle: "line",
  graphWindow: 30,
  graphThreshold: 80,
  sampling: 1,
  colorBlind: false,
  numberLocale: "auto",
  numberGrouping: true,
  tableUnits: true,
  linuxProfile: "lxc",
  accessRole: "analyst",
  ubuntuVersion: "22.04",
  chartTimeZone: "auto",
  chartPointSize: "S",
  paginationPosition: "top",
  defaultPageSize: 20,
  chartLayout: {
    columns: 2,
    density: "standard",
    mainChart: true,
    sharedZoom: true,
    showLegend: true,
    showCrosshair: true,
    showThresholds: true,
    stickyToolbar: true,
    panelOrder: ["tx_bps", "rx_bps", "delivery_rate", "pacing_rate", "rtt", "rttvar", "rto", "sendQ", "recvQ", "cwnd", "ato", "skmem.r", "skmem.t", "skmem.d", "bytes_acked", "bytes_received", "segs_out", "segs_in", "backoff", "retrans"]
  }
};
