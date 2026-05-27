export function bindSocketInteractionEvents(deps) {
  const {
    document,
    window,
    state,
    CONVERSATION_SORT_LABELS,
    conversationDefaultSortDir,
    positionConversationInsight,
    socketsById,
    focusSocket,
    chartMetricList,
    metricLabel,
    anomaliesBySocketId,
    metricValue,
    formatNumber,
    openIncidentReport,
    exportIncidentReportHtml,
    exportEvidencePack,
    buildJiraReport,
    exportFixSpikeCsv,
    copyTextToClipboard,
    toast,
    renderKeepingWorkspacePosition,
    render
  } = deps;

  document.querySelectorAll("[data-export-menu]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const scope = event.currentTarget.dataset.exportMenu;
    const wrap = event.currentTarget.closest(".export-menu-wrap");
    const menu = wrap?.querySelector(".export-menu");
    if (!menu) return;
    if (state.openExportMenu === scope) {
      state.openExportMenu = null;
      state.openExportMenuPos = null;
      menu.classList.remove("open");
      menu.removeAttribute("style");
    } else {
      document.querySelectorAll(".export-menu.open").forEach(item => {
        item.classList.remove("open");
        item.removeAttribute("style");
      });
      const rect = event.currentTarget.getBoundingClientRect();
      const menuWidth = 260;
      const menuHeight = 110;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8);
      const preferBelow = rect.bottom + menuHeight + 8 <= window.innerHeight;
      const top = preferBelow ? rect.bottom + 6 : Math.max(8, rect.top - menuHeight - 6);
      state.openExportMenu = scope;
      state.openExportMenuPos = { left: Math.round(left), top: Math.round(top) };
      menu.style.left = `${Math.round(left)}px`;
      menu.style.top = `${Math.round(top)}px`;
      menu.classList.add("open");
    }
  }));
  document.querySelectorAll(".export-menu").forEach(menu => menu.addEventListener("click", event => {
    event.stopPropagation();
  }));
  document.querySelectorAll("[data-export-action]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const action = event.currentTarget.dataset.exportAction;
    state.openExportMenu = null;
    state.openExportMenuPos = null;
    const reportEl = document.getElementById("inlineReport");
    if (reportEl) reportEl.classList.add("visible");
    setTimeout(() => {
      try {
        if (action === "pdf") openIncidentReport();
        if (action === "incident-html") exportIncidentReportHtml();
        if (action === "pack") exportEvidencePack().catch(error => toast("Evidence pack failed", error.message || "Evidence pack export failed.", "danger")).finally(() => { if (reportEl) reportEl.classList.remove("visible"); });
        if (action === "jira") {
          copyTextToClipboard(buildJiraReport());
          toast("Jira report copied", "Paste into a Jira ticket description or comment.");
        }
        if (action === "fix-csv") exportFixSpikeCsv();
      } finally {
        if (action !== "pack" && reportEl) reportEl.classList.remove("visible");
      }
    }, 16);
  }));
  document.querySelectorAll("[data-action-menu]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const id = event.currentTarget.dataset.actionMenu;
    if (state.openMenuId === id) {
      state.openMenuId = null;
      state.openMenuPos = null;
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const menuWidth = 250;
      const menuHeight = 188;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8);
      const preferBelow = rect.bottom + menuHeight + 8 <= window.innerHeight;
      const top = preferBelow ? rect.bottom + 6 : Math.max(8, rect.top - menuHeight - 6);
      state.openMenuId = id;
      state.openMenuPos = { left: Math.round(left), top: Math.round(top) };
    }
    render();
  }));

  document.querySelectorAll("[data-conversation-sort]").forEach(btn => btn.addEventListener("click", event => {
    const key = event.currentTarget.dataset.conversationSort;
    if (!CONVERSATION_SORT_LABELS[key]) return;
    const current = state.conversationSort || { key: "anomalies", dir: "desc" };
    const nextDir = current.key === key ? (current.dir === "asc" ? "desc" : "asc") : conversationDefaultSortDir(key);
    state.conversationSort = { key, dir: nextDir };
    state.table.page = 1;
    state.openConversationInsightKey = null;
    state.openConversationInsightPos = null;
    renderKeepingWorkspacePosition();
  }));
  document.querySelectorAll("[data-conversation-insight]").forEach(btn => {
    btn.addEventListener("click", event => {
      event.stopPropagation();
      const key = event.currentTarget.dataset.conversationInsight;
      if (state.openConversationInsightKey === key) {
        state.openConversationInsightKey = null;
        state.openConversationInsightPos = null;
      } else {
        positionConversationInsight(event.currentTarget);
      }
      renderKeepingWorkspacePosition();
    });
  });
  document.querySelectorAll(".conversation-insight-popover").forEach(popover => popover.addEventListener("click", event => {
    event.stopPropagation();
  }));
  document.querySelectorAll("[data-conversation-close]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    state.openConversationInsightKey = null;
    state.openConversationInsightPos = null;
    renderKeepingWorkspacePosition();
  }));
  document.querySelectorAll("[data-conversation-action]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const socket = socketsById().get(event.currentTarget.dataset.socketId);
    if (!socket) return;
    const action = event.currentTarget.dataset.conversationAction;
    const metric = event.currentTarget.dataset.metric || "rtt";
    focusSocket(socket.id, "Chosen from conversation action");
    state.openConversationInsightKey = null;
    state.openConversationInsightPos = null;
    if (action === "chart") {
      state.view = "charts";
      if (chartMetricList().includes(metric)) {
        state.prefs.graphMetric = metric;
        state.chartMetrics = [...new Set([metric, ...state.chartMetrics])];
      }
      toast("Conversation chart opened", `${metricLabel(metric)} for ${socket.local} -> ${socket.peer}.`);
    }
    if (action === "details") {
      state.activeTab = "sockets";
      state.drawer = "details";
      toast("Conversation context selected", `${socket.local} -> ${socket.peer}.`);
    }
    if (action === "anomalies") {
      state.view = "analysis";
      state.activeTab = "anomalies";
      state.anomalyFilters = { ...state.anomalyFilters, severity: "all", metric: metric === "socket" ? "all" : metric, text: socket.id, sort: "priority" };
      toast("Anomalies filtered", "Showing detailed signals for this conversation.");
    }
    render();
  }));

  document.querySelectorAll("[data-row-action]").forEach(btn => btn.addEventListener("click", async event => {
    event.stopPropagation();
    const socket = socketsById().get(event.currentTarget.dataset.socketId);
    if (!socket) return;
    const action = event.currentTarget.dataset.rowAction;
    focusSocket(socket.id, "Chosen from row action");
    state.openMenuId = null;
    state.openMenuPos = null;
    if (action === "chart") {
      state.view = "charts";
      toast("Chart context selected", `${socket.local} -> ${socket.peer}`);
    }
    if (action === "focus") {
      state.view = "charts";
      state.chartsTab = "focus";
      toast("Focus mode", `All metrics for ${socket.local} → ${socket.peer}`);
    }
    if (action === "details") {
      state.drawer = "details";
    }
    if (action === "filter-src") {
      state.table.filters.srcIp = socket.localAddress.host;
      state.table.page = 1;
    }
    if (action === "filter-dst") {
      state.table.filters.dstIp = socket.peerAddress.host;
      state.table.page = 1;
    }
    if (action === "copy") {
      const process = socket.details?.process;
      const summary = [
        `${socket.state} ${socket.local} -> ${socket.peer}`,
        process ? `Process: ${process.name}:${process.pid}` : "",
        `Send-Q: ${formatNumber(socket.sendQ)} | Recv-Q: ${formatNumber(socket.recvQ)}`,
        metricValue(socket, "rtt") ? `RTT: ${metricValue(socket, "rtt").toFixed(1)}ms | RTO: ${metricValue(socket, "rto")}ms` : "",
        metricValue(socket, "cwnd") ? `cwnd: ${metricValue(socket, "cwnd")} | retrans: ${socket.details?.timer?.retrans || 0}` : "",
        metricValue(socket, "skmem.d") ? `drops: ${metricValue(socket, "skmem.d")}` : "",
        socket.risk !== "none" ? `Risk: ${socket.risk}` : ""
      ].filter(Boolean).join("\n");
      await navigator.clipboard?.writeText(summary);
      toast("Socket copied", "Formatted summary copied to clipboard (paste in Slack/email).");
    }
    render();
  }));
}
