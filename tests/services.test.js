import test from "node:test";
import assert from "node:assert/strict";
import {
  applicationServiceLabel,
  applicationServiceSortKey,
  inferApplicationService,
  knownApplicationServices,
  serviceInferenceKey
} from "../src/services.js";

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

test("service inference key changes when identity fields change", () => {
  const target = socket({ peer: "10.0.0.2:443" });
  const before = serviceInferenceKey(target);
  target.peerAddress.port = "22";
  assert.notEqual(serviceInferenceKey(target), before);
});

test("service inference cache returns the same frozen object while a socket is unchanged", () => {
  const target = socket({ peer: "10.0.0.2:443" });
  const first = inferApplicationService(target);
  const second = inferApplicationService(target);
  assert.equal(first, second);
  assert.equal(Object.isFrozen(first), true);
});

test("service inference cache invalidates when endpoint ports mutate", () => {
  const target = socket({ peer: "10.0.0.2:443" });
  assert.equal(inferApplicationService(target).label, "HTTPS/TLS");
  target.peerAddress.port = "22";
  assert.equal(inferApplicationService(target).label, "SSH");
});

test("generated application service matrix covers 200 real inference cases", async t => {
  const tcp = Object.entries(knownApplicationServices.tcp);
  const udp = Object.entries(knownApplicationServices.udp);
  let cases = 0;

  for (let index = 0; index < 200; index += 1) {
    const mode = index % 5;
    const [tcpPort, tcpService] = tcp[index % tcp.length];
    const [udpPort, udpService] = udp[index % udp.length];
    const tcpPeer = `[::ffff:192.0.2.${index % 250}]:${tcpPort}`;
    const tcpLocal = `[::ffff:10.0.0.${index % 250}]:${tcpPort}`;
    const udpPeer = `198.51.100.${index % 250}:${udpPort}`;
    const label = mode === 3 ? udpService.label : tcpService.label;

    cases += 1;
    await t.test(`service case ${cases}: mode ${mode} resolves ${label}`, () => {
      const sample = [
        socket({ local: `10.0.0.10:${50000 + (index % 1000)}`, peer: tcpPeer }),
        socket({ state: "LISTEN", local: tcpLocal, peer: "[::]:*" }),
        socket({ local: tcpLocal, peer: `203.0.113.${index % 250}:${52000 + (index % 1000)}` }),
        socket({ family: "udp", state: "UNCONN", local: `10.0.0.10:${45000 + (index % 1000)}`, peer: udpPeer }),
        socket({ family: "tcp6", local: `[::ffff:172.16.0.${index % 250}]:${53000 + (index % 1000)}`, peer: tcpPeer })
      ][mode];
      const app = inferApplicationService(sample);
      assert.equal(app.label, label);
      assert.equal(app.layer, "application");
      assert.ok(["local", "peer"].includes(app.side));
      assert.ok(["high", "medium"].includes(app.confidence));
      assert.equal(app.transport, mode === 3 ? "udp" : "tcp");
    });
  }

  assert.equal(cases, 200);
});

test("invalid or ambiguous generated ports stay safely unresolved", async t => {
  const invalidPorts = ["", "*", "0", "-1", "65536", "not-a-port", "443/tcp", "  "];
  for (const value of invalidPorts) {
    await t.test(`invalid port ${JSON.stringify(value)}`, () => {
      assert.equal(inferApplicationService(socket({ local: `10.0.0.1:${value}`, peer: `10.0.0.2:${value}` })), null);
    });
  }
});
