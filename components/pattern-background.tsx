import type { CSSProperties } from "react";

/**
 * Pure-CSS pattern backgrounds — tileable wallpapers built entirely from `background-image` layers
 * (multiple backgrounds + gradients) and SVG `mask-image` silhouettes, all colored off the live
 * OKLCH tint tokens so they recolor with the theme. No canvas, no rAF loop: each static style is a
 * single GPU paint; the animated scenes (synthwave / moonrise grid scroll, the Pac-Man chase) move
 * on compositor-only transforms. Sibling of GradientBackground (CSS gradient) and CanvasBackground
 * (JS canvas).
 */

export type PatternStyle = "dots" | "grid" | "mesh" | "starfield" | "synthwave" | "moonrise" | "chase";

export const PATTERN_STYLES: PatternStyle[] = [
  "dots",
  "grid",
  "mesh",
  "starfield",
  "synthwave",
  "moonrise",
  "chase",
];

/** Patterns that animate (CSS keyframes) — gates the speed control and shares the --pat-dur/--pat-play pace. */
export const ANIMATED_PATTERNS = new Set<PatternStyle>([
  "synthwave",
  "moonrise",
  "chase",
]);

/** Horizon scenes with a sun/moon disc that can be placed left / center / right. */
export const DISC_PATTERNS = new Set<PatternStyle>([
  "synthwave",
  "moonrise",
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
/** Tile-size scale per density — sparse = larger cells (fewer per screen), dense = smaller (more). */
const DENSITY_SCALE: Record<PatternDensity, number> = {
  sparse: 1.4,
  medium: 1,
  dense: 0.68,
};

// SVG silhouettes as mask sources. White fill + transparent ground works whether the browser samples
// the mask by alpha or luminance. Wrapped in url(...) after encoding so it's a valid CSS value.
const svgMask = (body: string, viewBox = "0 0 100 100") =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}' fill='#fff'>${body}</svg>`)}")`;

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
// constellation in every star field (starfield / synthwave / moonrise). The dots are anchor points sampled
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
  /* Rides the star gate: hidden with the stars in the Tron scenes' day mode; starfield (no gate) keeps 0.9. */
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
.sw-stars {
  position: absolute;
  inset: 0 0 42% 0;
  background-repeat: no-repeat;
  opacity: var(--sw-stars-o, 1);
  -webkit-mask-image: linear-gradient(to bottom, #000 50%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 50%, transparent 100%);
}
.sw-sun {
  position: absolute;
  left: var(--sw-disc-x, 50%);
  bottom: 42%;
  width: 46vh;
  height: 46vh;
  transform: translate(-50%, 33%);
  border-radius: 50%;
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
    repeating-linear-gradient(to bottom, #000 0 0.85vh, transparent 0.85vh 1.7vh);
  mask-image:
    linear-gradient(to bottom, #000 0 42%, transparent 42%),
    repeating-linear-gradient(to bottom, #000 0 0.85vh, transparent 0.85vh 1.7vh);
  filter: drop-shadow(0 0 5vh var(--sw-disc-glow));
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
  will-change: transform;
}
.sw-grid-rails {
  background-image: linear-gradient(to right, var(--sw-line) 0 2px, transparent 2px);
}
@keyframes sw-grid-scroll {
  from { transform: rotateX(78deg) translateY(0); }
  to   { transform: rotateX(78deg) translateY(4vmin); }
}
@media (prefers-reduced-motion: reduce) {
  .sw-grid-rungs { animation: none; }
}

/* Moonrise variant — a purple-blue moon over a midnight sky, no scanlines. Shares every structural
   class; the [data-pattern="moonrise"] palette blocks above swap the colors — no per-property reskins. */
.sw-moon {
  position: absolute;
  left: var(--sw-disc-x, 50%);
  bottom: 42%;
  width: 40vh;
  height: 40vh;
  transform: translate(-50%, 30%);
  border-radius: 50%;
  background:
    radial-gradient(34% 30% at 63% 30%, oklch(var(--sw-maria) / 0.55) 0, transparent 62%),
    radial-gradient(20% 18% at 38% 56%, oklch(var(--sw-maria) / 0.5) 0, transparent 62%),
    radial-gradient(13% 12% at 56% 72%, oklch(var(--sw-maria) / 0.45) 0, transparent 62%),
    radial-gradient(circle at 42% 38%, var(--sw-moon-1) 0%, var(--sw-moon-2) 52%, var(--sw-moon-3) 100%);
  filter: drop-shadow(0 0 5vh var(--sw-disc-glow));
}`;

// Pac-Man chase: a seamless scrolling "corridor" per lane — Pac chomps in place (clip-path) while the dot
// stream flows left into its mouth and gets "eaten" (a STATIC mask on the clip wrapper hides dots once they
// pass the mouth, so nothing animates the mask), and a ghost bobs ahead, fleeing, flashing fright-blue.
// Dots + ghost move on compositor transforms; only Pac's tiny chomp repaints. Three lanes, desynced, fill
// the screen. Iconic arcade palette (gold Pac, classic ghost hues, pale pellets) over a tint-darkened field.
// Horizontal (E–W) lanes at 12/30/50/70/88% — positioned so the walls sit in the gaps BETWEEN them, never
// on a lane (Pac was eating through walls). Each ghost hue rides the theme COMPLEMENT (var(--hue-complement))
// ± an offset. `caught: true` lanes let Pac reel the ghost in and eat it (fade out) mid-run; the others let
// it escape ahead. Durations bumped way up — the old 7–11s zipped; 15–24s reads as a stroll.
// NIGHT SCENE BY DESIGN: unlike synthwave/moonrise, chase does NOT flip with the mode toggle —
// the CRT-arcade identity (gold Pac, pale pellets, fright-blue) assumes a dark field; a light maze would
// need the whole sprite palette re-picked. Revisit only if users ask.
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

// Chevron "walls" that block out pellets to carve the maze. Every block sits in a GAP between the E–W lane
// bands (10-14/28-32/48-52/68-72/86-90%) and clear of the N–S columns (23-29% / 71-77%), so no Pac runs
// through one.
const PAC_WALLS = [
  {
    top: "3%",
    left: "40%",
    w: "18%",
    h: "5%",
  },
  {
    top: "18%",
    left: "6%",
    w: "12%",
    h: "7%",
  },
  {
    top: "18%",
    left: "46%",
    w: "18%",
    h: "7%",
  },
  {
    top: "18%",
    left: "84%",
    w: "11%",
    h: "7%",
  },
  {
    top: "36%",
    left: "32%",
    w: "12%",
    h: "8%",
  },
  {
    top: "36%",
    left: "56%",
    w: "12%",
    h: "8%",
  },
  {
    top: "56%",
    left: "8%",
    w: "12%",
    h: "8%",
  },
  {
    top: "56%",
    left: "44%",
    w: "16%",
    h: "8%",
  },
  {
    top: "56%",
    left: "80%",
    w: "12%",
    h: "8%",
  },
  {
    top: "76%",
    left: "34%",
    w: "12%",
    h: "7%",
  },
  {
    top: "76%",
    left: "58%",
    w: "10%",
    h: "7%",
  },
  {
    top: "93%",
    left: "38%",
    w: "22%",
    h: "5%",
  },
];

const PAC_STYLES = `
.pac-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  --pac-bg: oklch(0.12 0.025 var(--glass-tint-h));
  background: var(--pac-bg);
}
.pac-field {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle 2.6px at center, oklch(0.82 0.05 85) 0 2px, transparent 2.7px);
  background-size: var(--pac-cell, 34px) var(--pac-cell, 34px);
  opacity: 0.5;
}
.pac-wall {
  position: absolute;
  border-radius: 6px;
  background-color: oklch(0.19 0.05 var(--glass-tint-h));
  background-image:
    linear-gradient(135deg, oklch(0.42 0.1 var(--glass-tint-h)) 25%, transparent 25%),
    linear-gradient(225deg, oklch(0.42 0.1 var(--glass-tint-h)) 25%, transparent 25%);
  background-size: 15px 15px;
  box-shadow: inset 0 0 0 1.5px oklch(0.5 0.12 var(--glass-tint-h));
}
.pac-lane {
  position: absolute;
  left: 0;
  right: 0;
  height: 40px;
  transform: translateY(-50%);
}
/* Pac + his "wake" ride one runner that translates across; the wake is a bg-colored gradient trailing his
   mouth, erasing the pellets he passes. Only transforms animate here. */
.pac-runner {
  position: absolute;
  top: 50%;
  left: 0;
  width: 38px;
  height: 38px;
  transform: translate(-16vw, -50%);
  animation: pac-run var(--pac-dur, 9s) linear infinite;
  animation-delay: var(--pac-delay, 0s);
  will-change: transform;
}
@keyframes pac-run {
  from { transform: translate(-16vw, -50%); }
  to   { transform: translate(112vw, -50%); }
}
.pac-wake {
  position: absolute;
  right: 19px;
  top: 50%;
  width: 34vw;
  height: 30px;
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
  width: 34px;
  height: 38px;
  transform: translate(4vw, -50%);
  animation: pac-flee var(--pac-dur, 9s) linear infinite;
  animation-delay: var(--pac-delay, 0s);
  will-change: transform;
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
  width: 38px;
  transform: translateX(-50%);
}
.pac-vrunner {
  position: absolute;
  left: 50%;
  top: 0;
  width: 38px;
  height: 38px;
  transform: translate(-50%, -18vh);
  animation: pac-vrun-down var(--pac-dur, 18s) linear infinite;
  animation-delay: var(--pac-delay, 0s);
  will-change: transform;
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
  bottom: 19px;
  width: 30px;
  height: 34vh;
  transform: translateX(-50%);
  background: linear-gradient(to top, var(--pac-bg), var(--pac-bg) 30%, transparent);
}
.pac-vlane.pac-vup .pac-vwake {
  bottom: auto;
  top: 19px;
  background: linear-gradient(to bottom, var(--pac-bg), var(--pac-bg) 30%, transparent);
}
.pac-vghost-runner {
  position: absolute;
  left: 50%;
  top: 0;
  width: 34px;
  height: 38px;
  transform: translate(-50%, 2vh);
  animation: pac-vflee-down var(--pac-dur, 18s) linear infinite;
  animation-delay: var(--pac-delay, 0s);
  will-change: transform;
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
  .pac-vrunner, .pac-vman, .pac-vghost-runner, .pac-vghost { animation: none; }
}`;

function styleFor(style: PatternStyle, density: PatternDensity): CSSProperties {
  const bg = "var(--background)";
  // Ink follows the accent (fallback: tint hue) so every geometric pattern recolors with the accent knob.
  const ink = "oklch(0.6 0.16 var(--accent-h, var(--glass-tint-h)) / 0.5)";
  // Density scales the tile size for every pattern.
  const d = DENSITY_SCALE[density];
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
    case "starfield": {
      // Nebula "patch" + deep backdrop follow the accent (hue + vividness) when it's on, else the tint.
      // Density picks how many star points render — sparse / medium / dense.
      const stars = STAR_GRADIENTS.slice(0, STAR_COUNT[density]).join(", ");
      return {
        backgroundColor: "oklch(0.19 0.055 var(--accent-h, var(--glass-tint-h)))",
        backgroundImage: `radial-gradient(65% 55% at 50% 30%, oklch(0.5 var(--accent-c, 0.17) var(--accent-h, var(--glass-tint-h)) / 0.42) 0, transparent 72%), radial-gradient(45% 42% at 80% 78%, oklch(0.45 var(--accent-c, 0.16) calc(var(--accent-h, var(--glass-tint-h)) + 40) / 0.3) 0, transparent 70%), ${stars}`,
      };
    }
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
}: {
  style?: PatternStyle;
  density?: PatternDensity;
  speed?: number;
  disc?: "left" | "center" | "right";
}) {
  // Animated patterns share one pace: --pat-dur (loop seconds) + --pat-play (paused when speed is 0/static).
  const patDur = speed > 0 ? `${speed}s` : "8s";
  const patPlay = speed > 0 ? "running" : "paused";
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
                  top: lane.top,
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
                  left: lane.left,
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
          } as CSSProperties
        }
        data-pattern={style}
      >
        <style>{SYNTHWAVE_STYLES}</style>
        <div className="sw-scene">
          <div
            className="sw-stars"
            style={{
              backgroundImage: stars,
            }}
          />
          <MuseConstellation />
          <div className={moon ? "sw-moon" : "sw-sun"} />
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
  if (style === "starfield") {
    // Same star background as styleFor, but as a container so the easter-egg constellation can overlay it.
    return (
      <div
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none transition-[background-color] duration-500"
        style={styleFor(style, density)}
        data-pattern="starfield"
      >
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
