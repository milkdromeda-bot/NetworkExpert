import { printableIncidentReportStyles } from "./printable-incident-report-styles.js";
export function buildPrintableIncidentReportHtml(deps, chartCaptures = []) {
  const {
    state,
    reportVisibleSockets,
    selectedSocket,
    microburstSummary,
    reportRelevantAnomalies,
    reportTopSockets,
    reportPercentileTable,
    reportFindings,
    reportAnnotations,
    reportFilterTokens,
    buildComparison,
    anomaliesBySocketId,
    metricLabel,
    socketsById,
    formatNumber,
    resolvedNumberLocale,
    resolvedTimeZone,
    linuxProfileLabel,
    accessRoleLabel,
    escapeHtml,
    buildAiSummary,
    buildRootCauseMatrix,
    cachedStories,
    cachedMultiSocket,
    cachedRateAlerts,
    captureQualityReport,
    diagnosticHypotheses,
    buildBaselineNarrative,
    formatMetricValue,
    metricValue,
    socketBandwidth,
    annotationTypeLabel,
    timeLabel,
    formatMicroburstWindow
  } = deps;
  const sockets = reportVisibleSockets();
  const selected = selectedSocket();
  const microburst = microburstSummary();
  const anomalies = reportRelevantAnomalies(sockets);
  const topSockets = reportTopSockets(sockets, 10);
  const percentiles = reportPercentileTable(sockets);
  const findings = reportFindings(5);
  const annotations = reportAnnotations(selected);
  const filters = reportFilterTokens();
  const comparison = state.baseline ? buildComparison() : null;
  const now = new Date();
  const selectedAnomalies = selected ? anomaliesBySocketId().get(selected.id) || [] : [];
  const topMetric = selectedAnomalies[0]?.metric ? metricLabel(selectedAnomalies[0].metric) : "none";
  const socketLookup = socketsById();
  const summaryCards = [
    ["Source", state.sourceName],
    ["Visible sockets", formatNumber(sockets.length)],
    ["Relevant anomalies", formatNumber(anomalies.length)],
    ["Critical sockets", formatNumber(sockets.filter(socket => socket.risk === "critical").length)],
    ["Generated", now.toLocaleString(resolvedNumberLocale(), { timeZone: resolvedTimeZone() })],
    ["Profile", `${linuxProfileLabel()} / ${accessRoleLabel()}`]
  ];
  if (microburst) summaryCards.splice(4, 0, ["Microburst", microburst.severity]);
  const reportCss = printableIncidentReportStyles;
  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <title>NetworkExpert Incident Report - ${escapeHtml(state.sourceName)}</title>
        <style>${reportCss}</style>
      </head>
      <body>
        <div class="report-shell">
          <div class="report-actions">
            <button onclick="window.print()">Print / Save as PDF</button>
            <button onclick="window.close()">Close</button>
          </div>
          <section class="report-card report-header">
            <span class="report-kicker">Network incident report</span>
            <div>
              <h1>${escapeHtml(state.sourceName)}</h1>
              <p>Prepared from the current NetworkExpert workspace. This report reflects the current parsed sockets, active filters, anomaly set, visible chart evidence, and optional baseline comparison.</p>
            </div>
            <div class="report-meta">
              ${summaryCards.map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></article>`).join("")}
            </div>
          </section>

          <section class="report-card report-section" style="border-left:4px solid var(--accent)">
            <h2>Summary</h2>
            <p style="font-size:14px;line-height:1.7">${escapeHtml(buildAiSummary({ matrix: buildRootCauseMatrix(state.sockets), stories: cachedStories(), multiSocket: cachedMultiSocket(), rateAlerts: cachedRateAlerts(), captureQuality: captureQualityReport(), hypotheses: diagnosticHypotheses(), comparison: state.baseline ? buildBaselineNarrative(buildComparison(), state.baseline.anomalies || [], state.anomalies) : null }))}</p>
          </section>

          <div class="report-grid">
            <section class="report-card report-section">
              <h2>Scope and Context</h2>
              <div class="report-summary-grid">
                <article><span>Active tab</span><strong>${escapeHtml(state.activeTab || "sockets")}</strong></article>
                <article><span>Timezone</span><strong>${escapeHtml(resolvedTimeZone())}</strong></article>
                <article><span>Filtered sockets in report</span><strong>${escapeHtml(formatNumber(sockets.length))}</strong></article>
              </div>
              <div>
                <h3>ss command</h3>
                <pre class="report-code">${escapeHtml(state.command || "n/a")}</pre>
              </div>
              <div>
                <h3>Applied filters</h3>
                ${filters.length ? `<div class="token-row">${filters.map(token => `<span class="token">${escapeHtml(token)}</span>`).join("")}</div>` : `<p class="small">No table filter is currently applied.</p>`}
              </div>
              ${selected ? `<div>
                <h3>Active investigation</h3>
                <p><strong>${escapeHtml(selected.local)} -> ${escapeHtml(selected.peer)}</strong></p>
                <p class="small">${escapeHtml(state.activeContextReason || "Selected context")} / ${escapeHtml(selected.family)} / ${escapeHtml(selected.state)} / ${escapeHtml(selected.details.process ? `${selected.details.process.name}:${selected.details.process.pid}` : "unknown process")}</p>
                <div class="token-row">
                  <span class="token">risk ${escapeHtml(selected.risk)}</span>
                  <span class="token">RTT ${escapeHtml(formatMetricValue("rtt", metricValue(selected, "rtt")))}</span>
                  <span class="token">RTO ${escapeHtml(formatMetricValue("rto", metricValue(selected, "rto")))}</span>
                  <span class="token">Send-Q ${escapeHtml(formatMetricValue("sendQ", selected.sendQ))}</span>
                  <span class="token">Recv-Q ${escapeHtml(formatMetricValue("recvQ", selected.recvQ))}</span>
                  <span class="token">Top anomaly metric ${escapeHtml(topMetric)}</span>
                </div>
              </div>` : ""}
            </section>

            <section class="report-card report-section">
              <h2>Priority Findings</h2>
              <div class="report-columns">
                <div>
                  <h3>Top anomalies in current scope</h3>
                  ${anomalies.length ? `<div class="report-list">
                    ${anomalies.slice(0, 8).map(item => {
                      const socket = socketLookup.get(item.socketId);
                      return `<article class="${escapeHtml(item.severity)}">
                        <header>
                          <strong>${escapeHtml(item.title)}</strong>
                          <span class="severity ${escapeHtml(item.severity)}">${escapeHtml(item.severity)}</span>
                        </header>
                        <div class="small">${escapeHtml(metricLabel(item.metric || "socket"))}</div>
                        ${socket ? `<div class="flow">${escapeHtml(socket.local)} -> ${escapeHtml(socket.peer)}</div>` : ""}
                        <p>${escapeHtml(item.detail)}</p>
                      </article>`;
                    }).join("")}
                  </div>` : `<p class="small">No anomaly is currently in scope.</p>`}
                </div>
                <div>
                  <h3>Advisor recommendations</h3>
                  ${findings.length ? `<div class="report-list">
                    ${findings.map(item => `<article class="${escapeHtml(item.severity)}">
                      <header>
                        <strong>${escapeHtml(item.title)}</strong>
                        <span class="severity ${escapeHtml(item.severity)}">${escapeHtml(item.severity)}</span>
                      </header>
                      <p>${escapeHtml(item.summary)}</p>
                    </article>`).join("")}
                  </div>` : `<p class="small">No prioritized advisor finding is available yet.</p>`}
                </div>
              </div>
            </section>

            ${annotations.length ? `<section class="report-card report-section">
              <h2>Annotations</h2>
              <div class="report-list">
                ${annotations.map(item => `<article class="${escapeHtml(item.kind === "failover" ? "high" : item.kind === "rtt-peak" ? "medium" : "low")}">
                  <header>
                    <strong>${escapeHtml(item.label)}</strong>
                    <span class="token">${escapeHtml(annotationTypeLabel(item.kind))}</span>
                  </header>
                  <div class="small">${escapeHtml(item.metric === "*" ? "Socket-wide" : metricLabel(item.metric))} * ${escapeHtml(timeLabel(0, item.resolvedEpochMs))}</div>
                  ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
                </article>`).join("")}
              </div>
            </section>` : ""}

            ${microburst ? `<section class="report-card report-section">
              <h2>Microburst Detection</h2>
              <div class="report-summary-grid">
                <article><span>Window</span><strong>${escapeHtml(formatMicroburstWindow(microburst))}</strong></article>
                <article><span>Peak RX</span><strong>${escapeHtml(formatMetricValue("rx_bps", microburst.peakRxBps))}</strong></article>
                <article><span>Peak Recv-Q</span><strong>${escapeHtml(formatMetricValue("recvQ", microburst.peakRecvQ))}</strong></article>
                <article><span>Peak skmem.r</span><strong>${escapeHtml(formatMetricValue("skmem.r", microburst.peakSkmemR))}</strong></article>
                <article><span>New drops</span><strong>${escapeHtml(formatMetricValue("skmem.d", microburst.dropDeltaTotal))}</strong></article>
                <article><span>Peak drop cadence</span><strong>${escapeHtml(formatMetricValue("skmem.d_rate", microburst.peakDropRate))}</strong></article>
              </div>
              <p class="small">A short receive-side pressure window was detected on the selected flow. The charts in this report include the same highlighted microburst band to keep the visual evidence aligned with the written summary.</p>
            </section>` : ""}

            ${chartCaptures.length ? `<section class="report-card report-section">
              <h2>Chart Evidence</h2>
              <div class="report-chart-grid">
                ${chartCaptures.map(item => `<article class="report-chart-card ${item.hero ? "hero" : ""}">
                  <header>
                    <h3>${escapeHtml(item.title)}</h3>
                    <span class="token">${escapeHtml(metricLabel(item.metric))}</span>
                  </header>
                  <figure>
                    <img src="${item.image}" alt="${escapeHtml(item.title)}"/>
                    <figcaption>${escapeHtml(item.context)}</figcaption>
                  </figure>
                </article>`).join("")}
              </div>
            </section>` : ""}

            <section class="report-card report-section">
              <h2>Top Flows</h2>
              <div class="report-table-wrap">
                <table>
                  <thead>
                    <tr><th>Risk</th><th>Flow</th><th>Process</th><th>RTT</th><th>RTO</th><th>Send-Q</th><th>Recv-Q</th><th>Drops</th><th>TX</th><th>RX</th></tr>
                  </thead>
                  <tbody>
                    ${topSockets.map(socket => `<tr>
                      <td><span class="severity ${escapeHtml(socket.risk)}">${escapeHtml(socket.risk)}</span></td>
                      <td class="flow">${escapeHtml(socket.local)} -> ${escapeHtml(socket.peer)}</td>
                      <td>${escapeHtml(socket.details.process ? `${socket.details.process.name}:${socket.details.process.pid}` : "-")}</td>
                      <td>${escapeHtml(formatMetricValue("rtt", metricValue(socket, "rtt")))}</td>
                      <td>${escapeHtml(formatMetricValue("rto", metricValue(socket, "rto")))}</td>
                      <td>${escapeHtml(formatMetricValue("sendQ", socket.sendQ))}</td>
                      <td>${escapeHtml(formatMetricValue("recvQ", socket.recvQ))}</td>
                      <td>${escapeHtml(formatMetricValue("skmem.d", metricValue(socket, "skmem.d")))}</td>
                      <td>${escapeHtml(formatMetricValue("tx_bps", socketBandwidth(socket, "tx_bps")))}</td>
                      <td>${escapeHtml(formatMetricValue("rx_bps", socketBandwidth(socket, "rx_bps")))}</td>
                    </tr>`).join("")}
                  </tbody>
                </table>
              </div>
            </section>

            <section class="report-card report-section">
              <h2>Distribution Summary</h2>
              <div class="report-table-wrap">
                <table>
                  <thead>
                    <tr><th>Metric</th><th>Samples</th><th>P50</th><th>P90</th><th>P99</th><th>Max</th></tr>
                  </thead>
                  <tbody>
                    ${percentiles.map(row => `<tr>
                      <td>${escapeHtml(metricLabel(row.metric))}</td>
                      <td>${escapeHtml(formatNumber(row.stats.count))}</td>
                      <td>${escapeHtml(formatMetricValue(row.metric, row.stats.p50))}</td>
                      <td>${escapeHtml(formatMetricValue(row.metric, row.stats.p90))}</td>
                      <td>${escapeHtml(formatMetricValue(row.metric, row.stats.p99))}</td>
                      <td>${escapeHtml(formatMetricValue(row.metric, row.stats.max))}</td>
                    </tr>`).join("")}
                  </tbody>
                </table>
              </div>
            </section>

            ${comparison ? `<section class="report-card report-section">
              <h2>Baseline Comparison</h2>
              <div class="report-summary-grid">
                <article><span>Before</span><strong>${escapeHtml(formatNumber(comparison.summary.before))}</strong></article>
                <article><span>After</span><strong>${escapeHtml(formatNumber(comparison.summary.after))}</strong></article>
                <article><span>New / Gone</span><strong>${escapeHtml(`${formatNumber(comparison.summary.added)} / ${formatNumber(comparison.summary.removed)}`)}</strong></article>
                <article><span>Worse</span><strong>${escapeHtml(formatNumber(comparison.summary.worsened))}</strong></article>
                <article><span>Improved</span><strong>${escapeHtml(formatNumber(comparison.summary.improved))}</strong></article>
                <article><span>Baseline source</span><strong>${escapeHtml(state.baseline.sourceName)}</strong></article>
              </div>
              <div class="report-table-wrap">
                <table>
                  <thead>
                    <tr><th>Status</th><th>Flow</th><th>Risk</th><th>Send-Q delta</th><th>Recv-Q delta</th><th>RTT delta</th><th>RTO delta</th><th>Drops delta</th></tr>
                  </thead>
                  <tbody>
                    ${comparison.rows.slice(0, 10).map(row => {
                      const current = row.after || row.before;
                      return `<tr>
                        <td><span class="severity ${escapeHtml(row.status === "worse" ? "critical" : row.status === "better" ? "low" : "medium")}">${escapeHtml(row.status)}</span></td>
                        <td class="flow">${escapeHtml(current.local)} -> ${escapeHtml(current.peer)}</td>
                        <td>${escapeHtml(row.before?.risk || "-")} -> ${escapeHtml(row.after?.risk || "-")}</td>
                        <td>${escapeHtml(formatMetricValue("sendQ", row.deltas.sendQ))}</td>
                        <td>${escapeHtml(formatMetricValue("recvQ", row.deltas.recvQ))}</td>
                        <td>${escapeHtml(formatMetricValue("rtt", row.deltas.rtt))}</td>
                        <td>${escapeHtml(formatMetricValue("rto", row.deltas.rto))}</td>
                        <td>${escapeHtml(formatMetricValue("skmem.d", row.deltas.drops))}</td>
                      </tr>`;
                    }).join("")}
                  </tbody>
                </table>
              </div>
            </section>` : ""}
          </div>

          <section class="report-card report-footer">
            <strong>Analyst notes</strong>
            <p>This report is generated from the current browser workspace. For strict incident evidence, keep the raw capture file, the exact ss collection command, timestamps, and any before/after capture used as baseline. Pay special attention to RTT/RTO tails, Send-Q/Recv-Q growth, socket drops, and whether one peer or one process dominates the anomaly set.</p>
          </section>
        </div>
      </body>
    </html>
  `;
  return html;

}
