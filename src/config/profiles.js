export const DASHBOARD_PRESETS = {
  noc: {
    name: "NOC overview",
    description: "Dense operations view for queues, rates, drops, and recovery signals.",
    metrics: ["tx_bps", "rx_bps", "sendQ", "recvQ", "rtt", "rto", "skmem.d", "delivery_rate"],
    layout: { columns: 3, density: "compact", mainChart: true, showLegend: true, sharedZoom: true, showCrosshair: true, showThresholds: true }
  },
  latency: {
    name: "Latency diagnosis",
    description: "RTT, variance, retransmission timeout, ACK timing, and backoff.",
    metrics: ["rtt", "rttvar", "rto", "ato", "backoff", "retrans", "cwnd", "pacing_rate"],
    layout: { columns: 3, density: "standard", mainChart: true, showLegend: true, sharedZoom: true, showCrosshair: true, showThresholds: true }
  },
  tail: {
    name: "Tail latency",
    description: "P99/P99.9-focused view for RTT, RTO, jitter, queues, and recovery spikes.",
    metrics: ["rtt", "rttvar", "rto", "recvQ", "sendQ", "skmem.d_rate", "skmem.d", "rx_bps", "tx_bps"],
    layout: { columns: 3, density: "compact", mainChart: true, showLegend: true, sharedZoom: true, showCrosshair: true, showThresholds: true }
  },
  drops: {
    name: "Drops and buffers",
    description: "Socket memory pressure, drops, queues, and receive/transmit buffer health.",
    metrics: ["skmem.d", "skmem.d_rate", "skmem.r", "skmem.t", "recvQ", "sendQ", "rx_bps", "tx_bps", "rto"],
    layout: { columns: 3, density: "standard", mainChart: true, showLegend: true, sharedZoom: true, showCrosshair: true, showThresholds: true }
  },
  microburst: {
    name: "Microburst investigation",
    description: "Short receive-side pressure windows: RX bandwidth, Recv-Q, socket receive memory, and drops together.",
    metrics: ["rx_bps", "recvQ", "skmem.r", "skmem.d", "skmem.d_rate", "bytes_received", "rtt", "rto"],
    layout: { columns: 3, density: "compact", mainChart: true, showLegend: true, sharedZoom: true, showCrosshair: true, showThresholds: true }
  },
  throughput: {
    name: "Throughput path",
    description: "Delivered rate, pacing, TX/RX bandwidth, bytes, and segment progress.",
    metrics: ["tx_bps", "rx_bps", "delivery_rate", "pacing_rate", "bytes_sent", "bytes_acked", "bytes_received", "segs_out", "segs_in"],
    layout: { columns: 3, density: "standard", mainChart: true, showLegend: true, sharedZoom: true, showCrosshair: true, showThresholds: false }
  },
  bdp: {
    name: "BDP / TCP window",
    description: "Observed BDP, rcv_space, window-limited theoretical throughput, and scaling context.",
    metrics: ["rx_bps", "bytes_received", "rcv_space", "rcv_ssthresh", "rcv_rtt", "rtt", "delivery_rate", "recvQ", "skmem.r", "skmem.rb"],
    layout: { columns: 3, density: "standard", mainChart: true, showLegend: true, sharedZoom: true, showCrosshair: true, showThresholds: true }
  },
  warroom: {
    name: "War room",
    description: "Large readable panels for incident review and shared screens.",
    metrics: ["rto", "rtt", "sendQ", "recvQ", "skmem.d", "tx_bps"],
    layout: { columns: 2, density: "tall", mainChart: true, showLegend: true, sharedZoom: true, showCrosshair: true, showThresholds: true }
  }
};

export const ANALYSIS_TEMPLATES = {
  web: {
    name: "Nginx / Web server",
    icon: "ri-global-line",
    focus: "HTTP/TLS services, slow clients, accept queues, and upstream latency symptoms.",
    filter: "process:nginx port:443",
    columns: ["risk", "state", "family", "recvQ", "sendQ", "local", "peer", "process", "rtt", "rto", "cwnd", "skmem.t", "skmem.d"],
    charts: ["sendQ", "recvQ", "rtt", "rto", "tx_bps", "rx_bps", "cwnd", "skmem.d"],
    checks: ["Sort conversations by Send-Q and RTO.", "Group peers to find slow client populations.", "Compare TX bandwidth collapse with Send-Q growth."]
  },
  postgres: {
    name: "PostgreSQL / Database",
    icon: "ri-database-2-line",
    focus: "Database client pressure, local read lag, high RTT clients, and socket buffer pressure.",
    filter: "process:postgres port:5432",
    columns: ["risk", "state", "recvQ", "sendQ", "local", "peer", "process", "rtt", "rto", "skmem.r", "skmem.t", "skmem.d"],
    charts: ["recvQ", "sendQ", "rtt", "rto", "rx_bps", "tx_bps", "skmem.r", "skmem.t"],
    checks: ["Check Recv-Q for slow query/application reads.", "Group by peer to isolate noisy clients.", "Correlate database process with socket memory growth."]
  },
  redis: {
    name: "Redis / Cache",
    icon: "ri-flashlight-line",
    focus: "Low-latency cache traffic, client stalls, burst drops, and tiny-message behavior.",
    filter: "process:redis port:6379",
    columns: ["risk", "state", "recvQ", "sendQ", "local", "peer", "process", "rtt", "rttvar", "ato", "segs_out", "segs_in", "skmem.d"],
    charts: ["rtt", "rttvar", "sendQ", "recvQ", "segs_out", "segs_in", "tx_bps", "rx_bps"],
    checks: ["Watch RTT variance more than average RTT.", "Check segment activity for tiny-message bursts.", "Investigate any drops immediately."]
  },
  kube: {
    name: "Kubernetes / Containers",
    icon: "ri-box-3-line",
    focus: "Ephemeral services, namespace split, peer fan-out, and service-to-service flows.",
    filter: "",
    columns: ["risk", "state", "family", "recvQ", "sendQ", "local", "peer", "process", "rtt", "rto", "pacing_rate", "delivery_rate", "skmem.d"],
    charts: ["tx_bps", "rx_bps", "delivery_rate", "pacing_rate", "rtt", "rto", "sendQ", "skmem.d"],
    checks: ["Use Map to inspect service fan-out.", "Group by peer and local endpoint.", "Compare container namespace symptoms with host evidence."]
  },
  dns: {
    name: "DNS / UDP",
    icon: "ri-router-line",
    focus: "UDP listeners, resolver pressure, drops, receive queue buildup, and service exposure.",
    filter: "proto:udp port:53",
    columns: ["risk", "state", "family", "recvQ", "sendQ", "local", "peer", "process", "skmem.r", "skmem.d", "rx_bps"],
    charts: ["rx_bps", "recvQ", "skmem.r", "skmem.d", "tx_bps", "segs_in"],
    checks: ["Prioritize Recv-Q and drops.", "Confirm listener exposure and process ownership.", "Compare bursts with socket memory pressure."]
  },
  lxc: {
    name: "LXC/LXD host split",
    icon: "ri-instance-line",
    focus: "Container namespace symptoms versus host network, qdisc, interface, and route evidence.",
    filter: "",
    columns: ["risk", "state", "family", "recvQ", "sendQ", "local", "peer", "process", "rtt", "rto", "skmem.r", "skmem.t", "skmem.d"],
    charts: ["sendQ", "recvQ", "rtt", "rto", "skmem.r", "skmem.t", "skmem.d", "tx_bps"],
    checks: ["Confirm whether ss was collected in container or host namespace.", "Gather host ip -s link and tc evidence.", "Use conversations to separate local app lag from path congestion."]
  }
};

export function dashboardSnapshot(state, name) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    graphMetric: state.prefs.graphMetric,
    graphStyle: state.prefs.graphStyle,
    chartMetrics: [...state.chartMetrics],
    correlation: { ...state.correlation },
    chartLayout: { ...state.prefs.chartLayout }
  };
}

export function applyDashboardProfile(state, profile, chartMetricList) {
  if (!profile) return;
  state.prefs.graphMetric = profile.graphMetric || state.prefs.graphMetric;
  state.prefs.graphStyle = profile.graphStyle || state.prefs.graphStyle;
  state.chartMetrics = (profile.chartMetrics || state.chartMetrics).filter(metric => chartMetricList().includes(metric));
  if (!state.chartMetrics.length) state.chartMetrics = ["rtt", "rto", "sendQ", "recvQ"];
  state.correlation = { ...state.correlation, ...(profile.correlation || {}) };
  state.prefs.chartLayout = { ...state.prefs.chartLayout, ...(profile.chartLayout || {}) };
  state.prefs.chartLayout.panelOrder = [...new Set([...(state.prefs.chartLayout.panelOrder || []), ...chartMetricList()])];
}

export function applyDashboardPreset(state, presetId, chartMetricList) {
  const preset = DASHBOARD_PRESETS[presetId];
  if (!preset) return;
  state.chartMetrics = preset.metrics.filter(metric => chartMetricList().includes(metric));
  state.prefs.graphMetric = state.chartMetrics[0] || state.prefs.graphMetric;
  state.prefs.chartLayout = {
    ...state.prefs.chartLayout,
    ...preset.layout,
    panelOrder: [...new Set([...preset.metrics, ...(state.prefs.chartLayout.panelOrder || []), ...chartMetricList()])]
  };
}

export function applyAnalysisTemplate(state, templateId, allColumns, chartMetricList) {
  const template = ANALYSIS_TEMPLATES[templateId];
  if (!template) return;
  state.table.visible = template.columns.filter(key => allColumns.includes(key));
  state.table.pinned = ["risk", "state", "local"].filter(key => state.table.visible.includes(key));
  state.table.order = [...new Set([...template.columns, ...state.table.order, ...allColumns])].filter(key => allColumns.includes(key));
  state.table.filters.text = template.filter;
  state.table.page = 1;
  state.chartMetrics = template.charts.filter(metric => chartMetricList().includes(metric));
  state.prefs.graphMetric = state.chartMetrics[0] || state.prefs.graphMetric;
  state.prefs.chartLayout.panelOrder = [...new Set([...template.charts, ...(state.prefs.chartLayout.panelOrder || []), ...chartMetricList()])];
  state.activeTab = templateId === "kube" ? "map" : "conversations";
  state.view = "analysis";
}
