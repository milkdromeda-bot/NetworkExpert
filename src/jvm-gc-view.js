export function renderJvmGcPanelView(deps) {
  const {
    state,
    icons,
    jvmPagedRows,
    renderJvmLegend,
    renderJvmPagination,
    renderJvmSortHeader,
    jvmSeverityClass,
    jvmSeverityLabel,
    jvmStallNature,
    escapeHtml,
    formatNumber,
    preciseDateTimeLabel
  } = deps;

  const gc = state.jvmGc;
  const hasPauses = gc.pauses.length > 0;
  const corr = gc.correlation;
  const summary = corr?.summary;
  const jvmRows = jvmPagedRows(corr?.results || [], gc.safepoints || []);
  return `<section class="panel jvm-gc-panel">
    <div class="panel-head" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:8px 12px">
      <span style="font-weight:700;font-size:13px;color:var(--text);white-space:nowrap">JVM Stall / GC Correlation</span>
      ${hasPauses ? `<button class="jvm-clear-btn" data-action="clearJvmGcLog" title="Clear GC data"><i class="ri-delete-bin-line"></i> Clear</button>` : ""}
      ${hasPauses ? `<span class="jvm-sep"></span><div style="display:flex;gap:4px;margin:0 auto">
        <button class="mini" data-chart-zoom="zoomIn" data-jvm-zoom title="Zoom in">${icons.zoomIn}</button>
        <button class="mini" data-chart-zoom="zoomOut" data-jvm-zoom title="Zoom out">${icons.zoomOut}</button>
        <button class="mini" data-chart-zoom="resetZoom" data-jvm-zoom title="Reset zoom">${icons.reset}</button>
        <button class="mini" data-chart-zoom="panLeft" data-jvm-zoom title="Pan left">${icons.arrowLeft}</button>
        <button class="mini" data-chart-zoom="panRight" data-jvm-zoom title="Pan right">${icons.arrowRight}</button>
      </div><span class="jvm-sep"></span>` : ""}
      <div class="bdp-controls" style="margin-left:auto">

        <label style="margin-left:10px"><span>Severity</span><select id="jvmSeverityFilter"><option value="all"${state.jvmGc.severityFilter === "all" || !state.jvmGc.severityFilter ? " selected" : ""}>All</option><option value="info"${state.jvmGc.severityFilter === "info" ? " selected" : ""} style="color:#39d6d6">? Info+</option><option value="warning"${state.jvmGc.severityFilter === "warning" ? " selected" : ""} style="color:#ffd166">? Warning+</option><option value="warning_high"${state.jvmGc.severityFilter === "warning_high" ? " selected" : ""} style="color:#ff9f43">? Warning high+</option><option value="critical"${state.jvmGc.severityFilter === "critical" ? " selected" : ""} style="color:#ff5c77">? Critical</option></select></label>
        <label style="margin-left:10px"><span>Sync crosshair</span><input id="jvmSyncCrosshair" type="checkbox" ${state.jvmGc.syncCrosshair !== false ? "checked" : ""} style="width:auto;min-height:auto;height:16px"/></label>
        <label style="margin-left:10px"><span>Clock offset (ms)</span><input id="jvmClockOffset" type="number" value="${gc.clockOffsetMs}" step="1" style="width:80px"/></label>
      </div>
    </div>
    <div class="panel-body">
      ${!hasPauses ? `<div class="jvm-gc-import"><p>No GC log loaded. Use <strong>Auto-detect dir</strong> or the <strong>GC</strong> button in the Import tab to load a Java GC log.</p></div>` : `
        <div class="bdp-context-line ${summary?.overallSeverity || "info"}">
          <span class="field-info" tabindex="0" aria-label="Score interpretation" style="position:relative"><i class="ri-information-line"></i><span class="field-info-card" role="tooltip" style="left:0;right:auto"><span class="tooltip-kicker">Correlation score interpretation</span><strong>0.00 - 0.20</strong><p>No correlation. GC pause detected but no TCP symptom change observed in the time window.</p><strong>0.20 - 0.40 (info)</strong><p>Weak temporal correlation. A TCP signal appeared near the pause but counter-evidence or low buffer pressure reduces confidence.</p><strong>0.40 - 0.60 (warning)</strong><p>Moderate correlation. Multiple TCP symptoms (Recv-Q rise, rcv_space drop) coincide with the pause. Buffer pressure is significant.</p><strong>0.60 - 0.80 (warning_high)</strong><p>Strong correlation. Pause + buffer overflow risk + rcv_space collapse. JVM stall is a likely contributor to slow consumer behavior.</p><strong>0.80 - 1.00 (critical)</strong><p>Very strong correlation. Long pause or Full GC + persist/zero-window + confirmed flow disruption. JVM stall is the probable root cause.</p><strong>Counter-evidence reduces score:</strong><p>Pre-existing Recv-Q, retransmissions, RTT spikes, high Send-Q (downstream), or app_limited each subtract 0.15 from the score to avoid false positives.</p></span></span>
          <span class="risk ${escapeHtml(summary?.overallSeverity || "info")}">${escapeHtml(summary?.overallSeverity || "info")}</span>
          <strong>${summary?.correlatedCount || 0} correlated pauses / ${summary?.totalPauses || 0} in window${gc.analysisWindow ? ` (${gc.analysisWindow.filteredPauses}/${gc.analysisWindow.totalPauses} pauses in ss period)` : ""}</strong>
          <em>Max correlation score: ${(summary?.maxScore || 0).toFixed(2)}${gc.analysisWindow?.start ? ` · Analysis window: ${preciseDateTimeLabel(gc.analysisWindow.start)} → ${preciseDateTimeLabel(gc.analysisWindow.end)}` : ""}</em>
          <span style="margin-left:auto;font-size:11px;color:var(--soft)">${summary?.recommendations?.map(r => `<b style="color:${r.severity === "critical" ? "#ff5c77" : r.severity === "warning" ? "#ffd166" : "#39d6d6"}">${escapeHtml(r.severity)}</b> ${escapeHtml(r.text)}`).join(" · ") || ""}</span>
        </div>
        ${gc.cpuCorrelation?.summary ? `<div class="bdp-context-line info" style="margin-top:8px">
          <i class="ri-cpu-line" style="font-size:16px;color:#a78bfa"></i>
          <strong>CPU correlation: ${gc.cpuCorrelation.summary.correlatedCount} GC pause(s) with CPU scheduling issues</strong>
          <em>Max wait: ${gc.cpuCorrelation.summary.maxWaitObserved.toFixed(1)}% · Saturation events: ${gc.cpuCorrelation.summary.cpuSaturationEvents} · High cswch: ${gc.cpuCorrelation.summary.highContextSwitchEvents}</em>
        </div>` : ""}
        ${gc.nstat ? `<div class="bdp-context-line info" style="margin-top:4px">
          <i class="ri-bar-chart-line" style="font-size:16px;color:#7dd3fc"></i>
          <strong>nstat counters</strong>
          <em>Retrans: ${gc.nstat.retransSegs} · Timeouts: ${gc.nstat.timeouts} · ListenDrops: ${gc.nstat.listenDrops} · MemPressure: ${gc.nstat.tcpMemoryPressures} · RcvPruned: ${gc.nstat.rcvPruned}</em>
        </div>` : ""}
        <details style="padding:6px 12px;border-radius:8px;background:rgba(140,183,255,0.06);border:1px solid rgba(140,183,255,0.12);font-size:11px;color:var(--muted);line-height:1.5;margin:0 0 0 0"><summary style="cursor:pointer;color:var(--text);font-weight:600">How to read</summary>
          Each dot is a FIX message with lag > threshold. Dot color = <strong style="color:#ff5c77">correlation strength</strong> (not lag severity). 
          <br/><span style="color:#ff5c77">● critical</span> = strong evidence of network/GC/CPU cause.<br/>
          <span style="color:#ff9f43">● warning_high</span> = moderate-strong evidence.<br/>
          <span style="color:#ffd166">● warning</span> = moderate evidence.<br/>
          <span style="color:#39d6d6">● info</span> = weak.<br/>
          <span style="color:#8c9aab">● none</span> = no cause found (healthy socket at spike time).<br/>
          The scatter plot shows lag (X) vs correlation score (Y) — top-right = high lag with strong cause.
          <br/><strong>Note:</strong> nstat counters are host-wide (all sockets), not per-connection. On a busy host with many connections, nstat retrans may be coincidental — ss per-socket evidence is more reliable.
        </details>
        <div class="jvm-chart-section">
          <div class="bdp-chart-grid jvm-chart-grid">
            <article>
              <div class="bdp-chart-title"><strong>Recv-Q + GC pauses</strong><span>local receiver timeline</span></div>
              <svg class="chart bdp-chart" data-jvm-chart="recvq" role="img" aria-label="JVM GC correlation chart"></svg>
              ${renderJvmLegend("timeline")}
            </article>
            <article>
              <div class="bdp-chart-title"><strong>Pause duration vs Delta Recv-Q</strong><span>scatter</span></div>
              <svg class="chart bdp-chart" data-jvm-chart="scatter" role="img" aria-label="GC pause scatter plot"></svg>
              ${renderJvmLegend("scatter")}
            </article>
          </div>
        </div>
        ${corr?.results?.length > 5 ? `<div style="margin:8px 0"><div class="bdp-chart-title"><strong>Spike density heatmap</strong><span>time x lag</span></div><canvas data-fix-heatmap style="width:100%;height:80px;border-radius:6px;background:rgba(30,42,56,0.6)"></canvas></div>` : ""}
        <div class="jvm-gc-results">
          <div class="jvm-table-head">
            <strong>Correlated JVM stall events</strong>
            <span>${formatNumber(jvmRows.total)} row(s)</span>
          </div>
          ${renderJvmPagination(jvmRows.total, jvmRows.totalPages, jvmRows.start)}
          <div class="table-wrap jvm-table-wrap"><table class="mini-table jvm-gc-table"><thead><tr>
            ${renderJvmSortHeader("time", "Timestamp")}
            ${renderJvmSortHeader("nature", "Stall nature")}
            ${renderJvmSortHeader("id", "GC#")}
            ${renderJvmSortHeader("type", "Type")}
            ${renderJvmSortHeader("cause", "Cause")}
            ${renderJvmSortHeader("duration", "Duration")}
            ${renderJvmSortHeader("score", "Score")}
            ${renderJvmSortHeader("severity", "Severity")}
            ${renderJvmSortHeader("signals", "Signals")}
          </tr></thead><tbody>
            ${jvmRows.rows.map(r => `<tr class="jvm-severity-${escapeHtml(jvmSeverityClass(r.severity))}" data-jvm-row-epoch="${r.timestampMs || r.epochMs || ""}" style="cursor:pointer">
              <td class="mono-cell">${escapeHtml(preciseDateTimeLabel(r.timestampMs))}</td>
              <td><span class="jvm-nature">${escapeHtml(jvmStallNature(r))}</span></td>
              <td>${escapeHtml(String(r.eventId ?? r.pause.id))}</td>
              <td>${escapeHtml(r.pause.type || "-")}</td>
              <td>${escapeHtml(r.pause.cause || "-")}</td>
              <td>${Number(r.durationMs || 0).toFixed(1)} ms</td>
              <td>${Number(r.score || 0).toFixed(2)}</td>
              <td><span class="jvm-severity-pill ${escapeHtml(jvmSeverityClass(r.severity))}">${escapeHtml(jvmSeverityLabel(r.severity))}</span></td>
              <td>${escapeHtml(r.symptoms?.signals?.map(s => s.signal).join(", ") || "-")}</td>
            </tr>`).join("")}
          </tbody></table></div>
          ${renderJvmPagination(jvmRows.total, jvmRows.totalPages, jvmRows.start)}
          
          ${jvmRows.total === 0 ? "<p>No correlated pauses detected. GC pauses did not coincide with TCP symptom changes in the available snapshots.</p>" : ""}
        </div>
      `}
    </div>
  </section>`;

}
