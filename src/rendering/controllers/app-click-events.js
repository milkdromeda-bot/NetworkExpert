export function bindAppClickHandlers(getDeps) {
  const current = () => getDeps();
  const { document, window, state, render, renderKeepingWorkspacePosition, saveTableState, sortedFilteredSockets, focusSocket, drawJvmCharts } = current();
  document.querySelector("#app")?.addEventListener("click", event => {
    const actionMenu = event.target.closest("[data-action-menu]");
    if (actionMenu) {
      event.stopPropagation();
      const id = actionMenu.dataset.actionMenu;
      if (state.openMenuId === id) {
        state.openMenuId = null;
        state.openMenuPos = null;
      } else {
        const rect = actionMenu.getBoundingClientRect();
        const menuWidth = 250;
        const menuHeight = 220;
        const left = Math.min(Math.max(8, rect.right + 4), window.innerWidth - menuWidth - 8);
        const spaceBelow = window.innerHeight - rect.bottom;
        const top = spaceBelow > menuHeight + 8 ? rect.top : Math.max(8, rect.bottom - menuHeight);
        state.openMenuId = id;
        state.openMenuPos = { left: Math.round(left), top: Math.round(top) };
      }
      render();
      return;
    }
    const target = event.target.closest("[data-view]");
    if (target) {
      state._lastTab = state._lastTab || {};
      state._lastTab[state.view] = state.activeTab;
      state.view = target.dataset.view;
      if (state._lastTab[state.view]) state.activeTab = state._lastTab[state.view];
      if (document.startViewTransition) document.startViewTransition(() => render());
      else render();
      return;
    }
    const tab = event.target.closest("[data-tab]");
    if (tab) { state.activeTab = tab.dataset.tab; state.breadcrumbMenuOpen = false; render(); return; }
    const chartsTab = event.target.closest("[data-charts-tab]");
    if (chartsTab) { state.chartsTab = chartsTab.dataset.chartsTab; state.breadcrumbMenuOpen = false; render(); return; }
    const sort = event.target.closest("[data-sort]");
    if (sort) {
      event.stopPropagation();
      const key = sort.dataset.sort;
      state.table.sortDir = state.table.sortKey === key && state.table.sortDir === "desc" ? "asc" : "desc";
      state.table.sortKey = key;
      state.table.page = 1;
      saveTableState();
      render();
      return;
    }
    const page = event.target.closest("[data-page]");
    if (page) {
      const action = page.dataset.page;
      const total = Number(page.dataset.totalPages || Math.max(1, Math.ceil(sortedFilteredSockets().length / state.table.pageSize)));
      if (action === "first") state.table.page = 1;
      if (action === "prev") state.table.page = Math.max(1, state.table.page - 1);
      if (action === "next") state.table.page = Math.min(total, state.table.page + 1);
      if (action === "last") state.table.page = total;
      render();
      return;
    }
    const jvmSort = event.target.closest("[data-jvm-sort]");
    if (jvmSort) {
      event.stopPropagation();
      const key = jvmSort.dataset.jvmSort;
      state.jvmTable.sortDir = state.jvmTable.sortKey === key && state.jvmTable.sortDir === "desc" ? "asc" : "desc";
      state.jvmTable.sortKey = key;
      state.jvmTable.page = 1;
      renderKeepingWorkspacePosition();
      return;
    }
    const jvmPage = event.target.closest("[data-jvm-page]");
    if (jvmPage) {
      const action = jvmPage.dataset.jvmPage;
      const total = Number(jvmPage.dataset.totalPages || 1);
      if (action === "first") state.jvmTable.page = 1;
      if (action === "prev") state.jvmTable.page = Math.max(1, state.jvmTable.page - 1);
      if (action === "next") state.jvmTable.page = Math.min(total, state.jvmTable.page + 1);
      if (action === "last") state.jvmTable.page = total;
      renderKeepingWorkspacePosition();
      return;
    }
    const jvmRow = event.target.closest("[data-jvm-row-epoch]");
    if (jvmRow) {
      const epoch = Number(jvmRow.dataset.jvmRowEpoch);
      if (!epoch) return;
      state.jvmGc.selectedEpoch = state.jvmGc.selectedEpoch === epoch ? null : epoch;
      document.querySelectorAll("[data-jvm-row-epoch]").forEach(row => {
        row.style.background = Number(row.dataset.jvmRowEpoch) === state.jvmGc.selectedEpoch ? "rgba(93,183,255,.15)" : "";
      });
      drawJvmCharts();
      return;
    }
    const jump = event.target.closest("[data-jump]");
    if (jump) {
      focusSocket(jump.dataset.jump, "Chosen from navigation jump");
      state.activeTab = "sockets";
      render();
      return;
    }
    const socket = event.target.closest("[data-socket]");
    if (socket && !event.target.closest("button, input, label, select, textarea, a, [role='button'], .row-menu, .table-settings-menu, .column-tooltip")) {
      focusSocket(socket.dataset.socket, "Chosen by clicking a row");
      state.openConversationInsightKey = null;
      state.openConversationInsightPos = null;
      renderKeepingWorkspacePosition();
    }
  });
  }
