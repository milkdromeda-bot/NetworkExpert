export function defaultAlertRules() {
  return [
    { id: "rule-sendq-high", name: "Send-Q sustained pressure", metric: "sendQ", op: ">=", value: 262144, severity: "high", enabled: true },
    { id: "rule-rto-high", name: "RTO recovery risk", metric: "rto", op: ">=", value: 1000, severity: "high", enabled: true },
    { id: "rule-drops-any", name: "Socket drops detected", metric: "skmem.d", op: ">", value: 0, severity: "critical", enabled: true },
    { id: "rule-recvq-high", name: "Recv-Q local consumer lag", metric: "recvQ", op: ">=", value: 131072, severity: "medium", enabled: true },
    { id: "rule-smart-retrans", name: "RTT high + retransmitting", conditions: [{ metric: "rtt", op: ">", value: 100 }, { metric: "retrans", op: ">", value: 0 }], severity: "critical", enabled: true },
    { id: "rule-smart-backoff", name: "Backoff + Send-Q growing", conditions: [{ metric: "backoff", op: ">", value: 0 }, { metric: "sendQ", op: ">", value: 0 }], severity: "high", enabled: true }
  ];
}

export function loadAlertRules() {
  try {
    const saved = JSON.parse(localStorage.getItem("networkExpertAlertRules") || "[]");
    return saved.length ? saved : defaultAlertRules();
  } catch {
    return defaultAlertRules();
  }
}

export function saveAlertRules(rules) {
  localStorage.setItem("networkExpertAlertRules", JSON.stringify(rules.slice(0, 80)));
}

export function loadAlertAcks() {
  try {
    return JSON.parse(localStorage.getItem("networkExpertAlertAcks") || "{}");
  } catch {
    return {};
  }
}

export function saveAlertAcks(acks) {
  localStorage.setItem("networkExpertAlertAcks", JSON.stringify(acks));
}

function alertMetricValue(socket, metric, { metricValue, socketBandwidth }) {
  if (metric === "sendQ") return socket.sendQ;
  if (metric === "recvQ") return socket.recvQ;
  if (metric === "tx_bps" || metric === "rx_bps") return socketBandwidth(socket, metric);
  return metricValue(socket, metric);
}

function compareRuleValue(actual, op, threshold) {
  const a = Number(actual || 0);
  const b = Number(threshold || 0);
  if (op === ">") return a > b;
  if (op === ">=") return a >= b;
  if (op === "<") return a < b;
  if (op === "<=") return a <= b;
  if (op === "!=") return a !== b;
  return a === b;
}

export function evaluateAlertRules({ rules, sockets, alertAcks }, deps) {
  const events = [];
  for (const rule of rules.filter(rule => rule.enabled)) {
    for (const socket of sockets) {
      let matched = false;
      let value = 0;
      if (rule.conditions?.length) {
        // Compound rule: ALL conditions must match (AND)
        matched = rule.conditions.every(c => {
          const v = alertMetricValue(socket, c.metric, deps);
          return compareRuleValue(v, c.op, c.value);
        });
        value = alertMetricValue(socket, rule.conditions[0].metric, deps);
      } else {
        value = alertMetricValue(socket, rule.metric, deps);
        matched = compareRuleValue(value, rule.op, rule.value);
      }
      if (!matched) continue;
      const id = `${rule.id}:${socket.id}`;
      events.push({
        id,
        ruleId: rule.id,
        ruleName: rule.name,
        metric: rule.conditions ? rule.conditions.map(c => c.metric).join(" + ") : rule.metric,
        op: rule.op || rule.conditions?.[0]?.op || ">",
        threshold: rule.value || rule.conditions?.[0]?.value || 0,
        value,
        severity: rule.severity,
        socketId: socket.id,
        socket,
        acknowledged: Boolean(alertAcks[id])
      });
    }
  }
  return events.sort((a, b) =>
    Number(a.acknowledged) - Number(b.acknowledged) ||
    deps.riskRank(b.severity) - deps.riskRank(a.severity) ||
    b.value - a.value
  );
}
