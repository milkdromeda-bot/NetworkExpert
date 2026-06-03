import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildAdvisorFindings } from "../../src/analysis/advisor-findings.js";

function baseDeps(overrides = {}) {
  const socket = {
    id: "s1",
    state: "ESTAB",
    sendQ: 0,
    recvQ: 0,
    localAddress: { host: "10.0.0.1" },
    peerAddress: { host: "10.0.0.2" },
    details: {
      skmem: {},
      values: {},
      timer: {},
      process: { name: "java", pid: 42 }
    }
  };
  const state = {
    sockets: [socket],
    selectedId: "s1",
    raw: "",
    prefs: { linuxProfile: "baremetal", accessRole: "analyst" }
  };
  const deps = {
    state,
    socketsById: () => new Map(state.sockets.map(item => [item.id, item])),
    socketsWhere: predicate => state.sockets.filter(predicate),
    thresholdFor: metric => ({ warn: metric === "sendQ" || metric === "recvQ" ? 1024 : 1, danger: metric === "sendQ" || metric === "recvQ" ? 4096 : 10 }),
    metricValue: (item, metric) => item.metrics?.[metric] ?? item.details.values?.[metric] ?? 0,
    dropRateSummary: () => null,
    microburstSummary: () => null,
    parseTimestampLine: () => null,
    isLxcProfile: () => false,
    isAnalystRole: () => true,
    makeFinding: input => ({ ...input, score: ({ critical: 4, high: 3, medium: 2, low: 1 }[input.severity] || 1) * 100 + input.sockets.length, count: input.sockets.length }),
    envCommand: command => command,
    commandForPeer: () => "ip route get 10.0.0.2",
    processSamples: sockets => sockets.filter(item => item.details.process).map(item => item.details.process.name),
    dropRateSeverity: () => "high",
    formatMetricValue: (_metric, value) => String(value),
    formatDurationCompact: value => `${value}s`,
    formatDropCadence: () => "active",
    formatMicroburstWindow: () => "short window"
  };
  return { ...deps, ...overrides, state: { ...state, ...(overrides.state || {}) } };
}

test("advisor findings module returns the fallback healthy finding", () => {
  const findings = buildAdvisorFindings(baseDeps());

  assert.equal(findings.length, 1);
  assert.equal(findings[0].id, "no-critical-pattern");
});

test("advisor findings module detects Send-Q pressure", () => {
  const deps = baseDeps();
  deps.state.sockets[0].sendQ = 8192;
  deps.state.sockets[0].details.skmem = { tb: 10000, t: 8500 };

  const findings = buildAdvisorFindings(deps);

  assert.equal(findings[0].id, "slow-peer-or-egress");
  assert.equal(findings[0].severity, "critical");
});

test("main delegates advisor logic to the extracted model", () => {
  const main = readFileSync(new URL("../../src/rendering/main-runtime.js", import.meta.url), "utf8");
  const controller = readFileSync(new URL("../../src/rendering/controllers/analysis-runtime-controller.js", import.meta.url), "utf8");

  assert.match(main, /"buildAdvisorFindings"/);
  assert.match(controller, /import \{ buildAdvisorFindings as buildAdvisorFindingsModel \} from "\.\.\/\.\.\/analysis\/advisor-findings\.js";/);
  assert.match(controller, /function buildAdvisorFindings\(\)/);
  assert.match(controller, /return buildAdvisorFindingsModel\(\{/);
  assert.doesNotMatch(main, /id:\s*"slow-peer-or-egress"[\s\S]*id:\s*"local-slow-consumer"[\s\S]*function severityVisible/);
});
