export async function buildIncidentReportPdf(chartAssets = [], deps) {
  const {
    PDFLib,
    selectedSocket,
    reportVisibleSockets,
    reportRelevantAnomalies,
    pickExecutiveFocusSocket,
    reportAnnotations,
    microburstSummary,
    tailLatencyLens,
    guidedChecklistItems,
    state,
    buildExecutiveSummary,
    formatMicroburstWindow,
    formatTailLatencyWindow,
    formatMetricValue,
    resolvedNumberLocale,
    resolvedTimeZone,
    formatNumber,
    drawPdfTextBlock,
    drawPdfSection,
    metricValue,
    socketsById,
    metricLabel,
    timeLabel,
    reportFilterTokens,
    reportTopSockets
  } = deps;

  if (!PDFLib) throw new Error("PDF engine unavailable");
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  };
  const colors = {
    ink: rgb(0.09, 0.14, 0.2),
    muted: rgb(0.35, 0.41, 0.48),
    accent: rgb(0.05, 0.43, 0.62),
    line: rgb(0.83, 0.88, 0.92),
    panel: rgb(0.96, 0.98, 0.99)
  };
  const selected = selectedSocket();
  const visibleSockets = reportVisibleSockets();
  const anomalies = reportRelevantAnomalies(visibleSockets);
  const focusSocket = pickExecutiveFocusSocket(selected, visibleSockets);
  const annotations = reportAnnotations(selected);
  const microburst = microburstSummary();
  const tailLatency = tailLatencyLens();
  const checklistItems = focusSocket ? guidedChecklistItems(focusSocket) : [];
  const snapshot = buildExecutiveSummary({
    focusSocket,
    anomalies,
    advisorFindings: state.advisorFindings || [],
    microburst,
    tailLatency,
    checklistItems,
    formatMicroburstWindow,
    formatTailLatencyWindow,
    formatMetricValue
  });
  const generatedAt = new Date().toLocaleString(resolvedNumberLocale(), { timeZone: resolvedTimeZone() });
  const page = pdfDoc.addPage([595.28, 841.89]);
  const margin = 36;
  const gutter = 18;
  const contentWidth = page.getWidth() - margin * 2;
  const columnWidth = (contentWidth - gutter) / 2;
  let y = page.getHeight() - margin;

  page.drawText("NetworkExpert Incident Snapshot", { x: margin, y, size: 11, font: fonts.bold, color: colors.accent });
  y -= 24;
  page.drawText(state.sourceName || "Current workspace", { x: margin, y, size: 22, font: fonts.bold, color: colors.ink });
  y -= 18;
  y = drawPdfTextBlock(page, "Portable incident evidence generated from the current workspace, including prioritized signals, focused context, and chart captures.", {
    x: margin,
    y,
    width: contentWidth,
    size: 10,
    font: fonts.regular,
    color: colors.muted,
    lineHeight: 13
  }) - 10;

  const metaLines = [
    `Generated: ${generatedAt}`,
    `Timezone: ${resolvedTimeZone()}`,
    `Visible sockets: ${formatNumber(visibleSockets.length)}`,
    `Relevant anomalies: ${formatNumber(anomalies.length)}`,
    `Critical sockets: ${formatNumber(visibleSockets.filter(socket => socket.risk === "critical").length)}`,
    `ss command: ${state.command || "n/a"}`
  ];
  y = drawPdfSection(page, "Incident frame", metaLines, margin, y, contentWidth, fonts, colors) - 8;

  const leftLines = [];
  if (snapshot) {
    leftLines.push(`${snapshot.title} [${snapshot.severity}]`);
    leftLines.push(snapshot.headline);
    leftLines.push(snapshot.summary);
    leftLines.push(`Next step: ${snapshot.next}`);
  }
  if (focusSocket) {
    leftLines.push(`Focus flow: ${focusSocket.local} -> ${focusSocket.peer}`);
    leftLines.push(`Focus process: ${focusSocket.details.process ? `${focusSocket.details.process.name}:${focusSocket.details.process.pid}` : "unknown process"}`);
    leftLines.push(`Focus metrics: RTT ${formatMetricValue("rtt", metricValue(focusSocket, "rtt"))}, RTO ${formatMetricValue("rto", metricValue(focusSocket, "rto"))}, Send-Q ${formatMetricValue("sendQ", focusSocket.sendQ)}, Recv-Q ${formatMetricValue("recvQ", focusSocket.recvQ)}`);
  }
  if (microburst) leftLines.push(`Microburst: ${formatMicroburstWindow(microburst)} with RX ${formatMetricValue("rx_bps", microburst.peakRxBps)} and ${formatMetricValue("skmem.d", microburst.dropDeltaTotal)} new drops.`);
  if (tailLatency) leftLines.push(`Tail lens: ${formatTailLatencyWindow(tailLatency)} with suspicion ${tailLatency.suspicion || "tail latency spike"}.`);
  leftLines.push(`Filters: ${reportFilterTokens().join(", ") || "none"}`);

  const rightLines = [];
  if (anomalies.length) {
    rightLines.push("Top anomalies:");
    anomalies.slice(0, 5).forEach(item => {
      const socket = socketsById().get(item.socketId);
      rightLines.push(`${item.severity.toUpperCase()} - ${item.title}${socket ? ` - ${socket.local} -> ${socket.peer}` : ""}`);
    });
  }
  if (annotations.length) {
    rightLines.push("Annotations:");
    annotations.slice(0, 5).forEach(item => {
      rightLines.push(`${item.label} - ${item.metric === "*" ? "socket-wide" : metricLabel(item.metric)} - ${timeLabel(0, item.resolvedEpochMs)}`);
    });
  }
  if (!rightLines.length) rightLines.push("No annotations or scoped anomalies are currently attached to the active incident view.");

  const leftBottom = drawPdfSection(page, "Snapshot and focus", leftLines, margin, y, columnWidth, fonts, colors);
  const rightBottom = drawPdfSection(page, "Signals and analyst notes", rightLines, margin + columnWidth + gutter, y, columnWidth, fonts, colors);

  let tableY = Math.min(leftBottom, rightBottom) - 8;
  const topSockets = reportTopSockets(visibleSockets, 5);
  if (topSockets.length && tableY > 190) {
    page.drawText("Top flows in scope", { x: margin, y: tableY, size: 12, font: fonts.bold, color: colors.accent });
    tableY -= 18;
    const rows = [
      ["Risk", "Flow", "Process", "RTT", "RTO", "Drops"],
      ...topSockets.map(socket => [
        socket.risk,
        `${socket.local} -> ${socket.peer}`,
        socket.details.process ? `${socket.details.process.name}:${socket.details.process.pid}` : "-",
        formatMetricValue("rtt", metricValue(socket, "rtt")),
        formatMetricValue("rto", metricValue(socket, "rto")),
        formatMetricValue("skmem.d", metricValue(socket, "skmem.d"))
      ])
    ];
    const columns = [50, 205, 110, 55, 55, 48];
    rows.forEach((row, rowIndex) => {
      let x = margin;
      if (rowIndex === 0) {
        page.drawRectangle({ x, y: tableY - 4, width: contentWidth, height: 18, color: colors.panel, borderColor: colors.line, borderWidth: 1 });
      }
      row.forEach((value, index) => {
        const cellFont = rowIndex === 0 ? fonts.bold : fonts.regular;
        const cellSize = rowIndex === 0 ? 9 : 8.5;
        const clipped = String(value).length > 34 ? `${String(value).slice(0, 31)}...` : String(value);
        page.drawText(clipped, { x: x + 4, y: tableY + 2, size: cellSize, font: cellFont, color: rowIndex === 0 ? colors.ink : colors.muted, maxWidth: columns[index] - 8 });
        x += columns[index];
      });
      tableY -= 18;
    });
  }

  for (const asset of chartAssets) {
    const chartPage = pdfDoc.addPage([841.89, 595.28]);
    const pageMargin = 28;
    const pageWidth = chartPage.getWidth() - pageMargin * 2;
    const pageHeight = chartPage.getHeight() - pageMargin * 2;
    let cursor = chartPage.getHeight() - pageMargin;
    chartPage.drawText(asset.title, { x: pageMargin, y: cursor, size: 18, font: fonts.bold, color: colors.ink });
    cursor -= 18;
    cursor = drawPdfTextBlock(chartPage, asset.context || "Chart evidence from the current visible incident window.", {
      x: pageMargin,
      y: cursor,
      width: pageWidth,
      size: 10,
      font: fonts.regular,
      color: colors.muted,
      lineHeight: 13
    }) - 8;
    const image = await pdfDoc.embedPng(asset.bytes);
    const availableWidth = pageWidth;
    const availableHeight = pageHeight - 64;
    const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const imageX = pageMargin + (availableWidth - drawWidth) / 2;
    const imageY = Math.max(pageMargin, cursor - drawHeight);
    chartPage.drawRectangle({ x: imageX - 1, y: imageY - 1, width: drawWidth + 2, height: drawHeight + 2, borderColor: colors.line, borderWidth: 1 });
    chartPage.drawImage(image, { x: imageX, y: imageY, width: drawWidth, height: drawHeight });
    chartPage.drawText(metricLabel(asset.metric), { x: pageMargin, y: pageMargin + 8, size: 10, font: fonts.bold, color: colors.accent });
  }

  return await pdfDoc.save();

}
