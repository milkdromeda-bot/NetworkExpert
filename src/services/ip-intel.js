export function isIpAddress(value = "") {
  const ip = String(value).trim();
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    return ip.split(".").every(part => Number(part) >= 0 && Number(part) <= 255);
  }
  return ip.includes(":") && /^[0-9a-fA-F:.]+$/.test(ip);
}

export function isPublicIp(ip = "") {
  const value = String(ip).trim().toLowerCase();
  if (!isIpAddress(value)) return false;
  if (value.includes(":")) {
    if (value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:")) return false;
    return true;
  }
  const [a, b] = value.split(".").map(Number);
  if (a === 10 || a === 127 || a === 0) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 169 && b === 254) return false;
  if (a >= 224) return false;
  return true;
}

export function publicPeerIps(sockets, limit = 80) {
  return [...new Set(sockets.map(socket => socket.peerAddress?.host).filter(isPublicIp))].slice(0, limit);
}

export function ipIntelSummary(intel) {
  if (!intel || intel.status === "loading") return "";
  if (intel.status === "error") return "IP intelligence unavailable";
  const data = intel.data || intel;
  if (data.public === false) return "Private/local IP";
  const location = [data.city, data.region, data.country].filter(Boolean).join(", ");
  const org = data.org || data.networkName || data.rdns?.[0] || "";
  return [org, location].filter(Boolean).join(" - ");
}

export function ipIntelDetail(intel) {
  if (!intel || intel.status === "loading") return "";
  const data = intel.data || intel;
  return [
    data.org || data.networkName ? `Org: ${data.org || data.networkName}` : "",
    data.networkName && data.networkName !== data.org ? `Network: ${data.networkName}` : "",
    data.address ? `Address: ${data.address}` : "",
    data.rdns?.length ? `rDNS: ${data.rdns.join(", ")}` : "",
    data.source ? `Source: ${data.source}` : ""
  ].filter(Boolean).join("\n");
}
