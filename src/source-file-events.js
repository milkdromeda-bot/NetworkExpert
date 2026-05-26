export function bindSourceFileEvents(deps) {
  const {
    document,
    state,
    cmInstance,
    parseGcLog,
    parsePidstat,
    parseNstat,
    parseFixLog,
    parseVmstat,
    parseNstatTimestamped,
    parseSar,
    extractTcpCounters,
    correlateCpuWithStalls,
    correlateSarWithTcp,
    visibleHistory,
    runJvmCorrelation,
    runFixCorrelation,
    drawJvmCharts,
    drawFixCharts,
    toast,
    render,
    _showBusy,
    _hideBusy
  } = deps;

  document.querySelector("#jvmGcFileInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    _showBusy();
    const reader = file.stream().getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let lines = "";
    const gcPattern = /GC\(\d+\)|Pause |Safepoint|safepoint|stopped.*seconds|User=.*Sys=.*Real=|Eden:|Survivor|Old:|Humongous|->.*M\(|Evacuation Failure|To-space exhausted/i;
    function pump() {
      reader.read().then(({ done, value }) => {
        if (done) {
          if (buffer) { if (gcPattern.test(buffer)) lines += buffer + "\n"; }
          finishParse();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop();
        for (const line of parts) {
          if (gcPattern.test(line)) lines += line + "\n";
        }
        setTimeout(pump, 0);
      });
    }
    function finishParse() {
      const { pauses, safepoints } = parseGcLog(lines);
      state.jvmGc.rawLog = `[${file.name}: ${pauses.length} pauses extracted from ${(file.size / 1e6).toFixed(1)} MB]`;
      state.jvmGc.pauses = pauses;
      state.jvmGc.safepoints = safepoints;
      runJvmCorrelation();
      _hideBusy();
      toast("GC log loaded & parsed", `${pauses.length} pauses, ${safepoints.length} safepoints from ${file.name} (${(file.size / 1e6).toFixed(1)} MB).`);
      render();
      requestAnimationFrame(drawJvmCharts);
    }
    pump();
  });

  document.querySelector("#pidstatFileInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const { samples } = parsePidstat(text);
      state.jvmGc.pidstat = samples;
      if (state.jvmGc.pauses.length) {
        state.jvmGc.cpuCorrelation = correlateCpuWithStalls({
          pidstatSamples: samples,
          gcPauses: state.jvmGc.correlation?.results?.map(result => ({ ...result.pause, alignedEpochMs: result.epochMs })) || state.jvmGc.pauses,
          history: visibleHistory().filter(sample => sample.epochMs),
          clockOffsetMs: state.jvmGc.clockOffsetMs
        });
      }
      toast("pidstat loaded", `${samples.length} CPU samples parsed from ${file.name}.`);
      render();
    });
  });

  document.querySelector("#nstatFileInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const { counters } = parseNstat(text);
      state.jvmGc.nstat = extractTcpCounters(counters);
      toast("nstat loaded", `${counters.size} counters parsed. Key: retrans=${state.jvmGc.nstat.retransSegs}, timeouts=${state.jvmGc.nstat.timeouts}, listenDrops=${state.jvmGc.nstat.listenDrops}.`);
      render();
    });
  });

  async function readFixFileText(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".gz")) {
      if ("DecompressionStream" in window) {
        const stream = file.stream().pipeThrough(new DecompressionStream("gzip"));
        const reader = stream.getReader();
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        return new TextDecoder().decode(await new Blob(chunks).arrayBuffer());
      }
    }
    if (name.endsWith(".zip") && window.JSZip) {
      const zip = await window.JSZip.loadAsync(file);
      const entries = Object.values(zip.files).filter(entry => !entry.dir && /\.(log|txt|gz)$/i.test(entry.name));
      const texts = [];
      for (const entry of entries) {
        let text = await entry.async("string");
        if (entry.name.toLowerCase().endsWith(".gz") && window.pako) {
          const buf = await entry.async("uint8array");
          text = window.pako.ungzip(buf, { to: "string" });
        }
        texts.push({ name: entry.name, text });
      }
      return texts;
    }
    return file.text();
  }

  async function ingestFixFiles(files) {
    if (!files.length) return;
    const progressEl = document.querySelector("#fixProgressBar");
    const progressLabel = document.querySelector("#fixProgressLabel");
    if (progressEl) {
      progressEl.style.width = "0%";
      progressEl.parentElement.style.display = "flex";
    }
    let allRecords = [...state.fixLatency.records];
    const total = files.length;
    for (let index = 0; index < total; index += 1) {
      const file = files[index];
      const pct = Math.round((index / total) * 100);
      if (progressEl) progressEl.style.width = `${pct}%`;
      if (progressLabel) progressLabel.textContent = `Parsing ${file.name} (${index + 1}/${total})`;
      await new Promise(resolve => setTimeout(resolve, 0));
      try {
        const result = await readFixFileText(file);
        if (Array.isArray(result)) {
          for (const { name, text } of result) {
            const { records, stats } = parseFixLog(text, name);
            allRecords.push(...records);
            state.fixLatency.fileStats.push({ fileName: name, size: text.length, ...stats });
          }
        } else {
          const { records, stats } = parseFixLog(result, file.name);
          allRecords.push(...records);
          state.fixLatency.fileStats.push({ fileName: file.name, size: file.size, ...stats });
        }
      } catch (error) {
        state.fixLatency.fileStats.push({ fileName: file.name, size: file.size, parsed: 0, rejected: 0, error: error.message });
      }
    }
    if (progressEl) progressEl.style.width = "100%";
    if (progressLabel) progressLabel.textContent = "Done";
    allRecords.sort((a, b) => a.receiveMs - b.receiveMs);
    state.fixLatency.records = allRecords;
    runFixCorrelation();
    toast("FIX logs loaded", `${allRecords.length} messages from ${total} file(s). ${state.fixLatency.correlation?.summary?.totalSpikes || 0} spikes above ${state.fixLatency.threshold}ms.`);
    setTimeout(() => {
      if (progressEl) progressEl.parentElement.style.display = "none";
    }, 1500);
    render();
    requestAnimationFrame(drawFixCharts);
  }

  document.querySelector("#fixFileInput")?.addEventListener("change", event => {
    const files = Array.from(event.target.files || []);
    ingestFixFiles(files);
  });
  document.querySelector("#fixDirInput")?.addEventListener("change", event => {
    const files = Array.from(event.target.files || []);
    ingestFixFiles(files);
  });
  document.querySelector("#fixThresholdInput")?.addEventListener("change", event => {
    state.fixLatency.threshold = parseInt(event.target.value, 10) || 5;
    runFixCorrelation();
    render();
    setTimeout(drawFixCharts, 50);
  });

  document.querySelector("#ingestPeerSsInput")?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { parseSs } = await import("./parser.js");
    const sockets = parseSs(text);
    state.peerCapture = { raw: text, sockets, sourceName: file.name };
    const correlations = [];
    for (const local of state.sockets) {
      const peer = sockets.find(socket => socket.local?.includes(local.peerAddress?.host) && socket.peer?.includes(local.localAddress?.host));
      if (peer) correlations.push({ localSocket: local, peerSocket: peer, localSendQ: local.sendQ, peerRecvQ: peer.recvQ, localRecvQ: local.recvQ, peerSendQ: peer.sendQ });
    }
    state.peerCapture.correlations = correlations;
    toast("Peer ss loaded", `${sockets.length} sockets from ${file.name}. ${correlations.length} cross-host correlation(s) found.`);
    render();
  });

  document.querySelector("#ingestAutoDir")?.addEventListener("change", async event => {
    const files = Array.from(event.target.files || []).filter(file => !file.name.startsWith("."));
    if (!files.length) return;
    _showBusy();
    const classified = { ss: [], fix: [], gc: [], vmstat: [], nstat: [], sar: [] };
    for (const file of files) {
      try {
        let slice;
        if (file.name.toLowerCase().endsWith(".gz") && "DecompressionStream" in window) {
          const stream = file.stream().pipeThrough(new DecompressionStream("gzip"));
          const reader = stream.getReader();
          const chunks = [];
          let len = 0;
          while (len < 4096) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); len += value.length; }
          try { reader.cancel(); } catch {}
          const buf = chunks.length === 1 ? chunks[0] : new Uint8Array(await new Blob(chunks).arrayBuffer());
          slice = new TextDecoder().decode(buf.slice(0, 4096));
        } else {
          slice = await file.slice(0, 4096).text();
        }
        if (/^===\s*\d{4}-/.test(slice) && /Tcp/.test(slice)) classified.nstat.push(file);
        else if (/^Linux\s+\d.*\(\w+\)/.test(slice) && /%usr|%idle|kbmemfree|IFACE|tps/m.test(slice)) classified.sar.push(file);
        else if (/^procs\s+---/.test(slice) || /^\s*\d+\s+\d+\s+\d+\s+\d+.*\d{4}-\d{2}-\d{2}/m.test(slice)) classified.vmstat.push(file);
        else if (/GC\(\d+\)|Pause (Young|Full|G1)|\[gc[\],]|Using G1|Using ZGC|Using Shenandoah|gc,init/i.test(slice)) classified.gc.push(file);
        else if (/FIXTcpConnection|\|52=\d{8}/.test(slice)) classified.fix.push(file);
        else if (/tcp\s+(ESTAB|LISTEN|TIME-WAIT|CLOSE-WAIT)/i.test(slice) || /^tcp\s/m.test(slice)) classified.ss.push(file);
      } catch {}
    }
    const summary = [];
    if (classified.ss.length) {
      const ssFile = classified.ss[0];
      const ssText = await ssFile.text();
      const cmEl = document.querySelector("#rawInput") || document.querySelector(".CodeMirror");
      if (cmInstance) cmInstance.setValue(ssText);
      else if (cmEl) cmEl.value = ssText;
      state.raw = ssText;
      state.rawVersion = (state.rawVersion || 0) + 1;
      state.sourceName = ssFile.name;
      state.cache = {};
      document.querySelector("[data-action='parse']")?.click();
      await new Promise(resolve => {
        const check = () => (state.sockets.length > 0 || state.view === "analysis") ? resolve() : setTimeout(check, 500);
        check();
      });
      summary.push(`ss: ${ssFile.name}`);
    }
    if (classified.gc.length) {
      const file = classified.gc[0];
      file.text().then(text => {
        const gcPattern = /GC\(\d+\)|Pause |Safepoint|safepoint|stopped.*seconds|User=.*Sys=.*Real=|Eden:|Survivor|Old:|Humongous|->.*M\(|Evacuation Failure|To-space exhausted/i;
        const lines = text.split("\n").filter(line => gcPattern.test(line)).join("\n");
        const { pauses, safepoints } = parseGcLog(lines);
        state.jvmGc.rawLog = `[${file.name}]`;
        state.jvmGc.pauses = pauses;
        state.jvmGc.safepoints = safepoints;
      });
      summary.push(`GC: ${classified.gc[0].name}`);
    }
    if (classified.vmstat.length) {
      classified.vmstat[0].text().then(text => {
        state.fixLatency.vmstat = parseVmstat(text).samples;
        render();
      });
      summary.push(`vmstat: ${classified.vmstat[0].name}`);
    }
    if (classified.nstat.length) {
      classified.nstat[0].text().then(text => {
        state.fixLatency.nstat = parseNstatTimestamped(text).samples;
        render();
      });
      summary.push(`nstat: ${classified.nstat[0].name}`);
    }
    if (classified.sar.length) {
      classified.sar[0].text().then(text => {
        state.sar = parseSar(text);
        state.sarCorrelation = correlateSarWithTcp(state.sar, state.anomalies.filter(anomaly => anomaly.epochMs).map(anomaly => ({ epochMs: anomaly.epochMs })));
        render();
      });
      summary.push(`sar: ${classified.sar[0].name}`);
    }
    if (classified.fix.length) {
      await ingestFixFiles(classified.fix);
      summary.push(`FIX: ${classified.fix.length} file(s)`);
    }
    _hideBusy();
    toast("Auto-detect complete", summary.length ? summary.join(" - ") : "No recognized files found");
    render();
    const waitForSs = (retries = 0) => {
      if (state.sockets.length > 0 || state.view === "analysis") {
        setTimeout(() => {
          if (state.jvmGc.pauses.length) runJvmCorrelation();
          if (state.fixLatency.records.length) runFixCorrelation();
          render();
          setTimeout(drawFixCharts, 100);
        }, 500);
      } else if (retries < 60) {
        setTimeout(() => waitForSs(retries + 1), 500);
      }
    };
    waitForSs();
  });

  document.querySelector("#ingestGcFileInput")?.addEventListener("change", event => {
    document.querySelector("#jvmGcFileInput")?.dispatchEvent || null;
    const el = document.querySelector("#jvmGcFileInput");
    if (el) {
      el.files = event.target.files;
      el.dispatchEvent(new Event("change"));
    } else {
      const file = event.target.files?.[0];
      if (!file) return;
      _showBusy();
      const reader = file.stream().getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let lines = "";
      const gcPattern = /GC\(\d+\)|Pause |Safepoint|safepoint|stopped.*seconds|User=.*Sys=.*Real=|Eden:|Survivor|Old:|Humongous|->.*M\(|Evacuation Failure|To-space exhausted/i;
      function pump() {
        reader.read().then(({ done, value }) => {
          if (done) {
            if (buffer && gcPattern.test(buffer)) lines += buffer + "\n";
            const { pauses, safepoints } = parseGcLog(lines);
            state.jvmGc.rawLog = `[${file.name}]`;
            state.jvmGc.pauses = pauses;
            state.jvmGc.safepoints = safepoints;
            runJvmCorrelation();
            _hideBusy();
            toast("GC log loaded", `${pauses.length} pauses from ${file.name}`);
            render();
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop();
          for (const line of parts) {
            if (gcPattern.test(line)) lines += line + "\n";
          }
          setTimeout(pump, 0);
        });
      }
      pump();
    }
  });
  document.querySelector("#ingestVmstatFileInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const { samples } = parseVmstat(text);
      state.fixLatency.vmstat = samples;
      if (state.fixLatency.records.length) runFixCorrelation();
      toast("vmstat loaded", `${samples.length} samples from ${file.name}`);
      render();
      requestAnimationFrame(drawFixCharts);
    });
  });
  document.querySelector("#ingestNstatFileInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const { samples } = parseNstatTimestamped(text);
      state.fixLatency.nstat = samples;
      if (state.fixLatency.records.length) runFixCorrelation();
      toast("nstat loaded", `${samples.length} samples from ${file.name}`);
      render();
      requestAnimationFrame(drawFixCharts);
    });
  });
  document.querySelector("#ingestSarFileInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      state.sar = parseSar(text);
      const total = (state.sar.cpu?.length || 0) + (state.sar.memory?.length || 0) + (state.sar.io?.length || 0) + (state.sar.network?.length || 0);
      state.sarCorrelation = correlateSarWithTcp(state.sar, state.anomalies.filter(anomaly => anomaly.epochMs).map(anomaly => ({ epochMs: anomaly.epochMs })));
      toast("sar loaded", `${total} samples from ${file.name} (CPU: ${state.sar.cpu.length}, IO: ${state.sar.io.length}, mem: ${state.sar.memory.length})`);
      render();
    });
  });
  document.querySelector("#ingestFixFileInput")?.addEventListener("change", event => {
    const files = Array.from(event.target.files || []).filter(file => /\.(log|txt|gz|zip)$/i.test(file.name));
    ingestFixFiles(files);
  });
  document.querySelector("#ingestFixDirInput")?.addEventListener("change", event => {
    const files = Array.from(event.target.files || []).filter(file => /\.(log|txt|gz|zip)$/i.test(file.name));
    ingestFixFiles(files);
  });
  document.querySelector("#fixVmstatFileInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const { samples } = parseVmstat(text);
      state.fixLatency.vmstat = samples;
      runFixCorrelation();
      toast("vmstat loaded", `${samples.length} samples parsed from ${file.name}. CPU/scheduling correlation active.`);
      render();
      requestAnimationFrame(drawFixCharts);
    });
  });
  document.querySelector("#fixNstatFileInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const { samples } = parseNstatTimestamped(text);
      state.fixLatency.nstat = samples;
      runFixCorrelation();
      toast("nstat loaded", `${samples.length} per-second samples parsed from ${file.name}. Kernel/network correlation active.`);
      render();
      requestAnimationFrame(drawFixCharts);
    });
  });
}
