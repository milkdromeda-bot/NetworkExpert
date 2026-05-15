import { test } from 'node:test';
import assert from 'node:assert';
import { commandCoverage, toggleCommandOption } from '../../src/ss-command.js';
import {
  validateIpv4Address,
  validateIpv6Address,
  validateIpAddress,
  validateTcpUdpPort,
  validateIntervalSeconds,
  validateSsCommandConfig
} from '../../src/ss-command-validation.js';

const opts = (shorts) => shorts.map(s => [s, '', '', '']);
const longOpts = (longs) => longs.map(l => ['', l, '', '']);

// commandCoverage — single short options
test('commandCoverage detects -t', () => {
  const r = commandCoverage('ss -t', opts(['-t']));
  assert.strictEqual(r[0].active, true);
});

test('commandCoverage detects -n', () => {
  const r = commandCoverage('ss -n', opts(['-n']));
  assert.strictEqual(r[0].active, true);
});

test('commandCoverage detects -H', () => {
  const r = commandCoverage('ss -H', opts(['-H']));
  assert.strictEqual(r[0].active, true);
});

test('commandCoverage detects -O', () => {
  const r = commandCoverage('ss -O', opts(['-O']));
  assert.strictEqual(r[0].active, true);
});

test('commandCoverage detects -e', () => {
  const r = commandCoverage('ss -e', opts(['-e']));
  assert.strictEqual(r[0].active, true);
});

test('commandCoverage detects -p', () => {
  const r = commandCoverage('ss -p', opts(['-p']));
  assert.strictEqual(r[0].active, true);
});

test('commandCoverage detects -m', () => {
  const r = commandCoverage('ss -m', opts(['-m']));
  assert.strictEqual(r[0].active, true);
});

test('commandCoverage detects -i', () => {
  const r = commandCoverage('ss -i', opts(['-i']));
  assert.strictEqual(r[0].active, true);
});

test('commandCoverage detects --tos', () => {
  const r = commandCoverage('ss --tos', longOpts(['--tos']));
  assert.strictEqual(r[0].active, true);
});

test('commandCoverage detects --cgroup', () => {
  const r = commandCoverage('ss --cgroup', longOpts(['--cgroup']));
  assert.strictEqual(r[0].active, true);
});

test('commandCoverage detects --inet-sockopt', () => {
  const r = commandCoverage('ss --inet-sockopt', longOpts(['--inet-sockopt']));
  assert.strictEqual(r[0].active, true);
});

test('commandCoverage detects -a', () => {
  const r = commandCoverage('ss -a', opts(['-a']));
  assert.strictEqual(r[0].active, true);
});

test('commandCoverage detects -A', () => {
  const r = commandCoverage('ss -A all', opts(['-A']));
  assert.strictEqual(r[0].active, true);
});

// commandCoverage — combined options
test('commandCoverage detects combined -tn as -t and -n', () => {
  const r = commandCoverage('ss -tn', opts(['-t', '-n']));
  assert.strictEqual(r[0].active, true);
  assert.strictEqual(r[1].active, true);
});

test('commandCoverage detects combined -HOntepmi', () => {
  const flags = ['-H', '-O', '-n', '-t', '-e', '-p', '-m', '-i'];
  const r = commandCoverage('ss -HOntepmi', opts(flags));
  r.forEach((item, i) => assert.strictEqual(item.active, true, `${flags[i]} should be active`));
});

test('commandCoverage marks missing option as inactive', () => {
  const r = commandCoverage('ss -t', opts(['-n']));
  assert.strictEqual(r[0].active, false);
});

test('commandCoverage handles empty command', () => {
  const r = commandCoverage('', opts(['-t', '-n']));
  assert.strictEqual(r[0].active, false);
  assert.strictEqual(r[1].active, false);
});

test('commandCoverage returns desc and group from options', () => {
  const r = commandCoverage('ss -t', [['-t', '--tcp', 'TCP sockets', 'protocol']]);
  assert.strictEqual(r[0].desc, 'TCP sockets');
  assert.strictEqual(r[0].group, 'protocol');
});

test('commandCoverage matches long option when short is absent', () => {
  const r = commandCoverage('ss --tos', [['-T', '--tos', '', '']]);
  assert.strictEqual(r[0].active, true);
});

// toggleCommandOption — adding options
test('toggleCommandOption adds option when missing', () => {
  const r = toggleCommandOption('ss -t', '-n', true);
  assert.ok(r.includes('-n'));
});

test('toggleCommandOption does not duplicate existing option', () => {
  const r = toggleCommandOption('ss -t -n', '-n', true);
  assert.strictEqual(r.split('-n').length - 1, 1);
});

test('toggleCommandOption removes option when disabled', () => {
  const r = toggleCommandOption('ss -t -n', '-n', false);
  assert.ok(!r.includes('-n'));
});

test('toggleCommandOption handles long option --tos add', () => {
  const r = toggleCommandOption('ss -t', '--tos', true);
  assert.ok(r.includes('--tos'));
});

test('toggleCommandOption handles long option --tos remove', () => {
  const r = toggleCommandOption('ss -t --tos', '--tos', false);
  assert.ok(!r.includes('--tos'));
});

test('toggleCommandOption handles -A with argument', () => {
  const r = toggleCommandOption('ss -t', '-A', true);
  assert.ok(r.includes('-A'));
});

test('toggleCommandOption preserves other tokens when removing', () => {
  const r = toggleCommandOption('ss -t -n -e', '-n', false);
  assert.ok(r.includes('-t'));
  assert.ok(r.includes('-e'));
});

test('toggleCommandOption on empty command creates ss with option', () => {
  const r = toggleCommandOption('', '-t', true);
  assert.ok(r.includes('ss'));
  assert.ok(r.includes('-t'));
});

test('toggleCommandOption toggle off non-existent option is no-op', () => {
  const r = toggleCommandOption('ss -t', '-z', false);
  assert.ok(r.includes('-t'));
});

// Validation — validateIpv4Address
test('validateIpv4Address accepts valid address', () => {
  assert.strictEqual(validateIpv4Address('192.168.1.1'), true);
});

test('validateIpv4Address rejects too few octets', () => {
  assert.strictEqual(validateIpv4Address('192.168.1'), false);
});

test('validateIpv4Address rejects octet > 255', () => {
  assert.strictEqual(validateIpv4Address('256.0.0.1'), false);
});

test('validateIpv4Address accepts empty string', () => {
  assert.strictEqual(validateIpv4Address(''), true);
});

// Validation — validateIpv6Address
test('validateIpv6Address accepts full address', () => {
  assert.strictEqual(validateIpv6Address('2001:0db8:85a3:0000:0000:8a2e:0370:7334'), true);
});

test('validateIpv6Address accepts compressed address', () => {
  assert.strictEqual(validateIpv6Address('::1'), true);
});

test('validateIpv6Address rejects double compression', () => {
  assert.strictEqual(validateIpv6Address('2001::85a3::7334'), false);
});

test('validateIpv6Address rejects invalid hextet', () => {
  assert.strictEqual(validateIpv6Address('2001:0db8:85a3:0000:0000:8a2e:0370:ZZZZ'), false);
});

// Validation — validateIpAddress
test('validateIpAddress returns valid for good IPv4', () => {
  const r = validateIpAddress('10.0.0.1');
  assert.strictEqual(r.valid, true);
});

test('validateIpAddress returns invalid with message for bad IP', () => {
  const r = validateIpAddress('999.999.999.999');
  assert.strictEqual(r.valid, false);
  assert.ok(r.message.length > 0);
});

// Validation — validateTcpUdpPort
test('validateTcpUdpPort accepts port 80', () => {
  const r = validateTcpUdpPort('80');
  assert.strictEqual(r.valid, true);
});

test('validateTcpUdpPort rejects port 0', () => {
  const r = validateTcpUdpPort('0');
  assert.strictEqual(r.valid, false);
});

test('validateTcpUdpPort rejects port 70000', () => {
  const r = validateTcpUdpPort('70000');
  assert.strictEqual(r.valid, false);
});

test('validateTcpUdpPort rejects non-numeric', () => {
  const r = validateTcpUdpPort('abc');
  assert.strictEqual(r.valid, false);
});

test('validateTcpUdpPort accepts empty string', () => {
  const r = validateTcpUdpPort('');
  assert.strictEqual(r.valid, true);
});

// Validation — validateIntervalSeconds
test('validateIntervalSeconds accepts 1', () => {
  const r = validateIntervalSeconds('1');
  assert.strictEqual(r.valid, true);
});

test('validateIntervalSeconds rejects 0', () => {
  const r = validateIntervalSeconds('0');
  assert.strictEqual(r.valid, false);
});

test('validateIntervalSeconds rejects 100000', () => {
  const r = validateIntervalSeconds('100000');
  assert.strictEqual(r.valid, false);
});

test('validateIntervalSeconds warns on very small interval', () => {
  const r = validateIntervalSeconds('0.005');
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.level, 'warning');
});

// Validation — validateSsCommandConfig
test('validateSsCommandConfig returns valid for empty config', () => {
  const r = validateSsCommandConfig({});
  assert.strictEqual(r.valid, true);
});

test('validateSsCommandConfig returns errors for bad srcIp', () => {
  const r = validateSsCommandConfig({ srcIp: '999.0.0.1' });
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.length > 0);
});

test('validateSsCommandConfig validates multiple fields', () => {
  const r = validateSsCommandConfig({ srcPort: 'abc', dstPort: '99999' });
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.errors.length, 2);
});
