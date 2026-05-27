import { socketIdentityKey } from "../timeline/timeline.js";

/**
 * Delta-encode a series of timestamp snapshots.
 * First snapshot is stored fully; subsequent ones store only changed numeric fields per socket.
 * @param {{ epochMs: number, sockets: object[] }[]} snapshots
 * @returns {{ epochMs: number, base?: object[], deltas?: Map<string, object> }[]}
 */
export function compressSnapshots(snapshots) {
  if (!snapshots.length) return [];
  const compressed = [{ epochMs: snapshots[0].epochMs, base: snapshots[0].sockets }];
  const prev = new Map();
  for (const socket of snapshots[0].sockets) prev.set(socketIdentityKey(socket), socket);

  for (let i = 1; i < snapshots.length; i++) {
    const deltas = new Map();
    const current = new Map();
    for (const socket of snapshots[i].sockets) {
      const key = socketIdentityKey(socket);
      current.set(key, socket);
      const old = prev.get(key);
      if (!old) { deltas.set(key, socket); continue; }
      const diff = diffSocket(old, socket);
      if (diff) deltas.set(key, diff);
    }
    compressed.push({ epochMs: snapshots[i].epochMs, deltas, _keys: [...current.keys()] });
    prev.clear();
    for (const [k, s] of current) prev.set(k, s);
  }
  return compressed;
}

/**
 * Decompress a single snapshot at index from compressed data.
 * @param {object[]} compressed
 * @param {number} index
 * @returns {{ epochMs: number, sockets: object[] }}
 */
export function decompressSnapshot(compressed, index) {
  if (index === 0) return { epochMs: compressed[0].epochMs, sockets: compressed[0].base };
  // Rebuild by replaying deltas from base
  const state = new Map();
  for (const socket of compressed[0].base) state.set(socketIdentityKey(socket), socket);

  for (let i = 1; i <= index; i++) {
    const frame = compressed[i];
    const activeKeys = new Set(frame._keys);
    // Remove sockets no longer present
    for (const key of state.keys()) { if (!activeKeys.has(key)) state.delete(key); }
    // Apply deltas
    if (frame.deltas) {
      for (const [key, delta] of frame.deltas) {
        const old = state.get(key);
        state.set(key, old ? applyDiff(old, delta) : delta);
      }
    }
  }
  return { epochMs: compressed[index].epochMs, sockets: [...state.values()] };
}

/**
 * Iterate all snapshots without full decompression — yields { epochMs, getSocket(key) }
 * for memory-efficient sequential access.
 */
export function* iterateCompressed(compressed) {
  if (!compressed.length) return;
  const state = new Map();
  for (const socket of compressed[0].base) state.set(socketIdentityKey(socket), socket);
  yield { epochMs: compressed[0].epochMs, sockets: [...state.values()] };

  for (let i = 1; i < compressed.length; i++) {
    const frame = compressed[i];
    const activeKeys = new Set(frame._keys);
    for (const key of state.keys()) { if (!activeKeys.has(key)) state.delete(key); }
    if (frame.deltas) {
      for (const [key, delta] of frame.deltas) {
        const old = state.get(key);
        state.set(key, old ? applyDiff(old, delta) : delta);
      }
    }
    yield { epochMs: frame.epochMs, sockets: [...state.values()] };
  }
}

function diffSocket(old, cur) {
  let changed = false;
  const diff = {};
  // Compare sendQ/recvQ
  if (old.sendQ !== cur.sendQ) { diff.sendQ = cur.sendQ; changed = true; }
  if (old.recvQ !== cur.recvQ) { diff.recvQ = cur.recvQ; changed = true; }
  if (old.state !== cur.state) { diff.state = cur.state; changed = true; }
  // Compare details.values (numeric metrics)
  const ov = old.details?.values || {};
  const cv = cur.details?.values || {};
  const dv = {};
  for (const k of Object.keys(cv)) {
    if (cv[k] !== ov[k]) { dv[k] = cv[k]; changed = true; }
  }
  if (Object.keys(dv).length) diff._values = dv;
  // Compare skmem
  const om = old.details?.skmem || {};
  const cm = cur.details?.skmem || {};
  const dm = {};
  for (const k of Object.keys(cm)) {
    if (cm[k] !== om[k]) { dm[k] = cm[k]; changed = true; }
  }
  if (Object.keys(dm).length) diff._skmem = dm;
  // Timer
  const ot = old.details?.timer;
  const ct = cur.details?.timer;
  if (JSON.stringify(ot) !== JSON.stringify(ct)) { diff._timer = ct || null; changed = true; }
  return changed ? diff : null;
}

function applyDiff(old, diff) {
  // If diff is a full socket (has .local), return as-is
  if (diff.local) return diff;
  const result = { ...old };
  if ("sendQ" in diff) result.sendQ = diff.sendQ;
  if ("recvQ" in diff) result.recvQ = diff.recvQ;
  if ("state" in diff) result.state = diff.state;
  if (diff._values) result.details = { ...result.details, values: { ...result.details?.values, ...diff._values } };
  if (diff._skmem) result.details = { ...result.details, skmem: { ...result.details?.skmem, ...diff._skmem } };
  if ("_timer" in diff) result.details = { ...result.details, timer: diff._timer };
  return result;
}
