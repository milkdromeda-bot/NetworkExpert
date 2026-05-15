import { test } from 'node:test';
import assert from 'node:assert';
import { parseGcLog, classifyPause, g1Recommendations, RECOMMENDED_JVM_LOGGING } from '../../src/gc-log-parser.js';

// --- parseGcLog: timestamps ---

test('parses absolute timestamp from GC line', () => {
  const log = `[2024-03-10T14:22:01.123+0000][1.234s] GC(0) Pause Young (Normal) 5.678ms\n`;
  const { pauses } = parseGcLog(log);
  assert.strictEqual(pauses[0].epochMs, new Date('2024-03-10T14:22:01.123+0000').getTime());
});

test('parses uptime seconds from GC line', () => {
  const log = `[2024-03-10T14:22:01.123+0000][42.567s] GC(1) Pause Young (Normal) 3.210ms\n`;
  const { pauses } = parseGcLog(log);
  assert.strictEqual(pauses[0].uptimeS, 42.567);
});

// --- parseGcLog: pause types ---

test('parses Young pause type', () => {
  const log = `[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Young (Normal) 2.0ms\n`;
  assert.strictEqual(parseGcLog(log).pauses[0].type, 'Young');
});

test('parses Mixed pause type', () => {
  const log = `[2024-01-01T00:00:00.000+0000][2.0s] GC(1) Pause Mixed (G1 Evacuation Pause) 4.5ms\n`;
  assert.strictEqual(parseGcLog(log).pauses[0].type, 'Mixed');
});

test('parses Full pause type', () => {
  const log = `[2024-01-01T00:00:00.000+0000][3.0s] GC(2) Pause Full (Allocation Failure) 120.0ms\n`;
  assert.strictEqual(parseGcLog(log).pauses[0].type, 'Full');
});

test('parses Remark pause type', () => {
  const log = `[2024-01-01T00:00:00.000+0000][4.0s] GC(3) Pause Remark 1.2ms\n`;
  assert.strictEqual(parseGcLog(log).pauses[0].type, 'Remark');
});

test('parses Cleanup pause type', () => {
  const log = `[2024-01-01T00:00:00.000+0000][5.0s] GC(4) Pause Cleanup 0.8ms\n`;
  assert.strictEqual(parseGcLog(log).pauses[0].type, 'Cleanup');
});

// --- parseGcLog: causes ---

test('parses cause from parentheses', () => {
  const log = `[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Young (G1 Evacuation Pause) 2.0ms\n`;
  assert.strictEqual(parseGcLog(log).pauses[0].cause, 'G1 Evacuation Pause');
});

test('cause is empty string when absent', () => {
  const log = `[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Remark 1.0ms\n`;
  assert.strictEqual(parseGcLog(log).pauses[0].cause, '');
});

test('parses System.gc cause', () => {
  const log = `[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Full (System.gc) 50.0ms\n`;
  assert.strictEqual(parseGcLog(log).pauses[0].cause, 'System.gc');
});

// --- parseGcLog: durations ---

test('parses duration from single-line pause', () => {
  const log = `[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Young (Normal) 7.891ms\n`;
  assert.strictEqual(parseGcLog(log).pauses[0].durationMs, 7.891);
});

test('parses duration from subsequent line', () => {
  const log = [
    '[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Young (Normal)',
    '[2024-01-01T00:00:00.000+0000][1.0s]   some detail 12.345ms',
    ''
  ].join('\n');
  assert.strictEqual(parseGcLog(log).pauses[0].durationMs, 12.345);
});

// --- parseGcLog: heap before/after ---

test('parses heap before, after, and capacity', () => {
  const log = [
    '[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Young (Normal)',
    '[2024-01-01T00:00:00.000+0000][1.0s]   512M->256M(1024M) 5.0ms',
    ''
  ].join('\n');
  const p = parseGcLog(log).pauses[0];
  assert.strictEqual(p.heapBeforeMB, 512);
  assert.strictEqual(p.heapAfterMB, 256);
  assert.strictEqual(p.heapCapacityMB, 1024);
});

// --- parseGcLog: regions ---

test('parses Eden, Survivor, Old region counts', () => {
  const log = [
    '[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Young (Normal)',
    '[2024-01-01T00:00:00.000+0000][1.0s]   Eden: 24(24M)->0(24M) Survivors: 3(3M)->4(4M) Old: 10(10M)->12',
    '[2024-01-01T00:00:00.000+0000][1.0s]   5.0ms',
    ''
  ].join('\n');
  const p = parseGcLog(log).pauses[0];
  assert.strictEqual(p.edenBefore, 24);
  assert.strictEqual(p.edenAfter, 0);
  assert.strictEqual(p.survivorBefore, 3);
  assert.strictEqual(p.survivorAfter, 4);
  assert.strictEqual(p.oldBefore, 10);
  assert.strictEqual(p.oldAfter, 12);
});

// --- parseGcLog: User/Sys/Real times ---

test('parses User, Sys, Real times', () => {
  const log = [
    '[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Young (Normal)',
    '[2024-01-01T00:00:00.000+0000][1.0s]   User=0.05s Sys=0.01s Real=0.02s',
    '[2024-01-01T00:00:00.000+0000][1.0s]   3.0ms',
    ''
  ].join('\n');
  const p = parseGcLog(log).pauses[0];
  assert.strictEqual(p.userS, 0.05);
  assert.strictEqual(p.sysS, 0.01);
  assert.strictEqual(p.realS, 0.02);
});

// --- parseGcLog: evacuation failure ---

test('detects evacuation failure in subsequent line', () => {
  const log = [
    '[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Young (Normal)',
    '[2024-01-01T00:00:00.000+0000][1.0s]   Evacuation Failure',
    '[2024-01-01T00:00:00.000+0000][1.0s]   10.0ms',
    ''
  ].join('\n');
  assert.strictEqual(parseGcLog(log).pauses[0].evacuationFailure, true);
});

test('detects To-space exhausted as evacuation failure', () => {
  const log = [
    '[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Young (Normal)',
    '[2024-01-01T00:00:00.000+0000][1.0s]   To-space exhausted',
    '[2024-01-01T00:00:00.000+0000][1.0s]   10.0ms',
    ''
  ].join('\n');
  assert.strictEqual(parseGcLog(log).pauses[0].evacuationFailure, true);
});

test('no evacuation failure when absent', () => {
  const log = `[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Young (Normal) 2.0ms\n`;
  assert.strictEqual(parseGcLog(log).pauses[0].evacuationFailure, false);
});

// --- parseGcLog: humongous allocation ---

test('detects humongous allocation in cause', () => {
  const log = `[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Young (Humongous Allocation) 5.0ms\n`;
  assert.strictEqual(parseGcLog(log).pauses[0].humongousAllocation, true);
});

test('detects humongous allocation in body line', () => {
  const log = [
    '[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Young (Normal)',
    '[2024-01-01T00:00:00.000+0000][1.0s]   Humongous Allocation triggered',
    '[2024-01-01T00:00:00.000+0000][1.0s]   5.0ms',
    ''
  ].join('\n');
  assert.strictEqual(parseGcLog(log).pauses[0].humongousAllocation, true);
});

test('parses Humongous region counts', () => {
  const log = [
    '[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Young (Normal)',
    '[2024-01-01T00:00:00.000+0000][1.0s]   Humongous: 8->4',
    '[2024-01-01T00:00:00.000+0000][1.0s]   5.0ms',
    ''
  ].join('\n');
  const p = parseGcLog(log).pauses[0];
  assert.strictEqual(p.humongousBefore, 8);
  assert.strictEqual(p.humongousAfter, 4);
});

// --- parseGcLog: safepoints ---

test('parses safepoint with Total ms', () => {
  const log = `[2024-01-01T00:00:00.000+0000][1.0s] Safepoint blah Total: 0.45 ms\n`;
  const { safepoints } = parseGcLog(log);
  assert.strictEqual(safepoints.length, 1);
  assert.strictEqual(safepoints[0].totalMs, 0.45);
});

test('parses safepoint with comma decimal', () => {
  const log = `[2024-01-01T00:00:00.000+0000][1.0s] Safepoint blah Total: 1,23 ms\n`;
  assert.strictEqual(parseGcLog(log).safepoints[0].totalMs, 1.23);
});

test('parses stopped time as safepoint', () => {
  const log = `[2024-01-01T00:00:00.000+0000][2.0s] Total time for which application threads were stopped: 0.005 seconds\n`;
  const { safepoints } = parseGcLog(log);
  assert.strictEqual(safepoints.length, 1);
  assert.strictEqual(safepoints[0].totalMs, 5);
});

// --- parseGcLog: empty input ---

test('returns empty arrays for empty string', () => {
  const { pauses, safepoints } = parseGcLog('');
  assert.deepStrictEqual(pauses, []);
  assert.deepStrictEqual(safepoints, []);
});

test('returns empty arrays for whitespace-only input', () => {
  const { pauses, safepoints } = parseGcLog('   \n\n  \n');
  assert.deepStrictEqual(pauses, []);
  assert.deepStrictEqual(safepoints, []);
});

// --- parseGcLog: malformed lines ---

test('ignores lines without GC pattern', () => {
  const log = 'random log line\nanother line\n';
  assert.deepStrictEqual(parseGcLog(log).pauses, []);
});

test('ignores GC line without duration', () => {
  const log = '[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Young (Normal)\n';
  assert.deepStrictEqual(parseGcLog(log).pauses, []);
});

test('parses multiple pauses from multi-event log', () => {
  const log = [
    '[2024-01-01T00:00:00.000+0000][1.0s] GC(0) Pause Young (Normal) 2.0ms',
    '[2024-01-01T00:00:01.000+0000][2.0s] GC(1) Pause Young (Normal) 3.0ms',
    ''
  ].join('\n');
  assert.strictEqual(parseGcLog(log).pauses.length, 2);
});

// --- classifyPause: flags ---

test('classifyPause includes full_gc for Full type', () => {
  const p = { type: 'Full', cause: '', evacuationFailure: false, humongousAllocation: false, userS: null, sysS: null, realS: null };
  assert.ok(classifyPause(p).includes('full_gc'));
});

test('classifyPause includes evacuation_failure flag', () => {
  const p = { type: 'Young', cause: '', evacuationFailure: true, humongousAllocation: false, userS: null, sysS: null, realS: null };
  assert.ok(classifyPause(p).includes('evacuation_failure'));
});

test('classifyPause includes humongous_alloc flag', () => {
  const p = { type: 'Young', cause: '', evacuationFailure: false, humongousAllocation: true, userS: null, sysS: null, realS: null };
  assert.ok(classifyPause(p).includes('humongous_alloc'));
});

test('classifyPause includes system_gc for System.gc cause', () => {
  const p = { type: 'Full', cause: 'System.gc', evacuationFailure: false, humongousAllocation: false, userS: null, sysS: null, realS: null };
  assert.ok(classifyPause(p).includes('system_gc'));
});

test('classifyPause includes lowercase type', () => {
  const p = { type: 'Mixed', cause: '', evacuationFailure: false, humongousAllocation: false, userS: null, sysS: null, realS: null };
  assert.ok(classifyPause(p).includes('mixed'));
});

test('classifyPause detects cpu_starvation when Real >> User+Sys', () => {
  const p = { type: 'Young', cause: '', evacuationFailure: false, humongousAllocation: false, userS: 0.01, sysS: 0.01, realS: 0.20 };
  assert.ok(classifyPause(p).includes('cpu_starvation'));
});

test('classifyPause no cpu_starvation when Real is proportional', () => {
  const p = { type: 'Young', cause: '', evacuationFailure: false, humongousAllocation: false, userS: 0.10, sysS: 0.01, realS: 0.05 };
  assert.ok(!classifyPause(p).includes('cpu_starvation'));
});

test('classifyPause detects high_sys when Sys > User*0.5 and Sys > 0.01', () => {
  const p = { type: 'Young', cause: '', evacuationFailure: false, humongousAllocation: false, userS: 0.02, sysS: 0.05, realS: 0.06 };
  assert.ok(classifyPause(p).includes('high_sys'));
});

test('classifyPause no high_sys when Sys is small', () => {
  const p = { type: 'Young', cause: '', evacuationFailure: false, humongousAllocation: false, userS: 0.10, sysS: 0.005, realS: 0.05 };
  assert.ok(!classifyPause(p).includes('high_sys'));
});

test('classifyPause skips cpu/sys checks when times are null', () => {
  const p = { type: 'Young', cause: '', evacuationFailure: false, humongousAllocation: false, userS: null, sysS: null, realS: null };
  const flags = classifyPause(p);
  assert.ok(!flags.includes('cpu_starvation'));
  assert.ok(!flags.includes('high_sys'));
});

// --- g1Recommendations ---

test('g1Recommendations returns nominal for healthy pauses', () => {
  const pauses = [{ type: 'Young', cause: '', evacuationFailure: false, humongousAllocation: false, durationMs: 5, uptimeS: 1, userS: 0.01, sysS: 0.001, realS: 0.005 }];
  const recs = g1Recommendations(pauses);
  assert.strictEqual(recs.length, 1);
  assert.strictEqual(recs[0].severity, 'info');
  assert.ok(recs[0].text.includes('nominal'));
});

test('g1Recommendations flags full GC as critical', () => {
  const pauses = [{ type: 'Full', cause: 'Allocation Failure', evacuationFailure: false, humongousAllocation: false, durationMs: 100, uptimeS: 1, userS: 0.1, sysS: 0.01, realS: 0.1 }];
  const recs = g1Recommendations(pauses);
  assert.ok(recs.some(r => r.severity === 'critical' && r.text.includes('Full GC')));
});

test('g1Recommendations flags evacuation failure as critical', () => {
  const pauses = [{ type: 'Young', cause: '', evacuationFailure: true, humongousAllocation: false, durationMs: 50, uptimeS: 1, userS: 0.05, sysS: 0.01, realS: 0.05 }];
  const recs = g1Recommendations(pauses);
  assert.ok(recs.some(r => r.severity === 'critical' && r.text.includes('evacuation failure')));
});

test('g1Recommendations flags humongous allocations as warning when > 3', () => {
  const pauses = Array.from({ length: 5 }, (_, i) => ({ type: 'Young', cause: '', evacuationFailure: false, humongousAllocation: true, durationMs: 5, uptimeS: i + 1, userS: 0.01, sysS: 0.001, realS: 0.005 }));
  const recs = g1Recommendations(pauses);
  assert.ok(recs.some(r => r.severity === 'warning' && r.text.includes('humongous')));
});

test('g1Recommendations does not flag humongous when <= 3', () => {
  const pauses = Array.from({ length: 3 }, (_, i) => ({ type: 'Young', cause: '', evacuationFailure: false, humongousAllocation: true, durationMs: 5, uptimeS: i + 1, userS: 0.01, sysS: 0.001, realS: 0.005 }));
  const recs = g1Recommendations(pauses);
  assert.ok(!recs.some(r => r.text.includes('humongous')));
});

test('g1Recommendations flags high frequency', () => {
  const pauses = Array.from({ length: 30 }, (_, i) => ({ type: 'Young', cause: '', evacuationFailure: false, humongousAllocation: false, durationMs: 3, uptimeS: i * 0.3, userS: 0.01, sysS: 0.001, realS: 0.003 }));
  const recs = g1Recommendations(pauses);
  assert.ok(recs.some(r => r.severity === 'warning' && r.text.includes('frequency')));
});

test('g1Recommendations flags cpu starvation when > 2 pauses affected', () => {
  const pauses = Array.from({ length: 4 }, (_, i) => ({ type: 'Young', cause: '', evacuationFailure: false, humongousAllocation: false, durationMs: 10, uptimeS: i + 1, userS: 0.01, sysS: 0.01, realS: 0.50 }));
  const recs = g1Recommendations(pauses);
  assert.ok(recs.some(r => r.severity === 'warning' && r.text.includes('CPU starvation')));
});

test('g1Recommendations flags high sys when > 2 pauses affected', () => {
  const pauses = Array.from({ length: 4 }, (_, i) => ({ type: 'Young', cause: '', evacuationFailure: false, humongousAllocation: false, durationMs: 10, uptimeS: i + 1, userS: 0.02, sysS: 0.05, realS: 0.06 }));
  const recs = g1Recommendations(pauses);
  assert.ok(recs.some(r => r.severity === 'warning' && r.text.includes('Sys')));
});

test('g1Recommendations flags avg young GC latency when > 15ms with enough samples', () => {
  const pauses = Array.from({ length: 10 }, (_, i) => ({ type: 'Young', cause: '', evacuationFailure: false, humongousAllocation: false, durationMs: 20, uptimeS: i * 5, userS: 0.02, sysS: 0.001, realS: 0.02 }));
  const recs = g1Recommendations(pauses);
  assert.ok(recs.some(r => r.severity === 'info' && r.text.includes('young GC')));
});

test('g1Recommendations does not flag latency when avg <= 15ms', () => {
  const pauses = Array.from({ length: 10 }, (_, i) => ({ type: 'Young', cause: '', evacuationFailure: false, humongousAllocation: false, durationMs: 10, uptimeS: i * 5, userS: 0.01, sysS: 0.001, realS: 0.01 }));
  const recs = g1Recommendations(pauses);
  assert.ok(!recs.some(r => r.text.includes('young GC')));
});

// --- RECOMMENDED_JVM_LOGGING ---

test('RECOMMENDED_JVM_LOGGING is a non-empty string', () => {
  assert.strictEqual(typeof RECOMMENDED_JVM_LOGGING, 'string');
  assert.ok(RECOMMENDED_JVM_LOGGING.length > 0);
});

test('RECOMMENDED_JVM_LOGGING contains -Xlog', () => {
  assert.ok(RECOMMENDED_JVM_LOGGING.includes('-Xlog'));
});

test('RECOMMENDED_JVM_LOGGING includes gc and safepoint', () => {
  assert.ok(RECOMMENDED_JVM_LOGGING.includes('gc'));
  assert.ok(RECOMMENDED_JVM_LOGGING.includes('safepoint'));
});

// --- parseGcLog: GC id ---

test('parses GC event id', () => {
  const log = `[2024-01-01T00:00:00.000+0000][1.0s] GC(42) Pause Young (Normal) 2.0ms\n`;
  assert.strictEqual(parseGcLog(log).pauses[0].id, 42);
});

// --- parseGcLog: multi-line complete event ---

test('parses complete multi-line GC event', () => {
  const log = [
    '[2024-01-01T00:00:00.000+0000][10.0s] GC(5) Pause Young (G1 Evacuation Pause)',
    '[2024-01-01T00:00:00.000+0000][10.0s]   Eden: 50(50M)->0(50M) Survivors: 5(5M)->6(6M) Old: 20(20M)->22',
    '[2024-01-01T00:00:00.000+0000][10.0s]   Humongous: 3->2',
    '[2024-01-01T00:00:00.000+0000][10.0s]   800M->400M(2048M)',
    '[2024-01-01T00:00:00.000+0000][10.0s]   User=0.08s Sys=0.02s Real=0.04s',
    '[2024-01-01T00:00:00.000+0000][10.0s]   8.765ms',
    ''
  ].join('\n');
  const p = parseGcLog(log).pauses[0];
  assert.strictEqual(p.id, 5);
  assert.strictEqual(p.type, 'Young');
  assert.strictEqual(p.cause, 'G1 Evacuation Pause');
  assert.strictEqual(p.durationMs, 8.765);
  assert.strictEqual(p.heapBeforeMB, 800);
  assert.strictEqual(p.heapAfterMB, 400);
  assert.strictEqual(p.heapCapacityMB, 2048);
  assert.strictEqual(p.humongousBefore, 3);
  assert.strictEqual(p.humongousAfter, 2);
  assert.strictEqual(p.userS, 0.08);
  assert.strictEqual(p.sysS, 0.02);
  assert.strictEqual(p.realS, 0.04);
});
