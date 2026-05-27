import assert from "node:assert/strict";
import { test } from "node:test";

import {
  renderSsCommandBuilder,
  renderSsOptionChip,
  renderSsOptionControl,
  renderSsOptionDetail,
  selectedSsOption,
  ssOptionIntel,
  ssOptionKey,
  ssOptionObject
} from "../../src/views/ss-command-view.js";
import { escapeHtml } from "../../src/core/utils.js";

const intelMap = {
  "-i": {
    role: "TCP intelligence",
    adds: "RTT, cwnd, retransmission, and TCP internals.",
    use: "Essential for expert analysis.",
    missing: "Expert metrics disappear."
  },
  "--tos": {
    role: "QoS classification",
    adds: "TOS and traffic class fields.",
    use: "Useful for QoS checks.",
    missing: "QoS context is missing."
  }
};

function validation(fields = {}) {
  return () => ({ valid: Object.values(fields).every(field => field.valid !== false), fields });
}

function renderBuilder(config, fields = {}) {
  return renderSsCommandBuilder({
    state: { ssCommandConfig: config },
    parseUiIntervalSeconds: value => Number(String(value).replace(",", ".")),
    validateSsCommandConfig: validation(fields),
    escapeHtml,
    defaultSsLogPath: () => "/tmp/networkexpert_ss_20260515_143152.log"
  });
}

test("ss option helpers build stable keys and option objects", () => {
  assert.equal(ssOptionKey("-i", "--info"), "-i");
  assert.equal(ssOptionKey("", "--cgroup"), "--cgroup");
  assert.deepEqual(ssOptionObject(["-i", "--info", "Add TCP internals", "TCP"]), {
    short: "-i",
    long: "--info",
    desc: "Add TCP internals",
    group: "TCP",
    key: "-i"
  });
});

test("ss option intelligence uses exact, long, short, and fallback entries", () => {
  assert.equal(ssOptionIntel(intelMap, "-i", "--info", "desc", "group").role, "TCP intelligence");
  assert.equal(ssOptionIntel(intelMap, "", "--tos", "desc", "group").role, "QoS classification");
  const fallback = ssOptionIntel(intelMap, "-Z", "", "Experimental context", "debug");
  assert.equal(fallback.role, "debug option");
  assert.equal(fallback.adds, "Experimental context");
  assert.match(fallback.missing, /related context/);
});

test("selected ss option prefers help key, active option, info, then first option", () => {
  const options = [
    ["-H", "", "Hide header", "base"],
    ["-i", "--info", "TCP internals", "TCP"],
    ["", "--tos", "QoS", "network"]
  ];
  assert.equal(selectedSsOption(options, [], "--tos").key, "--tos");
  assert.equal(selectedSsOption(options, [{ short: "-H", long: "", active: true }]).key, "-H");
  assert.equal(selectedSsOption(options, []).key, "-i");
  assert.equal(selectedSsOption([["-n", "", "numeric", "base"]], []).key, "-n");
});

test("renders ss option detail with intelligence text and escaping", () => {
  const html = renderSsOptionDetail({
    short: "-i",
    long: "--info",
    desc: "Add <TCP> internals",
    group: "TCP"
  }, {
    escapeHtml,
    ssOptionIntel: (short, long, desc, group) => ssOptionIntel(intelMap, short, long, desc, group)
  });
  assert.match(html, /ss option intelligence/);
  assert.match(html, /-i/);
  assert.match(html, /--info/);
  assert.match(html, /TCP intelligence/);
  assert.match(html, /RTT, cwnd, retransmission/);
  assert.match(html, /Add &lt;TCP&gt; internals/);
});

test("renders ss option chip title without leaking raw markup", () => {
  const html = renderSsOptionChip({
    short: "-Z",
    long: "",
    desc: "debug <unsafe>",
    group: "debug"
  }, {
    escapeHtml,
    ssOptionIntel: (short, long, desc, group) => ssOptionIntel(intelMap, short, long, desc, group)
  });
  assert.match(html, /ss-option-chip-wrap/);
  assert.match(html, /debug &lt;unsafe&gt;/);
  assert.doesNotMatch(html, /debug <unsafe>/);
});

test("renders ss option control checked and selected states", () => {
  const html = renderSsOptionControl(["-i", "--info", "TCP internals", "TCP"], [
    { short: "-i", long: "--info", active: true }
  ], "-i", {
    escapeHtml,
    ssOptionIntel: (short, long, desc, group) => ssOptionIntel(intelMap, short, long, desc, group)
  });
  assert.match(html, /ss-option-row selected/);
  assert.match(html, /data-ss-option-help="-i"/);
  assert.match(html, /data-opt="-i" checked/);
  assert.match(html, /TCP intelligence/);
});

test("renders collection mode, socket filter, and output sections", () => {
  const html = renderBuilder({
    timestamp: true,
    loop: true,
    intervalSeconds: "1",
    srcIp: "10.0.0.10",
    srcPort: "50000",
    dstIp: "10.0.0.20",
    dstPort: "443",
    outputPath: "/tmp/networkexpert_ss.log",
    appendOutput: true
  });
  assert.match(html, /Collection mode/);
  assert.match(html, /Socket filter/);
  assert.match(html, /Output/);
  assert.match(html, /id="ssCmdTimestamp" type="checkbox" checked/);
  assert.match(html, /id="ssCmdLoop" type="checkbox" checked/);
  assert.match(html, /Interval \(s\)/);
});

test("renders socket endpoint values and generic output placeholder", () => {
  const html = renderBuilder({
    loop: false,
    srcIp: "10.0.0.10",
    srcPort: "50000",
    dstIp: "10.0.0.20",
    dstPort: "443",
    intervalSeconds: "1",
    outputPath: ""
  });
  assert.match(html, /value="10\.0\.0\.10"/);
  assert.match(html, /value="50000"/);
  assert.match(html, /value="10\.0\.0\.20"/);
  assert.match(html, /value="443"/);
  assert.match(html, /placeholder="\/tmp\/networkexpert_ss_20260515_143152\.log"/);
});

test("marks invalid endpoint and interval fields with aria-invalid and messages", () => {
  const html = renderBuilder({
    loop: true,
    intervalSeconds: "abc",
    srcIp: "bad",
    srcPort: "99999",
    dstIp: "10.0.0.20",
    dstPort: "443"
  }, {
    intervalSeconds: { valid: false, message: "Use a positive number of seconds." },
    srcIp: { valid: false, message: "Invalid source IP." },
    srcPort: { valid: false, message: "Port must be 1-65535." }
  });
  assert.match(html, /ss-interval-field ss-field invalid/);
  assert.match(html, /id="ssCmdInterval"[^>]+aria-invalid="true"/);
  assert.match(html, /Use a positive number of seconds/);
  assert.match(html, /Invalid source IP/);
  assert.match(html, /Port must be 1-65535/);
});

test("marks warning validation fields distinctly without blocking output", () => {
  const html = renderBuilder({
    loop: true,
    intervalSeconds: "0.001",
    srcIp: "10.0.0.10",
    dstIp: "10.0.0.20"
  }, {
    intervalSeconds: { valid: true, level: "warning", message: "Very high sampling cadence." }
  });
  assert.match(html, /ss-interval-field ss-field warning/);
  assert.doesNotMatch(html, /aria-invalid="true"/);
  assert.match(html, /Very high sampling cadence/);
});

test("shows tee warning for very fast repeated append captures", () => {
  const html = renderBuilder({
    loop: true,
    intervalSeconds: "0,05",
    outputPath: "/tmp/networkexpert_ss.log",
    appendOutput: true
  });
  assert.match(html, /ss-command-warning "/);
  assert.match(html, /terminal output plus <code>tee<\/code> can become the bottleneck/);
  assert.match(html, /0,05/);
});

test("hides tee warning when cadence is slower or output is disabled", () => {
  const slow = renderBuilder({ loop: true, intervalSeconds: "1", outputPath: "/tmp/x.log", appendOutput: true });
  const noOutput = renderBuilder({ loop: true, intervalSeconds: "0.01", outputPath: "", appendOutput: true });
  const noAppend = renderBuilder({ loop: true, intervalSeconds: "0.01", outputPath: "/tmp/x.log", appendOutput: false });
  assert.match(slow, /ss-command-warning hidden/);
  assert.match(noOutput, /ss-command-warning hidden/);
  assert.match(noAppend, /ss-command-warning hidden/);
});

test("escapes command builder values and validation messages", () => {
  const html = renderBuilder({
    loop: true,
    intervalSeconds: "<0.01>",
    srcIp: "<src>",
    srcPort: "80",
    dstIp: "<dst>",
    dstPort: "443",
    outputPath: "'/tmp/<bad>.log'"
  }, {
    srcIp: { valid: false, message: "<bad ip>" }
  });
  assert.match(html, /&lt;0\.01&gt;/);
  assert.match(html, /&lt;src&gt;/);
  assert.match(html, /&lt;dst&gt;/);
  assert.match(html, /&#039;\/tmp\/&lt;bad&gt;\.log&#039;/);
  assert.match(html, /&lt;bad ip&gt;/);
  assert.doesNotMatch(html, /<bad ip>/);
});
