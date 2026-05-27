/**
 * FIX Latency ↔ ss Correlation Engine
 * Correlates FIX lag spikes with TCP symptoms from ss snapshots.
 */

export const DEFAULT_WINDOWS = { beforeMs: 500, afterMs: 2000 };

/**
 * Normalize endpoint from FIX log (IP:port) to match ss peer format.
 * FIX: "169.189.209.134:20867" → ss peer could be "169.189.209.134:20867" or "[::ffff:169.189.209.134]:20867"
 */
function normalizeEndpoint(endpoint) {
  if (!endpoint) return { ip: "", port: "" };
  const lastColon = endpoint.lastIndexOf(":");
  if (lastColon < 0) return { ip: endpoint, port: "" };
  return { ip: endpoint.slice(0, lastColon), port: endpoint.slice(lastColon + 1) };
}

/**
 * Check if a ss snapshot matches a FIX endpoint.
 * Matches against both peer and local fields, by IP:port or IP alone.
 */
function peerMatchesEndpoint(snapshot, fixEndpoint) {
  if (!fixEndpoint) return false;
  const fix = normalizeEndpoint(fixEndpoint);
  if (!fix.ip) return false;
  const peer = snapshot.peer || "";
  const local = snapshot.local || "";
  // Exact IP:port match in peer or local
  if (peer.includes(fix.ip) && peer.includes(`:${fix.port}`)) return true;
  if (local.includes(fix.ip) && local.includes(`:${fix.port}`)) return true;
  // IPv4-mapped IPv6
  if (peer.includes(`::ffff:${fix.ip}`) && peer.includes(`:${fix.port}`)) return true;
  if (local.includes(`::ffff:${fix.ip}`) && local.includes(`:${fix.port}`)) return true;
  // IP-only match (port may differ due to ephemeral ports)
  if (peer.includes(fix.ip) || local.includes(fix.ip)) return true;
  return false;
}

/**
 * Find ss history snapshots within a time window, or nearest if none in window.
 */
function snapshotsInWindow(history, centerMs, beforeMs, afterMs) {
  const before = [];
  const after = [];
  for (const s of history) {
    const t = s.epochMs;
    if (t >= centerMs - beforeMs && t < centerMs) before.push(s);
    else if (t > centerMs && t <= centerMs + afterMs) after.push(s);
  }
  // If no snapshots in window, find the nearest one (for cases where ss and FIX don't overlap perfectly)
  if (!before.length && !after.length && history.length) {
    let best = history[0], bestDist = Math.abs(history[0].epochMs - centerMs);
    for (const s of history) {
      const d = Math.abs(s.epochMs - centerMs);
      if (d < bestDist) { best = s; bestDist = d; }
    }
    // Only use nearest if within 5 minutes
    if (bestDist <= 300000) {
      if (best.epochMs < centerMs) before.push(best);
      else after.push(best);
    }
  }
  return { before, after };
}

/**
 * Detect TCP symptoms in a snapshot relevant to latency.
 */
function detectSymptoms(snapshot) {
  const symptoms = [];
  if (snapshot.retrans > 0) symptoms.push({ type: "retrans", value: snapshot.retrans });
  if (snapshot.rtt > 50) symptoms.push({ type: "rtt_high", value: snapshot.rtt });
  if (snapshot.recvQ > 0) symptoms.push({ type: "recvq_pressure", value: snapshot.recvQ });
  if (snapshot.sendQ > 0) symptoms.push({ type: "sendq_pressure", value: snapshot.sendQ });
  if ((snapshot["skmem.d"] || 0) > 0) symptoms.push({ type: "drops", value: snapshot["skmem.d"] });
  if (snapshot.backoff > 0) symptoms.push({ type: "backoff", value: snapshot.backoff });
  if (snapshot.cwnd && snapshot.cwnd < 10) symptoms.push({ type: "cwnd_low", value: snapshot.cwnd });
  return symptoms;
}

/**
 * Score a FIX spike correlation with surrounding ss data.
 * Returns 0..1 where higher = stronger network correlation.
 */
function scoreCorrelation(record, before, after) {
  let score = 0;
  const allSnapshots = [...before, ...after];
  if (!allSnapshots.length) return { score: 0, symptoms: [], signals: [] };

  const signals = [];
  for (const s of allSnapshots) {
    const symptoms = detectSymptoms(s);
    for (const sym of symptoms) {
      if (!signals.find(x => x.type === sym.type)) signals.push(sym);
    }
  }

  // Score based on symptom types found
  if (signals.find(s => s.type === "retrans")) score += 0.3;
  if (signals.find(s => s.type === "rtt_high")) score += 0.2;
  if (signals.find(s => s.type === "recvq_pressure")) score += 0.2;
  if (signals.find(s => s.type === "sendq_pressure")) score += 0.15;
  if (signals.find(s => s.type === "drops")) score += 0.35;
  if (signals.find(s => s.type === "backoff")) score += 0.25;
  if (signals.find(s => s.type === "cwnd_low")) score += 0.15;

  // Bonus for lag magnitude only if there are actual signals
  if (score > 0) {
    if (record.lagMs > 100) score += 0.1;
    if (record.lagMs > 500) score += 0.1;
  }

  return { score: Math.min(1, score), symptoms: signals, signals: signals.map(s => s.type) };
}

function scoreSeverity(score) {
  if (score >= 0.7) return "critical";
  if (score >= 0.5) return "warning_high";
  if (score >= 0.3) return "warning";
  if (score > 0) return "info";
  return "none";
}

/**
 * Find vmstat sample closest to a given timestamp.
 */
function vmstatAtTime(vmstatSamples, epochMs) {
  if (!vmstatSamples?.length) return null;
  let best = vmstatSamples[0], bestDist = Math.abs(vmstatSamples[0].epochMs - epochMs);
  for (const s of vmstatSamples) {
    const d = Math.abs(s.epochMs - epochMs);
    if (d < bestDist) { best = s; bestDist = d; }
    if (s.epochMs > epochMs + 2000) break;
  }
  return bestDist <= 1500 ? best : null;
}

/**
 * Find nstat sample closest to a given timestamp.
 */
function nstatAtTime(nstatSamples, epochMs) {
  if (!nstatSamples?.length) return null;
  let best = nstatSamples[0], bestDist = Math.abs(nstatSamples[0].epochMs - epochMs);
  for (const s of nstatSamples) {
    const d = Math.abs(s.epochMs - epochMs);
    if (d < bestDist) { best = s; bestDist = d; }
    if (s.epochMs > epochMs + 2000) break;
  }
  return bestDist <= 1500 ? best : null;
}

/**
 * Detect CPU/scheduling symptoms from vmstat.
 */
function vmstatSymptoms(sample, cpuCores = 0) {
  if (!sample) return [];
  const symptoms = [];
  const rqThreshold = cpuCores > 0 ? cpuCores : 4;
  if (sample.r > rqThreshold) symptoms.push({ type: "runqueue_high", value: sample.r });
  if (sample.wa > 5) symptoms.push({ type: "io_wait", value: sample.wa });
  if (sample.us + sample.sy > 90) symptoms.push({ type: "cpu_saturated", value: sample.us + sample.sy });
  if (sample.si > 0 || sample.so > 0) symptoms.push({ type: "swap_active", value: sample.si + sample.so });
  if (sample.b > 2) symptoms.push({ type: "blocked_procs", value: sample.b });
  return symptoms;
}

/**
 * Detect network/kernel symptoms from nstat counters.
 */
function nstatSymptoms(sample) {
  if (!sample?.counters) return [];
  const c = sample.counters;
  const symptoms = [];
  if ((c.TcpRetransSegs || 0) > 0) symptoms.push({ type: "nstat_retrans", value: c.TcpRetransSegs });
  if ((c.TcpExtTCPTimeouts || 0) > 0) symptoms.push({ type: "nstat_timeouts", value: c.TcpExtTCPTimeouts });
  if ((c.TcpExtTCPBacklogDrop || 0) > 0) symptoms.push({ type: "nstat_backlog_drop", value: c.TcpExtTCPBacklogDrop });
  if ((c.TcpExtListenDrops || 0) > 0) symptoms.push({ type: "nstat_listen_drops", value: c.TcpExtListenDrops });
  if ((c.TcpExtListenOverflows || 0) > 0) symptoms.push({ type: "nstat_listen_overflow", value: c.TcpExtListenOverflows });
  if ((c.TcpExtTCPRcvQDrop || 0) > 0) symptoms.push({ type: "nstat_rcvq_drop", value: c.TcpExtTCPRcvQDrop });
  if ((c.TcpExtPruneCalled || 0) > 0) symptoms.push({ type: "nstat_prune", value: c.TcpExtPruneCalled });
  if ((c.TcpExtTCPSACKReorder || 0) > 0) symptoms.push({ type: "nstat_reorder", value: c.TcpExtTCPSACKReorder });
  if ((c.TcpExtTCPSynRetrans || 0) > 0) symptoms.push({ type: "nstat_syn_retrans", value: c.TcpExtTCPSynRetrans });
  if ((c.TcpExtTCPFromZeroWindowAdv || 0) > 0 || (c.TcpExtTCPToZeroWindowAdv || 0) > 0) symptoms.push({ type: "nstat_zero_window", value: (c.TcpExtTCPFromZeroWindowAdv || 0) + (c.TcpExtTCPToZeroWindowAdv || 0) });
  return symptoms;
}

/**
 * Find GC pause overlapping a FIX spike timestamp.
 */
function gcPauseAtTime(gcPauses, epochMs, windowMs = 500) {
  if (!gcPauses?.length) return null;
  for (const p of gcPauses) {
    const pauseStart = p.alignedEpochMs || p.epochMs || 0;
    const pauseEnd = pauseStart + (p.durationMs || 0);
    // Spike during or just after pause (within windowMs)
    if (epochMs >= pauseStart - 50 && epochMs <= pauseEnd + windowMs) return p;
  }
  return null;
}

/**
 * Main correlation function.
 * @param {Object} params
 * @param {Array} params.records - Parsed FIX records
 * @param {Array} params.history - ss history snapshots with epochMs + metrics
 * @param {number} params.threshold - Lag threshold in ms to consider a spike
 * @param {Object} params.windows - { beforeMs, afterMs }
 * @param {Array} [params.vmstatSamples] - Parsed vmstat samples
 * @param {Array} [params.nstatSamples] - Parsed nstat timestamped samples
 * @param {Array} [params.gcPauses] - Parsed GC pauses with alignedEpochMs/epochMs + durationMs
 * @returns {Object} Correlation results
 */
export function correlateFixLatency({ records, history, threshold = 5, windows = DEFAULT_WINDOWS, vmstatSamples = null, nstatSamples = null, gcPauses = null, gcWindowMs = 200, cpuCores = 0 }) {
  if (!records.length) return { results: [], summary: null };

  const spikes = records.filter(r => r.lagMs > threshold);
  const results = [];

  for (const spike of spikes) {
    const { before, after } = history.length ? snapshotsInWindow(history, spike.receiveMs, windows.beforeMs, windows.afterMs) : { before: [], after: [] };

    // Filter to matching endpoint if possible
    const matchedBefore = spike.endpoint ? before.filter(s => peerMatchesEndpoint(s, spike.endpoint)) : before;
    const matchedAfter = spike.endpoint ? after.filter(s => peerMatchesEndpoint(s, spike.endpoint)) : after;

    const useBefore = matchedBefore.length ? matchedBefore : before;
    const useAfter = matchedAfter.length ? matchedAfter : after;
    const endpointMatched = matchedBefore.length > 0 || matchedAfter.length > 0;

    const { score: ssScore, symptoms: ssSymptoms, signals: ssSignals } = scoreCorrelation(spike, useBefore, useAfter);

    // vmstat correlation
    const vmSample = vmstatAtTime(vmstatSamples, spike.receiveMs);
    const vmSyms = vmstatSymptoms(vmSample, cpuCores);

    // nstat correlation
    const nsSample = nstatAtTime(nstatSamples, spike.receiveMs);
    const nsSyms = nstatSymptoms(nsSample);

    // GC correlation
    const gcPause = gcPauseAtTime(gcPauses, spike.receiveMs, gcWindowMs);
    const gcSyms = gcPause ? [{ type: "gc_pause", value: gcPause.durationMs || 0 }] : [];

    // Combined score
    let score = ssScore;
    for (const s of vmSyms) {
      if (s.type === "runqueue_high") score += 0.15;
      else if (s.type === "cpu_saturated") score += 0.2;
      else if (s.type === "io_wait") score += 0.1;
      else if (s.type === "swap_active") score += 0.15;
      else score += 0.05;
    }
    for (const s of nsSyms) {
      if (s.type === "nstat_retrans") score += 0.25;
      else if (s.type === "nstat_timeouts") score += 0.2;
      else if (s.type === "nstat_backlog_drop" || s.type === "nstat_rcvq_drop") score += 0.3;
      else if (s.type === "nstat_listen_drops" || s.type === "nstat_listen_overflow") score += 0.2;
      else score += 0.1;
    }
    if (gcPause) {
      score += 0.3;
      if ((gcPause.durationMs || 0) > 100) score += 0.15;
      if ((gcPause.durationMs || 0) > 500) score += 0.15;
    }
    score = Math.min(1, score);

    const allSymptoms = [...ssSymptoms, ...vmSyms, ...nsSyms, ...gcSyms];
    const allSignals = [...ssSignals, ...vmSyms.map(s => s.type), ...nsSyms.map(s => s.type), ...gcSyms.map(s => s.type)];
    const severity = scoreSeverity(score);

    // Determine likely cause category
    const cause = determineCause(ssSignals, vmSyms, nsSyms, gcPause);

    results.push({
      ...spike,
      score,
      severity,
      symptoms: allSymptoms,
      signals: allSignals,
      cause,
      endpointMatched,
      vmstat: vmSample,
      nstat: nsSample?.counters || null,
      gcPause: gcPause || null,
      snapshotsBefore: useBefore.length,
      snapshotsAfter: useAfter.length
    });
  }

  results.sort((a, b) => b.score - a.score || b.lagMs - a.lagMs);

  const correlatedCount = results.filter(r => r.score > 0).length;
  const maxScore = results.length ? results[0].score : 0;
  const overallSeverity = scoreSeverity(maxScore);

  return {
    results,
    summary: {
      totalRecords: records.length,
      totalSpikes: spikes.length,
      correlatedCount,
      maxScore,
      overallSeverity,
      endpointMatchRate: results.length ? results.filter(r => r.endpointMatched).length / results.length : 0,
      hasVmstat: !!vmstatSamples?.length,
      hasNstat: !!nstatSamples?.length,
      hasGc: !!gcPauses?.length,
      causeCounts: countCauses(results)
    }
  };
}

function determineCause(ssSignals, vmSyms, nsSyms, gcPause) {
  const hasNetwork = ssSignals.some(s => ["retrans", "rtt_high", "backoff", "cwnd_low"].includes(s));
  const hasKernel = nsSyms.some(s => ["nstat_backlog_drop", "nstat_rcvq_drop", "nstat_listen_drops", "nstat_prune"].includes(s.type));
  const hasCpu = vmSyms.some(s => ["runqueue_high", "cpu_saturated", "io_wait"].includes(s.type));
  const hasNstatRetrans = nsSyms.some(s => s.type === "nstat_retrans" || s.type === "nstat_timeouts");
  const hasGc = !!gcPause;

  if (hasGc) return "gc";
  if (hasNetwork || hasNstatRetrans) return "network";
  if (hasKernel) return "kernel";
  if (hasCpu) return "cpu";
  return "unknown";
}

function countCauses(results) {
  const counts = { network: 0, kernel: 0, cpu: 0, gc: 0, unknown: 0 };
  for (const r of results) counts[r.cause] = (counts[r.cause] || 0) + 1;
  return counts;
}
