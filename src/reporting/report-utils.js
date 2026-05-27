export function reportChartDataUrl(svg) {
  if (!svg) return "";
  const clone = svg.cloneNode(true);
  clone.querySelectorAll("[data-crosshair-layer]").forEach(layer => { layer.innerHTML = ""; });
  clone.querySelectorAll(".zoom-capture").forEach(node => node.remove());
  const viewBox = (clone.getAttribute("viewBox") || "0 0 720 320").split(/\s+/).map(Number);
  const width = Math.round(svg.clientWidth || Number(clone.getAttribute("width")) || viewBox[2] || 720);
  const height = Math.round(svg.clientHeight || Number(clone.getAttribute("height")) || viewBox[3] || 320);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  const xml = new XMLSerializer().serializeToString(clone);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
}

export async function svgToPngBlob(svg, width = svg.clientWidth || 1280, height = svg.clientHeight || 320) {
  const xml = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([xml], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * 2));
  canvas.height = Math.max(1, Math.round(height * 2));
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  ctx.fillStyle = "#05070b";
  ctx.fillRect(0, 0, width, height);
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = url;
  });
  ctx.drawImage(image, 0, 0, width, height);
  URL.revokeObjectURL(url);
  return await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function wrapPdfLines(text, font, size, maxWidth) {
  const paragraphs = String(text || "").split(/\r?\n/);
  const lines = [];
  for (const paragraph of paragraphs) {
    const words = String(paragraph || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = words.shift();
    for (const word of words) {
      const candidate = `${line} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function drawPdfTextBlock(page, text, { x, y, width, size = 10, font, color, lineHeight = size * 1.35 }) {
  const lines = wrapPdfLines(text, font, size, width);
  let cursor = y;
  for (const line of lines) {
    if (line) page.drawText(line, { x, y: cursor, size, font, color, maxWidth: width });
    cursor -= lineHeight;
  }
  return cursor;
}

export function drawPdfSection(page, title, lines, x, y, width, fonts, colors) {
  let cursor = y;
  page.drawText(title, { x, y: cursor, size: 12, font: fonts.bold, color: colors.accent });
  cursor -= 18;
  for (const line of lines.filter(Boolean)) {
    cursor = drawPdfTextBlock(page, line, { x, y: cursor, width, size: 10, font: fonts.regular, color: colors.ink, lineHeight: 13.5 }) - 5;
  }
  return cursor;
}
