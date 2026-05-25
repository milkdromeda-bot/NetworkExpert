const DEFAULT_COLLATOR = new Intl.Collator("en", { numeric: true });

export function buildServiceMapData({
  sockets = [],
  anomalyMap = new Map(),
  topology = {},
  endpointPresentation = endpoint => ({ label: endpoint, alias: null }),
  topologyGroupForEndpoint = () => null,
  riskRank = () => 0,
  socketBandwidth = () => 0,
  sortCollator = DEFAULT_COLLATOR,
  maxSockets = 120,
  maxNodes = 18
} = {}) {
  const visibleSockets = sockets.slice(0, maxSockets);
  const processNodes = new Map();
  const localNodes = new Map();
  const peerNodes = new Map();
  const edges = [];
  const ensure = (map, id, label, kind, endpoint = "") => {
    if (!map.has(id)) {
      const presentation = endpoint ? endpointPresentation(endpoint) : null;
      map.set(id, {
        id,
        label: presentation?.label || label,
        rawLabel: label,
        endpoint,
        alias: presentation?.alias || null,
        topologyGroup: endpoint ? topologyGroupForEndpoint(topology, endpoint) : null,
        kind,
        count: 0,
        risk: "low",
        anomalies: 0
      });
    }
    return map.get(id);
  };

  for (const socket of visibleSockets) {
    const processLabel = socket.details?.process ? `${socket.details.process.name}:${socket.details.process.pid}` : "unknown process";
    const process = ensure(processNodes, `process:${processLabel}`, processLabel, "process");
    const local = ensure(localNodes, `local:${socket.local}`, socket.local, "local", socket.local);
    const peer = ensure(peerNodes, `peer:${socket.peer}`, socket.peer, "peer", socket.peer);
    const anomalyCount = anomalyMap.get(socket.id)?.length || 0;
    for (const node of [process, local, peer]) {
      node.count += 1;
      node.anomalies += anomalyCount;
      node.risk = riskRank(socket.risk) > riskRank(node.risk) ? socket.risk : node.risk;
    }
    edges.push({
      id: socket.id,
      from: process.id,
      mid: local.id,
      to: peer.id,
      risk: socket.risk,
      socket,
      anomalies: anomalyCount,
      weight: Math.max(1, (socket.sendQ || 0) + (socket.recvQ || 0) + socketBandwidth(socket, "tx_bps") / 100000)
    });
  }

  const sortNodes = nodes => [...nodes.values()].sort((a, b) => {
    const groupA = a.topologyGroup?.name || "\uffff";
    const groupB = b.topologyGroup?.name || "\uffff";
    return sortCollator.compare(groupA, groupB)
      || riskRank(b.risk) - riskRank(a.risk)
      || b.anomalies - a.anomalies
      || b.count - a.count;
  }).slice(0, maxNodes);

  return {
    processes: sortNodes(processNodes),
    locals: sortNodes(localNodes),
    peers: sortNodes(peerNodes),
    edges
  };
}

export function serviceMapConnectivityOrder(map = {}, { riskRank = () => 0 } = {}) {
  const edges = map.edges || [];
  const baseSort = nodes => (nodes || []).map((node, index) => ({ ...node, _mapOrder: index }));
  let processes = baseSort(map.processes);
  let locals = baseSort(map.locals);
  let peers = baseSort(map.peers);
  const averageRank = (ids, rank) => {
    const values = ids.map(id => rank.get(id)).filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Number.POSITIVE_INFINITY;
  };
  const sortByBarycenter = (nodes, connectedIds) => nodes.sort((a, b) =>
    averageRank(connectedIds(a), processRank) - averageRank(connectedIds(b), processRank)
    || riskRank(b.risk) - riskRank(a.risk)
    || b.anomalies - a.anomalies
    || b.count - a.count
    || a._mapOrder - b._mapOrder
  );

  let processRank = new Map(processes.map((node, index) => [node.id, index]));
  let localRank = new Map(locals.map((node, index) => [node.id, index]));
  let peerRank = new Map(peers.map((node, index) => [node.id, index]));

  locals = sortByBarycenter(locals, node => edges.filter(edge => edge.mid === node.id).map(edge => edge.from));
  localRank = new Map(locals.map((node, index) => [node.id, index]));
  peers.sort((a, b) =>
    averageRank(edges.filter(edge => edge.to === a.id).map(edge => edge.mid), localRank)
    - averageRank(edges.filter(edge => edge.to === b.id).map(edge => edge.mid), localRank)
    || riskRank(b.risk) - riskRank(a.risk)
    || b.anomalies - a.anomalies
    || b.count - a.count
    || a._mapOrder - b._mapOrder
  );
  peerRank = new Map(peers.map((node, index) => [node.id, index]));
  locals.sort((a, b) =>
    averageRank(edges.filter(edge => edge.mid === a.id).map(edge => edge.to), peerRank)
    - averageRank(edges.filter(edge => edge.mid === b.id).map(edge => edge.to), peerRank)
    || averageRank(edges.filter(edge => edge.mid === a.id).map(edge => edge.from), processRank)
    - averageRank(edges.filter(edge => edge.mid === b.id).map(edge => edge.from), processRank)
    || riskRank(b.risk) - riskRank(a.risk)
    || b.anomalies - a.anomalies
    || b.count - a.count
    || a._mapOrder - b._mapOrder
  );
  localRank = new Map(locals.map((node, index) => [node.id, index]));
  processes.sort((a, b) =>
    averageRank(edges.filter(edge => edge.from === a.id).map(edge => edge.mid), localRank)
    - averageRank(edges.filter(edge => edge.from === b.id).map(edge => edge.mid), localRank)
    || riskRank(b.risk) - riskRank(a.risk)
    || b.anomalies - a.anomalies
    || b.count - a.count
    || a._mapOrder - b._mapOrder
  );

  const clean = nodes => nodes.map(({ _mapOrder, ...node }) => node);
  return { processes: clean(processes), locals: clean(locals), peers: clean(peers) };
}

export function buildServiceMapRoutes(edges = [], positions = {}) {
  const sideEdges = new Map();
  const add = (nodeId, side, edge, otherY) => {
    const key = `${nodeId}|${side}`;
    if (!sideEdges.has(key)) sideEdges.set(key, []);
    sideEdges.get(key).push({ edge, otherY });
  };
  for (const edge of edges) {
    const a = positions[edge.from];
    const b = positions[edge.mid];
    const c = positions[edge.to];
    if (!a || !b || !c) continue;
    add(edge.from, "right", edge, b.y);
    add(edge.mid, "left", edge, a.y);
    add(edge.mid, "right", edge, c.y);
    add(edge.to, "left", edge, b.y);
  }
  const offsets = new Map();
  for (const [key, items] of sideEdges) {
    const sorted = items.sort((a, b) => a.otherY - b.otherY || a.edge.id.localeCompare(b.edge.id));
    const step = Math.min(8, Math.max(4, 22 / Math.max(1, sorted.length - 1 || 1)));
    sorted.forEach((item, index) => {
      offsets.set(`${item.edge.id}|${key}`, (index - (sorted.length - 1) / 2) * step);
    });
  }
  const offset = (edge, nodeId, side) => offsets.get(`${edge.id}|${nodeId}|${side}`) || 0;
  return new Map(edges.map(edge => {
    const a = positions[edge.from];
    const b = positions[edge.mid];
    const c = positions[edge.to];
    if (!a || !b || !c) return [edge.id, { d: "" }];
    const p1 = { x: a.x + 146, y: a.y + offset(edge, edge.from, "right") };
    const p2 = { x: b.x - 146, y: b.y + offset(edge, edge.mid, "left") };
    const p3 = { x: b.x + 146, y: b.y + offset(edge, edge.mid, "right") };
    const p4 = { x: c.x - 146, y: c.y + offset(edge, edge.to, "left") };
    const bend1 = Math.max(70, (p2.x - p1.x) * 0.42);
    const bend2 = Math.max(70, (p4.x - p3.x) * 0.42);
    const d = [
      `M ${p1.x} ${p1.y} C ${p1.x + bend1} ${p1.y}, ${p2.x - bend1} ${p2.y}, ${p2.x} ${p2.y}`,
      `M ${p3.x} ${p3.y} C ${p3.x + bend2} ${p3.y}, ${p4.x - bend2} ${p4.y}, ${p4.x} ${p4.y}`
    ].join(" ");
    return [edge.id, { d }];
  }));
}
