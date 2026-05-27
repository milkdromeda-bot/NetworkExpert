export function createDiagnosisAdvisorView(ctx) {
  const {
    state,
    icons,
    escapeHtml,
    formatNumber,
    diagnosticHypotheses,
    cachedRootCauseMatrix,
    captureQualityReport,
    buildAiSummary,
    cachedStories,
    cachedMultiSocket,
    cachedRateAlerts,
    buildBaselineNarrative,
    buildComparison,
    playbookForHypothesis,
    resolvePlaybook,
    detectTrends,
    renderWhatIfSimulation
  } = ctx;

function renderDiagnosis() {
  const hypotheses = diagnosticHypotheses();
  const top = hypotheses[0];
  const matrix = cachedRootCauseMatrix();
  const qualityCap = (captureQualityReport().score || 0) < 55;
  if (qualityCap) {
    const cap = (captureQualityReport().score || 0) < 35 ? 0.3 : 0.5;
    for (const c of matrix.causes) { if (c.confidence > cap) c.confidence = cap; }
  }
  const view = state.diagnosisView || "matrix";
  const aiSummary = buildAiSummary({
    matrix,
    stories: cachedStories(),
    multiSocket: state._multiSocketEvents || cachedMultiSocket(),
    rateAlerts: state._rateAlerts || cachedRateAlerts(),
    captureQuality: captureQualityReport(),
    hypotheses,
    comparison: state.baseline ? buildBaselineNarrative(buildComparison(), state.baseline.anomalies || [], state.anomalies) : null
  });
  return `<div class="diagnosis-shell">
    <section class="ai-summary-block">
      <div class="ai-summary-icon"><i class="ri-sparkling-2-line"></i></div>
      <div class="ai-summary-lines">${aiSummary.split(". ").filter(Boolean).map((s, i) => {
        const text = s.endsWith(".") ? s : s + ".";
        const formatted = text
          .replace(/(\d+:\d+:\d+\s*UTC)/g, "<b>$1</b>")
          .replace(/(\d+\.?\d*[KMG]B\/s)/g, "<b>$1</b>")
          .replace(/(\d+[KMG]B\s*?\s*\d+\.?\d*[KMG]B)/g, "<b>$1</b>")
          .replace(/(java:\d+|nginx:\d+)/g, "<b>$1</b>")
          .replace(/(\d+%)/g, "<b>$1</b>")
          .replace(/(ambiguous|More evidence needed)/g, "<i>$1</i>")
          .replace(/(Network path appears healthy|not network|application-side)/gi, "<i>$1</i>")
          .replace(/(Most likely cause|Root cause is)/g, "<i>$1</i>");
        if (i === 0) return `<p class="ai-lead">${formatted}</p>`;
        if (text.includes("Root cause") || text.includes("Most likely")) return `<p class="ai-cause">${formatted}</p>`;
        return `<p class="ai-detail">${formatted}</p>`;
      }).join("")}</div>
    </section>
    <div class="pill-toggle" data-active="${view === "hypotheses" ? "1" : "0"}">
      <div class="pill-slider"></div>
      <button class="${view === "matrix" ? "active" : ""}" data-action="diagnosisView" data-value="matrix"><i class="ri-grid-line"></i> Root Cause Matrix</button>
      <button class="${view === "hypotheses" ? "active" : ""}" data-action="diagnosisView" data-value="hypotheses"><i class="ri-file-list-3-line"></i> Hypotheses</button>
    </div>
    ${view === "matrix" ? (matrix.causes.length ? renderRootCauseMatrix(matrix) : "<div class=\"empty\">No socket data to build the matrix.</div>") : `<div class="diagnosis-grid">${hypotheses.map(renderDiagnosticHypothesis).join("")}</div>`}
  </div>`;
}

function renderRootCauseMatrix(matrix) {
  return `<section class="root-cause-matrix">
    <header>
      <h4><i class="ri-grid-line"></i> Root Cause Matrix</h4>
      ${matrix.ambiguous ? `<span class="risk medium">Ambiguous - multiple causes compete</span>` : ""}
    </header>
    <div class="matrix-grid">
      <div class="matrix-header"><span>Confidence</span><span>Signals</span><span>Probable cause</span></div>
      ${matrix.causes.map(cause => {
        const pct = Math.round(cause.confidence * 100);
        const level = pct >= 60 ? "high" : pct >= 30 ? "medium" : "low";
        return `<div class="matrix-cell ${level}${matrix.topCause?.id === cause.id ? " top" : ""}">
          <div class="matrix-bar" style="width:${pct}%"></div>
          <span class="matrix-pct">${pct}%</span>
          <small>${cause.signalCount}/${cause.totalSignals}</small>
          <strong>${escapeHtml(cause.label)}</strong>
        </div>`;
      }).join("")}
    </div>
  </section>`;
}

function renderDiagnosticHypothesis(item) {
  return `<article class="advisor-card diagnosis-card ${escapeHtml(item.severity)}">
    <header>
      <div>
        <span class="risk ${escapeHtml(item.severity)}">${escapeHtml(item.severity)}</span>
        <strong>${escapeHtml(item.title)}</strong>
      </div>
      <span class="confidence${item.confidenceCapped ? " capped" : ""}" title="${item.confidenceCapped ? escapeHtml(item.confidenceCapReason) : `${item.confidenceSignals} converging signal(s), ${item.confidenceCounters} counter-evidence(s)`}"><span class="confidence-bar" style="width:${Math.round((item.confidenceScore || 0) * 100)}%"></span>${Math.round((item.confidenceScore || 0) * 100)}% confidence${item.confidenceCapped ? " ?? capped" : ""}</span>
    </header>
    <p>${escapeHtml(item.summary)}</p>
    <div class="evidence-row">
      <span><i class="ri-radar-line"></i> ${escapeHtml(item.category)}</span>
      <span><i class="ri-plug-line"></i> ${formatNumber(item.count)} socket(s)</span>
      ${item.processes.length ? `<span><i class="ri-cpu-line"></i> ${escapeHtml(item.processes.join(", "))}</span>` : ""}
      ${item.peers.length ? `<span><i class="ri-exchange-line"></i> ${escapeHtml(item.peers.join(", "))}</span>` : ""}
    </div>
    <div class="diagnosis-confidence-summary" style="font-size:11px;color:var(--muted);padding:4px 0;border-top:1px solid var(--line);margin-top:4px">
      <span style="color:#2cc62c" title="Signals supporting this hypothesis"><i class="ri-check-line"></i> ${item.confidenceDetail?.strong?.length || item.evidence.length} present</span>
      <span style="color:#ff9f43;margin-left:10px" title="Counter-evidence weakening this hypothesis"><i class="ri-close-line"></i> ${item.confidenceDetail?.contra?.length || item.counterEvidence.length} counter</span>
      <span style="color:#8c9aab;margin-left:10px" title="Expected signals not found in this capture"><i class="ri-question-line"></i> ${item.confidenceDetail?.missing?.length || 0} missing</span>
    </div>
    <div class="advisor-columns">
      <div>
        <b style="color:#2cc62c">Signals present</b>
        <ul>${item.evidence.length ? item.evidence.map(entry => `<li>${escapeHtml(entry)}</li>`).join("") : "<li>No strong signal.</li>"}</ul>
      </div>
      <div>
        <b style="color:#ff9f43">Counter-evidence</b>
        <ul>${item.counterEvidence.length ? item.counterEvidence.map(entry => `<li>${escapeHtml(entry)}</li>`).join("") : "<li>None obvious.</li>"}</ul>
      </div>
      ${item.confidenceDetail?.missing?.length ? `<div>
        <b style="color:#8c9aab">Missing evidence</b>
        <ul>${item.confidenceDetail.missing.map(entry => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>
      </div>` : ""}
    </div>
    <details>
      <summary><i class="ri-terminal-box-line"></i> Validation commands</summary>
      <pre class="code">${escapeHtml(item.commands.join("\n"))}</pre>
    </details>
    ${item.actionableCommands?.length ? `<details class="diagnosis-actionable">
      <summary><i class="ri-tools-line"></i> Actionable tuning (computed from observed values)</summary>
      <pre class="code">${escapeHtml(item.actionableCommands.join("\n"))}</pre>
    </details>` : ""}
    ${item.learnMore?.length ? `<details class="diagnosis-learn-more">
      <summary><i class="ri-book-open-line"></i> Learn more</summary>
      <ul>${item.learnMore.map(entry => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>
    </details>` : ""}
    ${item.confidenceDetail ? `<details class="diagnosis-confidence-detail">
      <summary><i class="ri-scales-3-line"></i> What would confirm or reject</summary>
      <div class="confidence-confirm-reject">
        <div><b><i class="ri-checkbox-circle-line"></i> Would confirm:</b> ${escapeHtml(item.confidenceDetail.wouldConfirm)}</div>
        <div><b><i class="ri-close-circle-line"></i> Would reject:</b> ${escapeHtml(item.confidenceDetail.wouldReject)}</div>
        ${item.confidenceDetail.missing?.length ? `<div><b><i class="ri-question-line"></i> Missing evidence:</b> ${item.confidenceDetail.missing.map(m => escapeHtml(m)).join("; ")}</div>` : ""}
      </div>
    </details>` : ""}
    ${renderDiagnosticPlaybook(item)}
    <footer>
      ${item.topSocketId ? `<button data-jump="${escapeHtml(item.topSocketId)}">${icons.focus} Show context row</button>` : ""}
    </footer>
  </article>`;
}

function renderDiagnosticPlaybook(item) {
  const pb = playbookForHypothesis(item.id);
  if (!pb) return "";
  const topSocket = state.sockets.find(s => s.id === item.topSocketId);
  const resolved = resolvePlaybook(pb, topSocket);
  if (!resolved) return "";
  return `<details class="diagnosis-playbook">
    <summary><i class="ri-route-line"></i> Playbook: ${escapeHtml(resolved.title)}</summary>
    <div class="playbook-content">
      <div class="playbook-section">
        <h5><i class="ri-computer-line"></i> Local (receiver/sender)</h5>
        <pre class="code">${escapeHtml(resolved.local.join("\n"))}</pre>
      </div>
      <div class="playbook-section">
        <h5><i class="ri-remote-control-line"></i> Peer side</h5>
        <pre class="code">${escapeHtml(resolved.peer.join("\n"))}</pre>
      </div>
      <div class="playbook-section">
        <h5><i class="ri-server-line"></i> Host / infra</h5>
        <pre class="code">${escapeHtml(resolved.host.join("\n"))}</pre>
      </div>
      <div class="playbook-section warn">
        <h5><i class="ri-error-warning-line"></i> Do NOT conclude</h5>
        <ul>${resolved.doNotConclude.map(w => `<li>${escapeHtml(w)}</li>`).join("")}</ul>
      </div>
      <div class="playbook-section safe">
        <h5><i class="ri-shield-check-line"></i> Prudent mitigation</h5>
        <ul>${resolved.mitigation.map(m => `<li>${escapeHtml(m)}</li>`).join("")}</ul>
      </div>
    </div>
  </details>`;
}

function renderAdvisor() {
  const findings = state.advisorFindings;
  const top = findings[0];
  const hidden = Math.max(0, state.anomalies.length - findings.reduce((sum, finding) => sum + finding.count, 0));
  return `<div class="advisor-shell">
    <section class="advisor-hero">
      <div>
        <span class="tooltip-kicker">Background advisor</span>
        <h3>${escapeHtml(top?.title || "No diagnosis yet")}</h3>
        <p>${escapeHtml(top?.pattern || "Import or parse ss output to generate expert guidance.")}</p>
      </div>
      <div class="advisor-score">
        <span>${formatNumber(findings.length)}</span>
        <small>prioritized finding(s)</small>
      </div>
    </section>
    ${hidden > 0 ? `<div class="advisor-note"><i class="ri-filter-3-line"></i> ${formatNumber(hidden)} lower-level anomaly signals are compressed into higher-value findings to keep the action list readable.</div>` : ""}
    ${state.peerCapture.correlations?.length ? `<div class="advisor-peer-correlation" style="margin:8px 0;padding:8px 12px;border-radius:6px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25)"><strong style="color:#3b82f6"><i class="ri-links-line"></i> Multi-host correlation (${state.peerCapture.sourceName})</strong>${state.peerCapture.correlations.slice(0, 5).map(c => `<div style="margin-top:6px;font-size:12px;color:var(--text)"><span style="color:var(--muted)">${escapeHtml(c.localSocket.local)} → ${escapeHtml(c.localSocket.peer)}</span><br/>${c.localSendQ > 0 && c.peerRecvQ > 0 ? `<span style="color:#ff9f43">⚠ Local Send-Q: <b>${formatNumber(c.localSendQ)}</b> bytes — Peer Recv-Q: <b>${formatNumber(c.peerRecvQ)}</b> bytes → <em>peer is not reading fast enough</em></span>` : c.localRecvQ > 0 && c.peerSendQ > 0 ? `<span style="color:#ff9f43">⚠ Local Recv-Q: <b>${formatNumber(c.localRecvQ)}</b> bytes — Peer Send-Q: <b>${formatNumber(c.peerSendQ)}</b> bytes → <em>local app is not reading fast enough</em></span>` : `<span style="color:#2cc62c">✓ Both sides healthy (queues empty)</span>`}</div>`).join("")}</div>` : ""}
    ${(() => { const trends = detectTrends(); return trends.length ? `<div class="advisor-trends" style="margin:8px 0;padding:8px 12px;border-radius:6px;background:rgba(255,159,67,0.08);border:1px solid rgba(255,159,67,0.25)"><strong style="color:#ff9f43"><i class="ri-timer-flash-line"></i> Predictive alerts</strong>${trends.map(t => `<div style="margin-top:4px;font-size:12px;color:var(--text)"><b>${t.metric}</b> growing ${t.rate}/window — current ${formatNumber(t.current)} ${t.unit}, overflow in <b style="color:#ff5c77">~${t.eta} min</b></div>`).join("")}</div>` : ""; })()}
    ${renderWhatIfSimulation()}
    <div class="advisor-grid">
      ${findings.map(renderAdvisorFinding).join("")}
    </div>
  </div>`;
}

function renderRemediationWizard(finding) {
  const fixes = remediationForFinding(finding);
  if (!fixes.length) return "";
  return `<div class="remediation-wizard" style="margin:8px 0;padding:10px 12px;border-radius:8px;background:rgba(77,222,138,0.05);border:1px solid rgba(77,222,138,0.2)">
    <strong style="color:#4cde8a;font-size:11px"><i class="ri-first-aid-kit-line"></i> Auto-remediation</strong>
    ${fixes.map(f => `<div style="margin-top:6px">
      <div style="font-size:11px;color:var(--text);margin-bottom:3px">${escapeHtml(f.description)}</div>
      <pre class="code" style="margin:0;font-size:11px;padding:6px 10px;border-radius:6px;background:rgba(0,0,0,0.3);cursor:pointer" data-copy-cmd="${escapeHtml(f.command)}" title="Click to copy">${escapeHtml(f.command)}</pre>
    </div>`).join("")}
  </div>`;
}

function remediationForFinding(finding) {
  const t = finding.title?.toLowerCase() || "";
  const fixes = [];
  if (t.includes("drop") || t.includes("buffer")) {
    fixes.push({ description: "Increase receive buffer max:", command: "sudo sysctl -w net.core.rmem_max=16777216" });
    fixes.push({ description: "Increase socket buffer:", command: "sudo sysctl -w net.ipv4.tcp_rmem='4096 131072 16777216'" });
  }
  if (t.includes("retrans") || t.includes("loss") || t.includes("congestion")) {
    fixes.push({ description: "Check path loss with mtr:", command: "mtr --report --report-cycles 100 <PEER_IP>" });
    fixes.push({ description: "Check NIC errors:", command: "ethtool -S <INTERFACE> | grep -i error" });
  }
  if (t.includes("rtt") || t.includes("latency") || t.includes("slow")) {
    fixes.push({ description: "Trace route latency:", command: "mtr --tcp --port 443 --report <PEER_IP>" });
  }
  if (t.includes("backoff") || t.includes("timeout") || t.includes("rto")) {
    fixes.push({ description: "Check TCP keepalive settings:", command: "sysctl net.ipv4.tcp_keepalive_time net.ipv4.tcp_keepalive_intvl net.ipv4.tcp_keepalive_probes" });
  }
  if (t.includes("queue") || t.includes("recv-q") || t.includes("consumer")) {
    fixes.push({ description: "Check application read rate:", command: "ss -tnp | grep <PORT> | awk '{print $2}'" });
    fixes.push({ description: "Increase backlog:", command: "sudo sysctl -w net.core.somaxconn=4096" });
  }
  if (t.includes("window") || t.includes("scale") || t.includes("autotuning")) {
    fixes.push({ description: "Enable window scaling:", command: "sudo sysctl -w net.ipv4.tcp_window_scaling=1" });
    fixes.push({ description: "Increase max window:", command: "sudo sysctl -w net.ipv4.tcp_rmem='4096 131072 67108864'" });
  }
  return fixes.slice(0, 3);
}

function renderAdvisorFinding(finding) {
  return `<article class="advisor-card ${finding.severity}">
    <header>
      <div>
        <span class="risk ${finding.severity}">${escapeHtml(finding.severity)}</span>
        <strong>${escapeHtml(finding.title)}</strong>
      </div>
      <span class="confidence">${escapeHtml(finding.confidence)} confidence</span>
    </header>
    <p>${escapeHtml(finding.why)}</p>
    <div class="evidence-row">
      <span><i class="ri-plug-line"></i> ${formatNumber(finding.count)} socket(s)</span>
      ${finding.processes.length ? `<span><i class="ri-cpu-line"></i> ${escapeHtml(finding.processes.join(", "))}</span>` : ""}
      ${finding.peer.length ? `<span><i class="ri-exchange-line"></i> ${escapeHtml(finding.peer.join(", "))}</span>` : ""}
    </div>
    <div class="advisor-columns">
      <div>
        <b>Next checks</b>
        <ul>${finding.next.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div>
        <b>Mitigation path</b>
        <ul>${finding.mitigate.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
    </div>
    <details>
      <summary><i class="ri-terminal-box-line"></i> Suggested command line evidence</summary>
      <pre class="code">${escapeHtml(finding.commands.join("\n"))}</pre>
    </details>
    ${renderRemediationWizard(finding)}
    <footer>
      ${finding.socketId ? `<button data-jump="${escapeHtml(finding.socketId)}">${icons.focus} Show context row</button>` : ""}
      <button data-action="copyAdvisorCommands" data-finding-id="${escapeHtml(finding.id)}">${icons.copy} Copy commands</button>
    </footer>
  </article>`;
}

  return {
    renderDiagnosis,
    renderRootCauseMatrix,
    renderDiagnosticHypothesis,
    renderDiagnosticPlaybook,
    renderAdvisor,
    renderRemediationWizard,
    remediationForFinding,
    renderAdvisorFinding
  };
}
