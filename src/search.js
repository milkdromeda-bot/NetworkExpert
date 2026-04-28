export function parseAdvancedSearch(query) {
  const text = String(query || "").trim();
  if (!text) return [];
  return text.match(/"[^"]+"|\S+/g)?.map(raw => {
    const token = raw.replace(/^"|"$/g, "");
    const match = token.match(/^([a-zA-Z_.-]+)(>=|<=|!=|=|:|>|<)(.+)$/);
    if (!match) return { type: "plain", value: token.toLowerCase() };
    return {
      type: "field",
      key: match[1].toLowerCase(),
      op: match[2] === ":" ? "=" : match[2],
      value: match[3].replace(/^"|"$/g, "").toLowerCase()
    };
  }) || [];
}

function socketSearchField(socket, key, { metricValue, socketBandwidth }) {
  const values = {
    risk: socket.risk,
    state: socket.state,
    proto: socket.family,
    family: socket.family,
    local: socket.local,
    peer: socket.peer,
    src: socket.localAddress.host,
    srcip: socket.localAddress.host,
    dst: socket.peerAddress.host,
    dstip: socket.peerAddress.host,
    port: `${socket.localAddress.port || ""} ${socket.peerAddress.port || ""}`,
    srcport: socket.localAddress.port,
    dstport: socket.peerAddress.port,
    process: socket.details.process?.name || "",
    pid: socket.details.process?.pid || "",
    rtt: metricValue(socket, "rtt"),
    rto: metricValue(socket, "rto"),
    recvq: socket.recvQ,
    sendq: socket.sendQ,
    drops: metricValue(socket, "skmem.d"),
    cwnd: metricValue(socket, "cwnd"),
    tx: socketBandwidth(socket, "tx_bps"),
    rx: socketBandwidth(socket, "rx_bps")
  };
  return values[key] ?? metricValue(socket, key);
}

function compareSearchValue(actual, op, expected) {
  const severityRank = { low: 1, medium: 2, high: 3, critical: 4 };
  if (severityRank[String(actual).toLowerCase()] && severityRank[String(expected).toLowerCase()]) {
    const actualSeverity = severityRank[String(actual).toLowerCase()];
    const expectedSeverity = severityRank[String(expected).toLowerCase()];
    if (op === ">") return actualSeverity > expectedSeverity;
    if (op === ">=") return actualSeverity >= expectedSeverity;
    if (op === "<") return actualSeverity < expectedSeverity;
    if (op === "<=") return actualSeverity <= expectedSeverity;
    if (op === "!=") return actualSeverity !== expectedSeverity;
    return actualSeverity === expectedSeverity;
  }
  const actualNumber = Number(actual);
  const expectedNumber = Number(expected);
  if (Number.isFinite(actualNumber) && Number.isFinite(expectedNumber)) {
    if (op === ">") return actualNumber > expectedNumber;
    if (op === ">=") return actualNumber >= expectedNumber;
    if (op === "<") return actualNumber < expectedNumber;
    if (op === "<=") return actualNumber <= expectedNumber;
    if (op === "!=") return actualNumber !== expectedNumber;
    return actualNumber === expectedNumber;
  }
  const a = String(actual ?? "").toLowerCase();
  const e = String(expected ?? "").toLowerCase();
  if (op === "!=") return !a.includes(e);
  if (op === "=") return a.includes(e);
  return false;
}

export function socketMatchesAdvancedQuery(socket, query, deps) {
  const terms = parseAdvancedSearch(query);
  if (!terms.length) return true;
  const plainHaystack = [
    socket.risk,
    socket.state,
    socket.family,
    socket.local,
    socket.peer,
    socket.details.process?.name,
    socket.details.process?.pid,
    socket.raw
  ].join(" ").toLowerCase();
  return terms.every(term => {
    if (term.type === "plain") return plainHaystack.includes(term.value);
    return compareSearchValue(socketSearchField(socket, term.key, deps), term.op, term.value);
  });
}
