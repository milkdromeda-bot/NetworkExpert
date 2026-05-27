import { parsedTimestampSnapshots, socketIdentityKey } from "../timeline/timeline.js";
import { metricValue } from "../parsing/parser.js";

const RATE_METRICS = [
  { key: "recvQ", label: "Recv-Q", unit: "bytes", dangerRate: 200000 },
  { key: "sendQ", label: "Send-Q", unit: "bytes", dangerRate: 200000 },
  { key: "skmem.d", label: "Drops", unit: "drops", dangerDelta: 5, discrete: true },
  { key: "rto", label: "RTO", unit: "ms", dangerRate: 2000 },
  { key: "backoff", label: "Backoff", unit: "level", dangerDelta: 3, discrete: true },
  { key: "skmem.r", label: "skmem.r", unit: "bytes", dangerRate: 500000 }
];

function extractMetric(socket, key) {
  if (key === "recvQ") return Number(socket.recvQ || 0);
  if (key === "sendQ") return Number(socket.sendQ || 0);
  return metricValue(socket, key) || 0;
}

function processLabel(socket) {
  const p = socket.details?.process;
  return p ? `${p.name}:${p.pid}` : "";
}

function formatRate(value, unit) {
  if (unit === "bytes") {
    if (Math.abs(value) >= 1048576) return `${(value / 1048576).toFixed(1)}MB/s`;
    if (Math.abs(value) >= 1024) return `${(value / 1024).toFixed(0)}KB/s`;
    return `${Math.round(value)}B/s`;
  }
  if (unit === "ms") return `+${Math.round(value)}ms/s`;
  if (unit === "drops") return `+${value.toFixed(1)} drops/s`;
  return `+${value.toFixed(1)}/s`;
}

export function detectRateOfChange(raw = "", thresholds = {}) {
  const snapshots = parsedTimestampSnapshots(raw).filter(s => s.sockets.length > 0);
  if (snapshots.length < 2) return [];

  const alerts = [];

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];
    const dtMs = curr.epochMs - prev.epochMs;
    if (dtMs <= 10) continue;
    const dtSec = dtMs / 1000;

    for (const socket of curr.sockets) {
      const key = socketIdentityKey(socket);
      const prevSocket = prev.sockets.find(s => socketIdentityKey(s) === key);
      if (!prevSocket) continue;

      for (const metric of RATE_METRICS) {
        const currVal = extractMetric(socket, metric.key);
        const prevVal = extractMetric(prevSocket, metric.key);
        const delta = currVal - prevVal;
        if (delta <= 0) continue;

        if (metric.discrete) {
          const dangerDelta = thresholds[metric.key]?.dangerDelta || metric.dangerDelta;
          if (delta >= dangerDelta) {
            alerts.push({
              metric: metric.key,
              label: metric.label,
              socketKey: key,
              socket,
              process: processLabel(socket),
              peer: socket.peer || "",
              epochMs: curr.epochMs,
              prevValue: prevVal,
              currValue: currVal,
              delta,
              dtMs,
              rate: delta,
              rateFormatted: `+${delta} ${metric.unit}`,
              severity: delta >= dangerDelta * 3 ? "critical" : delta >= dangerDelta * 1.5 ? "high" : "medium"
            });
          }
        } else {
          const rate = delta / dtSec;
          const dangerRate = thresholds[metric.key]?.dangerRate || metric.dangerRate;
          if (rate >= dangerRate) {
            alerts.push({
              metric: metric.key,
              label: metric.label,
              socketKey: key,
              socket,
              process: processLabel(socket),
              peer: socket.peer || "",
              epochMs: curr.epochMs,
              prevValue: prevVal,
              currValue: currVal,
              delta,
              dtMs,
              rate,
              rateFormatted: formatRate(rate, metric.unit),
              severity: rate >= dangerRate * 3 ? "critical" : rate >= dangerRate * 1.5 ? "high" : "medium"
            });
          }
        }
      }
    }
  }

  // Deduplicate: keep worst per socket+metric
  const best = new Map();
  for (const a of alerts) {
    const k = `${a.socketKey}|${a.metric}`;
    const existing = best.get(k);
    if (!existing || a.rate > existing.rate) best.set(k, a);
  }

  return [...best.values()].sort((a, b) => b.rate - a.rate);
}

export { RATE_METRICS };
