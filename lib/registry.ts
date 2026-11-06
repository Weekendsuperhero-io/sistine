import registryData from "../registry.json";

export const registry = registryData;

export function getComponents() {
  return registry.items.filter((item) => item.type === "registry:component").sort((a, b) => a.name.localeCompare(b.name));
}

/** A UI component is one whose own source lives in components/ui/. The registry's other "components"
 *  (AutoForeground, ReadableText, the backgrounds, GradientText) are theme utilities and effects that
 *  live in components/ directly; listing them as components put them among buttons and dialogs. Read off
 *  the files rather than a hand-kept list, so a new item lands in the right group on its own. */
const isUiComponent = (item: ReturnType<typeof getComponents>[number]) => item.files?.some((f) => f.path.startsWith("components/ui/")) ?? false;

/** Registry components that are UI components (see isUiComponent). */
export function getUiComponents() {
  return getComponents().filter(isUiComponent);
}

/** Registry components that are theme utilities and effects, not UI (see isUiComponent). */
export function getUtilities() {
  return getComponents().filter((item) => !isUiComponent(item));
}

export function getComponent(name: string) {
  return registry.items.find((item) => item.name === name && item.type === "registry:component") || null;
}
