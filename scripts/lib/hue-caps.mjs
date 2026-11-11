/**
 * The hue-following chroma caps: which surfaces have one, at what lightness, and how close to the sRGB
 * ceiling each sits. Shared by the generator (scripts/fit-hue-cap.mjs, which fits each as CSS a browser
 * evaluates per tint scope) and the gamut guard (scripts/check-gamut.mjs [guard], which sweeps what ships).
 *
 * A near-white or deep surface holds very different chroma at different hues (at L97, 0.014 at h268 and
 * 0.186 at h110), so one number sized for the tightest hue greys every other one, and one sized for the
 * widest clips. Each cap here is a fraction of the ceiling at the surface's own lightness, as a function
 * of the scope's hue:
 *
 *   night-wash   the tint wash at night, painted at the night depth (L35): 99.5% of the ceiling.
 *   day-backing  the solidify backing under sheer glass by day (L92): 92%.
 *   day-backing-dark  the same at L18, the near-black preset's backing. A tint scope inside its page paints
 *                its backing there, so the backing cap (tokens.css) blends the two fits by the backing
 *                lightness the scope paints at (BACKING_L below), rather than taking L92's everywhere.
 *   day-gloss    the tonal crystal gloss by day (L97): 95%.
 *   day-wash     the tint wash by day at the default and custom wash lightness (L72): 95%. A preset that
 *                paints its wash at another lightness pins its own cap (presets.css, frescoes.css), 95% of
 *                its ceiling there; `pins` prints them.
 *
 * "The ceiling" is lib/oklch-utils' maxSrgbChroma, itself 3% inside the sRGB boundary. `floor` and
 * `presetFloor` are the shares of the ceiling the fit must hold at every hue and at every preset's hue.
 * The night profile keeps the numbers its fit was made with, so it regenerates byte for byte.
 */
import { maxSrgbChroma } from "../../lib/oklch-utils.ts";

/** @typedef {{ token: string, mode: "light" | "dark", lToken: string | null, l: number, share: number, floor: number, presetFloor: number, table: string, what: string }} HueCapProfile */

/** @type {Record<string, HueCapProfile>} */
export const HUE_CAPS = {
  "night-wash": {
    token: "--glass-wash-c-max",
    mode: "dark",
    lToken: "--glass-night-depth",
    l: 35,
    share: 0.995,
    floor: 0.9,
    presetFloor: 0.985,
    table: "NIGHT_WASH_CAP",
    what: "the night wash",
  },
  "day-backing": {
    token: "--glass-solidify-c-max-at-92",
    mode: "light",
    lToken: "--glass-solidify-l",
    l: 92,
    share: 0.92,
    floor: 0.828,
    presetFloor: 0.906,
    table: "DAY_BACKING_CAP",
    what: "the day backing at L92",
  },
  "day-backing-dark": {
    token: "--glass-solidify-c-max-at-18",
    mode: "light",
    lToken: null,
    l: 18,
    share: 0.92,
    floor: 0.828,
    presetFloor: 0.906,
    table: "DAY_BACKING_CAP_DARK",
    what: "the day backing at L18",
  },
  "day-gloss": {
    token: "--glass-gloss-c-max",
    mode: "light",
    lToken: "--glass-gloss-l",
    l: 97,
    share: 0.95,
    floor: 0.855,
    presetFloor: 0.935,
    table: "DAY_GLOSS_CAP",
    what: "the day gloss",
  },
  "day-wash": {
    token: "--glass-wash-c-max",
    mode: "light",
    lToken: "--glass-wash-l",
    l: 72,
    share: 0.95,
    floor: 0.855,
    presetFloor: 0.935,
    table: "DAY_WASH_CAP",
    what: "the day wash",
  },
};

/** The two lightnesses the day backing cap is fitted at, which it blends between by --glass-solidify-l. */
export const BACKING_L = { dark: HUE_CAPS["day-backing-dark"].l, light: HUE_CAPS["day-backing"].l };

/** The share of its own ceiling a preset's pinned day wash cap takes (day-wash's, at the preset's wash L). */
export const PRESET_WASH_SHARE = HUE_CAPS["day-wash"].share;

/** The ceiling at lightness `l` (0–100) and any hue. */
export const ceilingAt = (l, h) => maxSrgbChroma(l, ((h % 360) + 360) % 360);

/**
 * Where the ceiling at lightness `l` stops being convex, to a tenth of a degree: every hue where its slope
 * DROPS (a local maximum, a kink on a rising or falling flank, or a step like L35's blue one). Between two
 * of them the ceiling is convex, so the max of a few tangents follows it from below; across one, a tangent
 * passes over it. Found on the ceiling itself, never read off a fit.
 * @param {number} l
 * @returns {number[]}
 */
export function breakpoints(l) {
  const N = 3600;
  const c = Array.from({ length: N }, (_, i) => ceilingAt(l, i / 10));
  const slope = (i) => (c[(i + 1) % N] - c[i]) / 0.1;
  /* A drop in slope from one tenth to the next; the noise of maxSrgbChroma's bisection is ~1e-6 here. */
  const drops = [];
  for (let i = 0; i < N; i++) {
    const d = slope(i) - slope((i + N - 1) % N);
    if (d < -1e-4) drops.push({ i, d });
  }
  /* One breakpoint per run of neighbouring drops, at its steepest. */
  const out = [];
  for (const p of drops) {
    const last = out[out.length - 1];
    if (last && p.i - last.end <= 2) {
      last.end = p.i;
      if (p.d < last.d) Object.assign(last, { i: p.i, d: p.d });
    } else out.push({ ...p, end: p.i });
  }
  if (out.length > 1 && out[0].i + N - out[out.length - 1].end <= 2) {
    const tail = out.pop();
    if (tail.d < out[0].d) out[0] = { ...tail, end: out[0].end };
  }
  return out.map((p) => p.i / 10).sort((a, b) => a - b);
}

/**
 * A breakpoints() hue located to a ten-thousandth of a degree, within 0.2° of it: where the ceiling peaks
 * if it peaks there (a step's peak is the first hue past it), else where it bends most sharply (a kink).
 * @param {number} l
 * @param {number} approx
 * @returns {number}
 */
export function locateBreakpoint(l, approx) {
  const at = (h) => ceilingAt(l, h);
  let best = approx - 0.2;
  for (let k = -2000; k <= 2000; k++) if (at(approx + k / 10000) > at(best)) best = approx + k / 10000;
  if (best > approx - 0.199 && best < approx + 0.199) return best;
  let kink = approx;
  let sharpest = 0;
  for (let k = -2000; k <= 2000; k++) {
    const h = approx + k / 10000;
    const bend = at(h + 0.001) - 2 * at(h) + at(h - 0.001);
    if (bend < sharpest) {
      sharpest = bend;
      kink = h;
    }
  }
  return kink;
}
