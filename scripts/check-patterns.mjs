#!/usr/bin/env node
/**
 * Guards that the pattern registry stays internally consistent. Three lists in
 * components/pattern-background.tsx must always agree:
 *   - the `PatternStyle` union        (the type)
 *   - the `PATTERN_STYLES` array       (what the switcher cycles through)
 *   - `ANIMATED_PATTERNS`              (which gate the speed control)
 * and likewise `PatternDensity` ↔ `PATTERN_DENSITIES`.
 *
 * Why: a style added to the union but omitted from the array silently vanishes from the switcher's
 * cycle, and TypeScript won't catch it (a subset still satisfies `PatternStyle[]`). This test does.
 *
 * Run: node scripts/check-patterns.mjs   (wired into `bun run test`)
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "components/pattern-background.tsx"), "utf8");
const fail = [];

/** Pull the double-quoted lowercase identifiers out of the first region matching `re`. */
function names(re, label) {
  const m = src.match(re);
  if (!m) {
    fail.push(`[parse] could not locate ${label} in pattern-background.tsx`);
    return [];
  }
  return [...m[1].matchAll(/"([a-z-]+)"/g)].map((x) => x[1]);
}
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const only = (a, b) => a.filter((x) => !b.includes(x));

const union = names(/export type PatternStyle =([\s\S]*?);/, "PatternStyle union");
const array = names(/export const PATTERN_STYLES: PatternStyle\[\] = \[([\s\S]*?)\];/, "PATTERN_STYLES");
const animated = names(/export const ANIMATED_PATTERNS = new Set<PatternStyle>\(\[([\s\S]*?)\]\)/, "ANIMATED_PATTERNS");
const densType = names(/export type PatternDensity =([\s\S]*?);/, "PatternDensity union");
const densArray = names(/export const PATTERN_DENSITIES: PatternDensity\[\] = \[([\s\S]*?)\];/, "PATTERN_DENSITIES");

if (union.length && array.length && !sameSet(union, array)) {
  fail.push(
    `[pattern-sync] PatternStyle union ≠ PATTERN_STYLES\n      in union only: [${only(union, array)}]\n      in array only: [${only(array, union)}]`,
  );
}
for (const a of animated) {
  if (!array.includes(a)) fail.push(`[animated] "${a}" is in ANIMATED_PATTERNS but not PATTERN_STYLES`);
}
if (densType.length && densArray.length && !sameSet(densType, densArray)) {
  fail.push(`[density-sync] PatternDensity ≠ PATTERN_DENSITIES ([${only(densType, densArray)}] / [${only(densArray, densType)}])`);
}

if (fail.length > 0) {
  console.error(`✗ pattern registry drift:\n${fail.map((f) => `  ${f}`).join("\n")}`);
  process.exit(1);
}
console.log(
  `✓ pattern lists in sync — ${array.length} styles (${animated.length} animated), ${densArray.length} densities; union == array`,
);
