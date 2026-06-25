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

/** Per-side step count, clamped to a sane [3, 12] (rounded). */
function clampCount(count: number): number {
  return Math.max(3, Math.min(12, Math.round(count)));
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
 * Hue ramp covering the FULL wheel: `count` steps each side, the seed centered, hues spread evenly
 * around the wheel (step = 360 / (2·count + 1)) and wrapped into [0, 360). Lightness + chroma are
 * held; `count` clamped to [3, 12]. Unlike chroma/lightness, hue is cyclic — 0° ≡ 360° — so the ramp
 * is distributed cyclically instead of running to both endpoints, which keeps the two edge swatches
 * distinct. e.g. seed 120, count 4 → 320, 0, 40, 80, 120, 160, 200, 240, 280.
 */
export function hueRampColors(base: OklchColor | string, count: number): OklchColor[] {
  const color = toColor(base);
  const n = clampCount(count);
  const seed = wrapHue(color.h);
  const step = 360 / (2 * n + 1);
  const out: OklchColor[] = [];
  for (let k = -n; k <= n; k++) {
    out.push({
      ...color,
      h: wrapHue(seed + k * step),
    });
  }
  return out;
}

/** Full-wheel hue ramp as CSS oklch strings (the seed sits at the center index). */
export function hueRamp(base: OklchColor | string, count: number): string[] {
  return hueRampColors(base, count).map((color) => formatOklch(color));
}

/**
 * Chroma ramp covering [0, cap]: `count` steps each side, the seed centered (left → 0, right →
 * cap). Lightness + hue are held; `count` clamped to [3, 12]. `max` defaults to the largest chroma
 * actually DISPLAYABLE for this L+hue in sRGB (≈0.32, varies by L/hue) — so the ramp reaches the
 * visible edge instead of a flat MAX_CHROMA that just clamps on screen. Pass `maxP3Chroma(l, h)` on
 * P3-capable displays for a punchier top end, or any explicit number to sweep a custom range.
 */
export function chromaRampColors(base: OklchColor | string, count: number, max?: number): OklchColor[] {
  const color = toColor(base);
  const cap = max ?? maxSrgbChroma(color.l, color.h);
  const seed = Math.max(0, Math.min(cap, color.c));
  return rangeRamp(seed, 0, cap, clampCount(count)).map((c) => ({
    ...color,
    c,
  }));
}

/** Chroma ramp as CSS oklch strings (the seed sits at the center index). */
export function chromaRamp(base: OklchColor | string, count: number, max?: number): string[] {
  return chromaRampColors(base, count, max).map((color) => formatOklch(color));
}

/**
 * Lightness ramp covering the FULL range [0, 100]: `count` steps each side, the seed centered
 * (left → 0, right → 100). Chroma + hue are held; `count` clamped to [3, 12].
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

/** Which ramp drives a {@link rampGradient}. */
export type RampGradientAxis = "hue" | "lightness" | "tonal" | "chroma";

/**
 * Build a CSS `linear-gradient` from one of the ramps, the seed centered as a slightly wider plateau
 * so the theme color anchors the middle; the rest sit in equal-width bands left → right. `count`
 * steps each side (clamped [3,8]). Interpolated `in oklch` for a perceptual blend.
 * e.g. rampGradient("tonal", { l: 62, c: 0.15, h: 250 }, 5).
 */
export function rampGradient(
  axis: RampGradientAxis,
  seed: OklchColor,
  count: number,
  options: {
    angle?: number;
    gamut?: "srgb" | "p3";
  } = {},
): string {
  const { angle = 90, gamut = "srgb" } = options;
  let colors: OklchColor[];
  switch (axis) {
    case "hue":
      colors = hueRampColors(seed, count);
      break;
    case "lightness":
      colors = lightnessRampColors(seed, count);
      break;
    case "chroma":
      colors = chromaRampColors(seed, count, gamut === "p3" ? maxP3Chroma(seed.l, seed.h) : maxSrgbChroma(seed.l, seed.h));
      break;
    default:
      colors = lightnessRampColors(seed, count).map((color) => clampToGamut(color, gamut));
  }
  const mid = Math.floor(colors.length / 2);
  const plateau = 7; // half-width (%) of the centered theme-color band
  const leftEnd = 50 - plateau;
  const rightStart = 50 + plateau;
  const parts = colors.map((color, i) => {
    const css = formatOklch(color);
    if (i === mid) return `${css} ${leftEnd}%, ${css} ${rightStart}%`;
    const pos = i < mid ? (i / mid) * leftEnd : rightStart + ((i - mid) / mid) * (100 - rightStart);
    return `${css} ${pos.toFixed(1)}%`;
  });
  return `linear-gradient(${angle}deg in oklch, ${parts.join(", ")})`;
}

// ── APCA contrast (WCAG-3 draft) ──────────────────────────────────────────────
// Inlined from the APCA-W3 0.1.9 reference — no dependency. Lc is signed: positive = dark text on
// a light background, negative = light text on a dark one; |Lc| is the perceptual level (~45 for
// large/UI text, ~60 headings, ~75 body, ~90 fine text). APCA is polarity-aware — which WCAG-2's
// ratio is not — so it fits dark mode + tinted glass far better.

/** OKLCH (l 0–100) → gamma-encoded sRGB channels in [0, 1] (out-of-gamut values are clipped). */
function oklchToSrgb(
  l: number,
  c: number,
  h: number,
): [
  number,
  number,
  number,
] {
  const [lr, lg, lb] = oklchToLinearSrgb(l, c, h);
  const encode = (v: number) => {
    const x = Math.max(0, Math.min(1, v));
    return x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055;
  };
  return [
    encode(lr),
    encode(lg),
    encode(lb),
  ];
}

/** APCA screen luminance (Ys) from gamma-encoded sRGB. */
function apcaLuminance([r, g, b]: [
  number,
  number,
  number,
]): number {
  return 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.072175 * b ** 2.4;
}

/**
 * APCA lightness contrast (Lc) between a text color and a background color. Signed: positive = dark
 * text on a light bg, negative = light text on a dark bg; use |Lc| for the level (~60 headings,
 * ~75 body text). A dependency-free port of APCA-W3 0.1.9.
 */
export function apcaContrast(text: OklchColor | string, bg: OklchColor | string): number {
  const t = toColor(text);
  const b = toColor(bg);
  let txtY = apcaLuminance(oklchToSrgb(t.l, t.c, t.h));
  let bgY = apcaLuminance(oklchToSrgb(b.l, b.c, b.h));
  const blkThrs = 0.022;
  // biome-ignore lint/suspicious/noApproximativeNumericConstant: APCA blkClmp tuning constant, not √2
  const blkClmp = 1.414;
  txtY = txtY > blkThrs ? txtY : txtY + (blkThrs - txtY) ** blkClmp;
  bgY = bgY > blkThrs ? bgY : bgY + (blkThrs - bgY) ** blkClmp;
  if (Math.abs(bgY - txtY) < 0.0005) return 0;
  let lc: number;
  if (bgY > txtY) {
    const sapc = (bgY ** 0.56 - txtY ** 0.57) * 1.14;
    lc = sapc < 0.1 ? 0 : sapc - 0.027;
  } else {
    const sapc = (bgY ** 0.65 - txtY ** 0.62) * 1.14;
    lc = sapc > -0.1 ? 0 : sapc + 0.027;
  }
  return lc * 100;
}

const FG_LIGHT: OklchColor = {
  l: 100,
  c: 0,
  h: 0,
};
const FG_DARK: OklchColor = {
  l: 15,
  c: 0,
  h: 0,
};

/**
 * Pick whichever foreground has the higher APCA contrast on `bg` — by default near-white vs the
 * near-black `--foreground`. The light, perceptual way to choose a readable text/icon color: cheap
 * enough to run on a theme/tint change (microseconds), no per-frame work, no canvas readback.
 */
export function pickForeground(bg: OklchColor | string, light: OklchColor = FG_LIGHT, dark: OklchColor = FG_DARK): OklchColor {
  return Math.abs(apcaContrast(light, bg)) >= Math.abs(apcaContrast(dark, bg)) ? light : dark;
}

/**
 * The effective glass surface color for the active theme + tint — the theme's light/dark floor
 * blended with the tint wash, mirroring the glass-* utilities (the wash sits at a FIXED lightness,
 * 72 light / 58 dark; only hue, chroma and alpha vary). Pair with pickForeground to choose readable
 * text on a tinted glass surface without reading pixels back.
 */
export function glassSurface(
  dark: boolean,
  tint: {
    h: number;
    c: number;
    a: number;
  },
): OklchColor {
  const baseL = dark ? 20 : 95;
  const washL = dark ? 58 : 72;
  return {
    l: baseL * (1 - tint.a) + washL * tint.a,
    c: tint.c * 2.5 * tint.a,
    h: tint.h,
  };
}

/** Options for {@link themeForeground}. */
export interface ThemeForegroundOptions {
  /** Which of the ramp generator's axes the text levels follow. */
  palette: "tonal" | "lightness" | "hue" | "chroma";
  /** Text level: 0 = the first swatch; each +1 is one step along the ramp. */
  level: number;
  /** Total steps (the ramp generator's count). */
  count: number;
  /** The chosen color the ramp is built from (the ramp generator's base). */
  base: {
    l: number;
    c: number;
    h: number;
  };
  /** Dark theme? Picks which lightness extreme the tonal/lightness ramps start from. */
  dark: boolean;
  gamut?: "srgb" | "p3";
}

/**
 * Walk one of the ramp generator's ramps — built from the chosen `base` color — mapping ramp steps
 * to text levels. The ramp is **base-centered with `count` steps EITHER SIDE** (so it matches the
 * ramp generator's "steps each side"): level 0 = the readable extreme, level `count` = the base
 * (center), level `2·count` = the opposite extreme — `2·count + 1` levels total. The readable half
 * (levels 0..count) is unchanged, so the live --foreground / --muted-foreground cascade (which only
 * reads that half) is unaffected. `palette` picks the axis:
 *  - tonal / lightness: level 0 is the readable lightness extreme (white in dark mode, black in
 *    light), easing to the base's lightness at `count`, then on to the opposite extreme;
 *  - hue: constant L + C — level 0 is base + count steps, ramping through the base and on the
 *    other way (e.g. base `oklch(60% 0.15 255)`, count 8 → level 0 `oklch(60% 0.15 64.4)`);
 *  - chroma: constant L + hue, chroma 0 → base → the gamut-displayable max.
 * Gamut-clamped.
 */
export function themeForeground(options: ThemeForegroundOptions): OklchColor {
  const { palette, level, count, base, dark, gamut = "srgb" } = options;
  // Piecewise around the centered base: readable extreme (level 0) → base (level count) → other.
  const span = (readable: number, mid: number, other: number) => {
    if (count <= 0) return mid;
    if (level <= count) return readable + (mid - readable) * (level / count);
    return mid + (other - mid) * Math.min(1, (level - count) / count);
  };
  const readableL = dark ? 100 : 0;
  const otherL = dark ? 0 : 100;
  const chromaCap = gamut === "p3" ? maxP3Chroma(base.l, base.h) : maxSrgbChroma(base.l, base.h);
  let color: OklchColor;
  switch (palette) {
    case "hue":
      color = {
        l: base.l,
        c: base.c,
        h: wrapHue(base.h + (count - level) * (360 / (2 * count + 1))),
      };
      break;
    case "chroma":
      color = {
        l: base.l,
        c: span(0, base.c, chromaCap),
        h: base.h,
      };
      break;
    case "lightness":
      color = {
        l: span(readableL, base.l, otherL),
        c: base.c,
        h: base.h,
      };
      break;
    default:
      color = {
        l: span(readableL, base.l, otherL),
        c: span(0, base.c, chromaCap),
        h: base.h,
      };
  }
  return clampToGamut(color, gamut);
}
