export function createModalView(context) {
  const {
    state,
    html,
    icons,
    escapeHtml,
    sortedFilteredSockets,
    aliasForEndpoint,
    aliasListForSource,
    normalizeAliasStore,
    currentApplicationService,
    inferredApplicationService,
    serviceOverrideForSocket,
    normalizeTopologyProfile = profile => ({ groups: Array.isArray(profile?.groups) ? profile.groups : [] }),
    endpointHost = endpoint => String(endpoint || "").replace(/^\[|\]$/g, "").split(":")[0],
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
    metricHelp,
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
    renderDatalist,
    appVersion = "1.0.0.0",
    splashImageUrl = "./images/ultimateNetworkExpert.png"
  } = context;

  function serviceAliasEndpointOptions() {
    const endpoints = new Set();
    for (const socket of sortedFilteredSockets()) {
      if (socket.local) endpoints.add(socket.local);
      if (socket.peer) endpoints.add(socket.peer);
      if (endpoints.size > 2000) break;
    }
    for (const alias of aliasListForSource(state.serviceAliases, state.sourceName)) {
      if (alias.endpoint) endpoints.add(alias.endpoint);
    }
    return [...endpoints].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  }
  
  function selectedAliasTarget(endpoints) {
    if (state.aliasEditKey && endpoints.includes(state.aliasEditKey)) {
      return {
        endpoint: state.aliasEditKey,
        scope: state.aliasEditScope === "global" ? "global" : "source"
      };
    }
    const firstAlias = aliasListForSource(state.serviceAliases, state.sourceName)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    if (firstAlias?.endpoint) return { endpoint: firstAlias.endpoint, scope: firstAlias.scope };
    return { endpoint: endpoints[0] || "", scope: "source" };
  }
  
  function renderServiceAliasesModal() {
    const endpoints = serviceAliasEndpointOptions();
    const selected = selectedAliasTarget(endpoints);
    const selectedEndpoint = selected.endpoint;
    const selectedScope = selected.scope;
    const alias = aliasForEndpoint(state.serviceAliases, selectedEndpoint, state.sourceName, { scope: selectedScope }) || { label: "", role: "", note: "" };
    const aliases = aliasListForSource(state.serviceAliases, state.sourceName).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const suggestions = endpoints.filter(endpoint => !aliasForEndpoint(state.serviceAliases, endpoint, state.sourceName)).slice(0, 8);
    return `<div class="service-alias-modal">
      <section class="service-alias-editor">
        <div class="field-card">
          <strong>Endpoint identity</strong>
          <p class="hint">Scope: ${escapeHtml(state.sourceName || "workspace")}. Labels are local to this recording unless global is explicitly enabled.</p>
          <label>Endpoint<input id="aliasEndpoint" list="aliasEndpointOptions" placeholder="10.0.0.5:9100" value="${escapeHtml(selectedEndpoint)}" /></label>
          ${renderDatalist("aliasEndpointOptions", endpoints)}
          <label>Business name<input id="aliasLabel" placeholder="FIX stream - Aggregator A" value="${escapeHtml(alias.label)}" /></label>
          <label>Role / component<input id="aliasRole" placeholder="FIX streaming port, market data, container..." value="${escapeHtml(alias.role)}" /></label>
          <label>Notes<textarea id="aliasNote" class="alias-note" placeholder="Owner, environment, expected traffic, incident hint...">${escapeHtml(alias.note)}</textarea></label>
          <label class="check alias-scope-check"><input id="aliasGlobal" type="checkbox" ${selectedScope === "global" ? "checked" : ""} /> Use this label globally</label>
          <div class="toolbar">
            <button class="primary" data-action="saveServiceAlias"><i class="ri-price-tag-3-line"></i> Save label</button>
            <button data-action="deleteServiceAlias">${icons.trash} Delete label</button>
          </div>
        </div>
        <div class="field-card">
          <strong>Unlabelled endpoints</strong>
          <div class="alias-suggestions">
            ${suggestions.length ? suggestions.map(endpoint => `<button data-alias-pick="${escapeHtml(endpoint)}" data-alias-scope="source"><span>${escapeHtml(endpoint)}</span><small>add local label</small></button>`).join("") : `<p class="hint">Every visible endpoint already has a label for this recording.</p>`}
          </div>
        </div>
      </section>
      <section class="service-alias-list">
        <strong>Saved labels</strong>
        ${aliases.length ? aliases.map(item => `<article class="alias-card">
          <div><b>${escapeHtml(item.label || item.endpoint)}</b><span>${escapeHtml(item.endpoint)}</span></div>
          <small>${escapeHtml(item.scope === "global" ? "global label" : `recording: ${item.scopeLabel}`)}</small>
          ${item.role ? `<small>${escapeHtml(item.role)}</small>` : ""}
          ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
          <button data-alias-pick="${escapeHtml(item.endpoint)}" data-alias-scope="${escapeHtml(item.scope)}"><i class="ri-edit-line"></i> Edit</button>
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

  function serviceOverrideSocket() {
    const id = state.serviceOverrideSocketId || state.activeContextId || state.selectedId || "";
    return sortedFilteredSockets().find(socket => socket.id === id) || selectedSocket() || sortedFilteredSockets()[0] || null;
  }

  function renderServiceOverrideModal() {
    const socket = serviceOverrideSocket();
    if (!socket) return `<div class="empty">No socket selected.</div>`;
    const inferred = inferredApplicationService(socket);
    const current = currentApplicationService(socket);
    const override = serviceOverrideForSocket(state.serviceOverrides, socket, state.sourceName, inferred);
    const side = inferred?.side || "peer";
    const endpoint = side === "local" ? socket.local : socket.peer;
    const port = inferred?.port || Number(side === "local" ? socket.localAddress?.port : socket.peerAddress?.port) || "";
    const transport = inferred?.transport || (String(socket.family || "tcp").includes("udp") ? "udp" : "tcp");
    const selectedTarget = override?.target || "port";
    const selectedScope = override?.scope || "source";
    const hidden = Boolean(override?.hidden);
    const label = override && !hidden ? override.label : "";
    return `<div class="service-override-modal">
      <article class="field-card">
        <strong>Current classification</strong>
        <p class="hint">${escapeHtml(socket.local)} -> ${escapeHtml(socket.peer)}</p>
        <div class="service-override-current">
          <span><b>Inferred</b>${inferred ? `${escapeHtml(inferred.label)} on ${escapeHtml(inferred.side)} port ${escapeHtml(inferred.port)}` : "none"}</span>
          <span><b>Shown</b>${current ? escapeHtml(current.source === "suppressed" ? "service hidden" : current.label) : "none"}</span>
        </div>
      </article>
      <article class="field-card">
        <strong>Service classification override</strong>
        <p class="hint">Scope: ${escapeHtml(state.sourceName || "workspace")}. Use a recording rule for cases like stunnel on 9200; keep global only for conventions that are truly stable.</p>
        <label>Service name<input id="serviceOverrideLabel" placeholder="stunnel" value="${escapeHtml(label)}" ${hidden ? "disabled" : ""} /></label>
        <label>Apply to<select id="serviceOverrideTarget">
          <option value="port" ${selectedTarget === "port" ? "selected" : ""}>All ${escapeHtml(transport)} port ${escapeHtml(port)} in this recording</option>
          <option value="endpoint" ${selectedTarget === "endpoint" ? "selected" : ""}>Only endpoint ${escapeHtml(endpoint)}</option>
        </select></label>
        <input id="serviceOverrideEndpoint" type="hidden" value="${escapeHtml(endpoint)}" />
        <input id="serviceOverridePort" type="hidden" value="${escapeHtml(port)}" />
        <input id="serviceOverrideTransport" type="hidden" value="${escapeHtml(transport)}" />
        <label>Notes<textarea id="serviceOverrideNote" class="alias-note" placeholder="Why the port heuristic is wrong here...">${escapeHtml(override?.note || "")}</textarea></label>
        <label class="check alias-scope-check"><input id="serviceOverrideHidden" type="checkbox" ${hidden ? "checked" : ""} /> Hide inferred service instead of renaming it</label>
        <label class="check alias-scope-check"><input id="serviceOverrideGlobal" type="checkbox" ${selectedScope === "global" ? "checked" : ""} /> Use this override globally</label>
        <div class="toolbar">
          <button class="primary" data-action="saveServiceOverride"><i class="ri-check-line"></i> Save override</button>
          <button data-action="deleteServiceOverride">${icons.trash} Delete override</button>
        </div>
      </article>
    </div>`;
  }

  function renderResetWorkspaceModal() {
    return `<div class="reset-workspace-modal">
      <div class="reset-workspace-hero">
        <span class="reset-workspace-icon">${icons.resetWorkspace || icons.reset || icons.trash}</span>
        <div>
          <strong>Start from a clean workspace?</strong>
          <p>This clears imported sockets, anomalies, filters, zoom, charts selection, current investigation, and temporary UI state.</p>
        </div>
      </div>
      <div class="reset-workspace-keep">
        <strong>Kept</strong>
        <span>Saved preferences, thresholds, labels, service classifications, and topology rules stay available.</span>
      </div>
      <div class="modal-actions reset-workspace-actions">
        <button data-action="closeModal">Cancel</button>
        <button class="danger" data-action="confirmResetWorkspace">${icons.resetWorkspace || icons.reset || icons.trash}<span>Reset workspace</span></button>
      </div>
    </div>`;
  }

  function renderSplashModal() {
    return `<div class="splash-modal">
      <figure class="splash-art">
        <img src="${escapeHtml(splashImageUrl)}" alt="Ultimate Network Expert splash screen" loading="lazy" />
      </figure>
      <section class="splash-meta">
        <div>
          <span>Product version</span>
          <strong>v${escapeHtml(appVersion)}</strong>
        </div>
        <p>Ultimate Network Expert turns Linux <code>ss</code> evidence into socket diagnostics, timelines, conversations, and actionable network hypotheses.</p>
      </section>
    </div>`;
  }
  
  function renderModal() {
    const modalTitle = state.modal === "columns" ? "Columns and order"
      : state.modal === "thresholds" ? "Threshold configuration"
        : state.modal === "layout" ? "Chart layout preferences"
          : state.modal === "preImport" ? "Import options"
            : state.modal === "columnHelp" ? "Column intelligence"
              : state.modal === "metricHelp" ? "Metric intelligence"
                : state.modal === "chartStats" ? `${metricLabel(state.statsMetric)} statistics`
                  : state.modal === "serviceAliases" ? "Service labels"
                    : state.modal === "serviceOverride" ? "Service classification"
                      : state.modal === "topology" ? "Recording topology"
                        : state.modal === "annotation" ? "Annotations"
                          : state.modal === "resetWorkspace" ? "Reset workspace"
                          : state.modal === "splash" ? "Ultimate Network Expert"
                          : "ss field documentation";
    const modalBody = state.modal === "columns" ? renderColumnChooser()
      : state.modal === "thresholds" ? renderThresholdConfig()
        : state.modal === "layout" ? renderLayoutPrefs()
          : state.modal === "preImport" ? renderPreImportFilters()
            : state.modal === "columnHelp" ? renderColumnHelpDetail()
              : state.modal === "metricHelp" ? renderMetricHelpDetail()
                : state.modal === "chartStats" ? renderChartStatsModal()
                  : state.modal === "serviceAliases" ? renderServiceAliasesModal()
                    : state.modal === "serviceOverride" ? renderServiceOverrideModal()
                      : state.modal === "topology" ? renderTopologyModal()
                        : state.modal === "annotation" ? renderAnnotationModal()
                          : state.modal === "resetWorkspace" ? renderResetWorkspaceModal()
                          : state.modal === "splash" ? renderSplashModal()
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

  function renderMetricHelpDetail() {
    const help = metricHelp(state.helpMetric);
    return `<div class="column-help-detail metric-help-detail">
      <article class="field-card">
        <span class="tooltip-kicker">Monitoring metric</span>
        <strong>${escapeHtml(help.label)}</strong>
        <p>${escapeHtml(help.summary)}</p>
        <p><b>Source:</b> ${escapeHtml(help.source)}</p>
        <p><b>Unit:</b> ${escapeHtml(help.unit)}</p>
      </article>
      <article class="field-card">
        <strong>Current thresholds</strong>
        ${renderThresholdSummary({ metric: help.metric, threshold: help.threshold })}
        <p class="hint">${escapeHtml(help.rationale)}</p>
      </article>
      <article class="field-card metric-help-correlations">
        <strong>Correlate with</strong>
        <div class="chart-tooltip-correlate"><span>${help.correlations.map(item => `<em>${escapeHtml(item)}</em>`).join("")}</span></div>
      </article>
    </div>`;
  }

  return { renderModal, serviceAliasEndpointOptions, selectedAliasTarget, renderServiceAliasesModal, renderServiceOverrideModal, renderTopologyModal };
}
