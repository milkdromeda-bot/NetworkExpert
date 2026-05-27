export function createBdpChartUtils(ctx) {
  const { escapeHtml, timeLabel } = ctx;

  function bdpChartSeries(analysis, kind) {
    const capacity = analysis.series?.capacityBps || null;
    if (kind === "bdp") {
      return [
        { key: "observedBdpBytes", label: "Observed BDP", color: "#7dd3fc", dash: "", value: sample => sample.observedBdpBytes },
        { key: "effectiveWindowBytes", label: "rcv_space/window", color: "#fbbf24", dash: "", value: sample => sample.effectiveWindowBytes },
        { key: "skmemRb", label: "skmem.rb", color: "#a78bfa", dash: "6 5", value: sample => sample.skmemRb },
        { key: "targetBdpBytes", label: "Target BDP", color: "#22c55e", dash: "7 5", value: sample => sample.targetBdpBytes }
      ];
    }
    return [
      { key: "observedThroughputBps", label: "Observed", color: "#7dd3fc", dash: "", value: sample => sample.observedThroughputBps == null ? null : sample.observedThroughputBps / 1e6 },
      { key: "throughputMaxByRcvSpaceBps", label: "Max by window", color: "#fbbf24", dash: "", value: sample => sample.throughputMaxByRcvSpaceBps == null ? null : sample.throughputMaxByRcvSpaceBps / 1e6 },
      { key: "deliveryRateBps", label: "delivery_rate", color: "#a78bfa", dash: "6 5", value: sample => sample.deliveryRateBps == null ? null : sample.deliveryRateBps / 1e6 },
      { key: "scaleCapabilityThroughputBps", label: "Scaling capacity", color: "#64748b", dash: "4 6", value: sample => sample.scaleCapabilityThroughputBps == null ? null : sample.scaleCapabilityThroughputBps / 1e6 },
      { key: "noScaleThroughputBps", label: "64 KB no scaling", color: "#94a3b8", dash: "2 6", value: sample => sample.noScaleThroughputBps == null ? null : sample.noScaleThroughputBps / 1e6 },
      { key: "capacityBps", label: "Configured capacity", color: "#22c55e", dash: "8 5", value: () => capacity ? capacity / 1e6 : null }
    ];
  }
  
  function bdpSeriesValues(data, series) {
    return data
      .map(series.value)
      .filter(value => Number.isFinite(value) && value >= 0);
  }
  
  function bdpPath(data, series, x, y) {
    const segments = [];
    let current = [];
    data.forEach((sample, index) => {
      const value = series.value(sample);
      if (!Number.isFinite(value) || value < 0) {
        if (current.length) segments.push(current);
        current = [];
        return;
      }
      current.push(`${current.length ? "L" : "M"}${x(sample, index).toFixed(1)},${y(value).toFixed(1)}`);
    });
    if (current.length) segments.push(current);
    return segments.map(segment => `<path d="${segment.join(" ")}" fill="none" stroke="${series.color}" stroke-width="2.4" stroke-dasharray="${series.dash}" opacity=".95"/>`).join("");
  }
  
  function bdpMarkerOverlay(data, kind, x, pad, h) {
    const labels = [];
    data.forEach((sample, index) => {
      const marker = sample.markers || {};
      const entries = kind === "bdp"
        ? [
            marker.bdpNearWindow ? { color: "#fbbf24", label: "BDP near/exceeds window" } : null,
            marker.counterReset ? { color: "#fb7185", label: "counter reset / reconnect" } : null
          ]
        : [
            marker.retrans ? { color: "#fb7185", label: "retrans" } : null,
            marker.rttSpike ? { color: "#f97316", label: "RTT spike" } : null,
            marker.rcvSpaceCollapse ? { color: "#fbbf24", label: "rcv_space collapse" } : null,
            marker.persist ? { color: "#ef4444", label: "persist" } : null,
            marker.counterReset ? { color: "#94a3b8", label: "counter reset / reconnect" } : null
          ];
      entries.filter(Boolean).slice(0, 2).forEach((entry, offset) => {
        labels.push(`<circle cx="${x(sample, index).toFixed(1)}" cy="${pad.t + 10 + offset * 12}" r="4" fill="${entry.color}" opacity=".92"><title>${escapeHtml(entry.label)} at ${escapeHtml(timeLabel(sample.t || 0, sample.epochMs))}</title></circle>`);
      });
    });
    return labels.join("");
  }

  return { bdpChartSeries, bdpSeriesValues, bdpPath, bdpMarkerOverlay };
}
