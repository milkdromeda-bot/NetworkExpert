export function createAnomalyFieldsRendering(ctx) {
  const {
    state,
    FIELD_DOCS,
    FIELD_GUIDANCE,
    escapeHtml,
    formatNumber,
    formatMetricValue,
    metricLabel,
    thresholdFor
  } = ctx;

function renderAnomalies(items) {
  const filtered = filteredAnomalies(items);
  const metrics = [...new Set(items.map(item => item.metric).filter(Boolean))].sort();
  return `<div class="anomaly-workbench">
    <div class="anomaly-controls">
      <select id="anomalySeverity"><option value="all">all severities</option>${["critical", "high", "medium", "low"].map(v => `<option value="${v}" ${state.anomalyFilters.severity === v ? "selected" : ""}>${v}</option>`).join("")}</select>
      <select id="anomalyMetric"><option value="all">all metrics</option>${metrics.map(v => `<option value="${escapeHtml(v)}" ${state.anomalyFilters.metric === v ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select>
      <select id="anomalySort">${[
        ["priority", "priority"],
        ["metric", "metric"],
        ["title", "title"],
        ["socket", "socket context"]
      ].map(([value, label]) => `<option value="${value}" ${state.anomalyFilters.sort === value ? "selected" : ""}>sort ${label}</option>`).join("")}</select>
      <input id="anomalyText" placeholder="filter title, detail, metric..." value="${escapeHtml(state.anomalyFilters.text)}" />
      <span class="hint">${formatNumber(filtered.length)} / ${formatNumber(items.length)} shown</span>
    </div>
    ${filtered.length ? `<div class="anomaly-list dense">${filtered.map(a => `<article class="anomaly ${a.severity}">
      <header><strong><span class="risk ${a.severity}">${a.severity}</span> ${escapeHtml(a.title)}</strong><span class="metric-chip">${escapeHtml(a.metric || "socket")}</span></header>
      <p>${escapeHtml(a.detail)}</p>
      <footer><button data-jump="${escapeHtml(a.socketId)}"><i class="ri-focus-3-line"></i> View context</button></footer>
    </article>`).join("")}</div>` : `<div class="empty"><svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin-bottom:8px;opacity:0.4"><path d="M24 8l18 32H6L24 8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M24 20v10M24 34v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><br>No anomaly matches the current filters.</div>`}
  </div>`;
}

function filteredAnomalies(items) {
  const f = state.anomalyFilters;
  const rank = { critical: 4, high: 3, medium: 2, low: 1 };
  return items.filter(item => {
    if (f.severity !== "all" && item.severity !== f.severity) return false;
    if (f.metric !== "all" && item.metric !== f.metric) return false;
    const haystack = `${item.title} ${item.detail} ${item.metric} ${item.socketId}`.toLowerCase();
    return !f.text || haystack.includes(f.text.toLowerCase());
  }).sort((a, b) => {
    if (f.sort === "metric") return String(a.metric).localeCompare(String(b.metric)) || rank[b.severity] - rank[a.severity];
    if (f.sort === "title") return a.title.localeCompare(b.title) || rank[b.severity] - rank[a.severity];
    if (f.sort === "socket") return String(a.socketId).localeCompare(String(b.socketId)) || rank[b.severity] - rank[a.severity];
    return rank[b.severity] - rank[a.severity] || a.title.localeCompare(b.title);
  });
}

function renderFields() {
  const entries = Object.entries(FIELD_DOCS).sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const midpoint = Math.ceil(entries.length / 2);
  const columns = [entries.slice(0, midpoint), entries.slice(midpoint)];
  return `<div class="field-directory">
    ${columns.map((items, index) => `<section class="field-column" aria-label="Fields ${index === 0 ? "A-M" : "N-Z"}">
      ${items.map(([key, text]) => renderFieldDocCard(key, text)).join("")}
    </section>`).join("")}
  </div>`;
}

function renderFieldDocCard(key, text) {
  const sentences = String(text || "").split(/(?<=\.)\s+/).filter(Boolean);
  const body = sentences.length > 1
    ? `<p>${escapeHtml(sentences[0])}</p><ul>${sentences.slice(1).map(sentence => `<li>${escapeHtml(sentence)}</li>`).join("")}</ul>`
    : `<p>${escapeHtml(text)}</p>`;
  const firstSentence = String(text || "").split(/(?<=\.)\s+/)[0] || ""; return `<div class="field-row" data-action="openMetricIntelligence" data-field="${escapeHtml(key)}" title="Click for full metric intelligence"><strong>${escapeHtml(key)}</strong><span class="field-desc">${escapeHtml(firstSentence)}</span></div>`;
}

function renderFieldHealth(key) {
  const guidance = FIELD_GUIDANCE[key];
  if (!guidance) return "";
  const thresholdRefs = guidance.thresholds || (guidance.metric ? [{ label: metricLabel(guidance.metric), metric: guidance.metric }] : []);
  const thresholdRows = thresholdRefs
    .map(ref => {
      const t = thresholdFor(ref.metric);
      if (!Number.isFinite(t.warn) && !Number.isFinite(t.danger)) return "";
      const op = t.inverse ? "<=" : ">=";
      return `<span class="field-threshold-row">
        <b>${escapeHtml(ref.label || metricLabel(ref.metric))}</b>
        ${Number.isFinite(t.warn) ? `<em class="warn">Warn ${op} ${escapeHtml(formatMetricValue(ref.metric, t.warn))}</em>` : ""}
        ${Number.isFinite(t.danger) ? `<em class="danger">Critical ${op} ${escapeHtml(formatMetricValue(ref.metric, t.danger))}</em>` : ""}
      </span>`;
    })
    .filter(Boolean)
    .join("");
  return `<div class="field-health">
    ${guidance.typical ? `<span class="field-typical"><b>Typical</b><em>${escapeHtml(guidance.typical)}</em></span>` : ""}
    ${thresholdRows ? `<div class="field-thresholds">${thresholdRows}</div>` : ""}
  </div>`;
}

  return {
    renderAnomalies,
    filteredAnomalies,
    renderFields,
    renderFieldDocCard,
    renderFieldHealth
  };
}
