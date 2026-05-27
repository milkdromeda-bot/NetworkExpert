import assert from "node:assert/strict";
import { test } from "node:test";
import { createReportActions } from "../../src/report-actions.js";

test("report actions keep filter token generation isolated from main.js", () => {
  const actions = createReportActions(() => ({
    state: {
      table: {
        filters: {
          text: "state:ESTAB",
          risk: "critical",
          state: "ESTAB",
          family: "tcp",
          process: "java",
          srcIp: "10.0.0.1",
          dstPort: "443",
          minRecvQ: "1024",
          onlyAnomalies: true
        }
      }
    }
  }));

  assert.deepEqual(actions.reportFilterTokens(), [
    "query:state:ESTAB",
    "risk:critical",
    "state:ESTAB",
    "protocol:tcp",
    "process:java",
    "src ip:10.0.0.1",
    "dst port:443",
    "Recv-Q >= 1024",
    "anomalies only"
  ]);
});

test("Jira report action delegates through injected dependencies", () => {
  const calls = [];
  const actions = createReportActions(() => ({
    state: { sourceName: "capture.log" },
    reportVisibleSockets: () => [{ id: "s1" }],
    reportRelevantAnomalies: () => [{ severity: "critical" }],
    diagnosticHypotheses: () => [{ id: "h1" }],
    reportTopSockets: () => [{ id: "s1" }],
    APP_VERSION: "1.0.0.0",
    buildJiraReportModel: deps => {
      calls.push(deps);
      return "JIRA";
    },
    sortedFilteredSockets: () => [{ id: "s1" }]
  }));

  assert.equal(actions.buildJiraReport(), "JIRA");
  assert.equal(calls.length, 1);
  assert.equal(String(calls[0].appVersion), "1.0.0.0");
  assert.deepEqual(calls[0].reportVisibleSockets(), [{ id: "s1" }]);
});
