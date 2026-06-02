export function createImportFlowController(getDeps) {
  const current = () => getDeps();

  async function importFile(file) {
    const {
      INGEST_RAW_EAGER_LIMIT,
      aggregateParsedSocketsByKey,
      document,
      formatNumber,
      hasTimestampedRawData,
      importSocketFile,
      performance,
      recompute,
      recomputeFromSockets,
      render,
      resetDerivedCaches,
      setActiveInvestigation,
      setSourceName,
      setTimeoutRef,
      state,
      toast
    } = current();

    state.importStatus = { title: "Preparing import", detail: `${file.name} (${formatNumber(file.size)} bytes)`, progress: 1 };
    state.raw = "";
    state.ingestRawExpanded = false;
    state.sockets = [];
    state.anomalies = [];
    state.healthScore = null;
    state.selectedId = null;
    setActiveInvestigation(state, null);
    setSourceName(file.name);
    state.view = "ingest";
    state.analysisDirty = false;
    resetDerivedCaches({ raw: true });
    render();

    const result = await importSocketFile(file, {
      formatNumber,
      preFilter: state.preImportFilters.enabled ? { ...state.preImportFilters } : null,
      onProgress(update, options = {}) {
        state.raw = update.raw;
        const isTimelineImport = hasTimestampedRawData();
        const visibleSockets = isTimelineImport ? aggregateParsedSocketsByKey(update.sockets) : update.sockets;
        state.importStatus = update.status && isTimelineImport && visibleSockets.length !== update.sockets.length
          ? {
            ...update.status,
            detail: `${update.status.detail} ${formatNumber(visibleSockets.length)} active sockets after timeline aggregation.`
          }
          : update.status;
        state.sockets = visibleSockets;
        if (options.render !== false) {
          const statusEl = document.querySelector(".import-status");
          if (statusEl && update.status) statusEl.textContent = `${update.status.title} - ${update.status.detail} (${update.status.progress || 0}%)`;
        }
      }
    });

    state.raw = result.raw;
    state.ingestRawExpanded = result.raw.length <= INGEST_RAW_EAGER_LIMIT;
    setSourceName(result.sourceName);
    rememberFilterHistory(state.preImportFilters);
    state.importStatus = null;
    state.view = "analysis";
    state.activeTab = "advisor";
    state.healthScore = null;
    resetDerivedCaches({ raw: true });
    render();
    await new Promise(resolve => setTimeoutRef(resolve, 50));
    const t0 = performance.now();
    if (hasTimestampedRawData()) {
      recompute();
    } else {
      state.sockets = result.sockets;
      recomputeFromSockets();
    }
    toast("Analysis complete", `${state.sockets.length} sockets in ${((performance.now() - t0) / 1000).toFixed(1)}s.`);
    toast("Import complete", `${formatNumber(state.sockets.length)} sockets parsed from ${file.name}.`);
    render();
  }

  function rememberFilterHistory(filters) {
    const { hasPreImportFilterValue, normalizePreImportFilters, saveFilterHistory, state } = current();
    if (!filters.enabled || !hasPreImportFilterValue(filters)) return;
    const normalized = normalizePreImportFilters(filters);
    state.filterHistory = [
      { ...normalized, at: Date.now() },
      ...state.filterHistory
    ].filter((item, index, all) => index === all.findIndex(other =>
      other.protocol === item.protocol &&
      other.state === item.state &&
      other.srcIp === item.srcIp &&
      other.dstIp === item.dstIp &&
      other.anyPort === item.anyPort &&
      other.srcPort === item.srcPort &&
      other.dstPort === item.dstPort
    )).slice(0, 40);
    saveFilterHistory(state.filterHistory);
  }

  return {
    importFile,
    rememberFilterHistory
  };
}
