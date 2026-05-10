export const TABLE_STATE_STORAGE_KEY = "networkExpertTableState";

export function defaultVisibleColumns(columns) {
  return columns.filter(col => col.defaultVisible !== false).map(col => col.key);
}

export function tableColumnKeys(columns) {
  return columns.map(col => col.key);
}

function uniqueKnown(keys, allKeys) {
  return [...new Set(keys || [])].filter(key => allKeys.includes(key));
}

export function normalizeTableState(table = {}, columns, defaults = {}) {
  const allKeys = tableColumnKeys(columns);
  const defaultVisible = defaults.visible || defaultVisibleColumns(columns);
  const fallbackVisible = defaultVisible.find(key => allKeys.includes(key)) || allKeys[0] || "";
  const order = uniqueKnown([...(table.order || []), ...allKeys], allKeys);
  const visible = uniqueKnown(table.visible || defaultVisible, allKeys);
  const normalizedVisible = visible.length ? visible : (fallbackVisible ? [fallbackVisible] : []);
  const pinned = uniqueKnown(table.pinned || defaults.pinned || [], allKeys)
    .filter(key => normalizedVisible.includes(key));
  const sortKey = allKeys.includes(table.sortKey) ? table.sortKey : (defaults.sortKey || allKeys[0] || "");
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
  const byKey = new Map(columns.map(column => [column.key, column]));
  return normalized.order.map(key => {
    const column = byKey.get(key);
    return {
      key,
      label: column?.label || key,
      visible: normalized.visible.includes(key),
      pinned: normalized.pinned.includes(key)
    };
  });
}

export function setTableColumnVisibility(table, key, visible, columns, defaults = {}) {
  const normalized = normalizeTableState(table, columns, defaults);
  const allKeys = tableColumnKeys(columns);
  if (!allKeys.includes(key)) return normalized;

  const nextVisible = visible
    ? uniqueKnown([...normalized.visible, key], allKeys)
    : normalized.visible.filter(item => item !== key);
  const fallbackVisible = (defaults.visible || defaultVisibleColumns(columns)).find(item => allKeys.includes(item)) || allKeys[0];
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
    visible: defaults.visible || defaultVisibleColumns(columns),
    order: tableColumnKeys(columns),
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
