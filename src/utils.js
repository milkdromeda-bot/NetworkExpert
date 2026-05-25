/** @param {TemplateStringsArray} strings @param {...*} values @returns {string} */
export function html(strings, ...values) {
  return strings.map((s, i) => s + (values[i] ?? "")).join("");
}

/** @param {*} value @returns {string} */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c]));
}

/** @param {string} value @param {number} [max] @returns {string} */
export function truncateMiddle(value, max = 32) {
  const text = String(value || "");
  if (text.length <= max) return text;
  const keep = Math.max(4, Math.floor((max - 3) / 2));
  return `${text.slice(0, keep)}...${text.slice(-keep)}`;
}
