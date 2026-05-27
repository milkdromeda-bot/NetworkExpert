import { createReportActionRuntime } from "./report-action-runtime.js";
import { createReportChartActions } from "./report-chart-actions.js";
import { createReportDataActions } from "./report-data-actions.js";
import { createReportExportActions } from "./report-export-actions.js";

export function createReportActions(getDeps) {
  const runtime = createReportActionRuntime(getDeps);
  const actions = {};

  Object.assign(actions, createReportDataActions(runtime, () => actions));
  Object.assign(actions, createReportChartActions(runtime, () => actions));
  Object.assign(actions, createReportExportActions(runtime, () => actions));

  return actions;
}
