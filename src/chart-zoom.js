export const DEFAULT_ZOOM = Object.freeze({ start: 0, end: 1 });
export const MIN_ZOOM_SPAN = 0.02;

export function clampZoomRange(start, end, minSpan = MIN_ZOOM_SPAN) {
  const safeStart = Number.isFinite(start) ? start : DEFAULT_ZOOM.start;
  const safeEnd = Number.isFinite(end) ? end : DEFAULT_ZOOM.end;
  const left = Math.max(0, Math.min(1 - minSpan, safeStart));
  const right = Math.max(left + minSpan, Math.min(1, safeEnd));
  return { start: left, end: right };
}

export function zoomForMetric(chartZoomByMetric = {}, sharedZoom = DEFAULT_ZOOM, metric = null) {
  if (!metric) return clampZoomRange(sharedZoom.start, sharedZoom.end);
  const metricZoom = chartZoomByMetric[metric];
  return metricZoom ? clampZoomRange(metricZoom.start, metricZoom.end) : clampZoomRange(sharedZoom.start, sharedZoom.end);
}

export function nextZoomRange(zoom = DEFAULT_ZOOM, action = "resetZoom") {
  const current = clampZoomRange(zoom.start, zoom.end);
  if (action === "resetZoom") return { ...DEFAULT_ZOOM };
  const width = current.end - current.start;
  if (action === "zoomIn" || action === "zoomOut") {
    const center = current.start + width / 2;
    const nextWidth = action === "zoomIn" ? width * 0.62 : Math.min(1, width / 0.62);
    return clampZoomRange(center - nextWidth / 2, center + nextWidth / 2);
  }
  if (action === "panLeft" || action === "panRight") {
    const direction = action === "panLeft" ? -1 : 1;
    const delta = width * 0.25 * direction;
    return clampZoomRange(current.start + delta, current.end + delta);
  }
  return current;
}

export function applyChartZoomOperation({ action, metric = null, sharedZoom = DEFAULT_ZOOM, chartZoomByMetric = {} }) {
  const current = zoomForMetric(chartZoomByMetric, sharedZoom, metric);
  const next = nextZoomRange(current, action);
  if (!metric) {
    return {
      sharedZoom: next,
      chartZoomByMetric,
      activeChartMetric: null,
      activeChartAction: action
    };
  }
  return {
    sharedZoom,
    chartZoomByMetric: { ...chartZoomByMetric, [metric]: next },
    activeChartMetric: metric,
    activeChartAction: action
  };
}