/**
 * sar (sysstat) output parser.
 * Handles sar -u (CPU), sar -r (memory), sar -b (I/O), sar -n DEV (network).
 * Detects section type from headers and parses timestamped rows.
 */

const TIME_RE = /^(\d{2}:\d{2}:\d{2})\s+(AM|PM)?\s*/;
const HEADER_CPU = /^\d{2}:\d{2}:\d{2}\s+(?:AM|PM\s+)?(?:CPU|all)\s+%usr/i;
const HEADER_MEM = /^\d{2}:\d{2}:\d{2}\s+(?:AM|PM\s+)?kbmemfree/i;
const HEADER_IO = /^\d{2}:\d{2}:\d{2}\s+(?:AM|PM\s+)?tps/i;
const HEADER_NET = /^\d{2}:\d{2}:\d{2}\s+(?:AM|PM\s+)?IFACE/i;

/**
 * Parse sar output (any combination of -u, -r, -b, -n DEV).
 * @param {string} text
 * @param {string} [dateHint] - ISO date (YYYY-MM-DD) to anchor times. Defaults to today.
 * @returns {{ cpu: SarCpuSample[], memory: SarMemSample[], io: SarIoSample[], network: SarNetSample[] }}
 */
export function parseSar(text, dateHint) {
  const date = dateHint || new Date().toISOString().slice(0, 10);
  const cpu = [], memory = [], io = [], network = [];
  let section = null;

  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("Linux") || t.startsWith("Average")) continue;

    // Detect section from header lines
    if (HEADER_CPU.test(t)) { section = "cpu"; continue; }
    if (HEADER_MEM.test(t)) { section = "memory"; continue; }
    if (HEADER_IO.test(t)) { section = "io"; continue; }
    if (HEADER_NET.test(t)) { section = "network"; continue; }
    // Blank line resets section
    if (!t) { section = null; continue; }

    const tm = t.match(TIME_RE);
    if (!tm) continue;
    const epochMs = parseTime(tm[1], tm[2], date);
    if (!epochMs) continue;

    const rest = t.slice(tm[0].length).trim();
    const parts = rest.split(/\s+/);

    if (section === "cpu" && parts.length >= 6) {
      // all %usr %nice %sys %iowait %steal %idle
      const offset = parts[0] === "all" || /^\d+$/.test(parts[0]) ? 1 : 0;
      cpu.push({ epochMs, usr: +parts[offset], nice: +parts[offset+1], sys: +parts[offset+2], iowait: +parts[offset+3], steal: +parts[offset+4], idle: +parts[offset+5] });
    } else if (section === "memory" && parts.length >= 5) {
      memory.push({ epochMs, kbmemfree: +parts[0], kbmemused: +parts[1], memused_pct: +parts[2], kbbuffers: +parts[3], kbcached: +parts[4] });
    } else if (section === "io" && parts.length >= 5) {
      io.push({ epochMs, tps: +parts[0], rtps: +parts[1], wtps: +parts[2], bread: +parts[3], bwrtn: +parts[4] });
    } else if (section === "network" && parts.length >= 6) {
      network.push({ epochMs, iface: parts[0], rxpck: +parts[1], txpck: +parts[2], rxkB: +parts[3], txkB: +parts[4], rxcmp: +parts[5] || 0 });
    }
  }
  return { cpu, memory, io, network };
}

/**
 * Correlate sar CPU/IO samples with TCP stall events.
 * @param {{ cpu: SarCpuSample[], io: SarIoSample[] }} sar
 * @param {Array<{epochMs: number}>} tcpEvents - TCP anomaly timestamps
 * @param {{ windowMs?: number }} [options]
 * @returns {{ correlations: Array<{ eventMs: number, cpu: SarCpuSample|null, io: SarIoSample|null }> }}
 */
export function correlateSarWithTcp(sar, tcpEvents, { windowMs = 2000 } = {}) {
  const correlations = [];
  for (const event of tcpEvents) {
    const cpu = closest(sar.cpu, event.epochMs, windowMs);
    const io = closest(sar.io, event.epochMs, windowMs);
    if (cpu || io) correlations.push({ eventMs: event.epochMs, cpu, io });
  }
  return { correlations };
}

function closest(samples, targetMs, windowMs) {
  let best = null, bestDist = Infinity;
  for (const s of samples) {
    const d = Math.abs(s.epochMs - targetMs);
    if (d < bestDist && d <= windowMs) { best = s; bestDist = d; }
  }
  return best;
}

function parseTime(hms, ampm, date) {
  let [h, m, s] = hms.split(":").map(Number);
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  const ts = new Date(`${date}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}Z`).getTime();
  return Number.isFinite(ts) ? ts : null;
}
