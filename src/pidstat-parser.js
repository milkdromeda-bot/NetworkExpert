/**
 * pidstat / nstat parser — Correlate CPU scheduling with TCP symptoms.
 * Parses pidstat -druwt and nstat output into timestamped samples.
 */

const RE_PIDSTAT_HEADER = /^\d{2}:\d{2}:\d{2}/;
const RE_PIDSTAT_EPOCH = /^(\d+)\s/;
const RE_PIDSTAT_LINE = /^\s*(\d[\d:.]*)\s+(\d+)\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+(.+)/;
const RE_NSTAT_LINE = /^(\w+)\s+(\d+)\s/;

/**
 * Parse pidstat -druwt output.
 * Expected format: `pidstat -druwt -p <pid> 1`
 * @returns {{ samples: Array<{epochMs, pid, usr, sys, wait, cpu, vsz, rss, cswch, nvcswch, command}> }}
 */
export function parsePidstat(text) {
  const lines = text.split(/\r?\n/);
  const samples = [];
  let baseDate = null;

  for (const line of lines) {
    if (!line.trim() || line.startsWith("#") || line.includes("Average")) continue;

    // Try to detect date header like "Linux ... 2024-01-15"
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch && !RE_PIDSTAT_LINE.test(line)) {
      baseDate = dateMatch[1];
      continue;
    }

    // Parse data line: TIME PID TID %usr %system %guest %wait %CPU CPU Command
    const m = line.match(/^\s*([\d:]+)\s+(\d+)\s+(?:(\d+)\s+)?([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+(.+)/);
    if (m) {
      const timeStr = m[1];
      let epochMs = null;
      if (baseDate && timeStr.includes(":")) {
        epochMs = new Date(`${baseDate}T${timeStr}`).getTime();
      } else if (/^\d{10}/.test(timeStr)) {
        epochMs = Number(timeStr) * 1000;
      }
      samples.push({
        epochMs,
        time: timeStr,
        pid: Number(m[2]),
        tid: m[3] ? Number(m[3]) : null,
        usr: Number(m[4]),
        sys: Number(m[5]),
        guest: Number(m[6]),
        wait: Number(m[7]),
        cpu: Number(m[8]),
        coreId: Number(m[9]),
        command: m[10]?.trim() || ""
      });
    }
  }
  return { samples };
}

/**
 * Parse nstat output (nstat -az or nstat -az | egrep ...).
 * @returns {{ counters: Map<string, number> }}
 */
export function parseNstat(text) {
  const counters = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(RE_NSTAT_LINE);
    if (m) counters.set(m[1], Number(m[2]));
  }
  return { counters };
}

/**
 * Correlate pidstat CPU samples with GC pauses and TCP history.
 * Detects: CPU steal/wait spikes coinciding with GC pauses or TCP symptoms.
 */
export function correlateCpuWithStalls({ pidstatSamples, gcPauses = [], history = [], clockOffsetMs = 0 }) {
  const results = [];
  if (!pidstatSamples.length) return { results, summary: null };

  for (const pause of gcPauses) {
    const pauseEpoch = (pause.alignedEpochMs || pause.epochMs || 0) + clockOffsetMs;
    if (!pauseEpoch) continue;

    // Find pidstat samples within ±1s of the pause
    const nearby = pidstatSamples.filter(s => s.epochMs && Math.abs(s.epochMs - pauseEpoch) < 1000);
    if (!nearby.length) continue;

    const maxWait = Math.max(...nearby.map(s => s.wait));
    const maxSys = Math.max(...nearby.map(s => s.sys));
    const avgCpu = nearby.reduce((sum, s) => sum + s.cpu, 0) / nearby.length;
    const cswch = nearby.reduce((sum, s) => sum + (s.cswch || 0), 0);

    const signals = [];
    if (maxWait > 10) signals.push({ signal: "cpu_wait_spike", value: maxWait });
    if (maxSys > 30) signals.push({ signal: "high_sys_cpu", value: maxSys });
    if (avgCpu > 95) signals.push({ signal: "cpu_saturated", value: avgCpu });
    if (cswch > 5000) signals.push({ signal: "high_context_switches", value: cswch });

    if (signals.length) {
      results.push({
        pauseId: pause.id,
        pauseEpochMs: pauseEpoch,
        pauseDurationMs: pause.durationMs,
        pauseType: pause.type,
        cpuSignals: signals,
        maxWait,
        maxSys,
        avgCpu
      });
    }
  }

  const summary = results.length ? {
    correlatedCount: results.length,
    maxWaitObserved: Math.max(...results.map(r => r.maxWait)),
    cpuSaturationEvents: results.filter(r => r.avgCpu > 95).length,
    highContextSwitchEvents: results.filter(r => r.cpuSignals.some(s => s.signal === "high_context_switches")).length
  } : null;

  return { results, summary };
}

/**
 * Extract key nstat TCP counters relevant to diagnostics.
 */
export function extractTcpCounters(counters) {
  return {
    retransSegs: counters.get("TcpRetransSegs") || 0,
    timeouts: counters.get("TcpTimeoutRehash") || counters.get("TcpTimeouts") || 0,
    listenDrops: counters.get("ListenDrops") || counters.get("TCPBacklogDrop") || 0,
    listenOverflows: counters.get("ListenOverflows") || 0,
    tcpAbortOnMemory: counters.get("TCPAbortOnMemory") || 0,
    tcpAbortOnTimeout: counters.get("TCPAbortOnTimeout") || 0,
    tcpMemoryPressures: counters.get("TCPMemoryPressures") || counters.get("TCPMemoryPressuresChrono") || 0,
    softnetDrops: counters.get("SoftnetBacklogLen") || 0,
    rcvPruned: counters.get("RcvPruned") || counters.get("TCPRcvCollapsed") || 0
  };
}
