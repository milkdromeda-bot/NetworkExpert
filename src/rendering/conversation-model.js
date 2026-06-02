const TEXT_SORTS = new Set(["flow", "proto", "process"]);

export function createConversationModel(getDeps) {
  const current = () => getDeps();

  function groupedSockets() {
    const { metricValue, riskRank, socketKey, sortedFilteredSockets } = current();
    const map = new Map();
    const anomalyMap = anomaliesBySocketId();
    for (const socket of sortedFilteredSockets()) {
      const key = socketKey(socket);
      if (!map.has(key)) {
        map.set(key, {
          key,
          socket,
          count: 0,
          maxRisk: "low",
          maxRecvQ: 0,
          maxSendQ: 0,
          maxRtt: 0,
          maxRto: 0,
          maxDrops: 0,
          anomalies: 0
        });
      }
      const group = map.get(key);
      group.count += 1;
      group.maxRisk = riskRank(socket.risk) > riskRank(group.maxRisk) ? socket.risk : group.maxRisk;
      group.maxRecvQ = Math.max(group.maxRecvQ, socket.recvQ);
      group.maxSendQ = Math.max(group.maxSendQ, socket.sendQ);
      group.maxRtt = Math.max(group.maxRtt, metricValue(socket, "rtt"));
      group.maxRto = Math.max(group.maxRto, metricValue(socket, "rto"));
      group.maxDrops = Math.max(group.maxDrops, metricValue(socket, "skmem.d"));
      group.anomalies += anomalyMap.get(socket.id)?.length || 0;
    }
    return [...map.values()].sort((a, b) => riskRank(b.maxRisk) - riskRank(a.maxRisk) || b.anomalies - a.anomalies || b.maxSendQ - a.maxSendQ);
  }

  function conversationKey(socket) {
    return `${socket.localAddress.host || socket.local}|${socket.localAddress.port || ""}|${socket.peerAddress.host || socket.peer}|${socket.peerAddress.port || ""}|${socket.family}`;
  }

  function anomaliesBySocketId() {
    const { state } = current();
    const key = `${state.dataVersion}|${state.anomalies.length}`;
    if (state.cache.anomalyMapKey === key && state.cache.anomaliesBySocketId) return state.cache.anomaliesBySocketId;
    const map = new Map();
    for (const anomaly of state.anomalies) {
      if (!anomaly.socketId) continue;
      if (!map.has(anomaly.socketId)) map.set(anomaly.socketId, []);
      map.get(anomaly.socketId).push(anomaly);
    }
    state.cache.anomalyMapKey = key;
    state.cache.anomaliesBySocketId = map;
    return map;
  }

  function socketsById() {
    const { state } = current();
    const key = `${state.dataVersion}|${state.sockets.length}`;
    if (state.cache.socketMapKey === key && state.cache.socketsById) return state.cache.socketsById;
    const map = new Map(state.sockets.map(socket => [socket.id, socket]));
    state.cache.socketMapKey = key;
    state.cache.socketsById = map;
    return map;
  }

  function buildConversations() {
    const { currentApplicationServiceSortKey, metricValue, riskRank, socketBandwidth, sortedFilteredSockets } = current();
    const map = new Map();
    const anomalyMap = anomaliesBySocketId();
    for (const socket of sortedFilteredSockets()) {
      const key = conversationKey(socket);
      if (!map.has(key)) {
        map.set(key, {
          key,
          socket,
          local: socket.local,
          peer: socket.peer,
          family: socket.family,
          states: new Set(),
          processes: new Set(),
          application: currentApplicationServiceSortKey(socket),
          count: 0,
          maxRisk: "low",
          anomalies: 0,
          recvQ: 0,
          sendQ: 0,
          txBps: 0,
          rxBps: 0,
          maxRtt: 0,
          maxRto: 0,
          drops: 0,
          anomalyItems: []
        });
      }
      const conv = map.get(key);
      const socketAnomalies = anomalyMap.get(socket.id) || [];
      conv.count += 1;
      conv.states.add(socket.state);
      if (socket.details.process?.name) conv.processes.add(socket.details.process.name);
      conv.maxRisk = riskRank(socket.risk) > riskRank(conv.maxRisk) ? socket.risk : conv.maxRisk;
      conv.anomalies += socketAnomalies.length;
      conv.anomalyItems.push(...socketAnomalies);
      conv.recvQ += socket.recvQ;
      conv.sendQ += socket.sendQ;
      conv.txBps += socketBandwidth(socket, "tx_bps");
      conv.rxBps += socketBandwidth(socket, "rx_bps");
      conv.maxRtt = Math.max(conv.maxRtt, metricValue(socket, "rtt"));
      conv.maxRto = Math.max(conv.maxRto, metricValue(socket, "rto"));
      conv.drops += metricValue(socket, "skmem.d");
    }
    return sortConversations([...map.values()]);
  }

  function conversationDefaultSortDir(key) {
    return TEXT_SORTS.has(key) ? "asc" : "desc";
  }

  function conversationSortText(conv, key) {
    if (key === "flow") return `${conv.local} ${conv.peer}`;
    if (key === "proto") return `${conv.family} ${[...conv.states].join(" ")} ${conv.application || ""}`;
    if (key === "process") return [...conv.processes].join(", ") || "-";
    return "";
  }

  function conversationSortValue(conv, key) {
    const { riskRank } = current();
    if (TEXT_SORTS.has(key)) return conversationSortText(conv, key);
    if (key === "risk") return riskRank(conv.maxRisk);
    if (key === "sockets") return conv.count;
    if (key === "anomalies") return conv.anomalies;
    if (key === "tx") return conv.txBps;
    if (key === "rx") return conv.rxBps;
    if (key === "sendQ") return conv.sendQ;
    if (key === "recvQ") return conv.recvQ;
    if (key === "rtt") return conv.maxRtt;
    if (key === "rto") return conv.maxRto;
    if (key === "drops") return conv.drops;
    return 0;
  }

  function compareConversationFallback(a, b) {
    const { CONVERSATION_SORT_COLLATOR, riskRank } = current();
    return riskRank(b.maxRisk) - riskRank(a.maxRisk) ||
      b.anomalies - a.anomalies ||
      b.drops - a.drops ||
      b.sendQ - a.sendQ ||
      b.txBps - a.txBps ||
      CONVERSATION_SORT_COLLATOR.compare(String(a.key), String(b.key));
  }

  function sortConversations(conversations) {
    const { CONVERSATION_SORT_COLLATOR, CONVERSATION_SORT_LABELS, state } = current();
    const sort = state.conversationSort || { key: "anomalies", dir: "desc" };
    const key = CONVERSATION_SORT_LABELS[sort.key] ? sort.key : "anomalies";
    const factor = sort.dir === "asc" ? 1 : -1;
    return conversations.map((conv, index) => ({ conv, index })).sort((a, b) => {
      const av = conversationSortValue(a.conv, key);
      const bv = conversationSortValue(b.conv, key);
      let result = 0;
      if (typeof av === "number" && typeof bv === "number") {
        result = av - bv;
      } else {
        result = CONVERSATION_SORT_COLLATOR.compare(String(av), String(bv));
      }
      return result * factor || compareConversationFallback(a.conv, b.conv) || a.index - b.index;
    }).map(item => item.conv);
  }

  function renderConversationSortHeader(key, label) {
    const { escapeHtml, state } = current();
    const sort = state.conversationSort || { key: "anomalies", dir: "desc" };
    const active = sort.key === key;
    const direction = active ? (sort.dir === "asc" ? "ASC" : "DESC") : "";
    const title = `Sort conversations by ${label}${active ? ` (${direction})` : ""}`;
    return `<th><button class="th-sort conversation-sort ${active ? "active" : ""}" data-conversation-sort="${escapeHtml(key)}" title="${escapeHtml(title)}">${escapeHtml(label)}${direction ? ` <span>${direction}</span>` : ""}</button></th>`;
  }

  function conversationAnomalySummary(conv) {
    const { severityRank } = current();
    const items = conv.anomalyItems || [];
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    const byMetric = new Map();
    const byTitle = new Map();
    for (const item of items) {
      counts[item.severity] = (counts[item.severity] || 0) + 1;
      const metric = item.metric || "socket";
      byMetric.set(metric, (byMetric.get(metric) || 0) + 1);
      const key = `${item.severity}|${item.title}|${metric}`;
      if (!byTitle.has(key)) byTitle.set(key, { ...item, count: 0 });
      byTitle.get(key).count += 1;
    }
    const dominantSeverity = ["critical", "high", "medium", "low"].find(severity => counts[severity]) || "low";
    const topMetric = [...byMetric.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "rtt";
    const topItems = [...byTitle.values()].sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.count - a.count || a.title.localeCompare(b.title)).slice(0, 4);
    return { counts, dominantSeverity, topMetric, topItems, metrics: [...byMetric.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5) };
  }

  return {
    anomaliesBySocketId,
    buildConversations,
    compareConversationFallback,
    conversationAnomalySummary,
    conversationDefaultSortDir,
    conversationKey,
    conversationSortText,
    conversationSortValue,
    groupedSockets,
    renderConversationSortHeader,
    socketsById,
    sortConversations
  };
}
