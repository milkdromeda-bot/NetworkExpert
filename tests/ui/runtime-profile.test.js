import assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeProfile, emptyPreImportFilters } from "../../src/rendering/runtime-profile.js";

function deps(overrides = {}) {
  return {
    state: { prefs: { accessRole: "opsRoot", linuxProfile: "lxc", ubuntuVersion: "24.04" }, preImportFilters: { protocol: "tcp" } },
    ACCESS_ROLES: { analyst: { label: "Analyst" }, opsRoot: { label: "Ops/root" } },
    LINUX_PROFILES: { lxc: { label: "LXC" }, native: { label: "Native" } },
    UBUNTU_PROFILES: { "22.04": "Ubuntu 22.04", "24.04": "Ubuntu 24.04" },
    ...overrides
  };
}

test("runtime profile normalizes pre-import filters", () => {
  const profile = createRuntimeProfile(() => deps());

  assert.deepEqual(emptyPreImportFilters(), { enabled: false, protocol: "", state: "", srcIp: "", dstIp: "", anyPort: "", srcPort: "", dstPort: "" });
  assert.equal(profile.hasPreImportFilterValue(), true);
  assert.equal(profile.hasPreImportFilterValue({ protocol: "", srcIp: "" }), false);
  assert.deepEqual(profile.normalizePreImportFilters({ srcIp: "10.0.0.1" }).srcIp, "10.0.0.1");
});

test("runtime profile formats role and host commands", () => {
  const context = deps();
  const profile = createRuntimeProfile(() => context);

  assert.equal(profile.isLxcProfile(), true);
  assert.equal(profile.isAnalystRole(), false);
  assert.equal(profile.linuxProfileLabel(), "LXC");
  assert.equal(profile.ubuntuProfileLabel(), "Ubuntu 24.04");
  assert.equal(profile.accessRoleLabel(), "Ops/root");
  assert.equal(profile.envCommand("ss -tan"), "lxc exec <container> -- ss -tan");
  assert.equal(profile.commandForPeer({ peerAddress: { host: "10.0.0.5" } }), "# Run on the LXD host\nip route get 10.0.0.5");

  context.state.prefs.accessRole = "analyst";
  assert.equal(profile.envCommand("ss -tan", { host: true }), "# Request from ops/root on the LXD host:\nss -tan");
});
