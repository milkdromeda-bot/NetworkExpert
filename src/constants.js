export const ANALYSIS_TAB_GUIDE = [
  { id: "quality", label: "quality", short: "Capture Quality Report for collection readiness, missing ss evidence, and safer next commands.", use: "Use first when conclusions feel weak or a capture may be incomplete.", shows: "Timestamp coverage, cadence, ss option coverage, parsed evidence, missing context, and recommended collection command.", next: "Fix missing evidence, collect again if needed, then continue with Diagnosis, Timeline, Sockets, and Charts." },
  { id: "diagnosis", label: "diagnosis", short: "Prioritized root-cause hypotheses from the current evidence.", use: "Start here after parsing a capture.", shows: "A concise ranking of likely problems, confidence, impact, and supporting signals.", next: "Open Advisor for the recommended checks, then verify the evidence in Sockets or Charts." },
  { id: "advisor", label: "advisor", short: "Actionable investigation paths and next best checks.", use: "Use when you need a practical path instead of raw metrics.", shows: "Grouped findings, mitigation ideas, and command-line evidence to confirm or reject a hypothesis.", next: "Follow the top finding, then jump to the relevant socket, chart, or conversation." },
  { id: "templates", label: "templates", short: "Ready-made investigation views for common TCP situations.", use: "Use when you recognize a pattern such as slow consumer, retransmission, or microburst.", shows: "Curated filters and chart presets that focus the analysis on one scenario.", next: "Apply the closest template, then inspect the reduced evidence set." },
  { id: "map", label: "map", short: "Logical topology of endpoints, flows, and service labels.", use: "Use when you need to understand who talks to whom.", shows: "Endpoint grouping, conversation links, and recording-scoped service classification.", next: "Click a link or endpoint to focus the related sockets and anomalies." },
  { id: "conversations", label: "conversations", short: "Aggregated client/server flows instead of individual socket rows.", use: "Use when many sockets belong to the same path or peer.", shows: "Total traffic, worst risk, endpoints, processes, and anomaly summaries per flow.", next: "Sort by risk, Send-Q, Recv-Q, RTT, or throughput to find the noisy path." },
  { id: "expert", label: "expert", short: "Advanced TCP correlations for low-level evidence review.", use: "Use after a hypothesis exists and you need stronger technical proof.", shows: "Metric pairings such as Send-Q vs RTO, cwnd vs pacing, and drops vs RX bursts.", next: "Look for synchronized movement across independent signals, not one isolated metric." },
  { id: "timeline", label: "timeline", short: "Chronological socket events and state changes.", use: "Use when timing matters or a socket changes state during the capture.", shows: "State transitions, anomaly timing, queue changes, and selected annotations.", next: "Zoom around the event and compare nearby charts." },
  { id: "alerts", label: "alerts", short: "Active rule-based warnings and threshold matches.", use: "Use when you want repeatable operational checks.", shows: "Configured alert rules, active matches, severity, and acknowledgement state.", next: "Tune thresholds only after confirming the signal is meaningful for your environment." },
  { id: "compare", label: "compare", short: "Before/after comparison against a saved baseline.", use: "Use when a known-good capture or previous state exists.", shows: "New, resolved, and changed risks between the baseline and current analysis.", next: "Set a baseline before a change window, then compare after the incident or deployment." },
  { id: "sockets", label: "sockets", short: "Detailed socket table with filters, sorting, and column intelligence.", use: "Use when you need exact per-socket evidence.", shows: "Raw and enriched socket fields, state transitions, process, queues, timers, memory, and endpoints.", next: "Filter tightly, then open row details or column intelligence for interpretation." },
  { id: "groups", label: "groups", short: "Aggregations by process, peer, service, state, or risk.", use: "Use when the problem is systemic rather than one socket.", shows: "Grouped counts, totals, worst risk, queues, drops, and throughput.", next: "Find the group with concentrated risk, then drill down to its sockets." },
  { id: "anomalies", label: "anomalies", short: "Only the detected symptoms, stripped of normal rows.", use: "Use when the capture is large and you want the problem list first.", shows: "Detected symptoms, severity, related socket, metric, and recommended context.", next: "Treat anomalies as clues, then verify them with timeline and chart evidence." },
  { id: "fields", label: "fields", short: "Dictionary of parsed ss fields and their meaning.", use: "Use when a column or ss metric is unfamiliar.", shows: "Field definitions, source, limitations, and parsing context.", next: "Use field definitions to avoid overinterpreting ambiguous Linux TCP internals." }
];

export const PRE_IMPORT_PRESETS = [
  { id: "tcp", label: "TCP", description: "Keep tcp and tcp6 sockets.", filters: { protocol: "tcp" } },
  { id: "udp", label: "UDP", description: "Keep udp and udp6 sockets.", filters: { protocol: "udp" } },
  { id: "estab", label: "Established", description: "Live established conversations only.", filters: { state: "ESTAB" } },
  { id: "listen", label: "Listening", description: "Service/listener inventory.", filters: { state: "LISTEN" } },
  { id: "web", label: "Web 80/443", description: "HTTP and TLS traffic on either side.", filters: { anyPort: "80,443" } },
  { id: "dns", label: "DNS 53", description: "Resolver traffic, TCP or UDP.", filters: { anyPort: "53" } },
  { id: "ssh", label: "SSH 22", description: "Remote administration traffic.", filters: { anyPort: "22" } },
  { id: "print", label: "Print 9100", description: "JetDirect/raw printing flows.", filters: { anyPort: "9100" } },
  { id: "db", label: "DB common", description: "PostgreSQL, MySQL, Redis, MongoDB.", filters: { anyPort: "5432,3306,6379,27017" } }
];

export const EXPERT_CORRELATIONS = [
  { id: "sendq-tx", x: "sendQ", y: "tx_bps", label: "1. Send-Q vs TX bandwidth", reason: "Best first check for a slow peer or congested path: Send-Q rising while TX bandwidth falls is a strong bottleneck pattern." },
  { id: "rto-rttvar", x: "rttvar", y: "rto", label: "2. RTT variance vs RTO", reason: "Reveals loss, jitter, delayed ACKs, or unstable recovery when timeout grows with latency variance." },
  { id: "cwnd-pacing", x: "cwnd", y: "pacing_rate", label: "3. cwnd vs pacing rate", reason: "Shows congestion-control limits: low cwnd and low pacing usually mean TCP is intentionally slowing the flow." },
  { id: "sendq-rto", x: "sendQ", y: "rto", label: "4. Send-Q vs RTO", reason: "Separates pure application burst from network recovery: queued data plus high RTO deserves priority." },
  { id: "recvq-rx", x: "recvQ", y: "rx_bps", label: "5. Recv-Q vs RX bandwidth", reason: "Highlights local slow-consumer behavior when receive throughput and unread local queue diverge." },
  { id: "skmemt-sendq", x: "sendQ", y: "skmem.t", label: "6. Send-Q vs transmit memory", reason: "Confirms whether queued outbound bytes are also applying kernel socket memory pressure." },
  { id: "skmemr-recvq", x: "recvQ", y: "skmem.r", label: "7. Recv-Q vs receive memory", reason: "Confirms local receive pressure and whether the process is draining data fast enough." },
  { id: "drops-rx", x: "rx_bps", y: "skmem.d", label: "8. RX bandwidth vs socket drops", reason: "Useful for burst-loss detection: drops during high receive bursts often point to buffer or memory pressure." },
  { id: "delivery-pacing", x: "pacing_rate", y: "delivery_rate", label: "9. Pacing vs delivery rate", reason: "Compares what TCP is allowed to send with what the path actually delivers." },
  { id: "backoff-rto", x: "backoff", y: "rto", label: "10. Backoff vs RTO", reason: "Prioritizes sockets in retransmission recovery where effective timeout can grow exponentially." },
  { id: "bytes-progress", x: "bytes_acked", y: "bytes_received", label: "11. Bytes acked vs received", reason: "Checks bidirectional progress and whether one side stalls while the other still advances." },
  { id: "segments-bytes", x: "segs_out", y: "bytes_acked", label: "12. Segments out vs bytes acked", reason: "Finds inefficient tiny-segment patterns or poor payload efficiency." }
];
