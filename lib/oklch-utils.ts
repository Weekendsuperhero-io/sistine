/**
 * OKLCH color primitives — parse / format an oklch string and generate symmetric ramps
 * (hue or chroma) around an existing color. Dependency-free; shares the {l, c, h} shape with
 * `GradientColor` in gradient-utils.ts.
 */

export interface OklchColor {
  /** Lightness, 0–100 (%) */
  l: number;
  /** Chroma, 0–~0.37 */
  c: number;
  /** Hue, 0–360 (degrees) */
  h: number;
  /** Optional alpha, 0–1 */
  alpha?: number;
}

/**
 * Practical oklch chroma ceiling. Both sRGB and Display-P3 colors stay below ~0.37 (per Evil
 * Martians; confirmed by sweeping every L×hue with the gamut math below — sRGB max ≈ 0.321,
 * P3 max ≈ 0.363). Used as the binary-search bound and the chroma-ramp default range.
 */
export const MAX_CHROMA = 0.37;

/** Wrap a hue into [0, 360). */
export function wrapHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

/** Clamp chroma into [0, MAX_CHROMA]. */
export function clampChroma(c: number): number {
  return Math.max(0, Math.min(MAX_CHROMA, c));
}

/** A bare lightness ≤ 1 is the 0–1 form (×100); otherwise it's already 0–100. */
function normalizeLightness(l: number): number {
  return l <= 1 ? l * 100 : l;
}

/**
 * Parse an `oklch()` string into components. Handles both lightness conventions used in this
 * repo — `oklch(72% 0.05 255)` and `oklch(0.72 0.05 255)` — plus an optional `/ alpha`.
 * Returns null if the string isn't a parseable oklch().
 */
export function parseOklch(input: string): OklchColor | null {
  const match = /^\s*oklch\(([^)]+)\)\s*$/i.exec(input);
  if (!match) return null;

  const [coords, alphaPart] = match[1].split("/");
  const parts = coords.trim().split(/\s+/);
  if (parts.length < 3) return null;

  const lRaw = parts[0];
  const l = lRaw.endsWith("%") ? Number.parseFloat(lRaw) : normalizeLightness(Number.parseFloat(lRaw));
  const c = Number.parseFloat(parts[1]);
  const h = Number.parseFloat(parts[2]);
  if (!Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(h)) return null;

  const color: OklchColor = {
    l,
    c,
    h,
  };
  if (alphaPart !== undefined) {
    const a = Number.parseFloat(alphaPart.trim());
    if (Number.isFinite(a)) color.alpha = a;
  }
  return color;
}

/** Format components back into an `oklch()` string (lightness as %). */
export function formatOklch(color: OklchColor, alpha?: number): string {
  const a = alpha ?? color.alpha;
  const base = `${color.l.toFixed(1)}% ${color.c.toFixed(3)} ${color.h.toFixed(1)}`;
  return a === undefined ? `oklch(${base})` : `oklch(${base} / ${a})`;
}

/** Coerce a base argument (string | OklchColor) into components; throws on an unparseable string. */
function toColor(base: OklchColor | string): OklchColor {
  if (typeof base !== "string") return base;
  const parsed = parseOklch(base);
  if (!parsed) throw new Error(`oklch-utils: could not parse "${base}"`);
  return parsed;
}

/** Per-side step count, clamped to a sane [3, 8] (rounded). */
function clampCount(count: number): number {
  return Math.max(3, Math.min(8, Math.round(count)));
}

/**
 * A full-range value ramp: `count` steps each side of `seed`, reaching `min` on the left and
 * `max` on the right, with the seed held at the center index. Step sizes differ per side (the
 * seed is rarely the midpoint), so the whole [min, max] range is always covered — more steps
 * just sample it finer. Returns `2 * count + 1` values, min → seed → max.
 */
function rangeRamp(seed: number, min: number, max: number, count: number): number[] {
  const leftStep = (seed - min) / count;
  const rightStep = (max - seed) / count;
  const out: number[] = [];
  for (let i = count; i >= 1; i--) out.push(seed - leftStep * i);
  out.push(seed);
  for (let i = 1; i <= count; i++) out.push(seed + rightStep * i);
  return out;
}

/**
 * Hue ramp covering the FULL wheel: `count` steps each side, the seed centered, the left side
 * walking down to hue 0 and the right side up to 360. Lightness + chroma are held; `count` is
 * clamped to [3, 8]. e.g. seed hue 120, count 4 → 0, 30, 60, 90, 120, 180, 240, 300, 360.
 */
export function hueRampColors(base: OklchColor | string, count: number): OklchColor[] {
  const color = toColor(base);
  return rangeRamp(wrapHue(color.h), 0, 360, clampCount(count)).map((h) => ({
    ...color,
    h,
  }));
}

/** Full-wheel hue ramp as CSS oklch strings (the seed sits at the center index). */
export function hueRamp(base: OklchColor | string, count: number): string[] {
  return hueRampColors(base, count).map((color) => formatOklch(color));
}

/**
 * Chroma ramp covering [0, `max`]: `count` steps each side, the seed centered (left → 0, right →
 * `max`). Lightness + hue are held; `count` clamped to [3, 8]. `max` defaults to MAX_CHROMA (the
 * in-gamut ceiling); pass a larger value (e.g. `1`) to sweep the whole numeric range for a demo —
 * everything above the gamut just clamps when rendered.
 */
export function chromaRampColors(base: OklchColor | string, count: number, max: number = MAX_CHROMA): OklchColor[] {
  const color = toColor(base);
  const seed = Math.max(0, Math.min(max, color.c));
  return rangeRamp(seed, 0, max, clampCount(count)).map((c) => ({
    ...color,
    c,
  }));
}

/** Chroma ramp as CSS oklch strings (the seed sits at the center index). */
export function chromaRamp(base: OklchColor | string, count: number, max: number = MAX_CHROMA): string[] {
  return chromaRampColors(base, count, max).map((color) => formatOklch(color));
}

/**
 * Lightness ramp covering the FULL range [0, 100]: `count` steps each side, the seed centered
 * (left → 0, right → 100). Chroma + hue are held; `count` clamped to [3, 8].
 */
export function lightnessRampColors(base: OklchColor | string, count: number): OklchColor[] {
  const color = toColor(base);
  return rangeRamp(color.l, 0, 100, clampCount(count)).map((l) => ({
    ...color,
    l,
  }));
}

/** Full-range lightness ramp as CSS oklch strings (the seed sits at the center index). */
export function lightnessRamp(base: OklchColor | string, count: number): string[] {
  return lightnessRampColors(base, count).map((color) => formatOklch(color));
}

// ── Gamut-aware tonal scale ───────────────────────────────────────────────────
// A tonal scale (the Radix/Tailwind 1→N pattern) is NOT a chroma shift: lightness eases
// light→dark while chroma rises with the scale but is capped by the sRGB gamut — so chroma is
// near-zero in the light tints, peaks in the mid-dark "brand" steps, then tapers in the darkest
// steps (because dark colors can't physically hold as much chroma). The gamut cap is what
// produces that peak-then-fall curve; a flat chroma shift cannot.

/** OKLCH (l 0–100) → linear sRGB channels (values outside [0,1] mean out of gamut). */
function oklchToLinearSrgb(
  l: number,
  c: number,
  hDeg: number,
): [
  number,
  number,
  number,
] {
  const L = l / 100;
  const hr = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const ll = l_ * l_ * l_;
  const mm = m_ * m_ * m_;
  const ss = s_ * s_ * s_;
  return [
    4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss,
    -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss,
    -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss,
  ];
}

/** Whether an oklch color (l 0–100) sits inside the sRGB gamut. */
export function inSrgbGamut(l: number, c: number, h: number): boolean {
  const [r, g, b] = oklchToLinearSrgb(l, c, h);
  const eps = 1e-4;
  return r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && b >= -eps && b <= 1 + eps;
}

/** OKLCH (l 0–100) → linear Display-P3 channels (values outside [0,1] mean out of gamut). */
function oklchToLinearP3(
  l: number,
  c: number,
  h: number,
): [
  number,
  number,
  number,
] {
  // linear sRGB → linear Display-P3 (same color, wider basis) — valid even for out-of-sRGB values.
  const [sr, sg, sb] = oklchToLinearSrgb(l, c, h);
  return [
    0.8224621 * sr + 0.177538 * sg,
    0.0331942 * sr + 0.9668058 * sg,
    0.0170608 * sr + 0.072374 * sg + 0.9105652 * sb,
  ];
}

/** Whether an oklch color (l 0–100) sits inside the Display-P3 gamut. */
export function inP3Gamut(l: number, c: number, h: number): boolean {
  const [r, g, b] = oklchToLinearP3(l, c, h);
  const eps = 1e-4;
  return r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && b >= -eps && b <= 1 + eps;
}

/** Largest in-gamut chroma for (l, h) under the given gamut test, via binary search. */
function maxChromaFor(l: number, h: number, test: (l: number, c: number, h: number) => boolean): number {
  let lo = 0;
  let hi = MAX_CHROMA;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (test(l, mid, h)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Largest chroma keeping (l, h) inside the sRGB gamut. */
export function maxSrgbChroma(l: number, h: number): number {
  return maxChromaFor(l, h, inSrgbGamut);
}

/** Largest chroma keeping (l, h) inside the Display-P3 gamut. */
export function maxP3Chroma(l: number, h: number): number {
  return maxChromaFor(l, h, inP3Gamut);
}

/** Reduce a color's chroma until it fits the given gamut (lightness + hue preserved). */
export function clampToGamut(color: OklchColor, gamut: "srgb" | "p3" = "srgb"): OklchColor {
  const max = gamut === "p3" ? maxP3Chroma(color.l, color.h) : maxSrgbChroma(color.l, color.h);
  return {
    ...color,
    c: Math.min(color.c, max),
  };
}

export interface TonalScaleOptions {
  /** Fixed hue, 0–360. */
  hue: number;
  /** Number of steps. Default 12. */
  steps?: number;
  /** Lightness (0–1) at the lightest step. Default 0.98. */
  lightest?: number;
  /** Lightness (0–1) at the darkest step. Default 0.35. */
  darkest?: number;
  /** Peak chroma intent — the scale builds toward this (gamut permitting). Default 0.2. */
  chroma?: number;
  /** Easing exponent for the lightness descent (>1 stays light longer). Default 2.2. */
  lightEase?: number;
  /** Easing exponent for the chroma rise (>1 stays subtle longer). Default 1.1. */
  chromaRise?: number;
  /** Fraction of the in-gamut chroma ceiling to use, for headroom. Default 0.94. */
  gamutFraction?: number;
  /** Cap chroma to a gamut envelope (gives the natural peak + dark falloff). `"p3"` allows a
   *  punchier peak on wide-gamut displays; `false` disables clamping. Default `"srgb"`. */
  gamut?: "srgb" | "p3" | false;
}

/**
 * Generate a tonal color scale — a single hue with lightness eased light→dark and chroma that
 * rises with the scale but is capped by the chosen gamut (sRGB by default; pass `gamut: "p3"` for a
 * punchier wide-gamut peak). Returns lightest → darkest oklch strings.
 * `tonalScale({ hue: 252 })` gives a Radix/Tailwind-shaped 12-step blue scale.
 */
export function tonalScaleColors(options: TonalScaleOptions): OklchColor[] {
  const {
    hue,
    steps = 12,
    lightest = 0.98,
    darkest = 0.35,
    chroma = 0.2,
    lightEase = 2.2,
    chromaRise = 1.1,
    gamutFraction = 0.94,
    gamut = "srgb",
  } = options;

  const ceiling = gamut === "p3" ? maxP3Chroma : maxSrgbChroma;
  const n = Math.max(2, Math.round(steps));
  const out: OklchColor[] = [];
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    const l = (lightest - (lightest - darkest) * p ** lightEase) * 100;
    let c = chroma * p ** chromaRise;
    if (gamut) c = Math.min(c, ceiling(l, hue) * gamutFraction);
    out.push({
      l,
      c: clampChroma(c),
      h: hue,
    });
  }
  return out;
}

/** Tonal scale as CSS oklch strings (lightest → darkest). */
export function tonalScale(options: TonalScaleOptions): string[] {
  return tonalScaleColors(options).map((color) => formatOklch(color));
}
