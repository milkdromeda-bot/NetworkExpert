export function renderSsEditorThemePicker({
  state,
  escapeHtml,
  normalizeSsEditorTheme,
  ssEditorThemes
}) {
  const currentTheme = normalizeSsEditorTheme(state.prefs.ssEditorTheme);
  const currentLabel = ssEditorThemes.find(theme => theme.id === currentTheme)?.label || "Pastel";
  return `<div class="ss-theme-picker ${state.openSsEditorThemeMenu ? "open" : ""}" data-ss-theme-picker>
    <span>Theme</span>
    <button type="button" class="ss-theme-toggle" data-action="toggleSsEditorThemeMenu" aria-haspopup="listbox" aria-expanded="${state.openSsEditorThemeMenu ? "true" : "false"}" title="Preview ss editor themes">
      <strong>${escapeHtml(currentLabel)}</strong>
      <i class="ri-arrow-down-s-line"></i>
    </button>
    <div class="ss-theme-menu" role="listbox" aria-label="SS editor color theme">
      ${ssEditorThemes.map(theme => `<button type="button" role="option" data-ss-editor-theme-preview="${escapeHtml(theme.id)}" aria-selected="${currentTheme === theme.id ? "true" : "false"}" class="${currentTheme === theme.id ? "active" : ""}" title="${escapeHtml(theme.title)}">${escapeHtml(theme.label)}</button>`).join("")}
    </div>
  </div>`;
}

export function renderIngestEditor(deps) {
  const { state } = deps;
  const editorThemePicker = renderSsEditorThemePicker(deps);
  if (!state.raw && !state.showEditor) {
    return `<div class="drop-zone" id="fileDropZone">
        <p style="margin:0 0 16px;color:var(--soft)">Upload ss capture in .txt, .log, .gz, or .zip format</p>
        <i class="ri-upload-cloud-2-fill drop-icon"></i>
        <span class="drop-label">Drag & Drop</span>
        <small style="margin-top:6px;color:var(--muted);font-size:11px">Drop 2 files to auto-compare (1st = baseline, 2nd = incident)</small>
        <span class="drop-or">or</span>
        <button class="drop-btn" data-action="pickFile"><i class="ri-lock-line"></i> Select a file</button>
        <button data-action="showRawEditor" style="margin-top:18px;background:none!important;border:none!important;box-shadow:none!important;color:var(--muted);font-size:12px;text-decoration:underline;cursor:pointer">or paste raw text</button>
      </div>`;
  }
  return `<div class="cm-search-hints">
        <span>Quick find:</span>
        <button data-cm-search="ESTAB">ESTAB</button>
        <button data-cm-search="CLOSE-WAIT">CLOSE-WAIT</button>
        <button data-cm-search="TIME-WAIT">TIME-WAIT</button>
        <button data-cm-search="backoff">backoff</button>
        <button data-cm-search="retrans">retrans</button>
        <button data-cm-search="skmem">skmem</button>
        <button data-cm-search="rtt:">rtt:</button>
        <button data-cm-search="rto:">rto:</button>
        <button data-cm-search="cwnd:">cwnd:</button>
        <button data-cm-search="drops">d[1-9]</button>
        <span style="margin-left:auto">${editorThemePicker}</span>
      </div>
      <div id="cmContainer" class="cm-container"></div>`;
}

export function renderImportStatus({ state, escapeHtml }) {
  if (!state.importStatus) return "";
  return `<div class="import-status" role="status" aria-live="polite">
    <strong>${escapeHtml(state.importStatus.title)}</strong>
    <span>${escapeHtml(state.importStatus.detail)}</span>
    <progress value="${escapeHtml(state.importStatus.progress ?? 0)}" max="100"></progress>
  </div>`;
}

export function renderIngestPage(deps) {
  const {
    state,
    html,
    icons,
    escapeHtml,
    formatNumber,
    commandCoverage,
    ssOptions,
    selectedSsOption,
    normalizeSsEditorTheme,
    renderSsCommandBuilder,
    renderSsOptionChip,
    renderSsOptionControl,
    renderSsOptionDetail
  } = deps;
  const coverage = commandCoverage(state.command, ssOptions);
  const active = coverage.filter(option => option.active);
  const best = ["-H", "-O", "-n", "-t", "-e", "-p", "-m", "-i", "--tos", "--cgroup", "--inet-sockopt", "-a", "-A"];
  const featuredOptions = ssOptions.filter(option => best.includes(option[0]) || best.includes(option[1]));
  const selectedOption = selectedSsOption(featuredOptions, active);
  const activePanel = state.showSsOptions ? "capture" : null;
  const editorTheme = normalizeSsEditorTheme(state.prefs.ssEditorTheme);
  const correlationCount = (state.jvmGc.pauses.length ? 1 : 0) + (state.fixLatency.vmstat?.length ? 1 : 0) + (state.fixLatency.nstat?.length ? 1 : 0) + (state.sar?.cpu?.length ? 1 : 0) + (state.fixLatency.records.length ? 1 : 0) + (state.peerCapture.sockets.length ? 1 : 0);
  return html`
    <section class="ingest-hero">
      <div style="display:flex;align-items:center;gap:12px">
        <h2 style="margin:0">Import</h2>
        <span style="font-size:11px;color:var(--muted)">Supported: <strong>ss</strong> / <strong>GC log</strong> / <strong>vmstat</strong> / <strong>nstat</strong> / <strong>sar</strong> / <strong>FIX logs</strong> - use Auto-detect dir to load all at once</span>
      </div>
    </section>
    <section class="panel ingest-source-panel ss-editor-theme-${escapeHtml(editorTheme)}">
      <div class="panel-head ingest-source-head">
        <div class="panel-title">ss stats to parse</div>
        ${renderImportStatus(deps)}
        <span class="status-pill">${escapeHtml(state.sourceName)}</span>
      </div>
      <div class="panel-body">
        <div class="ingest-toolbar">
          <input id="fileInput" type="file" accept=".txt,.log,.out,.ss,.gz,.zip,text/plain,application/gzip,application/zip" hidden />
          <input id="ingestGcFileInput" type="file" accept=".log,.txt" style="display:none"/>
          <input id="ingestVmstatFileInput" type="file" accept=".log,.txt,.out" style="display:none"/>
          <input id="ingestNstatFileInput" type="file" accept=".log,.txt,.out" style="display:none"/>
          <input id="ingestSarFileInput" type="file" accept=".log,.txt,.out,.sar" style="display:none"/>
          <input id="ingestFixFileInput" type="file" accept=".log,.txt,.gz,.zip" multiple style="display:none"/>
          <input id="ingestFixDirInput" type="file" webkitdirectory style="display:none"/>
          <input id="ingestAutoDir" type="file" webkitdirectory style="display:none"/>
          <input id="ingestPeerSsInput" type="file" accept=".txt,.log,.out,.ss,.gz,.zip" style="display:none"/>
          <button data-action="pickFile" class="primary"><i class="ri-folder-open-line"></i> Open ss file</button>
          <button data-action="pickAutoDir" title="Load a directory - auto-detects all supported file types"><i class="ri-folder-search-line"></i> Auto-detect dir</button>
          <button data-action="toggleCorrelationSources" class="${state.showCorrelationSources ? "active" : ""}${correlationCount ? " chip-loaded" : ""}" title="Add correlation sources (GC, vmstat, sar, nstat, FIX, Peer ss)"><i class="ri-add-circle-line"></i> Sources${correlationCount ? ` (${correlationCount})` : ""}</button>
          <span class="ingest-toolbar-divider"></span>
          <div class="pill-toggle" data-active="${activePanel === "capture" ? "1" : "0"}">
            <div class="pill-slider"></div>
            <button data-action="showEditor" class="${activePanel !== "capture" ? "active" : ""}"><i class="ri-edit-line"></i> Editor</button>
            <button data-action="toggleSsOptions" class="${activePanel === "capture" ? "active" : ""}"><i class="ri-command-line"></i> ss command</button>
          </div>
          <span class="demo-btn-wrap">
            <button data-action="sampleIncidentDemo" class="demo-btn"><i class="ri-fire-line"></i> See it in action</button>
            <div class="demo-tooltip">
              <strong>Multi-Source Correlation Demo</strong>
              <ul>
                <li><i class="ri-exchange-line"></i> FIX price feed with latency spikes (5-50ms)</li>
                <li><i class="ri-recycle-line"></i> GC pauses causing message backlog</li>
                <li><i class="ri-cpu-line"></i> vmstat: CPU runqueue spikes during GC</li>
                <li><i class="ri-bar-chart-line"></i> nstat: retransmissions correlating with lag</li>
                <li><i class="ri-wifi-line"></i> ss: Recv-Q rise + RTT spike on FIX socket</li>
                <li><i class="ri-pie-chart-line"></i> Root cause: GC + Network + CPU breakdown</li>
              </ul>
              <small>Loads ss + GC + vmstat + nstat + FIX data. All tabs activate.</small>
            </div>
          </span>
          <span class="ingest-toolbar-spacer"></span>
          <button data-action="toggleWordWrap" class="${state.editorWordWrap ? "primary" : ""}" title="Toggle word wrap"><i class="ri-text-wrap"></i> Wrap</button>
          <button data-action="clear" class="clear-input-button">${icons.clear} Clear</button>
          <button data-action="parse" title="Re-analyze current text"><i class="ri-play-line"></i> Analyze</button>
        </div>
        ${state.showCorrelationSources ? `<div class="correlation-sources-drawer">
          <div class="correlation-sources-grid">
            <button data-action="pickJvmGcFile" class="source-card ${state.jvmGc.pauses.length ? "loaded" : ""}"><i class="ri-recycle-line"></i><strong>GC log</strong><small>${state.jvmGc.pauses.length ? `${state.jvmGc.pauses.length} pauses` : "JVM stall correlation"}</small></button>
            <button data-action="pickFixVmstatFile" class="source-card ${state.fixLatency.vmstat?.length ? "loaded" : ""}"><i class="ri-cpu-line"></i><strong>vmstat</strong><small>${state.fixLatency.vmstat?.length ? `${state.fixLatency.vmstat.length} samples` : "CPU / scheduling"}</small></button>
            <button data-action="pickSarFile" class="source-card ${state.sar?.cpu?.length ? "loaded" : ""}"><i class="ri-dashboard-line"></i><strong>sar</strong><small>${state.sar?.cpu?.length ? `${state.sar.cpu.length} samples` : "CPU / IO / memory"}</small></button>
            <button data-action="pickFixNstatFile" class="source-card ${state.fixLatency.nstat?.length ? "loaded" : ""}"><i class="ri-bar-chart-line"></i><strong>nstat</strong><small>${state.fixLatency.nstat?.length ? `${state.fixLatency.nstat.length} samples` : "TCP kernel counters"}</small></button>
            <button data-action="pickFixFile" class="source-card ${state.fixLatency.records.length ? "loaded" : ""}"><i class="ri-exchange-line"></i><strong>FIX logs</strong><small>${state.fixLatency.records.length ? `${formatNumber(state.fixLatency.records.length)} records` : "Protocol latency"}</small></button>
            <button data-action="pickPeerSs" class="source-card ${state.peerCapture.sockets.length ? "loaded" : ""}"><i class="ri-links-line"></i><strong>Peer ss</strong><small>${state.peerCapture.sockets.length ? "loaded" : "Remote-side capture"}</small></button>
          </div>
        </div>` : ""}
        ${activePanel === "capture" ? `<div class="ingest-ss-command-panel">
            <div class="capture-flow-card">
              <i class="ri-route-line" aria-hidden="true"></i>
              <div class="capture-flow-copy">
                <strong>Collection first, parsing second</strong>
                <span>Build the <code>ss</code> command before import. <b>Analyze</b> parses the text already in the box.</span>
              </div>
              <button type="button" class="ss-command-example" data-action="loadSsCommandEndpointExample" style="margin-left:auto;white-space:nowrap"><i class="ri-magic-line"></i> Fill endpoint example</button>
            </div>
            ${renderSsCommandBuilder()}
            <div class="command-row">
              <input id="commandInput" value="${escapeHtml(state.command)}" spellcheck="false" />
              <button class="primary" data-action="copySsCommand" title="Copy command">${icons.copy} Copy</button>
            </div>
            <div class="chips">${active.map(renderSsOptionChip).join("") || `<span class="chip">no option detected</span>`}</div>
            <div class="ss-option-card-layout">
              <div class="option-grid" aria-label="ss option toggles">
                ${featuredOptions.map(option => renderSsOptionControl(option, coverage, selectedOption?.key)).join("")}
              </div>
              ${selectedOption ? renderSsOptionDetail(selectedOption) : ""}
            </div>
            </div>
          </div>` : renderIngestEditor(deps)}
      </div>
    </section>

  `;
}
