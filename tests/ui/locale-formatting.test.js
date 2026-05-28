import assert from "node:assert/strict";
import { test } from "node:test";

import { createLocaleFormatting } from "../../src/core/locale-formatting.js";

test("locale formatting resolves user preferences and browser fallbacks", () => {
  let prefs = { numberLocale: "auto", chartTimeZone: "auto", numberGrouping: true };
  const formatting = createLocaleFormatting({
    browserTimeZone: "Europe/Paris",
    commonTimeZones: ["UTC"],
    getNavigator: () => ({ language: "fr-FR" }),
    getPrefs: () => prefs
  });

  assert.equal(formatting.resolvedNumberLocale(), "fr-FR");
  assert.equal(formatting.resolvedTimeZone(), "Europe/Paris");
  assert.ok(formatting.timeZoneOptions().includes("UTC"));
  assert.equal(formatting.formatTimelineOffset(1.25), "1,250");

  prefs = { numberLocale: "en-US", chartTimeZone: "UTC", numberGrouping: false };
  assert.equal(formatting.resolvedNumberLocale(), "en-US");
  assert.equal(formatting.resolvedTimeZone(), "UTC");
  assert.equal(formatting.formatNumber(1234), "1234");
});

test("timeline timestamps keep millisecond precision when present", () => {
  const formatting = createLocaleFormatting({
    browserTimeZone: "UTC",
    getNavigator: () => ({ language: "en-US" }),
    getPrefs: () => ({ numberLocale: "en-US", chartTimeZone: "UTC" })
  });

  assert.match(formatting.formatTimelineTime({ epochMs: Date.UTC(2026, 0, 1, 12, 0, 0, 123) }), /12:00:00\.123/);
  assert.equal(formatting.formatTimelineTime({}), "snapshot");
});
