const DEFAULT_SCOPE = "workspace";

export function serviceOverrideScopeKey(sourceName) {
  return String(sourceName || DEFAULT_SCOPE).trim().toLowerCase() || DEFAULT_SCOPE;
}

function normalizeTransport(value = "") {
  const raw = String(value || "tcp").toLowerCase();
  if (raw.includes("udp")) return "udp";
  return "tcp";
}

function endpointKey(endpoint) {
  const value = String(endpoint || "").trim().replace(/\s+/g, "");
  return value ? `endpoint:${value.toLowerCase()}` : "";
}

function portKey(port, transport = "tcp") {
  const num = Number(port);
  if (!Number.isInteger(num) || num <= 0 || num > 65535) return "";
  return `port:${normalizeTransport(transport)}:${num}`;
}

export function serviceOverrideKey(rule = {}) {
  return rule.target === "endpoint" ? endpointKey(rule.endpoint) : portKey(rule.port, rule.transport);
}

function cleanRule(raw = {}) {
  const target = raw.target === "endpoint" ? "endpoint" : "port";
  const transport = normalizeTransport(raw.transport);
  const port = Number(raw.port || 0);
  const endpoint = String(raw.endpoint || "").trim();
  const key = target === "endpoint" ? endpointKey(endpoint) : portKey(port, transport);
  if (!key) return null;
  const label = String(raw.label || "").trim();
  const note = String(raw.note || "").trim();
  const hidden = Boolean(raw.hidden);
  if (!hidden && !label && !note) return null;
  return [key, {
    target,
    endpoint,
    port: Number.isInteger(port) ? port : 0,
    transport,
    label,
    note,
    hidden,
    updatedAt: Number(raw.updatedAt || 0)
  }];
}

function normalizeRules(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const rules = {};
  for (const [key, raw] of Object.entries(input)) {
    const entry = cleanRule({ ...raw, endpoint: raw?.endpoint || key.slice("endpoint:".length) });
    if (entry) rules[entry[0]] = entry[1];
  }
  return rules;
}

export function normalizeServiceOverrideStore(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const scopes = {};
  const rawScopes = input.scopes && typeof input.scopes === "object" && !Array.isArray(input.scopes) ? input.scopes : {};
  for (const [scope, rules] of Object.entries(rawScopes)) {
    const normalized = normalizeRules(rules);
    if (Object.keys(normalized).length) scopes[serviceOverrideScopeKey(scope)] = normalized;
  }
  return {
    global: normalizeRules(input.global),
    scopes
  };
}

function socketEndpointForSide(socket = {}, side = "") {
  return side === "local" ? socket.local : socket.peer;
}

function socketPortForSide(socket = {}, side = "") {
  return Number(side === "local" ? socket.localAddress?.port : socket.peerAddress?.port);
}

function candidateKeys(socket = {}, inferred = null) {
  const transport = normalizeTransport(socket.family);
  const sides = inferred?.side ? [inferred.side] : ["peer", "local"];
  const keys = [];
  for (const side of sides) {
    const endpoint = socketEndpointForSide(socket, side);
    const port = inferred?.side === side ? inferred.port : socketPortForSide(socket, side);
    const endpointCandidate = endpointKey(endpoint);
    const portCandidate = portKey(port, transport);
    if (endpointCandidate) keys.push(endpointCandidate);
    if (portCandidate) keys.push(portCandidate);
  }
  return [...new Set(keys)];
}

export function serviceOverrideForSocket(store, socket = {}, sourceName = "", inferred = null) {
  const normalized = normalizeServiceOverrideStore(store);
  const keys = candidateKeys(socket, inferred);
  const local = normalized.scopes[serviceOverrideScopeKey(sourceName)] || {};
  for (const key of keys) {
    if (local[key]) return { ...local[key], scope: "source", key };
  }
  for (const key of keys) {
    if (normalized.global[key]) return { ...normalized.global[key], scope: "global", key };
  }
  return null;
}

export function applyServiceOverride(socket = {}, store, sourceName = "", inferred = null) {
  const override = serviceOverrideForSocket(store, socket, sourceName, inferred);
  if (!override) return inferred;
  if (override.hidden) {
    return {
      id: "suppressed",
      label: "Unknown",
      description: "Port-based service inference was hidden by an analyst override.",
      port: override.port || inferred?.port || 0,
      side: inferred?.side || "",
      layer: "application",
      confidence: "analyst",
      transport: override.transport || inferred?.transport || normalizeTransport(socket.family),
      source: "suppressed",
      override
    };
  }
  return {
    id: `override-${override.label.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "service"}`,
    label: override.label,
    description: override.note || "Analyst service classification override.",
    port: override.port || inferred?.port || 0,
    side: inferred?.side || "",
    layer: "application",
    confidence: "analyst",
    transport: override.transport || inferred?.transport || normalizeTransport(socket.family),
    source: "override",
    override
  };
}

export function upsertServiceOverride(store, fields, now = Date.now(), options = {}) {
  const normalized = normalizeServiceOverrideStore(store);
  const scope = options.scope === "global" || fields?.scope === "global" ? "global" : "source";
  const rule = {
    target: fields?.target === "endpoint" ? "endpoint" : "port",
    endpoint: fields?.endpoint || "",
    port: Number(fields?.port || 0),
    transport: normalizeTransport(fields?.transport),
    label: fields?.hidden ? "" : String(fields?.label || "").trim(),
    note: fields?.note || "",
    hidden: Boolean(fields?.hidden),
    updatedAt: now
  };
  const key = serviceOverrideKey(rule);
  if (!key) return normalized;
  const target = scope === "global"
    ? { ...normalized.global }
    : { ...(normalized.scopes[serviceOverrideScopeKey(options.sourceName || fields?.sourceName)] || {}) };
  const entry = cleanRule(rule);
  if (entry) target[key] = entry[1];
  else delete target[key];
  if (scope === "global") {
    normalized.global = target;
  } else if (Object.keys(target).length) {
    normalized.scopes = { ...normalized.scopes, [serviceOverrideScopeKey(options.sourceName || fields?.sourceName)]: target };
  } else {
    const scopes = { ...normalized.scopes };
    delete scopes[serviceOverrideScopeKey(options.sourceName || fields?.sourceName)];
    normalized.scopes = scopes;
  }
  return normalized;
}

export function deleteServiceOverride(store, fields, options = {}) {
  const normalized = normalizeServiceOverrideStore(store);
  const scope = options.scope === "global" || fields?.scope === "global" ? "global" : "source";
  const key = serviceOverrideKey(fields);
  if (!key) return normalized;
  if (scope === "global") {
    const global = { ...normalized.global };
    delete global[key];
    return { ...normalized, global };
  }
  const scopeKey = serviceOverrideScopeKey(options.sourceName || fields?.sourceName);
  const scoped = { ...(normalized.scopes[scopeKey] || {}) };
  delete scoped[key];
  const scopes = { ...normalized.scopes };
  if (Object.keys(scoped).length) scopes[scopeKey] = scoped;
  else delete scopes[scopeKey];
  return { ...normalized, scopes };
}

export function serviceOverrideListForSource(store, sourceName = "", { includeGlobal = true } = {}) {
  const normalized = normalizeServiceOverrideStore(store);
  const local = Object.values(normalized.scopes[serviceOverrideScopeKey(sourceName)] || {}).map(rule => ({
    ...rule,
    scope: "source",
    scopeLabel: sourceName || DEFAULT_SCOPE
  }));
  const global = includeGlobal ? Object.values(normalized.global).map(rule => ({
    ...rule,
    scope: "global",
    scopeLabel: "global"
  })) : [];
  return [...local, ...global];
}
