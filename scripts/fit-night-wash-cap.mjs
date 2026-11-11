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
 * h142.5 green, h264.1 blue), where it kinks to a local maximum. The blue cusp is a STEP: 0.210 just under
 * h264.13477, 0.235 just over it. (Along the hue ray there the red channel dips under zero by ~1e-4 for a
 * stretch of chroma, so the in-gamut chromas are two intervals, and which one maxSrgbChroma's bisection
 * lands in flips at that hue.) No smooth function follows that without crossing it (a trig fit stayed under
 * the ceiling at 77% of it, at best), but tangent lines do: every tangent of a convex arc lies on or under
 * the arc, so the MAX of a few tangents is a lower envelope that touches it at each tangent point. Each arc
 * is then cut off at its cusps by two steep lines, and the cap is the max over the arcs:
 *
 *   cap(h) = max over arcs of min( max(tangents), cutFrom(h), cutTo(h) )
 *
 * Every tangent sits SAFE under the ceiling (which is already lib/oklch-utils' maxSrgbChroma, 3% inside the
 * boundary), and so does every cut line: a cut starts at its cusp SAFE under the ceiling and falls at CUT
 * per degree, which the blue step sets (the cusp sits on the first thousandth past the step, 0.00023°
 * past it, and the cut must fall the 0.025 of the step in that distance: 110 per degree at the least).
 *
 * ANY hue. The tint hue is not always 0–360: the harmonic hues are the theme's plus up to 270, and a
 * consumer feeds them into tint scopes (theme 250 → a tool card at 430). mod() would wrap it, but it needs
 * Chrome 125 and the floor is 120. atan2(sin h, cos h) wraps it into (-180°, 180°] on every engine in the
 * floor (Chrome 111); it returns an ANGLE, and the only angle-to-number functions are trigonometric, so the
 * angle is read back through a small-angle sine: sin(θ / 10000) is θ/10000 rad to within 2e-8. That is
 * --glass-wash-hue, and the arcs are laid out over (-180, 180]. The multiplier back to degrees is 572958,
 * not 1800000/π (572957.795…): a minifier rounds the long one (Lightning CSS, which the build runs, rounds
 * it to exactly 572958), so the source is written as it ships and every model (this script's check,
 * lib/oklch-utils, check-gamut) evaluates the number the browser does. It reads the hue 3.6e-7 of itself
 * high, 6.4e-5° at ±180, and the fit is checked with that. Under all of it sits a safety floor of
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
const CUT = 200; // per degree, every cusp: the blue step needs 110 (checked below), the other two next to nothing
const MULT = 572958; // 1800000/π as a minifier leaves it (see ANY hue above)
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

/* The cusps: the three local maxima of the ceiling, located to a thousandth of a degree. Rounding must not
   carry a cusp back across the blue STEP (its maximum is the first hue past it), so where the nearest
   thousandth falls on the low side, the cusp takes the next one up. */
const cuspNear = (lo, hi) => {
  let best = lo;
  for (let h = lo; h <= hi; h += 0.0005) if (ceil(h) > ceil(best)) best = h;
  const near = round(best, 3);
  return ceil(near) < ceil(best) * SAFE ? Math.ceil(best * 1000) / 1000 : near;
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
   that angle back as a number (sin(x/10000) is x/10000 to 2e-8), times MULT, exactly as the CSS writes it. */
const normalize = (h) => Math.sin(Math.atan2(Math.sin((h * Math.PI) / 180), Math.cos((h * Math.PI) / 180)) / 10000) * MULT;
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
const sample = (h, floor = true) => {
  const r = shipped(h) / ceil(h);
  if (floor && r < lo.r) lo = { r, h };
  if (r > hi.r) hi = { r, h };
};
for (let h = -720; h <= 1080; h += 0.01) sample(h);
/* And, for the ceiling only, every ten-thousandth of a degree within 0.01° of each cusp, in every turn: a
   cut too gentle for the blue step passes the ceiling in a band a thousandth of a degree wide (CUT 20 did,
   by 8.7%), which a hundredth-degree sweep steps over. (Between the step and the cusp, 0.00023°, the cap
   holds 88% of the high side; the floor is a promise at the resolution a hue control has, not there.) */
for (const c of [red, green, blue]) for (let turn = -2; turn <= 2; turn++) for (let i = -100; i <= 100; i++) sample(c + 360 * turn + i / 10000, false);
/* The least cut the cusps need: from each cusp's value, the steepest fall to SAFE under the ceiling within
   0.05° of it, at a millionth of a degree. */
let need = 0;
for (const c of [red, green, blue]) {
  const y = round(ceil(c) * SAFE, 5);
  for (let k = 1; k <= 50000; k++) for (const x of [c - k / 1e6, c + k / 1e6]) need = Math.max(need, (y - SAFE * ceil(x)) / (k / 1e6));
}
if (hi.r > 1 || CUT < need) {
  console.error(`✗ the fit reaches ${(100 * hi.r).toFixed(2)}% of the ceiling at h${hi.h} (cut ${CUT}/°, the cusps need ${need.toFixed(0)}/°)`);
  process.exit(1);
}
console.log(
  `/* ${groups.reduce((n, g) => n + g.lines.length, 0)} tangents in ${groups.length} groups; ` +
    `at least ${(100 * lo.r).toFixed(1)}% of the L${L} sRGB ceiling at every hundredth of a degree (h${lo.h.toFixed(2)}), ` +
    `at most ${(100 * hi.r).toFixed(1)}% there and at every ten-thousandth near the cusps ${[red, green, blue].join(" ")} (h${hi.h.toFixed(4)}); ` +
    `cut ${CUT}/° (they need ${need.toFixed(0)}); ` +
    `preset hues ${presetHues.map((h) => `${h}:${((100 * shipped(h)) / ceil(h)).toFixed(1)}`).join(" ")} */`,
);
const H = "var(--glass-wash-hue)";
const num = (x) => (x < 0 ? `- ${-x}` : `+ ${x}`);
const minus = (t) => (t < 0 ? `${H} + ${-t}` : `${H} - ${t}`);
console.log(
  `--glass-wash-hue: calc(sin(atan2(sin(var(--glass-tint-h) * 1deg), cos(var(--glass-tint-h) * 1deg)) / 10000) * ${MULT});`,
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
