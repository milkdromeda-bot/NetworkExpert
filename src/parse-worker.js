/**
 * Web Worker for heavy ss parsing operations.
 * Offloads parseSs + analysis + diagnostics + stories from the main thread.
 */
import { parseSs, parseTimestampLine } from "./parser.js";
import { analyzeAll, applyRisks } from "./analysis.js";
import { correlateFixLatency } from "./fix-correlation.js";
import { buildDiagnosticHypotheses } from "./diagnostics.js";
import { detectTimelineStories } from "./timeline-stories.js";

self.onmessage = function(e) {
  const { type, payload } = e.data;

  if (type === "parseSs") {
    try {
      const sockets = parseSs(payload.raw);
      self.postMessage({ type: "parseSs:done", payload: { sockets } });
    } catch (err) {
      self.postMessage({ type: "parseSs:error", payload: { message: err.message } });
    }
  }

  if (type === "analyze") {
    try {
      const analyzed = analyzeAll(payload.sockets, payload.thresholds);
      const withRisks = applyRisks(analyzed);
      self.postMessage({ type: "analyze:done", payload: { sockets: withRisks } });
    } catch (err) {
      self.postMessage({ type: "analyze:error", payload: { message: err.message } });
    }
  }

  if (type === "diagnose") {
    try {
      const hypotheses = buildDiagnosticHypotheses(payload.sockets, payload.anomalies, payload.options);
      self.postMessage({ type: "diagnose:done", payload: { hypotheses } });
    } catch (err) {
      self.postMessage({ type: "diagnose:error", payload: { message: err.message } });
    }
  }

  if (type === "stories") {
    try {
      const stories = detectTimelineStories(payload.history, payload.options);
      self.postMessage({ type: "stories:done", payload: { stories } });
    } catch (err) {
      self.postMessage({ type: "stories:error", payload: { message: err.message } });
    }
  }

  if (type === "correlateFixLatency") {
    try {
      const result = correlateFixLatency(payload);
      self.postMessage({ type: "correlateFixLatency:done", payload: result });
    } catch (err) {
      self.postMessage({ type: "correlateFixLatency:error", payload: { message: err.message } });
    }
  }

  if (type === "parseTimestamps") {
    try {
      const lines = payload.raw.split(/\r?\n/);
      let hasTimestamps = false;
      for (const line of lines) {
        if (parseTimestampLine(line.trim()) != null) { hasTimestamps = true; break; }
      }
      self.postMessage({ type: "parseTimestamps:done", payload: { hasTimestamps } });
    } catch (err) {
      self.postMessage({ type: "parseTimestamps:error", payload: { message: err.message } });
    }
  }
};
