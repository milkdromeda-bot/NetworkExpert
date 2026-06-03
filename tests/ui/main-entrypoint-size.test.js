import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const main = readFileSync(new URL("../../src/rendering/main.js", import.meta.url), "utf8");

test("main entrypoint stays below the requested size limit", () => {
  assert.ok(main.split(/\r?\n/).length < 600);
  assert.match(main, /import "\.\/main-runtime\.js\?v=20260603-1";/);
});
