import { describe, it } from "node:test";
import assert from "node:assert";
import { parseSs } from "../src/parser.js";

function randomString(maxLen = 200) {
  const len = Math.floor(Math.random() * maxLen);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .:/-_=,()[]{}|\\\"'<>!@#$%^&*\n\t";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function randomSsLikeLine() {
  const states = ["ESTAB", "TIME-WAIT", "CLOSE-WAIT", "SYN-SENT", "LISTEN", "FIN-WAIT-1", "GARBAGE"];
  const state = states[Math.floor(Math.random() * states.length)];
  const q1 = Math.floor(Math.random() * 999999);
  const q2 = Math.floor(Math.random() * 999999);
  const ip = `${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}:${Math.floor(Math.random()*65536)}`;
  return `${state} ${q1} ${q2} ${ip} ${ip} ${randomString(100)}`;
}

describe("Parser fuzzing", () => {
  it("does not crash on 1000 random strings", () => {
    for (let i = 0; i < 1000; i++) {
      const input = randomString(500);
      assert.doesNotThrow(() => parseSs(input));
    }
  });

  it("does not crash on 1000 random ss-like lines", () => {
    for (let i = 0; i < 1000; i++) {
      const lines = Array.from({ length: Math.floor(Math.random() * 20) + 1 }, randomSsLikeLine).join("\n");
      assert.doesNotThrow(() => parseSs(lines));
    }
  });

  it("handles empty and edge-case inputs", () => {
    assert.doesNotThrow(() => parseSs(""));
    assert.doesNotThrow(() => parseSs("\n\n\n"));
    assert.doesNotThrow(() => parseSs(null));
    assert.doesNotThrow(() => parseSs(undefined));
    assert.doesNotThrow(() => parseSs("ESTAB"));
    assert.doesNotThrow(() => parseSs("ESTAB 0 0"));
    assert.doesNotThrow(() => parseSs("ESTAB 0 0 :::* :::*"));
    assert.doesNotThrow(() => parseSs("X".repeat(100000)));
  });
});
