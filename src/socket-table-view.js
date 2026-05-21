export function renderSocketTableView({
  state,
  html,
  escapeHtml,
  renderGridControls,
  renderPagination,
  sortedFilteredSockets,
  pagedRows,
  visibleColumns,
  renderHeader,
  renderRowActions,
  renderTableSettingsTrigger,
  renderTableSettingsMenu
}) {
  if (!state.sockets.length) return `<div class="empty">Paste ss output, then run parsing.</div>`;
  const allRows = sortedFilteredSockets();
  const columns = visibleColumns();
  const ROW_HEIGHT = 32;
  const useVirtual = allRows.length > 200;

  if (useVirtual) {
    const visibleCount = Math.ceil(600 / ROW_HEIGHT) + 4;
    const scrollTop = state.table._scrollTop || 0;
    const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2);
    const endIdx = Math.min(allRows.length, startIdx + visibleCount);
    const topPad = startIdx * ROW_HEIGHT;
    const bottomPad = Math.max(0, (allRows.length - endIdx) * ROW_HEIGHT);
    const slice = allRows.slice(startIdx, endIdx);
    return html`${renderGridControls(allRows.length)}<div class="table-wrap table-wrap--settings table-virtual" data-virtual-table="1" style="max-height:600px;overflow-y:auto"><table>
      <thead><tr><th class="action-head">Actions</th>${columns.map(col => renderHeader(col)).join("")}<th class="table-settings-head">${renderTableSettingsTrigger()}</th></tr></thead>
      <tbody>
        <tr style="height:${topPad}px" aria-hidden="true"></tr>
        ${slice.map(s => `<tr data-socket="${escapeHtml(s.id)}" class="${s.id === state.selectedId ? "selected" : ""}" style="height:${ROW_HEIGHT}px">
          <td>${renderRowActions(s)}</td>
          ${columns.map(col => `<td class="${state.table.pinned.includes(col.key) ? "pinned-cell" : ""}">${col.render(s)}</td>`).join("")}
          <td class="table-settings-cell"></td>
        </tr>`).join("")}
        <tr style="height:${bottomPad}px" aria-hidden="true"></tr>
      </tbody>
    </table>${renderTableSettingsMenu()}</div>`;
  }

  const page = pagedRows(allRows);
  const pager = renderPagination(allRows.length, page.totalPages, page.start);
  const topPager = ["top", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  const bottomPager = ["bottom", "both"].includes(state.prefs.paginationPosition) ? pager : "";
  return html`${renderGridControls(allRows.length)}${topPager}<div class="table-wrap table-wrap--settings"><table>
    <thead><tr><th class="action-head">Actions</th>${columns.map(col => renderHeader(col)).join("")}<th class="table-settings-head">${renderTableSettingsTrigger()}</th></tr></thead>
    <tbody>
      ${page.rows.map(s => `<tr data-socket="${escapeHtml(s.id)}" class="${s.id === state.selectedId ? "selected" : ""}">
        <td>${renderRowActions(s)}</td>
        ${columns.map(col => `<td class="${state.table.pinned.includes(col.key) ? "pinned-cell" : ""}">${col.render(s)}</td>`).join("")}
        <td class="table-settings-cell"></td>
      </tr>`).join("")}
    </tbody>
  </table>${renderTableSettingsMenu()}</div>${bottomPager}`;
}

export function renderTableHeader(col, { state, icons, escapeHtml, renderColumnTooltip }) {
  const sorted = state.table.sortKey === col.key;
  const sortIcon = sorted ? (state.table.sortDir === "asc" ? icons.sortAsc : icons.sortDesc) : icons.sortNeutral;
  const pinned = state.table.pinned.includes(col.key);
  return `<th class="${pinned ? "pinned-head" : ""}" draggable="true" data-col-key="${col.key}">
    <span class="drag-handle" aria-hidden="true">${icons.drag}</span>
    <span class="th-compact">
      <button class="th-sort ${sorted ? "active" : ""}" data-sort="${col.key}">${escapeHtml(col.label)} <span class="sort-indicator ${sorted ? state.table.sortDir : ""}" aria-hidden="true">${sortIcon}</span></button>
    </span>
    <span class="col-tools">
      <button class="mini th-pin ${pinned ? "active" : ""}" data-pin-col="${col.key}" title="${pinned ? "Unpin column" : "Pin column"}" aria-label="${pinned ? "Unpin column" : "Pin column"}">${pinned ? icons.unpin : icons.pin}</button>
    </span>
    ${renderColumnTooltip(col)}
  </th>`;
}
