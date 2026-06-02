export function createDerivedCacheController(getDeps) {
  const current = () => getDeps();
  let bdpPrecomputeTimer = 0;

  function scheduleBdpPrecompute() {
    const { clearTimeoutRef = clearTimeout, renderBdpWindowPanel, setTimeoutRef = setTimeout } = current();
    clearTimeoutRef(bdpPrecomputeTimer);
    bdpPrecomputeTimer = setTimeoutRef(() => {
      try {
        renderBdpWindowPanel();
      } catch {}
    }, 100);
  }

  function resetDerivedCaches({ raw = false } = {}) {
    const { clearVisibleHistoryCache, state } = current();
    state.dataVersion += 1;
    state._bdpCache = null;
    state.cache.filteredKey = "";
    state.cache.filteredRows = null;
    state.cache.optionKey = "";
    state.cache.optionSets = null;
    state.cache.anomalyMapKey = "";
    state.cache.anomaliesBySocketId = null;
    state.cache.socketMapKey = "";
    state.cache.socketsById = null;
    clearVisibleHistoryCache();
    state.cache.microburstKey = "";
    state.cache.microburstSummary = null;
    state.cache.tailLatencyKey = "";
    state.cache.tailLatencySummary = null;
    if (raw) {
      state.rawVersion += 1;
      state.cache.timestampRawVersion = -1;
      state.cache.timestampBlocks = [];
      state.cache.snapshotRawVersion = -1;
      state.cache.timestampSnapshots = [];
    }
  }

  function markAnalysisDirty({ raw = false } = {}) {
    const { state } = current();
    state.analysisDirty = true;
    scheduleBdpPrecompute();
    resetDerivedCaches({ raw });
  }

  return {
    markAnalysisDirty,
    resetDerivedCaches,
    scheduleBdpPrecompute
  };
}
