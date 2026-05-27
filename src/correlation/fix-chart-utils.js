export function fixTimeLabel(epochMs) {
  const d = new Date(epochMs);
  return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}:${String(d.getUTCSeconds()).padStart(2,"0")}`;
}

export function fixSpikeGroups(fixResults, gapMs = 2000) {
  if (!fixResults.length) return [];
  const sorted = [...fixResults].sort((a, b) => a.receiveMs - b.receiveMs);
  const groups = [];
  let cur = { id: 1, startMs: sorted[0].receiveMs, endMs: sorted[0].receiveMs, spikes: [sorted[0]] };
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].receiveMs - cur.endMs > gapMs) {
      groups.push(cur);
      cur = { id: groups.length + 1, startMs: sorted[i].receiveMs, endMs: sorted[i].receiveMs, spikes: [sorted[i]] };
    } else {
      cur.endMs = sorted[i].receiveMs;
      cur.spikes.push(sorted[i]);
    }
  }
  groups.push(cur);
  return groups;
}

export function fixChartXTicks(t0, t1, pad, w, count = 5) {
  const span = t1 - t0 || 1;
  return Array.from({ length: count }, (_, i) => {
    const f = i / (count - 1);
    const epoch = t0 + f * span;
    const px = pad.l + f * (w - pad.l - pad.r);
    return { px, label: fixTimeLabel(epoch) };
  });
}

export function fixChartYTicks(min, max, pad, h, count = 5) {
  const span = max - min || 1;
  return Array.from({ length: count }, (_, i) => {
    const f = i / (count - 1);
    const val = min + f * span;
    const py = pad.t + (h - pad.t - pad.b) * (1 - f);
    return { py, val };
  });
}

export function fixChartGrid(xTicks, yTicks, pad, w, h) {
  const yLines = yTicks.map(t => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${t.py}" y2="${t.py}" stroke="var(--line)" stroke-width="0.5"/>`).join("");
  const xLines = xTicks.map(t => `<line x1="${t.px}" x2="${t.px}" y1="${pad.t}" y2="${h - pad.b}" stroke="var(--line)" stroke-width="0.3"/>`).join("");
  return yLines + xLines;
}

export function fixChartXLabels(xTicks, h) {
  return xTicks.map((t, i) => `<text x="${t.px}" y="${h - 20}" text-anchor="${i === xTicks.length - 1 ? "end" : i === 0 ? "start" : "middle"}" fill="var(--muted)" font-size="10">${t.label}</text>`).join("");
}

export function fixChartYLabels(yTicks, pad, formatter) {
  return yTicks.map(t => `<text x="${pad.l - 6}" y="${t.py + 3}" text-anchor="end" fill="var(--muted)" font-size="10">${formatter(t.val)}</text>`).join("");
}

export function fixSeverityColor(severity) {
  return severity === "critical" ? "#ff5c77" : severity === "warning_high" ? "#ff9f43" : severity === "warning" ? "#ffd166" : severity === "info" ? "#39d6d6" : "#8c9aab";
}
