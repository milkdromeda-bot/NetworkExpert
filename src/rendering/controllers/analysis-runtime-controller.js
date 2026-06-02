import { buildAdvisorFindings as buildAdvisorFindingsModel } from "../../analysis/advisor-findings.js";

export function createAnalysisRuntimeController(getDeps) {
  const current = () => getDeps();

  function recompute() {
    const {
      aggregateTimestampedSockets,
      analyzeAll,
      applyRisks,
      buildHistory,
      buildSocketBandwidthIndex,
      computeHealthScore,
      detectFragmentation,
      detectReordering,
      evaluateAlertRules,
      resetDerivedCaches,
      setActiveInvestigation,
      setZoom,
      state
    } = current();
    state.sockets = applyRisks(aggregateTimestampedSockets(state.raw));
    state.bandwidthIndex = buildSocketBandwidthIndex();
    finishRecompute({
      analyzeAll,
      buildHistory,
      computeHealthScore,
      detectFragmentation,
      detectReordering,
      evaluateAlertRules,
      resetDerivedCaches,
      setActiveInvestigation,
      setZoom,
      socketExists: socketId => state.sockets.some(socket => socket.id === socketId),
      state
    });
  }

  function recomputeFromSockets() {
    const {
      analyzeAll,
      buildHistory,
      buildSocketBandwidthIndex,
      computeHealthScore,
      detectFragmentation,
      detectReordering,
      evaluateAlertRules,
      resetDerivedCaches,
      setActiveInvestigation,
      setZoom,
      state,
      withStableSocketIds
    } = current();
    state.sockets = withStableSocketIds(state.sockets);
    state.bandwidthIndex = buildSocketBandwidthIndex();
    finishRecompute({
      analyzeAll,
      buildHistory,
      computeHealthScore,
      detectFragmentation,
      detectReordering,
      evaluateAlertRules,
      resetDerivedCaches,
      setActiveInvestigation,
      setZoom,
      socketExists: socketId => state.sockets.some(socket => socket.id === socketId),
      state
    });
  }

  function finishRecompute(deps) {
    const { analyzeAll, buildHistory, computeHealthScore, detectFragmentation, detectReordering, evaluateAlertRules, resetDerivedCaches, setActiveInvestigation, setZoom, socketExists, state } = deps;
    state.sparklineIndex = null;
    state.anomalies = analyzeAll(state.sockets);
    state.fragmentation = detectFragmentation(state.sockets);
    state.reordering = detectReordering(state.sockets);
    state.healthScore = computeHealthScore(state.sockets, { fragmentation: state.fragmentation, reordering: state.reordering });
    state.selectedId = socketExists(state.selectedId) ? state.selectedId : state.sockets[0]?.id || null;
    if (!socketExists(state.activeContextId)) setActiveInvestigation(state, null);
    setZoom(0, 1);
    buildHistory();
    addCollectionAnomalies();
    runAdvisorAnalysis();
    evaluateAlertRules();
    state.analysisDirty = false;
    resetDerivedCaches();
    pushAnomalyAlerts();
  }

  function pushAnomalyAlerts() {
    const { setTimeoutRef, state, toast } = current();
    if (!state.prefs.autoToast) return;
    const critical = state.anomalies.filter(a => a.severity === "critical" || a.severity === "high");
    if (!critical.length) return;
    const top = critical.slice(0, 3);
    setTimeoutRef(() => {
      top.forEach((a, i) => {
        setTimeoutRef(() => toast(`! ${a.title}`, a.detail || a.metric || "", "danger"), i * 800);
      });
    }, 300);
  }

  function addCollectionAnomalies() {
    const {
      dropRateSeverity,
      dropRateSummary,
      formatDropCadence,
      formatDurationCompact,
      formatMetricValue,
      formatMicroburstWindow,
      hasTimestampedRawData,
      microburstSummary,
      state
    } = current();
    const hasTimestamp = hasTimestampedRawData();
    const huge = state.sockets.length >= 5000;
    const dropRate = dropRateSummary();
    const microburst = microburstSummary();
    if (!hasTimestamp && state.raw.trim()) {
      state.anomalies.push({
        socketId: state.selectedId,
        severity: "low",
        title: "Collection has no timestamp",
        detail: "Add date --iso-8601=ns or EPOCH_MS before each snapshot to build a real timeline.",
        metric: "collection"
      });
    }
    if (dropRate) {
      state.anomalies.unshift({
        socketId: state.selectedId,
        severity: dropRateSeverity(dropRate),
        title: "Socket drops are increasing",
        detail: `skmem.d increased by ${formatMetricValue("skmem.d", dropRate.totalDropDelta)} over ${formatDurationCompact(dropRate.observedSeconds)} (${formatDropCadence(dropRate)}, peak ${formatMetricValue("skmem.d_rate", dropRate.peakDropRate)}).`,
        metric: "skmem.d_rate"
      });
    }
    if (microburst) {
      state.anomalies.unshift({
        socketId: state.selectedId,
        severity: microburst.severity,
        title: "Receive-side microburst detected",
        detail: `${formatMicroburstWindow(microburst)}: RX peaked at ${formatMetricValue("rx_bps", microburst.peakRxBps)}, Recv-Q at ${formatMetricValue("recvQ", microburst.peakRecvQ)}, skmem.r at ${formatMetricValue("skmem.r", microburst.peakSkmemR)}, with ${formatMetricValue("skmem.d", microburst.dropDeltaTotal)} new drops (peak ${formatMetricValue("skmem.d_rate", microburst.peakDropRate)}).`,
        metric: "rx_bps"
      });
    }
    if (huge) {
      state.anomalies.unshift({
        socketId: state.selectedId,
        severity: "medium",
        title: "Very high socket volume",
        detail: `${state.sockets.length} sockets parsed: avoid overly aggressive collection frequency, especially with -p, -e, -m, -i, --bpf, or DNS resolution.`,
        metric: "overhead"
      });
    }
  }

  function runAdvisorAnalysis() {
    current().state.advisorFindings = buildAdvisorFindings();
  }

  function socketsWhere(predicate) {
    return current().state.sockets.filter(socket => {
      try {
        return predicate(socket);
      } catch {
        return false;
      }
    });
  }

  function endpointSamples(sockets, side = "peer", limit = 4) {
    const values = sockets.map(socket => side === "peer" ? socket.peer : socket.local).filter(Boolean);
    return [...new Set(values)].slice(0, limit);
  }

  function processSamples(sockets, limit = 4) {
    return [...new Set(sockets.map(socket => socket.details.process ? `${socket.details.process.name}:${socket.details.process.pid}` : "").filter(Boolean))].slice(0, limit);
  }

  function makeFinding({ id, severity, title, pattern, sockets, confidence, why, next, mitigate, commands }) {
    const { state } = current();
    const rank = { critical: 4, high: 3, medium: 2, low: 1 };
    const topSocket = sockets[0] || state.sockets[0];
    return {
      id,
      severity,
      score: (rank[severity] || 1) * 100 + Math.min(99, sockets.length),
      title,
      pattern,
      count: sockets.length,
      confidence,
      why,
      next,
      mitigate,
      commands,
      socketId: topSocket?.id || null,
      local: endpointSamples(sockets, "local"),
      peer: endpointSamples(sockets, "peer"),
      processes: processSamples(sockets)
    };
  }

  function buildAdvisorFindings() {
    const { commandForPeer, dropRateSeverity, dropRateSummary, envCommand, formatDropCadence, formatDurationCompact, formatMetricValue, formatMicroburstWindow, isAnalystRole, isLxcProfile, metricValue, microburstSummary, parseTimestampLine, socketsById, state, thresholdFor } = current();
    return buildAdvisorFindingsModel({
      state,
      socketsById,
      socketsWhere,
      thresholdFor,
      metricValue,
      dropRateSummary,
      microburstSummary,
      parseTimestampLine,
      isLxcProfile,
      isAnalystRole,
      makeFinding,
      envCommand,
      commandForPeer,
      processSamples,
      dropRateSeverity,
      formatMetricValue,
      formatDurationCompact,
      formatDropCadence,
      formatMicroburstWindow
    });
  }

  return {
    addCollectionAnomalies,
    buildAdvisorFindings,
    endpointSamples,
    makeFinding,
    processSamples,
    pushAnomalyAlerts,
    recompute,
    recomputeFromSockets,
    runAdvisorAnalysis,
    socketsWhere
  };
}
