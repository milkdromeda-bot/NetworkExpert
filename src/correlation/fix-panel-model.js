import { fixSpikeGroups, fixTimeLabel } from "./fix-chart-utils.js";

export function createFixPanelModel(ctx) {
  const {
    state, icons, WorkerCtor, performanceRef, requestAnimationFrameRef, cancelAnimationFrameRef,
    correlateFixLatency, computeFixStats, dropRateSummary, escapeHtml, formatBytesHuman,
    formatNumber, metricValue, parsedTimestampSnapshots, render, renderFixLatencyPanelView,
    preciseDateTimeLabel, getDocument, drawFixCharts, syncFixCrosshairs
  } = ctx;

  function runFixCorrelation(callback) {
    const fix = state.fixLatency;
    if (!fix.records.length) { fix.correlation = null; if (callback) callback(); return; }
    const snapshots = parsedTimestampSnapshots();
    const history = [];
    for (const snap of snapshots) {
      for (const socket of snap.sockets) {
        history.push({
          epochMs: snap.epochMs,
          peer: socket.peer || '',
          local: socket.local || '',
          recvQ: metricValue(socket, 'recvQ') || 0,
          sendQ: metricValue(socket, 'sendQ') || 0,
          rtt: metricValue(socket, 'rtt') || 0,
          retrans: metricValue(socket, 'retrans') || 0,
          cwnd: metricValue(socket, 'cwnd') || 0,
          backoff: metricValue(socket, 'backoff') || 0,
          'skmem.d': metricValue(socket, 'skmem.d') || 0
        });
      }
    }
    const params = {
      records: fix.records,
      history,
      threshold: fix.threshold,
      vmstatSamples: fix.vmstat,
      nstatSamples: fix.nstat,
      gcPauses: state.jvmGc.correlation?.results?.map(r => ({ ...r.pause, alignedEpochMs: r.epochMs })) || state.jvmGc.pauses,
      gcWindowMs: fix.gcWindowMs || (() => { const pauses = state.jvmGc.pauses; if (!pauses.length) return 200; const durations = pauses.map(p => p.durationMs || 0).filter(d => d > 0); if (!durations.length) return 200; const avg = durations.reduce((s, d) => s + d, 0) / durations.length; return Math.round(Math.max(50, avg * 2)); })(),
      cpuCores: fix.cpuCores
    };
    if (fix.records.length > 10000 && WorkerCtor()) {
      const WorkerClass = WorkerCtor();
      const worker = new WorkerClass(new URL("../parsing/parse-worker.js", import.meta.url), { type: "module" });
      worker.postMessage({ type: "correlateFixLatency", payload: params });
      worker.onmessage = msg => {
        worker.terminate();
        if (msg.data.type === "correlateFixLatency:done") {
          fix.correlation = msg.data.payload;
        }
        if (callback) callback();
        else { render(); setTimeout(drawFixCharts, 50); }
      };
      return;
    }
    fix.correlation = correlateFixLatency(params);
    if (callback) callback();
  }
  
  function fixPagedRows() {
    const fix = state.fixLatency;
    const corr = fix.correlation;
    if (!corr?.results?.length) return { rows: [], total: 0, totalPages: 0, start: 0 };
    const table = state.fixTable;
    let rows = [...corr.results];
    if (table.causeFilter) rows = rows.filter(r => r.cause === table.causeFilter);
    if (table.sortKey === "lag") rows.sort((a, b) => table.sortDir === "desc" ? b.lagMs - a.lagMs : a.lagMs - b.lagMs);
    else if (table.sortKey === "score") rows.sort((a, b) => table.sortDir === "desc" ? b.score - a.score : a.score - b.score);
    else if (table.sortKey === "time") rows.sort((a, b) => table.sortDir === "desc" ? b.receiveMs - a.receiveMs : a.receiveMs - b.receiveMs);
    else if (table.sortKey === "cause") rows.sort((a, b) => table.sortDir === "desc" ? (b.cause || "").localeCompare(a.cause || "") : (a.cause || "").localeCompare(b.cause || ""));
    const total = rows.length;
    const totalPages = Math.ceil(total / table.pageSize);
    const start = (table.page - 1) * table.pageSize;
    return { rows: rows.slice(start, start + table.pageSize), total, totalPages, start };
  }
  
  function renderFixLatencyPanel() {
    return renderFixLatencyPanelView({
      state,
      icons,
      computeFixStats,
      fixPagedRows,
      escapeHtml,
      buildMultiSourceSummary,
      formatNumber,
      preciseDateTimeLabel
    });
  }

  function renderWhatIfSimulation() {
    const rows = state.history;
    if (!rows || rows.length < 2) return "";
    const drops = dropRateSummary(rows);
    if (!drops || !drops.totalDropDelta) return "";
    const socket = state.sockets.find(s => s.id === state.selectedId) || state.sockets[0];
    if (!socket) return "";
    const currentRb = metricValue(socket, "skmem.rb") || 212992;
    const currentRcvSpace = metricValue(socket, "rcv_space") || 65536;
    const multiplier = state.whatIfMultiplier || 2;
    // Estimate: drops happen when recvQ > rcv_space. With bigger buffer, fewer overflows.
    let dropsAvoided = 0;
    const threshold = currentRcvSpace;
    const newThreshold = threshold * multiplier;
    for (let i = 1; i < rows.length; i++) {
      const recvQ = rows[i].recvQ || rows[i]["recvQ"] || 0;
      if (recvQ > threshold && recvQ <= newThreshold) dropsAvoided++;
    }
    const pct = drops.totalDropDelta > 0 ? Math.min(100, Math.round((dropsAvoided / drops.totalDropDelta) * 100)) : 0;
    return `<div class="advisor-whatif" style="margin:8px 0;padding:10px 14px;border-radius:8px;background:rgba(77,222,138,0.06);border:1px solid rgba(77,222,138,0.2)">
      <strong style="color:#4cde8a"><i class="ri-flask-line"></i> What-if simulation</strong>
      <div style="margin-top:6px;font-size:12px;color:var(--text)">
        If <code>rcv_space</code> was <strong><select id="whatIfMultiplier" style="background:var(--panel-2);color:var(--text);border:1px solid var(--line);border-radius:4px;padding:1px 4px;font-size:12px">
          <option value="2"${multiplier===2?" selected":""}>2×</option><option value="4"${multiplier===4?" selected":""}>4×</option><option value="8"${multiplier===8?" selected":""}>8×</option><option value="16"${multiplier===16?" selected":""}>16×</option>
        </select></strong> larger (${formatBytesHuman(currentRcvSpace)} → ${formatBytesHuman(currentRcvSpace * multiplier)}):
        <div style="margin-top:4px;font-size:13px"><strong style="color:${pct > 50 ? "#4cde8a" : pct > 0 ? "#ffd166" : "#8c9aab"}">${pct}%</strong> of drops potentially avoided (${dropsAvoided}/${drops.totalDropDelta})</div>
        <div style="margin-top:2px;font-size:10px;color:var(--muted)">Current skmem.rb=${formatBytesHuman(currentRb)} · Suggested: <code>sysctl net.core.rmem_max=${currentRb * multiplier}</code></div>
      </div>
    </div>`;
  }
  
  let _fixPlaybackTimer = null;
  function toggleFixPlayback() {
    const fix = state.fixLatency;
    if (fix.playing) {
      fix.playing = false;
      if (_fixPlaybackTimer) { cancelAnimationFrameRef(_fixPlaybackTimer); _fixPlaybackTimer = null; }
      return;
    }
    if (!fix.correlation?.results?.length) return;
    fix.playing = true;
    const results = fix.correlation.results;
    const t0 = Math.min(...results.map(r => r.receiveMs));
    const t1 = Math.max(...results.map(r => r.receiveMs));
    const duration = 10000; // 10s playback
    const startReal = performanceRef().now();
    function tick() {
      if (!fix.playing) return;
      const elapsed = performanceRef().now() - startReal;
      const frac = Math.min(1, elapsed / duration);
      const epoch = t0 + frac * (t1 - t0);
      syncFixCrosshairs(epoch, null);
      // Also update heatmap overlay
      getDocument().querySelectorAll("[data-fix-heatmap]").forEach(c => {
        if (c._heatmapCrosshairAttached) {
          const overlay = c.parentElement?.querySelector(".heatmap-overlay");
          if (overlay) overlay.innerHTML = `<div style="position:absolute;left:${frac * 100}%;top:0;bottom:20px;width:2px;background:#ffd166"></div>`;
        }
      });
      if (frac >= 1) { fix.playing = false; syncFixCrosshairs(null, null); return; }
      _fixPlaybackTimer = requestAnimationFrameRef(tick);
    }
    _fixPlaybackTimer = requestAnimationFrameRef(tick);
  }
  
  function buildMultiSourceSummary(fix) {
    if (!fix.correlation?.results?.length || (!fix.vmstat?.length && !fix.nstat?.length)) return "";
    const results = fix.correlation.results;
    const groups = fixSpikeGroups(results, 2000);
    const events = [];
    for (const g of groups.slice(0, 5)) {
      const peakSpike = g.spikes.reduce((best, s) => s.lagMs > best.lagMs ? s : best, g.spikes[0]);
      const t = peakSpike.receiveMs;
      const parts = [`FIX lag ${peakSpike.lagMs.toFixed(1)}ms`];
      if (fix.vmstat?.length) {
        const vm = fix.vmstat.reduce((best, s) => Math.abs(s.epochMs - t) < Math.abs(best.epochMs - t) ? s : best, fix.vmstat[0]);
        if (Math.abs(vm.epochMs - t) < 5000) {
          const cpu = vm.us + vm.sy + vm.wa;
          if (cpu > 50) parts.push(`CPU ${cpu}%`);
          if (vm.r > 4) parts.push(`runqueue ${vm.r}`);
        }
      }
      if (fix.nstat?.length) {
        const ns = fix.nstat.reduce((best, s) => Math.abs(s.epochMs - t) < Math.abs(best.epochMs - t) ? s : best, fix.nstat[0]);
        if (Math.abs(ns.epochMs - t) < 5000) {
          const retrans = ns.counters?.TcpRetransSegs || 0;
          const prev = fix.nstat[Math.max(0, fix.nstat.indexOf(ns) - 1)];
          const delta = prev ? retrans - (prev.counters?.TcpRetransSegs || 0) : 0;
          if (delta > 0) parts.push(`retrans +${formatNumber(delta)}`);
        }
      }
      if (parts.length > 1) {
        const time = fixTimeLabel(t);
        const cause = peakSpike.cause || "unknown";
        events.push(`<li><strong>${time}</strong> — ${parts.join(" + ")} → <em>${cause}</em></li>`);
      }
    }
    if (!events.length) return "";
    return `<div class="bdp-context-line" style="margin:8px 0;padding:8px 12px;border-radius:8px;background:rgba(93,183,255,0.06);border:1px solid rgba(93,183,255,0.15)">
      <div style="font-weight:700;font-size:12px;color:var(--text);margin-bottom:4px"><i class="ri-links-line"></i> Multi-source correlation</div>
      <ul style="margin:0;padding:0 0 0 16px;font-size:11px;color:var(--soft);line-height:1.7">${events.join("")}</ul>
    </div>`;
  }

  return {
    buildMultiSourceSummary,
    fixPagedRows,
    renderFixLatencyPanel,
    renderWhatIfSimulation,
    runFixCorrelation,
    toggleFixPlayback
  };
}
