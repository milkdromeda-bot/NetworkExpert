import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("table settings header stays above nearby column hover tooltips", () => {
  assert.match(css, /th:not\(\.table-settings-head\):hover/);
  assert.match(css, /\.table-settings-head:hover,\s*\.table-settings-head:focus-within\s*\{[^}]*z-index:\s*40;/s);
  assert.match(css, /\.table-settings-menu\s*\{[^}]*z-index:\s*120;/s);
});
