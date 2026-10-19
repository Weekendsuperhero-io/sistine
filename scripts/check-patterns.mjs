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
 * And how a scene STOPS. Reduced motion and Speed 0 both remove a scene's animations through one helper,
 * `stopRules()`, which emits the `@media (prefers-reduced-motion)` block and the `[data-pat-static]` one
 * from the same selector list:
 *   - [stop-paused] nothing pauses instead (`animation-play-state` / the old `--pat-play` knob): a paused
 *     animation leaves the element animating, and WebKit kept re-rendering six full-viewport blurred,
 *     masked layers at Speed 0;
 *   - [stop-rules] every ANIMATED_PATTERNS scene's stylesheet calls `stopRules(`, and so does any scene
 *     stylesheet that declares an animation at all, so a new scene cannot honour one condition and not
 *     the other (the original bug).
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

/* Comments explain the old mechanism by name, so they are stripped before looking for it. */
const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
for (const banned of ["animation-play-state", "--pat-play"]) {
  if (code.includes(banned)) {
    fail.push(`[stop-paused] pattern-background.tsx uses ${banned}: a paused scene keeps animating — stop it with stopRules() (animation: none) instead.`);
  }
}

const sceneStyles = [...src.matchAll(/const ([A-Z_]+_STYLES) = `([\s\S]*?)`;/g)].map((m) => ({ name: m[1], body: m[2] }));
const callsStopRules = (body) => body.includes("${stopRules(");
for (const a of animated) {
  const sheet = sceneStyles.find((st) => st.body.includes(`[data-pattern="${a}"]`));
  if (!sheet) fail.push(`[stop-rules] no *_STYLES stylesheet styles [data-pattern="${a}"] — cannot check how it stops.`);
  else if (!callsStopRules(sheet.body)) {
    fail.push(`[stop-rules] ${sheet.name} (${a}) never calls stopRules(): it keeps animating under reduced motion and/or Speed 0.`);
  }
}
for (const st of sceneStyles) {
  const animates = [...st.body.matchAll(/animation(?:-name)?:\s*([^;]+);/g)].some((m) => m[1].trim() !== "none");
  if (animates && !callsStopRules(st.body)) {
    fail.push(`[stop-rules] ${st.name} declares an animation but never calls stopRules() — list its animated selectors there.`);
  }
}

if (fail.length > 0) {
  console.error(`✗ pattern registry drift:\n${fail.map((f) => `  ${f}`).join("\n")}`);
  process.exit(1);
}
console.log(
  `✓ pattern lists in sync — ${array.length} styles (${animated.length} animated, each stopped by stopRules), ${densArray.length} densities; union == array`,
);
