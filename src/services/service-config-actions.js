export function handleServiceConfigAction(action, event, deps) {
  const {
    document,
    state,
    currentAliasDisplay,
    upsertEndpointAlias,
    deleteEndpointAlias,
    saveServiceAliases,
    upsertServiceOverride,
    deleteServiceOverride,
    saveServiceOverrides,
    upsertTopologyGroup,
    deleteTopologyGroup,
    saveCurrentTopology,
    toast,
    render
  } = deps;

  if (action === "saveServiceAlias") {
    const endpoint = document.querySelector("#aliasEndpoint")?.value?.trim() || "";
    if (!endpoint) {
      toast("Endpoint required", "Choose an IP:port endpoint before saving a service label.", "danger");
      return true;
    }
    const scope = document.querySelector("#aliasGlobal")?.checked ? "global" : "source";
    state.serviceAliases = upsertEndpointAlias(state.serviceAliases, endpoint, {
      label: document.querySelector("#aliasLabel")?.value || "",
      role: document.querySelector("#aliasRole")?.value || "",
      note: document.querySelector("#aliasNote")?.value || ""
    }, Date.now(), {
      sourceName: state.sourceName,
      scope
    });
    state.aliasEditKey = endpoint;
    state.aliasEditScope = scope;
    saveServiceAliases();
    toast("Service label saved", `${currentAliasDisplay(endpoint, { scope })} is now shown ${scope === "global" ? "globally" : "for this recording"}.`);
    render();
    return true;
  }

  if (action === "deleteServiceAlias") {
    const endpoint = document.querySelector("#aliasEndpoint")?.value?.trim() || "";
    const scope = document.querySelector("#aliasGlobal")?.checked ? "global" : "source";
    state.serviceAliases = deleteEndpointAlias(state.serviceAliases, endpoint, state.sourceName, { scope });
    saveServiceAliases();
    toast("Service label deleted", scope === "global" ? "Global endpoint label removed." : "Recording endpoint label removed.");
    render();
    return true;
  }

  if (action === "saveServiceOverride") {
    const hidden = Boolean(document.querySelector("#serviceOverrideHidden")?.checked);
    const label = document.querySelector("#serviceOverrideLabel")?.value?.trim() || "";
    if (!hidden && !label) {
      toast("Service name required", "Set a replacement service name, or choose to hide the inferred service.", "danger");
      return true;
    }
    const scope = document.querySelector("#serviceOverrideGlobal")?.checked ? "global" : "source";
    state.serviceOverrides = upsertServiceOverride(state.serviceOverrides, {
      target: document.querySelector("#serviceOverrideTarget")?.value || "port",
      endpoint: document.querySelector("#serviceOverrideEndpoint")?.value || "",
      port: document.querySelector("#serviceOverridePort")?.value || "",
      transport: document.querySelector("#serviceOverrideTransport")?.value || "",
      label,
      hidden,
      note: document.querySelector("#serviceOverrideNote")?.value || ""
    }, Date.now(), {
      sourceName: state.sourceName,
      scope
    });
    saveServiceOverrides();
    toast("Service classification saved", hidden ? "The inferred service is hidden for this scope." : `${label} now overrides the port heuristic for this scope.`);
    render();
    return true;
  }

  if (action === "deleteServiceOverride") {
    const scope = document.querySelector("#serviceOverrideGlobal")?.checked ? "global" : "source";
    state.serviceOverrides = deleteServiceOverride(state.serviceOverrides, {
      target: document.querySelector("#serviceOverrideTarget")?.value || "port",
      endpoint: document.querySelector("#serviceOverrideEndpoint")?.value || "",
      port: document.querySelector("#serviceOverridePort")?.value || "",
      transport: document.querySelector("#serviceOverrideTransport")?.value || ""
    }, {
      sourceName: state.sourceName,
      scope
    });
    saveServiceOverrides();
    toast("Service classification deleted", scope === "global" ? "Global override removed." : "Recording override removed.");
    render();
    return true;
  }

  if (action === "saveTopologyGroup") {
    const name = document.querySelector("#topologyName")?.value?.trim() || "";
    const match = document.querySelector("#topologyMatch")?.value?.trim() || "";
    if (!name || !match) {
      toast("Topology group incomplete", "Add a group name and at least one IP or IP:port matcher.", "danger");
      return true;
    }
    state.topology = upsertTopologyGroup(state.topology, {
      id: state.topologyEditId || "",
      name,
      match,
      color: document.querySelector("#topologyColor")?.value || "cyan",
      note: document.querySelector("#topologyNote")?.value || ""
    });
    state.topologyEditId = state.topology.groups[0]?.id || "";
    state.topologyDraftMatch = "";
    saveCurrentTopology();
    toast("Topology group saved", `${name} is mapped for ${state.sourceName}.`);
    render();
    return true;
  }

  if (action === "deleteTopologyGroup") {
    if (!state.topologyEditId) return true;
    state.topology = deleteTopologyGroup(state.topology, state.topologyEditId);
    state.topologyEditId = "";
    state.topologyDraftMatch = "";
    saveCurrentTopology();
    toast("Topology group deleted", "This recording topology was updated.");
    render();
    return true;
  }

  return false;
}
