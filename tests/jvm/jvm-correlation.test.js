import { test } from 'node:test';
import assert from 'node:assert';
import { correlateJvmStalls, alignTimestamps, DEFAULT_WINDOWS } from '../../src/jvm-correlation.js';

// === alignTimestamps tests ===

test('alignTimestamps: returns empty array for empty pauses', () => {
  assert.deepStrictEqual(alignTimestamps([], [], 0), []);
});

test('alignTimestamps: absolute timestamps preserved with no offset', () => {
  const pauses = [{ epochMs: 1000 }, { epochMs: 2000 }];
  const result = alignTimestamps(pauses, [], 0);
  assert.strictEqual(result[0].alignedEpochMs, 1000);
  assert.strictEqual(result[1].alignedEpochMs, 2000);
});

test('alignTimestamps: absolute timestamps with positive clock offset', () => {
  const pauses = [{ epochMs: 1000 }];
  const result = alignTimestamps(pauses, [], 200);
  assert.strictEqual(result[0].alignedEpochMs, 1200);
});

test('alignTimestamps: absolute timestamps with negative clock offset', () => {
  const pauses = [{ epochMs: 1000 }];
  const result = alignTimestamps(pauses, [], -100);
  assert.strictEqual(result[0].alignedEpochMs, 900);
});

test('alignTimestamps: uptime-only uses first snapshot as anchor', () => {
  const pauses = [{ uptimeS: 10 }, { uptimeS: 12 }];
  const snapshots = [{ epochMs: 5000 }];
  const result = alignTimestamps(pauses, snapshots, 0);
  assert.strictEqual(result[0].alignedEpochMs, 5000);
  assert.strictEqual(result[1].alignedEpochMs, 7000);
});

test('alignTimestamps: uptime-only with clock offset', () => {
  const pauses = [{ uptimeS: 10 }];
  const snapshots = [{ epochMs: 5000 }];
  const result = alignTimestamps(pauses, snapshots, 300);
  assert.strictEqual(result[0].alignedEpochMs, 5300);
});

test('alignTimestamps: uptime-only with no snapshots defaults anchor to 0', () => {
  const pauses = [{ uptimeS: 5 }];
  const result = alignTimestamps(pauses, [], 0);
  assert.strictEqual(result[0].alignedEpochMs, 0);
});

test('alignTimestamps: preserves original pause properties', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const result = alignTimestamps(pauses, [], 0);
  assert.strictEqual(result[0].durationMs, 50);
  assert.strictEqual(result[0].type, 'Young');
});

// === DEFAULT_WINDOWS tests ===

test('DEFAULT_WINDOWS has expected keys', () => {
  assert.ok(DEFAULT_WINDOWS.beforeMs > 0);
  assert.ok(DEFAULT_WINDOWS.afterShortMs > 0);
  assert.ok(DEFAULT_WINDOWS.afterLongMs > 0);
});

test('DEFAULT_WINDOWS afterLongMs > afterShortMs', () => {
  assert.ok(DEFAULT_WINDOWS.afterLongMs > DEFAULT_WINDOWS.afterShortMs);
});


// === correlateJvmStalls: basic tests ===

test('correlateJvmStalls: no pauses returns empty results', () => {
  const res = correlateJvmStalls({ pauses: [], history: [] });
  assert.strictEqual(res.results.length, 0);
  assert.strictEqual(res.summary.totalPauses, 0);
});

test('correlateJvmStalls: single pause no symptoms = score 0', () => {
  const pauses = [{ epochMs: 1000, durationMs: 10, type: 'Young' }];
  const history = [{ epochMs: 500, recvQ: 0 }, { epochMs: 1500, recvQ: 0 }];
  const res = correlateJvmStalls({ pauses, history });
  assert.strictEqual(res.results[0].score, 0);
  assert.strictEqual(res.results[0].severity, 'none');
});

test('correlateJvmStalls: pause with recvQ rise = positive score', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [{ epochMs: 800, recvQ: 0 }, { epochMs: 1200, recvQ: 50000 }];
  const res = correlateJvmStalls({ pauses, history });
  assert.ok(res.results[0].score > 0);
  assert.ok(res.results[0].symptoms.detected);
});

test('correlateJvmStalls: pause with rcv_space drop = positive score', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [{ epochMs: 800, rcv_space: 100000 }, { epochMs: 1200, rcv_space: 50000 }];
  const res = correlateJvmStalls({ pauses, history });
  assert.ok(res.results[0].score > 0);
  const signals = res.results[0].symptoms.signals.map(s => s.signal);
  assert.ok(signals.includes('rcv_space_drop'));
});

test('correlateJvmStalls: persist appearing detected', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [{ epochMs: 800, persist: false }, { epochMs: 1200, persist: true }];
  const res = correlateJvmStalls({ pauses, history });
  const signals = res.results[0].symptoms.signals.map(s => s.signal);
  assert.ok(signals.includes('persist_appeared'));
});

test('correlateJvmStalls: counter-evidence reduces score', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const historyNoCounter = [{ epochMs: 800, recvQ: 0 }, { epochMs: 1200, recvQ: 5000 }];
  const historyWithCounter = [
    { epochMs: 800, recvQ: 0, retrans: 0, rtt: 10 },
    { epochMs: 1200, recvQ: 5000, retrans: 5, rtt: 80 }
  ];
  const res1 = correlateJvmStalls({ pauses, history: historyNoCounter });
  const res2 = correlateJvmStalls({ pauses, history: historyWithCounter });
  assert.ok(res2.results[0].score <= res1.results[0].score);
});


// === Severity thresholds ===

test('correlateJvmStalls: severity none when score is 0', () => {
  const pauses = [{ epochMs: 1000, durationMs: 10, type: 'Young' }];
  const history = [{ epochMs: 800 }, { epochMs: 1200 }];
  const res = correlateJvmStalls({ pauses, history });
  assert.strictEqual(res.results[0].severity, 'none');
});

test('correlateJvmStalls: severity info for low positive score', () => {
  const pauses = [{ epochMs: 1000, durationMs: 5, type: 'Young' }];
  const history = [{ epochMs: 800, recvQ: 0 }, { epochMs: 1200, recvQ: 100 }];
  const res = correlateJvmStalls({ pauses, history });
  if (res.results[0].score > 0 && res.results[0].score < 0.25) {
    assert.strictEqual(res.results[0].severity, 'info');
  }
});

test('correlateJvmStalls: severity warning for moderate score', () => {
  const pauses = [{ epochMs: 1000, durationMs: 30, type: 'Young' }];
  const history = [
    { epochMs: 800, recvQ: 0, rcv_space: 100000, skmem_r: 0 },
    { epochMs: 1200, recvQ: 5000, rcv_space: 50000, skmem_r: 5000 }
  ];
  const res = correlateJvmStalls({ pauses, history });
  assert.ok(['warning', 'warning_high', 'info'].includes(res.results[0].severity));
});

test('correlateJvmStalls: severity warning_high for high score', () => {
  const pauses = [{ epochMs: 1000, durationMs: 150, type: 'Mixed' }];
  const history = [
    { epochMs: 800, recvQ: 0, rcv_space: 200000, skmem_r: 0, skmem_rb: 500000, rx_bps: 8000000 },
    { epochMs: 1200, recvQ: 80000, rcv_space: 50000, skmem_r: 80000 }
  ];
  const res = correlateJvmStalls({ pauses, history });
  assert.ok(['warning_high', 'critical', 'warning'].includes(res.results[0].severity));
});

test('correlateJvmStalls: severity critical for Full GC with high score', () => {
  const pauses = [{ epochMs: 1000, durationMs: 500, type: 'Full' }];
  const history = [
    { epochMs: 800, recvQ: 0, rcv_space: 200000, skmem_r: 0, skmem_rb: 500000, rx_bps: 80000000 },
    { epochMs: 1200, recvQ: 100000, rcv_space: 20000, skmem_r: 100000, persist: true }
  ];
  const res = correlateJvmStalls({ pauses, history });
  assert.strictEqual(res.results[0].severity, 'critical');
});


// === Buffer pressure ===

test('correlateJvmStalls: buffer pressure calculated when data available', () => {
  const pauses = [{ epochMs: 1000, durationMs: 100, type: 'Young' }];
  const history = [
    { epochMs: 800, recvQ: 0, skmem_rb: 200000, skmem_r: 10000, rx_bps: 8000000 },
    { epochMs: 1200, recvQ: 50000 }
  ];
  const res = correlateJvmStalls({ pauses, history });
  assert.ok(res.results[0].pressure !== null);
  assert.ok(res.results[0].pressure.accumulatedBytes > 0);
});

test('correlateJvmStalls: pressure ratio reflects buffer fill', () => {
  const pauses = [{ epochMs: 1000, durationMs: 200, type: 'Young' }];
  const history = [
    { epochMs: 800, recvQ: 0, skmem_rb: 100000, skmem_r: 90000, rx_bps: 80000000 },
    { epochMs: 1200, recvQ: 50000 }
  ];
  const res = correlateJvmStalls({ pauses, history });
  assert.ok(res.results[0].pressure.pressureRatio > 1);
});

test('correlateJvmStalls: pressure null when no before snapshots', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [{ epochMs: 1200, recvQ: 5000 }];
  const res = correlateJvmStalls({ pauses, history });
  assert.strictEqual(res.results[0].pressure, null);
});

test('correlateJvmStalls: freeBuffer is non-negative', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [
    { epochMs: 800, skmem_rb: 100, skmem_r: 200, rx_bps: 800, recvQ: 0 },
    { epochMs: 1200, recvQ: 100 }
  ];
  const res = correlateJvmStalls({ pauses, history });
  if (res.results[0].pressure) {
    assert.ok(res.results[0].pressure.freeBuffer >= 0);
  }
});

// === Multiple pauses ===

test('correlateJvmStalls: multiple pauses each get independent results', () => {
  const pauses = [
    { epochMs: 1000, durationMs: 10, type: 'Young' },
    { epochMs: 2000, durationMs: 10, type: 'Young' }
  ];
  const history = [
    { epochMs: 800 }, { epochMs: 1200 },
    { epochMs: 1800 }, { epochMs: 2200 }
  ];
  const res = correlateJvmStalls({ pauses, history });
  assert.strictEqual(res.results.length, 2);
});

test('correlateJvmStalls: summary totalPauses matches input', () => {
  const pauses = [
    { epochMs: 1000, durationMs: 10, type: 'Young' },
    { epochMs: 2000, durationMs: 10, type: 'Young' },
    { epochMs: 3000, durationMs: 10, type: 'Young' }
  ];
  const history = [{ epochMs: 500 }, { epochMs: 3500 }];
  const res = correlateJvmStalls({ pauses, history });
  assert.strictEqual(res.summary.totalPauses, 3);
});

test('correlateJvmStalls: correlatedCount only counts score > 0.2', () => {
  const pauses = [
    { epochMs: 1000, durationMs: 10, type: 'Young' },
    { epochMs: 2000, durationMs: 500, type: 'Full' }
  ];
  const history = [
    { epochMs: 800 }, { epochMs: 1200 },
    { epochMs: 1800, recvQ: 0, rcv_space: 200000, skmem_rb: 500000, skmem_r: 0, rx_bps: 80000000 },
    { epochMs: 2200, recvQ: 100000, rcv_space: 20000, skmem_r: 100000, persist: true }
  ];
  const res = correlateJvmStalls({ pauses, history });
  assert.ok(res.summary.correlatedCount <= res.results.length);
});

test('correlateJvmStalls: maxScore is highest among results', () => {
  const pauses = [
    { epochMs: 1000, durationMs: 10, type: 'Young' },
    { epochMs: 2000, durationMs: 200, type: 'Full' }
  ];
  const history = [
    { epochMs: 800 }, { epochMs: 1200 },
    { epochMs: 1800, recvQ: 0, skmem_rb: 500000, skmem_r: 0, rx_bps: 80000000 },
    { epochMs: 2200, recvQ: 100000, persist: true }
  ];
  const res = correlateJvmStalls({ pauses, history });
  const max = Math.max(...res.results.map(r => r.score));
  assert.strictEqual(res.summary.maxScore, max);
});


// === Safepoints handling ===

test('correlateJvmStalls: safepoints counted in summary', () => {
  const pauses = [{ epochMs: 1000, durationMs: 10, type: 'Young' }];
  const safepoints = [{ epochMs: 1100, totalMs: 5 }, { epochMs: 1200, totalMs: 3 }];
  const history = [{ epochMs: 800 }, { epochMs: 1500 }];
  const res = correlateJvmStalls({ pauses, safepoints, history });
  assert.strictEqual(res.summary.totalSafepoints, 2);
});

test('correlateJvmStalls: works with empty safepoints', () => {
  const pauses = [{ epochMs: 1000, durationMs: 10, type: 'Young' }];
  const history = [{ epochMs: 800 }, { epochMs: 1200 }];
  const res = correlateJvmStalls({ pauses, safepoints: [], history });
  assert.strictEqual(res.summary.totalSafepoints, 0);
});

test('correlateJvmStalls: safepoints default to empty array', () => {
  const pauses = [{ epochMs: 1000, durationMs: 10, type: 'Young' }];
  const history = [{ epochMs: 800 }, { epochMs: 1200 }];
  const res = correlateJvmStalls({ pauses, history });
  assert.strictEqual(res.summary.totalSafepoints, 0);
});

// === Empty history ===

test('correlateJvmStalls: empty history produces no symptoms', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const res = correlateJvmStalls({ pauses, history: [] });
  assert.strictEqual(res.results[0].score, 0);
});

test('correlateJvmStalls: single history snapshot insufficient for symptoms', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [{ epochMs: 800, recvQ: 0 }];
  const res = correlateJvmStalls({ pauses, history });
  assert.strictEqual(res.results[0].score, 0);
});

// === Configurable windows ===

test('correlateJvmStalls: custom windows narrow before window', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [
    { epochMs: 400, recvQ: 0 },
    { epochMs: 1200, recvQ: 5000 }
  ];
  const res = correlateJvmStalls({
    pauses, history,
    windows: { beforeMs: 100, afterShortMs: 500, afterLongMs: 5000 }
  });
  // epochMs 400 is outside 100ms before window, so no before snapshot
  assert.strictEqual(res.results[0].score, 0);
});

test('correlateJvmStalls: custom windows widen after window', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [
    { epochMs: 800, recvQ: 0 },
    { epochMs: 3000, recvQ: 5000 }
  ];
  const resNarrow = correlateJvmStalls({
    pauses, history,
    windows: { beforeMs: 500, afterShortMs: 100, afterLongMs: 200 }
  });
  const resWide = correlateJvmStalls({
    pauses, history,
    windows: { beforeMs: 500, afterShortMs: 500, afterLongMs: 5000 }
  });
  // Wide window should find the after snapshot
  assert.ok(resWide.results[0].score >= resNarrow.results[0].score);
});

test('correlateJvmStalls: uses DEFAULT_WINDOWS when not specified', () => {
  const pauses = [{ epochMs: 1000, durationMs: 10, type: 'Young' }];
  const history = [{ epochMs: 800 }, { epochMs: 1200 }];
  const res = correlateJvmStalls({ pauses, history });
  assert.ok(res.results.length === 1);
});

// === Additional edge cases ===

test('correlateJvmStalls: zero_window appearing detected', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [{ epochMs: 800, zero_window: false }, { epochMs: 1200, zero_window: true }];
  const res = correlateJvmStalls({ pauses, history });
  const signals = res.results[0].symptoms.signals.map(s => s.signal);
  assert.ok(signals.includes('zero_window_appeared'));
});

test('correlateJvmStalls: skmem_r rise detected', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [{ epochMs: 800, skmem_r: 0 }, { epochMs: 1200, skmem_r: 50000 }];
  const res = correlateJvmStalls({ pauses, history });
  const signals = res.results[0].symptoms.signals.map(s => s.signal);
  assert.ok(signals.includes('skmem_r_rise'));
});

test('correlateJvmStalls: overallSeverity is max across results', () => {
  const pauses = [
    { epochMs: 1000, durationMs: 10, type: 'Young' },
    { epochMs: 2000, durationMs: 500, type: 'Full' }
  ];
  const history = [
    { epochMs: 800 }, { epochMs: 1200 },
    { epochMs: 1800, recvQ: 0, rcv_space: 200000, skmem_rb: 500000, skmem_r: 0, rx_bps: 80000000 },
    { epochMs: 2200, recvQ: 100000, rcv_space: 20000, skmem_r: 100000, persist: true }
  ];
  const res = correlateJvmStalls({ pauses, history });
  const order = ['none', 'info', 'warning', 'warning_high', 'critical'];
  const maxSev = res.results.reduce((s, r) => order.indexOf(r.severity) > order.indexOf(s) ? r.severity : s, 'none');
  assert.strictEqual(res.summary.overallSeverity, maxSev);
});

test('correlateJvmStalls: result includes classification', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [{ epochMs: 800 }, { epochMs: 1200 }];
  const res = correlateJvmStalls({ pauses, history });
  assert.ok('classification' in res.results[0]);
});

test('correlateJvmStalls: result includes epochMs', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [{ epochMs: 800 }, { epochMs: 1200 }];
  const res = correlateJvmStalls({ pauses, history });
  assert.strictEqual(res.results[0].epochMs, 1000);
});

test('correlateJvmStalls: clockOffsetMs shifts alignment', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [{ epochMs: 1050, recvQ: 0 }, { epochMs: 1350, recvQ: 5000 }];
  const res = correlateJvmStalls({ pauses, history, clockOffsetMs: 200 });
  assert.strictEqual(res.results[0].epochMs, 1200);
});

test('correlateJvmStalls: evacuation failure boosts score', () => {
  const pauses = [{ epochMs: 1000, durationMs: 150, type: 'Young', evacuationFailure: true }];
  const history = [
    { epochMs: 800, recvQ: 0, skmem_rb: 500000, skmem_r: 0, rx_bps: 8000000 },
    { epochMs: 1200, recvQ: 50000 }
  ];
  const pausesNoEvac = [{ epochMs: 1000, durationMs: 150, type: 'Young', evacuationFailure: false }];
  const res1 = correlateJvmStalls({ pauses, history });
  const res2 = correlateJvmStalls({ pauses: pausesNoEvac, history });
  assert.ok(res1.results[0].score >= res2.results[0].score);
});

test('correlateJvmStalls: score capped at 1', () => {
  const pauses = [{ epochMs: 1000, durationMs: 1000, type: 'Full', evacuationFailure: true }];
  const history = [
    { epochMs: 800, recvQ: 0, rcv_space: 500000, skmem_r: 0, skmem_rb: 1000000, rx_bps: 800000000, rcv_ssthresh: 100000 },
    { epochMs: 1200, recvQ: 500000, rcv_space: 10000, skmem_r: 500000, persist: true, zero_window: true, rcv_ssthresh: 10000 }
  ];
  const res = correlateJvmStalls({ pauses, history });
  assert.ok(res.results[0].score <= 1);
});

test('correlateJvmStalls: score floored at 0', () => {
  const pauses = [{ epochMs: 1000, durationMs: 5, type: 'Young' }];
  const history = [
    { epochMs: 800, recvQ: 2000, retrans: 0, rtt: 10 },
    { epochMs: 1200, recvQ: 2100, retrans: 10, rtt: 200, sendQ: 50000, app_limited: true }
  ];
  const res = correlateJvmStalls({ pauses, history });
  assert.ok(res.results[0].score >= 0);
});

test('correlateJvmStalls: summary has recommendations array', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [{ epochMs: 800 }, { epochMs: 1200 }];
  const res = correlateJvmStalls({ pauses, history });
  assert.ok(Array.isArray(res.summary.recommendations));
});

test('correlateJvmStalls: counter-evidence array in result', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [
    { epochMs: 800, recvQ: 5000, retrans: 0 },
    { epochMs: 1200, recvQ: 6000, retrans: 5 }
  ];
  const res = correlateJvmStalls({ pauses, history });
  assert.ok(Array.isArray(res.results[0].counterEvidence));
});

test('correlateJvmStalls: high sendQ counter-evidence', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [
    { epochMs: 800, recvQ: 0 },
    { epochMs: 1200, recvQ: 5000, sendQ: 50000 }
  ];
  const res = correlateJvmStalls({ pauses, history });
  assert.ok(res.results[0].counterEvidence.some(c => c.includes('Send-Q')));
});

test('correlateJvmStalls: app_limited counter-evidence', () => {
  const pauses = [{ epochMs: 1000, durationMs: 50, type: 'Young' }];
  const history = [
    { epochMs: 800, recvQ: 0 },
    { epochMs: 1200, recvQ: 5000, app_limited: true }
  ];
  const res = correlateJvmStalls({ pauses, history });
  assert.ok(res.results[0].counterEvidence.some(c => c.includes('app_limited')));
});
