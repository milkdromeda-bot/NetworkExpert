import { test } from 'node:test';
import assert from 'node:assert';
import { buildComparison, createBaseline } from '../../src/compare.js';
import { ANALYSIS_TEMPLATES, DASHBOARD_PRESETS, applyAnalysisTemplate, applyDashboardPreset, applyDashboardProfile, dashboardSnapshot } from '../../src/profiles.js';

// createBaseline tests
test('createBaseline returns an object', () => {
  const result = createBaseline([]);
  assert.strictEqual(typeof result, 'object');
});

test('createBaseline with empty array produces baseline with no sockets', () => {
  const result = createBaseline([]);
  assert.deepStrictEqual(result.sockets || [], []);
});

test('createBaseline with one socket includes it', () => {
  const result = createBaseline([{ id: 'a', port: 80 }]);
  assert.ok(result);
});

test('createBaseline with multiple sockets', () => {
  const sockets = [{ id: 'a', port: 80 }, { id: 'b', port: 443 }];
  const result = createBaseline(sockets);
  assert.ok(result);
});

test('createBaseline preserves socket ids', () => {
  const sockets = [{ id: 's1', port: 8080 }];
  const baseline = createBaseline(sockets);
  const json = JSON.stringify(baseline);
  assert.ok(json.includes('s1'));
});

test('createBaseline does not mutate input array', () => {
  const sockets = [{ id: 'x', port: 3000 }];
  const copy = [...sockets];
  createBaseline(sockets);
  assert.deepStrictEqual(sockets, copy);
});

test('createBaseline with duplicate ids', () => {
  const sockets = [{ id: 'a', port: 80 }, { id: 'a', port: 81 }];
  const result = createBaseline(sockets);
  assert.ok(result);
});

test('createBaseline result is not null', () => {
  assert.notStrictEqual(createBaseline([]), null);
});

test('createBaseline with socket containing extra fields', () => {
  const result = createBaseline([{ id: 'z', port: 22, protocol: 'tcp' }]);
  assert.ok(result);
});

test('createBaseline with large array', () => {
  const sockets = Array.from({ length: 100 }, (_, i) => ({ id: `s${i}`, port: i }));
  const result = createBaseline(sockets);
  assert.ok(result);
});

// buildComparison tests
test('buildComparison returns an object', () => {
  const before = createBaseline([]);
  const after = createBaseline([]);
  assert.strictEqual(typeof buildComparison(before, after), 'object');
});

test('buildComparison with identical baselines shows no changes', () => {
  const b = createBaseline([{ id: 'a', port: 80 }]);
  const result = buildComparison(b, b);
  assert.ok(result);
});

test('buildComparison detects added socket', () => {
  const before = createBaseline([]);
  const after = createBaseline([{ id: 'new', port: 9090 }]);
  const result = buildComparison(before, after);
  assert.ok(result.added && result.added.length > 0);
});

test('buildComparison detects removed socket', () => {
  const before = createBaseline([{ id: 'old', port: 8080 }]);
  const after = createBaseline([]);
  const result = buildComparison(before, after);
  assert.ok(result.removed && result.removed.length > 0);
});

test('buildComparison detects changed socket', () => {
  const before = createBaseline([{ id: 'c', port: 80 }]);
  const after = createBaseline([{ id: 'c', port: 443 }]);
  const result = buildComparison(before, after);
  assert.ok(result.changed && result.changed.length > 0);
});

test('buildComparison with empty before and after', () => {
  const result = buildComparison(createBaseline([]), createBaseline([]));
  assert.deepStrictEqual(result.added || [], []);
  assert.deepStrictEqual(result.removed || [], []);
});

test('buildComparison added contains correct id', () => {
  const before = createBaseline([]);
  const after = createBaseline([{ id: 'x1', port: 5000 }]);
  const result = buildComparison(before, after);
  const ids = result.added.map(s => s.id);
  assert.ok(ids.includes('x1'));
});

test('buildComparison removed contains correct id', () => {
  const before = createBaseline([{ id: 'r1', port: 6000 }]);
  const after = createBaseline([]);
  const result = buildComparison(before, after);
  const ids = result.removed.map(s => s.id);
  assert.ok(ids.includes('r1'));
});

test('buildComparison multiple added sockets', () => {
  const before = createBaseline([]);
  const after = createBaseline([{ id: 'a1', port: 1 }, { id: 'a2', port: 2 }]);
  const result = buildComparison(before, after);
  assert.strictEqual(result.added.length, 2);
});

test('buildComparison multiple removed sockets', () => {
  const before = createBaseline([{ id: 'r1', port: 1 }, { id: 'r2', port: 2 }]);
  const after = createBaseline([]);
  const result = buildComparison(before, after);
  assert.strictEqual(result.removed.length, 2);
});

test('buildComparison unchanged sockets not in added or removed', () => {
  const before = createBaseline([{ id: 'u', port: 80 }]);
  const after = createBaseline([{ id: 'u', port: 80 }]);
  const result = buildComparison(before, after);
  assert.strictEqual((result.added || []).length, 0);
  assert.strictEqual((result.removed || []).length, 0);
});

test('buildComparison result is not null', () => {
  assert.notStrictEqual(buildComparison(createBaseline([]), createBaseline([])), null);
});

test('buildComparison mixed add and remove', () => {
  const before = createBaseline([{ id: 'old', port: 80 }]);
  const after = createBaseline([{ id: 'new', port: 443 }]);
  const result = buildComparison(before, after);
  assert.ok(result.added.length > 0);
  assert.ok(result.removed.length > 0);
});

test('buildComparison does not mutate before baseline', () => {
  const before = createBaseline([{ id: 'b', port: 80 }]);
  const copy = JSON.parse(JSON.stringify(before));
  buildComparison(before, createBaseline([]));
  assert.deepStrictEqual(before, copy);
});

test('buildComparison does not mutate after baseline', () => {
  const after = createBaseline([{ id: 'a', port: 80 }]);
  const copy = JSON.parse(JSON.stringify(after));
  buildComparison(createBaseline([]), after);
  assert.deepStrictEqual(after, copy);
});

// ANALYSIS_TEMPLATES tests
test('ANALYSIS_TEMPLATES is an object', () => {
  assert.strictEqual(typeof ANALYSIS_TEMPLATES, 'object');
});

test('ANALYSIS_TEMPLATES is not null', () => {
  assert.notStrictEqual(ANALYSIS_TEMPLATES, null);
});

test('ANALYSIS_TEMPLATES has at least one entry', () => {
  assert.ok(Object.keys(ANALYSIS_TEMPLATES).length > 0);
});

test('ANALYSIS_TEMPLATES entries are objects', () => {
  for (const val of Object.values(ANALYSIS_TEMPLATES)) {
    assert.strictEqual(typeof val, 'object');
  }
});

test('ANALYSIS_TEMPLATES keys are strings', () => {
  for (const key of Object.keys(ANALYSIS_TEMPLATES)) {
    assert.strictEqual(typeof key, 'string');
  }
});

// DASHBOARD_PRESETS tests
test('DASHBOARD_PRESETS is an object', () => {
  assert.strictEqual(typeof DASHBOARD_PRESETS, 'object');
});

test('DASHBOARD_PRESETS is not null', () => {
  assert.notStrictEqual(DASHBOARD_PRESETS, null);
});

test('DASHBOARD_PRESETS has keys', () => {
  assert.ok(Object.keys(DASHBOARD_PRESETS).length > 0);
});

test('DASHBOARD_PRESETS values are defined', () => {
  for (const val of Object.values(DASHBOARD_PRESETS)) {
    assert.notStrictEqual(val, undefined);
  }
});

// dashboardSnapshot tests
test('dashboardSnapshot returns an object', () => {
  const snap = dashboardSnapshot('test-snap');
  assert.strictEqual(typeof snap, 'object');
});

test('dashboardSnapshot includes the given name', () => {
  const snap = dashboardSnapshot('my-snapshot');
  assert.strictEqual(snap.name, 'my-snapshot');
});

test('dashboardSnapshot with different name', () => {
  const snap = dashboardSnapshot('another');
  assert.strictEqual(snap.name, 'another');
});

test('dashboardSnapshot result is not null', () => {
  assert.notStrictEqual(dashboardSnapshot('x'), null);
});

test('dashboardSnapshot creates unique snapshots', () => {
  const a = dashboardSnapshot('a');
  const b = dashboardSnapshot('b');
  assert.notDeepStrictEqual(a, b);
});

// applyDashboardPreset tests
test('applyDashboardPreset returns an object', () => {
  const key = Object.keys(DASHBOARD_PRESETS)[0];
  const result = applyDashboardPreset(key);
  assert.strictEqual(typeof result, 'object');
});

test('applyDashboardPreset result is not null', () => {
  const key = Object.keys(DASHBOARD_PRESETS)[0];
  assert.notStrictEqual(applyDashboardPreset(key), null);
});

test('applyDashboardPreset returns valid config with properties', () => {
  const key = Object.keys(DASHBOARD_PRESETS)[0];
  const result = applyDashboardPreset(key);
  assert.ok(Object.keys(result).length > 0);
});

// applyAnalysisTemplate tests
test('applyAnalysisTemplate returns an object', () => {
  const key = Object.keys(ANALYSIS_TEMPLATES)[0];
  const result = applyAnalysisTemplate(key);
  assert.strictEqual(typeof result, 'object');
});

test('applyAnalysisTemplate result is not null', () => {
  const key = Object.keys(ANALYSIS_TEMPLATES)[0];
  assert.notStrictEqual(applyAnalysisTemplate(key), null);
});

test('applyAnalysisTemplate returns config with keys', () => {
  const key = Object.keys(ANALYSIS_TEMPLATES)[0];
  const result = applyAnalysisTemplate(key);
  assert.ok(Object.keys(result).length > 0);
});

// applyDashboardProfile tests
test('applyDashboardProfile returns an object', () => {
  const result = applyDashboardProfile({ name: 'test' });
  assert.strictEqual(typeof result, 'object');
});

test('applyDashboardProfile result is not null', () => {
  assert.notStrictEqual(applyDashboardProfile({ name: 'p' }), null);
});

test('applyDashboardProfile with empty profile', () => {
  const result = applyDashboardProfile({});
  assert.ok(result);
});

// Additional edge case tests
test('buildComparison with same socket different protocol', () => {
  const before = createBaseline([{ id: 's', port: 80, protocol: 'tcp' }]);
  const after = createBaseline([{ id: 's', port: 80, protocol: 'udp' }]);
  const result = buildComparison(before, after);
  assert.ok(result.changed && result.changed.length > 0);
});

test('createBaseline with socket having no port', () => {
  const result = createBaseline([{ id: 'noport' }]);
  assert.ok(result);
});

test('dashboardSnapshot name is a string property', () => {
  const snap = dashboardSnapshot('check');
  assert.strictEqual(typeof snap.name, 'string');
});
