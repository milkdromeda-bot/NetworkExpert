export function createTooltipRendering(ctx) {
  const {
    state,
    document,
    window,
    EXPERT_DEFAULT_THRESHOLDS,
    escapeHtml,
    chartMetricList,
    thresholdFor,
    metricLabel,
    metricColor,
    metricSource,
    metricUnit,
    metricInterpretation,
    metricCorrelations,
    metricReliabilityProfile,
    metricDiagnosticGuidance,
    formatMetricValue,
    renderThresholdSummary,
    currentApplicationService,
    inferredApplicationService,
    chartTooltipOpacity,
    renderColumnTooltip,
    render
  } = ctx;

function renderChartInfo(title, summary, detail) {
  return `<span class="field-info" tabindex="0" aria-label="${escapeHtml(title)} help"><i class="ri-information-line"></i><span class="field-info-card" role="tooltip"><span class="tooltip-kicker">Chart intelligence</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(summary)}</p><p>${escapeHtml(detail)}</p></span></span>`;
}

function metricHelp(metric) {
  const key = chartMetricList().includes(metric) ? metric : state.prefs.graphMetric;
  const threshold = thresholdFor(key);
  return {
    metric: key,
    label: metricLabel(key),
    source: metricSource(key),
    unit: metricUnit(key) || "raw value",
    summary: metricInterpretation(key),
    correlations: metricCorrelations(key),
    profile: metricReliabilityProfile(key),
    guidance: metricDiagnosticGuidance(key),
    threshold,
    rationale: EXPERT_DEFAULT_THRESHOLDS[key]?.rationale || "Use this metric with queue, timer, process, and peer context. Prefer trends across snapshots over one isolated point."
  };
}

function renderChartMetricTooltip(metric) {
  const t = thresholdFor(metric);
  const color = metricColor(metric);
  const unit = metricUnit(metric) || "raw value";
  const hasThresholds = Number.isFinite(t.warn) || Number.isFinite(t.danger);
  return `<span class="chart-info" tabindex="0" aria-label="${escapeHtml(metricLabel(metric))} metric guide" style="--metric-color:${color}">
    <i class="ri-information-line"></i>
    <span class="chart-tooltip" role="tooltip">
      <span class="tooltip-kicker">Chart metric intelligence</span>
      <strong>${escapeHtml(metricLabel(metric))}</strong>
      <small>${escapeHtml(metricSource(metric))} - unit: ${escapeHtml(unit)}</small>
      <p>${escapeHtml(metricInterpretation(metric))}</p>
      ${hasThresholds ? renderThresholdSummary({ metric, threshold: t }) : `<span class="tooltip-none">No universal warning threshold is applied for this metric.</span>`}
      <div class="chart-tooltip-correlate">
        <b>Correlate with</b>
        <span>${metricCorrelations(metric).map(item => `<em>${escapeHtml(item)}</em>`).join("")}</span>
      </div>
      <button data-metric-help="${escapeHtml(metric)}" type="button"><i class="ri-expand-diagonal-line"></i> Expand intelligence</button>
    </span>
  </span>`;
}

let chartTooltipEl = null;
let chartTooltipHideTimer = 0;

function ensureFloatingChartTooltip() {
  if (chartTooltipEl?.isConnected) return chartTooltipEl;
  chartTooltipEl = document.createElement("div");
  chartTooltipEl.id = "floatingChartTooltip";
  chartTooltipEl.className = "chart-tooltip chart-tooltip-floating";
  chartTooltipEl.setAttribute("role", "tooltip");
  chartTooltipEl.addEventListener("mouseenter", () => clearTimeout(chartTooltipHideTimer));
  chartTooltipEl.addEventListener("mouseleave", hideFloatingChartTooltipSoon);
  chartTooltipEl.addEventListener("click", event => {
    const help = event.target.closest("[data-metric-help]");
    if (!help) return;
    event.stopPropagation();
    state.helpMetric = help.dataset.metricHelp;
    state.modal = "metricHelp";
    hideFloatingChartTooltipNow();
    render();
  });
  document.body.appendChild(chartTooltipEl);
  return chartTooltipEl;
}

function positionFloatingChartTooltip(info, tooltip) {
  if (!tooltip) return;
  const gutter = 12;
  tooltip.style.visibility = "hidden";
  tooltip.classList.add("open");
  const infoRect = info.getBoundingClientRect();
  const rect = tooltip.getBoundingClientRect();
  const below = infoRect.bottom + 10;
  const above = infoRect.top - rect.height - 10;
  const top = below + rect.height <= window.innerHeight - gutter ? below : Math.max(gutter, above);
  const idealLeft = infoRect.left + infoRect.width / 2 - rect.width / 2;
  const left = Math.min(Math.max(gutter, idealLeft), Math.max(gutter, window.innerWidth - rect.width - gutter));
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
  tooltip.style.visibility = "visible";
}

function showFloatingChartTooltip(info) {
  const inlineTooltip = info?.querySelector(".chart-tooltip:not(.chart-tooltip-floating)");
  if (!inlineTooltip) return;
  clearTimeout(chartTooltipHideTimer);
  const tooltip = ensureFloatingChartTooltip();
  tooltip.innerHTML = inlineTooltip.innerHTML;
  tooltip.style.setProperty("--metric-color", getComputedStyle(info).getPropertyValue("--metric-color") || "var(--cyan)");
  positionFloatingChartTooltip(info, tooltip);
}

function hideFloatingChartTooltipSoon() {
  clearTimeout(chartTooltipHideTimer);
  chartTooltipHideTimer = setTimeout(hideFloatingChartTooltipNow, 180);
}

function hideFloatingChartTooltipNow() {
  clearTimeout(chartTooltipHideTimer);
  chartTooltipEl?.classList.remove("open");
}

function ensureAppServiceTooltip() {
  let tooltip = document.querySelector("#appServiceTooltip");
  if (tooltip) return tooltip;
  tooltip = document.createElement("div");
  tooltip.id = "appServiceTooltip";
  tooltip.className = "app-service-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.innerHTML = `
    <span class="tooltip-kicker"></span>
    <strong></strong>
    <small></small>
    <p></p>
    <em></em>
  `;
  document.body.appendChild(tooltip);
  return tooltip;
}

function positionAppServiceTooltip(chip, tooltip) {
  if (!tooltip) return;
  const gutter = 12;
  tooltip.style.removeProperty("--app-tooltip-top");
  tooltip.style.removeProperty("--app-tooltip-left");

  const chipRect = chip.getBoundingClientRect();
  const rect = tooltip.getBoundingClientRect();
  const below = chipRect.bottom + 8;
  const above = chipRect.top - rect.height - 8;
  const top = below + rect.height <= window.innerHeight - gutter ? below : Math.max(gutter, above);
  const idealLeft = chipRect.left + chipRect.width / 2 - rect.width / 2;
  const left = Math.min(Math.max(gutter, idealLeft), Math.max(gutter, window.innerWidth - rect.width - gutter));

  tooltip.style.setProperty("--app-tooltip-top", `${Math.round(top)}px`);
  tooltip.style.setProperty("--app-tooltip-left", `${Math.round(left)}px`);
}

function showAppServiceTooltip(chip) {
  const tooltip = ensureAppServiceTooltip();
  tooltip.querySelector(".tooltip-kicker").textContent = "Service classification";
  tooltip.querySelector("strong").textContent = chip.dataset.appTooltipLabel || "Service";
  tooltip.querySelector("small").textContent = `${chip.dataset.appTooltipSource || "Source"} - ${chip.dataset.appTooltipScope || "scope"}`;
  tooltip.querySelector("p").textContent = chip.dataset.appTooltipDetail || "";
  tooltip.querySelector("em").textContent = "Click to correct, hide, or scope this service classification.";
  tooltip.classList.add("open");
  positionAppServiceTooltip(chip, tooltip);
}

function hideAppServiceTooltip() {
  document.querySelector("#appServiceTooltip")?.classList.remove("open");
}

let columnTooltipEl = null;
let columnTooltipHideTimer = 0;

function ensureFloatingColumnTooltip() {
  if (columnTooltipEl?.isConnected) return columnTooltipEl;
  columnTooltipEl = document.createElement("div");
  columnTooltipEl.id = "floatingColumnTooltip";
  columnTooltipEl.className = "column-tooltip column-tooltip-floating";
  columnTooltipEl.setAttribute("role", "tooltip");
  columnTooltipEl.addEventListener("mouseenter", () => clearTimeout(columnTooltipHideTimer));
  columnTooltipEl.addEventListener("mouseleave", hideFloatingColumnTooltipSoon);
  columnTooltipEl.addEventListener("click", event => {
    const help = event.target.closest("[data-column-help]");
    if (!help) return;
    event.stopPropagation();
    state.helpColumn = help.dataset.columnHelp;
    state.modal = "columnHelp";
    hideFloatingColumnTooltipNow();
    render();
  });
  document.body.appendChild(columnTooltipEl);
  return columnTooltipEl;
}

function positionFloatingColumnTooltip(header, tooltip) {
  const gutter = 12;
  const headerRect = header.getBoundingClientRect();
  tooltip.style.visibility = "hidden";
  tooltip.classList.add("open");
  const rect = tooltip.getBoundingClientRect();
  const below = headerRect.bottom + 8;
  const above = headerRect.top - rect.height - 8;
  const top = below + rect.height <= window.innerHeight - gutter ? below : Math.max(gutter, above);
  const idealLeft = headerRect.left + headerRect.width / 2 - rect.width / 2;
  const left = Math.min(Math.max(gutter, idealLeft), Math.max(gutter, window.innerWidth - rect.width - gutter));
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
  tooltip.style.visibility = "visible";
}

function showFloatingColumnTooltip(header) {
  const inlineTooltip = header.querySelector(".column-tooltip:not(.column-tooltip-floating)");
  if (!inlineTooltip) return;
  clearTimeout(columnTooltipHideTimer);
  const tooltip = ensureFloatingColumnTooltip();
  tooltip.innerHTML = inlineTooltip.innerHTML;
  positionFloatingColumnTooltip(header, tooltip);
}

function hideFloatingColumnTooltipSoon() {
  clearTimeout(columnTooltipHideTimer);
  columnTooltipHideTimer = setTimeout(hideFloatingColumnTooltipNow, 120);
}

function hideFloatingColumnTooltipNow() {
  clearTimeout(columnTooltipHideTimer);
  columnTooltipEl?.classList.remove("open");
}

function bindSmartChartTooltips() {
  document.querySelectorAll(".chart-info").forEach(info => {
    info.addEventListener("mouseenter", () => showFloatingChartTooltip(info));
    info.addEventListener("focusin", () => showFloatingChartTooltip(info));
    info.addEventListener("mouseleave", hideFloatingChartTooltipSoon);
    info.addEventListener("focusout", hideFloatingChartTooltipSoon);
  });
}

function bindColumnHelpTooltips() {
  document.querySelectorAll("th .column-tooltip").forEach(inlineTooltip => {
    const header = inlineTooltip.closest("th");
    if (!header) return;
    header.addEventListener("mouseenter", () => showFloatingColumnTooltip(header));
    header.addEventListener("focusin", () => showFloatingColumnTooltip(header));
    header.addEventListener("mouseleave", hideFloatingColumnTooltipSoon);
    header.addEventListener("focusout", hideFloatingColumnTooltipSoon);
  });
}

  return {
    renderChartInfo,
    metricHelp,
    renderChartMetricTooltip,
    ensureFloatingChartTooltip,
    positionFloatingChartTooltip,
    showFloatingChartTooltip,
    hideFloatingChartTooltipSoon,
    hideFloatingChartTooltipNow,
    ensureAppServiceTooltip,
    positionAppServiceTooltip,
    showAppServiceTooltip,
    hideAppServiceTooltip,
    ensureFloatingColumnTooltip,
    positionFloatingColumnTooltip,
    showFloatingColumnTooltip,
    hideFloatingColumnTooltipSoon,
    hideFloatingColumnTooltipNow,
    bindSmartChartTooltips,
    bindColumnHelpTooltips
  };
}
