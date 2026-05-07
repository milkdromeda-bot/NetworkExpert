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

export const FIELD_GUIDANCE = {
  ato: {
    typical: "Common steady value around 40 ms; higher values matter most on small-message or request/response flows.",
    metric: "ato"
  },
  wscale: {
    typical: "Usually negotiated between 0 and 14. Pairs such as 7:7 or 8:9 are common on high-throughput paths."
  },
  rto: {
    typical: "Often a few hundred ms on healthy paths, but it is intentionally path and jitter dependent.",
    metric: "rto"
  },
  backoff: {
    typical: "Expected value is 0 during normal operation.",
    metric: "backoff"
  },
  rtt: {
    typical: "LAN is often below 1 ms; same-region services often sit around 1-20 ms; WAN is workload and distance dependent.",
    metric: "rtt"
  },
  cwnd: {
    typical: "Healthy active flows often keep more than 10 segments in flight; very small values cap throughput.",
    metric: "cwnd"
  },
  ssthresh: {
    typical: "Context-dependent. A low single-digit value after loss suggests recent congestion recovery."
  },
  pacing_rate: {
    typical: "Workload and path dependent. Interpret as a trend against delivery_rate, Send-Q, cwnd, and RTO."
  },
  rcv_space: {
    typical: "Auto-tuned by TCP. Interpret with Recv-Q, skmem.r, application read behavior, and workload bursts."
  },
  mss: {
    typical: "Common Ethernet values are about 1460 bytes for IPv4 and 1440-1448 bytes with extra encapsulation."
  },
  pmtu: {
    typical: "1500 bytes is common Ethernet MTU; around 9000 indicates jumbo frames; unexpectedly low values deserve path MTU checks."
  },
  lastsnd: {
    typical: "Near 0 on actively sending flows. Large values usually mean the flow is idle or blocked elsewhere."
  },
  lastrcv: {
    typical: "Near 0 on actively receiving flows. Large values usually mean peer silence or an idle flow."
  },
  lastack: {
    typical: "Near 0 on active ACK exchange. Large values can support a stall hypothesis when queues are also rising."
  },
  skmem: {
    typical: "Most useful as r/t pressure and d drops. Compare current allocation with rb/tb limits.",
    thresholds: [
      { label: "Receive memory", metric: "skmem.r" },
      { label: "Transmit memory", metric: "skmem.t" },
      { label: "Drops", metric: "skmem.d" }
    ]
  },
  timer: {
    typical: "keepalive and timewait can be normal. retransmission/persist timers deserve closer correlation with RTO and queues."
  }
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

export function generateMicroburstSample() {
  const start = Date.parse("2026-05-07T09:14:00.000Z");
  const lines = ["State Recv-Q Send-Q Local Address:Port Peer Address:Port Process"];
  let primaryDrops = 0;
  for (let i = 0; i < 180; i += 1) {
    const ts = new Date(start + i * 1000).toISOString();
    const warmup = i >= 44 && i <= 48;
    const burst = i >= 49 && i <= 54;
    const decay = i >= 55 && i <= 60;
    const recvQ = burst
      ? 180000 + (i - 49) * 98000
      : decay
        ? Math.max(18000, 520000 - (i - 55) * 92000)
        : warmup
          ? 42000 + (i - 44) * 22000
          : Math.max(2000, 7000 + Math.round(Math.sin(i / 9) * 1800));
    const skmemR = burst
      ? 250000 + (i - 49) * 112000
      : decay
        ? Math.max(24000, 640000 - (i - 55) * 108000)
        : warmup
          ? 70000 + (i - 44) * 36000
          : Math.max(12000, 24000 + Math.round(Math.cos(i / 11) * 3200));
    const sendQ = burst ? 18000 + (i - 49) * 4000 : Math.max(3000, 9000 + Math.round(Math.sin(i / 7) * 2500));
    const rxStep = burst ? 420000 : decay ? 140000 : warmup ? 90000 : 16000;
    const txStep = burst ? 54000 : 22000;
    const rtt = burst ? 2.4 + (i - 49) * 0.6 : decay ? 4.2 - (i - 55) * 0.35 : 0.8 + Math.sin(i / 12) * 0.08;
    const rto = burst ? 240 + (i - 49) * 30 : decay ? 390 - (i - 55) * 26 : 190 + Math.round(Math.cos(i / 8) * 9);
    const cwnd = burst ? Math.max(6, 18 - (i - 49) * 2) : 22 + Math.round(Math.sin(i / 13) * 2);
    const dropDelta = burst ? [0, 2, 4, 7, 5, 2][i - 49] : 0;
    primaryDrops += dropDelta;
    const bytesReceived = 2_400_000 + i * 16_000 + (warmup ? (i - 43) * 54000 : 0) + (burst ? 270000 + (i - 49) * rxStep : decay ? 270000 + 6 * 420000 + (i - 55) * rxStep : 0);
    const bytesAcked = 1_900_000 + i * txStep;
    const rxPeer = `192.168.12.45:${57067}`;
    lines.push(ts);
    lines.push(`ESTAB ${Math.round(recvQ)} ${Math.round(sendQ)} 192.168.145.205:20002 ${rxPeer} users:(("java",pid=3450060,fd=286)) timer:(on,${Math.max(1, Math.round(rto / 1000))}sec,${dropDelta ? 1 : 0}) cubic wscale:7:7 rto:${Math.round(rto)} ${burst ? "backoff:1" : ""} rtt:${rtt.toFixed(3)}/${Math.max(0.08, rtt / 3).toFixed(3)} ato:40 mss:1448 pmtu:1500 cwnd:${Math.round(cwnd)} bytes_sent:${40000000 + i * 12000} bytes_retrans:${dropDelta ? 986 : 0} bytes_acked:${Math.round(bytesAcked)} bytes_received:${Math.round(bytesReceived)} segs_out:${119736 + i * 7} segs_in:${170954 + i * 19} data_segs_out:${33957 + i * 2} data_segs_in:${158547 + i * 13} delivery_rate ${Math.max(18_000_000, 4964571424 - (burst ? 600000000 : 0))}bps busy:${burst ? 820 : 120}ms retrans:${dropDelta ? "1/1" : "0/0"} dsack_dups:${dropDelta ? 1 : 0} rcv_rtt:${(8.7 + (burst ? 2.1 : 0)).toFixed(2)} rcv_space:${Math.round(Math.max(44098, skmemR / 8))} skmem:(r${Math.round(skmemR)},rb642855,t${Math.round(sendQ)},tb87040,f0,w${Math.round(sendQ / 2)},o0,bl${burst ? 4096 : 0},d${primaryDrops})`);
    lines.push(`ESTAB ${Math.round(recvQ / 5)} ${Math.round(sendQ / 3)} 192.168.145.205:443 ${`192.168.10.18:${53111 + (i % 20)}`} users:(("nginx",pid=2011,fd=44)) timer:(keepalive,28sec,0) cubic wscale:7:7 rto:180 rtt:0.700/0.120 ato:40 mss:1448 pmtu:1500 cwnd:28 bytes_acked:${8200000 + i * 24000} bytes_received:${2100000 + i * 14000} segs_out:${78000 + i * 11} segs_in:${56000 + i * 8} send 22000000bps pacing_rate 22000000bps/48000000bps skmem:(r${Math.round(recvQ / 6)},rb262144,t${Math.round(sendQ / 4)},tb425984,f4096,w${Math.round(sendQ / 7)},o0,bl0,d0)`);
  }
  return lines.join("\n");
}

export function generateTailLatencySample() {
  const start = Date.parse("2026-05-07T10:32:00.000Z");
  const lines = ["State Recv-Q Send-Q Local Address:Port Peer Address:Port Process"];
  for (let i = 0; i < 180; i += 1) {
    const ts = new Date(start + i * 1000).toISOString();
    const tailWarmup = i >= 66 && i <= 72;
    const tailSpike = i >= 73 && i <= 79;
    const tailRecovery = i >= 80 && i <= 86;
    const rtt = tailSpike
      ? 95 + (i - 73) * 42
      : tailRecovery
        ? Math.max(12, 310 - (i - 80) * 38)
        : tailWarmup
          ? 18 + (i - 66) * 10
          : 0.9 + Math.sin(i / 10) * 0.12;
    const rttVar = tailSpike
      ? 44 + (i - 73) * 16
      : tailRecovery
        ? Math.max(4, 122 - (i - 80) * 17)
        : tailWarmup
          ? 6 + (i - 66) * 4
          : 0.4 + Math.cos(i / 12) * 0.08;
    const rto = tailSpike
      ? 880 + (i - 73) * 330
      : tailRecovery
        ? Math.max(220, 2480 - (i - 80) * 260)
        : tailWarmup
          ? 280 + (i - 66) * 70
          : 190 + Math.round(Math.sin(i / 7) * 8);
    const sendQ = tailSpike ? 140000 + (i - 73) * 64000 : tailRecovery ? Math.max(12000, 520000 - (i - 80) * 70000) : Math.max(2000, 10000 + Math.round(Math.sin(i / 9) * 2400));
    const recvQ = tailSpike ? 24000 + (i - 73) * 3500 : Math.max(1000, 4000 + Math.round(Math.cos(i / 11) * 900));
    const backoff = tailSpike ? 1 : 0;
    const retrans = tailSpike ? 1 : 0;
    const cwnd = tailSpike ? Math.max(4, 16 - (i - 73)) : 22 + Math.round(Math.sin(i / 13) * 2);
    const bytesAcked = 8_200_000 + i * 28_000;
    const bytesReceived = 6_100_000 + i * 18_000;
    const pacing = tailSpike ? Math.max(64_000_000, 480_000_000 - (i - 73) * 38_000_000) : 610_000_000 + Math.round(Math.sin(i / 6) * 20_000_000);
    const delivery = tailSpike ? Math.max(22_000_000, 190_000_000 - (i - 73) * 23_000_000) : 420_000_000 + Math.round(Math.cos(i / 7) * 18_000_000);
    const rtx = tailSpike && i % 2 === 0 ? 1200 + (i - 73) * 220 : 0;
    lines.push(ts);
    lines.push(`ESTAB ${Math.round(recvQ)} ${Math.round(sendQ)} 192.168.145.205:54475 [::ffff:160.43.172.2]:8228 users:(("java",pid=3450060,fd=286)) timer:(on,${Math.max(1, Math.round(rto / 1000))}sec,${retrans}) cubic wscale:11:9 rto:${Math.round(rto)} ${backoff ? `backoff:${backoff}` : ""} rtt:${rtt.toFixed(3)}/${rttVar.toFixed(3)} ato:40 mss:1448 pmtu:1500 cwnd:${Math.round(cwnd)} bytes_sent:${2674175 + i * 23000} bytes_retrans:${Math.round(rtx)} bytes_acked:${Math.round(bytesAcked)} bytes_received:${Math.round(bytesReceived)} segs_out:${8786 + i * 46} segs_in:${8729 + i * 42} data_segs_out:${5155 + i * 28} data_segs_in:${1292 + i * 18} send ${Math.round(pacing / 8)}bps lastsnd:${Math.max(20, 2005 - i)} lastrcv:${tailSpike ? 1900 - (i - 73) * 90 : 24 + (i % 9)} lastack:${tailSpike ? 1926 - (i - 73) * 88 : 26 + (i % 8)} pacing_rate ${Math.round(pacing)}bps delivery_rate ${Math.round(delivery)}bps delivered:${5155 + i * 24} app_limited busy:${tailSpike ? 624209 : 640 + i * 2}ms retrans:${retrans ? "0/2" : "0/0"} dsack_dups:${retrans ? 1 : 0} rcv_rtt:${tailSpike ? (207760 - (i - 73) * 21000).toFixed(0) : (76 + i * 0.2).toFixed(2)} rcv_space:${Math.round(69693 + (tailSpike ? 18000 : 0))} rcv_ssthresh:${Math.round(454144 + (tailSpike ? 40000 : 0))} minrtt:78.83 skmem:(r${Math.round(recvQ)},rb262144,t${Math.round(sendQ)},tb425984,f4096,w${Math.round(sendQ / 3)},o0,bl0,d0)`);
    lines.push(`ESTAB ${Math.round(recvQ / 6)} ${Math.round(sendQ / 5)} 192.168.145.205:20002 192.168.145.204:57067 users:(("java",pid=3450061,fd=144)) timer:(keepalive,26sec,0) cubic wscale:7:7 rto:190 rtt:0.800/0.120 ato:40 mss:1448 pmtu:1500 cwnd:28 bytes_acked:${8200000 + i * 24000} bytes_received:${2100000 + i * 20000} segs_out:${78000 + i * 11} segs_in:${56000 + i * 8} send 22000000bps pacing_rate 22000000bps/48000000bps skmem:(r${Math.round(recvQ / 8)},rb262144,t${Math.round(sendQ / 8)},tb425984,f4096,w${Math.round(sendQ / 10)},o0,bl0,d0)`);
  }
  return lines.join("\n");
}

export const prefsDefault = {
  severityFloor: "low",
  autoToast: true,
  compactRows: false,
  deepAnalysis: true,
  guidedChecklistCollapsed: true,
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
    panelOrder: ["tx_bps", "rx_bps", "delivery_rate", "pacing_rate", "rtt", "rttvar", "rto", "sendQ", "recvQ", "cwnd", "ato", "skmem.r", "skmem.t", "skmem.d", "skmem.d_rate", "bytes_acked", "bytes_received", "segs_out", "segs_in", "backoff", "retrans"]
  }
};
