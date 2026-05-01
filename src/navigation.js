export function clearConversationScopeFilters(filters) {
  filters.text = "";
  filters.process = "";
  filters.srcIp = "";
  filters.dstIp = "";
  filters.srcPort = "";
  filters.dstPort = "";
  filters.onlyAnomalies = false;
}

export function applyContextAction(state, action, socket, { chartMetrics = [], suggestedMetric = null } = {}) {
  if (action === "clear") {
    state.selectedId = null;
    state.drawer = null;
    state.openConversationInsightKey = null;
    state.openConversationInsightPos = null;
    return;
  }
  if (!socket) return;

  state.selectedId = socket.id;
  state.openConversationInsightKey = null;
  state.openConversationInsightPos = null;

  if (action === "details") {
    state.drawer = "details";
  }

  if (action === "charts") {
    state.view = "charts";
    if (suggestedMetric && chartMetrics.includes(suggestedMetric)) {
      state.prefs.graphMetric = suggestedMetric;
      state.chartMetrics = [...new Set([suggestedMetric, ...state.chartMetrics])];
    }
  }

  if (action === "anomalies") {
    state.view = "analysis";
    state.activeTab = "anomalies";
    state.anomalyFilters = { ...state.anomalyFilters, severity: "all", metric: "all", text: socket.id, sort: "priority" };
  }

  if (action === "conversations") {
    state.view = "analysis";
    state.activeTab = "conversations";
    clearConversationScopeFilters(state.table.filters);
    state.table.page = 1;
  }
}
