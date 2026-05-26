/**
 * Geographic peer map — plots peers on a world map using country centroids.
 * Uses IP intel country field for positioning. No external dependency.
 */

// Country centroids (lat, lon) — ISO 3166-1 alpha-2
const CENTROIDS = {
  US: [39.8, -98.5], GB: [54.0, -2.0], DE: [51.2, 10.4], FR: [46.2, 2.2], NL: [52.1, 5.3],
  IE: [53.4, -8.2], JP: [36.2, 138.3], SG: [1.4, 103.8], AU: [-25.3, 133.8], IN: [20.6, 79.0],
  BR: [-14.2, -51.9], CA: [56.1, -106.3], CN: [35.9, 104.2], KR: [35.9, 128.0], HK: [22.3, 114.2],
  SE: [60.1, 18.6], FI: [61.9, 25.7], NO: [60.5, 8.5], DK: [56.3, 9.5], CH: [46.8, 8.2],
  IT: [41.9, 12.6], ES: [40.5, -3.7], PL: [51.9, 19.1], CZ: [49.8, 15.5], AT: [47.5, 14.6],
  BE: [50.5, 4.5], PT: [39.4, -8.2], RU: [61.5, 105.3], ZA: [-30.6, 22.9], AE: [23.4, 53.8],
  IL: [31.0, 34.9], TW: [23.7, 121.0], MY: [4.2, 101.9], TH: [15.9, 100.9], ID: [-0.8, 113.9],
  PH: [12.9, 121.8], VN: [14.1, 108.3], MX: [23.6, -102.6], AR: [-38.4, -63.6], CL: [-35.7, -71.5],
  CO: [4.6, -74.3], NZ: [-40.9, 174.9], EG: [26.8, 30.8], NG: [9.1, 8.7], KE: [-0.0, 37.9]
};

/**
 * Build geo markers from IP intel data.
 * @param {Object<string, {status: string, data?: {country?: string, city?: string, org?: string}}>} ipIntel
 * @param {object[]} sockets
 * @returns {Array<{ip: string, lat: number, lon: number, country: string, label: string, socketCount: number}>}
 */
export function buildGeoMarkers(ipIntel, sockets) {
  const peerCounts = new Map();
  for (const s of sockets) {
    const ip = s.peerAddress?.host;
    if (ip) peerCounts.set(ip, (peerCounts.get(ip) || 0) + 1);
  }

  const markers = [];
  for (const [ip, intel] of Object.entries(ipIntel)) {
    if (intel.status !== "done" || !intel.data?.country) continue;
    const cc = intel.data.country.toUpperCase().slice(0, 2);
    const coords = CENTROIDS[cc];
    if (!coords) continue;
    // Jitter to avoid overlap
    const jitter = markers.filter(m => m.country === cc).length;
    markers.push({
      ip,
      lat: coords[0] + jitter * 1.5,
      lon: coords[1] + jitter * 2,
      country: cc,
      label: intel.data.city || intel.data.org || cc,
      socketCount: peerCounts.get(ip) || 0
    });
  }
  return markers;
}

/**
 * Render an SVG world map with peer markers.
 * Uses equirectangular projection (simple lat/lon → x/y).
 * @param {Array<{ip: string, lat: number, lon: number, country: string, label: string, socketCount: number}>} markers
 * @param {{ width?: number, height?: number }} [options]
 * @returns {string} SVG markup
 */
export function renderGeoMapSvg(markers, { width = 800, height = 400 } = {}) {
  const toX = lon => ((lon + 180) / 360) * width;
  const toY = lat => ((90 - lat) / 180) * height;

  const dots = markers.map(m => {
    const x = toX(m.lon);
    const y = toY(m.lat);
    const r = Math.min(12, 4 + m.socketCount * 0.5);
    const color = m.socketCount > 10 ? "#ff5c77" : m.socketCount > 3 ? "#ffd166" : "#4cde8a";
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="0.8" stroke="#fff" stroke-width="0.5">
      <title>${m.ip} — ${m.label} (${m.socketCount} socket${m.socketCount > 1 ? "s" : ""})</title>
    </circle>
    <text x="${x}" y="${y - r - 3}" text-anchor="middle" font-size="9" fill="#c4d0de">${m.label}</text>`;
  }).join("\n");

  return `<svg viewBox="0 0 ${width} ${height}" class="geo-map" role="img" aria-label="Geographic peer distribution">
    <rect width="${width}" height="${height}" fill="rgba(10,14,20,0.6)" rx="8"/>
    <!-- Grid lines -->
    ${[0, 30, 60, 90, 120, 150].map(lon => `<line x1="${toX(lon)}" x2="${toX(lon)}" y1="0" y2="${height}" stroke="rgba(255,255,255,0.04)"/><line x1="${toX(-lon)}" x2="${toX(-lon)}" y1="0" y2="${height}" stroke="rgba(255,255,255,0.04)"/>`).join("")}
    ${[0, 30, 60].map(lat => `<line x1="0" x2="${width}" y1="${toY(lat)}" y2="${toY(lat)}" stroke="rgba(255,255,255,0.04)"/><line x1="0" x2="${width}" y1="${toY(-lat)}" y2="${toY(-lat)}" stroke="rgba(255,255,255,0.04)"/>`).join("")}
    <!-- Equator -->
    <line x1="0" x2="${width}" y1="${toY(0)}" y2="${toY(0)}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4,4"/>
    <!-- Markers -->
    ${dots}
    ${markers.length === 0 ? `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="13" fill="#8cb7ff">No geolocated peers — IP intel needs public IPs with country data</text>` : ""}
  </svg>`;
}
