function tokenizeCommand(command) {
  const segment = extractSsSegment(command);
  if (!segment) return [];
  return tokenizeSsSegment(segment).map(token => token.clean);
}

function tokenizeSsSegment(command) {
  const tokens = String(command || "").match(/(?:[^\s'"']+|'[^']*'|"[^"]*")+/g) || [];
  const parsed = [];
  for (const token of tokens.slice(tokens[0] === "ss" ? 1 : 0)) {
    const clean = token.replace(/^["']|["']$/g, "");
    if (/^-[A-Za-z0-9]{2,}$/.test(clean) && !clean.startsWith("--")) {
      for (const flag of clean.slice(1)) parsed.push({ clean: `-${flag}`, raw: `-${flag}` });
    } else {
      parsed.push({ clean, raw: token });
    }
  }
  return parsed;
}

function ssWordStart(command) {
  const match = String(command || "").match(/(^|[\s;])ss(?=\s|$)/);
  if (!match) return -1;
  return match.index + match[1].length;
}

export function extractSsSegment(command) {
  const text = String(command || "").trim();
  const start = ssWordStart(text);
  if (start < 0) return text.startsWith("ss") ? text : "";
  const after = text.slice(start);
  const end = after.indexOf(";");
  return (end >= 0 ? after.slice(0, end) : after).trim();
}

function replaceSsSegment(command, nextSegment) {
  const text = String(command || "").trim();
  const start = ssWordStart(text);
  if (start < 0) return nextSegment;
  const after = text.slice(start);
  const end = after.indexOf(";");
  const absoluteEnd = end >= 0 ? start + end : text.length;
  return `${text.slice(0, start)}${nextSegment}${text.slice(absoluteEnd)}`.replace(/\s+/g, " ").trim();
}

function shellSingleQuote(value) {
  return `'${String(value || "").replace(/'/g, `'\\''`)}'`;
}

function cleanPort(value) {
  return String(value || "").trim().replace(/^:/, "");
}

function baseSsSegment(command) {
  return (extractSsSegment(command) || "ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all")
    .replace(/\s+['"]?\([^)]*\)['"]?\s*$/g, "")
    .trim();
}

function socketFilterExpression(config = {}) {
  const parts = [];
  if (config.srcIp) parts.push(`src ${config.srcIp.trim()}`);
  if (cleanPort(config.srcPort)) parts.push(`sport = :${cleanPort(config.srcPort)}`);
  if (config.dstIp) parts.push(`dst ${config.dstIp.trim()}`);
  if (cleanPort(config.dstPort)) parts.push(`dport = :${cleanPort(config.dstPort)}`);
  return parts.length ? `( ${parts.join(" and ")} )` : "";
}

export function buildSsCollectionCommand(baseCommand, config = {}) {
  const filter = socketFilterExpression(config);
  const ss = `${baseSsSegment(baseCommand)}${filter ? ` ${shellSingleQuote(filter)}` : ""}`.trim();
  const timestamp = config.timestamp !== false;
  const loop = Boolean(config.loop);
  const interval = Math.max(0.001, Number(config.intervalSeconds || 1));
  const outputPath = String(config.outputPath || "").trim();
  let command = loop
    ? `while true; do ${timestamp ? "date --iso-8601=ns; " : ""}${ss}; sleep ${interval}; done`
    : `${timestamp ? "date --iso-8601=ns; " : ""}${ss}`;
  if (outputPath) command = `${command} | tee ${config.appendOutput === false ? "" : "-a "}${shellSingleQuote(outputPath)}`;
  return command.replace(/\s+/g, " ").trim();
}

export function commandCoverage(command, options = []) {
  const active = new Set(tokenizeCommand(command));
  return options.map(([short = "", long = "", desc = "", group = ""]) => ({
    short,
    long,
    desc,
    group,
    active: Boolean((short && active.has(short)) || (long && active.has(long)) || active.has(short || long))
  }));
}

export function toggleCommandOption(command, opt, enabled) {
  const current = extractSsSegment(command) || "ss";
  const tokens = tokenizeSsSegment(current);
  const hasOpt = tokens.some(token => token.clean === opt);
  let next = enabled || !hasOpt
    ? [...tokens, ...(enabled && !hasOpt ? [{ clean: opt, raw: opt }] : [])]
    : tokens.filter(token => token.clean !== opt);
  const filterIndex = next.findIndex(token => /^['"]?\(/.test(token.raw));
  if (enabled && !hasOpt && filterIndex >= 0) {
    const added = next.pop();
    next.splice(filterIndex, 0, added);
  }
  const segment = `ss ${next.map(token => token.raw).join(" ")}`.replace(/\s+/g, " ").trim();
  return replaceSsSegment(command, segment);
}
