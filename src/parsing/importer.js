import { applyRisks } from "../analysis/analysis.js";
import { parseSs, parseTimestampLine } from "./parser.js";

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
  const activePreFilter = preFilter?.enabled ? preFilter : null;
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  const sockets = [];
  const filterContext = { pendingTimestamp: "", currentBlock: [] };
  let buffer = "";
  let readBytes = 0;
  let preview = "";
  let keptRaw = "";
  let batch = [];
  let chunks = 0;
  let parsedBatches = 0;
  let lastProgressAt = 0;
  let stopped = false;
  const maxSockets = 250000;
  const appendKeptRaw = text => {
    if (!text) return;
    keptRaw += text;
    if (preview.length < 240000) preview += text.slice(0, 240000 - preview.length);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    readBytes += value.byteLength || 0;
    chunks += 1;
    const text = decoder.decode(value, { stream: true });
    if (!activePreFilter) appendKeptRaw(text);
    buffer += text;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    batch.push(...lines);

    while (batch.length >= 1200) {
      const filteredRaw = appendParsedLines(sockets, batch.splice(0, 1200), maxSockets, activePreFilter, filterContext);
      parsedBatches += 1;
      if (activePreFilter) appendKeptRaw(filteredRaw);
      const now = performance.now();
      const shouldRender = now - lastProgressAt > 180 || parsedBatches % 24 === 0;
      if (shouldRender) lastProgressAt = now;
      onProgress({
        raw: preview,
        sockets,
        status: {
          title: "Streaming parse",
          detail: `${label}: ${formatNumber(sockets.length)} socket observations scanned, ${formatNumber(readBytes)} bytes read${activePreFilter ? " with pre-import filters" : ""}.`,
          progress: totalBytes ? Math.min(99, Math.round((readBytes / totalBytes) * 100)) : Math.min(99, chunks)
        }
      }, { render: shouldRender });
      if (parsedBatches % 4 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      if (sockets.length >= maxSockets) {
        onProgress({
          raw: preview,
          sockets,
          status: {
            title: "Performance guard reached",
            detail: `Stopped at ${formatNumber(maxSockets)} sockets to keep the UI responsive. Add filters or split the file for deeper analysis.`,
            progress: 100
          }
        });
        stopped = true;
        break;
      }
    }
    if (stopped) break;
  }

  if (stopped) return { raw: keptRaw, sockets, sourceName: label };

  const finalText = decoder.decode();
  if (finalText) {
    if (!activePreFilter) appendKeptRaw(finalText);
    buffer += finalText;
  }

  if (buffer) batch.push(buffer);
  if (batch.length) {
    const filteredRaw = appendParsedLines(sockets, batch, maxSockets, activePreFilter, filterContext);
    if (activePreFilter) appendKeptRaw(filteredRaw);
  }
  if (activePreFilter) appendKeptRaw(flushPreFilterBlock(sockets, maxSockets, activePreFilter, filterContext));
  return { raw: keptRaw, sockets, sourceName: label };
}

function appendParsedLines(target, lines, maxSockets, preFilter, context = {}) {
  if (preFilter) return appendPreFilteredLines(target, lines, maxSockets, preFilter, context);
  const parsed = applyRisks(parseSs(lines.join("\n")));
  const remaining = Math.max(0, maxSockets - target.length);
  target.push(...parsed.slice(0, remaining));
  return "";
}

function appendPreFilteredLines(target, lines, maxSockets, preFilter, context) {
  const kept = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (parseTimestampLine(trimmed) != null) {
      const flushed = flushPreFilterBlock(target, maxSockets, preFilter, context);
      if (flushed) kept.push(flushed.trimEnd());
      context.pendingTimestamp = line;
      continue;
    }
    if (/^(State|Netid)\b/i.test(trimmed) || /^Socket\s+/.test(trimmed) || /^Command to be executed:/i.test(trimmed)) continue;
    if (isSocketStartLine(trimmed)) {
      const flushed = flushPreFilterBlock(target, maxSockets, preFilter, context);
      if (flushed) kept.push(flushed.trimEnd());
      context.currentBlock = [line];
      continue;
    }
    if (context.currentBlock?.length) context.currentBlock.push(line);
  }
  return kept.length ? `${kept.join("\n")}\n` : "";
}

function flushPreFilterBlock(target, maxSockets, preFilter, context) {
  const block = context.currentBlock || [];
  context.currentBlock = [];
  if (!block.length) return "";
  const parsed = applyRisks(parseSs(block.join("\n")));
  const filtered = parsed.filter(socket => socketMatchesPreFilter(socket, preFilter));
  if (!filtered.length) return "";
  const remaining = Math.max(0, maxSockets - target.length);
  if (remaining <= 0) return "";
  target.push(...filtered.slice(0, remaining));
  const prefix = context.pendingTimestamp ? `${context.pendingTimestamp}\n` : "";
  context.pendingTimestamp = "";
  return `${prefix}${block.join("\n")}\n`;
}

function isSocketStartLine(line) {
  const parts = line.split(/\s+/);
  const hasStateHead = parts.length >= 5 && /^[A-Z-]+|UNCONN|ESTAB|LISTEN|TIME-WAIT|CLOSE-WAIT/i.test(parts[0]) && /^-?\d+$/.test(parts[1]);
  const hasNetidHead = parts.length >= 6 && /^[a-z_][\w-]*$/i.test(parts[0]) && /^[A-Z-]+|UNCONN|ESTAB|LISTEN|TIME-WAIT|CLOSE-WAIT/i.test(parts[1]) && /^-?\d+$/.test(parts[2]);
  return hasStateHead || hasNetidHead;
}

function socketMatchesPreFilter(socket, f) {
  if (!f?.enabled) return true;
  if (f.protocol && !String(socket.family || "").toLowerCase().startsWith(String(f.protocol).toLowerCase())) return false;
  if (f.state && String(socket.state || "").toUpperCase() !== String(f.state).toUpperCase()) return false;
  if (f.srcIp && !socket.localAddress.host.toLowerCase().includes(f.srcIp.toLowerCase())) return false;
  if (f.dstIp && !socket.peerAddress.host.toLowerCase().includes(f.dstIp.toLowerCase())) return false;
  if (f.anyPort && !portList(f.anyPort).includes(String(socket.localAddress.port || "")) && !portList(f.anyPort).includes(String(socket.peerAddress.port || ""))) return false;
  if (f.srcPort && String(socket.localAddress.port || "") !== String(f.srcPort)) return false;
  if (f.dstPort && String(socket.peerAddress.port || "") !== String(f.dstPort)) return false;
  return true;
}

function portList(value) {
  return String(value || "").split(/[,\s]+/).map(item => item.trim()).filter(Boolean);
}
