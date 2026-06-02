export function createAlertStateController(getDeps) {
  const current = () => getDeps();

  function evaluateAlertRules() {
    const { evaluateAlertRuleEvents, metricValue, riskRank, socketBandwidth, state } = current();
    state.alertEvents = evaluateAlertRuleEvents({
      rules: state.alertRules,
      sockets: state.sockets,
      alertAcks: state.alertAcks
    }, { metricValue, socketBandwidth, riskRank });
  }

  function createBaseline() {
    const { createBaselineSnapshot, metricValue, socketBandwidth, socketKey, state } = current();
    const baseline = createBaselineSnapshot(state, { metricValue, socketBandwidth, socketKey });
    baseline.history = state.history?.slice(0, 2000) || [];
    return baseline;
  }

  function buildComparison() {
    const { buildBaselineComparison, metricValue, riskRank, socketBandwidth, socketKey, state } = current();
    return buildBaselineComparison(state, { metricValue, socketBandwidth, socketKey, riskRank });
  }

  function updateAnomalyAlertState() {
    const { DateRef, state } = current();
    const count = state.anomalies.length;
    if (count <= 0) {
      state.anomalyAlertSince = null;
      state.lastAnomalyCount = 0;
      return;
    }
    if (count !== state.lastAnomalyCount || !state.anomalyAlertSince) {
      state.anomalyAlertSince = DateRef.now();
      state.lastAnomalyCount = count;
    }
    updateFavicon();
  }

  function updateFavicon() {
    const { document, state } = current();
    const critical = state.anomalies.some(a => a.severity === "critical" || a.severity === "high");
    const hasAnomalies = state.anomalies.length > 0;
    const color = critical ? "%23ff5c77" : hasAnomalies ? "%23ff9f43" : "%234cde8a";
    const dot = critical || hasAnomalies ? `%3Ccircle cx='54' cy='10' r='9' fill='${color}'/%3E` : "";
    const link = document.querySelector("link[rel='icon']");
    if (link) link.href = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23070b11'/%3E%3Cpath d='M18 34h12m4 0h12M24 24l8 10 8-10' fill='none' stroke='%2339d6d6' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='18' cy='34' r='6' fill='%235db7ff'/%3E%3Ccircle cx='46' cy='34' r='6' fill='${color}'/%3E${dot}%3C/svg%3E`;
  }

  function anomalyStatusClass() {
    const { DateRef, state } = current();
    if (!state.anomalies.length) return "";
    return DateRef.now() - state.anomalyAlertSince < 10000 ? "blink" : "solid";
  }

  function scheduleAnomalyBadgeSettle() {
    const { DateRef, document, setTimeoutRef, state } = current();
    if (!state.anomalies.length || !state.anomalyAlertSince) return;
    const remaining = 10050 - (DateRef.now() - state.anomalyAlertSince);
    if (remaining <= 0) return;
    setTimeoutRef(() => {
      const badge = document.querySelector(".anomaly-status.blink");
      if (badge) {
        badge.classList.remove("blink");
        badge.classList.add("solid");
      }
    }, remaining);
  }

  return {
    anomalyStatusClass,
    buildComparison,
    createBaseline,
    evaluateAlertRules,
    scheduleAnomalyBadgeSettle,
    updateAnomalyAlertState,
    updateFavicon
  };
}
