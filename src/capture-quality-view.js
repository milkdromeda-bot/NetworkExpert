export function formatQualityDuration(ms, ctx = {}) {
  const formatNumber = ctx.formatNumber || (value => String(value));
  const numberFormatterWith = ctx.numberFormatterWith || ((min, max) => new Intl.NumberFormat(undefined, {
    minimumFractionDigits: min,
    maximumFractionDigits: max
  }));
  const numeric = Number(ms || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "n/a";
  if (numeric < 1000) return `${formatNumber(Math.round(numeric))} ms`;
  if (numeric < 60_000) return `${numberFormatterWith(1, 1).format(numeric / 1000)} s`;
  return `${numberFormatterWith(1, 1).format(numeric / 60_000)} min`;
}

function qualityDuration(ms, ctx) {
  return formatQualityDuration(ms, ctx);
}

function renderCaptureQualityMetric(label, value, hint = "", className = "", ctx = {}) {
  const escapeHtml = ctx.escapeHtml || (value => String(value ?? ""));
  return `<article${className ? ` class="${escapeHtml(className)}"` : ""}>
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
    ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
  </article>`;
}

function renderCaptureQualityFeature(card, ctx = {}) {
  const escapeHtml = ctx.escapeHtml || (value => String(value ?? ""));
  const safeCard = card || {};
  const icon = safeCard.status === "ok" ? "ri-checkbox-circle-line" : safeCard.status === "partial" ? "ri-error-warning-line" : "ri-close-circle-line";
  return `<article class="capture-quality-feature ${escapeHtml(safeCard.status || "missing")}">
    <i class="${icon}" aria-hidden="true"></i>
    <div>
      <strong>${escapeHtml(safeCard.label || "")}</strong>
      <p>${escapeHtml(safeCard.detail || "")}</p>
      <small>${escapeHtml(`${safeCard.points || 0}/${safeCard.weight || 0} pts${safeCard.commandDetected ? " - command/evidence detected" : ""}`)}</small>
    </div>
  </article>`;
}

function renderCaptureQualityReadiness(item, ctx = {}) {
  const escapeHtml = ctx.escapeHtml || (value => String(value ?? ""));
  const safeItem = item || {};
  const icon = safeItem.status === "strong" ? "ri-shield-check-line" : safeItem.status === "partial" ? "ri-error-warning-line" : "ri-shield-cross-line";
  const blockers = safeItem.blockers?.length ? `<small>Blocking gaps: ${escapeHtml(safeItem.blockers.join(", "))}</small>` : "";
  const helpful = safeItem.helpfulMissing?.length ? `<small>Helpful next: ${escapeHtml(safeItem.helpfulMissing.join(", "))}</small>` : "";
  return `<article class="capture-quality-readiness ${escapeHtml(safeItem.status || "weak")}">
    <i class="${icon}" aria-hidden="true"></i>
    <div>
      <strong>${escapeHtml(safeItem.label || "")}</strong>
      <p>${escapeHtml(safeItem.detail || "")}</p>
      ${blockers || helpful ? `<div class="capture-quality-readiness-notes">${blockers}${helpful}</div>` : ""}
    </div>
  </article>`;
}

function renderCaptureQualityList(title, items = [], empty, className = "", ctx = {}) {
  const escapeHtml = ctx.escapeHtml || (value => String(value ?? ""));
  return `<section class="capture-quality-list ${escapeHtml(className)}">
    <h4>${escapeHtml(title)}</h4>
    ${items.length ? `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : `<p>${escapeHtml(empty)}</p>`}
  </section>`;
}

export function renderCaptureQualityReportView(report, ctx = {}) {
  const escapeHtml = ctx.escapeHtml || (value => String(value ?? ""));
  const formatNumber = ctx.formatNumber || (value => String(value ?? 0));
  const numberFormatterWith = ctx.numberFormatterWith || ((min, max) => new Intl.NumberFormat(undefined, {
    minimumFractionDigits: min,
    maximumFractionDigits: max
  }));
  const icons = ctx.icons || {};
  const safeReport = report || {};
  const m = safeReport.metrics || {};
  const featureCards = safeReport.featureCards || [];
  const okFeatures = featureCards.filter(card => card.status === "ok").length;
  const weakFeatures = featureCards.filter(card => card.status === "missing").length;
  const durationCtx = { formatNumber, numberFormatterWith };
  const cadenceHintBase = m.intervalCount
    ? `min ${qualityDuration(m.minIntervalMs, durationCtx)}, max ${qualityDuration(m.maxIntervalMs, durationCtx)}`
    : "Need repeated timestamps";
  const cadenceHint = m.requestedIntervalMs
    ? `${cadenceHintBase} - command sleep ${qualityDuration(m.requestedIntervalMs, durationCtx)}${m.cadenceDriftRatio ? ` (${numberFormatterWith(1, 1).format(m.cadenceDriftRatio)}x)` : ""}`
    : cadenceHintBase;
  const continuity = m.medianSocketContinuity ? `${Math.round(m.medianSocketContinuity * 100)}% median continuity` : "no continuity signal";
  const socketCoverageHint = `${formatNumber(m.uniqueSocketIdentities || 0)} unique / ${formatNumber(m.oneShotSocketIdentities || 0)} one-shot - ${continuity}`;
  const score = Number(safeReport.score || 0);
  const grade = safeReport.grade || "unknown";
  const scoreColor = score >= 70 ? "#2cc62c" : score >= 40 ? "#ffd166" : "#ff5c77";

  return `<div class="capture-quality-shell">
    <section class="capture-quality-hero ${escapeHtml(grade)}">
      <div>
        <span class="tooltip-kicker">Capture Quality Report</span>
        <h3>${escapeHtml(grade)} evidence readiness</h3>
        <p>${escapeHtml(safeReport.summary || "")}</p>
        <div class="capture-quality-source">
          <span><i class="ri-file-search-line"></i> ${escapeHtml(safeReport.sourceName || "unknown source")}</span>
          <span><i class="ri-checkbox-circle-line"></i> ${formatNumber(okFeatures)} ready</span>
          <span><i class="ri-error-warning-line"></i> ${formatNumber(weakFeatures)} missing</span>
        </div>
      </div>
      <div class="capture-quality-score" aria-label="Capture quality score ${score} out of 100">
        <svg viewBox="0 0 120 120" width="90" height="90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10" stroke-linecap="round" transform="rotate(-225 60 60)" stroke-dasharray="236 314"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke="${scoreColor}" stroke-width="10" stroke-linecap="round" transform="rotate(-225 60 60)" stroke-dasharray="${Math.round(score * 2.36)} 314" style="transition:stroke-dasharray 0.5s"/>
          <text x="60" y="66" text-anchor="middle" fill="var(--text)" font-size="22" font-weight="700">${score}%</text>
        </svg>
      </div>
    </section>

    <section class="capture-quality-metrics">
      ${renderCaptureQualityMetric("Snapshots", formatNumber(m.snapshotCount || 0), `${formatNumber(m.timestampBlockCount || 0)} timestamp block(s)`, "", ctx)}
      ${renderCaptureQualityMetric("Duration", qualityDuration(m.durationMs, durationCtx), "timestamp window", "", ctx)}
      ${renderCaptureQualityMetric("Cadence", qualityDuration(m.medianIntervalMs, durationCtx), cadenceHint, "", ctx)}
      ${renderCaptureQualityMetric("Parsed sockets", formatNumber(m.parsedSocketCount || 0), `${formatNumber(m.activeSocketRows || 0)} row(s) across snapshots`, "", ctx)}
      ${renderCaptureQualityMetric("Rows with rates", formatNumber(m.observedRateRows || 0), "delivery/pacing/send evidence", "", ctx)}
      ${renderCaptureQualityMetric("Socket coverage", formatNumber(m.uniqueSocketIdentities || 0), socketCoverageHint, "collection-check", ctx)}
    </section>

    <section class="capture-quality-panel capture-quality-readiness-panel">
      <header>
        <strong>Diagnostic readiness</strong>
        <span>what this capture can support safely</span>
      </header>
      <div class="capture-quality-readiness-grid">
        ${(safeReport.diagnosticReadiness || []).map(item => renderCaptureQualityReadiness(item, ctx)).join("")}
      </div>
    </section>

    <section class="capture-quality-grid">
      <div class="capture-quality-panel">
        <header>
          <strong>Evidence coverage</strong>
          <span>what this capture can support</span>
        </header>
        <div class="capture-quality-feature-grid">
          ${featureCards.map(card => renderCaptureQualityFeature(card, ctx)).join("")}
        </div>
      </div>
      <div class="capture-quality-side">
        ${renderCaptureQualityList("Warnings", safeReport.warnings || [], "No capture-quality warning detected.", "warnings", ctx)}
        ${renderCaptureQualityList("Missing evidence", safeReport.missing || [], "No important evidence gap detected.", "missing", ctx)}
        ${safeReport.dataIntegrity?.length ? `<section class="capture-quality-list data-integrity">
          <h4><i class="ri-shield-check-line"></i> Data integrity</h4>
          <ul>${safeReport.dataIntegrity.map(issue => `<li class="${escapeHtml(issue.severity)}"><span class="risk ${escapeHtml(issue.severity)}">${escapeHtml(issue.severity)}</span> ${escapeHtml(issue.message)}</li>`).join("")}</ul>
        </section>` : ""}
      </div>
    </section>

    <section class="capture-quality-recommendations">
      <div>
        <h4>Recommended next collection</h4>
        <p>Use this when the current capture is weak, too short, or missing expert fields. Keep the interval realistic for the host and storage path.</p>
      </div>
      <pre class="code">${escapeHtml(safeReport.recommendedCommand || "")}</pre>
      <button class="primary" type="button" data-action="copyQualityCommand">${icons.copy || ""} Copy recommended command</button>
    </section>

    <section class="capture-quality-bottom">
      ${renderCaptureQualityList("Strengths", (safeReport.strengths || []).slice(0, 6), "No strong capture signal yet.", "strengths", ctx)}
      ${renderCaptureQualityList("Practical recommendations", safeReport.recommendations || [], "The current capture pattern is already strong.", "recommendations", ctx)}
      ${renderCaptureQualityList("Interpretation limits", safeReport.limits || [], "No limits listed.", "limits", ctx)}
    </section>
  </div>`;
}
