const numberFormatterCache = new Map();
const numberSeparatorCache = new Map();
const dateTimeFormatterCache = new Map();

function rememberBounded(cache, key, create, limit = 32) {
  if (cache.has(key)) return cache.get(key);
  const value = create();
  cache.set(key, value);
  if (cache.size > limit) cache.delete(cache.keys().next().value);
  return value;
}

export function numberFormatterWith(locale, grouping, minimumFractionDigits, maximumFractionDigits) {
  const key = `${locale}|${grouping ? 1 : 0}|${minimumFractionDigits}|${maximumFractionDigits}`;
  return rememberBounded(numberFormatterCache, key, () => new Intl.NumberFormat(locale, { useGrouping: grouping, minimumFractionDigits, maximumFractionDigits }));
}

export function numberFormatter(locale, grouping, maximumFractionDigits) {
  return numberFormatterWith(locale, grouping, 0, maximumFractionDigits);
}

export function numberSeparators(locale) {
  return rememberBounded(numberSeparatorCache, locale, () => {
    const sample = new Intl.NumberFormat(locale).formatToParts(12345.6);
    return { group: sample.find(p => p.type === "group")?.value || ",", decimal: sample.find(p => p.type === "decimal")?.value || "." };
  });
}

export function dateTimeFormatter(locale, options, cacheId = "") {
  const key = `${cacheId}|${locale}|${options.timeZone || ""}|${options.year || ""}|${options.month || ""}|${options.day || ""}|${options.hour || ""}|${options.minute || ""}|${options.second || ""}|${options.fractionalSecondDigits || ""}|${options.hour12 ?? ""}`;
  return rememberBounded(dateTimeFormatterCache, key, () => new Intl.DateTimeFormat(locale, options));
}

export function formatNumber(locale, grouping, value) {
  const numeric = Number(value || 0);
  const decimals = Number.isInteger(numeric) ? 0 : 2;
  return numberFormatter(locale, grouping, decimals).format(numeric);
}

export function formatBitsPerSecond(locale, grouping, value) {
  const numeric = Number(value || 0);
  const sign = numeric < 0 ? -1 : 1;
  let scaled = Math.abs(numeric);
  const units = ["bps", "kbps", "Mbps", "Gbps", "Tbps"];
  let unitIndex = 0;
  while (scaled >= 1000 && unitIndex < units.length - 1) { scaled /= 1000; unitIndex += 1; }
  const digits = unitIndex === 0 ? 0 : scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return `${numberFormatter(locale, grouping, digits).format(sign * scaled)} ${units[unitIndex]}`;
}

export const METRIC_LABELS = {
  rtt: "RTT", rto: "RTO", rcv_rtt: "Receive RTT", rcv_space: "Receive space",
  rcv_ssthresh: "Receive ssthresh", sendQ: "Send-Q", recvQ: "Recv-Q",
  cwnd: "Congestion window", ato: "ACK timeout",
  "skmem.r": "Socket memory receive", "skmem.rb": "Receive buffer limit",
  "skmem.t": "Socket memory transmit", "skmem.d": "Socket drops",
  "skmem.d_rate": "Socket drop rate", pacing_rate: "Pacing rate",
  delivery_rate: "Delivery rate", tx_bps: "TX bandwidth", rx_bps: "RX bandwidth",
  bytes_sent: "Bytes sent", bytes_acked: "Bytes acked", bytes_received: "Bytes received",
  rttvar: "RTT variance", segs_out: "Segments out", segs_in: "Segments in",
  backoff: "TCP backoff", retrans: "Retrans timer"
};

export function metricLabel(metric) {
  return METRIC_LABELS[metric] || metric;
}

export function metricFractionDigits(metric, value) {
  const numeric = Math.abs(Number(value || 0));
  if (["pacing_rate", "delivery_rate", "tx_bps", "rx_bps", "sendQ", "recvQ", "rcv_space", "rcv_ssthresh", "skmem.r", "skmem.rb", "skmem.t", "skmem.d", "bytes_sent", "bytes_acked", "bytes_received", "segs_out", "segs_in", "cwnd", "backoff", "retrans"].includes(metric)) return 0;
  if (metric === "skmem.d_rate") return numeric > 0 && numeric < 1 ? 3 : 2;
  if (["rtt", "rto", "ato", "rttvar", "rcv_rtt"].includes(metric)) return numeric > 0 && numeric < 10 ? 3 : Number.isInteger(Number(value)) ? 0 : 3;
  return Number.isInteger(Number(value)) ? 0 : 2;
}

export function formatMetricNumber(locale, grouping, metric, value) {
  const digits = metricFractionDigits(metric, value);
  const minimumDigits = ["rtt", "rto", "ato", "rcv_rtt"].includes(metric) && Math.abs(Number(value || 0)) > 0 && Math.abs(Number(value || 0)) < 10 ? digits : 0;
  return numberFormatterWith(locale, grouping, minimumDigits, digits).format(Number(value || 0));
}
