/**
 * FIX Log Parser
 * Parses FIX connector logs to extract latency between server timestamp and tag 52 (SendingTime).
 * Format: YYMMDD-HH:MM:SS.mmm TRACE ... [thread][message](FIXTcpConnection [/IP:PORT]) IN|OUT 8=FIX.4.x|...|52=...|...
 */

const LOG_TIME_RE = /^(\d{6}-\d{2}:\d{2}:\d{2}\.\d{3})/;
const TAG52_RE = /(?:\||\x01)52=(\d{8}-\d{2}:\d{2}:\d{2}\.\d{3,6})/;
const CONNECTION_RE = /FIXTcpConnection\s+\[\/([^\]]+)\]/;
const DIRECTION_RE = /\)\s+(IN|OUT)\s+8=/;
const THREAD_RE = /\[([^\]]+)\]\[message\]/;

export function parseLogTime(raw) {
  const m = raw.match(LOG_TIME_RE);
  if (!m) return null;
  const v = m[1];
  return Date.UTC(
    2000 + Number(v.slice(0, 2)), Number(v.slice(2, 4)) - 1, Number(v.slice(4, 6)),
    Number(v.slice(7, 9)), Number(v.slice(10, 12)), Number(v.slice(13, 15)), Number(v.slice(16, 19))
  );
}

export function parseSendingTime(raw) {
  const m = raw.match(TAG52_RE);
  if (!m) return null;
  const v = m[1].slice(0, 21); // normalize to ms precision
  return Date.UTC(
    Number(v.slice(0, 4)), Number(v.slice(4, 6)) - 1, Number(v.slice(6, 8)),
    Number(v.slice(9, 11)), Number(v.slice(12, 14)), Number(v.slice(15, 17)), Number(v.slice(18, 21))
  );
}

export function extractTag(raw, tag) {
  const m = raw.match(new RegExp(`(?:\\||\\x01)${tag}=([^|\\x01]+)`));
  return m ? m[1] : "";
}

export function parseFixLine(line, fileName, lineNumber) {
  const receiveMs = parseLogTime(line);
  const sendingMs = parseSendingTime(line);
  if (!Number.isFinite(receiveMs) || !Number.isFinite(sendingMs)) return null;
  const lagMs = receiveMs - sendingMs;
  if (lagMs < -1000 || lagMs > 3600000) return null;

  const connMatch = line.match(CONNECTION_RE);
  const dirMatch = line.match(DIRECTION_RE);
  const threadMatch = line.match(THREAD_RE);

  return {
    fileName,
    lineNumber,
    receiveMs,
    sendingMs,
    lagMs,
    endpoint: connMatch ? connMatch[1] : "",
    direction: dirMatch ? dirMatch[1] : "",
    thread: threadMatch ? threadMatch[1] : "",
    msgType: extractTag(line, 35) || "",
    symbol: extractTag(line, 55) || "",
    sender: extractTag(line, 49) || "",
    target: extractTag(line, 56) || ""
  };
}

/**
 * Parse a full FIX log text into records.
 * @param {string} text - Raw log content
 * @param {string} fileName - Source file name
 * @returns {{ records: Array, stats: { parsed: number, rejected: number } }}
 */
export function parseFixLog(text, fileName = "fix.log") {
  const records = [];
  let rejected = 0;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 40) continue;
    const record = parseFixLine(line, fileName, i + 1);
    if (record) {
      records.push(record);
    } else if (line.includes("52=")) {
      rejected++;
    }
  }
  records.sort((a, b) => a.receiveMs - b.receiveMs);
  return { records, stats: { parsed: records.length, rejected } };
}

/**
 * Extract unique endpoints (IP:port) from parsed records.
 */
export function extractEndpoints(records) {
  return [...new Set(records.map(r => r.endpoint).filter(Boolean))];
}

/**
 * Compute summary statistics for a set of records.
 */
export function computeFixStats(records) {
  if (!records.length) return { count: 0, median: 0, p95: 0, p99: 0, max: 0 };
  const lags = records.map(r => r.lagMs).sort((a, b) => a - b);
  const pct = (q) => lags[Math.min(lags.length - 1, Math.floor(q * lags.length))];
  return { count: lags.length, median: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: lags[lags.length - 1] };
}
