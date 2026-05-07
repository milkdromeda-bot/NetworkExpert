function tokenizeCommand(command) {
  const tokens = String(command || "").match(/(?:[^\s'"']+|'[^']*'|"[^"]*")+/g) || [];
  const parsed = [];
  for (const token of tokens.slice(tokens[0] === "ss" ? 1 : 0)) {
    const clean = token.replace(/^["']|["']$/g, "");
    if (/^-[A-Za-z0-9]{2,}$/.test(clean) && !clean.startsWith("--")) {
      for (const flag of clean.slice(1)) parsed.push(`-${flag}`);
    } else {
      parsed.push(clean);
    }
  }
  return parsed;
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
  const tokens = tokenizeCommand(command);
  const set = new Set(tokens);
  if (enabled) set.add(opt);
  else set.delete(opt);
  return `ss ${Array.from(set).join(" ")}`.replace(/\s+/g, " ").trim();
}
