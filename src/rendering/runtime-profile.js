export function emptyPreImportFilters() {
  return { enabled: false, protocol: "", state: "", srcIp: "", dstIp: "", anyPort: "", srcPort: "", dstPort: "" };
}

export function createRuntimeProfile(getDeps) {
  const current = () => getDeps();

  function normalizePreImportFilters(filters = current().state.preImportFilters) {
    return { ...emptyPreImportFilters(), ...filters };
  }

  function hasPreImportFilterValue(filters) {
    const f = normalizePreImportFilters(filters);
    return [f.protocol, f.state, f.srcIp, f.dstIp, f.anyPort, f.srcPort, f.dstPort].some(Boolean);
  }

  function isLxcProfile() {
    const { state } = current();
    return state.prefs.linuxProfile !== "native";
  }

  function linuxProfileLabel() {
    const { LINUX_PROFILES, state } = current();
    return LINUX_PROFILES[state.prefs.linuxProfile]?.label || LINUX_PROFILES.lxc.label;
  }

  function ubuntuProfileLabel() {
    const { UBUNTU_PROFILES, state } = current();
    return UBUNTU_PROFILES[state.prefs.ubuntuVersion] || UBUNTU_PROFILES["22.04"];
  }

  function isAnalystRole() {
    const { state } = current();
    return state.prefs.accessRole !== "opsRoot";
  }

  function accessRoleLabel() {
    const { ACCESS_ROLES, state } = current();
    return ACCESS_ROLES[state.prefs.accessRole]?.label || ACCESS_ROLES.analyst.label;
  }

  function lxcCommand(command) {
    return `lxc exec <container> -- ${command}`;
  }

  function envCommand(command, { host = false } = {}) {
    if (isAnalystRole()) {
      return host ? `# Request from ops/root on the LXD host:\n${command}` : command;
    }
    if (!isLxcProfile()) return command;
    return host ? `# Run on the LXD host\n${command}` : lxcCommand(command);
  }

  function commandForPeer(socket) {
    const host = socket?.peerAddress?.host;
    const command = host && !["*", "0.0.0.0", "::"].includes(host) ? `ip route get ${host}` : "ip route get <peer-ip>";
    return envCommand(command, { host: isLxcProfile() && !isAnalystRole() });
  }

  return {
    accessRoleLabel,
    commandForPeer,
    emptyPreImportFilters,
    envCommand,
    hasPreImportFilterValue,
    isAnalystRole,
    isLxcProfile,
    linuxProfileLabel,
    lxcCommand,
    normalizePreImportFilters,
    ubuntuProfileLabel
  };
}
