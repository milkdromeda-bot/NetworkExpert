/**
 * GC Log Parser — Java 17+ Unified Logging format
 * Parses gc*,safepoint logs into structured pause events.
 */

const RE_TIMESTAMP = /\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[^\]]*)\]\[(\d+\.\d+)s\]/;
const RE_GC_PAUSE = /GC\((\d+)\)\s+Pause\s+(Young|Mixed|Remark|Cleanup|Full)\s*(?:\(([^)]+)\))?\s*/;
const RE_PAUSE_DURATION = /(\d+\.\d+)ms$/;
const RE_HEAP = /(\d+)M->(\d+)M\((\d+)M\)/;
const RE_REGIONS = /Eden:\s*(\d+)\([^)]*\)->(\d+)\([^)]*\)\s+Survivors?:\s*(\d+)\([^)]*\)->(\d+)\([^)]*\)\s+Old:\s*(\d+)\([^)]*\)->(\d+)/;
const RE_HUMONGOUS = /Humongous:\s*(\d+)->(\d+)/;
const RE_TIMES = /User=(\d+\.\d+)s\s+Sys=(\d+\.\d+)s\s+Real=(\d+\.\d+)s/;
const RE_SAFEPOINT = /Safepoint.*?Total:\s*(\d+[\.,]\d+)\s*ms/;
const RE_STOPPED = /Total time.*?stopped:\s*(\d+[\.,]\d+)\s*seconds/i;
const RE_EVACUATION_FAILURE = /Evacuation Failure|To-space exhausted/i;
const RE_HUMONGOUS_ALLOC = /Humongous Allocation/i;
const RE_SYSTEM_GC = /System\.gc/;

function parseAbsoluteTimestamp(str) {
  if (!str) return null;
  try { return new Date(str.replace(",", ".")).getTime(); } catch { return null; }
}

export function parseGcLog(text) {
  const lines = text.split(/\r?\n/);
  const pauses = [];
  const safepoints = [];
  let cur = null;

  for (const line of lines) {
    if (!line.trim()) { if (cur?.durationMs != null) { pauses.push(cur); cur = null; } continue; }

    const tsMatch = line.match(RE_TIMESTAMP);
    const epochMs = tsMatch ? parseAbsoluteTimestamp(tsMatch[1]) : null;
    const uptimeS = tsMatch ? Number(tsMatch[2]) : null;

    // Safepoint
    const spMatch = line.match(RE_SAFEPOINT);
    if (spMatch) { safepoints.push({ epochMs, uptimeS, totalMs: Number(spMatch[1].replace(",", ".")) }); continue; }
    const stMatch = line.match(RE_STOPPED);
    if (stMatch) { safepoints.push({ epochMs, uptimeS, totalMs: Number(stMatch[1].replace(",", ".")) * 1000 }); continue; }

    // GC pause start
    const gcMatch = line.match(RE_GC_PAUSE);
    if (gcMatch) {
      if (cur?.durationMs != null) pauses.push(cur);
      cur = { id: Number(gcMatch[1]), type: gcMatch[2], cause: gcMatch[3] || "", epochMs, uptimeS, durationMs: null, heapBeforeMB: null, heapAfterMB: null, heapCapacityMB: null, edenBefore: null, edenAfter: null, survivorBefore: null, survivorAfter: null, oldBefore: null, oldAfter: null, humongousBefore: null, humongousAfter: null, userS: null, sysS: null, realS: null, evacuationFailure: false, humongousAllocation: RE_HUMONGOUS_ALLOC.test(line) };
      const d = line.match(RE_PAUSE_DURATION);
      if (d) { cur.durationMs = Number(d[1]); pauses.push(cur); cur = null; }
      continue;
    }

    if (!cur) continue;

    const d = line.match(RE_PAUSE_DURATION);
    if (d && cur.durationMs == null) cur.durationMs = Number(d[1]);
    const h = line.match(RE_HEAP);
    if (h && cur.heapBeforeMB == null) { cur.heapBeforeMB = Number(h[1]); cur.heapAfterMB = Number(h[2]); cur.heapCapacityMB = Number(h[3]); }
    const r = line.match(RE_REGIONS);
    if (r) { cur.edenBefore = Number(r[1]); cur.edenAfter = Number(r[2]); cur.survivorBefore = Number(r[3]); cur.survivorAfter = Number(r[4]); cur.oldBefore = Number(r[5]); cur.oldAfter = Number(r[6]); }
    const hm = line.match(RE_HUMONGOUS);
    if (hm) { cur.humongousBefore = Number(hm[1]); cur.humongousAfter = Number(hm[2]); }
    const t = line.match(RE_TIMES);
    if (t) { cur.userS = Number(t[1]); cur.sysS = Number(t[2]); cur.realS = Number(t[3]); }
    if (RE_EVACUATION_FAILURE.test(line)) cur.evacuationFailure = true;
    if (RE_HUMONGOUS_ALLOC.test(line)) cur.humongousAllocation = true;
  }
  if (cur?.durationMs != null) pauses.push(cur);
  return { pauses, safepoints };
}

export function classifyPause(p) {
  const f = [];
  if (p.type === "Full") f.push("full_gc");
  if (p.evacuationFailure) f.push("evacuation_failure");
  if (p.humongousAllocation) f.push("humongous_alloc");
  if (RE_SYSTEM_GC.test(p.cause)) f.push("system_gc");
  f.push(p.type.toLowerCase());
  if (p.realS != null && p.userS != null && p.sysS != null) {
    if (p.realS > (p.userS + p.sysS) * 1.5 + 0.01) f.push("cpu_starvation");
    if (p.sysS > p.userS * 0.5 && p.sysS > 0.01) f.push("high_sys");
  }
  return f;
}

export function g1Recommendations(pauses) {
  const recs = [];
  const full = pauses.filter(p => p.type === "Full");
  const evac = pauses.filter(p => p.evacuationFailure);
  const hum = pauses.filter(p => p.humongousAllocation);
  const cpuS = pauses.filter(p => classifyPause(p).includes("cpu_starvation"));
  const hiSys = pauses.filter(p => classifyPause(p).includes("high_sys"));
  const young = pauses.filter(p => p.type === "Young");
  const avgY = young.length ? young.reduce((s, p) => s + p.durationMs, 0) / young.length : 0;
  const span = pauses.length > 1 ? ((pauses[pauses.length - 1].uptimeS || 0) - (pauses[0].uptimeS || 0)) : 0;
  const freq = span > 0 ? pauses.length / span : 0;

  if (full.length) recs.push({ severity: "critical", text: `${full.length} Full GC — heap exhausted or fragmented.` });
  if (evac.length) recs.push({ severity: "critical", text: `${evac.length} evacuation failure / to-space exhausted.` });
  if (hum.length > 3) recs.push({ severity: "warning", text: `${hum.length} humongous allocations — check message/buffer sizes.` });
  if (cpuS.length > 2) recs.push({ severity: "warning", text: `${cpuS.length} pauses with Real >> User+Sys — CPU starvation suspected.` });
  if (hiSys.length > 2) recs.push({ severity: "warning", text: `${hiSys.length} pauses with high Sys — OS overhead suspected.` });
  if (freq > 2) recs.push({ severity: "warning", text: `High GC frequency (${freq.toFixed(1)}/s) — allocation rate too high or heap too small.` });
  if (avgY > 15 && young.length > 5) recs.push({ severity: "info", text: `Avg young GC ${avgY.toFixed(1)} ms — may impact latency-sensitive paths.` });
  if (!recs.length) recs.push({ severity: "info", text: "GC behavior appears nominal." });
  return recs;
}

export const RECOMMENDED_JVM_LOGGING = `-Xlog:gc*,safepoint=info:file=/var/log/app/gc-%p-%t.log:time,uptime,level,tags:filecount=20,filesize=50M`;
