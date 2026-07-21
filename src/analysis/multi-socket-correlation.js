import { metricValue } from "../parsing/parser.js";
import { parsedTimestampSnapshots, socketIdentityKey } from "../timeline/timeline.js";

const SYMPTOMS = [
  { id: "persist", label: "persist timer", test: (s) => String(s.details?.timer?.name || "").toLowerCase() === "persist" },
  { id: "high-recvQ", label: "Recv-Q > 128KB", test: (s) => Number(s.recvQ || 0) > 131072 },
  { id: "high-sendQ", label: "Send-Q > 256KB", test: (s) => Number(s.sendQ || 0) > 262144 },
  { id: "drops", label: "socket drops", test: (s) => metricValue(s, "skmem.d") > 0, cumulative: true, valueOf: (s) => metricValue(s, "skmem.d") },
  { id: "backoff", label: "backoff ≥ 2", test: (s) => metricValue(s, "backoff") >= 2 },
  { id: "rwnd-limited", label: "rwnd_limited > 50%", test: (s) => metricValue(s, "rwnd_limited_pct") >= 50 }
];

function processKey(socket) {
  const p = socket.details?.process;
  return p ? `${p.name}:${p.pid}` : null;
}

function peerHost(socket) {
  return socket.peerAddress?.host || socket.peer?.split(":")[0] || null;
}

function cgroupKey(socket) {
  const raw = socket.details?.raw || "";
  const match = raw.match(/cgroup:([^\s<]+)/);
  return match ? match[1] : null;
}

function formatTime(epochMs) {
  if (!epochMs) return "??:??:??.???";
  const d = new Date(epochMs);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}.${String(d.getUTCMilliseconds()).padStart(3, "0")} UTC`;
}

function detectGroupEvents(snapshots) {
  const events = [];
  // Track cumulative symptom state to avoid repeating per snapshot
  const cumulativeState = new Map(); // key: `${type}|${groupKey}|${symptomId}` -> { onsetEpoch, firstValue, lastValue, lastEpoch }

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];
    const epochMs = curr.epochMs;

    // Group by process
    const byProcess = new Map();
    for (const socket of curr.sockets) {
      const pk = processKey(socket);
      if (!pk) continue;
      if (!byProcess.has(pk)) byProcess.set(pk, []);
      byProcess.get(pk).push(socket);
    }

    for (const [proc, sockets] of byProcess) {
      if (sockets.length < 2) continue;

      for (const symptom of SYMPTOMS) {
        const affected = sockets.filter(s => symptom.test(s));
        if (affected.length < 2) continue;

        const cKey = `process-wide|${proc}|${symptom.id}`;

        if (symptom.cumulative) {
          const totalValue = affected.reduce((sum, s) => sum + (symptom.valueOf(s) || 0), 0);
          const existing = cumulativeState.get(cKey);
          if (!existing) {
            // First detection — record onset
            cumulativeState.set(cKey, { onsetEpoch: epochMs, firstValue: totalValue, lastValue: totalValue, lastEpoch: epochMs, socketCount: affected.length, totalSockets: sockets.length });
          } else {
            // Update with latest value
            existing.lastValue = totalValue;
            existing.lastEpoch = epochMs;
            existing.socketCount = Math.max(existing.socketCount, affected.length);
          }
          continue;
        }

        // Non-cumulative: use onset check as before
        const prevSockets = prev.sockets.filter(s => processKey(s) === proc);
        const prevAffected = prevSockets.filter(s => symptom.test(s));
        const isOnset = affected.length > prevAffected.length * 1.5 || (prevAffected.length === 0 && affected.length >= 2);

        if (isOnset) {
          events.push({
            type: "process-wide",
            groupKey: proc,
            symptomId: symptom.id,
            symptomLabel: symptom.label,
            epochMs,
            socketCount: affected.length,
            totalProcessSockets: sockets.length,
            ratio: affected.length / sockets.length,
            peers: [...new Set(affected.map(peerHost).filter(Boolean))].slice(0, 5)
          });
        }
      }
    }

    // Group by peer
    const byPeer = new Map();
    for (const socket of curr.sockets) {
      const ph = peerHost(socket);
      if (!ph) continue;
      if (!byPeer.has(ph)) byPeer.set(ph, []);
      byPeer.get(ph).push(socket);
    }

    for (const [peer, sockets] of byPeer) {
      if (sockets.length < 2) continue;

      for (const symptom of SYMPTOMS) {
        const affected = sockets.filter(s => symptom.test(s));
        if (affected.length < 2) continue;

        const cKey = `peer-wide|${peer}|${symptom.id}`;

        if (symptom.cumulative) {
          const totalValue = affected.reduce((sum, s) => sum + (symptom.valueOf(s) || 0), 0);
          const existing = cumulativeState.get(cKey);
          if (!existing) {
            cumulativeState.set(cKey, { onsetEpoch: epochMs, firstValue: totalValue, lastValue: totalValue, lastEpoch: epochMs, socketCount: affected.length, totalSockets: sockets.length, peer });
          } else {
            existing.lastValue = totalValue;
            existing.lastEpoch = epochMs;
            existing.socketCount = Math.max(existing.socketCount, affected.length);
          }
          continue;
        }

        const prevSockets = prev.sockets.filter(s => peerHost(s) === peer);
        const prevAffected = prevSockets.filter(s => symptom.test(s));
        const isOnset = affected.length > prevAffected.length * 1.5 || (prevAffected.length === 0 && affected.length >= 2);

        if (isOnset) {
          events.push({
            type: "peer-wide",
            groupKey: peer,
            symptomId: symptom.id,
            symptomLabel: symptom.label,
            epochMs,
            socketCount: affected.length,
            totalPeerSockets: sockets.length,
            ratio: affected.length / sockets.length,
            processes: [...new Set(affected.map(processKey).filter(Boolean))].slice(0, 5)
          });
        }
      }
    }

    // Group by cgroup (container)
    const byCgroup = new Map();
    for (const socket of curr.sockets) {
      const cg = cgroupKey(socket);
      if (!cg) continue;
      if (!byCgroup.has(cg)) byCgroup.set(cg, []);
      byCgroup.get(cg).push(socket);
    }

    for (const [cg, sockets] of byCgroup) {
      if (sockets.length < 2) continue;
      const uniqueProcesses = new Set(sockets.map(processKey).filter(Boolean));
      if (uniqueProcesses.size < 2) continue;

      for (const symptom of SYMPTOMS) {
        const affected = sockets.filter(s => symptom.test(s));
        if (affected.length < 2) continue;

        const cKey = `container-wide|${cg}|${symptom.id}`;

        if (symptom.cumulative) {
          const totalValue = affected.reduce((sum, s) => sum + (symptom.valueOf(s) || 0), 0);
          const existing = cumulativeState.get(cKey);
          if (!existing) {
            cumulativeState.set(cKey, { onsetEpoch: epochMs, firstValue: totalValue, lastValue: totalValue, lastEpoch: epochMs, socketCount: affected.length, totalSockets: sockets.length, processes: [...uniqueProcesses].slice(0, 5) });
          } else {
            existing.lastValue = totalValue;
            existing.lastEpoch = epochMs;
            existing.socketCount = Math.max(existing.socketCount, affected.length);
          }
          continue;
        }

        const prevSockets = prev.sockets.filter(s => cgroupKey(s) === cg);
        const prevAffected = prevSockets.filter(s => symptom.test(s));
        const isOnset = affected.length > prevAffected.length * 1.5 || (prevAffected.length === 0 && affected.length >= 2);

        if (isOnset) {
          events.push({
            type: "container-wide",
            groupKey: cg,
            symptomId: symptom.id,
            symptomLabel: symptom.label,
            epochMs,
            socketCount: affected.length,
            totalContainerSockets: sockets.length,
            ratio: affected.length / sockets.length,
            processes: [...uniqueProcesses].slice(0, 5)
          });
        }
      }
    }
  }

  // Convert consolidated cumulative symptoms into events (onset + final if value grew)
  for (const [cKey, state] of cumulativeState) {
    const [type, groupKey, symptomId] = cKey.split("|");
    const symptom = SYMPTOMS.find(s => s.id === symptomId);
    if (!symptom) continue;
    const ratio = state.socketCount / (state.totalSockets || 1);

    const baseEvent = {
      type,
      groupKey,
      symptomId,
      symptomLabel: symptom.label,
      epochMs: state.onsetEpoch,
      socketCount: state.socketCount,
      ratio,
      cumulative: true,
      firstValue: state.firstValue,
      lastValue: state.lastValue,
      onsetEpoch: state.onsetEpoch,
      lastEpoch: state.lastEpoch
    };

    if (type === "process-wide") {
      baseEvent.totalProcessSockets = state.totalSockets;
      baseEvent.peers = [];
    } else if (type === "peer-wide") {
      baseEvent.totalPeerSockets = state.totalSockets;
      baseEvent.processes = [];
    } else if (type === "container-wide") {
      baseEvent.totalContainerSockets = state.totalSockets;
      baseEvent.processes = state.processes || [];
    }

    events.push(baseEvent);
  }

  // Deduplicate: keep highest ratio per group+symptom+epoch
  const deduped = new Map();
  for (const e of events) {
    const key = e.cumulative ? `${e.type}|${e.groupKey}|${e.symptomId}|cumulative` : `${e.type}|${e.groupKey}|${e.symptomId}|${e.epochMs}`;
    const existing = deduped.get(key);
    if (!existing || e.ratio > existing.ratio) deduped.set(key, e);
  }

  return [...deduped.values()].sort((a, b) => b.ratio - a.ratio || b.socketCount - a.socketCount);
}

function buildGroupNarrative(event) {
  const time = formatTime(event.epochMs);

  if (event.cumulative) {
    const onsetTime = formatTime(event.onsetEpoch);
    const lastTime = formatTime(event.lastEpoch);
    const grew = event.lastValue > event.firstValue;
    const pct = Math.round(event.ratio * 100);

    if (event.type === "process-wide") {
      const progression = grew
        ? `${event.firstValue} → ${event.lastValue} total drops (${onsetTime} → ${lastTime})`
        : `${event.lastValue} total drops since ${onsetTime}`;
      return {
        title: `Process-wide symptom: ${event.groupKey}`,
        line: `${event.socketCount}/${event.totalProcessSockets} sockets (${pct}%) show ${event.symptomLabel}: ${progression}`,
        conclusion: `→ Persistent ${event.symptomLabel} on ${event.groupKey} — kernel dropped packets; check receiver application health and socket buffer configuration.`
      };
    }
    if (event.type === "container-wide") {
      const progression = grew
        ? `${event.firstValue} → ${event.lastValue} total drops (${onsetTime} → ${lastTime})`
        : `${event.lastValue} total drops since ${onsetTime}`;
      return {
        title: `Container-wide symptom: ${event.groupKey}`,
        line: `${event.socketCount}/${event.totalContainerSockets} sockets (${pct}%) show ${event.symptomLabel}: ${progression}`,
        conclusion: `→ Persistent ${event.symptomLabel} in container ${event.groupKey} — suspect host/NIC resource contention or container memory limits.`
      };
    }
    // peer-wide cumulative
    const progression = grew
      ? `${event.firstValue} → ${event.lastValue} total drops (${onsetTime} → ${lastTime})`
      : `${event.lastValue} total drops since ${onsetTime}`;
    return {
      title: `Peer-wide symptom: ${event.groupKey}`,
      line: `${event.socketCount}/${event.totalPeerSockets} sockets (${pct}%) to peer ${event.groupKey} show ${event.symptomLabel}: ${progression}`,
      conclusion: event.ratio >= 0.8
        ? `→ Persistent drops toward ${event.groupKey} — kernel dropped ${event.lastValue} packet(s). Investigate peer-side or receiver buffer exhaustion.`
        : `→ Partial peer correlation on ${event.groupKey} — ${event.socketCount} connections showing ${event.lastValue} total drops. Check if peer is overloaded.`
    };
  }

  if (event.type === "process-wide") {
    const pct = Math.round(event.ratio * 100);
    return {
      title: `Process-wide symptom: ${event.groupKey}`,
      line: `${time} — ${event.socketCount}/${event.totalProcessSockets} sockets (${pct}%) simultaneously show ${event.symptomLabel}`,
      conclusion: event.ratio >= 0.8
        ? `→ Common cause on ${event.groupKey} — strongly suggests process-level issue (GC/STW, deadlock, event loop stall). Validate with thread dump and GC logs at this timestamp.`
        : `→ Partial process correlation on ${event.groupKey} — ${event.socketCount} sockets affected. Investigate process health before blaming network.`
    };
  }
  if (event.type === "container-wide") {
    const pct = Math.round(event.ratio * 100);
    return {
      title: `Container-wide symptom: ${event.groupKey}`,
      line: `${time} — ${event.socketCount}/${event.totalContainerSockets} sockets (${pct}%) across ${event.processes.length} processes in ${event.groupKey} show ${event.symptomLabel}`,
      conclusion: event.ratio >= 0.8
        ? `→ Multiple processes affected in same container — suspect host/NIC/bridge/veth/qdisc/CPU steal rather than individual application issue.`
        : `→ Partial container correlation — ${event.socketCount} sockets across processes. Check container resource limits and host-side counters.`
    };
  }
  const pct = Math.round(event.ratio * 100);
  return {
    title: `Peer-wide symptom: ${event.groupKey}`,
    line: `${time} — ${event.socketCount}/${event.totalPeerSockets} sockets (${pct}%) to peer ${event.groupKey} show ${event.symptomLabel}`,
    conclusion: event.ratio >= 0.8
      ? `→ Common cause toward ${event.groupKey} — could be peer application, peer kernel, or network path to that peer. Investigate peer-side first.`
      : `→ Partial peer correlation on ${event.groupKey} — ${event.socketCount} connections impacted. Check if peer is overloaded or path is degraded.`
  };
}

export function detectMultiSocketCorrelation(raw = "") {
  const snapshots = parsedTimestampSnapshots(raw).filter(s => s.sockets.length > 0);
  if (snapshots.length < 2) return [];

  const events = detectGroupEvents(snapshots);
  return events.map(event => ({
    ...event,
    narrative: buildGroupNarrative(event)
  }));
}

export { SYMPTOMS };
