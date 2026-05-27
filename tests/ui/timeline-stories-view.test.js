import assert from "node:assert/strict";
import { test } from "node:test";
import { renderTimelineStoriesViewModel } from "../../src/views/timeline-stories-view.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function deps(overrides = {}) {
  return {
    state: {
      _multiSocketEvents: [],
      _rateAlerts: [],
      storySocketFilter: "",
      ...overrides.state
    },
    escapeHtml,
    storyStepMetric: key => ({ "sendQ-grow": "sendQ", "backoff-rises": "backoff" }[key] || ""),
    ...overrides.deps
  };
}

test("timeline stories view renders a compact empty state", () => {
  const html = renderTimelineStoriesViewModel([], deps());

  assert.match(html, /timeline-stories-empty/);
  assert.match(html, /No causal pattern detected yet/);
});

test("timeline stories view groups velocity alerts and story navigation", () => {
  const html = renderTimelineStoriesViewModel([{
    title: "Send-Q pressure",
    socketKey: "socket-a",
    socket: { peer: "10.0.0.2:443", details: { process: { name: "java", pid: 42 } } },
    matchedSteps: [{ key: "sendQ-grow", epochMs: 1778844490123, label: "Send-Q rose" }],
    totalSteps: 2,
    narrative: ["Send-Q grows", "critical conclusion"]
  }], deps({
    state: {
      _rateAlerts: [
        { process: "java:42", peer: "10.0.0.2", metric: "sendQ", epochMs: 1778844490123, prevValue: 1024, currValue: 4096, dtMs: 40, severity: "high", label: "Send-Q velocity", rateFormatted: "76 KB/s" },
        { process: "java:42", peer: "10.0.0.2", metric: "sendQ", epochMs: 1778844490123, prevValue: 1024, currValue: 4096, dtMs: 40, severity: "high", label: "Send-Q velocity", rateFormatted: "76 KB/s" }
      ],
      _multiSocketEvents: [{
        socketCount: 2,
        narrative: { title: "Process-wide stall", line: "Two sockets blocked", conclusion: "Investigate local process." }
      }]
    }
  }));

  assert.match(html, /rate-alerts/);
  assert.match(html, /Send-Q velocity/);
  assert.match(html, /×2 sockets/);
  assert.match(html, /multi-socket-events/);
  assert.match(html, /Process-wide stall/);
  assert.match(html, /data-action="storyJumpToChart"/);
  assert.match(html, /data-metric="sendQ"/);
});
