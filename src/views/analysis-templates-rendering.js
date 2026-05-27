export function createAnalysisTemplatesRendering(ctx) {
  const {
    ANALYSIS_TEMPLATES,
    icons,
    escapeHtml,
    formatNumber
  } = ctx;

function renderAnalysisTemplates() {
  return `<div class="template-workbench">
    <section class="advisor-hero">
      <div>
        <span class="tooltip-kicker">Analysis templates</span>
        <h3>Apply expert context in one click</h3>
        <p>Templates tune filters, table columns, chart widgets, and the starting investigation view for common Linux network workloads.</p>
      </div>
      <div class="advisor-score">
        <span>${formatNumber(Object.keys(ANALYSIS_TEMPLATES).length)}</span>
        <small>templates</small>
      </div>
    </section>
    <div class="template-grid">
      ${Object.entries(ANALYSIS_TEMPLATES).map(([id, template]) => `<article class="template-card">
        <header><i class="${template.icon}"></i><strong>${escapeHtml(template.name)}</strong></header>
        <p>${escapeHtml(template.focus)}</p>
        <div class="template-meta">
          <span>${template.filter ? escapeHtml(template.filter) : "no filter"}</span>
          <span>${formatNumber(template.columns.length)} columns</span>
          <span>${formatNumber(template.charts.length)} charts</span>
        </div>
        <ul>${template.checks.map(check => `<li>${escapeHtml(check)}</li>`).join("")}</ul>
        <footer><button class="primary" data-template-apply="${id}">${icons.focus} Apply template</button></footer>
      </article>`).join("")}
    </div>
  </div>`;
}

  return { renderAnalysisTemplates };
}
