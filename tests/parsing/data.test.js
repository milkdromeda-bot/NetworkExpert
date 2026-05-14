import test from "node:test";
import assert from "node:assert/strict";

import { FIELD_DOCS, FIELD_GUIDANCE } from "../../src/data.js";

test("field guidance only references documented fields", () => {
  for (const key of Object.keys(FIELD_GUIDANCE)) {
    assert.ok(FIELD_DOCS[key], `${key} should exist in FIELD_DOCS`);
  }
});

test("field guidance adds threshold references only to meaningful metrics", () => {
  assert.equal(FIELD_GUIDANCE.rtt.metric, "rtt");
  assert.equal(FIELD_GUIDANCE.rto.metric, "rto");
  assert.equal(FIELD_GUIDANCE.backoff.metric, "backoff");
  assert.deepEqual(FIELD_GUIDANCE.skmem.thresholds.map(item => item.metric), ["skmem.r", "skmem.t", "skmem.d"]);
  assert.equal(FIELD_GUIDANCE.bytes_received, undefined);
  assert.equal(FIELD_GUIDANCE.segs_in, undefined);
});
