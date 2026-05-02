const DEFAULT_COLORS = ["cyan", "blue", "green", "orange", "pink", "violet"];

export function topologyScopeKey(sourceName) {
  return String(sourceName || "workspace").trim().toLowerCase() || "workspace";
}

export function endpointHost(endpoint) {
  const value = String(endpoint || "").trim();
  const bracket = value.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracket) return bracket[1];
  const ipv4Port = value.match(/^(.+):(\d+)$/);
  if (ipv4Port && !ipv4Port[1].includes(":")) return ipv4Port[1];
  return value;
}

export function normalizeTopologyProfile(profile) {
  const input = profile && typeof profile === "object" ? profile : {};
  const groups = Array.isArray(input.groups) ? input.groups : [];
  return {
    groups: groups.map((group, index) => ({
      id: String(group.id || `group-${index + 1}`),
      name: String(group.name || "").trim(),
      match: String(group.match || "").trim(),
      color: DEFAULT_COLORS.includes(group.color) ? group.color : DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      note: String(group.note || "").trim(),
      updatedAt: Number(group.updatedAt || 0)
    })).filter(group => group.name && group.match)
  };
}

export function endpointMatchesPattern(endpoint, pattern) {
  const value = String(endpoint || "").trim();
  const host = endpointHost(value);
  const raw = String(pattern || "").trim();
  if (!value || !raw) return false;
  if (raw.includes("*")) {
    const escaped = raw.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    const hostPattern = raw.replace(/:\*$/, "");
    return new RegExp(`^${escaped}$`, "i").test(value)
      || new RegExp(`^${escaped}$`, "i").test(host)
      || host.toLowerCase() === hostPattern.toLowerCase();
  }
  return value.toLowerCase() === raw.toLowerCase() || host.toLowerCase() === raw.toLowerCase();
}

export function topologyGroupForEndpoint(profile, endpoint) {
  const normalized = normalizeTopologyProfile(profile);
  for (const group of normalized.groups) {
    const patterns = group.match.split(",").map(item => item.trim()).filter(Boolean);
    if (patterns.some(pattern => endpointMatchesPattern(endpoint, pattern))) return group;
  }
  return null;
}

export function upsertTopologyGroup(profile, fields, now = Date.now()) {
  const normalized = normalizeTopologyProfile(profile);
  const id = String(fields?.id || `topology-${now}`).trim();
  const next = {
    id,
    name: String(fields?.name || "").trim(),
    match: String(fields?.match || "").trim(),
    color: DEFAULT_COLORS.includes(fields?.color) ? fields.color : DEFAULT_COLORS[normalized.groups.length % DEFAULT_COLORS.length],
    note: String(fields?.note || "").trim(),
    updatedAt: now
  };
  if (!next.name || !next.match) return normalized;
  return {
    groups: [next, ...normalized.groups.filter(group => group.id !== id)]
  };
}

export function deleteTopologyGroup(profile, id) {
  const normalized = normalizeTopologyProfile(profile);
  return {
    groups: normalized.groups.filter(group => group.id !== id)
  };
}
