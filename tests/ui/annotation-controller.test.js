import assert from "node:assert/strict";
import { test } from "node:test";

import { createAnnotationController } from "../../src/rendering/annotation-controller.js";

function deps(overrides = {}) {
  const state = {
    annotations: [{ id: "ann" }],
    chartMetrics: ["rtt", "sendQ"],
    prefs: { graphMetric: "rx_bps" },
    selectedId: "fallback",
    sourceName: "capture",
    annotationContext: null,
    annotationDraft: null,
    modal: null
  };
  const calls = { renders: 0, toasts: [] };
  return {
    state,
    calls,
    annotationsForContext: (_annotations, context) => [{ context }],
    buildAnnotationAnchorOptions: input => [{ input }],
    buildAnnotationDraft: draft => ({ ...draft, label: "default label" }),
    metricLabel: metric => `label:${metric}`,
    microburstSummary: () => ({ burst: true }),
    render: () => { calls.renders += 1; },
    reportDefaultChartMetrics: () => ["rtt", "skmem.d"],
    selectedSocket: () => null,
    tailLatencyLens: () => ({ tail: true }),
    thresholdSeverity: (_metric, value) => value > 100 ? "warn" : "ok",
    toast: (...args) => calls.toasts.push(args),
    visibleHistory: () => [{ t: 1 }],
    ...overrides
  };
}

test("annotation controller builds context-aware annotation drafts", () => {
  const context = deps({ selectedSocket: () => ({ id: "socket-1" }) });
  const controller = createAnnotationController(() => context);

  controller.openAnnotationModal("rtt", { epochMs: "123", value: "150" });

  assert.equal(context.state.modal, "annotation");
  assert.equal(context.state.annotationDraft.socketId, "socket-1");
  assert.equal(context.state.annotationDraft.kind, "rtt-peak");
  assert.equal(context.state.annotationDraft.label, "label:rtt spike");
  assert.equal(context.state.annotationDraft.anchor, "cursor");
  assert.equal(context.state.annotationDraft.epochMs, 123);
  assert.equal(context.calls.renders, 1);
});

test("annotation controller reports missing socket and exposes choices", () => {
  const context = deps({ state: { ...deps().state, selectedId: "" } });
  const controller = createAnnotationController(() => context);

  controller.openAnnotationModal();
  assert.deepEqual(context.calls.toasts[0], ["No active socket", "Select a socket before adding an annotation.", "warn"]);
  assert.deepEqual(controller.annotationMetricChoices().map(item => item.value), ["*", "rx_bps", "rtt", "sendQ", "skmem.d"]);
  assert.deepEqual(controller.currentSourceAnnotations("rtt")[0].context.microburst, { burst: true });
  assert.deepEqual(controller.annotationAnchorOptions()[0].input.tailLatency, { tail: true });
});
