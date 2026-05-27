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
 * - Fragmentation and reordering findings add supplementary deductions
 *
 * @param {import('./types.js').Socket[]} sockets
 * @param {{ fragmentation?: { findings: Array<{severity: string}> }, reordering?: { findings: Array<{severity: string}> } }} [extras]
 * @returns {{ score: number, grade: string, breakdown: { critical: number, high: number, medium: number, low: number, healthy: number } }}
 */
export function computeHealthScore(sockets, extras) {
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
  const deduction =
    (critical / total) * 50 +
    (high / total) * 25 +
    (medium / total) * 10;

  // Supplementary deductions from fragmentation and reordering
  let extraDeduction = 0;
  if (extras?.fragmentation?.findings?.length) {
    const f = extras.fragmentation.findings;
    const fragHigh = f.filter(x => x.severity === "high").length;
    const fragMed = f.filter(x => x.severity === "medium").length;
    extraDeduction += Math.min(8, fragHigh * 3 + fragMed * 1);
  }
  if (extras?.reordering?.findings?.length) {
    const r = extras.reordering.findings;
    const reordHigh = r.filter(x => x.severity === "high").length;
    const reordMed = r.filter(x => x.severity === "medium").length;
    extraDeduction += Math.min(7, reordHigh * 3 + reordMed * 1);
  }

  // Absolute floor: significant critical presence caps the score below A
  const absoluteFloor = critical > 3 ? Math.min(20, 10 + critical) : critical > 0 ? critical * 2 : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - Math.max(deduction + extraDeduction, absoluteFloor))));
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 50 ? "C" : score >= 25 ? "D" : "F";

  return { score, grade, breakdown: { critical, high, medium, low, healthy } };
}
