import registryData from "../registry.json";

export const registry = registryData;

export function getComponents() {
  return registry.items.filter((item) => item.type === "registry:component").sort((a, b) => a.name.localeCompare(b.name));
}

export function getComponent(name: string) {
  return registry.items.find((item) => item.name === name && item.type === "registry:component") || null;
}
