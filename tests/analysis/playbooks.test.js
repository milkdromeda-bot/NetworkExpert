import assert from "node:assert/strict";
import { test } from "node:test";

import { PLAYBOOKS, playbookForHypothesis, resolvePlaybook } from "../../src/playbooks.js";

test("playbooks covers all major hypothesis families", () => {
  const ids = PLAYBOOKS.map(pb => pb.id);
  assert.equal(ids.includes("slow-consumer"), true);
  assert.equal(ids.includes("network-congestion"), true);
  assert.equal(ids.includes("zero-window"), true);
  assert.equal(ids.includes("jvm-gc-stall"), true);
  assert.equal(ids.includes("buffer-pressure"), true);
  assert.equal(ids.includes("app-overproduction"), true);
});

test("playbooks have required sections", () => {
  for (const pb of PLAYBOOKS) {
    assert.equal(pb.local.length > 0, true, `${pb.id} missing local commands`);
    assert.equal(pb.peer.length > 0, true, `${pb.id} missing peer commands`);
    assert.equal(pb.host.length > 0, true, `${pb.id} missing host commands`);
    assert.equal(pb.doNotConclude.length > 0, true, `${pb.id} missing doNotConclude`);
    assert.equal(pb.mitigation.length > 0, true, `${pb.id} missing mitigation`);
  }
});

test("playbookForHypothesis returns correct playbook", () => {
  const pb = playbookForHypothesis("local-app-not-reading");
  assert.equal(pb.id, "slow-consumer");

  const pb2 = playbookForHypothesis("path-congestion-or-loss");
  assert.equal(pb2.id, "network-congestion");

  const pb3 = playbookForHypothesis("zero-window-or-slow-consumer");
  assert.equal(pb3.id, "slow-consumer");
});

test("playbookForHypothesis returns null for unknown hypothesis", () => {
  const pb = playbookForHypothesis("unknown-hypothesis-xyz");
  assert.equal(pb, null);
});

test("resolvePlaybook substitutes socket context variables", () => {
  const pb = playbookForHypothesis("local-app-not-reading");
  const socket = {
    local: "10.0.0.1:5000",
    peer: "10.0.0.2:443",
    peerAddress: { host: "10.0.0.2", port: "443" },
    localAddress: { host: "10.0.0.1", port: "5000" },
    details: {
      process: { name: "java", pid: 2155462 },
      skmem: { rb: 4059023 }
    }
  };
  const resolved = resolvePlaybook(pb, socket);

  assert.equal(resolved.title, "Slow consumer investigation");
  assert.equal(resolved.local.some(cmd => cmd.includes("2155462")), true);
  assert.equal(resolved.peer.some(cmd => cmd.includes("10.0.0.1")), true);
  assert.equal(resolved.local.every(cmd => !cmd.includes("{pid}")), true);
  assert.equal(resolved.peer.every(cmd => !cmd.includes("{localIp}")), true);
});

test("resolvePlaybook uses placeholders when socket has no process", () => {
  const pb = playbookForHypothesis("network-congestion-pattern");
  const socket = {
    local: "10.0.0.1:5000",
    peer: "10.0.0.2:443",
    peerAddress: { host: "10.0.0.2" },
    localAddress: { host: "10.0.0.1" },
    details: { skmem: {} }
  };
  const resolved = resolvePlaybook(pb, socket);

  assert.equal(resolved.local.some(cmd => cmd.includes("10.0.0.2")), true);
  assert.equal(resolved.doNotConclude.length > 0, true);
});

test("resolvePlaybook returns null for null playbook", () => {
  assert.equal(resolvePlaybook(null, {}), null);
});

test("playbooks match story pattern ids", () => {
  const pb = playbookForHypothesis("peer-stopped-reading");
  assert.equal(pb.id, "zero-window");

  const pb2 = playbookForHypothesis("buffer-exhaustion");
  assert.equal(pb2.id, "buffer-pressure");
});
