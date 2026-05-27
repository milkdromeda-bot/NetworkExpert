export function createConfigPanelsRendering(ctx) {
  const {
    state,
    icons,
    PRE_IMPORT_PRESETS,
    EXPERT_DEFAULT_THRESHOLDS,
    TABLE_COLUMNS,
    escapeHtml,
    formatNumber,
    formatMetricNumber,
    metricLabel,
    normalizePreImportFilters,
    renderDatalist,
    chartTooltipOpacity,
    chartMetricList,
    clampChartColumns
  } = ctx;

function renderPreImportFilters() {
  const h = state.filterHistory;
  const f = normalizePreImportFilters();
  const pendingName = state.pendingFile?.name || "";
  return `<div class="pref-grid">
    <article class="field-card">
      ${pendingName ? `<div class="preimport-file-card">
        <i class="ri-file-text-line" aria-hidden="true"></i>
        <div><strong>${escapeHtml(pendingName)}</strong><span>Choose a full import, or narrow the capture while it is read.</span></div>
      </div>` : ""}
      <strong>Optional import-time filters</strong>
      <p class="hint">Use filters only for very large captures or targeted investigations. A full import keeps the complete raw timeline.</p>
      <div class="preimport-presets">
        ${PRE_IMPORT_PRESETS.map(preset => `<button type="button" data-preimport-preset="${preset.id}"><strong>${escapeHtml(preset.label)}</strong><span>${escapeHtml(preset.description)}</span></button>`).join("")}
      </div>
      <div class="preimport-grid">
        <label>Protocol<select id="preProtocol">
          <option value="">tcp + udp + other</option>
          <option value="tcp" ${f.protocol === "tcp" ? "selected" : ""}>tcp / tcp6</option>
          <option value="udp" ${f.protocol === "udp" ? "selected" : ""}>udp / udp6</option>
        </select></label>
        <label>State<select id="preState">
          <option value="">all states</option>
          ${["ESTAB", "LISTEN", "UNCONN", "SYN-SENT", "SYN-RECV", "TIME-WAIT", "CLOSE-WAIT", "FIN-WAIT-1", "FIN-WAIT-2"].map(value => `<option value="${value}" ${f.state === value ? "selected" : ""}>${value}</option>`).join("")}
        </select></label>
        <label>Any port<input id="preAnyPort" list="histAnyPort" placeholder="comma separated" value="${escapeHtml(f.anyPort)}" /></label>
        <label>Source IP<input id="preSrcIp" list="histSrcIp" placeholder="contains" value="${escapeHtml(f.srcIp)}" /></label>
        <label>Dest IP<input id="preDstIp" list="histDstIp" placeholder="contains" value="${escapeHtml(f.dstIp)}" /></label>
        <label>Source port<input id="preSrcPort" list="histSrcPort" placeholder="equals" value="${escapeHtml(f.srcPort)}" /></label>
        <label>Dest port<input id="preDstPort" list="histDstPort" placeholder="equals" value="${escapeHtml(f.dstPort)}" /></label>
      </div>
      ${renderDatalist("histAnyPort", [...h.map(x => x.anyPort), ...h.map(x => x.srcPort), ...h.map(x => x.dstPort)])}
      ${renderDatalist("histSrcIp", h.map(x => x.srcIp))}
      ${renderDatalist("histDstIp", h.map(x => x.dstIp))}
      ${renderDatalist("histSrcPort", h.map(x => x.srcPort))}
      ${renderDatalist("histDstPort", h.map(x => x.dstPort))}
      <div class="toolbar preimport-actions">
        <button class="primary" data-action="startImportAll">${icons.upload} Import full file</button>
        <button data-action="startImportWithFilters"><i class="ri-filter-3-line"></i> Import with filters</button>
        <button data-action="clearFilterHistory">${icons.clear} Clear history</button>
      </div>
    </article>
  </div>`;
}

function renderLayoutPrefs() {
  const l = state.prefs.chartLayout;
  const tooltipOpacity = chartTooltipOpacity();
  const metrics = chartMetricList();
  return `<div class="layout-config">
    <article class="field-card">
      <strong>Grid layout</strong>
      <label>Charts per row<select id="layoutColumns">${[1, 2, 3].map(v => `<option value="${v}" ${clampChartColumns(l.columns) === v ? "selected" : ""}>${v} columns</option>`).join("")}</select></label>
      <label>Panel density<select id="layoutDensity">${["compact", "standard", "tall"].map(v => `<option value="${v}" ${l.density === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label>Preset<select id="layoutPreset">
        <option value="">Choose preset</option>
        <option value="noc">NOC overview: 3 columns, compact</option>
        <option value="deep">Deep diagnosis: 2 columns, tall</option>
        <option value="single">Focused review: 1 column, tall</option>
      </select></label>
    </article>
    <article class="field-card">
      <strong>Chart behavior</strong>
      <label class="check inline"><input id="layoutMainChart" type="checkbox" ${l.mainChart ? "checked" : ""}/> Show main chart</label>
      <label class="check inline"><input id="layoutSharedZoom" type="checkbox" ${l.sharedZoom ? "checked" : ""}/> Shared zoom across charts</label>
      <label class="check inline"><input id="layoutLegend" type="checkbox" ${l.showLegend ? "checked" : ""}/> Show legend/status</label>
      <label class="check inline"><input id="layoutCrosshair" type="checkbox" ${l.showCrosshair ? "checked" : ""}/> Enable crosshair and drag zoom</label>
      <label class="check inline"><input id="layoutSyncCrosshair" type="checkbox" ${l.syncCrosshair !== false ? "checked" : ""}/> Sync crosshairs across charts</label>
      <label class="range-preference"><span>Crosshair tooltip background</span><input id="layoutTooltipOpacity" type="range" min="0.35" max="1" step="0.05" value="${tooltipOpacity}"/><small><b>${Math.round(tooltipOpacity * 100)}%</b> opacity - keeps the chart slightly visible behind the tooltip.</small></label>
      <label class="check inline"><input id="layoutThresholds" type="checkbox" ${l.showThresholds ? "checked" : ""}/> Show threshold lines and colors</label>
      <label class="check inline"><input id="layoutStickyToolbar" type="checkbox" ${l.stickyToolbar ? "checked" : ""}/> Sticky chart controls</label>
    </article>
    <article class="field-card layout-order">
      <strong>Panel order</strong>
      ${metrics.map(metric => `<div class="layout-row"><span>${escapeHtml(metricLabel(metric))}</span><button data-move-chart="${metric}" data-dir="-1">${icons.up} Up</button><button data-move-chart="${metric}" data-dir="1">${icons.down} Down</button></div>`).join("")}
    </article>
    <div class="layout-actions"><button class="primary compact-action" data-action="saveLayout">${icons.saveDisk} Save</button></div>
  </div>`;
}

function renderThresholdConfig() {
  const metrics = Object.keys(state.thresholds).filter(metric => {
    const t = state.thresholds[metric];
    return Number.isFinite(t.warn) || Number.isFinite(t.danger);
  });
  return `<div class="threshold-grid">
    ${metrics.map(metric => {
      const t = state.thresholds[metric];
      return `<article class="field-card threshold-card">
        <strong>${escapeHtml(metricLabel(metric))}</strong>
        <p>Unit: ${escapeHtml(t.unit)} ${t.inverse ? "- lower is worse" : "- higher is worse"}</p>
        <p class="hint">${escapeHtml(t.rationale || EXPERT_DEFAULT_THRESHOLDS[metric]?.rationale || "Expert default based on sustained socket-level symptoms.")}</p>
        <label class="threshold-label comfort-label"><span>Comfort zone (${escapeHtml(t.unit)})</span><input data-threshold="${metric}" data-threshold-key="comfort" inputmode="numeric" value="${formatMetricNumber(metric, t.comfort)}"/></label>
        <label class="threshold-label warning-label"><span><i class="ri-alert-line"></i> Warning zone (${escapeHtml(t.unit)})</span><input data-threshold="${metric}" data-threshold-key="warn" inputmode="numeric" value="${formatMetricNumber(metric, t.warn)}"/></label>
        <label class="threshold-label danger-label"><span><i class="ri-alarm-warning-line"></i> Danger zone (${escapeHtml(t.unit)})</span><input data-threshold="${metric}" data-threshold-key="danger" inputmode="numeric" value="${formatMetricNumber(metric, t.danger)}"/></label>
      </article>`;
    }).join("")}
  </div>`;
}

function renderColumnChooser() {
  const visibleCount = state.table.visible.length;
  return `<div class="column-layout-editor">
    <article class="field-card table-profile-card">
      <div>
        <strong>Named table layouts</strong>
        <p class="hint">Save column order, pinned columns, hidden columns, sort, and page size.</p>
      </div>
      <div class="profile-row">
        <input id="tableLayoutName" placeholder="Layout name" />
        <button class="primary" data-action="saveTableLayout">${icons.saveDisk} Save layout</button>
      </div>
      <div class="profile-list">
        ${state.tableProfiles.length ? state.tableProfiles.map(profile => `<div class="profile-item">
          <span>${escapeHtml(profile.name)}</span>
          <button class="icon" data-load-table-layout="${profile.id}" title="Apply layout"><i class="ri-check-line"></i></button>
          <button class="icon" data-delete-table-layout="${profile.id}" title="Delete layout">${icons.trash}</button>
        </div>`).join("") : `<span class="hint">No saved table layout yet.</span>`}
      </div>
    </article>
    <div class="column-list-head">
      <strong>${formatNumber(visibleCount)} visible columns</strong>
      <span class="hint">Drag cards to reorder. Toggle checkboxes without losing your place.</span>
    </div>
    <div class="field-list column-list">
    ${state.table.order.map((key, index) => {
      const col = getColumn(key);
      const visible = state.table.visible.includes(key);
      const pinned = state.table.pinned.includes(key);
      return `<article class="field-card column-card ${visible ? "" : "muted-card"}" draggable="true" data-col-key="${key}">
        <span class="drag-handle">${icons.drag}</span>
        <label class="check inline"><input type="checkbox" data-visible-col="${key}" ${visible ? "checked" : ""}/> ${escapeHtml(col.label)}</label>
        <div class="toolbar">
          <button class="icon" data-pin-col="${key}" title="${pinned ? "Unpin column" : "Pin column"}">${pinned ? icons.unpin : icons.pin}</button>
          <button class="icon" data-hide-col="${key}" title="Hide column">${icons.hide}</button>
        </div>
      </article>`;
    }).join("")}
    </div>
  </div>`;
}

  return {
    renderPreImportFilters,
    renderLayoutPrefs,
    renderThresholdConfig,
    renderColumnChooser
  };
}
