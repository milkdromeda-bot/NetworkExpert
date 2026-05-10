import assert from "node:assert/strict";
import { test } from "node:test";
import { importSocketFile } from "../src/importer.js";

function textFile(name, text) {
  const file = new Blob([text], { type: "text/plain" });
  file.name = name;
  return file;
}

test("pre-import filtering keeps only matching destination port blocks", async () => {
  const raw = [
    "--- 2026-04-27 16:24:13 ---",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1",
    "--- 2026-04-27 16:24:14 ---",
    "ESTAB 0 0 10.0.0.3:1001 10.0.0.4:80 rtt:2/0.2"
  ].join("\n");

  const result = await importSocketFile(textFile("capture.log", raw), {
    formatNumber: String,
    preFilter: { enabled: true, dstPort: "443" },
    onProgress() {}
  });

  assert.equal(result.sockets.length, 1);
  assert.match(result.raw, /2026-04-27 16:24:13/);
  assert.doesNotMatch(result.raw, /10\.0\.0\.4:80/);
});

test("pre-import anyPort filter matches local or peer port", async () => {
  const raw = [
    "ESTAB 0 0 10.0.0.1:9100 10.0.0.2:55555 rtt:1/0.1",
    "ESTAB 0 0 10.0.0.3:1001 10.0.0.4:80 rtt:2/0.2"
  ].join("\n");

  const result = await importSocketFile(textFile("capture.log", raw), {
    formatNumber: String,
    preFilter: { enabled: true, anyPort: "9100" },
    onProgress() {}
  });

  assert.equal(result.sockets.length, 1);
  assert.equal(result.sockets[0].localAddress.port, "9100");
});

test("pre-import protocol filter keeps tcp6 when tcp is requested", async () => {
  const raw = [
    "tcp6 ESTAB 0 0 [::ffff:10.0.0.1]:1000 [::ffff:10.0.0.2]:443 rtt:1/0.1",
    "udp UNCONN 0 0 10.0.0.3:53 0.0.0.0:*"
  ].join("\n");

  const result = await importSocketFile(textFile("capture.log", raw), {
    formatNumber: String,
    preFilter: { enabled: true, protocol: "tcp" },
    onProgress() {}
  });

  assert.equal(result.sockets.length, 1);
  assert.equal(result.sockets[0].family, "tcp6");
});

test("streaming import reports progressive observation updates for larger text files", async () => {
  const line = "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1\n";
  const raw = line.repeat(3000);
  let progressCalls = 0;
  let lastDetail = "";

  const result = await importSocketFile(textFile("large.log", raw), {
    formatNumber: String,
    preFilter: null,
    onProgress(update) {
      progressCalls += 1;
      lastDetail = update.status?.detail || lastDetail;
    }
  });

  assert.equal(result.sockets.length, 3000);
  assert.ok(progressCalls >= 1);
  assert.match(lastDetail, /socket observations scanned/);
  assert.doesNotMatch(lastDetail, /sockets kept/);
});

test("pre-import state filter keeps only matching socket states", async () => {
  const raw = [
    "LISTEN 0 128 0.0.0.0:22 0.0.0.0:*",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:1/0.1"
  ].join("\n");

  const result = await importSocketFile(textFile("capture.log", raw), {
    formatNumber: String,
    preFilter: { enabled: true, state: "LISTEN" },
    onProgress() {}
  });

  assert.equal(result.sockets.length, 1);
  assert.equal(result.sockets[0].state, "LISTEN");
});

test("pre-import source IP filter keeps matching local endpoints", async () => {
  const raw = [
    "ESTAB 0 0 192.168.145.205:20002 192.168.145.204:57067 rtt:1/0.1",
    "ESTAB 0 0 10.0.0.1:1000 10.0.0.2:443 rtt:2/0.2"
  ].join("\n");

  const result = await importSocketFile(textFile("capture.log", raw), {
    formatNumber: String,
    preFilter: { enabled: true, srcIp: "192.168.145.205" },
    onProgress() {}
  });

  assert.equal(result.sockets.length, 1);
  assert.equal(result.sockets[0].localAddress.host, "192.168.145.205");
});
