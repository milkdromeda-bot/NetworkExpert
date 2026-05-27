export const REQUIRED_FEATURES = [
  { key: "timestamps", label: "Timestamped snapshots", weight: 16 },
  { key: "snapshotDepth", label: "Repeated samples", weight: 10 },
  { key: "cadence", label: "Cadence stability", weight: 8 },
  { key: "duration", label: "Useful observation window", weight: 7 },
  { key: "tcpInfo", label: "TCP internals (-i)", weight: 14 },
  { key: "timers", label: "Timers (-o)", weight: 8 },
  { key: "socketMemory", label: "Socket memory (-m)", weight: 12 },
  { key: "process", label: "Process owner (-p)", weight: 7 },
  { key: "identity", label: "Kernel identity", weight: 5 },
  { key: "counters", label: "Byte/segment counters", weight: 6 },
  { key: "cgroup", label: "Container/cgroup context", weight: 3 },
  { key: "extendedContext", label: "Extended socket context", weight: 4 }
];

export const TCP_INFO_FIELDS = [
  "rtt", "rto", "cwnd", "wscale", "mss", "rcv_space", "rcv_ssthresh",
  "delivery_rate", "pacing_rate", "send", "bytes_acked"
];

export const COUNTER_FIELDS = [
  "bytes_sent", "bytes_received", "bytes_acked", "bytes_retrans",
  "segs_in", "segs_out", "data_segs_in", "data_segs_out"
];

export function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function average(values) {
  const safe = values.filter(Number.isFinite);
  return safe.length ? safe.reduce((sum, value) => sum + value, 0) / safe.length : 0;
}

export function percentile(values, pct) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[index];
}

export function median(values) {
  return percentile(values, 50);
}

export function dateStamp(date = new Date()) {
  const pad = value => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function commandTokens(command = "") {
  return String(command || "")
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);
}

export function commandHasShort(command = "", letter = "") {
  return commandTokens(command)
    .filter(token => /^-[A-Za-z]+$/.test(token) && !token.startsWith("--"))
    .some(token => token.slice(1).includes(letter));
}

export function commandHasLong(command = "", name = "") {
  return commandTokens(command).some(token => token === `--${name}` || token.startsWith(`--${name}=`));
}

export function commandSleepIntervalMs(command = "") {
  const match = String(command || "").match(/\bsleep\s+([0-9]+(?:[.,][0-9]+)?)/);
  if (!match) return 0;
  const seconds = Number(match[1].replace(",", "."));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
}

export function featureStatus(ok, partial = false) {
  if (ok) return "ok";
  return partial ? "partial" : "missing";
}

export function featurePoints(weight, status) {
  if (status === "ok") return weight;
  if (status === "partial") return Math.round(weight * 0.5);
  return 0;
}

export function qualityGrade(score) {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 55) return "usable";
  if (score >= 35) return "weak";
  return "poor";
}

export function qualitySummary(grade) {
  if (grade === "excellent") return "High-confidence capture for timeline, congestion, slow-consumer, timer, memory, and process correlation.";
  if (grade === "good") return "Good capture. Most core evidence is present, with a few context gaps to improve next time.";
  if (grade === "usable") return "Usable capture, but several conclusions should stay cautious because some evidence is missing.";
  if (grade === "weak") return "Weak capture. It can explain visible symptoms, but root-cause confidence is limited.";
  return "Poor capture. Collect again with timestamped ss options before relying on conclusions.";
}

export function buildRecommendedCommand(now = new Date()) {
  return `while true; do date --iso-8601=ns; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep 1; done | tee -a '/tmp/networkexpert_ss_${dateStamp(now)}.log'`;
}

export function countSocketLikeLines(raw = "") {
  return String(raw || "")
    .split(/\r?\n/)
    .filter(line => /\b(ESTAB|LISTEN|SYN-SENT|SYN-RECV|FIN-WAIT-1|FIN-WAIT-2|TIME-WAIT|CLOSE-WAIT|LAST-ACK|CLOSING|UNCONN)\b/.test(line))
    .length;
}

export function buildFeatureCards({ features, commandSignals, stats }) {
  return REQUIRED_FEATURES.map(item => {
    const feature = features[item.key];
    const command = commandSignals[item.key];
    const status = feature?.status || "missing";
    return {
      key: item.key,
      label: item.label,
      status,
      weight: item.weight,
      points: featurePoints(item.weight, status),
      detail: feature?.detail || "No evidence detected.",
      commandDetected: Boolean(command),
      sample: feature?.sample || "",
      stats
    };
  });
}
