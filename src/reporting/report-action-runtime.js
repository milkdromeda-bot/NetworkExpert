export function createReportActionRuntime(getDeps) {
  const current = () => getDeps();
  const call = (name, ...args) => {
    const fn = current()[name];
    if (typeof fn !== "function") throw new Error(`Missing report action dependency: ${name}`);
    return fn(...args);
  };
  const proxiedObject = name => new Proxy({}, {
    get(_target, prop) {
      const source = current()[name] || globalThis[name];
      const value = source?.[prop];
      return typeof value === "function" ? value.bind(source) : value;
    },
    set(_target, prop, value) {
      const source = current()[name] || globalThis[name];
      if (!source) return false;
      source[prop] = value;
      return true;
    },
    has(_target, prop) { return prop in ((current()[name] || globalThis[name]) || {}); },
    ownKeys() { return Reflect.ownKeys((current()[name] || globalThis[name]) || {}); },
    getOwnPropertyDescriptor(_target, prop) {
      const source = (current()[name] || globalThis[name]) || {};
      return Object.getOwnPropertyDescriptor(source, prop) || { configurable: true, enumerable: true, writable: true, value: source[prop] };
    }
  });
  const proxiedValue = name => new Proxy({}, {
    get(_target, prop) {
      const value = current()[name];
      if (prop === Symbol.toPrimitive) return () => value;
      if (prop === "toString") return () => String(value ?? "");
      if (prop === "valueOf") return () => value;
      return value?.[prop];
    }
  });

  return {
    call,
    fn: name => (...args) => call(name, ...args),
    state: proxiedObject("state"),
    document: proxiedObject("document"),
    window: proxiedObject("window"),
    APP_VERSION: proxiedValue("APP_VERSION")
  };
}
