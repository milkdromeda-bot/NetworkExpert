import assert from "node:assert/strict";
import { test } from "node:test";
import { createJvmPanelModel } from "../../src/correlation/jvm-panel-model.js";

function makeModel(overrides = {}) {
  const state = overrides.state || {
    hiddenJvmSeries: new Set(),
    jvmGc: { clockOffsetMs: 0, severityFilter: "all" },
    jvmTable: { page: 1, pageSize: 20, sortKey: "time", sortDir: "desc" }
  };
  return createJvmPanelModel({
    state,
    icons: { first: "|<", next: ">", previous: "<", last: ">|", sortAsc: "^", sortDesc: "v", sortNeutral: "=" },
    alignTimestamps: (items, _history, offset = 0) => items.map(item => ({ ...item, alignedEpochMs: item.epochMs + offset })),
    dateTimeFormatter: () => ({ format: () => "15/05/2026, 13:29:00" }),
    escapeHtml: value => String(value ?? ""),
    formatNumber: value => String(value),
    renderJvmGcPanelView: view => view.renderJvmLegend("timeline"),
    resolvedNumberLocale: () => "en-US",
    resolvedTimeZone: () => "UTC",
    visibleHistory: () => [{ epochMs: 10 }, { epochMs: 20 }],
    ...overrides
  });
}

test("JVM panel model renders toggleable legend entries", () => {
  const model = makeModel({
    state: {
      hiddenJvmSeries: new Set(["recvq"]),
      jvmGc: { clockOffsetMs: 0, severityFilter: "all" },
      jvmTable: { page: 1, pageSize: 20, sortKey: "time", sortDir: "desc" }
    }
  });

  const html = model.renderJvmLegend("timeline");

  assert.match(html, /data-jvm-series-key="recvq"/);
  assert.match(html, /opacity:\.4;text-decoration:line-through/);
  assert.match(html, /Young GC/);
});

test("JVM panel model keeps precise millisecond timestamps", () => {
  const model = makeModel();

  assert.equal(model.preciseDateTimeLabel(1778848140123), "15/05/2026, 13:29:00.123");
});

test("JVM panel model sorts, filters, and paginates event rows", () => {
  const model = makeModel({
    state: {
      hiddenJvmSeries: new Set(),
      jvmGc: { clockOffsetMs: 0, severityFilter: "warning" },
      jvmTable: { page: 1, pageSize: 1, sortKey: "time", sortDir: "desc" }
    }
  });
  const rows = [
    { pause: { id: "1", type: "Young", durationMs: 1 }, epochMs: 10, score: 0.2, severity: "warning", symptoms: { signals: [] } },
    { pause: { id: "2", type: "Mixed", durationMs: 2 }, epochMs: 20, score: 0.4, severity: "warning_high", symptoms: { signals: [] } }
  ];

  const page = model.jvmPagedRows(rows, [{ epochMs: 30, totalMs: 3 }]);

  assert.equal(page.total, 2);
  assert.equal(page.totalPages, 2);
  assert.equal(page.rows[0].eventId, "2");
});
