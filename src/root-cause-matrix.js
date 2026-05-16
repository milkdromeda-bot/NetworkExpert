import { metricValue } from "./parser.js";

const ROOT_CAUSES = [
  {
    id: "network-congestion",
    label: "Network congestion / path loss",
    signals: [
      { key: "high-rto", test: (s) => metricValue(s, "rto") >= 1000, weight: 3 },
      { key: "retrans", test: (s) => (s.details?.timer?.retrans || 0) > 0, weight: 3 },
      { key: "low-cwnd", test: (s) => { const c = metricValue(s, "cwnd"); return c > 0 && c <= 4; }, weight: 2 },
      { key: "backoff", test: (s) => metricValue(s, "backoff") >= 2, weight: 2 },
      { key: "high-rtt", test: (s) => metricValue(s, "rtt") >= 150, weight: 1 },
      { key: "sendQ-growing", test: (s) => Number(s.sendQ || 0) > 262144, weight: 1 }
    ]
  },
  {
    id: "slow-consumer",
    label: "Slow consumer / receiver not reading",
    signals: [
      { key: "high-recvQ", test: (s) => Number(s.recvQ || 0) > 131072, weight: 3 },
      { key: "skmem-r", test: (s) => metricValue(s, "skmem.r") > 0, weight: 2 },
      { key: "low-rcv-space", test: (s) => { const v = metricValue(s, "rcv_space"); return v != null && v <= 8192; }, weight: 2 },
      { key: "rwnd-limited", test: (s) => metricValue(s, "rwnd_limited_pct") >= 20, weight: 2 },
      { key: "drops", test: (s) => metricValue(s, "skmem.d") > 0, weight: 1 },
      { key: "process-known", test: (s) => Boolean(s.details?.process), weight: 1 }
    ]
  },
  {
    id: "zero-window-persist",
    label: "Zero Window / persist timer",
    signals: [
      { key: "persist-timer", test: (s) => String(s.details?.timer?.name || "").toLowerCase() === "persist", weight: 3 },
      { key: "snd-wnd-zero", test: (s) => { const v = s.details?.values; return v && Object.hasOwn(v, "snd_wnd") && metricValue(s, "snd_wnd") === 0; }, weight: 3 },
      { key: "rwnd-limited", test: (s) => metricValue(s, "rwnd_limited_pct") >= 20, weight: 2 },
      { key: "backoff-persist", test: (s) => metricValue(s, "backoff") >= 1 && String(s.details?.timer?.name || "").toLowerCase() === "persist", weight: 2 },
      { key: "sendQ-stalled", test: (s) => Number(s.sendQ || 0) > 0, weight: 1 }
    ]
  },
  {
    id: "jvm-gc-stall",
    label: "JVM stall / GC pause",
    signals: [
      { key: "java-process", test: (s) => /\bjava\b/i.test(s.details?.process?.name || ""), weight: 2 },
      { key: "high-recvQ", test: (s) => Number(s.recvQ || 0) > 131072, weight: 2 },
      { key: "rwnd-limited", test: (s) => metricValue(s, "rwnd_limited_pct") >= 20, weight: 1 },
      { key: "persist-timer", test: (s) => String(s.details?.timer?.name || "").toLowerCase() === "persist", weight: 2 },
      { key: "drops", test: (s) => metricValue(s, "skmem.d") > 0, weight: 1 }
    ]
  },
  {
    id: "host-container-bottleneck",
    label: "Host / container resource bottleneck",
    signals: [
      { key: "cgroup-present", test: (s) => /cgroup:/.test(s.details?.raw || ""), weight: 1 },
      { key: "drops", test: (s) => metricValue(s, "skmem.d") > 0, weight: 2 },
      { key: "high-recvQ", test: (s) => Number(s.recvQ || 0) > 131072, weight: 2 },
      { key: "high-sendQ", test: (s) => Number(s.sendQ || 0) > 262144, weight: 2 },
      { key: "multiple-sockets-affected", test: () => false, weight: 1 }
    ]
  },
  {
    id: "retrans-loss",
    label: "Retransmission / packet loss",
    signals: [
      { key: "retrans", test: (s) => (s.details?.timer?.retrans || 0) > 0, weight: 3 },
      { key: "high-rto", test: (s) => metricValue(s, "rto") >= 1000, weight: 2 },
      { key: "backoff", test: (s) => metricValue(s, "backoff") >= 1, weight: 2 },
      { key: "low-cwnd", test: (s) => { const c = metricValue(s, "cwnd"); return c > 0 && c <= 4; }, weight: 1 },
      { key: "bytes-retrans", test: (s) => metricValue(s, "bytes_retrans") > 0, weight: 2 }
    ]
  },
  {
    id: "buffer-pressure",
    label: "Buffer pressure / memory exhaustion",
    signals: [
      { key: "drops", test: (s) => metricValue(s, "skmem.d") > 0, weight: 3 },
      { key: "skmem-r-high", test: (s) => metricValue(s, "skmem.r") > 0, weight: 2 },
      { key: "skmem-t-high", test: (s) => metricValue(s, "skmem.t") > 0, weight: 2 },
      { key: "high-recvQ", test: (s) => Number(s.recvQ || 0) > 131072, weight: 1 },
      { key: "high-sendQ", test: (s) => Number(s.sendQ || 0) > 262144, weight: 1 }
    ]
  },
  {
    id: "app-overproduction",
    label: "Application overproduction / burst",
    signals: [
      { key: "high-sendQ", test: (s) => Number(s.sendQ || 0) > 262144, weight: 3 },
      { key: "skmem-t-high", test: (s) => metricValue(s, "skmem.t") > 0, weight: 2 },
      { key: "no-retrans", test: (s) => (s.details?.timer?.retrans || 0) === 0, weight: 1 },
      { key: "no-persist", test: (s) => String(s.details?.timer?.name || "").toLowerCase() !== "persist", weight: 1 },
      { key: "process-known", test: (s) => Boolean(s.details?.process), weight: 1 }
    ]
  }
];

function evaluateCause(cause, sockets) {
  const maxWeight = cause.signals.reduce((sum, sig) => sum + sig.weight, 0);
  let presentWeight = 0;
  const present = [];
  const absent = [];

  for (const signal of cause.signals) {
    const hit = sockets.some(s => signal.test(s));
    if (hit) {
      present.push(signal.key);
      presentWeight += signal.weight;
    } else {
      absent.push(signal.key);
    }
  }

  const confidence = maxWeight > 0 ? Math.round((presentWeight / maxWeight) * 100) / 100 : 0;
  return { id: cause.id, label: cause.label, confidence, present, absent, signalCount: present.length, totalSignals: cause.signals.length };
}

export function buildRootCauseMatrix(sockets = []) {
  if (!sockets.length) return { causes: [], topCause: null, ambiguous: false };

  const causes = ROOT_CAUSES.map(cause => evaluateCause(cause, sockets))
    .sort((a, b) => b.confidence - a.confidence || b.signalCount - a.signalCount);

  const topCause = causes[0]?.confidence > 0 ? causes[0] : null;
  const ambiguous = causes.length >= 2 && causes[0].confidence > 0 && causes[1].confidence > 0
    && (causes[0].confidence - causes[1].confidence) < 0.15;

  return { causes, topCause, ambiguous };
}

export { ROOT_CAUSES };
