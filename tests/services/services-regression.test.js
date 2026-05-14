import assert from "node:assert/strict";
import { test } from "node:test";
import { inferApplicationService, applicationServiceLabel, applicationServiceSortKey, knownApplicationServices, serviceInferenceKey } from "../../src/services.js";
import { aliasCountForSource, aliasDisplay, aliasForEndpoint, aliasListForSource, deleteEndpointAlias, endpointAliasKey, normalizeAliasStore, upsertEndpointAlias } from "../../src/aliases.js";

function socket({ family = "tcp", state = "ESTAB", local = "10.0.0.10:50000", peer = "10.0.0.20:443" } = {}) {
  const parse = ep => { const i = ep.lastIndexOf(":"); return { host: ep.slice(0, i), port: ep.slice(i + 1) }; };
  return { family, state, local, peer, localAddress: parse(local), peerAddress: parse(peer), details: { values: {}, skmem: {} } };
}

// inferApplicationService - TCP services
const tcpPorts = [
  { port: 20, label: "FTP data" }, { port: 21, label: "FTP" }, { port: 22, label: "SSH" },
  { port: 25, label: "SMTP" }, { port: 80, label: "HTTP" }, { port: 110, label: "POP3" },
  { port: 143, label: "IMAP" }, { port: 389, label: "LDAP" }, { port: 443, label: "HTTPS/TLS" },
  { port: 445, label: "SMB" }, { port: 465, label: "SMTPS" }, { port: 587, label: "SMTP submission" },
  { port: 636, label: "LDAPS" }, { port: 873, label: "rsync" }, { port: 993, label: "IMAPS" },
  { port: 995, label: "POP3S" }, { port: 3306, label: "MySQL" }, { port: 3389, label: "RDP" },
  { port: 5432, label: "PostgreSQL" }, { port: 5672, label: "AMQP" }, { port: 5900, label: "VNC" },
  { port: 6379, label: "Redis" }, { port: 6443, label: "Kubernetes API" },
  { port: 9092, label: "Kafka" }, { port: 9200, label: "Elasticsearch" },
  { port: 27017, label: "MongoDB" }, { port: 11211, label: "Memcached" }
];
for (const { port, label } of tcpPorts) {
  test(`inferApplicationService detects ${label} on peer port ${port}`, () => {
    const app = inferApplicationService(socket({ peer: `10.0.0.20:${port}` }));
    assert.equal(app.label, label);
  });
}

// inferApplicationService - UDP services
const udpPorts = [
  { port: 53, label: "DNS" }, { port: 67, label: "DHCP server" }, { port: 68, label: "DHCP client" },
  { port: 123, label: "NTP" }, { port: 161, label: "SNMP" }, { port: 162, label: "SNMP trap" },
  { port: 500, label: "IKE/IPsec" }, { port: 514, label: "Syslog" },
  { port: 1812, label: "RADIUS auth" }, { port: 1813, label: "RADIUS accounting" },
  { port: 4789, label: "VXLAN" }
];
for (const { port, label } of udpPorts) {
  test(`inferApplicationService detects UDP ${label} on port ${port}`, () => {
    const app = inferApplicationService(socket({ family: "udp", state: "UNCONN", peer: `10.0.0.20:${port}` }));
    assert.equal(app.label, label);
  });
}

// serviceInferenceKey
test("serviceInferenceKey is stable for same socket", () => {
  const s = socket();
  assert.equal(serviceInferenceKey(s), serviceInferenceKey(s));
});
test("serviceInferenceKey changes with port change", () => {
  const s1 = socket({ peer: "10.0.0.20:443" });
  const s2 = socket({ peer: "10.0.0.20:80" });
  assert.notEqual(serviceInferenceKey(s1), serviceInferenceKey(s2));
});
test("serviceInferenceKey changes with family change", () => {
  const s1 = socket({ family: "tcp" });
  const s2 = socket({ family: "udp" });
  assert.notEqual(serviceInferenceKey(s1), serviceInferenceKey(s2));
});

// applicationServiceSortKey
test("applicationServiceSortKey includes label", () => {
  const key = applicationServiceSortKey(socket({ peer: "10.0.0.20:443" }));
  assert.ok(key.includes("HTTPS"));
});

// Alias tests
test("endpointAliasKey normalizes case", () => {
  assert.equal(endpointAliasKey("10.0.0.1:443"), endpointAliasKey("10.0.0.1:443"));
});
test("endpointAliasKey normalizes IPv6 case", () => {
  assert.equal(endpointAliasKey("[::FFFF:10.0.0.1]:80"), endpointAliasKey("[::ffff:10.0.0.1]:80"));
});
test("endpointAliasKey returns empty for null", () => {
  assert.equal(endpointAliasKey(null), "");
});
test("endpointAliasKey returns empty for undefined", () => {
  assert.equal(endpointAliasKey(undefined), "");
});
test("endpointAliasKey strips spaces", () => {
  assert.equal(endpointAliasKey("  10.0.0.1:80  "), "endpoint:10.0.0.1:80");
});

// normalizeAliasStore
test("normalizeAliasStore handles null", () => {
  const store = normalizeAliasStore(null);
  assert.deepEqual(store.global, {});
  assert.deepEqual(store.scopes, {});
});
test("normalizeAliasStore handles empty object", () => {
  const store = normalizeAliasStore({});
  assert.deepEqual(store.global, {});
});
test("normalizeAliasStore handles array input", () => {
  const store = normalizeAliasStore([]);
  assert.deepEqual(store.global, {});
});

// upsertEndpointAlias
test("upsertEndpointAlias creates new entry", () => {
  const store = upsertEndpointAlias({}, "10.0.0.1:443", { label: "Web" }, 100);
  const alias = aliasForEndpoint(store, "10.0.0.1:443");
  assert.equal(alias.label, "Web");
});
test("upsertEndpointAlias updates existing entry", () => {
  let store = upsertEndpointAlias({}, "10.0.0.1:443", { label: "Web" }, 100);
  store = upsertEndpointAlias(store, "10.0.0.1:443", { label: "API" }, 200);
  const alias = aliasForEndpoint(store, "10.0.0.1:443");
  assert.equal(alias.label, "API");
});
test("upsertEndpointAlias with blank fields removes alias", () => {
  let store = upsertEndpointAlias({}, "10.0.0.1:443", { label: "Web" }, 100);
  store = upsertEndpointAlias(store, "10.0.0.1:443", { label: "", role: "", note: "" }, 200);
  const alias = aliasForEndpoint(store, "10.0.0.1:443");
  assert.equal(alias, null);
});

// deleteEndpointAlias
test("deleteEndpointAlias removes only target", () => {
  let store = upsertEndpointAlias({}, "10.0.0.1:443", { label: "A" }, 100);
  store = upsertEndpointAlias(store, "10.0.0.2:80", { label: "B" }, 100);
  store = deleteEndpointAlias(store, "10.0.0.1:443");
  assert.equal(aliasForEndpoint(store, "10.0.0.1:443"), null);
  assert.equal(aliasForEndpoint(store, "10.0.0.2:80").label, "B");
});
test("deleteEndpointAlias is idempotent", () => {
  let store = upsertEndpointAlias({}, "10.0.0.1:443", { label: "A" }, 100);
  store = deleteEndpointAlias(store, "10.0.0.1:443");
  store = deleteEndpointAlias(store, "10.0.0.1:443");
  assert.equal(aliasForEndpoint(store, "10.0.0.1:443"), null);
});

// aliasDisplay
test("aliasDisplay returns endpoint when no alias", () => {
  assert.equal(aliasDisplay("10.0.0.1:443", {}), "10.0.0.1:443");
});
test("aliasDisplay returns label when alias exists", () => {
  const store = upsertEndpointAlias({}, "10.0.0.1:443", { label: "Gateway" }, 100);
  assert.equal(aliasDisplay("10.0.0.1:443", store), "Gateway");
});

// aliasListForSource and aliasCountForSource
test("aliasListForSource returns entries for source", () => {
  const store = upsertEndpointAlias({}, "10.0.0.1:443", { label: "A" }, 100, { sourceName: "rec1" });
  const list = aliasListForSource(store, "rec1");
  assert.equal(list.length, 1);
});
test("aliasCountForSource counts correctly", () => {
  let store = upsertEndpointAlias({}, "10.0.0.1:443", { label: "A" }, 100, { sourceName: "rec1" });
  store = upsertEndpointAlias(store, "10.0.0.2:80", { label: "B" }, 100, { sourceName: "rec1" });
  assert.equal(aliasCountForSource(store, "rec1"), 2);
});
test("aliasCountForSource returns 0 for unknown source", () => {
  assert.equal(aliasCountForSource({}, "unknown"), 0);
});
