export function parseAddress(token = "") {
  const trimmed = token.trim();
  if (!trimmed) return { host: "", port: "" };
  if (trimmed.startsWith("[")) {
    const idx = trimmed.lastIndexOf("]:");
    return idx > -1 ? { host: trimmed.slice(1, idx), port: trimmed.slice(idx + 2) } : { host: trimmed, port: "" };
  }
  const idx = trimmed.lastIndexOf(":");
  return idx > -1 ? { host: trimmed.slice(0, idx), port: trimmed.slice(idx + 1) } : { host: trimmed, port: "" };
}

export function parseDuration(value = "") {
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) return null;
  if (/(usec|us)$/i.test(value)) return num / 1000;
  if (/(msec|ms)$/i.test(value)) return num;
  if (/(sec|s)$/i.test(value)) return num * 1000;
  if (/min$/i.test(value)) return num * 60000;
  if (/hour$/i.test(value)) return num * 3600000;
  return num;
}

export function stripAnsi(value = "") {
  return String(value).replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

export function parseNumber(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  const duration = raw.match(/^(-?\d+(?:\.\d+)?)(us|usec|ms|msec|sec|s|min|hour)$/i);
  if (duration) return parseDuration(raw);
  const rate = raw.match(/^(-?\d+(?:\.\d+)?)([kmg])?(?:bits\/sec|bps)$/i);
  if (rate) {
    const multiplier = { k: 1e3, m: 1e6, g: 1e9 }[rate[2]?.toLowerCase()] || 1;
    return Number(rate[1]) * multiplier;
  }
  const cleaned = raw.replace(/bps$/i, "").replace(/[^\d.-]/g, "");
  if (!cleaned || !/\d/.test(cleaned)) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function parseDetails(text) {
  const details = { flags: [], values: {}, skmem: {}, timer: null, process: null, raw: text };
  const skmem = text.match(/skmem:\(([^)]*)\)/);
  if (skmem) {
    for (const part of skmem[1].split(",")) {
      const match = part.match(/^([a-z]+)(-?\d+)/i);
      if (match) details.skmem[match[1]] = Number(match[2]);
    }
    details.values.skmem = details.skmem;
  }
  const timer = text.match(/timer:\(([^)]*)\)/);
  if (timer) {
    const [name, expire, retrans] = timer[1].split(",");
    details.timer = { name, expire, expireMs: parseDuration(expire), retrans: parseNumber(retrans) || 0 };
    details.values.timer = details.timer;
  }
  const users = text.match(/users:\(\("([^"]+)",pid=(\d+),fd=(\d+)/);
  if (users) details.process = { name: users[1], pid: Number(users[2]), fd: Number(users[3]) };

  const wscale = text.match(/wscale:(\d+):(\d+)/);
  if (wscale) details.values.wscale = { send: Number(wscale[1]), receive: Number(wscale[2]) };
  const rtt = text.match(/rtt:([\d.]+)\/([\d.]+)/);
  if (rtt) details.values.rtt = { avg: Number(rtt[1]), var: Number(rtt[2]) };
  const pacing = text.match(/pacing_rate\s+([^\s/]+)(?:\/([^\s]+))?/);
  if (pacing) details.values.pacing_rate = { current: parseNumber(pacing[1]), max: parseNumber(pacing[2]) };
  const delivery = text.match(/\bdelivery_rate\s+([^\s]+)/);
  if (delivery) details.values.delivery_rate = parseNumber(delivery[1]);
  const send = text.match(/\bsend\s+([^\s]+)/);
  if (send) details.values.send = parseNumber(send[1]);
  const limited = text.match(/\brwnd_limited:([^\s(]+)(?:\(([\d.]+)%\))?/);
  if (limited) details.values.rwnd_limited = { ms: parseNumber(limited[1]) || 0, percent: limited[2] == null ? null : Number(limited[2]) };
  const sndbufLimited = text.match(/\bsndbuf_limited:([^\s(]+)(?:\(([\d.]+)%\))?/);
  if (sndbufLimited) details.values.sndbuf_limited = { ms: parseNumber(sndbufLimited[1]) || 0, percent: sndbufLimited[2] == null ? null : Number(sndbufLimited[2]) };

  for (const match of text.matchAll(/\b([a-z_]+):([^\s,)]+)/g)) {
    const key = match[1];
    if (["skmem", "timer", "users", "wscale", "rtt", "rwnd_limited", "sndbuf_limited"].includes(key)) continue;
    details.values[key] = parseNumber(match[2]) ?? match[2];
  }
  for (const flag of ["ts", "sack", "ecn", "ecnseen", "fastopen", "cubic", "bbr", "reno"]) {
    if (new RegExp(`\\b${flag}\\b`).test(text)) details.flags.push(flag);
  }
  return details;
}

export function parseSs(raw) {
  const lines = raw.split(/\r?\n/).map(line => stripAnsi(line).trim()).filter(Boolean);
  const sockets = [];
  let current = null;

  for (const line of lines) {
    if (/^(State|Netid)\b/i.test(line) || parseTimestampLine(line) != null || /^Socket\s+/.test(line) || /^Command to be executed:/i.test(line) || /^Enter the captcha/i.test(line)) continue;
    const parts = line.split(/\s+/);
    const hasStateHead = parts.length >= 5 && /^[A-Z-]+|UNCONN|ESTAB|LISTEN|TIME-WAIT|CLOSE-WAIT/i.test(parts[0]) && /^-?\d+$/.test(parts[1]);
    const hasNetidHead = parts.length >= 6 && /^[a-z_][\w-]*$/i.test(parts[0]) && /^[A-Z-]+|UNCONN|ESTAB|LISTEN|TIME-WAIT|CLOSE-WAIT/i.test(parts[1]) && /^-?\d+$/.test(parts[2]);
    if (hasStateHead || hasNetidHead) {
      const offset = hasNetidHead ? 1 : 0;
      const netid = hasNetidHead ? parts[0] : "";
      const stateName = parts[offset];
      const recvQ = parts[offset + 1];
      const sendQ = parts[offset + 2];
      const local = parts[offset + 3];
      const peer = parts[offset + 4];
      const rest = parts.slice(offset + 5);
      const localAddress = parseAddress(local);
      const peerAddress = parseAddress(peer);
      current = {
        id: `${sockets.length + 1}-${local}-${peer}-${stateName}`,
        state: stateName.toUpperCase(),
        recvQ: Number(recvQ),
        sendQ: Number(sendQ),
        local,
        peer,
        localAddress,
        peerAddress,
        family: netid || inferFamily(local, peer, rest.join(" ")),
        details: parseDetails(rest.join(" ")),
        raw: line
      };
      sockets.push(current);
    } else if (current) {
      current.raw += ` ${line}`;
      current.details = parseDetails(`${current.details.raw} ${line}`);
    }
  }
  return sockets;
}

export function inferFamily(local, peer, text) {
  if (/\btcp-ulp-mptcp\b|\bmptcp\b/i.test(text)) return "mptcp";
  if (local.includes("/") || peer.includes("/")) return "unix";
  if (local.includes("[") || peer.includes("[")) return "tcp6";
  if (/udp/i.test(text) || /UNCONN/.test(text)) return "udp";
  return "tcp";
}

export function parseTimestampLine(line) {
  if (!line) return null;
  const cleaned = stripAnsi(line).trim();
  const embedded = cleaned.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[,.]\d+)?(?:Z|[+-]\d{2}:?\d{2})?/);
  const candidate = embedded ? embedded[0] : cleaned;
  const normalized = candidate
    .replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/, "$1T$2")
    .replace(",", ".")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const iso = Date.parse(normalized);
  if (Number.isFinite(iso)) return iso;
  const prefixed = cleaned.match(/^(?:TS|timestamp|date)\s*[:=]\s*(.+)$/i);
  if (prefixed) {
    const parsed = Date.parse(prefixed[1].replace(",", ".").replace(/(\.\d{3})\d+/, "$1"));
    if (Number.isFinite(parsed)) return parsed;
  }
  const epoch = cleaned.match(/^(?:EPOCH_MS|epoch_ms)\s*[:=]\s*(\d+)$/i);
  if (epoch) return Number(epoch[1]);
  return null;
}

export function metricValue(socket, metric) {
  if (!socket) return 0;
  const v = socket.details.values;
  if (metric === "rtt") return v.rtt?.avg || 0;
  if (metric === "rttvar") return v.rtt?.var || 0;
  if (metric === "pacing_rate") return v.pacing_rate?.current || v.send || 0;
  if (metric === "delivery_rate") return v.delivery_rate || 0;
  if (metric === "rwnd_limited") return v.rwnd_limited?.ms || 0;
  if (metric === "rwnd_limited_pct") return v.rwnd_limited?.percent || 0;
  if (metric === "sndbuf_limited") return v.sndbuf_limited?.ms || 0;
  if (metric === "sndbuf_limited_pct") return v.sndbuf_limited?.percent || 0;
  if (metric === "sendQ") return socket.sendQ || 0;
  if (metric === "recvQ") return socket.recvQ || 0;
  if (metric.startsWith("skmem.")) return socket.details.skmem[metric.split(".")[1]] || 0;
  return Number(v[metric] || 0);
}
