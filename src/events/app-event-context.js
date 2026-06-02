const OBJECT_DEPENDENCIES = [
  "document",
  "window",
  "state",
  "localStorage",
  "icons",
  "EXPERT_CORRELATIONS",
  "PRE_IMPORT_PRESETS",
  "ANALYSIS_TEMPLATES",
  "NodeFilter"
];

const FUNCTION_DEPENDENCIES = [
  "handleGlobalKeydown",
  "bindSmartChartTooltips",
  "bindColumnHelpTooltips",
  "sortedFilteredSockets",
  "visibleColumns",
  "escapeHtml",
  "renderRowActions",
  "render",
  "handleIngestAction",
  "ingestActionDependencies",
  "openIncidentReport",
  "exportEvidencePack",
  "toast",
  "annotationAnchorOptions",
  "annotationDefaultLabel",
  "visibleHistory",
  "annotationSocketId",
  "saveAnnotations",
  "renderKeepingWorkspacePosition",
  "zoomToTailLatencyWindow",
  "applyDashboardPreset",
  "resetAllState",
  "_undo",
  "_redo",
  "_undoSnapshot",
  "renderModal",
  "parseGcLog",
  "runJvmCorrelation",
  "drawJvmCharts",
  "toggleFixPlayback",
  "selectedSocket",
  "anomaliesBySocketId",
  "applyContextAction",
  "chartMetricList",
  "syncChartHistoryToSelection",
  "openAnnotationModal",
  "bindTableInteractionEvents",
  "tableInteractionDependencies",
  "bindSocketInteractionEvents",
  "socketInteractionDependencies",
  "closeDashboardPresetMenu",
  "commitDashboardPresetChoice",
  "applyDashboardProfile",
  "saveDashboardProfiles",
  "saveAlertAcks",
  "defaultAlertRules",
  "saveAlertRules",
  "saveFilterHistory",
  "hasPreImportFilterValue",
  "emptyPreImportFilters",
  "importFile",
  "openTopologyModal",
  "renderKeepingModalPosition",
  "socketsById",
  "focusSocket",
  "hideAppServiceTooltip",
  "showAppServiceTooltip",
  "applyAnalysisTemplate",
  "savePrefs",
  "normalizeBdpDirection",
  "syncSsCommandFromBuilder",
  "toggleCommandOption",
  "syncFromCodeMirror",
  "normalizeSsEditorTheme",
  "applySsEditorThemePreview",
  "resetSsEditorThemePreview",
  "drawFixCharts",
  "runFixCorrelation",
  "sourceFileEventDependencies",
  "bindSourceFileEvents",
  "setZoom",
  "clearVisibleHistoryCache",
  "saveTableState",
  "moveVisibleChartMetric",
  "showPercentileTableCrosshair",
  "clearPercentileTableCrosshair",
  "exportChartAsPng",
  "copyTextToClipboard",
  "buildJiraReport",
  "exportIncidentReportHtml",
  "exportFixSpikeCsv",
  "createBaseline",
  "formatNumber",
  "handleLayoutProfileAction",
  "layoutProfileActionDependencies",
  "handleServiceConfigAction",
  "serviceConfigActionDependencies",
  "setZoomFromDateInputs",
  "applyChartZoomAction",
  "clampZoomRange",
  "drawBdpWindowCharts"
];

export function createAppEventContext(getDeps) {
  const current = () => getDeps();
  const call = (name, ...args) => {
    const fn = current()[name];
    if (typeof fn !== "function") throw new Error(`Missing app event dependency: ${name}`);
    return fn(...args);
  };
  const proxiedObject = name => new Proxy({}, {
    get(_target, prop) {
      const source = current()[name] || globalThis[name];
      const value = source?.[prop];
      return typeof value === "function" ? value.bind(source) : value;
    },
    set(_target, prop, value) {
      const source = current()[name] || globalThis[name];
      if (!source) return false;
      source[prop] = value;
      return true;
    },
    has(_target, prop) { return prop in ((current()[name] || globalThis[name]) || {}); },
    ownKeys() { return Reflect.ownKeys((current()[name] || globalThis[name]) || {}); },
    getOwnPropertyDescriptor(_target, prop) {
      const source = (current()[name] || globalThis[name]) || {};
      return Object.getOwnPropertyDescriptor(source, prop) || { configurable: true, enumerable: true, writable: true, value: source[prop] };
    }
  });
  const context = {
    appEventDependencies: current,
    cmInstanceRef: () => current().cmInstance || null,
    requestAnimationFrame(callback) {
      const raf = current().requestAnimationFrame || globalThis.requestAnimationFrame || (fn => setTimeout(fn, 16));
      return raf(callback);
    }
  };
  for (const name of OBJECT_DEPENDENCIES) context[name] = proxiedObject(name);
  for (const name of FUNCTION_DEPENDENCIES) context[name] = (...args) => call(name, ...args);
  return context;
}
