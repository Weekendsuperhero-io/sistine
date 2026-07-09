#!/usr/bin/env node
/**
 * One-shot C6 surgery for the material-system flip (delete after use):
 *   1. remove every components/ui/glass/* files[] entry (the wrapper layer is deleted),
 *   2. swap every lib/glass-utils.ts files[] entry for lib/material.ts (the lib is deleted),
 *   3. delete the glass-utils registry item (superseded by the `material` item).
 * fix-registry.mjs never removes dangling entries, so this must run once, in the same commit that
 * deletes the files — then `pnpm registry:check` renormalizes deps and rebuilds public/r.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(root, "registry.json");
const registry = JSON.parse(readFileSync(path, "utf8"));

let glassFiles = 0;
let libSwaps = 0;
registry.items = registry.items.filter((item) => item.name !== "glass-utils");
for (const item of registry.items) {
  if (!item.files) continue;
  const before = item.files.length;
  item.files = item.files.filter((f) => !f.path?.startsWith("components/ui/glass/"));
  glassFiles += before - item.files.length;
  for (const f of item.files) {
    if (f.path === "lib/glass-utils.ts") {
      f.path = "lib/material.ts";
      f.target = "lib/material.ts";
      libSwaps++;
    }
  }
  // De-dup in case an item already ships lib/material.ts
  const seen = new Set();
  item.files = item.files.filter((f) => {
    const key = f.path;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`removed ${glassFiles} glass wrapper entries; swapped ${libSwaps} glass-utils paths; glass-utils item deleted`);
