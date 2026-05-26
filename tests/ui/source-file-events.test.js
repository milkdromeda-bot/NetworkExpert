import assert from "node:assert/strict";
import { test } from "node:test";
import { bindSourceFileEvents } from "../../src/source-file-events.js";

function inputNode(initialValue = "") {
  const listeners = new Map();
  return {
    value: initialValue,
    listeners,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    dispatch(type, extra = {}) {
      const handler = listeners.get(type);
      assert.equal(typeof handler, "function", `${type} listener should be registered`);
      return handler({ target: this, ...extra });
    }
  };
}

function fakeDeps(nodes = {}) {
  const state = {
    sockets: [],
    anomalies: [],
    jvmGc: { rawLog: "", pauses: [], safepoints: [], correlation: null, clockOffsetMs: 0 },
    fixLatency: { records: [], correlation: null, threshold: 5, fileStats: [], vmstat: null, nstat: null }
  };
  const calls = [];
  return {
    calls,
    deps: {
      document: {
        querySelector(selector) {
          return nodes[selector] || null;
        }
      },
      state,
      cmInstance: null,
      parseGcLog: () => ({ pauses: [], safepoints: [] }),
      parsePidstat: () => ({ samples: [] }),
      parseNstat: () => ({ counters: new Map() }),
      parseFixLog: () => ({ records: [], stats: { parsed: 0, rejected: 0 } }),
      parseVmstat: () => ({ samples: [] }),
      parseNstatTimestamped: () => ({ samples: [] }),
      parseSar: () => ({ cpu: [], memory: [], io: [], network: [] }),
      extractTcpCounters: () => ({ retransSegs: 0, timeouts: 0, listenDrops: 0 }),
      correlateCpuWithStalls: () => ({}),
      correlateSarWithTcp: () => ({}),
      visibleHistory: () => [],
      runJvmCorrelation: () => calls.push("runJvmCorrelation"),
      runFixCorrelation: () => calls.push("runFixCorrelation"),
      drawJvmCharts: () => calls.push("drawJvmCharts"),
      drawFixCharts: () => calls.push("drawFixCharts"),
      toast: (title) => calls.push(`toast:${title}`),
      render: () => calls.push("render"),
      _showBusy: () => calls.push("showBusy"),
      _hideBusy: () => calls.push("hideBusy")
    }
  };
}

test("source file binder wires FIX threshold changes through injected dependencies", () => {
  const threshold = inputNode("9");
  const { deps, calls } = fakeDeps({ "#fixThresholdInput": threshold });

  bindSourceFileEvents(deps);
  threshold.dispatch("change");

  assert.equal(deps.state.fixLatency.threshold, 9);
  assert.deepEqual(calls.slice(0, 2), ["runFixCorrelation", "render"]);
});

test("source file binder parses nstat input into JVM TCP counters", async () => {
  const nstat = inputNode();
  nstat.files = [{ name: "nstat.log", text: async () => "TcpRetransSegs 3" }];
  const { deps, calls } = fakeDeps({ "#nstatFileInput": nstat });
  deps.parseNstat = () => ({ counters: new Map([["TcpRetransSegs", 3]]) });
  deps.extractTcpCounters = () => ({ retransSegs: 3, timeouts: 0, listenDrops: 0 });

  bindSourceFileEvents(deps);
  await nstat.dispatch("change");
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(deps.state.jvmGc.nstat.retransSegs, 3);
  assert.ok(calls.includes("toast:nstat loaded"));
  assert.ok(calls.includes("render"));
});
