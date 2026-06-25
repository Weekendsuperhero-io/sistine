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

/** Extract external npm package names imported by a source file. */
function externalsOf(absPath) {
  if (!existsSync(absPath)) return [];
  const src = readFileSync(absPath, "utf8");
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
  const src = readFileSync(absPath, "utf8");
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
  const src = readFileSync(absPath, "utf8");
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

  // 2. registryDependencies — keep existing namespaced deps and ADD any cross-component
  //    deps discovered via relative imports (additive: never drops an existing dep).
  const existingDeps = (item.registryDependencies ?? [])
    .map((d) => (d.startsWith("@") ? d : `${NAMESPACE}/${d}`))
    .filter((d) => d !== `${NAMESPACE}/${name}`);
  const derivedDeps = [];
  for (const rel of [baseRel, glassRel]) {
    for (const dep of crossDepsOf(join(root, rel), name)) derivedDeps.push(`${NAMESPACE}/${dep}`);
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

writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Transformed ${changed} items in registry.json`);
