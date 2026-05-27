export function createFixHeatmapDrawing(ctx) {
  const { getDocument, fixTimeLabel, syncFixCrosshairs } = ctx;

  function drawFixHeatmap(canvas, results, fullT0, fullT1) {
    const w = canvas.clientWidth || 600, h = canvas.clientHeight || 80;
    canvas.width = w * 2; canvas.height = h * 2;
    const ctx2d = canvas.getContext("2d");
    ctx2d.scale(2, 2);
    ctx2d.clearRect(0, 0, w, h);
    const pad = { l: 50, r: 10, t: 10, b: 20 };
    const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
    const t0 = fullT0 != null ? fullT0 : Math.min(...results.map(r => r.receiveMs));
    const t1 = fullT1 != null ? fullT1 : Math.max(...results.map(r => r.receiveMs));
    const tSpan = t1 - t0 || 1;
    const maxLag = Math.max(...results.map(r => r.lagMs), 1);
    const cols = Math.max(10, Math.min(80, Math.ceil(tSpan / 1000)));
    const rows = 6;
    const cellW = plotW / cols, cellH = plotH / rows;
    const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
    for (const r of results) {
      const col = Math.min(cols - 1, Math.max(0, Math.floor(((r.receiveMs - t0) / tSpan) * cols)));
      const row = Math.min(rows - 1, Math.floor((r.lagMs / maxLag) * rows));
      grid[rows - 1 - row][col]++;
    }
    const maxCount = Math.max(1, ...grid.flat());
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const intensity = grid[r][c] / maxCount;
        if (intensity > 0) {
          const hue = 60 - intensity * 60;
          ctx2d.fillStyle = `hsla(${hue}, 100%, 50%, ${0.3 + intensity * 0.7})`;
          ctx2d.fillRect(pad.l + c * cellW, pad.t + r * cellH, cellW - 1, cellH - 1);
        }
      }
    }
    ctx2d.fillStyle = "rgba(255,255,255,0.5)";
    ctx2d.font = "9px sans-serif";
    ctx2d.textAlign = "right";
    ctx2d.fillText(`${maxLag.toFixed(0)}ms`, pad.l - 4, pad.t + 9);
    ctx2d.fillText("0ms", pad.l - 4, pad.t + plotH);
    for (let i = 0; i < 5; i++) {
      const f = i / 4;
      const epoch = t0 + f * tSpan;
      const px = pad.l + f * plotW;
      ctx2d.textAlign = i === 0 ? "left" : i === 4 ? "right" : "center";
      ctx2d.fillText(fixTimeLabel(epoch), px, h - 2);
    }
    attachFixHeatmapCrosshair(canvas, pad, w, t0, tSpan, plotW, results);
  }

  function attachFixHeatmapCrosshair(canvas, pad, w, t0, tSpan, plotW, results) {
    if (canvas._heatmapCrosshairAttached) return;
    canvas._heatmapCrosshairAttached = true;
    canvas.style.cursor = "crosshair";
    let overlay = canvas.parentElement.querySelector(".heatmap-overlay");
    if (!overlay) {
      overlay = getDocument().createElement("div");
      overlay.className = "heatmap-overlay";
      overlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none";
      canvas.parentElement.style.position = "relative";
      canvas.parentElement.appendChild(overlay);
    }
    function onMove(event) {
      const rect = canvas.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const px = mx * (w / rect.width);
      if (px < pad.l || px > pad.l + plotW) {
        overlay.innerHTML = "";
        syncFixCrosshairs(null, canvas);
        return;
      }
      const frac = (px - pad.l) / plotW;
      const epoch = t0 + frac * tSpan;
      const colWidth = tSpan / Math.max(10, Math.min(80, Math.ceil(tSpan / 1000)));
      const nearby = results.filter(r => Math.abs(r.receiveMs - epoch) < colWidth);
      const count = nearby.length;
      const avgLag = count ? nearby.reduce((sum, r) => sum + r.lagMs, 0) / count : 0;
      const maxLag = count ? Math.max(...nearby.map(r => r.lagMs)) : 0;
      const leftPct = (mx / rect.width) * 100;
      overlay.innerHTML = `<div style="position:absolute;left:${leftPct}%;top:0;bottom:20px;width:1px;background:rgba(255,209,102,0.7)"></div>${count ? `<div style="position:absolute;left:${Math.min(leftPct, 85)}%;top:4px;background:rgba(11,16,24,0.85);border:1px solid #52657a;border-radius:6px;padding:4px 8px;font-size:10px;color:#edf4ff;white-space:nowrap"><strong>${fixTimeLabel(epoch)}</strong><br><span style="color:#ffd166">${count} spike${count > 1 ? "s" : ""}</span> - avg ${avgLag.toFixed(1)}ms - max ${maxLag.toFixed(1)}ms</div>` : `<div style="position:absolute;left:${Math.min(leftPct, 85)}%;top:4px;background:rgba(11,16,24,0.85);border:1px solid #52657a;border-radius:6px;padding:4px 8px;font-size:10px;color:#8c9aab;white-space:nowrap">${fixTimeLabel(epoch)}</div>`}`;
      syncFixCrosshairs(epoch, canvas);
    }
    canvas.style.pointerEvents = "auto";
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", () => { overlay.innerHTML = ""; syncFixCrosshairs(null, canvas); });
  }

  return { drawFixHeatmap, attachFixHeatmapCrosshair };
}
