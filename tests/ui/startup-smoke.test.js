import assert from "node:assert/strict";
import { test } from "node:test";

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.innerHTML = "";
    this.className = "";
    this.dataset = {};
    this.style = {};
    this.value = "";
    this.children = [];
    this.classList = {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; }
    };
  }

  querySelector() { return null; }
  querySelectorAll() { return []; }
  addEventListener() {}
  removeEventListener() {}
  setAttribute() {}
  getAttribute() { return null; }
  appendChild(child) { this.children.push(child); return child; }
  focus() {}
}

class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function installStartupGlobals() {
  const app = new FakeElement("app");
  const elements = new Map([
    ["app", app],
    ["busyOverlay", new FakeElement("busyOverlay")],
    ["inlineBusy", new FakeElement("inlineBusy")],
    ["toastStack", new FakeElement("toastStack")],
    ["backToTop", new FakeElement("backToTop")]
  ]);

  globalThis.document = {
    documentElement: new FakeElement("html"),
    body: new FakeElement("body"),
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new FakeElement(id));
      return elements.get(id);
    },
    querySelector(selector) { return selector === "#app" ? app : null; },
    querySelectorAll() { return []; },
    createElement(tag) { return new FakeElement(tag); },
    addEventListener() {},
    removeEventListener() {}
  };
  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  globalThis.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {}
  });
  globalThis.IntersectionObserver = FakeIntersectionObserver;
  Object.defineProperty(globalThis, "navigator", {
    value: { serviceWorker: { register() {} } },
    configurable: true
  });
  globalThis.localStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  };
  globalThis.requestAnimationFrame = callback => { callback(); return 1; };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.setTimeout = callback => {
    if (typeof callback === "function") callback();
    return 1;
  };
  globalThis.clearTimeout = () => {};
  globalThis.performance = { now: () => 0 };
  globalThis.CodeMirror = {
    fromTextArea() {
      return {
        getValue() { return ""; },
        setValue() {},
        on() {},
        refresh() {},
        setOption() {},
        execCommand() {}
      };
    }
  };
  globalThis.Idiomorph = {
    morph(target, html) { target.innerHTML = String(html); }
  };
  return app;
}

test("browser startup renders instead of failing before the first view", async () => {
  const app = installStartupGlobals();

  await import(`../../src/rendering/main.js?startup-smoke=${Date.now()}`);

  assert.match(app.innerHTML, /Import your data|SS STATS TO PARSE|Ultimate Network Expert/);
  assert.doesNotMatch(app.innerHTML, /Render error/);
});
