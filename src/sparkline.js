/**
 * Sparkline renderer for table cells.
 * Generates tiny inline SVG sparklines from a series of values.
 */

/**
 * Build a sparkline index from snapshots — last N values per socket per metric.
 * @param {Array<{epochMs: number, sockets: object[]}>} snapshots
 * @param {function} socketIdentityKey
 * @param {function} metricValue
 * @param {{ maxPoints?: number, metrics?: string[] }} [options]
 * @returns {Map<string, Object<string, number[]>>} socketKey → { metric: values[] }
 */
export function buildSparklineIndex(snapshots, socketIdentityKey, metricValue, { maxPoints = 20, metrics = ["rtt", "sendQ", "recvQ", "cwnd"] } = {}) {
  const index = new Map();
  const start = Math.max(0, snapshots.length - maxPoints);
  for (let i = start; i < snapshots.length; i++) {
    for (const socket of snapshots[i].sockets) {
      const key = socketIdentityKey(socket);
      let entry = index.get(key);
      if (!entry) { entry = {}; for (const m of metrics) entry[m] = []; index.set(key, entry); }
      for (const m of metrics) entry[m].push(metricValue(socket, m) || 0);
    }
  }
  return index;
}

/**
 * Render a tiny SVG sparkline from an array of values.
 * @param {number[]} values
 * @param {{ width?: number, height?: number, color?: string }} [options]
 * @returns {string} inline SVG markup
 */
export function renderSparkline(values, { width = 48, height = 14, color = "#5db7ff" } = {}) {
  if (!values || values.length < 2) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * (height - 2) - 1).toFixed(1)}`).join(" ");
  return `<svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.2"/></svg>`;
}
