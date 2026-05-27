export function createMetricChartState(ctx) {
  const {
    state,
    document,
    window,
    icons,
    DASHBOARD_PRESETS,
    DEFAULT_TABLE_ORDER,
    formatNumber,
    escapeHtml,
    dateTimeFormatter,
    resolvedTimeZone,
    clearVisibleHistoryCache,
    tailLatencyLens,
    defaultSsCommandConfig,
    setSourceName,
    setActiveInvestigation,
    defaultTableColumns,
    clampChartColumns,
    applyChartZoomOperation,
    clampZoomRange,
    zoomForMetric,
    savePrefs
  } = ctx;

  function chartPointRadius(pointCount, style) {
    const base = { XS: 1, S: 2, M: 3.2, L: 4.6 }[state.prefs.chartPointSize || "S"] || 2;
    if (base <= 1) return 1;
    const count = Math.max(1, Number(pointCount || 1));
    const densityFactor = count <= 80 ? 1 : count <= 180 ? 0.78 : count <= 400 ? 0.58 : count <= 900 ? 0.42 : 0.3;
    const styleFactor = style === "points" || style === "xy" ? 1.15 : 1;
    return Math.max(1, Math.min(base * styleFactor, base * densityFactor * styleFactor));
  }
  
  function hasRealTimestampHistory() {
    return state.history.some(row => row?.epochMs);
  }
  
  function chartResolutionLabel() {
    const visible = visibleHistory().length;
    const mode = hasRealTimestampHistory() ? "real timestamps" : "synthetic timeline";
    return `${formatNumber(visible)} visible point(s), ${mode}`;
  }
  
  function visibleHistory(metric = null) {
    const rows = state.history.length ? state.history : [];
    if (rows.length <= 2) return rows;
    const zoom = chartZoomFor(metric);
    const cacheKey = `${state.dataVersion}|${state.selectedId}|${metric || "shared"}|${rows.length}|${rows[0]?.epochMs || 0}|${rows[rows.length - 1]?.epochMs || 0}|${zoom.start}|${zoom.end}`;
    const historyCache = state.cache.visibleHistoryRowsByKey || (state.cache.visibleHistoryRowsByKey = new Map());
    if (historyCache.has(cacheKey)) return historyCache.get(cacheKey);
    const start = Math.floor(zoom.start * (rows.length - 1));
    const end = Math.max(start + 1, Math.ceil(zoom.end * (rows.length - 1)));
    const visibleRows = rows.slice(start, end + 1);
    state.cache.visibleHistoryKey = cacheKey;
    state.cache.visibleHistoryRows = visibleRows;
    historyCache.set(cacheKey, visibleRows);
    if (historyCache.size > 16) historyCache.delete(historyCache.keys().next().value);
    return visibleRows;
  }
  
  function chartPointBudget(style, width) {
    const pxBudget = Math.max(1200, Math.round((width || 640) * 8));
    const styleBudget = style === "bars" ? 5000 : style === "points" || style === "xy" ? 8000 : 16000;
    return Math.min(styleBudget, pxBudget);
  }
  
  function renderableHistory(rows, metric, style, width) {
    const budget = chartPointBudget(style, width);
    if (rows.length <= budget) return { rows, total: rows.length, reduced: false };
    return {
      rows: preserveExtremesDownsample(rows, metric, budget),
      total: rows.length,
      reduced: true
    };
  }
  
  function chartRowTime(row) {
    return row?.epochMs ?? (row?.t || 0) * 1000;
  }
  
  function nearestChartRow(rows, pct) {
    if (!rows.length) return {};
    const first = chartRowTime(rows[0]);
    const last = chartRowTime(rows[rows.length - 1]);
    const target = first + Math.max(0, Math.min(1, pct)) * Math.max(1, last - first);
    return rows.reduce((best, row) => (
      Math.abs(chartRowTime(row) - target) < Math.abs(chartRowTime(best) - target) ? row : best
    ), rows[0]);
  }
  
  function nearestChartRowIndex(rows, pct) {
    if (!rows.length) return -1;
    const first = chartRowTime(rows[0]);
    const last = chartRowTime(rows[rows.length - 1]);
    const target = first + Math.max(0, Math.min(1, pct)) * Math.max(1, last - first);
    let bestIndex = 0;
    let bestDistance = Infinity;
    rows.forEach((row, index) => {
      const distance = Math.abs(chartRowTime(row) - target);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }
  
  function preserveExtremesDownsample(rows, metric, budget) {
    if (rows.length <= budget || budget < 8) return rows;
    const middleBudget = Math.max(2, budget - 2);
    const bucketCount = Math.max(1, Math.floor(middleBudget / 2));
    const bucketSize = Math.max(1, Math.ceil((rows.length - 2) / bucketCount));
    const picked = new Map([[0, rows[0]], [rows.length - 1, rows[rows.length - 1]]]);
    for (let start = 1; start < rows.length - 1; start += bucketSize) {
      const end = Math.min(rows.length - 1, start + bucketSize);
      let minIndex = start;
      let maxIndex = start;
      for (let i = start + 1; i < end; i += 1) {
        const value = rows[i][metric] || 0;
        if (value < (rows[minIndex][metric] || 0)) minIndex = i;
        if (value > (rows[maxIndex][metric] || 0)) maxIndex = i;
      }
      picked.set(minIndex, rows[minIndex]);
      picked.set(maxIndex, rows[maxIndex]);
    }
    return [...picked.entries()].sort((a, b) => a[0] - b[0]).slice(0, budget).map(([, row]) => row);
  }
  
  function chartBgColor() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "#f0f3f7" : "#050910";
  }
  
  function chartXMinorTicks(data, pad, w, h, firstTime, lastTime) {
    const span = lastTime - firstTime;
    if (span <= 0 || !data.length) return "";
    const plotW = w - pad.l - pad.r;
    let interval;
    if (span <= 5000) interval = 1000;
    else if (span <= 30000) interval = 5000;
    else if (span <= 120000) interval = 15000;
    else if (span <= 600000) interval = 60000;
    else interval = 300000;
    const ticks = [];
    const start = Math.ceil(firstTime / interval) * interval;
    for (let t = start; t <= lastTime; t += interval) {
      const xPos = pad.l + ((t - firstTime) / span) * plotW;
      if (xPos <= pad.l + 20 || xPos >= w - pad.r - 20) continue;
      const d = new Date(t);
      const label = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
      ticks.push({ x: xPos, label });
    }
    return ticks.map(tick => `<line x1="${tick.x}" x2="${tick.x}" y1="${h - pad.b}" y2="${h - pad.b + 5}" stroke="#8c9aab" opacity="0.4"/><text x="${tick.x}" y="${h - 6}" text-anchor="middle" fill="#8c9aab" font-size="9" opacity="0.5">${tick.label}</text>`).join("");
  }
  
  function timeLabel(seconds, epochMs = null) {
    if (epochMs) {
      const d = new Date(epochMs);
      const h = String(d.getUTCHours()).padStart(2, "0");
      const m = String(d.getUTCMinutes()).padStart(2, "0");
      const s = String(d.getUTCSeconds()).padStart(2, "0");
      const ms = String(d.getUTCMilliseconds()).padStart(3, "0");
      return `${h}:${m}:${s}.${ms}`;
    }
    if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}h`;
    if (seconds >= 60) return `${(seconds / 60).toFixed(1)}m`;
    return `${Math.round(seconds)}s`;
  }
  
  function dateTimePartsInZone(epochMs) {
    const parts = dateTimeFormatter("en-CA", {
      timeZone: resolvedTimeZone(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }, "parts-zone").formatToParts(new Date(epochMs));
    const value = type => parts.find(part => part.type === type)?.value || "00";
    const hour = value("hour") === "24" ? "00" : value("hour");
    return `${value("year")}-${value("month")}-${value("day")}T${hour}:${value("minute")}:${value("second")}`;
  }
  
  function timeZoneOffsetMs(timeZone, epochMs) {
    const parts = dateTimeFormatter("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }, "offset").formatToParts(new Date(epochMs));
    const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const hour = map.hour === "24" ? "00" : map.hour;
    return Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), Number(hour), Number(map.minute), Number(map.second)) - epochMs;
  }
  
  function zonedDateTimeToEpoch(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return NaN;
    const [, year, month, day, hour, minute, second = 0] = match.map(value => Number(value || 0));
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
    const zone = resolvedTimeZone();
    const firstPass = utcGuess - timeZoneOffsetMs(zone, utcGuess);
    return utcGuess - timeZoneOffsetMs(zone, firstPass);
  }
  
  function chartZoomFor(metric = null) {
    return zoomForMetric(state.chartZoomByMetric, state.chartZoom, metric);
  }
  function setZoom(start, end, metric = null) {
    const next = clampZoomRange(start, end);
    if (metric) state.chartZoomByMetric[metric] = next;
    else state.chartZoom = next;
    clearVisibleHistoryCache();
  }
  function applyChartZoomAction(action, metric = null) {
    const result = applyChartZoomOperation({
      action,
      metric,
      sharedZoom: state.chartZoom,
      chartZoomByMetric: state.chartZoomByMetric
    });
    state.chartZoom = result.sharedZoom;
    state.chartZoomByMetric = result.chartZoomByMetric;
    if (!metric) state.chartZoomByMetric = {};
    state.activeChartMetric = result.activeChartMetric || metric || state.prefs.graphMetric;
    state.activeChartAction = result.activeChartAction;
    clearVisibleHistoryCache();
  }
  
  function orderedChartMetrics() {
    const order = state.prefs.chartLayout.panelOrder || [];
    return [...state.chartMetrics].sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }
  
  function chartMoveTargetIndex(metric, direction) {
    const visible = orderedChartMetrics();
    const current = visible.indexOf(metric);
    const columns = clampChartColumns(state.prefs.chartLayout.columns);
    if (current < 0) return -1;
    const column = current % columns;
    if (direction === "left") return column > 0 ? current - 1 : -1;
    if (direction === "right") return column < columns - 1 && current + 1 < visible.length ? current + 1 : -1;
    if (direction === "up") return current - columns >= 0 ? current - columns : -1;
    if (direction === "down") return current + columns < visible.length ? current + columns : -1;
    if (typeof direction === "number") return current + direction;
    return -1;
  }
  
  function chartMoveOptions(metric) {
    const visible = orderedChartMetrics();
    const current = visible.indexOf(metric);
    if (current < 0) return [];
    const options = [
      { direction: "left", label: "Move left", icon: icons.arrowLeft },
      { direction: "right", label: "Move right", icon: icons.arrowRight },
      { direction: "up", label: "Move up", icon: icons.up },
      { direction: "down", label: "Move down", icon: icons.down }
    ].filter(option => {
      const targetIndex = chartMoveTargetIndex(metric, option.direction);
      return targetIndex >= 0 && targetIndex < visible.length;
    }).map(option => ({
      ...option,
      targetMetric: visible[chartMoveTargetIndex(metric, option.direction)]
    }));
    return options;
  }
  
  function renderChartMoveMenu(metric) {
    return `<button class="mini chart-drag-handle" draggable="true" data-chart-drag="${escapeHtml(metric)}" title="Drag to reorder"><i class="ri-draggable"></i></button>`;
  }
  
  function positionChartMoveMenu(button, metric) {
    const options = chartMoveOptions(metric);
    const menuWidth = 220;
    const menuHeight = Math.max(56, 16 + options.length * 38);
    const rect = button.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
    const preferBelow = rect.bottom + menuHeight + 8 <= window.innerHeight;
    const top = preferBelow ? rect.bottom + 6 : Math.max(8, rect.top - menuHeight - 6);
    state.openChartMoveMetric = metric;
    state.openChartMovePos = { left: Math.round(left), top: Math.round(top) };
  }
  
  function moveVisibleChartMetric(metric, directionOrTarget) {
    const visible = orderedChartMetrics();
    const current = visible.indexOf(metric);
    let targetMetric;
    if (visible.includes(directionOrTarget)) {
      targetMetric = directionOrTarget;
    } else {
      const targetIndex = chartMoveTargetIndex(metric, directionOrTarget);
      targetMetric = visible[targetIndex];
    }
    if (current < 0 || !targetMetric || metric === targetMetric) return false;
    const order = [...state.prefs.chartLayout.panelOrder];
    const currentOrderIndex = order.indexOf(metric);
    const targetOrderIndex = order.indexOf(targetMetric);
    if (currentOrderIndex < 0 || targetOrderIndex < 0) return false;
    [order[currentOrderIndex], order[targetOrderIndex]] = [order[targetOrderIndex], order[currentOrderIndex]];
    state.prefs.chartLayout.panelOrder = order;
    savePrefs();
    return true;
  }
  
  function resetAllState() {
    state.raw = "";
    state.command = "ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all";
    state.ssCommandConfig = defaultSsCommandConfig();
    setSourceName("empty workspace");
    state.sockets = [];
    state.healthScore = null;
    state.selectedId = null;
    setActiveInvestigation(state, null);
    state.anomalies = [];
    state.alertEvents = [];
    state.baseline = null;
    state.view = "ingest";
    state.activeTab = "sockets";
    state.drawer = null;
    state.modal = null;
    state.annotationContext = null;
    state.statsMetric = null;
    state.ingestRawExpanded = true;
    state.openChartMoveMetric = null;
    state.openChartMovePos = null;
    state.openMenuPos = null;
    state.openMenuId = null;
    state.openExportMenu = null;
    state.openExportMenuPos = null;
    state.openDashboardPresetMenu = false;
    state.activeDashboardPreset = Object.keys(DASHBOARD_PRESETS)[0] || "noc";
    state.openConversationInsightKey = null;
    state.openConversationInsightPos = null;
    state.conversationSort = { key: "anomalies", dir: "desc" };
    state.selectedMapEdgeId = null;
    state.history = [];
    state.chartMetrics = ["tx_bps", "rx_bps", "rtt", "rto", "sendQ", "skmem.d"];
    state.hiddenChartSeries = new Set();
    state.hiddenJvmSeries = new Set();
    state.jvmTable = { page: 1, pageSize: 20, sortKey: "time", sortDir: "desc" };
    state.correlation = { x: "rtt", y: "sendQ" };
    state.analysisDirty = true;
    state.bandwidthIndex = {};
    state.cache = {
      timestampRawVersion: -1,
      timestampBlocks: [],
      snapshotRawVersion: -1,
      timestampSnapshots: [],
      filteredKey: "",
      filteredRows: null,
      optionKey: "",
      optionSets: null,
      anomalyMapKey: "",
      anomaliesBySocketId: null,
      socketMapKey: "",
      socketsById: null,
      visibleHistoryKey: "",
      visibleHistoryRows: null,
      visibleHistoryRowsByKey: new Map(),
      microburstKey: "",
      microburstSummary: null,
      tailLatencyKey: "",
      tailLatencySummary: null
    };
    state.rawVersion += 1;
    setZoom(0, 1);
    state.table = {
      page: 1,
      pageSize: state.prefs.defaultPageSize,
      sortKey: "risk",
      sortDir: "desc",
      pinned: ["risk", "state", "local"],
      visible: defaultTableColumns(),
      order: [...DEFAULT_TABLE_ORDER],
      filters: { text: "", risk: "all", state: "all", family: "all", minRecvQ: "", minSendQ: "", minRtt: "", srcIp: "", dstIp: "", srcPort: "", dstPort: "", process: "", onlyAnomalies: false }
    };
  }
  
  function chartEpochAt(which) {
    const rows = state.history;
    if (!rows.length) return null;
    const first = rows[0]?.epochMs || Date.now();
    const last = rows[rows.length - 1]?.epochMs || (first + (rows[rows.length - 1]?.t || 0) * 1000);
    const ratio = which === "start" ? state.chartZoom.start : state.chartZoom.end;
    return first + ratio * (last - first);
  }
  
  function zoomDateTimeValue(which) {
    const epoch = chartEpochAt(which);
    if (!epoch) return "";
    return dateTimePartsInZone(epoch);
  }
  
  function setZoomFromDateInputs() {
    const startValue = document.querySelector("#startTimeInput")?.value;
    const endValue = document.querySelector("#endTimeInput")?.value;
    if (!startValue || !endValue || !state.history.length) return;
    const first = state.history[0]?.epochMs || Date.now();
    const last = state.history[state.history.length - 1]?.epochMs || (first + (state.history[state.history.length - 1]?.t || 0) * 1000);
    const start = zonedDateTimeToEpoch(startValue);
    const end = zonedDateTimeToEpoch(endValue);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || last <= first) return;
    setZoom((start - first) / (last - first), (end - first) / (last - first));
  }
  
  function zoomToTailLatencyWindow() {
    const lens = tailLatencyLens();
    if (!lens || !state.history.length) return false;
    const first = state.history[0]?.epochMs || 0;
    const last = state.history[state.history.length - 1]?.epochMs || first;
    if (!Number.isFinite(first) || !Number.isFinite(last) || last <= first) return false;
    const paddingMs = Math.max(1000, ((lens.endEpochMs - lens.startEpochMs) || 0) * 0.2);
    const start = Math.max(first, lens.startEpochMs - paddingMs);
    const end = Math.min(last, lens.endEpochMs + paddingMs);
    setZoom((start - first) / (last - first), (end - first) / (last - first));
    return true;
  }

  return {
    chartPointRadius,
    hasRealTimestampHistory,
    chartResolutionLabel,
    visibleHistory,
    chartPointBudget,
    renderableHistory,
    chartRowTime,
    nearestChartRow,
    nearestChartRowIndex,
    preserveExtremesDownsample,
    chartBgColor,
    chartXMinorTicks,
    timeLabel,
    dateTimePartsInZone,
    timeZoneOffsetMs,
    zonedDateTimeToEpoch,
    chartZoomFor,
    setZoom,
    applyChartZoomAction,
    orderedChartMetrics,
    chartMoveTargetIndex,
    chartMoveOptions,
    renderChartMoveMenu,
    positionChartMoveMenu,
    moveVisibleChartMetric,
    resetAllState,
    chartEpochAt,
    zoomDateTimeValue,
    setZoomFromDateInputs,
    zoomToTailLatencyWindow
  };
}
