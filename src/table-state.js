export const TABLE_STATE_STORAGE_KEY = "networkExpertTableState";

const tableColumnMetadataCache = new WeakMap();
const SOCKET_OPTION_SORT_COLLATOR = new Intl.Collator("en", { numeric: true });

export function tableColumnMetadata(columns) {
  const cached = tableColumnMetadataCache.get(columns);
  if (cached) return cached;

  const keys = [];
  const defaultVisible = [];
  const byKey = new Map();
  const searchTextByKey = new Map();
  for (const column of columns) {
    keys.push(column.key);
    byKey.set(column.key, column);
    searchTextByKey.set(column.key, columnControlSearchText({ key: column.key, label: column.label || column.key }));
    if (column.defaultVisible !== false) defaultVisible.push(column.key);
  }

  const metadata = {
    keys,
    keySet: new Set(keys),
    defaultVisible,
    byKey,
    searchTextByKey
  };
  tableColumnMetadataCache.set(columns, metadata);
  return metadata;
}

export function defaultVisibleColumns(columns) {
  return [...tableColumnMetadata(columns).defaultVisible];
}

export function tableColumnKeys(columns) {
  return [...tableColumnMetadata(columns).keys];
}

function uniqueKnown(keys, allKeys, allKeySet = new Set(allKeys)) {
  const seen = new Set();
  const known = [];
  for (const key of keys || []) {
    if (!allKeySet.has(key) || seen.has(key)) continue;
    seen.add(key);
    known.push(key);
  }
  return known;
}

export function normalizeTableState(table = {}, columns, defaults = {}) {
  const metadata = tableColumnMetadata(columns);
  const allKeys = metadata.keys;
  const allKeySet = metadata.keySet;
  const defaultVisible = defaults.visible || metadata.defaultVisible;
  const fallbackVisible = defaultVisible.find(key => allKeySet.has(key)) || allKeys[0] || "";
  const order = uniqueKnown([...(table.order || []), ...allKeys], allKeys, allKeySet);
  const visible = uniqueKnown(table.visible || defaultVisible, allKeys, allKeySet);
  const normalizedVisible = visible.length ? visible : (fallbackVisible ? [fallbackVisible] : []);
  const visibleSet = new Set(normalizedVisible);
  const pinned = uniqueKnown(table.pinned || defaults.pinned || [], allKeys, allKeySet)
    .filter(key => visibleSet.has(key));
  const sortKey = allKeySet.has(table.sortKey) ? table.sortKey : (defaults.sortKey || allKeys[0] || "");
  const sortDir = table.sortDir === "asc" || table.sortDir === "desc" ? table.sortDir : (defaults.sortDir || "desc");
  const pageSize = Number(table.pageSize || defaults.pageSize || 25);
  const page = Math.max(1, Number(table.page || defaults.page || 1));

  return {
    ...table,
    filters: { ...(defaults.filters || {}), ...(table.filters || {}) },
    page,
    pageSize,
    sortKey,
    sortDir,
    pinned,
    visible: normalizedVisible,
    order
  };
}

export function tableStateSnapshot(table) {
  return {
    pageSize: table.pageSize,
    sortKey: table.sortKey,
    sortDir: table.sortDir,
    pinned: [...table.pinned],
    visible: [...table.visible],
    order: [...table.order]
  };
}

export function tableColumnControlModels(table, columns, defaults = {}) {
  const normalized = normalizeTableState(table, columns, defaults);
  const metadata = tableColumnMetadata(columns);
  const visible = new Set(normalized.visible);
  const pinned = new Set(normalized.pinned);
  return normalized.order.map(key => {
    const column = metadata.byKey.get(key);
    const label = column?.label || key;
    return {
      key,
      label,
      searchText: metadata.searchTextByKey.get(key) || columnControlSearchText({ key, label }),
      visible: visible.has(key),
      pinned: pinned.has(key)
    };
  });
}

export function setTableColumnVisibility(table, key, visible, columns, defaults = {}) {
  const normalized = normalizeTableState(table, columns, defaults);
  const metadata = tableColumnMetadata(columns);
  const allKeys = metadata.keys;
  const allKeySet = metadata.keySet;
  if (!allKeySet.has(key)) return normalized;

  const nextVisible = visible
    ? uniqueKnown([...normalized.visible, key], allKeys, allKeySet)
    : normalized.visible.filter(item => item !== key);
  const fallbackVisible = (defaults.visible || defaultVisibleColumns(columns)).find(item => allKeySet.has(item)) || allKeys[0];
  normalized.visible = nextVisible.length ? nextVisible : [fallbackVisible];
  if (!visible) normalized.pinned = normalized.pinned.filter(item => item !== key);
  normalized.page = 1;
  return normalizeTableState(normalized, columns, defaults);
}

export function toggleTableColumnVisibility(table, key, columns, defaults = {}) {
  const normalized = normalizeTableState(table, columns, defaults);
  return setTableColumnVisibility(normalized, key, !normalized.visible.includes(key), columns, defaults);
}

export function toggleTableColumnPin(table, key, columns, defaults = {}) {
  const normalized = normalizeTableState(table, columns, defaults);
  if (!normalized.visible.includes(key)) return normalized;
  normalized.pinned = normalized.pinned.includes(key)
    ? normalized.pinned.filter(item => item !== key)
    : [...normalized.pinned, key];
  return normalizeTableState(normalized, columns, defaults);
}

export function resetTableColumns(table, columns, defaults = {}) {
  const normalized = normalizeTableState(table, columns, defaults);
  return normalizeTableState({
    ...normalized,
    page: 1,
    visible: defaults.visible || tableColumnMetadata(columns).defaultVisible,
    order: tableColumnMetadata(columns).keys,
    pinned: defaults.pinned || []
  }, columns, defaults);
}

export function resetTableSort(table, columns, defaults = {}) {
  return normalizeTableState({
    ...table,
    page: 1,
    sortKey: defaults.sortKey || "risk",
    sortDir: defaults.sortDir || "desc"
  }, columns, defaults);
}

export function buildVisibleColumnOrder(table, columns, defaults = {}) {
  const normalized = normalizeTableState(table, columns, defaults);
  const visible = new Set(normalized.visible);
  const pinned = new Set(normalized.pinned);
  const pinnedKeys = [];
  const otherKeys = [];
  for (const key of normalized.order) {
    if (!visible.has(key)) continue;
    if (pinned.has(key)) pinnedKeys.push(key);
    else otherKeys.push(key);
  }
  return [...pinnedKeys, ...otherKeys];
}

export function normalizeColumnSearchQuery(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function columnControlSearchText(control) {
  return normalizeColumnSearchQuery(`${control?.label || ""} ${control?.key || ""}`);
}

export function columnControlMatchesSearch(control, query) {
  const normalizedQuery = normalizeColumnSearchQuery(query);
  return !normalizedQuery || columnControlSearchText(control).includes(normalizedQuery);
}

export const TABLE_FILTER_CACHE_FIELDS = [
  "text",
  "risk",
  "state",
  "family",
  "minRecvQ",
  "minSendQ",
  "minRtt",
  "srcIp",
  "dstIp",
  "srcPort",
  "dstPort",
  "process",
  "onlyAnomalies"
];

export function tableFilterCacheKey(filters = {}) {
  let key = "";
  for (const field of TABLE_FILTER_CACHE_FIELDS) {
    key += field === "onlyAnomalies" ? (filters[field] ? "1" : "0") : String(filters[field] ?? "");
    key += "\u001f";
  }
  return key;
}

function addOptionValue(set, value) {
  if (!value) return;
  set.add(String(value));
}

function sortedOptionSet(set, collator = SOCKET_OPTION_SORT_COLLATOR) {
  return [...set].sort((a, b) => collator.compare(a, b));
}

export function buildSocketOptionSets(sockets = []) {
  const states = new Set();
  const families = new Set();
  const srcIps = new Set();
  const dstIps = new Set();
  const srcPorts = new Set();
  const dstPorts = new Set();
  const processes = new Set();

  for (const socket of sockets) {
    addOptionValue(states, socket.state);
    addOptionValue(families, socket.family);
    addOptionValue(srcIps, socket.localAddress?.host);
    addOptionValue(dstIps, socket.peerAddress?.host);
    addOptionValue(srcPorts, socket.localAddress?.port);
    addOptionValue(dstPorts, socket.peerAddress?.port);
    addOptionValue(processes, socket.details?.process?.name);
  }

  return {
    states: [...states].sort(),
    families: [...families].sort(),
    srcIps: sortedOptionSet(srcIps),
    dstIps: sortedOptionSet(dstIps),
    srcPorts: sortedOptionSet(srcPorts),
    dstPorts: sortedOptionSet(dstPorts),
    processes: sortedOptionSet(processes)
  };
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function tableSettingsMenuLayout({
  viewportWidth = 0,
  viewportHeight = 0,
  anchorRect = {},
  menuMaxWidth = 320,
  menuMaxHeight = 620,
  minMenuHeight = 260,
  gutter = 8
} = {}) {
  if (viewportWidth < 360 || viewportHeight < 420) return { drawer: true };

  const width = Math.min(menuMaxWidth, Math.max(240, viewportWidth - gutter * 2));
  const height = Math.min(menuMaxHeight, Math.max(minMenuHeight, viewportHeight - gutter * 2));
  const rect = {
    top: Number(anchorRect.top || 0),
    right: Number(anchorRect.right ?? anchorRect.left ?? 0),
    bottom: Number(anchorRect.bottom ?? anchorRect.top ?? 0)
  };
  const maxLeft = viewportWidth - width - gutter;
  const left = clampNumber(rect.right - width, gutter, maxLeft);
  const belowTop = rect.bottom + 6;
  const aboveTop = rect.top - height - 6;
  const top = belowTop + height <= viewportHeight - gutter
    ? belowTop
    : aboveTop >= gutter
      ? aboveTop
      : clampNumber(rect.top, gutter, viewportHeight - height - gutter);

  return {
    drawer: false,
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
    height: Math.round(height)
  };
}
