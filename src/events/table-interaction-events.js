export function bindTableInteractionEvents(deps) {
  const {
    document,
    state,
    TABLE_COLUMNS,
    tableDefaults,
    tableSettingsPlacement,
    applyTableColumnSearchFilter,
    resetTableSort,
    resetTableColumns,
    toggleTableColumnPin,
    setTableColumnVisibility,
    toggleTableColumnVisibility,
    saveTableState,
    applyTableLayout,
    saveTableProfiles,
    moveTableColumn,
    toast,
    renderKeepingWorkspacePosition,
    renderKeepingModalPosition,
    render
  } = deps;

  document.querySelectorAll("[data-table-settings-menu]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    if (state.openTableSettings) {
      state.openTableSettings = false;
      state.openTableSettingsPos = null;
    } else {
      const placement = tableSettingsPlacement(event.currentTarget);
      if (placement.drawer) {
        state.openTableSettings = false;
        state.openTableSettingsPos = null;
        state.drawer = "tableSettings";
      } else {
        state.drawer = state.drawer === "tableSettings" ? null : state.drawer;
        state.openTableSettings = true;
        state.openTableSettingsPos = { left: placement.left, top: placement.top, width: placement.width, height: placement.height };
      }
    }
    renderKeepingWorkspacePosition();
  }));
  document.querySelectorAll(".table-settings-menu").forEach(menu => menu.addEventListener("click", event => {
    event.stopPropagation();
  }));
  document.querySelectorAll("[data-table-column-search]").forEach(input => input.addEventListener("input", event => {
    event.stopPropagation();
    state.tableColumnSearch = event.currentTarget.value;
    applyTableColumnSearchFilter(event.currentTarget.closest(".table-settings-menu, .table-settings-drawer"), state.tableColumnSearch);
  }));
  document.querySelectorAll("[data-table-column-search-clear]").forEach(btn => btn.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    state.tableColumnSearch = "";
    const panel = event.currentTarget.closest(".table-settings-menu, .table-settings-drawer");
    const input = panel?.querySelector("[data-table-column-search]");
    if (input) {
      input.value = "";
      input.focus();
    }
    applyTableColumnSearchFilter(panel, "");
  }));
  document.querySelectorAll("[data-table-menu-action]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const action = event.currentTarget.dataset.tableMenuAction;
    if (action === "clearSort") {
      state.table = resetTableSort(state.table, TABLE_COLUMNS, tableDefaults());
    }
    if (action === "resetColumns") {
      state.table = resetTableColumns(state.table, TABLE_COLUMNS, tableDefaults());
    }
    saveTableState();
    renderKeepingWorkspacePosition();
  }));

  document.querySelectorAll("[data-pin-col]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const key = event.currentTarget.dataset.pinCol;
    state.table = toggleTableColumnPin(state.table, key, TABLE_COLUMNS, tableDefaults());
    saveTableState();
    event.currentTarget.closest(".modal") ? renderKeepingModalPosition() : render();
  }));
  document.querySelectorAll("[data-column-help]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    state.helpColumn = event.currentTarget.dataset.columnHelp;
    state.modal = "columnHelp";
    render();
  }));
  document.querySelectorAll("[data-metric-help]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    state.helpMetric = event.currentTarget.dataset.metricHelp;
    state.modal = "metricHelp";
    render();
  }));
  document.querySelectorAll("[data-hide-col]").forEach(btn => btn.addEventListener("click", event => {
    event.stopPropagation();
    const key = event.currentTarget.dataset.hideCol;
    state.table = setTableColumnVisibility(state.table, key, false, TABLE_COLUMNS, tableDefaults());
    saveTableState();
    event.currentTarget.closest(".modal") ? renderKeepingModalPosition() : render();
  }));
  document.querySelectorAll("[data-load-table-layout]").forEach(btn => btn.addEventListener("click", event => {
    applyTableLayout(state.tableProfiles.find(profile => profile.id === event.currentTarget.dataset.loadTableLayout));
    toast("Table layout applied", "Column order, visibility, pinning, sort, and page size have been restored.");
    render();
  }));
  document.querySelectorAll("[data-delete-table-layout]").forEach(btn => btn.addEventListener("click", event => {
    state.tableProfiles = state.tableProfiles.filter(profile => profile.id !== event.currentTarget.dataset.deleteTableLayout);
    saveTableProfiles();
    toast("Table layout deleted", "The saved table layout has been removed.");
    render();
  }));
  document.querySelectorAll("[draggable][data-col-key]").forEach(item => {
    item.addEventListener("dragstart", event => {
      event.dataTransfer.setData("text/plain", event.currentTarget.dataset.colKey);
      event.dataTransfer.effectAllowed = "move";
      event.currentTarget.classList.add("dragging");
    });
    item.addEventListener("dragend", event => {
      event.currentTarget.classList.remove("dragging");
      document.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
    });
    item.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      event.currentTarget.classList.add("drag-over");
    });
    item.addEventListener("dragleave", event => {
      event.currentTarget.classList.remove("drag-over");
    });
    item.addEventListener("drop", event => {
      event.preventDefault();
      const from = event.dataTransfer.getData("text/plain");
      const to = event.currentTarget.dataset.colKey;
      if (moveTableColumn(from, to)) {
        saveTableState();
        render();
      }
    });
  });

  document.querySelectorAll("[data-visible-col]").forEach(input => input.addEventListener("change", event => {
    event.stopPropagation();
    const key = event.currentTarget.dataset.visibleCol;
    state.table = setTableColumnVisibility(state.table, key, event.currentTarget.checked, TABLE_COLUMNS, tableDefaults());
    saveTableState();
    event.currentTarget.closest(".modal") ? renderKeepingModalPosition() : renderKeepingWorkspacePosition();
  }));
  document.querySelectorAll("[data-menu-visible-col]").forEach(btn => btn.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const key = event.currentTarget.dataset.menuVisibleCol;
    state.table = toggleTableColumnVisibility(state.table, key, TABLE_COLUMNS, tableDefaults());
    saveTableState();
    renderKeepingWorkspacePosition();
  }));
  document.querySelectorAll("[data-menu-pin-col]").forEach(btn => btn.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const key = event.currentTarget.dataset.menuPinCol;
    state.table = toggleTableColumnPin(state.table, key, TABLE_COLUMNS, tableDefaults());
    saveTableState();
    renderKeepingWorkspacePosition();
  }));
}
