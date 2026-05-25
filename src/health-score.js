import { analyzeSocket } from "./analysis.js";

/**
 * Compute a global network health score (0-100) from a list of sockets.
 * 100 = no anomalies at all, 0 = catastrophic widespread failure.
 *
 * Design principles:
 * - A system that works (data flows, queues drain) should never score below 40
 * - Only widespread critical failures with drops/backoff drive the score below 25
 * - "low" anomalies (missing process info) are ignored for scoring
 * - A few high-severity sockets among healthy ones = minor deduction
 *
 * @param {import('./types.js').Socket[]} sockets
 * @returns {{ score: number, grade: string, breakdown: { critical: number, high: number, medium: number, low: number, healthy: number } }}
 */
export function computeHealthScore(sockets) {
  if (!sockets || sockets.length === 0) return { score: 100, grade: "A", breakdown: { critical: 0, high: 0, medium: 0, low: 0, healthy: 0 } };

  let critical = 0, high = 0, medium = 0, low = 0, healthy = 0;

  for (const socket of sockets) {
    const anomalies = analyzeSocket(socket);
    if (anomalies.length === 0) { healthy++; continue; }
    const maxSev = anomalies.reduce((max, a) => {
      const order = { critical: 4, high: 3, medium: 2, low: 1 };
      return order[a.severity] > order[max] ? a.severity : max;
    }, "low");
    if (maxSev === "critical") critical++;
    else if (maxSev === "high") high++;
    else if (maxSev === "medium") medium++;
    else low++;
  }

  const total = sockets.length;
  // Deduction per category (out of 100 max total deduction)
  // critical: up to -50 if ALL sockets are critical
  // high: up to -25 if ALL sockets are high
  // medium: up to -10 if ALL sockets are medium
  // low: ignored (informational)
  const deduction =
    (critical / total) * 50 +
    (high / total) * 25 +
    (medium / total) * 10;

  const score = Math.max(0, Math.min(100, Math.round(100 - deduction)));
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 50 ? "C" : score >= 25 ? "D" : "F";

  return { score, grade, breakdown: { critical, high, medium, low, healthy } };
}
