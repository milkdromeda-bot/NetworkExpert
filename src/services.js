const TCP_SERVICES = {
  20: service("ftp-data", "FTP data", "File transfer data channel."),
  21: service("ftp", "FTP", "File Transfer Protocol control channel."),
  22: service("ssh", "SSH", "Secure shell, remote administration, tunneling, and secure copy."),
  25: service("smtp", "SMTP", "Mail transfer between servers."),
  53: service("dns", "DNS", "Domain name lookup over TCP, often used for large replies or zone transfers."),
  80: service("http", "HTTP", "Clear-text web or API traffic."),
  110: service("pop3", "POP3", "Mailbox retrieval."),
  143: service("imap", "IMAP", "Mailbox access."),
  389: service("ldap", "LDAP", "Directory service lookup."),
  443: service("https", "HTTPS/TLS", "Encrypted web, API, or TLS-wrapped application traffic."),
  445: service("smb", "SMB", "Windows file sharing and domain traffic."),
  465: service("smtps", "SMTPS", "Implicit TLS mail submission or relay."),
  587: service("smtp-submission", "SMTP submission", "Authenticated mail submission."),
  636: service("ldaps", "LDAPS", "TLS-protected directory service lookup."),
  873: service("rsync", "rsync", "File synchronization."),
  993: service("imaps", "IMAPS", "TLS-protected mailbox access."),
  995: service("pop3s", "POP3S", "TLS-protected mailbox retrieval."),
  2049: service("nfs", "NFS", "Network file system traffic."),
  2379: service("etcd-client", "etcd client", "etcd client API."),
  2380: service("etcd-peer", "etcd peer", "etcd cluster peer traffic."),
  3306: service("mysql", "MySQL", "MySQL or MariaDB database traffic."),
  3389: service("rdp", "RDP", "Remote Desktop Protocol."),
  5432: service("postgresql", "PostgreSQL", "PostgreSQL database traffic."),
  5672: service("amqp", "AMQP", "AMQP broker traffic, commonly RabbitMQ."),
  5900: service("vnc", "VNC", "Remote framebuffer access."),
  6379: service("redis", "Redis", "Redis database/cache traffic."),
  6443: service("kubernetes-api", "Kubernetes API", "Kubernetes API server traffic."),
  8080: service("http-alt", "HTTP alt", "Common alternate HTTP service port."),
  8081: service("http-alt", "HTTP alt", "Common alternate HTTP service port."),
  8443: service("https-alt", "HTTPS alt", "Common alternate HTTPS/TLS service port."),
  9092: service("kafka", "Kafka", "Kafka broker traffic."),
  9200: service("elasticsearch", "Elasticsearch", "Elasticsearch HTTP API traffic."),
  9300: service("elasticsearch-transport", "Elasticsearch transport", "Elasticsearch cluster transport traffic."),
  11211: service("memcached", "Memcached", "Memcached cache traffic."),
  15672: service("rabbitmq-mgmt", "RabbitMQ management", "RabbitMQ management UI/API."),
  27017: service("mongodb", "MongoDB", "MongoDB database traffic.")
};

const UDP_SERVICES = {
  53: service("dns", "DNS", "Domain name lookup over UDP."),
  67: service("dhcp-server", "DHCP server", "DHCP server-side traffic."),
  68: service("dhcp-client", "DHCP client", "DHCP client-side traffic."),
  123: service("ntp", "NTP", "Network time synchronization."),
  161: service("snmp", "SNMP", "Network device telemetry polling."),
  162: service("snmp-trap", "SNMP trap", "Network device telemetry traps."),
  500: service("ike", "IKE/IPsec", "IPsec key exchange."),
  514: service("syslog", "Syslog", "System log forwarding."),
  1812: service("radius-auth", "RADIUS auth", "RADIUS authentication."),
  1813: service("radius-acct", "RADIUS accounting", "RADIUS accounting."),
  4789: service("vxlan", "VXLAN", "Overlay network encapsulation.")
};

const LOW_SERVICE_PORT_MAX = 1024;
const LINUX_EPHEMERAL_START = 32768;

function service(id, label, description) {
  return { id, label, description };
}

function normalizeFamily(family = "") {
  const value = String(family).toLowerCase();
  if (value.includes("udp")) return "udp";
  if (value.includes("tcp") || !value) return "tcp";
  return value;
}

function portNumber(value) {
  if (value == null) return null;
  const cleaned = String(value).trim().replace(/^\*$/, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const port = Number(cleaned);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
}

function isWildcardEndpoint(endpoint = {}) {
  const host = String(endpoint.host || "").toLowerCase();
  return host === "*" || host === "0.0.0.0" || host === "::" || host === "0.0.0.0/0";
}

function serviceForPort(port, family) {
  const transport = normalizeFamily(family);
  return (transport === "udp" ? UDP_SERVICES[port] : TCP_SERVICES[port]) || TCP_SERVICES[port] || UDP_SERVICES[port] || null;
}

function candidate(port, side, socket) {
  const item = serviceForPort(port, socket?.family);
  if (!item) return null;
  const listening = String(socket?.state || "").toUpperCase() === "LISTEN";
  const localWildcard = side === "local" && isWildcardEndpoint(socket?.localAddress);
  const likelyServer = listening || localWildcard || port <= LOW_SERVICE_PORT_MAX;
  const peerService = side === "peer" && port < LINUX_EPHEMERAL_START;
  const confidence = likelyServer || peerService ? "high" : "medium";
  return {
    ...item,
    port,
    side,
    layer: "application",
    confidence,
    transport: normalizeFamily(socket?.family)
  };
}

export function inferApplicationService(socket = {}) {
  const localPort = portNumber(socket?.localAddress?.port);
  const peerPort = portNumber(socket?.peerAddress?.port);
  const state = String(socket?.state || "").toUpperCase();

  if (state === "LISTEN") {
    return candidate(localPort, "local", socket);
  }

  const peer = candidate(peerPort, "peer", socket);
  const local = candidate(localPort, "local", socket);
  if (peer && (!local || peer.port < LINUX_EPHEMERAL_START || local.port >= LINUX_EPHEMERAL_START)) return peer;
  if (local) return local;
  return peer || null;
}

export function applicationServiceLabel(socket = {}) {
  return inferApplicationService(socket)?.label || "";
}

export function applicationServiceSortKey(socket = {}) {
  const app = inferApplicationService(socket);
  return app ? `${app.label} ${app.port}` : "";
}

export const knownApplicationServices = {
  tcp: TCP_SERVICES,
  udp: UDP_SERVICES
};
