import { metricValue } from "./parser.js";

export function addAnomaly(list, socket, severity, title, detail, metric) {
  list.push({ socketId: socket.id, severity, title, detail, metric });
}

export function riskForSocket(socket) {
  const scores = { critical: 4, high: 3, medium: 2, low: 1 };
  const anomalies = analyzeSocket(socket);
  return anomalies.reduce((max, item) => scores[item.severity] > scores[max] ? item.severity : max, "low");
}

export function analyzeSocket(socket) {
  const a = [];
  const v = socket.details.values;
  const m = socket.details.skmem;
  if (socket.details.timer?.retrans > 0) addAnomaly(a, socket, socket.details.timer.retrans > 2 ? "high" : "medium", "Active retransmissions", `${socket.details.timer.retrans} retransmission(s) on timer ${socket.details.timer.name}.`, "timer");
  if ((v.backoff || 0) > 0) addAnomaly(a, socket, v.backoff > 2 ? "critical" : "high", "TCP backoff", `Backoff ${v.backoff}; effective RTO grows exponentially.`, "backoff");
  if ((v.rto || 0) >= 1000) addAnomaly(a, socket, "high", "High RTO", `RTO ${v.rto} ms, a sign of a slow path or packet loss.`, "rto");
  if (v.rtt?.avg >= 150) addAnomaly(a, socket, v.rtt.avg > 300 ? "high" : "medium", "High RTT", `Average RTT ${v.rtt.avg} ms with deviation ${v.rtt.var || 0} ms.`, "rtt");
  if ((v.cwnd || 999) <= 4 && socket.state === "ESTAB") addAnomaly(a, socket, "medium", "Limited congestion window", `cwnd=${v.cwnd}; throughput may be capped, especially with high RTT.`, "cwnd");
  if (socket.sendQ > 262144) addAnomaly(a, socket, socket.sendQ > 1048576 ? "critical" : "high", "Large Send-Q", `Send-Q ${socket.sendQ} bytes: transmission is blocked or the receiver is slow.`, "sendQ");
  if (socket.recvQ > 131072) addAnomaly(a, socket, socket.recvQ > 524288 ? "critical" : "high", "Large Recv-Q", `Recv-Q ${socket.recvQ} bytes: the application or kernel is not consuming fast enough.`, "recvQ");
  if ((m.d || 0) > 0) addAnomaly(a, socket, m.d > 10 ? "critical" : "high", "Socket drops", `${m.d} packet(s) dropped before demultiplexing.`, "skmem.d");
  if (m.rb && m.r && m.r / m.rb > 0.8) addAnomaly(a, socket, "high", "Receive buffer pressure", `r=${m.r}, rb=${m.rb}; more than 80% of the receive buffer is used.`, "skmem.r");
  if (m.tb && (m.t + (m.w || 0)) / m.tb > 0.8) addAnomaly(a, socket, "high", "Send buffer pressure", `t+w=${(m.t || 0) + (m.w || 0)}, tb=${m.tb}; transmit socket memory is close to the cap.`, "skmem.t");
  if (socket.state === "LISTEN" && ["0.0.0.0", "::", "*"].includes(socket.localAddress.host)) addAnomaly(a, socket, "medium", "Globally exposed service", `${socket.local} listens on all interfaces.`, "listen");
  if (!socket.details.process && ["LISTEN", "ESTAB"].includes(socket.state)) addAnomaly(a, socket, "low", "Missing process owner", "Add -p or run with sudo to attribute the socket.", "process");
  return a;
}

export function analyzeAll(sockets) {
  const all = sockets.flatMap(analyzeSocket);
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return all.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function applyRisks(sockets) {
  return sockets.map(socket => ({ ...socket, risk: riskForSocket(socket) }));
}
