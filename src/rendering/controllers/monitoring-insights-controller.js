export function createMonitoringInsightsController(getDeps) {
  const current = () => getDeps();

  function buildCorrelationMatrix() {
    const { state } = current();
    const history = state.history;
    if (!history || history.length < 20) return null;
    const metrics = ["rtt", "sendQ", "recvQ", "cwnd", "rto", "retrans", "skmem.r", "skmem.d"];
    const data = metrics.map(metric => history.map(row => row[metric] || 0));
    const cells = metrics.map((_, rowIndex) => metrics.map((_, colIndex) => (
      rowIndex === colIndex ? 1 : pearson(data[rowIndex], data[colIndex])
    )));
    return `<table style="border-collapse:collapse;font-size:11px"><thead><tr><th></th>${metrics.map(metric => `<th style="padding:3px 6px;color:var(--muted);font-weight:400">${metric}</th>`).join("")}</tr></thead><tbody>${cells.map((row, index) => `<tr><td style="padding:3px 6px;font-weight:600;color:var(--text)">${metrics[index]}</td>${row.map(value => `<td style="padding:3px 6px;text-align:center;background:${correlationColor(value)};border-radius:3px">${value === 1 ? "" : value.toFixed(2)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }

  function pearson(a, b) {
    const n = a.length;
    if (n < 5) return 0;
    const ma = a.reduce((sum, value) => sum + value, 0) / n;
    const mb = b.reduce((sum, value) => sum + value, 0) / n;
    let num = 0;
    let da = 0;
    let db = 0;
    for (let index = 0; index < n; index++) {
      const x = a[index] - ma;
      const y = b[index] - mb;
      num += x * y;
      da += x * x;
      db += y * y;
    }
    const denom = Math.sqrt(da) * Math.sqrt(db);
    return denom ? num / denom : 0;
  }

  function correlationColor(value) {
    const abs = Math.abs(value);
    if (abs < 0.3) return "transparent";
    return value > 0 ? `rgba(255,92,119,${abs})` : `rgba(59,130,246,${abs})`;
  }

  function detectTrends() {
    const { state, socketsById, thresholdFor } = current();
    const history = state.history;
    if (!history || history.length < 10) return [];
    const trends = [];
    const metrics = [
      { key: "recvQ", label: "Recv-Q", limit: socket => (socket?.details?.skmem?.rb || 4194304), unit: "bytes" },
      { key: "sendQ", label: "Send-Q", limit: () => 1048576, unit: "bytes" },
      { key: "skmem.r", label: "skmem.r", limit: socket => (socket?.details?.skmem?.rb || 4194304), unit: "bytes" },
      { key: "rto", label: "RTO", limit: () => 120000, unit: "ms" }
    ];
    const recent = history.slice(-20);
    const older = history.slice(-40, -20);
    if (!older.length) return [];
    const socket = socketsById().get(state.selectedId) || state.sockets[0];
    for (const metric of metrics) {
      const recentAvg = average(recent, metric.key);
      const olderAvg = average(older, metric.key);
      if (olderAvg <= 0 || recentAvg <= olderAvg) continue;
      const growthRate = (recentAvg - olderAvg) / olderAvg;
      if (growthRate < 0.1) continue;
      const limit = metric.limit(socket);
      const timePerSample = history.length > 1 ? (history[history.length - 1].epochMs - history[0].epochMs) / history.length : 1000;
      const samplesPerMin = 60000 / timePerSample;
      const ratePerMin = (recentAvg - olderAvg) / (20 / samplesPerMin);
      const remaining = limit - recentAvg;
      const minutesToOverflow = remaining > 0 && ratePerMin > 0 ? Math.round(remaining / ratePerMin) : null;
      if (minutesToOverflow !== null && minutesToOverflow < 30) {
        trends.push({ metric: metric.label, rate: `${(growthRate * 100).toFixed(0)}%`, perMin: ratePerMin, eta: minutesToOverflow, unit: metric.unit, current: Math.round(recentAvg), limit });
      }
    }
    return trends;
  }

  function baselineDeviations() {
    const { state } = current();
    if (!state.baseline?.history?.length || !state.history?.length) return [];
    const deviations = [];
    for (const metric of ["rtt", "sendQ", "recvQ", "retrans", "rto"]) {
      const baseVals = positiveValues(state.baseline.history, metric);
      const currVals = positiveValues(state.history, metric);
      if (!baseVals.length || !currVals.length) continue;
      const baseP95 = percentileValue(baseVals, 0.95);
      const currP95 = percentileValue(currVals, 0.95);
      if (baseP95 > 0 && currP95 > baseP95 * 2) deviations.push({ metric, baseP95, currP95, ratio: (currP95 / baseP95).toFixed(1) });
    }
    return deviations;
  }

  function average(rows, key) {
    return rows.reduce((sum, row) => sum + (row[key] || 0), 0) / rows.length;
  }

  function positiveValues(rows, key) {
    return rows.map(row => row[key] || 0).filter(value => value > 0).sort((a, b) => a - b);
  }

  function percentileValue(values, percentile) {
    return values[Math.floor(values.length * percentile)] || 0;
  }

  return {
    baselineDeviations,
    buildCorrelationMatrix,
    detectTrends
  };
}
