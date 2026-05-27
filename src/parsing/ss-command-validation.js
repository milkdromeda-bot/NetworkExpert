const PORT_MAX = 65535;
const INTERVAL_MIN_SECONDS = 0.001;
const INTERVAL_MAX_SECONDS = 86400;

function cleanIp(value) {
  return String(value || "").trim().replace(/^\[|\]$/g, "");
}

function cleanPort(value) {
  return String(value || "").trim().replace(/^:/, "");
}

function parseDecimal(value) {
  return Number(String(value || "").trim().replace(",", "."));
}

export function validateIpv4Address(value) {
  const text = cleanIp(value);
  if (!text) return true;
  const parts = text.split(".");
  if (parts.length !== 4) return false;
  return parts.every(part => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

export function validateIpv6Address(value) {
  let text = cleanIp(value);
  if (!text || !text.includes(":")) return Boolean(text);
  text = text.replace(/%.+$/, "");
  if (!text || text === ":") return false;
  if ((text.match(/::/g) || []).length > 1) return false;

  let ipv4Tail = false;
  if (text.includes(".")) {
    const lastColon = text.lastIndexOf(":");
    const tail = text.slice(lastColon + 1);
    if (!validateIpv4Address(tail)) return false;
    ipv4Tail = true;
    text = `${text.slice(0, lastColon)}:0:0`;
  }

  const validHextet = part => /^[0-9a-fA-F]{1,4}$/.test(part);
  const compressed = text.includes("::");
  const [left = "", right = ""] = text.split("::");
  const leftParts = left ? left.split(":") : [];
  const rightParts = right ? right.split(":") : [];
  if (leftParts.some(part => !validHextet(part)) || rightParts.some(part => !validHextet(part))) return false;

  const count = leftParts.length + rightParts.length;
  if (compressed) return count < 8;
  return count === 8 || (ipv4Tail && count === 8);
}

export function validateIpAddress(value) {
  const text = cleanIp(value);
  if (!text) return { valid: true, message: "" };
  const valid = text.includes(":") ? validateIpv6Address(text) : validateIpv4Address(text);
  return {
    valid,
    message: valid ? "" : "Enter a valid IPv4 or IPv6 address."
  };
}

export function validateTcpUdpPort(value) {
  const text = cleanPort(value);
  if (!text) return { valid: true, message: "" };
  if (!/^\d+$/.test(text)) return { valid: false, message: "Use a numeric port from 1 to 65535." };
  const port = Number(text);
  return {
    valid: port >= 1 && port <= PORT_MAX,
    message: port >= 1 && port <= PORT_MAX ? "" : "Port must be between 1 and 65535."
  };
}

export function validateIntervalSeconds(value) {
  const number = parseDecimal(value);
  if (!Number.isFinite(number)) return { valid: false, message: "Use seconds, for example 1 or 0.01." };
  if (number < INTERVAL_MIN_SECONDS) return { valid: false, message: "Minimum interval is 0.001 s." };
  if (number > INTERVAL_MAX_SECONDS) return { valid: false, message: "Maximum interval is 86400 s." };
  if (number < 0.01) return { valid: true, level: "warning", message: "Very aggressive cadence; scheduler and disk may drift." };
  return { valid: true, message: "" };
}

export function validateSsCommandConfig(config = {}) {
  const fields = {
    intervalSeconds: validateIntervalSeconds(config.intervalSeconds || "1"),
    srcIp: validateIpAddress(config.srcIp),
    srcPort: validateTcpUdpPort(config.srcPort),
    dstIp: validateIpAddress(config.dstIp),
    dstPort: validateTcpUdpPort(config.dstPort)
  };
  const errors = Object.entries(fields)
    .filter(([, result]) => !result.valid)
    .map(([field, result]) => ({ field, message: result.message }));
  return {
    valid: errors.length === 0,
    fields,
    errors
  };
}
