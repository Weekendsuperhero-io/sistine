import type { CSSProperties } from "react";

/**
 * Pure-CSS pattern backgrounds — tileable wallpapers built entirely from `background-image` layers
 * (multiple backgrounds + gradients) and SVG `mask-image` silhouettes, all colored off the live
 * OKLCH tint tokens so they recolor with the theme. No canvas, no rAF loop: each static style is a
 * single GPU paint; the animated scenes (synthwave / moonrise grid scroll, the clouds / dune / aurora
 * drifts, the Pac-Man chase) move on compositor-only transforms. Sibling of GradientBackground
 * (CSS gradient) and CanvasBackground (JS canvas).
 */

export type PatternStyle = "dots" | "grid" | "mesh" | "starfield" | "synthwave" | "moonrise" | "clouds" | "dune" | "aurora" | "chase";

export const PATTERN_STYLES: PatternStyle[] = [
  "dots",
  "grid",
  "mesh",
  "starfield",
  "synthwave",
  "moonrise",
  "clouds",
  "dune",
  "aurora",
  "chase",
];

/** Patterns that animate (CSS keyframes) — gates the speed control and shares the --pat-dur/--pat-play pace. */
export const ANIMATED_PATTERNS = new Set<PatternStyle>([
  "synthwave",
  "moonrise",
  "clouds",
  "dune",
  "aurora",
  "chase",
]);

/** Horizon scenes with a sun/moon disc that can be placed left / center / right. */
export const DISC_PATTERNS = new Set<PatternStyle>([
  "synthwave",
  "moonrise",
  "clouds",
  "dune",
  "aurora",
]);

/** Scenes with a blowing-sand control (still / breeze / storm). */
export const SAND_PATTERNS = new Set<PatternStyle>([
  "dune",
]);

/** Star-field density — how many of the star field's points render (a "range of stars"). */
export type PatternDensity = "sparse" | "medium" | "dense";
export const PATTERN_DENSITIES: PatternDensity[] = [
  "sparse",
  "medium",
  "dense",
];
const STAR_COUNT: Record<PatternDensity, number> = {
  sparse: 16,
  medium: 33,
  dense: 50,
};
/** Chase pellet-cell scale per density — sparse = larger cells (fewer per screen), dense = smaller (more). */
const DENSITY_SCALE: Record<PatternDensity, number> = {
  sparse: 1.4,
  medium: 1,
  dense: 0.68,
};
/** Tile-size scale for the geometric tiles (dots / grid) — a much airier ladder: the old sparse (1.4)
 * is the new DENSE, with medium and sparse extrapolated outward on the same ~1.4× step. */
const TILE_SCALE: Record<PatternDensity, number> = {
  sparse: 2.8,
  medium: 2,
  dense: 1.4,
};

// SVG silhouettes as mask sources. White fill + transparent ground works whether the browser samples
// the mask by alpha or luminance. Wrapped in url(...) after encoding so it's a valid CSS value.
// `stretch: true` sets preserveAspectRatio='none' so a wide silhouette (the dune crests) fills the
// element's 100% × 100% mask box instead of letterboxing to the viewBox aspect (the SVG default —
// which renders a full-width mask as a centered strip with cliff edges).
const svgMask = (body: string, viewBox = "0 0 100 100", stretch = false) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'${stretch ? " preserveAspectRatio='none'" : ""} fill='#fff'>${body}</svg>`)}")`;

// The ghost silhouette — used by the chase scene's fleeing ghosts.
const GHOST = svgMask(
  "<path fill-rule='evenodd' d='M50 6 A38 38 0 0 0 12 44 V94 L24 84 L36 94 L48 84 L60 94 L72 84 L84 94 V44 A38 38 0 0 0 50 6 Z M37 40 a8 9 0 1 0 .1 0 Z M63 40 a8 9 0 1 0 .1 0 Z'/>",
);

// Scattered "points" for the galaxy — a fixed set so it's deterministic (SSR-safe, no Math.random).
// Kept as an array so the density control can render just a slice of them.
const STAR_GRADIENTS = [
  [
    8,
    12,
  ],
  [
    22,
    64,
  ],
  [
    15,
    88,
  ],
  [
    35,
    26,
  ],
  [
    44,
    72,
  ],
  [
    52,
    16,
  ],
  [
    61,
    52,
  ],
  [
    68,
    84,
  ],
  [
    73,
    34,
  ],
  [
    82,
    66,
  ],
  [
    88,
    20,
  ],
  [
    92,
    80,
  ],
  [
    28,
    44,
  ],
  [
    57,
    90,
  ],
  [
    4,
    40,
  ],
  [
    12,
    6,
  ],
  [
    19,
    30,
  ],
  [
    26,
    78,
  ],
  [
    33,
    54,
  ],
  [
    40,
    20,
  ],
  [
    47,
    46,
  ],
  [
    54,
    68,
  ],
  [
    63,
    12,
  ],
  [
    66,
    40,
  ],
  [
    70,
    60,
  ],
  [
    77,
    78,
  ],
  [
    80,
    8,
  ],
  [
    84,
    48,
  ],
  [
    90,
    60,
  ],
  [
    95,
    34,
  ],
  [
    6,
    70,
  ],
  [
    48,
    4,
  ],
  [
    58,
    30,
  ],
  [
    76,
    22,
  ],
  [
    2,
    22,
  ],
  [
    16,
    50,
  ],
  [
    24,
    14,
  ],
  [
    38,
    88,
  ],
  [
    50,
    40,
  ],
  [
    56,
    58,
  ],
  [
    64,
    74,
  ],
  [
    72,
    46,
  ],
  [
    86,
    38,
  ],
  [
    94,
    12,
  ],
  [
    10,
    82,
  ],
  [
    30,
    68,
  ],
  [
    42,
    34,
  ],
  [
    60,
    6,
  ],
  [
    74,
    90,
  ],
  [
    96,
    66,
  ],
].map(([x, y], i) => {
  // a range of stars — occasional bright glints, most fine
  const r = i % 7 === 0 ? "2px" : i % 4 === 0 ? "1.6px" : i % 3 === 0 ? "1.3px" : "1px";
  return `radial-gradient(${r} ${r} at ${x}% ${y}%, #fff, transparent)`;
});

// Easter egg: the "Muse" — the Agent mascot's head (fedora + visored helmet) traced as a sparse star
// constellation in every star field (starfield / synthwave / moonrise / clouds / dune / aurora). The dots are anchor points sampled
// from the mascot SVG's bezier paths, cropped to the head (the coat sprawled into unreadable scatter),
// thinned to ~45 (downsample, dedupe) and re-normalized; rendered as stars only — no fill, no lines — so the
// fedora-and-helmet silhouette hides among the real stars until you catch it. Hue follows the accent-or-tint.
// biome-ignore format: keep the sampled dots as one compact "x,y x,y …" string (not a 400-line array).
const MUSE_DOTS = "67,66.5 65.1,52.1 66.7,42.3 75.8,38.4 11,48.8 82.9,45.3 92.3,42.7 100,36.8 84.4,32.8 85.2,58.8 75.5,65.3 71.9,58.3 51.9,42.9 26.4,48.3 60.9,59.3 38.5,42.3 0,50.4 18.3,38 19.3,28.2 19.9,14.7 25.7,5.9 37.5,2.8 51.1,0 62.9,0.5 72.8,5.6 77.5,15.3 79.7,25.7 96.2,90.9 67,78 43.4,85.6 87.4,72.2 87.4,82.7 16.9,65.6 48.2,59.2 37.5,62 28.1,64 19,87 27.2,88.7 88.4,92.4 38.6,70.3 51.5,81.1 21.5,73 33.6,81 53.7,65.1 30.7,40.5".split(" ").map((p) => p.split(",").map(Number));
const MUSE_STYLES = `
.star-muse {
  position: absolute;
  left: 6%;
  top: 3%;
  width: 58vh;
  height: 53.6vh;
  pointer-events: none;
  --muse-h: var(--accent-h, var(--glass-tint-h));
  filter: drop-shadow(0 0 1px oklch(0.72 0.17 var(--muse-h) / 0.5));
  /* Rides the star gate: hidden with the stars in the Tron scenes' day mode; DIMMED (not hidden) with
     them in starfield's day mode. */
  opacity: calc(0.9 * var(--sw-stars-o, 1));
}
.star-muse circle {
  fill: oklch(0.96 0.04 var(--muse-h));
}`;

function MuseConstellation() {
  return (
    <>
      <style>{MUSE_STYLES}</style>
      <svg className="star-muse" viewBox="0 0 100 92.4" aria-hidden="true">
        {MUSE_DOTS.map(([x, y], i) => (
          <circle key={`${x},${y}`} cx={x} cy={y} r={i % 7 === 0 ? 0.22 : i % 3 === 0 ? 0.16 : 0.12} />
        ))}
      </svg>
    </>
  );
}

// Shared sky furniture for the horizon scenes — the star layer (upper sky, fading toward the horizon,
// day-hidden via the --sw-stars-o gate the palettes flip) and the palette-driven DISC. Every disc color is
// a scene var (--sw-moon-1/2/3 core, --sw-maria L C H triple, --sw-disc-glow halo) set per mode by the
// scene's [data-pattern] blocks, and --sw-disc-x carries the left/center/right placement control — so one
// rule paints a rising violet moon, a desert silver moon, or a SUN with zero reskins. The sun is not a
// second element: --sw-maria-o zeroes the craters (a sun has none) and --sw-disc-bloom adds the wide
// second halo a bright source throws, which a moon does not. Both default to the moon's behaviour, so
// moonrise and every night palette are untouched by their existence.
// Placement knobs default to moonrise's horizon-dipping moon (40vh disc sitting ON the 42% horizon);
// sky-borne scenes (clouds / dune) lift it with --moon-bottom and cancel the dip.
const SKY_STYLES = `
.sw-stars {
  position: absolute;
  inset: 0 0 42% 0;
  background-repeat: no-repeat;
  opacity: var(--sw-stars-o, 1);
  -webkit-mask-image: linear-gradient(to bottom, #000 50%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 50%, transparent 100%);
}
.scene-moon {
  position: absolute;
  left: var(--sw-disc-x, 50%);
  bottom: var(--moon-bottom, 42%);
  width: var(--moon-size, 40vh);
  height: var(--moon-size, 40vh);
  transform: translate(-50%, var(--moon-dip, 30%));
  border-radius: 50%;
  background:
    radial-gradient(34% 30% at 63% 30%, oklch(var(--sw-maria) / calc(0.55 * var(--sw-maria-o, 1))) 0, transparent 62%),
    radial-gradient(20% 18% at 38% 56%, oklch(var(--sw-maria) / calc(0.5 * var(--sw-maria-o, 1))) 0, transparent 62%),
    radial-gradient(13% 12% at 56% 72%, oklch(var(--sw-maria) / calc(0.45 * var(--sw-maria-o, 1))) 0, transparent 62%),
    radial-gradient(circle at 42% 38%, var(--sw-moon-1) 0%, var(--sw-moon-2) 52%, var(--sw-moon-3) 100%);
  /* Two halos. The first is the moon's; the second is the sun's wide atmospheric bloom, a no-op
     (0 radius, transparent) unless a palette opts in. */
  filter:
    drop-shadow(0 0 var(--sw-disc-blur, 5vh) var(--sw-disc-glow))
    drop-shadow(0 0 var(--sw-disc-bloom, 0) var(--sw-disc-bloom-c, transparent));
  opacity: var(--sw-moon-o, 1);
}
/* The OUTRUN SUN — synthwave's disc, promoted to shared furniture so clouds / dune / aurora can put the
   same low banded sun on their day horizon. It sits ON the 42% line and dips below it; whatever the scene
   draws next (cloud deck, sand, water) covers the dipped half, so it reads as sitting in the horizon.
   Both discs render in every scene that wants either; --sw-sun-o / --sw-moon-o pick which one shows per
   mode, the same way --sw-stars-o gates the stars. Defaults are 1, so synthwave and moonrise — which
   choose their disc in JSX instead — are untouched. */
.sw-sun {
  position: absolute;
  left: var(--sw-disc-x, 50%);
  bottom: 42%;
  width: var(--sun-size, 46vh);
  height: var(--sun-size, 46vh);
  transform: translate(-50%, 33%);
  border-radius: 50%;
  opacity: var(--sw-sun-o, 1);
  background: linear-gradient(
    to top,
    var(--sw-disc-1) 0%,
    var(--sw-disc-2) 24%,
    var(--sw-disc-3) 52%,
    var(--sw-disc-4) 78%,
    var(--sw-disc-5) 100%
  );
  -webkit-mask-image:
    linear-gradient(to bottom, #000 0 42%, transparent 42%),
    repeating-linear-gradient(to bottom, #000 0 var(--sun-band, 0.85vh), transparent var(--sun-band, 0.85vh) calc(var(--sun-band, 0.85vh) * 2));
  mask-image:
    linear-gradient(to bottom, #000 0 42%, transparent 42%),
    repeating-linear-gradient(to bottom, #000 0 var(--sun-band, 0.85vh), transparent var(--sun-band, 0.85vh) calc(var(--sun-band, 0.85vh) * 2));
  filter: drop-shadow(0 0 5vh var(--sw-disc-glow));
}`;

// Synthwave / Tron horizon — two variants: `synthwave` (outrun sun) and `moonrise` (purple-blue moon),
// each with a DAY and a NIGHT palette so the scene follows the light/dark toggle. Every scene color is a
// --sw-* custom property: day values sit on [data-pattern="…"], night values on `.dark [data-pattern="…"]`
// (the injected <style> is plain global CSS and the wrapper descends from html.dark), and the structural
// rules read the vars — so the mode flip is pure CSS, no re-render. The grid + horizon glow ride --sw-line
// (accent hue, falling back to the scene identity hue --sw-line-h: Tron-cyan sun / violet moon); by day the
// sky/ground also take a gentle cast of the theme tint (--sw-cast, gated on tint chroma so neutral stays
// the authored scene). Layers back→front: sky gradient (.sw-scene) · stars (day-hidden via --sw-stars-o) ·
// disc · ground (hides the disc's dip) · horizon glow · floor-grid. The floor uses PARENT perspective
// (.sw-floor, perspective-origin at the horizon) so lines converge at the horizon, not the near edge. The
// lone motion is the grid's compositor-only translateY scroll.
const SYNTHWAVE_STYLES = `
[data-pattern="synthwave"] {
  /* DAY — a bright, hazy outrun morning */
  --sw-line-h: 195; /* scene identity hue (Tron cyan) — shared by both modes */
  /* Day tint cast — how much of the theme tint bleeds into sky/ground. Gated on the tint's chroma, so the
     near-neutral default (c 0.018 → ~9%) keeps the authored scene and jewels/frescoes (c 0.06–0.1) get a
     gentle atmospheric wash. Day-only; night keeps its authored neon. */
  --sw-cast: min(calc(var(--glass-tint-c, 0.018) * 500%), 32%);
  --sw-line: oklch(0.48 0.08 var(--accent-h, var(--sw-line-h))); /* C 0.08 stays in-gamut at L 0.48 for EVERY accent hue */
  --sw-sky-a: color-mix(in oklch, oklch(0.85 0.055 235), oklch(0.85 0.07 var(--glass-tint-h, 235)) var(--sw-cast));
  --sw-sky-b: color-mix(in oklch, oklch(0.88 0.05 275), oklch(0.88 0.06 var(--glass-tint-h, 275)) var(--sw-cast));
  --sw-sky-c: color-mix(in oklch, oklch(0.9 0.07 330), oklch(0.9 0.06 var(--glass-tint-h, 330)) var(--sw-cast));
  --sw-sky-d: color-mix(in oklch, oklch(0.92 0.04 25), oklch(0.92 0.04 var(--glass-tint-h, 25)) var(--sw-cast));
  --sw-ground-a: color-mix(in oklch, oklch(0.93 0.03 320), oklch(0.93 0.03 var(--glass-tint-h, 320)) var(--sw-cast));
  --sw-ground-b: color-mix(in oklch, oklch(0.87 0.045 310), oklch(0.87 0.04 var(--glass-tint-h, 310)) var(--sw-cast));
  --sw-below: var(--sw-ground-a); /* the 58% sky stop = the ground glimpse; MUST match --sw-ground-a or a seam shows */
  --sw-glow-core: oklch(0.72 0.11 var(--accent-h, var(--sw-line-h)));
  --sw-glow-bloom: oklch(0.75 0.12 340 / 0.35);
  --sw-disc-1: oklch(0.58 0.24 352); /* sun stops, slightly deepened vs night so the disc separates from the peach horizon */
  --sw-disc-2: oklch(0.65 0.22 6);
  --sw-disc-3: oklch(0.72 0.18 42);
  --sw-disc-4: oklch(0.8 0.165 74);
  --sw-disc-5: oklch(0.88 0.16 95);
  --sw-disc-glow: oklch(0.7 0.19 20 / 0.35);
  --sw-stars-o: 0; /* stars hidden by day (also gates the Muse constellation) */
}
.dark [data-pattern="synthwave"] {
  /* NIGHT — the original neon scene, verbatim */
  --sw-line: oklch(0.82 0.19 var(--accent-h, var(--sw-line-h)));
  --sw-sky-a: oklch(0.12 0.085 285);
  --sw-sky-b: oklch(0.15 0.1 305);
  --sw-sky-c: oklch(0.24 0.14 332);
  --sw-sky-d: oklch(0.34 0.16 350);
  --sw-below: oklch(0.09 0.03 282);
  --sw-ground-a: oklch(0.1 0.04 286);
  --sw-ground-b: oklch(0.06 0.02 280);
  --sw-glow-core: var(--sw-line);
  --sw-glow-bloom: oklch(0.62 0.24 340 / 0.4);
  --sw-disc-1: oklch(0.6 0.27 352);
  --sw-disc-2: oklch(0.66 0.25 6);
  --sw-disc-3: oklch(0.74 0.21 42);
  --sw-disc-4: oklch(0.85 0.19 74);
  --sw-disc-5: oklch(0.93 0.17 100);
  --sw-disc-glow: oklch(0.6 0.26 348 / 0.5);
  --sw-stars-o: 1;
}
[data-pattern="moonrise"] {
  /* DAY — a pale morning sky with a faint daytime moon */
  --sw-line-h: 270; /* scene identity hue (violet) */
  --sw-cast: min(calc(var(--glass-tint-c, 0.018) * 500%), 32%);
  --sw-line: oklch(0.45 0.13 var(--accent-h, var(--sw-line-h)));
  --sw-sky-a: color-mix(in oklch, oklch(0.87 0.04 245), oklch(0.87 0.05 var(--glass-tint-h, 245)) var(--sw-cast));
  --sw-sky-b: color-mix(in oklch, oklch(0.9 0.045 260), oklch(0.9 0.045 var(--glass-tint-h, 260)) var(--sw-cast));
  --sw-sky-c: color-mix(in oklch, oklch(0.92 0.035 275), oklch(0.92 0.035 var(--glass-tint-h, 275)) var(--sw-cast));
  --sw-sky-d: color-mix(in oklch, oklch(0.94 0.03 300), oklch(0.94 0.03 var(--glass-tint-h, 300)) var(--sw-cast));
  --sw-ground-a: color-mix(in oklch, oklch(0.93 0.02 275), oklch(0.93 0.025 var(--glass-tint-h, 275)) var(--sw-cast));
  --sw-ground-b: color-mix(in oklch, oklch(0.88 0.035 280), oklch(0.88 0.035 var(--glass-tint-h, 280)) var(--sw-cast));
  --sw-below: var(--sw-ground-a);
  --sw-glow-core: oklch(0.75 0.08 var(--accent-h, var(--sw-line-h)));
  --sw-glow-bloom: oklch(0.8 0.07 290 / 0.3);
  --sw-moon-1: oklch(0.94 0.02 270); /* daytime moon: whitish, barely-there */
  --sw-moon-2: oklch(0.9 0.04 278);
  --sw-moon-3: oklch(0.85 0.06 288);
  --sw-maria: 0.72 0.06 285; /* L C H triple (alpha at the call site) — same convention as --glass-gloss-ink */
  --sw-disc-glow: oklch(0.85 0.05 280 / 0.35);
  --sw-stars-o: 0;
}
.dark [data-pattern="moonrise"] {
  /* NIGHT — the original midnight scene, verbatim */
  --sw-line: oklch(0.72 0.16 var(--accent-h, var(--sw-line-h)));
  --sw-sky-a: oklch(0.09 0.05 265);
  --sw-sky-b: oklch(0.12 0.07 272);
  --sw-sky-c: oklch(0.17 0.09 283);
  --sw-sky-d: oklch(0.23 0.11 293);
  --sw-below: oklch(0.07 0.03 270);
  --sw-ground-a: oklch(0.09 0.04 276);
  --sw-ground-b: oklch(0.05 0.02 270);
  --sw-glow-core: var(--sw-line);
  --sw-glow-bloom: oklch(0.58 0.2 292 / 0.4);
  --sw-moon-1: oklch(0.75 0.11 278);
  --sw-moon-2: oklch(0.6 0.16 290);
  --sw-moon-3: oklch(0.47 0.17 300);
  --sw-maria: 0.4 0.13 296;
  --sw-disc-glow: oklch(0.58 0.17 286 / 0.5);
  --sw-stars-o: 1;
}
.sw-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(
    to bottom,
    var(--sw-sky-a) 0%,
    var(--sw-sky-b) 30%,
    var(--sw-sky-c) 50%,
    var(--sw-sky-d) 57%,
    var(--sw-below) 58%
  );
}
.sw-ground {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 42%;
  background: linear-gradient(to bottom, var(--sw-ground-a) 0%, var(--sw-ground-b) 100%);
}
.sw-glow {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 42%;
  height: 2px;
  background: var(--sw-glow-core);
  box-shadow: 0 0 12px 2px var(--sw-glow-core), 0 0 52px 12px var(--sw-glow-bloom);
}
.sw-floor {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 42%;
  overflow: hidden;
  perspective: 75vh;
  perspective-origin: 50% 0%;
}
/* The floor is split by line direction, each with its own STATIC fade (on the non-moving wrapper, so the
   fade never "breathes"). RUNGS (horizontal lines) pile into sub-pixel density and shimmer as they scroll
   toward you, so they fade out early. RAILS (vertical lines) don't scroll-pileup, so they run to the
   horizon, carrying the grid to the glow with no gap. Each mask also INTERSECTS a left/right fade
   (mask-composite) to vignette the raking east/west edges, where oblique lines alias into choppiness.
   Both wrappers share the exact perspective, so the two overlap. */
.sw-floor-rungs {
  -webkit-mask-image: linear-gradient(to top, #000 40%, transparent 90%), linear-gradient(to right, transparent, #000 15% 85%, transparent);
  mask-image: linear-gradient(to top, #000 40%, transparent 90%), linear-gradient(to right, transparent, #000 15% 85%, transparent);
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
}
.sw-floor-rails {
  -webkit-mask-image: linear-gradient(to top, #000 55%, transparent 99%), linear-gradient(to right, transparent, #000 15% 85%, transparent);
  mask-image: linear-gradient(to top, #000 55%, transparent 99%), linear-gradient(to right, transparent, #000 15% 85%, transparent);
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
}
.sw-grid {
  position: absolute;
  left: -60%;
  right: -60%;
  top: -4vmin;
  height: 66vh;
  background-size: 4vmin 4vmin;
  transform-origin: 50% 0%;
  transform: rotateX(78deg);
}
/* Only the RUNGS scroll, via a COMPOSITOR-ONLY transform (translateY one cell) — GPU-composited, no
   per-frame paint (animating background-position re-rasterizes the gradient every frame; transform does
   not). Seamless because: (a) the tile repeats every cell, so translateY(4vmin) is pixel-identical to 0 —
   no loop jump; and (b) the plane overhangs far past what's visible (tall height + the -4vmin top), so the
   sliding edges stay beyond the floor's overflow-clip + fade mask and never surface — which is what the
   earlier translate lacked. Rails stay static: a floor moving toward you slides the cross-rungs past, but
   the rails you travel along don't move. */
.sw-grid-rungs {
  background-image: linear-gradient(to bottom, var(--sw-line) 0 2px, transparent 2px);
  animation: sw-grid-scroll var(--pat-dur, 8s) linear infinite;
  animation-play-state: var(--pat-play, running);
  will-change: var(--pat-wc, transform);
}
.sw-grid-rails {
  background-image: linear-gradient(to right, var(--sw-line) 0 2px, transparent 2px);
}
@keyframes sw-grid-scroll {
  from { transform: rotateX(78deg) translateY(0); }
  to   { transform: rotateX(78deg) translateY(4vmin); }
}
@media (prefers-reduced-motion: reduce) {
  .sw-grid-rungs { animation: none; will-change: auto; }
}`;
/* The moonrise variant — a purple-blue moon over a midnight sky, no scanlines — shares every structural
   class; its [data-pattern="moonrise"] palette blocks swap the colors, and its disc is the shared
   .scene-moon from SKY_STYLES (whose placement defaults ARE moonrise's horizon-dipping moon). */

// Clouds — the AIRPLANE view, drawn from a photograph of the moon over a cloud deck: a deep blue
// zenith opening to near-white at the deck, a SMALL moon high in a mostly-empty sky, and below it a
// dense cloud deck stretching away like an ocean seen from a cruising jet. Three deck strips drift on
// compositor-only translateX loops for parallax; the FAR strip straddles the 42% horizon so the deck
// recedes into haze rather than ending at a ruler edge — there is no horizon LINE anywhere, because
// there isn't one in the reference. Each strip's repeating tile is a SOLID base (a bottom
// linear-gradient ramp) with a bumpy top edge of radial-gradient domes; each dome carries a --*-lo
// SHADED BELLY just under it, which is what makes real cumulus read three-dimensional, and the whole
// strip carries offset SHOULDER PUFFS so the tops break off their ellipses. SEAMLESS DRIFT: tile repeats
// every --cl-tile, the keyframe translates exactly one tile (var() resolves per layer), and each strip
// overhangs the viewport by a tile per side. Day = a white deck under a deep altitude sky (the sky
// takes a HALF-STRENGTH --sw-cast theme wash, mid-stops only); night = a moonlit slate deck, stars out.
// The moon is a per-mode size: small and photographic by day, prominent by night.
const CLOUDS_STYLES = `
[data-pattern="clouds"] {
  /* DAY — white deck under a deep altitude sky */
  --sw-cast: min(calc(var(--glass-tint-c, 0.018) * 250%), 16%);
  --cl-sky-a: color-mix(in oklch, oklch(0.53 0.115 253), oklch(0.53 0.1 var(--glass-tint-h, 253)) var(--sw-cast));
  --cl-sky-b: color-mix(in oklch, oklch(0.66 0.1 248), oklch(0.66 0.09 var(--glass-tint-h, 248)) var(--sw-cast));
  --cl-sky-c: color-mix(in oklch, oklch(0.79 0.06 241), oklch(0.79 0.055 var(--glass-tint-h, 241)) var(--sw-cast));
  --cl-sky-d: oklch(0.9 0.025 235); /* the pale stop the deck emerges from — authored, no cast */
  --cl-haze: oklch(0.96 0.02 234 / 0.75);
  /* Deck tones — authored white/blue-gray (no theme cast: tinted snow reads dirty). Far is hazier,
     near is the brightest tops with the deepest bellies — but the whole ladder sits CLOSE together:
     cumulus shadows in the reference are far subtler than a poster's. */
  --cl-f-hi: oklch(0.955 0.014 234);
  --cl-f-lo: oklch(0.9 0.022 240);
  --cl-m-hi: oklch(0.975 0.01 233);
  --cl-m-lo: oklch(0.88 0.026 243);
  --cl-n-hi: oklch(0.99 0.006 230);
  --cl-n-lo: oklch(0.855 0.028 245);
  /* daytime SUN — the shared outrun disc, low on the deck. Warmer and less magenta than synthwave's,
     because it has to sit against a deep blue altitude sky rather than a violet one. */
  --sw-sun-o: 1;
  --sw-moon-o: 0;
  --sun-size: 34vh;
  /* Sun ramp, synthwave's structure with the ACCENT standing in for its magenta: the chosen colour sits
     at the BOTTOM of the disc — the end nearest the horizon — and mixes through to a warm yellow at the
     top. Recolouring the whole disc made a green sun when the tint was green; keeping the crown warm
     keeps it reading as a sun while the tint shows exactly where a sunset is most saturated. */
  --sun-h: var(--accent-h, var(--glass-tint-h, 35));
  --sw-disc-1: oklch(0.6 0.21 var(--sun-h));
  --sw-disc-2: color-mix(in oklch, oklch(0.68 0.2 var(--sun-h)), oklch(0.74 0.18 48) 30%);
  --sw-disc-3: color-mix(in oklch, oklch(0.76 0.18 var(--sun-h)), oklch(0.82 0.17 66) 58%);
  --sw-disc-4: color-mix(in oklch, oklch(0.85 0.15 var(--sun-h)), oklch(0.89 0.15 80) 80%);
  --sw-disc-5: oklch(0.94 0.13 94);
  --sw-disc-glow: oklch(0.82 0.16 var(--sun-h) / 0.4);
  --sw-stars-o: 0;
}
.dark [data-pattern="clouds"] {
  /* NIGHT — a moonlit slate deck under deep navy, and the moon comes forward */
  --cl-sky-a: oklch(0.08 0.03 262);
  --cl-sky-b: oklch(0.11 0.04 266);
  --cl-sky-c: oklch(0.15 0.05 270);
  --cl-sky-d: oklch(0.21 0.05 276);
  --cl-haze: oklch(0.45 0.05 272 / 0.35);
  --cl-f-hi: oklch(0.4 0.04 268);
  --cl-f-lo: oklch(0.345 0.04 266);
  --cl-m-hi: oklch(0.46 0.045 269);
  --cl-m-lo: oklch(0.375 0.04 266);
  --cl-n-hi: oklch(0.53 0.05 271);
  --cl-n-lo: oklch(0.415 0.042 267);
  /* Back to a moon: the day block above turns the sun on and the moon off, and .dark only overrides
     what it declares — so both gates have to be flipped back here explicitly. */
  --sw-sun-o: 0;
  --sw-moon-o: 1;
  --moon-size: 26vh;
  --moon-bottom: 57%;
  --moon-dip: 0%;
  --sw-moon-1: oklch(0.95 0.015 255);
  --sw-moon-2: oklch(0.85 0.04 264);
  --sw-moon-3: oklch(0.72 0.07 274);
  --sw-maria: 0.64 0.055 270;
  --sw-disc-glow: oklch(0.8 0.06 266 / 0.45);
  --sw-stars-o: 1;
}
.cl-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* No razor horizon: the sky DISSOLVES into the deck across ~9% instead of cutting at 58%. */
  background: linear-gradient(
    to bottom,
    var(--cl-sky-a) 0%,
    var(--cl-sky-b) 28%,
    var(--cl-sky-c) 48%,
    var(--cl-sky-d) 57%,
    color-mix(in oklch, var(--cl-sky-d), var(--cl-f-hi) 60%) 61%,
    var(--cl-f-hi) 66%
  );
}
/* The cloud SEA backstop under the deck strips — so gaps between the strips' domes (and the nibbles
   never show sky. Its own top edge is masked to nothing so the backstop
   never draws a line of its own.
   ITS STOPS ARE NOT FREE: each strip's solid base ends at the strip's BOTTOM edge, and below that only
   the sea shows — so the sea must already BE that strip's --*-hi tone there or a hard horizontal step
   appears across the whole scene. The sea spans 54%→100% of the viewport; the strips end at 63.5% (far)
   and 82% (mid), i.e. 21% and 61% into the sea. Move a strip's top/height and these stops move too. */
.cl-sea {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 46%;
  background: linear-gradient(to bottom, var(--cl-f-hi) 0% 21%, var(--cl-m-hi) 61%, var(--cl-n-hi) 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 14%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 14%);
}
.cl-deck {
  position: absolute;
  left: calc(-1 * var(--cl-tile));
  right: calc(-1 * var(--cl-tile));
  background-repeat: repeat-x;
  background-size: var(--cl-tile) 100%;
  animation: cl-drift calc(var(--pat-dur, 8s) * var(--cl-k)) linear infinite;
  animation-play-state: var(--pat-play, running);
  will-change: var(--pat-wc, transform);
}
@keyframes cl-drift {
  from { transform: translateX(0); }
  to   { transform: translateX(calc(-1 * var(--cl-tile))); }
}
/* Each deck strip's tile = a bottom linear-gradient ramp (the solid deck) topped by overlapping dome
   ellipses with WIDE, feathered color stops — reference cumulus tops are soft, not cut — and each of
   the bigger domes carries a --*-lo SHADED BELLY tucked directly beneath it (listed after the domes so
   it paints under them). Bellies attached to a puff are what read as volume; the old free-floating
   crevices between puffs read as dirt. Domes overlap x-wise so the deck is continuous; far domes are
   small and flat, near ones tall. GEOMETRY RULE: every ellipse stays inside its TILE (cx ± rx within
   0–100%) and below the strip's TOP edge (cy − ry ≥ 0) — crossing either boundary clips to a hard
   rectangle edge that repeats with the tile. Bases may run past the strip BOTTOM (the next strip /
   sea covers that seam). */
.cl-deck-far {
  /* Straddles the horizon: tops rise past the line, the solid base settles just below it, and the
     haze washes over the whole strip — distant towers dissolving instead of a ruler edge. */
  top: 54.5%;
  height: 9%;
  --cl-tile: 120vh;
  --cl-k: 10;
  background-image:
    radial-gradient(7% 34% at 7% 46%, var(--cl-f-hi) 0 40%, transparent 72%),
    radial-gradient(5% 26% at 16% 52%, var(--cl-f-hi) 0 38%, transparent 70%),
    radial-gradient(9% 36% at 27% 44%, var(--cl-f-hi) 0 42%, transparent 74%),
    radial-gradient(6% 28% at 41% 54%, var(--cl-f-hi) 0 38%, transparent 70%),
    radial-gradient(10% 38% at 52% 46%, var(--cl-f-hi) 0 42%, transparent 74%),
    radial-gradient(5% 24% at 60% 56%, var(--cl-f-hi) 0 38%, transparent 70%),
    radial-gradient(8% 34% at 71% 48%, var(--cl-f-hi) 0 40%, transparent 72%),
    radial-gradient(6% 30% at 86% 52%, var(--cl-f-hi) 0 38%, transparent 70%),
    radial-gradient(5% 32% at 95% 46%, var(--cl-f-hi) 0 40%, transparent 72%),
    radial-gradient(4% 18% at 12% 50%, var(--cl-f-hi) 0 36%, transparent 70%),
    radial-gradient(5% 20% at 33% 48%, var(--cl-f-hi) 0 36%, transparent 70%),
    radial-gradient(3% 14% at 47% 56%, var(--cl-f-hi) 0 34%, transparent 68%),
    radial-gradient(6% 22% at 78% 50%, var(--cl-f-hi) 0 36%, transparent 70%),
    radial-gradient(5% 16% at 7% 62%, var(--cl-f-lo) 0 30%, transparent 76%),
    radial-gradient(7% 20% at 27% 62%, var(--cl-f-lo) 0 30%, transparent 76%),
    radial-gradient(8% 22% at 52% 64%, var(--cl-f-lo) 0 30%, transparent 76%),
    radial-gradient(6% 18% at 71% 64%, var(--cl-f-lo) 0 30%, transparent 76%),
    linear-gradient(to bottom, transparent 0 34%, var(--cl-f-hi) 64% 100%);
}
.cl-deck-mid {
  top: 60%;
  height: 22%;
  --cl-tile: 170vh;
  --cl-k: 6.5;
  background-image:
    radial-gradient(11% 40% at 9% 48%, var(--cl-m-hi) 0 42%, transparent 74%),
    radial-gradient(6% 26% at 18% 56%, var(--cl-m-hi) 0 38%, transparent 70%),
    radial-gradient(14% 44% at 31% 46%, var(--cl-m-hi) 0 44%, transparent 76%),
    radial-gradient(8% 32% at 44% 56%, var(--cl-m-hi) 0 40%, transparent 72%),
    radial-gradient(12% 42% at 58% 46%, var(--cl-m-hi) 0 44%, transparent 76%),
    radial-gradient(5% 22% at 66% 58%, var(--cl-m-hi) 0 36%, transparent 70%),
    radial-gradient(13% 40% at 78% 48%, var(--cl-m-hi) 0 44%, transparent 75%),
    radial-gradient(9% 34% at 91% 52%, var(--cl-m-hi) 0 40%, transparent 72%),
    radial-gradient(7% 28% at 24% 56%, var(--cl-m-hi) 0 38%, transparent 70%),
    radial-gradient(6% 24% at 15% 52%, var(--cl-m-hi) 0 36%, transparent 70%),
    radial-gradient(8% 28% at 38% 50%, var(--cl-m-hi) 0 38%, transparent 72%),
    radial-gradient(5% 20% at 52% 56%, var(--cl-m-hi) 0 34%, transparent 68%),
    radial-gradient(7% 26% at 85% 52%, var(--cl-m-hi) 0 36%, transparent 70%),
    radial-gradient(9% 22% at 9% 66%, var(--cl-m-lo) 0 30%, transparent 76%),
    radial-gradient(11% 26% at 31% 68%, var(--cl-m-lo) 0 30%, transparent 76%),
    radial-gradient(10% 24% at 58% 68%, var(--cl-m-lo) 0 30%, transparent 76%),
    radial-gradient(10% 24% at 78% 70%, var(--cl-m-lo) 0 30%, transparent 76%),
    linear-gradient(to bottom, transparent 0 38%, var(--cl-m-hi) 72% 100%);
}
.cl-deck-near {
  top: 66%;
  height: 34%;
  --cl-tile: 230vh;
  --cl-k: 4;
  background-image:
    radial-gradient(15% 46% at 15% 54%, var(--cl-n-hi) 0 44%, transparent 76%),
    radial-gradient(8% 32% at 28% 64%, var(--cl-n-hi) 0 40%, transparent 72%),
    radial-gradient(18% 48% at 44% 52%, var(--cl-n-hi) 0 46%, transparent 78%),
    radial-gradient(10% 38% at 58% 62%, var(--cl-n-hi) 0 42%, transparent 74%),
    radial-gradient(16% 46% at 73% 54%, var(--cl-n-hi) 0 46%, transparent 78%),
    radial-gradient(7% 28% at 83% 64%, var(--cl-n-hi) 0 38%, transparent 72%),
    radial-gradient(8% 42% at 92% 56%, var(--cl-n-hi) 0 40%, transparent 73%),
    radial-gradient(6% 26% at 66% 70%, var(--cl-n-hi) 0 36%, transparent 70%),
    radial-gradient(9% 30% at 22% 60%, var(--cl-n-hi) 0 38%, transparent 72%),
    radial-gradient(12% 36% at 36% 56%, var(--cl-n-hi) 0 40%, transparent 74%),
    radial-gradient(7% 26% at 51% 62%, var(--cl-n-hi) 0 36%, transparent 70%),
    radial-gradient(10% 32% at 86% 60%, var(--cl-n-hi) 0 38%, transparent 72%),
    radial-gradient(13% 26% at 15% 74%, var(--cl-n-lo) 0 30%, transparent 76%),
    radial-gradient(15% 28% at 44% 72%, var(--cl-n-lo) 0 30%, transparent 76%),
    radial-gradient(13% 26% at 73% 74%, var(--cl-n-lo) 0 30%, transparent 76%),
    linear-gradient(to bottom, transparent 0 42%, var(--cl-n-hi) 76% 100%);
}
/* Horizon haze — the layer that replaces the old 1.5px .cl-edge rule. A broad sky-toned wash centred
   on the horizon, painted OVER the far deck so distant towers fade into it. */
.cl-haze {
  position: absolute;
  left: 0;
  right: 0;
  top: 46%;
  height: 26%;
  background: linear-gradient(to bottom, transparent 0%, var(--cl-haze) 42%, transparent 100%);
}
@media (prefers-reduced-motion: reduce) {
  .cl-deck { animation: none; will-change: auto; }
}`;

// Dune — drawn from the aerial golden-hour references: ridges receding into haze at the shared 42%
// horizon. The ground is the farthest sand sheet and SIX SVG-masked tiers stack in front. The scene's
// governing idea is AERIAL PERSPECTIVE: the far tiers sit within a few percent of the horizon sky's
// value (they are almost not there), contrast opens only as the ridges approach, and a mottled HAZE
// band painted OVER the tiers — not behind them — dissolves the far crests into the sky, so there is
// no horizon LINE anywhere. Each tier is three stacked silhouettes sharing one mask: a blurred dark
// CAST-SHADOW twin nudged up (the crest's shadow falling on the ridge behind), a thin lit CREST-RIM
// twin, then the face itself — a DIAGONAL windward/slip-face gradient whose angle (--du-light) follows
// the sun/moon placement control, so the lit faces always agree with where the disc hangs, plus
// anisotropic RIDGE STRIATION that coarsens toward the viewer. BLOWING SAND: two faint grain layers —
// a static masked wrapper (the horizon fade must not ride the motion) around a tile that translates one
// background period diagonally (right + up) per loop, so the drift is seamless. Day = dusty mauve-brown
// ridges under a pale sky with the warmth compressed into a band at the skyline; night = cool indigo
// ridges under a warm desert moon. The moon is a per-mode size: small by day, prominent by night.
// RIDGE GRAMMAR. The old paths were all-`C`, smooth at every join, 2-3 inflections — a grammar that can
// only make sine waves, which is what they read as. Real ridges (see the aerial references) have a long
// shallow windward flank rising to a DEFINED apex, then a short steep slip face: asymmetry plus a corner.
// So each crest here is `C` (the slow rise) followed by `L` (the fast drop) — the C→L join is the corner,
// and there was not one of those in the old set. But giving EVERY crest the same treatment read as
// machined zigzag, so each tier now mixes ONE defined corner with smooth rounded crests at differing
// amplitudes — landforms are not uniformly sharp. Crests per tile at uneven spacing, amplitude and
// sharpness growing toward the viewer; the far tiers stay softer because haze erases that detail anyway.
// Crests keep headroom above y=0: .du-sh draws this same silhouette nudged UP by --du-off and blurred 8px,
// and a crest sitting on the top edge would clip its own cast shadow.
const DUNE_A0 = svgMask("<path d='M0 25 C 24 22 42 20 60 22 C 82 25 100 21 122 19 C 148 17 176 22 200 24 L200 60 L0 60 Z'/>", "0 0 200 60", true);
const DUNE_A = svgMask(
  "<path d='M0 28 C 20 25 34 21 50 22 L56 25 C 74 29 92 25 110 22 C 132 19 158 24 178 26 C 188 27 194 27 200 26 L200 60 L0 60 Z'/>",
  "0 0 200 60",
  true,
);
const DUNE_B = svgMask(
  "<path d='M0 31 C 16 27 30 21 46 20 L53 26 C 68 31 84 29 98 25 C 116 20 136 25 154 30 C 172 34 188 32 200 30 L200 60 L0 60 Z'/>",
  "0 0 200 60",
  true,
);
const DUNE_C = svgMask(
  "<path d='M0 39 C 14 34 26 26 40 23 L48 31 C 60 37 74 35 88 31 C 106 26 122 32 138 38 C 158 44 182 40 200 37 L200 60 L0 60 Z'/>",
  "0 0 200 60",
  true,
);
const DUNE_D = svgMask(
  "<path d='M0 45 C 12 38 24 28 38 23 L47 33 C 58 41 72 39 86 34 C 104 28 120 35 136 42 C 158 49 182 45 200 42 L200 60 L0 60 Z'/>",
  "0 0 200 60",
  true,
);
const DUNE_E = svgMask(
  "<path d='M0 41 C 10 32 22 20 36 15 L46 27 C 56 36 70 34 84 28 C 102 21 118 30 134 40 C 156 49 182 44 200 38 L200 60 L0 60 Z'/>",
  "0 0 200 60",
  true,
);
const DUNE_STYLES = `
[data-pattern="dune"] {
  /* DAY — GOLDEN HOUR, drawn from the aerial reference: a pale blue zenith cooling through a
     near-neutral cream, then the warmth compressed into a narrow band at the bottom of the sky —
     apricot into a deeper orange that meets the land. Chroma stays LOW everywhere but that band;
     the photograph's sky is dusty, not a poster sunset. */
  --sw-cast: min(calc(var(--glass-tint-c, 0.018) * 250%), 16%);
  --du-sky-a: color-mix(in oklch, oklch(0.79 0.05 250), oklch(0.79 0.045 var(--glass-tint-h, 250)) var(--sw-cast));
  --du-sky-b: color-mix(in oklch, oklch(0.84 0.03 262), oklch(0.84 0.03 var(--glass-tint-h, 262)) var(--sw-cast));
  --du-sky-c: color-mix(in oklch, oklch(0.87 0.03 70), oklch(0.87 0.03 var(--glass-tint-h, 70)) var(--sw-cast));
  --du-sky-d: oklch(0.86 0.055 64); /* warm band — authored from here down, or the cast pinks it */
  --du-sky-e: oklch(0.82 0.075 52); /* apricot… */
  --du-sky-f: oklch(0.74 0.075 40); /* …into the deeper orange the haze sits in */
  /* Terrain — AERIAL PERSPECTIVE, the change that separates photo from poster. The far tiers sit
     within a few percent of the horizon haze (they are barely darker than the sky); contrast opens
     up only as the ridges approach. The family is dusty MAUVE-BROWN, not gold: in the reference the
     sand reads warm only where the low sun grazes a crest, and the gullies fall to cool violet-brown.
     Six tiers (g/aa farthest … e nearest), each a hi→lo pair for the DIAGONAL lit-face / slip-face. */
  --du-g-hi: oklch(0.66 0.035 40);
  --du-g-lo: oklch(0.63 0.035 36);
  --du-aa-hi: oklch(0.63 0.04 42);
  --du-aa-lo: oklch(0.58 0.035 34);
  --du-a-hi: oklch(0.6 0.04 45);
  --du-a-lo: oklch(0.52 0.035 32);
  --du-b-hi: oklch(0.56 0.045 48);
  --du-b-lo: oklch(0.44 0.035 30);
  --du-c-hi: oklch(0.5 0.05 50);
  --du-c-lo: oklch(0.36 0.03 28);
  --du-d-hi: oklch(0.44 0.05 52);
  --du-d-lo: oklch(0.33 0.03 28);
  --du-e-hi: oklch(0.38 0.045 54);
  --du-e-lo: oklch(0.27 0.028 26);
  --du-crest: oklch(0.82 0.06 62 / 0.12); /* grazing light on a crest — a whisper, not an outline */
  --du-tex-hi: oklch(0.95 0.04 70 / 0.03); /* ridge striation, lit side… */
  --du-tex-lo: oklch(0.25 0.03 30 / 0.03); /* …and the gully between. Kept to a WHISPER: a
     repeating gradient runs dead straight across the whole viewport, so anything stronger reads as
     contour lines on a map rather than grain on sand. */
  --du-shadow: oklch(0.3 0.04 32 / 0.4); /* cast shadow falling on the ridge behind */
  --du-glow: oklch(0.8 0.07 44 / 0.55); /* the horizon haze the land dissolves into */
  --du-grain: oklch(0.86 0.03 58);
  --du-veil: oklch(0.93 0.05 66 / 0.6); /* sun-lit sand carried on the wind */
  /* daytime SUN — the shared outrun disc sitting ON the horizon, which is what puts the golden hour in
     the sky and what the grazing light on every crest comes from. Painted before the ground and the
     tiers, so the dipped half is covered and a near crest occludes it, as it should. */
  --sw-sun-o: 1;
  --sw-moon-o: 0;
  --sun-size: 40vh;
  /* Sun ramp, synthwave's structure with the ACCENT standing in for its magenta: the chosen colour sits
     at the BOTTOM of the disc — the end nearest the horizon — and mixes through to a warm yellow at the
     top. Recolouring the whole disc made a green sun when the tint was green; keeping the crown warm
     keeps it reading as a sun while the tint shows exactly where a sunset is most saturated. */
  --sun-h: var(--accent-h, var(--glass-tint-h, 35));
  --sw-disc-1: oklch(0.6 0.21 var(--sun-h));
  --sw-disc-2: color-mix(in oklch, oklch(0.68 0.2 var(--sun-h)), oklch(0.74 0.18 48) 30%);
  --sw-disc-3: color-mix(in oklch, oklch(0.76 0.18 var(--sun-h)), oklch(0.82 0.17 66) 58%);
  --sw-disc-4: color-mix(in oklch, oklch(0.85 0.15 var(--sun-h)), oklch(0.89 0.15 80) 80%);
  --sw-disc-5: oklch(0.94 0.13 94);
  --sw-disc-glow: oklch(0.8 0.17 var(--sun-h) / 0.45);
  --sw-stars-o: 0;
}
.dark [data-pattern="dune"] {
  /* NIGHT — cool indigo dunes under a warm desert moon, on the same aerial-perspective ladder: the
     farthest ridge sits at the horizon sky's value and the near ones fall away to near-black. */
  --du-sky-a: oklch(0.09 0.04 270);
  --du-sky-b: oklch(0.12 0.05 277);
  --du-sky-c: oklch(0.16 0.055 288);
  --du-sky-d: oklch(0.22 0.06 300);
  --du-sky-e: oklch(0.2 0.04 312); /* blue-purple band… */
  --du-sky-f: oklch(0.19 0.028 10); /* …with a VERY faint red breath right at the horizon (barely there) */
  /* Every tier's LIT face stays near the horizon sky's value — moonlight grazes every crest — while
     the slip faces fall away, so the ladder reads as depth instead of collapsing to a black mass.
     Contrast WITHIN a tier is what widens toward the viewer here, not the tier's overall value. */
  --du-g-hi: oklch(0.21 0.038 292);
  --du-g-lo: oklch(0.185 0.036 286);
  --du-aa-hi: oklch(0.205 0.038 290);
  --du-aa-lo: oklch(0.175 0.036 284);
  --du-a-hi: oklch(0.2 0.038 288);
  --du-a-lo: oklch(0.16 0.034 280);
  --du-b-hi: oklch(0.195 0.038 286);
  --du-b-lo: oklch(0.145 0.032 276);
  --du-c-hi: oklch(0.19 0.036 283);
  --du-c-lo: oklch(0.13 0.03 272);
  --du-d-hi: oklch(0.185 0.034 280);
  --du-d-lo: oklch(0.115 0.028 268);
  --du-e-hi: oklch(0.18 0.032 277);
  --du-e-lo: oklch(0.1 0.025 264);
  --du-crest: oklch(0.55 0.04 272 / 0.1); /* moonlit crest rim */
  --du-tex-hi: oklch(0.7 0.04 275 / 0.022);
  --du-tex-lo: oklch(0.02 0.01 265 / 0.035);
  --du-shadow: oklch(0.03 0.012 265 / 0.5);
  --du-glow: oklch(0.3 0.05 305 / 0.4);
  --du-grain: oklch(0.38 0.03 275); /* dim sand-toned specks — bright dots read as stars ON the dunes */
  --du-veil: oklch(0.5 0.035 275 / 0.45);
  /* Back to a moon — both disc gates flipped explicitly (see the clouds note). */
  --sw-sun-o: 0;
  --sw-moon-o: 1;
  --moon-size: 36vh;
  --moon-bottom: 50%;
  --moon-dip: 0%;
  --sw-moon-1: oklch(0.95 0.015 95);
  --sw-moon-2: oklch(0.86 0.03 92);
  --sw-moon-3: oklch(0.74 0.05 88);
  --sw-maria: 0.66 0.045 90;
  --sw-disc-glow: oklch(0.85 0.05 92 / 0.45);
  --sw-stars-o: 1;
}
.du-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* No razor horizon: the sky DISSOLVES into the land across ~7%. */
  background: linear-gradient(
    to bottom,
    var(--du-sky-a) 0%,
    var(--du-sky-b) 30%,
    var(--du-sky-c) 44%,
    var(--du-sky-d) 51%,
    var(--du-sky-e) 55%,
    var(--du-sky-f) 58%,
    color-mix(in oklch, var(--du-sky-f), var(--du-g-hi) 65%) 61%,
    var(--du-g-hi) 65%
  );
}
/* Horizon haze — painted OVER the dune tiers (see the render order), not under them: that is what
   makes the far ridges dissolve into the sky the way aerial perspective actually works. */
.du-glow {
  position: absolute;
  left: 0;
  right: 0;
  top: 47%;
  height: 26%;
  background: linear-gradient(to bottom, transparent 0%, var(--du-glow) 40%, transparent 100%);
}
/* The farthest sand sheet. Its top edge is masked to nothing so the sheet itself never draws a line
   where it meets the sky — the scene gradient's dissolve carries that transition instead. */
.du-ground {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 46%;
  background: linear-gradient(var(--du-light, 160deg), var(--du-g-hi) 0%, color-mix(in oklch, var(--du-g-hi), var(--du-g-lo) 55%) 52%, var(--du-g-lo) 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 14%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 14%);
}
.du-dune {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
}
/* Layer-position classes — height + silhouette mask, shared by a dune's fill and its shadow/rim twins.
   --du-off scales the twin offsets with nearness (closer dune → longer cast shadow, thicker rim). */
.du-pos-aa {
  height: 58%;
  -webkit-mask: ${DUNE_A0} bottom / 100% 100% no-repeat;
  mask: ${DUNE_A0} bottom / 100% 100% no-repeat;
}
.du-pos-a {
  height: 52%;
  --du-off: 0.7vh;
  -webkit-mask: ${DUNE_A} bottom / 100% 100% no-repeat;
  mask: ${DUNE_A} bottom / 100% 100% no-repeat;
}
.du-pos-b {
  height: 45%;
  --du-off: 0.9vh;
  -webkit-mask: ${DUNE_B} bottom / 100% 100% no-repeat;
  mask: ${DUNE_B} bottom / 100% 100% no-repeat;
}
.du-pos-c {
  height: 37%;
  --du-off: 1.2vh;
  -webkit-mask: ${DUNE_C} bottom / 100% 100% no-repeat;
  mask: ${DUNE_C} bottom / 100% 100% no-repeat;
}
.du-pos-d {
  height: 28%;
  --du-off: 1.6vh;
  -webkit-mask: ${DUNE_D} bottom / 100% 100% no-repeat;
  mask: ${DUNE_D} bottom / 100% 100% no-repeat;
}
.du-pos-e {
  height: 18%;
  --du-off: 2vh;
  -webkit-mask: ${DUNE_E} bottom / 100% 100% no-repeat;
  mask: ${DUNE_E} bottom / 100% 100% no-repeat;
}
/* CAST-SHADOW twin — the dune's own silhouette, dark + blurred, nudged UP: the sharp dune drawn over it
   covers all but a soft band hugging the crest from above — the shadow the crest throws on the dune
   behind. Painted before the rim + fill of the same dune. */
.du-sh {
  background: var(--du-shadow);
  filter: blur(8px);
  transform: translateY(calc(-1 * var(--du-off, 1vh)));
}
/* CREST-RIM twin — the same silhouette in crest light, nudged up a sliver, so a thin lit edge follows
   the whole crest curve (a top-of-element band can't: it only touches the path's peaks). */
.du-rim {
  background: var(--du-crest);
  transform: translateY(calc(-0.18 * var(--du-off, 1vh)));
}
/* Dune faces — a DIAGONAL windward/slip-face gradient (hi lit face → mixed mid → lo shadow face);
   --du-light follows the sun/moon placement control (set inline) so lit faces agree with the disc.
   Tiers a…e also carry RIDGE STRIATION: a light and a dark anisotropic noise pass, offset from each
   other so they never line up, at a scale that COARSENS toward the viewer. Because the striation
   rides in each tier's own background it is clipped by that tier's silhouette mask, so the grain
   follows the landform instead of sheeting flatly across the scene. The two farthest tiers (ground
   and aa) stay smooth on purpose — haze erases that detail at distance in the reference. */
.du-fill-aa {
  background: linear-gradient(calc(var(--du-light, 160deg) - 3deg), var(--du-aa-hi) 0%, color-mix(in oklch, var(--du-aa-hi), var(--du-aa-lo) 55%) 55%, var(--du-aa-lo) 100%);
}
.du-fill-a {
  background-image:
    repeating-linear-gradient(173deg, transparent 0 5px, var(--du-tex-hi) 5px 6px, transparent 6px 11px),
    repeating-linear-gradient(187deg, transparent 0 9px, var(--du-tex-lo) 9px 10px, transparent 10px 17px),
    linear-gradient(calc(var(--du-light, 160deg) + 6deg), var(--du-a-hi) 0%, color-mix(in oklch, var(--du-a-hi), var(--du-a-lo) 55%) 49%, var(--du-a-lo) 100%);
}
.du-fill-b {
  background-image:
    repeating-linear-gradient(172deg, transparent 0 6px, var(--du-tex-hi) 6px 7px, transparent 7px 13px),
    repeating-linear-gradient(188deg, transparent 0 11px, var(--du-tex-lo) 11px 12px, transparent 12px 21px),
    linear-gradient(calc(var(--du-light, 160deg) - 5deg), var(--du-b-hi) 0%, color-mix(in oklch, var(--du-b-hi), var(--du-b-lo) 55%) 54%, var(--du-b-lo) 100%);
}
.du-fill-c {
  background-image:
    repeating-linear-gradient(174deg, transparent 0 7px, var(--du-tex-hi) 7px 8px, transparent 8px 16px),
    repeating-linear-gradient(187deg, transparent 0 13px, var(--du-tex-lo) 13px 14px, transparent 14px 25px),
    linear-gradient(calc(var(--du-light, 160deg) + 4deg), var(--du-c-hi) 0%, color-mix(in oklch, var(--du-c-hi), var(--du-c-lo) 55%) 50%, var(--du-c-lo) 100%);
}
.du-fill-d {
  background-image:
    repeating-linear-gradient(172deg, transparent 0 9px, var(--du-tex-hi) 9px 10px, transparent 10px 20px),
    repeating-linear-gradient(189deg, transparent 0 16px, var(--du-tex-lo) 16px 17px, transparent 17px 31px),
    linear-gradient(calc(var(--du-light, 160deg) - 7deg), var(--du-d-hi) 0%, color-mix(in oklch, var(--du-d-hi), var(--du-d-lo) 55%) 53%, var(--du-d-lo) 100%);
}
.du-fill-e {
  background-image:
    repeating-linear-gradient(173deg, transparent 0 11px, var(--du-tex-hi) 11px 12px, transparent 12px 25px),
    repeating-linear-gradient(188deg, transparent 0 20px, var(--du-tex-lo) 20px 21px, transparent 21px 39px),
    linear-gradient(calc(var(--du-light, 160deg) + 8deg), var(--du-e-hi) 0%, color-mix(in oklch, var(--du-e-hi), var(--du-e-lo) 55%) 48%, var(--du-e-lo) 100%);
}
.du-grains {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 46%;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to top, #000 50%, transparent 96%);
  mask-image: linear-gradient(to top, #000 50%, transparent 96%);
}
.du-grain-tile {
  position: absolute;
  top: -4vh;
  right: 0;
  bottom: calc(-1 * var(--du-ty) - 2vh);
  left: calc(-1 * var(--du-tx) - 2vh);
  background-repeat: repeat;
  background-size: var(--du-tx) var(--du-ty);
  animation: du-blow calc(var(--pat-dur, 8s) * var(--du-k)) linear infinite;
  animation-play-state: var(--pat-play, running);
  will-change: var(--pat-wc, transform);
}
@keyframes du-blow {
  from { transform: translate(0, 0); }
  to   { transform: translate(var(--du-tx), calc(-1 * var(--du-ty))); }
}
/* BLOWING SAND, the coarse half — wide translucent VEILS streaming off the crests. This is what reads
   as wind at a glance; the specks alone are too fine to register. Each veil is a repeating tile of very
   elongated, very soft ellipses translating exactly one tile per loop, so the drift is seamless, and the
   whole group is gated by --du-sand-o (0 at "still"). Same GEOMETRY RULE as the cloud decks: every
   ellipse stays inside its tile (cx ± rx within 0-100%, cy - ry >= 0) or it clips to a hard rectangle
   edge that repeats with the tile. */
.du-veils {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 44%;
  overflow: hidden;
  opacity: var(--du-sand-o, 0.55);
  -webkit-mask-image: linear-gradient(to top, #000 26%, transparent 96%);
  mask-image: linear-gradient(to top, #000 26%, transparent 96%);
}
.du-veil {
  position: absolute;
  left: calc(-1 * var(--du-vt));
  right: calc(-1 * var(--du-vt));
  background-repeat: repeat-x;
  background-size: var(--du-vt) 100%;
  animation: du-veil-drift calc(var(--pat-dur, 8s) * var(--du-vk)) linear infinite;
  animation-play-state: var(--pat-play, running);
  will-change: var(--pat-wc, transform);
}
@keyframes du-veil-drift {
  from { transform: translateX(0); }
  to   { transform: translateX(var(--du-vt)); }
}
/* Very high aspect (40% wide × 5% tall) with a long soft falloff. Compact ellipses read as puddles
   sitting ON the sand; only a long flat streak reads as sand carried THROUGH the air. The geometry
   rule caps rx at 50 with cx in [rx, 100-rx], so a tile gets one long streak plus a couple of short
   ones — which is the sparse, uneven spacing wind actually has. */
.du-veil-a {
  top: 6%;
  height: 38%;
  --du-vt: 150vh;
  --du-vk: 2.2;
  background-image:
    radial-gradient(40% 5% at 50% 56%, var(--du-veil) 0 10%, transparent 80%),
    radial-gradient(20% 4% at 22% 34%, var(--du-veil) 0 10%, transparent 78%),
    radial-gradient(14% 3% at 84% 72%, var(--du-veil) 0 10%, transparent 76%);
}
.du-veil-b {
  top: 22%;
  height: 46%;
  --du-vt: 108vh;
  --du-vk: 1.4;
  background-image:
    radial-gradient(34% 4% at 44% 44%, var(--du-veil) 0 10%, transparent 80%),
    radial-gradient(16% 3% at 82% 68%, var(--du-veil) 0 10%, transparent 76%);
}
.du-grains-a {
  --du-tx: 42vh;
  --du-ty: 14vh;
  --du-k: 1.5;
  /* Scaled by the sand control: the base 0.1 is a whisper, and "still" takes it to nothing. */
  opacity: calc(0.1 * var(--du-grain-o, 1));
}
.du-grains-a .du-grain-tile {
  background-image:
    radial-gradient(1.3px 1px at 8% 20%, var(--du-grain), transparent),
    radial-gradient(1px 1px at 21% 64%, var(--du-grain), transparent),
    radial-gradient(1.5px 1px at 37% 38%, var(--du-grain), transparent),
    radial-gradient(1px 1px at 52% 76%, var(--du-grain), transparent),
    radial-gradient(1.2px 1px at 66% 24%, var(--du-grain), transparent),
    radial-gradient(1px 1px at 81% 55%, var(--du-grain), transparent),
    radial-gradient(1.4px 1px at 93% 40%, var(--du-grain), transparent);
}
.du-grains-b {
  --du-tx: 34vh;
  --du-ty: 10vh;
  --du-k: 2.6;
  opacity: calc(0.07 * var(--du-grain-o, 1));
}
.du-grains-b .du-grain-tile {
  background-image:
    radial-gradient(1px 1px at 5% 30%, var(--du-grain), transparent),
    radial-gradient(1.2px 1px at 18% 72%, var(--du-grain), transparent),
    radial-gradient(1px 1px at 33% 18%, var(--du-grain), transparent),
    radial-gradient(1.3px 1px at 49% 52%, var(--du-grain), transparent),
    radial-gradient(1px 1px at 64% 82%, var(--du-grain), transparent),
    radial-gradient(1.1px 1px at 90% 26%, var(--du-grain), transparent);
}
@media (prefers-reduced-motion: reduce) {
  .du-grain-tile, .du-veil { animation: none; will-change: auto; }
}`;

// Aurora — the borealis over a MIRROR-CALM WATERLINE, no moon (a moonless sky is when the lights are
// most vivid; the pattern shares only the stars). Three curtain layers paint slanted ray columns: each is
// a repeating tile of vertical color bands (authored borealis hues --au-1..4 — green / teal / violet /
// pink), leaned by a static skewX so the rays rake like field lines, feathered by a bright-at-the-lip
// vertical mask INTERSECTED with left/right fades (the real-aurora look: a crisp lower lip dissolving
// upward), and softened by a static blur. THE DANCE is two compositor-only animations per curtain —
// au-sway (translateX + skew wander, alternate) and au-shimmer (opacity breath) — at different multiples
// of --pat-dur with negative delays, so the three curtains phase against each other and never sync up.
// THE WATER: below the horizon the same three curtains render again inside a scaleY(-1) wrapper — same
// classes, same animations, so the reflection dances in sync and its skews mirror like a real reflection —
// dimmed + extra-blurred (--au-dim / --au-blur-m) with ripple stripes intersected into their mask, under a
// drifting ripple-shimmer overlay (translateY one stripe period, seamless). The waterline itself is a
// mottled HAZE band, not a rule: sky and reflection fade into each other across it. Day = GOLDEN HOUR on
// the same ramp as dune (a full blue zenith cooling through a near-neutral cream into apricot at the
// water), the curtains still strong against it (identity over astronomy, like starfield's day glints).
// The chosen color rides both gradients: the --au-3 band takes var(--accent-h, var(--glass-tint-h)) in
// both modes, and by day it also carries the cream mid-sky stop — at LOW chroma, which is what that band
// is in the reference photographs, so the theme reads without fighting them.
const AURORA_STYLES = `
[data-pattern="aurora"] {
  /* DAY — GOLDEN HOUR on the same ramp as dune, from the aerial references: a full blue up top
     cooling through a near-neutral cream, the warmth compressed into a band at the waterline. The
     chosen color still rides the sunrise gradient, but at LOW chroma — that is exactly what the
     reference's desaturated mid-sky is, so it carries the theme without fighting the photograph.
     The curtains stay vivid and opaque (no see-through wisps): they are the subject, the sky is not. */
  --au-sky-a: oklch(0.58 0.1 252);
  --au-sky-b: oklch(0.76 0.04 var(--accent-h, var(--glass-tint-h, 310))); /* the chosen color, in the cream band */
  --au-sky-c: oklch(0.85 0.035 60);
  --au-sky-d: oklch(0.84 0.06 52); /* apricot… */
  --au-sky-e: oklch(0.76 0.075 40); /* …into the deeper orange the water meets */
  --au-water-a: oklch(0.68 0.055 42);
  --au-water-b: oklch(0.48 0.04 34);
  --au-rip-hi: oklch(1 0 0 / 0.05);
  --au-rip-lo: oklch(0.35 0.05 45 / 0.04);
  /* Curtains carry MORE chroma and alpha by day than by night. That looks backwards written down, but
     a dawn sky is already at L 0.6-0.85: a translucent light laid over it has almost no headroom left,
     and at night's values the lights wash out to a pastel rainbow. */
  --au-1: oklch(0.76 0.2 160 / 0.66);
  --au-2: oklch(0.79 0.15 190 / 0.6);
  --au-3: oklch(0.64 0.21 var(--accent-h, var(--glass-tint-h, 305)) / 0.6);
  --au-4: oklch(0.69 0.18 345 / 0.56);
  --au-glow: oklch(0.82 0.11 var(--au-h) / 0.55); /* horizon takes the chosen colour too */
  --au-blur-m: 1.15; /* the sky curtains sit slightly IN the haze by day (the mirror overrides this) */
  --au-cirrus: oklch(0.96 0.05 var(--au-h) / 0.5);
  /* daytime SUN — new to this scene. Aurora stays MOONLESS at night on purpose (a moonless sky is when
     the lights are most vivid), so the moon gate is off in both modes and only the sun ever shows. */
  --sw-sun-o: 1;
  --sw-moon-o: 0;
  --sun-size: 38vh;
  /* Sun ramp, synthwave's structure with the ACCENT standing in for its magenta: the chosen colour sits
     at the BOTTOM of the disc — the end nearest the horizon — and mixes through to a warm yellow at the
     top. Recolouring the whole disc made a green sun when the tint was green; keeping the crown warm
     keeps it reading as a sun while the tint shows exactly where a sunset is most saturated. */
  --sun-h: var(--accent-h, var(--glass-tint-h, 35));
  --sw-disc-1: oklch(0.6 0.21 var(--sun-h));
  --sw-disc-2: color-mix(in oklch, oklch(0.68 0.2 var(--sun-h)), oklch(0.74 0.18 48) 30%);
  --sw-disc-3: color-mix(in oklch, oklch(0.76 0.18 var(--sun-h)), oklch(0.82 0.17 66) 58%);
  --sw-disc-4: color-mix(in oklch, oklch(0.85 0.15 var(--sun-h)), oklch(0.89 0.15 80) 80%);
  --sw-disc-5: oklch(0.94 0.13 94);
  --au-h: var(--accent-h, var(--glass-tint-h, 35));
  --sw-disc-glow: oklch(0.8 0.17 var(--au-h) / 0.4);
  --sw-stars-o: 0;
}
.dark [data-pattern="aurora"] {
  /* NIGHT — vivid curtains over dark water, on the same photographic falloff: deep at the zenith,
     opening toward the horizon rather than staying flat. */
  --au-sky-a: oklch(0.07 0.025 268);
  --au-sky-b: oklch(0.1 0.032 276);
  --au-sky-c: oklch(0.14 0.042 288);
  --au-sky-d: oklch(0.185 0.05 225);
  --au-sky-e: oklch(0.22 0.05 205);
  --au-water-a: oklch(0.13 0.028 255);
  --au-water-b: oklch(0.05 0.018 260);
  --au-rip-hi: oklch(0.9 0.05 200 / 0.045);
  --au-rip-lo: oklch(0 0 0 / 0.15);
  --au-1: oklch(0.75 0.19 160 / 0.68);
  --au-2: oklch(0.78 0.14 190 / 0.6);
  --au-3: oklch(0.62 0.19 var(--accent-h, var(--glass-tint-h, 305)) / 0.58); /* the chosen color, in the lights */
  --au-4: oklch(0.67 0.17 345 / 0.54);
  /* Must be LIGHTER than the curtains it washes over (L ~0.75) — a glow that sits below them in
     lightness reads as a dull band ruled across the waterline, not as light. */
  --au-glow: oklch(0.84 0.1 180 / 0.28);
  --au-h: var(--accent-h, var(--glass-tint-h, 35));
  --sw-sun-o: 0; /* moonless AND sunless at night — the curtains carry the scene */
  --sw-moon-o: 0;
  --sw-stars-o: 1;
}
.au-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* No razor horizon: the sky DISSOLVES into the water across ~7%. */
  background: linear-gradient(
    to bottom,
    var(--au-sky-a) 0%,
    var(--au-sky-b) 30%,
    var(--au-sky-c) 46%,
    var(--au-sky-d) 54%,
    var(--au-sky-e, var(--au-sky-d)) 58%,
    color-mix(in oklch, var(--au-sky-e, var(--au-sky-d)), var(--au-water-a) 65%) 61%,
    var(--au-water-a) 65%
  );
}
.au-curtain {
  position: absolute;
  top: -6%;
  /* Runs PAST the waterline (the water sheet and haze are drawn over it). Stopping short of 58% left a
     1% strip of bare scene gradient reading as a dark bar straight across the horizon. */
  bottom: 41%;
  left: -20vw;
  right: -20vw;
  background-repeat: repeat-x;
  background-size: var(--au-tile) 100%;
  transform-origin: 50% 100%;
  transform: skewX(var(--au-lean, -6deg));
  opacity: calc(var(--au-lo, 1) * var(--au-dim, 1));
  filter: blur(calc(var(--au-blur, 1.2vh) * var(--au-blur-m, 1)));
  -webkit-mask-image: linear-gradient(to top, #000 10%, rgb(0 0 0 / 0.62) 45%, rgb(0 0 0 / 0.2) 80%, transparent 97%), linear-gradient(to right, transparent 3%, #000 14% 86%, transparent 97%);
  mask-image: linear-gradient(to top, #000 10%, rgb(0 0 0 / 0.62) 45%, rgb(0 0 0 / 0.2) 80%, transparent 97%), linear-gradient(to right, transparent 3%, #000 14% 86%, transparent 97%);
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
  animation:
    au-sway calc(var(--pat-dur, 8s) * var(--au-ks, 3)) ease-in-out infinite alternate,
    au-shimmer calc(var(--pat-dur, 8s) * var(--au-kp, 2)) ease-in-out infinite alternate;
  animation-delay: var(--au-delay, 0s);
  animation-play-state: var(--pat-play, running);
  will-change: var(--pat-wc, transform), var(--pat-wc, opacity);
}
@keyframes au-sway {
  from { transform: translateX(calc(-1 * var(--au-amp, 3vw))) skewX(var(--au-lean, -6deg)); }
  to   { transform: translateX(var(--au-amp, 3vw)) skewX(var(--au-sway-to, 4deg)); }
}
@keyframes au-shimmer {
  from { opacity: calc(var(--au-lo, 1) * var(--au-dim, 1)); }
  to   { opacity: calc(var(--au-lo, 1) * var(--au-dim, 1) * 0.5); }
}
.au-a {
  --au-tile: 110vh;
  --au-ks: 2.4;
  --au-kp: 1.7;
  --au-amp: 2.5vw;
  --au-lean: -7deg;
  --au-sway-to: 3deg;
  --au-blur: 1.2vh;
  --au-lo: 1;
  background-image: linear-gradient(
    to right,
    transparent 0%,
    var(--au-1) 4% 9%,
    transparent 13%,
    var(--au-2) 16% 18.5%,
    transparent 24%,
    var(--au-1) 30% 37%,
    transparent 42%,
    var(--au-3) 47% 49%,
    transparent 54%,
    var(--au-1) 59% 66%,
    transparent 71%,
    var(--au-2) 76% 78%,
    transparent 83%,
    var(--au-1) 88% 91%,
    transparent 96%
  );
}
.au-b {
  --au-tile: 150vh;
  --au-ks: 3.6;
  --au-kp: 2.5;
  --au-amp: 4vw;
  --au-lean: 9deg;
  --au-sway-to: 1deg;
  --au-blur: 2vh;
  --au-lo: 0.75;
  --au-delay: -7s;
  background-image: linear-gradient(
    to right,
    transparent 0%,
    var(--au-3) 6% 13%,
    transparent 20%,
    var(--au-4) 27% 30%,
    transparent 36%,
    var(--au-3) 45% 54%,
    transparent 61%,
    var(--au-4) 68% 70%,
    transparent 76%,
    var(--au-3) 83% 87%,
    transparent 93%
  );
}
.au-c {
  --au-tile: 70vh;
  --au-ks: 4.8;
  --au-kp: 3.1;
  --au-amp: 5.5vw;
  --au-lean: -3deg;
  --au-sway-to: 5deg;
  --au-blur: 0.7vh;
  --au-lo: 0.85;
  --au-delay: -13s;
  background-image: linear-gradient(
    to right,
    transparent 0%,
    var(--au-1) 10% 11.5%,
    transparent 16%,
    var(--au-2) 27% 28%,
    transparent 33%,
    var(--au-4) 44% 46.5%,
    transparent 52%,
    var(--au-1) 63% 64%,
    transparent 70%,
    var(--au-2) 81% 83%,
    transparent 89%
  );
}
.au-glow {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 42%;
  height: 13%;
  background: linear-gradient(to top, var(--au-glow), transparent);
}
/* The water sheet. Like the cloud sea and the sand ground, its top edge is masked to nothing so the
   sheet never draws the line the scene gradient's dissolve is there to avoid. */
.au-water-base {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 46%;
  background: linear-gradient(to bottom, var(--au-water-a) 0%, var(--au-water-b) 100%);
  /* Held fully transparent until the waterline itself: any dark water reaching ABOVE 58% shades the
     sky curtains in a strip the reflection does not yet cover, which draws a thin dark rule. */
  -webkit-mask-image: linear-gradient(to bottom, transparent 0 8%, #000 15%);
  mask-image: linear-gradient(to bottom, transparent 0 8%, #000 15%);
}
/* The reflection: an overflow-clipped water box holding a scaleY(-1) mirror of the three curtains.
   Same classes → same animations, so the reflection dances in sync with the sky and its skews mirror
   naturally (a flipped wrapper negates skewX). Pre-flip the curtains hang their bright lip on the
   mirror's BOTTOM edge; the flip lands it against the horizon. */
.au-water {
  position: absolute;
  left: 0;
  right: 0;
  top: 58%;
  bottom: 0;
  overflow: hidden;
}
.au-mirror {
  position: absolute;
  inset: 0;
  transform: scaleY(-1);
}
.au-mirror .au-curtain {
  top: -24%;
  bottom: 0;
  --au-dim: 1;
  --au-blur-m: 1.5;
  /* Same lip fade + side feathers as the sky curtains, INTERSECTED with a GENTLE wavelet ripple —
     The mirror runs at --au-dim 1 with a brighter vertical falloff to hold the reflection at full
     strength while the SKY curtains were thinned to let stars and sky through — same colours feed both,
     so the sky could not be opened up without compensating here.
     dips of only 5-7% at an uneven two-stripe rhythm, so the reflection reads as water catching the
     lights, not as scanline stripes. Deeper dips than this and the mirror turns into a CRT. Strength
     lives in --au-dim (0.8 = a strong mirror), never in the ripple contrast. */
  -webkit-mask-image: linear-gradient(to top, #000 8%, rgb(0 0 0 / 0.82) 50%, transparent 98%), linear-gradient(to right, transparent 3%, #000 14% 86%, transparent 97%), repeating-linear-gradient(to bottom, #000 0 9px, rgb(0 0 0 / 0.93) 9px 13px, #000 13px 27px, rgb(0 0 0 / 0.95) 27px 31px);
  mask-image: linear-gradient(to top, #000 8%, rgb(0 0 0 / 0.82) 50%, transparent 98%), linear-gradient(to right, transparent 3%, #000 14% 86%, transparent 97%), repeating-linear-gradient(to bottom, #000 0 9px, rgb(0 0 0 / 0.93) 9px 13px, #000 13px 27px, rgb(0 0 0 / 0.95) 27px 31px);
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
}
/* Water-surface shimmer — faint light/dark ripple bands drifting down the water, looped by translating
   exactly one stripe period (12px), so the restart is invisible. Compositor-only. */
.au-ripples {
  position: absolute;
  left: 0;
  right: 0;
  top: -24px;
  bottom: 0;
  /* Two faint stripe systems at different periods (8px + 24px) — their interference breaks the
     mechanical scanline rhythm into something water-like. Loop translates the common period (24px). */
  background-image:
    repeating-linear-gradient(to bottom, var(--au-rip-hi) 0 1px, transparent 1px 8px),
    repeating-linear-gradient(to bottom, transparent 0 14px, var(--au-rip-lo) 14px 16px, transparent 16px 24px);
  animation: au-ripple-drift calc(var(--pat-dur, 8s) * 1.5) linear infinite;
  animation-play-state: var(--pat-play, running);
  will-change: var(--pat-wc, transform);
}
@keyframes au-ripple-drift {
  from { transform: translateY(0); }
  to   { transform: translateY(24px); }
}
.au-reflect {
  position: absolute;
  left: 0;
  right: 0;
  top: 58%;
  height: 10%;
  background: linear-gradient(to bottom, var(--au-glow), transparent);
  opacity: 0.6;
}
/* SUN PATH — the glitter column a low sun throws across water. Everything else in this scene reflects
   (the curtains are literally mirrored), so a sun with no reflection was the one element that looked
   pasted on. Not a mirrored disc: on real water the reflection smears into a vertical column that
   widens with distance, so this is a tapered gradient broken up by the same ripple rhythm as the
   mirror. Gated on --sw-sun-o, so it appears and disappears with the sun itself. */
.au-sunpath {
  position: absolute;
  left: var(--sw-disc-x, 50%);
  top: 58%;
  bottom: 0;
  width: calc(var(--sun-size, 38vh) * 2.4);
  transform: translateX(-50%);
  opacity: calc(0.62 * var(--sw-sun-o, 0));
  /* Built from STACKED GLINTS, not a clipped wedge. clip-path gave dead-straight diagonals that read as
     an engineered triangle; real glitter is a scatter of broken highlights that widens with distance.
     Each ellipse is one band of glints — progressively wider going down, nudged off the centre line so
     the column never lines up perfectly, and blurred so no edge is hard. */
  background-image:
    radial-gradient(10% 6% at 50% 3%, var(--sw-disc-5) 0 45%, transparent 78%),
    radial-gradient(15% 7% at 47% 14%, var(--sw-disc-4) 0 42%, transparent 78%),
    radial-gradient(21% 7.5% at 53% 26%, var(--sw-disc-4) 0 40%, transparent 80%),
    radial-gradient(28% 8% at 46% 39%, var(--sw-disc-3) 0 38%, transparent 80%),
    radial-gradient(35% 8.5% at 54% 53%, var(--sw-disc-3) 0 36%, transparent 82%),
    radial-gradient(42% 9% at 48% 68%, var(--sw-disc-2) 0 34%, transparent 82%),
    radial-gradient(50% 9.5% at 52% 84%, var(--sw-disc-2) 0 32%, transparent 84%);
  filter: blur(7px);
  -webkit-mask-image:
    linear-gradient(to bottom, #000 0 10%, rgb(0 0 0 / 0.72) 48%, transparent 96%),
    repeating-linear-gradient(to bottom, #000 0 3px, rgb(0 0 0 / 0.35) 3px 8px, #000 8px 14px, rgb(0 0 0 / 0.5) 14px 19px);
  mask-image:
    linear-gradient(to bottom, #000 0 10%, rgb(0 0 0 / 0.72) 48%, transparent 96%),
    repeating-linear-gradient(to bottom, #000 0 3px, rgb(0 0 0 / 0.35) 3px 8px, #000 8px 14px, rgb(0 0 0 / 0.5) 14px 19px);
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
}
/* HIGH CIRRUS — thin wisps catching the low sun, day only. The upper sky went empty once the curtains
   were thinned; these fill it without competing, because they run HORIZONTAL against the curtains'
   verticals. Same tapered-ellipse trick as the cloud decks, at a much lower alpha. */
.au-cirrus {
  position: absolute;
  left: 0;
  right: 0;
  top: 4%;
  height: 34%;
  opacity: calc(0.85 * var(--sw-sun-o, 0));
  background-image:
    radial-gradient(30% 4% at 22% 18%, var(--au-cirrus) 0 12%, transparent 76%),
    radial-gradient(22% 3% at 64% 30%, var(--au-cirrus) 0 12%, transparent 74%),
    radial-gradient(34% 4% at 44% 52%, var(--au-cirrus) 0 12%, transparent 78%),
    radial-gradient(18% 3% at 82% 62%, var(--au-cirrus) 0 12%, transparent 72%),
    radial-gradient(26% 3% at 30% 78%, var(--au-cirrus) 0 12%, transparent 74%),
    radial-gradient(20% 2.5% at 70% 8%, var(--au-cirrus) 0 12%, transparent 72%),
    radial-gradient(28% 3% at 58% 88%, var(--au-cirrus) 0 12%, transparent 76%);
}
/* Horizon haze — replaces the old 1.5px .au-edge rule. Painted over both the sky curtains' lower lip
   and the top of the reflection, so the two fade into each other across the waterline instead of
   meeting at a rule. */
.au-haze {
  position: absolute;
  left: 0;
  right: 0;
  top: 48%;
  height: 24%;
  background: linear-gradient(to bottom, transparent 0%, var(--au-glow) 42%, transparent 100%);
  opacity: 0.75;
}
@media (prefers-reduced-motion: reduce) {
  .au-curtain, .au-ripples { animation: none; will-change: auto; }
}`;

// Starfield — a deep night field by night, a "morning haze" by day: pastel accent sky, the nebulae as
// bright wisps, and the glints SOFTENED but kept (identity over astronomy — hiding the stars would
// leave an empty gradient; the Tron scenes can hide theirs because the sun/grid carry the scene).
// Same mode recipe as the other scenes: --sf-* palette vars, day on [data-pattern="starfield"], night
// verbatim under .dark. The star dots themselves stay white in both modes — only their layer's opacity
// flips, via the shared --sw-stars-o gate (which the Muse constellation also rides).
const STARFIELD_STYLES = `
[data-pattern="starfield"] {
  /* DAY — morning haze */
  --sf-bg: oklch(0.82 0.05 var(--accent-h, var(--glass-tint-h)));
  --sf-nebula-1: oklch(0.92 var(--accent-c, 0.1) var(--accent-h, var(--glass-tint-h)) / 0.55);
  --sf-nebula-2: oklch(0.88 var(--accent-c, 0.09) calc(var(--accent-h, var(--glass-tint-h)) + 40) / 0.4);
  --sw-stars-o: 0.75;
}
.dark [data-pattern="starfield"] {
  /* NIGHT — the original deep field, verbatim */
  --sf-bg: oklch(0.19 0.055 var(--accent-h, var(--glass-tint-h)));
  --sf-nebula-1: oklch(0.5 var(--accent-c, 0.17) var(--accent-h, var(--glass-tint-h)) / 0.42);
  --sf-nebula-2: oklch(0.45 var(--accent-c, 0.16) calc(var(--accent-h, var(--glass-tint-h)) + 40) / 0.3);
  --sw-stars-o: 1;
}
.sf-scene {
  position: absolute;
  inset: 0;
  background-color: var(--sf-bg);
  background-image:
    radial-gradient(65% 55% at 50% 30%, var(--sf-nebula-1) 0, transparent 72%),
    radial-gradient(45% 42% at 80% 78%, var(--sf-nebula-2) 0, transparent 70%);
}
.sf-stars {
  position: absolute;
  inset: 0;
  opacity: var(--sw-stars-o, 1);
}`;

// Pac-Man chase: a seamless scrolling "corridor" per lane — Pac chomps in place (clip-path) while the dot
// stream flows left into its mouth and gets "eaten" (a STATIC mask on the clip wrapper hides dots once they
// pass the mouth, so nothing animates the mask), and a ghost bobs ahead, fleeing, flashing fright-blue.
// Dots + ghost move on compositor transforms; only Pac's tiny chomp repaints. Each ghost hue rides the theme
// COMPLEMENT (var(--hue-complement)) ± an offset. `caught: true` lanes let Pac reel the ghost in and eat it
// (fade out) mid-run; the others let it escape ahead.
// PELLET-GRID ALIGNMENT: lane top/left values below are NOMINAL — each lane snaps to the nearest pellet
// row/column center via CSS round(down, <nominal>, var(--pac-cell)) + cell/2 (pellet centers sit at
// (k + 0.5)·cell), so Pac chomps ALONG a dot line at every density and viewport, no JS. Sprites are
// --pac-sprite = min(cell, 34px): never bigger than one dot cell (dense shrinks them to the cell; sparse
// keeps them 34px inside the larger cell), Pac and ghost the same size, centered on the row.
// MODE-AWARE like the Tron scenes: the --pac-* palette carries a sunlit theme-tinted maze by day (tonal
// paper field, tonal-dark pellets/walls) and the original CRT arcade values by night, all hue-tracking
// the tint — the light/dark flip is pure CSS. Pac himself keeps his gold in both.
const PAC_LANES = [
  {
    top: "12%",
    factor: 2.3,
    hue: "var(--hue-complement)",
    frightDur: "9s",
    delay: "0s",
    caught: false,
  },
  {
    top: "30%",
    factor: 1.9,
    hue: "calc(var(--hue-complement) + 22)",
    frightDur: "7.5s",
    delay: "-3s",
    caught: true,
  },
  {
    top: "50%",
    factor: 3,
    hue: "calc(var(--hue-complement) - 24)",
    frightDur: "10s",
    delay: "-1.5s",
    caught: false,
  },
  {
    top: "70%",
    factor: 2.1,
    hue: "calc(var(--hue-complement) + 44)",
    frightDur: "8.5s",
    delay: "-5s",
    caught: true,
  },
  {
    top: "88%",
    factor: 2.6,
    hue: "calc(var(--hue-complement) - 44)",
    frightDur: "11s",
    delay: "-2.5s",
    caught: false,
  },
];

// Vertical (N–S) lanes so the chase runs both axes, not just E–W. `up: true` climbs north, else descends
// south. Columns at 26% / 74% (kept clear of every wall). Pac rotates to face its travel direction.
const PAC_VLANES = [
  {
    left: "26%",
    factor: 2.4,
    hue: "calc(var(--hue-complement) + 12)",
    frightDur: "8s",
    delay: "-2s",
    caught: true,
    up: false,
  },
  {
    left: "74%",
    factor: 2,
    hue: "calc(var(--hue-complement) - 12)",
    frightDur: "9.5s",
    delay: "-6s",
    caught: false,
    up: true,
  },
];

// Chevron "walls" that block out pellets to carve the maze. Every block sits in a GAP between the E–W
// lanes and clear of the N–S columns (23-29% / 71-77%) — sized for the WORST-CASE lane position: a
// snapped lane can shift up to ±cell/2 off its nominal %, and the sprite spans ±sprite/2 more, so each
// wall band keeps ≳2% clear of every lane's worst envelope (H ≥ 600px, all densities). No Pac runs
// through one.
const PAC_WALLS = [
  {
    top: "2%",
    left: "40%",
    w: "18%",
    h: "2.5%",
  },
  {
    top: "19.5%",
    left: "6%",
    w: "12%",
    h: "3.5%",
  },
  {
    top: "19.5%",
    left: "46%",
    w: "18%",
    h: "3.5%",
  },
  {
    top: "19.5%",
    left: "84%",
    w: "11%",
    h: "3.5%",
  },
  {
    top: "37.5%",
    left: "32%",
    w: "12%",
    h: "5%",
  },
  {
    top: "37.5%",
    left: "56%",
    w: "12%",
    h: "5%",
  },
  {
    top: "57.5%",
    left: "8%",
    w: "12%",
    h: "5%",
  },
  {
    top: "57.5%",
    left: "44%",
    w: "16%",
    h: "5%",
  },
  {
    top: "57.5%",
    left: "80%",
    w: "12%",
    h: "5%",
  },
  {
    top: "77.5%",
    left: "34%",
    w: "12%",
    h: "3.5%",
  },
  {
    top: "77.5%",
    left: "58%",
    w: "10%",
    h: "3.5%",
  },
  {
    top: "95.5%",
    left: "38%",
    w: "22%",
    h: "3%",
  },
];

const PAC_STYLES = `
[data-pattern="chase"] {
  /* DAY — a sunlit arcade: theme-tinted paper field, tonal-dark pellets and walls. The maze recolors
     with the tint; Pac and the ghosts keep their arcade identity. */
  --pac-bg: oklch(0.93 0.035 var(--glass-tint-h));
  --pac-pellet: oklch(0.45 0.09 var(--glass-tint-h));
  --pac-wall-bg: oklch(0.86 0.05 var(--glass-tint-h));
  --pac-wall-stripe: oklch(0.62 0.11 var(--glass-tint-h));
  --pac-wall-edge: oklch(0.52 0.13 var(--glass-tint-h));
}
.dark [data-pattern="chase"] {
  /* NIGHT — the original CRT palette (pellets now hue-track the tint like the walls always did). */
  --pac-bg: oklch(0.12 0.025 var(--glass-tint-h));
  --pac-pellet: oklch(0.82 0.05 var(--glass-tint-h));
  --pac-wall-bg: oklch(0.19 0.05 var(--glass-tint-h));
  --pac-wall-stripe: oklch(0.42 0.1 var(--glass-tint-h));
  --pac-wall-edge: oklch(0.5 0.12 var(--glass-tint-h));
}
.pac-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--pac-bg);
  /* Sprite box: one pellet cell, capped at the classic 34px — dense shrinks sprites to the cell,
     sparse keeps them 34px centered INSIDE the larger cell. Pac and ghost share it. */
  --pac-sprite: min(var(--pac-cell, 34px), 34px);
}
.pac-field {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle 2.6px at center, var(--pac-pellet) 0 2px, transparent 2.7px);
  background-size: var(--pac-cell, 34px) var(--pac-cell, 34px);
  opacity: 0.5;
}
.pac-wall {
  position: absolute;
  border-radius: 6px;
  background-color: var(--pac-wall-bg);
  background-image:
    linear-gradient(135deg, var(--pac-wall-stripe) 25%, transparent 25%),
    linear-gradient(225deg, var(--pac-wall-stripe) 25%, transparent 25%);
  background-size: 15px 15px;
  box-shadow: inset 0 0 0 1.5px var(--pac-wall-edge);
}
.pac-lane {
  position: absolute;
  left: 0;
  right: 0;
  height: var(--pac-sprite);
  transform: translateY(-50%);
}
/* Pac + his "wake" ride one runner that translates across; the wake is a bg-colored gradient trailing his
   mouth, erasing the pellets he passes. Only transforms animate here. */
.pac-runner {
  position: absolute;
  top: 50%;
  left: 0;
  width: var(--pac-sprite);
  height: var(--pac-sprite);
  transform: translate(-16vw, -50%);
  animation: pac-run var(--pac-dur, 9s) linear infinite;
  animation-delay: var(--pac-delay, 0s);
  will-change: var(--pat-wc, transform);
}
@keyframes pac-run {
  from { transform: translate(-16vw, -50%); }
  to   { transform: translate(112vw, -50%); }
}
.pac-wake {
  position: absolute;
  right: calc(var(--pac-sprite) / 2);
  top: 50%;
  width: 34vw;
  height: var(--pac-sprite);
  transform: translateY(-50%);
  background: linear-gradient(to left, var(--pac-bg), var(--pac-bg) 30%, transparent);
}
.pac-man {
  position: absolute;
  inset: 0;
  background: oklch(0.86 0.17 96);
  border-radius: 50%;
  animation: pac-chomp 0.34s linear infinite;
  animation-delay: var(--pac-delay, 0s);
}
@keyframes pac-chomp {
  0%, 100% { clip-path: polygon(50% 50%, 100% 22%, 100% 0, 0 0, 0 100%, 100% 100%, 100% 78%); }
  50%      { clip-path: polygon(50% 50%, 100% 47%, 100% 0, 0 0, 0 100%, 100% 100%, 100% 53%); }
}
.pac-ghost-runner {
  position: absolute;
  top: 50%;
  left: 0;
  width: var(--pac-sprite);
  height: var(--pac-sprite);
  transform: translate(4vw, -50%);
  animation: pac-flee var(--pac-dur, 9s) linear infinite;
  animation-delay: var(--pac-delay, 0s);
  will-change: var(--pat-wc, transform);
}
.pac-ghost-runner.pac-caught { animation-name: pac-caught; }
@keyframes pac-flee {
  from { transform: translate(4vw, -50%); opacity: 1; }
  to   { transform: translate(132vw, -50%); opacity: 1; }
}
@keyframes pac-caught {
  0%   { transform: translate(4vw, -50%); opacity: 0; }
  5%   { transform: translate(10vw, -50%); opacity: 1; }
  58%  { transform: translate(70vw, -50%); opacity: 1; }
  72%  { transform: translate(78vw, -50%); opacity: 1; }
  78%  { transform: translate(80vw, -50%); opacity: 0; }
  100% { transform: translate(80vw, -50%); opacity: 0; }
}
.pac-ghost {
  position: absolute;
  inset: 0;
  background-color: var(--pac-ghost, oklch(0.68 0.19 320));
  -webkit-mask: ${GHOST} center / contain no-repeat;
  mask: ${GHOST} center / contain no-repeat;
  animation: pac-bob 1.1s ease-in-out infinite, pac-fright var(--pac-fright-dur, 8s) linear infinite;
  animation-delay: var(--pac-delay, 0s), var(--pac-delay, 0s);
}
@keyframes pac-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-5px); }
}
@keyframes pac-fright {
  0%, 76%, 100% { background-color: var(--pac-ghost, oklch(0.68 0.19 320)); }
  84%, 96%      { background-color: oklch(0.6 0.2 262); }
}
/* ── Vertical (N–S) lanes ── same runner idea, turned 90°. Pac faces its travel direction (a static rotate
   reusing the chomp), the wake trails behind, the ghost flees ahead. .pac-vup flips a lane to climb north.
   Distances are in vh — the column spans the viewport height. */
.pac-vlane {
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--pac-sprite);
  transform: translateX(-50%);
}
.pac-vrunner {
  position: absolute;
  left: 50%;
  top: 0;
  width: var(--pac-sprite);
  height: var(--pac-sprite);
  transform: translate(-50%, -18vh);
  animation: pac-vrun-down var(--pac-dur, 18s) linear infinite;
  animation-delay: var(--pac-delay, 0s);
  will-change: var(--pat-wc, transform);
}
.pac-vlane.pac-vup .pac-vrunner { animation-name: pac-vrun-up; }
@keyframes pac-vrun-down { from { transform: translate(-50%, -18vh); } to { transform: translate(-50%, 118vh); } }
@keyframes pac-vrun-up   { from { transform: translate(-50%, 118vh); } to { transform: translate(-50%, -18vh); } }
.pac-vman {
  position: absolute;
  inset: 0;
  background: oklch(0.86 0.17 96);
  border-radius: 50%;
  transform: rotate(90deg);
  animation: pac-chomp 0.34s linear infinite;
  animation-delay: var(--pac-delay, 0s);
}
.pac-vlane.pac-vup .pac-vman { transform: rotate(-90deg); }
.pac-vwake {
  position: absolute;
  left: 50%;
  bottom: calc(var(--pac-sprite) / 2);
  width: var(--pac-sprite);
  height: 34vh;
  transform: translateX(-50%);
  background: linear-gradient(to top, var(--pac-bg), var(--pac-bg) 30%, transparent);
}
.pac-vlane.pac-vup .pac-vwake {
  bottom: auto;
  top: calc(var(--pac-sprite) / 2);
  background: linear-gradient(to bottom, var(--pac-bg), var(--pac-bg) 30%, transparent);
}
.pac-vghost-runner {
  position: absolute;
  left: 50%;
  top: 0;
  width: var(--pac-sprite);
  height: var(--pac-sprite);
  transform: translate(-50%, 2vh);
  animation: pac-vflee-down var(--pac-dur, 18s) linear infinite;
  animation-delay: var(--pac-delay, 0s);
  will-change: var(--pat-wc, transform);
}
.pac-vlane.pac-vup .pac-vghost-runner { animation-name: pac-vflee-up; }
.pac-vghost-runner.pac-caught { animation-name: pac-vcaught-down; }
.pac-vlane.pac-vup .pac-vghost-runner.pac-caught { animation-name: pac-vcaught-up; }
@keyframes pac-vflee-down { from { transform: translate(-50%, 2vh); opacity: 1; } to { transform: translate(-50%, 138vh); opacity: 1; } }
@keyframes pac-vflee-up   { from { transform: translate(-50%, 98vh); opacity: 1; } to { transform: translate(-50%, -42vh); opacity: 1; } }
@keyframes pac-vcaught-down {
  0%   { transform: translate(-50%, 2vh); opacity: 0; }
  5%   { transform: translate(-50%, 8vh); opacity: 1; }
  58%  { transform: translate(-50%, 66vh); opacity: 1; }
  72%  { transform: translate(-50%, 76vh); opacity: 1; }
  78%  { transform: translate(-50%, 80vh); opacity: 0; }
  100% { transform: translate(-50%, 80vh); opacity: 0; }
}
@keyframes pac-vcaught-up {
  0%   { transform: translate(-50%, 98vh); opacity: 0; }
  5%   { transform: translate(-50%, 92vh); opacity: 1; }
  58%  { transform: translate(-50%, 34vh); opacity: 1; }
  72%  { transform: translate(-50%, 24vh); opacity: 1; }
  78%  { transform: translate(-50%, 20vh); opacity: 0; }
  100% { transform: translate(-50%, 20vh); opacity: 0; }
}
.pac-vghost {
  position: absolute;
  inset: 0;
  background-color: var(--pac-ghost, oklch(0.68 0.19 320));
  -webkit-mask: ${GHOST} center / contain no-repeat;
  mask: ${GHOST} center / contain no-repeat;
  animation: pac-vsway 1.2s ease-in-out infinite, pac-fright var(--pac-fright-dur, 8s) linear infinite;
  animation-delay: var(--pac-delay, 0s), var(--pac-delay, 0s);
}
@keyframes pac-vsway {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(4px); }
}
.pac-runner, .pac-man, .pac-ghost-runner, .pac-ghost,
.pac-vrunner, .pac-vman, .pac-vghost-runner, .pac-vghost {
  animation-play-state: var(--pat-play, running);
}
@media (prefers-reduced-motion: reduce) {
  .pac-runner, .pac-man, .pac-ghost-runner, .pac-ghost,
  .pac-vrunner, .pac-vman, .pac-vghost-runner, .pac-vghost { animation: none; will-change: auto; }
}`;

function styleFor(style: PatternStyle, density: PatternDensity): CSSProperties {
  const bg = "var(--background)";
  // Ink follows the accent (fallback: tint hue) so every geometric pattern recolors with the accent knob.
  const ink = "oklch(0.6 0.16 var(--accent-h, var(--glass-tint-h)) / 0.5)";
  // Density scales the tile size (dots/grid use the airier TILE_SCALE ladder; chase has its own cells).
  const d = TILE_SCALE[density];
  const px = (n: number) => `${Math.round(n * d)}px`;
  const sq = (n: number) => `${px(n)} ${px(n)}`;

  switch (style) {
    case "grid":
      return {
        backgroundColor: bg,
        backgroundImage: `linear-gradient(${ink} 1px, transparent 1px), linear-gradient(90deg, ${ink} 1px, transparent 1px)`,
        backgroundSize: sq(44),
      };
    case "dots":
      return {
        backgroundColor: bg,
        backgroundImage: `radial-gradient(${ink} 1.6px, transparent 1.8px)`,
        backgroundSize: sq(24),
      };
    case "mesh": {
      // Mesh blobs center on the accent (hue + vividness) when it's on, else the tint's content hue —
      // rotated 0/90/180/270 for a full spread.
      const mh = "var(--accent-h, var(--glass-tint-h))";
      const mc = "var(--accent-c, 0.16)";
      return {
        backgroundColor: bg,
        backgroundImage: `radial-gradient(40% 40% at 15% 20%, oklch(0.65 ${mc} ${mh} / 0.5) 0, transparent 100%), radial-gradient(40% 40% at 85% 15%, oklch(0.65 ${mc} calc(${mh} + 90) / 0.5) 0, transparent 100%), radial-gradient(45% 45% at 22% 85%, oklch(0.65 ${mc} calc(${mh} + 180) / 0.5) 0, transparent 100%), radial-gradient(40% 40% at 82% 82%, oklch(0.65 ${mc} calc(${mh} + 270) / 0.5) 0, transparent 100%)`,
      };
    }
    case "starfield":
      // Rendered by its own branch in PatternBackground (day/night palettes live in STARFIELD_STYLES'
      // [data-pattern] var blocks); kept exhaustive here.
      return {
        backgroundColor: "oklch(0.19 0.055 var(--accent-h, var(--glass-tint-h)))",
      };
    case "synthwave":
      // Rendered by its own multi-layer branch in PatternBackground (day/night palettes live in
      // SYNTHWAVE_STYLES' [data-pattern] var blocks); keeps the switch exhaustive.
      return {
        backgroundColor: "oklch(0.09 0.03 282)",
      };
    case "moonrise":
      // Rendered alongside synthwave in PatternBackground's shared branch (palettes in SYNTHWAVE_STYLES);
      // kept exhaustive here.
      return {
        backgroundColor: "oklch(0.07 0.03 270)",
      };
    case "clouds":
      // Rendered by its own layered branch in PatternBackground (palettes in CLOUDS_STYLES); kept exhaustive here.
      return {
        backgroundColor: "oklch(0.1 0.04 264)",
      };
    case "dune":
      // Rendered by its own layered branch in PatternBackground (palettes in DUNE_STYLES); kept exhaustive here.
      return {
        backgroundColor: "oklch(0.09 0.04 270)",
      };
    case "aurora":
      // Rendered by its own layered branch in PatternBackground (palettes in AURORA_STYLES); kept exhaustive here.
      return {
        backgroundColor: "oklch(0.08 0.02 268)",
      };
    case "chase":
      // Pac-Man chase is rendered by its own branch in PatternBackground; kept exhaustive here.
      return {
        backgroundColor: "oklch(0.12 0.025 var(--glass-tint-h))",
      };
  }
}

/** A full-viewport, pure-CSS pattern wallpaper. Recolors with the live tint; sprites tile a field. */
export function PatternBackground({
  style = "dots",
  density = "medium",
  speed = 8,
  disc = "right",
  sand = "breeze",
}: {
  style?: PatternStyle;
  density?: PatternDensity;
  speed?: number;
  disc?: "left" | "center" | "right";
  /** Blowing-sand intensity for the dune scene — drives the wind veils and the airborne specks. */
  sand?: "still" | "breeze" | "storm";
}) {
  // Animated patterns share one pace: --pat-dur (loop seconds) + --pat-play (paused when speed is 0/static).
  const patDur = speed > 0 ? `${speed}s` : "8s";
  const patPlay = speed > 0 ? "running" : "paused";
  // Static means nothing moves, so stop asking the compositor to keep a layer ready for it —
  // `will-change` on a paused animation is a promoted layer doing no work. Reduced motion gets
  // the same release from each scene's prefers-reduced-motion block.
  const patWc = speed > 0 ? "transform" : "auto";
  // Sun/moon horizontal placement for the horizon scenes (off-center clears centered page content).
  const discX = {
    left: "26%",
    center: "50%",
    right: "74%",
  }[disc];
  if (style === "chase") {
    return (
      <div
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none transition-[background-color] duration-500"
        style={
          {
            "--pat-dur": patDur,
            "--pat-play": patPlay,
            "--pat-wc": patWc,
            "--pac-cell": `${Math.round(34 * DENSITY_SCALE[density])}px`,
          } as CSSProperties
        }
        data-pattern="chase"
      >
        <style>{PAC_STYLES}</style>
        <div className="pac-scene">
          <div className="pac-field" />
          {PAC_WALLS.map((w) => (
            <div
              key={`${w.top}-${w.left}`}
              className="pac-wall"
              style={{
                top: w.top,
                left: w.left,
                width: w.w,
                height: w.h,
              }}
            />
          ))}
          {PAC_LANES.map((lane) => (
            <div
              key={lane.top}
              className="pac-lane"
              style={
                {
                  // Snap the nominal % to the nearest pellet-row CENTER below it (rows sit at (k+0.5)·cell),
                  // so Pac chomps along an actual dot line at every density and viewport.
                  top: `calc(round(down, ${lane.top}, var(--pac-cell, 34px)) + var(--pac-cell, 34px) / 2)`,
                  "--pac-dur": `calc(var(--pat-dur, 8s) * ${lane.factor})`,
                  "--pac-ghost": `oklch(0.68 0.19 ${lane.hue})`,
                  "--pac-fright-dur": lane.frightDur,
                  "--pac-delay": lane.delay,
                } as CSSProperties
              }
            >
              <div className={lane.caught ? "pac-ghost-runner pac-caught" : "pac-ghost-runner"}>
                <div className="pac-ghost" />
              </div>
              <div className="pac-runner">
                <div className="pac-wake" />
                <div className="pac-man" />
              </div>
            </div>
          ))}
          {PAC_VLANES.map((lane) => (
            <div
              key={lane.left}
              className={lane.up ? "pac-vlane pac-vup" : "pac-vlane"}
              style={
                {
                  // Same pellet-grid snap as the E–W lanes, along the x axis (columns at (k+0.5)·cell).
                  left: `calc(round(down, ${lane.left}, var(--pac-cell, 34px)) + var(--pac-cell, 34px) / 2)`,
                  "--pac-dur": `calc(var(--pat-dur, 8s) * ${lane.factor})`,
                  "--pac-ghost": `oklch(0.68 0.19 ${lane.hue})`,
                  "--pac-fright-dur": lane.frightDur,
                  "--pac-delay": lane.delay,
                } as CSSProperties
              }
            >
              <div className={lane.caught ? "pac-vghost-runner pac-caught" : "pac-vghost-runner"}>
                <div className="pac-vghost" />
              </div>
              <div className="pac-vrunner">
                <div className="pac-vwake" />
                <div className="pac-vman" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (style === "synthwave" || style === "moonrise") {
    const stars = STAR_GRADIENTS.slice(0, STAR_COUNT[density]).join(", ");
    const moon = style === "moonrise";
    return (
      <div
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none transition-[background-color] duration-500"
        style={
          {
            // Scene colors (incl. --sw-line) live in SYNTHWAVE_STYLES' [data-pattern] palette blocks so the
            // .dark day/night switch can override them — an inline declaration would beat every stylesheet rule.
            // Sun/moon horizontal placement (left/center/right).
            "--sw-disc-x": discX,
            // Grid scroll pace — one cell every --pat-dur seconds (shared pace across animated patterns).
            "--pat-dur": patDur,
            "--pat-play": patPlay,
            "--pat-wc": patWc,
          } as CSSProperties
        }
        data-pattern={style}
      >
        <style>{SKY_STYLES}</style>
        <style>{SYNTHWAVE_STYLES}</style>
        <div className="sw-scene">
          <div
            className="sw-stars"
            style={{
              backgroundImage: stars,
            }}
          />
          <MuseConstellation />
          <div className={moon ? "scene-moon" : "sw-sun"} />
          <div className="sw-ground" />
          <div className="sw-glow" />
          <div className="sw-floor sw-floor-rungs">
            <div className="sw-grid sw-grid-rungs" />
          </div>
          <div className="sw-floor sw-floor-rails">
            <div className="sw-grid sw-grid-rails" />
          </div>
        </div>
      </div>
    );
  }
  if (style === "clouds") {
    const stars = STAR_GRADIENTS.slice(0, STAR_COUNT[density]).join(", ");
    return (
      <div
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none transition-[background-color] duration-500"
        style={
          {
            // Moon placement (left/center/right) + the shared animated-pattern pace; scene colors live in
            // CLOUDS_STYLES' [data-pattern] palette blocks so the .dark day/night switch can override them.
            "--sw-disc-x": discX,
            "--pat-dur": patDur,
            "--pat-play": patPlay,
            "--pat-wc": patWc,
          } as CSSProperties
        }
        data-pattern="clouds"
      >
        <style>{SKY_STYLES}</style>
        <style>{CLOUDS_STYLES}</style>
        <div className="cl-scene">
          <div
            className="sw-stars"
            style={{
              backgroundImage: stars,
            }}
          />
          <MuseConstellation />
          <div className="sw-sun" />
          <div className="scene-moon" />
          <div className="cl-sea" />
          <div className="cl-deck cl-deck-far" />
          <div className="cl-deck cl-deck-mid" />
          <div className="cl-deck cl-deck-near" />
          <div className="cl-haze" />
        </div>
      </div>
    );
  }
  if (style === "dune") {
    const stars = STAR_GRADIENTS.slice(0, STAR_COUNT[density]).join(", ");
    // Dune faces light toward the disc: the diagonal face gradients read --du-light, so moving the
    // moon left/center/right relights every dune (and the ground sheet) to match.
    const duneLight = {
      left: "160deg",
      center: "180deg",
      right: "200deg",
    }[disc];
    // Sand level → veil opacity + speck multiplier. "still" zeroes BOTH (a calm desert has no airborne
    // sand at all); it is not the same as the speed control's "static", which only pauses motion.
    const [sandVeil, sandGrain] = {
      still: [
        "0",
        "0",
      ],
      breeze: [
        "0.55",
        "1",
      ],
      storm: [
        "1",
        "1.8",
      ],
    }[sand];
    return (
      <div
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none transition-[background-color] duration-500"
        style={
          {
            "--sw-disc-x": discX,
            "--du-light": duneLight,
            "--du-sand-o": sandVeil,
            "--du-grain-o": sandGrain,
            "--pat-dur": patDur,
            "--pat-play": patPlay,
            "--pat-wc": patWc,
          } as CSSProperties
        }
        data-pattern="dune"
      >
        <style>{SKY_STYLES}</style>
        <style>{DUNE_STYLES}</style>
        <div className="du-scene">
          <div
            className="sw-stars"
            style={{
              backgroundImage: stars,
            }}
          />
          <MuseConstellation />
          <div className="sw-sun" />
          <div className="scene-moon" />
          <div className="du-ground" />
          <div className="du-dune du-pos-aa du-fill-aa" />
          <div className="du-dune du-pos-a du-sh" />
          <div className="du-dune du-pos-a du-rim" />
          <div className="du-dune du-pos-a du-fill-a" />
          <div className="du-dune du-pos-b du-sh" />
          <div className="du-dune du-pos-b du-rim" />
          <div className="du-dune du-pos-b du-fill-b" />
          <div className="du-dune du-pos-c du-sh" />
          <div className="du-dune du-pos-c du-rim" />
          <div className="du-dune du-pos-c du-fill-c" />
          <div className="du-dune du-pos-d du-sh" />
          <div className="du-dune du-pos-d du-rim" />
          <div className="du-dune du-pos-d du-fill-d" />
          <div className="du-dune du-pos-e du-sh" />
          <div className="du-dune du-pos-e du-rim" />
          <div className="du-dune du-pos-e du-fill-e" />
          {/* Wind veils ride ABOVE the ridges and BELOW the haze — sand in the air, not on the ground. */}
          <div className="du-veils">
            <div className="du-veil du-veil-a" />
            <div className="du-veil du-veil-b" />
          </div>
          {/* Haze LAST-but-one: it must wash over the far ridges, not sit behind them. */}
          <div className="du-glow" />
          <div className="du-grains du-grains-a">
            <div className="du-grain-tile" />
          </div>
          <div className="du-grains du-grains-b">
            <div className="du-grain-tile" />
          </div>
        </div>
      </div>
    );
  }
  if (style === "aurora") {
    const stars = STAR_GRADIENTS.slice(0, STAR_COUNT[density]).join(", ");
    return (
      <div
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none transition-[background-color] duration-500"
        style={
          {
            // Sun placement (day only — the scene is moonless at night) plus the shared pace vars.
            "--sw-disc-x": discX,
            "--pat-dur": patDur,
            "--pat-play": patPlay,
            "--pat-wc": patWc,
          } as CSSProperties
        }
        data-pattern="aurora"
      >
        <style>{SKY_STYLES}</style>
        <style>{AURORA_STYLES}</style>
        <div className="au-scene">
          <div
            className="sw-stars"
            style={{
              backgroundImage: stars,
            }}
          />
          <MuseConstellation />
          <div className="au-cirrus" />
          <div className="au-curtain au-b" />
          <div className="au-curtain au-a" />
          <div className="au-curtain au-c" />
          {/* AFTER the curtains: behind them, three layers of translucent light wash the disc green and
              it stops reading as a sun. Still before the glow and water, so the haze and waterline
              cover it the way they cover everything else at the horizon. */}
          <div className="sw-sun" />
          <div className="au-glow" />
          <div className="au-water-base" />
          <div className="au-water">
            <div className="au-mirror">
              <div className="au-curtain au-b" />
              <div className="au-curtain au-a" />
              <div className="au-curtain au-c" />
            </div>
            <div className="au-ripples" />
          </div>
          <div className="au-sunpath" />
          <div className="au-reflect" />
          <div className="au-haze" />
        </div>
      </div>
    );
  }
  if (style === "starfield") {
    // Scene colors live in STARFIELD_STYLES' palette blocks (an inline background would beat the .dark
    // day/night flip); only the star GLINTS — white in both modes — are painted inline, on their own
    // layer so the palette's --sw-stars-o can dim them by day.
    const stars = STAR_GRADIENTS.slice(0, STAR_COUNT[density]).join(", ");
    return (
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none transition-[background-color] duration-500" data-pattern="starfield">
        <style>{STARFIELD_STYLES}</style>
        <div className="sf-scene" />
        <div
          className="sf-stars"
          style={{
            backgroundImage: stars,
          }}
        />
        <MuseConstellation />
      </div>
    );
  }
  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none transition-[background-color] duration-500"
      style={styleFor(style, density)}
      data-pattern={style}
    />
  );
}
