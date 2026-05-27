export function buildIncidentReportHtml({ sourceName, captureQuality, matrix, hypotheses, stories, multiSocket, rateAlerts, playbook, comparison, aiSummary, timestamp, theme, fixLatency, jvmGc }) {
  const esc = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const now = timestamp || new Date().toISOString();
  const light = theme === "light";

  const verdictSection = comparison?.verdict
    ? `<section class="ir-section"><h2>Verdict</h2><p class="ir-verdict">${esc(comparison.verdict)}</p>
       ${comparison.changes?.length ? `<h3>What changed</h3><ul>${comparison.changes.map(c => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
       ${comparison.stable?.length ? `<h3>What stayed healthy</h3><ul>${comparison.stable.map(s => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
       </section>` : "";

  const matrixSection = matrix?.causes?.length
    ? `<section class="ir-section"><h2>Root Cause Matrix</h2><table><thead><tr><th>Cause</th><th>Confidence</th><th>Signals</th></tr></thead><tbody>${matrix.causes.map(c => `<tr class="${c.confidence >= 0.6 ? "high" : c.confidence >= 0.3 ? "med" : ""}"><td>${esc(c.label)}</td><td><strong>${Math.round(c.confidence * 100)}%</strong></td><td>${c.present.join(", ") || "none"}</td></tr>`).join("")}</tbody></table>${matrix.ambiguous ? `<p class="ir-warn">⚠️ Ambiguous — multiple causes compete. Collect more evidence.</p>` : ""}</section>` : "";

  const storiesSection = stories?.length
    ? `<section class="ir-section"><h2>Causal Narrative</h2>${stories.slice(0, 4).map(s => `<div class="ir-story"><h3>${esc(s.title)} <small>(${s.matchedSteps.length}/${s.totalSteps} steps)</small></h3><ul>${s.narrative.map((line, i) => `<li class="${i === s.narrative.length - 1 ? "conclusion" : i === s.narrative.length - 2 ? "critical" : ""}">${esc(line)}</li>`).join("")}</ul></div>`).join("")}</section>` : "";

  const multiSocketSection = multiSocket?.length
    ? `<section class="ir-section"><h2>Multi-Socket Correlation</h2>${multiSocket.slice(0, 4).map(e => `<div class="ir-group"><strong>${esc(e.narrative.title)}</strong><p>${esc(e.narrative.line)}</p><p class="ir-conclusion">${esc(e.narrative.conclusion)}</p></div>`).join("")}</section>` : "";

  const rateSection = rateAlerts?.length
    ? `<section class="ir-section"><h2>Velocity Alerts</h2><table><thead><tr><th>Time</th><th>Metric</th><th>Process</th><th>Rate</th><th>Detail</th></tr></thead><tbody>${rateAlerts.slice(0, 8).map(a => `<tr class="${a.severity}"><td>${esc(new Date(a.epochMs).toISOString().slice(11, 23))}</td><td>${esc(a.label)}</td><td>${esc(a.process || a.peer)}</td><td><strong>${esc(a.rateFormatted)}</strong></td><td>${esc(a.prevValue)} → ${esc(a.currValue)} in ${a.dtMs}ms</td></tr>`).join("")}</tbody></table></section>` : "";

  const hypothesesSection = hypotheses?.length
    ? `<section class="ir-section"><h2>Diagnostic Hypotheses</h2>${hypotheses.slice(0, 4).map(h => `<div class="ir-hyp ${h.severity}"><h3>${esc(h.title)} <span class="sev">${esc(h.severity)}</span> <span class="conf">${Math.round(h.confidenceScore * 100)}%</span></h3><p>${esc(h.summary)}</p><details><summary>Evidence</summary><ul>${h.evidence.map(e => `<li>${esc(e)}</li>`).join("")}</ul></details>${h.confidenceDetail?.wouldConfirm ? `<details><summary>Confirm / Reject</summary><p><b>Would confirm:</b> ${esc(h.confidenceDetail.wouldConfirm)}</p><p><b>Would reject:</b> ${esc(h.confidenceDetail.wouldReject)}</p></details>` : ""}</div>`).join("")}</section>` : "";

  const playbookSection = playbook
    ? `<section class="ir-section"><h2>Recommended Playbook: ${esc(playbook.title)}</h2>
       <h3>Local</h3><pre>${esc(playbook.local.join("\n"))}</pre>
       <h3>Peer</h3><pre>${esc(playbook.peer.join("\n"))}</pre>
       <h3>Host</h3><pre>${esc(playbook.host.join("\n"))}</pre>
       <h3>⚠️ Do NOT conclude</h3><ul>${playbook.doNotConclude.map(w => `<li>${esc(w)}</li>`).join("")}</ul>
       <h3>Mitigation</h3><ul>${playbook.mitigation.map(m => `<li>${esc(m)}</li>`).join("")}</ul>
       </section>` : "";

  const qualitySection = captureQuality
    ? `<section class="ir-section ir-quality"><h2>Capture Quality: ${esc(captureQuality.grade)} (${captureQuality.score}/100)</h2><p>${esc(captureQuality.summary)}</p></section>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Incident Report — ${esc(sourceName)} — ${now.slice(0, 10)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:${light ? "#f4f6f9" : "#0a0f16"};color:${light ? "#1a2533" : "#dde8f4"};padding:32px;max-width:960px;margin:0 auto;line-height:1.6}
h1{font-size:20px;margin-bottom:4px}
h2{font-size:15px;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid ${light ? "#d0d8e0" : "#1e2d3d"}}
h3{font-size:13px;margin:10px 0 6px;color:#8caab8}
.ir-meta{color:#8c9aab;font-size:12px;margin-bottom:24px}
.ir-section{margin-bottom:24px;padding:16px;border:1px solid ${light ? "#d0d8e0" : "#1e2d3d"};border-radius:8px;background:${light ? "#fff" : "#080d14"}}
.ir-verdict{font-size:14px;font-weight:700;color:#4cde8a;padding:10px;background:rgba(76,222,138,.08);border-radius:6px}
.ir-warn{color:#ffd166;font-size:12px;margin-top:8px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
th,td{padding:6px 8px;border:1px solid ${light ? "#d0d8e0" : "#1e2d3d"};text-align:left}
th{background:${light ? "#e3eaf2" : "#0f1620"};font-weight:600;color:${light ? "#1a2533" : "#dde8f4"}}
tr.high td:nth-child(2){color:#4cde8a}
tr.med td:nth-child(2){color:#ffd166}
tr.critical td{color:#ff5c77}
.ir-story{margin:10px 0;padding:10px;border-left:3px solid #4cde8a;background:rgba(76,222,138,.03);border-radius:0 6px 6px 0}
.ir-story ul{padding-left:16px;font-size:12px;font-family:monospace}
.ir-story .conclusion{color:#4cde8a;font-weight:700}
.ir-story .critical{color:#ff5c77;font-weight:600}
.ir-group{margin:8px 0;padding:8px;border-left:3px solid #ff9f43;background:rgba(255,159,67,.03);border-radius:0 6px 6px 0}
.ir-conclusion{color:#ff9f43;font-weight:600;font-size:12px}
.ir-hyp{margin:10px 0;padding:10px;border:1px solid ${light ? "#d0d8e0" : "#1e2d3d"};border-radius:6px}
.ir-hyp ul{padding-left:24px}
.ir-hyp li{margin:4px 0}
.ir-hyp.critical{border-left:3px solid #ff5c77}
.ir-hyp.high{border-left:3px solid #ff9f43}
.ir-hyp.medium{border-left:3px solid #ffd166}
.sev{font-size:10px;padding:2px 6px;border-radius:3px;background:rgba(255,159,67,.15);color:#ff9f43}
.conf{font-size:10px;color:#8c9aab}
pre{background:#0f1620;padding:10px;border-radius:6px;font-size:11px;overflow-x:auto;color:#a8c4d8}
details{margin:6px 0}
summary{cursor:pointer;font-size:12px;color:#8caab8}
.ir-quality{border-left:3px solid ${captureQuality?.score >= 70 ? "#4cde8a" : captureQuality?.score >= 55 ? "#ffd166" : "#ff5c77"}}
.ir-ai-summary{border-left:3px solid #709dff;background:linear-gradient(135deg,rgba(112,157,255,.08),transparent 50%)}
.ir-ai-summary p{font-size:14px;line-height:1.7}
</style></head>
<body>
<h1>🔍 Incident Report — ${esc(sourceName)}</h1>
<p class="ir-meta">Generated ${now} by NetworkExpert</p>
${aiSummary ? `<section class="ir-section ir-ai-summary"><p>${esc(aiSummary)}</p></section>` : ""}
${qualitySection}
${verdictSection}
${matrixSection}
${storiesSection}
${multiSocketSection}
${rateSection}
${hypothesesSection}
${playbookSection}
${fixLatency ? `<section class="ir-section"><h2>FIX Latency Correlation</h2>
<p><strong>${fixLatency.summary.totalRecords}</strong> messages · <strong>${fixLatency.summary.totalSpikes}</strong> spikes · <strong>${fixLatency.summary.correlatedCount}</strong> with ss evidence · Endpoint match: <strong>${Math.round((fixLatency.summary.endpointMatchRate || 0) * 100)}%</strong></p>
<p>Cause breakdown: Network: ${fixLatency.summary.causeCounts?.network || 0} · GC: ${fixLatency.summary.causeCounts?.gc || 0} · Kernel: ${fixLatency.summary.causeCounts?.kernel || 0} · CPU: ${fixLatency.summary.causeCounts?.cpu || 0} · Unknown: ${fixLatency.summary.causeCounts?.unknown || 0}</p>
${fixLatency.topSpikes?.length ? `<h3>Top spikes</h3><table><thead><tr><th>Time</th><th>Lag</th><th>Endpoint</th><th>Cause</th><th>Score</th><th>Signals</th></tr></thead><tbody>${fixLatency.topSpikes.map(s => `<tr><td>${new Date(s.receiveMs).toISOString().slice(11, 23)}</td><td><strong>${s.lagMs.toFixed(1)}ms</strong></td><td>${esc(s.endpoint)}</td><td>${esc(s.cause || "unknown")}</td><td>${s.score.toFixed(2)}</td><td>${esc(s.signals?.join(", ") || "")}</td></tr>`).join("")}</tbody></table>` : ""}
</section>` : ""}
${jvmGc ? `<section class="ir-section"><h2>JVM GC Correlation</h2>
<p>Correlated pauses: <strong>${jvmGc.summary.correlatedCount || 0}</strong> / ${jvmGc.summary.totalPauses || 0} · Max score: <strong>${(jvmGc.summary.maxScore || 0).toFixed(2)}</strong> · Severity: ${esc(jvmGc.summary.overallSeverity || "none")}</p>
${jvmGc.analysisWindow ? `<p>Analysis window: ${new Date(jvmGc.analysisWindow.start).toISOString().slice(11, 19)} → ${new Date(jvmGc.analysisWindow.end).toISOString().slice(11, 19)} UTC (${jvmGc.analysisWindow.filteredPauses}/${jvmGc.analysisWindow.totalPauses} pauses in period)</p>` : ""}
</section>` : ""}
</body></html>`;
}
