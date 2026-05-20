import { metricValue } from "./parser.js";
import { socketIdentityKey, parsedTimestampSnapshots } from "./timeline.js";

const STORY_PATTERNS = [
  {
    id: "peer-stopped-reading",
    title: "Peer stopped reading",
    conclusion: "The remote peer likely stopped consuming data — slow consumer, GC pause, or application freeze.",
    steps: [
      { key: "sendQ-grow", test: (prev, curr) => curr.sendQ > 0 && curr.sendQ > (prev.sendQ || 0) * 1.5, label: "Send-Q grows" },
      { key: "persist-appears", test: (prev, curr) => curr.timerName === "persist" && prev.timerName !== "persist", label: "persist timer appears" },
      { key: "backoff-rises", test: (prev, curr) => curr.backoff > (prev.backoff || 0), label: "backoff increases" },
      { key: "fin-or-close", test: (prev, curr) => curr.state && /FIN-WAIT|CLOSE-WAIT|LAST-ACK/.test(curr.state) && prev.state === "ESTAB", label: "connection torn down" }
    ]
  },
  {
    id: "local-overload",
    title: "Local receiver overloaded",
    conclusion: "The local application cannot keep up — data accumulates until drops or reset.",
    steps: [
      { key: "recvQ-grow", test: (prev, curr) => curr.recvQ > 131072 && curr.recvQ > (prev.recvQ || 0) * 1.3, label: "Recv-Q grows" },
      { key: "drops-appear", test: (prev, curr) => (curr["skmem.d"] || 0) > (prev["skmem.d"] || 0), label: "socket drops increase" },
      { key: "rcv-space-shrink", test: (prev, curr) => prev.rcv_space > 0 && curr.rcv_space < prev.rcv_space * 0.5, label: "rcv_space collapses" }
    ]
  },
  {
    id: "path-blackhole",
    title: "Path dead / blackhole",
    conclusion: "The network path appears unresponsive — no ACKs returning, TCP gives up.",
    steps: [
      { key: "rto-grow", test: (prev, curr) => curr.rto > 1000 && curr.rto > (prev.rto || 0) * 1.5, label: "RTO escalates" },
      { key: "backoff-high", test: (prev, curr) => curr.backoff >= 4 && curr.backoff > (prev.backoff || 0), label: "backoff reaches high levels" },
      { key: "fin-or-close", test: (prev, curr) => curr.state && /FIN-WAIT|CLOSE-WAIT|LAST-ACK|TIME-WAIT/.test(curr.state) && prev.state === "ESTAB", label: "connection abandoned" }
    ]
  },
  {
    id: "congestion-event",
    title: "Network congestion event",
    conclusion: "Packet loss triggered TCP recovery — cwnd collapsed and throughput dropped.",
    steps: [
      { key: "cwnd-collapse", test: (prev, curr) => prev.cwnd > 4 && curr.cwnd > 0 && curr.cwnd <= 4, label: "cwnd collapses" },
      { key: "retrans-appear", test: (prev, curr) => curr.retrans > (prev.retrans || 0), label: "retransmissions appear" },
      { key: "rto-grow", test: (prev, curr) => curr.rto > (prev.rto || 0) && curr.rto >= 1000, label: "RTO grows" }
    ]
  },
  {
    id: "slow-consumer-backpressure",
    title: "Slow consumer backpressure",
    conclusion: "The receiver is applying backpressure — window shrinks, sender is throttled.",
    steps: [
      { key: "recvQ-grow", test: (prev, curr) => curr.recvQ > 131072 && curr.recvQ > (prev.recvQ || 0), label: "Recv-Q builds up" },
      { key: "rcv-space-shrink", test: (prev, curr) => prev.rcv_space > 8192 && curr.rcv_space < prev.rcv_space * 0.6, label: "rcv_space shrinks" },
      { key: "rwnd-limited", test: (prev, curr) => (curr.rwnd_limited_pct || 0) >= 20, label: "sender becomes rwnd_limited" }
    ]
  },
  {
    id: "buffer-exhaustion",
    title: "Buffer exhaustion",
    conclusion: "Socket memory pressure caused data loss — kernel dropped packets before the app could read them.",
    steps: [
      { key: "skmem-r-grow", test: (prev, curr) => (curr["skmem.r"] || 0) > (prev["skmem.r"] || 0) * 1.5 && (curr["skmem.r"] || 0) > 100000, label: "receive buffer fills" },
      { key: "drops-appear", test: (prev, curr) => (curr["skmem.d"] || 0) > (prev["skmem.d"] || 0), label: "drops begin" },
      { key: "recvQ-high", test: (prev, curr) => curr.recvQ > 262144, label: "Recv-Q critical" }
    ]
  },
  {
    id: "rwnd-limited-sender",
    title: "Sender throttled by receiver window",
    conclusion: "The sender spends most of its time waiting for the receiver to open its window — receiver-side backpressure or intentional flow control.",
    steps: [
      { key: "rwnd-high", test: (prev, curr) => (curr.rwnd_limited_pct || 0) >= 50, label: (prev, curr) => `rwnd_limited reaches ${curr.rwnd_limited_pct || 0}%` },
      { key: "sendQ-present", test: (prev, curr) => curr.sendQ > 0, label: "Send-Q shows queued data" },
      { key: "no-retrans", test: (prev, curr) => curr.retrans === 0 && curr.rto < 1000, label: "no loss/retransmission — not a network issue" }
    ]
  },
  {
    id: "zero-window-event",
    title: "Zero window announced",
    conclusion: "The receiver advertised a zero window — it cannot accept more data until the application drains the buffer.",
    steps: [
      { key: "recvQ-high", test: (prev, curr) => curr.recvQ > 65536, label: "Recv-Q accumulates" },
      { key: "rcv-space-zero", test: (prev, curr) => curr.rcv_space <= 0 || (prev.rcv_space > 0 && curr.rcv_space < 256), label: "rcv_space drops to zero" },
      { key: "persist-appears", test: (prev, curr) => curr.timerName === "persist" && prev.timerName !== "persist", label: "persist timer starts (sender probing)" }
    ]
  },
  {
    id: "process-disappeared",
    title: "Process disappeared",
    conclusion: "The owning process is no longer attached — the socket may be orphaned or the application crashed.",
    steps: [
      { key: "process-gone", test: (prev, curr) => prev.processName && !curr.processName, label: "process detaches from socket" },
      { key: "state-change", test: (prev, curr) => curr.state !== prev.state && /CLOSE-WAIT|FIN-WAIT|TIME-WAIT/.test(curr.state), label: "connection enters closing state" }
    ]
  }
];

function formatTime(epochMs) {
  if (!epochMs) return "??:??:??.??? UTC";
  const d = new Date(epochMs);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  const ms = String(d.getUTCMilliseconds()).padStart(3, "0");
  return `${h}:${m}:${s}.${ms} UTC`;
}

function buildSocketTimeline(snapshots, socketKey) {
  const rows = [];
  for (const snap of snapshots) {
    const socket = snap.sockets.find(s => socketIdentityKey(s) === socketKey)
      || snap.sockets.find(s => {
        const sk = s.details?.values?.sk;
        return sk && socketKey.includes(sk);
      });
    if (!socket) {
      rows.push({ epochMs: snap.epochMs, present: false, state: null, sendQ: 0, recvQ: 0, rto: 0, cwnd: 0, backoff: 0, retrans: 0, timerName: "", "skmem.d": 0, "skmem.r": 0, rcv_space: 0, rwnd_limited_pct: 0, processName: "" });
      continue;
    }
    rows.push({
      epochMs: snap.epochMs,
      present: true,
      state: socket.state,
      sendQ: Number(socket.sendQ || 0),
      recvQ: Number(socket.recvQ || 0),
      rto: metricValue(socket, "rto") || 0,
      cwnd: metricValue(socket, "cwnd") || 0,
      backoff: metricValue(socket, "backoff") || 0,
      retrans: socket.details?.timer?.retrans || 0,
      timerName: String(socket.details?.timer?.name || "").toLowerCase(),
      "skmem.d": metricValue(socket, "skmem.d") || 0,
      "skmem.r": metricValue(socket, "skmem.r") || 0,
      rcv_space: metricValue(socket, "rcv_space") || 0,
      rwnd_limited_pct: metricValue(socket, "rwnd_limited_pct") || 0,
      processName: socket.details?.process?.name || ""
    });
  }
  return rows;
}

function matchPattern(pattern, timeline) {
  const matched = [];
  let searchFrom = 0;

  for (const step of pattern.steps) {
    let found = false;
    for (let i = Math.max(1, searchFrom); i < timeline.length; i++) {
      if (!timeline[i].present && !timeline[i - 1].present) continue;
      if (step.test(timeline[i - 1], timeline[i])) {
        const label = typeof step.label === "function" ? step.label(timeline[i - 1], timeline[i]) : step.label;
        matched.push({ key: step.key, label, epochMs: timeline[i].epochMs, index: i });
        searchFrom = i;
        found = true;
        break;
      }
    }
    if (!found) break;
  }

  const minSteps = Math.max(2, Math.ceil(pattern.steps.length * 0.6));
  if (matched.length < minSteps) return null;

  return {
    patternId: pattern.id,
    title: pattern.title,
    conclusion: pattern.conclusion,
    matchedSteps: matched,
    totalSteps: pattern.steps.length,
    completeness: matched.length / pattern.steps.length,
    startMs: matched[0].epochMs,
    endMs: matched[matched.length - 1].epochMs
  };
}

function buildNarrative(story, socket) {
  const peer = socket?.peer || "unknown peer";
  const process = socket?.details?.process ? `${socket.details.process.name}:${socket.details.process.pid}` : "";
  const lines = story.matchedSteps.map(step =>
    `${formatTime(step.epochMs)} — ${step.label}`
  );
  const target = process ? `${process}→${peer}` : peer;
  lines.push(`→ ${story.conclusion} [${target}]`);
  return lines;
}

export function detectTimelineStories(raw = "", sockets = []) {
  const snapshots = parsedTimestampSnapshots(raw).filter(s => s.sockets.length > 0);
  if (snapshots.length < 2) return [];

  const socketKeys = new Set();
  for (const snap of snapshots) {
    for (const s of snap.sockets) socketKeys.add(socketIdentityKey(s));
  }

  const stories = [];
  for (const key of socketKeys) {
    const timeline = buildSocketTimeline(snapshots, key);
    const refSocket = snapshots.flatMap(s => s.sockets).find(s => socketIdentityKey(s) === key);

    for (const pattern of STORY_PATTERNS) {
      const match = matchPattern(pattern, timeline);
      if (!match) continue;
      stories.push({
        ...match,
        socketKey: key,
        socket: refSocket,
        narrative: buildNarrative(match, refSocket)
      });
    }
  }

  return stories.sort((a, b) => b.completeness - a.completeness || b.matchedSteps.length - a.matchedSteps.length);
}

export { STORY_PATTERNS };
