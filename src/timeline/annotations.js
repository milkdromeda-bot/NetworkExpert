export const ANNOTATION_TYPES = {
  custom: { label: "Custom marker", defaultLabel: "Analyst note" },
  "burst-start": { label: "Burst start", defaultLabel: "Burst start" },
  failover: { label: "Failover", defaultLabel: "Failover" },
  "queue-reset": { label: "Queue reset", defaultLabel: "Queue reset" },
  "rtt-peak": { label: "RTT peak", defaultLabel: "RTT peak" }
};

export function annotationTypeList() {
  return Object.entries(ANNOTATION_TYPES).map(([id, meta]) => ({ id, ...meta }));
}

export function annotationTypeLabel(kind = "custom") {
  return ANNOTATION_TYPES[kind]?.label || ANNOTATION_TYPES.custom.label;
}

export function annotationDefaultLabel(kind = "custom") {
  return ANNOTATION_TYPES[kind]?.defaultLabel || ANNOTATION_TYPES.custom.defaultLabel;
}

export function normalizeAnnotations(items = []) {
  return (Array.isArray(items) ? items : [])
    .filter(item => item && typeof item === "object")
    .map(item => ({
      id: String(item.id || `annotation-${Math.random().toString(16).slice(2)}`),
      sourceName: String(item.sourceName || ""),
      socketId: String(item.socketId || ""),
      metric: item.metric == null || item.metric === "" ? "*" : String(item.metric),
      kind: String(item.kind || "custom"),
      label: String(item.label || annotationDefaultLabel(item.kind || "custom")),
      note: String(item.note || ""),
      anchor: String(item.anchor || "visible-end"),
      epochMs: Number.isFinite(Number(item.epochMs)) ? Number(item.epochMs) : null,
      createdAt: Number.isFinite(Number(item.createdAt)) ? Number(item.createdAt) : Date.now()
    }))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export function buildAnnotationDraft({ sourceName = "", socketId = "", metric = "*", kind = "custom" } = {}) {
  return {
    kind,
    label: annotationDefaultLabel(kind),
    note: "",
    metric: metric || "*",
    anchor: "visible-end",
    sourceName,
    socketId
  };
}

export function buildAnnotationAnchorOptions({ history = [], microburst = null, tailLatency = null } = {}) {
  const first = history[0]?.epochMs;
  const last = history[history.length - 1]?.epochMs;
  const mid = Number.isFinite(first) && Number.isFinite(last) ? Math.round((first + last) / 2) : null;
  const options = [
    { id: "visible-start", label: "First visible sample", epochMs: first },
    { id: "visible-mid", label: "Center of visible window", epochMs: mid },
    { id: "visible-end", label: "Last visible sample", epochMs: last }
  ].filter(option => Number.isFinite(option.epochMs));
  if (microburst) {
    options.push(
      { id: "burst-start", label: "Microburst start", epochMs: microburst.startEpochMs },
      { id: "burst-mid", label: "Microburst midpoint", epochMs: Math.round((microburst.startEpochMs + microburst.endEpochMs) / 2) },
      { id: "burst-end", label: "Microburst end", epochMs: microburst.endEpochMs }
    );
  }
  if (tailLatency) {
    options.push(
      { id: "tail-start", label: "Tail window start", epochMs: tailLatency.startEpochMs },
      { id: "tail-mid", label: "Tail window midpoint", epochMs: Math.round((tailLatency.startEpochMs + tailLatency.endEpochMs) / 2) },
      { id: "tail-end", label: "Tail window end", epochMs: tailLatency.endEpochMs }
    );
  }
  return options.filter(option => Number.isFinite(option.epochMs));
}

export function resolveAnnotationEpoch(annotation, context = {}) {
  if (Number.isFinite(Number(annotation?.epochMs))) return Number(annotation.epochMs);
  const option = buildAnnotationAnchorOptions(context).find(item => item.id === annotation?.anchor);
  return option?.epochMs ?? null;
}

export function annotationsForContext(items = [], { sourceName = "", socketId = "", metric = null, history = [], microburst = null, tailLatency = null } = {}) {
  return normalizeAnnotations(items)
    .filter(item => (!sourceName || item.sourceName === sourceName) && (!socketId || item.socketId === socketId))
    .filter(item => !metric || item.metric === "*" || item.metric === metric)
    .map(item => ({ ...item, resolvedEpochMs: resolveAnnotationEpoch(item, { history, microburst, tailLatency }) }))
    .filter(item => Number.isFinite(item.resolvedEpochMs));
}

export function annotationSummary(items = []) {
  const normalized = normalizeAnnotations(items);
  return {
    count: normalized.length,
    latest: normalized[normalized.length - 1] || null
  };
}
