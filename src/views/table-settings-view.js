import { normalizeColumnSearchQuery, tableColumnControlModels, tableSettingsMenuLayout } from "./table-state.js";

export function renderTableSettingsTrigger({ icons }) {
  return `<button class="icon table-settings-trigger" data-table-settings-menu title="Table columns and sorting" aria-label="Table columns and sorting">${icons.settings}</button>`;
}

export function renderTableSettingsContent({
  includeHead = true,
  state,
  tableColumns,
  tableDefaults,
  icons,
  escapeHtml,
  formatNumber
}) {
  const visibleCount = state.table.visible.length;
  const searchQuery = normalizeColumnSearchQuery(state.tableColumnSearch);
  const controls = tableColumnControlModels(state.table, tableColumns, tableDefaults());
  const matchingCount = controls.reduce((count, control) => count + (!searchQuery || control.searchText.includes(searchQuery) ? 1 : 0), 0);
  return `${includeHead ? `<header class="table-settings-menu-head">
      <strong>${icons.columns} Columns</strong>
      <span>${formatNumber(visibleCount)} visible</span>
    </header>` : `<div class="table-settings-summary"><strong>${formatNumber(visibleCount)} visible columns</strong></div>`}
    <div class="table-settings-actions">
      <button data-table-menu-action="clearSort">${icons.sortNeutral} Reset sort</button>
      <button data-table-menu-action="resetColumns">${icons.reset} Reset columns</button>
    </div>
    <label class="table-settings-search">
      <i class="ri-search-line" aria-hidden="true"></i>
      <input type="search" data-table-column-search placeholder="Find column" value="${escapeHtml(state.tableColumnSearch)}" autocomplete="off" aria-label="Find a column" />
      <button type="button" class="icon table-settings-search-clear" data-table-column-search-clear title="Clear column search" aria-label="Clear column search" ${searchQuery ? "" : "hidden"}>${icons.x}</button>
    </label>
    <div class="table-settings-column-list">
      ${controls.map(({ key, label, searchText, visible, pinned }) => {
        const matchesSearch = !searchQuery || searchText.includes(searchQuery);
        return `<div class="table-column-toggle-row ${visible ? "active" : ""}" data-column-search-text="${escapeHtml(searchText)}" ${matchesSearch ? "" : "hidden"}>
          <button type="button" class="table-column-toggle" data-menu-visible-col="${key}" role="checkbox" aria-checked="${visible ? "true" : "false"}" title="${visible ? "Hide column" : "Show column"}: ${escapeHtml(label)}">
            <span class="filter-toggle-mark" aria-hidden="true"></span>
            <span class="table-column-label">${escapeHtml(label)}</span>
          </button>
          <button type="button" class="table-column-pin ${pinned ? "active" : ""}" data-menu-pin-col="${key}" title="${pinned ? "Unpin column" : "Pin column"}" aria-label="${pinned ? "Unpin column" : "Pin column"}" ${visible ? "" : "disabled"}>${pinned ? icons.unpin : icons.pin}</button>
        </div>`;
      }).join("")}
      <div class="table-settings-empty" data-table-settings-empty ${matchingCount ? "hidden" : ""}>No column found</div>
    </div>`;
}

export function renderTableSettingsDrawer(context) {
  return `<div class="table-settings-drawer">${renderTableSettingsContent({ ...context, includeHead: false })}</div>`;
}

export function renderTableSettingsMenu(context) {
  const { state } = context;
  const pos = state.openTableSettings && state.openTableSettingsPos
    ? `style="left:${state.openTableSettingsPos.left}px;top:${state.openTableSettingsPos.top}px;width:${state.openTableSettingsPos.width}px;height:${state.openTableSettingsPos.height}px"`
    : "";
  return `<div class="row-menu table-settings-menu ${state.openTableSettings ? "open" : ""}" ${pos}>
    ${renderTableSettingsContent(context)}
  </div>`;
}

export function tableSettingsPlacement(button) {
  return tableSettingsMenuLayout({
    viewportWidth: window.innerWidth || 0,
    viewportHeight: window.innerHeight || 0,
    anchorRect: button.getBoundingClientRect()
  });
}

export function applyTableColumnSearchFilter(container, query) {
  const normalizedQuery = normalizeColumnSearchQuery(query);
  let visibleRows = 0;
  container?.querySelectorAll(".table-column-toggle-row").forEach(row => {
    const matches = !normalizedQuery || String(row.dataset.columnSearchText || "").includes(normalizedQuery);
    row.hidden = !matches;
    if (matches) visibleRows += 1;
  });
  container?.querySelectorAll("[data-table-settings-empty]").forEach(empty => {
    empty.hidden = visibleRows > 0;
  });
  container?.querySelectorAll("[data-table-column-search-clear]").forEach(button => {
    button.hidden = !normalizedQuery;
  });
}
