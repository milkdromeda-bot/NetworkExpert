function emptyDeps() {
  return {};
}

export function bindChartMinimapEvents(deps = emptyDeps()) {
  const {
    root = deps.document,
    state,
    drawSingleMinimap: drawMinimap,
    drawChartInto: drawInto,
    chartZoomFor: zoomFor,
    clearVisibleHistoryCache: clearVisible
  } = deps;
  root?.querySelectorAll("[data-minimap]").forEach(canvas => {
    let dragging = false;
    const getMetric = () => canvas.dataset.minimap;
    const panTo = event => {
      const rect = canvas.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const metric = getMetric();
      const zoom = zoomFor(metric);
      const span = zoom.end - zoom.start;
      const newStart = Math.max(0, Math.min(1 - span, frac - span / 2));
      if (!state.chartZoomByMetric) state.chartZoomByMetric = {};
      state.chartZoomByMetric[metric] = { start: newStart, end: newStart + span };
      clearVisible();
      drawMinimap(canvas, metric, deps);
      const svg = canvas.parentElement?.querySelector(`[data-mini-chart="${metric}"]`);
      if (svg) drawInto(svg, metric, state.prefs.graphStyle === "xy" ? "points" : state.prefs.graphStyle, true, deps);
    };
    canvas.addEventListener("mousedown", event => { dragging = true; panTo(event); event.preventDefault(); });
    canvas.addEventListener("mousemove", event => { if (dragging) panTo(event); });
    canvas.addEventListener("mouseup", () => { dragging = false; });
    canvas.addEventListener("mouseleave", () => { dragging = false; });
  });
}

export function bindChartChromeEvents(deps = emptyDeps()) {
  const {
    root = deps.document,
    state,
    render: renderView,
    renderKeepingWorkspacePosition: renderStable,
    drawBdpWindowCharts: drawBdp,
    drawJvmCharts: drawJvm,
    drawFixCharts: drawFix,
    redrawChartCardMetric: redrawMetric,
    applyChartZoomAction: applyZoom
  } = deps;
  root?.querySelectorAll("[data-charts-tab]").forEach(btn => {
    btn.addEventListener("click", event => {
      const tab = event.currentTarget.dataset.chartsTab;
      if (state.chartsTab === tab) return;
      state.chartsTab = tab;
      renderView();
      if (tab === "fix") setTimeout(() => drawFix(deps), 100);
      if (tab === "jvm") setTimeout(() => drawJvm(deps), 100);
    });
  });
  root?.querySelectorAll("[data-style-toggle]").forEach(btn => {
    btn.addEventListener("click", event => {
      event.stopPropagation();
      state.openStyleMenu = !state.openStyleMenu;
      const menu = btn.closest(".style-picker")?.querySelector(".style-picker-menu");
      if (menu) menu.classList.toggle("open", state.openStyleMenu);
    });
  });
  root?.querySelectorAll("[data-style-choice]").forEach(btn => {
    btn.addEventListener("click", event => {
      event.stopPropagation();
      state.prefs.graphStyle = event.currentTarget.dataset.styleChoice;
      state.openStyleMenu = false;
      renderStable();
    });
  });
  root?.querySelectorAll("[data-chart-zoom]").forEach(btn => {
    btn.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const action = event.currentTarget.dataset.chartZoom;
      const metric = event.currentTarget.dataset.chartZoomMetric;
      applyZoom(action, metric);
      if (event.currentTarget.hasAttribute("data-bdp-zoom")) {
        state._bdpCache = null;
        drawBdp(deps);
      } else if (event.currentTarget.hasAttribute("data-jvm-zoom")) {
        state.jvmGc.selectedEpoch = null;
        drawJvm(deps);
      } else if (event.currentTarget.hasAttribute("data-fix-zoom")) {
        drawFix(deps);
      } else if (!redrawMetric(metric, action, deps)) {
        renderStable();
      }
    });
  });
}

export function bindChartSeriesEvents(deps = emptyDeps()) {
  const {
    root = deps.document,
    state,
    redrawChartCardMetric: redrawMetric,
    drawJvmCharts: drawJvm,
    chartSeriesKey: seriesKey
  } = deps;
  root?.querySelectorAll("[data-chart-series-toggle]").forEach(button => button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const metric = event.currentTarget.dataset.chartSeriesToggle;
    const key = event.currentTarget.dataset.chartSeriesKey;
    const fullKey = seriesKey(metric, key);
    if (!state.hiddenChartSeries) state.hiddenChartSeries = new Set();
    state.hiddenChartSeries.has(fullKey) ? state.hiddenChartSeries.delete(fullKey) : state.hiddenChartSeries.add(fullKey);
    root.querySelectorAll("[data-chart-series-toggle]").forEach(item => {
      if (item.dataset.chartSeriesToggle !== metric || item.dataset.chartSeriesKey !== key) return;
      const hidden = state.hiddenChartSeries.has(fullKey);
      item.classList.toggle("is-muted", hidden);
      item.setAttribute("aria-pressed", hidden ? "false" : "true");
    });
    redrawMetric(metric, `series:${key}`, deps);
  }));
  root?.querySelectorAll("[data-jvm-series-key]").forEach(item => item.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const key = event.currentTarget.dataset.jvmSeriesKey;
    if (!state.hiddenJvmSeries) state.hiddenJvmSeries = new Set();
    state.hiddenJvmSeries.has(key) ? state.hiddenJvmSeries.delete(key) : state.hiddenJvmSeries.add(key);
    root.querySelectorAll(`[data-jvm-series-key="${key}"]`).forEach(span => {
      span.style.opacity = state.hiddenJvmSeries.has(key) ? ".4" : "";
      span.style.textDecoration = state.hiddenJvmSeries.has(key) ? "line-through" : "";
    });
    drawJvm(deps);
  }));
}
