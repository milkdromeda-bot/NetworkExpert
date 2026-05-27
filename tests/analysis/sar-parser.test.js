import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSar, correlateSarWithTcp } from "../../src/parsing/sar-parser.js";

const SAR_CPU = `Linux 5.15.0-91-generic (prod-server) 	05/25/2026 	_x86_64_	(8 CPU)

02:50:01 PM     CPU     %usr     %nice      %sys   %iowait    %steal     %idle
02:50:02 PM     all     12.50      0.00      3.75      1.25      0.00     82.50
02:50:03 PM     all     45.00      0.00      8.75      0.00      0.00     46.25
02:50:04 PM     all      5.00      0.00      2.50      0.00      0.00     92.50
`;

const SAR_MEM = `Linux 5.15.0-91-generic (prod-server) 	05/25/2026 	_x86_64_	(8 CPU)

02:50:01 PM kbmemfree kbmemused  %memused  kbbuffers  kbcached
02:50:02 PM   1024000  15000000     93.60     512000   8000000
02:50:03 PM    900000  15124000     94.37     512000   8000000
`;

const SAR_IO = `Linux 5.15.0-91-generic (prod-server) 	05/25/2026 	_x86_64_	(8 CPU)

02:50:01 PM       tps      rtps      wtps   bread/s   bwrtn/s
02:50:02 PM     45.00     12.00     33.00    192.00   1056.00
`;

test("parseSar parses CPU section", () => {
  const result = parseSar(SAR_CPU, "2026-05-25");
  assert.equal(result.cpu.length, 3);
  assert.equal(result.cpu[0].usr, 12.5);
  assert.equal(result.cpu[0].idle, 82.5);
  assert.equal(result.cpu[1].usr, 45);
});

test("parseSar parses memory section", () => {
  const result = parseSar(SAR_MEM, "2026-05-25");
  assert.equal(result.memory.length, 2);
  assert.equal(result.memory[0].kbmemfree, 1024000);
  assert.equal(result.memory[0].memused_pct, 93.6);
});

test("parseSar parses IO section", () => {
  const result = parseSar(SAR_IO, "2026-05-25");
  assert.equal(result.io.length, 1);
  assert.equal(result.io[0].tps, 45);
});

test("correlateSarWithTcp finds closest CPU sample to TCP event", () => {
  const sar = parseSar(SAR_CPU, "2026-05-25");
  const eventMs = sar.cpu[1].epochMs + 200; // 200ms after second sample
  const { correlations } = correlateSarWithTcp(sar, [{ epochMs: eventMs }]);
  assert.equal(correlations.length, 1);
  assert.equal(correlations[0].cpu.usr, 45);
});

test("correlateSarWithTcp returns empty when no match within window", () => {
  const sar = parseSar(SAR_CPU, "2026-05-25");
  const { correlations } = correlateSarWithTcp(sar, [{ epochMs: 0 }]);
  assert.equal(correlations.length, 0);
});
