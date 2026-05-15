import { test } from 'node:test';
import assert from 'node:assert';
import { applyContextAction, setActiveInvestigation } from '../../src/navigation.js';
import { ACCESS_ROLES, COMMON_TIME_ZONES, EXPERT_DEFAULT_THRESHOLDS, INGEST_RAW_EAGER_LIMIT, LINUX_PROFILES, UBUNTU_PROFILES, cloneThresholds } from '../../src/expert-config.js';

// --- applyContextAction tests ---

test('applyContextAction returns object for focus action', () => {
  const result = applyContextAction('focus', { target: 'node-1' });
  assert.strictEqual(typeof result, 'object');
});

test('applyContextAction focus action preserves target', () => {
  const result = applyContextAction('focus', { target: 'node-2' });
  assert.strictEqual(result.target, 'node-2');
});

test('applyContextAction focus action sets action type', () => {
  const result = applyContextAction('focus', { target: 'x' });
  assert.strictEqual(result.action, 'focus');
});

test('applyContextAction clear action returns object', () => {
  const result = applyContextAction('clear', {});
  assert.strictEqual(typeof result, 'object');
});

test('applyContextAction clear action sets action type', () => {
  const result = applyContextAction('clear', {});
  assert.strictEqual(result.action, 'clear');
});

test('applyContextAction clear action nullifies target', () => {
  const result = applyContextAction('clear', { target: 'old' });
  assert.strictEqual(result.target, null);
});

test('applyContextAction chart action returns object', () => {
  const result = applyContextAction('chart', { metric: 'cpu' });
  assert.strictEqual(typeof result, 'object');
});

test('applyContextAction chart action sets action type', () => {
  const result = applyContextAction('chart', { metric: 'cpu' });
  assert.strictEqual(result.action, 'chart');
});

test('applyContextAction chart action preserves metric', () => {
  const result = applyContextAction('chart', { metric: 'memory' });
  assert.strictEqual(result.metric, 'memory');
});

test('applyContextAction details action returns object', () => {
  const result = applyContextAction('details', { id: '123' });
  assert.strictEqual(typeof result, 'object');
});

test('applyContextAction details action sets action type', () => {
  const result = applyContextAction('details', { id: '123' });
  assert.strictEqual(result.action, 'details');
});

test('applyContextAction details action preserves id', () => {
  const result = applyContextAction('details', { id: 'abc' });
  assert.strictEqual(result.id, 'abc');
});

test('applyContextAction with empty context returns object', () => {
  const result = applyContextAction('focus', {});
  assert.strictEqual(typeof result, 'object');
});

test('applyContextAction does not mutate input context', () => {
  const ctx = { target: 'original' };
  applyContextAction('focus', ctx);
  assert.strictEqual(ctx.target, 'original');
});

// --- setActiveInvestigation tests ---

test('setActiveInvestigation sets investigation id', () => {
  const state = setActiveInvestigation('inv-1');
  assert.strictEqual(state.investigationId, 'inv-1');
});

test('setActiveInvestigation with null clears investigation', () => {
  const state = setActiveInvestigation(null);
  assert.strictEqual(state.investigationId, null);
});

test('setActiveInvestigation with undefined clears investigation', () => {
  const state = setActiveInvestigation(undefined);
  assert.strictEqual(state.investigationId, null);
});

test('setActiveInvestigation returns object', () => {
  const state = setActiveInvestigation('inv-2');
  assert.strictEqual(typeof state, 'object');
});

test('setActiveInvestigation with string id is active', () => {
  const state = setActiveInvestigation('inv-3');
  assert.strictEqual(state.active, true);
});

test('setActiveInvestigation with null is not active', () => {
  const state = setActiveInvestigation(null);
  assert.strictEqual(state.active, false);
});

// --- ACCESS_ROLES tests ---

test('ACCESS_ROLES contains analyst', () => {
  assert.ok(ACCESS_ROLES.includes('analyst'));
});

test('ACCESS_ROLES contains ops', () => {
  assert.ok(ACCESS_ROLES.includes('ops'));
});

test('ACCESS_ROLES contains root', () => {
  assert.ok(ACCESS_ROLES.includes('root'));
});

test('ACCESS_ROLES is an array', () => {
  assert.ok(Array.isArray(ACCESS_ROLES));
});

test('ACCESS_ROLES has at least 3 entries', () => {
  assert.ok(ACCESS_ROLES.length >= 3);
});

// --- LINUX_PROFILES tests ---

test('LINUX_PROFILES is defined', () => {
  assert.ok(LINUX_PROFILES !== undefined);
});

test('LINUX_PROFILES has entries', () => {
  assert.ok(Object.keys(LINUX_PROFILES).length > 0);
});

test('LINUX_PROFILES is an object', () => {
  assert.strictEqual(typeof LINUX_PROFILES, 'object');
});

test('LINUX_PROFILES is not null', () => {
  assert.ok(LINUX_PROFILES !== null);
});

// --- UBUNTU_PROFILES tests ---

test('UBUNTU_PROFILES is defined', () => {
  assert.ok(UBUNTU_PROFILES !== undefined);
});

test('UBUNTU_PROFILES has entries', () => {
  assert.ok(Object.keys(UBUNTU_PROFILES).length > 0);
});

test('UBUNTU_PROFILES is an object', () => {
  assert.strictEqual(typeof UBUNTU_PROFILES, 'object');
});

test('UBUNTU_PROFILES is not null', () => {
  assert.ok(UBUNTU_PROFILES !== null);
});

// --- EXPERT_DEFAULT_THRESHOLDS tests ---

test('EXPERT_DEFAULT_THRESHOLDS is an object', () => {
  assert.strictEqual(typeof EXPERT_DEFAULT_THRESHOLDS, 'object');
});

test('EXPERT_DEFAULT_THRESHOLDS has metric keys', () => {
  assert.ok(Object.keys(EXPERT_DEFAULT_THRESHOLDS).length > 0);
});

test('EXPERT_DEFAULT_THRESHOLDS first key has warn property', () => {
  const firstKey = Object.keys(EXPERT_DEFAULT_THRESHOLDS)[0];
  assert.ok('warn' in EXPERT_DEFAULT_THRESHOLDS[firstKey]);
});

test('EXPERT_DEFAULT_THRESHOLDS first key has danger property', () => {
  const firstKey = Object.keys(EXPERT_DEFAULT_THRESHOLDS)[0];
  assert.ok('danger' in EXPERT_DEFAULT_THRESHOLDS[firstKey]);
});

test('EXPERT_DEFAULT_THRESHOLDS warn is a number', () => {
  const firstKey = Object.keys(EXPERT_DEFAULT_THRESHOLDS)[0];
  assert.strictEqual(typeof EXPERT_DEFAULT_THRESHOLDS[firstKey].warn, 'number');
});

test('EXPERT_DEFAULT_THRESHOLDS danger is a number', () => {
  const firstKey = Object.keys(EXPERT_DEFAULT_THRESHOLDS)[0];
  assert.strictEqual(typeof EXPERT_DEFAULT_THRESHOLDS[firstKey].danger, 'number');
});

test('EXPERT_DEFAULT_THRESHOLDS danger >= warn', () => {
  const firstKey = Object.keys(EXPERT_DEFAULT_THRESHOLDS)[0];
  assert.ok(EXPERT_DEFAULT_THRESHOLDS[firstKey].danger >= EXPERT_DEFAULT_THRESHOLDS[firstKey].warn);
});

// --- cloneThresholds tests ---

test('cloneThresholds returns an object', () => {
  const clone = cloneThresholds(EXPERT_DEFAULT_THRESHOLDS);
  assert.strictEqual(typeof clone, 'object');
});

test('cloneThresholds returns deep copy', () => {
  const clone = cloneThresholds(EXPERT_DEFAULT_THRESHOLDS);
  assert.notStrictEqual(clone, EXPERT_DEFAULT_THRESHOLDS);
});

test('cloneThresholds preserves keys', () => {
  const clone = cloneThresholds(EXPERT_DEFAULT_THRESHOLDS);
  assert.deepStrictEqual(Object.keys(clone), Object.keys(EXPERT_DEFAULT_THRESHOLDS));
});

test('cloneThresholds preserves values', () => {
  const clone = cloneThresholds(EXPERT_DEFAULT_THRESHOLDS);
  assert.deepStrictEqual(clone, EXPERT_DEFAULT_THRESHOLDS);
});

test('cloneThresholds nested objects are not same reference', () => {
  const clone = cloneThresholds(EXPERT_DEFAULT_THRESHOLDS);
  const firstKey = Object.keys(clone)[0];
  assert.notStrictEqual(clone[firstKey], EXPERT_DEFAULT_THRESHOLDS[firstKey]);
});

test('cloneThresholds mutation does not affect original', () => {
  const clone = cloneThresholds(EXPERT_DEFAULT_THRESHOLDS);
  const firstKey = Object.keys(clone)[0];
  clone[firstKey].warn = 9999;
  assert.notStrictEqual(EXPERT_DEFAULT_THRESHOLDS[firstKey].warn, 9999);
});

// --- COMMON_TIME_ZONES tests ---

test('COMMON_TIME_ZONES is an array', () => {
  assert.ok(Array.isArray(COMMON_TIME_ZONES));
});

test('COMMON_TIME_ZONES has entries', () => {
  assert.ok(COMMON_TIME_ZONES.length > 0);
});

test('COMMON_TIME_ZONES entries are strings', () => {
  assert.strictEqual(typeof COMMON_TIME_ZONES[0], 'string');
});

// --- INGEST_RAW_EAGER_LIMIT tests ---

test('INGEST_RAW_EAGER_LIMIT is a number', () => {
  assert.strictEqual(typeof INGEST_RAW_EAGER_LIMIT, 'number');
});

test('INGEST_RAW_EAGER_LIMIT is positive', () => {
  assert.ok(INGEST_RAW_EAGER_LIMIT > 0);
});

test('INGEST_RAW_EAGER_LIMIT is an integer', () => {
  assert.strictEqual(INGEST_RAW_EAGER_LIMIT, Math.floor(INGEST_RAW_EAGER_LIMIT));
});
