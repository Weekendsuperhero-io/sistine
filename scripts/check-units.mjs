#!/usr/bin/env node
/**
 * Unit checks for the pure functions behind visual behavior.
 *
 * These exist because the behavior they encode was verified BY EYE — screenshots, a browser probe, a
 * throwaway node script — and none of that survives the session it was run in. Each case below is one
 * that was actually observed breaking, or one whose correctness is not obvious from reading the code.
 * Nothing here needs a DOM, a renderer, or a browser; anything that does is out of scope for this file.
 *
 * Run: pnpm test:units   (needs Node >= 22 to type-strip the imported .ts)
 */
import { bandedFrescoStops, formatOklch, rampGradient, readableLightnessBand, apcaContrast } from "../lib/oklch-utils.ts";
import { snapTransform } from "../lib/snap-popper.ts";

const failures = [];
let ran = 0;
function check(name, fn) {
  ran++;
  try {
    const problem = fn();
    if (problem) failures.push(`${name} — ${problem}`);
  } catch (err) {
    failures.push(`${name} — threw: ${err.message}`);
  }
}
const eq = (actual, expected, what) => (actual === expected ? null : `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

/* ── snapTransform ────────────────────────────────────────────────────────────────────────────────
   Radix writes a fractional translate onto the popper wrapper; a fractional offset on a
   backdrop-filter layer rasterizes glyphs off the pixel grid and the text goes soft. */
check("snapTransform rounds a fractional translate", () =>
  eq(snapTransform("translate(188.5px, 42.25px)"), "translate(189px, 42px)", "rounded"),
);
check("snapTransform returns null when already integral", () =>
  /* THE re-entrancy guard: our own write retriggers the MutationObserver that called us, so an
     already-snapped value must produce no write or the loop never terminates. */
  eq(snapTransform("translate(189px, 42px)"), null, "already-snapped"),
);
check("snapTransform handles translate3d", () =>
  eq(snapTransform("translate3d(10.6px, -3.2px, 0px)"), "translate(11px, -3px)", "translate3d"),
);
check("snapTransform rounds negatives, normalising -0 to 0", () =>
  /* Math.round(-0.5) is -0 in JS, which stringifies to "0" — so the output is 0px, not -0px. Same
     pixel either way; pinned because the sign is easy to reintroduce by "fixing" the rounding. */
  eq(snapTransform("translate(-0.5px, -12.7px)"), "translate(0px, -13px)", "negative"),
);
check("snapTransform ignores an unrecognised transform", () =>
  /* Radix hasn't positioned yet, or wrote a shape we don't parse — inventing a translate here would
     yank the surface to 0,0. */
  eq(snapTransform("scale(1.02)"), null, "unrecognised"),
);
check("snapTransform ignores an empty transform", () => eq(snapTransform(""), null, "empty"));

/* ── readableLightnessBand ────────────────────────────────────────────────────────────────────────
   The ramps span their full range by design (good swatches); as a full-bleed backdrop that put pure
   black at one edge of the viewport and pure white at the other. */
const SEED = { l: 72, c: 0.15, h: 300 };
for (const [mode, fg] of [
  ["light", "oklch(35% 0.15 300)"],
  ["dark", "oklch(96% 0.01 300)"],
]) {
  check(`readableLightnessBand(${mode}) keeps both edges above the APCA target`, () => {
    const band = readableLightnessBand(fg, SEED);
    const at = (l) => Math.abs(apcaContrast(fg, { ...SEED, l }));
    if (band.lMin >= band.lMax) return `degenerate band ${band.lMin}–${band.lMax}`;
    if (at(band.lMin) < 60) return `lMin ${band.lMin} scores ${at(band.lMin).toFixed(1)} < 60`;
    if (at(band.lMax) < 60) return `lMax ${band.lMax} scores ${at(band.lMax).toFixed(1)} < 60`;
    return null;
  });
  check(`readableLightnessBand(${mode}) stops short of the achromatic extreme`, () =>
    /* L 0 and L 100 are the two lightnesses that hold NO chroma, so running to them washes the tint
       out of one edge. Backing off costs nothing: that end is the high-contrast one. */
    (() => {
      const band = readableLightnessBand(fg, SEED);
      if (band.lMin <= 0 && band.lMax >= 100) return "band reaches both extremes";
      return band.lMin === 0 && band.lMax === 100 ? "band was not narrowed at all" : null;
    })(),
  );
}
check("readableLightnessBand falls back to the full range for an unreachable target", () =>
  /* A mid-lightness foreground clears 60 against nothing. Banding is a readability aid, not a gate —
     returning an empty band here would collapse the gradient to a single color. */
  (() => {
    const band = readableLightnessBand("oklch(55% 0.1 300)", SEED, 90);
    return band.lMin === 0 && band.lMax === 100 ? null : `expected the full range, got ${band.lMin}–${band.lMax}`;
  })(),
);

/* ── rampGradient: banding + the conic seam ───────────────────────────────────────────────────────
   A conic gradient wraps, so an open ramp meets its own opposite end at 0°/360° and draws a hard edge
   through the wallpaper — at full range that was white against black. */
const hueDelta = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
for (const [mode, fg, seed] of [
  ["light", "oklch(35% 0.15 300)", { l: 72, c: 0.15, h: 300 }],
  ["dark", "oklch(96% 0.01 300)", { l: 52, c: 0.15, h: 300 }],
]) {
  const band = readableLightnessBand(fg, seed);
  for (const axis of ["tonal", "hue", "lightness", "chroma"]) {
    for (const shape of ["linear", "radial", "conic"]) {
      const stops = [...rampGradient(axis, seed, 5, { band, shape, angle: 90 }).matchAll(/oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)/g)].map((m) => ({
        l: +m[1],
        c: +m[2],
        h: +m[3],
      }));
      check(`rampGradient ${mode}/${axis}/${shape} stays inside the readable band`, () => {
        if (!stops.length) return "no stops parsed";
        const out = stops.filter((s) => s.l < band.lMin - 0.5 || s.l > band.lMax + 0.5);
        return out.length ? `${out.length} stop(s) outside ${band.lMin}–${band.lMax}` : null;
      });
      if (shape === "conic") {
        check(`rampGradient ${mode}/${axis}/conic closes its loop`, () => {
          const first = stops[0];
          const last = stops.at(-1);
          const seam = Math.abs(last.l - first.l) + Math.abs(last.c - first.c) + hueDelta(last.h, first.h);
          return seam > 0.001 ? `seam of ${seam.toFixed(4)} between 360° and 0°` : null;
        });
      }
    }
  }
}
check("rampGradient without a band is unchanged (banding is opt-in)", () =>
  /* The docs swatches call the same ramps and MUST keep showing the full range. */
  (() => {
    const ls = [...rampGradient("lightness", SEED, 5, { shape: "linear" }).matchAll(/oklch\(([\d.]+)%/g)].map((m) => +m[1]);
    return Math.min(...ls) === 0 && Math.max(...ls) === 100 ? null : `expected 0–100, got ${Math.min(...ls)}–${Math.max(...ls)}`;
  })(),
);

/* ── bandedFrescoStops ────────────────────────────────────────────────────────────────────────────
   Frescoes are authored as fixed multi-hue stops and skip the ramp, so they skip its banding and its
   loop-close too unless this applies them. */
const FRESCO = ["oklch(72% 0.15 20)", "oklch(72% 0.15 200)", "oklch(72% 0.15 300)"];
const BAND = { lMin: 80, lMax: 90 };
check("bandedFrescoStops clamps lightness into the band", () => {
  const ls = [...bandedFrescoStops(FRESCO, BAND, "linear").matchAll(/oklch\(([\d.]+)%/g)].map((m) => +m[1]);
  return ls.every((l) => l >= BAND.lMin && l <= BAND.lMax) ? null : `got ${ls.join(", ")}`;
});
check("bandedFrescoStops preserves hue while clamping", () => {
  const hs = [...bandedFrescoStops(FRESCO, BAND, "linear").matchAll(/oklch\([\d.]+% [\d.]+ ([\d.]+)\)/g)].map((m) => +m[1]);
  return hs.join(",") === "20,200,300" ? null : `hues became ${hs.join(",")}`;
});
check("bandedFrescoStops closes the loop for conic", () => {
  const out = bandedFrescoStops(FRESCO, BAND, "conic");
  const stops = [...out.matchAll(/(oklch\([^)]*\))\s+([\d.]+)%/g)].map((m) => ({ css: m[1], pos: +m[2] }));
  if (stops.length !== FRESCO.length + 1) return `expected ${FRESCO.length + 1} stops, got ${stops.length}`;
  if (stops[0].css !== stops.at(-1).css) return `first ${stops[0].css} != last ${stops.at(-1).css}`;
  if (stops[0].pos !== 0 || stops.at(-1).pos !== 100) return `positions run ${stops[0].pos}–${stops.at(-1).pos}, expected 0–100`;
  return null;
});
check("bandedFrescoStops leaves non-conic shapes unlooped", () => {
  const n = bandedFrescoStops(FRESCO, BAND, "linear").split(",").length;
  return n === FRESCO.length ? null : `expected ${FRESCO.length} stops, got ${n}`;
});
check("bandedFrescoStops without a band passes colors through", () =>
  eq(bandedFrescoStops(FRESCO, undefined, "linear"), FRESCO.join(", "), "passthrough"),
);
check("bandedFrescoStops leaves an unparseable stop alone", () =>
  /* A fresco could carry a var() or a named color; mangling it would be worse than not banding it. */
  (() => {
    const out = bandedFrescoStops(["var(--something)", "oklch(72% 0.15 20)"], BAND, "linear");
    return out.startsWith("var(--something)") ? null : `dropped the passthrough stop: ${out}`;
  })(),
);
check("bandedFrescoStops does not loop a single stop", () => {
  const out = bandedFrescoStops(["oklch(72% 0.15 20)"], BAND, "conic");
  return out.includes(",") ? `single stop got looped: ${out}` : null;
});

/* ── formatOklch round-trip, since every check above parses its own output ────────────────────────*/
check("formatOklch emits a parseable oklch()", () =>
  /^oklch\([\d.]+% [\d.]+ [\d.]+\)$/.test(formatOklch({ l: 72, c: 0.15, h: 300 })) ? null : `got ${formatOklch({ l: 72, c: 0.15, h: 300 })}`,
);

if (failures.length) {
  console.error(`✗ unit checks: ${failures.length} of ${ran} failed\n${failures.map((f) => `  - ${f}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ unit checks — ${ran} cases: popper transform snapping, readable bands, ramp banding + conic seams, fresco stops`);
