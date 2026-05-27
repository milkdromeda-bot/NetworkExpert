export function aliasScopeKey(sourceName) {
  return String(sourceName || "workspace").trim().toLowerCase() || "workspace";
}

export function endpointAliasKey(endpoint) {
  const value = String(endpoint || "").trim().replace(/\s+/g, "");
  return value ? `endpoint:${value.toLowerCase()}` : "";
}

function aliasEntryFromRaw(key, raw) {
  if (!key.startsWith("endpoint:") || !raw || typeof raw !== "object") return null;
  const endpoint = String(raw.endpoint || key.slice("endpoint:".length)).trim();
  const normalizedKey = endpointAliasKey(endpoint);
  if (!normalizedKey) return null;
  const label = String(raw.label || "").trim();
  const role = String(raw.role || "").trim();
  const note = String(raw.note || "").trim();
  if (!label && !role && !note) return null;
  return [normalizedKey, {
    endpoint,
    label,
    role,
    note,
    updatedAt: Number(raw.updatedAt || 0)
  }];
}

function normalizeAliasEntries(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const entries = {};
  for (const [key, raw] of Object.entries(input)) {
    const entry = aliasEntryFromRaw(key, raw);
    if (entry) entries[entry[0]] = entry[1];
  }
  return entries;
}

export function normalizeAliasStore(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const scopes = {};
  const rawScopes = input.scopes && typeof input.scopes === "object" && !Array.isArray(input.scopes) ? input.scopes : {};
  for (const [scope, entries] of Object.entries(rawScopes)) {
    const normalizedScope = aliasScopeKey(scope);
    const normalizedEntries = normalizeAliasEntries(entries);
    if (Object.keys(normalizedEntries).length) scopes[normalizedScope] = normalizedEntries;
  }
  return {
    global: normalizeAliasEntries(input.global),
    scopes
  };
}

function aliasBucket(store, sourceName, scope = "source") {
  const normalized = normalizeAliasStore(store);
  if (scope === "global") return normalized.global;
  return normalized.scopes[aliasScopeKey(sourceName)] || {};
}

export function aliasForEndpoint(store, endpoint, sourceName = "", options = {}) {
  const key = endpointAliasKey(endpoint);
  if (!key) return null;
  const scope = options.scope || "auto";
  const normalized = normalizeAliasStore(store);
  if (scope === "global") return normalized.global[key] || null;
  const local = normalized.scopes[aliasScopeKey(sourceName)]?.[key] || null;
  if (scope === "source") return local;
  return local || normalized.global[key] || null;
}

export function upsertEndpointAlias(store, endpoint, fields, now = Date.now(), options = {}) {
  const normalized = normalizeAliasStore(store);
  const key = endpointAliasKey(endpoint);
  if (!key) return normalized;
  const scope = options.scope === "global" || fields?.scope === "global" ? "global" : "source";
  const sourceName = options.sourceName || fields?.sourceName || "";
  const next = {
    endpoint: String(endpoint || "").trim(),
    label: String(fields?.label || "").trim(),
    role: String(fields?.role || "").trim(),
    note: String(fields?.note || "").trim(),
    updatedAt: now
  };
  const target = scope === "global"
    ? normalized.global
    : { ...(normalized.scopes[aliasScopeKey(sourceName)] || {}) };
  if (!next.label && !next.role && !next.note) {
    delete target[key];
  } else {
    target[key] = next;
  }
  if (scope === "global") {
    normalized.global = target;
  } else if (Object.keys(target).length) {
    normalized.scopes = { ...normalized.scopes, [aliasScopeKey(sourceName)]: target };
  } else {
    const scopes = { ...normalized.scopes };
    delete scopes[aliasScopeKey(sourceName)];
    normalized.scopes = scopes;
  }
  return normalized;
}

export function deleteEndpointAlias(store, endpoint, sourceName = "", options = {}) {
  return upsertEndpointAlias(store, endpoint, { label: "", role: "", note: "" }, Date.now(), {
    sourceName,
    scope: options.scope === "global" ? "global" : "source"
  });
}

export function aliasDisplay(endpoint, store, sourceName = "", options = {}) {
  const alias = aliasForEndpoint(store, endpoint, sourceName, options);
  if (!alias?.label) return String(endpoint || "");
  return alias.label;
}

export function aliasListForSource(store, sourceName = "", { includeGlobal = true } = {}) {
  const normalized = normalizeAliasStore(store);
  const sourceScope = aliasScopeKey(sourceName);
  const local = Object.values(normalized.scopes[sourceScope] || {}).map(alias => ({
    ...alias,
    scope: "source",
    scopeLabel: sourceName || "workspace"
  }));
  const global = includeGlobal ? Object.values(normalized.global).map(alias => ({
    ...alias,
    scope: "global",
    scopeLabel: "global"
  })) : [];
  return [...local, ...global];
}

export function aliasCountForSource(store, sourceName = "", { includeGlobal = true } = {}) {
  const seen = new Set();
  for (const alias of aliasListForSource(store, sourceName, { includeGlobal })) {
    seen.add(endpointAliasKey(alias.endpoint));
  }
  return seen.size;
}

export function aliasMapForSource(store, sourceName = "", { includeGlobal = true } = {}) {
  const entries = {};
  if (includeGlobal) Object.assign(entries, aliasBucket(store, sourceName, "global"));
  Object.assign(entries, aliasBucket(store, sourceName, "source"));
  return entries;
}
