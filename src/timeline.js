import { metricValue, parseSs, parseTimestampLine } from "./parser.js";

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

export function buildSocketHistoryFromSnapshots(snapshots = [], selectedSocket = null) {
  if (!snapshots.length || !selectedSocket) return [];
  const key = socketKey(selectedSocket);
  const start = snapshots[0].epochMs;
  const rows = snapshots.map(block => {
    const exact = block.sockets.find(socket => socketKey(socket) === key)
      || block.sockets.find(socket => socket.local === selectedSocket.local && socket.peer === selectedSocket.peer);
    return {
      t: Math.max(0, Math.round((block.epochMs - start) / 1000)),
      epochMs: block.epochMs,
      socketPresent: Boolean(exact),
      rtt: metricValue(exact, "rtt"),
      rttvar: metricValue(exact, "rttvar"),
      rto: metricValue(exact, "rto"),
      sendQ: metricValue(exact, "sendQ"),
      recvQ: metricValue(exact, "recvQ"),
      cwnd: metricValue(exact, "cwnd"),
      ato: metricValue(exact, "ato"),
      "skmem.r": metricValue(exact, "skmem.r"),
      "skmem.t": metricValue(exact, "skmem.t"),
      "skmem.d": metricValue(exact, "skmem.d"),
      pacing_rate: metricValue(exact, "pacing_rate"),
      delivery_rate: metricValue(exact, "delivery_rate"),
      bytes_acked: metricValue(exact, "bytes_acked"),
      bytes_received: metricValue(exact, "bytes_received"),
      segs_out: metricValue(exact, "segs_out"),
      segs_in: metricValue(exact, "segs_in"),
      backoff: metricValue(exact, "backoff"),
      retrans: exact?.details.timer?.retrans || 0
    };
  }).filter(row => {
    if (row.socketPresent) return true;
    return Object.entries(row).some(([metric, value]) => !["t", "epochMs", "socketPresent"].includes(metric) && value > 0);
  });

  const latestRow = rows.findLast(row => row.epochMs === selectedSocket.lastSeenMs && row.socketPresent !== false);
  if (latestRow) {
    latestRow.rtt = metricValue(selectedSocket, "rtt");
    latestRow.rttvar = metricValue(selectedSocket, "rttvar");
    latestRow.rto = metricValue(selectedSocket, "rto");
    latestRow.sendQ = metricValue(selectedSocket, "sendQ");
    latestRow.recvQ = metricValue(selectedSocket, "recvQ");
    latestRow.cwnd = metricValue(selectedSocket, "cwnd");
    latestRow.ato = metricValue(selectedSocket, "ato");
    latestRow["skmem.r"] = metricValue(selectedSocket, "skmem.r");
    latestRow["skmem.t"] = metricValue(selectedSocket, "skmem.t");
    latestRow["skmem.d"] = metricValue(selectedSocket, "skmem.d");
    latestRow.pacing_rate = metricValue(selectedSocket, "pacing_rate");
    latestRow.delivery_rate = metricValue(selectedSocket, "delivery_rate");
    latestRow.bytes_acked = metricValue(selectedSocket, "bytes_acked");
    latestRow.bytes_received = metricValue(selectedSocket, "bytes_received");
    latestRow.segs_out = metricValue(selectedSocket, "segs_out");
    latestRow.segs_in = metricValue(selectedSocket, "segs_in");
    latestRow.backoff = metricValue(selectedSocket, "backoff");
    latestRow.retrans = selectedSocket?.details.timer?.retrans || 0;
  }

  return rows;
}
