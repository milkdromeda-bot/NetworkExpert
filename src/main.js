import { FIELD_DOCS, SAMPLE, SS_OPTIONS, generateTenMinuteSample, prefsDefault } from "./data.js";
import { metricValue, parseTimestampLine } from "./parser.js";
import { analyzeAll, applyRisks } from "./analysis.js";
import { importSocketFile } from "./importer.js?v=20260425-2";
import { socketMatchesAdvancedQuery } from "./search.js";
import { defaultAlertRules, evaluateAlertRules as evaluateAlertRuleEvents, loadAlertAcks, loadAlertRules, saveAlertAcks as persistAlertAcks, saveAlertRules as persistAlertRules } from "./alerts.js";
import { ANALYSIS_TEMPLATES, DASHBOARD_PRESETS, applyAnalysisTemplate as applyTemplateProfile, applyDashboardPreset as applyDashboardPresetProfile, applyDashboardProfile as applySavedDashboardProfile, dashboardSnapshot as createDashboardSnapshot } from "./profiles.js";
import { buildComparison as buildBaselineComparison, createBaseline as createBaselineSnapshot } from "./compare.js";
import { ipIntelDetail, ipIntelSummary, publicPeerIps } from "./ip-intel.js";
import { aggregateParsedSocketsByKey, aggregateTimestampedSockets, parsedTimestampSnapshots as parseTimestampedSnapshots, socketKey, timestampBlocks as splitTimestampBlocks, withStableSocketIds } from "./timeline.js";
import { applyContextAction, setActiveInvestigation } from "./navigation.js";
import { aliasDisplay, aliasForEndpoint, deleteEndpointAlias, normalizeAliasStore, upsertEndpointAlias } from "./aliases.js";
import { deleteTopologyGroup, endpointHost, normalizeTopologyProfile, topologyGroupForEndpoint, topologyScopeKey, upsertTopologyGroup } from "./topology.js";

const TABLE_COLUMNS = [
  { key: "risk", label: "Risk", value: s => riskRank(s.risk), render: s => `<span class="risk ${s.risk}">${s.risk}</span>` },
  { key: "state", label: "State", value: s => s.state, render: s => `<span class="badge ${s.state === "LISTEN" ? "listen" : ""}">${escapeHtml(s.state)}</span>` },
  { key: "family", label: "Proto", value: s => s.family, render: s => `<span class="badge ${s.family.includes("udp") ? "udp" : "tcp"}">${escapeHtml(s.family)}</span>` },
  { key: "recvQ", label: "Recv-Q", value: s => s.recvQ, render: s => renderTableMetricCell("recvQ", s.recvQ) },
  { key: "sendQ", label: "Send-Q", value: s => s.sendQ, render: s => renderTableMetricCell("sendQ", s.sendQ) },
  { key: "tx_bps", label: "TX bps", value: s => socketBandwidth(s, "tx_bps"), render: s => renderTableMetricCell("tx_bps", socketBandwidth(s, "tx_bps")), defaultVisible: false },
  { key: "rx_bps", label: "RX bps", value: s => socketBandwidth(s, "rx_bps"), render: s => renderTableMetricCell("rx_bps", socketBandwidth(s, "rx_bps")), defaultVisible: false },
  { key: "local", label: "Local", value: s => s.local, render: s => renderEndpointCell(s.local) },
  { key: "peer", label: "Peer", value: s => s.peer, render: s => renderPeerCell(s) },
  { key: "process", label: "Process", value: s => s.details.process ? `${s.details.process.name}:${s.details.process.pid}` : "", render: s => escapeHtml(s.details.process ? `${s.details.process.name}:${s.details.process.pid}` : "-") },
  { key: "rtt", label: "RTT", value: s => metricValue(s, "rtt"), render: s => renderTableMetricCell("rtt", metricValue(s, "rtt")) },
  { key: "rto", label: "RTO", value: s => metricValue(s, "rto"), render: s => renderTableMetricCell("rto", metricValue(s, "rto")) },
  { key: "cwnd", label: "cwnd", value: s => metricValue(s, "cwnd"), render: s => renderTableMetricCell("cwnd", metricValue(s, "cwnd")) },
  { key: "ato", label: "ato", value: s => metricValue(s, "ato"), render: s => renderTableMetricCell("ato", metricValue(s, "ato")) },
  { key: "skmem.r", label: "skmem.r", value: s => metricValue(s, "skmem.r"), render: s => renderTableMetricCell("skmem.r", metricValue(s, "skmem.r")) },
  { key: "skmem.t", label: "skmem.t", value: s => metricValue(s, "skmem.t"), render: s => renderTableMetricCell("skmem.t", metricValue(s, "skmem.t")) },
  { key: "skmem.d", label: "drops", value: s => metricValue(s, "skmem.d"), render: s => renderTableMetricCell("skmem.d", metricValue(s, "skmem.d")) },
  { key: "rttvar", label: "RTT var", value: s => metricValue(s, "rttvar"), render: s => renderTableMetricCell("rttvar", metricValue(s, "rttvar")), defaultVisible: false },
  { key: "bytes_acked", label: "Bytes acked", value: s => metricValue(s, "bytes_acked"), render: s => renderTableMetricCell("bytes_acked", metricValue(s, "bytes_acked")), defaultVisible: false },
  { key: "bytes_received", label: "Bytes received", value: s => metricValue(s, "bytes_received"), render: s => renderTableMetricCell("bytes_received", metricValue(s, "bytes_received")), defaultVisible: false },
  { key: "segs_out", label: "Segs out", value: s => metricValue(s, "segs_out"), render: s => renderTableMetricCell("segs_out", metricValue(s, "segs_out")), defaultVisible: false },
  { key: "segs_in", label: "Segs in", value: s => metricValue(s, "segs_in"), render: s => renderTableMetricCell("segs_in", metricValue(s, "segs_in")), defaultVisible: false },
  { key: "pacing_rate", label: "Pacing rate", value: s => metricValue(s, "pacing_rate"), render: s => renderTableMetricCell("pacing_rate", metricValue(s, "pacing_rate")), defaultVisible: false },
  { key: "delivery_rate", label: "Delivery rate", value: s => metricValue(s, "delivery_rate"), render: s => renderTableMetricCell("delivery_rate", metricValue(s, "delivery_rate")), defaultVisible: false },
  { key: "backoff", label: "Backoff", value: s => metricValue(s, "backoff"), render: s => renderTableMetricCell("backoff", metricValue(s, "backoff")), defaultVisible: false },
  { key: "retrans", label: "Retrans timer", value: s => s.details.timer?.retrans || 0, render: s => renderTableMetricCell("retrans", s.details.timer?.retrans || 0), defaultVisible: false }
];

function defaultTableColumns() {
  return TABLE_COLUMNS.filter(col => col.defaultVisible !== false).map(col => col.key);
}

const EXPERT_DEFAULT_THRESHOLDS = {
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

const COLUMN_HELP = {
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
    detail: "In ss skmem, d is the drop counter. Any non-zero value deserves attention because it means the socket path has dropped data due to buffer or memory pressure. Repeated growth is a much stronger incident signal than a static historical value.",
    use: "Chart drops over time, then compare with Recv-Q, skmem.r, system memory pressure, and burst timing."
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

const COMMON_TIME_ZONES = [
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

const LINUX_PROFILES = {
  native: {
    label: "Linux Ubuntu native",
    note: "Commands run directly on the Ubuntu host. ss, ip route, tc, ethtool, nstat, pidstat, and sysctl can observe the host network namespace when executed with sufficient privileges."
  },
  lxc: {
    label: "Linux Container LXC/LXD",
    note: "Default. ss inside a container observes the container network namespace, not the host. Analysts usually run commands from inside the container; ops/root can collect host interface, qdisc, ethtool, route, and LXD evidence."
  }
};

const UBUNTU_PROFILES = {
  "22.04": "Ubuntu 22.04 LTS",
  "24.04": "Ubuntu 24.04 LTS",
  "26.04": "Ubuntu 26.04 LTS / next LTS"
};

const ACCESS_ROLES = {
  analyst: {
    label: "Analyst inside container, no root",
    note: "Default. Commands are meant to be run from inside the LXC/LXD container with non-root privileges. Host/LXD evidence is shown as an ops handoff request, not as a command you are expected to run."
  },
  opsRoot: {
    label: "Ops/root with host or sudo access",
    note: "Commands may include lxc exec, host interface counters, qdisc, ethtool, sysctl, lsof, or other privileged evidence."
  }
};

function cloneThresholds() {
  return Object.fromEntries(Object.entries(EXPERT_DEFAULT_THRESHOLDS).map(([metric, threshold]) => [metric, { ...threshold }]));
}

let state = {
  raw: SAMPLE,
  command: "ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all",
  sourceName: "built-in sample",
  sockets: [],
  selectedId: null,
  activeContextId: null,
  activeContextReason: "",
  anomalies: [],
  alertEvents: [],
  importStatus: null,
  pendingFile: null,
  analysisDirty: true,
  dataVersion: 0,
  rawVersion: 0,
  chartRenderToken: 0,
  advisorFindings: [],
  bandwidthIndex: {},
  anomalyAlertSince: null,
  lastAnomalyCount: 0,
  preImportFilters: { enabled: false, protocol: "", state: "", srcIp: "", dstIp: "", anyPort: "", srcPort: "", dstPort: "" },
  filterHistory: loadFilterHistory(),
  tableProfiles: loadTableProfiles(),
  dashboardProfiles: loadDashboardProfiles(),
  serviceAliases: loadServiceAliases(),
  aliasEditKey: "",
  topologyProfiles: loadTopologyProfiles(),
  topology: loadTopologyForSource("built-in sample"),
  topologyEditId: "",
  topologyDraftMatch: "",
  alertRules: loadAlertRules(),
  alertAcks: loadAlertAcks(),
  baseline: null,
  ipIntel: {},
  ipIntelRunning: false,
  prefs: loadPrefs(),
  view: "ingest",
  activeTab: "sockets",
  anomalyFilters: { severity: "all", metric: "all", text: "", sort: "priority" },
  prefsTab: "display",
  drawer: null,
  modal: null,
  statsMetric: null,
  helpColumn: null,
  openMenuPos: null,
  openConversationInsightKey: null,
  openConversationInsightPos: null,
  history: [],
  chartMetrics: ["tx_bps", "rx_bps", "rtt", "rto", "sendQ", "skmem.d"],
  correlation: { x: "rtt", y: "sendQ" },
  chartZoom: { start: 0, end: 1 },
  cache: {
    timestampRawVersion: -1,
    timestampBlocks: [],
    snapshotRawVersion: -1,
    timestampSnapshots: [],
    filteredKey: "",
    filteredRows: null,
    optionKey: "",
    optionSets: null,
    visibleHistoryKey: "",
    visibleHistoryRows: null
  },
  thresholds: cloneThresholds(),
  table: {
    page: 1,
    pageSize: prefsDefault.defaultPageSize,
    sortKey: "risk",
    sortDir: "desc",
    pinned: ["risk", "state", "local"],
    visible: defaultTableColumns(),
    order: TABLE_COLUMNS.map(c => c.key),
    filters: {
      text: "",
      risk: "all",
      state: "all",
      family: "all",
      minRecvQ: "",
      minSendQ: "",
      minRtt: "",
      srcIp: "",
      dstIp: "",
      srcPort: "",
      dstPort: "",
      process: "",
      onlyAnomalies: false
    }
  }
};

const icons = {
  activity: `<i class="ri-pulse-line"></i>`,
  settings: `<i class="ri-equalizer-3-line"></i>`,
  book: `<i class="ri-book-open-line"></i>`,
  upload: `<i class="ri-folder-open-line"></i>`,
  sample: `<i class="ri-flask-line"></i>`,
  play: `<i class="ri-radar-line"></i>`,
  alert: `<i class="ri-error-warning-line"></i>`,
  chart: `<i class="ri-line-chart-line"></i>`,
  x: `<i class="ri-close-line"></i>`,
  zoomIn: `<i class="ri-zoom-in-line"></i>`,
  zoomOut: `<i class="ri-zoom-out-line"></i>`,
  panLeft: `<i class="ri-arrow-left-right-line"></i>`,
  arrowLeft: `<i class="ri-arrow-left-line"></i>`,
  arrowRight: `<i class="ri-arrow-right-line"></i>`,
  reset: `<i class="ri-loop-left-line"></i>`,
  save: `<i class="ri-image-line"></i>`,
  threshold: `<i class="ri-speed-up-fill"></i>`,
  layout: `<i class="ri-dashboard-3-line"></i>`,
  stats: `<i class="ri-bar-chart-box-line"></i>`,
  incidentCloud: `<span class="incident-cloud-icon" aria-hidden="true"><svg viewBox="0 0 32 32" focusable="false"><path class="incident-triangle" d="M16 3.5 29 26.5H3L16 3.5Z"/><path class="incident-cloud" d="M11.2 20.8h8.7a3.4 3.4 0 0 0 .6-6.8 5.3 5.3 0 0 0-10.1-1.5 4.2 4.2 0 0 0 .8 8.3Zm1.5-3.3 2.2-2.2h-1.8l3.6-3.6-.9 2.8h2.1l-5.2 3Z"/></svg></span>`,
  pin: `<i class="ri-pushpin-2-line"></i>`,
  unpin: `<i class="ri-pushpin-2-fill"></i>`,
  hide: `<i class="ri-eye-off-line"></i>`,
  drag: `<i class="ri-draggable"></i>`,
  trash: `<i class="ri-delete-bin-6-line"></i>`,
  clear: `<i class="ri-eraser-line"></i>`,
  brain: `<i class="ri-brain-line"></i>`,
  columns: `<i class="ri-table-line"></i>`,
  copy: `<i class="ri-file-copy-line"></i>`,
  focus: `<i class="ri-focus-3-line"></i>`,
  saveDisk: `<i class="ri-save-3-line"></i>`,
  first: `<i class="ri-skip-left-line"></i>`,
  previous: `<i class="ri-arrow-left-s-line"></i>`,
  next: `<i class="ri-arrow-right-s-line"></i>`,
  last: `<i class="ri-skip-right-line"></i>`,
  up: `<i class="ri-arrow-up-s-line"></i>`,
  down: `<i class="ri-arrow-down-s-line"></i>`
};

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem("networkExpertPrefs") || "{}");
    const prefs = { ...prefsDefault, ...saved, chartLayout: { ...prefsDefault.chartLayout, ...(saved.chartLayout || {}) } };
    prefs.chartLayout.columns = clampChartColumns(prefs.chartLayout.columns);
    if (saved.sampling == null || (saved.sampling === 5 && saved.chartResolutionDefault !== "max")) prefs.sampling = 1;
    prefs.chartResolutionDefault = "max";
    return prefs;
  } catch {
    return { ...prefsDefault };
  }
}

function savePrefs() {
  state.prefs.chartLayout.columns = clampChartColumns(state.prefs.chartLayout.columns);
  localStorage.setItem("networkExpertPrefs", JSON.stringify(state.prefs));
}

function loadFilterHistory() {
  try {
    return JSON.parse(localStorage.getItem("networkExpertFilterHistory") || "[]");
  } catch {
    return [];
  }
}

function saveFilterHistory() {
  localStorage.setItem("networkExpertFilterHistory", JSON.stringify(state.filterHistory.slice(0, 40)));
}

function loadTableProfiles() {
  try {
    return JSON.parse(localStorage.getItem("networkExpertTableProfiles") || "[]");
  } catch {
    return [];
  }
}

function saveTableProfiles() {
  localStorage.setItem("networkExpertTableProfiles", JSON.stringify(state.tableProfiles.slice(0, 30)));
}

function loadDashboardProfiles() {
  try {
    return JSON.parse(localStorage.getItem("networkExpertDashboardProfiles") || "[]");
  } catch {
    return [];
  }
}

function saveDashboardProfiles() {
  localStorage.setItem("networkExpertDashboardProfiles", JSON.stringify(state.dashboardProfiles.slice(0, 24)));
}

function loadServiceAliases() {
  try {
    return normalizeAliasStore(JSON.parse(localStorage.getItem("networkExpertServiceAliases") || "{}"));
  } catch {
    return {};
  }
}

function saveServiceAliases() {
  localStorage.setItem("networkExpertServiceAliases", JSON.stringify(normalizeAliasStore(state.serviceAliases)));
}

function loadTopologyProfiles() {
  try {
    const saved = JSON.parse(localStorage.getItem("networkExpertTopologyProfiles") || "{}");
    return Object.fromEntries(Object.entries(saved).map(([scope, profile]) => [scope, normalizeTopologyProfile(profile)]));
  } catch {
    return {};
  }
}

function loadTopologyForSource(sourceName) {
  return normalizeTopologyProfile(loadTopologyProfiles()[topologyScopeKey(sourceName)]);
}

function setSourceName(sourceName) {
  state.sourceName = sourceName;
  state.topology = normalizeTopologyProfile(state.topologyProfiles[topologyScopeKey(sourceName)]);
  state.topologyEditId = "";
  state.topologyDraftMatch = "";
}

function saveCurrentTopology() {
  const scope = topologyScopeKey(state.sourceName);
  state.topology = normalizeTopologyProfile(state.topology);
  state.topologyProfiles = { ...state.topologyProfiles, [scope]: state.topology };
  localStorage.setItem("networkExpertTopologyProfiles", JSON.stringify(state.topologyProfiles));
}

function saveAlertRules() {
  persistAlertRules(state.alertRules);
}

function saveAlertAcks() {
  persistAlertAcks(state.alertAcks);
}

function tokenizeCommand(command) {
  const tokens = command.match(/(?:[^\s'"]+|'[^']*'|"[^"]*")+/g) || [];
  const parsed = [];
  for (const token of tokens.slice(tokens[0] === "ss" ? 1 : 0)) {
    const clean = token.replace(/^['"]|['"]$/g, "");
    if (/^-[A-Za-z0-9]{2,}$/.test(clean) && !clean.startsWith("--")) {
      for (const flag of clean.slice(1)) parsed.push(`-${flag}`);
    } else {
      parsed.push(clean);
    }
  }
  return parsed;
}

function commandCoverage(command) {
  const tokens = new Set(tokenizeCommand(command).map(t => t.split("=")[0]));
  return SS_OPTIONS.map(([short, long, desc, group]) => ({
    short, long, desc, group,
    active: Boolean((short && tokens.has(short)) || (long && tokens.has(long)))
  }));
}

function resetDerivedCaches({ raw = false } = {}) {
  state.dataVersion += 1;
  state.cache.filteredKey = "";
  state.cache.filteredRows = null;
  state.cache.optionKey = "";
  state.cache.optionSets = null;
  state.cache.visibleHistoryKey = "";
  state.cache.visibleHistoryRows = null;
  if (raw) {
    state.rawVersion += 1;
    state.cache.timestampRawVersion = -1;
    state.cache.timestampBlocks = [];
    state.cache.snapshotRawVersion = -1;
    state.cache.timestampSnapshots = [];
  }
}

function markAnalysisDirty({ raw = false } = {}) {
  state.analysisDirty = true;
  resetDerivedCaches({ raw });
}

function recompute() {
  state.sockets = applyRisks(parseAnalysisSockets());
  state.bandwidthIndex = buildSocketBandwidthIndex();
  state.anomalies = analyzeAll(state.sockets);
  state.selectedId = state.sockets.some(socket => socket.id === state.selectedId) ? state.selectedId : state.sockets[0]?.id || null;
  if (!state.sockets.some(socket => socket.id === state.activeContextId)) setActiveInvestigation(state, null);
  setZoom(0, 1);
  buildHistory();
  addCollectionAnomalies();
  runAdvisorAnalysis();
  evaluateAlertRules();
  state.analysisDirty = false;
  resetDerivedCaches();
}

function parseAnalysisSockets() {
  return aggregateTimestampedSockets(state.raw);
}

function recomputeFromSockets() {
  state.sockets = withStableSocketIds(state.sockets);
  state.bandwidthIndex = buildSocketBandwidthIndex();
  state.anomalies = analyzeAll(state.sockets);
  state.selectedId = state.sockets.some(socket => socket.id === state.selectedId) ? state.selectedId : state.sockets[0]?.id || null;
  if (!state.sockets.some(socket => socket.id === state.activeContextId)) setActiveInvestigation(state, null);
  setZoom(0, 1);
  buildHistory();
  addCollectionAnomalies();
  runAdvisorAnalysis();
  evaluateAlertRules();
  state.analysisDirty = false;
  resetDerivedCaches();
}

function scheduleIpIntelEnrichment() {
  if (state.ipIntelRunning || !state.sockets.length) return;
  const pending = publicPeerIps(state.sockets)
    .filter(ip => !state.ipIntel[ip] || state.ipIntel[ip].status === "error")
    .slice(0, 12);
  if (!pending.length) return;
  state.ipIntelRunning = true;
  pending.forEach(ip => { state.ipIntel[ip] = { status: "loading" }; });
  enrichIpIntelQueue(pending).finally(() => {
    state.ipIntelRunning = false;
    render();
  });
}

async function enrichIpIntelQueue(ips) {
  for (const ip of ips) {
    try {
      const response = await fetch(`/api/ip-intel?ip=${encodeURIComponent(ip)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.ipIntel[ip] = { status: "done", data: await response.json() };
    } catch (error) {
      state.ipIntel[ip] = { status: "error", error: error.message };
    }
  }
}

function buildHistory() {
  const realHistory = buildHistoryFromTimestampedSnapshots();
  if (realHistory.length >= 1) {
    state.history = realHistory;
    return;
  }
  const metrics = chartMetricList();
  const base = state.sockets.find(s => s.id === state.selectedId) || state.sockets[0];
  const syntheticStart = Date.now();
  state.history = Array.from({ length: state.prefs.graphWindow }, (_, i) => {
    const wobble = Math.sin(i / 2.7) * 0.16 + Math.cos(i / 4.3) * 0.09;
    const row = { t: i * state.prefs.sampling, epochMs: syntheticStart + i * state.prefs.sampling * 1000 };
    for (const metric of metrics) row[metric] = Math.max(0, metricValue(base, metric) * (1 + wobble + (i % 7 === 0 ? 0.18 : 0)));
    row.tx_bps = metricValue(base, "delivery_rate") || metricValue(base, "pacing_rate") || 0;
    row.rx_bps = 0;
    return row;
  });
}

function chartMetricList() {
  return ["tx_bps", "rx_bps", "delivery_rate", "pacing_rate", "rtt", "rttvar", "rto", "sendQ", "recvQ", "cwnd", "ato", "skmem.r", "skmem.t", "skmem.d", "skmem.d_rate", "bytes_acked", "bytes_received", "segs_out", "segs_in", "backoff", "retrans"];
}

const PRE_IMPORT_PRESETS = [
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

function alphabeticalMetrics(metrics = chartMetricList()) {
  return [...metrics].sort((a, b) => metricLabel(a).localeCompare(metricLabel(b), undefined, { sensitivity: "base" }));
}

function clampChartColumns(columns) {
  return Math.min(3, Math.max(1, Number(columns) || 2));
}

const EXPERT_CORRELATIONS = [
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

function buildHistoryFromTimestampedSnapshots() {
  const snapshots = parsedTimestampSnapshots();
  if (!snapshots.length) return [];
  const selected = state.sockets.find(s => s.id === state.selectedId) || state.sockets[0];
  if (!selected) return [];
  const key = socketKey(selected);
  const start = snapshots[0].epochMs;
  const rows = snapshots.map(block => {
    const exact = block.sockets.find(s => socketKey(s) === key) || block.sockets.find(s => s.local === selected.local || s.peer === selected.peer);
    return {
      t: Math.max(0, Math.round((block.epochMs - start) / 1000)),
      epochMs: block.epochMs,
      socketPresent: Boolean(exact),
      rtt: metricValue(exact, "rtt"),
      rttvar: metricValue(exact, "rttvar"),
      rto: metricValue(exact, "rto"),
      sendQ: metricValue(exact, "sendQ"),
      recvQ: metricValue(exact, "recvQ"),
      cwnd: metricValue(exact, "cwnd"),
      ato: metricValue(exact, "ato"),
      "skmem.r": metricValue(exact, "skmem.r"),
      "skmem.t": metricValue(exact, "skmem.t"),
      "skmem.d": metricValue(exact, "skmem.d"),
      pacing_rate: metricValue(exact, "pacing_rate"),
      delivery_rate: metricValue(exact, "delivery_rate"),
      bytes_acked: metricValue(exact, "bytes_acked"),
      bytes_received: metricValue(exact, "bytes_received"),
      segs_out: metricValue(exact, "segs_out"),
      segs_in: metricValue(exact, "segs_in"),
      backoff: metricValue(exact, "backoff"),
      retrans: exact?.details.timer?.retrans || 0
    };
  }).filter(row => Object.values(row).some(value => value > 0));
  return addBandwidthDerivatives(rows);
}

function timestampBlocks() {
  if (state.cache.timestampRawVersion === state.rawVersion) return state.cache.timestampBlocks;
  const blocks = splitTimestampBlocks(state.raw);
  state.cache.timestampRawVersion = state.rawVersion;
  state.cache.timestampBlocks = blocks;
  return blocks;
}

function parsedTimestampSnapshots() {
  if (state.cache.snapshotRawVersion === state.rawVersion) return state.cache.timestampSnapshots;
  const snapshots = parseTimestampedSnapshots(state.raw);
  state.cache.snapshotRawVersion = state.rawVersion;
  state.cache.timestampSnapshots = snapshots;
  return snapshots;
}

function buildSocketBandwidthIndex() {
  const samples = {};
  for (const block of parsedTimestampSnapshots()) {
    for (const socket of block.sockets) {
      const key = socketKey(socket);
      const current = {
        epochMs: block.epochMs,
        bytes_acked: metricValue(socket, "bytes_acked"),
        bytes_received: metricValue(socket, "bytes_received"),
        delivery_rate: metricValue(socket, "delivery_rate"),
        pacing_rate: metricValue(socket, "pacing_rate")
      };
      samples[key] = samples[key] ? [samples[key][1], current] : [null, current];
    }
  }
  return Object.fromEntries(Object.entries(samples).map(([key, [prev, current]]) => {
    const elapsed = prev ? Math.max(0.001, (current.epochMs - prev.epochMs) / 1000) : 0;
    const txBytes = prev ? Math.max(0, current.bytes_acked - prev.bytes_acked) : 0;
    const rxBytes = prev ? Math.max(0, current.bytes_received - prev.bytes_received) : 0;
    return [key, {
      tx_bps: elapsed ? (txBytes * 8) / elapsed : (current.delivery_rate || current.pacing_rate || 0),
      rx_bps: elapsed ? (rxBytes * 8) / elapsed : 0,
      delivery_rate: current.delivery_rate,
      pacing_rate: current.pacing_rate
    }];
  }));
}

function socketBandwidth(socket, metric) {
  if (!socket) return 0;
  const indexed = state.bandwidthIndex?.[socketKey(socket)];
  if (indexed?.[metric] != null) return indexed[metric];
  if (metric === "tx_bps") return metricValue(socket, "delivery_rate") || metricValue(socket, "pacing_rate") || 0;
  return 0;
}

function addBandwidthDerivatives(rows) {
  return rows.map((row, index) => {
    const prev = rows[index - 1];
    const elapsed = prev ? Math.max(0.001, (row.epochMs - prev.epochMs) / 1000) : 0;
    const txBytes = prev ? Math.max(0, (row.bytes_acked || 0) - (prev.bytes_acked || 0)) : 0;
    const rxBytes = prev ? Math.max(0, (row.bytes_received || 0) - (prev.bytes_received || 0)) : 0;
    const sameObservedSocket = prev && row.socketPresent !== false && prev.socketPresent !== false;
    const dropDelta = sameObservedSocket ? Math.max(0, (row["skmem.d"] || 0) - (prev["skmem.d"] || 0)) : 0;
    return {
      ...row,
      tx_bps: elapsed ? (txBytes * 8) / elapsed : 0,
      rx_bps: elapsed ? (rxBytes * 8) / elapsed : 0,
      "skmem.d_rate": elapsed ? dropDelta / elapsed : 0
    };
  });
}

function hasTimestampedRawData() {
  return timestampBlocks().length >= 2;
}

function dropRateSummary(rows = state.history) {
  if (!hasTimestampedRawData() || rows.length < 2) return null;
  let totalDropDelta = 0;
  let peakDropRate = 0;
  let intervals = 0;
  let firstGrowth = null;
  let lastGrowth = null;
  for (let i = 1; i < rows.length; i += 1) {
    const prev = rows[i - 1];
    const row = rows[i];
    if (row.socketPresent === false || prev.socketPresent === false) continue;
    const elapsed = Math.max(0.001, ((row.epochMs || 0) - (prev.epochMs || 0)) / 1000);
    if (!Number.isFinite(elapsed) || elapsed <= 0) continue;
    const dropDelta = Math.max(0, Number(row["skmem.d"] || 0) - Number(prev["skmem.d"] || 0));
    if (!dropDelta) continue;
    const rate = dropDelta / elapsed;
    totalDropDelta += dropDelta;
    peakDropRate = Math.max(peakDropRate, rate);
    intervals += 1;
    firstGrowth ??= prev.epochMs;
    lastGrowth = row.epochMs;
  }
  if (!totalDropDelta) return null;
  const observedSeconds = Math.max(0.001, ((rows[rows.length - 1].epochMs || 0) - (rows[0].epochMs || 0)) / 1000);
  const avgDropRate = totalDropDelta / observedSeconds;
  return {
    totalDropDelta,
    observedSeconds,
    avgDropRate,
    peakDropRate,
    cadenceSeconds: avgDropRate ? 1 / avgDropRate : Number.POSITIVE_INFINITY,
    intervals,
    firstGrowth,
    lastGrowth
  };
}

function dropRateSeverity(summary) {
  if (!summary) return "low";
  if (summary.avgDropRate >= 1 || summary.peakDropRate >= 5 || summary.totalDropDelta >= 100) return "critical";
  if (summary.avgDropRate >= 0.1 || summary.peakDropRate >= 1 || summary.totalDropDelta >= 10) return "high";
  return "medium";
}

function formatDurationCompact(seconds) {
  const value = Number(seconds || 0);
  if (!Number.isFinite(value)) return "unknown duration";
  if (value < 1) return `${formatNumber(value * 1000)} ms`;
  if (value < 60) return `${formatNumber(value)} s`;
  if (value < 3600) return `${formatNumber(value / 60)} min`;
  return `${formatNumber(value / 3600)} h`;
}

function formatDropCadence(summary) {
  if (!summary?.avgDropRate) return "no increasing drop cadence";
  return `1 drop every ${formatDurationCompact(summary.cadenceSeconds)}`;
}

function addCollectionAnomalies() {
  const hasTimestamp = hasTimestampedRawData();
  const huge = state.sockets.length >= 5000;
  const dropRate = dropRateSummary();
  if (!hasTimestamp && state.raw.trim()) {
    state.anomalies.push({
      socketId: state.selectedId,
      severity: "low",
      title: "Collection has no timestamp",
      detail: "Add date --iso-8601=ns or EPOCH_MS before each snapshot to build a real timeline.",
      metric: "collection"
    });
  }
  if (dropRate) {
    state.anomalies.unshift({
      socketId: state.selectedId,
      severity: dropRateSeverity(dropRate),
      title: "Socket drops are increasing",
      detail: `skmem.d increased by ${formatMetricValue("skmem.d", dropRate.totalDropDelta)} over ${formatDurationCompact(dropRate.observedSeconds)} (${formatDropCadence(dropRate)}, peak ${formatMetricValue("skmem.d_rate", dropRate.peakDropRate)}).`,
      metric: "skmem.d_rate"
    });
  }
  if (huge) {
    state.anomalies.unshift({
      socketId: state.selectedId,
      severity: "medium",
      title: "Very high socket volume",
      detail: `${state.sockets.length} sockets parsed: avoid overly aggressive collection frequency, especially with -p, -e, -m, -i, --bpf, or DNS resolution.`,
      metric: "overhead"
    });
  }
}

function runAdvisorAnalysis() {
  state.advisorFindings = state.prefs.deepAnalysis ? buildAdvisorFindings() : [];
}

function socketsWhere(predicate) {
  return state.sockets.filter(socket => {
    try {
      return predicate(socket);
    } catch {
      return false;
    }
  });
}

function endpointSamples(sockets, side = "peer", limit = 4) {
  const values = sockets.map(socket => side === "peer" ? socket.peer : socket.local).filter(Boolean);
  return [...new Set(values)].slice(0, limit);
}

function processSamples(sockets, limit = 4) {
  return [...new Set(sockets.map(socket => socket.details.process ? `${socket.details.process.name}:${socket.details.process.pid}` : "").filter(Boolean))].slice(0, limit);
}

function emptyPreImportFilters() {
  return { enabled: false, protocol: "", state: "", srcIp: "", dstIp: "", anyPort: "", srcPort: "", dstPort: "" };
}

function normalizePreImportFilters(filters = state.preImportFilters) {
  return { ...emptyPreImportFilters(), ...filters };
}

function hasPreImportFilterValue(filters) {
  const f = normalizePreImportFilters(filters);
  return [f.protocol, f.state, f.srcIp, f.dstIp, f.anyPort, f.srcPort, f.dstPort].some(Boolean);
}

function isLxcProfile() {
  return state.prefs.linuxProfile !== "native";
}

function linuxProfileLabel() {
  return LINUX_PROFILES[state.prefs.linuxProfile]?.label || LINUX_PROFILES.lxc.label;
}

function ubuntuProfileLabel() {
  return UBUNTU_PROFILES[state.prefs.ubuntuVersion] || UBUNTU_PROFILES["22.04"];
}

function isAnalystRole() {
  return state.prefs.accessRole !== "opsRoot";
}

function accessRoleLabel() {
  return ACCESS_ROLES[state.prefs.accessRole]?.label || ACCESS_ROLES.analyst.label;
}

function lxcCommand(command) {
  return `lxc exec <container> -- ${command}`;
}

function envCommand(command, { host = false } = {}) {
  if (isAnalystRole()) {
    return host ? `# Request from ops/root on the LXD host:\n${command}` : command;
  }
  if (!isLxcProfile()) return command;
  return host ? `# Run on the LXD host\n${command}` : lxcCommand(command);
}

function commandForPeer(socket) {
  const host = socket?.peerAddress?.host;
  const command = host && !["*", "0.0.0.0", "::"].includes(host) ? `ip route get ${host}` : "ip route get <peer-ip>";
  return envCommand(command, { host: isLxcProfile() && !isAnalystRole() });
}

function makeFinding({ id, severity, title, pattern, sockets, confidence, why, next, mitigate, commands }) {
  const rank = { critical: 4, high: 3, medium: 2, low: 1 };
  const topSocket = sockets[0] || state.sockets[0];
  return {
    id,
    severity,
    score: (rank[severity] || 1) * 100 + Math.min(99, sockets.length),
    title,
    pattern,
    count: sockets.length,
    confidence,
    why,
    next,
    mitigate,
    commands,
    socketId: topSocket?.id || null,
    local: endpointSamples(sockets, "local"),
    peer: endpointSamples(sockets, "peer"),
    processes: processSamples(sockets)
  };
}

function buildAdvisorFindings() {
  if (!state.sockets.length) return [];
  const findings = [];
  const selected = state.sockets.find(socket => socket.id === state.selectedId) || state.sockets[0];
  const highSend = socketsWhere(socket => socket.sendQ > thresholdFor("sendQ").warn);
  const highRecv = socketsWhere(socket => socket.recvQ > thresholdFor("recvQ").warn);
  const txPressure = socketsWhere(socket => socket.details.skmem.tb && ((socket.details.skmem.t || 0) + (socket.details.skmem.w || 0)) / socket.details.skmem.tb > 0.75);
  const rxPressure = socketsWhere(socket => socket.details.skmem.rb && (socket.details.skmem.r || 0) / socket.details.skmem.rb > 0.75);
  const drops = socketsWhere(socket => metricValue(socket, "skmem.d") > 0);
  const dropRate = dropRateSummary();
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
    findings.push(makeFinding({
      id: "socket-drops",
      severity: drops.some(socket => metricValue(socket, "skmem.d") >= thresholdFor("skmem.d").danger) ? "critical" : "high",
      title: "Socket memory drops detected",
      pattern: "skmem.d is non-zero, which means packets/data were dropped at socket memory level.",
      sockets: drops,
      confidence: "High",
      why: "Drops are not just latency: they are loss. The important question is whether the counter is static historical noise or increasing over time. If it grows with Recv-Q/skmem.r, the receiver path is overloaded.",
      next: ["Chart skmem.d over time", "Correlate with Recv-Q and skmem.r", "Check NIC and softnet drops"],
      mitigate: ["Reduce burst rate or add backpressure", "Fix CPU/softirq pressure", "Increase buffers only with memory guardrails", "Investigate packet drops before blaming the application protocol"],
      commands: [envCommand("ss -tinpm"), envCommand("ip -s link show", { host: true }), envCommand("nstat -az | egrep 'Rcv|Drop|Prune|Collapse|Listen'", { host: true }), envCommand("cat /proc/net/softnet_stat", { host: true }), envCommand("sysctl net.core.rmem_max net.ipv4.tcp_rmem")]
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
      mitigate: ["If cadence is bursty, reduce producer burst size or add backpressure", "If cadence is steady, investigate CPU/softirq and receive buffer pressure", "Validate host NIC/qdisc/softnet drops before tuning socket buffers"],
      commands: [envCommand("ss -tinpm"), envCommand("watch -n 1 'ss -tinpm | grep -A1 skmem'"), envCommand("ip -s link show", { host: true }), envCommand("cat /proc/net/softnet_stat", { host: true }), envCommand("nstat -az | egrep 'Rcv|Drop|Prune|Collapse|Listen'", { host: true })]
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

function severityVisible(sev) {
  const rank = { critical: 4, high: 3, medium: 2, low: 1 };
  return rank[sev] >= rank[state.prefs.severityFloor];
}

function riskRank(risk) {
  return { low: 1, medium: 2, high: 3, critical: 4 }[risk] || 0;
}

function severityRank(severity) {
  return { low: 1, medium: 2, high: 3, critical: 4 }[severity] || 0;
}

function getColumn(key) {
  return TABLE_COLUMNS.find(col => col.key === key) || TABLE_COLUMNS[0];
}

function visibleColumns() {
  const ordered = state.table.order.filter(key => state.table.visible.includes(key));
  const pinned = ordered.filter(key => state.table.pinned.includes(key));
  return [...pinned, ...ordered.filter(key => !pinned.includes(key))].map(getColumn);
}

function tableLayoutSnapshot(name) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    order: [...state.table.order],
    visible: [...state.table.visible],
    pinned: [...state.table.pinned],
    sortKey: state.table.sortKey,
    sortDir: state.table.sortDir,
    pageSize: state.table.pageSize
  };
}

function applyTableLayout(profile) {
  if (!profile) return;
  const allKeys = TABLE_COLUMNS.map(col => col.key);
  state.table.order = [...new Set([...(profile.order || []), ...allKeys])].filter(key => allKeys.includes(key));
  state.table.visible = (profile.visible || allKeys).filter(key => allKeys.includes(key));
  if (!state.table.visible.length) state.table.visible = ["risk"];
  state.table.pinned = (profile.pinned || []).filter(key => state.table.visible.includes(key));
  state.table.sortKey = profile.sortKey || state.table.sortKey;
  state.table.sortDir = profile.sortDir || state.table.sortDir;
  state.table.pageSize = Number(profile.pageSize || state.table.pageSize);
  state.table.page = 1;
}

function dashboardSnapshot(name) {
  state.prefs.chartLayout.columns = clampChartColumns(state.prefs.chartLayout.columns);
  return createDashboardSnapshot(state, name);
}

function applyDashboardProfile(profile) {
  applySavedDashboardProfile(state, profile, chartMetricList);
  state.prefs.chartLayout.columns = clampChartColumns(state.prefs.chartLayout.columns);
  savePrefs();
}

function applyDashboardPreset(presetId) {
  applyDashboardPresetProfile(state, presetId, chartMetricList);
  state.prefs.chartLayout.columns = clampChartColumns(state.prefs.chartLayout.columns);
  savePrefs();
}

function applyAnalysisTemplate(templateId) {
  const allColumns = TABLE_COLUMNS.map(col => col.key);
  applyTemplateProfile(state, templateId, allColumns, chartMetricList);
  savePrefs();
}

function moveTableColumn(sourceKey, targetKey) {
  if (!sourceKey || !targetKey || sourceKey === targetKey) return false;
  const order = [...state.table.order];
  const from = order.indexOf(sourceKey);
  const to = order.indexOf(targetKey);
  if (from < 0 || to < 0) return false;
  order.splice(from, 1);
  order.splice(to, 0, sourceKey);
  state.table.order = order;
  return true;
}

function socketMatchesFilters(socket) {
  const f = state.table.filters;
  const haystack = [
    socket.state,
    socket.family,
    socket.local,
    socket.peer,
    socket.details.process?.name,
    socket.details.process?.pid,
    socket.raw
  ].join(" ").toLowerCase();
  if (f.text && !socketMatchesAdvancedQuery(socket, f.text, { metricValue, socketBandwidth })) return false;
  if (f.process && !String(socket.details.process?.name || "").toLowerCase().includes(f.process.toLowerCase())) return false;
  if (f.risk !== "all" && socket.risk !== f.risk) return false;
  if (f.state !== "all" && socket.state !== f.state) return false;
  if (f.family !== "all" && socket.family !== f.family) return false;
  if (f.minRecvQ !== "" && socket.recvQ < Number(f.minRecvQ)) return false;
  if (f.minSendQ !== "" && socket.sendQ < Number(f.minSendQ)) return false;
  if (f.minRtt !== "" && metricValue(socket, "rtt") < Number(f.minRtt)) return false;
  if (f.srcIp && !socket.localAddress.host.toLowerCase().includes(f.srcIp.toLowerCase())) return false;
  if (f.dstIp && !socket.peerAddress.host.toLowerCase().includes(f.dstIp.toLowerCase())) return false;
  if (f.srcPort && String(socket.localAddress.port || "").toLowerCase() !== f.srcPort.toLowerCase()) return false;
  if (f.dstPort && String(socket.peerAddress.port || "").toLowerCase() !== f.dstPort.toLowerCase()) return false;
  if (f.onlyAnomalies && !state.anomalies.some(a => a.socketId === socket.id)) return false;
  return true;
}

function sortedFilteredSockets() {
  const cacheKey = JSON.stringify({
    version: state.dataVersion,
    filters: state.table.filters,
    sortKey: state.table.sortKey,
    sortDir: state.table.sortDir
  });
  if (state.cache.filteredKey === cacheKey && state.cache.filteredRows) return state.cache.filteredRows;
  const col = getColumn(state.table.sortKey);
  const factor = state.table.sortDir === "asc" ? 1 : -1;
  const rows = state.sockets.filter(socketMatchesFilters).sort((a, b) => {
    const av = col.value(a);
    const bv = col.value(b);
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
    return String(av).localeCompare(String(bv), "fr", { numeric: true }) * factor;
  });
  state.cache.filteredKey = cacheKey;
  state.cache.filteredRows = rows;
  return rows;
}

function uniqueValues(key) {
  return [...new Set(state.sockets.map(s => s[key]).filter(Boolean))].sort();
}

function uniqueSocketValues(selector) {
  return [...new Set(state.sockets.map(selector).filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

function renderDatalist(id, values) {
  return `<datalist id="${id}">${values.slice(0, 1000).map(value => `<option value="${escapeHtml(value)}"></option>`).join("")}</datalist>`;
}

function pagedRows(rows) {
  const totalPages = Math.max(1, Math.ceil(rows.length / state.table.pageSize));
  state.table.page = Math.min(Math.max(1, state.table.page), totalPages);
  const start = (state.table.page - 1) * state.table.pageSize;
  return { rows: rows.slice(start, start + state.table.pageSize), totalPages, start };
}

function groupedSockets() {
  const map = new Map();
  for (const socket of sortedFilteredSockets()) {
    const key = socketKey(socket);
    if (!map.has(key)) {
      map.set(key, {
        key,
        socket,
        count: 0,
        maxRisk: "low",
        maxRecvQ: 0,
        maxSendQ: 0,
        maxRtt: 0,
        maxRto: 0,
        maxDrops: 0,
        anomalies: 0
      });
    }
    const group = map.get(key);
    group.count += 1;
    group.maxRisk = riskRank(socket.risk) > riskRank(group.maxRisk) ? socket.risk : group.maxRisk;
    group.maxRecvQ = Math.max(group.maxRecvQ, socket.recvQ);
    group.maxSendQ = Math.max(group.maxSendQ, socket.sendQ);
    group.maxRtt = Math.max(group.maxRtt, metricValue(socket, "rtt"));
    group.maxRto = Math.max(group.maxRto, metricValue(socket, "rto"));
    group.maxDrops = Math.max(group.maxDrops, metricValue(socket, "skmem.d"));
    group.anomalies += state.anomalies.filter(a => a.socketId === socket.id).length;
  }
  return [...map.values()].sort((a, b) => riskRank(b.maxRisk) - riskRank(a.maxRisk) || b.anomalies - a.anomalies || b.maxSendQ - a.maxSendQ);
}

function conversationKey(socket) {
  return `${socket.localAddress.host || socket.local}|${socket.localAddress.port || ""}|${socket.peerAddress.host || socket.peer}|${socket.peerAddress.port || ""}|${socket.family}`;
}

function anomaliesBySocketId() {
  const map = new Map();
  for (const anomaly of state.anomalies) {
    if (!anomaly.socketId) continue;
    if (!map.has(anomaly.socketId)) map.set(anomaly.socketId, []);
    map.get(anomaly.socketId).push(anomaly);
  }
  return map;
}

function buildConversations() {
  const map = new Map();
  const anomalyMap = anomaliesBySocketId();
  for (const socket of sortedFilteredSockets()) {
    const key = conversationKey(socket);
    if (!map.has(key)) {
      map.set(key, {
        key,
        socket,
        local: socket.local,
        peer: socket.peer,
        family: socket.family,
        states: new Set(),
        processes: new Set(),
        count: 0,
        maxRisk: "low",
        anomalies: 0,
        recvQ: 0,
        sendQ: 0,
        txBps: 0,
        rxBps: 0,
        maxRtt: 0,
        maxRto: 0,
        drops: 0,
        anomalyItems: []
      });
    }
    const conv = map.get(key);
    const socketAnomalies = anomalyMap.get(socket.id) || [];
    conv.count += 1;
    conv.states.add(socket.state);
    if (socket.details.process?.name) conv.processes.add(socket.details.process.name);
    conv.maxRisk = riskRank(socket.risk) > riskRank(conv.maxRisk) ? socket.risk : conv.maxRisk;
    conv.anomalies += socketAnomalies.length;
    conv.anomalyItems.push(...socketAnomalies);
    conv.recvQ += socket.recvQ;
    conv.sendQ += socket.sendQ;
    conv.txBps += socketBandwidth(socket, "tx_bps");
    conv.rxBps += socketBandwidth(socket, "rx_bps");
    conv.maxRtt = Math.max(conv.maxRtt, metricValue(socket, "rtt"));
    conv.maxRto = Math.max(conv.maxRto, metricValue(socket, "rto"));
    conv.drops += metricValue(socket, "skmem.d");
  }
  return [...map.values()].sort((a, b) =>
    riskRank(b.maxRisk) - riskRank(a.maxRisk) ||
    b.anomalies - a.anomalies ||
    b.sendQ - a.sendQ ||
    b.txBps - a.txBps
  );
}

function conversationAnomalySummary(conv) {
  const items = conv.anomalyItems || [];
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  const byMetric = new Map();
  const byTitle = new Map();
  for (const item of items) {
    counts[item.severity] = (counts[item.severity] || 0) + 1;
    const metric = item.metric || "socket";
    byMetric.set(metric, (byMetric.get(metric) || 0) + 1);
    const key = `${item.severity}|${item.title}|${metric}`;
    if (!byTitle.has(key)) byTitle.set(key, { ...item, count: 0 });
    byTitle.get(key).count += 1;
  }
  const dominantSeverity = ["critical", "high", "medium", "low"].find(severity => counts[severity]) || "low";
  const topMetric = [...byMetric.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "rtt";
  const topItems = [...byTitle.values()].sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.count - a.count || a.title.localeCompare(b.title)).slice(0, 4);
  return { counts, dominantSeverity, topMetric, topItems, metrics: [...byMetric.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5) };
}

function buildExpertInformation() {
  const rank = { critical: 4, high: 3, medium: 2, low: 1 };
  const map = new Map();
  for (const anomaly of filteredAnomalies(state.anomalies)) {
    const socket = state.sockets.find(item => item.id === anomaly.socketId);
    const key = `${anomaly.severity}|${anomaly.metric || "socket"}|${anomaly.title}`;
    if (!map.has(key)) {
      map.set(key, {
        ...anomaly,
        count: 0,
        sockets: [],
        processes: new Set(),
        peers: new Set()
      });
    }
    const item = map.get(key);
    item.count += 1;
    if (socket) {
      item.sockets.push(socket);
      if (socket.details.process?.name) item.processes.add(socket.details.process.name);
      if (socket.peer) item.peers.add(socket.peer);
    }
  }
  return [...map.values()].sort((a, b) =>
    rank[b.severity] - rank[a.severity] ||
    b.count - a.count ||
    a.title.localeCompare(b.title)
  );
}

function buildTimelineEvents() {
  const rank = { critical: 4, high: 3, medium: 2, low: 1 };
  const events = [];
  const rows = state.history || [];
  const selected = state.sockets.find(socket => socket.id === state.selectedId) || state.sockets[0];
  const metrics = ["rto", "rtt", "sendQ", "recvQ", "skmem.d", "skmem.d_rate", "cwnd", "tx_bps", "rx_bps"];
  for (const row of rows) {
    for (const metric of metrics) {
      const value = Number(row[metric] || 0);
      const severity = thresholdSeverity(metric, value);
      if (severity === "danger" || severity === "warn") {
        events.push({
          epochMs: row.epochMs,
          t: row.t,
          severity: severity === "danger" ? "high" : "medium",
          metric,
          title: `${metricLabel(metric)} threshold crossed`,
          detail: `${metricLabel(metric)} reached ${formatMetricValue(metric, value)}${selected ? ` on ${selected.local} -> ${selected.peer}` : ""}.`,
          socketId: selected?.id
        });
      }
    }
  }
  state.anomalies.slice(0, 80).forEach((anomaly, index) => {
    const row = rows[index % Math.max(1, rows.length)];
    events.push({
      epochMs: row?.epochMs || Date.now(),
      t: row?.t ?? index,
      severity: anomaly.severity,
      metric: anomaly.metric || "socket",
      title: anomaly.title,
      detail: anomaly.detail,
      socketId: anomaly.socketId
    });
  });
  return events
    .sort((a, b) => (a.epochMs || 0) - (b.epochMs || 0) || rank[b.severity] - rank[a.severity])
    .slice(0, 160);
}

function endpointPresentation(endpoint) {
  const alias = aliasForEndpoint(state.serviceAliases, endpoint);
  return {
    endpoint,
    label: alias?.label || endpoint,
    role: alias?.role || "",
    note: alias?.note || "",
    alias
  };
}

function nodeLabel(node) {
  return node.alias?.label || node.label;
}

function nodeSubtitle(node) {
  if (node.kind === "process") return `${formatNumber(node.count)} socket(s)`;
  return node.alias?.label ? node.endpoint : "";
}

function serviceMapGroupBands(lanes, positions) {
  const bands = [];
  for (const lane of lanes.filter(item => item.key !== "processes")) {
    let run = null;
    const closeRun = () => {
      if (!run) return;
      const ys = run.nodes.map(node => positions[node.id]?.y).filter(Number.isFinite);
      if (ys.length) {
        const top = Math.min(...ys) - 36;
        const bottom = Math.max(...ys) + 36;
        bands.push({
          group: run.group,
          x: lane.x - 166,
          y: top,
          width: 332,
          height: bottom - top
        });
      }
      run = null;
    };
    for (const node of lane.nodes) {
      const group = node.topologyGroup;
      if (!group) {
        closeRun();
        continue;
      }
      if (!run || run.group.id !== group.id) {
        closeRun();
        run = { group, nodes: [] };
      }
      run.nodes.push(node);
    }
    closeRun();
  }
  return bands;
}

function buildServiceMap() {
  const sockets = sortedFilteredSockets().slice(0, 120);
  const processNodes = new Map();
  const localNodes = new Map();
  const peerNodes = new Map();
  const edges = [];
  const ensure = (map, id, label, kind, endpoint = "") => {
    if (!map.has(id)) {
      const presentation = endpoint ? endpointPresentation(endpoint) : null;
      map.set(id, {
        id,
        label: presentation?.label || label,
        rawLabel: label,
        endpoint,
        alias: presentation?.alias || null,
        topologyGroup: endpoint ? topologyGroupForEndpoint(state.topology, endpoint) : null,
        kind,
        count: 0,
        risk: "low",
        anomalies: 0
      });
    }
    return map.get(id);
  };
  for (const socket of sockets) {
    const processLabel = socket.details.process ? `${socket.details.process.name}:${socket.details.process.pid}` : "unknown process";
    const process = ensure(processNodes, `process:${processLabel}`, processLabel, "process");
    const local = ensure(localNodes, `local:${socket.local}`, socket.local, "local", socket.local);
    const peer = ensure(peerNodes, `peer:${socket.peer}`, socket.peer, "peer", socket.peer);
    const anomalyCount = state.anomalies.filter(a => a.socketId === socket.id).length;
    for (const node of [process, local, peer]) {
      node.count += 1;
      node.anomalies += anomalyCount;
      node.risk = riskRank(socket.risk) > riskRank(node.risk) ? socket.risk : node.risk;
    }
    edges.push({
      id: socket.id,
      from: process.id,
      mid: local.id,
      to: peer.id,
      risk: socket.risk,
      socket,
      anomalies: anomalyCount,
      weight: Math.max(1, socket.sendQ + socket.recvQ + socketBandwidth(socket, "tx_bps") / 100000)
    });
  }
  const sortNodes = nodes => [...nodes.values()].sort((a, b) => {
    const groupA = a.topologyGroup?.name || "\uffff";
    const groupB = b.topologyGroup?.name || "\uffff";
    return groupA.localeCompare(groupB, "en", { numeric: true })
      || riskRank(b.risk) - riskRank(a.risk)
      || b.anomalies - a.anomalies
      || b.count - a.count;
  }).slice(0, 18);
  return {
    processes: sortNodes(processNodes),
    locals: sortNodes(localNodes),
    peers: sortNodes(peerNodes),
    edges
  };
}

function evaluateAlertRules() {
  state.alertEvents = evaluateAlertRuleEvents({
    rules: state.alertRules,
    sockets: state.sockets,
    alertAcks: state.alertAcks
  }, { metricValue, socketBandwidth, riskRank });
}

function createBaseline() {
  return createBaselineSnapshot(state, { metricValue, socketBandwidth, socketKey });
}

function buildComparison() {
  return buildBaselineComparison(state, { metricValue, socketBandwidth, socketKey, riskRank });
}

function html(strings, ...values) {
  return strings.map((s, i) => s + (values[i] ?? "")).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c]));
}

function truncateMiddle(value, max = 32) {
  const text = String(value || "");
  if (text.length <= max) return text;
  const keep = Math.max(4, Math.floor((max - 3) / 2));
  return `${text.slice(0, keep)}...${text.slice(-keep)}`;
}

function updateAnomalyAlertState() {
  const count = state.anomalies.length;
  if (count <= 0) {
    state.anomalyAlertSince = null;
    state.lastAnomalyCount = 0;
    return;
  }
  if (count !== state.lastAnomalyCount || !state.anomalyAlertSince) {
    state.anomalyAlertSince = Date.now();
    state.lastAnomalyCount = count;
  }
}

function anomalyStatusClass() {
  if (!state.anomalies.length) return "";
  return Date.now() - state.anomalyAlertSince < 10000 ? "blink" : "solid";
}

function scheduleAnomalyBadgeSettle() {
  if (!state.anomalies.length || !state.anomalyAlertSince) return;
  const remaining = 10050 - (Date.now() - state.anomalyAlertSince);
  if (remaining > 0) setTimeout(() => {
    const badge = document.querySelector(".anomaly-status.blink");
    if (badge) {
      badge.classList.remove("blink");
      badge.classList.add("solid");
    }
  }, remaining);
}

function render() {
  if (state.analysisDirty) recompute();
  updateAnomalyAlertState();
  const app = document.querySelector("#app");
  app.innerHTML = html`
    <div class="app-shell view-${state.view}">
      <nav class="rail">
        <button class="icon ${state.view === "ingest" ? "primary" : ""}" data-view="ingest" title="Import">${icons.upload}</button>
        <button class="icon ${state.view === "analysis" ? "primary" : ""}" data-view="analysis" title="Analyze">${icons.play}</button>
        <button class="icon ${state.view === "charts" ? "primary" : ""}" data-view="charts" title="Charts">${icons.chart}</button>
        <button class="icon" data-action="guide" title="Guide">${icons.book}</button>
        <button class="icon" data-action="prefs" title="Preferences">${icons.settings}</button>
      </nav>
      <header class="topbar">
        <div class="title">
          <div class="brand tcp-brand" title="TCP packets travelling between peers">
          <span class="brand-node n1"></span>
          <span class="brand-node n2"></span>
          <span class="brand-link l1"></span>
          <span class="brand-packet p1"></span>
          <span class="brand-packet p2"></span>
          </div>
          <div>
            <h1>
              Ultimate Network Expert
              <span class="app-title-info" tabindex="0" aria-label="Application details">
                <i class="ri-information-line"></i>
                <span class="app-title-tooltip" role="tooltip">
                  <strong>World-class Linux ss socket analysis</strong>
                  <span>TCP diagnostics, memory, timelines, conversations, dashboards, alerts, and before/after comparison.</span>
                  <small>Source: ${escapeHtml(state.sourceName)}</small>
                </span>
              </span>
            </h1>
          </div>
        </div>
        <div class="top-actions">
          <div class="app-tabs">
            ${[
              ["ingest", "Import"],
              ["analysis", "Analysis"],
              ["charts", "Charts"],
              ["guide", "Guide"]
            ].map(([key, label]) => `<button class="app-tab ${state.view === key ? "active" : ""}" data-view="${key}">${label}</button>`).join("")}
          </div>
          <span class="status-pill"><span class="dot"></span>${state.sockets.length} sockets parsed</span>
          <span class="status-pill anomaly-status ${anomalyStatusClass()}">${state.anomalies.length ? icons.incidentCloud : ""}${formatNumber(state.anomalies.length)} anomalies</span>
          <button class="danger" data-action="resetAll">${icons.x} Reset all</button>
        </div>
      </header>
      ${renderInvestigationContext()}
      ${state.view === "ingest" ? `<main class="workspace wide">${renderIngestPage()}</main>` : ""}
      ${state.view === "analysis" ? `<main class="workspace wide">${renderAnalysisPage()}</main>` : ""}
      ${state.view === "charts" ? `<main class="workspace wide">${renderChartsPage()}</main>` : ""}
      ${state.view === "guide" ? `<main class="workspace wide">${renderGuide()}</main>` : ""}
    </div>
    ${renderDrawer()}
    ${renderModal()}
  `;
  bindEvents();
  drawChart();
  scheduleMultiChartDraw();
  drawCorrelation();
  scheduleAnomalyBadgeSettle();
  scheduleIpIntelEnrichment();
}

function selectedSocket() {
  return state.activeContextId ? state.sockets.find(socket => socket.id === state.activeContextId) || null : null;
}

function renderInvestigationContext() {
  const socket = selectedSocket();
  if (!socket) return "";
  const socketAnomalies = state.anomalies.filter(anomaly => anomaly.socketId === socket.id);
  const topAnomaly = socketAnomalies
    .slice()
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];
  const process = socket.details.process ? `${socket.details.process.name}:${socket.details.process.pid}` : "unknown process";
  return `<section class="investigation-context" aria-label="Active investigation context">
    <div class="investigation-main">
      <span class="tooltip-kicker">Active investigation</span>
      <div class="investigation-flow">
        <strong>${escapeHtml(socket.local)}</strong>
        <span>${icons.arrowRight}</span>
        <strong>${escapeHtml(socket.peer)}</strong>
      </div>
      <small>${escapeHtml(state.activeContextReason || "Chosen by explicit user selection")} / ${escapeHtml(socket.family || "socket")} / ${escapeHtml(socket.state)} / ${escapeHtml(process)}</small>
    </div>
    <div class="investigation-metrics">
      <span><b class="risk ${socket.risk}">${escapeHtml(socket.risk)}</b><small>risk</small></span>
      <span><b>${formatNumber(socketAnomalies.length)}</b><small>anomalies</small></span>
      <span><b>${formatMetricValue("rtt", metricValue(socket, "rtt"))}</b><small>RTT</small></span>
      <span><b>${formatMetricValue("rto", metricValue(socket, "rto"))}</b><small>RTO</small></span>
      <span><b>${formatMetricValue("tx_bps", socketBandwidth(socket, "tx_bps"))}</b><small>TX</small></span>
      <span><b>${formatMetricValue("rx_bps", socketBandwidth(socket, "rx_bps"))}</b><small>RX</small></span>
    </div>
    <div class="investigation-actions">
      <button data-context-action="details">${icons.activity} Details</button>
      <button data-context-action="charts">${icons.chart} Charts</button>
      <button data-context-action="anomalies" class="${socketAnomalies.length ? "hot-action" : ""}">${icons.alert} Anomalies</button>
      <button data-context-action="conversations"><i class="ri-chat-3-line"></i> Conversations</button>
      <button class="icon" data-context-action="clear" title="Clear active context" aria-label="Clear active context">${icons.x}</button>
    </div>
    ${topAnomaly ? `<div class="investigation-note ${topAnomaly.severity}">
      <b>${escapeHtml(topAnomaly.severity)}</b>
      <span>${escapeHtml(topAnomaly.title)}</span>
    </div>` : ""}
  </section>`;
}

function renderKeepingWorkspacePosition() {
  const workspace = document.querySelector(".workspace");
  const scrollTop = workspace?.scrollTop || 0;
  const scrollLeft = workspace?.scrollLeft || 0;
  const windowScrollX = window.scrollX || 0;
  const windowScrollY = window.scrollY || 0;
  render();
  const nextWorkspace = document.querySelector(".workspace");
  if (nextWorkspace) {
    nextWorkspace.scrollTop = scrollTop;
    nextWorkspace.scrollLeft = scrollLeft;
  }
  window.scrollTo(windowScrollX, windowScrollY);
}

function renderKeepingModalPosition() {
  const modal = document.querySelector(".modal");
  const modalScrollTop = modal?.scrollTop || 0;
  const modalScrollLeft = modal?.scrollLeft || 0;
  const columnList = document.querySelector(".column-list");
  const columnListScrollTop = columnList?.scrollTop || 0;
  const columnListScrollLeft = columnList?.scrollLeft || 0;
  render();
  const nextModal = document.querySelector(".modal");
  if (nextModal) {
    nextModal.scrollTop = modalScrollTop;
    nextModal.scrollLeft = modalScrollLeft;
  }
  const nextColumnList = document.querySelector(".column-list");
  if (nextColumnList) {
    nextColumnList.scrollTop = columnListScrollTop;
    nextColumnList.scrollLeft = columnListScrollLeft;
  }
}

function renderIngestPage() {
  const coverage = commandCoverage(state.command);
  const active = coverage.filter(o => o.active);
  const best = ["-H", "-O", "-n", "-t", "-e", "-p", "-m", "-i", "--tos", "--cgroup", "--inet-sockopt", "-a", "-A"];
  return html`
    <section class="ingest-hero">
      <div>
        <h2>Import an ss collection</h2>
        <p>Paste output or open a file, then analyze.</p>
      </div>
      <div class="hero-actions">
        <input id="fileInput" type="file" accept=".txt,.log,.out,.ss,.gz,.zip,text/plain,application/gzip,application/zip" hidden />
        <button class="mega primary" data-action="pickFile">${icons.upload} Open ss file</button>
        <button class="mega" data-action="parse">${icons.play} Parse now</button>
      </div>
    </section>
    <section class="ingest-grid">
      <div class="panel">
        <div class="panel-head"><div class="panel-title">ss stats to parse</div><span class="status-pill">${escapeHtml(state.sourceName)}</span></div>
        <div class="panel-body">
          <textarea id="rawInput" class="raw-large" spellcheck="false" placeholder="Paste ss output or a timestamped collection here...">${escapeHtml(state.raw)}</textarea>
          <div class="toolbar" style="margin-top:10px">
            <button class="primary" data-action="parse">${icons.play} Analyze</button>
          <button data-action="sample">${icons.sample} Sample</button>
          <button data-action="sample10m">${icons.chart} 10-min sample</button>
          <button data-action="clear" class="danger">${icons.clear} Clear</button>
          </div>
          <p class="hint">The file is read locally by the browser. For large logs, use the Analysis page: pagination, filters, sorting, columns, and grouping.</p>
          ${state.importStatus ? `<div class="import-status"><strong>${escapeHtml(state.importStatus.title)}</strong><span>${escapeHtml(state.importStatus.detail)}</span><progress value="${state.importStatus.progress}" max="100"></progress></div>` : ""}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><div class="panel-title">Command and options</div></div>
        <div class="panel-body">
          <div class="command-row">
            <input id="commandInput" value="${escapeHtml(state.command)}" spellcheck="false" />
            <button class="icon primary" data-action="parse" title="Analyze">${icons.play}</button>
          </div>
          <div class="chips">${active.map(o => `<span class="chip hot">${escapeHtml(o.short || o.long)}</span>`).join("") || `<span class="chip">no option detected</span>`}</div>
          <p class="hint">Compact flags such as ss -plunt are decomposed option by option.</p>
          <div class="option-grid">
            ${SS_OPTIONS.filter(o => best.includes(o[0]) || best.includes(o[1])).map(([short, long, desc]) => `<label class="check"><input type="checkbox" data-opt="${escapeHtml(short || long)}" ${coverage.find(c => c.short === short && c.long === long)?.active ? "checked" : ""}/> <span>${escapeHtml(short || long)}</span></label>`).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderAnalysisPage() {
  return html`
    <section class="kpis">
      <div class="kpi"><label>Sockets</label><strong>${formatNumber(state.sockets.length)}</strong></div>
      <div class="kpi"><label>Critical</label><strong>${formatNumber(state.anomalies.filter(a => a.severity === "critical").length)}</strong></div>
      <div class="kpi"><label>Send-Q total</label><strong>${formatMetricValue("sendQ", state.sockets.reduce((s, x) => s + x.sendQ, 0))}</strong></div>
      <div class="kpi"><label>Drops skmem</label><strong>${formatMetricValue("skmem.d", state.sockets.reduce((s, x) => s + (x.details.skmem.d || 0), 0))}</strong></div>
    </section>
    <section class="analysis-layout">
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">Detected sockets</div>
          <div class="toolbar">
            <button data-action="toggleDeepAnalysis" class="${state.prefs.deepAnalysis ? "primary" : ""}" title="Run advanced advisor in the background">${icons.brain} Deep analysis</button>
            <button data-action="setBaseline" title="Use current parsed sockets as before baseline"><i class="ri-scales-3-line"></i> Set baseline</button>
            <input id="searchInput" placeholder='Filter: state:ESTAB risk>=high port:443 process:nginx rtt>100' value="${escapeHtml(state.table.filters.text)}" />
            <button class="icon" data-action="details" title="Socket details">${icons.activity}</button>
          </div>
        </div>
        <div class="tabs">
          ${["advisor", "templates", "map", "conversations", "expert", "timeline", "alerts", "compare", "sockets", "groups", "anomalies", "fields"].map(tab => `<button class="tab ${state.activeTab === tab ? "active" : ""}" data-tab="${tab}">${tab}</button>`).join("")}
        </div>
        <div class="panel-body">${renderActiveTab()}</div>
      </div>
    </section>
  `;
}

function renderChartsPage() {
  const metrics = chartMetricList();
  const metricOptions = alphabeticalMetrics(metrics);
  const selected = state.sockets.find(s => s.id === state.selectedId);
  const layout = state.prefs.chartLayout;
  const columns = clampChartColumns(layout.columns);
  const realTimeline = hasRealTimestampHistory();
  const orderedMetrics = orderedChartMetrics();
  const activeCorrelation = EXPERT_CORRELATIONS.find(item => item.x === state.correlation.x && item.y === state.correlation.y);
  return html`
    ${renderDashboardStudio()}
    <section class="panel ${layout.stickyToolbar ? "sticky-chart-panel" : ""}">
      <div class="panel-head">
        <div class="panel-title">Socket charts ${selected ? escapeHtml(selected.local) : ""}</div>
        <div class="toolbar">
          <button class="icon" data-chart-stats="${state.prefs.graphMetric}" title="Metric statistics">${icons.stats}</button>
          <button data-action="layoutPrefs">${icons.layout} Layout</button>
          <button class="icon" data-action="details" title="Details">${icons.activity}</button>
        </div>
      </div>
      <div class="panel-body">
        <div class="chart-controls wide-controls">
          <label class="chart-field">
            <span>Primary metric ${renderChartInfo("Primary metric", "Chooses the metric drawn in the large chart. Use bandwidth metrics to inspect throughput evolution, RTT/RTO for latency and recovery, queues for slow consumers, and skmem metrics for socket buffer pressure.", "Changing this does not remove the smaller panels below; it only changes the focus chart. For a socket investigation, compare TX/RX bandwidth with Send-Q, RTT, RTO, cwnd, and pacing rate.")}</span>
            <select id="metricSelect">${metricOptions.map(m => `<option value="${m}" ${state.prefs.graphMetric === m ? "selected" : ""}>${escapeHtml(metricLabel(m))}</option>`).join("")}</select>
          </label>
          <label class="chart-field">
            <span>Chart style ${renderChartInfo("Chart style", "Controls how the selected time series is rendered. Line is best for trends, area for volume/pressure, bars for discrete bursts, points for sparse data, and XY for correlation-like visual inspection.", "For bandwidth, line or area usually reads best. For drops, retransmission, or backoff, bars and points make spikes easier to see.")}</span>
            <select id="styleSelect">${["line", "area", "bars", "points", "xy"].map(m => `<option value="${m}" ${state.prefs.graphStyle === m ? "selected" : ""}>${m}</option>`).join("")}</select>
          </label>
          ${!realTimeline ? `<label class="chart-field">
            <span>Synthetic window ${renderChartInfo("Synthetic window", "Number of generated points used only when the imported data has no timestamped snapshots. It keeps charts usable for a single ss capture, but it is a projection, not measured history.", "For real time evolution, collect repeated ss snapshots with timestamps. Increase this only when exploring a single capture visually; it does not create real bandwidth history.")}</span>
            <input id="windowInput" type="number" min="6" max="240" value="${state.prefs.graphWindow}"/>
          </label>` : ""}
          <label class="chart-field">
            <span>Reference threshold ${renderChartInfo("Reference threshold", "A quick visual reference value for the focused chart. The expert warning and critical thresholds are managed separately in Threshold configuration.", "Use this for temporary investigation marks, for example expected RTT, target bandwidth, or an SLA value. Permanent risk coloring still comes from configured thresholds.")}</span>
            <input id="thresholdInput" type="number" min="0" value="${state.prefs.graphThreshold}"/>
          </label>
          ${!realTimeline ? `<label class="chart-field">
            <span>Synthetic interval ${renderChartInfo("Synthetic interval", "Expected interval, in seconds, used only when Ultimate Network Expert has to synthesize a local timeline from a single non-timestamped capture. Timestamped imports always use every captured timestamp at its real time.", "Leave this at 1 second for synthetic previews. It does not downsample real collections; real chart resolution comes from the timestamps in the imported data.")}</span>
            <input id="samplingInput" type="number" min="0.001" max="3600" step="0.001" value="${state.prefs.sampling}"/>
          </label>` : ""}
        </div>
        <div class="chart-toolbar">
          <div class="chart-tool-group">
            <button data-action="zoomIn">${icons.zoomIn} Zoom in</button>
            <button data-action="zoomOut">${icons.zoomOut} Zoom out</button>
          </div>
          <div class="chart-tool-group">
            <button data-action="panLeft">${icons.arrowLeft} Pan left</button>
            <button data-action="panRight">${icons.arrowRight} Pan right</button>
            <button data-action="resetZoom">${icons.reset} Reset zoom</button>
          </div>
          <div class="chart-tool-group">
            <button data-action="thresholds">${icons.threshold} Thresholds</button>
            <button data-action="saveCharts">${icons.save} Export PNG</button>
          </div>
          <div class="chart-timezone-group">
            <label>Time zone ${renderChartInfo("Time zone", "Controls how timestamps are displayed on chart axes, crosshair labels, and date-time zoom fields. The underlying samples are unchanged.", "Use UTC for server-side logs and incident correlation across machines. Use local time when matching an operator timeline, application logs, or monitoring dashboards configured in that zone.")}</label>
            <select id="chartTimeZoneSelect" title="Chart timezone">${renderTimeZoneOptions()}</select>
          </div>
        </div>
        <div class="time-range">
          <label class="chart-field"><span>Start time ${renderChartInfo("Start time", "Left boundary of the visible time window. It updates when you drag-zoom a chart and can also be edited manually for precise inspection.", "Use it to isolate an incident window, then compare several metrics under the same synchronized zoom.")}</span><input id="startTimeInput" type="datetime-local" step="1" value="${zoomDateTimeValue("start")}"/></label>
          <label class="chart-field"><span>End time ${renderChartInfo("End time", "Right boundary of the visible time window. Together with Start time, it controls the synchronized zoom range for all charts.", "Narrow this around spikes in RTO, Send-Q, drops, TX/RX bandwidth collapse, or backoff to avoid averaging away short incidents.")}</span><input id="endTimeInput" type="datetime-local" step="1" value="${zoomDateTimeValue("end")}"/></label>
        </div>
        ${layout.mainChart ? `<svg id="chart" class="chart hero-chart ${layout.density}" role="img" aria-label="Main timeline chart"></svg>` : ""}
        ${layout.showLegend ? `<div class="chart-legend" id="mainChartLegend">${chartResolutionLabel()} - Shared zoom: ${layout.sharedZoom ? "on" : "off"} - Crosshair: ${layout.showCrosshair ? "on" : "off"} - Thresholds: ${layout.showThresholds ? "on" : "off"}</div>` : ""}
        <div class="metric-picks">
          ${metricOptions.map(m => `<label class="check inline"><input type="checkbox" data-chart-metric="${m}" ${state.chartMetrics.includes(m) ? "checked" : ""}/> ${escapeHtml(metricLabel(m))}</label>`).join("")}
        </div>
      </div>
    </section>
    <section class="chart-grid cols-${columns} density-${layout.density}">
      ${orderedMetrics.map((m, index) => `<div class="panel chart-card" data-chart-card="${m}">
        <div class="panel-head">
          <div class="panel-title chart-title-wrap">
            <span>${escapeHtml(metricLabel(m))}</span>
            ${renderChartMetricTooltip(m)}
          </div>
          <div class="col-tools">
            <button class="mini" data-chart-stats="${m}" title="Statistics">${icons.stats}</button>
            ${index > 0 ? `<button class="mini" data-move-chart="${m}" data-dir="-1" title="Move chart left/up">${icons.up}</button>` : ""}
            ${index < orderedMetrics.length - 1 ? `<button class="mini" data-move-chart="${m}" data-dir="1" title="Move chart right/down">${icons.down}</button>` : ""}
          </div>
        </div>
        <div class="panel-body"><svg class="chart small-chart ${layout.density}" data-mini-chart="${m}"></svg></div>
      </div>`).join("")}
    </section>
    <section class="panel">
      <div class="panel-head"><div class="panel-title">Correlation between two stats</div></div>
      <div class="panel-body">
        <div class="chart-controls correlation-controls">
          <label class="chart-field expert-correlation-field">
            <span>Expert correlations ${renderChartInfo("Expert correlations", "Pre-ranked metric pairs selected for common TCP diagnosis workflows. They complement the manual X/Y controls rather than replacing them.", "Start at the top when triaging: Send-Q vs TX bandwidth for slow consumers or path congestion, then RTT variance vs RTO for loss/jitter, then cwnd vs pacing for congestion-control limits.")}</span>
            <select id="corrPreset">
              <option value="custom" ${activeCorrelation ? "" : "selected"}>Custom manual selection</option>
              ${EXPERT_CORRELATIONS.map(item => `<option value="${item.id}" ${activeCorrelation?.id === item.id ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
            </select>
          </label>
          <label class="chart-field">
            <span>X axis ${renderChartInfo("X axis metric", "Metric used on the horizontal axis. Choose the suspected driver or limiting factor here.", "Good X-axis drivers are Send-Q, Recv-Q, cwnd, pacing_rate, RTT variance, or backoff depending on the hypothesis.")}</span>
            <select id="corrX">${metricOptions.map(m => `<option value="${m}" ${state.correlation.x === m ? "selected" : ""}>${escapeHtml(metricLabel(m))}</option>`).join("")}</select>
          </label>
          <label class="chart-field">
            <span>Y axis ${renderChartInfo("Y axis metric", "Metric used on the vertical axis. Choose the symptom or outcome you want to explain.", "Good Y-axis outcomes are TX/RX bandwidth, RTO, drops, socket memory, delivery_rate, or queue size.")}</span>
            <select id="corrY">${metricOptions.map(m => `<option value="${m}" ${state.correlation.y === m ? "selected" : ""}>${escapeHtml(metricLabel(m))}</option>`).join("")}</select>
          </label>
        </div>
        ${activeCorrelation ? `<div class="correlation-advice"><i class="ri-lightbulb-flash-line"></i><div><strong>${escapeHtml(activeCorrelation.label)}</strong><span>${escapeHtml(activeCorrelation.reason)}</span></div></div>` : ""}
        <svg id="correlationChart" class="chart" role="img" aria-label="Correlation"></svg>
        <p class="hint">Each point corresponds to a timestamped snapshot or a local projection. Useful for checking whether RTT, queues, drops, or buffers rise together.</p>
      </div>
    </section>
  `;
}

function renderDashboardStudio() {
  return `<section class="dashboard-studio">
    <div class="dashboard-hero">
      <div>
        <span class="tooltip-kicker">Dashboard studio</span>
        <h2>Operational dashboards</h2>
        <p>Apply expert presets, tune visible widgets, then save the exact chart layout for recurring investigations.</p>
      </div>
      <div class="dashboard-save">
        <input id="dashboardName" placeholder="Dashboard name" />
        <button class="primary" data-action="saveDashboard">${icons.saveDisk} Save dashboard</button>
      </div>
    </div>
    <div class="dashboard-presets">
      ${Object.entries(DASHBOARD_PRESETS).map(([id, preset]) => `<button data-dashboard-preset="${id}">
        <strong>${escapeHtml(preset.name)}</strong>
        <span>${escapeHtml(preset.description)}</span>
      </button>`).join("")}
    </div>
    <div class="dashboard-saved">
      <strong>Saved dashboards</strong>
      <div class="dashboard-profile-list">
        ${state.dashboardProfiles.length ? state.dashboardProfiles.map(profile => `<article class="dashboard-profile">
          <span>${escapeHtml(profile.name)}</span>
          <small>${escapeHtml(new Date(profile.createdAt).toLocaleString(resolvedNumberLocale()))}</small>
          <button class="icon" data-load-dashboard="${profile.id}" title="Load dashboard"><i class="ri-check-line"></i></button>
          <button class="icon" data-delete-dashboard="${profile.id}" title="Delete dashboard">${icons.trash}</button>
        </article>`).join("") : `<span class="hint">No saved dashboard yet.</span>`}
      </div>
    </div>
  </section>`;
}

function renderChartInfo(title, summary, detail) {
  return `<span class="field-info" tabindex="0" aria-label="${escapeHtml(title)} help"><i class="ri-information-line"></i><span class="field-info-card" role="tooltip"><span class="tooltip-kicker">Chart intelligence</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(summary)}</p><p>${escapeHtml(detail)}</p></span></span>`;
}

function metricSource(metric) {
  return {
    rtt: "ss -i field rtt:<avg>/<var>",
    rttvar: "ss -i field rtt:<avg>/<var>, second value",
    rto: "ss -i field rto",
    sendQ: "ss table column Send-Q",
    recvQ: "ss table column Recv-Q",
    cwnd: "ss -i field cwnd",
    ato: "ss -i field ato",
    "skmem.r": "ss -m skmem r",
    "skmem.t": "ss -m skmem t",
    "skmem.d": "ss -m skmem d",
    "skmem.d_rate": "derived from skmem d deltas / elapsed time",
    pacing_rate: "ss -i field pacing_rate",
    delivery_rate: "ss -i field delivery_rate",
    tx_bps: "derived from bytes_acked deltas, fallback delivery/pacing rate",
    rx_bps: "derived from bytes_received deltas",
    bytes_acked: "ss -i field bytes_acked",
    bytes_received: "ss -i field bytes_received",
    segs_out: "ss -i field segs_out",
    segs_in: "ss -i field segs_in",
    backoff: "ss -i field backoff",
    retrans: "ss timer:(..., ..., retrans)"
  }[metric] || "parsed ss metric";
}

function metricInterpretation(metric) {
  return {
    rtt: "Latency baseline for this TCP flow. Rising RTT shows path queueing, distance, congestion, overloaded peers, or virtualization jitter.",
    rttvar: "Jitter around RTT. High variance makes RTO and tail latency unstable even when average RTT looks acceptable.",
    rto: "TCP retransmission timeout. Elevated RTO is a stronger recovery/loss signal than RTT alone.",
    sendQ: "Bytes waiting locally to be sent or acknowledged. Growth often points to slow peer consumption, congestion, or TCP backoff.",
    recvQ: "Bytes waiting locally for the application to read. Growth points to local process or scheduler read latency.",
    cwnd: "Congestion window in segments. Low cwnd limits throughput even when the app wants to send.",
    ato: "Delayed ACK timeout. High values can add latency to small or request/response workloads.",
    "skmem.r": "Kernel receive memory currently allocated to this socket. High values show receive-side pressure or burst absorption.",
    "skmem.t": "Kernel transmit memory currently allocated to this socket. High values show outbound buffering or drain pressure.",
    "skmem.d": "Socket memory drops. Any increase is loss/pressure evidence, especially if it grows over time.",
    "skmem.d_rate": "Rate at which socket memory drops are increasing. This separates old static counters from current loss/pressure.",
    pacing_rate: "Kernel TCP pacing allowance. Collapse after a healthy value suggests congestion-control backoff or app-limited behavior.",
    delivery_rate: "Kernel estimate of delivered bandwidth. Compare with pacing and queues to separate path limit from application limit.",
    tx_bps: "Estimated transmit throughput from acknowledged bytes between snapshots. Best for seeing forward progress.",
    rx_bps: "Estimated receive throughput from received bytes between snapshots. Best for spotting receive-side stalls.",
    bytes_acked: "Cumulative acknowledged outbound bytes. Use slope/delta over time rather than the absolute value.",
    bytes_received: "Cumulative inbound bytes. Use slope/delta over time rather than the absolute value.",
    segs_out: "Cumulative outbound TCP segments. Useful for tiny-write or packet-efficiency patterns.",
    segs_in: "Cumulative inbound TCP segments. Useful with bytes_received to spot small packets or burst patterns.",
    backoff: "TCP retransmission backoff exponent. Non-zero values mean recovery is becoming increasingly expensive.",
    retrans: "Active retransmission timer count from ss timer data. Correlate with RTO and Send-Q."
  }[metric] || "Metric parsed from the current socket timeline.";
}

function metricCorrelations(metric) {
  return {
    rtt: ["RTO", "RTT variance", "Send-Q", "delivery_rate"],
    rttvar: ["RTO", "RTT", "backoff", "retrans"],
    rto: ["RTT variance", "backoff", "retrans", "Send-Q"],
    sendQ: ["TX bandwidth", "RTO", "cwnd", "skmem.t"],
    recvQ: ["RX bandwidth", "skmem.r", "process owner", "socket drops"],
    cwnd: ["pacing_rate", "Send-Q", "RTO", "delivery_rate"],
    ato: ["RTT", "RX/TX bandwidth", "request latency"],
    "skmem.r": ["Recv-Q", "socket drops", "RX bandwidth", "process owner"],
    "skmem.t": ["Send-Q", "pacing_rate", "delivery_rate", "RTO"],
    "skmem.d": ["Recv-Q", "skmem.r", "RX bandwidth", "burst timing"],
    "skmem.d_rate": ["Socket drops", "Recv-Q", "skmem.r", "RX bandwidth bursts"],
    pacing_rate: ["delivery_rate", "cwnd", "Send-Q", "RTO"],
    delivery_rate: ["pacing_rate", "TX bandwidth", "Send-Q", "cwnd"],
    tx_bps: ["Send-Q", "delivery_rate", "pacing_rate", "bytes_acked"],
    rx_bps: ["Recv-Q", "bytes_received", "skmem.r", "drops"],
    bytes_acked: ["TX bandwidth", "segs_out", "delivery_rate"],
    bytes_received: ["RX bandwidth", "segs_in", "Recv-Q"],
    segs_out: ["bytes_acked", "MSS", "retrans"],
    segs_in: ["bytes_received", "Recv-Q", "skmem.r"],
    backoff: ["RTO", "retrans", "Send-Q", "delivery_rate"],
    retrans: ["RTO", "backoff", "RTT variance", "Send-Q"]
  }[metric] || ["RTT", "queues", "process", "peer"];
}

function renderChartMetricTooltip(metric) {
  const t = thresholdFor(metric);
  const color = metricColor(metric);
  const unit = metricUnit(metric) || "raw value";
  const hasThresholds = Number.isFinite(t.warn) || Number.isFinite(t.danger);
  return `<span class="chart-info" tabindex="0" aria-label="${escapeHtml(metricLabel(metric))} metric guide" style="--metric-color:${color}">
    <i class="ri-information-line"></i>
    <span class="chart-tooltip" role="tooltip">
      <span class="tooltip-kicker">Chart metric intelligence</span>
      <strong>${escapeHtml(metricLabel(metric))}</strong>
      <small>${escapeHtml(metricSource(metric))} - unit: ${escapeHtml(unit)}</small>
      <p>${escapeHtml(metricInterpretation(metric))}</p>
      ${hasThresholds ? renderThresholdSummary({ metric, threshold: t }) : `<span class="tooltip-none">No universal warning threshold is applied for this metric.</span>`}
      <div class="chart-tooltip-correlate">
        <b>Correlate with</b>
        <span>${metricCorrelations(metric).map(item => `<em>${escapeHtml(item)}</em>`).join("")}</span>
      </div>
    </span>
  </span>`;
}

function renderActiveTab() {
  if (state.activeTab === "advisor") return renderAdvisor();
  if (state.activeTab === "templates") return renderAnalysisTemplates();
  if (state.activeTab === "map") return renderServiceMap();
  if (state.activeTab === "conversations") return renderConversations();
  if (state.activeTab === "expert") return renderExpertInformation();
  if (state.activeTab === "timeline") return renderTimeline();
  if (state.activeTab === "alerts") return renderAlerting();
  if (state.activeTab === "compare") return renderComparison();
  if (state.activeTab === "groups") return renderGroupedSockets();
  if (state.activeTab === "anomalies") return renderAnomalies(state.anomalies.filter(a => severityVisible(a.severity)));
  if (state.activeTab === "fields") return renderFields();
  return renderSocketTable();
}

function renderAdvisor() {
  if (!state.prefs.deepAnalysis) {
    return `<div class="advisor-empty">
      <i class="ri-brain-line"></i>
      <strong>Deep analysis is paused</strong>
      <p>Enable it to let Ultimate Network Expert turn raw ss counters into prioritized hypotheses, next commands, and mitigation paths.</p>
      <button class="primary" data-action="toggleDeepAnalysis">Enable deep analysis</button>
    </div>`;
  }
  const findings = state.advisorFindings;
  const top = findings[0];
  const hidden = Math.max(0, state.anomalies.length - findings.reduce((sum, finding) => sum + finding.count, 0));
  return `<div class="advisor-shell">
    <section class="advisor-hero">
      <div>
        <span class="tooltip-kicker">Background advisor</span>
        <h3>${escapeHtml(top?.title || "No diagnosis yet")}</h3>
        <p>${escapeHtml(top?.pattern || "Import or parse ss output to generate expert guidance.")}</p>
      </div>
      <div class="advisor-score">
        <span>${formatNumber(findings.length)}</span>
        <small>prioritized finding(s)</small>
      </div>
    </section>
    ${hidden > 0 ? `<div class="advisor-note"><i class="ri-filter-3-line"></i> ${formatNumber(hidden)} lower-level anomaly signals are compressed into higher-value findings to keep the action list readable.</div>` : ""}
    <div class="advisor-grid">
      ${findings.map(renderAdvisorFinding).join("")}
    </div>
  </div>`;
}

function renderAdvisorFinding(finding) {
  return `<article class="advisor-card ${finding.severity}">
    <header>
      <div>
        <span class="risk ${finding.severity}">${escapeHtml(finding.severity)}</span>
        <strong>${escapeHtml(finding.title)}</strong>
      </div>
      <span class="confidence">${escapeHtml(finding.confidence)} confidence</span>
    </header>
    <p>${escapeHtml(finding.why)}</p>
    <div class="evidence-row">
      <span><i class="ri-plug-line"></i> ${formatNumber(finding.count)} socket(s)</span>
      ${finding.processes.length ? `<span><i class="ri-cpu-line"></i> ${escapeHtml(finding.processes.join(", "))}</span>` : ""}
      ${finding.peer.length ? `<span><i class="ri-exchange-line"></i> ${escapeHtml(finding.peer.join(", "))}</span>` : ""}
    </div>
    <div class="advisor-columns">
      <div>
        <b>Next checks</b>
        <ul>${finding.next.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div>
        <b>Mitigation path</b>
        <ul>${finding.mitigate.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
    </div>
    <details>
      <summary><i class="ri-terminal-box-line"></i> Suggested command line evidence</summary>
      <pre class="code">${escapeHtml(finding.commands.join("\n"))}</pre>
    </details>
    <footer>
      ${finding.socketId ? `<button data-jump="${escapeHtml(finding.socketId)}">${icons.focus} Show context row</button>` : ""}
      <button data-action="copyAdvisorCommands" data-finding-id="${escapeHtml(finding.id)}">${icons.copy} Copy commands</button>
    </footer>
  </article>`;
}

function renderAnalysisTemplates() {
  return `<div class="template-workbench">
    <section class="advisor-hero">
      <div>
        <span class="tooltip-kicker">Analysis templates</span>
        <h3>Apply expert context in one click</h3>
        <p>Templates tune filters, table columns, chart widgets, and the starting investigation view for common Linux network workloads.</p>
      </div>
      <div class="advisor-score">
        <span>${formatNumber(Object.keys(ANALYSIS_TEMPLATES).length)}</span>
        <small>templates</small>
      </div>
    </section>
    <div class="template-grid">
      ${Object.entries(ANALYSIS_TEMPLATES).map(([id, template]) => `<article class="template-card">
        <header><i class="${template.icon}"></i><strong>${escapeHtml(template.name)}</strong></header>
        <p>${escapeHtml(template.focus)}</p>
        <div class="template-meta">
          <span>${template.filter ? escapeHtml(template.filter) : "no filter"}</span>
          <span>${formatNumber(template.columns.length)} columns</span>
          <span>${formatNumber(template.charts.length)} charts</span>
        </div>
        <ul>${template.checks.map(check => `<li>${escapeHtml(check)}</li>`).join("")}</ul>
        <footer><button class="primary" data-template-apply="${id}">${icons.focus} Apply template</button></footer>
      </article>`).join("")}
    </div>
  </div>`;
}

function renderSocketTable() {
  if (!state.sockets.length) return `<div class="empty">Paste ss output, then run parsing.</div>`;
  const allRows = sortedFilteredSockets();
  const page = pagedRows(allRows);
  const columns = visibleColumns();
  const pager = renderPagination(allRows.length, page.totalPages, page.start);
  const topPager = ["top", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  const bottomPager = ["bottom", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  return html`${renderGridControls(allRows.length)}${topPager}<div class="table-wrap"><table>
    <thead><tr><th>Actions</th>${columns.map(col => renderHeader(col)).join("")}</tr></thead>
    <tbody>
      ${page.rows.map(s => `<tr data-socket="${escapeHtml(s.id)}" class="${s.id === state.selectedId ? "selected" : ""}">
        <td>${renderRowActions(s)}</td>
        ${columns.map(col => `<td class="${state.table.pinned.includes(col.key) ? "pinned-cell" : ""}">${col.render(s)}</td>`).join("")}
      </tr>`).join("")}
    </tbody>
  </table></div>${bottomPager}`;
}

function renderRowActions(socket) {
  const pos = state.openMenuId === socket.id && state.openMenuPos
    ? `style="left:${state.openMenuPos.left}px;top:${state.openMenuPos.top}px"`
    : "";
  return `<div class="row-actions">
    <button class="icon mini-menu" data-action-menu="${escapeHtml(socket.id)}" title="Socket actions"><i class="ri-menu-3-line"></i></button>
    <div class="row-menu ${state.openMenuId === socket.id ? "open" : ""}" ${pos}>
      <button data-row-action="chart" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-line-chart-line"></i> Go to Chart pane</button>
      <button data-row-action="details" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-search-eye-line"></i> Open details</button>
      <button data-row-action="filter-src" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-filter-3-line"></i> Filter source IP</button>
      <button data-row-action="filter-dst" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-filter-2-line"></i> Filter destination IP</button>
      <button data-row-action="copy" data-socket-id="${escapeHtml(socket.id)}"><i class="ri-file-copy-line"></i> Copy raw row</button>
    </div>
  </div>`;
}

function renderEndpointCell(endpoint, extra = "") {
  const alias = aliasForEndpoint(state.serviceAliases, endpoint);
  if (!alias?.label) return `<span>${escapeHtml(endpoint)}</span>${extra}`;
  return `<div class="endpoint-cell" title="${escapeHtml(endpoint)}">
    <strong>${escapeHtml(alias.label)}</strong>
    ${alias.role ? `<em>${escapeHtml(alias.role)}</em>` : ""}
    <small>${escapeHtml(endpoint)}</small>
    ${extra}
  </div>`;
}

function renderPeerCell(socket) {
  const host = socket.peerAddress?.host || "";
  const intel = state.ipIntel[host];
  const summary = ipIntelSummary(intel);
  const detail = ipIntelDetail(intel);
  return `<div class="peer-cell">
    ${renderEndpointCell(socket.peer)}
    ${summary ? `<small class="ip-intel" title="${escapeHtml(detail || summary)}"><i class="ri-building-4-line"></i> ${escapeHtml(summary)}</small>` : ""}
    ${intel?.status === "loading" ? `<small class="ip-intel loading"><i class="ri-loader-4-line"></i> enriching public IP...</small>` : ""}
  </div>`;
}

function renderHeader(col) {
  const sorted = state.table.sortKey === col.key ? (state.table.sortDir === "asc" ? "ASC" : "DESC") : "";
  const pinned = state.table.pinned.includes(col.key);
  return `<th class="${pinned ? "pinned-head" : ""}" draggable="true" data-col-key="${col.key}">
    <span class="drag-handle" aria-hidden="true">${icons.drag}</span>
    <button class="th-sort" data-sort="${col.key}">${escapeHtml(col.label)} ${sorted}</button>
    <span class="col-tools">
      <button class="mini" data-column-help="${col.key}" title="Column guide" aria-label="Column guide"><i class="ri-information-line"></i></button>
      <button class="mini" data-pin-col="${col.key}" title="${pinned ? "Unpin column" : "Pin column"}" aria-label="${pinned ? "Unpin column" : "Pin column"}">${pinned ? icons.unpin : icons.pin}</button>
      <button class="mini" data-hide-col="${col.key}" title="Hide column" aria-label="Hide column">${icons.hide}</button>
    </span>
    ${renderColumnTooltip(col)}
  </th>`;
}

function columnMetric(key) {
  return {
    recvQ: "recvQ",
    sendQ: "sendQ",
    rtt: "rtt",
    rto: "rto",
    rttvar: "rttvar",
    cwnd: "cwnd",
    ato: "ato",
    tx_bps: "tx_bps",
    rx_bps: "rx_bps",
    pacing_rate: "pacing_rate",
    delivery_rate: "delivery_rate",
    bytes_acked: "bytes_acked",
    bytes_received: "bytes_received",
    segs_out: "segs_out",
    segs_in: "segs_in",
    backoff: "backoff",
    retrans: "retrans",
    "skmem.r": "skmem.r",
    "skmem.t": "skmem.t",
    "skmem.d": "skmem.d"
  }[key] || null;
}

function columnHelp(col) {
  const metric = columnMetric(col.key);
  const threshold = metric ? thresholdFor(metric) : null;
  const metricDoc = metric ? EXPERT_DEFAULT_THRESHOLDS[metric]?.rationale : "";
  const generic = COLUMN_HELP[col.key] || {
    summary: FIELD_DOCS[col.key] || `${col.label} extracted from the parsed ss snapshot.`,
    detail: metricDoc || "Use this column together with queue, timer, process, and endpoint context. A single point can be noisy; repeated elevation across samples is much stronger evidence.",
    use: "Sort, filter, and correlate this field with the same socket in the chart pane."
  };
  return { ...generic, metric, threshold };
}

function renderThresholdSummary(help) {
  if (!help.threshold) return `<span class="tooltip-none">No threshold configured for this column.</span>`;
  const t = help.threshold;
  if (!Number.isFinite(t.warn) && !Number.isFinite(t.danger)) {
    return `<span class="tooltip-none">Monitoring metric: no universal warning or critical threshold is applied.</span>`;
  }
  return `<div class="tooltip-thresholds">
    <span class="comfort"><b>Comfort</b>${formatMetricValue(help.metric, t.comfort)}</span>
    <span class="warning"><b><i class="ri-alert-line"></i> Warning</b>${formatMetricValue(help.metric, t.warn)}</span>
    <span class="danger"><b><i class="ri-alarm-warning-line"></i> Critical</b>${formatMetricValue(help.metric, t.danger)}</span>
    ${t.inverse ? `<small>Lower values are worse.</small>` : `<small>Higher values are worse.</small>`}
  </div>`;
}

function renderColumnTooltip(col) {
  const help = columnHelp(col);
  return `<div class="column-tooltip" role="tooltip">
    <div class="tooltip-kicker">Column intelligence</div>
    <strong>${escapeHtml(col.label)}</strong>
    <p>${escapeHtml(help.summary)}</p>
    ${renderThresholdSummary(help)}
    <button data-column-help="${col.key}" type="button"><i class="ri-expand-diagonal-line"></i> Expand guide</button>
  </div>`;
}

function gridOptionSets() {
  const key = `${state.dataVersion}|${state.sockets.length}`;
  if (state.cache.optionKey === key && state.cache.optionSets) return state.cache.optionSets;
  const optionSets = {
    states: uniqueValues("state"),
    families: uniqueValues("family"),
    srcIps: uniqueSocketValues(s => s.localAddress.host),
    dstIps: uniqueSocketValues(s => s.peerAddress.host),
    srcPorts: uniqueSocketValues(s => s.localAddress.port),
    dstPorts: uniqueSocketValues(s => s.peerAddress.port),
    processes: uniqueSocketValues(s => s.details.process?.name)
  };
  state.cache.optionKey = key;
  state.cache.optionSets = optionSets;
  return optionSets;
}

function renderGridControls(total) {
  const { states, families, srcIps, dstIps, srcPorts, dstPorts, processes } = gridOptionSets();
  return `<div class="grid-controls-shell">
    <div class="grid-controls">
      <select id="riskFilter">${["all", "critical", "high", "medium", "low"].map(v => `<option value="${v}" ${state.table.filters.risk === v ? "selected" : ""}>risk ${v}</option>`).join("")}</select>
      <select id="stateFilter"><option value="all">all states</option>${states.map(v => `<option ${state.table.filters.state === v ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select>
      <select id="familyFilter"><option value="all">all protocols</option>${families.map(v => `<option ${state.table.filters.family === v ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select>
      <input id="processFilter" list="processOptions" placeholder="process" value="${escapeHtml(state.table.filters.process)}" />
      <input id="srcIpFilter" list="srcIpOptions" placeholder="source IP" value="${escapeHtml(state.table.filters.srcIp)}" />
      <input id="dstIpFilter" list="dstIpOptions" placeholder="destination IP" value="${escapeHtml(state.table.filters.dstIp)}" />
      <input id="srcPortFilter" list="srcPortOptions" placeholder="source port" value="${escapeHtml(state.table.filters.srcPort)}" />
      <input id="dstPortFilter" list="dstPortOptions" placeholder="destination port" value="${escapeHtml(state.table.filters.dstPort)}" />
      <input id="minRecvQ" type="number" min="0" placeholder="Recv-Q min (bytes)" value="${escapeHtml(state.table.filters.minRecvQ)}" />
      <input id="minSendQ" type="number" min="0" placeholder="Send-Q min (bytes)" value="${escapeHtml(state.table.filters.minSendQ)}" />
      <input id="minRtt" type="number" min="0" placeholder="RTT min (ms)" value="${escapeHtml(state.table.filters.minRtt)}" />
      <label class="check inline"><input id="onlyAnomalies" type="checkbox" ${state.table.filters.onlyAnomalies ? "checked" : ""}/> anomalies</label>
      <button data-action="clearFilterHistory">Clear history</button>
      <span class="hint">${formatNumber(total)} filtered row(s)</span>
    </div>
    ${renderDatalist("processOptions", processes)}
    ${renderDatalist("srcIpOptions", [...srcIps, ...state.filterHistory.map(h => h.srcIp)])}
    ${renderDatalist("dstIpOptions", [...dstIps, ...state.filterHistory.map(h => h.dstIp)])}
    ${renderDatalist("srcPortOptions", [...srcPorts, ...state.filterHistory.map(h => h.srcPort)])}
    ${renderDatalist("dstPortOptions", [...dstPorts, ...state.filterHistory.map(h => h.dstPort)])}
  </div>`;
}

function renderPagination(total, totalPages, start) {
  if (!total) return `<div class="empty">No socket matches the filters.</div>`;
  const end = Math.min(total, start + state.table.pageSize);
  return `<div class="pager">
    <select class="pager-size" data-page-size title="Rows per page" aria-label="Rows per page">${[10, 20, 50, 100].map(v => `<option value="${v}" ${state.table.pageSize === v ? "selected" : ""}>${v}/p</option>`).join("")}</select>
    <button class="icon" data-page="first" title="First page" aria-label="First page">${icons.first}</button>
    <button class="icon" data-page="prev" title="Previous page" aria-label="Previous page">${icons.previous}</button>
    <span>${formatNumber(start + 1)}-${formatNumber(end)} / ${formatNumber(total)} - page ${state.table.page}/${totalPages}</span>
    <button class="icon" data-page="next" title="Next page" aria-label="Next page">${icons.next}</button>
    <button class="icon" data-page="last" data-total-pages="${totalPages}" title="Last page" aria-label="Last page">${icons.last}</button>
  </div>`;
}

function renderGroupedSockets() {
  const groups = groupedSockets();
  const page = pagedRows(groups);
  if (!groups.length) return `<div class="empty">No group matches the filters.</div>`;
  const pager = renderPagination(groups.length, page.totalPages, page.start);
  const topPager = ["top", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  const bottomPager = ["bottom", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  return `${renderGridControls(groups.length)}${topPager}<div class="table-wrap"><table>
    <thead><tr><th>Max risk</th><th>Snapshots</th><th>Local</th><th>Peer</th><th>Process</th><th>Anomalies</th><th>Max Recv-Q</th><th>Max Send-Q</th><th>Max RTT</th><th>Max RTO</th><th>Max drops</th></tr></thead>
    <tbody>${page.rows.map(g => `<tr data-socket="${escapeHtml(g.socket.id)}" class="${g.socket.id === state.selectedId ? "selected" : ""}">
      <td><span class="risk ${g.maxRisk}">${g.maxRisk}</span></td>
      <td>${formatNumber(g.count)}</td>
      <td>${escapeHtml(g.socket.local)}</td>
      <td>${escapeHtml(g.socket.peer)}</td>
      <td>${escapeHtml(g.socket.details.process ? `${g.socket.details.process.name}:${g.socket.details.process.pid}` : "-")}</td>
      <td>${formatNumber(g.anomalies)}</td>
      <td>${renderTableMetricCell("recvQ", g.maxRecvQ)}</td>
      <td>${renderTableMetricCell("sendQ", g.maxSendQ)}</td>
      <td>${renderTableMetricCell("rtt", g.maxRtt)}</td>
      <td>${renderTableMetricCell("rto", g.maxRto)}</td>
      <td>${renderTableMetricCell("skmem.d", g.maxDrops)}</td>
    </tr>`).join("")}</tbody>
  </table></div>${bottomPager}`;
}

function renderConversations() {
  const conversations = buildConversations();
  const page = pagedRows(conversations);
  if (!conversations.length) return `<div class="empty">No conversation matches the current filters.</div>`;
  const pager = renderPagination(conversations.length, page.totalPages, page.start);
  const topPager = ["top", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  const bottomPager = ["bottom", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  return `<div class="conversation-workbench">
    <div class="expert-strip">
      <article><span>Conversations</span><strong>${formatNumber(conversations.length)}</strong></article>
      <article><span>Critical/high paths</span><strong>${formatNumber(conversations.filter(c => riskRank(c.maxRisk) >= 3).length)}</strong></article>
      <article><span>Total TX</span><strong>${formatMetricValue("tx_bps", conversations.reduce((sum, c) => sum + c.txBps, 0))}</strong></article>
      <article><span>Total RX</span><strong>${formatMetricValue("rx_bps", conversations.reduce((sum, c) => sum + c.rxBps, 0))}</strong></article>
    </div>
    ${renderGridControls(conversations.length)}
    ${topPager}
    <div class="table-wrap"><table>
      <thead><tr><th>Risk</th><th>Flow</th><th>Proto/state</th><th>Process</th><th>Sockets</th><th>Anomalies</th><th>TX</th><th>RX</th><th>Send-Q</th><th>Recv-Q</th><th>RTT</th><th>RTO</th><th>Drops</th></tr></thead>
      <tbody>${page.rows.map(c => `<tr data-socket="${escapeHtml(c.socket.id)}" class="${c.socket.id === state.selectedId ? "selected" : ""}">
        <td><span class="risk ${c.maxRisk}">${c.maxRisk}</span></td>
        <td><div class="flow-cell"><strong>${escapeHtml(c.local)}</strong><span>${icons.arrowRight}</span>${renderPeerEndpoint(c.peer)}</div></td>
        <td><span class="badge ${c.family.includes("udp") ? "udp" : "tcp"}">${escapeHtml(c.family)}</span> ${[...c.states].map(stateName => `<span class="badge ${stateName === "LISTEN" ? "listen" : ""}">${escapeHtml(stateName)}</span>`).join(" ")}</td>
        <td>${escapeHtml([...c.processes].slice(0, 3).join(", ") || "-")}</td>
        <td>${formatNumber(c.count)}</td>
        <td>${renderConversationAnomalyCell(c)}</td>
        <td>${renderTableMetricCell("tx_bps", c.txBps)}</td>
        <td>${renderTableMetricCell("rx_bps", c.rxBps)}</td>
        <td>${renderTableMetricCell("sendQ", c.sendQ)}</td>
        <td>${renderTableMetricCell("recvQ", c.recvQ)}</td>
        <td>${renderTableMetricCell("rtt", c.maxRtt)}</td>
        <td>${renderTableMetricCell("rto", c.maxRto)}</td>
        <td>${renderTableMetricCell("skmem.d", c.drops)}</td>
      </tr>`).join("")}</tbody>
    </table></div>
    ${bottomPager}
  </div>`;
}

function renderConversationAnomalyCell(conv) {
  if (!conv.anomalies) return `<span class="conversation-anomaly-zero">0</span>`;
  const summary = conversationAnomalySummary(conv);
  const pos = state.openConversationInsightKey === conv.key && state.openConversationInsightPos
    ? `style="left:${state.openConversationInsightPos.left}px;top:${state.openConversationInsightPos.top}px"`
    : "";
  const counts = Object.entries(summary.counts).filter(([, count]) => count);
  return `<div class="conversation-anomaly-cell">
    <button class="conversation-anomaly-trigger" data-conversation-insight="${escapeHtml(conv.key)}" aria-label="Open anomaly detail dialog">
      <i class="ri-menu-search-line"></i>
    </button>
    <span class="conversation-anomaly-badge ${summary.dominantSeverity}" aria-label="${escapeHtml(formatConversationAnomalyTitle(conv, summary))}">
      <span>${formatNumber(conv.anomalies)}</span>
      <small>${escapeHtml(summary.dominantSeverity)}</small>
    </span>
    <div class="conversation-insight-popover ${state.openConversationInsightKey === conv.key ? "open" : ""}" ${pos} role="dialog" aria-label="Conversation anomaly details">
      <div class="conversation-insight-titlebar">
        <div class="conversation-insight-head">
          <span class="tooltip-kicker">Conversation anomaly lens</span>
          <strong>${formatNumber(conv.anomalies)} signal(s) on this flow</strong>
          <small>${escapeHtml(conv.local)} -> ${escapeHtml(conv.peer)}</small>
        </div>
        <button class="icon mini" data-conversation-close title="Close anomaly dialog" aria-label="Close anomaly dialog">${icons.x}</button>
      </div>
      <div class="conversation-severity-strip">
        ${counts.map(([severity, count]) => `<span class="${severity}"><b>${escapeHtml(severity)}</b>${formatNumber(count)}</span>`).join("")}
      </div>
      <div class="conversation-metric-strip">
        ${summary.metrics.map(([metric, count]) => `<em>${escapeHtml(metricLabel(metric))}<b>${formatNumber(count)}</b></em>`).join("")}
      </div>
      <div class="conversation-anomaly-list">
        ${summary.topItems.map(item => `<article class="${item.severity}">
          <header><span class="risk ${item.severity}">${escapeHtml(item.severity)}</span><b>${escapeHtml(item.title)}</b><em>${escapeHtml(metricLabel(item.metric || "socket"))}${item.count > 1 ? ` x${formatNumber(item.count)}` : ""}</em></header>
          <p>${escapeHtml(item.detail)}</p>
        </article>`).join("")}
      </div>
      <footer>
        <button data-conversation-action="chart" data-socket-id="${escapeHtml(conv.socket.id)}" data-metric="${escapeHtml(summary.topMetric)}">${icons.chart} Open charts</button>
        <button data-conversation-action="details" data-socket-id="${escapeHtml(conv.socket.id)}">${icons.focus} Socket context</button>
        <button data-conversation-action="anomalies" data-socket-id="${escapeHtml(conv.socket.id)}" data-metric="${escapeHtml(summary.topMetric)}">${icons.alert} Details</button>
      </footer>
    </div>
  </div>`;
}

function formatConversationAnomalyTitle(conv, summary) {
  const counts = Object.entries(summary.counts).filter(([, count]) => count).map(([severity, count]) => `${severity}: ${count}`).join(", ");
  const top = summary.topItems[0];
  return `${conv.anomalies} anomalies (${counts}). Top: ${top?.title || "none"}`;
}

function positionConversationInsight(button) {
  const key = button.dataset.conversationInsight;
  const rect = button.getBoundingClientRect();
  const rowRect = button.closest("tr")?.getBoundingClientRect() || rect;
  const panelWidth = Math.min(620, window.innerWidth - 16);
  const panelHeight = Math.min(520, window.innerHeight - 16);
  const rightSideLeft = rect.right + 12;
  const leftSideLeft = rect.left - panelWidth - 12;
  const preferredLeft = rightSideLeft + panelWidth <= window.innerWidth - 8 ? rightSideLeft : leftSideLeft;
  const left = Math.min(Math.max(8, preferredLeft), window.innerWidth - panelWidth - 8);
  const top = Math.min(Math.max(8, rowRect.top - 12), window.innerHeight - panelHeight - 8);
  state.openConversationInsightKey = key;
  state.openConversationInsightPos = { left: Math.round(left), top: Math.round(top) };
}

function renderPeerEndpoint(endpoint) {
  const address = parseEndpointAddress(endpoint);
  const intel = state.ipIntel[address.host];
  const summary = ipIntelSummary(intel);
  const detail = ipIntelDetail(intel);
  return `<div class="peer-cell">
    <strong>${escapeHtml(endpoint)}</strong>
    ${summary ? `<small class="ip-intel" title="${escapeHtml(detail || summary)}"><i class="ri-building-4-line"></i> ${escapeHtml(summary)}</small>` : ""}
    ${intel?.status === "loading" ? `<small class="ip-intel loading"><i class="ri-loader-4-line"></i> enriching public IP...</small>` : ""}
  </div>`;
}

function parseEndpointAddress(endpoint = "") {
  const text = String(endpoint);
  if (text.startsWith("[")) {
    const idx = text.lastIndexOf("]:");
    return { host: idx > -1 ? text.slice(1, idx) : text.replace(/^\[|\]$/g, "") };
  }
  const idx = text.lastIndexOf(":");
  return { host: idx > -1 ? text.slice(0, idx) : text };
}

function renderServiceMap() {
  const map = buildServiceMap();
  const allNodes = [...map.processes, ...map.locals, ...map.peers];
  if (!allNodes.length) return `<div class="empty">No service map is available for the current filters.</div>`;
  const lanes = [
    { key: "processes", title: "Processes", x: 160, nodes: map.processes },
    { key: "locals", title: "Local sockets", x: 520, nodes: map.locals },
    { key: "peers", title: "Peers", x: 920, nodes: map.peers }
  ];
  const height = Math.max(420, Math.max(...lanes.map(lane => lane.nodes.length)) * 66 + 90);
  const positions = {};
  lanes.forEach(lane => lane.nodes.forEach((node, index) => {
    positions[node.id] = { x: lane.x, y: 74 + index * 66 };
  }));
  const groupBands = serviceMapGroupBands(lanes, positions);
  const visibleEdges = map.edges.filter(edge => positions[edge.from] && positions[edge.mid] && positions[edge.to]).slice(0, 160);
  const hotPaths = [...map.edges].sort((a, b) =>
    riskRank(b.risk) - riskRank(a.risk) ||
    b.anomalies - a.anomalies ||
    b.weight - a.weight
  ).slice(0, 8);
  return `<div class="service-map-workbench">
    <div class="service-map-head">
      <div class="expert-strip">
        <article><span>Processes</span><strong>${formatNumber(map.processes.length)}</strong></article>
        <article><span>Local sockets</span><strong>${formatNumber(map.locals.length)}</strong></article>
        <article><span>Peers</span><strong>${formatNumber(map.peers.length)}</strong></article>
        <article><span>Labels</span><strong>${formatNumber(Object.keys(state.serviceAliases).length)}</strong></article>
        <article><span>Mapped flows</span><strong>${formatNumber(visibleEdges.length)}</strong></article>
      </div>
      <div class="service-map-actions">
        <button class="service-labels-button topology" data-action="topology"><i class="ri-node-tree"></i> Topology</button>
        <button class="service-labels-button" data-action="serviceAliases"><i class="ri-price-tag-3-line"></i> Labels</button>
      </div>
    </div>
    <div class="service-map-layout">
      <div class="service-map-canvas">
        <svg viewBox="0 0 1100 ${height}" role="img" aria-label="Service dependency map">
          ${lanes.map(lane => `<text x="${lane.x}" y="28" class="map-lane-title">${escapeHtml(lane.title)}</text>`).join("")}
          ${groupBands.map(band => `<g class="map-group-band ${escapeHtml(band.group.color)}">
            <rect x="${band.x}" y="${band.y}" width="${band.width}" height="${band.height}" rx="14"/>
            <text x="${band.x + 12}" y="${band.y + 18}">${escapeHtml(band.group.name)}</text>
          </g>`).join("")}
          ${visibleEdges.map(edge => {
            const a = positions[edge.from], b = positions[edge.mid], c = positions[edge.to];
            const color = edge.risk === "critical" ? "#ff5c77" : edge.risk === "high" ? "#ff9f43" : edge.risk === "medium" ? "#ffd166" : "#39d6d6";
            const width = Math.min(5, 1.5 + Math.log10(edge.weight + 1));
            return `<path d="M ${a.x + 146} ${a.y} C ${a.x + 228} ${a.y}, ${b.x - 178} ${b.y}, ${b.x - 146} ${b.y} S ${c.x - 210} ${c.y}, ${c.x - 146} ${c.y}" stroke="${color}" stroke-width="${width}" fill="none" opacity=".38"/>`;
          }).join("")}
          ${lanes.flatMap(lane => lane.nodes.map(node => {
            const p = positions[node.id];
            const fill = node.risk === "critical" ? "#4b1420" : node.risk === "high" ? "#3b220b" : node.risk === "medium" ? "#2b270b" : "#071d24";
            const stroke = node.risk === "critical" ? "#ff5c77" : node.risk === "high" ? "#ff9f43" : node.risk === "medium" ? "#ffd166" : "#39d6d6";
            const aliasAction = node.endpoint ? `data-map-alias="${escapeHtml(node.endpoint)}"` : "";
            const subtitle = nodeSubtitle(node);
            return `<g class="map-node ${node.endpoint ? "editable" : ""}" ${aliasAction}>
              <rect x="${p.x - 146}" y="${p.y - 24}" width="292" height="48" rx="8" fill="${fill}" stroke="${stroke}" opacity=".96"/>
              <text x="${p.x - 134}" y="${subtitle ? p.y - 3 : p.y + 5}" class="map-node-label">${escapeHtml(truncateMiddle(nodeLabel(node), 30))}</text>
              ${subtitle ? `<text x="${p.x - 134}" y="${p.y + 14}" class="map-node-subtitle">${escapeHtml(subtitle)}</text>` : ""}
              ${node.endpoint ? `<text x="${p.x + 112}" y="${p.y + 5}" class="map-node-edit">edit</text>` : ""}
              <circle cx="${p.x + 134}" cy="${p.y}" r="5" fill="${stroke}"/>
            </g>`;
          })).join("")}
        </svg>
      </div>
      <aside class="hot-paths">
        <strong>Hot paths</strong>
        ${hotPaths.map(edge => `<article class="hot-path ${edge.risk}" data-socket="${escapeHtml(edge.socket.id)}">
          <span class="risk ${edge.risk}">${escapeHtml(edge.risk)}</span>
          <p>${escapeHtml(edge.socket.details.process?.name || "unknown")} -> ${escapeHtml(aliasDisplay(edge.socket.peer, state.serviceAliases))}</p>
          ${aliasForEndpoint(state.serviceAliases, edge.socket.peer)?.role ? `<em>${escapeHtml(aliasForEndpoint(state.serviceAliases, edge.socket.peer).role)}</em>` : ""}
          <small>${formatNumber(edge.anomalies)} anomaly signal(s), Send-Q ${formatMetricValue("sendQ", edge.socket.sendQ)}, RTT ${formatMetricValue("rtt", metricValue(edge.socket, "rtt"))}</small>
        </article>`).join("")}
      </aside>
    </div>
  </div>`;
}

function renderExpertInformation() {
  const items = buildExpertInformation();
  if (!items.length) return `<div class="empty">No expert information matches the current filters.</div>`;
  return `<div class="expert-workbench">
    <div class="anomaly-controls">
      <select id="anomalySeverity"><option value="all">all severities</option>${["critical", "high", "medium", "low"].map(v => `<option value="${v}" ${state.anomalyFilters.severity === v ? "selected" : ""}>${v}</option>`).join("")}</select>
      <select id="anomalyMetric"><option value="all">all metrics</option>${[...new Set(state.anomalies.map(item => item.metric).filter(Boolean))].sort().map(v => `<option value="${escapeHtml(v)}" ${state.anomalyFilters.metric === v ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select>
      <select id="anomalySort">${[
        ["priority", "priority"],
        ["metric", "metric"],
        ["title", "title"],
        ["socket", "socket context"]
      ].map(([value, label]) => `<option value="${value}" ${state.anomalyFilters.sort === value ? "selected" : ""}>sort ${label}</option>`).join("")}</select>
      <input id="anomalyText" placeholder="filter expert title, detail, metric..." value="${escapeHtml(state.anomalyFilters.text)}" />
      <span class="hint">${formatNumber(items.length)} grouped expert item(s)</span>
    </div>
    <div class="expert-list">
      ${items.map(item => `<article class="expert-item ${item.severity}">
        <div class="expert-severity"><span class="risk ${item.severity}">${escapeHtml(item.severity)}</span><strong>${formatNumber(item.count)}</strong></div>
        <div>
          <header><strong>${escapeHtml(item.title)}</strong><span class="metric-chip">${escapeHtml(item.metric || "socket")}</span></header>
          <p>${escapeHtml(item.detail)}</p>
          <div class="evidence-row">
            ${item.processes.size ? `<span><i class="ri-cpu-line"></i> ${escapeHtml([...item.processes].slice(0, 4).join(", "))}</span>` : ""}
            ${item.peers.size ? `<span><i class="ri-exchange-line"></i> ${escapeHtml([...item.peers].slice(0, 4).join(", "))}</span>` : ""}
          </div>
        </div>
        <footer>${item.socketId ? `<button data-jump="${escapeHtml(item.socketId)}">${icons.focus} Inspect</button>` : ""}</footer>
      </article>`).join("")}
    </div>
  </div>`;
}

function renderTimeline() {
  const events = buildTimelineEvents();
  if (!events.length) return `<div class="empty">No timeline event is available. Import timestamped snapshots for a stronger time-based view.</div>`;
  const first = events[0]?.epochMs || Date.now();
  const last = events[events.length - 1]?.epochMs || first;
  return `<div class="timeline-workbench">
    <div class="expert-strip">
      <article><span>Events</span><strong>${formatNumber(events.length)}</strong></article>
      <article><span>Window</span><strong>${formatNumber(Math.max(0, Math.round((last - first) / 1000)))}s</strong></article>
      <article><span>High/Critical</span><strong>${formatNumber(events.filter(event => riskRank(event.severity) >= 3).length)}</strong></article>
    </div>
    <div class="timeline-list">
      ${events.map(event => `<article class="timeline-event ${event.severity}">
        <div class="timeline-pin"></div>
        <div class="timeline-time"><strong>${escapeHtml(formatTimelineTime(event))}</strong><span>t+${formatNumber(event.t || 0)}s</span></div>
        <div class="timeline-body">
          <header><span class="risk ${event.severity}">${escapeHtml(event.severity)}</span><strong>${escapeHtml(event.title)}</strong><span class="metric-chip">${escapeHtml(event.metric)}</span></header>
          <p>${escapeHtml(event.detail)}</p>
        </div>
        <footer>${event.socketId ? `<button data-jump="${escapeHtml(event.socketId)}">${icons.focus} Context</button>` : ""}</footer>
      </article>`).join("")}
    </div>
  </div>`;
}

function renderAlerting() {
  const active = state.alertEvents.filter(event => !event.acknowledged);
  const acked = state.alertEvents.filter(event => event.acknowledged);
  const metrics = alphabeticalMetrics(["sendQ", "recvQ", "rtt", "rto", "skmem.d", "skmem.r", "skmem.t", "cwnd", "tx_bps", "rx_bps", "backoff", "retrans"]);
  return `<div class="alert-workbench">
    <div class="expert-strip">
      <article><span>Active alerts</span><strong>${formatNumber(active.length)}</strong></article>
      <article><span>Acknowledged</span><strong>${formatNumber(acked.length)}</strong></article>
      <article><span>Enabled rules</span><strong>${formatNumber(state.alertRules.filter(rule => rule.enabled).length)}</strong></article>
      <article><span>Total rules</span><strong>${formatNumber(state.alertRules.length)}</strong></article>
    </div>
    <section class="alert-rule-builder">
      <input id="alertRuleName" placeholder="Rule name" />
      <select id="alertRuleMetric">${metrics.map(metric => `<option value="${metric}">${escapeHtml(metricLabel(metric))}</option>`).join("")}</select>
      <select id="alertRuleOp">${[">=", ">", "<=", "<", "=", "!="].map(op => `<option value="${escapeHtml(op)}">${escapeHtml(op)}</option>`).join("")}</select>
      <input id="alertRuleValue" type="number" min="0" placeholder="Threshold" />
      <select id="alertRuleSeverity">${["critical", "high", "medium", "low"].map(sev => `<option value="${sev}">${sev}</option>`).join("")}</select>
      <button class="primary" data-action="addAlertRule">${icons.alert} Add rule</button>
    </section>
    <section class="alert-layout">
      <div class="alert-column">
        <div class="panel-title">Triggered alerts</div>
        <div class="alert-list">
          ${state.alertEvents.length ? state.alertEvents.map(event => `<article class="alert-event ${event.severity} ${event.acknowledged ? "ack" : ""}">
            <header><span class="risk ${event.severity}">${escapeHtml(event.severity)}</span><strong>${escapeHtml(event.ruleName)}</strong><span class="metric-chip">${escapeHtml(metricLabel(event.metric))}</span></header>
            <p>${escapeHtml(event.socket.local)} -> ${escapeHtml(event.socket.peer)}</p>
            <p>${escapeHtml(metricLabel(event.metric))}: ${formatMetricValue(event.metric, event.value)} ${escapeHtml(event.op)} ${formatMetricValue(event.metric, event.threshold)}</p>
            <footer>
              <button data-jump="${escapeHtml(event.socketId)}">${icons.focus} Context</button>
              <button data-alert-ack="${escapeHtml(event.id)}">${event.acknowledged ? icons.reset : icons.saveDisk} ${event.acknowledged ? "Unack" : "Ack"}</button>
            </footer>
          </article>`).join("") : `<div class="empty">No alert currently matches the configured rules.</div>`}
        </div>
      </div>
      <div class="alert-column">
        <div class="panel-title">Rules</div>
        <div class="rule-list">
          ${state.alertRules.map(rule => `<article class="rule-card ${rule.enabled ? "" : "muted-card"}">
            <label class="check inline"><input type="checkbox" data-alert-rule-toggle="${escapeHtml(rule.id)}" ${rule.enabled ? "checked" : ""}/> ${escapeHtml(rule.name)}</label>
            <p><span class="risk ${rule.severity}">${escapeHtml(rule.severity)}</span> ${escapeHtml(metricLabel(rule.metric))} ${escapeHtml(rule.op)} ${formatMetricValue(rule.metric, rule.value)}</p>
            <button class="icon" data-alert-rule-delete="${escapeHtml(rule.id)}" title="Delete rule">${icons.trash}</button>
          </article>`).join("")}
        </div>
        <div class="toolbar"><button data-action="ackAllAlerts">${icons.saveDisk} Ack all active</button><button data-action="resetAlertRules">${icons.reset} Restore defaults</button></div>
      </div>
    </section>
  </div>`;
}

function renderComparison() {
  const comparison = buildComparison();
  if (!comparison) {
    return `<div class="compare-empty">
      <i class="ri-scales-3-line"></i>
      <strong>No baseline yet</strong>
      <p>Click Set baseline after parsing a known-good or before-change capture. Then import or parse the after-change capture and return here.</p>
      <button class="primary" data-action="setBaseline"><i class="ri-scales-3-line"></i> Set current capture as baseline</button>
    </div>`;
  }
  const s = comparison.summary;
  const rows = comparison.rows.slice(0, 80);
  return `<div class="compare-workbench">
    <div class="compare-header">
      <div>
        <span class="tooltip-kicker">Before / after</span>
        <h3>${escapeHtml(state.baseline.sourceName)} -> ${escapeHtml(state.sourceName)}</h3>
        <p>Baseline captured ${escapeHtml(new Date(state.baseline.createdAt).toLocaleString(resolvedNumberLocale()))}</p>
      </div>
      <div class="toolbar"><button data-action="setBaseline"><i class="ri-scales-3-line"></i> Replace baseline</button><button data-action="clearBaseline">${icons.clear} Clear baseline</button></div>
    </div>
    <div class="expert-strip">
      <article><span>Before</span><strong>${formatNumber(s.before)}</strong></article>
      <article><span>After</span><strong>${formatNumber(s.after)}</strong></article>
      <article><span>New/Gone</span><strong>${formatNumber(s.added)} / ${formatNumber(s.removed)}</strong></article>
      <article><span>Worse/Better</span><strong>${formatNumber(s.worsened)} / ${formatNumber(s.improved)}</strong></article>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Status</th><th>Flow</th><th>Risk</th><th>Send-Q delta</th><th>Recv-Q delta</th><th>RTT delta</th><th>RTO delta</th><th>Drops delta</th><th>TX delta</th><th>RX delta</th></tr></thead>
      <tbody>${rows.map(row => {
        const current = row.after || row.before;
        return `<tr class="compare-row ${row.status}">
          <td><span class="compare-status ${row.status}">${escapeHtml(row.status)}</span></td>
          <td>${escapeHtml(current.local)} -> ${escapeHtml(current.peer)}<br><span class="hint">${escapeHtml(current.process || "-")}</span></td>
          <td>${row.before ? `<span class="risk ${row.before.risk}">${row.before.risk}</span>` : "-"} ${icons.arrowRight} ${row.after ? `<span class="risk ${row.after.risk}">${row.after.risk}</span>` : "-"}</td>
          <td>${renderDelta("sendQ", row.deltas.sendQ)}</td>
          <td>${renderDelta("recvQ", row.deltas.recvQ)}</td>
          <td>${renderDelta("rtt", row.deltas.rtt)}</td>
          <td>${renderDelta("rto", row.deltas.rto)}</td>
          <td>${renderDelta("skmem.d", row.deltas.drops)}</td>
          <td>${renderDelta("tx_bps", row.deltas.tx_bps)}</td>
          <td>${renderDelta("rx_bps", row.deltas.rx_bps)}</td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>
  </div>`;
}

function renderDelta(metric, value) {
  const cls = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const sign = value > 0 ? "+" : "";
  return `<span class="delta ${cls}">${sign}${formatMetricValue(metric, value)}</span>`;
}

function renderAnomalies(items) {
  const filtered = filteredAnomalies(items);
  const metrics = [...new Set(items.map(item => item.metric).filter(Boolean))].sort();
  return `<div class="anomaly-workbench">
    <div class="anomaly-controls">
      <select id="anomalySeverity"><option value="all">all severities</option>${["critical", "high", "medium", "low"].map(v => `<option value="${v}" ${state.anomalyFilters.severity === v ? "selected" : ""}>${v}</option>`).join("")}</select>
      <select id="anomalyMetric"><option value="all">all metrics</option>${metrics.map(v => `<option value="${escapeHtml(v)}" ${state.anomalyFilters.metric === v ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select>
      <select id="anomalySort">${[
        ["priority", "priority"],
        ["metric", "metric"],
        ["title", "title"],
        ["socket", "socket context"]
      ].map(([value, label]) => `<option value="${value}" ${state.anomalyFilters.sort === value ? "selected" : ""}>sort ${label}</option>`).join("")}</select>
      <input id="anomalyText" placeholder="filter title, detail, metric..." value="${escapeHtml(state.anomalyFilters.text)}" />
      <span class="hint">${formatNumber(filtered.length)} / ${formatNumber(items.length)} shown</span>
    </div>
    ${filtered.length ? `<div class="anomaly-list dense">${filtered.map(a => `<article class="anomaly ${a.severity}">
      <header><strong><span class="risk ${a.severity}">${a.severity}</span> ${escapeHtml(a.title)}</strong><span class="metric-chip">${escapeHtml(a.metric || "socket")}</span></header>
      <p>${escapeHtml(a.detail)}</p>
      <footer><button data-jump="${escapeHtml(a.socketId)}"><i class="ri-focus-3-line"></i> View context</button></footer>
    </article>`).join("")}</div>` : `<div class="empty">No anomaly matches the current filters.</div>`}
  </div>`;
}

function filteredAnomalies(items) {
  const f = state.anomalyFilters;
  const rank = { critical: 4, high: 3, medium: 2, low: 1 };
  return items.filter(item => {
    if (f.severity !== "all" && item.severity !== f.severity) return false;
    if (f.metric !== "all" && item.metric !== f.metric) return false;
    const haystack = `${item.title} ${item.detail} ${item.metric} ${item.socketId}`.toLowerCase();
    return !f.text || haystack.includes(f.text.toLowerCase());
  }).sort((a, b) => {
    if (f.sort === "metric") return String(a.metric).localeCompare(String(b.metric)) || rank[b.severity] - rank[a.severity];
    if (f.sort === "title") return a.title.localeCompare(b.title) || rank[b.severity] - rank[a.severity];
    if (f.sort === "socket") return String(a.socketId).localeCompare(String(b.socketId)) || rank[b.severity] - rank[a.severity];
    return rank[b.severity] - rank[a.severity] || a.title.localeCompare(b.title);
  });
}

function renderFields() {
  const entries = Object.entries(FIELD_DOCS).sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const midpoint = Math.ceil(entries.length / 2);
  const columns = [entries.slice(0, midpoint), entries.slice(midpoint)];
  return `<div class="field-directory">
    ${columns.map((items, index) => `<section class="field-column" aria-label="Fields ${index === 0 ? "A-M" : "N-Z"}">
      ${items.map(([key, text]) => renderFieldDocCard(key, text)).join("")}
    </section>`).join("")}
  </div>`;
}

function renderFieldDocCard(key, text) {
  const sentences = String(text || "").split(/(?<=\.)\s+/).filter(Boolean);
  const body = sentences.length > 1
    ? `<p>${escapeHtml(sentences[0])}</p><ul>${sentences.slice(1).map(sentence => `<li>${escapeHtml(sentence)}</li>`).join("")}</ul>`
    : `<p>${escapeHtml(text)}</p>`;
  return `<article class="field-card field-doc-card"><strong>${escapeHtml(key)}</strong>${body}</article>`;
}

function renderRightPane() {
  const selected = state.sockets.find(s => s.id === state.selectedId);
  return html`
    <section class="section">
      <h2>Priority anomalies</h2>
      ${renderAnomalies(state.anomalies.filter(a => severityVisible(a.severity)).slice(0, 5))}
    </section>
    <section class="section">
      <h2>Selected socket</h2>
      ${selected ? renderSocketDetail(selected) : `<div class="empty">No socket selected.</div>`}
    </section>
  `;
}

function renderSocketDetail(s) {
  return html`
    <div class="field-list">
      ${renderSocketInsights(s)}
      <div class="field-card"><strong>${escapeHtml(s.local)} -> ${escapeHtml(s.peer)}</strong>${renderPeerIntelCard(s)}<p>${escapeHtml(s.raw)}</p></div>
      <div class="field-card"><strong>Internal TCP</strong><p>${renderMetricFields(s, Object.entries(s.details.values).filter(([, v]) => typeof v !== "object")) || "No -i field detected."}</p></div>
      <div class="field-card"><strong>Socket memory</strong><p>${renderMetricFields(s, Object.entries(s.details.skmem).map(([k, v]) => [`skmem.${k}`, v])) || "Add -m for skmem."}</p></div>
    </div>
  `;
}

function renderMetricFields(socket, entries) {
  return entries.map(([key, value]) => {
    const metric = key === "send" ? "pacing_rate" : key;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return `<span class="metric-token">${escapeHtml(key)}=${escapeHtml(value)}</span>`;
    const cls = thresholdSeverity(metric, numeric);
    return `<span class="metric-token ${cls}" title="${escapeHtml(metricLabel(metric))}: ${formatMetricValue(metric, numeric)}">${escapeHtml(key)}=${formatMetricValue(metric, numeric)}</span>`;
  }).join(" ");
}

function renderPeerIntelCard(socket) {
  const host = socket.peerAddress?.host || "";
  const intel = state.ipIntel[host];
  const summary = ipIntelSummary(intel);
  const detail = ipIntelDetail(intel);
  if (!summary && intel?.status !== "loading") return "";
  return `<div class="ip-intel-card">
    <strong><i class="ri-building-4-line"></i> Public IP intelligence</strong>
    ${intel?.status === "loading" ? `<p>Looking up public registry and reverse DNS data in the background.</p>` : `<p>${escapeHtml(summary)}</p>`}
    ${detail ? `<pre>${escapeHtml(detail)}</pre>` : ""}
    <small>Attribution comes from public registry/reverse-DNS data and may identify the owner, carrier, cloud, datacenter, or intermediary, not always the final business user.</small>
  </div>`;
}

function socketInsights(socket) {
  const insights = [];
  const rtt = metricValue(socket, "rtt");
  const rto = metricValue(socket, "rto");
  const drops = metricValue(socket, "skmem.d");
  const recvPressure = socket.details.skmem.rb ? (socket.details.skmem.r || 0) / socket.details.skmem.rb : 0;
  const sendPressure = socket.details.skmem.tb ? ((socket.details.skmem.t || 0) + (socket.details.skmem.w || 0)) / socket.details.skmem.tb : 0;
  if (socket.sendQ > 262144 && rtt > 100) insights.push(["Slow peer or congested path", "Local side has a large Send-Q while RTT is elevated. The peer may be reading slowly, the network path may be congested, or pacing/congestion control is limiting sends."]);
  if (socket.recvQ > 131072) insights.push(["Local slow consumer", "Recv-Q is high. The local application or kernel path is not draining data fast enough. Check process CPU, event loop stalls, disk writes, or backpressure handling."]);
  if (recvPressure > 0.8) insights.push(["Receive buffer pressure", "Socket receive memory is above 80% of its limit. Consider whether the application is consuming slowly or tcp_rmem limits are too low for the path."]);
  if (sendPressure > 0.8) insights.push(["Transmit buffer pressure", "Socket transmit memory is near the cap. This often points to peer slow-consumption, congestion, or an application writing faster than the network can drain."]);
  if (drops > 0) insights.push(["Socket drops detected", "Drops in skmem indicate packets were discarded before delivery. Investigate receive pressure, backlog pressure, CPU softirq saturation, or buffer sizing."]);
  if (rto > 1000) insights.push(["Retransmission timeout risk", "High RTO means loss or severe jitter may be present. Correlate with retransmission timers, backoff, RTT variance, and network interface errors."]);
  if (!insights.length) insights.push(["No obvious bottleneck", "No major queue, memory, drop, or RTT symptom is visible for this socket in the current snapshot. Use the Charts tab to inspect evolution over time."]);
  return insights;
}

function renderSocketInsights(socket) {
  return `<div class="insight-list">${socketInsights(socket).map(([title, text]) => `<article class="field-card insight-card"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></article>`).join("")}</div>`;
}

function renderDrawer() {
  const selected = state.sockets.find(s => s.id === state.selectedId);
  const title = state.drawer === "prefs" ? "Preferences" : state.drawer === "guide" ? "Expert guide" : state.drawer === "thresholds" ? "Threshold configuration" : "Socket details";
  const body = state.drawer === "prefs"
    ? renderPrefs()
    : state.drawer === "guide"
      ? renderGuide()
      : state.drawer === "thresholds"
        ? renderThresholdConfig()
        : selected ? renderSocketDetail(selected) + `<pre class="code">${escapeHtml(JSON.stringify(selected, null, 2))}</pre>` : `<div class="empty">Select a socket.</div>`;
  const headerAction = state.drawer === "thresholds"
    ? `<div class="drawer-actions"><button class="compact-action" data-action="resetThresholdDefaults">${icons.reset} Defaults</button><button class="primary compact-action" data-action="saveThresholds">${icons.saveDisk} Save</button></div>`
    : "";
  return html`<aside class="drawer ${state.drawer ? "open" : ""} ${state.drawer === "thresholds" ? "wide" : ""}">
    <header><div class="drawer-title"><strong>${title}</strong>${headerAction}</div><button class="icon" data-action="closeDrawer">${icons.x}</button></header>
    <main>${body}</main>
  </aside>`;
}

function renderPrefs() {
  const tab = state.prefsTab || "display";
  const realTimeline = hasRealTimestampHistory();
  const localeChoices = [
    ["auto", `Browser default (${resolvedNumberLocale()})`],
    ["en-US", "English - United States"],
    ["fr-FR", "French - France"],
    ["de-DE", "German - Germany"],
    ["en-GB", "English - United Kingdom"]
  ];
  return html`<div class="prefs-shell">
    <div class="tabs pref-tabs">
      ${[
        ["display", "Display"],
        ["table", "Table"],
        ["charts", "Charts"],
        ["system", "System"],
        ["alerts", "Alerts"]
      ].map(([key, label]) => `<button class="tab ${tab === key ? "active" : ""}" data-pref-tab="${key}">${label}</button>`).join("")}
    </div>
    <div class="pref-grid professional">
      ${tab === "display" ? `<article class="field-card">
        <strong>Number and visual formatting</strong>
        <p class="hint">All counters, queues, chart ticks, threshold summaries, file sizes, and pagination totals use this locale-aware formatter.</p>
        <label>Number locale<select id="prefNumberLocale">${localeChoices.map(([value, label]) => `<option value="${value}" ${state.prefs.numberLocale === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <label class="check"><input id="prefNumberGrouping" type="checkbox" ${state.prefs.numberGrouping ? "checked" : ""}/> Use thousands separators</label>
        <label class="check"><input id="prefColorBlind" type="checkbox" ${state.prefs.colorBlind ? "checked" : ""}/> Enhanced color-blind palette</label>
        <div class="format-preview"><span>Preview</span><strong>${formatNumber(1048576)}</strong><strong>${formatNumber(262144.75)}</strong></div>
      </article>` : ""}
      ${tab === "table" ? `<article class="field-card">
        <strong>Table ergonomics</strong>
        <label class="check"><input id="prefCompact" type="checkbox" ${state.prefs.compactRows ? "checked" : ""}/> Compact tables</label>
        <label class="check"><input id="prefTableUnits" type="checkbox" ${state.prefs.tableUnits ? "checked" : ""}/> Show units in table cells</label>
        <label>Pagination controls position<select id="prefPagination">${["top", "bottom", "both"].map(v => `<option value="${v}" ${state.prefs.paginationPosition === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label>Default rows per page<select id="prefPageSize">${[10, 20, 50, 100].map(v => `<option value="${v}" ${state.prefs.defaultPageSize === v ? "selected" : ""}>${v} rows</option>`).join("")}</select></label>
        <div class="pref-button-row">
          <button data-action="columns">${icons.columns} Configure columns</button>
          <button data-action="resetGrid">${icons.reset} Reset grid</button>
        </div>
      </article>` : ""}
      ${tab === "charts" ? `<article class="field-card">
        <strong>Chart defaults</strong>
        <p class="hint">Timestamped captures always use their real timestamps. Synthetic settings are only a fallback for a single non-timestamped ss snapshot.</p>
        <label>Chart timezone<select id="prefChartTimeZone">${renderTimeZoneOptions()}</select></label>
        <label>Point size<select id="prefChartPointSize">
          ${["XS", "S", "M", "L"].map(size => `<option value="${size}" ${state.prefs.chartPointSize === size ? "selected" : ""}>${size}${size === "XS" ? " - 1 px" : ""}</option>`).join("")}
        </select></label>
        <div class="synthetic-pref ${realTimeline ? "disabled" : ""}">
          <div>
            <strong>Fallback for data without timestamps</strong>
            <p class="hint">${realTimeline ? "Current workspace has real timestamps, so this fallback is not used." : "Used only to draw a visual preview when the pasted ss data has no timestamped samples."}</p>
          </div>
          <div class="range-row"><label>Preview points</label><input id="prefWindow" type="number" min="6" max="240" value="${state.prefs.graphWindow}" ${realTimeline ? "disabled" : ""}/></div>
        </div>
        <button data-action="thresholds">${icons.threshold} Configure thresholds</button>
        <button data-action="layoutPrefs">${icons.layout} Configure chart layout</button>
      </article>` : ""}
      ${tab === "system" ? `<article class="field-card">
        <strong>Linux collection target</strong>
        <p class="hint">These settings adapt collection commands, Advisor recommendations, and namespace warnings. They do not change the parsed ss data.</p>
        <label>Runtime profile<select id="prefLinuxProfile">
          <option value="lxc" ${state.prefs.linuxProfile === "lxc" ? "selected" : ""}>Linux Container LXC/LXD</option>
          <option value="native" ${state.prefs.linuxProfile === "native" ? "selected" : ""}>Linux Ubuntu native</option>
        </select></label>
        <label>Access role<select id="prefAccessRole">
          ${Object.entries(ACCESS_ROLES).map(([value, role]) => `<option value="${value}" ${state.prefs.accessRole === value ? "selected" : ""}>${role.label}</option>`).join("")}
        </select></label>
        <label>Ubuntu baseline<select id="prefUbuntuVersion">
          ${Object.entries(UBUNTU_PROFILES).map(([value, label]) => `<option value="${value}" ${state.prefs.ubuntuVersion === value ? "selected" : ""}>${label}</option>`).join("")}
        </select></label>
        <div class="system-note">
          <strong>${escapeHtml(linuxProfileLabel())} - ${escapeHtml(accessRoleLabel())} - ${escapeHtml(ubuntuProfileLabel())}</strong>
          <p>${escapeHtml(ACCESS_ROLES[state.prefs.accessRole]?.note || ACCESS_ROLES.analyst.note)}</p>
          <p>${escapeHtml(LINUX_PROFILES[state.prefs.linuxProfile]?.note || LINUX_PROFILES.lxc.note)}</p>
        </div>
      </article>` : ""}
      ${tab === "alerts" ? `<article class="field-card">
        <strong>Alert behavior</strong>
        <label class="check"><input id="prefDeepAnalysis" type="checkbox" ${state.prefs.deepAnalysis ? "checked" : ""}/> Run advanced advisor in the background</label>
        <label>Anomaly visibility floor<select id="prefSeverity">${["low", "medium", "high", "critical"].map(s => `<option ${state.prefs.severityFloor === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        <label class="check"><input id="prefToast" type="checkbox" ${state.prefs.autoToast ? "checked" : ""}/> Automatic toasts for important anomalies</label>
      </article>` : ""}
    </div>
    <div class="pref-actions"><button class="primary" data-action="savePrefs">${icons.saveDisk} Save preferences</button></div>
  </div>`;
}

function renderTimeZoneOptions() {
  const current = state.prefs.chartTimeZone || "auto";
  return `<option value="auto" ${current === "auto" ? "selected" : ""}>Browser timezone (${escapeHtml(resolvedTimeZone())})</option>`
    + timeZoneOptions().map(zone => `<option value="${escapeHtml(zone)}" ${current === zone ? "selected" : ""}>${escapeHtml(zone)}</option>`).join("");
}

function renderGuide() {
  const tab = state.guideTab || "best";
  const hostEvidence = isAnalystRole()
    ? envCommand("ip -s link show\nbridge link\ntc -s qdisc show\nethtool -S <iface> | egrep -i 'drop|err|timeout|reset|miss|crc'", { host: true })
    : isLxcProfile()
      ? "ip -s link show\nbridge link\nlxc network list\nlxc config show <container> --expanded\ntc -s qdisc show"
      : "ip -s link show\ntc -s qdisc show\nethtool -S <iface>";
  const commands = [
    ["Maximum collection", envCommand("ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all")],
    ["Established TCP with timers", envCommand("ss -HOntepmi --tos --cgroup --inet-sockopt -o state established")],
    ["Sampling every t seconds", envCommand("t=5; while true; do date --iso-8601=ns; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep \"$t\"; done | tee -a ss-timeseries.log")],
    ["Sampling every t milliseconds", envCommand("t_ms=250; while true; do date --iso-8601=ns; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep \"$(awk \\\"BEGIN { print $t_ms / 1000 }\\\")\"; done | tee -a ss-timeseries-ms.log")],
    ["Epoch timestamp in milliseconds", envCommand("t_ms=500; while true; do printf 'EPOCH_MS=%s\\n' \"$(date +%s%3N)\"; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep \"$(awk \\\"BEGIN { print $t_ms / 1000 }\\\")\"; done >> ss-epoch-ms.log")],
    ["Quick kernel summary", envCommand("ss -s")],
    ["Top listening ports", envCommand("ss -Hlnptu")],
    [isAnalystRole() ? "Ops handoff: host-side evidence to request" : "Host-side LXD evidence", hostEvidence],
    ["Compressed long-running collection", envCommand("t=10; while true; do date --iso-8601=ns; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep \"$t\"; done | gzip -c >> ss-timeseries.log.gz")]
  ];
  return html`<div class="guide-shell">
    <div class="tabs guide-tabs">
      ${[
        ["best", "Best practices"],
        ["cases", "Use cases"],
        ["commands", "Commands"],
        ["fields", "Fields"],
        ["refs", "References"]
      ].map(([key, label]) => `<button class="tab ${tab === key ? "active" : ""}" data-guide-tab="${key}">${label}</button>`).join("")}
    </div>
    <div class="guide-list">
      <article class="guide-card system-context"><strong>${escapeHtml(linuxProfileLabel())} / ${escapeHtml(accessRoleLabel())} / ${escapeHtml(ubuntuProfileLabel())}</strong><p>${escapeHtml(ACCESS_ROLES[state.prefs.accessRole]?.note || ACCESS_ROLES.analyst.note)}</p><p>${escapeHtml(LINUX_PROFILES[state.prefs.linuxProfile]?.note || LINUX_PROFILES.lxc.note)}</p></article>
      ${tab === "best" ? renderGuideBestPractices() : ""}
      ${tab === "cases" ? renderGuideUseCases() : ""}
      ${tab === "commands" ? commands.map(([title, cmd]) => `<article class="guide-card"><strong>${escapeHtml(title)}</strong><pre class="code">${escapeHtml(cmd)}</pre></article>`).join("") : ""}
      ${tab === "fields" ? renderFields() : ""}
      ${tab === "refs" ? renderGuideReferences() : ""}
    </div>
  </div>`;
}

function renderGuideBestPractices() {
  return `
    <article class="guide-card"><strong>1. Collect the right fields first</strong><p>Start with -H -O -n -t -u -e -p -m -i --tos --cgroup --inet-sockopt -a -A all. In analyst mode, run it from inside the container without sudo; process fields may be partial. Ops/root can add sudo or lxc exec when needed.</p></article>
    ${isLxcProfile() ? `<article class="guide-card"><strong>2. LXC/LXD namespace rule</strong><p>${isAnalystRole() ? "Default analyst mode: run ss, ip route, and local checks inside the container. If symptoms point to host path loss, request host veth, bridge, qdisc, ethtool, and softnet evidence from ops/root." : "Ops/root mode: collect socket evidence with lxc exec, then collect route, veth, bridge, qdisc, ethtool, and softnet evidence on the LXD host."}</p></article>` : ""}
    <article class="guide-card"><strong>2. Keep collection overhead under control</strong><p>For thousands of sockets, prefer -n -H -O, filter by state/sport/dport/dev/cgroup, and increase the sampling interval. Avoid name resolution and expensive BPF details unless needed.</p></article>
    <article class="guide-card"><strong>3. Always timestamp snapshots</strong><p>Use date --iso-8601=ns or EPOCH_MS before every ss snapshot so queues, RTT, RTO, drops, and buffer pressure can be correlated over time.</p></article>
    <article class="guide-card"><strong>4. Store raw evidence</strong><p>Write to .log, .gz, or .zip so you can re-run analysis offline and compare with application, host, and network telemetry.</p></article>`;
}

function renderGuideUseCases() {
  const cases = [
    {
      title: "1. Slow consumer or congested send path",
      summary: "Start here when Send-Q, skmem.t, or transmit memory grows. The key question is whether the peer is slow, the path is congested, or the local application is overproducing.",
      signals: ["Send-Q rising over time", "skmem.t or skmem.w near transmit limits", "TX bandwidth flat or falling", "RTO/backoff rising", "cwnd or pacing_rate collapsing"],
      decide: [
        "Send-Q high + RTO/backoff high + low cwnd: investigate network loss, shaping, qdisc, MTU, or route instability.",
        "Send-Q high + RTO normal + one peer affected: suspect peer slow-consumption or peer-side application latency.",
        "Send-Q high across many peers + local process writes heavily: suspect local producer/backpressure design.",
        "TX bandwidth low while delivery_rate/pacing_rate low: TCP is limiting the flow, not just the application."
      ],
      next: ["Open Charts: Send-Q vs TX bandwidth, Send-Q vs RTO, cwnd vs pacing rate.", "Group by peer. If one peer dominates, investigate that remote side first.", "On LXC/LXD, confirm host veth/bridge/qdisc/NIC counters before tuning container buffers."],
      commands: [commandForPeer(state.sockets[0]), envCommand("ss -tinpm state established"), envCommand("ip -s route get <peer-ip>", { host: true }), envCommand("tc -s qdisc show", { host: true }), envCommand("nstat -az | egrep 'Retrans|Timeout|TCPLoss|TCPAbort'", { host: true })],
      mitigation: "Apply backpressure or rate limits first. Increase tcp_wmem only after proving memory headroom and after ruling out loss/qdisc/peer slowness."
    },
    {
      title: "2. Local application not reading fast enough",
      summary: "Use this path when Recv-Q or receive socket memory grows. The likely owner is often the local process, runtime, scheduler, or worker pool.",
      signals: ["Recv-Q sustained above warning", "skmem.r or skmem.rb high", "RX bandwidth continues while application-level throughput stalls", "Drops appear after receive bursts", "One process or one local port dominates"],
      decide: [
        "Recv-Q high + process concentrated on one service: inspect that PID, event loop, worker pool, GC, blocking I/O, or database/file dependencies.",
        "Recv-Q high + CPU run queue or pidstat pressure: suspect CPU starvation or scheduler latency.",
        "Recv-Q high + skmem.d increasing: receive-side buffering is failing; collect host softnet/NIC/drop evidence.",
        "Recv-Q high across many services: suspect host/container CPU, memory pressure, or shared network namespace bottleneck."
      ],
      next: ["Group by process and local port.", "Chart Recv-Q vs RX bandwidth and Recv-Q vs skmem.r.", "Compare socket symptoms with application logs at the same timestamps."],
      commands: [envCommand("ss -tinpm state established"), envCommand("pidstat -druwt -p <pid> 1"), envCommand("top -H -p <pid>"), envCommand("strace -tt -p <pid> -e trace=network"), envCommand("sysctl net.ipv4.tcp_rmem net.core.rmem_max")],
      mitigation: "Fix the read loop, worker saturation, or backpressure. Tune rmem only as a controlled burst-absorption change, not as a substitute for draining data."
    },
    {
      title: "3. Packet loss, jitter, or path instability",
      summary: "This path is for RTO spikes, RTT variance, retransmission timers, backoff, low cwnd, pacing collapse, or socket drops.",
      signals: ["RTO jumps above warning/danger", "RTT variance rises before timeout", "backoff non-zero", "retrans timer count grows", "cwnd drops sharply", "skmem.d non-zero"],
      decide: [
        "High RTO + high RTT variance: suspect jitter, delayed ACKs, overloaded peer, or unstable path.",
        "High RTO + backoff + low cwnd: prioritize packet loss or congestion-control recovery.",
        "Only one destination affected: check route, peer network, firewall, load balancer, or remote host.",
        "Many destinations affected: check host interface, qdisc, bridge/veth, NIC, virtualization, or upstream network."
      ],
      next: ["Use expert correlation RTT variance vs RTO, then Backoff vs RTO.", "Compare a bad peer with a healthy peer collected at the same time.", "Collect route, qdisc, NIC, and softnet counters from the correct namespace/host."],
      commands: [envCommand("ss -ti dst <peer-ip>"), envCommand("ip -s route get <peer-ip>", { host: true }), envCommand("ip -s link show dev <iface>", { host: true }), envCommand("ethtool -S <iface> | egrep -i 'drop|err|timeout|reset|miss|crc'", { host: true }), envCommand("tracepath <peer-ip>", { host: true })],
      mitigation: "Do not hide loss by blindly increasing buffers. Fix drops, qdisc shaping, MTU mismatch, overloaded virtual bridge, NIC errors, or peer/network instability."
    },
    {
      title: "4. Socket buffer and memory pressure",
      summary: "Use this when skmem.r, skmem.t, rb/tb, w, bl, or d are high. The goal is to know whether buffers are absorbing a burst or masking a sustained bottleneck.",
      signals: ["skmem.r high with Recv-Q high", "skmem.t or skmem.w high with Send-Q high", "skmem.d increasing", "rb/tb close to configured limits", "Many sockets consuming memory at once"],
      decide: [
        "High skmem.r + high Recv-Q: local receiver is not draining fast enough.",
        "High skmem.t + high Send-Q: peer/path cannot drain outbound data fast enough.",
        "Drops with high memory pressure: collect kernel memory, softnet, NIC, and backlog evidence immediately.",
        "Buffers high but queues stable and no drops: may be normal burst absorption; watch trend before tuning."
      ],
      next: ["Open socket details and compare r/rb/t/tb/w/bl/d.", "Chart skmem.r, skmem.t, drops, Send-Q, and Recv-Q together.", "Check system-wide memory and TCP buffer sysctls."],
      commands: [envCommand("ss -tinpm"), envCommand("sysctl net.ipv4.tcp_rmem net.ipv4.tcp_wmem net.ipv4.tcp_mem net.core.rmem_max net.core.wmem_max"), envCommand("nstat -az | egrep 'Prune|Collapse|Rcv|Drop|Memory'", { host: true }), envCommand("cat /proc/net/sockstat /proc/net/sockstat6", { host: true })],
      mitigation: "Tune buffers with guardrails: define memory budget, test under load, and keep before/after ss timelines. Larger buffers can increase latency and hide slow consumers."
    },
    {
      title: "5. LXC/LXD namespace split: container symptom or host network problem?",
      summary: "In LXC/LXD, ss inside the container sees the container network namespace. Host bridge, veth, qdisc, NIC, and route evidence may live outside the container.",
      signals: ["Container sockets show queues but host counters show drops", "Only containers on one bridge are affected", "veth/bridge qdisc backlog grows", "Container route differs from host route", "Missing process or cgroup context"],
      decide: [
        "Only one container/service affected: start with container process, Recv-Q/Send-Q, cgroup, and local port.",
        "Several containers on same bridge affected: inspect LXD bridge, veth pairs, host qdisc, firewall, and MTU.",
        "Host NIC errors/drops increase: continue on the host/network path, not only inside the container.",
        isAnalystRole() ? "Container ss lacks process ownership: keep the gap explicit, or ask ops/root for privileged recollection." : "Container ss lacks process ownership: recollect with lxc exec and sufficient privileges."
      ],
      next: isAnalystRole()
        ? ["Collect container-local ss and route evidence for the same incident window.", "If host evidence is needed, hand off a precise request to ops/root.", "Keep timestamps aligned across analyst and ops collections."]
        : ["Collect both container-local ss and host-side interface/qdisc evidence for the same incident window.", "Map container interface to host veth/bridge.", "Keep timestamps aligned across container and host collections."],
      commands: [
        envCommand("ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all"),
        envCommand("ip route"),
        envCommand("ip addr show"),
        envCommand("lxc list", { host: true }),
        envCommand("lxc config show <container> --expanded", { host: true }),
        envCommand("ip -s link show", { host: true }),
        envCommand("bridge link", { host: true }),
        envCommand("tc -s qdisc show", { host: true })
      ],
      mitigation: "Avoid container-only tuning when host-side veth/bridge/NIC evidence points elsewhere. Escalate with both namespaces in the evidence bundle."
    },
    {
      title: "6. Exposed listeners and missing ownership",
      summary: "Use this when LISTEN sockets are wildcard-bound, unexpected, or missing process ownership. It is a security and operability check, not only a performance check.",
      signals: ["LISTEN on 0.0.0.0 or ::", "Unknown process field", "Unexpected public service port", "Many listeners in a container", "Port bound in the wrong namespace"],
      decide: [
        "Wildcard listener is expected and firewalled: document it and keep ownership visible.",
        "Wildcard listener unexpected: check service config, systemd unit, container profile, and firewall exposure.",
        "Process missing: rerun with sudo -p or container-local privileges.",
        "Listener appears in container but not host: verify LXD proxy/device/network exposure."
      ],
      next: ["Filter LISTEN sockets by local port and process.", "Validate bind address against intended exposure model.", "Check firewall and LXD profile/device configuration."],
      commands: [envCommand("ss -Hlnptu"), envCommand("ss -HOntepmi --cgroup --inet-sockopt -a -A all"), envCommand("lsof -nP -iTCP -sTCP:LISTEN", { host: true }), envCommand("systemctl status <service>", { host: true }), envCommand("lxc config show <container> --expanded", { host: true })],
      mitigation: "Bind explicitly where possible, document intentional wildcard listeners, and keep process attribution in routine collections."
    }
  ];
  return `<div class="usecase-grid">${cases.map(item => `<article class="guide-card usecase-card">
    <strong>${escapeHtml(item.title)}</strong>
    <p>${escapeHtml(item.summary)}</p>
    <div class="usecase-sections">
      <section><h4><i class="ri-radar-line"></i> Signals</h4><ul>${item.signals.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</ul></section>
      <section><h4><i class="ri-route-line"></i> How to choose the next path</h4><ul>${item.decide.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</ul></section>
      <section><h4><i class="ri-focus-3-line"></i> Next investigation</h4><ul>${item.next.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</ul></section>
    </div>
    <details>
      <summary><i class="ri-terminal-box-line"></i> Evidence commands</summary>
      <pre class="code">${escapeHtml(item.commands.join("\n"))}</pre>
    </details>
    <p class="mitigation"><i class="ri-shield-check-line"></i> ${escapeHtml(item.mitigation)}</p>
  </article>`).join("")}</div>`;
}

function renderGuideReferences() {
  return `
    <article class="guide-card"><strong>ss option coverage</strong><p>The interface covers options from the recent iproute2 man page: formats, families, tables, filters, BPF, contexts, namespaces, diag exports, and event mode.</p></article>
    <article class="guide-card"><strong>Reference links</strong><p><a href="https://manpages.debian.org/testing/iproute2/ss.8.en.html" target="_blank" rel="noreferrer">Debian testing ss(8), iproute2 6.19</a> - command options, filters, tables, and output modes.</p><p><a href="https://man7.org/linux/man-pages/man7/tcp.7.html" target="_blank" rel="noreferrer">man7 tcp(7)</a> - TCP socket options and TCP_INFO background.</p><p><a href="https://docs.kernel.org/next/networking/ip-sysctl.html" target="_blank" rel="noreferrer">Linux kernel IP sysctl documentation</a> - tcp_rmem, tcp_wmem, tcp_mem, pacing, SACK, ECN, and tuning knobs.</p><p><a href="https://docs.kernel.org/6.12/networking/proc_net_tcp.html" target="_blank" rel="noreferrer">Linux kernel /proc/net/tcp documentation</a> - raw kernel socket table fields.</p></article>`;
}

function serviceAliasEndpointOptions() {
  const endpoints = new Set();
  for (const socket of sortedFilteredSockets()) {
    if (socket.local) endpoints.add(socket.local);
    if (socket.peer) endpoints.add(socket.peer);
    if (endpoints.size > 2000) break;
  }
  for (const alias of Object.values(state.serviceAliases)) {
    if (alias.endpoint) endpoints.add(alias.endpoint);
  }
  return [...endpoints].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

function selectedAliasEndpoint(endpoints) {
  if (state.aliasEditKey && endpoints.includes(state.aliasEditKey)) return state.aliasEditKey;
  const firstAlias = Object.values(state.serviceAliases).find(alias => alias.endpoint)?.endpoint;
  return firstAlias || endpoints[0] || "";
}

function renderServiceAliasesModal() {
  const endpoints = serviceAliasEndpointOptions();
  const selectedEndpoint = selectedAliasEndpoint(endpoints);
  const alias = aliasForEndpoint(state.serviceAliases, selectedEndpoint) || { label: "", role: "", note: "" };
  const aliases = Object.values(state.serviceAliases).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const suggestions = endpoints.filter(endpoint => !aliasForEndpoint(state.serviceAliases, endpoint)).slice(0, 8);
  return `<div class="service-alias-modal">
    <section class="service-alias-editor">
      <div class="field-card">
        <strong>Endpoint identity</strong>
        <label>Endpoint<input id="aliasEndpoint" list="aliasEndpointOptions" placeholder="10.0.0.5:9100" value="${escapeHtml(selectedEndpoint)}" /></label>
        ${renderDatalist("aliasEndpointOptions", endpoints)}
        <label>Business name<input id="aliasLabel" placeholder="FIX stream - Aggregator A" value="${escapeHtml(alias.label)}" /></label>
        <label>Role / component<input id="aliasRole" placeholder="FIX streaming port, market data, container..." value="${escapeHtml(alias.role)}" /></label>
        <label>Notes<textarea id="aliasNote" class="alias-note" placeholder="Owner, environment, expected traffic, incident hint...">${escapeHtml(alias.note)}</textarea></label>
        <div class="toolbar">
          <button class="primary" data-action="saveServiceAlias"><i class="ri-price-tag-3-line"></i> Save label</button>
          <button data-action="deleteServiceAlias">${icons.trash} Delete label</button>
        </div>
      </div>
      <div class="field-card">
        <strong>Unlabelled endpoints</strong>
        <div class="alias-suggestions">
          ${suggestions.length ? suggestions.map(endpoint => `<button data-alias-pick="${escapeHtml(endpoint)}"><span>${escapeHtml(endpoint)}</span><small>add label</small></button>`).join("") : `<p class="hint">Every visible endpoint already has a label.</p>`}
        </div>
      </div>
    </section>
    <section class="service-alias-list">
      <strong>Saved labels</strong>
      ${aliases.length ? aliases.map(item => `<article class="alias-card">
        <div><b>${escapeHtml(item.label || item.endpoint)}</b><span>${escapeHtml(item.endpoint)}</span></div>
        ${item.role ? `<small>${escapeHtml(item.role)}</small>` : ""}
        ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
        <button data-alias-pick="${escapeHtml(item.endpoint)}"><i class="ri-edit-line"></i> Edit</button>
      </article>`).join("") : `<div class="empty">No saved service labels yet.</div>`}
    </section>
  </div>`;
}

function topologyMatchOptions() {
  const endpoints = serviceAliasEndpointOptions();
  const hosts = [...new Set(endpoints.map(endpointHost).filter(Boolean))];
  return [...hosts, ...endpoints];
}

function topologyColorOptions(selected) {
  return ["cyan", "blue", "green", "orange", "pink", "violet"]
    .map(color => `<option value="${color}" ${selected === color ? "selected" : ""}>${color}</option>`)
    .join("");
}

function renderTopologyModal() {
  const groups = normalizeTopologyProfile(state.topology).groups;
  const selected = groups.find(group => group.id === state.topologyEditId) || null;
  const matchValue = selected?.match || state.topologyDraftMatch || "";
  const suggestions = topologyMatchOptions().filter(Boolean).slice(0, 16);
  return `<div class="topology-modal">
    <section class="topology-editor">
      <article class="field-card">
        <strong>Recording topology</strong>
        <p class="hint">Scope: ${escapeHtml(state.sourceName)}. A host rule such as 192.168.145.115 groups every visible port on that host; IP:port and wildcards are also accepted.</p>
        <label>Group name<input id="topologyName" placeholder="Market data simulators" value="${escapeHtml(selected?.name || "")}" /></label>
        <label>Match hosts or endpoints<input id="topologyMatch" list="topologyMatchOptions" placeholder="192.168.145.115, 192.168.145.204:57067" value="${escapeHtml(matchValue)}" /></label>
        ${renderDatalist("topologyMatchOptions", suggestions)}
        <label>Color<select id="topologyColor">${topologyColorOptions(selected?.color || "cyan")}</select></label>
        <label>Notes<textarea id="topologyNote" class="alias-note" placeholder="Business role, owner, recording-specific context...">${escapeHtml(selected?.note || "")}</textarea></label>
        <div class="toolbar">
          <button class="primary" data-action="saveTopologyGroup"><i class="ri-node-tree"></i> Save group</button>
          <button data-action="deleteTopologyGroup">${icons.trash} Delete group</button>
        </div>
      </article>
      <article class="field-card">
        <strong>Fast host picks</strong>
        <div class="topology-suggestions">
          ${suggestions.slice(0, 10).map(value => `<button data-topology-suggest="${escapeHtml(value)}"><span>${escapeHtml(value)}</span><small>use</small></button>`).join("")}
        </div>
      </article>
    </section>
    <section class="topology-group-list">
      <strong>Groups for this recording</strong>
      ${groups.length ? groups.map(group => `<article class="topology-group-card ${escapeHtml(group.color)}">
        <div><b>${escapeHtml(group.name)}</b><span>${escapeHtml(group.match)}</span></div>
        ${group.note ? `<p>${escapeHtml(group.note)}</p>` : ""}
        <button data-topology-edit="${escapeHtml(group.id)}"><i class="ri-edit-line"></i> Edit</button>
      </article>`).join("") : `<div class="empty">No topology group for this recording yet.</div>`}
    </section>
  </div>`;
}

function renderModal() {
  const modalTitle = state.modal === "columns" ? "Columns and order"
    : state.modal === "thresholds" ? "Threshold configuration"
      : state.modal === "layout" ? "Chart layout preferences"
        : state.modal === "preImport" ? "Pre-import filters"
          : state.modal === "columnHelp" ? "Column guide"
            : state.modal === "chartStats" ? `${metricLabel(state.statsMetric)} statistics`
              : state.modal === "serviceAliases" ? "Service labels"
                : state.modal === "topology" ? "Recording topology"
              : "ss field documentation";
  const modalBody = state.modal === "columns" ? renderColumnChooser()
    : state.modal === "thresholds" ? renderThresholdConfig()
      : state.modal === "layout" ? renderLayoutPrefs()
        : state.modal === "preImport" ? renderPreImportFilters()
          : state.modal === "columnHelp" ? renderColumnHelpDetail()
            : state.modal === "chartStats" ? renderChartStatsModal()
              : state.modal === "serviceAliases" ? renderServiceAliasesModal()
                : state.modal === "topology" ? renderTopologyModal()
              : renderFields();
  return html`<div class="modal-backdrop ${state.modal ? "open" : ""}">
    <section class="modal ${state.modal || ""}">
      <header><strong>${modalTitle}</strong><button class="icon" data-action="closeModal">${icons.x}</button></header>
      <div class="body">${modalBody}</div>
    </section>
  </div>`;
}

function renderColumnHelpDetail() {
  const col = getColumn(state.helpColumn);
  const help = columnHelp(col);
  return `<div class="column-help-detail">
    <article class="field-card">
      <strong>${escapeHtml(col.label)}</strong>
      <p>${escapeHtml(help.summary)}</p>
      <p>${escapeHtml(help.detail)}</p>
      <p><b>Best use:</b> ${escapeHtml(help.use)}</p>
    </article>
    <article class="field-card">
      <strong>Current thresholds</strong>
      ${renderThresholdSummary(help)}
      ${help.metric ? `<p class="hint">${escapeHtml(EXPERT_DEFAULT_THRESHOLDS[help.metric]?.rationale || "")}</p>` : `<p class="hint">This column is contextual and has no numeric comfort/warning/danger range.</p>`}
    </article>
  </div>`;
}

function renderChartStatsModal() {
  const metric = state.statsMetric || state.prefs.graphMetric;
  const stats = chartStats(metric);
  if (!stats.count) return `<div class="empty">No visible numeric data for ${escapeHtml(metricLabel(metric))}.</div>`;
  const rows = [
    ["Min", stats.min],
    ["Median", stats.p50],
    ["P90", stats.p90],
    ["P99", stats.p99],
    ["P99.9", stats.p999],
    ["P99.99", stats.p9999],
    ["Max", stats.max]
  ];
  return `<div class="chart-stats-layout">
    <article class="stats-summary-card">
      <div>
        <span class="tooltip-kicker">${escapeHtml(metricLabel(metric))}</span>
        <strong>${formatNumber(stats.count)} visible sample(s)</strong>
        <p class="hint">Computed on the current chart window with real captured values, before any visual rendering reduction.</p>
      </div>
      <div class="stats-window">
        <span>${escapeHtml(timeLabel(stats.first?.t || 0, stats.first?.epochMs))}</span>
        <i class="ri-arrow-right-line"></i>
        <span>${escapeHtml(timeLabel(stats.last?.t || 0, stats.last?.epochMs))}</span>
      </div>
    </article>
    <article class="stats-table-card">
      <strong>Percentile table</strong>
      <table class="stats-table">
        <tbody>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${formatMetricValue(metric, value)}</td></tr>`).join("")}</tbody>
      </table>
    </article>
    <article class="stats-dist-card">
      <strong>Percentile distribution</strong>
      ${renderPercentileDistribution(metric, stats)}
    </article>
  </div>`;
}

function renderPreImportFilters() {
  const h = state.filterHistory;
  const f = normalizePreImportFilters();
  return `<div class="pref-grid">
    <article class="field-card">
      <strong>Optional import-time filters</strong>
      <p class="hint">For very large captures, enable a preset or field filter here. Matching happens while the file is read, before the heavy final analysis keeps the raw timeline.</p>
      <div class="preimport-presets">
        ${PRE_IMPORT_PRESETS.map(preset => `<button type="button" data-preimport-preset="${preset.id}"><strong>${escapeHtml(preset.label)}</strong><span>${escapeHtml(preset.description)}</span></button>`).join("")}
      </div>
      <label class="check"><input id="preImportEnabled" type="checkbox" ${f.enabled ? "checked" : ""}/> Enable pre-import filtering</label>
      <div class="preimport-grid">
        <label>Protocol<select id="preProtocol">
          <option value="">tcp + udp + other</option>
          <option value="tcp" ${f.protocol === "tcp" ? "selected" : ""}>tcp / tcp6</option>
          <option value="udp" ${f.protocol === "udp" ? "selected" : ""}>udp / udp6</option>
        </select></label>
        <label>State<select id="preState">
          <option value="">all states</option>
          ${["ESTAB", "LISTEN", "UNCONN", "SYN-SENT", "SYN-RECV", "TIME-WAIT", "CLOSE-WAIT", "FIN-WAIT-1", "FIN-WAIT-2"].map(value => `<option value="${value}" ${f.state === value ? "selected" : ""}>${value}</option>`).join("")}
        </select></label>
        <input id="preAnyPort" list="histAnyPort" placeholder="any port equals, comma separated" value="${escapeHtml(f.anyPort)}" />
        <input id="preSrcIp" list="histSrcIp" placeholder="source IP contains" value="${escapeHtml(f.srcIp)}" />
        <input id="preDstIp" list="histDstIp" placeholder="destination IP contains" value="${escapeHtml(f.dstIp)}" />
        <input id="preSrcPort" list="histSrcPort" placeholder="source port equals" value="${escapeHtml(f.srcPort)}" />
        <input id="preDstPort" list="histDstPort" placeholder="destination port equals" value="${escapeHtml(f.dstPort)}" />
      </div>
      ${renderDatalist("histAnyPort", [...h.map(x => x.anyPort), ...h.map(x => x.srcPort), ...h.map(x => x.dstPort)])}
      ${renderDatalist("histSrcIp", h.map(x => x.srcIp))}
      ${renderDatalist("histDstIp", h.map(x => x.dstIp))}
      ${renderDatalist("histSrcPort", h.map(x => x.srcPort))}
      ${renderDatalist("histDstPort", h.map(x => x.dstPort))}
      <div class="toolbar">
        <button class="primary" data-action="startImportAll">${icons.upload} Import all</button>
        <button data-action="startImportWithFilters">${icons.play} Apply filters and import</button>
        <button data-action="clearFilterHistory">${icons.clear} Clear history</button>
      </div>
    </article>
  </div>`;
}

function renderLayoutPrefs() {
  const l = state.prefs.chartLayout;
  const metrics = chartMetricList();
  return `<div class="layout-config">
    <article class="field-card">
      <strong>Grid layout</strong>
      <label>Charts per row<select id="layoutColumns">${[1, 2, 3].map(v => `<option value="${v}" ${clampChartColumns(l.columns) === v ? "selected" : ""}>${v} columns</option>`).join("")}</select></label>
      <label>Panel density<select id="layoutDensity">${["compact", "standard", "tall"].map(v => `<option value="${v}" ${l.density === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label>Preset<select id="layoutPreset">
        <option value="">Choose preset</option>
        <option value="noc">NOC overview: 3 columns, compact</option>
        <option value="deep">Deep diagnosis: 2 columns, tall</option>
        <option value="single">Focused review: 1 column, tall</option>
      </select></label>
    </article>
    <article class="field-card">
      <strong>Chart behavior</strong>
      <label class="check inline"><input id="layoutMainChart" type="checkbox" ${l.mainChart ? "checked" : ""}/> Show main chart</label>
      <label class="check inline"><input id="layoutSharedZoom" type="checkbox" ${l.sharedZoom ? "checked" : ""}/> Shared zoom across charts</label>
      <label class="check inline"><input id="layoutLegend" type="checkbox" ${l.showLegend ? "checked" : ""}/> Show legend/status</label>
      <label class="check inline"><input id="layoutCrosshair" type="checkbox" ${l.showCrosshair ? "checked" : ""}/> Enable crosshair and drag zoom</label>
      <label class="check inline"><input id="layoutThresholds" type="checkbox" ${l.showThresholds ? "checked" : ""}/> Show threshold lines and colors</label>
      <label class="check inline"><input id="layoutStickyToolbar" type="checkbox" ${l.stickyToolbar ? "checked" : ""}/> Sticky chart controls</label>
    </article>
    <article class="field-card layout-order">
      <strong>Panel order</strong>
      ${metrics.map(metric => `<div class="layout-row"><span>${escapeHtml(metricLabel(metric))}</span><button data-move-chart="${metric}" data-dir="-1">${icons.up} Up</button><button data-move-chart="${metric}" data-dir="1">${icons.down} Down</button></div>`).join("")}
    </article>
    <div class="layout-actions"><button class="primary compact-action" data-action="saveLayout">${icons.saveDisk} Save</button></div>
  </div>`;
}

function renderThresholdConfig() {
  const metrics = Object.keys(state.thresholds).filter(metric => {
    const t = state.thresholds[metric];
    return Number.isFinite(t.warn) || Number.isFinite(t.danger);
  });
  return `<div class="threshold-grid">
    ${metrics.map(metric => {
      const t = state.thresholds[metric];
      return `<article class="field-card threshold-card">
        <strong>${escapeHtml(metricLabel(metric))}</strong>
        <p>Unit: ${escapeHtml(t.unit)} ${t.inverse ? "- lower is worse" : "- higher is worse"}</p>
        <p class="hint">${escapeHtml(t.rationale || EXPERT_DEFAULT_THRESHOLDS[metric]?.rationale || "Expert default based on sustained socket-level symptoms.")}</p>
        <label class="threshold-label comfort-label"><span>Comfort zone (${escapeHtml(t.unit)})</span><input data-threshold="${metric}" data-threshold-key="comfort" inputmode="numeric" value="${formatMetricNumber(metric, t.comfort)}"/></label>
        <label class="threshold-label warning-label"><span><i class="ri-alert-line"></i> Warning zone (${escapeHtml(t.unit)})</span><input data-threshold="${metric}" data-threshold-key="warn" inputmode="numeric" value="${formatMetricNumber(metric, t.warn)}"/></label>
        <label class="threshold-label danger-label"><span><i class="ri-alarm-warning-line"></i> Danger zone (${escapeHtml(t.unit)})</span><input data-threshold="${metric}" data-threshold-key="danger" inputmode="numeric" value="${formatMetricNumber(metric, t.danger)}"/></label>
      </article>`;
    }).join("")}
  </div>`;
}

function renderColumnChooser() {
  const visibleCount = state.table.visible.length;
  return `<div class="column-layout-editor">
    <article class="field-card table-profile-card">
      <div>
        <strong>Named table layouts</strong>
        <p class="hint">Save column order, pinned columns, hidden columns, sort, and page size.</p>
      </div>
      <div class="profile-row">
        <input id="tableLayoutName" placeholder="Layout name" />
        <button class="primary" data-action="saveTableLayout">${icons.saveDisk} Save layout</button>
      </div>
      <div class="profile-list">
        ${state.tableProfiles.length ? state.tableProfiles.map(profile => `<div class="profile-item">
          <span>${escapeHtml(profile.name)}</span>
          <button class="icon" data-load-table-layout="${profile.id}" title="Apply layout"><i class="ri-check-line"></i></button>
          <button class="icon" data-delete-table-layout="${profile.id}" title="Delete layout">${icons.trash}</button>
        </div>`).join("") : `<span class="hint">No saved table layout yet.</span>`}
      </div>
    </article>
    <div class="column-list-head">
      <strong>${formatNumber(visibleCount)} visible columns</strong>
      <span class="hint">Drag cards to reorder. Toggle checkboxes without losing your place.</span>
    </div>
    <div class="field-list column-list">
    ${state.table.order.map((key, index) => {
      const col = getColumn(key);
      const visible = state.table.visible.includes(key);
      const pinned = state.table.pinned.includes(key);
      return `<article class="field-card column-card ${visible ? "" : "muted-card"}" draggable="true" data-col-key="${key}">
        <span class="drag-handle">${icons.drag}</span>
        <label class="check inline"><input type="checkbox" data-visible-col="${key}" ${visible ? "checked" : ""}/> ${escapeHtml(col.label)}</label>
        <div class="toolbar">
          <button class="icon" data-pin-col="${key}" title="${pinned ? "Unpin column" : "Pin column"}">${pinned ? icons.unpin : icons.pin}</button>
          <button class="icon" data-hide-col="${key}" title="Hide column">${icons.hide}</button>
        </div>
      </article>`;
    }).join("")}
    </div>
  </div>`;
}

function resolvedNumberLocale() {
  return state?.prefs?.numberLocale && state.prefs.numberLocale !== "auto"
    ? state.prefs.numberLocale
    : navigator.language || "en-US";
}

function resolvedTimeZone() {
  return state?.prefs?.chartTimeZone && state.prefs.chartTimeZone !== "auto"
    ? state.prefs.chartTimeZone
    : Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function timeZoneOptions() {
  const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return [...new Set([resolvedTimeZone(), ...COMMON_TIME_ZONES, ...supported])].filter(Boolean);
}

function formatNumber(value) {
  const numeric = Number(value || 0);
  const decimals = Number.isInteger(numeric) ? 0 : 2;
  return new Intl.NumberFormat(resolvedNumberLocale(), {
    useGrouping: state?.prefs?.numberGrouping !== false,
    maximumFractionDigits: decimals
  }).format(numeric);
}

function formatTimelineTime(event) {
  if (!event?.epochMs) return "snapshot";
  try {
    return new Intl.DateTimeFormat(resolvedNumberLocale(), {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: resolvedTimeZone()
    }).format(new Date(event.epochMs));
  } catch {
    return "snapshot";
  }
}

function metricUnit(metric) {
  return thresholdFor(metric).unit || "";
}

function metricFractionDigits(metric, value) {
  const numeric = Math.abs(Number(value || 0));
  if (["pacing_rate", "delivery_rate", "tx_bps", "rx_bps", "sendQ", "recvQ", "skmem.r", "skmem.t", "skmem.d", "bytes_acked", "bytes_received", "segs_out", "segs_in", "cwnd", "backoff", "retrans"].includes(metric)) return 0;
  if (metric === "skmem.d_rate") return numeric > 0 && numeric < 1 ? 3 : 2;
  if (["rtt", "rto", "ato", "rttvar"].includes(metric)) return numeric > 0 && numeric < 10 ? 3 : Number.isInteger(Number(value)) ? 0 : 3;
  return Number.isInteger(Number(value)) ? 0 : 2;
}

function formatMetricNumber(metric, value) {
  const digits = metricFractionDigits(metric, value);
  return new Intl.NumberFormat(resolvedNumberLocale(), {
    useGrouping: state?.prefs?.numberGrouping !== false,
    minimumFractionDigits: ["rtt", "rto", "ato"].includes(metric) && Math.abs(Number(value || 0)) > 0 && Math.abs(Number(value || 0)) < 10 ? digits : 0,
    maximumFractionDigits: digits
  }).format(Number(value || 0));
}

function formatBitsPerSecond(value) {
  const numeric = Number(value || 0);
  const sign = numeric < 0 ? -1 : 1;
  let scaled = Math.abs(numeric);
  const units = ["bps", "kbps", "Mbps", "Gbps", "Tbps"];
  let unitIndex = 0;
  while (scaled >= 1000 && unitIndex < units.length - 1) {
    scaled /= 1000;
    unitIndex += 1;
  }
  const digits = unitIndex === 0 ? 0 : scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const formatted = new Intl.NumberFormat(resolvedNumberLocale(), {
    useGrouping: state?.prefs?.numberGrouping !== false,
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(sign * scaled);
  return `${formatted} ${units[unitIndex]}`;
}

function formatMetricValue(metric, value) {
  const unit = metricUnit(metric);
  if (unit === "bps") return formatBitsPerSecond(value);
  return `${formatMetricNumber(metric, value)}${unit ? ` ${unit}` : ""}`;
}

function formatTableMetricValue(metric, value) {
  return state?.prefs?.tableUnits === false ? formatMetricNumber(metric, value) : formatMetricValue(metric, value);
}

function renderTableMetricCell(metric, value) {
  const severity = thresholdSeverity(metric, Number(value || 0));
  return `<span class="table-metric ${severity}" title="${escapeHtml(metricLabel(metric))}: ${formatMetricValue(metric, value)}">${formatTableMetricValue(metric, value)}</span>`;
}

function parseFormattedNumber(value) {
  if (typeof value === "number") return value;
  const sample = new Intl.NumberFormat(resolvedNumberLocale()).formatToParts(12345.6);
  const group = sample.find(part => part.type === "group")?.value || ",";
  const decimal = sample.find(part => part.type === "decimal")?.value || ".";
  const normalized = String(value || "")
    .split(group).join("")
    .replace(/\s|\u202f|\u00a0/g, "")
    .replace(decimal, ".")
    .replace(/[^\d.-]/g, "");
  return Number(normalized || 0);
}

function metricLabel(metric) {
  return {
    rtt: "RTT",
    rto: "RTO",
    sendQ: "Send-Q",
    recvQ: "Recv-Q",
    cwnd: "Congestion window",
    ato: "ACK timeout",
    "skmem.r": "Socket memory receive",
    "skmem.t": "Socket memory transmit",
    "skmem.d": "Socket drops",
    "skmem.d_rate": "Socket drop rate",
    pacing_rate: "Pacing rate",
    delivery_rate: "Delivery rate",
    tx_bps: "TX bandwidth",
    rx_bps: "RX bandwidth",
    bytes_acked: "Bytes acked",
    bytes_received: "Bytes received",
    rttvar: "RTT variance",
    segs_out: "Segments out",
    segs_in: "Segments in",
    backoff: "TCP backoff",
    retrans: "Retrans timer"
  }[metric] || metric;
}

function metricColor(metric) {
  return {
    rtt: "#5db7ff",
    rto: "#ff9f43",
    sendQ: "#39d6d6",
    recvQ: "#d38cff",
    cwnd: "#4cde8a",
    ato: "#ffd166",
    "skmem.r": "#7dd3fc",
    "skmem.t": "#f472b6",
    "skmem.d": "#ff5c77",
    "skmem.d_rate": "#ff2e63",
    pacing_rate: "#a3e635",
    delivery_rate: "#67e8f9",
    tx_bps: "#22d3ee",
    rx_bps: "#818cf8",
    bytes_acked: "#38bdf8",
    bytes_received: "#a78bfa",
    rttvar: "#fb7185",
    segs_out: "#2dd4bf",
    segs_in: "#c084fc",
    backoff: "#f97316",
    retrans: "#f43f5e"
  }[metric] || "#5db7ff";
}

function thresholdFor(metric) {
  return state.thresholds[metric] || { comfort: 0, warn: Number.POSITIVE_INFINITY, danger: Number.POSITIVE_INFINITY, unit: "" };
}

function thresholdSeverity(metric, value) {
  const t = thresholdFor(metric);
  if (t.inverse) {
    if (value <= t.danger) return "danger";
    if (value <= t.warn) return "warn";
    return "comfort";
  }
  if (value >= t.danger) return "danger";
  if (value >= t.warn) return "warn";
  return "comfort";
}

function thresholdColor(metric, value) {
  const sev = thresholdSeverity(metric, value);
  return sev === "danger" ? "#ff5c77" : sev === "warn" ? "#ff9f43" : metricColor(metric);
}

function percentile(sortedValues, p) {
  if (!sortedValues.length) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const rank = (p / 100) * (sortedValues.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const weight = rank - lo;
  return sortedValues[lo] + (sortedValues[hi] - sortedValues[lo]) * weight;
}

function chartStats(metric) {
  const rows = visibleHistory();
  const values = rows
    .map(row => Number(row?.[metric]))
    .filter(value => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (!values.length) return { count: 0, metric };
  return {
    metric,
    count: values.length,
    first: rows[0],
    last: rows[rows.length - 1],
    min: values[0],
    p50: percentile(values, 50),
    p90: percentile(values, 90),
    p99: percentile(values, 99),
    p999: percentile(values, 99.9),
    p9999: percentile(values, 99.99),
    max: values[values.length - 1],
    curve: [0, 10, 25, 50, 75, 90, 95, 99, 99.9, 99.99, 100].map(p => ({ p, value: percentile(values, p) }))
  };
}

function renderPercentileDistribution(metric, stats) {
  const w = 520;
  const h = 260;
  const pad = { l: 76, r: 24, t: 28, b: 52 };
  const values = stats.curve || [];
  const max = Math.max(...values.map(point => point.value), 1);
  const min = Math.min(...values.map(point => point.value), 0);
  const span = Math.max(1, max - min);
  const x = p => pad.l + (Math.max(0, Math.min(100, p)) / 100) * (w - pad.l - pad.r);
  const y = value => h - pad.b - ((value - min) / span) * (h - pad.t - pad.b);
  const path = values.map((point, index) => `${index ? "L" : "M"}${x(point.p).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const markers = [
    ["P50", 50, stats.p50],
    ["P90", 90, stats.p90],
    ["P99", 99, stats.p99],
    ["P99.9", 99.9, stats.p999],
    ["P99.99", 99.99, stats.p9999]
  ];
  const yTicks = [0, .25, .5, .75, 1].map(f => min + f * span);
  return `<svg class="percentile-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeHtml(metricLabel(metric))} percentile distribution">
    <rect x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="#050910"/>
    ${yTicks.map(value => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(value)}" y2="${y(value)}" stroke="#263241"/><text x="${pad.l - 10}" y="${y(value) + 4}" text-anchor="end" fill="#8c9aab" font-size="11">${formatMetricValue(metric, value)}</text>`).join("")}
    ${[0, 50, 90, 99, 100].map(p => `<line x1="${x(p)}" x2="${x(p)}" y1="${pad.t}" y2="${h - pad.b}" stroke="#182434"/><text x="${x(p)}" y="${h - 20}" text-anchor="middle" fill="#8c9aab" font-size="11">${p === 100 ? "Max" : `P${p}`}</text>`).join("")}
    <path d="${path}" fill="none" stroke="${metricColor(metric)}" stroke-width="3"/>
    ${markers.map(([label, p, value]) => `<circle cx="${x(p)}" cy="${y(value)}" r="4" fill="${thresholdColor(metric, value)}"><title>${label}: ${formatMetricValue(metric, value)}</title></circle>`).join("")}
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="#52657a"/>
    <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="#52657a"/>
    <text x="${pad.l}" y="18" fill="#edf4ff" font-size="13" font-weight="700">${escapeHtml(metricLabel(metric))} percentile curve</text>
    <text x="${w / 2}" y="${h - 5}" text-anchor="middle" fill="#c4d0de" font-size="12">Percentile rank</text>
  </svg>`;
}

function chartPointRadius(pointCount, style) {
  const base = { XS: 1, S: 2, M: 3.2, L: 4.6 }[state.prefs.chartPointSize || "S"] || 2;
  if (base <= 1) return 1;
  const count = Math.max(1, Number(pointCount || 1));
  const densityFactor = count <= 80 ? 1 : count <= 180 ? 0.78 : count <= 400 ? 0.58 : count <= 900 ? 0.42 : 0.3;
  const styleFactor = style === "points" || style === "xy" ? 1.15 : 1;
  return Math.max(1, Math.min(base * styleFactor, base * densityFactor * styleFactor));
}

function hasRealTimestampHistory() {
  return state.history.some(row => row?.epochMs);
}

function chartResolutionLabel() {
  const visible = visibleHistory().length;
  const mode = hasRealTimestampHistory() ? "real timestamps" : "synthetic timeline";
  return `${formatNumber(visible)} visible point(s), ${mode}`;
}

function visibleHistory() {
  const rows = state.history.length ? state.history : [];
  if (rows.length <= 2) return rows;
  const cacheKey = `${state.dataVersion}|${rows.length}|${state.chartZoom.start}|${state.chartZoom.end}`;
  if (state.cache.visibleHistoryKey === cacheKey && state.cache.visibleHistoryRows) return state.cache.visibleHistoryRows;
  const start = Math.floor(state.chartZoom.start * (rows.length - 1));
  const end = Math.max(start + 1, Math.ceil(state.chartZoom.end * (rows.length - 1)));
  const visibleRows = rows.slice(start, end + 1);
  state.cache.visibleHistoryKey = cacheKey;
  state.cache.visibleHistoryRows = visibleRows;
  return visibleRows;
}

function chartPointBudget(style, width) {
  const pxBudget = Math.max(1200, Math.round((width || 640) * 8));
  const styleBudget = style === "bars" ? 5000 : style === "points" || style === "xy" ? 8000 : 16000;
  return Math.min(styleBudget, pxBudget);
}

function renderableHistory(rows, metric, style, width) {
  const budget = chartPointBudget(style, width);
  if (rows.length <= budget) return { rows, total: rows.length, reduced: false };
  return {
    rows: preserveExtremesDownsample(rows, metric, budget),
    total: rows.length,
    reduced: true
  };
}

function chartRowTime(row) {
  return row?.epochMs ?? (row?.t || 0) * 1000;
}

function nearestChartRow(rows, pct) {
  if (!rows.length) return {};
  const first = chartRowTime(rows[0]);
  const last = chartRowTime(rows[rows.length - 1]);
  const target = first + Math.max(0, Math.min(1, pct)) * Math.max(1, last - first);
  return rows.reduce((best, row) => (
    Math.abs(chartRowTime(row) - target) < Math.abs(chartRowTime(best) - target) ? row : best
  ), rows[0]);
}

function preserveExtremesDownsample(rows, metric, budget) {
  if (rows.length <= budget || budget < 8) return rows;
  const middleBudget = Math.max(2, budget - 2);
  const bucketCount = Math.max(1, Math.floor(middleBudget / 2));
  const bucketSize = Math.max(1, Math.ceil((rows.length - 2) / bucketCount));
  const picked = new Map([[0, rows[0]], [rows.length - 1, rows[rows.length - 1]]]);
  for (let start = 1; start < rows.length - 1; start += bucketSize) {
    const end = Math.min(rows.length - 1, start + bucketSize);
    let minIndex = start;
    let maxIndex = start;
    for (let i = start + 1; i < end; i += 1) {
      const value = rows[i][metric] || 0;
      if (value < (rows[minIndex][metric] || 0)) minIndex = i;
      if (value > (rows[maxIndex][metric] || 0)) maxIndex = i;
    }
    picked.set(minIndex, rows[minIndex]);
    picked.set(maxIndex, rows[maxIndex]);
  }
  return [...picked.entries()].sort((a, b) => a[0] - b[0]).slice(0, budget).map(([, row]) => row);
}

function timeLabel(seconds, epochMs = null) {
  if (epochMs) {
    return new Intl.DateTimeFormat(resolvedNumberLocale(), {
      timeZone: resolvedTimeZone(),
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date(epochMs));
  }
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}h`;
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)}m`;
  return `${Math.round(seconds)}s`;
}

function dateTimePartsInZone(epochMs) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: resolvedTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(new Date(epochMs));
  const value = type => parts.find(part => part.type === type)?.value || "00";
  const hour = value("hour") === "24" ? "00" : value("hour");
  return `${value("year")}-${value("month")}-${value("day")}T${hour}:${value("minute")}:${value("second")}`;
}

function timeZoneOffsetMs(timeZone, epochMs) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(new Date(epochMs));
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const hour = map.hour === "24" ? "00" : map.hour;
  return Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), Number(hour), Number(map.minute), Number(map.second)) - epochMs;
}

function zonedDateTimeToEpoch(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return NaN;
  const [, year, month, day, hour, minute, second = 0] = match.map(value => Number(value || 0));
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const zone = resolvedTimeZone();
  const firstPass = utcGuess - timeZoneOffsetMs(zone, utcGuess);
  return utcGuess - timeZoneOffsetMs(zone, firstPass);
}

function setZoom(start, end) {
  state.chartZoom.start = Math.max(0, Math.min(0.98, start));
  state.chartZoom.end = Math.max(state.chartZoom.start + 0.02, Math.min(1, end));
}

function orderedChartMetrics() {
  const order = state.prefs.chartLayout.panelOrder || [];
  return [...state.chartMetrics].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

function moveVisibleChartMetric(metric, dir) {
  const visible = orderedChartMetrics();
  const current = visible.indexOf(metric);
  const targetMetric = visible[current + dir];
  if (current < 0 || !targetMetric) return false;
  const order = [...state.prefs.chartLayout.panelOrder];
  const currentOrderIndex = order.indexOf(metric);
  const targetOrderIndex = order.indexOf(targetMetric);
  if (currentOrderIndex < 0 || targetOrderIndex < 0) return false;
  [order[currentOrderIndex], order[targetOrderIndex]] = [order[targetOrderIndex], order[currentOrderIndex]];
  state.prefs.chartLayout.panelOrder = order;
  savePrefs();
  return true;
}

function resetAllState() {
  state.raw = "";
  state.command = "ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all";
  setSourceName("empty workspace");
  state.sockets = [];
  state.selectedId = null;
  setActiveInvestigation(state, null);
  state.anomalies = [];
  state.alertEvents = [];
  state.baseline = null;
  state.activeTab = "sockets";
  state.drawer = null;
  state.modal = null;
  state.statsMetric = null;
  state.openMenuPos = null;
  state.openConversationInsightKey = null;
  state.openConversationInsightPos = null;
  state.history = [];
  state.chartMetrics = ["tx_bps", "rx_bps", "rtt", "rto", "sendQ", "skmem.d"];
  state.correlation = { x: "rtt", y: "sendQ" };
  state.analysisDirty = true;
  state.bandwidthIndex = {};
  state.cache = {
    timestampRawVersion: -1,
    timestampBlocks: [],
    snapshotRawVersion: -1,
    timestampSnapshots: [],
    filteredKey: "",
    filteredRows: null,
    optionKey: "",
    optionSets: null,
    visibleHistoryKey: "",
    visibleHistoryRows: null
  };
  state.rawVersion += 1;
  setZoom(0, 1);
  state.table = {
    page: 1,
    pageSize: state.prefs.defaultPageSize,
    sortKey: "risk",
    sortDir: "desc",
    pinned: ["risk", "state", "local"],
    visible: defaultTableColumns(),
    order: TABLE_COLUMNS.map(c => c.key),
    filters: { text: "", risk: "all", state: "all", family: "all", minRecvQ: "", minSendQ: "", minRtt: "", srcIp: "", dstIp: "", srcPort: "", dstPort: "", process: "", onlyAnomalies: false }
  };
}

function chartEpochAt(which) {
  const rows = state.history;
  if (!rows.length) return null;
  const first = rows[0]?.epochMs || Date.now();
  const last = rows[rows.length - 1]?.epochMs || (first + (rows[rows.length - 1]?.t || 0) * 1000);
  const ratio = which === "start" ? state.chartZoom.start : state.chartZoom.end;
  return first + ratio * (last - first);
}

function zoomDateTimeValue(which) {
  const epoch = chartEpochAt(which);
  if (!epoch) return "";
  return dateTimePartsInZone(epoch);
}

function setZoomFromDateInputs() {
  const startValue = document.querySelector("#startTimeInput")?.value;
  const endValue = document.querySelector("#endTimeInput")?.value;
  if (!startValue || !endValue || !state.history.length) return;
  const first = state.history[0]?.epochMs || Date.now();
  const last = state.history[state.history.length - 1]?.epochMs || (first + (state.history[state.history.length - 1]?.t || 0) * 1000);
  const start = zonedDateTimeToEpoch(startValue);
  const end = zonedDateTimeToEpoch(endValue);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || last <= first) return;
  setZoom((start - first) / (last - first), (end - first) / (last - first));
}

function drawChart() {
  const svg = document.querySelector("#chart");
  if (!svg) return;
  drawChartInto(svg, state.prefs.graphMetric, state.prefs.graphStyle, true);
}

function drawChartInto(svg, metric, style = state.prefs.graphStyle, showThreshold = false) {
  const w = svg.clientWidth || 640;
  const h = svg.clientHeight || 300;
  const visibleData = visibleHistory();
  const renderData = renderableHistory(visibleData, metric, style, w);
  const data = renderData.rows;
  const values = data.map(d => d[metric] || 0);
  const t = thresholdFor(metric);
  const finiteThresholds = [t.warn, t.danger].filter(Number.isFinite);
  const max = Math.max(...values, ...finiteThresholds, 1);
  const min = Math.min(0, ...values);
  const span = Math.max(1, max - min);
  const yTicks = [0, .25, .5, .75, 1].map(f => min + f * span);
  const longestTick = yTicks.map(v => formatMetricValue(metric, v)).reduce((longest, value) => value.length > longest.length ? value : longest, "");
  const tickWidth = Math.min(150, Math.max(48, longestTick.length * 6.4));
  const pad = { l: Math.min(Math.max(76, tickWidth + 54), Math.max(110, w * 0.28)), r: 26, t: 34, b: 58 };
  const axisLabelX = Math.max(14, pad.l - tickWidth - 34);
  const firstTime = chartRowTime(data[0]);
  const lastTime = chartRowTime(data[data.length - 1]);
  const x = (row, i) => {
    const timeSpan = Math.max(1, lastTime - firstTime);
    if (data.length > 1 && timeSpan > 1) return pad.l + ((chartRowTime(row) - firstTime) / timeSpan) * (w - pad.l - pad.r);
    return pad.l + (i / Math.max(1, data.length - 1)) * (w - pad.l - pad.r);
  };
  const y = v => h - pad.b - ((v - min) / span) * (h - pad.t - pad.b);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(data[i], i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const base = `${x(data[values.length - 1], values.length - 1)},${h - pad.b} L${pad.l},${h - pad.b} Z`;
  const barWidth = Math.max(4, Math.min(18, (w - pad.l - pad.r) / Math.max(8, data.length) * 0.55));
  const pointRadius = chartPointRadius(data.length, style);
  const showPoints = style === "points" || style === "xy" || data.length <= 1500;
  const anyDanger = values.some(v => thresholdSeverity(metric, v) === "danger");
  const anyWarn = values.some(v => thresholdSeverity(metric, v) === "warn");
  const stroke = anyDanger ? "#ff5c77" : anyWarn ? "#ff9f43" : metricColor(metric);
  const singlePointLine = data.length === 1 ? `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(values[0] || 0)}" y2="${y(values[0] || 0)}" stroke="${stroke}" stroke-width="3" opacity=".85"/>` : "";
  const bars = values.map((v, i) => `<rect x="${x(data[i], i) - barWidth / 2}" y="${y(v)}" width="${barWidth}" height="${h - pad.b - y(v)}" fill="${thresholdColor(metric, v)}" opacity=".86"/>`).join("");
  const points = showPoints ? values.map((v, i) => `<circle cx="${x(data[i], i)}" cy="${y(v)}" r="${pointRadius.toFixed(2)}" fill="${thresholdColor(metric, v)}"><title>${metricLabel(metric)}=${formatMetricValue(metric, v)} at ${timeLabel(data[i]?.t || 0, data[i]?.epochMs)}</title></circle>`).join("") : "";
  const xTickFractions = w < 520 ? [0, .5, 1] : [0, .25, .5, .75, 1];
  const xTicks = xTickFractions.map(f => {
    const targetTime = firstTime + f * Math.max(1, lastTime - firstTime);
    const row = data.reduce((best, item) => Math.abs(chartRowTime(item) - targetTime) < Math.abs(chartRowTime(best) - targetTime) ? item : best, data[0] || {});
    return { x: pad.l + f * (w - pad.l - pad.r), label: timeLabel(row?.t || 0, row?.epochMs) };
  });
  const showWarnLine = showThreshold && state.prefs.chartLayout.showThresholds && Number.isFinite(t.warn);
  const showDangerLine = showThreshold && state.prefs.chartLayout.showThresholds && Number.isFinite(t.danger);
  const warnY = showWarnLine ? y(t.warn) : 0;
  const dangerY = showDangerLine ? y(t.danger) : 0;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.dataset.metric = metric;
  svg.dataset.plotLeft = String(pad.l);
  svg.dataset.plotRight = String(w - pad.r);
  svg.dataset.plotTop = String(pad.t);
  svg.dataset.plotBottom = String(h - pad.b);
  svg.dataset.renderStyle = style;
  svg.innerHTML = `
    <defs><linearGradient id="areaFill-${metric.replace(/\W/g, "")}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${stroke}" stop-opacity=".48"/><stop offset="1" stop-color="${stroke}" stop-opacity="0"/></linearGradient></defs>
    <rect x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="#050910"/>
    ${yTicks.map(v => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#263241"/><text x="${pad.l - 10}" y="${y(v) + 4}" text-anchor="end" fill="#8c9aab" font-size="11">${formatMetricValue(metric, v)}</text>`).join("")}
    ${xTicks.map(tick => `<line x1="${tick.x}" x2="${tick.x}" y1="${pad.t}" y2="${h - pad.b}" stroke="#182434"/><text x="${tick.x}" y="${h - 18}" text-anchor="middle" fill="#8c9aab" font-size="11">${tick.label}</text>`).join("")}
    ${showWarnLine ? `<line x1="${pad.l}" x2="${w - pad.r}" y1="${warnY}" y2="${warnY}" stroke="#ff9f43" stroke-dasharray="7 6"/><text x="${w - pad.r - 6}" y="${warnY - 6}" text-anchor="end" fill="#ff9f43" font-size="11">warn ${formatMetricValue(metric, t.warn)}</text>` : ""}
    ${showDangerLine ? `<line x1="${pad.l}" x2="${w - pad.r}" y1="${dangerY}" y2="${dangerY}" stroke="#ff5c77" stroke-dasharray="4 4"/><text x="${w - pad.r - 6}" y="${dangerY - 6}" text-anchor="end" fill="#ff5c77" font-size="11">danger ${formatMetricValue(metric, t.danger)}</text>` : ""}
    <text x="${pad.l}" y="18" fill="#edf4ff" font-size="13" font-weight="700">${metricLabel(metric)}${renderData.reduced ? ` (${formatNumber(data.length)}/${formatNumber(renderData.total)} pts)` : ""}</text>
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="#c4d0de" font-size="12">Time since first snapshot (${escapeHtml(resolvedTimeZone())})</text>
    <text x="${axisLabelX}" y="${h / 2}" transform="rotate(-90 ${axisLabelX} ${h / 2})" text-anchor="middle" fill="#c4d0de" font-size="12">${metricLabel(metric)} ${metricUnit(metric) ? `(${metricUnit(metric)})` : ""}</text>
    ${style === "area" ? `${singlePointLine}<path d="${line} L${base}" fill="url(#areaFill-${metric.replace(/\W/g, "")})"/><path d="${line}" fill="none" stroke="${stroke}" stroke-width="3"/>${points}` : ""}
    ${style === "bars" ? bars : ""}
    ${style === "line" ? `${singlePointLine}<path d="${line}" fill="none" stroke="${stroke}" stroke-width="3"/>${points}` : ""}
    ${style === "points" || style === "xy" ? points : ""}
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="#52657a"/>
    <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="#52657a"/>
    <g class="crosshair-layer" data-crosshair-layer="1" pointer-events="none"></g>
    <rect class="zoom-capture" x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="transparent" pointer-events="all"/>
  `;
  if (state.prefs.chartLayout.showCrosshair) attachChartInteractions(svg);
}

function scheduleMultiChartDraw() {
  const charts = [...document.querySelectorAll("[data-mini-chart]")];
  if (!charts.length) return;
  const token = state.chartRenderToken + 1;
  state.chartRenderToken = token;
  const renderStyle = state.prefs.graphStyle === "xy" ? "points" : state.prefs.graphStyle;
  let index = 0;
  const drawSlice = () => {
    if (state.chartRenderToken !== token) return;
    const frameStart = performance.now();
    while (index < charts.length && performance.now() - frameStart < 12) {
      const svg = charts[index];
      if (svg?.isConnected) drawChartInto(svg, svg.dataset.miniChart, renderStyle, true);
      index += 1;
    }
    if (index < charts.length) requestAnimationFrame(drawSlice);
  };
  requestAnimationFrame(drawSlice);
}

function drawCorrelation() {
  const svg = document.querySelector("#correlationChart");
  if (!svg) return;
  const w = svg.clientWidth || 640;
  const h = svg.clientHeight || 300;
  const rows = renderableHistory(visibleHistory(), state.correlation.y, "xy", w).rows;
  const xs = rows.map(d => d[state.correlation.x] || 0);
  const ys = rows.map(d => d[state.correlation.y] || 0);
  const maxX = Math.max(...xs, 1);
  const maxY = Math.max(...ys, 1);
  const yTicks = [0, .25, .5, .75, 1].map(f => f * maxY);
  const longestYTick = yTicks.map(v => formatMetricValue(state.correlation.y, v)).reduce((longest, value) => value.length > longest.length ? value : longest, "");
  const yTickWidth = Math.min(150, Math.max(48, longestYTick.length * 6.4));
  const pad = { l: Math.min(Math.max(78, yTickWidth + 54), Math.max(112, w * 0.3)), r: 24, t: 32, b: 58 };
  const axisLabelX = Math.max(14, pad.l - yTickWidth - 34);
  const x = v => pad.l + (v / maxX) * (w - pad.l - pad.r);
  const y = v => h - pad.b - (v / maxY) * (h - pad.t - pad.b);
  const xTicks = [0, .25, .5, .75, 1].map(f => f * maxX);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = `
    <rect x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="#050910"/>
    ${yTicks.map(v => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#263241"/><text x="${pad.l - 10}" y="${y(v) + 4}" text-anchor="end" fill="#8c9aab" font-size="11">${formatMetricValue(state.correlation.y, v)}</text>`).join("")}
    ${xTicks.map(v => `<line x1="${x(v)}" x2="${x(v)}" y1="${pad.t}" y2="${h - pad.b}" stroke="#182434"/><text x="${x(v)}" y="${h - 18}" text-anchor="middle" fill="#8c9aab" font-size="11">${formatMetricValue(state.correlation.x, v)}</text>`).join("")}
    ${xs.map((value, i) => `<circle cx="${x(value)}" cy="${y(ys[i])}" r="1" fill="${thresholdColor(state.correlation.y, ys[i])}" opacity=".9"><title>${metricLabel(state.correlation.x)}=${formatMetricValue(state.correlation.x, value)}, ${metricLabel(state.correlation.y)}=${formatMetricValue(state.correlation.y, ys[i])}</title></circle>`).join("")}
    <text x="${pad.l}" y="18" fill="#edf4ff" font-size="13" font-weight="700">${metricLabel(state.correlation.x)} vs ${metricLabel(state.correlation.y)}</text>
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" fill="#c4d0de" font-size="12">${metricLabel(state.correlation.x)} (${metricUnit(state.correlation.x)})</text>
    <text x="${axisLabelX}" y="${h / 2}" transform="rotate(-90 ${axisLabelX} ${h / 2})" text-anchor="middle" fill="#c4d0de" font-size="12">${metricLabel(state.correlation.y)} (${metricUnit(state.correlation.y)})</text>
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="#52657a"/>
    <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="#52657a"/>
  `;
}

function svgPoint(svg, event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

function attachChartInteractions(svg) {
  if (svg.dataset.interactive === "1") return;
  svg.dataset.interactive = "1";
  let dragging = false;
  let startX = 0;
  const layer = () => svg.querySelector("[data-crosshair-layer]");
  const bounds = () => ({
    left: Number(svg.dataset.plotLeft),
    right: Number(svg.dataset.plotRight),
    top: Number(svg.dataset.plotTop),
    bottom: Number(svg.dataset.plotBottom)
  });
  const clampX = x => Math.max(bounds().left, Math.min(bounds().right, x));
  const drawOverlay = (x, dragX = null) => {
    const b = bounds();
    const lx = layer();
    if (!lx) return;
    const pct = (x - b.left) / Math.max(1, b.right - b.left);
    const metric = svg.dataset.metric || state.prefs.graphMetric;
    const renderStyle = svg.dataset.renderStyle || state.prefs.graphStyle;
    const rows = renderableHistory(visibleHistory(), metric, renderStyle, svg.clientWidth || 640).rows;
    const row = nearestChartRow(rows, pct);
    const value = row[metric] || 0;
    const selection = dragX == null ? "" : `<rect x="${Math.min(startX, dragX)}" y="${b.top}" width="${Math.abs(dragX - startX)}" height="${b.bottom - b.top}" fill="#5db7ff" opacity=".18" stroke="#5db7ff" stroke-dasharray="5 4"/>`;
    lx.innerHTML = `
      ${selection}
      <line x1="${x}" x2="${x}" y1="${b.top}" y2="${b.bottom}" stroke="#edf4ff" stroke-width="1.4" stroke-dasharray="4 4"/>
      <line x1="${b.left}" x2="${b.right}" y1="${b.bottom}" y2="${b.bottom}" stroke="#52657a"/>
      <rect x="${Math.min(x + 10, b.right - 190)}" y="${b.top + 8}" width="180" height="48" rx="6" fill="#0b1018" stroke="#52657a"/>
      <text x="${Math.min(x + 20, b.right - 180)}" y="${b.top + 28}" fill="#edf4ff" font-size="12">${timeLabel(row.t || 0, row.epochMs)}</text>
      <text x="${Math.min(x + 20, b.right - 180)}" y="${b.top + 46}" fill="${thresholdColor(metric, value)}" font-size="12">${metricLabel(metric)}: ${formatMetricValue(metric, value)}</text>
    `;
  };
  svg.addEventListener("pointermove", event => {
    const p = svgPoint(svg, event);
    const x = clampX(p.x);
    drawOverlay(x, dragging ? x : null);
  });
  svg.addEventListener("pointerdown", event => {
    const p = svgPoint(svg, event);
    startX = clampX(p.x);
    dragging = true;
    svg.setPointerCapture(event.pointerId);
    drawOverlay(startX, startX);
  });
  svg.addEventListener("pointerup", event => {
    if (!dragging) return;
    const b = bounds();
    const endX = clampX(svgPoint(svg, event).x);
    dragging = false;
    const span = Math.abs(endX - startX);
    if (span > 12) {
      const a = (Math.min(startX, endX) - b.left) / (b.right - b.left);
      const z = (Math.max(startX, endX) - b.left) / (b.right - b.left);
      const currentStart = state.chartZoom.start;
      const currentWidth = state.chartZoom.end - state.chartZoom.start;
      setZoom(currentStart + a * currentWidth, currentStart + z * currentWidth);
      render();
    } else {
      drawOverlay(endX);
    }
  });
  svg.addEventListener("pointerleave", () => {
    if (!dragging && layer()) layer().innerHTML = "";
  });
}

async function saveChartsPng() {
  const svgs = [...document.querySelectorAll("svg.chart")];
  if (!svgs.length) {
    toast("No chart to save", "Open the Charts tab first.", "warn");
    return;
  }
  const width = Math.max(...svgs.map(svg => svg.clientWidth || 640));
  const gap = 24;
  const heights = svgs.map(svg => svg.clientHeight || 300);
  const totalHeight = heights.reduce((sum, height) => sum + height, 0) + gap * (svgs.length - 1);
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = totalHeight * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  ctx.fillStyle = "#05070b";
  ctx.fillRect(0, 0, width, totalHeight);
  let y = 0;
  for (let i = 0; i < svgs.length; i += 1) {
    const svg = svgs[i];
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    ctx.drawImage(img, 0, y, svg.clientWidth || width, heights[i]);
    URL.revokeObjectURL(url);
    y += heights[i] + gap;
  }
  const png = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  const url = URL.createObjectURL(png);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ultimate-network-expert-charts-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast("Charts exported", "PNG export has been generated.");
}

async function importFile(file) {
  state.importStatus = { title: "Preparing import", detail: `${file.name} (${formatNumber(file.size)} bytes)`, progress: 1 };
  state.raw = "";
  state.sockets = [];
  state.anomalies = [];
  state.selectedId = null;
  setActiveInvestigation(state, null);
  setSourceName(file.name);
  state.view = "ingest";
  state.analysisDirty = false;
  resetDerivedCaches({ raw: true });
  render();

  const result = await importSocketFile(file, {
    formatNumber,
    preFilter: state.preImportFilters.enabled ? { ...state.preImportFilters } : null,
    onProgress(update, options = {}) {
      state.raw = update.raw;
      state.importStatus = update.status;
      if (options.render !== false) {
        resetDerivedCaches({ raw: true });
        state.sockets = hasTimestampedRawData() ? aggregateParsedSocketsByKey(update.sockets) : update.sockets;
        recomputeFromSockets();
        render();
      } else {
        state.sockets = update.sockets;
      }
    }
  });

  state.raw = result.raw;
  state.sockets = result.sockets;
  setSourceName(result.sourceName);
  rememberFilterHistory(state.preImportFilters);
  state.importStatus = null;
  state.view = "analysis";
  state.activeTab = "advisor";
  resetDerivedCaches({ raw: true });
  if (hasTimestampedRawData()) {
    recompute();
  } else {
    recomputeFromSockets();
  }
  toast("Import complete", `${formatNumber(state.sockets.length)} sockets parsed from ${file.name}.`);
  render();
}

function rememberFilterHistory(filters) {
  if (!filters.enabled || !hasPreImportFilterValue(filters)) return;
  const normalized = normalizePreImportFilters(filters);
  state.filterHistory = [
    { ...normalized, at: Date.now() },
    ...state.filterHistory
  ].filter((item, index, all) => index === all.findIndex(other =>
    other.protocol === item.protocol &&
    other.state === item.state &&
    other.srcIp === item.srcIp &&
    other.dstIp === item.dstIp &&
    other.anyPort === item.anyPort &&
    other.srcPort === item.srcPort &&
    other.dstPort === item.dstPort
  )).slice(0, 40);
  saveFilterHistory();
}

function toast(title, text, type = "") {
  const stack = document.querySelector("#toastStack");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p>`;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 5200);
}

function bindEvents() {
  document.querySelectorAll("[data-action]").forEach(btn => btn.addEventListener("click", event => {
    const action = event.currentTarget.dataset.action;
    if (action === "parse") {
      const commandInput = document.querySelector("#commandInput");
      const rawInput = document.querySelector("#rawInput");
      state.command = commandInput ? commandInput.value : state.command;
      state.raw = rawInput ? rawInput.value : state.raw;
      setActiveInvestigation(state, null);
      resetDerivedCaches({ raw: true });
      recompute();
      if (state.prefs.autoToast) {
        const top = state.anomalies[0];
        toast("Analysis complete", top ? `${top.severity}: ${top.title}` : "No major anomaly detected.", top?.severity === "critical" ? "danger" : "warn");
      }
      state.view = "analysis";
      state.activeTab = "advisor";
      render();
    }
    if (action === "sample") { state.raw = SAMPLE; setSourceName("built-in sample"); setActiveInvestigation(state, null); markAnalysisDirty({ raw: true }); toast("Sample loaded", "Demo ss snapshot loaded."); render(); }
    if (action === "sample10m") {
      state.raw = generateTenMinuteSample();
      setSourceName("10-minute synthetic sample");
      state.selectedId = null;
      setActiveInvestigation(state, null);
      state.view = "analysis";
      state.activeTab = "advisor";
      setZoom(0, 1);
      markAnalysisDirty({ raw: true });
      toast("10-minute sample loaded", "600 timestamped snapshots, one per second, are ready for analysis.");
      render();
    }
    if (action === "clear") { state.raw = ""; markAnalysisDirty({ raw: true }); render(); }
    if (action === "resetAll") {
      resetAllState();
      toast("Workspace reset", "All loaded data, filters, zoom, and UI selections have been cleared.");
      render();
    }
    if (action === "pickFile") { document.querySelector("#fileInput")?.click(); }
    if (action === "guide") { state.drawer = "guide"; render(); }
    if (action === "prefs") { state.drawer = "prefs"; render(); }
    if (action === "details") { state.drawer = "details"; render(); }
    if (action === "columns") { state.modal = "columns"; render(); }
    if (action === "thresholds") { state.drawer = "thresholds"; render(); }
    if (action === "layoutPrefs") { state.modal = "layout"; render(); }
    if (action === "serviceAliases") { state.modal = "serviceAliases"; render(); }
    if (action === "topology") { state.modal = "topology"; render(); }
    if (action === "toggleDeepAnalysis") {
      state.prefs.deepAnalysis = !state.prefs.deepAnalysis;
      savePrefs();
      toast(state.prefs.deepAnalysis ? "Deep analysis enabled" : "Deep analysis paused", state.prefs.deepAnalysis ? "The advisor will prioritize findings in the background." : "Raw tables and anomalies remain available.");
      render();
    }
    if (action === "setBaseline") {
      state.baseline = createBaseline();
      state.activeTab = "compare";
      toast("Baseline captured", `${formatNumber(state.baseline.sockets.length)} sockets saved as before state.`);
      render();
    }
    if (action === "clearBaseline") {
      state.baseline = null;
      toast("Baseline cleared", "Before/after comparison is reset.");
      render();
    }
    if (action === "copyAdvisorCommands") {
      const finding = state.advisorFindings.find(item => item.id === event.currentTarget.dataset.findingId);
      navigator.clipboard?.writeText((finding?.commands || []).join("\n"));
      toast("Advisor commands copied", "Suggested command line evidence has been copied.");
    }
    if (action === "addAlertRule") {
      const name = document.querySelector("#alertRuleName")?.value.trim() || "";
      const metric = document.querySelector("#alertRuleMetric")?.value || "rtt";
      const op = document.querySelector("#alertRuleOp")?.value || ">=";
      const value = Number(document.querySelector("#alertRuleValue")?.value || 0);
      const severity = document.querySelector("#alertRuleSeverity")?.value || "medium";
      if (!name || !Number.isFinite(value)) {
        toast("Alert rule incomplete", "Add a name and numeric threshold before saving the rule.", "danger");
        return;
      }
      state.alertRules = [{ id: `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`, name, metric, op, value, severity, enabled: true }, ...state.alertRules];
      saveAlertRules();
      toast("Alert rule added", `${name} is now evaluated against parsed sockets.`);
      render();
    }
    if (action === "ackAllAlerts") {
      state.alertEvents.filter(event => !event.acknowledged).forEach(event => { state.alertAcks[event.id] = Date.now(); });
      saveAlertAcks();
      toast("Alerts acknowledged", "All current active alerts were acknowledged.");
      render();
    }
    if (action === "resetAlertRules") {
      state.alertRules = defaultAlertRules();
      state.alertAcks = {};
      saveAlertRules();
      saveAlertAcks();
      toast("Default alert rules restored", "Alert rules and acknowledgements were reset.");
      render();
    }
    if (action === "clearFilterHistory") {
      state.filterHistory = [];
      saveFilterHistory();
      toast("Filter history cleared", "Saved filter suggestions have been removed.");
      render();
    }
    if (action === "startImportWithFilters") {
      const nextFilters = {
        enabled: Boolean(document.querySelector("#preImportEnabled")?.checked),
        protocol: document.querySelector("#preProtocol")?.value || "",
        state: document.querySelector("#preState")?.value || "",
        srcIp: document.querySelector("#preSrcIp")?.value.trim() || "",
        dstIp: document.querySelector("#preDstIp")?.value.trim() || "",
        anyPort: document.querySelector("#preAnyPort")?.value.trim() || "",
        srcPort: document.querySelector("#preSrcPort")?.value.trim() || "",
        dstPort: document.querySelector("#preDstPort")?.value.trim() || ""
      };
      const hasFilterValue = hasPreImportFilterValue(nextFilters);
      nextFilters.enabled = hasFilterValue;
      state.preImportFilters = nextFilters;
      if (!hasFilterValue) toast("Importing everything", "No pre-import filter was entered, so the full file will be parsed.");
      const file = state.pendingFile;
      state.pendingFile = null;
      state.modal = null;
      if (file) importFile(file).catch(error => {
        state.importStatus = null;
        toast("Import failed", error.message || "The selected file could not be read.", "danger");
        render();
      });
    }
    if (action === "startImportAll") {
      state.preImportFilters = emptyPreImportFilters();
      const file = state.pendingFile;
      state.pendingFile = null;
      state.modal = null;
      if (file) importFile(file).catch(error => {
        state.importStatus = null;
        toast("Import failed", error.message || "The selected file could not be read.", "danger");
        render();
      });
    }
    if (action === "zoomIn") {
      const width = state.chartZoom.end - state.chartZoom.start;
      const center = state.chartZoom.start + width / 2;
      const next = width * 0.62;
      setZoom(center - next / 2, center + next / 2);
      render();
    }
    if (action === "zoomOut") {
      const width = state.chartZoom.end - state.chartZoom.start;
      const center = state.chartZoom.start + width / 2;
      const next = Math.min(1, width / 0.62);
      setZoom(center - next / 2, center + next / 2);
      render();
    }
    if (action === "panLeft" || action === "panRight") {
      const width = state.chartZoom.end - state.chartZoom.start;
      const delta = width * 0.25 * (action === "panLeft" ? -1 : 1);
      setZoom(state.chartZoom.start + delta, state.chartZoom.end + delta);
      render();
    }
    if (action === "resetZoom") { setZoom(0, 1); render(); }
    if (action === "saveCharts") { saveChartsPng().catch(error => toast("Export failed", error.message || "PNG export failed.", "danger")); }
    if (action === "saveThresholds") {
      document.querySelectorAll("[data-threshold]").forEach(input => {
        const metric = input.dataset.threshold;
        const key = input.dataset.thresholdKey;
        state.thresholds[metric][key] = parseFormattedNumber(input.value);
      });
      toast("Thresholds saved", "Chart comfort, warning, and danger zones have been updated.");
      state.drawer = null;
      render();
    }
    if (action === "resetThresholdDefaults") {
      state.thresholds = cloneThresholds();
      toast("Expert defaults restored", "Thresholds have been reset to the built-in network analysis baseline.");
      render();
    }
    if (action === "saveLayout") {
      const l = state.prefs.chartLayout;
      l.columns = clampChartColumns(document.querySelector("#layoutColumns")?.value || l.columns);
      l.density = document.querySelector("#layoutDensity")?.value || l.density;
      l.mainChart = Boolean(document.querySelector("#layoutMainChart")?.checked);
      l.sharedZoom = Boolean(document.querySelector("#layoutSharedZoom")?.checked);
      l.showLegend = Boolean(document.querySelector("#layoutLegend")?.checked);
      l.showCrosshair = Boolean(document.querySelector("#layoutCrosshair")?.checked);
      l.showThresholds = Boolean(document.querySelector("#layoutThresholds")?.checked);
      l.stickyToolbar = Boolean(document.querySelector("#layoutStickyToolbar")?.checked);
      const preset = document.querySelector("#layoutPreset")?.value;
      if (preset === "noc") Object.assign(l, { columns: 3, density: "compact", mainChart: true, sharedZoom: true, showLegend: true });
      if (preset === "deep") Object.assign(l, { columns: 2, density: "tall", mainChart: true, sharedZoom: true, showLegend: true });
      if (preset === "single") Object.assign(l, { columns: 1, density: "tall", mainChart: true, sharedZoom: true, showLegend: true });
      savePrefs();
      toast("Layout saved", "Chart layout preferences have been stored in this browser.");
      state.modal = null;
      render();
    }
    if (action === "resetGrid") {
      state.table = {
        ...state.table,
        page: 1,
        pageSize: state.prefs.defaultPageSize,
        sortKey: "risk",
        sortDir: "desc",
        pinned: ["risk", "state", "local"],
        visible: defaultTableColumns(),
        order: TABLE_COLUMNS.map(c => c.key),
        filters: { text: "", risk: "all", state: "all", family: "all", minRecvQ: "", minSendQ: "", minRtt: "", srcIp: "", dstIp: "", srcPort: "", dstPort: "", process: "", onlyAnomalies: false }
      };
      render();
    }
    if (action === "saveTableLayout") {
      const name = document.querySelector("#tableLayoutName")?.value?.trim() || "";
      if (!name) {
        toast("Layout name required", "Give this table layout a name before saving.", "danger");
        return;
      }
      const next = tableLayoutSnapshot(name);
      state.tableProfiles = [next, ...state.tableProfiles.filter(profile => profile.name.toLowerCase() !== name.toLowerCase())];
      saveTableProfiles();
      toast("Table layout saved", `"${name}" is now available in named table layouts.`);
      render();
    }
    if (action === "saveDashboard") {
      const name = document.querySelector("#dashboardName")?.value?.trim() || "";
      if (!name) {
        toast("Dashboard name required", "Give this dashboard a name before saving.", "danger");
        return;
      }
      const next = dashboardSnapshot(name);
      state.dashboardProfiles = [next, ...state.dashboardProfiles.filter(profile => profile.name.toLowerCase() !== name.toLowerCase())];
      saveDashboardProfiles();
      toast("Dashboard saved", `"${name}" is ready in saved dashboards.`);
      render();
    }
    if (action === "saveServiceAlias") {
      const endpoint = document.querySelector("#aliasEndpoint")?.value?.trim() || "";
      if (!endpoint) {
        toast("Endpoint required", "Choose an IP:port endpoint before saving a service label.", "danger");
        return;
      }
      state.serviceAliases = upsertEndpointAlias(state.serviceAliases, endpoint, {
        label: document.querySelector("#aliasLabel")?.value || "",
        role: document.querySelector("#aliasRole")?.value || "",
        note: document.querySelector("#aliasNote")?.value || ""
      });
      state.aliasEditKey = endpoint;
      saveServiceAliases();
      toast("Service label saved", `${aliasDisplay(endpoint, state.serviceAliases)} is now shown on the map and tables.`);
      render();
    }
    if (action === "deleteServiceAlias") {
      const endpoint = document.querySelector("#aliasEndpoint")?.value?.trim() || "";
      state.serviceAliases = deleteEndpointAlias(state.serviceAliases, endpoint);
      saveServiceAliases();
      toast("Service label deleted", endpoint || "Endpoint label removed.");
      render();
    }
    if (action === "saveTopologyGroup") {
      const name = document.querySelector("#topologyName")?.value?.trim() || "";
      const match = document.querySelector("#topologyMatch")?.value?.trim() || "";
      if (!name || !match) {
        toast("Topology group incomplete", "Add a group name and at least one IP or IP:port matcher.", "danger");
        return;
      }
      state.topology = upsertTopologyGroup(state.topology, {
        id: state.topologyEditId || "",
        name,
        match,
        color: document.querySelector("#topologyColor")?.value || "cyan",
        note: document.querySelector("#topologyNote")?.value || ""
      });
      state.topologyEditId = state.topology.groups[0]?.id || "";
      state.topologyDraftMatch = "";
      saveCurrentTopology();
      toast("Topology group saved", `${name} is mapped for ${state.sourceName}.`);
      render();
    }
    if (action === "deleteTopologyGroup") {
      if (!state.topologyEditId) return;
      state.topology = deleteTopologyGroup(state.topology, state.topologyEditId);
      state.topologyEditId = "";
      state.topologyDraftMatch = "";
      saveCurrentTopology();
      toast("Topology group deleted", "This recording topology was updated.");
      render();
    }
    if (action === "closeDrawer") { state.drawer = null; render(); }
    if (action === "closeModal") { state.modal = null; state.helpColumn = null; render(); }
    if (action === "savePrefs") {
      state.prefs.severityFloor = document.querySelector("#prefSeverity")?.value || state.prefs.severityFloor;
      state.prefs.autoToast = document.querySelector("#prefToast")?.checked ?? state.prefs.autoToast;
      state.prefs.deepAnalysis = document.querySelector("#prefDeepAnalysis")?.checked ?? state.prefs.deepAnalysis;
      state.prefs.compactRows = document.querySelector("#prefCompact")?.checked ?? state.prefs.compactRows;
      state.prefs.tableUnits = document.querySelector("#prefTableUnits")?.checked ?? state.prefs.tableUnits;
      state.prefs.colorBlind = document.querySelector("#prefColorBlind")?.checked ?? state.prefs.colorBlind;
      state.prefs.linuxProfile = document.querySelector("#prefLinuxProfile")?.value || state.prefs.linuxProfile;
      state.prefs.accessRole = document.querySelector("#prefAccessRole")?.value || state.prefs.accessRole;
      state.prefs.ubuntuVersion = document.querySelector("#prefUbuntuVersion")?.value || state.prefs.ubuntuVersion;
      state.prefs.numberLocale = document.querySelector("#prefNumberLocale")?.value || state.prefs.numberLocale;
      state.prefs.numberGrouping = document.querySelector("#prefNumberGrouping")?.checked ?? state.prefs.numberGrouping;
      state.prefs.chartTimeZone = document.querySelector("#prefChartTimeZone")?.value || state.prefs.chartTimeZone;
      state.prefs.chartPointSize = document.querySelector("#prefChartPointSize")?.value || state.prefs.chartPointSize;
      state.prefs.paginationPosition = document.querySelector("#prefPagination")?.value || state.prefs.paginationPosition;
      state.prefs.defaultPageSize = Number(document.querySelector("#prefPageSize")?.value || state.prefs.defaultPageSize);
      state.table.pageSize = state.prefs.defaultPageSize;
      state.prefs.graphWindow = Number(document.querySelector("#prefWindow")?.value || state.prefs.graphWindow);
      savePrefs();
      toast("Preferences saved", "Your settings will be kept in this browser.");
      render();
    }
  }));

  document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", event => {
    state.view = event.currentTarget.dataset.view;
    render();
  }));
  document.querySelectorAll("[data-context-action]").forEach(btn => btn.addEventListener("click", event => {
    const action = event.currentTarget.dataset.contextAction;
    const socket = selectedSocket();
    const suggestedMetric = socket ? state.anomalies.find(anomaly => anomaly.socketId === socket.id)?.metric : null;
    applyContextAction(state, action, socket, { chartMetrics: chartMetricList(), suggestedMetric });
    renderKeepingWorkspacePosition();
  }));
  document.querySelectorAll("[data-pref-tab]").forEach(btn => btn.addEventListener("click", event => {
    state.prefsTab = event.currentTarget.dataset.prefTab;
    render();
  }));

  document.querySelector("#fileInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.pendingFile = file;
    state.modal = "preImport";
    render();
  });
  document.querySelectorAll("[data-preimport-preset]").forEach(btn => btn.addEventListener("click", event => {
    const preset = PRE_IMPORT_PRESETS.find(item => item.id === event.currentTarget.dataset.preimportPreset);
    if (!preset) return;
    state.preImportFilters = {
      ...emptyPreImportFilters(),
      ...preset.filters,
      enabled: true
    };
    toast("Pre-import preset applied", `${preset.label}: filters will run while reading the file.`);
    render();
  }));

  document.querySelectorAll("[data-tab]").forEach(tab => tab.addEventListener("click", event => {
    state.activeTab = event.currentTarget.dataset.tab;
    render();
  }));
  document.querySelectorAll("[data-map-alias]").forEach(node => node.addEventListener("click", event => {
    event.stopPropagation();
    state.aliasEditKey = event.currentTarget.dataset.mapAlias;
    state.modal = "serviceAliases";
    render();
  }));
  document.querySelectorAll("[data-alias-pick]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    state.aliasEditKey = event.currentTarget.dataset.aliasPick;
    state.modal = "serviceAliases";
    renderKeepingModalPosition();
  }));
  document.querySelector("#aliasEndpoint")?.addEventListener("change", event => {
    state.aliasEditKey = event.target.value;
    renderKeepingModalPosition();
  });
  document.querySelectorAll("[data-topology-edit]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    state.topologyEditId = event.currentTarget.dataset.topologyEdit;
    state.topologyDraftMatch = "";
    state.modal = "topology";
    renderKeepingModalPosition();
  }));
  document.querySelectorAll("[data-topology-suggest]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    state.topologyEditId = "";
    state.topologyDraftMatch = event.currentTarget.dataset.topologySuggest;
    state.modal = "topology";
    renderKeepingModalPosition();
  }));
  document.querySelectorAll("[data-guide-tab]").forEach(tab => tab.addEventListener("click", event => {
    state.guideTab = event.currentTarget.dataset.guideTab;
    render();
  }));
  document.querySelectorAll("[data-action-menu]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const id = event.currentTarget.dataset.actionMenu;
    if (state.openMenuId === id) {
      state.openMenuId = null;
      state.openMenuPos = null;
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const menuWidth = 250;
      const menuHeight = 188;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8);
      const preferBelow = rect.bottom + menuHeight + 8 <= window.innerHeight;
      const top = preferBelow ? rect.bottom + 6 : Math.max(8, rect.top - menuHeight - 6);
      state.openMenuId = id;
      state.openMenuPos = { left: Math.round(left), top: Math.round(top) };
    }
    render();
  }));
  document.querySelectorAll("[data-conversation-insight]").forEach(btn => {
    btn.addEventListener("click", event => {
      event.stopPropagation();
      const key = event.currentTarget.dataset.conversationInsight;
      if (state.openConversationInsightKey === key) {
        state.openConversationInsightKey = null;
        state.openConversationInsightPos = null;
      } else {
        positionConversationInsight(event.currentTarget);
      }
      renderKeepingWorkspacePosition();
    });
  });
  document.querySelectorAll(".conversation-insight-popover").forEach(popover => popover.addEventListener("click", event => {
    event.stopPropagation();
  }));
  document.querySelectorAll("[data-conversation-close]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    state.openConversationInsightKey = null;
    state.openConversationInsightPos = null;
    renderKeepingWorkspacePosition();
  }));
  document.querySelectorAll("[data-conversation-action]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const socket = state.sockets.find(s => s.id === event.currentTarget.dataset.socketId);
    if (!socket) return;
    const action = event.currentTarget.dataset.conversationAction;
    const metric = event.currentTarget.dataset.metric || "rtt";
    state.selectedId = socket.id;
    setActiveInvestigation(state, socket.id, "Chosen from conversation action");
    state.openConversationInsightKey = null;
    state.openConversationInsightPos = null;
    if (action === "chart") {
      state.view = "charts";
      if (chartMetricList().includes(metric)) {
        state.prefs.graphMetric = metric;
        state.chartMetrics = [...new Set([metric, ...state.chartMetrics])];
      }
      toast("Conversation chart opened", `${metricLabel(metric)} for ${socket.local} -> ${socket.peer}.`);
    }
    if (action === "details") {
      state.activeTab = "sockets";
      state.drawer = "details";
      toast("Conversation context selected", `${socket.local} -> ${socket.peer}.`);
    }
    if (action === "anomalies") {
      state.view = "analysis";
      state.activeTab = "anomalies";
      state.anomalyFilters = { ...state.anomalyFilters, severity: "all", metric: metric === "socket" ? "all" : metric, text: socket.id, sort: "priority" };
      toast("Anomalies filtered", "Showing detailed signals for this conversation.");
    }
    render();
  }));
  document.querySelectorAll("[data-row-action]").forEach(btn => btn.addEventListener("click", async event => {
    event.stopPropagation();
    const socket = state.sockets.find(s => s.id === event.currentTarget.dataset.socketId);
    if (!socket) return;
    const action = event.currentTarget.dataset.rowAction;
    state.selectedId = socket.id;
    setActiveInvestigation(state, socket.id, "Chosen from row action");
    state.openMenuId = null;
    state.openMenuPos = null;
    if (action === "chart") {
      state.view = "charts";
      toast("Chart context selected", `${socket.local} -> ${socket.peer}`);
    }
    if (action === "details") {
      state.drawer = "details";
    }
    if (action === "filter-src") {
      state.table.filters.srcIp = socket.localAddress.host;
      state.table.page = 1;
    }
    if (action === "filter-dst") {
      state.table.filters.dstIp = socket.peerAddress.host;
      state.table.page = 1;
    }
    if (action === "copy") {
      await navigator.clipboard?.writeText(socket.raw);
      toast("Socket row copied", "Raw ss row has been copied to the clipboard.");
    }
    render();
  }));
  document.querySelectorAll("[data-socket]").forEach(row => row.addEventListener("click", event => {
    state.selectedId = event.currentTarget.dataset.socket;
    setActiveInvestigation(state, state.selectedId, "Chosen by clicking a row");
    state.openConversationInsightKey = null;
    state.openConversationInsightPos = null;
    render();
  }));
  document.querySelectorAll("[data-sort]").forEach(btn => btn.addEventListener("click", event => {
    const key = event.currentTarget.dataset.sort;
    state.table.sortDir = state.table.sortKey === key && state.table.sortDir === "desc" ? "asc" : "desc";
    state.table.sortKey = key;
    state.table.page = 1;
    render();
  }));
  document.querySelectorAll("[data-page]").forEach(btn => btn.addEventListener("click", event => {
    const action = event.currentTarget.dataset.page;
    const total = Number(event.currentTarget.dataset.totalPages || Math.max(1, Math.ceil(sortedFilteredSockets().length / state.table.pageSize)));
    if (action === "first") state.table.page = 1;
    if (action === "prev") state.table.page = Math.max(1, state.table.page - 1);
    if (action === "next") state.table.page = Math.min(total, state.table.page + 1);
    if (action === "last") state.table.page = total;
    render();
  }));
  document.querySelectorAll("[data-pin-col]").forEach(btn => btn.addEventListener("click", event => {
    const key = event.currentTarget.dataset.pinCol;
    state.table.pinned = state.table.pinned.includes(key) ? state.table.pinned.filter(x => x !== key) : [...state.table.pinned, key];
    event.currentTarget.closest(".modal") ? renderKeepingModalPosition() : render();
  }));
  document.querySelectorAll("[data-column-help]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    state.helpColumn = event.currentTarget.dataset.columnHelp;
    state.modal = "columnHelp";
    render();
  }));
  document.querySelectorAll("[data-hide-col]").forEach(btn => btn.addEventListener("click", event => {
    const key = event.currentTarget.dataset.hideCol;
    state.table.visible = state.table.visible.filter(x => x !== key);
    state.table.pinned = state.table.pinned.filter(x => x !== key);
    if (!state.table.visible.length) state.table.visible = ["risk"];
    event.currentTarget.closest(".modal") ? renderKeepingModalPosition() : render();
  }));
  document.querySelectorAll("[data-load-table-layout]").forEach(btn => btn.addEventListener("click", event => {
    applyTableLayout(state.tableProfiles.find(profile => profile.id === event.currentTarget.dataset.loadTableLayout));
    toast("Table layout applied", "Column order, visibility, pinning, sort, and page size have been restored.");
    render();
  }));
  document.querySelectorAll("[data-delete-table-layout]").forEach(btn => btn.addEventListener("click", event => {
    state.tableProfiles = state.tableProfiles.filter(profile => profile.id !== event.currentTarget.dataset.deleteTableLayout);
    saveTableProfiles();
    toast("Table layout deleted", "The saved table layout has been removed.");
    render();
  }));
  document.querySelectorAll("[data-dashboard-preset]").forEach(btn => btn.addEventListener("click", event => {
    const presetId = event.currentTarget.dataset.dashboardPreset;
    applyDashboardPreset(presetId);
    toast("Dashboard preset applied", DASHBOARD_PRESETS[presetId]?.name || "Preset applied.");
    render();
  }));
  document.querySelectorAll("[data-load-dashboard]").forEach(btn => btn.addEventListener("click", event => {
    applyDashboardProfile(state.dashboardProfiles.find(profile => profile.id === event.currentTarget.dataset.loadDashboard));
    toast("Dashboard loaded", "Saved widgets, layout, style, and correlation were restored.");
    render();
  }));
  document.querySelectorAll("[data-delete-dashboard]").forEach(btn => btn.addEventListener("click", event => {
    state.dashboardProfiles = state.dashboardProfiles.filter(profile => profile.id !== event.currentTarget.dataset.deleteDashboard);
    saveDashboardProfiles();
    toast("Dashboard deleted", "The saved dashboard has been removed.");
    render();
  }));
  document.querySelectorAll("[data-template-apply]").forEach(btn => btn.addEventListener("click", event => {
    const templateId = event.currentTarget.dataset.templateApply;
    applyAnalysisTemplate(templateId);
    toast("Analysis template applied", ANALYSIS_TEMPLATES[templateId]?.name || "Template applied.");
    render();
  }));
  document.querySelectorAll("[data-alert-ack]").forEach(btn => btn.addEventListener("click", event => {
    const id = event.currentTarget.dataset.alertAck;
    if (state.alertAcks[id]) delete state.alertAcks[id];
    else state.alertAcks[id] = Date.now();
    saveAlertAcks();
    render();
  }));
  document.querySelectorAll("[data-alert-rule-toggle]").forEach(input => input.addEventListener("change", event => {
    const rule = state.alertRules.find(item => item.id === event.currentTarget.dataset.alertRuleToggle);
    if (rule) rule.enabled = event.currentTarget.checked;
    saveAlertRules();
    render();
  }));
  document.querySelectorAll("[data-alert-rule-delete]").forEach(btn => btn.addEventListener("click", event => {
    state.alertRules = state.alertRules.filter(rule => rule.id !== event.currentTarget.dataset.alertRuleDelete);
    saveAlertRules();
    render();
  }));
  document.querySelectorAll("[draggable][data-col-key]").forEach(item => {
    item.addEventListener("dragstart", event => {
      event.dataTransfer.setData("text/plain", event.currentTarget.dataset.colKey);
      event.dataTransfer.effectAllowed = "move";
      event.currentTarget.classList.add("dragging");
    });
    item.addEventListener("dragend", event => {
      event.currentTarget.classList.remove("dragging");
      document.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
    });
    item.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      event.currentTarget.classList.add("drag-over");
    });
    item.addEventListener("dragleave", event => {
      event.currentTarget.classList.remove("drag-over");
    });
    item.addEventListener("drop", event => {
      event.preventDefault();
      const from = event.dataTransfer.getData("text/plain");
      const to = event.currentTarget.dataset.colKey;
      if (moveTableColumn(from, to)) render();
    });
  });
  document.querySelectorAll("[data-move-chart]").forEach(btn => btn.addEventListener("click", event => {
    const metric = event.currentTarget.dataset.moveChart;
    const dir = Number(event.currentTarget.dataset.dir);
    if (event.currentTarget.closest("[data-chart-card]")) {
      if (moveVisibleChartMetric(metric, dir)) renderKeepingWorkspacePosition();
      return;
    }
    const order = [...state.prefs.chartLayout.panelOrder];
    const index = order.indexOf(metric);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    state.prefs.chartLayout.panelOrder = order;
    savePrefs();
    render();
  }));
  document.querySelectorAll("[data-visible-col]").forEach(input => input.addEventListener("change", event => {
    const key = event.currentTarget.dataset.visibleCol;
    state.table.visible = event.currentTarget.checked
      ? [...new Set([...state.table.visible, key])]
      : state.table.visible.filter(x => x !== key);
    if (!event.currentTarget.checked) state.table.pinned = state.table.pinned.filter(x => x !== key);
    if (!state.table.visible.length) state.table.visible = ["risk"];
    renderKeepingModalPosition();
  }));
  document.querySelectorAll("[data-jump]").forEach(btn => btn.addEventListener("click", event => {
    state.selectedId = event.currentTarget.dataset.jump;
    setActiveInvestigation(state, state.selectedId, "Chosen from navigation jump");
    state.activeTab = "sockets";
    render();
  }));
  document.querySelectorAll("[data-opt]").forEach(input => input.addEventListener("change", event => {
    const opt = event.currentTarget.dataset.opt;
    const tokens = tokenizeCommand(state.command);
    const set = new Set(tokens);
    event.currentTarget.checked ? set.add(opt) : set.delete(opt);
    state.command = `ss ${Array.from(set).join(" ")}`.replace(/\s+/g, " ").trim();
    render();
  }));
  for (const [id, key] of [["metricSelect", "graphMetric"], ["styleSelect", "graphStyle"]]) {
    document.querySelector(`#${id}`)?.addEventListener("change", e => { state.prefs[key] = e.target.value; savePrefs(); render(); });
  }
  document.querySelector("#chartTimeZoneSelect")?.addEventListener("change", e => {
    state.prefs.chartTimeZone = e.target.value;
    savePrefs();
    render();
  });
  for (const [id, key] of [["windowInput", "graphWindow"], ["thresholdInput", "graphThreshold"], ["samplingInput", "sampling"]]) {
    document.querySelector(`#${id}`)?.addEventListener("change", e => { state.prefs[key] = Number(e.target.value); savePrefs(); render(); });
  }
  document.querySelector("#startTimeInput")?.addEventListener("change", () => { setZoomFromDateInputs(); render(); });
  document.querySelector("#endTimeInput")?.addEventListener("change", () => { setZoomFromDateInputs(); render(); });
  document.querySelector("#searchInput")?.addEventListener("change", e => { state.table.filters.text = e.target.value; state.table.page = 1; render(); });
  for (const [id, key] of [["riskFilter", "risk"], ["stateFilter", "state"], ["familyFilter", "family"], ["processFilter", "process"], ["srcIpFilter", "srcIp"], ["dstIpFilter", "dstIp"], ["srcPortFilter", "srcPort"], ["dstPortFilter", "dstPort"], ["minRecvQ", "minRecvQ"], ["minSendQ", "minSendQ"], ["minRtt", "minRtt"]]) {
    document.querySelector(`#${id}`)?.addEventListener("change", e => { state.table.filters[key] = e.target.value; state.table.page = 1; render(); });
  }
  document.querySelectorAll("input[list]").forEach(input => {
    input.addEventListener("pointerdown", event => {
      const arrowZone = input.getBoundingClientRect().right - 34;
      if (event.clientX >= arrowZone && input.value) {
        input.dataset.restoreValue = input.value;
        input.value = "";
      }
    });
    input.addEventListener("blur", () => {
      if (input.dataset.restoreValue && input.value === "") input.value = input.dataset.restoreValue;
      delete input.dataset.restoreValue;
    });
    input.addEventListener("change", () => {
      delete input.dataset.restoreValue;
    });
  });
  document.querySelector("#onlyAnomalies")?.addEventListener("change", e => { state.table.filters.onlyAnomalies = e.target.checked; state.table.page = 1; render(); });
  document.querySelectorAll("[data-page-size]").forEach(select => select.addEventListener("change", e => { state.table.pageSize = Number(e.target.value); state.table.page = 1; render(); }));
  for (const [id, key] of [["anomalySeverity", "severity"], ["anomalyMetric", "metric"], ["anomalySort", "sort"], ["anomalyText", "text"]]) {
    document.querySelector(`#${id}`)?.addEventListener("change", e => { state.anomalyFilters[key] = e.target.value; render(); });
  }
  document.querySelectorAll("[data-chart-metric]").forEach(input => input.addEventListener("change", event => {
    const metric = event.currentTarget.dataset.chartMetric;
    state.chartMetrics = event.currentTarget.checked
      ? [...new Set([...state.chartMetrics, metric])]
      : state.chartMetrics.filter(item => item !== metric);
    render();
  }));
  document.querySelectorAll("[data-chart-stats]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    state.statsMetric = event.currentTarget.dataset.chartStats;
    state.modal = "chartStats";
    render();
  }));
  document.querySelector("#corrPreset")?.addEventListener("change", e => {
    const preset = EXPERT_CORRELATIONS.find(item => item.id === e.target.value);
    if (!preset) return;
    state.correlation = { x: preset.x, y: preset.y };
    renderKeepingWorkspacePosition();
  });
  document.querySelector("#corrX")?.addEventListener("change", e => { state.correlation.x = e.target.value; renderKeepingWorkspacePosition(); });
  document.querySelector("#corrY")?.addEventListener("change", e => { state.correlation.y = e.target.value; renderKeepingWorkspacePosition(); });
}

render();

