import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("table settings header stays above nearby column hover tooltips", () => {
  assert.match(css, /th:not\(\.table-settings-head\):hover/);
  assert.match(css, /\.table-settings-head:hover,\s*\.table-settings-head:focus-within\s*\{[^}]*z-index:\s*40;/s);
  assert.match(css, /\.row-menu\.table-settings-menu\s*\{[^}]*z-index:\s*120;/s);
  assert.match(css, /\.row-menu\.table-settings-menu\.open\s*\{[^}]*grid-template-rows:\s*auto auto auto minmax\(0,\s*1fr\);/s);
  assert.match(css, /\.table-settings-column-list\s*\{[^}]*min-height:\s*0;/s);
  assert.match(css, /\.table-settings-search\s*\{/);
});
