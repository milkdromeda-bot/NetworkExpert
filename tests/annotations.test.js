import assert from "node:assert/strict";
import { test } from "node:test";

import { annotationDefaultLabel, annotationsForContext, buildAnnotationAnchorOptions, buildAnnotationDraft, normalizeAnnotations, resolveAnnotationEpoch } from "../src/annotations.js";

test("annotation draft uses default label for selected kind", () => {
  const draft = buildAnnotationDraft({ sourceName: "sample", socketId: "socket-1", metric: "rtt", kind: "failover" });
  assert.equal(draft.label, "Failover");
});

test("annotation anchor options expose visible and burst windows", () => {
  const options = buildAnnotationAnchorOptions({
    history: [{ epochMs: 1000 }, { epochMs: 4000 }],
    microburst: { startEpochMs: 2000, endEpochMs: 2500 },
    tailLatency: { startEpochMs: 3000, endEpochMs: 3600 }
  });
  assert.ok(options.some(item => item.id === "visible-end"));
  assert.ok(options.some(item => item.id === "burst-start"));
  assert.ok(options.some(item => item.id === "tail-end"));
});

test("annotation resolution maps anchor ids to epochs", () => {
  const epoch = resolveAnnotationEpoch({ anchor: "tail-mid" }, {
    history: [{ epochMs: 1000 }, { epochMs: 5000 }],
    tailLatency: { startEpochMs: 2000, endEpochMs: 4000 }
  });
  assert.equal(epoch, 3000);
});

test("annotations for context keep socket-wide and metric-specific markers", () => {
  const items = normalizeAnnotations([
    { id: "a1", sourceName: "sample", socketId: "socket-1", metric: "*", label: "Burst start", kind: "burst-start", epochMs: 2000 },
    { id: "a2", sourceName: "sample", socketId: "socket-1", metric: "rtt", label: "RTT peak", kind: "rtt-peak", epochMs: 2100 },
    { id: "a3", sourceName: "other", socketId: "socket-1", metric: "rtt", label: "Other source", kind: "custom", epochMs: 2100 }
  ]);
  const selected = annotationsForContext(items, { sourceName: "sample", socketId: "socket-1", metric: "rtt", history: [{ epochMs: 1000 }, { epochMs: 3000 }] });
  assert.deepEqual(selected.map(item => item.id), ["a1", "a2"]);
});

test("annotation default label falls back to custom", () => {
  assert.equal(annotationDefaultLabel("unknown"), "Analyst note");
});
