/**
 * Utilities for zero-copy data sharing between main thread and Workers
 * via SharedArrayBuffer. Falls back to structured clone when SAB is unavailable.
 */

/** @returns {boolean} */
export function sharedBufferAvailable() {
  return typeof SharedArrayBuffer !== "undefined";
}

/**
 * Encode a string into a SharedArrayBuffer for zero-copy transfer to a Worker.
 * @param {string} text
 * @returns {{ buffer: SharedArrayBuffer, byteLength: number }}
 */
export function encodeShared(text) {
  const encoded = new TextEncoder().encode(text);
  const sab = new SharedArrayBuffer(encoded.byteLength);
  const view = new Uint8Array(sab);
  view.set(encoded);
  return { buffer: sab, byteLength: encoded.byteLength };
}

/**
 * Decode a SharedArrayBuffer back to a string.
 * @param {SharedArrayBuffer} buffer
 * @param {number} byteLength
 * @returns {string}
 */
export function decodeShared(buffer, byteLength) {
  const view = new Uint8Array(buffer, 0, byteLength);
  return new TextDecoder().decode(view);
}
