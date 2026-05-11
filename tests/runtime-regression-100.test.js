import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  buildSocketOptionSets,
  buildVisibleColumnOrder,
  columnControlMatchesSearch,
  normalizeTableState,
  tableColumnControlModels,
  tableFilterCacheKey,
  tableSettingsMenuLayout
} from "../src/table-state.js";
import { applyTableColumnSearchFilter, renderTableSettingsContent } from "../src/table-settings-view.js";

const columns = [
  { key: "risk", label: "Risk" },
  { key: "state", label: "State" },
  { key: "family", label: "Proto" },
  { key: "application", label: "App" },
  { key: "recvQ", label: "Recv-Q" },
  { key: "sendQ", label: "Send-Q" },
  { key: "tx_bps", label: "TX bps", defaultVisible: false },
  { key: "rx_bps", label: "RX bps", defaultVisible: false },
  { key: "local", label: "Local" },
  { key: "peer", label: "Peer" },
  { key: "process", label: "Process" },
  { key: "rtt", label: "RTT" },
  { key: "rto", label: "RTO" },
  { key: "cwnd", label: "cwnd" },
  { key: "ato", label: "ato" },
  { key: "skmem.r", label: "skmem.r" },
  { key: "skmem.t", label: "skmem.t" },
  { key: "skmem.d", label: "drops" },
  { key: "delivery_rate", label: "Delivery rate", defaultVisible: false },
  { key: "retrans", label: "Retrans timer", defaultVisible: false }
];

const defaultFilters = {
  text: "",
  risk: "all",
  state: "all",
  family: "all",
  minRecvQ: "",
  minSendQ: "",
  minRtt: "",
  srcIp: "",
  dstIp: "",
  srcPort: "",
  dstPort: "",
  process: "",
  onlyAnomalies: false
};

const defaults = {
  page: 1,
  pageSize: 25,
  sortKey: "risk",
  sortDir: "desc",
  pinned: ["risk", "state", "local"],
  visible: columns.filter(column => column.defaultVisible !== false).map(column => column.key),
  order: columns.map(column => column.key),
  filters: defaultFilters
};

const icons = {
  columns: "<i>columns</i>",
  sortNeutral: "<i>sort</i>",
  reset: "<i>reset</i>",
  x: "<i>x</i>",
  pin: "<i>pin</i>",
  unpin: "<i>unpin</i>"
};

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#039;"
}[char]));

function renderSettings(table, search = "") {
  return renderTableSettingsContent({
    state: { table, tableColumnSearch: search },
    tableColumns: columns,
    tableDefaults: () => defaults,
    icons,
    escapeHtml,
    formatNumber: String
  });
}

function rowFor(markup, key) {
  const marker = `data-menu-visible-col="${key}"`;
  const markerIndex = markup.indexOf(marker);
  assert.notEqual(markerIndex, -1);
  const start = markup.lastIndexOf("<div class=\"table-column-toggle-row", markerIndex);
  const next = markup.indexOf("<div class=\"table-column-toggle-row", markerIndex);
  const end = next === -1 ? markup.indexOf("<div class=\"table-settings-empty", markerIndex) : next;
  return markup.slice(start, end);
}

function searchContainer(searchTexts) {
  const rows = searchTexts.map(text => ({ dataset: { columnSearchText: text }, hidden: false }));
  const empty = { hidden: true };
  const clear = { hidden: true };
  return {
    rows,
    empty,
    clear,
    querySelectorAll(selector) {
      if (selector === ".table-column-toggle-row") return rows;
      if (selector === "[data-table-settings-empty]") return [empty];
      if (selector === "[data-table-column-search-clear]") return [clear];
      return [];
    }
  };
}

function socket(index) {
  return {
    state: index % 2 ? "LISTEN" : "ESTAB",
    family: index % 3 ? "tcp" : "udp",
    localAddress: { host: `10.10.${index % 6}.${index + 1}`, port: String(index % 2 ? 443 : 22 + index) },
    peerAddress: { host: `172.20.${index % 7}.${index + 2}`, port: String(index % 3 ? 9200 : 80 + index) },
    details: { process: index % 4 ? { name: `svc-${index % 5}` } : null }
  };
}

const cases = [
  ["index keeps vendor scripts on real separate lines", async () => {
    const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
    assert.doesNotMatch(html, /`r`n/);
    assert.match(html, /<script src="\.\/vendor\/jszip\.min\.js"><\/script>\s+<script src="\.\/vendor\/pdf-lib\.min\.js"><\/script>/);
  }],
  ["expert config exports the eager raw import limit used at startup", async () => {
    const source = await readFile(new URL("../src/expert-config.js", import.meta.url), "utf8");
    assert.match(source, /export const INGEST_RAW_EAGER_LIMIT = 200000;/);
  }],
  ["main imports the eager raw import limit instead of relying on a global", async () => {
    const source = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
    assert.match(source, /INGEST_RAW_EAGER_LIMIT/);
    assert.match(source, /from "\.\/expert-config\.js"/);
  }],
  ["main entry remains cache busted to the repaired asset version", async () => {
    const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
    assert.match(html, /src="\.\/src\/main\.js\?v=20260511-3"/);
  }],
  ["package check covers extracted view modules", async () => {
    const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
    assert.match(pkg.scripts.check, /src\/modal-view\.js/);
    assert.match(pkg.scripts.check, /src\/table-settings-view\.js/);
  }]
];

for (let i = 0; i < columns.length; i += 1) {
  const column = columns[i];
  cases.push([`column renderer mirrors visibility and pin state for ${column.key}`, () => {
    const table = normalizeTableState({
      ...defaults,
      visible: [...new Set(["risk", column.key])],
      pinned: [column.key],
      order: defaults.order
    }, columns, defaults);
    const activeRow = rowFor(renderSettings(table), column.key);
    assert.match(activeRow, /table-column-toggle-row active/);
    assert.match(activeRow, /role="checkbox" aria-checked="true"/);
    assert.match(activeRow, /table-column-pin active/);

    const hiddenTable = normalizeTableState({
      ...defaults,
      visible: [column.key === "risk" ? "state" : "risk"],
      pinned: [],
      order: defaults.order
    }, columns, defaults);
    const hiddenRow = rowFor(renderSettings(hiddenTable), column.key);
    assert.match(hiddenRow, /role="checkbox" aria-checked="false"/);
    assert.match(hiddenRow, /disabled/);
  }]);
}

for (let i = 0; i < 20; i += 1) {
  cases.push([`floating settings menu remains clamped for anchor variant ${i}`, () => {
    const viewportWidth = 420 + i * 31;
    const viewportHeight = 460 + (i % 5) * 63;
    const anchorRect = {
      top: 12 + (i * 41) % (viewportHeight - 80),
      right: 20 + (i * 67) % (viewportWidth - 24),
      bottom: 46 + (i * 41) % (viewportHeight - 80)
    };
    const layout = tableSettingsMenuLayout({ viewportWidth, viewportHeight, anchorRect });
    assert.equal(layout.drawer, false);
    assert.equal(layout.left >= 8, true);
    assert.equal(layout.top >= 8, true);
    assert.equal(layout.left + layout.width <= viewportWidth - 8, true);
    assert.equal(layout.top + layout.height <= viewportHeight - 8, true);
  }]);
}

for (let i = 0; i < 20; i += 1) {
  const column = columns[i];
  cases.push([`live column search filters visible rows for ${column.key}`, () => {
    const container = searchContainer(columns.map(item => `${item.label.toLowerCase()} ${item.key.toLowerCase()}`));
    applyTableColumnSearchFilter(container, column.key);
    assert.equal(container.rows[i].hidden, false);
    assert.equal(container.rows.filter(row => !row.hidden).length >= 1, true);
    assert.equal(container.clear.hidden, false);
    applyTableColumnSearchFilter(container, "not-a-real-column");
    assert.equal(container.rows.every(row => row.hidden), true);
    assert.equal(container.empty.hidden, false);
  }]);
}

for (let i = 0; i < 20; i += 1) {
  const column = columns[i];
  cases.push([`table normalization keeps ${column.key} recoverable after stale saved state`, () => {
    const normalized = normalizeTableState({
      page: -i,
      pageSize: i % 2 ? 50 : 100,
      sortKey: "ghost",
      sortDir: "sideways",
      visible: [column.key, "ghost", column.key],
      pinned: [column.key, "ghost"],
      order: ["ghost", column.key],
      filters: { text: `query-${i}`, onlyAnomalies: i % 2 === 0 }
    }, columns, defaults);
    const controls = tableColumnControlModels(normalized, columns, defaults);
    assert.equal(normalized.page, 1);
    assert.equal(normalized.sortKey, "risk");
    assert.equal(normalized.sortDir, "desc");
    assert.equal(normalized.visible.includes(column.key), true);
    assert.equal(normalized.pinned.every(key => normalized.visible.includes(key)), true);
    assert.equal(buildVisibleColumnOrder(normalized, columns, defaults).includes(column.key), true);
    assert.equal(controls.some(control => control.key === column.key), true);
    assert.equal(tableFilterCacheKey(normalized.filters).includes(`query-${i}`), true);
  }]);
}

for (let i = 0; i < 15; i += 1) {
  cases.push([`socket filter option cache deduplicates and sorts generated set ${i}`, () => {
    const options = buildSocketOptionSets([
      socket(i),
      socket(i + 1),
      socket(i + 2),
      { ...socket(i), details: { process: { name: `svc-${i % 5}` } } }
    ]);
    assert.equal(options.states.includes("ESTAB"), true);
    assert.equal(options.families.includes("tcp"), true);
    assert.equal(new Set(options.srcIps).size, options.srcIps.length);
    assert.equal(new Set(options.processes).size, options.processes.length);
    assert.deepEqual([...options.srcPorts].sort((a, b) => new Intl.Collator("en", { numeric: true }).compare(a, b)), options.srcPorts);
    assert.equal(columnControlMatchesSearch({ key: columns[i].key, label: columns[i].label }, columns[i].label), true);
  }]);
}

assert.equal(cases.length, 100);

for (const [name, run] of cases) {
  test(`runtime regression: ${name}`, run);
}
