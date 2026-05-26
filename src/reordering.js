/**
 * Packet reordering detection via TCP counters.
 * Uses reord_seen, dsack_dups, and retrans to identify reordering vs real loss.
 */
import { metricValue } from "./parser.js";

/**
 * @typedef {{ socket: object, severity: "high"|"medium"|"low", reordSeen: number, dsackDups: number, retrans: number, detail: string }} ReorderFinding
 */

/**
 * Detect packet reordering across sockets.
 * @param {object[]} sockets
 * @returns {{ findings: ReorderFinding[], summary: { affected: number, totalReordSeen: number, totalDsackDups: number } }}
 */
export function detectReordering(sockets) {
  const findings = [];
  let totalReordSeen = 0, totalDsackDups = 0;

  for (const socket of sockets) {
    if (socket.state !== "ESTAB") continue;
    const reordSeen = metricValue(socket, "reord_seen") || 0;
    const dsackDups = metricValue(socket, "dsack_dups") || 0;
    const retrans = metricValue(socket, "retrans") || (socket.details?.timer?.retrans || 0);
    const bytesRetrans = metricValue(socket, "bytes_retrans") || 0;

    if (reordSeen === 0 && dsackDups === 0) continue;
    totalReordSeen += reordSeen;
    totalDsackDups += dsackDups;

    // High reordering with low real loss = path reordering (not congestion)
    const isSpuriousRetrans = dsackDups > 0 && bytesRetrans > 0 && dsackDups >= retrans * 0.5;
    const severity = reordSeen > 100 || (isSpuriousRetrans && dsackDups > 50) ? "high"
      : reordSeen > 10 || dsackDups > 10 ? "medium" : "low";

    const parts = [];
    if (reordSeen) parts.push(`reord_seen=${reordSeen}`);
    if (dsackDups) parts.push(`dsack_dups=${dsackDups}`);
    if (bytesRetrans) parts.push(`bytes_retrans=${bytesRetrans}`);
    const hint = isSpuriousRetrans
      ? "High DSACK ratio suggests spurious retransmissions caused by reordering, not real loss."
      : "Reordering detected — may trigger unnecessary retransmissions and cwnd reduction.";

    findings.push({
      socket, severity, reordSeen, dsackDups, retrans,
      detail: `${parts.join(", ")} on ${socket.local} → ${socket.peer}. ${hint}`
    });
  }

  return { findings, summary: { affected: findings.length, totalReordSeen, totalDsackDups } };
}
