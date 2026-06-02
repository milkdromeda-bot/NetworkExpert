import { createCoreDependencyFactories } from "./core-dependencies.js";
import { createEventDependencyFactories } from "./event-dependencies.js";
import { createRenderReportDependencyFactories } from "./render-report-dependencies.js";

export function createMainDependencyFactories(get) {
  return {
    ...createCoreDependencyFactories(get),
    ...createRenderReportDependencyFactories(get),
    ...createEventDependencyFactories(get)
  };
}
