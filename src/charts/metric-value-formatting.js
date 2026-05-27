export function createMetricValueFormatting(ctx) {
  const {
    state,
    numberFormatter,
    numberFormatterWith,
    numberSeparators,
    lazySparklineIndex,
    renderSparkline,
    escapeHtml,
    metricLabel: baseMetricLabel
  } = ctx;

  function metricUnit(metric) {
    return thresholdFor(metric).unit || "";
  }
  
  function metricFractionDigits(metric, value) {
    const numeric = Math.abs(Number(value || 0));
    if (["pacing_rate", "delivery_rate", "tx_bps", "rx_bps", "sendQ", "recvQ", "rcv_space", "rcv_ssthresh", "skmem.r", "skmem.rb", "skmem.t", "skmem.d", "bytes_sent", "bytes_acked", "bytes_received", "segs_out", "segs_in", "cwnd", "backoff", "retrans"].includes(metric)) return 0;
    if (metric === "skmem.d_rate") return numeric > 0 && numeric < 1 ? 3 : 2;
    if (["rtt", "rto", "ato", "rttvar", "rcv_rtt"].includes(metric)) return numeric > 0 && numeric < 10 ? 3 : Number.isInteger(Number(value)) ? 0 : 3;
    return Number.isInteger(Number(value)) ? 0 : 2;
  }
  
  function formatMetricNumber(metric, value) {
    const digits = metricFractionDigits(metric, value);
    const minimumDigits = ["rtt", "rto", "ato", "rcv_rtt"].includes(metric) && Math.abs(Number(value || 0)) > 0 && Math.abs(Number(value || 0)) < 10 ? digits : 0;
    return numberFormatterWith(minimumDigits, digits).format(Number(value || 0));
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
    const formatted = numberFormatter(digits).format(sign * scaled);
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
  
  function renderTableMetricCell(metric, value, socketKey) {
    const severity = thresholdSeverity(metric, Number(value || 0));
    const idx = socketKey ? lazySparklineIndex() : null;
    const spark = idx?.get(socketKey)?.[metric];
    const sparkHtml = spark?.length > 2 ? ` ${renderSparkline(spark)}` : "";
    return `<span class="table-metric ${severity}" title="${escapeHtml(metricLabel(metric))}: ${formatMetricValue(metric, value)}">${formatTableMetricValue(metric, value)}${sparkHtml}</span>`;
  }
  
  function parseFormattedNumber(value) {
    if (typeof value === "number") return value;
    const { group, decimal } = numberSeparators();
    const normalized = String(value || "")
      .split(group).join("")
      .replace(/\s|\u202f|\u00a0/g, "")
      .replace(decimal, ".")
      .replace(/[^\d.-]/g, "");
    return Number(normalized || 0);
  }
  
  function metricLabel(metric) {
    return baseMetricLabel(metric);
  }
  
  function metricColor(metric) {
    return {
      rtt: "#5db7ff",
      rto: "#ff9f43",
      rcv_rtt: "#93c5fd",
      rcv_space: "#34d399",
      rcv_ssthresh: "#fbbf24",
      sendQ: "#39d6d6",
      recvQ: "#d38cff",
      cwnd: "#4cde8a",
      ato: "#ffd166",
      "skmem.r": "#7dd3fc",
      "skmem.rb": "#60a5fa",
      "skmem.t": "#f472b6",
      "skmem.d": "#ff5c77",
      "skmem.d_rate": "#ff2e63",
      pacing_rate: "#a3e635",
      delivery_rate: "#67e8f9",
      tx_bps: "#22d3ee",
      rx_bps: "#818cf8",
      bytes_sent: "#2dd4bf",
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

  return {
    metricUnit,
    metricFractionDigits,
    formatMetricNumber,
    formatBitsPerSecond,
    formatMetricValue,
    formatTableMetricValue,
    renderTableMetricCell,
    parseFormattedNumber,
    metricLabel,
    metricColor,
    thresholdFor,
    thresholdSeverity,
    thresholdColor
  };
}
