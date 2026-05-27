import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainSource = readFileSync(new URL('../../src/rendering/main.js', import.meta.url), 'utf8');
const jvmSource = readFileSync(new URL('../../src/correlation/jvm-correlation.js', import.meta.url), 'utf8');

test('JVM GC correlation UI is local receiver only', () => {
  assert.doesNotMatch(mainSource, /jvmCorrelationMode/);
  assert.doesNotMatch(mainSource, /jvmGc\.mode/);
  assert.doesNotMatch(mainSource, /senderMode/);
  assert.doesNotMatch(mainSource, /Send-Q \+ RTT/);
  assert.match(mainSource, /Recv-Q \+ GC pauses/);
  assert.match(mainSource, /Pause duration vs Delta Recv-Q/);
});

test('JVM GC engine does not keep sender-mode symptom logic', () => {
  assert.doesNotMatch(jvmSource, /detectSenderSymptoms/);
  assert.doesNotMatch(jvmSource, /sendQ_rise/);
  assert.doesNotMatch(jvmSource, /mode\s*=\s*["']receiver["']/);
});
