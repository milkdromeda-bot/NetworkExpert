import { parseSs, parseTimestampLine } from "./parser.js";

export function socketKey(socket) {
  return `${socket.local}|${socket.peer}|${socket.state}`;
}

export function stableSocketId(socket) {
  let hash = 2166136261;
  for (const char of socketKey(socket)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `socket-${(hash >>> 0).toString(36)}`;
}

export function withStableSocketIds(sockets) {
  return sockets.map(socket => ({
    ...socket,
    id: stableSocketId(socket)
  }));
}

export function timestampBlocks(raw = "") {
  const blocks = [];
  let current = null;
  for (const line of String(raw).split(/\r?\n/)) {
    const trimmed = line.trim();
    const epochMs = parseTimestampLine(trimmed);
    if (epochMs != null) {
      current = { epochMs, lines: [] };
      blocks.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return blocks;
}

export function parsedTimestampSnapshots(raw = "") {
  return timestampBlocks(raw).map(block => ({
    epochMs: block.epochMs,
    sockets: parseSs(block.lines.join("\n"))
  }));
}

export function aggregateParsedSocketsByKey(sockets) {
  const byKey = new Map();
  for (const socket of sockets) {
    const key = socketKey(socket);
    const previous = byKey.get(key);
    byKey.set(key, {
      ...socket,
      firstSeenMs: previous?.firstSeenMs,
      lastSeenMs: previous?.lastSeenMs,
      snapshotCount: (previous?.snapshotCount || 0) + 1
    });
  }
  return [...byKey.values()];
}

export function aggregateTimestampedSockets(raw = "") {
  const snapshots = parsedTimestampSnapshots(raw);
  if (snapshots.length < 2) return withStableSocketIds(parseSs(raw));

  const byKey = new Map();
  for (const block of snapshots) {
    for (const socket of block.sockets) {
      const key = socketKey(socket);
      const previous = byKey.get(key);
      byKey.set(key, {
        ...socket,
        firstSeenMs: previous?.firstSeenMs ?? block.epochMs,
        lastSeenMs: block.epochMs,
        snapshotCount: (previous?.snapshotCount || 0) + 1
      });
    }
  }
  return withStableSocketIds([...byKey.values()]);
}
