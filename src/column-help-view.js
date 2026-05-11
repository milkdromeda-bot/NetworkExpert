import { COLUMN_HELP, EXPERT_DEFAULT_THRESHOLDS } from "./expert-config.js";

export function columnMetric(key) {
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

export function columnHelp(col, { fieldDocs, thresholdFor }) {
  const metric = columnMetric(col.key);
  const threshold = metric ? thresholdFor(metric) : null;
  const metricDoc = metric ? EXPERT_DEFAULT_THRESHOLDS[metric]?.rationale : "";
  const generic = COLUMN_HELP[col.key] || {
    summary: fieldDocs[col.key] || `${col.label} extracted from the parsed ss snapshot.`,
    detail: metricDoc || "Use this column together with queue, timer, process, and endpoint context. A single point can be noisy; repeated elevation across samples is much stronger evidence.",
    use: "Sort, filter, and correlate this field with the same socket in the chart pane."
  };
  return { ...generic, metric, threshold };
}

export function renderThresholdSummary(help, { formatMetricValue }) {
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

export function renderColumnTooltip(col, context) {
  const help = columnHelp(col, context);
  return `<div class="column-tooltip" role="tooltip">
    <div class="tooltip-kicker">Column intelligence</div>
    <strong>${context.escapeHtml(col.label)}</strong>
    <p>${context.escapeHtml(help.summary)}</p>
    ${renderThresholdSummary(help, context)}
    <button data-column-help="${col.key}" type="button"><i class="ri-expand-diagonal-line"></i> Expand guide</button>
  </div>`;
}
