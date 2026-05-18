/**
 * vmstat -t 1 parser
 * Parses vmstat output with timestamps into per-second samples.
 * Format: r b swpd free buff cache si so bi bo in cs us sy id wa st YYYY-MM-DD HH:MM:SS TZ
 */

/**
 * Parse vmstat -t 1 output.
 * Handles repeated headers and optional timezone column.
 * Format: r b swpd free buff cache si so bi bo in cs us sy id wa st YYYY-MM-DD HH:MM:SS [TZ]
 * @param {string} text - Raw vmstat log content
 * @returns {{ samples: Array<{epochMs,r,b,swpd,free,buff,cache,si,so,bi,bo,in,cs,us,sy,id,wa,st}> }}
 */
export function parseVmstat(text) {
  const samples = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("procs") || t.startsWith("-") || /^\s*r\s+b\s/.test(t)) continue;
    const p = t.split(/\s+/);
    if (p.length < 19) continue;
    // First 17 fields are numeric, then date (p[17]) and time (p[18]), optional TZ (p[19])
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p[17])) continue;
    const ts = new Date(`${p[17]}T${p[18]}Z`).getTime();
    if (!Number.isFinite(ts)) continue;
    samples.push({
      epochMs: ts,
      r: +p[0], b: +p[1], swpd: +p[2], free: +p[3], buff: +p[4], cache: +p[5],
      si: +p[6], so: +p[7], bi: +p[8], bo: +p[9], in: +p[10], cs: +p[11],
      us: +p[12], sy: +p[13], id: +p[14], wa: +p[15], st: +p[16]
    });
  }
  return { samples };
}

/**
 * Parse nstat output with per-second timestamps.
 * Format: === ISO-timestamp === followed by counter lines.
 * Handles nanosecond precision with comma separator: 2026-05-18T11:47:08,606571792+00:00
 * @param {string} text
 * @returns {{ samples: Array<{epochMs, counters: Object}> }}
 */
export function parseNstatTimestamped(text) {
  const samples = [];
  let currentEpoch = null;
  let currentCounters = {};

  for (const line of text.split(/\r?\n/)) {
    const tsMatch = line.match(/^===\s*(.+?)\s*===$/);
    if (tsMatch) {
      if (currentEpoch !== null && Object.keys(currentCounters).length) {
        samples.push({ epochMs: currentEpoch, counters: currentCounters });
      }
      // Normalize: replace comma with dot, truncate nanoseconds to ms
      let raw = tsMatch[1].replace(/,(\d{3})\d*/, ".$1");
      currentEpoch = new Date(raw).getTime();
      if (!Number.isFinite(currentEpoch)) currentEpoch = null;
      currentCounters = {};
      continue;
    }
    if (currentEpoch === null) continue;
    const m = line.match(/^(\w+)\s+(\d+)\s/);
    if (m) currentCounters[m[1]] = Number(m[2]);
  }
  if (currentEpoch !== null && Object.keys(currentCounters).length) {
    samples.push({ epochMs: currentEpoch, counters: currentCounters });
  }
  return { samples };
}

/**
 * Compute vmstat summary stats for a time range.
 */
export function vmstatSummary(samples) {
  if (!samples.length) return null;
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const max = (arr) => Math.max(...arr);
  return {
    count: samples.length,
    avgRunQueue: avg(samples.map(s => s.r)),
    maxRunQueue: max(samples.map(s => s.r)),
    avgCs: avg(samples.map(s => s.cs)),
    maxCs: max(samples.map(s => s.cs)),
    avgUs: avg(samples.map(s => s.us)),
    avgSy: avg(samples.map(s => s.sy)),
    avgWa: avg(samples.map(s => s.wa)),
    maxWa: max(samples.map(s => s.wa)),
    avgIdle: avg(samples.map(s => s.id))
  };
}
