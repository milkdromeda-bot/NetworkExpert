export function createIpIntelController(getDeps) {
  const current = () => getDeps();

  function scheduleIpIntelEnrichment() {
    const { publicPeerIps, render, state } = current();
    if (state.ipIntelRunning || !state.sockets.length) return;
    const pending = publicPeerIps(state.sockets)
      .filter(ip => !state.ipIntel[ip])
      .slice(0, 12);
    if (!pending.length) return;
    state.ipIntelRunning = true;
    pending.forEach(ip => { state.ipIntel[ip] = { status: "loading" }; });
    enrichIpIntelQueue(pending).finally(() => {
      state.ipIntelRunning = false;
      render();
    });
  }

  async function enrichIpIntelQueue(ips) {
    const { fetchRef = fetch, state } = current();
    for (const ip of ips) {
      try {
        const response = await fetchRef(`/api/ip-intel?ip=${encodeURIComponent(ip)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        state.ipIntel[ip] = { status: "done", data: await response.json() };
      } catch (error) {
        state.ipIntel[ip] = { status: "error", error: error.message };
      }
    }
  }

  return {
    enrichIpIntelQueue,
    scheduleIpIntelEnrichment
  };
}
