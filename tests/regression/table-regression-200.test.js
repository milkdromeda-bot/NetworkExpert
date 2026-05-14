import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildSocketOptionSets,
  buildVisibleColumnOrder,
  columnControlMatchesSearch,
  normalizeTableState,
  setTableColumnVisibility,
  tableColumnControlModels,
  tableColumnKeys,
  tableColumnMetadata,
  tableFilterCacheKey,
  tableSettingsMenuLayout,
  toggleTableColumnPin,
  toggleTableColumnVisibility
} from "../../src/table-state.js";

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

const defaults = {
  page: 1,
  pageSize: 25,
  sortKey: "risk",
  sortDir: "desc",
  pinned: ["risk", "state", "local"],
  visible: columns.filter(column => column.defaultVisible !== false).map(column => column.key),
  order: columns.map(column => column.key),
  filters: {
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
  }
};

function socket(index) {
  return {
    state: index % 2 ? "LISTEN" : "ESTAB",
    family: index % 3 ? "tcp" : "udp",
    localAddress: { host: `10.0.${index % 5}.${index + 1}`, port: String(2 + index * 8) },
    peerAddress: { host: `172.16.${index % 7}.${index + 2}`, port: String(10 + index) },
    details: { process: index % 4 === 0 ? null : { name: `proc-${index % 6}` } }
  };
}

const cases = [];

for (let i = 0; i < columns.length; i += 1) {
  const column = columns[i];
  cases.push([`metadata cache keeps ${column.key} in stable key order`, () => {
    assert.equal(tableColumnMetadata(columns), tableColumnMetadata(columns));
    assert.equal(tableColumnKeys(columns)[i], column.key);
  }]);
  cases.push([`control model exposes searchable state for ${column.key}`, () => {
    const controls = tableColumnControlModels(defaults, columns, defaults);
    const control = controls.find(item => item.key === column.key);
    assert.equal(control.label, column.label);
    assert.equal(control.searchText.includes(column.key.toLowerCase()), true);
    assert.equal(columnControlMatchesSearch(control, column.label.slice(0, 3)), true);
  }]);
}

for (let i = 0; i < 20; i += 1) {
  cases.push([`socket option sets include generated endpoints ${i}`, () => {
    const options = buildSocketOptionSets([socket(i), socket(i + 1), socket(i + 2)]);
    assert.equal(options.states.includes(socket(i).state), true);
    assert.equal(options.families.includes(socket(i + 1).family), true);
    assert.equal(options.srcIps.includes(socket(i + 2).localAddress.host), true);
  }]);
  cases.push([`socket option sets sort numeric ports naturally ${i}`, () => {
    const options = buildSocketOptionSets([
      { ...socket(i), localAddress: { host: "10.0.0.1", port: String(10 + i) } },
      { ...socket(i + 1), localAddress: { host: "10.0.0.2", port: String(2 + i) } }
    ]);
    assert.deepEqual(options.srcPorts, [String(2 + i), String(10 + i)]);
  }]);
}

for (let i = 0; i < 40; i += 1) {
  const viewportWidth = 360 + (i % 8) * 93;
  const viewportHeight = 420 + (i % 10) * 57;
  const anchorRect = {
    top: 12 + (i * 37) % Math.max(20, viewportHeight - 60),
    right: 12 + (i * 53) % Math.max(40, viewportWidth - 16),
    bottom: 38 + (i * 37) % Math.max(20, viewportHeight - 60)
  };
  cases.push([`table settings layout stays inside viewport ${i}`, () => {
    const layout = tableSettingsMenuLayout({ viewportWidth, viewportHeight, anchorRect });
    assert.equal(layout.drawer, false);
    assert.equal(layout.left >= 8, true);
    assert.equal(layout.top >= 8, true);
    assert.equal(layout.left + layout.width <= viewportWidth - 8, true);
    assert.equal(layout.top + layout.height <= viewportHeight - 8, true);
  }]);
}

for (let i = 0; i < 40; i += 1) {
  cases.push([`normalization repairs generated stale layout ${i}`, () => {
    const visible = [columns[i % columns.length].key, "missing", columns[(i + 3) % columns.length].key];
    const pinned = [visible[0], "ghost", columns[(i + 5) % columns.length].key];
    const order = ["ghost", columns[(i + 7) % columns.length].key, visible[0], visible[0]];
    const normalized = normalizeTableState({
      page: i - 12,
      pageSize: i % 2 ? 50 : 10,
      sortKey: i % 3 ? "missing" : "rtt",
      sortDir: i % 4 ? "sideways" : "asc",
      visible,
      pinned,
      order,
      filters: { text: `case-${i}` }
    }, columns, defaults);
    const keySet = new Set(columns.map(column => column.key));
    assert.equal(normalized.page >= 1, true);
    assert.equal(normalized.visible.every(key => keySet.has(key)), true);
    assert.equal(normalized.pinned.every(key => normalized.visible.includes(key)), true);
    assert.equal(new Set(normalized.order).size, columns.length);
    assert.equal(buildVisibleColumnOrder(normalized, columns, defaults).length >= 1, true);
    assert.equal(normalized.filters.text, `case-${i}`);
  }]);
}

for (let i = 0; i < 20; i += 1) {
  const key = columns[i].key;
  cases.push([`visibility and pin toggles preserve generated column ${key}`, () => {
    const table = normalizeTableState({ ...defaults, visible: [key], pinned: [key] }, columns, defaults);
    const hidden = toggleTableColumnVisibility(table, key, columns, defaults);
    const restored = setTableColumnVisibility(hidden, key, true, columns, defaults);
    const pinned = toggleTableColumnPin(restored, key, columns, defaults);
    const unpinned = toggleTableColumnPin(pinned, key, columns, defaults);
    assert.equal(restored.visible.includes(key), true);
    assert.equal(restored.pinned.includes(key), false);
    assert.equal(pinned.pinned.includes(key), true);
    assert.equal(unpinned.pinned.includes(key), false);
  }]);
}

for (let i = 0; i < 20; i += 1) {
  cases.push([`filter cache key differentiates generated filters ${i}`, () => {
    const a = tableFilterCacheKey({
      ...defaults.filters,
      text: `flow-${i}`,
      risk: i % 2 ? "critical" : "all",
      minRtt: i,
      onlyAnomalies: i % 3 === 0
    });
    const b = tableFilterCacheKey({
      ...defaults.filters,
      text: `flow-${i + 1}`,
      risk: i % 2 ? "critical" : "all",
      minRtt: i,
      onlyAnomalies: i % 3 === 0
    });
    assert.notEqual(a, b);
  }]);
}

assert.equal(cases.length, 200);

for (const [name, run] of cases) {
  test(`table generated regression: ${name}`, run);
}
