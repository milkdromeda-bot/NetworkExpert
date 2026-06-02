const ANNOTATION_COLORS = {
  custom: "#7bdff6",
  "burst-start": "#ffd84d",
  failover: "#ff9f43",
  "queue-reset": "#4cde8a",
  "rtt-peak": "#ff5c77"
};

export function createChartOverlayRenderer(getDeps) {
  const current = () => getDeps();

  function chartMicroburstBand(summary, data, pad, w, h, firstTime, lastTime) {
    if (!summary || !data.length) return "";
    const startTime = Math.max(firstTime, summary.startEpochMs || firstTime);
    const endTime = Math.min(lastTime, summary.endEpochMs || lastTime);
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime || endTime < firstTime || startTime > lastTime) return "";
    const timeSpan = Math.max(1, lastTime - firstTime);
    const xFromTime = time => data.length > 1 && timeSpan > 1
      ? pad.l + ((time - firstTime) / timeSpan) * (w - pad.l - pad.r)
      : pad.l;
    const left = Math.max(pad.l, Math.min(w - pad.r, xFromTime(startTime)));
    const right = Math.max(left + 2, Math.min(w - pad.r, xFromTime(endTime)));
    const labelX = Math.min(Math.max(left + 8, pad.l + 8), Math.max(pad.l + 8, right - 112));
    return `
    <rect x="${left}" y="${pad.t}" width="${Math.max(2, right - left)}" height="${h - pad.t - pad.b}" fill="#ffd84d" opacity=".12"/>
    <line x1="${left}" x2="${left}" y1="${pad.t}" y2="${h - pad.b}" stroke="#ffd84d" stroke-width="1.5" stroke-dasharray="5 4" opacity=".9"/>
    <line x1="${right}" x2="${right}" y1="${pad.t}" y2="${h - pad.b}" stroke="#ffd84d" stroke-width="1.5" stroke-dasharray="5 4" opacity=".9"/>
    <rect x="${labelX}" y="${pad.t + 8}" width="108" height="22" rx="6" fill="#211804" stroke="#ffd84d"/>
    <text x="${labelX + 10}" y="${pad.t + 23}" fill="#ffe58c" font-size="11" font-weight="700">MICROBURST</text>
  `;
  }

  function annotationColor(kind = "custom") {
    return ANNOTATION_COLORS[kind] || ANNOTATION_COLORS.custom;
  }

  function chartAnnotationOverlay(metric, data, pad, w, h, firstTime, lastTime) {
    const { annotationDefaultLabel, annotationSocketId, chartBgColor, currentSourceAnnotations, escapeHtml } = current();
    const annotations = currentSourceAnnotations(metric, annotationSocketId(), data)
      .filter(item => item.resolvedEpochMs >= firstTime && item.resolvedEpochMs <= lastTime)
      .slice(0, 6);
    if (!annotations.length || !data.length) return "";
    const timeSpan = Math.max(1, lastTime - firstTime);
    const xFromTime = time => data.length > 1 && timeSpan > 1
      ? pad.l + ((time - firstTime) / timeSpan) * (w - pad.l - pad.r)
      : pad.l;
    return annotations.map((item, index) => {
      const x = Math.max(pad.l, Math.min(w - pad.r, xFromTime(item.resolvedEpochMs)));
      const color = annotationColor(item.kind);
      const label = item.label || annotationDefaultLabel(item.kind);
      const width = Math.min(176, Math.max(72, label.length * 7 + 20));
      const boxX = Math.min(Math.max(x + 8, pad.l + 8), Math.max(pad.l + 8, w - pad.r - width - 6));
      const boxY = pad.t + 10 + (index % 3) * 26;
      const timeStr = item.resolvedEpochMs ? new Date(item.resolvedEpochMs).toISOString().slice(11, 23) : "";
      const isLight = chartBgColor() === "#f0f3f7";
      const lineColor = isLight ? "#1a5fb4" : color;
      return `
      <g class="annotation-overlay-item" opacity="${isLight ? 1 : .8}" pointer-events="none">
        <line x1="${x}" x2="${x}" y1="${pad.t}" y2="${h - pad.b}" stroke="${lineColor}" stroke-width="1.8" stroke-dasharray="6 4"/>
        <circle cx="${x}" cy="${pad.t + 8}" r="4.5" fill="${lineColor}"/>
        <rect x="${boxX}" y="${boxY}" width="${width}" height="32" rx="6" fill="${isLight ? "#dce2ea" : "#081019"}" opacity=".7" stroke="${lineColor}"/>
        <text x="${boxX + 8}" y="${boxY + 13}" fill="${isLight ? "#1a2533" : color}" font-size="10" font-weight="800">${escapeHtml(label)}</text>
        <text x="${boxX + 8}" y="${boxY + 26}" fill="${isLight ? "#3d4f60" : color}" font-size="9" opacity="0.7">${escapeHtml(timeStr)}</text>
      </g>
    `;
    }).join("");
  }

  return {
    annotationColor,
    chartAnnotationOverlay,
    chartMicroburstBand
  };
}
