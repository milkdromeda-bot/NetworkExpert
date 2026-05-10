import test from "node:test";
import assert from "node:assert/strict";
import { applicationServiceLabel, applicationServiceSortKey, inferApplicationService } from "../src/services.js";

function socket({ family = "tcp", state = "ESTAB", local = "10.0.0.10:50000", peer = "10.0.0.20:443" } = {}) {
  const parse = endpoint => {
    const idx = endpoint.lastIndexOf(":");
    return { host: endpoint.slice(0, idx), port: endpoint.slice(idx + 1) };
  };
  return {
    family,
    state,
    local,
    peer,
    localAddress: parse(local),
    peerAddress: parse(peer),
    details: { values: {}, skmem: {} }
  };
}

test("detects SSH on a listening local port", () => {
  const app = inferApplicationService(socket({ state: "LISTEN", local: "0.0.0.0:22", peer: "0.0.0.0:*" }));
  assert.equal(app.label, "SSH");
  assert.equal(app.side, "local");
  assert.equal(app.confidence, "high");
});

test("detects SSH on a peer service port", () => {
  const app = inferApplicationService(socket({ local: "192.168.1.10:53444", peer: "192.168.1.20:22" }));
  assert.equal(app.label, "SSH");
  assert.equal(app.side, "peer");
});

test("detects FTP control and data ports", () => {
  assert.equal(applicationServiceLabel(socket({ peer: "10.0.0.2:21" })), "FTP");
  assert.equal(applicationServiceLabel(socket({ peer: "10.0.0.2:20" })), "FTP data");
});

test("detects HTTPS/TLS and alternate HTTPS ports", () => {
  assert.equal(applicationServiceLabel(socket({ peer: "10.0.0.2:443" })), "HTTPS/TLS");
  assert.equal(applicationServiceLabel(socket({ peer: "10.0.0.2:8443" })), "HTTPS alt");
});

test("detects UDP services from the UDP table", () => {
  const app = inferApplicationService(socket({ family: "udp", state: "UNCONN", local: "10.0.0.3:45321", peer: "8.8.8.8:53" }));
  assert.equal(app.label, "DNS");
  assert.equal(app.transport, "udp");
});

test("prefers local well-known server port when peer is ephemeral", () => {
  const app = inferApplicationService(socket({ state: "ESTAB", local: "10.0.0.3:5432", peer: "10.0.0.4:54000" }));
  assert.equal(app.label, "PostgreSQL");
  assert.equal(app.side, "local");
});

test("returns null for unknown ephemeral-to-ephemeral traffic", () => {
  assert.equal(inferApplicationService(socket({ local: "10.0.0.3:54000", peer: "10.0.0.4:54001" })), null);
});

test("sort key contains label and port for table sorting", () => {
  assert.equal(applicationServiceSortKey(socket({ peer: "10.0.0.2:22" })), "SSH 22");
});

for (const [port, label] of [
  [80, "HTTP"],
  [25, "SMTP"],
  [3306, "MySQL"],
  [6379, "Redis"],
  [9092, "Kafka"],
  [27017, "MongoDB"]
]) {
  test(`detects ${label} on TCP port ${port}`, () => {
    assert.equal(applicationServiceLabel(socket({ peer: `10.0.0.2:${port}` })), label);
  });
}
