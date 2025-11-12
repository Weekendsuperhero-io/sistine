import registryData from "../registry.json"

export const registry = registryData

export function getComponents() {
  return registry.items.filter(item => item.type === "registry:component")
}

export function getComponent(name: string) {
  return registry.items.find(
    (item) => item.name === name && item.type === "registry:component"
  ) || null
}

