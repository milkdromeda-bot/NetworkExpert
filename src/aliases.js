export function endpointAliasKey(endpoint) {
  const value = String(endpoint || "").trim().replace(/\s+/g, "");
  return value ? `endpoint:${value.toLowerCase()}` : "";
}

export function normalizeAliasStore(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const entries = {};
  for (const [key, raw] of Object.entries(input)) {
    if (!key.startsWith("endpoint:") || !raw || typeof raw !== "object") continue;
    const endpoint = String(raw.endpoint || key.slice("endpoint:".length)).trim();
    const normalizedKey = endpointAliasKey(endpoint);
    if (!normalizedKey) continue;
    const label = String(raw.label || "").trim();
    const role = String(raw.role || "").trim();
    const note = String(raw.note || "").trim();
    if (!label && !role && !note) continue;
    entries[normalizedKey] = {
      endpoint,
      label,
      role,
      note,
      updatedAt: Number(raw.updatedAt || 0)
    };
  }
  return entries;
}

export function aliasForEndpoint(store, endpoint) {
  const alias = normalizeAliasStore(store)[endpointAliasKey(endpoint)];
  return alias || null;
}

export function upsertEndpointAlias(store, endpoint, fields, now = Date.now()) {
  const entries = normalizeAliasStore(store);
  const key = endpointAliasKey(endpoint);
  if (!key) return entries;
  const next = {
    endpoint: String(endpoint || "").trim(),
    label: String(fields?.label || "").trim(),
    role: String(fields?.role || "").trim(),
    note: String(fields?.note || "").trim(),
    updatedAt: now
  };
  if (!next.label && !next.role && !next.note) {
    delete entries[key];
    return entries;
  }
  entries[key] = next;
  return entries;
}

export function deleteEndpointAlias(store, endpoint) {
  const entries = normalizeAliasStore(store);
  delete entries[endpointAliasKey(endpoint)];
  return entries;
}

export function aliasDisplay(endpoint, store) {
  const alias = aliasForEndpoint(store, endpoint);
  if (!alias?.label) return String(endpoint || "");
  return alias.label;
}
