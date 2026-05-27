export function renderFixLatencyPanelView(deps) {
  const {
    state,
    icons,
    computeFixStats,
    fixPagedRows,
    escapeHtml,
    buildMultiSourceSummary,
    formatNumber,
    preciseDateTimeLabel
  } = deps;

  const fix = state.fixLatency;
  const fixTools = (id) => `<span class="chart-card-tools"><button class="mini" data-fix-zoom-chart="${id}" data-fix-zoom-action="zoomIn" title="Zoom in">${icons.zoomIn}</button><button class="mini" data-fix-zoom-chart="${id}" data-fix-zoom-action="zoomOut" title="Zoom out">${icons.zoomOut}</button><button class="mini" data-fix-zoom-chart="${id}" data-fix-zoom-action="resetZoom" title="Reset">${icons.reset}</button><button class="mini" data-fix-zoom-chart="${id}" data-fix-zoom-action="panLeft" title="Pan left">${icons.arrowLeft}</button><button class="mini" data-fix-zoom-chart="${id}" data-fix-zoom-action="panRight" title="Pan right">${icons.arrowRight}</button><button class="mini" data-action="fixPlayback" title="Playback"><i class="${state.fixLatency.playing ? "ri-pause-line" : "ri-play-line"}"></i></button><button class="mini" data-action="expandFixChart" data-fix-chart-id="${id}" title="${fix.expandedChart === id ? "Collapse" : "Expand"}"><i class="${fix.expandedChart === id ? "ri-collapse-diagonal-line" : "ri-expand-diagonal-line"}"></i></button></span>`;
  const hasRecords = fix.records.length > 0;
  const corr = fix.correlation;
  const summary = corr?.summary;
  const stats = hasRecords ? computeFixStats(fix.records) : null;
  const paged = fixPagedRows();
  return `<section class="panel jvm-gc-panel">
    <div class="panel-head" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:8px 12px">
      <span style="font-weight:700;font-size:13px;color:var(--text);white-space:nowrap">FIX Latency Correlation</span>
      

      ${hasRecords ? `<div class="bdp-controls" style="margin-left:auto">
        <label><span>Lag threshold</span><select id="fixThresholdInput" style="width:auto"><option value="1"${fix.threshold===1?" selected":""}>1 ms</option><option value="2"${fix.threshold===2?" selected":""}>2 ms</option><option value="5"${fix.threshold===5?" selected":""}>5 ms (default)</option><option value="10"${fix.threshold===10?" selected":""}>10 ms</option><option value="20"${fix.threshold===20?" selected":""}>20 ms</option><option value="50"${fix.threshold===50?" selected":""}>50 ms</option><option value="100"${fix.threshold===100?" selected":""}>100 ms</option></select></label>
        <label><span>GC window</span><select id="fixGcWindowInput" style="width:auto"><option value="0"${!fix.gcWindowMs?" selected":""}>auto${state.jvmGc.pauses.length ? ` (${Math.round(Math.max(50, (state.jvmGc.pauses.reduce((s,p) => s + (p.durationMs||0), 0) / state.jvmGc.pauses.length) * 2))}ms)` : ""}</option><option value="50"${fix.gcWindowMs===50?" selected":""}>50 ms</option><option value="100"${fix.gcWindowMs===100?" selected":""}>100 ms</option><option value="200"${fix.gcWindowMs===200?" selected":""}>200 ms</option><option value="500"${fix.gcWindowMs===500?" selected":""}>500 ms</option><option value="1000"${fix.gcWindowMs===1000?" selected":""}>1000 ms</option></select></label>
        
        <label style="margin-left:6px"><span>CPUs</span><select id="fixCpuCores" style="width:auto"><option value="0"${!fix.cpuCores?" selected":""}>auto</option><option value="24"${fix.cpuCores===24?" selected":""}>24</option><option value="32"${fix.cpuCores===32?" selected":""}>32</option><option value="48"${fix.cpuCores===48?" selected":""}>48</option><option value="64"${fix.cpuCores===64?" selected":""}>64</option><option value="96"${fix.cpuCores===96?" selected":""}>96</option><option value="128"${fix.cpuCores===128?" selected":""}>128</option></select></label>
      </div>` : ""}
    </div>
    <div class="panel-body">
      <input type="file" id="fixFileInput" accept="*" multiple style="display:none"/>
      <input type="file" id="fixDirInput" webkitdirectory style="display:none"/>
      <input type="file" id="fixVmstatFileInput" accept=".log,.txt,.out" style="display:none"/>
      <input type="file" id="fixNstatFileInput" accept=".log,.txt,.out" style="display:none"/>
      ${!hasRecords ? `<div class="jvm-gc-import"><p>No FIX logs loaded. Use <strong>Auto-detect dir</strong> or the <strong>FIX</strong> button in the Import tab to load FIX connector logs.</p></div>` : `
        <div class="bdp-context-line ${summary?.overallSeverity || "info"}">
          <span class="risk ${escapeHtml(summary?.overallSeverity || "info")}">${escapeHtml(summary?.overallSeverity || "none")}</span>
          <span class="field-info" tabindex="0" style="position:relative"><i class="ri-information-line"></i><span class="field-info-card" role="tooltip" style="left:0;right:auto;min-width:520px;max-height:280px;overflow-y:auto;columns:2;column-gap:18px"><span class="tooltip-kicker">FIX Latency Correlation — How to read</span><strong>Messages</strong><p>Total FIX messages parsed from all loaded files.</p><strong>Spikes</strong><p>Messages where lag (server receive time − tag 52 SendingTime) exceeds the configured threshold. These are the candidates for root-cause investigation.</p><strong>With ss evidence</strong><p>Spikes for which a matching TCP socket was found in the ss snapshots (by IP:port). This means we could inspect the socket state at the time of the spike.</p><strong>Endpoint match %</strong><p>Proportion of spikes where the FIX connection IP:port was found in ss data. 0% means ss was captured on a different host or the socket was not included.</p><strong>Cause breakdown</strong><p><b style="color:#3b82f6">Network</b>: ss shows retransmissions, RTT spike, cwnd collapse, or backoff at spike time.<br/><b style="color:#a855f7">Kernel</b>: nstat shows backlog drops, listen overflows, or RcvQ drops.<br/><b style="color:#ff9f43">CPU</b>: vmstat shows high run queue, CPU saturation, or I/O wait.<br/><b style="color:#2cc62c">GC</b>: a JVM GC pause overlaps the spike.<br/><b style="color:#8c9aab">Unknown</b>: no symptom found in any source — likely application thread-pool scheduling or application-level delay.</p><strong>GC window</strong><p>A FIX spike is attributed to GC if it occurs during the pause or within this window after the pause ends. The JVM connector cannot read the socket during Stop-The-World, and needs time to drain the backlog after resuming. Shorter window = stricter attribution (only spikes very close to the pause). Longer window = catches backlog drain effects.</p><strong>If all causes are Unknown</strong><p>The network is innocent. The TCP socket was healthy at spike time (recvQ=0, retrans=0, RTT stable, cwnd normal). The lag is caused by something above TCP: thread scheduling, GC, or application processing. Load vmstat/nstat to investigate further.</p></span></span>
          <strong>${summary?.totalRecords || 0} messages · ${summary?.totalSpikes || 0} spikes (lag > ${fix.threshold}ms) · ${summary?.correlatedCount || 0} with ss evidence</strong>
          <em>Max score: ${(summary?.maxScore || 0).toFixed(2)} - Endpoint match: ${((summary?.endpointMatchRate || 0) * 100).toFixed(0)}%</em>
          ${stats ? `<span style="margin-left:auto;font-size:11px;color:var(--soft)">Median: ${stats.median.toFixed(1)}ms - P95: ${stats.p95.toFixed(1)}ms - P99: ${stats.p99.toFixed(1)}ms - Max: ${stats.max.toFixed(1)}ms</span>` : ""}
        </div>
        ${summary?.causeCounts ? `<div class="bdp-context-line info" style="margin-top:6px">
          <i class="ri-pie-chart-line" style="font-size:16px;color:#a78bfa"></i>
          <strong>Cause breakdown:</strong>
          <em>Network: ${summary.causeCounts.network} · GC: ${summary.causeCounts.gc || 0} · Kernel: ${summary.causeCounts.kernel} · CPU: ${summary.causeCounts.cpu} · Unknown: ${summary.causeCounts.unknown}</em>
          
          
          
          <span style="margin-left:auto;display:flex;gap:6px">
            ${!fix.vmstat ? '<button class="tiny-btn" data-action="pickFixVmstatFile"><i class="ri-cpu-line"></i> + vmstat</button>' : '<span class="chip" style="font-size:10px"><i class="ri-cpu-line"></i> vmstat ✓</span>'}
            ${!fix.nstat ? '<button class="tiny-btn" data-action="pickFixNstatFile"><i class="ri-bar-chart-line"></i> + nstat</button>' : '<span class="chip" style="font-size:10px"><i class="ri-bar-chart-line"></i> nstat ✓</span>'}
          </span>
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
        </div>
        ${buildMultiSourceSummary(fix)}
        <div class="jvm-chart-section">
          <div class="bdp-chart-grid jvm-chart-grid">
            <article class="${fix.expandedChart === "timeline" ? "fix-chart-expanded" : fix.expandedChart ? "fix-chart-hidden" : ""}">
              <div class="bdp-chart-title"><strong>FIX Lag + ss Recv-Q timeline</strong><span>overlay</span>${fixTools("timeline")}</div>
              <svg class="chart bdp-chart" data-fix-chart="timeline" role="img" aria-label="FIX latency timeline"></svg>
              <div class="chart-legend fix-chart-legend">
                <button class="chart-legend-item ${fix.hiddenSeries.has("lag") ? "is-muted" : ""}" data-fix-series="lag" title="Toggle lag spike dots. Colors indicate correlation severity: critical (strong network/GC cause), warning (moderate), info (weak)."><i style="--legend-color:#ff5c77"></i><span>critical</span></button><button class="chart-legend-item ${fix.hiddenSeries.has("sev_warning_high") ? "is-muted" : ""}" data-fix-series="sev_warning_high" title="Score 0.5-0.7: moderate correlation. Click to toggle."><i style="--legend-color:#ff9f43"></i><span>warning_high</span></button><button class="chart-legend-item ${fix.hiddenSeries.has("sev_warning") ? "is-muted" : ""}" data-fix-series="sev_warning" title="Score 0.3-0.5: weak correlation. Click to toggle."><i style="--legend-color:#ffd166"></i><span>warning</span></button><button class="chart-legend-item ${fix.hiddenSeries.has("sev_info") ? "is-muted" : ""}" data-fix-series="sev_info" title="Score 0.01-0.3: minimal correlation. Click to toggle."><i style="--legend-color:#39d6d6"></i><span>info</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("recvq") ? "is-muted" : ""}" data-fix-series="recvq" title="Toggle Recv-Q area. Shows unread bytes in the socket receive buffer from ss snapshots."><i style="--legend-color:rgba(59,130,246,0.8)"></i><span>Recv-Q</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("gczone") ? "is-muted" : ""}" data-fix-series="gczone" title="Toggle GC freeze zones. Red = JVM Stop-The-World (cannot read socket). Orange = drain window (backlog processing after STW)."><i style="--legend-color:rgba(255,92,119,0.4)"></i><span>GC zones</span></button>
              </div>
            </article>
            <article class="${fix.expandedChart === "scatter" ? "fix-chart-expanded" : fix.expandedChart ? "fix-chart-hidden" : ""}">
              <div class="bdp-chart-title"><strong>Lag vs Correlation Score</strong><span>scatter</span>${fixTools("scatter")}</div>
              <svg class="chart bdp-chart" data-fix-chart="scatter" role="img" aria-label="FIX lag scatter"></svg>
              <div class="chart-legend fix-chart-legend">
                <button class="chart-legend-item ${fix.hiddenSeries.has("sev_critical") ? "is-muted" : ""}" data-fix-series="sev_critical" title="Score 0.7-1.0: strong cause identified. Click to toggle."><i style="--legend-color:#ff5c77"></i><span>critical</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("sev_warning_high") ? "is-muted" : ""}" data-fix-series="sev_warning_high" title="Score 0.5-0.7: moderate correlation. Click to toggle."><i style="--legend-color:#ff9f43"></i><span>warning_high</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("sev_warning") ? "is-muted" : ""}" data-fix-series="sev_warning" title="Score 0.3-0.5: weak correlation. Click to toggle."><i style="--legend-color:#ffd166"></i><span>warning</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("sev_info") ? "is-muted" : ""}" data-fix-series="sev_info" title="Score 0.01-0.3: minimal correlation. Click to toggle."><i style="--legend-color:#39d6d6"></i><span>info</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("sev_none") ? "is-muted" : ""}" data-fix-series="sev_none" title="Score 0: no symptom found. Click to toggle."><i style="--legend-color:#8c9aab"></i><span>none</span></button>
              </div>
            </article>
            ${fix.vmstat ? `<article class="${fix.expandedChart === "vmstat" ? "fix-chart-expanded" : fix.expandedChart ? "fix-chart-hidden" : !fix.nstat ? "fix-chart-expanded" : ""}">
              <div class="bdp-chart-title"><strong>CPU + Run Queue (vmstat)</strong><span>timeline</span>${fixTools("vmstat")}</div>
              <svg class="chart bdp-chart" data-fix-chart="vmstat" role="img" aria-label="vmstat CPU timeline"></svg>
              <div class="chart-legend fix-chart-legend">
                <button class="chart-legend-item ${fix.hiddenSeries.has("us") ? "is-muted" : ""}" data-fix-series="us" title="Toggle user CPU %. Time spent in user-space code."><i style="--legend-color:#3b82f6"></i><span>us%</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("sy") ? "is-muted" : ""}" data-fix-series="sy" title="Toggle system CPU %. Time spent in kernel."><i style="--legend-color:#a855f7"></i><span>sy%</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("ussy") ? "is-muted" : ""}" data-fix-series="ussy" title="Toggle us+sy combined. Application + kernel CPU."><i style="--legend-color:#38bdf8"></i><span>us+sy%</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("wa") ? "is-muted" : ""}" data-fix-series="wa" title="Toggle I/O wait %. CPU idle waiting for disk. High values indicate storage bottleneck."><i style="--legend-color:#ff9f43"></i><span>wa%</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("total") ? "is-muted" : ""}" data-fix-series="total" title="Toggle us+sy+wa total. Combined CPU busy time."><i style="--legend-color:#d4ff00"></i><span>us+sy+wa%</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("blocked") ? "is-muted" : ""}" data-fix-series="blocked" title="Toggle blocked processes (b column). Processes in uninterruptible sleep (usually I/O)."><i style="--legend-color:#f472b6"></i><span>blocked</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("runqueue") ? "is-muted" : ""}" data-fix-series="runqueue" title="Toggle run queue (r column). Processes waiting for CPU. Above CPU count = scheduling contention."><i style="--legend-color:#4ade80"></i><span>runqueue</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("fixmarkers") ? "is-muted" : ""}" data-fix-series="fixmarkers" title="Toggle FIX spike markers. White vertical lines showing when FIX messages had lag > threshold."><i style="--legend-color:#ffffff"></i><span>FIX spikes</span></button>
              </div>
            </article>` : ""}
            ${fix.nstat ? `<article class="${fix.expandedChart === "nstat" ? "fix-chart-expanded" : fix.expandedChart ? "fix-chart-hidden" : ""}">
              <div class="bdp-chart-title"><strong>TCP Drops & Retrans (nstat)</strong><span>timeline</span>${fixTools("nstat")}</div>
              <svg class="chart bdp-chart" data-fix-chart="nstat" role="img" aria-label="nstat counters timeline"></svg>
              <div class="chart-legend fix-chart-legend">
                <button class="chart-legend-item ${fix.hiddenSeries.has("retrans") ? "is-muted" : ""}" data-fix-series="retrans" title="Toggle TcpRetransSegs/s. Retransmitted TCP segments per second — indicates packet loss."><i style="--legend-color:#ff5c77"></i><span>Retrans</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("timeouts") ? "is-muted" : ""}" data-fix-series="timeouts" title="Toggle TcpExtTCPTimeouts/s. TCP retransmission timeouts — severe loss or path failure."><i style="--legend-color:#ff9f43"></i><span>Timeouts</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("backlogdrop") ? "is-muted" : ""}" data-fix-series="backlogdrop" title="Toggle TcpExtTCPBacklogDrop/s. Packets dropped because socket backlog is full — application too slow to accept()."><i style="--legend-color:#a855f7"></i><span>BacklogDrop</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("listendrop") ? "is-muted" : ""}" data-fix-series="listendrop" title="Toggle TcpExtListenDrops/s. Incoming connections dropped — listen queue overflow."><i style="--legend-color:#ffd166"></i><span>ListenDrop</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("rcvqdrop") ? "is-muted" : ""}" data-fix-series="rcvqdrop" title="Toggle TcpExtTCPRcvQDrop/s. Packets dropped from receive queue — kernel memory pressure."><i style="--legend-color:#39d6d6"></i><span>RcvQDrop</span></button>
                <button class="chart-legend-item ${fix.hiddenSeries.has("fixmarkers") ? "is-muted" : ""}" data-fix-series="fixmarkers" title="Toggle FIX spike markers. White vertical lines showing when FIX messages had lag > threshold."><i style="--legend-color:#ffffff"></i><span>FIX spikes</span></button>
              </div>
            </article>` : ""}
          </div>
        </div>
        ${corr?.results?.length > 5 ? `<div style="margin:8px 0"><div class="bdp-chart-title"><strong>Spike density heatmap</strong><span>time x lag</span></div><canvas data-fix-heatmap style="width:100%;height:80px;border-radius:6px;background:rgba(30,42,56,0.6)"></canvas></div>` : ""}
        <div class="jvm-gc-results">
          <div class="jvm-table-head">
            <strong>Correlated FIX latency spikes</strong>
            <span>${formatNumber(paged.total)} spike(s) above ${fix.threshold}ms</span>
            <select id="fixCauseFilter" style="margin-left:auto;font-size:11px;padding:2px 6px;width:150px"><option value="">All causes</option><option value="network"${state.fixTable.causeFilter==="network"?" selected":""}>Network</option><option value="gc"${state.fixTable.causeFilter==="gc"?" selected":""}>GC</option><option value="kernel"${state.fixTable.causeFilter==="kernel"?" selected":""}>Kernel</option><option value="cpu"${state.fixTable.causeFilter==="cpu"?" selected":""}>CPU</option><option value="unknown"${state.fixTable.causeFilter==="unknown"?" selected":""}>Unknown</option></select>
            <span style="font-size:11px;color:var(--muted)">Page ${state.fixTable.page}/${paged.totalPages || 1}</span>
            <button class="tiny-btn" data-action="fixTablePrev" ${state.fixTable.page <= 1 ? "disabled" : ""}>←</button>
            <button class="tiny-btn" data-action="fixTableNext" ${state.fixTable.page >= paged.totalPages ? "disabled" : ""}>→</button>
          </div>
          <div class="table-wrap jvm-table-wrap"><table class="mini-table jvm-gc-table"><thead><tr>
            <th data-fix-sort="time" style="cursor:pointer">Time</th>
            <th data-fix-sort="lag" style="cursor:pointer">Lag (ms)</th>
            <th>Direction</th>
            <th>MsgType</th>
            <th>Symbol</th>
            <th>Endpoint</th>
            <th data-fix-sort="score" style="cursor:pointer">Score</th>
            <th>Severity</th>
            <th data-fix-sort="cause" style="cursor:pointer">Cause</th>
            <th>Signals</th>
          </tr></thead><tbody>
            ${paged.rows.map(r => `<tr class="jvm-severity-${escapeHtml(r.severity || "none")}${r.receiveMs === state.fixTable.selectedEpoch ? " fix-selected-row" : ""}" data-fix-epoch="${r.receiveMs}" style="cursor:pointer">
              <td class="mono-cell">${escapeHtml(preciseDateTimeLabel(r.receiveMs))}</td>
              <td><strong>${r.lagMs.toFixed(1)}</strong></td>
              <td>${escapeHtml(r.direction)}</td>
              <td>${escapeHtml(r.msgType)}</td>
              <td>${escapeHtml(r.symbol)}</td>
              <td class="mono-cell">${escapeHtml(r.endpoint)}</td>
              <td>${r.score.toFixed(2)}</td>
              <td><span class="risk ${escapeHtml(r.severity)}">${escapeHtml(r.severity)}</span></td>
              <td>${escapeHtml(r.cause || "")}</td>
              <td>${r.signals.map(s => `<span class="chip">${escapeHtml(s)}</span>`).join(" ")}</td>
            </tr>`).join("")}
          </tbody></table></div>
        </div>
      `}
    </div>
  </section>`;

}
