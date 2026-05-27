export function createReportChartActions(runtime, getActions) {
  const { state, document, fn } = runtime;
  const metricLabel = fn("metricLabel");
  const toast = fn("toast");
  const visibleHistory = fn("visibleHistory");
  const resolvedTimeZone = fn("resolvedTimeZone");
  const timeLabel = fn("timeLabel");
  const selectedSocket = fn("selectedSocket");
  const anomaliesBySocketId = fn("anomaliesBySocketId");
  const microburstSummary = fn("microburstSummary");
  const formatMicroburstWindow = fn("formatMicroburstWindow");
  const drawChartInto = fn("drawChartInto");
  const reportChartDataUrl = fn("reportChartDataUrl");

  function exportChartAsPng(svg, metric) {
    const w = svg.clientWidth || 640;
    const h = svg.clientHeight || 300;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#05070b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${metric || "chart"}-${new Date().toISOString().slice(0, 19).replace(/:/g, "")}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, "image/png");
      toast("Chart exported", `${metricLabel(metric)} saved as PNG.`);
    };
    img.src = url;
  }

  async function saveChartsPng() {
    const svgs = [...document.querySelectorAll("svg.chart")];
    if (!svgs.length) {
      toast("No chart to save", "Open the Charts tab first.", "warn");
      return;
    }
    const width = Math.max(...svgs.map(svg => svg.clientWidth || 640));
    const gap = 24;
    const heights = svgs.map(svg => svg.clientHeight || 300);
    const totalHeight = heights.reduce((sum, height) => sum + height, 0) + gap * (svgs.length - 1);
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = totalHeight * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    ctx.fillStyle = "#05070b";
    ctx.fillRect(0, 0, width, totalHeight);
    let y = 0;
    for (let i = 0; i < svgs.length; i += 1) {
      const svg = svgs[i];
      const xml = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([xml], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      ctx.drawImage(img, 0, y, svg.clientWidth || width, heights[i]);
      URL.revokeObjectURL(url);
      y += heights[i] + gap;
    }
    const png = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    const url = URL.createObjectURL(png);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ultimate-network-expert-charts-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast("Charts exported", "PNG export has been generated.");
  }

  function reportChartWindowLabel(rows = visibleHistory()) {
    if (!rows.length) return `No visible timeline (${resolvedTimeZone()})`;
    return `${timeLabel(rows[0]?.t || 0, rows[0]?.epochMs)} -> ${timeLabel(rows[rows.length - 1]?.t || 0, rows[rows.length - 1]?.epochMs)} (${resolvedTimeZone()})`;
  }

  function reportDefaultChartMetrics(limit = 4) {
    const selected = selectedSocket();
    const anomalyMetrics = (selected
      ? anomaliesBySocketId().get(selected.id) || []
      : getActions().reportRelevantAnomalies()).map(item => item.metric).filter(Boolean);
    const preferred = [state.prefs.graphMetric, ...anomalyMetrics, "skmem.d", "sendQ", "recvQ", "rtt", "rto", "rx_bps", "tx_bps"];
    return [...new Set(preferred.filter(Boolean))].slice(0, limit);
  }

  function buildReportChartSvg(metric, width = 760, height = 280) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    drawChartInto(svg, metric, state.prefs.graphStyle === "xy" ? "points" : state.prefs.graphStyle, true);
    return svg;
  }

  function captureIncidentReportCharts(limit = 5) {
    const captures = [];
    const seen = new Set();
    const microburst = microburstSummary();
    const pushCapture = (metric, title, svg, context, hero = false) => {
      if (!metric || !svg || seen.has(metric) || captures.length >= limit) return;
      const image = reportChartDataUrl(svg);
      if (!image) return;
      seen.add(metric);
      captures.push({ metric, title, image, context, hero });
    };

    if (state.view === "charts") {
      const heroSvg = document.querySelector("#chart");
      const heroMetric = heroSvg?.dataset.metric || state.prefs.graphMetric;
      if (heroSvg) {
        pushCapture(heroMetric, `${metricLabel(heroMetric)} overview`, heroSvg, `${microburst ? `Microburst ${formatMicroburstWindow(microburst)} * ` : ""}Current visible chart window * ${reportChartWindowLabel()}`, true);
      }
      document.querySelectorAll("[data-chart-card]").forEach(card => {
        if (captures.length >= limit) return;
        const metric = card.dataset.chartCard;
        const svg = card.querySelector("[data-mini-chart]");
        pushCapture(metric, metricLabel(metric), svg, `${microburst ? `Microburst ${formatMicroburstWindow(microburst)} * ` : ""}Chart card * ${reportChartWindowLabel()}`);
      });
    }

    reportDefaultChartMetrics(limit).forEach(metric => {
      if (captures.length >= limit || seen.has(metric)) return;
      pushCapture(metric, `${metricLabel(metric)} snapshot`, buildReportChartSvg(metric), `${microburst ? `Microburst ${formatMicroburstWindow(microburst)} * ` : ""}Generated from current filtered history * ${reportChartWindowLabel()}`);
    });

    return captures;
  }

  return { exportChartAsPng, saveChartsPng, reportChartWindowLabel, reportDefaultChartMetrics, buildReportChartSvg, captureIncidentReportCharts };
}
