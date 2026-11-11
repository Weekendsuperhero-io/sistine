#!/usr/bin/env node
/**
 * Fits the night wash chroma cap: the sRGB chroma ceiling at the night depth, as a function of hue, written
 * as CSS the browser can evaluate per tint scope (calc / min / max only).
 *
 * At night the wash paints at L35 (tokens.css --glass-night-depth), where sRGB holds 0.058 (h200) to
 * 0.235 (h264) of chroma. A wash asking more is CLIPPED per channel in WebKit, so the hue drifts; a single
 * cap low enough for the tightest hue greys every other one. So the cap follows the hue.
 *
 * Shape. Around the hue circle the ceiling at L35 is three CONVEX arcs joined at three cusps (h29.3 red,
 * h142.5 green, h264.1 blue), where it kinks to a local maximum. The blue cusp is nearly a step: 0.199 at
 * h264.00, 0.235 at h264.25. No smooth function follows that without crossing it (a trig fit stayed under
 * the ceiling at 77% of it, at best), but tangent lines do: every tangent of a convex arc lies on or under
 * the arc, so the MAX of a few tangents is a lower envelope that touches it at each tangent point. Each arc
 * is then cut off at its cusps by two steep lines, and the cap is the max over the arcs:
 *
 *   cap(h) = max over arcs of min( max(tangents), cutFrom(h), cutTo(h) )
 *
 * Every tangent sits SAFE under the ceiling (which is already lib/oklch-utils' maxSrgbChroma, 3% inside the
 * boundary).
 *
 * ANY hue. The tint hue is not always 0–360: the harmonic hues are the theme's plus up to 270, and a
 * consumer feeds them into tint scopes (theme 250 → a tool card at 430). mod() would wrap it, but it needs
 * Chrome 125 and the floor is 120. atan2(sin h, cos h) wraps it into (-180°, 180°] on every engine in the
 * floor (Chrome 111); it returns an ANGLE, and the only angle-to-number functions are trigonometric, so the
 * angle is read back through a small-angle sine: sin(θ / 10000) is θ/10000 rad to within 2e-8. That is
 * --glass-wash-hue, and the arcs are laid out over (-180, 180]. Under all of it sits a safety floor of
 * 0.057, below the tightest ceiling anywhere on the circle (0.0579, h200), so no hue is ever greyed to 0.
 *
 * Tangent points: one at every preset hue (so each preset's cap lands within 1–2% of its own ceiling and
 * no preset needs a pin), plus the fewest more that hold FLOOR of the ceiling at every hue; lines that
 * neither promise needs are pruned.
 *
 * Run: node --experimental-strip-types scripts/fit-night-wash-cap.mjs
 * It prints the CSS for tokens.css and the table for lib/oklch-utils (NIGHT_WASH_CAP); paste both, then
 * `bun run test` holds them equal (tests/deep-night.test.ts) and check-gamut sweeps the CSS ([guard]).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { maxSrgbChroma } from "../lib/oklch-utils.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const L = 35;
const SAFE = 0.995;
const CUT = 20; // per degree: steeper than the blue cusp's own flank, so a cut never crosses the ceiling
const FLOOR = 0.9; // of the ceiling, at every hue
const PRESET_FLOOR = 0.985; // of the ceiling, at every preset hue

const ceil = (h) => maxSrgbChroma(L, ((h % 360) + 360) % 360);
const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;

/* Every hue a preset paints its wash at: each [data-glass-tint] block's --glass-tint-h, plus the engine's. */
const presetHues = [
  ...new Set(
    ["app/theme/presets.css", "app/theme/frescoes.css", "app/theme/engine.css"].flatMap((f) =>
      [...readFileSync(join(ROOT, f), "utf8").matchAll(/--glass-tint-h:\s*([\d.]+)/g)].map((m) => +m[1]),
    ),
  ),
].sort((a, b) => a - b);

/* The cusps: the three local maxima of the ceiling, located to a thousandth of a degree. */
const cuspNear = (lo, hi) => {
  let best = lo;
  for (let h = lo; h <= hi; h += 0.0005) if (ceil(h) > ceil(best)) best = h;
  return round(best, 3);
};
const [red, green, blue] = [cuspNear(28, 31), cuspNear(141, 144), cuspNear(263.5, 265)];
const arcs = [
  [red, green],
  [green, blue],
  [blue, red + 360],
].map(([from, to]) => ({ from, to, yFrom: round(ceil(from) * SAFE, 5), yTo: round(ceil(to) * SAFE, 5), lines: [] }));

const tangent = (t) => {
  const s = (ceil(t + 0.005) - ceil(t - 0.005)) / 0.01;
  return [round(t, 2), round(ceil(t) * SAFE, 5), Number((s * SAFE).toPrecision(4))];
};
const arcAt = (h) => arcs.find((a) => (h >= a.from && h <= a.to) || (h + 360 >= a.from && h + 360 <= a.to));
const addTangent = (h) => {
  const a = arcAt(h);
  const t = h + (h < a.from ? 360 : 0);
  a.lines.push(tangent(Math.min(Math.max(t, a.from + 0.02), a.to - 0.02)));
};
const arcValue = (a, x) => {
  let v = -Infinity;
  for (const [t, y, s] of a.lines) v = Math.max(v, y + s * (x - t));
  return Math.min(v, a.yFrom + CUT * (x - a.from), a.yTo + CUT * (a.to - x));
};
const cap = (h) => Math.max(...arcs.flatMap((a) => [arcValue(a, h), arcValue(a, h + 360)]));
const holds = () => {
  for (let h = 0; h < 360; h += 0.02) if (cap(h) / ceil(h) < FLOOR) return false;
  return presetHues.every((h) => cap(h) / ceil(h) >= PRESET_FLOOR);
};

for (const a of arcs) a.lines.push(tangent(a.from + 0.02), tangent(a.to - 0.02));
for (const h of presetHues) addTangent(h);
for (let i = 0; i < 100 && !holds(); i++) {
  let worst = { r: Infinity, h: 0 };
  for (let h = 0; h < 360; h += 0.05) {
    const r = cap(h) / ceil(h);
    if (r < worst.r) worst = { r, h };
  }
  addTangent(worst.h);
}
for (let pass = 0; pass < 3; pass++) {
  for (const a of arcs) {
    for (let i = a.lines.length - 1; i >= 0; i--) {
      const [removed] = a.lines.splice(i, 1);
      if (a.lines.length < 2 || !holds()) a.lines.splice(i, 0, removed);
    }
  }
}
for (const a of arcs) a.lines.sort((p, q) => p[0] - q[0]);

/* The groups the CSS evaluates. The cap reads --glass-wash-hue, the tint hue NORMALIZED to (-180, 180]
   (any hue at all, tokens.css), so it needs the arcs over that range only: the first two as they are (the
   second up to 180), the third shifted by -360 (it runs past 360, so it covers -95.9 to 29.3), and the
   second again, shifted by -360 (-217.5 to -95.9, for -180 to -95.9). Each group keeps only the lines that
   win somewhere in its own part of (-180, 180]. */
const DOMAIN = [-180, 180];
const groups = [
  { ...arcs[0], shift: 0 },
  { ...arcs[1], shift: 0 },
  { ...arcs[2], shift: -360 },
  { ...arcs[1], shift: -360 },
].map((g) => {
  const lo = Math.max(DOMAIN[0], g.from + g.shift);
  const hi = Math.min(DOMAIN[1], g.to + g.shift);
  const used = new Set();
  for (let h = lo; h <= hi; h += 0.01) {
    let best = -1;
    let bestV = -Infinity;
    g.lines.forEach(([t, y, s], i) => {
      const v = y + s * (h - g.shift - t);
      if (v > bestV) {
        bestV = v;
        best = i;
      }
    });
    used.add(best);
  }
  return {
    from: [round(g.from + g.shift, 3), g.yFrom],
    to: [round(g.to + g.shift, 3), g.yTo],
    lines: g.lines.filter((_, i) => used.has(i)).map(([t, y, s]) => [round(t + g.shift, 2), y, s]),
  };
});

/* The safety floor under the fit: the tightest ceiling anywhere on the hue circle is 0.0579 (h200), so
   0.057 sits under every hue's ceiling, and a hue the arcs somehow missed still gets colour, never 0. */
const FLOOR_C = 0.057;
/* The hue normalization the CSS does with atan2 (an angle in (-180°, 180°]) and a small-angle sine to read
   that angle back as a number (sin(x/10000) is x/10000 to 2e-8, so the hue lands within 3e-6°). */
const normalize = (h) => Math.sin(Math.atan2(Math.sin((h * Math.PI) / 180), Math.cos((h * Math.PI) / 180)) / 10000) * (1800000 / Math.PI);
/* Verify the TABLE (rounded, grouped, normalized, floored) — the thing that ships — not the fit above. */
const shipped = (h) => {
  const x = normalize(h);
  return Math.max(
    FLOOR_C,
    ...groups.map((g) =>
      Math.min(Math.max(...g.lines.map(([t, y, s]) => y + s * (x - t))), g.from[1] + CUT * (x - g.from[0]), g.to[1] + CUT * (g.to[0] - x)),
    ),
  );
};
let lo = { r: Infinity };
let hi = { r: 0 };
for (let h = -720; h <= 1080; h += 0.01) {
  const r = shipped(h) / ceil(h);
  if (r < lo.r) lo = { r, h };
  if (r > hi.r) hi = { r, h };
}
console.log(
  `/* ${groups.reduce((n, g) => n + g.lines.length, 0)} tangents in ${groups.length} groups; ` +
    `${(100 * lo.r).toFixed(1)}%–${(100 * hi.r).toFixed(1)}% of the L${L} sRGB ceiling at every hue ` +
    `(lowest h${lo.h.toFixed(2)}); preset hues ${presetHues.map((h) => `${h}:${((100 * shipped(h)) / ceil(h)).toFixed(1)}`).join(" ")} */`,
);
const H = "var(--glass-wash-hue)";
const num = (x) => (x < 0 ? `- ${-x}` : `+ ${x}`);
const minus = (t) => (t < 0 ? `${H} + ${-t}` : `${H} - ${t}`);
console.log(
  "--glass-wash-hue: calc(sin(atan2(sin(var(--glass-tint-h) * 1deg), cos(var(--glass-tint-h) * 1deg)) / 10000) * 572957.7951308232);",
);
console.log("--glass-wash-c-max: max(");
console.log(`  ${FLOOR_C},`);
console.log(
  groups
    .map(
      (g) =>
        `  min(\n    max(\n${g.lines.map(([t, y, s]) => `      calc(${y} ${num(s)} * (${minus(t)}))`).join(",\n")}\n    ),\n` +
        `    calc(${g.from[1]} + ${CUT} * (${minus(g.from[0])})),\n    calc(${g.to[1]} + ${CUT} * (${g.to[0]} - ${H}))\n  )`,
    )
    .join(",\n"),
);
console.log(");");
console.log(`\nNIGHT_WASH_CAP = ${JSON.stringify({ floor: FLOOR_C, cut: CUT, groups })}`);
