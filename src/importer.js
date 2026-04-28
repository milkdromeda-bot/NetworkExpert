import { applyRisks } from "./analysis.js";
import { parseSs } from "./parser.js";

export async function importSocketFile(file, { formatNumber, onProgress, preFilter = null }) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".zip")) {
    return importZipFile(file, { formatNumber, onProgress, preFilter });
  }
  if (lower.endsWith(".gz")) {
    return importGzipFile(file, { formatNumber, onProgress, preFilter });
  }
  return importTextStream(file.stream(), file.size, file.name, { formatNumber, onProgress, preFilter });
}

async function importZipFile(file, context) {
  if (!window.JSZip) throw new Error("ZIP support is unavailable because JSZip did not load.");
  context.onProgress({
    raw: "",
    sockets: [],
    status: { title: "Opening ZIP", detail: "Reading central directory and locating text entries.", progress: 5 }
  });
  const zip = await window.JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter(entry => !entry.dir);
  const entry = entries.find(e => /\.(log|txt|out|ss)$/i.test(e.name)) || entries[0];
  if (!entry) throw new Error("ZIP archive contains no file to parse.");
  context.onProgress({
    raw: "",
    sockets: [],
    status: { title: "Decompressing ZIP entry", detail: `${entry.name}. ZIP decompression is buffered; parsing becomes progressive after extraction.`, progress: 15 }
  });
  const blob = await entry.async("blob", metadata => {
    context.onProgress({
      raw: "",
      sockets: [],
      status: {
        title: "Decompressing ZIP entry",
        detail: `${entry.name}: ${Math.round(metadata.percent || 0)}% decompressed.`,
        progress: Math.min(45, 15 + Math.round((metadata.percent || 0) * 0.3))
      }
    });
  });
  return importTextStream(blob.stream(), blob.size || file.size, entry.name, context);
}

async function importGzipFile(file, context) {
  if (!("DecompressionStream" in window)) {
    throw new Error("This browser does not expose DecompressionStream for gzip files.");
  }
  context.onProgress({
    raw: "",
    sockets: [],
    status: { title: "Streaming gzip", detail: "Decompressing and parsing progressively.", progress: 5 }
  });
  const stream = file.stream().pipeThrough(new DecompressionStream("gzip"));
  return importTextStream(stream, file.size, file.name, context);
}

async function importTextStream(stream, totalBytes, label, { formatNumber, onProgress, preFilter = null }) {
  const activePreFilter = preFilter;
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  const sockets = [];
  let buffer = "";
  let readBytes = 0;
  let preview = "";
  let fullRaw = "";
  let batch = [];
  let chunks = 0;
  const maxSockets = 250000;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    readBytes += value.byteLength || 0;
    chunks += 1;
    const text = decoder.decode(value, { stream: true });
    fullRaw += text;
    if (preview.length < 240000) preview += text.slice(0, 240000 - preview.length);
    buffer += text;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    batch.push(...lines);

    if (batch.length >= 1200) {
      appendParsedLines(sockets, batch.splice(0), maxSockets, activePreFilter);
      const shouldRender = chunks % 6 === 0;
      onProgress({
        raw: preview,
        sockets: [...sockets],
        status: {
          title: "Streaming parse",
          detail: `${label}: ${formatNumber(sockets.length)} sockets parsed, ${formatNumber(readBytes)} bytes read.`,
          progress: totalBytes ? Math.min(99, Math.round((readBytes / totalBytes) * 100)) : Math.min(99, chunks)
        }
      }, { render: shouldRender });
      await new Promise(resolve => setTimeout(resolve, 0));
      if (sockets.length >= maxSockets) {
        onProgress({
          raw: preview,
          sockets: [...sockets],
          status: {
            title: "Performance guard reached",
            detail: `Stopped at ${formatNumber(maxSockets)} sockets to keep the UI responsive. Add filters or split the file for deeper analysis.`,
            progress: 100
          }
        });
        break;
      }
    }
  }

  const finalText = decoder.decode();
  if (finalText) {
    fullRaw += finalText;
    if (preview.length < 240000) preview += finalText.slice(0, 240000 - preview.length);
    buffer += finalText;
  }

  if (buffer) batch.push(buffer);
  if (batch.length) appendParsedLines(sockets, batch, maxSockets, activePreFilter);
  return { raw: fullRaw, sockets, sourceName: label };
}

function appendParsedLines(target, lines, maxSockets, preFilter) {
  const parsed = applyRisks(parseSs(lines.join("\n")));
  const filtered = preFilter ? parsed.filter(socket => socketMatchesPreFilter(socket, preFilter)) : parsed;
  const remaining = Math.max(0, maxSockets - target.length);
  target.push(...filtered.slice(0, remaining));
}

function socketMatchesPreFilter(socket, f) {
  if (!f?.enabled) return true;
  if (f.srcIp && !socket.localAddress.host.toLowerCase().includes(f.srcIp.toLowerCase())) return false;
  if (f.dstIp && !socket.peerAddress.host.toLowerCase().includes(f.dstIp.toLowerCase())) return false;
  if (f.srcPort && String(socket.localAddress.port || "") !== String(f.srcPort)) return false;
  if (f.dstPort && String(socket.peerAddress.port || "") !== String(f.dstPort)) return false;
  return true;
}
