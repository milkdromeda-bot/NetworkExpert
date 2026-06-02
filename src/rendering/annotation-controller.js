export function createAnnotationController(getDeps) {
  const current = () => getDeps();

  function annotationSocketId() {
    const { selectedSocket, state } = current();
    return selectedSocket()?.id || state.selectedId || "";
  }

  function currentSourceAnnotations(metric = null, socketId = annotationSocketId(), history = current().visibleHistory()) {
    const { annotationsForContext, microburstSummary, state, tailLatencyLens } = current();
    return annotationsForContext(state.annotations, {
      sourceName: state.sourceName,
      socketId,
      metric,
      history,
      microburst: microburstSummary(),
      tailLatency: tailLatencyLens()
    });
  }

  function annotationAnchorOptions(history = current().visibleHistory()) {
    const { buildAnnotationAnchorOptions, microburstSummary, tailLatencyLens } = current();
    return buildAnnotationAnchorOptions({
      history,
      microburst: microburstSummary(),
      tailLatency: tailLatencyLens()
    });
  }

  function annotationMetricChoices() {
    const { metricLabel, reportDefaultChartMetrics, state } = current();
    const preferred = ["*", state.prefs.graphMetric, ...state.chartMetrics, ...reportDefaultChartMetrics(8)].filter(Boolean);
    return [...new Set(preferred)].map(metric => ({
      value: metric,
      label: metric === "*" ? "Socket-wide (show on all charts)" : metricLabel(metric)
    }));
  }

  function annotationKindForChartContext(metric, value) {
    if (["rtt", "rttvar", "rto"].includes(metric)) return "rtt-peak";
    if (["skmem.d", "skmem.d_rate"].includes(metric)) return "burst-start";
    if (["recvQ", "sendQ"].includes(metric)) return "queue-reset";
    if (["rx_bps", "tx_bps", "delivery_rate", "pacing_rate"].includes(metric) && Number(value) > 0) return "burst-start";
    return "custom";
  }

  function annotationLabelForChartContext(metric, value) {
    const { metricLabel, thresholdSeverity } = current();
    const severity = thresholdSeverity(metric, Number(value) || 0);
    if (severity === "danger" || severity === "warn") return `${metricLabel(metric)} spike`;
    if (["recvQ", "sendQ"].includes(metric)) return `${metricLabel(metric)} marker`;
    if (["rtt", "rttvar", "rto"].includes(metric)) return `${metricLabel(metric)} peak`;
    return `${metricLabel(metric)} marker`;
  }

  function openAnnotationModal(metric = "*", context = null) {
    const { buildAnnotationDraft, render, state, toast } = current();
    const socketId = annotationSocketId();
    if (!socketId) {
      toast("No active socket", "Select a socket before adding an annotation.", "warn");
      return;
    }
    const chartContext = context && Number.isFinite(Number(context.epochMs))
      ? {
          ...context,
          metric: context.metric || metric || "*",
          epochMs: Number(context.epochMs),
          value: Number.isFinite(Number(context.value)) ? Number(context.value) : null
        }
      : null;
    const draftMetric = chartContext?.metric || metric || "*";
    const kind = chartContext?.kind || annotationKindForChartContext(draftMetric, chartContext?.value);
    state.annotationContext = chartContext;
    state.annotationDraft = {
      ...buildAnnotationDraft({ sourceName: state.sourceName, socketId, metric: draftMetric, kind }),
      kind,
      label: chartContext?.label || annotationLabelForChartContext(draftMetric, chartContext?.value),
      note: chartContext?.note || "",
      metric: draftMetric,
      anchor: chartContext ? "cursor" : "visible-end",
      epochMs: chartContext?.epochMs ?? null
    };
    state.modal = "annotation";
    render();
  }

  return {
    annotationAnchorOptions,
    annotationKindForChartContext,
    annotationLabelForChartContext,
    annotationMetricChoices,
    annotationSocketId,
    currentSourceAnnotations,
    openAnnotationModal
  };
}
