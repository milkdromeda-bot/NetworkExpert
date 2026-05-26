import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const stylesCss = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
const importPageCss = readFileSync(new URL("../../src/import-page.css", import.meta.url), "utf8");
const captureQualityCss = readFileSync(new URL("../../src/capture-quality.css", import.meta.url), "utf8");
const analysisGuideCss = readFileSync(new URL("../../src/analysis-guide.css", import.meta.url), "utf8");
const analysisWorkbenchCss = readFileSync(new URL("../../src/analysis-workbench.css", import.meta.url), "utf8");
const analysisTableCss = readFileSync(new URL("../../src/analysis-table.css", import.meta.url), "utf8");
const metricIntelligenceCss = readFileSync(new URL("../../src/metric-intelligence.css", import.meta.url), "utf8");
const socketIndicatorsCss = readFileSync(new URL("../../src/socket-indicators.css", import.meta.url), "utf8");
const advisorDiagnosisCss = readFileSync(new URL("../../src/advisor-diagnosis.css", import.meta.url), "utf8");
const serviceMapCss = readFileSync(new URL("../../src/service-map.css", import.meta.url), "utf8");
const alertsTemplatesCompareCss = readFileSync(new URL("../../src/alerts-templates-compare.css", import.meta.url), "utf8");
const chartsCoreCss = readFileSync(new URL("../../src/charts-core.css", import.meta.url), "utf8");
const chartsAdvancedCss = readFileSync(new URL("../../src/charts-advanced.css", import.meta.url), "utf8");
const designSystemCss = readFileSync(new URL("../../src/design-system.css", import.meta.url), "utf8");
const guideCss = readFileSync(new URL("../../src/guide.css", import.meta.url), "utf8");
const lightModeCss = readFileSync(new URL("../../src/light-mode.css", import.meta.url), "utf8");
const uiEnhancementsCss = readFileSync(new URL("../../src/ui-enhancements.css", import.meta.url), "utf8");
const css = [stylesCss, importPageCss, captureQualityCss, analysisGuideCss, analysisWorkbenchCss, analysisTableCss, metricIntelligenceCss, socketIndicatorsCss, advisorDiagnosisCss, serviceMapCss, alertsTemplatesCompareCss, chartsCoreCss, chartsAdvancedCss, designSystemCss, guideCss, lightModeCss, uiEnhancementsCss].join("\n");
const indexHtml = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../../src/main.js", import.meta.url), "utf8");
const ingestView = readFileSync(new URL("../../src/ingest-view.js", import.meta.url), "utf8");
const ingestActions = readFileSync(new URL("../../src/ingest-actions.js", import.meta.url), "utf8");
const jvmGcView = readFileSync(new URL("../../src/jvm-gc-view.js", import.meta.url), "utf8");
const serviceMapView = readFileSync(new URL("../../src/service-map-view.js", import.meta.url), "utf8");
const modalView = readFileSync(new URL("../../src/modal-view.js", import.meta.url), "utf8");
const ssCommandView = readFileSync(new URL("../../src/ss-command-view.js", import.meta.url), "utf8");
const captureQualityView = readFileSync(new URL("../../src/capture-quality-view.js", import.meta.url), "utf8");
const chartsToolbarView = readFileSync(new URL("../../src/charts-toolbar-view.js", import.meta.url), "utf8");
const dashboardView = readFileSync(new URL("../../src/dashboard-view.js", import.meta.url), "utf8");
const preferencesView = readFileSync(new URL("../../src/preferences-view.js", import.meta.url), "utf8");
const analysisShellView = readFileSync(new URL("../../src/analysis-shell-view.js", import.meta.url), "utf8");
const metricIntelligence = readFileSync(new URL("../../src/metric-intelligence.js", import.meta.url), "utf8");
const constants = readFileSync(new URL("../../src/constants.js", import.meta.url), "utf8");
const data = readFileSync(new URL("../../src/data.js", import.meta.url), "utf8");
const profiles = readFileSync(new URL("../../src/profiles.js", import.meta.url), "utf8");
const tableColumns = readFileSync(new URL("../../src/table-columns.js", import.meta.url), "utf8");

test("import page and ss command builder styles are isolated from the global sheet", () => {
  assert.match(indexHtml, /href="\.\/src\/import-page\.css\?v=20260525-1"/);
  assert.doesNotMatch(stylesCss, /\.ss-command-warning\s*\{/);
  assert.doesNotMatch(stylesCss, /\.ingest-source-panel\.ss-editor-theme-ocean\s*\{/);
  assert.match(importPageCss, /\.ingest-hero\s*\{/);
  assert.match(importPageCss, /\.ss-command-builder\s*\{/);
  assert.match(importPageCss, /\.ss-option-detail-card\s*\{/);
});

test("capture quality report keeps its stylesheet out of the global sheet", () => {
  assert.match(indexHtml, /href="\.\/src\/capture-quality\.css\?v=20260525-1"/);
  assert.doesNotMatch(stylesCss, /\.capture-quality-shell\s*\{/);
  assert.match(captureQualityCss, /\.capture-quality-shell\s*\{/);
  assert.match(captureQualityCss, /Quality metrics Grafana-style colors/);
});

test("analysis guide keeps modal documentation styles out of the global sheet", () => {
  assert.match(indexHtml, /href="\.\/src\/analysis-guide\.css\?v=20260525-1"/);
  assert.doesNotMatch(stylesCss, /\.analysis-view-guide-modal\s*\{/);
  assert.match(analysisGuideCss, /\.analysis-view-guide-modal\s*\{/);
  assert.match(analysisGuideCss, /\.analysis-view-guide-button\s*\{/);
});

test("advanced chart styles are isolated from the global sheet", () => {
  assert.match(indexHtml, /href="\.\/src\/charts-advanced\.css\?v=20260525-1"/);
  assert.doesNotMatch(stylesCss, /\.bdp-window-panel\s*\{/);
  assert.match(chartsAdvancedCss, /\.bdp-window-panel\s*\{/);
  assert.match(chartsAdvancedCss, /\.jvm-chart-section\s*\{/);
});

test("guide view styles are isolated from the global sheet", () => {
  assert.match(indexHtml, /href="\.\/src\/guide\.css\?v=20260525-1"/);
  assert.doesNotMatch(stylesCss, /\.guide-v2\s*\{/);
  assert.match(guideCss, /\.guide-v2\s*\{/);
  assert.match(guideCss, /\.guide-monitoring-shell\s*\{/);
});

test("late UI enhancements keep their end-of-cascade stylesheet", () => {
  assert.match(indexHtml, /href="\.\/src\/ui-enhancements\.css\?v=20260525-1"/);
  assert.doesNotMatch(stylesCss, /Neon theme - fluorescent on dark/);
  assert.match(uiEnhancementsCss, /Late UI enhancements and interaction polish/);
  assert.match(uiEnhancementsCss, /Reduced motion/);
});

test("design system and light mode layers are explicit stylesheets", () => {
  assert.match(indexHtml, /href="\.\/src\/design-system\.css\?v=20260525-1"[\s\S]*href="\.\/src\/guide\.css\?v=20260525-1"[\s\S]*href="\.\/src\/light-mode\.css\?v=20260525-1"[\s\S]*href="\.\/src\/ui-enhancements\.css\?v=20260525-1"/);
  assert.doesNotMatch(stylesCss, /SmartTrade design-system inspired skin/);
  assert.doesNotMatch(stylesCss, /LIGHT MODE/);
  assert.match(designSystemCss, /SmartTrade design-system inspired skin/);
  assert.match(lightModeCss, /Force white text on active blue tabs/);
});

test("analysis workbench components are isolated from the global sheet", () => {
  assert.match(indexHtml, /href="\.\/src\/analysis-workbench\.css\?v=20260525-1"/);
  assert.doesNotMatch(stylesCss, /Root Cause Matrix/);
  assert.match(analysisWorkbenchCss, /Root Cause Matrix/);
  assert.match(analysisWorkbenchCss, /\.timeline-stories\s*\{/);
  assert.match(analysisWorkbenchCss, /\.rate-alert\s*\{/);
});

test("analysis table shell styles are isolated from the global sheet", () => {
  assert.match(indexHtml, /href="\.\/src\/analysis-table\.css\?v=20260525-1"/);
  assert.doesNotMatch(stylesCss, /\.table-settings-head\s*,/);
  assert.doesNotMatch(stylesCss, /\.column-tooltip\s*\{/);
  assert.match(analysisTableCss, /\.analysis-layout\s*\{/);
  assert.match(analysisTableCss, /\.table-settings-head\s*,/);
  assert.match(analysisTableCss, /\.column-tooltip\s*\{/);
});

test("metric intelligence styles are isolated from the global sheet", () => {
  assert.match(indexHtml, /href="\.\/src\/metric-intelligence\.css\?v=20260525-1"/);
  assert.doesNotMatch(stylesCss, /\.metric-help-detail\s*\{/);
  assert.match(metricIntelligenceCss, /\.metric-help-detail\s*\{/);
  assert.match(metricIntelligenceCss, /\.metric-help-thresholds\s*,/);
  assert.match(metricIntelligenceCss, /\.metric-help-checks \.metric-help-list\s*\{/);
});

test("socket indicators and anomaly list styles are isolated from the global sheet", () => {
  assert.match(indexHtml, /href="\.\/src\/socket-indicators\.css\?v=20260525-1"/);
  assert.doesNotMatch(stylesCss, /\.app-service-chip\s*\{/);
  assert.doesNotMatch(stylesCss, /\.anomaly-workbench\s*\{/);
  assert.match(socketIndicatorsCss, /\.risk\.critical\s*\{/);
  assert.match(socketIndicatorsCss, /\.app-service-tooltip\s*\{/);
  assert.match(socketIndicatorsCss, /\.metric-chip\s*\{/);
});

test("diagnosis advisor card styles are isolated from the global sheet", () => {
  assert.match(indexHtml, /href="\.\/src\/advisor-diagnosis\.css\?v=20260525-1"/);
  assert.doesNotMatch(stylesCss, /\.advisor-shell\s*\{/);
  assert.doesNotMatch(stylesCss, /\.diagnosis-learn-more\s*\{/);
  assert.match(advisorDiagnosisCss, /\.advisor-shell\s*\{/);
  assert.match(advisorDiagnosisCss, /\.diagnosis-grid\s*\{/);
  assert.match(advisorDiagnosisCss, /\.diagnosis-learn-more\s*\{/);
});

test("service map and related modals are isolated from the global sheet", () => {
  assert.match(indexHtml, /href="\.\/src\/service-map\.css\?v=20260525-1"/);
  assert.doesNotMatch(stylesCss, /\.service-map-workbench\s*\{/);
  assert.doesNotMatch(stylesCss, /\.topology-modal\s*\{/);
  assert.match(serviceMapCss, /\.service-map-workbench\s*\{/);
  assert.match(serviceMapCss, /\.service-alias-modal\s*\{/);
  assert.match(serviceMapCss, /\.topology-modal\s*\{/);
});

test("alerts templates and compare views are isolated from the global sheet", () => {
  assert.match(indexHtml, /href="\.\/src\/alerts-templates-compare\.css\?v=20260525-1"/);
  assert.doesNotMatch(stylesCss, /\.alert-workbench\s*\{/);
  assert.doesNotMatch(stylesCss, /\.compare-workbench\s*\{/);
  assert.match(alertsTemplatesCompareCss, /\.alert-workbench\s*\{/);
  assert.match(alertsTemplatesCompareCss, /\.template-workbench\s*\{/);
  assert.match(alertsTemplatesCompareCss, /\.baseline-narrative\s*\{/);
});

test("core chart shell styles are isolated from the global sheet", () => {
  assert.match(indexHtml, /href="\.\/src\/charts-core\.css\?v=20260525-1"/);
  assert.doesNotMatch(stylesCss, /\.metric-token\s*\{/);
  assert.doesNotMatch(stylesCss, /\.metric-picks\s*\{/);
  assert.match(chartsCoreCss, /\.chart-toolbar\s*\{/);
  assert.match(chartsCoreCss, /\.metric-token\s*\{/);
  assert.match(chartsCoreCss, /\.chart-stats-layout\s*\{/);
});

test("table settings header stays above nearby column hover tooltips", () => {
  assert.match(css, /th:not\(\.table-settings-head\):hover/);
  assert.match(css, /\.table-settings-head:hover,\s*\.table-settings-head:focus-within\s*\{[^}]*z-index:\s*40;/s);
  assert.match(css, /\.row-menu\.table-settings-menu\s*\{[^}]*z-index:\s*120;/s);
  assert.match(css, /\.row-menu\.table-settings-menu\.open\s*\{[^}]*grid-template-rows:\s*auto auto auto minmax\(0,\s*1fr\);/s);
  assert.match(css, /\.table-settings-column-list\s*\{[^}]*min-height:\s*0;/s);
  assert.match(css, /\.table-settings-search\s*\{/);
});

test("column help tooltip is layered above socket table rows", () => {
  assert.match(main, /function ensureFloatingColumnTooltip\(\)/);
  assert.match(main, /document\.body\.appendChild\(columnTooltipEl\)/);
  assert.match(main, /function bindColumnHelpTooltips\(\)/);
  assert.match(main, /bindColumnHelpTooltips\(\);/);
  assert.match(css, /\.column-tooltip-floating\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*99999;/s);
  assert.match(css, /\.column-tooltip-floating\.open\s*\{[^}]*display:\s*grid;/s);
  assert.doesNotMatch(css, /th:hover \.column-tooltip,\s*th:focus-within \.column-tooltip,\s*\.column-tooltip:hover\s*\{/);
});

test("state column can show socket lifecycle transitions", () => {
  assert.match(tableColumns, /stateTransitions/);
  assert.match(tableColumns, /Observed state transition:/);
  assert.match(tableColumns, /class="state-transition-chip"/);
  assert.match(css, /\.state-transition-chip\s*\{[^}]*text-overflow:\s*ellipsis;/s);
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
  assert.match(ingestView, /function renderImportStatus\(/);
  assert.match(ingestView, /<div class="panel-head[^"]*">[\s\S]*?<div class="panel-title">ss stats to parse<\/div>[\s\S]*?\$\{renderImportStatus\(deps\)\}/);
  assert.match(css, /\.import-status\s*\{[^}]*grid-template-columns:\s*max-content minmax\(0,\s*1fr\);/s);
  assert.match(css, /\.import-status span\s*\{[^}]*text-overflow:\s*ellipsis;/s);
});

test("file import flow has one clear filter entry point", () => {
  assert.match(ingestView, /<button data-action="pickFile" class="primary"><i class="ri-folder-open-line"><\/i> Open ss file<\/button>/);
  assert.match(ingestView, /<button data-action="pickFile" class="primary">[\s\S]*Open ss file<\/button>[\s\S]*<button data-action="pickAutoDir"[\s\S]*Auto-detect dir<\/button>[\s\S]*<button data-action="showEditor"[\s\S]*Editor<\/button>[\s\S]*<button data-action="toggleSsOptions"[\s\S]*ss command<\/button>[\s\S]*data-action="sampleIncidentDemo"[\s\S]*See it in action/);
  assert.doesNotMatch(ingestView, /<button data-action="toggleSsOptions"[^>]*>[\s\S]*Capture<\/button>/);
  assert.match(ingestView, /data-action="copySsCommand"[\s\S]*Copy<\/button>/);
  assert.match(ingestActions, /toast\("ss command copied", "Paste it on the target server to collect the ss evidence\."\);/);
  assert.doesNotMatch(main, /data-action="applyCommand"/);
  assert.doesNotMatch(main, /ss command updated/);
  assert.doesNotMatch(main, /Capture command updated/);
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
  assert.match(ingestView, /<div class="capture-flow-card">\s*<i class="ri-route-line" aria-hidden="true"><\/i>\s*<div class="capture-flow-copy">/s);
  assert.match(css, /\.capture-flow-card\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;/s);
  assert.match(css, /\.capture-flow-copy\s*\{[^}]*display:\s*grid;[^}]*gap:\s*3px;[^}]*min-width:\s*0;/s);
  assert.match(css, /\.capture-flow-card strong\s*\{[^}]*display:\s*block;[^}]*line-height:\s*1\.25;/s);
});

test("ss command panel exposes aligned collection parameters", () => {
  assert.match(main, /import \{ buildSsCollectionCommand, commandCoverage, toggleCommandOption \} from "\.\/ss-command\.js";/);
  assert.match(main, /import \{ validateSsCommandConfig \} from "\.\/ss-command-validation\.js";/);
  assert.match(main, /ssCommandConfig:\s*defaultSsCommandConfig\(\)/);
  assert.match(main, /function defaultSsLogPath\(date = new Date\(\)\)[\s\S]*\/tmp\/networkexpert_ss_\$\{ssCommandTimestamp\(date\)\}\.log/);
  assert.match(main, /function renderSsCommandBuilder\(\)/);
  assert.match(ssCommandView, /id="ssCmdTimestamp"[\s\S]*Timestamp each run/);
  assert.match(ssCommandView, /id="ssCmdLoop"[\s\S]*Repeat command/);
  assert.match(ssCommandView, /Interval \(s\)<\/span><input id="ssCmdInterval" type="text" inputmode="decimal"/);
  assert.match(ssCommandView, /id="ssCmdSrcIp"[\s\S]*id="ssCmdSrcPort"[\s\S]*id="ssCmdDstIp"[\s\S]*id="ssCmdDstPort"/);
  assert.match(ssCommandView, /placeholder="source address"/);
  assert.match(ssCommandView, /data-ss-field-msg="srcIp"/);
  assert.match(main, /function updateSsCommandValidation\(validation\)/);
  assert.match(main, /input\?\.setCustomValidity\(result\.valid === false \? result\.message : ""\);/);
  assert.doesNotMatch(main, /placeholder="192\.168\.145\.205"/);
  assert.match(ingestView, /data-action="loadSsCommandEndpointExample"/);
  assert.doesNotMatch(`${main}\n${ingestActions}`, /market-data example/);
  assert.doesNotMatch(`${main}\n${ingestActions}`, /lfxbench_tcp-laloRcvMarketSimu/);
  assert.match(ingestActions, /state\.ssCommandConfig = \{[\s\S]*intervalSeconds:\s*"1"[\s\S]*srcIp:\s*"10\.0\.0\.10"[\s\S]*outputPath:\s*defaultSsLogPath\(\)/);
  assert.match(ssCommandView, /const teeRisk = Boolean\(c\.outputPath && c\.appendOutput !== false && c\.loop && interval <= 0\.05\);/);
  assert.match(ssCommandView, /terminal output plus <code>tee<\/code> can become the bottleneck/);
  assert.match(ssCommandView, /id="ssCmdOutputPath"[\s\S]*id="ssCmdAppend"/);
  assert.match(main, /function syncSsCommandFromBuilder\(\{ updateWarning = true \} = \{\}\)/);
  assert.match(main, /if \(validation\.valid\) \{[\s\S]*state\.command = buildSsCollectionCommand\(commandInput \? commandInput\.value : state\.command, state\.ssCommandConfig\);/);
  assert.match(ingestActions, /toast\("Invalid ss command fields", first\?\.message \|\| "Fix the highlighted fields before copying\.", "danger"\);/);
  assert.match(main, /document\.querySelectorAll\("\[id\^='ssCmd'\]"\)\.forEach\(input => \{/);
  assert.match(main, /input\.addEventListener\(eventName, \(\) => syncSsCommandFromBuilder\(\)\);/);
  assert.match(main, /document\.querySelector\("#commandInput"\)\?\.addEventListener\("input"/);
  assert.match(css, /\.ss-command-builder\s*\{[^}]*grid-template-columns:\s*minmax\(220px,\s*\.75fr\) minmax\(360px,\s*1\.35fr\) minmax\(240px,\s*\.9fr\);/s);
  assert.match(css, /\.ss-command-group--filter\s*\{[^}]*grid-template-columns:\s*minmax\(160px,\s*1fr\) 110px minmax\(160px,\s*1fr\) 110px;/s);
  assert.match(css, /\.ss-command-group \.ss-interval-field\s*\{[^}]*grid-template-columns:\s*max-content minmax\(82px,\s*110px\) minmax\(0,\s*1fr\);/s);
  assert.match(css, /\.ss-command-group label\.ss-field\.invalid input\s*\{[^}]*border-color:\s*rgba\(255,\s*107,\s*130,\s*\.88\);/s);
  assert.match(css, /\.ingest-card-layout \.ss-command-group--filter\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) 110px;/s);
  assert.match(css, /\.ss-command-example\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*justify-self:\s*start;/s);
  assert.match(css, /\.ss-command-warning\s*\{[^}]*grid-template-columns:\s*18px minmax\(0,\s*1fr\);[^}]*border:\s*1px solid rgba\(246,\s*160,\s*79,\s*\.42\);/s);
  assert.match(css, /\.ss-command-warning\.hidden\s*\{[^}]*display:\s*none;/s);
});

test("ss command panel is isolated from the raw editor view", () => {
  assert.match(ingestView, /<div class="ingest-ss-command-panel">[\s\S]*\$\{renderSsCommandBuilder\(\)\}[\s\S]*data-action="copySsCommand"/);
  assert.match(ingestView, /data-action="showEditor"[\s\S]*Editor/);
  assert.match(ingestView, /function renderIngestEditor\(/);
  assert.match(ingestView, /activePanel === "capture" \? `<div class="ingest-ss-command-panel">[\s\S]*` : renderIngestEditor\(deps\)/);
});

test("topbar anomaly pill uses a compact warning icon", () => {
  assert.match(main, /incidentWarning/);
  assert.doesNotMatch(main, /incidentCloud/);
  assert.doesNotMatch(css, /incident-cloud-icon/);
  assert.match(css, /\.incident-warning-icon\s*\{[^}]*width:\s*15px;[^}]*height:\s*15px;/s);
  assert.match(css, /\.incident-warning-icon i\s*\{[^}]*font-size:\s*15px;/s);
});

test("clear input and reset workspace actions are visually distinct", () => {
  assert.match(ingestView, /data-action="clear" class="clear-input-button"[^>]*>[\s\S]*Clear/);
  assert.match(main, /data-action="requestResetWorkspace"[^>]*aria-label="Reset workspace"/);
  assert.match(main, /action === "requestResetWorkspace"[\s\S]*state\.modal = "resetWorkspace"/);
  assert.match(main, /action === "confirmResetWorkspace"[\s\S]*resetAllState\(\)/);
  assert.doesNotMatch(main, /data-action="resetAll"/);
  assert.match(css, /\.clear-input-button\s*\{[^}]*background:/s);
  assert.match(css, /\.reset-workspace-btn\s*\{/s);
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
  assert.match(constants, /export const SS_EDITOR_THEMES = \[/);
  assert.match(constants, /\{ id: "pastel", label: "Pastel"/);
  assert.match(constants, /\{ id: "ocean", label: "Ocean"/);
  assert.match(constants, /\{ id: "mono", label: "Mono"/);
  assert.match(constants, /\{ id: "graphite", label: "Graphite"/);
  assert.match(constants, /\{ id: "slate", label: "Slate"/);
  assert.match(constants, /\{ id: "sand", label: "Sand"/);
  assert.match(constants, /\{ id: "paper", label: "Paper"/);
  assert.match(constants, /\{ id: "contrast", label: "Contrast"/);
  assert.match(main, /function normalizeSsEditorTheme\(value\)/);
  assert.match(main, /prefs\.ssEditorTheme = normalizeSsEditorTheme\(prefs\.ssEditorTheme\)/);
  assert.match(ingestView, /data-action="toggleSsEditorThemeMenu"/);
  assert.match(ingestView, /data-ss-editor-theme-preview/);
  assert.match(main, /function applySsEditorThemePreview\(value\)/);
  assert.match(main, /const preview = event => \{[\s\S]*applySsEditorThemePreview\(event\.currentTarget\.dataset\.ssEditorThemePreview\);/);
  assert.match(main, /button\.addEventListener\("pointerenter", preview\);/);
  assert.match(main, /data-ss-editor-theme-preview[\s\S]*syncFromCodeMirror\(\);[\s\S]*savePrefs\(\);[\s\S]*renderKeepingWorkspacePosition\(\);/);
  assert.doesNotMatch(main, /<select id="ssEditorThemeSelect"/);
  assert.match(ingestView, /class="panel ingest-source-panel ss-editor-theme-\$\{escapeHtml\(editorTheme\)\}"/);
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
  assert.match(main, /Learn more/);
  assert.doesNotMatch(main, /En savoir plus/);
  assert.match(main, /ri-book-open-line/);
  assert.match(main, /item\.learnMore\.map\(entry => `<li>\$\{escapeHtml\(entry\)\}<\/li>`\)\.join\(""\)/);
  assert.match(css, /\.diagnosis-learn-more\s*\{/);
  assert.match(css, /\.advisor-card\s*\{[^}]*border-left:\s*2px solid rgba\(255,\s*209,\s*102,\s*\.75\);/s);
  assert.match(css, /\.evidence-row span\s*\{[^}]*border:\s*1px solid rgba\(94,\s*104,\s*121,\s*\.42\);/s);
  assert.match(css, /\.advisor-card details\s*\{[^}]*border:\s*1px solid rgba\(94,\s*104,\s*121,\s*\.38\);/s);
  assert.match(css, /\.diagnosis-learn-more ul\s*\{[^}]*line-height:\s*1\.5;/s);
  assert.match(css, /\.diagnosis-learn-more li\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
});

test("deep analysis toggle is removed (analysis always runs)", () => {
  assert.doesNotMatch(analysisShellView, /toggleDeepAnalysis/);
  assert.doesNotMatch(analysisShellView, /deep-analysis-toggle/);
  assert.doesNotMatch(css, /\.deep-analysis-toggle\s*\{/);
});

test("modal headers stay visible while long preference dialogs scroll", () => {
  assert.match(css, /\.modal header\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;[^}]*z-index:\s*12;/s);
  assert.match(css, /\.modal header\s*\{[^}]*background:\s*#141118;[^}]*box-shadow:\s*0 1px 0 #3b3842/s);
  assert.match(css, /\.modal header \.icon\s*\{[^}]*flex:\s*0 0 auto;/s);
});

test("preferences active tab matches the primary blue selected state", () => {
  assert.match(main, /function renderPrefs\(\)[\s\S]*renderPrefsView/);
  assert.match(preferencesView, /<div class="app-tabs" style="margin-bottom:12px">/);
  assert.match(preferencesView, /<button class="app-tab \$\{tab === key \? "active" : ""\}" data-pref-tab="\$\{key\}">/);
  assert.match(css, /\.app-tabs\s*\{[^}]*display:\s*inline-flex;[^}]*padding:\s*3px;[^}]*border:\s*1px solid rgba\(255,255,255,\.08\);/s);
  assert.match(css, /\.app-tab\s*\{[^}]*min-height:\s*36px;[^}]*border-radius:\s*9px;/s);
  assert.match(css, /\.app-tab\.active\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*#0f3a5c,\s*#0d5f8a\) !important;[^}]*color:\s*#fff !important;/s);
  assert.match(css, /button\.primary,\s*button\.mega\.primary,\s*\.app-tab\.active\s*\{[^}]*border-color:\s*#2f6f9f;[^}]*background:\s*#1476bd;/s);
  assert.match(css, /button\.primary:hover,\s*button\.mega\.primary:hover,\s*\.app-tab\.active:hover\s*\{[^}]*background:\s*#176fae;/s);
});

test("analysis conversation stack keeps vertical gaps compact", () => {
  assert.match(css, /\.analysis-layout \.panel-body\s*\{[^}]*padding-block:\s*10px;/s);
  assert.match(css, /\.analysis-layout \.grid-controls-shell\s*\{[^}]*padding-bottom:\s*8px;/s);
  assert.match(css, /\.analysis-layout \.grid-controls\s*\{[^}]*row-gap:\s*var\(--space-2\);/s);
  assert.match(css, /\.grid-controls input,\s*\.grid-controls select\s*\{[^}]*min-height:\s*34px;[^}]*padding:\s*7px 9px;/s);
  assert.match(css, /\.filter-cluster\s*\{[^}]*gap:\s*var\(--space-2\);[^}]*padding:\s*6px 8px;/s);
  assert.match(css, /\.filter-side-actions\s*\{[^}]*align-items:\s*center;[^}]*padding:\s*6px 0;/s);
  assert.match(css, /\.filter-cluster-grid\s*\{[^}]*gap:\s*6px;/s);
  assert.match(css, /\.expert-strip\s*\{[^}]*column-gap:\s*var\(--space-2\);[^}]*row-gap:\s*6px;[^}]*margin-bottom:\s*8px;/s);
  assert.match(css, /\.conversation-workbench,\s*\.expert-workbench,\s*\.timeline-workbench\s*\{[^}]*gap:\s*var\(--space-2\);/s);
});

test("timeline shows millisecond precision when timestamp data contains it", () => {
  assert.match(main, /function formatTimelineTime\(event\)/);
  assert.match(main, /const hasMilliseconds = Number\.isFinite\(epochMs\) && Math\.abs\(Math\.round\(epochMs\)\) % 1000 !== 0;/);
  assert.match(main, /fractionalSecondDigits:\s*3/);
  assert.match(main, /hasMilliseconds \? "timeline-ms" : "timeline"/);
  assert.match(main, /function formatTimelineOffset\(seconds\)/);
  assert.match(main, /t\+\$\{formatTimelineOffset\(event\.t \|\| 0\)\}s/);
});

test("timeline raises explicit events when the TCP persist timer appears", () => {
  assert.match(main, /let previousTimerName = "";/);
  assert.match(main, /timerName === "persist" && previousTimerName !== "persist"/);
  assert.match(main, /title:\s*"TCP persist timer active"/);
  assert.match(main, /TCP is probing a constrained or closed receive window/);
  assert.match(main, /metric:\s*"timer"/);
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
  assert.match(main, /function renderChartsGlobalToolbar\(\) \{ return _renderChartsGlobalToolbar\(ctx\); \}/);
  assert.match(chartsToolbarView, /function renderChartsGlobalToolbar\(ctx\)[\s\S]*data-action="thresholds"[\s\S]*id="chartTimeZoneSelect"[\s\S]*data-action="layoutPrefs"/);
  assert.match(main, /state\.chartsTab === "advisor" \? `\$\{renderInvestigationContext\(\)/);
  assert.match(main, /renderTailLatencyLensPanel\(\)/);
  assert.doesNotMatch(main, /\$\{renderChartsGlobalToolbar\(\)\}\s*\n\s*\$\{renderChartsPage\(\)\}/);
});

test("analysis tabs expose short guidance and a single detailed view guide", () => {
  assert.match(constants, /export const ANALYSIS_TAB_GUIDE = \[/);
  assert.match(main, /function renderAnalysisTabs\(\)[\s\S]*renderAnalysisTabsView/);
  assert.match(analysisShellView, /aria-label="\$\{escapeHtml\(`\$\{tab\.label\}: \$\{tab\.short\}`\)\}"/);
  assert.match(analysisShellView, /title="\$\{escapeHtml\(tab\.short\)\}"/);
  assert.doesNotMatch(main, /class="analysis-tab-tooltip"/);
  assert.match(main, /analysisTabDocs:\s*ANALYSIS_TAB_GUIDE/);
  assert.match(modalView, /state\.modal === "analysisViewGuide" \? "Analysis view guide"/);
  assert.match(modalView, /function renderAnalysisViewGuideModal\(\)/);
  assert.match(modalView, /How to read Analysis/);
  assert.match(modalView, /Best next move/);
  assert.match(css, /\.analysis-tabs\s*\{[^}]*justify-content:\s*space-between;/s);
  assert.doesNotMatch(css, /\.analysis-tab-tooltip/);
  assert.match(css, /\.analysis-view-guide-button\s*\{[^}]*white-space:\s*nowrap;/s);
  assert.match(css, /\.analysis-view-guide-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(230px,\s*1fr\)\);/s);
  assert.match(css, /\.analysis-view-guide-card\s*\{[^}]*padding:\s*0 10px 10px;[^}]*overflow:\s*hidden;/s);
  assert.match(css, /\.analysis-view-guide-card header\s*\{[^}]*min-height:\s*46px;[^}]*max-height:\s*46px;[^}]*margin:\s*0 -10px 2px;[^}]*border-bottom:\s*1px solid rgba\(67,\s*78,\s*96,\s*\.72\);/s);
  assert.match(css, /\.analysis-view-guide-card header\s*\{[^}]*background:[^}]*linear-gradient\(90deg,\s*rgba\(93,\s*183,\s*255,\s*\.16\)/s);
  assert.match(css, /\.modal\.analysisViewGuide\s*\{[^}]*width:\s*min\(1180px,\s*calc\(100vw - 30px\)\);/s);
});

test("topology action uses a dedicated modal opener", () => {
  assert.match(main, /import \{ applyContextAction, openTopologyModal, setActiveInvestigation \} from "\.\/navigation\.js";/);
  assert.match(main, /normalizeTopologyProfile,/);
  assert.match(serviceMapView, /data-topology-open aria-haspopup="dialog"/);
  assert.match(main, /document\.querySelectorAll\("\[data-topology-open\]"\)\.forEach/);
  assert.match(main, /openTopologyModal\(state\);[\s\S]*renderKeepingWorkspacePosition\(\);/);
  assert.match(main, /openTopologyModal\(state, \{ editId: event\.currentTarget\.dataset\.topologyEdit, draftMatch: "" \}\);/);
  assert.match(main, /openTopologyModal\(state, \{ editId: "", draftMatch: event\.currentTarget\.dataset\.topologySuggest \}\);/);
  assert.doesNotMatch(serviceMapView, /class="service-labels-button topology" data-action="topology"/);
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
  assert.match(main, /function metricHelp\(metric\)/);
  assert.match(main, /import \{ metricCorrelations, metricDiagnosticGuidance, metricInterpretation, metricReliabilityProfile, metricSource \} from "\.\/metric-intelligence\.js";/);
  assert.match(metricIntelligence, /export function metricReliabilityProfile\(metric\)/);
  assert.match(metricIntelligence, /export function metricDiagnosticGuidance\(metric\)/);
  assert.match(main, /profile:\s*metricReliabilityProfile\(key\)/);
  assert.match(main, /guidance:\s*metricDiagnosticGuidance\(key\)/);
  assert.match(metricIntelligence, /Backoff is defensive waiting, not automatically a bad network/);
  assert.match(main, /data-metric-help="\$\{escapeHtml\(metric\)\}"/);
  assert.match(main, /state\.modal = "metricHelp"/);
  assert.match(main, /function ensureFloatingChartTooltip\(\)/);
  assert.match(main, /document\.body\.appendChild\(chartTooltipEl\)/);
  assert.match(main, /function showFloatingChartTooltip\(info\)/);
  assert.match(main, /hideFloatingChartTooltipSoon/);
  assert.match(modalView, /state\.modal === "metricHelp" \? "Metric intelligence"/);
  assert.match(modalView, /function renderMetricHelpDetail\(\)/);
  assert.match(modalView, /Evidence quality/);
  assert.match(modalView, /Diagnostic reading/);
  assert.match(modalView, /Next expert checks/);
  assert.match(modalView, /metric-help-thresholds/);
  assert.match(modalView, /metric-help-meta/);
  assert.match(modalView, /help\.profile\.confidence/);
  assert.match(modalView, /help\.guidance\.investigate/);
  assert.doesNotMatch(modalView, /Column guide/);
  assert.match(main, /data-chart-series-toggle="\$\{escapeHtml\(metric\)\}"/);
  assert.match(main, /data-chart-series-key="\$\{escapeHtml\(item\.key\)\}"/);
  assert.match(main, /chartSeriesHidden\(metric,\s*"value"\)/);
  assert.match(main, /chartSeriesHidden\(metric,\s*"warn"\)/);
  assert.match(main, /chartSeriesHidden\(metric,\s*"danger"\)/);
  assert.match(main, /function bindChartSeriesEvents\(deps = appEventDependencies\(\)\)/);
  assert.match(main, /root\.querySelectorAll\("\[data-chart-series-toggle\]"\)\.forEach\(button => button\.addEventListener\("click"/);
  assert.match(main, /appState\.hiddenChartSeries\.has\(fullKey\) \? appState\.hiddenChartSeries\.delete\(fullKey\) : appState\.hiddenChartSeries\.add\(fullKey\)/);
  assert.match(main, /redrawMetric\(metric, `series:\$\{key\}`, deps\)/);
  assert.match(main, /function nearestChartRowIndex\(rows, pct\)/);
  assert.match(main, /const tooltipMarkup = \(metric, rows, pct, x, b, subtle = false\) =>/);
  assert.match(main, /Delta/);
  assert.match(css, /\.chart-card-body\s*\{[^}]*flex-direction:\s*column;/s);
  assert.match(css, /\.metric-chart-legend\s*\{[^}]*flex-wrap:\s*wrap;/s);
  assert.match(css, /\.chart-legend-item\s*\{[^}]*border-radius:\s*999px;/s);
  assert.match(css, /\.chart-legend-item\.is-muted\s*\{[^}]*text-decoration:\s*line-through;/s);
  assert.match(css, /\.chart-tooltip button\s*\{[^}]*justify-self:\s*start;/s);
  assert.match(css, /\.chart-tooltip-floating\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*99999;/s);
  assert.match(css, /\.chart-tooltip-floating\.open\s*\{[^}]*display:\s*grid;/s);
  assert.doesNotMatch(css, /\.chart-info:hover \.chart-tooltip,\s*\.chart-info:focus \.chart-tooltip,\s*\.chart-tooltip:hover\s*\{/);
  assert.match(css, /\.metric-help-correlations\s*\{[^}]*grid-column:\s*1 \/ -1;/s);
  assert.match(css, /\.modal\.metricHelp\s*\{[^}]*width:\s*min\(1040px,\s*calc\(100vw - 30px\)\);/s);
  assert.match(css, /\.metric-help-detail\s*\{[^}]*align-items:\s*start;/s);
  assert.match(css, /\.metric-help-thresholds\s*\{[^}]*grid-template-columns:\s*auto minmax\(420px,\s*1fr\);/s);
  assert.match(css, /\.metric-help-notes\s*\{[^}]*grid-column:\s*1 \/ -1;/s);
  assert.match(css, /\.metric-help-note-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(190px,\s*1fr\)\);/s);
  assert.match(css, /\.metric-help-checks \.metric-help-list\s*\{[^}]*columns:\s*3;/s);
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
  assert.match(jvmGcView, /data-chart-zoom="zoomIn" data-jvm-zoom/);
  assert.match(jvmGcView, /<div class="jvm-chart-section">[\s\S]*data-jvm-chart="recvq"[\s\S]*renderJvmLegend\("timeline"\)[\s\S]*data-jvm-chart="scatter"[\s\S]*renderJvmLegend\("scatter"\)[\s\S]*<div class="jvm-gc-results">/);
  assert.match(main, /function jvmLegendSeries\(kind\)/);
  assert.match(main, /function renderJvmLegend\(kind\)/);
  assert.match(main, /data-jvm-series-key="\$\{escapeHtml\(item\.key\)\}"/);
  assert.match(main, /function drawJvmTimelineChartInteractive\(svg, results, history, deps = jvmDrawDependencies\(\)\)/);
  assert.match(main, /function drawJvmScatterChartInteractive\(svg, results, deps = jvmDrawDependencies\(\)\)/);
  assert.match(main, /function attachJvmTimelineInteractions\(svg, results, history[\s\S]*deps = jvmDrawDependencies\(\)\)/);
  assert.match(main, /function attachJvmScatterInteractions\(svg, points[\s\S]*deps = jvmDrawDependencies\(\)\)/);
  assert.match(main, /event\.currentTarget\.hasAttribute\("data-jvm-zoom"\)[\s\S]*appState\.jvmGc\.selectedEpoch = null;[\s\S]*drawJvm\(deps\);/);
  assert.match(main, /root\.querySelectorAll\("\[data-jvm-series-key\]"\)\.forEach/);
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
  assert.match(jvmGcView, /Correlated JVM stall events/);
  assert.match(jvmGcView, /renderJvmSortHeader\("time", "Timestamp"\)/);
  assert.match(jvmGcView, /renderJvmSortHeader\("nature", "Stall nature"\)/);
  assert.match(jvmGcView, /jvm-severity-pill/);
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
  assert.match(dashboardView, /data-dashboard-preset-choice="\$\{escapeHtml\(id\)\}"[^>]*aria-label="\$\{escapeHtml\(`\$\{preset\.name\}: \$\{preset\.description\}`\)\}"/);
  assert.doesNotMatch(dashboardView, /data-dashboard-preset-choice="\$\{escapeHtml\(id\)\}"[^>]*title=/);
  assert.match(css, /Dashboard preset picker performance refinement/);
  assert.match(css, /\.dashboard-preset-menu,\s*\.dashboard-preset-menu\.open\s*\{[^}]*backdrop-filter:\s*none;[^}]*contain:\s*paint;/s);
  assert.match(css, /\.dashboard-preset-option:hover:not\(\.selected\),\s*\.dashboard-preset-option:focus-visible:not\(\.selected\)/);
  assert.match(css, /\.dashboard-preset-option\.selected::after\s*\{/);
});

test("analysis exposes a dedicated capture quality report tab", () => {
  const captureQuality = readFileSync(new URL("../../src/capture-quality.js", import.meta.url), "utf8");

  assert.match(main, /import \{ analyzeCaptureQuality \} from "\.\/capture-quality\.js";/);
  assert.match(constants, /id:\s*"quality"[\s\S]*label:\s*"quality"[\s\S]*Capture Quality Report/);
  assert.match(main, /if \(state\.activeTab === "quality"\) return renderCaptureQualityReport\(\);/);
  assert.match(main, /function captureQualityReport\(\)/);
  assert.match(main, /function renderCaptureQualityReport\(\)/);
  assert.match(captureQualityView, /data-action="copyQualityCommand"/);
  assert.match(ingestActions, /toast\("Capture command copied", "Paste it on the target server to collect stronger ss evidence\."\);/);
  assert.match(captureQuality, /export function analyzeCaptureQuality/);
  assert.match(captureQuality, /Timestamped snapshots/);
  assert.match(captureQuality, /Socket memory \(-m\)/);
  assert.match(captureQuality, /TCP internals \(-i\)/);
  assert.match(captureQuality, /Very short interval with tee can distort cadence/);
  assert.match(css, /\.capture-quality-shell\s*\{/);
  assert.match(css, /\.capture-quality-hero\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/s);
  assert.match(css, /\.capture-quality-feature-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(260px,\s*1fr\)\);/s);
  assert.match(css, /\.capture-quality-recommendations\s*\{[^}]*grid-template-columns:\s*minmax\(240px,\s*\.55fr\) minmax\(0,\s*1fr\) auto;/s);
});
