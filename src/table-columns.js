export function createTableColumns({
  riskRank,
  escapeHtml,
  applicationServiceSortKey,
  renderApplicationServiceChip,
  renderTableMetricCell,
  socketBandwidth,
  renderEndpointCell,
  renderPeerCell,
  metricValue
}) {
  const renderState = s => {
    const transitions = Array.isArray(s.stateTransitions) ? s.stateTransitions.filter(Boolean) : [];
    const transitionTitle = transitions.length > 1 ? ` title="${escapeHtml(`Observed state transition: ${transitions.join(" -> ")}`)}"` : "";
    const transitionBadge = transitions.length > 1 ? `<span class="state-transition-chip"${transitionTitle}>${escapeHtml(transitions[0])} -> ${escapeHtml(s.state)}</span>` : "";
    return `<span class="state-stack"><span class="badge ${s.state === "LISTEN" ? "listen" : ""}">${escapeHtml(s.state)}</span>${transitionBadge}</span>`;
  };
  return [
    { key: "risk", label: "Risk", value: s => riskRank(s.risk), render: s => `<span class="risk ${s.risk}">${s.risk}</span>` },
    { key: "state", label: "State", value: s => s.state, render: renderState },
    { key: "family", label: "Proto", value: s => s.family, render: s => `<span class="badge ${s.family.includes("udp") ? "udp" : "tcp"}">${escapeHtml(s.family)}</span>` },
    { key: "application", label: "App", value: s => applicationServiceSortKey(s), render: s => renderApplicationServiceChip(s) || `<span class="muted">-</span>` },
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
    { key: "rcv_space", label: "rcv_space", value: s => metricValue(s, "rcv_space"), render: s => renderTableMetricCell("rcv_space", metricValue(s, "rcv_space")), defaultVisible: false },
    { key: "rcv_rtt", label: "rcv_rtt", value: s => metricValue(s, "rcv_rtt"), render: s => renderTableMetricCell("rcv_rtt", metricValue(s, "rcv_rtt")), defaultVisible: false },
    { key: "rcv_ssthresh", label: "rcv_ssthresh", value: s => metricValue(s, "rcv_ssthresh"), render: s => renderTableMetricCell("rcv_ssthresh", metricValue(s, "rcv_ssthresh")), defaultVisible: false },
    { key: "skmem.r", label: "skmem.r", value: s => metricValue(s, "skmem.r"), render: s => renderTableMetricCell("skmem.r", metricValue(s, "skmem.r")) },
    { key: "skmem.rb", label: "skmem.rb", value: s => metricValue(s, "skmem.rb"), render: s => renderTableMetricCell("skmem.rb", metricValue(s, "skmem.rb")), defaultVisible: false },
    { key: "skmem.t", label: "skmem.t", value: s => metricValue(s, "skmem.t"), render: s => renderTableMetricCell("skmem.t", metricValue(s, "skmem.t")) },
    { key: "skmem.d", label: "drops", value: s => metricValue(s, "skmem.d"), render: s => renderTableMetricCell("skmem.d", metricValue(s, "skmem.d")) },
    { key: "rttvar", label: "RTT var", value: s => metricValue(s, "rttvar"), render: s => renderTableMetricCell("rttvar", metricValue(s, "rttvar")), defaultVisible: false },
    { key: "bytes_sent", label: "Bytes sent", value: s => metricValue(s, "bytes_sent"), render: s => renderTableMetricCell("bytes_sent", metricValue(s, "bytes_sent")), defaultVisible: false },
    { key: "bytes_acked", label: "Bytes acked", value: s => metricValue(s, "bytes_acked"), render: s => renderTableMetricCell("bytes_acked", metricValue(s, "bytes_acked")), defaultVisible: false },
    { key: "bytes_received", label: "Bytes received", value: s => metricValue(s, "bytes_received"), render: s => renderTableMetricCell("bytes_received", metricValue(s, "bytes_received")), defaultVisible: false },
    { key: "segs_out", label: "Segs out", value: s => metricValue(s, "segs_out"), render: s => renderTableMetricCell("segs_out", metricValue(s, "segs_out")), defaultVisible: false },
    { key: "segs_in", label: "Segs in", value: s => metricValue(s, "segs_in"), render: s => renderTableMetricCell("segs_in", metricValue(s, "segs_in")), defaultVisible: false },
    { key: "pacing_rate", label: "Pacing rate", value: s => metricValue(s, "pacing_rate"), render: s => renderTableMetricCell("pacing_rate", metricValue(s, "pacing_rate")), defaultVisible: false },
    { key: "delivery_rate", label: "Delivery rate", value: s => metricValue(s, "delivery_rate"), render: s => renderTableMetricCell("delivery_rate", metricValue(s, "delivery_rate")), defaultVisible: false },
    { key: "backoff", label: "Backoff", value: s => metricValue(s, "backoff"), render: s => renderTableMetricCell("backoff", metricValue(s, "backoff")), defaultVisible: false },
    { key: "retrans", label: "Retrans timer", value: s => s.details.timer?.retrans || 0, render: s => renderTableMetricCell("retrans", s.details.timer?.retrans || 0), defaultVisible: false }
  ];
}
