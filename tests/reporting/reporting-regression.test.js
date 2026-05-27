import assert from "node:assert/strict";
import { test } from "node:test";
import { annotationDefaultLabel, annotationTypeLabel, annotationTypeList, buildAnnotationAnchorOptions, buildAnnotationDraft, normalizeAnnotations, resolveAnnotationEpoch } from "../../src/timeline/annotations.js";
import { buildAnomaliesCsv, buildCsv, buildEvidenceManifest, buildTimelinePayload, buildTopSocketsCsv, safeEvidenceFileName } from "../../src/reporting/evidence-pack.js";
import { buildExecutiveSummary, pickExecutiveFocusSocket } from "../../src/reporting/executive-summary.js";

// annotationTypeList
test("annotationTypeList returns at least 4 types", () => {
  assert.ok(annotationTypeList().length >= 4);
});
test("annotationTypeList includes custom type", () => {
  assert.ok(annotationTypeList().some(t => t.id === "custom"));
});
test("annotationTypeList includes failover type", () => {
  assert.ok(annotationTypeList().some(t => t.id === "failover"));
});

// annotationTypeLabel
test("annotationTypeLabel returns label for known type", () => {
  assert.equal(annotationTypeLabel("failover"), "Failover");
});
test("annotationTypeLabel returns custom label for unknown", () => {
  assert.equal(annotationTypeLabel("unknown"), "Custom marker");
});
test("annotationTypeLabel handles undefined", () => {
  assert.equal(annotationTypeLabel(undefined), "Custom marker");
});

// annotationDefaultLabel
test("annotationDefaultLabel returns default for custom", () => {
  assert.equal(annotationDefaultLabel("custom"), "Analyst note");
});
test("annotationDefaultLabel returns default for burst-start", () => {
  assert.equal(annotationDefaultLabel("burst-start"), "Burst start");
});
test("annotationDefaultLabel returns fallback for unknown", () => {
  assert.equal(annotationDefaultLabel("xyz"), "Analyst note");
});

// normalizeAnnotations
test("normalizeAnnotations handles null", () => {
  assert.deepEqual(normalizeAnnotations(null), []);
});
test("normalizeAnnotations handles undefined", () => {
  assert.deepEqual(normalizeAnnotations(undefined), []);
});
test("normalizeAnnotations handles empty array", () => {
  assert.deepEqual(normalizeAnnotations([]), []);
});
test("normalizeAnnotations filters non-objects", () => {
  assert.deepEqual(normalizeAnnotations([null, undefined, 42, "str"]), []);
});
test("normalizeAnnotations assigns id to items without one", () => {
  const [item] = normalizeAnnotations([{ sourceName: "test" }]);
  assert.ok(item.id.startsWith("annotation-"));
});
test("normalizeAnnotations preserves existing id", () => {
  const [item] = normalizeAnnotations([{ id: "my-id", sourceName: "test" }]);
  assert.equal(item.id, "my-id");
});
test("normalizeAnnotations defaults kind to custom", () => {
  const [item] = normalizeAnnotations([{ sourceName: "test" }]);
  assert.equal(item.kind, "custom");
});
test("normalizeAnnotations defaults metric to *", () => {
  const [item] = normalizeAnnotations([{ sourceName: "test" }]);
  assert.equal(item.metric, "*");
});
test("normalizeAnnotations sorts by createdAt", () => {
  const items = normalizeAnnotations([
    { id: "b", sourceName: "test", createdAt: 200 },
    { id: "a", sourceName: "test", createdAt: 100 }
  ]);
  assert.equal(items[0].id, "a");
  assert.equal(items[1].id, "b");
});

// buildAnnotationDraft
test("buildAnnotationDraft uses kind label", () => {
  const draft = buildAnnotationDraft({ kind: "rtt-peak" });
  assert.equal(draft.label, "RTT peak");
});
test("buildAnnotationDraft defaults to custom", () => {
  const draft = buildAnnotationDraft({});
  assert.equal(draft.kind, "custom");
  assert.equal(draft.label, "Analyst note");
});
test("buildAnnotationDraft sets anchor to visible-end", () => {
  const draft = buildAnnotationDraft({});
  assert.equal(draft.anchor, "visible-end");
});

// buildAnnotationAnchorOptions
test("buildAnnotationAnchorOptions returns empty for empty history", () => {
  assert.deepEqual(buildAnnotationAnchorOptions({}), []);
});
test("buildAnnotationAnchorOptions includes visible options", () => {
  const options = buildAnnotationAnchorOptions({ history: [{ epochMs: 1000 }, { epochMs: 5000 }] });
  assert.ok(options.some(o => o.id === "visible-start"));
  assert.ok(options.some(o => o.id === "visible-end"));
  assert.ok(options.some(o => o.id === "visible-mid"));
});
test("buildAnnotationAnchorOptions includes burst options", () => {
  const options = buildAnnotationAnchorOptions({ history: [{ epochMs: 0 }, { epochMs: 10000 }], microburst: { startEpochMs: 2000, endEpochMs: 4000 } });
  assert.ok(options.some(o => o.id === "burst-start"));
  assert.ok(options.some(o => o.id === "burst-mid"));
  assert.ok(options.some(o => o.id === "burst-end"));
});
test("buildAnnotationAnchorOptions includes tail options", () => {
  const options = buildAnnotationAnchorOptions({ history: [{ epochMs: 0 }, { epochMs: 10000 }], tailLatency: { startEpochMs: 3000, endEpochMs: 6000 } });
  assert.ok(options.some(o => o.id === "tail-start"));
  assert.ok(options.some(o => o.id === "tail-end"));
});

// resolveAnnotationEpoch
test("resolveAnnotationEpoch uses explicit epochMs", () => {
  assert.equal(resolveAnnotationEpoch({ epochMs: 5000 }, {}), 5000);
});
test("resolveAnnotationEpoch resolves visible-start", () => {
  const epoch = resolveAnnotationEpoch({ anchor: "visible-start" }, { history: [{ epochMs: 1000 }, { epochMs: 5000 }] });
  assert.equal(epoch, 1000);
});
test("resolveAnnotationEpoch resolves visible-end", () => {
  const epoch = resolveAnnotationEpoch({ anchor: "visible-end" }, { history: [{ epochMs: 1000 }, { epochMs: 5000 }] });
  assert.equal(epoch, 5000);
});
test("resolveAnnotationEpoch returns null for unknown anchor", () => {
  const epoch = resolveAnnotationEpoch({ anchor: "unknown" }, { history: [{ epochMs: 1000 }] });
  assert.equal(epoch, null);
});

// safeEvidenceFileName
test("safeEvidenceFileName lowercases", () => {
  assert.equal(safeEvidenceFileName("MyFile"), "myfile");
});
test("safeEvidenceFileName replaces spaces with dashes", () => {
  assert.equal(safeEvidenceFileName("my file"), "my-file");
});
test("safeEvidenceFileName removes special chars", () => {
  assert.equal(safeEvidenceFileName("file/name:test"), "file-name-test");
});
test("safeEvidenceFileName handles empty string", () => {
  assert.equal(safeEvidenceFileName(""), "artifact");
});

// buildCsv
test("buildCsv produces header and rows", () => {
  const csv = buildCsv([{ a: 1 }], [{ label: "A", value: r => r.a }]);
  assert.match(csv, /^A\n1$/);
});
test("buildCsv escapes commas in values", () => {
  const csv = buildCsv([{ a: "hello, world" }], [{ label: "Col", value: r => r.a }]);
  assert.match(csv, /"hello, world"/);
});
test("buildCsv handles empty rows", () => {
  const csv = buildCsv([], [{ label: "A", value: () => "" }]);
  assert.equal(csv, "A\n");
});

// buildTimelinePayload
test("buildTimelinePayload includes all meta fields", () => {
  const payload = buildTimelinePayload([], { sourceName: "test", timezone: "UTC", filters: ["a"], annotations: [{ id: "1" }] });
  assert.equal(payload.sourceName, "test");
  assert.equal(payload.timezone, "UTC");
  assert.equal(payload.filters.length, 1);
  assert.equal(payload.annotations.length, 1);
});
test("buildTimelinePayload copies points", () => {
  const payload = buildTimelinePayload([{ epochMs: 1, rtt: 5 }], {});
  assert.equal(payload.points.length, 1);
  assert.equal(payload.points[0].rtt, 5);
});

// pickExecutiveFocusSocket
test("pickExecutiveFocusSocket returns null for empty list and no selection", () => {
  assert.equal(pickExecutiveFocusSocket(null, []), null);
});
test("pickExecutiveFocusSocket prefers selected over riskier", () => {
  const selected = { id: "a", risk: "low", sendQ: 0, recvQ: 0 };
  const picked = pickExecutiveFocusSocket(selected, [{ id: "b", risk: "critical" }]);
  assert.equal(picked.id, "a");
});
test("pickExecutiveFocusSocket picks highest risk from list", () => {
  const picked = pickExecutiveFocusSocket(null, [
    { id: "a", risk: "low" },
    { id: "b", risk: "high" },
    { id: "c", risk: "medium" }
  ]);
  assert.equal(picked.id, "b");
});

// buildExecutiveSummary
test("buildExecutiveSummary returns null when no data", () => {
  assert.equal(buildExecutiveSummary({}), null);
});
test("buildExecutiveSummary returns microburst title when present", () => {
  const summary = buildExecutiveSummary({
    focusSocket: { id: "a", risk: "critical" },
    microburst: { severity: "critical", peakRxBps: 100000, peakRecvQ: 500000, dropDeltaTotal: 5 },
    formatMicroburstWindow: () => "w",
    formatMetricValue: (_, v) => String(v)
  });
  assert.equal(summary.title, "Receive-side microburst");
});
test("buildExecutiveSummary returns tail title when no microburst", () => {
  const summary = buildExecutiveSummary({
    focusSocket: { id: "a", risk: "high" },
    tailLatency: { severity: "high", suspicion: "path instability", stats: { rtt: { p99: 10, p999: 20 }, rto: { p99: 100, p999: 200 } } },
    formatTailLatencyWindow: () => "w",
    formatMetricValue: (_, v) => String(v)
  });
  assert.equal(summary.title, "Path instability");
});
