import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const importPageCss = readFileSync(new URL("../../src/styles/import-page.css", import.meta.url), "utf8");
const analysisTableCss = readFileSync(new URL("../../src/styles/analysis-table.css", import.meta.url), "utf8");
const main = readFileSync(new URL("../../src/rendering/main-runtime.js", import.meta.url), "utf8");
const initialState = readFileSync(new URL("../../src/rendering/initial-state.js", import.meta.url), "utf8");
const ssCommandController = readFileSync(new URL("../../src/rendering/ss-command-controller.js", import.meta.url), "utf8");
const ingestView = readFileSync(new URL("../../src/views/ingest-view.js", import.meta.url), "utf8");
const ingestActions = readFileSync(new URL("../../src/events/ingest-actions.js", import.meta.url), "utf8");
const commandPreferenceEvents = readFileSync(new URL("../../src/events/command-preference-events.js", import.meta.url), "utf8");
const ssCommandView = readFileSync(new URL("../../src/views/ss-command-view.js", import.meta.url), "utf8");
const ssCommandConfig = readFileSync(new URL("../../src/parsing/ss-command-config.js", import.meta.url), "utf8");
const timelineRendering = readFileSync(new URL("../../src/views/timeline-rendering.js", import.meta.url), "utf8");
const localeFormatting = readFileSync(new URL("../../src/core/locale-formatting.js", import.meta.url), "utf8");
const socketTableRendering = readFileSync(new URL("../../src/views/socket-table-rendering.js", import.meta.url), "utf8");

test("ss command panel exposes aligned collection parameters", () => {
  assert.match(main, /import \{ buildSsCollectionCommand, commandCoverage, toggleCommandOption \} from "\.\.\/parsing\/ss-command\.js";/);
  assert.match(main, /import \{ validateSsCommandConfig \} from "\.\.\/parsing\/ss-command-validation\.js";/);
  assert.match(initialState, /ssCommandConfig:\s*defaultSsCommandConfig\(\)/);
  assert.match(ssCommandConfig, /function defaultSsLogPath\(date = new Date\(\)\)[\s\S]*\/tmp\/networkexpert_ss_\$\{ssCommandTimestamp\(date\)\}\.log/);
  assert.match(main, /function renderSsCommandBuilder\(\)/);
  assert.match(ssCommandView, /id="ssCmdTimestamp"[\s\S]*Timestamp each run/);
  assert.match(ssCommandView, /id="ssCmdLoop"[\s\S]*Repeat command/);
  assert.match(ssCommandView, /Interval \(s\)<\/span><input id="ssCmdInterval" type="text" inputmode="decimal"/);
  assert.match(ssCommandView, /id="ssCmdSrcIp"[\s\S]*id="ssCmdSrcPort"[\s\S]*id="ssCmdDstIp"[\s\S]*id="ssCmdDstPort"/);
  assert.match(ssCommandView, /placeholder="source address"/);
  assert.match(ssCommandView, /data-ss-field-msg="srcIp"/);
  assert.match(ssCommandConfig, /function updateSsCommandValidation\(validation, documentRef = globalThis\.document\)/);
  assert.match(ssCommandConfig, /input\?\.setCustomValidity\(result\.valid === false \? result\.message : ""\);/);
  assert.doesNotMatch(main, /placeholder="192\.168\.145\.205"/);
  assert.match(ingestView, /data-action="loadSsCommandEndpointExample"/);
  assert.doesNotMatch(`${main}\n${ingestActions}`, /market-data example/);
  assert.doesNotMatch(`${main}\n${ingestActions}`, /lfxbench_tcp-laloRcvMarketSimu/);
  assert.match(ingestActions, /state\.ssCommandConfig = \{[\s\S]*intervalSeconds:\s*"1"[\s\S]*srcIp:\s*"10\.0\.0\.10"[\s\S]*outputPath:\s*defaultSsLogPath\(\)/);
  assert.match(ssCommandView, /const teeRisk = Boolean\(c\.outputPath && c\.appendOutput !== false && c\.loop && interval <= 0\.05\);/);
  assert.match(ssCommandView, /terminal output plus <code>tee<\/code> can become the bottleneck/);
  assert.match(ssCommandView, /id="ssCmdOutputPath"[\s\S]*id="ssCmdAppend"/);
  assert.match(main, /function syncSsCommandFromBuilder\(\{ updateWarning = true \} = \{\}\)/);
  assert.match(ssCommandController, /if \(validation\.valid\) \{[\s\S]*state\.command = buildSsCollectionCommand\(commandInput \? commandInput\.value : state\.command, state\.ssCommandConfig\);/);
  assert.match(ingestActions, /toast\("Invalid ss command fields", first\?\.message \|\| "Fix the highlighted fields before copying\.", "danger"\);/);
  assert.match(commandPreferenceEvents, /document\.querySelectorAll\("\[id\^='ssCmd'\]"\)\.forEach\(input => \{/);
  assert.match(commandPreferenceEvents, /input\.addEventListener\(eventName, \(\) => syncSsCommandFromBuilder\(\)\);/);
  assert.match(commandPreferenceEvents, /document\.querySelector\("#commandInput"\)\?\.addEventListener\("input"/);
  assert.match(importPageCss, /\.ss-command-builder\s*\{[^}]*grid-template-columns:\s*minmax\(220px,\s*\.75fr\) minmax\(360px,\s*1\.35fr\) minmax\(240px,\s*\.9fr\);/s);
  assert.match(importPageCss, /\.ss-command-group--filter\s*\{[^}]*grid-template-columns:\s*minmax\(160px,\s*1fr\) 110px minmax\(160px,\s*1fr\) 110px;/s);
  assert.match(importPageCss, /\.ss-command-group \.ss-interval-field\s*\{[^}]*grid-template-columns:\s*max-content minmax\(82px,\s*110px\) minmax\(0,\s*1fr\);/s);
  assert.match(importPageCss, /\.ss-command-group label\.ss-field\.invalid input\s*\{[^}]*border-color:\s*rgba\(255,\s*107,\s*130,\s*\.88\);/s);
  assert.match(importPageCss, /\.ingest-card-layout \.ss-command-group--filter\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) 110px;/s);
  assert.match(importPageCss, /\.ss-command-example\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*justify-self:\s*start;/s);
  assert.match(importPageCss, /\.ss-command-warning\s*\{[^}]*grid-template-columns:\s*18px minmax\(0,\s*1fr\);[^}]*border:\s*1px solid rgba\(246,\s*160,\s*79,\s*\.42\);/s);
  assert.match(importPageCss, /\.ss-command-warning\.hidden\s*\{[^}]*display:\s*none;/s);
});

test("timeline shows millisecond precision when timestamp data contains it", () => {
  assert.match(localeFormatting, /function formatTimelineTime\(event\)/);
  assert.match(localeFormatting, /const hasMilliseconds = Number\.isFinite\(epochMs\) && Math\.abs\(Math\.round\(epochMs\)\) % 1000 !== 0;/);
  assert.match(localeFormatting, /fractionalSecondDigits:\s*3/);
  assert.match(localeFormatting, /hasMilliseconds \? "timeline-ms" : "timeline"/);
  assert.match(localeFormatting, /function formatTimelineOffset\(seconds\)/);
  assert.match(timelineRendering, /t\+\$\{formatTimelineOffset\(event\.t \|\| 0\)\}s/);
});

test("filtered row count is pagination context only", () => {
  assert.match(main, /function hasActiveTableFilters\(filters = state\?\.table\?\.filters\)/);
  assert.match(socketTableRendering, /const filteredCount = hasActiveTableFilters\(\) \? `<span class="pager-filter-count">\$\{formatNumber\(total\)\} filtered row\(s\)<\/span>` : "";/);
  assert.match(socketTableRendering, /<div class="pager">\s*\$\{filteredCount\}/);
  assert.doesNotMatch(main, /class="grid-controls-count"/);
  assert.doesNotMatch(analysisTableCss, /\.grid-controls-count/);
  assert.match(analysisTableCss, /\.pager-filter-count\s*\{[^}]*margin-right:\s*auto;/s);
});
