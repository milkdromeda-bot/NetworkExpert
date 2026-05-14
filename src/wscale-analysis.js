import { metricValue } from "./parser.js";

const UNSCALED_WINDOW_LIMIT_BYTES = 64 * 1024;
const LOW_RECEIVE_SPACE_BYTES = 8 * 1024;
const LOW_WINSCALE_VALUE = 2;
const STRANGE_WINSCALE_DELTA = 6;
const HIGH_RTT_MS = 100;
const HIGH_RETRANS_COUNT = 3;
const RECEIVE_MEMORY_PRESSURE_RATIO = 0.85;

function formatBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes)} B`;
}

function wscalePair(socket) {
  const pair = socket?.details?.values?.wscale;
  if (!pair) return null;
  const send = Number(pair.send);
  const receive = Number(pair.receive);
  if (!Number.isFinite(send) || !Number.isFinite(receive)) return null;
  return { send, receive };
}

function metricIsFinite(socket, metric) {
  const value = metricValue(socket, metric);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function bandwidthForBdp(socket) {
  return metricIsFinite(socket, "delivery_rate")
    || metricIsFinite(socket, "pacing_rate")
    || metricIsFinite(socket, "send");
}

export function estimateWscaleBdpBytes(socket) {
  const rttMs = metricIsFinite(socket, "rtt");
  const bps = bandwidthForBdp(socket);
  if (!rttMs || !bps) return 0;
  return bps * (rttMs / 1000) / 8;
}

function receiveMemoryRatio(socket) {
  const skmem = socket?.details?.skmem || {};
  const used = Number(skmem.r || 0);
  const limit = Number(skmem.rb || 0);
  return limit > 0 ? used / limit : 0;
}

function lowRcvSpaceIsDurable(history = []) {
  const values = history
    .filter(row => row?.socketPresent !== false)
    .map(row => Number(row?.rcv_space ?? row?.rcvSpace))
    .filter(Number.isFinite);
  return values.length >= 3 && values.slice(-3).every(value => value <= LOW_RECEIVE_SPACE_BYTES);
}

export function wscaleTechnicalNotes() {
  return [
    "Linux iproute2 displays wscale as wscale:<snd_wscale>:<rcv_wscale>.",
    "snd_wscale is the send-side scale factor known by the local TCP stack. In practice it comes from the peer and is used when the local host sends data into the peer receive window.",
    "rcv_wscale is the receive-side scale factor selected by the local host for its own advertised receive window. On a market-data receiver, this is the local receive-window scaling capacity.",
    "The pair is negotiated during the TCP SYN/SYN-ACK handshake and normally stays stable for the life of the connection.",
    "A live ss snapshot cannot prove what a middlebox did during the handshake; validate missing or suspicious scaling with a SYN/SYN-ACK packet capture."
  ];
}

export function analyzeWscaleContext(socket, { history = [] } = {}) {
  const pair = wscalePair(socket);
  const bdpBytes = estimateWscaleBdpBytes(socket);
  const rttMs = metricIsFinite(socket, "rtt");
  const retrans = Number(socket?.details?.timer?.retrans || 0);
  const values = socket?.details?.values || {};
  const hasRcvSpace = Object.hasOwn(values, "rcv_space");
  const rcvSpace = hasRcvSpace ? metricValue(socket, "rcv_space") : null;
  const receiveRatio = receiveMemoryRatio(socket);
  const receiveWindowPressure = pair
    && hasRcvSpace
    && rcvSpace <= LOW_RECEIVE_SPACE_BYTES
    && (receiveRatio >= RECEIVE_MEMORY_PRESSURE_RATIO || lowRcvSpaceIsDurable(history));
  const evidence = [];
  const counterEvidence = [
    "Do not raise a critical incident from wscale alone; correlate with throughput, RTT, rcv_space, rwnd_limited, and packet loss evidence."
  ];
  const warnings = [];

  if (pair) {
    evidence.push(`wscale present as snd_wscale=${pair.send}, rcv_wscale=${pair.receive}.`);
  } else {
    counterEvidence.push("No wscale field in this ss line is not proof by itself: ss must be collected with TCP info, and a missing field needs handshake validation.");
  }

  if (bdpBytes > 0) {
    evidence.push(`Estimated BDP is about ${formatBytes(bdpBytes)} from RTT and delivery/pacing/send rate.`);
  }

  if (!pair && bdpBytes > UNSCALED_WINDOW_LIMIT_BYTES) {
    warnings.push(`Window scaling is absent or not visible while estimated BDP exceeds 64 KB (${formatBytes(bdpBytes)}). A 16-bit receive window could cap throughput.`);
  }

  if (pair && Math.min(pair.send, pair.receive) <= LOW_WINSCALE_VALUE && bdpBytes > UNSCALED_WINDOW_LIMIT_BYTES) {
    warnings.push(`Window scaling is very low (${pair.send}:${pair.receive}) for an estimated BDP above 64 KB. Validate whether receive windows can grow enough for this path.`);
  }

  if (pair && Math.abs(pair.send - pair.receive) >= STRANGE_WINSCALE_DELTA) {
    warnings.push(`Window scale asymmetry is large (${pair.send}:${pair.receive}). This can be legitimate, but in trading captures it deserves handshake and directionality validation.`);
  }

  if (receiveWindowPressure) {
    warnings.push(`rcv_space is very small (${formatBytes(rcvSpace)}) while receive socket memory is near its rb limit (${Math.round(receiveRatio * 100)}%). Scaling exists, so the concern is receiver pressure, not missing negotiation.`);
  }

  if (retrans >= HIGH_RETRANS_COUNT && rttMs >= HIGH_RTT_MS) {
    counterEvidence.push("High retransmission count with high RTT is stronger path-recovery evidence than wscale. Treat wscale as context, not root cause.");
  }

  const status = warnings.length ? "warning" : "info";
  const severity = status === "warning" ? "medium" : "low";
  return {
    id: "wscale-context",
    status,
    severity,
    confidence: warnings.length && pair ? "medium" : "low",
    score: warnings.length ? 40 + warnings.length * 10 : 10,
    socket,
    hasWscale: Boolean(pair),
    sendScale: pair?.send ?? null,
    receiveScale: pair?.receive ?? null,
    bdpBytes,
    rcvSpace,
    evidence: [...warnings, ...evidence],
    counterEvidence,
    learnMore: wscaleTechnicalNotes(),
    commands: [
      "ss -tinmi dst <peer-ip>",
      "ss -tinmi state established | egrep 'wscale|rcv_space|rwnd_limited|snd_wnd|rtt|delivery_rate|pacing_rate'",
      "tcpdump -i <iface> -s 160 -nn 'host <peer-ip> and tcp[tcpflags] & tcp-syn != 0' -w tcp-handshake-wscale.pcap",
      "tshark -r tcp-handshake-wscale.pcap -Y 'tcp.flags.syn == 1' -T fields -e frame.time -e ip.src -e tcp.options.wscale.shift -e tcp.window_size_value"
    ]
  };
}
