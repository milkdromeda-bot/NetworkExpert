import { buildBaselineNarrative } from "../analysis/compare.js";

export function renderBaselineNarrative(ctx, comparison) {
  const { state, escapeHtml } = ctx;
  const narrative = buildBaselineNarrative(comparison, state.baseline?.anomalies || [], state.anomalies);
  if (!narrative) return "";
  return `<section class="baseline-narrative">
    <div class="baseline-verdict ${narrative.changes.length ? "changed" : "stable"}">
      <i class="${narrative.changes.length ? "ri-alarm-warning-line" : "ri-checkbox-circle-line"}"></i>
      <strong>${escapeHtml(narrative.verdict)}</strong>
    </div>
    <div class="baseline-columns">
      ${narrative.changes.length ? `<div class="baseline-col changes"><h5><i class="ri-arrow-up-circle-line"></i> What changed</h5><ul>${narrative.changes.map(c => `<li>${escapeHtml(c)}</li>`).join("")}</ul></div>` : ""}
      ${narrative.stable.length ? `<div class="baseline-col stable"><h5><i class="ri-checkbox-circle-line"></i> What stayed healthy</h5><ul>${narrative.stable.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul></div>` : ""}
      ${narrative.newAnomalies.length ? `<div class="baseline-col anomalies"><h5><i class="ri-error-warning-line"></i> New anomalies (${narrative.newAnomalies.length})</h5><ul>${narrative.newAnomalies.map(a => `<li><span class="risk ${a.severity}">${a.severity}</span> ${escapeHtml(a.title || a.metric)}</li>`).join("")}</ul>${narrative.preExistingAnomalies ? `<small>${narrative.preExistingAnomalies} anomaly(ies) already existed in baseline</small>` : ""}</div>` : ""}
    </div>
  </section>`;
}

export function renderDelta(ctx, metric, value) {
  const { formatMetricValue } = ctx;
  const cls = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const sign = value > 0 ? "+" : "";
  return `<span class="delta ${cls}">${sign}${formatMetricValue(metric, value)}</span>`;
}
