import { test } from 'node:test';
import assert from 'node:assert';
import { defaultAlertRules, evaluateAlertRules } from '../../src/alerts.js';
import { socketMatchesAdvancedQuery } from '../../src/search.js';

// --- defaultAlertRules tests ---

test('defaultAlertRules returns an array', () => {
  assert.ok(Array.isArray(defaultAlertRules));
});

test('defaultAlertRules is non-empty', () => {
  assert.ok(defaultAlertRules.length > 0);
});

test('each rule has an id property', () => {
  for (const rule of defaultAlertRules) {
    assert.ok('id' in rule);
  }
});

test('each rule has a name property', () => {
  for (const rule of defaultAlertRules) {
    assert.ok('name' in rule);
  }
});

test('each rule has a metric property', () => {
  for (const rule of defaultAlertRules) {
    assert.ok('metric' in rule);
  }
});

test('each rule has an op property', () => {
  for (const rule of defaultAlertRules) {
    assert.ok('op' in rule);
  }
});

test('each rule has a value property', () => {
  for (const rule of defaultAlertRules) {
    assert.ok('value' in rule);
  }
});

test('each rule has a severity property', () => {
  for (const rule of defaultAlertRules) {
    assert.ok('severity' in rule);
  }
});

test('each rule has an enabled property', () => {
  for (const rule of defaultAlertRules) {
    assert.ok('enabled' in rule);
  }
});

test('each rule id is a string', () => {
  for (const rule of defaultAlertRules) {
    assert.strictEqual(typeof rule.id, 'string');
  }
});

test('each rule name is a string', () => {
  for (const rule of defaultAlertRules) {
    assert.strictEqual(typeof rule.name, 'string');
  }
});

test('each rule enabled is a boolean', () => {
  for (const rule of defaultAlertRules) {
    assert.strictEqual(typeof rule.enabled, 'boolean');
  }
});

// --- evaluateAlertRules tests ---

test('evaluateAlertRules returns alerts for matching socket with >= operator', () => {
  const rules = [{ id: 'r1', name: 'High RTT', metric: 'rtt', op: '>=', value: 100, severity: 'high', enabled: true }];
  const sockets = [{ rtt: 150 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.ok(alerts.length > 0);
});

test('evaluateAlertRules returns no alerts for non-matching socket with >= operator', () => {
  const rules = [{ id: 'r1', name: 'High RTT', metric: 'rtt', op: '>=', value: 100, severity: 'high', enabled: true }];
  const sockets = [{ rtt: 50 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.strictEqual(alerts.length, 0);
});

test('evaluateAlertRules skips disabled rules', () => {
  const rules = [{ id: 'r1', name: 'High RTT', metric: 'rtt', op: '>=', value: 100, severity: 'high', enabled: false }];
  const sockets = [{ rtt: 150 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.strictEqual(alerts.length, 0);
});

test('evaluateAlertRules handles <= operator matching', () => {
  const rules = [{ id: 'r2', name: 'Low BW', metric: 'bandwidth', op: '<=', value: 10, severity: 'warning', enabled: true }];
  const sockets = [{ bandwidth: 5 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.ok(alerts.length > 0);
});

test('evaluateAlertRules handles <= operator non-matching', () => {
  const rules = [{ id: 'r2', name: 'Low BW', metric: 'bandwidth', op: '<=', value: 10, severity: 'warning', enabled: true }];
  const sockets = [{ bandwidth: 20 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.strictEqual(alerts.length, 0);
});

test('evaluateAlertRules handles > operator matching', () => {
  const rules = [{ id: 'r3', name: 'Excess conns', metric: 'connections', op: '>', value: 50, severity: 'critical', enabled: true }];
  const sockets = [{ connections: 51 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.ok(alerts.length > 0);
});

test('evaluateAlertRules handles > operator boundary non-matching', () => {
  const rules = [{ id: 'r3', name: 'Excess conns', metric: 'connections', op: '>', value: 50, severity: 'critical', enabled: true }];
  const sockets = [{ connections: 50 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.strictEqual(alerts.length, 0);
});

test('evaluateAlertRules handles < operator matching', () => {
  const rules = [{ id: 'r4', name: 'Low uptime', metric: 'uptime', op: '<', value: 60, severity: 'warning', enabled: true }];
  const sockets = [{ uptime: 30 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.ok(alerts.length > 0);
});

test('evaluateAlertRules handles < operator non-matching', () => {
  const rules = [{ id: 'r4', name: 'Low uptime', metric: 'uptime', op: '<', value: 60, severity: 'warning', enabled: true }];
  const sockets = [{ uptime: 90 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.strictEqual(alerts.length, 0);
});

test('evaluateAlertRules handles == operator matching', () => {
  const rules = [{ id: 'r5', name: 'Exact match', metric: 'port', op: '==', value: 443, severity: 'info', enabled: true }];
  const sockets = [{ port: 443 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.ok(alerts.length > 0);
});

test('evaluateAlertRules handles == operator non-matching', () => {
  const rules = [{ id: 'r5', name: 'Exact match', metric: 'port', op: '==', value: 443, severity: 'info', enabled: true }];
  const sockets = [{ port: 80 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.strictEqual(alerts.length, 0);
});

test('evaluateAlertRules with multiple sockets returns correct count', () => {
  const rules = [{ id: 'r1', name: 'High RTT', metric: 'rtt', op: '>=', value: 100, severity: 'high', enabled: true }];
  const sockets = [{ rtt: 150 }, { rtt: 50 }, { rtt: 200 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.strictEqual(alerts.length, 2);
});

test('evaluateAlertRules with multiple rules evaluates all enabled', () => {
  const rules = [
    { id: 'r1', name: 'High RTT', metric: 'rtt', op: '>=', value: 100, severity: 'high', enabled: true },
    { id: 'r2', name: 'High port', metric: 'port', op: '>', value: 1000, severity: 'info', enabled: true },
  ];
  const sockets = [{ rtt: 150, port: 8080 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.strictEqual(alerts.length, 2);
});

test('evaluateAlertRules returns empty array for empty sockets', () => {
  const rules = [{ id: 'r1', name: 'High RTT', metric: 'rtt', op: '>=', value: 100, severity: 'high', enabled: true }];
  const alerts = evaluateAlertRules(rules, []);
  assert.strictEqual(alerts.length, 0);
});

test('evaluateAlertRules returns empty array for empty rules', () => {
  const sockets = [{ rtt: 150 }];
  const alerts = evaluateAlertRules([], sockets);
  assert.strictEqual(alerts.length, 0);
});

test('evaluateAlertRules alert contains rule id', () => {
  const rules = [{ id: 'r1', name: 'High RTT', metric: 'rtt', op: '>=', value: 100, severity: 'high', enabled: true }];
  const sockets = [{ rtt: 150 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.ok(alerts[0].id !== undefined || alerts[0].ruleId !== undefined);
});

test('evaluateAlertRules >= boundary value matches', () => {
  const rules = [{ id: 'r1', name: 'High RTT', metric: 'rtt', op: '>=', value: 100, severity: 'high', enabled: true }];
  const sockets = [{ rtt: 100 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.ok(alerts.length > 0);
});

test('evaluateAlertRules <= boundary value matches', () => {
  const rules = [{ id: 'r2', name: 'Low BW', metric: 'bandwidth', op: '<=', value: 10, severity: 'warning', enabled: true }];
  const sockets = [{ bandwidth: 10 }];
  const alerts = evaluateAlertRules(rules, sockets);
  assert.ok(alerts.length > 0);
});

// --- socketMatchesAdvancedQuery tests ---

test('socketMatchesAdvancedQuery matches state:ESTAB', () => {
  const socket = { state: 'ESTAB', port: 80, process: 'nginx', rtt: 50, risk: 'low' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'state:ESTAB'), true);
});

test('socketMatchesAdvancedQuery does not match wrong state', () => {
  const socket = { state: 'LISTEN', port: 80, process: 'nginx', rtt: 50, risk: 'low' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'state:ESTAB'), false);
});

test('socketMatchesAdvancedQuery matches port:443', () => {
  const socket = { state: 'ESTAB', port: 443, process: 'nginx', rtt: 50, risk: 'low' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'port:443'), true);
});

test('socketMatchesAdvancedQuery does not match wrong port', () => {
  const socket = { state: 'ESTAB', port: 80, process: 'nginx', rtt: 50, risk: 'low' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'port:443'), false);
});

test('socketMatchesAdvancedQuery matches risk>=high', () => {
  const socket = { state: 'ESTAB', port: 443, process: 'nginx', rtt: 50, risk: 'high' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'risk>=high'), true);
});

test('socketMatchesAdvancedQuery does not match risk>=high for low risk', () => {
  const socket = { state: 'ESTAB', port: 443, process: 'nginx', rtt: 50, risk: 'low' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'risk>=high'), false);
});

test('socketMatchesAdvancedQuery matches process:nginx', () => {
  const socket = { state: 'ESTAB', port: 80, process: 'nginx', rtt: 50, risk: 'low' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'process:nginx'), true);
});

test('socketMatchesAdvancedQuery does not match wrong process', () => {
  const socket = { state: 'ESTAB', port: 80, process: 'apache', rtt: 50, risk: 'low' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'process:nginx'), false);
});

test('socketMatchesAdvancedQuery matches rtt>100', () => {
  const socket = { state: 'ESTAB', port: 80, process: 'nginx', rtt: 150, risk: 'low' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'rtt>100'), true);
});

test('socketMatchesAdvancedQuery does not match rtt>100 when rtt is low', () => {
  const socket = { state: 'ESTAB', port: 80, process: 'nginx', rtt: 50, risk: 'low' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'rtt>100'), false);
});

test('socketMatchesAdvancedQuery rtt>100 boundary does not match exactly 100', () => {
  const socket = { state: 'ESTAB', port: 80, process: 'nginx', rtt: 100, risk: 'low' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'rtt>100'), false);
});

test('socketMatchesAdvancedQuery matches combined query state:ESTAB port:443', () => {
  const socket = { state: 'ESTAB', port: 443, process: 'nginx', rtt: 50, risk: 'low' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'state:ESTAB port:443'), true);
});

test('socketMatchesAdvancedQuery combined query fails if one part does not match', () => {
  const socket = { state: 'LISTEN', port: 443, process: 'nginx', rtt: 50, risk: 'low' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'state:ESTAB port:443'), false);
});

test('socketMatchesAdvancedQuery empty query matches all sockets', () => {
  const socket = { state: 'ESTAB', port: 80, process: 'nginx', rtt: 50, risk: 'low' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, ''), true);
});

test('socketMatchesAdvancedQuery handles invalid query gracefully', () => {
  const socket = { state: 'ESTAB', port: 80, process: 'nginx', rtt: 50, risk: 'low' };
  const result = socketMatchesAdvancedQuery(socket, '!!!invalid:::');
  assert.strictEqual(typeof result, 'boolean');
});

test('socketMatchesAdvancedQuery matches risk>=critical', () => {
  const socket = { state: 'ESTAB', port: 443, process: 'nginx', rtt: 50, risk: 'critical' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'risk>=critical'), true);
});

test('socketMatchesAdvancedQuery combined query with rtt and state', () => {
  const socket = { state: 'ESTAB', port: 80, process: 'nginx', rtt: 200, risk: 'low' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'state:ESTAB rtt>100'), true);
});

test('socketMatchesAdvancedQuery combined query with process and port', () => {
  const socket = { state: 'ESTAB', port: 443, process: 'nginx', rtt: 50, risk: 'low' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'process:nginx port:443'), true);
});

test('socketMatchesAdvancedQuery combined three terms all matching', () => {
  const socket = { state: 'ESTAB', port: 443, process: 'nginx', rtt: 200, risk: 'high' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'state:ESTAB port:443 rtt>100'), true);
});

test('socketMatchesAdvancedQuery combined three terms one failing', () => {
  const socket = { state: 'ESTAB', port: 80, process: 'nginx', rtt: 200, risk: 'high' };
  assert.strictEqual(socketMatchesAdvancedQuery(socket, 'state:ESTAB port:443 rtt>100'), false);
});
