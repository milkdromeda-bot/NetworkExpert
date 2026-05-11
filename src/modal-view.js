export function createModalView(context) {
  const {
    state,
    html,
    icons,
    escapeHtml,
    sortedFilteredSockets,
    aliasForEndpoint,
    normalizeAliasStore,
    topologyScopeKey,
    topologyGroupForEndpoint,
    selectedSocket,
    renderSocketDetail,
    renderPrefs,
    renderGuide,
    renderThresholdConfig,
    renderTableSettingsDrawer,
    metricLabel,
    renderColumnChooser,
    renderLayoutPrefs,
    renderPreImportFilters,
    renderFields,
    getColumn,
    columnHelp,
    renderThresholdSummary,
    expertDefaultThresholds,
    annotationSocketId,
    currentSourceAnnotations,
    visibleHistory,
    annotationTypeList,
    buildAnnotationDraft,
    timeLabel,
    annotationAnchorOptions,
    annotationMetricChoices,
    formatMetricValue,
    annotationDefaultLabel,
    annotationTypeLabel,
    chartStats,
    formatNumber,
    renderPercentileDistribution,
    renderDatalist
  } = context;

  function serviceAliasEndpointOptions() {
    const endpoints = new Set();
    for (const socket of sortedFilteredSockets()) {
      if (socket.local) endpoints.add(socket.local);
      if (socket.peer) endpoints.add(socket.peer);
      if (endpoints.size > 2000) break;
    }
    for (const alias of Object.values(state.serviceAliases)) {
      if (alias.endpoint) endpoints.add(alias.endpoint);
    }
    return [...endpoints].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  }
  
  function selectedAliasEndpoint(endpoints) {
    if (state.aliasEditKey && endpoints.includes(state.aliasEditKey)) return state.aliasEditKey;
    const firstAlias = Object.values(state.serviceAliases).find(alias => alias.endpoint)?.endpoint;
    return firstAlias || endpoints[0] || "";
  }
  
  function renderServiceAliasesModal() {
    const endpoints = serviceAliasEndpointOptions();
    const selectedEndpoint = selectedAliasEndpoint(endpoints);
    const alias = aliasForEndpoint(state.serviceAliases, selectedEndpoint) || { label: "", role: "", note: "" };
    const aliases = Object.values(state.serviceAliases).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const suggestions = endpoints.filter(endpoint => !aliasForEndpoint(state.serviceAliases, endpoint)).slice(0, 8);
    return `<div class="service-alias-modal">
      <section class="service-alias-editor">
        <div class="field-card">
          <strong>Endpoint identity</strong>
          <label>Endpoint<input id="aliasEndpoint" list="aliasEndpointOptions" placeholder="10.0.0.5:9100" value="${escapeHtml(selectedEndpoint)}" /></label>
          ${renderDatalist("aliasEndpointOptions", endpoints)}
          <label>Business name<input id="aliasLabel" placeholder="FIX stream - Aggregator A" value="${escapeHtml(alias.label)}" /></label>
          <label>Role / component<input id="aliasRole" placeholder="FIX streaming port, market data, container..." value="${escapeHtml(alias.role)}" /></label>
          <label>Notes<textarea id="aliasNote" class="alias-note" placeholder="Owner, environment, expected traffic, incident hint...">${escapeHtml(alias.note)}</textarea></label>
          <div class="toolbar">
            <button class="primary" data-action="saveServiceAlias"><i class="ri-price-tag-3-line"></i> Save label</button>
            <button data-action="deleteServiceAlias">${icons.trash} Delete label</button>
          </div>
        </div>
        <div class="field-card">
          <strong>Unlabelled endpoints</strong>
          <div class="alias-suggestions">
            ${suggestions.length ? suggestions.map(endpoint => `<button data-alias-pick="${escapeHtml(endpoint)}"><span>${escapeHtml(endpoint)}</span><small>add label</small></button>`).join("") : `<p class="hint">Every visible endpoint already has a label.</p>`}
          </div>
        </div>
      </section>
      <section class="service-alias-list">
        <strong>Saved labels</strong>
        ${aliases.length ? aliases.map(item => `<article class="alias-card">
          <div><b>${escapeHtml(item.label || item.endpoint)}</b><span>${escapeHtml(item.endpoint)}</span></div>
          ${item.role ? `<small>${escapeHtml(item.role)}</small>` : ""}
          ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
          <button data-alias-pick="${escapeHtml(item.endpoint)}"><i class="ri-edit-line"></i> Edit</button>
        </article>`).join("") : `<div class="empty">No saved service labels yet.</div>`}
      </section>
    </div>`;
  }
  
  function topologyMatchOptions() {
    const endpoints = serviceAliasEndpointOptions();
    const hosts = [...new Set(endpoints.map(endpointHost).filter(Boolean))];
    return [...hosts, ...endpoints];
  }
  
  function topologyColorOptions(selected) {
    return ["cyan", "blue", "green", "orange", "pink", "violet"]
      .map(color => `<option value="${color}" ${selected === color ? "selected" : ""}>${color}</option>`)
      .join("");
  }
  
  function renderTopologyModal() {
    const groups = normalizeTopologyProfile(state.topology).groups;
    const selected = groups.find(group => group.id === state.topologyEditId) || null;
    const matchValue = selected?.match || state.topologyDraftMatch || "";
    const suggestions = topologyMatchOptions().filter(Boolean).slice(0, 16);
    return `<div class="topology-modal">
      <section class="topology-editor">
        <article class="field-card">
          <strong>Recording topology</strong>
          <p class="hint">Scope: ${escapeHtml(state.sourceName)}. A host rule such as 192.168.145.115 groups every visible port on that host; IP:port and wildcards are also accepted.</p>
          <label>Group name<input id="topologyName" placeholder="Market data simulators" value="${escapeHtml(selected?.name || "")}" /></label>
          <label>Match hosts or endpoints<input id="topologyMatch" list="topologyMatchOptions" placeholder="192.168.145.115, 192.168.145.204:57067" value="${escapeHtml(matchValue)}" /></label>
          ${renderDatalist("topologyMatchOptions", suggestions)}
          <label>Color<select id="topologyColor">${topologyColorOptions(selected?.color || "cyan")}</select></label>
          <label>Notes<textarea id="topologyNote" class="alias-note" placeholder="Business role, owner, recording-specific context...">${escapeHtml(selected?.note || "")}</textarea></label>
          <div class="toolbar">
            <button class="primary" data-action="saveTopologyGroup"><i class="ri-node-tree"></i> Save group</button>
            <button data-action="deleteTopologyGroup">${icons.trash} Delete group</button>
          </div>
        </article>
        <article class="field-card">
          <strong>Fast host picks</strong>
          <div class="topology-suggestions">
            ${suggestions.slice(0, 10).map(value => `<button data-topology-suggest="${escapeHtml(value)}"><span>${escapeHtml(value)}</span><small>use</small></button>`).join("")}
          </div>
        </article>
      </section>
      <section class="topology-group-list">
        <strong>Groups for this recording</strong>
        ${groups.length ? groups.map(group => `<article class="topology-group-card ${escapeHtml(group.color)}">
          <div><b>${escapeHtml(group.name)}</b><span>${escapeHtml(group.match)}</span></div>
          ${group.note ? `<p>${escapeHtml(group.note)}</p>` : ""}
          <button data-topology-edit="${escapeHtml(group.id)}"><i class="ri-edit-line"></i> Edit</button>
        </article>`).join("") : `<div class="empty">No topology group for this recording yet.</div>`}
      </section>
    </div>`;
  }
  
  function renderModal() {
    const modalTitle = state.modal === "columns" ? "Columns and order"
      : state.modal === "thresholds" ? "Threshold configuration"
        : state.modal === "layout" ? "Chart layout preferences"
          : state.modal === "preImport" ? "Pre-import filters"
            : state.modal === "columnHelp" ? "Column guide"
              : state.modal === "chartStats" ? `${metricLabel(state.statsMetric)} statistics`
                : state.modal === "serviceAliases" ? "Service labels"
                  : state.modal === "topology" ? "Recording topology"
                    : state.modal === "annotation" ? "Annotations"
                      : "ss field documentation";
    const modalBody = state.modal === "columns" ? renderColumnChooser()
      : state.modal === "thresholds" ? renderThresholdConfig()
        : state.modal === "layout" ? renderLayoutPrefs()
          : state.modal === "preImport" ? renderPreImportFilters()
            : state.modal === "columnHelp" ? renderColumnHelpDetail()
              : state.modal === "chartStats" ? renderChartStatsModal()
                : state.modal === "serviceAliases" ? renderServiceAliasesModal()
                  : state.modal === "topology" ? renderTopologyModal()
                    : state.modal === "annotation" ? renderAnnotationModal()
                      : renderFields();
    return html`<div class="modal-backdrop ${state.modal ? "open" : ""}">
      <section class="modal ${state.modal || ""}">
        <header><strong>${modalTitle}</strong><button class="icon" data-action="closeModal">${icons.x}</button></header>
        <div class="body">${modalBody}</div>
      </section>
    </div>`;
  }
  
  function renderColumnHelpDetail() {
    const col = getColumn(state.helpColumn);
    const help = columnHelp(col);
    return `<div class="column-help-detail">
      <article class="field-card">
        <strong>${escapeHtml(col.label)}</strong>
        <p>${escapeHtml(help.summary)}</p>
        <p>${escapeHtml(help.detail)}</p>
        <p><b>Best use:</b> ${escapeHtml(help.use)}</p>
      </article>
      <article class="field-card">
        <strong>Current thresholds</strong>
        ${renderThresholdSummary(help)}
        ${help.metric ? `<p class="hint">${escapeHtml(expertDefaultThresholds[help.metric]?.rationale || "")}</p>` : `<p class="hint">This column is contextual and has no numeric comfort/warning/danger range.</p>`}
      </article>
    </div>`;
  }
  
  function renderAnnotationModal() {
    const socket = selectedSocket();
    const socketId = annotationSocketId();
    const items = currentSourceAnnotations(null, socketId, visibleHistory());
    const types = annotationTypeList();
    const draft = state.annotationDraft || buildAnnotationDraft({ sourceName: state.sourceName, socketId, metric: state.prefs.graphMetric });
    const clickedEpoch = Number(draft.epochMs);
    const cursorAnchor = draft.anchor === "cursor" && Number.isFinite(clickedEpoch)
      ? [{ id: "cursor", label: `Clicked chart point - ${timeLabel(0, clickedEpoch)}`, epochMs: clickedEpoch }]
      : [];
    const anchors = [...cursorAnchor, ...annotationAnchorOptions()];
    const metrics = annotationMetricChoices();
    const context = state.annotationContext;
    return `<div class="annotation-modal">
      <section class="annotation-editor">
        <div class="annotation-context">
          <strong>${socket ? `${escapeHtml(socket.local)} -> ${escapeHtml(socket.peer)}` : "No active socket"}</strong>
          <span class="hint">Attach a note to the current socket, or target one metric so the marker appears only on the related charts.</span>
        </div>
        ${context ? `<div class="annotation-click-context">
          <span class="tooltip-kicker">Chart right-click context</span>
          <strong>${escapeHtml(metricLabel(context.metric))} at ${escapeHtml(timeLabel(0, context.epochMs))}</strong>
          <span>${escapeHtml(formatMetricValue(context.metric, context.value ?? 0))} - marker will be pinned to this exact captured sample.</span>
        </div>` : ""}
        <div class="annotation-grid">
          <label><span>Marker type</span><select id="annotationKind">${types.map(item => `<option value="${item.id}" ${draft.kind === item.id ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>
          <label><span>Target metric</span><select id="annotationMetric">${metrics.map(item => `<option value="${item.value}" ${draft.metric === item.value ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>
          <label><span>Anchor time</span><select id="annotationAnchor">${anchors.map(item => `<option value="${item.id}" ${draft.anchor === item.id ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>
          <label><span>Label</span><input id="annotationLabel" value="${escapeHtml(draft.label || annotationDefaultLabel(draft.kind))}" placeholder="Short label" /></label>
        </div>
        <label class="annotation-note"><span>Analyst note</span><textarea id="annotationNote" rows="4" placeholder="Optional context: failover, queue reset, peer switch, burst start...">${escapeHtml(draft.note || "")}</textarea></label>
        <div class="toolbar annotation-actions">
          <button class="primary" data-action="saveAnnotation">${icons.note} Save annotation</button>
          <button data-action="closeModal">Cancel</button>
        </div>
      </section>
      <section class="annotation-history">
        <div class="annotation-history-head"><strong>Current annotations</strong><span class="hint">${items.length} item(s) on this socket and source</span></div>
        ${items.length ? `<div class="annotation-list">${items.slice().reverse().map(item => `<article class="annotation-item"><header><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(annotationTypeLabel(item.kind))}</span></header><small>${escapeHtml(item.metric === "*" ? "all charts" : metricLabel(item.metric))} * ${escapeHtml(timeLabel(0, item.resolvedEpochMs))}</small>${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}<footer><button class="danger subtle" data-action="deleteAnnotation" data-annotation-id="${escapeHtml(item.id)}" title="Delete this annotation">${icons.trash} Delete</button></footer></article>`).join("")}</div>` : `<div class="empty">No annotation yet for this socket.</div>`}
      </section>
    </div>`;
  }
  function renderChartStatsModal() {
    const metric = state.statsMetric || state.prefs.graphMetric;
    const stats = chartStats(metric);
    if (!stats.count) return `<div class="empty">No visible numeric data for ${escapeHtml(metricLabel(metric))}.</div>`;
    const rows = [
      ["Min", 0, stats.min],
      ["Median", 50, stats.p50],
      ["P95", 95, stats.p95],
      ["P90", 90, stats.p90],
      ["P99", 99, stats.p99],
      ["P99.9", 99.9, stats.p999],
      ["P99.99", 99.99, stats.p9999],
      ["Max", 100, stats.max]
    ];
    return `<div class="chart-stats-layout">
      <article class="stats-summary-card">
        <div>
          <span class="tooltip-kicker">${escapeHtml(metricLabel(metric))}</span>
          <strong>${formatNumber(stats.count)} visible sample(s)</strong>
          <p class="hint">Computed on the current chart window with real captured values, before any visual rendering reduction.</p>
        </div>
        <div class="stats-window">
          <span>${escapeHtml(timeLabel(stats.first?.t || 0, stats.first?.epochMs))}</span>
          <i class="ri-arrow-right-line"></i>
          <span>${escapeHtml(timeLabel(stats.last?.t || 0, stats.last?.epochMs))}</span>
        </div>
      </article>
      <article class="stats-table-card">
        <strong>Percentile table</strong>
        <table class="stats-table">
          <tbody>${rows.map(([label, percentile, value]) => `<tr tabindex="0" data-percentile-row="${percentile}" data-percentile-label="${escapeHtml(label)}" data-percentile-value="${value}"><th>${escapeHtml(label)}</th><td>${formatMetricValue(metric, value)}</td></tr>`).join("")}</tbody>
        </table>
      </article>
      <article class="stats-dist-card">
        <strong>Percentile distribution</strong>
        ${renderPercentileDistribution(metric, stats)}
      </article>
    </div>`;
  }

  return { renderModal, serviceAliasEndpointOptions, selectedAliasEndpoint, renderServiceAliasesModal, renderTopologyModal };
}
