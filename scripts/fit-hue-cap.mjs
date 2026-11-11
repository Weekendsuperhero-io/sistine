#!/usr/bin/env node
/**
 * Fits a hue-following chroma cap: the sRGB chroma ceiling at one surface's lightness, as a function of
 * hue, written as CSS the browser can evaluate per tint scope (calc / min / max only). The profiles (which
 * surface, which lightness, what share of the ceiling) are scripts/lib/hue-caps.mjs:
 *
 *   night-wash   --glass-wash-c-max at night, L35, 99.5% of the ceiling
 *   day-backing  --glass-solidify-c-max by day, L92, 92%
 *   day-gloss    --glass-gloss-c-max by day, L97, 95%
 *   day-wash     --glass-wash-c-max by day, L72, 95%
 *   pins         each preset's own day wash cap, 95% of the ceiling at the lightness it paints its wash at
 *
 * Why the cap follows the hue: a surface near white or deep in the dark holds very different chroma at
 * different hues (at L35, 0.058 at h200 and 0.235 at h264; at L97, 0.014 at h268 and 0.186 at h110), and an
 * ask past it is CLIPPED per channel in WebKit, so the hue drifts. One number low enough for the tightest
 * hue greys every other one.
 *
 * Shape. Around the hue circle the ceiling at a given lightness is a few CONVEX arcs joined at
 * breakpoints, where its slope drops: local maxima (L35's cusps at h29.3, h142.5 and h264.1; L72 has four,
 * L97 three), kinks on a rising flank (L92 at h102.0), and steps. L35's blue cusp is a STEP: 0.210 just
 * under h264.13477, 0.235 just over it. (Along the hue ray there the red channel dips under zero by ~1e-4
 * for a stretch of chroma, so the in-gamut chromas are two intervals, and which one maxSrgbChroma's
 * bisection lands in flips at that hue.) No smooth function follows that without crossing it (a trig fit
 * stayed under the ceiling at 77% of it, at best), but tangent lines do: every tangent of a convex arc lies
 * on or under the arc, so the MAX of a few tangents is a lower envelope that touches it at each tangent
 * point. Each arc is then cut off at its breakpoints by two steep lines, and the cap is the max over the
 * arcs:
 *
 *   cap(h) = max over arcs of min( max(tangents), cutFrom(h), cutTo(h) )
 *
 * Every tangent sits at the profile's SHARE of the ceiling (which is already lib/oklch-utils'
 * maxSrgbChroma, 3% inside the boundary), and so does every cut line: a cut starts at its breakpoint at
 * that share and falls at CUT per degree. The steepest need is L35's blue step (the cusp sits on the
 * first thousandth past the step, 0.00023° past it, and the cut must fall the 0.025 of the step in that
 * distance: 110 per degree at the least); every profile is checked against its own need.
 *
 * ANY hue. The tint hue is not always 0–360: the harmonic hues are the theme's plus up to 270, and a
 * consumer feeds them into tint scopes (theme 250 → a tool card at 430). mod() would wrap it, but it needs
 * Chrome 125 and the floor is 120. atan2(sin h, cos h) wraps it into (-180°, 180°] on every engine in the
 * floor (Chrome 111); it returns an ANGLE, and the only angle-to-number functions are trigonometric, so the
 * angle is read back through a small-angle sine: sin(θ / 10000) is θ/10000 rad to within 2e-8. That is
 * --glass-wash-hue (every cap reads it), and the arcs are laid out over (-180, 180]. The multiplier back to
 * degrees is 572958, not 1800000/π (572957.795…): a minifier rounds the long one (Lightning CSS, which the
 * build runs, rounds it to exactly 572958), so the source is written as it ships and every model (this
 * script's check, lib/oklch-utils, check-gamut) evaluates the number the browser does. It reads the hue
 * 3.6e-7 of itself high, 6.4e-5° at ±180, and the fit is checked with that. Under all of it sits a safety
 * floor, under the tightest share of the ceiling anywhere on the circle (0.057 at L35), so no hue is ever
 * greyed to 0.
 *
 * Tangent points: one at every preset hue (so each preset's cap lands within a few percent of its own
 * share, and no preset needs a pin), plus the fewest more that hold `floor` of the ceiling at every hue;
 * lines that neither promise needs are pruned.
 *
 * Run: node --experimental-strip-types scripts/fit-hue-cap.mjs <profile>
 * It prints the CSS for tokens.css and the table for lib/oklch-utils; paste both, then `bun run test`
 * holds them equal (tests/deep-night.test.ts, tests/vibrant-day.test.ts) and check-gamut sweeps the CSS
 * ([guard]). It exits non-zero if the table it would print passes the profile's share of the ceiling
 * anywhere, a hundredth of a degree apart and a ten-thousandth near every breakpoint.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { breakpoints, ceilingAt, HUE_CAPS, PRESET_WASH_SHARE } from "./lib/hue-caps.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CUT = 200; // per degree, every breakpoint: L35's blue step needs 110 (each profile is checked below)
const MULT = 572958; // 1800000/π as a minifier leaves it (see ANY hue above)
const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
const H = "var(--glass-wash-hue)";
const HUE_CSS = `--glass-wash-hue: calc(sin(atan2(sin(var(--glass-tint-h) * 1deg), cos(var(--glass-tint-h) * 1deg)) / 10000) * ${MULT});`;

const which = process.argv[2];
if (which === "pins") {
  printPins();
  process.exit(0);
}
const profile = HUE_CAPS[which];
if (!profile) {
  console.error(`usage: fit-hue-cap.mjs <${[...Object.keys(HUE_CAPS), "pins"].join(" | ")}>`);
  process.exit(2);
}
const L = profile.l;
const SAFE = profile.share;
const FLOOR = profile.floor; // of the ceiling, at every hue
const PRESET_FLOOR = profile.presetFloor; // of the ceiling, at every preset hue
const ceil = (h) => ceilingAt(L, h);

/* Every hue a preset paints its wash at: each [data-glass-tint] block's --glass-tint-h, plus the engine's. */
const presetHues = [
  ...new Set(
    ["app/theme/presets.css", "app/theme/frescoes.css", "app/theme/engine.css"].flatMap((f) =>
      [...readFileSync(join(ROOT, f), "utf8").matchAll(/--glass-tint-h:\s*([\d.]+)/g)].map((m) => +m[1]),
    ),
  ),
].sort((a, b) => a - b);

/* The breakpoints, located to a thousandth of a degree, each searched for in the three degrees around the
   tenth breakpoints() found it at. A local maximum is located where the ceiling peaks; rounding must not
   carry it back across a STEP (L35's blue maximum is the first hue past one), so where the nearest
   thousandth falls on the low side, it takes the next one up. A kink on a flank (no maximum in the window)
   is located where the ceiling bends most sharply. */
const locate = (approx) => {
  const lo = Math.floor(approx) - 1;
  const hi = Math.floor(approx) + 2;
  let best = lo;
  for (let h = lo; h <= hi; h += 0.0005) if (ceil(h) > ceil(best)) best = h;
  if (best > lo + 0.01 && best < hi - 0.01) {
    const near = round(best, 3);
    return ceil(near) < ceil(best) * SAFE ? Math.ceil(best * 1000) / 1000 : near;
  }
  let kink = approx;
  let sharpest = 0;
  for (let h = approx - 0.2; h <= approx + 0.2; h += 0.0005) {
    const bend = ceil(h + 0.001) - 2 * ceil(h) + ceil(h - 0.001);
    if (bend < sharpest) {
      sharpest = bend;
      kink = h;
    }
  }
  return round(kink, 3);
};
const cusps = breakpoints(L).map(locate);
const arcs = cusps
  .map((from, i) => [from, i + 1 < cusps.length ? cusps[i + 1] : cusps[0] + 360])
  .map(([from, to]) => ({ from, to, yFrom: round(ceil(from) * SAFE, 5), yTo: round(ceil(to) * SAFE, 5), lines: [] }));

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
   (any hue at all, tokens.css), so it needs the arcs over that range only: each arc as it is where it
   reaches into it, and shifted by -360 where that does (the last arc runs past 360). In order: the
   unshifted ones from the lowest hue up, then the shifted ones from the highest down. Each group keeps
   only the lines that win somewhere in its own part of (-180, 180]. */
const DOMAIN = [-180, 180];
const reaches = (g) => Math.min(DOMAIN[1], g.to + g.shift) > Math.max(DOMAIN[0], g.from + g.shift);
const groups = [
  ...arcs.map((a) => ({ ...a, shift: 0 })).filter(reaches),
  ...arcs
    .map((a) => ({ ...a, shift: -360 }))
    .filter(reaches)
    .reverse(),
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

/* The safety floor under the fit: the tightest share of the ceiling anywhere on the hue circle, rounded
   down, so a hue the arcs somehow missed still gets colour, never 0 (0.057 at L35, whose tightest ceiling
   is 0.0579 at h200). */
let tightest = Infinity;
for (let h = 0; h < 360; h += 0.01) tightest = Math.min(tightest, ceil(h) * SAFE);
const FLOOR_C = Math.floor(tightest * 1000) / 1000;
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
/* And, for the ceiling only, every ten-thousandth of a degree within 0.01° of each breakpoint, in every
   turn: a cut too gentle for L35's blue step passes the ceiling in a band a thousandth of a degree wide
   (CUT 20 did, by 8.7%), which a hundredth-degree sweep steps over. (Between that step and its cusp,
   0.00023°, the cap holds 88% of the high side; the floor is a promise at the resolution a hue control
   has, not there.) */
for (const c of cusps) for (let turn = -2; turn <= 2; turn++) for (let i = -100; i <= 100; i++) sample(c + 360 * turn + i / 10000, false);
/* The least cut the breakpoints need: from each one's value, the steepest fall to SAFE under the ceiling
   within 0.05° of it, at a millionth of a degree. */
let need = 0;
for (const c of cusps) {
  const y = round(ceil(c) * SAFE, 5);
  for (let k = 1; k <= 50000; k++) for (const x of [c - k / 1e6, c + k / 1e6]) need = Math.max(need, (y - SAFE * ceil(x)) / (k / 1e6));
}
/* The share, plus what rounding a tangent's value to five decimals can add at the tightest hue. */
const SHARE_TOLERANCE = 0.002;
if (hi.r > Math.min(1, SAFE + SHARE_TOLERANCE) || CUT < need) {
  console.error(
    `✗ ${which}: the fit reaches ${(100 * hi.r).toFixed(2)}% of the L${L} ceiling at h${hi.h} (its share is ${100 * SAFE}%; cut ${CUT}/°, the breakpoints need ${need.toFixed(0)}/°)`,
  );
  process.exit(1);
}
console.log(
  `/* ${which}: ${groups.reduce((n, g) => n + g.lines.length, 0)} tangents in ${groups.length} groups; ` +
    `at least ${(100 * lo.r).toFixed(1)}% of the L${L} sRGB ceiling at every hundredth of a degree (h${lo.h.toFixed(2)}), ` +
    `at most ${(100 * hi.r).toFixed(1)}% there and at every ten-thousandth near the breakpoints ${cusps.join(" ")} (h${hi.h.toFixed(4)}); ` +
    `cut ${CUT}/° (they need ${need.toFixed(0)}); ` +
    `preset hues ${presetHues.map((h) => `${h}:${((100 * shipped(h)) / ceil(h)).toFixed(1)}`).join(" ")} */`,
);
/* A number as CSS, never in exponent notation: CSS reads it, but scripts/lib/css-math (the models and the
   checks) does not. */
const css = (x) => {
  const t = String(x);
  if (/e/i.test(t)) throw new Error(`${which}: ${t} would print in exponent notation; round it`);
  return t;
};
const num = (x) => (x < 0 ? `- ${css(-x)}` : `+ ${css(x)}`);
const minus = (t) => (t < 0 ? `${H} + ${css(-t)}` : `${H} - ${css(t)}`);
console.log(HUE_CSS);
console.log(`${profile.token}: max(`);
console.log(`  ${FLOOR_C},`);
console.log(
  groups
    .map(
      (g) =>
        `  min(\n    max(\n${g.lines.map(([t, y, s]) => `      calc(${css(y)} ${num(s)} * (${minus(t)}))`).join(",\n")}\n    ),\n` +
        `    calc(${css(g.from[1])} + ${CUT} * (${minus(g.from[0])})),\n    calc(${css(g.to[1])} + ${CUT} * (${css(g.to[0])} - ${H}))\n  )`,
    )
    .join(",\n"),
);
console.log(");");
console.log(`\n${profile.table} = ${JSON.stringify({ floor: FLOOR_C, cut: CUT, groups })}`);

/** Each preset's own day wash cap: PRESET_WASH_SHARE of the ceiling at the lightness and hue it paints
 *  its wash at, rounded DOWN to four decimals, for every tinted preset whose wash is not at the default
 *  L72 (there the day-wash fit already is that). */
function printPins() {
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const file of ["app/theme/presets.css", "app/theme/frescoes.css"]) {
    for (const [, name, body] of strip(readFileSync(join(ROOT, file), "utf8")).matchAll(/(?<!\.dark)\[data-glass-tint="([a-z-]+)"\]\s*\{([^}]*)\}/g)) {
      const get = (k) => +(new RegExp(`--glass-${k}:\\s*([\\d.]+)`).exec(body)?.[1] ?? Number.NaN);
      const [h, c, washL] = [get("tint-h"), get("tint-c"), get("wash-l")];
      if (!(c > 0) || Number.isNaN(washL) || washL === HUE_CAPS["day-wash"].l) continue;
      const pin = Math.floor(ceilingAt(washL, h) * PRESET_WASH_SHARE * 1e4) / 1e4;
      console.log(`${file}  ${name.padEnd(12)} h${h} L${washL}  --glass-wash-c-max: ${pin};  (ask ${(c * 2.5).toFixed(4)})`);
    }
  }
}
