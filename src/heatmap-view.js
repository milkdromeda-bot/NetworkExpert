import { socketIdentityKey } from "./timeline.js";

/**
 * @param {import('./app-context.js').AppContext} ctx
 * @returns {string}
 */
export function renderTimelineHeatmap(ctx) {
  const { state, escapeHtml, thresholdFor, parsedTimestampSnapshots } = ctx;
  const snapshots = parsedTimestampSnapshots();
  if (!snapshots.length) return `<div class="empty">No timestamped snapshots for heatmap. Import multiple ss captures with timestamps.</div>`;
  const first = snapshots[0].epochMs;
  const last = snapshots[snapshots.length - 1].epochMs;
  const span = Math.max(1, last - first);
  const allSocketKeys = new Map();
  for (const snap of snapshots) {
    for (const s of snap.sockets) {
      const key = socketIdentityKey(s);
      if (!allSocketKeys.has(key)) allSocketKeys.set(key, { key, label: (s.details?.process?.name ? s.details.process.name + ":" + s.details.process.pid : s.local).slice(0, 24), local: s.local, peer: s.peer });
    }
  }
  const socketList = [...allSocketKeys.values()].slice(0, 30);
  if (!socketList.length) return `<div class="empty">No socket data for heatmap.</div>`;
  const resolutions = [
    { label: "10ms", ms: 10 }, { label: "20ms", ms: 20 }, { label: "50ms", ms: 50 },
    { label: "100ms", ms: 100 }, { label: "200ms", ms: 200 }, { label: "500ms", ms: 500 },
    { label: "1s", ms: 1000 }, { label: "5s", ms: 5000 }, { label: "10s", ms: 10000 }, { label: "30s", ms: 30000 }
  ];
  const detectedInterval = snapshots.length > 1 ? span / (snapshots.length - 1) : 1000;
  const defaultRes = resolutions.reduce((best, r) => Math.abs(r.ms - detectedInterval) < Math.abs(best.ms - detectedInterval) ? r : best).ms;
  const activeRes = state._heatmapResMs || defaultRes;
  const bucketMs = activeRes;
  const cols = Math.max(1, Math.ceil(span / bucketMs));
  const grid = socketList.map(sk => {
    const row = Array(cols).fill(0);
    for (const snap of snapshots) {
      const col = Math.min(cols - 1, Math.floor((snap.epochMs - first) / bucketMs));
      for (const s of snap.sockets) {
        if (socketIdentityKey(s) !== sk.key) continue;
        let sev = 0;
        const rtt = s.details?.values?.rtt?.avg || 0;
        const backoff = s.details?.values?.backoff || 0;
        const rto = s.details?.values?.rto || 0;
        const cwnd = s.details?.values?.cwnd;
        const timerRetrans = s.details?.timer?.retrans || 0;
        const tRtt = thresholdFor("rtt");
        const tSendQ = thresholdFor("sendQ");
        const tRecvQ = thresholdFor("recvQ");
        if (backoff > 2 || s.sendQ >= tSendQ.danger || s.recvQ >= tRecvQ.danger) sev = 4;
        else if (backoff > 0 || rto >= 1000 || s.sendQ >= tSendQ.warn || s.recvQ >= tRecvQ.warn || timerRetrans > 2) sev = 3;
        else if (rtt >= tRtt.warn || timerRetrans > 0 || (cwnd != null && cwnd <= 4)) sev = 2;
        else if (rtt > 0) sev = 1;
        row[col] = Math.max(row[col], sev);
      }
    }
    return { socket: sk, row };
  });
  const colors = ["var(--panel-2)", "rgba(76,222,138,0.6)", "rgba(255,209,102,0.7)", "rgba(255,159,67,0.8)", "rgba(255,92,119,0.9)"];
  const gridWidth = cols * 5;
  const timeLabels = [];
  const maxLabels = Math.max(2, Math.floor(gridWidth / 80));
  const labelCount = Math.min(maxLabels, cols);
  for (let i = 0; i < labelCount; i++) {
    const col = Math.round(i * (cols - 1) / (labelCount - 1));
    timeLabels.push({ col, label: new Date(first + col * bucketMs).toISOString().slice(11, 19) });
  }
  return `<div class="heatmap-container">
    <div class="heatmap-toolbar">
      <label class="heatmap-toolbar-label">Resolution: <select id="heatmapResSelect">${resolutions.map(r => `<option value="${r.ms}" ${r.ms === activeRes ? "selected" : ""}>${r.label}</option>`).join("")}</select></label>
      <span class="heatmap-toolbar-info">${new Date(first).toISOString().slice(11,19)} → ${new Date(last).toISOString().slice(11,19)} (${cols} buckets)</span>
    </div>
    <div class="heatmap-grid">
      <div class="heatmap-row heatmap-axis-row">
        <span class="heatmap-row-label"></span>
        <div class="heatmap-axis" style="width:${gridWidth}px">${timeLabels.map(t => `<span style="left:${(t.col / cols) * 100}%">${t.label}</span>`).join("")}</div>
      </div>
      ${grid.map(({ socket, row }) => `<div class="heatmap-row">
        <span class="heatmap-row-label" title="${escapeHtml(socket.local + " → " + socket.peer)}">${escapeHtml(socket.label)}</span>
        <div class="heatmap-cells-row" style="width:${gridWidth}px">${row.map((v, ci) => `<div class="heatmap-cell" style="background:${colors[v]}" title="${new Date(first + ci * bucketMs).toISOString().slice(11, 19)} — ${["none","low","medium","high","critical"][v]}"></div>`).join("")}</div>
      </div>`).join("")}
    </div>
    <div class="heatmap-legend"><span style="background:rgba(76,222,138,0.6)"></span>normal <span style="background:rgba(255,209,102,0.7)"></span>RTT / queue / retrans / cwnd≤4 <span style="background:rgba(255,159,67,0.8)"></span>backoff / RTO≥1s <span style="background:rgba(255,92,119,0.9)"></span>stall / overflow</div>
    <p class="heatmap-note">This heatmap shows <b>instantaneous socket state</b> per time bucket using your configured thresholds (Settings → Thresholds). It does NOT use cumulative counters (drops, bytes_sent) — only point-in-time metrics: RTT, Send-Q, Recv-Q, backoff, RTO, cwnd, retrans timer. Black = no data.</p>
  </div>`;
}
