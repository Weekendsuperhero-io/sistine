#!/usr/bin/env node
/**
 * Registry install smoke test — static, no network. For every registry item, verify it would install
 * cleanly for a consumer:
 *   1. every files[].path exists on disk (nothing dangling);
 *   2. every "@sistine/<dep>" registryDependency names a real item;
 *   3. every "@/{components,lib,hooks}/<name>" import in its shipped source is COVERED — either shipped by
 *      the item itself or provided (transitively) by a registryDependency.
 *
 * Catches broken blocks — missing files, unresolved deps, or an import nothing provides — before publish,
 * without spinning up a throwaway app. `@/lib/utils` (the shared `cn` baseline every shadcn project owns) is
 * exempt when nothing publishes it.
 *
 * Run: node scripts/smoke-registry.mjs   (also chained after `registry:check`)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(root, "registry.json"), "utf8"));
const byName = new Map(registry.items.map((i) => [i.name, i]));
const fail = [];

/** Source basenames an item ships (e.g. lib/oklch-utils.ts → "oklch-utils"). */
const shipped = (item) =>
  new Set((item.files ?? []).map((f) => f.path.split("/").pop().replace(/\.(tsx?|css)$/, "")));

/** Everything reachable from an item: its own shipped basenames ∪ all its deps' (recursively). */
const providesCache = new Map();
function provides(name, seen = new Set()) {
  if (providesCache.has(name)) return providesCache.get(name);
  if (seen.has(name)) return new Set();
  seen.add(name);
  const item = byName.get(name);
  if (!item) return new Set();
  const set = new Set([name, ...shipped(item)]);
  for (const d of item.registryDependencies ?? []) {
    for (const p of provides(d.replace("@sistine/", ""), seen)) set.add(p);
  }
  providesCache.set(name, set);
  return set;
}

const IMPORT_RE =
  /from\s+["']@\/(?:components\/(?:ui\/(?:glass\/)?|blocks\/)?|lib\/|hooks\/)([a-z0-9-]+)["']/g;

for (const item of registry.items) {
  for (const f of item.files ?? []) {
    if (!existsSync(join(root, f.path))) fail.push(`[${item.name}] missing file: ${f.path}`);
  }
  for (const d of item.registryDependencies ?? []) {
    if (d.startsWith("@sistine/") && !byName.has(d.replace("@sistine/", ""))) {
      fail.push(`[${item.name}] registryDependency ${d} has no matching item`);
    }
  }
  const avail = provides(item.name);
  for (const f of item.files ?? []) {
    if (!/\.tsx?$/.test(f.path) || !existsSync(join(root, f.path))) continue;
    const src = readFileSync(join(root, f.path), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|\s)\/\/[^\n]*/g, "$1");
    let m;
    while ((m = IMPORT_RE.exec(src))) {
      const dep = m[1];
      if (dep === "utils" && !avail.has("utils")) continue; // shared cn baseline, unpublished
      if (!avail.has(dep)) fail.push(`[${item.name}] imports @/…/${dep} — nothing in its dep graph provides it`);
    }
  }
}

if (fail.length > 0) {
  console.error(`✗ registry smoke test — ${fail.length} issue(s):\n${fail.map((f) => `  ${f}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ registry smoke test — ${registry.items.length} items: files present, deps resolve, imports covered`);
