import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
const main = readFileSync(new URL("../../src/main.js", import.meta.url), "utf8");
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
  assert.match(main, /function render\(\) \{\s*hideAppServiceTooltip\(\);/);
  assert.match(main, /\[data-service-override\][\s\S]*?hideAppServiceTooltip\(\);[\s\S]*?state\.modal = "serviceOverride";/);
  assert.doesNotMatch(main, /<span class="app-service-tooltip"/);
});

test("import progress is shown in the ss stats header while loading", () => {
  assert.match(main, /function renderImportStatus\(\)/);
  assert.match(main, /<div class="panel-head[^"]*">[\s\S]*?<div class="panel-title">ss stats to parse<\/div>[\s\S]*?\$\{renderImportStatus\(\)\}/);
  assert.match(css, /\.import-status\s*\{[^}]*grid-template-columns:\s*max-content minmax\(0,\s*1fr\);/s);
  assert.match(css, /\.import-status span\s*\{[^}]*text-overflow:\s*ellipsis;/s);
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
  assert.match(main, /action === "showSplash"[\s\S]*state\.modal = "splash"/);
  assert.match(css, /\.version-pill\s*\{[^}]*max-width:\s*96px;/s);
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
