import assert from "node:assert/strict";
import { test } from "node:test";
import { createAppEventBindings } from "../../src/app-event-bindings.js";

function classListRecorder() {
  return {
    toggles: [],
    toggle(name, value) {
      this.toggles.push([name, value]);
    }
  };
}

test("app event bindings toggle chart series through injected root and state", () => {
  const chartButton = {
    dataset: { chartSeriesToggle: "rtt", chartSeriesKey: "value" },
    classList: classListRecorder(),
    attrs: {},
    addEventListener(type, handler) { this.handler = handler; },
    setAttribute(name, value) { this.attrs[name] = value; }
  };
  const deps = {
    state: { hiddenChartSeries: new Set(), hiddenJvmSeries: new Set() },
    document: {},
    window: {},
    root: {
      querySelectorAll(selector) {
        if (selector === "[data-chart-series-toggle]") return [chartButton];
        if (selector === "[data-jvm-series-key]") return [];
        return [];
      }
    },
    chartSeriesKey: (metric, key) => `${metric}:${key}`,
    redrawChartCardMetric(metric, action) {
      deps.redraw = { metric, action };
    },
    drawJvmCharts() {
      deps.jvmDrawn = true;
    }
  };
  const bindings = createAppEventBindings(() => deps);

  bindings.bindChartSeriesEvents(deps);
  chartButton.handler({
    preventDefault() {},
    stopPropagation() {},
    currentTarget: chartButton
  });

  assert.equal(deps.state.hiddenChartSeries.has("rtt:value"), true);
  assert.deepEqual(deps.redraw, { metric: "rtt", action: "series:value" });
  assert.equal(chartButton.attrs["aria-pressed"], "false");
});

test("app event bindings keep chart chrome render callback injectable", () => {
  const chartTab = {
    dataset: { chartsTab: "jvm" },
    addEventListener(type, handler) { this.handler = handler; }
  };
  const deps = {
    state: { chartsTab: "charts" },
    document: {},
    window: {},
    root: {
      querySelectorAll(selector) {
        if (selector === "[data-charts-tab]") return [chartTab];
        return [];
      }
    },
    render() { deps.rendered = true; },
    drawJvmCharts() { deps.jvmDrawn = true; },
    drawFixCharts() {},
    drawBdpWindowCharts() {},
    redrawChartCardMetric() { return false; },
    applyChartZoomAction() {},
    renderKeepingWorkspacePosition() {}
  };
  const bindings = createAppEventBindings(() => deps);

  bindings.bindChartChromeEvents(deps);
  chartTab.handler({ currentTarget: chartTab });

  assert.equal(deps.state.chartsTab, "jvm");
  assert.equal(deps.rendered, true);
});
