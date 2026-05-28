export function defaultTableFilters() {
  return {
    text: "",
    risk: "all",
    state: "all",
    family: "all",
    minRecvQ: "",
    minSendQ: "",
    minRtt: "",
    srcIp: "",
    dstIp: "",
    srcPort: "",
    dstPort: "",
    process: "",
    onlyAnomalies: false
  };
}

export function hasNonDefaultTableFilters(filters = {}) {
  const defaults = defaultTableFilters();
  return Object.keys(defaults).some(key => {
    if (key === "onlyAnomalies") return Boolean(filters?.onlyAnomalies);
    return String(filters?.[key] ?? defaults[key] ?? "").trim() !== String(defaults[key] ?? "").trim();
  });
}

export function createTableDefaults({ columns = [], prefsDefault = {}, getPrefs = () => ({}) } = {}) {
  const defaultVisibleColumns = columns
    .filter(column => column.defaultVisible !== false)
    .map(column => column.key);
  const defaultOrder = columns.map(column => column.key);
  const cache = new Map();

  function defaultTableColumns() {
    return [...defaultVisibleColumns];
  }

  function defaultTableState(pageSize = prefsDefault.defaultPageSize) {
    return {
      page: 1,
      pageSize,
      sortKey: "risk",
      sortDir: "desc",
      pinned: ["risk", "state", "local"],
      visible: defaultTableColumns(),
      order: [...defaultOrder],
      filters: defaultTableFilters()
    };
  }

  function tableDefaults() {
    const prefs = getPrefs() || {};
    const pageSize = Number(prefs.defaultPageSize || prefsDefault.defaultPageSize);
    if (!cache.has(pageSize)) cache.set(pageSize, defaultTableState(pageSize));
    return cache.get(pageSize);
  }

  return {
    DEFAULT_TABLE_ORDER: defaultOrder,
    DEFAULT_TABLE_VISIBLE_COLUMNS: defaultVisibleColumns,
    defaultTableColumns,
    defaultTableState,
    tableDefaults
  };
}
