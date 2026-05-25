/**
 * App context — shared helpers for extracted render modules.
 * Instead of reading global `state` directly, modules receive this context object.
 *
 * Usage in extracted modules:
 *   export function renderTimeline(ctx) {
 *     const { state, escapeHtml, formatNumber, formatMetricValue, icons, thresholdFor } = ctx;
 *     ...
 *   }
 *
 * Created once in main.js:
 *   const ctx = createAppContext(state, { escapeHtml, formatNumber, ... });
 *   renderTimeline(ctx);
 */

/**
 * @typedef {Object} AppContext
 * @property {import('./types.js').AppState} state
 * @property {function(string): string} escapeHtml
 * @property {function(TemplateStringsArray, ...*): string} html
 * @property {function(string, number=): string} truncateMiddle
 * @property {function(number): string} formatNumber
 * @property {function(string, number): string} formatMetricValue
 * @property {function(string): {warn: number, danger: number}} thresholdFor
 * @property {function(): import('./types.js').Socket|null} selectedSocket
 * @property {function(): Map} socketsById
 * @property {function(): Array} parsedTimestampSnapshots
 * @property {function(string): number} metricValue
 * @property {Object} icons
 * @property {function(string, string=): void} toast
 * @property {function(): void} render
 */

/**
 * Creates the app context object that extracted modules can use.
 * @param {import('./types.js').AppState} state
 * @param {Object} helpers - All helper functions from main.js
 * @returns {AppContext}
 */
export function createAppContext(state, helpers) {
  return {
    get state() { return state; },
    ...helpers
  };
}
