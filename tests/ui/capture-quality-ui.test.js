import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const main = readFileSync(new URL("../../src/rendering/main.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../../src/styles/styles.css", import.meta.url), "utf8");
const captureQuality = readFileSync(new URL("../../src/analysis/capture-quality.js", import.meta.url), "utf8");
const captureQualityView = readFileSync(new URL("../../src/views/capture-quality-view.js", import.meta.url), "utf8");

test("capture quality report renders diagnostic readiness and socket coverage", () => {
  assert.match(main, /renderCaptureQualityReportView/);
  assert.match(captureQualityView, /function renderCaptureQualityReadiness\(item/);
  assert.match(captureQualityView, /Diagnostic readiness/);
  assert.doesNotMatch(main, /Command interval/);
  assert.match(captureQualityView, /command sleep/);
  assert.match(captureQualityView, /Socket coverage/);
  assert.match(captureQualityView, /collection-check/);
  assert.match(captureQuality, /buildDiagnosisReadiness/);
  assert.match(captureQuality, /summarizeSocketCoverage/);
  assert.match(captureQuality, /diagnosticReadiness/);
  assert.match(captureQuality, /socketCoverage/);
});

test("capture quality report styles readiness cards responsively", () => {
  assert.match(css, /\.capture-quality-metrics\s*\{[^}]*grid-template-columns:\s*repeat\(6,\s*minmax\(120px,\s*1fr\)\);/s);
  assert.match(css, /\.capture-quality-metrics article\.collection-check/);
  assert.match(css, /\.capture-quality-readiness-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(180px,\s*1fr\)\);/s);
  assert.match(css, /\.capture-quality-readiness\.strong/);
  assert.match(css, /@media \(max-width:\s*1180px\)[\s\S]*\.capture-quality-readiness-grid\s*\{/);
});
