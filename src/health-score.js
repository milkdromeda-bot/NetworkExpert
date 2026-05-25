import { analyzeSocket } from "./analysis.js";

const SEVERITY_WEIGHT = { critical: 10, high: 5, medium: 2, low: 0.5 };

/**
 * Compute a global network health score (0-100) from a list of sockets.
 * 100 = perfectly healthy, 0 = critical state.
 * @param {import('./types.js').Socket[]} sockets
 * @returns {{ score: number, grade: string, breakdown: { critical: number, high: number, medium: number, low: number, healthy: number } }}
 */
export function computeHealthScore(sockets) {
  if (!sockets || sockets.length === 0) return { score: 100, grade: "A", breakdown: { critical: 0, high: 0, medium: 0, low: 0, healthy: 0 } };

  let critical = 0, high = 0, medium = 0, low = 0, healthy = 0;

  for (const socket of sockets) {
    const anomalies = analyzeSocket(socket);
    if (anomalies.length === 0) { healthy++; continue; }
    const maxSev = anomalies.reduce((max, a) => SEVERITY_WEIGHT[a.severity] > SEVERITY_WEIGHT[max] ? a.severity : max, "low");
    if (maxSev === "critical") critical++;
    else if (maxSev === "high") high++;
    else if (maxSev === "medium") medium++;
    else low++;
  }

  const total = sockets.length;
  const penalty = (critical * SEVERITY_WEIGHT.critical + high * SEVERITY_WEIGHT.high + medium * SEVERITY_WEIGHT.medium + low * SEVERITY_WEIGHT.low) / total;
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty * 10)));
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 50 ? "C" : score >= 25 ? "D" : "F";

  return { score, grade, breakdown: { critical, high, medium, low, healthy } };
}
