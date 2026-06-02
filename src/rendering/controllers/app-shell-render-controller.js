export function createAppShellRenderController(getDeps) {
  const current = () => getDeps();

  function render() {
    const { hideAppServiceTooltip, hideFloatingChartTooltipNow, recompute, renderError, setTimeoutRef, showBusy, state, updateAnomalyAlertState, hideBusy } = current();
    showBusy();
    hideAppServiceTooltip();
    hideFloatingChartTooltipNow();
    if (state.analysisDirty) recompute();
    updateAnomalyAlertState();
    const doRender = () => {
      try {
        renderSync();
      } catch (error) {
        renderError(error);
      }
      hideBusy();
    };
    setTimeoutRef(doRender, 16);
  }

  function renderSync() {
    const {
      APP_VERSION,
      anomalyStatusClass,
      bindEvents,
      detectTrends,
      document,
      drawBdpWindowCharts,
      drawChart,
      drawFixCharts,
      drawJvmCharts,
      escapeHtml,
      formatNumber,
      hideBusy,
      html,
      icons,
      initCodeMirror,
      localStorage,
      renderAnalysisPage,
      renderBdpWindowPanel,
      renderChartAnnotationMenu,
      renderChartsGlobalToolbar,
      renderChartsPage,
      renderDashboardStudioInline,
      renderDrawer,
      renderFixLatencyPanel,
      renderFocusView,
      renderGuide,
      renderIngestPage,
      renderInvestigationContext,
      renderJvmGcPanel,
      renderModal,
      renderOnboarding,
      scheduleAnomalyBadgeSettle,
      scheduleChartPageDraw,
      scheduleIpIntelEnrichment,
      staggerReveal,
      animateCounters,
      positionTabIndicator,
      positionTourCard,
      state,
      window
    } = current();
    const app = document.querySelector("#app");
    const newHtml = html`
    ${state.onboarding >= 0 ? renderOnboarding() : ""}
    <a href="#main-content" class="skip-link">Skip to content</a>
    <div class="app-shell view-${state.view}" role="application" aria-label="Ultimate Network Expert">
      <header class="topbar" role="banner">
        <div class="title">
          <div class="brand tcp-brand" title="TCP packets travelling between peers">
          <span class="brand-node n1"></span>
          <span class="brand-node n2"></span>
          <span class="brand-link l1"></span>
          <span class="brand-packet p1"></span>
          <span class="brand-packet p2"></span>
          </div>
          <div>
            <h1>
              Ultimate Network Expert
              <button class="version-pill" data-action="showSplash" title="Show product splash screen and version" aria-label="Show Ultimate Network Expert version">v${escapeHtml(APP_VERSION)}</button>
              <button class="app-title-info" type="button" data-action="showSplash" title="About Ultimate Network Expert" aria-label="Open application details">
                <i class="ri-information-line"></i>
              </button>
            </h1>
          </div>
        </div>
        <div class="top-actions">
          <div class="app-tabs" role="tablist" aria-label="Main navigation">
            <span id="inlineBusy" class="inline-busy" aria-live="assertive" aria-atomic="true"><span class="busy-spinner-sm"></span> Analyzing...</span>
            <span id="inlineReport" class="inline-busy" aria-live="assertive" aria-atomic="true"><span class="busy-spinner-sm"></span> Generating report...</span>
            ${[
              ["ingest", "Import", "ri-upload-2-line"],
              ["analysis", "Analysis", "ri-stethoscope-line"],
              ["charts", "Monitoring", "ri-line-chart-line"],
              ["guide", "Guide", "ri-book-open-line"]
            ].map(([key, label, icon]) => `<button class="app-tab ${state.view === key ? "active" : ""}" data-view="${key}" role="tab" aria-selected="${state.view === key}"><i class="${icon}"></i><span>${label}</span></button>`).join("")}
            <span class="app-tab-indicator" id="tabIndicator"></span>
          </div>
          <span class="status-pill"><span class="dot"></span>${state.sockets.length} sockets parsed</span>
          <span class="status-pill anomaly-status ${anomalyStatusClass()}">${state.anomalies.length ? icons.incidentWarning : ""}${formatNumber(state.anomalies.length)} anomalies</span>
          ${(() => { const trends = detectTrends(); return trends.length ? `<span class="status-pill trend-badge" title="${trends.map(item => item.metric + " overflow in ~" + item.eta + " min").join(", ")}"><i class="ri-timer-flash-line" style="color:#ff9f43"></i> ${trends.length} trend${trends.length > 1 ? "s" : ""}</span>` : ""; })()}
          ${state.sockets.length ? `<button class="icon reset-workspace-btn" data-action="requestResetWorkspace" title="Reset workspace" aria-label="Reset workspace">${icons.resetWorkspace}</button>` : ""}
          <button class="icon" data-action="undo" title="Undo (Ctrl+Z)" aria-label="Undo" ${!state._undoStack?.length ? 'disabled style="opacity:0.3"' : ""}><i class="ri-arrow-go-back-line"></i></button>
          <button class="icon" data-action="redo" title="Redo (Ctrl+Y)" aria-label="Redo" ${!state._redoStack?.length ? 'disabled style="opacity:0.3"' : ""}><i class="ri-arrow-go-forward-line"></i></button>
          <button class="icon" data-action="togglePresentation" title="Presentation mode (hide controls, enlarge charts)" aria-label="Toggle presentation mode"><i class="ri-slideshow-line"></i></button>
          <button class="theme-toggle" data-action="toggleTheme" title="Toggle light/dark mode" aria-label="Toggle theme"><span class="theme-toggle-track"><i class="ri-sun-line"></i><i class="ri-moon-line"></i><span class="theme-toggle-thumb ${state.prefs.theme === "light" ? "" : "dark"}"></span></span></button>
          <div class="gear-menu-wrap">
            <button class="icon gear-btn ${state.gearMenuOpen ? "is-open" : ""}" data-action="toggleGearMenu" title="Settings" aria-label="Settings" aria-haspopup="true"><i class="ri-settings-3-line"></i></button>
            ${state.gearMenuOpen ? `<div class="gear-dropdown" role="menu"><button role="menuitem" data-action="prefs"><i class="ri-equalizer-line"></i> Settings</button><button role="menuitem" data-action="showShortcuts"><i class="ri-keyboard-box-line"></i> Keyboard shortcuts</button><button role="menuitem" data-action="startTour"><i class="ri-compass-3-line"></i> Guided tour</button></div>` : ""}
          </div>
        </div>
      </header>
      <nav class="breadcrumb" aria-label="Navigation">${state.view === "ingest" ? "Import" : state.view === "analysis" ? `Analysis -> <button class="breadcrumb-dropdown-trigger" data-action="toggleBreadcrumbMenu">${state.activeTab} <i class="ri-arrow-down-s-line"></i></button>${state.breadcrumbMenuOpen ? `<div class="breadcrumb-menu">${["quality","diagnosis","advisor","templates","map","conversations","expert","timeline","alerts","compare","sockets","groups","anomalies","fields"].map(tab => `<button data-tab="${tab}" class="${tab === state.activeTab ? "active" : ""}">${tab}</button>`).join("")}</div>` : ""}` : state.view === "charts" ? `Monitoring -> <button class="breadcrumb-dropdown-trigger" data-action="toggleBreadcrumbMenu">${state.chartsTab === "charts" ? "Metrics" : state.chartsTab === "bdp" ? "BDP" : state.chartsTab === "jvm" ? "JVM Stall" : state.chartsTab === "fix" ? "FIX Latency" : state.chartsTab === "focus" ? "Focus" : "Advisor"} <i class="ri-arrow-down-s-line"></i></button>${state.breadcrumbMenuOpen ? `<div class="breadcrumb-menu"><button data-charts-tab="charts">Metrics</button><button data-charts-tab="bdp">BDP</button><button data-charts-tab="jvm">JVM Stall</button><button data-charts-tab="fix">FIX Latency</button></div>` : ""}` : "Guide"}</nav>
      ${state.view !== "charts" ? renderInvestigationContext() : ""}
      ${state.view === "ingest" ? `<main id="main-content" class="workspace wide" role="main">${renderIngestPage()}</main>` : ""}
      ${state.view === "analysis" ? `<main id="main-content" class="workspace wide" role="main">${renderAnalysisPage()}</main>` : ""}
      ${state.view === "charts" ? `<main id="main-content" class="workspace wide" role="main">
        <nav class="charts-sub-tabs" role="tablist">
          <button class="charts-sub-tab ${state.chartsTab === "charts" ? "active" : ""}" data-charts-tab="charts" role="tab" aria-selected="${state.chartsTab === "charts"}">Metrics</button>
          <button class="charts-sub-tab ${state.chartsTab === "bdp" ? "active" : ""}" data-charts-tab="bdp" role="tab" aria-selected="${state.chartsTab === "bdp"}">BDP & Throughput</button>
          ${state.jvmGc.pauses.length ? `<button class="charts-sub-tab ${state.chartsTab === "jvm" ? "active" : ""}" data-charts-tab="jvm" role="tab" aria-selected="${state.chartsTab === "jvm"}">JVM Stall / GC</button>` : ""}
          ${state.fixLatency.records.length ? `<button class="charts-sub-tab ${state.chartsTab === "fix" ? "active" : ""}" data-charts-tab="fix" role="tab" aria-selected="${state.chartsTab === "fix"}">FIX Latency</button>` : ""}
          <button class="charts-sub-tab ${state.chartsTab === "advisor" ? "active" : ""}" data-charts-tab="advisor" role="tab" aria-selected="${state.chartsTab === "advisor"}">Advisor</button>
          ${state.selectedId ? `<button class="charts-sub-tab ${state.chartsTab === "focus" ? "active" : ""}" data-charts-tab="focus" role="tab" aria-selected="${state.chartsTab === "focus"}"><i class="ri-focus-3-line"></i> Focus</button>` : ""}
          ${state.chartsTab === "charts" ? renderDashboardStudioInline() : ""}
        </nav>
        ${state.chartsTab === "charts" ? renderChartsGlobalToolbar() : ""}
        ${state.chartsTab === "charts" ? renderChartsPage() : ""}
        ${state.chartsTab === "bdp" ? renderBdpWindowPanel() : ""}
        ${state.chartsTab === "jvm" ? renderJvmGcPanel() : ""}
        ${state.chartsTab === "fix" ? renderFixLatencyPanel() : ""}
        ${state.chartsTab === "focus" ? renderFocusView() : ""}
        ${state.chartsTab === "advisor" ? renderChartsPage() : ""}
      </main>` : ""}
      ${state.view === "guide" ? `<main class="workspace wide">${renderGuide()}</main>` : ""}
    </div>
    ${!localStorage.getItem("onboarded") && !state.sockets.length && state.view === "ingest" && !state.modal ? `<div class="cmd-palette-overlay" data-action="dismissOnboarding"><div class="cmd-palette" onclick="event.stopPropagation()" style="max-width:500px"><div style="padding:24px;text-align:center"><h2 style="margin:0 0 8px;font-size:20px">Welcome to Ultimate Network Expert</h2><p style="color:var(--muted);margin:0 0 20px">Analyze TCP socket behavior from ss captures with multi-source correlation.</p><div style="display:grid;gap:12px;text-align:left"><div style="display:flex;gap:10px;align-items:center"><span style="width:28px;height:28px;border-radius:50%;background:rgba(59,130,246,0.15);display:flex;align-items:center;justify-content:center;font-weight:700;color:#3b82f6">1</span><span><b>Load data</b> - Open an ss file, or use <b>Auto-detect dir</b> to load ss + GC + vmstat + nstat + FIX at once</span></div><div style="display:flex;gap:10px;align-items:center"><span style="width:28px;height:28px;border-radius:50%;background:rgba(44,198,44,0.15);display:flex;align-items:center;justify-content:center;font-weight:700;color:#2cc62c">2</span><span><b>Analyze</b> - Click Analyze or press Enter. The tool detects anomalies, builds hypotheses, and generates stories.</span></div><div style="display:flex;gap:10px;align-items:center"><span style="width:28px;height:28px;border-radius:50%;background:rgba(255,159,67,0.15);display:flex;align-items:center;justify-content:center;font-weight:700;color:#ff9f43">3</span><span><b>Investigate</b> - Use Diagnosis, Timeline, Charts, and Expert tabs. Press <kbd>Ctrl+K</kbd> to search anything.</span></div></div><button class="primary" data-action="dismissOnboarding" style="margin-top:20px;padding:8px 24px">Got it, let's go</button></div></div></div>` : ""}
    ${state.modal === "shortcuts" ? `<div class="cmd-palette-overlay" data-action="closeCmdPalette"><div class="cmd-palette" onclick="event.stopPropagation()" style="max-width:420px"><div class="cmd-palette-head"><strong style="flex:1">Keyboard shortcuts</strong><kbd>?</kbd></div><div class="cmd-palette-results" style="padding:12px 16px"><table style="width:100%;font-size:13px;border-collapse:collapse"><tbody><tr><td style="padding:4px 0"><kbd>?</kbd></td><td>Show this help</td></tr><tr><td style="padding:4px 0"><kbd>Ctrl+K</kbd></td><td>Command palette</td></tr><tr><td style="padding:4px 0"><kbd>j</kbd> / <kbd>k</kbd></td><td>Next / previous socket</td></tr><tr><td style="padding:4px 0"><kbd>r</kbd></td><td>Reset chart zoom</td></tr><tr><td style="padding:4px 0"><kbd>Esc</kbd></td><td>Close modal / palette</td></tr><tr><td style="padding:4px 0"><kbd>Ctrl+Shift+P</kbd></td><td>Export PDF</td></tr><tr><td style="padding:4px 0"><kbd>Ctrl+Shift+H</kbd></td><td>Export HTML report</td></tr><tr><td style="padding:4px 0"><kbd>Ctrl+Shift+Z</kbd></td><td>Evidence pack ZIP</td></tr><tr><td style="padding:4px 0"><kbd>Ctrl+Shift+J</kbd></td><td>Copy Jira report</td></tr><tr><td style="padding:4px 0"><kbd>Ctrl+Shift+F</kbd></td><td>FIX spikes CSV</td></tr></tbody></table></div></div></div>` : ""}
    ${state.modal === "commandPalette" ? `<div class="cmd-palette-overlay" data-action="closeCmdPalette"><div class="cmd-palette" onclick="event.stopPropagation()"><div class="cmd-palette-head"><i class="ri-search-line"></i><input id="cmdPaletteInput" type="text" placeholder="Search sockets, metrics, commands..." value="${escapeHtml(state.commandPaletteQuery || "")}" autocomplete="off"/><kbd>Esc</kbd></div><div class="cmd-palette-results">${commandPaletteResults()}</div></div></div>` : ""}
    ${renderChartAnnotationMenu()}
    ${renderDrawer()}
    ${renderModal()}
  `;
    if (false && window.Idiomorph) {
      Idiomorph.morph(app, newHtml, { morphStyle: "innerHTML" });
    } else {
      app.innerHTML = newHtml;
    }
    bindEvents();
    staggerReveal();
    positionTabIndicator();
    animateCounters();
    positionTourCard();
    initCodeMirror();
    if (state.view === "charts") scheduleChartPageDraw();
    scheduleAnomalyBadgeSettle();
    scheduleIpIntelEnrichment();
    hideBusy();
  }

  function commandPaletteResults() {
    const { escapeHtml, state } = current();
    const query = (state.commandPaletteQuery || "").toLowerCase();
    if (!query) return "<div class=cmd-palette-hint><i class='ri-command-line' style='font-size:20px;opacity:.4;display:block;margin-bottom:6px'></i>Type to search sockets, metrics, tabs, or commands</div>";
    const results = [];
    const fuzzyHighlight = (text, needle) => {
      let result = "";
      let qi = 0;
      for (let i = 0; i < text.length; i++) {
        if (qi < needle.length && text[i].toLowerCase() === needle[qi]) {
          result += "<mark>" + escapeHtml(text[i]) + "</mark>";
          qi++;
        } else {
          result += escapeHtml(text[i]);
        }
      }
      return qi === needle.length ? result : null;
    };
    state.sockets.filter(socket => (socket.peer + socket.local + socket.state + (socket.details?.process?.name || "")).toLowerCase().includes(query)).slice(0, 5).forEach(socket => {
      const label = socket.local + " -> " + socket.peer;
      const highlighted = fuzzyHighlight(label, query) || escapeHtml(label);
      results.push(`<button data-action="cmdPaletteSelect" data-socket-id="${socket.id}"><i class="ri-plug-line" style="color:var(--cyan)"></i><span>${highlighted}<small style="color:var(--muted);margin-left:6px">${escapeHtml(socket.state)}</small></span><kbd class="cmd-cat">socket</kbd></button>`);
    });
    const tabIcons = { quality:"ri-shield-check-line", diagnosis:"ri-stethoscope-line", advisor:"ri-lightbulb-line", sockets:"ri-plug-line", timeline:"ri-time-line", alerts:"ri-alarm-warning-line", compare:"ri-scales-3-line", groups:"ri-folder-line", anomalies:"ri-error-warning-line", fields:"ri-list-settings-line" };
    ["quality","diagnosis","advisor","sockets","timeline","alerts","compare","groups","anomalies","fields"].filter(tab => tab.includes(query)).forEach((tab, index) => {
      results.push(`<button data-action="cmdPaletteTab" data-tab="${tab}"><i class="${tabIcons[tab] || "ri-layout-grid-line"}" style="color:var(--green)"></i><span>Go to <b>${tab}</b></span><kbd>${index < 9 ? "cmd+" + (index + 1) : ""}</kbd></button>`);
    });
    ["rtt","cwnd","sendQ","recvQ","retrans","rto","pacing_rate","delivery_rate"].filter(metric => metric.toLowerCase().includes(query)).forEach(metric => {
      results.push(`<button data-action="cmdPaletteMetric" data-metric="${metric}"><i class="ri-line-chart-line" style="color:var(--yellow)"></i><span>Chart <b>${metric}</b></span><kbd class="cmd-cat">metric</kbd></button>`);
    });
    return results.length ? results.join("") : "<div class=cmd-palette-hint>No results</div>";
  }

  return {
    render,
    renderSync
  };
}
