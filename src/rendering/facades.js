export function createMethodFacade(source, names) {
  return Object.fromEntries(names.map(name => [name, (...args) => source()[name](...args)]));
}

export function createFactoryFacade(source, names) {
  return Object.fromEntries(names.map(name => [name, () => source()[name]()]));
}
