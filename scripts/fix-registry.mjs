#!/usr/bin/env node
/**
 * One-time / re-runnable transform that makes registry.json self-contained and
 * namespaced for the @sistine registry:
 *   1. files            — ensure the customized base component (components/ui/<name>.tsx)
 *                         ships alongside the glass wrapper.
 *   2. registryDependencies — drop the stock-shadcn self ref and namespace real cross-deps
 *                         to "@sistine/<dep>" so they resolve from this registry.
 *   3. dependencies     — recompute npm deps from the actual imports of the base + glass
 *                         files, unioned with the shared-lib baseline.
 *
 * Non-component items (blocks/hooks/libs/themes) are handled separately: their deps are
 * derived from their OWN shipped files, so this transform never resets them to the baseline.
 *
 * Run: node scripts/fix-registry.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = join(root, "registry.json");
const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const componentNames = new Set(registry.items.map((i) => i.name));

const NAMESPACE = "@sistine";
// Shared libs ship in every item, so their externals are baseline for all items.
const BASELINE_DEPS = ["class-variance-authority", "clsx", "tailwind-merge"];
// Peers we never declare.
const EXCLUDE_PKGS = new Set(["react", "react-dom"]);

/** Read a source file with comments stripped, so a `from "x"` inside a comment isn't mistaken for a dep. */
function readStripped(absPath) {
  return readFileSync(absPath, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");
}

/** Extract external npm package names imported by a source file. */
function externalsOf(absPath) {
  if (!existsSync(absPath)) return [];
  const src = readStripped(absPath);
  const out = new Set();
  const re = /(?:from|import)\s+["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) {
    const spec = m[1];
    if (spec.startsWith("@/") || spec.startsWith(".") || spec.startsWith("/")) continue;
    const pkg = spec.startsWith("@")
      ? spec.split("/").slice(0, 2).join("/")
      : spec.split("/")[0];
    if (!EXCLUDE_PKGS.has(pkg)) out.add(pkg);
  }
  return [...out];
}

/** Cross-component deps: relative imports (./x or ../x) that name another registry item. */
function crossDepsOf(absPath, selfName) {
  if (!existsSync(absPath)) return [];
  const src = readStripped(absPath);
  const out = new Set();
  const re = /from\s+["'](\.\.?\/[a-z0-9-]+)["']/g;
  let m;
  while ((m = re.exec(src))) {
    const dep = m[1].split("/").pop();
    if (componentNames.has(dep) && dep !== selfName) out.add(dep);
  }
  return [...out];
}

/**
 * Cross-registry deps from alias imports: "@/components/ui|blocks/<name>" (and the glass/ subpath),
 * "@/lib/<name>", and "@/hooks/<name>". Only names that are themselves registry items count, so
 * shared-but-unpublished files (e.g. @/lib/utils) are ignored.
 */
function aliasDepsOf(absPath) {
  if (!existsSync(absPath)) return [];
  const src = readStripped(absPath);
  const out = new Set();
  const re = /from\s+["']@\/(?:components\/(?:ui|blocks)\/(?:glass\/)?|lib\/|hooks\/)([a-z0-9-]+)["']/g;
  let m;
  while ((m = re.exec(src))) {
    if (componentNames.has(m[1])) out.add(m[1]);
  }
  return [...out];
}

/**
 * Re-apply any version pin already declared for a package (e.g. "react-resizable-panels@^3.0.6"),
 * so re-running this transform never silently drops a deliberate version constraint — bare
 * `externalsOf` names carry no version, so without this the pin would be lost on every rebuild.
 */
function applyPins(bareNames, existingDeps) {
  const pinned = new Map();
  for (const d of existingDeps ?? []) {
    const at = d.lastIndexOf("@");
    if (at > 0) pinned.set(d.slice(0, at), d);
  }
  return bareNames.map((p) => pinned.get(p) ?? p);
}

/**
 * Derive deps for non-component items (blocks, hooks, libs, themes) from their OWN shipped
 * files. The components/ui/<name> convention used for components doesn't apply here, so without
 * this their hand-authored deps would be reset to the baseline. CSS-only items (no .ts/.tsx
 * source to scan, e.g. a theme that ships globals.css) keep their authored deps untouched.
 */
function normalizeNonComponent(item) {
  const name = item.name;
  const srcFiles = (item.files ?? [])
    .map((f) => f.path)
    .filter((p) => p.endsWith(".ts") || p.endsWith(".tsx"));
  if (srcFiles.length === 0) return;

  const externals = new Set();
  const cross = new Set();
  for (const rel of srcFiles) {
    const abs = join(root, rel);
    for (const pkg of externalsOf(abs)) externals.add(pkg);
    for (const dep of aliasDepsOf(abs)) cross.add(dep);
    for (const dep of crossDepsOf(abs, name)) cross.add(dep);
  }
  const existing = (item.registryDependencies ?? [])
    .map((d) => (d.startsWith("@") ? d : `${NAMESPACE}/${d}`))
    .filter((d) => d !== `${NAMESPACE}/${name}`);
  const derived = [...cross].map((d) => `${NAMESPACE}/${d}`);
  item.registryDependencies = [...new Set([...existing, ...derived])].sort();
  item.dependencies = applyPins([...externals], item.dependencies).sort();
}

let changed = 0;
for (const item of registry.items) {
  const name = item.name;

  // Items that don't follow the components/ui/<name> convention — blocks, hooks, libs, themes, and
  // any component living elsewhere (e.g. components/readable-text.tsx) — derive their deps from
  // their own shipped files instead of the base+glass pair below.
  const followsUiConvention =
    item.type === "registry:component" &&
    (existsSync(join(root, `components/ui/${name}.tsx`)) ||
      existsSync(join(root, `components/ui/glass/${name}.tsx`)));
  if (!followsUiConvention) {
    normalizeNonComponent(item);
    changed++;
    continue;
  }

  const baseRel = `components/ui/${name}.tsx`;
  const glassRel = `components/ui/glass/${name}.tsx`;

  // 1. files — prepend the base component before the glass wrapper if missing.
  item.files = item.files ?? [];
  const hasBase = item.files.some((f) => f.path === baseRel);
  if (!hasBase && existsSync(join(root, baseRel))) {
    const glassIdx = item.files.findIndex((f) => f.path === glassRel);
    const entry = { path: baseRel, type: "registry:component", target: baseRel };
    if (glassIdx >= 0) item.files.splice(glassIdx, 0, entry);
    else item.files.push(entry);
  }

  // 2. registryDependencies — keep existing namespaced deps and ADD cross-registry deps discovered in the
  //    base + glass sources: relative imports (./x) AND "@/…" alias imports of other registry items (e.g.
  //    @/hooks/use-mobile, @/components/ui/button). Additive — never drops an existing dep.
  // A dep the item SHIPS as a file (e.g. bundles lib/glass-utils.ts) isn't a registry dependency — never
  // declare OR keep a redundant "ships AND depends on it" (drops from existing too, so this self-heals).
  const shippedNames = new Set(
    (item.files ?? []).map((f) => f.path.split("/").pop().replace(/\.(tsx?|css)$/, "")),
  );
  const existingDeps = (item.registryDependencies ?? [])
    .map((d) => (d.startsWith("@") ? d : `${NAMESPACE}/${d}`))
    .filter((d) => d !== `${NAMESPACE}/${name}` && !shippedNames.has(d.replace(`${NAMESPACE}/`, "")));
  const derivedDeps = [];
  for (const rel of [baseRel, glassRel]) {
    for (const dep of crossDepsOf(join(root, rel), name)) if (!shippedNames.has(dep)) derivedDeps.push(`${NAMESPACE}/${dep}`);
    for (const dep of aliasDepsOf(join(root, rel))) if (dep !== name && !shippedNames.has(dep)) derivedDeps.push(`${NAMESPACE}/${dep}`);
  }
  item.registryDependencies = [...new Set([...existingDeps, ...derivedDeps])].sort();

  // 3. dependencies — baseline ∪ externals of base + glass files.
  const externals = new Set(BASELINE_DEPS);
  for (const rel of [baseRel, glassRel]) {
    for (const pkg of externalsOf(join(root, rel))) externals.add(pkg);
  }
  item.dependencies = applyPins([...externals], item.dependencies).sort();

  changed++;
}

// Theme dedupe: the ui primitives that render the glass theme reference the shared @sistine/theme
// for its CSS tokens instead of each bundling a copy of app/globals.css (the `theme` item owns it).
// Consumers get the CSS once via that dependency rather than a redundant per-item copy dropped at a
// Next-only path. Membership is authoritative and keyed off a stable disk signal — an item is a ui
// primitive iff it ships components/ui/<name>.tsx or a glass wrapper — so this add/remove is
// idempotent regardless of the current files array. Blocks deliberately DON'T re-list the theme:
// they reach it transitively through their ui deps (shadcn resolves registryDependencies recursively),
// like every other shared dep. Libs, hooks, and standalone components/<name>.tsx items have no theme.
const themeRef = `${NAMESPACE}/theme`;
const uiPrimitiveNames = new Set(
  registry.items
    .filter(
      (i) =>
        existsSync(join(root, `components/ui/${i.name}.tsx`)) ||
        existsSync(join(root, `components/ui/glass/${i.name}.tsx`)),
    )
    .map((i) => i.name),
);
// True iff the item's OWN shipped files consume the glass theme's distinctive tokens/hooks.
const usesThemeTokens = (item) =>
  (item.files ?? []).some((f) => {
    if (!/\.(tsx?|css)$/.test(f.path)) return false;
    const abs = join(root, f.path);
    return existsSync(abs) && /--glass-|--accent-|data-glass-tint|data-pattern/.test(readFileSync(abs, "utf8"));
  });
// True iff a direct registry dep is a ui primitive — those all carry @sistine/theme, so it's reached transitively.
const reachesThemeViaDeps = (item) =>
  (item.registryDependencies ?? []).some((d) => uiPrimitiveNames.has(d.replace(`${NAMESPACE}/`, "")));

for (const item of registry.items) {
  if (item.type === "registry:theme") continue; // the theme item owns the flattened theme css
  item.files = (item.files ?? []).filter(
    (f) =>
      f.path !== "app/globals.css" &&
      f.target !== "app/globals.css" &&
      !f.path?.startsWith("app/theme/") &&
      f.path !== "registry/theme/globals.css",
  );
  const isUiPrimitive =
    existsSync(join(root, `components/ui/${item.name}.tsx`)) || existsSync(join(root, `components/ui/glass/${item.name}.tsx`));
  // Ui primitives keep the theme as before. Standalone theme-driven COMPONENTS/BLOCKS that depend only on
  // libs (canvas/gradient-background, auto-foreground, the background-controller block) can't reach the theme
  // transitively, so they declare it directly. Libs/hooks are excluded — they merely reference token *names*;
  // the CSS belongs to the component that consumes them. Blocks composing ui primitives reach it transitively.
  const isComponentOrBlock = item.type === "registry:component" || item.type === "registry:block";
  const needsTheme = isUiPrimitive || (isComponentOrBlock && usesThemeTokens(item) && !reachesThemeViaDeps(item));
  const deps = new Set(item.registryDependencies ?? []);
  if (needsTheme) deps.add(themeRef);
  else deps.delete(themeRef);
  item.registryDependencies = [...deps].sort();
}

writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Transformed ${changed} items in registry.json`);
