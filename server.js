import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { isIP } from "node:net";
import { reverse } from "node:dns/promises";

const root = process.cwd();
const cliPortArg = process.argv.find(arg => arg.startsWith("--port="));
const port = Number(cliPortArg?.split("=")[1] || process.env.PORT || 4173);
const ipIntelCache = new Map();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function resolvePath(url) {
  const clean = decodeURIComponent(url.split("?")[0]);
  const target = clean === "/" ? "/index.html" : clean;
  const path = normalize(join(root, target));
  if (!path.startsWith(root)) return null;
  return path;
}

function isPublicIp(ip) {
  if (!isIP(ip)) return false;
  if (isIP(ip) === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    if (a >= 224) return false;
    return true;
  }
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) return false;
  return true;
}

function firstText(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(firstText).find(Boolean) || "";
  return "";
}

function parseVcard(entity = {}) {
  const rows = entity.vcardArray?.[1] || [];
  const result = {};
  for (const row of rows) {
    const [name, , , value] = row;
    if (name === "fn") result.name = firstText(value);
    if (name === "org") result.org = firstText(value);
    if (name === "adr" && Array.isArray(value)) {
      const parts = value.flat(Infinity).map(String).map(part => part.trim()).filter(Boolean);
      result.address = parts.join(", ");
      result.city = parts.length >= 3 ? parts.at(-3) : "";
      result.region = parts.length >= 2 ? parts.at(-2) : "";
    }
  }
  return result;
}

function parseRdap(data, ip, rdns) {
  const entities = (data.entities || []).map(entity => ({
    roles: entity.roles || [],
    handle: entity.handle || "",
    ...parseVcard(entity)
  }));
  const registrant = entities.find(entity => entity.roles.includes("registrant")) || entities.find(entity => entity.org || entity.name) || {};
  const abuse = entities.find(entity => entity.roles.includes("abuse")) || {};
  return {
    ip,
    public: true,
    source: "RDAP + reverse DNS",
    registry: data.port43 || data.rdapConformance?.[0] || "",
    networkName: data.name || data.handle || "",
    org: registrant.org || registrant.name || data.name || "",
    country: data.country || "",
    city: registrant.city || "",
    region: registrant.region || "",
    address: registrant.address || "",
    abuseOrg: abuse.org || abuse.name || "",
    rdns,
    confidence: registrant.org || data.name ? "registry" : rdns.length ? "reverse-dns" : "low"
  };
}

async function lookupIpIntel(ip) {
  if (!isPublicIp(ip)) return { ip, public: false, source: "local/private/reserved" };
  const cached = ipIntelCache.get(ip);
  if (cached && Date.now() - cached.cachedAt < 24 * 60 * 60 * 1000) return cached.data;

  let rdns = [];
  try {
    rdns = await reverse(ip);
  } catch {
    rdns = [];
  }

  try {
    const response = await fetch(`https://rdap.org/ip/${encodeURIComponent(ip)}`, {
      headers: { accept: "application/rdap+json, application/json" }
    });
    if (!response.ok) throw new Error(`RDAP ${response.status}`);
    const data = parseRdap(await response.json(), ip, rdns);
    ipIntelCache.set(ip, { cachedAt: Date.now(), data });
    return data;
  } catch (error) {
    const data = { ip, public: true, source: "reverse DNS only", rdns, error: error.message, confidence: rdns.length ? "reverse-dns" : "low" };
    ipIntelCache.set(ip, { cachedAt: Date.now(), data });
    return data;
  }
}

createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (requestUrl.pathname === "/api/ip-intel") {
    const ip = requestUrl.searchParams.get("ip") || "";
    if (!isIP(ip)) {
      res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "invalid ip" }));
      return;
    }
    const data = await lookupIpIntel(ip);
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, max-age=86400"
    });
    res.end(JSON.stringify(data));
    return;
  }

  const path = resolvePath(req.url || "/");
  if (!path) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(path);
    res.writeHead(200, {
      "content-type": types[extname(path)] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(port, () => {
  console.log(`NetworkExpert disponible sur http://localhost:${port}`);
});
