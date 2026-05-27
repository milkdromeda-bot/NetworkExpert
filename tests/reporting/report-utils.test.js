import assert from "node:assert/strict";
import { test } from "node:test";
import { drawPdfSection, drawPdfTextBlock, wrapPdfLines } from "../../src/reporting/report-utils.js";

const mockFont = {
  widthOfTextAtSize(text, size) {
    return String(text).length * size;
  }
};

test("wrapPdfLines preserves empty paragraphs and wraps by measured width", () => {
  const lines = wrapPdfLines("alpha beta gamma\n\nshort", mockFont, 5, 45);

  assert.deepEqual(lines, ["alpha", "beta", "gamma", "", "short"]);
});

test("drawPdfTextBlock writes wrapped lines with stable line height", () => {
  const calls = [];
  const page = { drawText: (text, options) => calls.push({ text, options }) };

  const cursor = drawPdfTextBlock(page, "alpha beta", {
    x: 12,
    y: 100,
    width: 34,
    size: 5,
    font: mockFont,
    color: "ink",
    lineHeight: 8
  });

  assert.equal(cursor, 84);
  assert.deepEqual(calls.map(call => call.text), ["alpha", "beta"]);
  assert.equal(calls[0].options.x, 12);
  assert.equal(calls[1].options.y, 92);
});

test("drawPdfSection renders a heading then filtered body lines", () => {
  const calls = [];
  const page = { drawText: (text, options) => calls.push({ text, options }) };

  const cursor = drawPdfSection(page, "Signals", ["first line", "", "second line"], 20, 220, 120, {
    bold: { ...mockFont, name: "bold" },
    regular: mockFont
  }, {
    accent: "accent",
    ink: "ink"
  });

  assert.deepEqual(calls.map(call => call.text), ["Signals", "first line", "second line"]);
  assert.equal(calls[0].options.size, 12);
  assert.equal(calls[0].options.color, "accent");
  assert.ok(cursor < 190);
});
