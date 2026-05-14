import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
const main = readFileSync(new URL("../../src/main.js", import.meta.url), "utf8");

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
  assert.match(main, /<div class="panel-head ingest-source-head">[\s\S]*?<div class="panel-title">ss stats to parse<\/div>[\s\S]*?\$\{renderImportStatus\(\)\}/);
  assert.doesNotMatch(main, /<p class="hint">The file is read locally[\s\S]*?\$\{state\.importStatus/);
  assert.match(css, /\.ingest-head-main\s*\{[^}]*display:\s*flex;/s);
  assert.match(css, /\.import-status\s*\{[^}]*grid-template-columns:\s*max-content minmax\(0,\s*1fr\);/s);
  assert.match(css, /\.import-status span\s*\{[^}]*text-overflow:\s*ellipsis;/s);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.ingest-source-head\s*\{[^}]*flex-direction:\s*column;/s);
});

test("topbar anomaly pill uses a compact warning icon", () => {
  assert.match(main, /incidentWarning/);
  assert.doesNotMatch(main, /incidentCloud/);
  assert.doesNotMatch(css, /incident-cloud-icon/);
  assert.match(css, /\.incident-warning-icon\s*\{[^}]*width:\s*15px;[^}]*height:\s*15px;/s);
  assert.match(css, /\.incident-warning-icon i\s*\{[^}]*font-size:\s*15px;/s);
});

test("clear input and reset workspace actions are visually distinct", () => {
  assert.match(main, /data-action="clear" class="clear-input-button"[^>]*>[\s\S]*Clear input/);
  assert.match(main, /data-action="requestResetWorkspace"[^>]*>[\s\S]*Reset workspace/);
  assert.match(main, /action === "requestResetWorkspace"[\s\S]*state\.modal = "resetWorkspace"/);
  assert.match(main, /action === "confirmResetWorkspace"[\s\S]*resetAllState\(\)/);
  assert.doesNotMatch(main, /data-action="resetAll"/);
  assert.match(css, /\.clear-input-button\s*\{[^}]*background:/s);
  assert.match(css, /\.reset-workspace-button\s*\{[^}]*max-width:\s*190px;/s);
  assert.match(css, /\.reset-workspace-modal\s*\{/);
  assert.match(css, /\.reset-workspace-actions\s*\{[^}]*justify-content:\s*flex-end;/s);
});
