export function createJvmPanelModel({
  state,
  icons,
  alignTimestamps,
  dateTimeFormatter,
  escapeHtml,
  formatNumber,
  renderJvmGcPanelView,
  resolvedNumberLocale,
  resolvedTimeZone,
  visibleHistory
}) {
  function renderJvmGcPanel() {
    return renderJvmGcPanelView({
      state,
      icons,
      jvmPagedRows,
      renderJvmLegend,
      renderJvmPagination,
      renderJvmSortHeader,
      jvmSeverityClass,
      jvmSeverityLabel,
      jvmStallNature,
      escapeHtml,
      formatNumber,
      preciseDateTimeLabel
    });
  }

  function jvmLegendSeries(kind) {
    if (kind === "scatter") {
      return [
        { key: "scatter_warning", label: "Warning pauses", color: "#fbbf24", tip: "GC pauses with correlation score 0.20-0.50. Temporal overlap with TCP symptoms but moderate confidence." },
        { key: "scatter_high", label: "High score pauses", color: "#ef4444", tip: "GC pauses with correlation score > 0.50. Strong evidence of JVM-induced slow consumer behavior." },
        { key: "scatter_low", label: "Low score pauses", color: "#7dd3fc", tip: "GC pauses with correlation score < 0.20. Pause detected but no significant TCP impact observed." }
      ];
    }
    return [
      { key: "recvq", label: "Recv-Q", color: "#7dd3fc", tip: "TCP receive queue depth in bytes. Rises when the local JVM cannot drain incoming data fast enough - a key slow consumer signal." },
      { key: "gc_young", label: "Young GC", color: "#4ade80", tip: "Minor/young generation collections. Usually short (1-20 ms) but frequent. Under high allocation rate they can accumulate and starve the application." },
      { key: "gc_mixed", label: "Mixed GC", color: "#fbbf24", tip: "G1 mixed collections evacuating both young and old regions. Typically longer than young GC and may indicate heap pressure building up." },
      { key: "gc_full", label: "Full / Remark", color: "#ef4444", tip: "Full GC, Remark, or Cleanup pauses. These are the longest and most disruptive. Full GC indicates heap exhaustion or fragmentation." },
      { key: "gc_safepoint", label: "Safepoint", color: "#a78bfa", tip: "JVM safepoint pauses not related to GC (e.g. deoptimization, biased locking revocation). Can still block application threads." }
    ];
  }

  function jvmSeriesHidden(key) {
    return state.hiddenJvmSeries?.has(key);
  }

  function renderJvmLegend(kind) {
    return `<div class="bdp-legend jvm-legend" data-jvm-legend="${escapeHtml(kind)}">
    ${jvmLegendSeries(kind).map(item => `<span class="jvm-legend-item" data-jvm-series-key="${escapeHtml(item.key)}" style="cursor:pointer;${jvmSeriesHidden(item.key) ? "opacity:.4;text-decoration:line-through" : ""}"><i style="--legend-color:${item.color}"></i>${escapeHtml(item.label)}<span class="jvm-legend-tip">${escapeHtml(item.tip)}</span></span>`).join("")}
  </div>`;
  }

  function jvmSeverityClass(severity) {
    return String(severity || "info").replace(/_/g, "-");
  }

  function jvmSeverityLabel(severity) {
    return {
      warning_high: "warning high",
      warning: "warning",
      critical: "critical",
      info: "info",
      none: "none"
    }[severity] || String(severity || "info").replace(/_/g, " ");
  }

  function jvmSeverityRank(severity) {
    return { critical: 5, warning_high: 4, warning: 3, info: 2, none: 1 }[severity] || 0;
  }

  function jvmStallNature(row) {
    if (row.kind === "safepoint") return "Safepoint";
    const pause = row.pause || {};
    const labels = [];
    if (pause.type) labels.push(`${pause.type} GC`);
    if (pause.evacuationFailure) labels.push("evacuation failure");
    if (pause.humongousAllocation) labels.push("humongous allocation");
    if (pause.cause) labels.push(pause.cause);
    return labels.length ? labels.join(" / ") : "Other JVM pause";
  }

  function preciseDateTimeLabel(epochMs) {
    if (!epochMs) return "-";
    const d = new Date(epochMs);
    const tz = resolvedTimeZone();
    const base = dateTimeFormatter(resolvedNumberLocale(), {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }, "precise-date-time-noms").format(d);
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${base}.${ms}`;
  }

  function jvmTableRows(results = [], safepoints = []) {
    const history = visibleHistory().filter(sample => sample.epochMs);
    const alignedSafepoints = alignTimestamps(safepoints.map(item => ({ ...item, durationMs: item.totalMs })), history, state.jvmGc.clockOffsetMs);
    return [
      ...results.filter(row => row.score > 0).map(row => ({ ...row, kind: "gc", eventId: row.pause.id, durationMs: row.pause.durationMs, timestampMs: row.epochMs })),
      ...alignedSafepoints.map((pause, index) => ({
        kind: "safepoint",
        eventId: `SP-${index + 1}`,
        pause: { id: `SP-${index + 1}`, type: "Safepoint", cause: "JVM safepoint", durationMs: pause.durationMs || pause.totalMs || 0 },
        epochMs: pause.alignedEpochMs || pause.epochMs,
        timestampMs: pause.alignedEpochMs || pause.epochMs,
        durationMs: pause.durationMs || pause.totalMs || 0,
        score: 0,
        severity: "info",
        symptoms: { signals: [{ signal: "safepoint" }] },
        classification: ["safepoint"]
      }))
    ];
  }

  function sortedJvmRows(results = [], safepoints = []) {
    const table = state.jvmTable || (state.jvmTable = { page: 1, pageSize: 20, sortKey: "time", sortDir: "desc" });
    const direction = table.sortDir === "asc" ? 1 : -1;
    const valueFor = row => ({
      time: row.timestampMs || 0,
      nature: jvmStallNature(row),
      id: String(row.eventId ?? row.pause?.id ?? ""),
      type: row.pause?.type || "",
      cause: row.pause?.cause || "",
      duration: row.durationMs || 0,
      score: row.score || 0,
      severity: jvmSeverityRank(row.severity),
      signals: row.symptoms?.signals?.map(signal => signal.signal).join(", ") || ""
    }[table.sortKey] ?? "");
    return jvmTableRows(results, safepoints).filter(row => {
      const f = state.jvmGc.severityFilter;
      if (!f || f === "all") return true;
      const order = ["info", "warning", "warning_high", "critical"];
      return order.indexOf(row.severity) >= order.indexOf(f);
    }).sort((a, b) => {
      const av = valueFor(a);
      const bv = valueFor(b);
      const order = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return order * direction || (b.timestampMs || 0) - (a.timestampMs || 0);
    });
  }

  function jvmPagedRows(results = [], safepoints = []) {
    const rows = sortedJvmRows(results, safepoints);
    const table = state.jvmTable || (state.jvmTable = { page: 1, pageSize: 20, sortKey: "time", sortDir: "desc" });
    const totalPages = Math.max(1, Math.ceil(rows.length / table.pageSize));
    table.page = Math.min(Math.max(1, table.page), totalPages);
    const start = (table.page - 1) * table.pageSize;
    return { rows: rows.slice(start, start + table.pageSize), total: rows.length, totalPages, start };
  }

  function renderJvmSortHeader(key, label) {
    const active = state.jvmTable?.sortKey === key;
    const icon = !active ? icons.sortNeutral : state.jvmTable.sortDir === "asc" ? icons.sortAsc : icons.sortDesc;
    return `<th><button class="table-sort jvm-sort ${active ? "active" : ""}" data-jvm-sort="${escapeHtml(key)}">${escapeHtml(label)} ${icon}</button></th>`;
  }

  function renderJvmPagination(total, totalPages, start) {
    if (!total) return "";
    const table = state.jvmTable;
    const end = Math.min(total, start + table.pageSize);
    return `<div class="pager jvm-pager">
    <span class="pager-filter-count">${formatNumber(total)} JVM event row(s)</span>
    <select class="pager-size" data-jvm-page-size title="Rows per page" aria-label="JVM rows per page">${[10, 20, 50, 100].map(value => `<option value="${value}" ${table.pageSize === value ? "selected" : ""}>${value}/p</option>`).join("")}</select>
    <button class="icon" data-jvm-page="first" title="First page" aria-label="First JVM page">${icons.first}</button>
    <button class="icon" data-jvm-page="prev" title="Previous page" aria-label="Previous JVM page">${icons.previous}</button>
    <span>${formatNumber(start + 1)}-${formatNumber(end)} / ${formatNumber(total)} - page ${table.page}/${totalPages}</span>
    <button class="icon" data-jvm-page="next" title="Next page" aria-label="Next JVM page">${icons.next}</button>
    <button class="icon" data-jvm-page="last" data-total-pages="${totalPages}" title="Last page" aria-label="Last JVM page">${icons.last}</button>
  </div>`;
  }

  return {
    jvmLegendSeries,
    jvmPagedRows,
    jvmSeriesHidden,
    jvmSeverityClass,
    jvmSeverityLabel,
    jvmSeverityRank,
    jvmStallNature,
    jvmTableRows,
    preciseDateTimeLabel,
    renderJvmGcPanel,
    renderJvmLegend,
    renderJvmPagination,
    renderJvmSortHeader,
    sortedJvmRows
  };
}
