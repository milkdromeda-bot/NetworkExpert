/**
 * Sankey diagram renderer for service flow visualization.
 * Renders flows between process → local → peer with thickness proportional to weight.
 */

/**
 * Build and render a Sankey SVG from service map data.
 * @param {{ edges: Array<{from: string, mid: string, to: string, weight: number, risk: string}>, nodes: Map<string, {id: string, label: string, kind: string}> }} map
 * @param {{ width?: number, height?: number, escapeHtml?: function }} [options]
 * @returns {string} SVG markup
 */
export function renderSankeySvg(map, { width = 1000, height = 500, escapeHtml = s => s } = {}) {
  const { edges } = map;
  if (!edges.length) return `<div class="empty">No flows to visualize.</div>`;

  // Aggregate flows: group by from→to, sum weights
  const flows = new Map();
  for (const edge of edges) {
    const key = `${edge.from}|${edge.to}`;
    const existing = flows.get(key);
    if (existing) { existing.weight += edge.weight; existing.count++; existing.risk = riskMax(existing.risk, edge.risk); }
    else flows.set(key, { from: edge.from, to: edge.to, weight: edge.weight, count: 1, risk: edge.risk });
  }

  // Keep only top flows for readability
  const MAX_FLOWS = 20;
  const sorted = [...flows.values()].sort((a, b) => riskOrd(b.risk) - riskOrd(a.risk) || b.weight - a.weight);
  const visible = sorted.slice(0, MAX_FLOWS);
  const hiddenCount = sorted.length - visible.length;

  // Collect unique nodes per column
  const leftIds = [...new Set(visible.map(f => f.from))];
  const rightIds = [...new Set(visible.map(f => f.to))];
  const allNodes = map.nodes || new Map();

  const pad = { l: 180, r: 180, t: 30, b: 30 };
  const plotH = height - pad.t - pad.b;
  const maxWeight = Math.max(...visible.map(f => f.weight), 1);

  // Position nodes vertically
  const leftY = distribute(leftIds, plotH, pad.t);
  const rightY = distribute(rightIds, plotH, pad.t);

  // Draw paths
  const paths = visible.map(flow => {
    const y1 = leftY.get(flow.from) || pad.t;
    const y2 = rightY.get(flow.to) || pad.t;
    const thickness = Math.max(2, (flow.weight / maxWeight) * 40);
    const color = flow.risk === "critical" ? "rgba(255,92,119,0.5)" : flow.risk === "high" ? "rgba(255,159,67,0.5)" : flow.risk === "medium" ? "rgba(255,209,102,0.4)" : "rgba(93,183,255,0.35)";
    const x1 = pad.l, x2 = width - pad.r;
    const cx1 = x1 + (x2 - x1) * 0.35, cx2 = x1 + (x2 - x1) * 0.65;
    return `<path d="M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}" fill="none" stroke="${color}" stroke-width="${thickness}" opacity="0.7">
      <title>${nodeLabel(allNodes, flow.from)} → ${nodeLabel(allNodes, flow.to)} (${flow.count} socket${flow.count > 1 ? "s" : ""})</title>
    </path>`;
  }).join("\n");

  // Draw node labels
  const leftLabels = leftIds.map(id => {
    const y = leftY.get(id);
    return `<text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#c4d0de">${escapeHtml(truncLabel(nodeLabel(allNodes, id)))}</text>`;
  }).join("\n");
  const rightLabels = rightIds.map(id => {
    const y = rightY.get(id);
    return `<text x="${width - pad.r + 8}" y="${y + 4}" text-anchor="start" font-size="11" fill="#c4d0de">${escapeHtml(truncLabel(nodeLabel(allNodes, id)))}</text>`;
  }).join("\n");

  return `<svg viewBox="0 0 ${width} ${height}" class="sankey-chart" role="img" aria-label="Service flow Sankey diagram">
    <text x="${pad.l - 8}" y="16" text-anchor="end" font-size="10" fill="#8cb7ff" font-weight="700">PROCESS</text>
    <text x="${width - pad.r + 8}" y="16" text-anchor="start" font-size="10" fill="#8cb7ff" font-weight="700">PEER</text>
    ${paths}
    ${leftLabels}
    ${rightLabels}
    ${hiddenCount > 0 ? `<text x="${width / 2}" y="${height - 6}" text-anchor="middle" font-size="10" fill="#8c9aab">Showing top ${visible.length} of ${sorted.length} flows (by risk then bandwidth)</text>` : ""}
  </svg>`;
}

function distribute(ids, plotH, padT) {
  const map = new Map();
  const gap = ids.length > 1 ? plotH / (ids.length - 1) : 0;
  ids.forEach((id, i) => map.set(id, padT + (ids.length > 1 ? i * gap : plotH / 2)));
  return map;
}

function nodeLabel(nodes, id) {
  const node = nodes.get?.(id);
  return node?.label || id.replace(/^(process|local|peer):/, "");
}

function truncLabel(label) {
  return label.length > 28 ? label.slice(0, 26) + "…" : label;
}

function riskMax(a, b) {
  const order = { critical: 4, high: 3, medium: 2, low: 1 };
  return (order[b] || 0) > (order[a] || 0) ? b : a;
}

function riskOrd(r) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[r] || 0;
}
