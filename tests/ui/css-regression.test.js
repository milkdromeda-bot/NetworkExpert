import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
const main = readFileSync(new URL("../../src/main.js", import.meta.url), "utf8");
const modalView = readFileSync(new URL("../../src/modal-view.js", import.meta.url), "utf8");
const data = readFileSync(new URL("../../src/data.js", import.meta.url), "utf8");
const profiles = readFileSync(new URL("../../src/profiles.js", import.meta.url), "utf8");

test("table settings header stays above nearby column hover tooltips", () => {
  assert.match(css, /th:not\(\.table-settings-head\):hover/);
  assert.match(css, /\.table-settings-head:hover,\s*\.table-settings-head:focus-within\s*\{[^}]*z-index:\s*40;/s);
  assert.match(css, /\.row-menu\.table-settings-menu\s*\{[^}]*z-index:\s*120;/s);
  assert.match(css, /\.row-menu\.table-settings-menu\.open\s*\{[^}]*grid-template-rows:\s*auto auto auto minmax\(0,\s*1fr\);/s);
  assert.match(css, /\.table-settings-column-list\s*\{[^}]*min-height:\s*0;/s);
  assert.match(css, /\.table-settings-search\s*\{/);
});

test("application service chip tooltip stays viewport-safe and truncates labels", () => {
  assert.match(css, /\.app-service-chip\s*\{[^}]*max-width:\s*min\(128px,\s*100%\);/s);
  assert.match(css, /\.app-service-label\s*\{[^}]*text-overflow:\s*ellipsis;/s);
  assert.match(css, /\.app-service-tooltip\s*\{[^}]*position:\s*fixed;/s);
  assert.match(css, /\.app-service-tooltip\s*\{[^}]*width:\s*min\(340px,\s*calc\(100vw - 24px\)\);/s);
  assert.match(css, /\.app-service-tooltip\.open\s*\{[^}]*display:\s*grid;/s);
  assert.match(css, /\.app-service-tooltip strong,\s*\.app-service-tooltip small,\s*\.app-service-tooltip p,\s*\.app-service-tooltip em\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
  assert.match(main, /ensureAppServiceTooltip/);
  assert.match(main, /document\.body\.appendChild\(tooltip\)/);
  assert.match(main, /function render\(\) \{[\s\S]*?hideAppServiceTooltip\(\);/);
  assert.match(main, /\[data-service-override\][\s\S]*?hideAppServiceTooltip\(\);[\s\S]*?state\.modal = "serviceOverride";/);
  assert.doesNotMatch(main, /<span class="app-service-tooltip"/);
});

test("import progress is shown in the ss stats header while loading", () => {
  assert.match(main, /function renderImportStatus\(\)/);
  assert.match(main, /<div class="panel-head[^"]*">[\s\S]*?<div class="panel-title">ss stats to parse<\/div>[\s\S]*?\$\{renderImportStatus\(\)\}/);
  assert.match(css, /\.import-status\s*\{[^}]*grid-template-columns:\s*max-content minmax\(0,\s*1fr\);/s);
  assert.match(css, /\.import-status span\s*\{[^}]*text-overflow:\s*ellipsis;/s);
});

test("file import flow has one clear filter entry point", () => {
  assert.match(main, /<button data-action="pickFile" class="primary"><i class="ri-folder-open-line"><\/i> Open file<\/button>/);
  assert.match(main, /<button data-action="pickFile" class="primary">[\s\S]*Open file<\/button>\s*<button data-action="toggleSsOptions"[\s\S]*Capture<\/button>\s*<button data-action="sample10m"[\s\S]*Sample<\/button>/);
  assert.match(main, /let state = \{\s*raw:\s*""/);
  assert.match(main, /sourceName:\s*"empty workspace"/);
  assert.match(main, /annotationDraft:\s*buildAnnotationDraft\(\{ sourceName:\s*"empty workspace" \}\)/);
  assert.match(main, /ingestRawExpanded:\s*true/);
  assert.doesNotMatch(main, /raw:\s*SAMPLE/);
  assert.doesNotMatch(main, /filters are offered after file selection/);
  assert.doesNotMatch(main, /class="import-flow-note"/);
  assert.doesNotMatch(main, /data-action="togglePreImportFilters"/);
  assert.doesNotMatch(main, /showPreImportFilters/);
  assert.match(modalView, /state\.modal === "preImport" \? "Import options"/);
  assert.match(main, /<button class="primary" data-action="startImportAll">[\s\S]*Import full file<\/button>/);
  assert.match(main, /data-action="startImportWithFilters"[\s\S]*Import with filters<\/button>/);
  assert.doesNotMatch(main, /id="preImportEnabled"/);
  assert.match(main, /toast\("No filter selected", "Use Import full file, or choose at least one preset or field filter\.", "warn"\);/);
  assert.match(main, /if \(!file\) \{\s*document\.querySelector\("#fileInput"\)\?\.click\(\);/s);
  assert.doesNotMatch(css, /\.import-flow-note/);
  assert.match(css, /\.preimport-file-card\s*\{[^}]*grid-template-columns:\s*34px minmax\(0,\s*1fr\);/s);
  assert.match(css, /\.preimport-actions\s*\{[^}]*border-top:\s*1px solid rgba\(111,\s*134,\s*160,\s*\.18\);/s);
});

test("capture helper card aligns title and explanation cleanly", () => {
  assert.match(main, /<div class="capture-flow-card">\s*<i class="ri-route-line" aria-hidden="true"><\/i>\s*<div class="capture-flow-copy">/s);
  assert.match(css, /\.capture-flow-card\s*\{[^}]*grid-template-columns:\s*28px minmax\(0,\s*1fr\);[^}]*align-items:\s*start;/s);
  assert.match(css, /\.capture-flow-copy\s*\{[^}]*display:\s*grid;[^}]*gap:\s*3px;[^}]*min-width:\s*0;/s);
  assert.match(css, /\.capture-flow-card strong\s*\{[^}]*display:\s*block;[^}]*line-height:\s*1\.25;/s);
});

test("topbar anomaly pill uses a compact warning icon", () => {
  assert.match(main, /incidentWarning/);
  assert.doesNotMatch(main, /incidentCloud/);
  assert.doesNotMatch(css, /incident-cloud-icon/);
  assert.match(css, /\.incident-warning-icon\s*\{[^}]*width:\s*15px;[^}]*height:\s*15px;/s);
  assert.match(css, /\.incident-warning-icon i\s*\{[^}]*font-size:\s*15px;/s);
});

test("clear input and reset workspace actions are visually distinct", () => {
  assert.match(main, /data-action="clear" class="clear-input-button"[^>]*>[\s\S]*Clear/);
  assert.match(main, /data-action="requestResetWorkspace"[^>]*>[\s\S]*Reset workspace/);
  assert.match(main, /action === "requestResetWorkspace"[\s\S]*state\.modal = "resetWorkspace"/);
  assert.match(main, /action === "confirmResetWorkspace"[\s\S]*resetAllState\(\)/);
  assert.doesNotMatch(main, /data-action="resetAll"/);
  assert.match(css, /\.clear-input-button\s*\{[^}]*background:/s);
  assert.match(css, /\.reset-workspace-button\s*\{[^}]*max-width:\s*190px;/s);
  assert.match(css, /\.reset-workspace-modal\s*\{/);
  assert.match(css, /\.reset-workspace-actions\s*\{[^}]*justify-content:\s*flex-end;/s);
});

test("product splash is opened from the version badge and stays bounded", () => {
  assert.match(main, /const APP_VERSION = "1\.0\.0\.0";/);
  assert.match(main, /const APP_SPLASH_IMAGE = "\.\/images\/ultimateNetworkExpert\.png";/);
  assert.match(main, /class="version-pill"[^>]*data-action="showSplash"[\s\S]*v\$\{escapeHtml\(APP_VERSION\)\}/);
  assert.match(main, /<button class="app-title-info" type="button" data-action="showSplash" title="About Ultimate Network Expert" aria-label="Open application details">/);
  assert.doesNotMatch(main, /app-title-tooltip/);
  assert.match(main, /action === "showSplash"[\s\S]*state\.modal = "splash"/);
  assert.match(css, /\.version-pill\s*\{[^}]*max-width:\s*96px;/s);
  assert.match(css, /\.app-title-info\s*\{[^}]*min-height:\s*22px;[^}]*padding:\s*0;[^}]*cursor:\s*pointer;/s);
  assert.doesNotMatch(css, /\.app-title-tooltip/);
  assert.match(css, /\.modal\.splash\s*\{[^}]*width:\s*min\(940px,\s*calc\(100vw - 30px\)\);/s);
  assert.match(css, /\.splash-art img\s*\{[^}]*width:\s*100%;[^}]*max-height:\s*min\(62vh,\s*620px\);[^}]*object-fit:\s*contain;/s);
  assert.match(css, /\.splash-meta p\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
});

test("ss editor offers calm themes and defaults to pastel", () => {
  assert.match(data, /ssEditorTheme:\s*"pastel"/);
  assert.match(main, /const SS_EDITOR_THEMES = \[/);
  assert.match(main, /\{ id: "pastel", label: "Pastel"/);
  assert.match(main, /\{ id: "ocean", label: "Ocean"/);
  assert.match(main, /\{ id: "mono", label: "Mono"/);
  assert.match(main, /\{ id: "graphite", label: "Graphite"/);
  assert.match(main, /\{ id: "slate", label: "Slate"/);
  assert.match(main, /\{ id: "sand", label: "Sand"/);
  assert.match(main, /\{ id: "paper", label: "Paper"/);
  assert.match(main, /\{ id: "contrast", label: "Contrast"/);
  assert.match(main, /function normalizeSsEditorTheme\(value\)/);
  assert.match(main, /prefs\.ssEditorTheme = normalizeSsEditorTheme\(prefs\.ssEditorTheme\)/);
  assert.match(main, /data-action="toggleSsEditorThemeMenu"/);
  assert.match(main, /data-ss-editor-theme-preview/);
  assert.match(main, /function applySsEditorThemePreview\(value\)/);
  assert.match(main, /const preview = event => \{[\s\S]*applySsEditorThemePreview\(event\.currentTarget\.dataset\.ssEditorThemePreview\);/);
  assert.match(main, /button\.addEventListener\("pointerenter", preview\);/);
  assert.match(main, /data-ss-editor-theme-preview[\s\S]*syncFromCodeMirror\(\);[\s\S]*savePrefs\(\);[\s\S]*renderKeepingWorkspacePosition\(\);/);
  assert.doesNotMatch(main, /<select id="ssEditorThemeSelect"/);
  assert.match(main, /class="panel ingest-source-panel ss-editor-theme-\$\{escapeHtml\(editorTheme\)\}"/);
  assert.match(css, /\.ingest-source-panel\s*\{[^}]*--ss-editor-keyword:\s*#a7c7b5;[^}]*--ss-editor-string:\s*#c8b28a;/s);
  assert.match(css, /\.ingest-source-panel\.ss-editor-theme-ocean\s*\{/);
  assert.match(css, /\.ingest-source-panel\.ss-editor-theme-mono\s*\{/);
  assert.match(css, /\.ingest-source-panel\.ss-editor-theme-graphite\s*\{/);
  assert.match(css, /\.ingest-source-panel\.ss-editor-theme-slate\s*\{/);
  assert.match(css, /\.ingest-source-panel\.ss-editor-theme-sand\s*\{/);
  assert.match(css, /\.ingest-source-panel\.ss-editor-theme-paper\s*\{/);
  assert.match(css, /\.ingest-source-panel\.ss-editor-theme-contrast\s*\{/);
  assert.match(css, /\.ss-theme-picker\s*\{[^}]*max-width:\s*min\(190px,\s*100%\);/s);
  assert.match(css, /\.ss-theme-picker\s*\{[^}]*overflow:\s*visible;/s);
  assert.match(css, /\.ss-theme-toggle\s*\{/);
  assert.match(css, /\.ss-theme-menu\s*\{[^}]*background:\s*#151923;/s);
  assert.match(css, /\.ss-theme-picker\.open \.ss-theme-menu\s*\{[^}]*display:\s*grid;/s);
  assert.match(css, /\.ss-theme-menu button:hover,\s*\.ss-theme-menu button:focus\s*\{[^}]*background:\s*#223044;[^}]*color:\s*#ffffff;/s);
  assert.match(css, /\.ss-theme-menu button\.active\s*\{[^}]*background:\s*#28384d;[^}]*color:\s*#ffffff;/s);
  assert.match(css, /\.cm-container \.cm-keyword\s*\{[^}]*color:\s*var\(--ss-editor-keyword\);/s);
  assert.match(css, /\.cm-container \.cm-string\s*\{[^}]*color:\s*var\(--ss-editor-string\);/s);
  assert.doesNotMatch(css, /\.cm-container \.cm-keyword\s*\{[^}]*#4cde8a/s);
  assert.doesNotMatch(css, /\.cm-container \.cm-string\s*\{[^}]*#e06cff/s);
});

test("diagnostic cards expose optional deep explanations", () => {
  assert.match(main, /item\.learnMore\?\.length/);
  assert.match(main, /class="diagnosis-learn-more"/);
  assert.match(main, /En savoir plus/);
  assert.match(main, /ri-book-open-line/);
  assert.match(main, /item\.learnMore\.map\(entry => `<li>\$\{escapeHtml\(entry\)\}<\/li>`\)\.join\(""\)/);
  assert.match(css, /\.diagnosis-learn-more\s*\{/);
  assert.match(css, /\.diagnosis-learn-more ul\s*\{[^}]*line-height:\s*1\.5;/s);
  assert.match(css, /\.diagnosis-learn-more li\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
});

test("deep analysis control is rendered as an explicit on off switch", () => {
  assert.match(main, /const deepAnalysisOn = Boolean\(state\.prefs\.deepAnalysis\);/);
  assert.match(main, /data-action="toggleDeepAnalysis"[\s\S]*class="deep-analysis-toggle \$\{deepAnalysisOn \? "is-on" : "is-off"\}"/);
  assert.match(main, /role="switch"/);
  assert.match(main, /aria-checked="\$\{deepAnalysisOn \? "true" : "false"\}"/);
  assert.match(main, /<span class="deep-analysis-label"><strong>Deep analysis<\/strong><small>\$\{deepAnalysisOn \? "On" : "Paused"\}<\/small><\/span>/);
  assert.match(main, /<span class="deep-analysis-switch" aria-hidden="true"><span><\/span><\/span>/);
  assert.doesNotMatch(main, /data-action="toggleDeepAnalysis" class="\$\{state\.prefs\.deepAnalysis \? "primary" : ""\}"/);
  assert.match(css, /\.deep-analysis-toggle\s*\{[^}]*max-width:\s*196px;/s);
  assert.match(css, /\.deep-analysis-label strong,\s*\.deep-analysis-label small\s*\{[^}]*text-overflow:\s*ellipsis;/s);
  assert.match(css, /\.deep-analysis-toggle\.is-on \.deep-analysis-switch span\s*\{[^}]*transform:\s*translateX\(16px\);/s);
  assert.match(css, /@media \(max-width:\s*1180px\)[\s\S]*\.analysis-layout \.toolbar\s*\{[^}]*flex-wrap:\s*wrap;/s);
});

test("modal headers stay visible while long preference dialogs scroll", () => {
  assert.match(css, /\.modal header\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;[^}]*z-index:\s*12;/s);
  assert.match(css, /\.modal header\s*\{[^}]*background:\s*#141118;[^}]*box-shadow:\s*0 1px 0 #3b3842/s);
  assert.match(css, /\.modal header \.icon\s*\{[^}]*flex:\s*0 0 auto;/s);
});

test("analysis conversation stack keeps vertical gaps compact", () => {
  assert.match(css, /\.analysis-layout \.panel-body\s*\{[^}]*padding-block:\s*10px;/s);
  assert.match(css, /\.analysis-layout \.grid-controls-shell\s*\{[^}]*padding-bottom:\s*8px;/s);
  assert.match(css, /\.analysis-layout \.grid-controls\s*\{[^}]*row-gap:\s*8px;/s);
  assert.match(css, /\.grid-controls input,\s*\.grid-controls select\s*\{[^}]*min-height:\s*34px;[^}]*padding:\s*7px 9px;/s);
  assert.match(css, /\.filter-cluster\s*\{[^}]*gap:\s*8px;[^}]*padding:\s*6px 8px;/s);
  assert.match(css, /\.filter-side-actions\s*\{[^}]*align-items:\s*center;[^}]*padding:\s*6px 0;/s);
  assert.match(css, /\.filter-cluster-grid\s*\{[^}]*gap:\s*6px;/s);
  assert.match(css, /\.expert-strip\s*\{[^}]*column-gap:\s*8px;[^}]*row-gap:\s*6px;[^}]*margin-bottom:\s*8px;/s);
  assert.match(css, /\.conversation-workbench,\s*\.expert-workbench,\s*\.timeline-workbench\s*\{[^}]*gap:\s*8px;/s);
});

test("filtered row count is pagination context only", () => {
  assert.match(main, /function hasActiveTableFilters\(filters = state\?\.table\?\.filters\)/);
  assert.match(main, /const filteredCount = hasActiveTableFilters\(\) \? `<span class="pager-filter-count">\$\{formatNumber\(total\)\} filtered row\(s\)<\/span>` : "";/);
  assert.match(main, /<div class="pager">\s*\$\{filteredCount\}/);
  assert.doesNotMatch(main, /class="grid-controls-count"/);
  assert.doesNotMatch(css, /\.grid-controls-count/);
  assert.match(css, /\.pager-filter-count\s*\{[^}]*margin-right:\s*auto;/s);
});

test("chart-only toolbar is hidden from the charts advisor tab", () => {
  assert.match(main, /state\.chartsTab === "charts" \? renderDashboardStudioInline\(\) : ""/);
  assert.match(main, /state\.chartsTab === "charts" \? renderChartsGlobalToolbar\(\) : ""/);
  assert.match(main, /function renderChartsGlobalToolbar\(\)[\s\S]*data-action="thresholds"[\s\S]*id="chartTimeZoneSelect"[\s\S]*data-action="layoutPrefs"/);
  assert.match(main, /state\.chartsTab === "advisor" \? `\$\{renderInvestigationContext\(\)/);
  assert.match(main, /renderTailLatencyLensPanel\(\)/);
  assert.doesNotMatch(main, /\$\{renderChartsGlobalToolbar\(\)\}\s*\n\s*\$\{renderChartsPage\(\)\}/);
});

test("topology action uses a dedicated modal opener", () => {
  assert.match(main, /import \{ applyContextAction, openTopologyModal, setActiveInvestigation \} from "\.\/navigation\.js";/);
  assert.match(main, /normalizeTopologyProfile,/);
  assert.match(main, /data-topology-open aria-haspopup="dialog"/);
  assert.match(main, /document\.querySelectorAll\("\[data-topology-open\]"\)\.forEach/);
  assert.match(main, /openTopologyModal\(state\);[\s\S]*renderKeepingWorkspacePosition\(\);/);
  assert.match(main, /openTopologyModal\(state, \{ editId: event\.currentTarget\.dataset\.topologyEdit, draftMatch: "" \}\);/);
  assert.match(main, /openTopologyModal\(state, \{ editId: "", draftMatch: event\.currentTarget\.dataset\.topologySuggest \}\);/);
  assert.doesNotMatch(main, /class="service-labels-button topology" data-action="topology"/);
});

test("BDP window module exposes cautious controls and bounded charts", () => {
  assert.match(main, /import \{ analyzeBdpWindowLimit \} from "\.\/bdp-window-analysis\.js";/);
  assert.match(main, /function renderBdpWindowPanel\(\)/);
  assert.match(main, /BDP & Window-Limited Throughput/);
  assert.match(main, /id="bdpDirectionSelect"/);
  assert.match(main, /id="bdpCapacityInput"/);
  assert.match(main, /data-bdp-chart="throughput"/);
  assert.match(main, /data-bdp-chart="bdp"/);
  assert.match(main, /drawBdpWindowCharts\(\);/);
  assert.match(main, /capacity unknown; analysis based on observed throughput and TCP window/i);
  assert.match(main, /configuredLinkCapacityMbps/);
  assert.match(data, /bdpDirection:\s*"inbound"/);
  assert.match(profiles, /bdp:\s*\{[\s\S]*BDP \/ TCP window/);
  assert.match(css, /\.bdp-window-panel\s*\{/);
  assert.match(css, /\.bdp-summary-grid\s*\{[^}]*grid-template-columns:\s*repeat\(6,\s*minmax\(150px,\s*1fr\)\);/s);
  assert.match(css, /\.bdp-chart-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(300px,\s*1fr\)\);/s);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*\.bdp-context-line\s*\{[^}]*grid-template-columns:\s*1fr;/s);
});

test("metric charts expose BDP-like interactive legends and detailed crosshair", () => {
  assert.match(main, /hiddenChartSeries:\s*new Set\(\)/);
  assert.match(main, /function chartSeriesKey\(metric, key\)/);
  assert.match(main, /function metricChartSeries\(metric, showThreshold = true\)/);
  assert.match(main, /function renderMetricChartLegend\(metric\)/);
  assert.match(main, /data-chart-series-toggle="\$\{escapeHtml\(metric\)\}"/);
  assert.match(main, /data-chart-series-key="\$\{escapeHtml\(item\.key\)\}"/);
  assert.match(main, /chartSeriesHidden\(metric,\s*"value"\)/);
  assert.match(main, /chartSeriesHidden\(metric,\s*"warn"\)/);
  assert.match(main, /chartSeriesHidden\(metric,\s*"danger"\)/);
  assert.match(main, /document\.querySelectorAll\("\[data-chart-series-toggle\]"\)\.forEach\(button => button\.addEventListener\("click"/);
  assert.match(main, /state\.hiddenChartSeries\.has\(fullKey\) \? state\.hiddenChartSeries\.delete\(fullKey\) : state\.hiddenChartSeries\.add\(fullKey\)/);
  assert.match(main, /redrawChartCardMetric\(metric, `series:\$\{key\}`\)/);
  assert.match(main, /function nearestChartRowIndex\(rows, pct\)/);
  assert.match(main, /const tooltipMarkup = \(metric, rows, pct, x, b, subtle = false\) =>/);
  assert.match(main, /Delta/);
  assert.match(css, /\.chart-card-body\s*\{[^}]*flex-direction:\s*column;/s);
  assert.match(css, /\.metric-chart-legend\s*\{[^}]*flex-wrap:\s*wrap;/s);
  assert.match(css, /\.chart-legend-item\s*\{[^}]*border-radius:\s*999px;/s);
  assert.match(css, /\.chart-legend-item\.is-muted\s*\{[^}]*text-decoration:\s*line-through;/s);
});

test("chart statistics modal keeps the percentile curve to the right of a compact table", () => {
  assert.match(modalView, /<article class="stats-table-card">[\s\S]*<strong>Percentile table<\/strong>[\s\S]*<\/article>\s*<article class="stats-dist-card">/);
  assert.match(modalView, /<article class="stats-table-card">[\s\S]*<strong>Percentile table<\/strong>/);
  assert.match(css, /\.chart-stats-layout\s*\{[^}]*grid-template-columns:\s*minmax\(190px,\s*\.44fr\) minmax\(460px,\s*1\.56fr\);/s);
  assert.match(css, /\.stats-summary-card\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*display:\s*flex;/s);
  assert.match(css, /\.stats-window\s*\{[^}]*flex:\s*0 0 auto;[^}]*border:\s*1px solid rgba\(38,\s*50,\s*65,\s*\.9\);/s);
  assert.doesNotMatch(css, /\.stats-dist-card\s*\{[^}]*grid-column:\s*1 \/ -1;/s);
});

test("JVM stall charts are promoted above the table with metric-like controls", () => {
  assert.match(main, /hiddenJvmSeries:\s*new Set\(\)/);
  assert.match(main, /data-chart-zoom="zoomIn" data-jvm-zoom/);
  assert.match(main, /<div class="jvm-chart-section">[\s\S]*data-jvm-chart="recvq"[\s\S]*renderJvmLegend\("timeline"\)[\s\S]*data-jvm-chart="scatter"[\s\S]*renderJvmLegend\("scatter"\)[\s\S]*<div class="jvm-gc-results">/);
  assert.match(main, /function jvmLegendSeries\(kind\)/);
  assert.match(main, /function renderJvmLegend\(kind\)/);
  assert.match(main, /data-jvm-series-key="\$\{escapeHtml\(item\.key\)\}"/);
  assert.match(main, /function drawJvmTimelineChartInteractive\(svg, results, history\)/);
  assert.match(main, /function drawJvmScatterChartInteractive\(svg, results\)/);
  assert.match(main, /function attachJvmTimelineInteractions\(svg, results, history/);
  assert.match(main, /function attachJvmScatterInteractions\(svg, points/);
  assert.match(main, /event\.currentTarget\.hasAttribute\("data-jvm-zoom"\)[\s\S]*state\.jvmGc\.selectedEpoch = null;[\s\S]*drawJvmCharts\(\);/);
  assert.match(main, /document\.querySelectorAll\("\[data-jvm-series-key\]"\)\.forEach/);
  assert.match(css, /\.jvm-chart-section\s*\{[^}]*margin:\s*10px 0 12px;/s);
  assert.match(css, /\.jvm-chart-toolbar\s*\{[^}]*display:\s*flex;/s);
  assert.match(css, /\.jvm-legend\s*\{[^}]*padding:\s*0 12px 10px;/s);
  assert.match(css, /\.jvm-hover-zone\s*\{[^}]*cursor:\s*crosshair;/s);
});

test("JVM stall table has precise timestamps nature sorting severity and pagination", () => {
  assert.match(main, /jvmTable:\s*\{ page:\s*1,\s*pageSize:\s*20,\s*sortKey:\s*"time",\s*sortDir:\s*"desc" \}/);
  assert.match(main, /function jvmStallNature\(row\)/);
  assert.match(main, /if \(row\.kind === "safepoint"\) return "Safepoint";/);
  assert.match(main, /function preciseDateTimeLabel\(epochMs\)/);
  assert.match(main, /fractionalSecondDigits:\s*3/);
  assert.match(main, /function renderJvmSortHeader\(key, label\)/);
  assert.match(main, /data-jvm-sort="\$\{escapeHtml\(key\)\}"/);
  assert.match(main, /function renderJvmPagination\(total, totalPages, start\)/);
  assert.match(main, /data-jvm-page-size/);
  assert.match(main, /data-jvm-page="first"/);
  assert.match(main, /data-jvm-page="last"/);
  assert.match(main, /Correlated JVM stall events/);
  assert.match(main, /renderJvmSortHeader\("time", "Timestamp"\)/);
  assert.match(main, /renderJvmSortHeader\("nature", "Stall nature"\)/);
  assert.match(main, /jvm-severity-pill/);
  assert.match(main, /event\.target\.closest\("\[data-jvm-sort\]"\)/);
  assert.match(main, /event\.target\.closest\("\[data-jvm-page\]"\)/);
  assert.match(main, /\[data-jvm-page-size\]/);
  assert.match(css, /\.jvm-table-head\s*\{[^}]*justify-content:\s*space-between;/s);
  assert.match(css, /\.jvm-gc-table th,\s*\.jvm-gc-table td\s*\{[^}]*white-space:\s*nowrap;/s);
  assert.match(css, /\.jvm-severity-pill\.warning-high\s*\{/);
  assert.match(css, /\.jvm-severity-pill\.warning\s*\{/);
  assert.match(css, /\.jvm-nature\s*\{[^}]*text-overflow:\s*ellipsis;/s);
  assert.match(css, /\.risk\.warning_high\s*\{[^}]*color:\s*var\(--orange\);/s);
});

test("dashboard preset selection keeps the picker responsive", () => {
  assert.match(main, /let chartPageDrawFrame = 0;/);
  assert.match(main, /let dashboardPresetRenderFrame = 0;/);
  assert.match(main, /function scheduleChartPageDraw\(\)/);
  assert.match(main, /if \(state\.view === "charts"\) \{\s*scheduleChartPageDraw\(\);\s*\}/);
  assert.match(main, /function updateDashboardPresetPickerChrome\(presetId\)/);
  assert.match(main, /function scheduleDashboardPresetRender\(\)/);
  assert.match(main, /requestAnimationFrame\(\(\) => \{\s*dashboardPresetRenderFrame = requestAnimationFrame\(\(\) => \{/s);
  assert.match(main, /function commitDashboardPresetChoice\(presetId\)/);
  assert.match(main, /updateDashboardPresetPickerChrome\(presetId\);[\s\S]*scheduleDashboardPresetRender\(\);/);
  assert.match(main, /data-dashboard-preset-choice[\s\S]*commitDashboardPresetChoice\(event\.currentTarget\.dataset\.dashboardPresetChoice\);/);
  assert.match(main, /data-dashboard-preset-choice="\$\{escapeHtml\(id\)\}"[^>]*aria-label="\$\{escapeHtml\(`\$\{preset\.name\}: \$\{preset\.description\}`\)\}"/);
  assert.doesNotMatch(main, /data-dashboard-preset-choice="\$\{escapeHtml\(id\)\}"[^>]*title=/);
  assert.match(css, /Dashboard preset picker performance refinement/);
  assert.match(css, /\.dashboard-preset-menu,\s*\.dashboard-preset-menu\.open\s*\{[^}]*backdrop-filter:\s*none;[^}]*contain:\s*paint;/s);
  assert.match(css, /\.dashboard-preset-option:hover:not\(\.selected\),\s*\.dashboard-preset-option:focus-visible:not\(\.selected\)/);
  assert.match(css, /\.dashboard-preset-option\.selected::after\s*\{/);
});
