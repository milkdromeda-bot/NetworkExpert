import assert from "node:assert/strict";
import { test } from "node:test";

import { createAppRenderingContext } from "../../src/rendering/app-rendering-context.js";

test("app rendering context proxies objects values and functions", () => {
  const deps = {
    state: { count: 1, inc() { this.count += 1; return this.count; } },
    APP_VERSION: "1.2.3",
    escapeHtml: value => String(value).replaceAll("<", "&lt;")
  };
  const context = createAppRenderingContext(() => deps);

  assert.equal(context.state.count, 1);
  assert.equal(context.state.inc(), 2);
  assert.equal(context.state.count, 2);
  assert.equal(String(context.APP_VERSION), "1.2.3");
  assert.equal(context.escapeHtml("<x>"), "&lt;x>");

  deps.state.count = 9;
  deps.APP_VERSION = "2.0.0";
  assert.equal(context.state.count, 9);
  assert.equal(`${context.APP_VERSION}`, "2.0.0");
});

test("app rendering context reports missing function dependencies", () => {
  const context = createAppRenderingContext(() => ({}));

  assert.throws(() => context.render(), /Missing app rendering dependency: render/);
});
