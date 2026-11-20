import { type CSSProperties, Fragment, useEffect, useId, useRef, useState } from "react";

/**
 * Pure-CSS pattern backgrounds — tileable wallpapers built entirely from `background-image` layers
 * (multiple backgrounds + gradients) and SVG `mask-image` silhouettes, all colored off the live
 * OKLCH tint tokens so they recolor with the theme. No canvas, no rAF loop: each static style is a
 * single GPU paint; the animated scenes (synthwave / moonrise grid scroll, the clouds / dune / aurora /
 * forest drifts, the Pac-Man chase) move on compositor-only transforms. The cost to watch is LAYERS:
 * `.scene-group` keeps what a scene draws in front of its disc to one, and a moving part draws its blur
 * and masks on a still child (`.au-paint`), never on the box that moves. Sibling of GradientBackground
 * (CSS gradient) and CanvasBackground (JS canvas).
 */

export type PatternStyle =
  | "dots"
  | "grid"
  | "mesh"
  | "starfield"
  | "synthwave"
  | "moonrise"
  | "clouds"
  | "dune"
  | "aurora"
  | "forest"
  | "peaks"
  | "meadow"
  | "shipit"
  | "chase";

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
  "forest",
  "peaks",
  "meadow",
  "shipit",
  "chase",
];

/**
 * The two ways a scene stops: reduced motion, and Speed 0.
 *
 * Both REMOVE the animation rather than pausing it. `animation-play-state: paused`
 * looks like it should be free — the transform never advances — but a paused
 * animation still leaves the element in an animating state, and WebKit keeps
 * re-rendering its layer. On `.au-curtain` that layer carried a `filter: blur()`
 * and a two-layer `mask-composite` (its `.au-paint` child draws them now), six of
 * them at full-viewport size, so "paused" was measurably NOT free (AMXSF-559).
 * `animation: none` also drops `will-change`, releasing the promoted layer —
 * `will-change` on a stopped animation is a promoted layer doing no work.
 *
 * Emitted from one helper so the conditions cannot drift apart: a scene that
 * respects reduced motion but not Speed 0 was exactly the bug.
 *
 * Reduced motion has two sources. A consumer that sets `data-motion` on :root
 * (a motion dial) owns the choice: `:root[data-motion="no"]` stops the scene
 * whatever the OS says, and any other value lets it run. Without the attribute,
 * the OS query decides, exactly as before.
 */
export function stopRules(...selectors: string[]): string {
  const stop = "{ animation: none; will-change: auto; }";
  const under = (scope: string) => selectors.map((s) => `${scope} ${s}`).join(", ");
  return `@media (prefers-reduced-motion: reduce) { ${under(":root:not([data-motion])")} ${stop} }
${under(':root[data-motion="no"]')} ${stop}
${under("[data-pat-static]")} ${stop}`;
}

/** Patterns that animate (CSS keyframes) — gates the speed control and shares the --pat-dur pace. */
export const ANIMATED_PATTERNS = new Set<PatternStyle>([
  "synthwave",
  "moonrise",
  "clouds",
  "dune",
  "aurora",
  "forest",
  "peaks",
  "meadow",
  "shipit",
  "chase",
]);

/** Horizon scenes with a sun/moon disc that can be placed left / center / right. */
export const DISC_PATTERNS = new Set<PatternStyle>([
  "synthwave",
  "moonrise",
  "clouds",
  "dune",
  "aurora",
  "forest",
  "peaks",
  "meadow",
  "shipit",
]);

/** Scenes with a blowing-sand control (still / breeze / storm). */
export const SAND_PATTERNS = new Set<PatternStyle>([
  "dune",
]);

/** The ships shipit can sail, in the order the switcher cycles them. */
export type ShipKind = "liner" | "clipper" | "freighter" | "cruise";
export const SHIP_KINDS: ShipKind[] = [
  "liner",
  "clipper",
  "freighter",
  "cruise",
];
/** Scenes with a ship control. */
export const SHIP_PATTERNS = new Set<PatternStyle>([
  "shipit",
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
export const TILE_SCALE: Record<PatternDensity, number> = {
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

// The ghost silhouette — used by the chase scene's fleeing ghosts. Solid: the eyes are painted over it
// (.pac-ghost::after). Cut out of it, they showed whatever lay behind, so a pellet read as a stray pupil.
const GHOST = svgMask("<path d='M50 6 A38 38 0 0 0 12 44 V94 L24 84 L36 94 L48 84 L60 94 L72 84 L84 94 V44 A38 38 0 0 0 50 6 Z'/>");

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
  /* --star-core is the fraction of the dot that stays SOLID before the falloff starts. Default 0%
     reproduces the original `#fff, transparent` exactly (white at 0, transparent at 100% — a pure
     linear falloff), so every scene that does not set it is untouched.
     It exists because "full opacity" was not the same as "not faded": a linear falloff averages only
     alpha 0.333 across the dot's area, so on a light sky the stars delivered ~+7 L rather than the
     +22 their peak suggests. On a near-black night sky that is invisible as a problem — any white
     reads — which is why it only ever showed up by day. */
  return `radial-gradient(${r} ${r} at ${x}% ${y}%, #fff 0 var(--star-core, 0%), transparent)`;
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
  /* Rides the star gate: hidden with the stars in the Tron scenes' day mode (they set it to 0). In
     starfield the gate is 1 in BOTH modes now, so this sits at a flat 0.9 — the constellation is an
     easter egg and reads a touch under the field it hides in, rather than being mode-dependent. */
  opacity: calc(0.9 * var(--sw-stars-o, 1));
}
.star-muse circle {
  fill: oklch(0.96 0.04 var(--muse-h));
}`;

/**
 * A scene stylesheet, ONE copy per document however many scenes are mounted. A plain `<style>` was injected
 * again by every PatternBackground, so a picker of eleven swatches beside the wallpaper carried some thirty
 * copies for the browser to parse and match. With `href` + `precedence`, React 19 hoists the sheet into
 * <head> and dedupes it by `href`, on the server as on the client. Every sheet shares one precedence, so they
 * keep the order they are first rendered in: SKY_STYLES ahead of the scene sheet that builds on it.
 */
function SceneStyles({ name, css }: { name: string; css: string }) {
  return (
    <style href={`sistine-pattern-${name}`} precedence="sistine-pattern">
      {css}
    </style>
  );
}

/**
 * The synthwave / moonrise floor grid, PROJECTED: the plane .sw-floor / .sw-grid draw in 3D, worked out in 2D.
 * The CSS tilts a plane back by rotateX(78deg) about its top edge, which sits 4vmin above the floor's top,
 * under a 75vh perspective from the floor's top centre. Every length is reproduced: the plane runs from
 * -60% to 160% of the floor's width and 66vh deep, its cell is round(4vmin, 1px) and its lines are 2px. A
 * point `y` down the plane and `x` across it lands at
 *   k = d / (d - y·sin θ),   X = W/2 + (x - W/2)·k,   Y = (y·cos θ - 4vmin)·k
 * in the floor's own pixels (origin top-left), which is the CSS perspective projection. Lines on a plane
 * stay straight, so each rung is a band and each rail a quadrilateral, exactly. Returns one SVG path.
 */
export function floorGridPath(kind: "rungs" | "rails", w: number, h: number, vw: number, vh: number, roundCell = true): string {
  const d = 0.75 * vh;
  const theta = (78 * Math.PI) / 180;
  const [sin, cos] = [
    Math.sin(theta),
    Math.cos(theta),
  ];
  const lift = (4 * Math.min(vw, vh)) / 100; // the plane's top edge, 4vmin above the floor's
  const cell = roundCell ? Math.round(lift) : lift;
  const k = (y: number) => d / (d - y * sin);
  const toY = (y: number) => (y * cos - lift) * k(y);
  const toX = (x: number, y: number) => w / 2 + (x - w / 2) * k(y);
  const r = (n: number) => String(Math.round(n * 100) / 100);
  // How far down the plane the floor's bottom edge is: solve Y(y) = h. Nothing past it shows.
  const yEnd = Math.min(0.66 * vh, (d * (h + lift)) / (d * cos + h * sin));
  let path = "";
  if (kind === "rungs") {
    for (let y = 0; y <= yEnd; y += cell) {
      const [top, bottom] = [
        toY(y),
        toY(Math.min(y + 2, 0.66 * vh)),
      ];
      if (bottom < 0) continue;
      path += `M0 ${r(top)}H${r(w)}V${r(bottom)}H0Z`;
    }
  } else {
    for (let x = -0.6 * w; x < 1.6 * w; x += cell) {
      const quad = [
        [
          toX(x, 0),
          toY(0),
        ],
        [
          toX(x + 2, 0),
          toY(0),
        ],
        [
          toX(x + 2, yEnd),
          toY(yEnd),
        ],
        [
          toX(x, yEnd),
          toY(yEnd),
        ],
      ];
      const xs = quad.map(([qx]) => qx);
      if (Math.max(...xs) < 0 || Math.min(...xs) > w) continue;
      path += `M${quad.map(([qx, qy]) => `${r(qx)} ${r(qy)}`).join("L")}Z`;
    }
  }
  return path;
}

/**
 * One layer of the floor grid. Moving, it is the 3D plane (the rungs scroll toward you, which a flat drawing
 * cannot do on the compositor). STILL, it is the same grid drawn flat (floorGridPath): a 3D transform always
 * makes its element a compositing layer, and the wide, tiled, masked floor was ~20 of synthwave's 26 layers
 * with nothing moving. The plane renders until the floor has been measured (and on the server), then the
 * drawing replaces it and follows the floor's size.
 */
function FloorGrid({ kind, still }: { kind: "rungs" | "rails"; still: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [flat, setFlat] = useState<{
    w: number;
    h: number;
    d: string;
  } | null>(null);
  useEffect(() => {
    if (!still) {
      setFlat(null);
      return;
    }
    const floor = ref.current?.parentElement;
    if (!floor) return;
    const roundCell = typeof CSS !== "undefined" && CSS.supports("width: round(1px, 2px)");
    const draw = () => {
      // Layout size, not getBoundingClientRect: a scaled preview reports its transformed box.
      const [w, h] = [
        floor.offsetWidth,
        floor.offsetHeight,
      ];
      if (w && h)
        setFlat({
          w,
          h,
          d: floorGridPath(kind, w, h, window.innerWidth, window.innerHeight, roundCell),
        });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(floor);
    window.addEventListener("resize", draw);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [
    kind,
    still,
  ]);
  if (!flat) return <div ref={ref} className={`sw-grid sw-grid-${kind}`} />;
  return (
    <svg className="sw-flat" viewBox={`0 0 ${flat.w} ${flat.h}`} preserveAspectRatio="none" aria-hidden="true">
      <path
        d={flat.d}
        style={{
          fill: "var(--sw-line)",
        }}
      />
    </svg>
  );
}

function MuseConstellation() {
  return (
    <>
      <SceneStyles name="muse" css={MUSE_STYLES} />
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
  display: var(--sw-moon-d, block);
  /* No compositing layer of its own: see .sw-sun below. */
}
/* The OUTRUN SUN — synthwave's disc, promoted to shared furniture so clouds / dune / aurora can put the
   same low banded sun on their day horizon. It sits ON the 42% line and dips below it; whatever the scene
   draws next (cloud deck, sand, water) covers the dipped half, so it reads as sitting in the horizon.
   Both discs render in every scene that wants either; --sw-sun-o / --sw-moon-o pick which one shows per
   mode, the same way --sw-stars-o gates the stars. Defaults are 1, so synthwave and moonrise — which
   choose their disc in JSX instead — are untouched.
   Each opacity gate has a DISPLAY twin, --sw-sun-d / --sw-moon-d (block | none), set beside it in every
   palette block: the hidden disc has to leave the render tree, not just go transparent, because at
   opacity 0 it is still laid out and carried through its filter and masks (and, while discs had layers of
   their own, it was an invisible full-filter layer). check-patterns ([disc-gates]) keeps each pair in
   agreement. */
.sw-sun {
  position: absolute;
  left: var(--sw-disc-x, 50%);
  bottom: 42%;
  width: var(--sun-size, 46vh);
  height: var(--sun-size, 46vh);
  transform: translate(-50%, 33%);
  border-radius: 50%;
  opacity: var(--sw-sun-o, 1);
  display: var(--sw-sun-d, block);
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
  /* NO compositing layer of its own. Moving a disc in place (the left / center / right control changes
     \`left\`) asks WebKit to repaint the old and new spots, and for a disc carrying a drop-shadow filter AND
     a mask it repainted only part of each: the old sun's top stayed painted at the old spot and the new one
     showed only its lower half. A layer of its own made the move a reposition, but it cost 2-7 layers in
     every horizon scene (the disc, the sun path, their masks) for a protection only that moment needed.
     PatternBackground remounts the scene when the placement changes instead, so a disc never moves in
     place: the new scene paints whole. */
}
/* Paints its children as ONE compositing layer. WebKit gives every element that overlaps an earlier
   composited one a layer of its own, so the z-order holds; when the disc was a layer, every ridge, twin,
   deck and veil drawn after it became a full-viewport layer: dune had 52 of them while static, and the
   window server re-applied each one's mask and blur whenever anything on the page above them changed. The
   same holds for anything that moves (a cloud deck, a fog bank, a curtain), which has to be a layer. Inside one stacking context they paint into a single backing store instead, masks and
   blurs drawn once. Each scene wraps everything in front of its disc in one, and, inside it, any still
   run that sits over a MOVING part (a fog bank, the water), so only what moves gets layers of its own.
   Same box as the scene (inset 0), so the children's percentages and insets resolve unchanged. */
.scene-group {
  position: absolute;
  inset: 0;
  isolation: isolate;
}
/* Whole-pixel discs. WebKit sizes a filtered element's buffer from its box, and at a fractional width
   (30vh is 275.4px on a 918px viewport) it clips a sliver off the disc's left edge, which flattens a
   moon visibly. Rounding to an even pixel count keeps the halves whole. Behind @supports because
   round() only reached Chrome in 125: inside var() an unsupported function is invalid at computed-value
   time, which would drop the size outright rather than fall back to the declaration above. */
@supports (width: round(1px, 2px)) {
  .scene-moon {
    width: round(var(--moon-size, 40vh), 2px);
    height: round(var(--moon-size, 40vh), 2px);
  }
  .sw-sun {
    width: round(var(--sun-size, 46vh), 2px);
    height: round(var(--sun-size, 46vh), 2px);
  }
}`;

/**
 * A sky or ground stop with the theme tint cast in: the stop `oklch(l c h)` moves toward the tint's hue (at
 * chroma `tintC`) by the scene's --sw-cast, scaled by how far the tint's hue AGREES with the stop's: the
 * cosine of the hue distance, and nothing at 90° or more. Mixed in OKLCH at a full cast, a tint opposite the
 * stop swung it round the wheel through a third hue (amber or citrine on a blue sky made it teal, rose or
 * carnelian made it lavender); mixed in OKLab it went grey instead, as complementary colours do. Gated on the
 * distance, a blue or violet theme tints a blue sky as before, a warm theme leaves the scene's own sky alone,
 * and the hues in between get a little. Used by every scene whose sky or ground takes the cast.
 */
function tintCast(l: number, c: number, h: number, tintC: number): string {
  return `color-mix(in oklch, oklch(${l} ${c} ${h}), oklch(${l} ${tintC} var(--glass-tint-h, ${h})) calc(var(--sw-cast) * max(0, cos(calc((var(--glass-tint-h, ${h}) - ${h}) * 1deg)))))`;
}

// Synthwave / Tron horizon — two variants: `synthwave` (outrun sun) and `moonrise` (purple-blue moon),
// each with a DAY and a NIGHT palette so the scene follows the light/dark toggle. Every scene color is a
// --sw-* custom property: day values sit on [data-pattern="…"], night values under .dark
// (the injected <style> is plain global CSS and the wrapper descends from html.dark), and the structural
// rules read the vars — so the mode flip is pure CSS, no re-render. The grid + horizon glow ride --sw-line
// (accent hue, else the tint's hue, else the scene's own --sw-line-h: pink by day and Tron cyan by night
// for the sun, violet for the moon; see --sw-follow, and moonrise's night keeps its violet); by day the
// sky/ground also take a gentle cast of the theme tint (--sw-cast, gated on tint chroma so neutral stays
// the authored scene). Layers back→front: sky gradient (.sw-scene) · stars (day-hidden via --sw-stars-o) ·
// disc · ground (hides the disc's dip) · horizon glow · floor-grid. The floor uses PARENT perspective
// (.sw-floor, perspective-origin at the horizon) so lines converge at the horizon, not the near edge. The
// lone motion is the grid's compositor-only translateY scroll.
const SYNTHWAVE_STYLES = `
[data-pattern="synthwave"],
[data-pattern="moonrise"] {
  /* The lines and the horizon glow take the CHOSEN colour: the accent knob when it is set, else the tint's
     hue (--sw-hue), else the scene's own (--sw-line-h, set per scene and mode below). The pale tints keep
     the scene's own colours: selenite and onyx (chroma 0), the default (0.018) and moonstone (0.047, a
     cream) have no colour to give, and their hues (250, 75) would turn a white theme's grid blue and a
     cream one's orange. So --sw-follow is a step on the tint's chroma, 0 to c 0.05 and 1 from c 0.051;
     the nearest presets sit either side of it (moonstone 0.047, aquamarine 0.053), and a test names the
     pale set. Synthwave follows by day and by night, moonrise by day. */
  --sw-follow: clamp(0, (var(--glass-tint-c, 0) - 0.05) * 1000, 1);
  --sw-hue: calc(var(--sw-line-h) + (var(--glass-tint-h, 0) - var(--sw-line-h)) * var(--sw-follow));
}
[data-pattern="synthwave"] {
  /* DAY — an outrun SUNSET on the sand. The night scene is neon on dark ground; by day the old palette
     inverted it into dark teal lines on a near-white floor (lines L 0.48 on ground L 0.91, the lower sky
     at L 0.90 in the same pink), which read as graph paper with no horizon. Now: a peach band at the
     skyline, a warm sand floor deepening from peach to coral toward the viewer, and the lines and horizon
     glow in the chosen colour (hot pink for a neutral theme). The upper sky keeps the theme cast; from the
     band down it is authored, as dune's is, or the cast muddies the sunset. Every authored colour sits
     inside sRGB. The lines may not: at L 0.62 the cyans and blues top out below C 0.21 (celestite's ceiling
     is 0.13), and the browser maps them in. Every preset's lines read on the sand, warm ones included: they
     are more saturated than the floor, and citrine's are the faintest, an olive. */
  --sw-line-h: 355; /* the day lines' own hue (hot pink), for a pale tint; see --sw-follow */
  /* Day tint cast — how much of the theme tint bleeds into the upper sky. Gated on the tint's chroma, so the
     near-neutral default (c 0.018 → ~9%) keeps the authored scene and jewels/frescoes (c 0.06–0.1) get a
     gentle atmospheric wash, and per stop on how far the tint's hue agrees with the stop's (tintCast), so a
     warm theme leaves the blue sky alone. Every scene's cast works this way. Day-only; night keeps its
     authored neon. */
  --sw-cast: min(calc(var(--glass-tint-c, 0.018) * 500%), 32%);
  --sw-line: oklch(0.62 var(--accent-c, 0.21) var(--accent-h, var(--sw-hue)));
  --sw-sky-a: ${tintCast(0.85, 0.055, 235, 0.07)};
  --sw-sky-b: ${tintCast(0.88, 0.05, 275, 0.06)};
  --sw-sky-c: oklch(0.88 0.06 40);
  --sw-sky-d: oklch(0.9 0.06 60);
  --sw-ground-a: oklch(0.86 0.07 60);
  --sw-ground-b: oklch(0.7 0.11 30);
  --sw-below: var(--sw-ground-a); /* the 58% sky stop = the ground glimpse; MUST match --sw-ground-a or a seam shows */
  --sw-glow-core: oklch(0.8 min(var(--accent-c, 0.12), 0.12) var(--accent-h, var(--sw-hue)));
  --sw-glow-bloom: oklch(0.85 0.075 30 / 0.5);
  --sw-disc-1: oklch(0.58 0.24 352); /* sun stops, slightly deepened vs night so the disc separates from the peach horizon */
  --sw-disc-2: oklch(0.65 0.22 6);
  --sw-disc-3: oklch(0.72 0.18 42);
  --sw-disc-4: oklch(0.8 0.165 74);
  --sw-disc-5: oklch(0.88 0.16 95);
  --sw-disc-glow: oklch(0.7 0.19 20 / 0.35);
  --sw-stars-o: 0; /* stars hidden by day (also gates the Muse constellation) */
}
.dark [data-pattern="synthwave"] {
  /* NIGHT — the original neon scene, its grid in the chosen colour (Tron cyan for a pale tint) */
  --sw-line-h: 195;
  --sw-line: oklch(0.82 0.19 var(--accent-h, var(--sw-hue)));
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
  --sw-line-h: 270; /* scene identity hue (violet): the night lines', and the day lines' for a pale tint */
  --sw-cast: min(calc(var(--glass-tint-c, 0.018) * 500%), 32%);
  --sw-line: oklch(0.45 0.13 var(--accent-h, var(--sw-hue)));
  --sw-sky-a: ${tintCast(0.87, 0.04, 245, 0.05)};
  --sw-sky-b: ${tintCast(0.9, 0.045, 260, 0.045)};
  --sw-sky-c: ${tintCast(0.92, 0.035, 275, 0.035)};
  --sw-sky-d: ${tintCast(0.94, 0.03, 300, 0.03)};
  --sw-ground-a: ${tintCast(0.93, 0.02, 275, 0.025)};
  --sw-ground-b: ${tintCast(0.88, 0.035, 280, 0.035)};
  --sw-below: var(--sw-ground-a);
  --sw-glow-core: oklch(0.75 0.08 var(--accent-h, var(--sw-hue)));
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
  --sw-cell: 4vmin;
  background-size: var(--sw-cell) var(--sw-cell);
  transform-origin: 50% 0%;
  transform: rotateX(78deg);
}
/* A WHOLE-pixel cell where round() exists. The gradient tile is painted at whole pixels, so at a
   fractional 4vmin (28.8px on a 720px-tall window) a one-cell scroll ended a fraction of a pixel off the
   tile it started on, and the floor hitched once per loop, magnified by the tilt. */
@supports (width: round(1px, 2px)) {
  .sw-grid {
    --sw-cell: round(4vmin, 1px);
  }
}
/* Only the RUNGS scroll, via a COMPOSITOR-ONLY transform (translateY one cell) — GPU-composited, no
   per-frame paint (animating background-position re-rasterizes the gradient every frame; transform does
   not). Seamless because: (a) the tile repeats every cell, so translateY(one cell) is pixel-identical to 0 —
   no loop jump; and (b) the plane overhangs far past what's visible (tall height + the -4vmin top), so the
   sliding edges stay beyond the floor's overflow-clip + fade mask and never surface — which is what the
   earlier translate lacked. Rails stay static: a floor moving toward you slides the cross-rungs past, but
   the rails you travel along don't move. */
.sw-grid-rungs {
  background-image: linear-gradient(to bottom, var(--sw-line) 0 2px, transparent 2px);
  animation: sw-grid-scroll var(--pat-dur, 8s) linear infinite;
  will-change: var(--pat-wc, transform);
}
/* The FLAT floor (see FloorGrid): the same grid projected into the floor's pixels, no 3D. Once it is
   drawn, the floor's perspective has nothing left to project, and the property alone still made the floor
   a compositing layer (5 layers, both floors and their masks), so it goes. */
.sw-floor:has(> .sw-flat) {
  perspective: none;
}
.sw-flat {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}
.sw-grid-rails {
  background-image: linear-gradient(to right, var(--sw-line) 0 2px, transparent 2px);
}
@keyframes sw-grid-scroll {
  from { transform: rotateX(78deg) translateY(0); }
  to   { transform: rotateX(78deg) translateY(var(--sw-cell, 4vmin)); }
}
${stopRules(".sw-grid-rungs")}`;
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
  --cl-sky-a: ${tintCast(0.53, 0.115, 253, 0.1)};
  --cl-sky-b: ${tintCast(0.66, 0.1, 248, 0.09)};
  --cl-sky-c: ${tintCast(0.79, 0.06, 241, 0.055)};
  --cl-sky-d: oklch(0.9 0.025 235); /* the pale stop the deck emerges from — authored, no cast */
  /* Was / 0.75: over the far and mid deck that much near-white turned the whole lower view into fog, so
     the deck read as a white wash with grey smudges rather than as cloud. */
  --cl-haze: oklch(0.96 0.02 234 / 0.4);
  /* Deck tones — authored white/blue-gray (no theme cast: tinted snow reads dirty). Far is hazier,
     near is the brightest tops with the deepest bellies — but the whole ladder sits CLOSE together:
     cumulus shadows in the reference are far subtler than a poster's. */
  --cl-f-hi: oklch(0.955 0.014 234);
  --cl-f-lo: oklch(0.87 0.03 240);
  --cl-m-hi: oklch(0.975 0.01 233);
  --cl-m-lo: oklch(0.83 0.036 243);
  --cl-n-hi: oklch(0.99 0.006 230);
  --cl-n-lo: oklch(0.79 0.04 245);
  /* daytime SUN — the shared outrun disc, low on the deck. Warmer and less magenta than synthwave's,
     because it has to sit against a deep blue altitude sky rather than a violet one. */
  --sw-sun-o: 1;
  --sw-moon-o: 0;
  --sw-sun-d: block;
  --sw-moon-d: none;
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
  /* The same theme cast as the day sky (--sw-cast, from the tint's chroma): the night sky ignored the tint
     entirely, the one horizon scene that looked the same in every theme after dark. */
  --cl-sky-a: ${tintCast(0.08, 0.03, 262, 0.03)};
  --cl-sky-b: ${tintCast(0.11, 0.04, 266, 0.04)};
  --cl-sky-c: ${tintCast(0.15, 0.05, 270, 0.05)};
  --cl-sky-d: ${tintCast(0.21, 0.05, 276, 0.05)};
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
  --sw-sun-d: none;
  --sw-moon-d: block;
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
  will-change: var(--pat-wc, transform);
}
@keyframes cl-drift {
  from { transform: translateX(0); }
  to   { transform: translateX(calc(-1 * var(--cl-tile))); }
}
/* Each deck strip's tile = a bottom linear-gradient ramp (the solid deck) topped by overlapping dome
   ellipses with feathered color stops — reference cumulus tops are soft, not cut, but feathered over a
   third of the radius they dissolved into the base and the deck lost its form — and each of
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
    radial-gradient(7% 34% at 7% 46%, var(--cl-f-hi) 0 40%, transparent 58%),
    radial-gradient(5% 26% at 16% 52%, var(--cl-f-hi) 0 38%, transparent 56%),
    radial-gradient(9% 36% at 27% 44%, var(--cl-f-hi) 0 42%, transparent 60%),
    radial-gradient(6% 28% at 41% 54%, var(--cl-f-hi) 0 38%, transparent 56%),
    radial-gradient(10% 38% at 52% 46%, var(--cl-f-hi) 0 42%, transparent 60%),
    radial-gradient(5% 24% at 60% 56%, var(--cl-f-hi) 0 38%, transparent 56%),
    radial-gradient(8% 34% at 71% 48%, var(--cl-f-hi) 0 40%, transparent 58%),
    radial-gradient(6% 30% at 86% 52%, var(--cl-f-hi) 0 38%, transparent 56%),
    radial-gradient(5% 32% at 95% 46%, var(--cl-f-hi) 0 40%, transparent 58%),
    radial-gradient(4% 18% at 12% 50%, var(--cl-f-hi) 0 36%, transparent 54%),
    radial-gradient(5% 20% at 33% 48%, var(--cl-f-hi) 0 36%, transparent 54%),
    radial-gradient(3% 14% at 47% 56%, var(--cl-f-hi) 0 34%, transparent 52%),
    radial-gradient(6% 22% at 78% 50%, var(--cl-f-hi) 0 36%, transparent 54%),
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
    radial-gradient(11% 40% at 9% 48%, var(--cl-m-hi) 0 42%, transparent 60%),
    radial-gradient(6% 26% at 18% 56%, var(--cl-m-hi) 0 38%, transparent 56%),
    radial-gradient(14% 44% at 31% 46%, var(--cl-m-hi) 0 44%, transparent 62%),
    radial-gradient(8% 32% at 44% 56%, var(--cl-m-hi) 0 40%, transparent 58%),
    radial-gradient(12% 42% at 58% 46%, var(--cl-m-hi) 0 44%, transparent 62%),
    radial-gradient(5% 22% at 66% 58%, var(--cl-m-hi) 0 36%, transparent 54%),
    radial-gradient(13% 40% at 78% 48%, var(--cl-m-hi) 0 44%, transparent 62%),
    radial-gradient(9% 34% at 91% 52%, var(--cl-m-hi) 0 40%, transparent 58%),
    radial-gradient(7% 28% at 24% 56%, var(--cl-m-hi) 0 38%, transparent 56%),
    radial-gradient(6% 24% at 15% 52%, var(--cl-m-hi) 0 36%, transparent 54%),
    radial-gradient(8% 28% at 38% 50%, var(--cl-m-hi) 0 38%, transparent 56%),
    radial-gradient(5% 20% at 52% 56%, var(--cl-m-hi) 0 34%, transparent 52%),
    radial-gradient(7% 26% at 85% 52%, var(--cl-m-hi) 0 36%, transparent 54%),
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
    radial-gradient(15% 46% at 15% 54%, var(--cl-n-hi) 0 44%, transparent 62%),
    radial-gradient(8% 32% at 28% 64%, var(--cl-n-hi) 0 40%, transparent 58%),
    radial-gradient(18% 48% at 44% 52%, var(--cl-n-hi) 0 46%, transparent 64%),
    radial-gradient(10% 38% at 58% 62%, var(--cl-n-hi) 0 42%, transparent 60%),
    radial-gradient(16% 46% at 73% 54%, var(--cl-n-hi) 0 46%, transparent 64%),
    radial-gradient(7% 28% at 83% 64%, var(--cl-n-hi) 0 38%, transparent 56%),
    radial-gradient(8% 42% at 92% 56%, var(--cl-n-hi) 0 40%, transparent 58%),
    radial-gradient(6% 26% at 66% 70%, var(--cl-n-hi) 0 36%, transparent 54%),
    radial-gradient(9% 30% at 22% 60%, var(--cl-n-hi) 0 38%, transparent 56%),
    radial-gradient(12% 36% at 36% 56%, var(--cl-n-hi) 0 40%, transparent 58%),
    radial-gradient(7% 26% at 51% 62%, var(--cl-n-hi) 0 36%, transparent 54%),
    radial-gradient(10% 32% at 86% 60%, var(--cl-n-hi) 0 38%, transparent 56%),
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
${stopRules(".cl-deck")}`;

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
// RIDGE SHAPE. Each tier is a SKEWED wave: every crest rises over a long windward flank and falls over a
// shorter, steeper lee, the asymmetry real ridges have, with a smaller harmonic on top so no two crests
// match. The skew is a phase modulation (sin(t - s·sin t)), so the slope is continuous everywhere: crests are
// rounded and there is no corner anywhere. The hand-drawn set before it gave each tier one crest that met its
// slip face at a corner (a curve into a straight drop); repeated tier over tier, those corners read as a
// jagged zigzag. Amplitude and skew grow toward the viewer; the far tiers stay soft, as haze would leave them.
// Crests keep headroom above y=0: .du-sh draws this same silhouette nudged UP by --du-off and blurred 8px,
// and a crest sitting on the top edge would clip its own cast shadow.

/** One tier's silhouette, in the 200 × 60 box every tier's mask stretches over its own height. `base` is
 *  the mean crest depth, `amp` the swell above and below it, `crests` how many cross the width, `skew` how
 *  much longer the windward flank is than the lee (0 = a plain sine). Drawn through the midpoints of
 *  closely spaced samples with each sample as the control point, so it has no corners. Deterministic. */
function duneRidge(base: number, amp: number, crests: number, skew: number, seed: number) {
  const rand = mulberry32(seed);
  const [p1, p2] = [
    rand() * Math.PI * 2,
    rand() * Math.PI * 2,
  ];
  const at = (x: number) => {
    const t = (2 * Math.PI * crests * x) / 200 + p1;
    return base - amp * Math.sin(t - skew * Math.sin(t)) - amp * 0.22 * Math.sin(2.3 * t + p2);
  };
  // Rounded to a tenth (f1 is declared further down, after this runs at module load).
  const r = (n: number) => String(Math.round(n * 10) / 10);
  const n = 80;
  const pts = Array.from(
    {
      length: n + 1,
    },
    (_, i) =>
      [
        (200 * i) / n,
        at((200 * i) / n),
      ] as const,
  );
  const mid = (i: number) => `${r((pts[i][0] + pts[i + 1][0]) / 2)} ${r((pts[i][1] + pts[i + 1][1]) / 2)}`;
  let d = `M0 60L0 ${r(pts[0][1])}L${mid(0)}`;
  for (let i = 1; i < n; i++) d += `Q${r(pts[i][0])} ${r(pts[i][1])} ${mid(i)}`;
  d += `L200 ${r(pts[n][1])}L200 60Z`;
  return svgMask(`<path d='${d}'/>`, "0 0 200 60", true);
}
/* Spaced in SCENE terms, not box terms: each tier's mask stretches over its own height (58% … 18% of the
   scene), so a tier's crests land at its top + y/60 of its height. Chosen so each tier's crest band sits
   mostly below the one behind it (centres at 62, 68, 74.5, 81, 87 and 92.5% of the scene, swells of 2.5 to
   4 of it) and overlaps it only a little: near tiers that rose well above the far ones' troughs crossed
   them, and their cast shadows and rims tangled into a knot of lines. */
const DUNE_A0 = duneRidge(20.7, 2.4, 1.4, 0.3, 61);
const DUNE_A = duneRidge(23.1, 3.5, 2, 0.45, 67);
const DUNE_B = duneRidge(26, 4.7, 1.8, 0.5, 71);
const DUNE_C = duneRidge(29.2, 6.5, 1.5, 0.55, 73);
const DUNE_D = duneRidge(32.1, 9, 1.3, 0.6, 79);
const DUNE_E = duneRidge(35, 13, 1.1, 0.62, 83);
const DUNE_STYLES = `
[data-pattern="dune"] {
  /* DAY — GOLDEN HOUR, drawn from the aerial reference: a pale blue zenith cooling through a
     near-neutral cream, then the warmth compressed into a narrow band at the bottom of the sky —
     apricot into a deeper orange that meets the land. Chroma stays LOW everywhere but that band;
     the photograph's sky is dusty, not a poster sunset. */
  --sw-cast: min(calc(var(--glass-tint-c, 0.018) * 250%), 16%);
  --du-sky-a: ${tintCast(0.79, 0.05, 250, 0.045)};
  --du-sky-b: ${tintCast(0.84, 0.03, 262, 0.03)};
  --du-sky-c: ${tintCast(0.87, 0.03, 70, 0.03)};
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
  --sw-sun-d: block;
  --sw-moon-d: none;
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
  --sw-sun-d: none;
  --sw-moon-d: block;
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
${stopRules(".du-grain-tile", ".du-veil")}`;

// Aurora — the borealis over a MIRROR-CALM WATERLINE, a low sun by day and a moon by night (with its path
// on the water; the pattern shares the stars). Three curtain layers paint slanted ray columns: each is
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
/* The three curtains' ray tiles, written "0, --au-1 4 9, 13, …": transparent marks (%) between
   `color from to` bands, across a tile `vh` wide. One source for the sky's gradients (rays()) and the day
   reflection's streaks (AuroraStreaks), so the reflection always starts under its own ray. */
const AU_TILES = {
  a: {
    vh: 110,
    seed: 7,
    tile: "0, --au-1 4 9, 13, --au-2 16 18.5, 24, --au-1 30 37, 42, --au-3 47 49, 54, --au-1 59 66, 71, --au-2 76 78, 83, --au-1 88 91, 96",
  },
  b: {
    vh: 150,
    seed: 19,
    tile: "0, --au-3 6 13, 20, --au-4 27 30, 36, --au-3 45 54, 61, --au-4 68 70, 76, --au-3 83 87, 93",
  },
  c: {
    vh: 70,
    seed: 31,
    tile: "0, --au-1 10 11.5, 16, --au-2 27 28, 33, --au-4 44 46.5, 52, --au-1 63 64, 70, --au-2 81 83, 89",
  },
} as const;
type AuLayer = keyof typeof AU_TILES;
type RayStop =
  | number
  | [
      color: string,
      from: number,
      to: number,
    ];

function rayStops(tile: string): RayStop[] {
  return tile.split(",").map((t) => {
    const [a, from, to] = t.trim().split(/\s+/);
    return to === undefined
      ? Number(a)
      : [
          a,
          Number(from),
          Number(to),
        ];
  });
}

/* A tile as the curtain's gradient: a REPEATING gradient whose period is the tile (--au-tile, in vh), its
   stops the tile's percentages of it, held open at 0 and at the full tile so the period is exact (the tiles
   end short of 100%, in sky). Not a linear-gradient tiled by background-size, which Safari 27.2 paints
   unskewed under the curtain's skew when the curtain has no layer (see .au-paint). --au-crisp scales every
   band's ramp in and out (as it scales the blur), so at night's 1 this is exactly the authored tile, and by
   day the ramps shrink toward the band, which leaves clean edges and clear sky between the rays. */
function rays(tile: string): string {
  const stops = rayStops(tile);
  const at = (pct: string | number) => `calc(var(--au-tile) * ${pct} / 100)`;
  const out: string[] = [
    "transparent 0",
  ];
  stops.forEach((s, i) => {
    if (typeof s !== "number") {
      out.push(`var(${s[0]}) ${at(s[1])} ${at(s[2])}`);
      return;
    }
    const prev = stops[i - 1];
    const next = stops[i + 1];
    if (Array.isArray(prev)) out.push(`transparent ${at(`(${prev[2]} + ${s - prev[2]} * var(--au-crisp, 1))`)}`);
    if (Array.isArray(next)) out.push(`transparent ${at(`(${next[1]} - ${next[1] - s} * var(--au-crisp, 1))`)}`);
  });
  out.push("transparent var(--au-tile)");
  return `repeating-linear-gradient(to right, ${out.join(", ")})`;
}

/** The day reflection of one curtain tile: every ray as a straight STREAK down the water. Coordinates are
 *  pre-flip (the mirror is scaleY(-1)): y 100 is the horizon end, y 0 the far end toward the viewer; x is
 *  in tenths of a vh. A streak starts under its ray and leans as the mirrored ray does (the curtain's own
 *  skew), plus a slight tilt of its own, and widens toward the viewer as a reflection does in perspective;
 *  a lighter CORE runs down its middle, the specular shine of calm water by day. The streaks it replaced
 *  wavered and broke into glints, and as the lights swayed that read as a belt carrying them along. */
function auroraStreaks({ vh, seed, tile }: (typeof AU_TILES)[AuLayer]) {
  const rand = mulberry32(seed);
  const stops = rayStops(tile);
  const unit = 10;
  const at = (pct: number) => (pct / 100) * vh * unit;
  const quad = (a: number, b: number, c: number, d: number) => `M${f1(a)} 100 L${f1(b)} 100 L${f1(d)} 0 L${f1(c)} 0 Z`;
  const streaks: {
    color: string;
    body: string;
    core: string;
  }[] = [];
  stops.forEach((s, i) => {
    if (typeof s === "number") return;
    const [color, from, to] = s;
    // Hard edges stand in for the day tile's ramps (0.3 of the authored ones), so each edge takes half.
    const x0 = at(from - (from - Number(stops[i - 1])) * 0.15);
    const x1 = at(to + (Number(stops[i + 1]) - to) * 0.15);
    const width = x1 - x0;
    const tilt = (rand() - 0.5) * 4 * unit;
    const spread = width * (0.2 + rand() * 0.45);
    const mid = (x0 + x1) / 2;
    const core = width * 0.24;
    streaks.push({
      color,
      body: quad(x0, x1, x0 + tilt - spread / 2, x1 + tilt + spread / 2),
      core: quad(mid - core / 2, mid + core / 2, mid + tilt - core * 0.7, mid + tilt + core * 0.7),
    });
  });
  return {
    width: vh * unit,
    streaks,
  };
}

/* Built on first render, not at module load: the helpers it shares with the forest are declared below. */
let auStreaks: Record<AuLayer, ReturnType<typeof auroraStreaks>> | undefined;
const auroraStreakTiles = () =>
  (auStreaks ??= {
    a: auroraStreaks(AU_TILES.a),
    b: auroraStreaks(AU_TILES.b),
    c: auroraStreaks(AU_TILES.c),
  });

const AU_COLORS = [
  "--au-1",
  "--au-2",
  "--au-3",
  "--au-4",
] as const;

/** One curtain's day reflection, inside the same .au-curtain box as the gradient mirror it stands in for,
 *  so it leans, sways, fades and blurs exactly as that one does, and tiled the same way (from the
 *  curtain's left edge), so each streak starts under its own ray. Each colour's streaks are brightest at
 *  the waterline and fade with distance (a gradient per colour); the cores fade faster. */
function AuroraStreaks({ layer }: { layer: AuLayer }) {
  const { vh } = AU_TILES[layer];
  const { width, streaks } = auroraStreakTiles()[layer];
  const id = `${useId().replace(/[^\w-]/g, "")}au-${layer}`;
  // The curtain is 140vw wide: enough tiles for a viewport up to 5× as wide as it is tall, plus one.
  const tiles = Math.ceil(700 / vh) + 1;
  return (
    <div className={`au-curtain au-${layer} au-streaks`}>
      <div className="au-paint">
        <svg
          viewBox={`0 0 ${width * tiles} 100`}
          preserveAspectRatio="none"
          style={{
            width: `${vh * tiles}vh`,
          }}
          aria-hidden="true"
        >
          <defs>
            {AU_COLORS.map((c) => (
              <linearGradient key={c} id={`${id}${c}`} gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="0">
                <stop
                  offset="0"
                  style={{
                    stopColor: `var(${c})`,
                  }}
                />
                <stop
                  offset="0.5"
                  style={{
                    stopColor: `var(${c})`,
                    stopOpacity: 0.75,
                  }}
                />
                <stop
                  offset="1"
                  style={{
                    stopColor: `var(${c})`,
                    stopOpacity: 0.25,
                  }}
                />
              </linearGradient>
            ))}
            {AU_COLORS.map((c) => (
              <linearGradient key={c} id={`${id}${c}-core`} gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="0">
                <stop
                  offset="0"
                  style={{
                    stopColor: `color-mix(in oklch, var(${c}), white 55%)`,
                    stopOpacity: 0.85,
                  }}
                />
                <stop
                  offset="0.6"
                  style={{
                    stopColor: `color-mix(in oklch, var(${c}), white 55%)`,
                    stopOpacity: 0,
                  }}
                />
              </linearGradient>
            ))}
            <g id={id}>
              {streaks.map((st) => (
                <path key={st.body} d={st.body} fill={`url(#${id}${st.color})`} />
              ))}
              {streaks.map((st) => (
                <path key={st.core} d={st.core} fill={`url(#${id}${st.color}-core)`} />
              ))}
            </g>
          </defs>
          {Array.from(
            {
              length: tiles,
            },
            (_, k) => (
              <use key={k} href={`#${id}`} x={k * width} />
            ),
          )}
        </svg>
      </div>
    </div>
  );
}

const AURORA_STYLES = `
[data-pattern="aurora"] {
  /* DAY — GOLDEN HOUR on the same ramp as dune, from the aerial references: a full blue up top
     cooling through a near-neutral cream, the warmth compressed into a band at the waterline. The
     chosen color still rides the sunrise gradient, but at LOW chroma — that is exactly what the
     reference's desaturated mid-sky is, so it carries the theme without fighting the photograph.
     The curtains stay vivid and opaque (no see-through wisps): they are the subject, the sky is not. */
  /* BLUE HOUR, so the lights can show by day. They glow at night because they land far brighter than the
     sky; under the old pale golden-hour sky (L 0.76–0.85 below the zenith, a white cirrus veil and a
     haze over it) they could only sit BELOW it and read as muddy bands, and the whole sky read washed
     out. So the upper sky deepens to a saturated twilight blue and the curtains sit ABOVE it in
     lightness and glow, while the warmth stays a band at the horizon, where the low sun is and where the
     lights fade into its brightness as real ones do. */
  --au-sky-a: oklch(0.42 0.14 262);
  --au-sky-b: oklch(0.54 0.11 var(--accent-h, var(--glass-tint-h, 285))); /* the chosen color, at twilight */
  --au-sky-c: oklch(0.74 0.09 50);
  --au-sky-d: oklch(0.82 0.11 62); /* gold… */
  --au-sky-e: oklch(0.74 0.12 42); /* …into the deeper orange the water meets */
  /* Lighter than night's by a good way: by day calm water mirrors the bright sky, warm near the line and
     blue toward the viewer, where it reflects the zenith. */
  --au-water-a: oklch(0.64 0.1 45);
  --au-water-b: oklch(0.34 0.09 260);
  --au-rip-hi: oklch(1 0 0 / 0.05);
  --au-rip-lo: oklch(0.35 0.05 45 / 0.04);
  /* Curtains sit BELOW the day sky, not above it. Night works because its lights land ~38 L brighter
     than an L-0.18 sky and glow out of it; by day the sky is already L 0.84-0.85, so the old L 0.76-0.79
     curtains landed 3-5 L DARKER than the sky and separated from nothing — plenty of chroma (lip spread
     114) with no lightness structure, which is exactly what reads as haze. There is no headroom above a
     sky that bright, so the only direction left is down: these land 14-17 L below it and the bands read
     as bands again. Chroma is ~88% of each hue's own ceiling AT ITS lightness rather than one shared
     number — green and teal bottom out fast below L 0.6 (ceilings 0.132 / 0.101), while violet and pink
     still have 0.28 / 0.23 to spend, so a single value would either mud the first two or clip the rest. */
  /* Lighter than the blue-hour sky they hang in, so they glow out of it as the night ones do, and thinner
     than night's, so deep blue shows between the rays: haze is low contrast, and three overlapping
     curtains at night's strength left no clear sky anywhere. */
  --au-1: oklch(0.82 0.17 158 / 0.7);
  --au-2: oklch(0.82 0.12 190 / 0.6);
  --au-3: oklch(0.72 0.17 var(--accent-h, var(--glass-tint-h, 305)) / 0.52);
  --au-4: oklch(0.74 0.16 345 / 0.46);
  /* By day the rays are CRISP (blur and ray ramps × 0.3, see rays(): soft edges were most of the haze)
     and the horizon haze band thin. Night resets both. */
  --au-crisp: 0.3;
  --au-haze-o: 0.22;
  --au-glow: oklch(0.84 0.11 var(--au-h) / 0.35); /* the haze band's colour: the chosen colour, thin */
  /* Was 1.15. Day is the mode that already reads hazy, so it was the one mode adding 15% blur on top
     of everything else; the mirror still sets its own 1.5 below. */
  --au-blur-m: 1;
  /* Was / 0.5. This veil is gated on --sw-sun-o, so it exists ONLY by day — at 0.85 opacity an L-0.96
     near-white wash lifted the upper sky +4.7 L toward white, i.e. literal haze that night never had.
     0.3 halves it to +2.8 and it reads as thin cirrus instead of a scrim. */
  /* Off by day now: the old 0.3 veil was half the wash-out, and over glowing curtains even a trace read
     as scan lines. */
  --au-cirrus: transparent;
  /* By day the curtains' bright lip LIFTS a quarter of the way up their height (and the reflection's
     drops to match), so the warm band and the sun's glare show beneath the lights, where real aurora
     fades into the brightness of a low sun; with the lip on the horizon they buried it. */
  --au-fade: linear-gradient(to top, transparent 3%, rgb(0 0 0 / 0.45) 17%, #000 29%, rgb(0 0 0 / 0.45) 48%, rgb(0 0 0 / 0.1) 69%, transparent 85%);
  --au-mirror-fade: linear-gradient(to top, transparent 5%, rgb(0 0 0 / 0.6) 14%, #000 22%, #000 40%, rgb(0 0 0 / 0.7) 62%, transparent 96%);
  /* daytime SUN — new to this scene. By night the moon takes its place (see the night block). */
  --sw-sun-o: 1;
  --sw-moon-o: 0;
  --sw-sun-d: block;
  --sw-moon-d: none;
  --sun-size: 38vh;
  /* The same banded outrun sun as every other scene. Its band gaps are transparent, and here they used to
     show the curtains through the disc, so the sun was made solid; .au-sunsky now paints the sky into
     the disc's footprint first, so the gaps show sky, as they do everywhere else. */
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
  /* Pinned so night keeps EXACTLY the blur it had. --au-blur-m lives in the shared base block, which
     night inherits, so dropping it to 1 there to de-haze the day would have quietly sharpened night
     too — and night is the mode that already reads right. */
  --au-blur-m: 1.15;
  /* The reflection takes the SKY's blur at night, not the softer 1.5 it has by day. Sky and reflection meet
     at the waterline, and blurred by different amounts every column changed profile there, bright ones
     stepping down and gaps stepping up: a hard edge along the horizon, worst in Safari (6.5 levels per
     column across one px). Matched, the step is the same as between any two rows. By day the reflection
     starts below the line (the lip is lifted), so the softer mirror never meets the sky. */
  --au-mirror-blur-m: 1.15;
  /* The haze band's colour. Must be LIGHTER than the curtains it washes over (L ~0.75): a haze below them
     in lightness reads as a dull band ruled across the waterline, not as light. */
  --au-glow: oklch(0.84 0.1 180 / 0.28);
  --au-h: var(--accent-h, var(--glass-tint-h, 35));
  --sw-sun-o: 0;
  --sw-sun-d: none; /* takes the sun out of the tree, not just to opacity 0 */
  /* The lips sit on the horizon again at night: there is no sun for them to fade into. Night keeps its own
     softness and haze too. */
  --au-fade: initial;
  --au-mirror-fade: initial;
  --au-crisp: 1;
  /* The horizon's full-width washes (a glow strip above the line, and a reflection strip below it that is
     gone now) peaked ON the line at every x, so they ruled a cyan line across the whole view, through the
     dark gaps between the curtains as much as under them. The curtains' own lips and their reflections
     carry the horizon, and between them it stays dark; the soft haze band just blends sky into water. */
  --au-haze-o: 0.4;
  /* The reflection's wavelet (dips of 5-7% in two stripes every 31px) is counted from the mirror's box, which
     runs 3vh past the waterline, so where its stripes fall at the line depends on the window's height. At
     night the lips sit ON the line and the reflection is as bright as the sky, so the stripe that landed
     there drew a dark rule along the horizon. Night drops it: the ripple overlay, which fades in from the
     line, still textures the water. By day the lip is lifted and nothing bright meets the line. */
  --au-wavelet: linear-gradient(#000, #000);
  /* A MOON by night, high over the lights, with its path on the water below. It sits in front of the
     curtains, as the sun does: behind three layers of translucent light it turned green and stopped
     reading as a moon. */
  --sw-moon-o: 1;
  --sw-moon-d: block;
  --moon-size: 24vh;
  --moon-bottom: 60%;
  --moon-dip: 0%;
  --sw-moon-1: oklch(0.96 0.012 255);
  --sw-moon-2: oklch(0.87 0.03 262);
  --sw-moon-3: oklch(0.74 0.05 270);
  --sw-maria: 0.66 0.04 268;
  --sw-disc-glow: oklch(0.85 0.05 230 / 0.45);
  /* The path on the water is the moon's: silver, narrower, fainter than the sun's. */
  --au-path-d: block;
  --au-path-o: 0.42;
  --au-path-w: calc(var(--moon-size) * 2.4);
  --au-path-1: oklch(0.96 0.015 250);
  --au-path-2: oklch(0.9 0.03 255);
  --au-path-3: oklch(0.82 0.04 262);
  --au-path-4: oklch(0.74 0.05 268);
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
/* A curtain is two boxes: this one MOVES (sway, shimmer: transform and opacity only), and its .au-paint
   child carries everything it draws. A moving element is a compositing layer, and on a layer its own
   blur, masks and clip are re-applied by the window server on every frame; on a child they are drawn into
   the layer once and then just carried along. Same picture, since all three apply before the transform. */
.au-curtain {
  position: absolute;
  top: -6%;
  bottom: 39%;
  left: -20vw;
  right: -20vw;
  transform-origin: 50% 100%;
  transform: skewX(var(--au-lean, -6deg));
  opacity: calc(var(--au-lo, 1) * var(--au-dim, 1));
  animation:
    au-sway calc(var(--pat-dur, 8s) * var(--au-ks, 3)) ease-in-out infinite alternate,
    au-shimmer calc(var(--pat-dur, 8s) * var(--au-kp, 2)) ease-in-out infinite alternate;
  animation-delay: var(--au-delay, 0s);
  will-change: var(--pat-wc, transform), var(--pat-wc, opacity);
}
.au-paint {
  position: absolute;
  inset: 0;
  /* The box runs 3vh PAST the waterline and is CLIPPED exactly on it. Ending the box at 58% let the blur
     eat its last few px, a dark bar of bare scene gradient along the horizon; running it past and leaving
     it visible stacked it under the reflection, a bright strip; feathering it under the water sheet
     crossfaded three layers at once, a dark one. Clipped, the blurred lip runs at full strength right to
     the line and the reflection takes over there. (The clip is pre-transform, but sway is a skewX and a
     translateX, neither of which moves a horizontal edge.) */
  clip-path: inset(0 0 3vh 0);
  /* One REPEATING gradient across the box (rays()), not a tile repeated by background-size + repeat-x:
     Safari 27.2 paints a TILED background under a skew without the skew when the skewed box has no layer
     of its own, so a still curtain (Speed: Static, no layers) stood its rays straight up under its slanted
     outline, and they met their reflections askew at the waterline. A repeating gradient is drawn skewed. */
  background-image: var(--au-rays);
  filter: blur(calc(var(--au-blur, 1.2vh) * var(--au-blur-m, 1) * var(--au-crisp, 1)));
  -webkit-mask-image: var(--au-fade, linear-gradient(to top, #000 13%, rgb(0 0 0 / 0.62) 47%, rgb(0 0 0 / 0.2) 81%, transparent 97%)), linear-gradient(to right, transparent 3%, #000 14% 86%, transparent 97%);
  mask-image: var(--au-fade, linear-gradient(to top, #000 13%, rgb(0 0 0 / 0.62) 47%, rgb(0 0 0 / 0.2) 81%, transparent 97%)), linear-gradient(to right, transparent 3%, #000 14% 86%, transparent 97%);
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
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
  --au-tile: ${AU_TILES.a.vh}vh;
  --au-ks: 2.4;
  --au-kp: 1.7;
  --au-amp: 2.5vw;
  --au-lean: -7deg;
  --au-sway-to: 3deg;
  --au-blur: 1.2vh;
  --au-lo: 1;
  --au-rays: ${rays(AU_TILES.a.tile)};
}
.au-b {
  --au-tile: ${AU_TILES.b.vh}vh;
  --au-ks: 3.6;
  --au-kp: 2.5;
  --au-amp: 4vw;
  --au-lean: 9deg;
  --au-sway-to: 1deg;
  --au-blur: 2vh;
  --au-lo: 0.75;
  --au-delay: -7s;
  --au-rays: ${rays(AU_TILES.b.tile)};
}
.au-c {
  --au-tile: ${AU_TILES.c.vh}vh;
  --au-ks: 4.8;
  --au-kp: 3.1;
  --au-amp: 5.5vw;
  --au-lean: -3deg;
  --au-sway-to: 5deg;
  --au-blur: 0.7vh;
  --au-lo: 0.85;
  --au-delay: -13s;
  --au-rays: ${rays(AU_TILES.c.tile)};
}
/* By day the wide violet-pink veil layer (B) all but steps back: it filled every gap between the other
   two layers' rays, so no clear sky showed anywhere and the lights read as a haze, not as rays. */
[data-pattern="aurora"] .au-b {
  --au-lo: 0.3;
}
.dark [data-pattern="aurora"] .au-b {
  --au-lo: 0.75;
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
     sky curtains in a strip the reflection does not yet cover, which draws a thin dark rule. In vh, from
     this sheet's 54vh top: as 8% of its 46vh height the edge sat at 57.7%, and drew exactly that rule. */
  -webkit-mask-image: linear-gradient(to bottom, transparent 0 4vh, #000 7vh);
  mask-image: linear-gradient(to bottom, transparent 0 4vh, #000 7vh);
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
  /* Past the waterline by the same 3vh as the sky curtains (the water box clips it there), so the blur
     cannot eat the reflection's lip at the line, and its skew pivot mirrors theirs through it. */
  bottom: -3vh;
  --au-dim: 1;
  --au-blur-m: var(--au-mirror-blur-m, 1.5);
}
.au-mirror .au-paint {
  clip-path: none;
  /* Same lip fade + side feathers as the sky curtains, INTERSECTED with a GENTLE wavelet ripple —
     The mirror runs at --au-dim 1 with a brighter vertical falloff to hold the reflection at full
     strength while the SKY curtains were thinned to let stars and sky through — same colours feed both,
     so the sky could not be opened up without compensating here.
     dips of only 5-7% at an uneven two-stripe rhythm, so the reflection reads as water catching the
     lights, not as scanline stripes. Deeper dips than this and the mirror turns into a CRT. Strength
     lives in --au-dim (0.8 = a strong mirror), never in the ripple contrast. */
  -webkit-mask-image: var(--au-mirror-fade, linear-gradient(to top, #000 8%, rgb(0 0 0 / 0.82) 50%, transparent 98%)), linear-gradient(to right, transparent 3%, #000 14% 86%, transparent 97%), var(--au-wavelet, repeating-linear-gradient(to bottom, #000 0 9px, rgb(0 0 0 / 0.93) 9px 13px, #000 13px 27px, rgb(0 0 0 / 0.95) 27px 31px));
  mask-image: var(--au-mirror-fade, linear-gradient(to top, #000 8%, rgb(0 0 0 / 0.82) 50%, transparent 98%)), linear-gradient(to right, transparent 3%, #000 14% 86%, transparent 97%), var(--au-wavelet, repeating-linear-gradient(to bottom, #000 0 9px, rgb(0 0 0 / 0.93) 9px 13px, #000 13px 27px, rgb(0 0 0 / 0.95) 27px 31px));
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
}
/* By day AuroraStreaks' streaks stand in for the gradient mirror: with crisp day rays, a plain mirror of them
   read as identical bars ruled down the water. Night keeps the soft gradient mirror, where the blur
   already hides the edges. */
.au-streaks .au-paint {
  background-image: none;
  overflow: hidden;
}
.au-streaks svg {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  display: block;
}
/* The other mode's reflection is HIDDEN, never removed. display: none stops an element's animations, and
   showing it again starts them from zero: after a day/night switch the reflection swayed out of step with
   the sky it mirrors (measured: sky 8.5s into its sway, the new reflection 2.1s), so the curtains met their
   reflections askew at the waterline until something remounted the scene. Hidden, it keeps swaying in step
   and draws nothing. */
[data-pattern="aurora"] .au-flat,
.dark [data-pattern="aurora"] .au-streaks {
  visibility: hidden;
}
.dark [data-pattern="aurora"] .au-flat {
  visibility: visible;
}
/* The ripples FADE IN below the waterline, from nothing at the line to full 6vh down: real ripple lines
   compress to nothing toward the horizon, and starting at full strength they ruled it, a 1px highlight
   exactly on the waterline and a dark stripe 14px under it. The fade is on this still wrapper, not on the
   drifting ripples, where it would move with them and jump back a stripe at every loop. */
.au-ripple-fade {
  position: absolute;
  inset: 0;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 6vh);
  mask-image: linear-gradient(to bottom, transparent 0, #000 6vh);
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
  will-change: var(--pat-wc, transform);
}
@keyframes au-ripple-drift {
  from { transform: translateY(0); }
  to   { transform: translateY(24px); }
}
/* SUN / MOON PATH — the glitter column a low sun (or the moon) throws across water. Everything else in
   this scene reflects (the curtains are literally mirrored), so a disc with no reflection was the one
   element that looked pasted on. Not a mirrored disc: on real water the reflection smears into a vertical
   column that widens with distance, so this is a tapered gradient broken up by the same ripple rhythm as
   the mirror. By day it is the sun's, gated on --sw-sun-o so it appears and disappears with the sun; the
   night palette repoints it at the moon through --au-path-d / -o / -w and its colours --au-path-1..4.
   No layer of its own, as the disc it reflects has none (see .sw-sun): the scene remounts when the
   placement changes, so it never moves in place. Its glints are drawn by the child (.au-sunpath-paint). */
.au-sunpath {
  position: absolute;
  left: var(--sw-disc-x, 50%);
  top: 58%;
  bottom: 0;
  width: var(--au-path-w, calc(var(--sun-size, 38vh) * 2.4));
  transform: translateX(-50%);
  opacity: var(--au-path-o, calc(0.62 * var(--sw-sun-o, 0)));
  display: var(--au-path-d, var(--sw-sun-d, none));
}
.au-sunpath-paint {
  position: absolute;
  inset: 0;
  /* Built from STACKED GLINTS, not a clipped wedge. clip-path gave dead-straight diagonals that read as
     an engineered triangle; real glitter is a scatter of broken highlights that widens with distance.
     Each ellipse is one band of glints — progressively wider going down, nudged off the centre line so
     the column never lines up perfectly, and blurred so no edge is hard. */
  background-image:
    radial-gradient(10% 6% at 50% 3%, var(--au-path-1, var(--sw-disc-5)) 0 45%, transparent 78%),
    radial-gradient(15% 7% at 47% 14%, var(--au-path-2, var(--sw-disc-4)) 0 42%, transparent 78%),
    radial-gradient(21% 7.5% at 53% 26%, var(--au-path-2, var(--sw-disc-4)) 0 40%, transparent 80%),
    radial-gradient(28% 8% at 46% 39%, var(--au-path-3, var(--sw-disc-3)) 0 38%, transparent 80%),
    radial-gradient(35% 8.5% at 54% 53%, var(--au-path-3, var(--sw-disc-3)) 0 36%, transparent 82%),
    radial-gradient(42% 9% at 48% 68%, var(--au-path-4, var(--sw-disc-2)) 0 34%, transparent 82%),
    radial-gradient(50% 9.5% at 52% 84%, var(--au-path-4, var(--sw-disc-2)) 0 32%, transparent 84%);
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
/* The sky behind the sun: the scene's own sky gradient, full-viewport so its stops line up exactly, masked
   to the sun's disc. Painted after the curtains and before the sun, it hides the lights in the disc's
   footprint, so the gaps between the sun's bands show sky rather than aurora through the sun. The
   centre is where .sw-sun puts it: on the 58% horizon, dipped by a third of its size. */
.au-sunsky {
  position: absolute;
  inset: 0;
  opacity: var(--sw-sun-o, 0);
  background: linear-gradient(
    to bottom,
    var(--au-sky-a) 0%,
    var(--au-sky-b) 30%,
    var(--au-sky-c) 46%,
    var(--au-sky-d) 54%,
    var(--au-sky-e, var(--au-sky-d)) 58%
  );
  -webkit-mask-image: radial-gradient(
    circle calc(var(--sun-size, 38vh) / 2) at var(--sw-disc-x, 50%) calc(58vh - 0.17 * var(--sun-size, 38vh)),
    #000 99%,
    transparent 100%
  );
  mask-image: radial-gradient(
    circle calc(var(--sun-size, 38vh) / 2) at var(--sw-disc-x, 50%) calc(58vh - 0.17 * var(--sun-size, 38vh)),
    #000 99%,
    transparent 100%
  );
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
  /* Flat-topped with soft shoulders: two straight ramps meeting at a point on the waterline drew a crease. */
  background: linear-gradient(
    to bottom,
    transparent 0%,
    color-mix(in oklab, var(--au-glow) 55%, transparent) 24%,
    var(--au-glow) 36%,
    var(--au-glow) 48%,
    color-mix(in oklab, var(--au-glow) 55%, transparent) 62%,
    transparent 100%
  );
  opacity: var(--au-haze-o, 0.75);
}
${stopRules(".au-curtain", ".au-ripples")}`;

// Forest — a coastal redwood forest at sunrise (by night, under the moon), seen from INSIDE it, from a
// hill. Dense is a matter of where you stand, not of how many trees there are: the near ridge holds a few
// giants whose crowns climb out of the top of the frame on bare red trunks, every ridge back holds more,
// smaller trees, and the three nearest ridges leave a CLEARING that is kept under the sun or moon, so you
// look out at the disc through a gap in the giants, with the hill falling away into it. Same grammar as
// dune: AERIAL PERSPECTIVE carries the depth (far ridges sit within a few L of the sky, and each ridge's
// foot dissolves into the fog pooled below it, so there is no horizon LINE anywhere), and the shapes are
// cut, not drawn: dune's corners and lit / slip faces, carried into the trees.
// THE TREES are inline SVG built by a seeded generator, one <svg> per ridge (see ForestRidge for why
// not masks). Every crown is a stack of tiers, each a triangle with a FLAT underside and upper edges that
// SCOOP in, so the green sweeps out to its tips like a drooping bough; each tier overlaps the one below
// by more than half its height, which leaves a DEEP CUT running almost to the trunk between tiers. The
// outline itself stays straight-sided: columnar through the lower crown, then tapering to a spire or, on
// a quarter of the trees (old growth), to a flat top. Trees vary in scoop, in which side reaches further
// and in how strongly their tiers alternate long and short. Every tier splits into two FACETS, off
// the trunk line (each tree TURNED a little toward or away from the viewer), each painted
// between shadow and light by how squarely the disc faces it, so the lighting follows the left / center
// / right placement the way dune's faces follow --du-light. The ground is angular, in straight runs,
// with dune's sand detail in forest form: a lit rim along the near crests, and on the near floor a
// LITTER of wood streaks and duff specks, in browns only; the vertical FURROWS down every trunk splay into
// the buttress.
// Ridge undulations run in WHOLE cycles per tile, and a tree crossing a tile edge simply overlaps the
// next tile (all the tiles sit in one SVG), so each ridge repeats seamlessly; the generator is seeded,
// so server and client draw the identical forest (SSR-safe, like the stars). By day a fan of
// crepuscular RAYS breaks through the fog in the clearing. MOTION is the fog alone: three strips drift on compositor-only translateX
// loops, one tile per loop (seamless), at different speeds for parallax.

/** Seeded PRNG (mulberry32): deterministic, so the forest is the same on every render. */
function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Ridge = {
  seed: number;
  /** Tile width in viewBox units; the tile is 100 units tall and stretched to its element's box. */
  width: number;
  /** Mean ridge line, 0 = top of the element, 100 = bottom. */
  ridge: number;
  /** Ridge undulations as [amplitude, cycles per tile]. Whole cycles keep the tile seamless. */
  roll: [
    number,
    number,
  ][];
  /** A multiple of `layers` on a ridge without an opening: the layers take trees in turn, and any other
   *  count would put tree 0 and tree N−1, neighbours across the tile's wrap, in the same layer, where
   *  they merge. (An opening separates them, so there any count works.) */
  trees: number;
  /** How many layers the trees are dealt into (default 2). Trees in one layer must never overlap, so a
   *  dense ridge, where a tree's crown reaches the one after its neighbour, needs 3. */
  layers?: number;
  /** Tree height range in viewBox units (past 100 a crown climbs out of the top of the frame). */
  height: [
    number,
    number,
  ];
  /** Crown half-width as a fraction of tree height. */
  spread: number;
  /** Stacked tiers per crown. The near trees carry the most: that is the definition a close view has. */
  tiers: number;
  /** Bare trunk below the crown, as a fraction of tree height (0 = crown down to the ground). */
  trunk: number;
  /** Vertical furrows striping each trunk. */
  furrows: number;
  /** A furrow's width in viewBox units: about one screen pixel at this ridge's scale. */
  hair: number;
  /** Each tier casts a shadow band on the tier below (off on the farthest ridge: haze erases it). */
  cast: boolean;
  /** A clearing in the trees, `half` units either side of the tile's middle, kept under the sun / moon:
   *  the ridge is shifted so it sits at the disc. `dip` lowers the ground there, so the hill falls
   *  away toward the view. */
  opening?: {
    half: number;
    dip: number;
  };
  /** Litter on the forest floor (needles, specks, striation), as an opacity; 0 for none. */
  duff: number;
};

type Pt = [
  number,
  number,
];

const f1 = (n: number) => String(Math.round(n * 10) / 10);

/** One closed subpath, always wound clockwise on screen. Every shape in a mask has to wind the same way:
 *  under the default nonzero rule an overlap of opposite windings cancels and punches a hole. */
function poly(pts: Pt[]): string {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
  }
  const ring =
    area < 0
      ? [
          ...pts,
        ].reverse()
      : pts;
  return `M${ring.map(([x, y]) => `${f1(x)} ${f1(y)}`).join("L")}Z`;
}

/** The control point of a quadratic curve from a to b: the chord's midpoint pushed out by `bow` × the
 *  chord length along (vy, -vx), which is the outward side of an edge of a clockwise (on-screen) shape.
 *  A negative bow scoops the edge in. */
function bend(a: Pt, b: Pt, bow: number): Pt {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  return [
    (a[0] + b[0]) / 2 + vy * bow,
    (a[1] + b[1]) / 2 - vx * bow,
  ];
}

/** A curved outline: each segment runs to `to`, as a quadratic curve when it has a control point `via`.
 *  Built clockwise by construction (poly() cannot reorder a curve), so every subpath winds the same way. */
type Seg = {
  to: Pt;
  via?: Pt;
};
const pathOf = (segs: Seg[]) => {
  const at = ([x, y]: Pt) => `${f1(x)} ${f1(y)}`;
  return `M${segs.map((g, i) => (i === 0 ? "" : g.via ? `Q${at(g.via)} ` : "L") + at(g.to)).join("")}Z`;
};
/** How far the right facet reaches under the left one, in viewBox units (about a pixel). */
const SEAM = 0.15;

/** The parts of one LAYER of a ridge, as path data. Each ridge deals its trees into layers in turn (two,
 *  or three on a dense ridge), painted back to front: each part is ONE path, the union of that part
 *  across the layer's trees, with no stacking order inside it, so two overlapping trees sharing a layer
 *  would merge, the back tree's lit facet or trunk showing through the front one and its shadow bands
 *  laying dark bars across it. Dealt in turn, trees in one layer sit two (or three) apart and never
 *  touch, across the tile's repeat too when the count is a multiple of the layers. Back to front within a
 *  layer: the trunks (two halves, rounded edges, furrows), then the crowns (two facets, the cast shadow
 *  of each tier). The halves and facets each paint their own mix of shadow and light, so no separate
 *  silhouette sits under them. */
const LAYER_KEYS = [
  "barkLeft",
  "barkRight",
  "barkEdge",
  "barkGrooves",
  "left",
  "right",
  "cast",
] as const;
type LayerKey = (typeof LAYER_KEYS)[number];
type LayerPaths = Record<LayerKey, string>;
type RidgePaths = {
  ground: string;
  /** The crest as an open line, for the lit rim. */
  rim: string;
  /** The floor's litter, light and dark, each drawn in its own pattern cell [width, height]. */
  litter: string;
  darkLitter: string;
  lightCell: [
    number,
    number,
  ];
  darkCell: [
    number,
    number,
  ];
  layers: LayerPaths[];
};

function forestRidge({
  seed,
  width: w,
  ridge,
  roll,
  trees,
  layers: layerCount = 2,
  height,
  spread,
  tiers,
  trunk,
  furrows,
  hair,
  cast,
  opening,
  duff,
}: Ridge): RidgePaths {
  const rand = mulberry32(seed);
  const phases = roll.map(() => rand() * Math.PI * 2);
  // A ridge with an opening also DIPS there (one whole cycle, lowest at the tile's middle), so the hill
  // falls away toward the clearing and rises at the sides.
  const ridgeY = (x: number) =>
    roll.reduce((y, [amp, cycles], i) => y + amp * Math.sin((2 * Math.PI * cycles * x) / w + phases[i]), ridge) -
    (opening ? opening.dip * Math.cos((2 * Math.PI * x) / w) : 0);
  // The ground is ANGULAR, a dozen straight runs per tile: a smooth sine read as a park lawn. Jitter
  // wraps (point N reuses point 0's), so the tile still repeats seamlessly; it reaches a unit past each
  // tile edge, so neighbouring tiles overlap rather than meeting on an anti-aliased seam.
  const runs = 12;
  const jitter = Array.from(
    {
      length: runs,
    },
    () => (rand() - 0.5) * 3,
  );
  const crest: Pt[] = Array.from(
    {
      length: runs + 1,
    },
    (_, i): Pt => [
      (i * w) / runs,
      ridgeY((i * w) / runs) + jitter[i % runs],
    ],
  );
  const ground = poly([
    [
      -1,
      100,
    ],
    [
      -1,
      crest[0][1],
    ],
    ...crest,
    [
      w + 1,
      crest[runs][1],
    ],
    [
      w + 1,
      100,
    ],
  ]);
  // The crest as an open line, for the lit rim along the top of the ground.
  const rim = `M-1 ${f1(crest[0][1])}${crest.map(([x, y]) => `L${f1(x)} ${f1(y)}`).join("")}L${f1(w + 1)} ${f1(crest[runs][1])}`;
  // Trees stand on the crest as drawn (straight runs), not on the smooth curve under it.
  const groundY = (x: number) => {
    const xx = ((x % w) + w) % w;
    const i = Math.min(runs - 1, Math.floor((xx / w) * runs));
    const f = (xx - crest[i][0]) / (w / runs);
    return crest[i][1] + (crest[i + 1][1] - crest[i][1]) * f;
  };
  const blank = () =>
    Object.fromEntries(
      LAYER_KEYS.map((k) => [
        k,
        "",
      ]),
    ) as LayerPaths;
  const layers = Array.from(
    {
      length: layerCount,
    },
    blank,
  );
  // Trees fill the tile except the opening: they are laid out along the span from the opening's right
  // edge round to its left edge (wrapping across the tile's repeat), so the clearing stays clear.
  const gap = opening ? opening.half * 2 : 0;
  const span = w - gap;
  for (let i = 0; i < trees; i++) {
    const out = layers[i % layerCount];
    const cx = (w / 2 + gap / 2 + ((i + 0.2 + rand() * 0.6) * span) / trees) % w;
    const h = height[0] + (height[1] - height[0]) * rand();
    const hw = h * spread * (0.85 + rand() * 0.3);
    const foot = groundY(cx) + 1.5;
    const crownBase = foot - h * trunk;
    const step = (h * (1 - trunk)) / tiers;
    const lean = (rand() - 0.5) * hw * 0.3;
    // TURNED: the line between the lit and shadow sides runs from the tip down to a point off the trunk
    // axis, up to a third of the width either side. A split straight down the middle read as a flat,
    // symmetric cut-out; off centre, each tree reads as a cone turned toward or away from the viewer.
    const turn = (rand() - 0.5) * 0.66;
    if (trunk > 0) {
      const tw = hw * 0.22;
      const neck = foot - h * 0.05;
      const top = crownBase - step * 1.5; // reaches up inside the lowest tiers, so no gap shows under them
      // A ROUNDED trunk: straight and faintly tapered up the bole, then a CURVED flare into the buttress
      // (half-width as a multiple of tw, top to foot).
      const profile: [
        number,
        number,
      ][] = [
        [
          top,
          0.7,
        ],
        [
          neck,
          1,
        ],
        [
          foot - h * 0.03,
          1.1,
        ],
        [
          foot - h * 0.012,
          1.35,
        ],
        [
          foot,
          1.8,
        ],
      ];
      const halfAt = (y: number) => {
        for (let p = 1; p < profile.length; p++) {
          const [y0, f0] = profile[p - 1];
          const [y1, f1v] = profile[p];
          if (y <= y1) return tw * (f0 + ((f1v - f0) * (y - y0)) / (y1 - y0));
        }
        return tw * 1.8;
      };
      const side = (dir: number, k = 1) =>
        profile.map(
          ([y, f]): Pt => [
            cx + dir * tw * f * k,
            y,
          ],
        );
      // The halves split off centre too, as the crown's facets do.
      const axis = (y: number) => cx + turn * halfAt(y);
      const lEdge = side(-1);
      const rEdge = side(1);
      out.barkLeft += poly([
        ...lEdge,
        ...[
          ...profile,
        ]
          .reverse()
          .map(
            ([y]): Pt => [
              axis(y),
              y,
            ],
          ),
      ]);
      // The two halves make the whole trunk; the right reaches a hair under the left, as the facets do.
      out.barkRight += poly([
        ...profile.map(
          ([y]): Pt => [
            axis(y) - SEAM,
            y,
          ],
        ),
        ...[
          ...rEdge,
        ].reverse(),
      ]);
      // The edges turn away from both the light and the viewer: a darker strip down each side, so with
      // the lit and shadow halves the trunk reads in four bands, a faceted cylinder rather than a board.
      out.barkEdge += poly([
        ...lEdge,
        ...side(-1, 0.72).reverse(),
      ]);
      out.barkEdge += poly([
        ...side(1, 0.72),
        ...[
          ...rEdge,
        ].reverse(),
      ]);
      // FURROWS: redwood bark is deep vertical fibre, so each trunk is striped top to foot with hairline
      // grooves that follow its taper and splay out into the buttress, the way the bark runs into the roots.
      for (let j = 0; j < furrows; j++) {
        const fx = (((j + 0.5) / furrows) * 2 - 1) * 0.8 + (rand() - 0.5) * 0.1;
        const y0 = crownBase + rand() * h * 0.04;
        const y1 = neck + (foot - neck) * (0.2 + rand() * 0.6);
        const edge = (y: number, dx: number): Pt => [
          cx + fx * halfAt(y) + dx,
          y,
        ];
        out.barkGrooves += poly([
          edge(y0, 0),
          edge(neck, 0),
          edge(y1, 0),
          edge(y1, hair * 0.6),
          edge(neck, hair),
          edge(y0, hair),
        ]);
      }
    }
    // Most crowns end in a SPIRE; about a quarter are old growth with a FLAT top, the leader long gone,
    // which is how the oldest redwoods actually stand. Both outlines are STRAIGHT-sided above a columnar
    // lower crown: a convex, domed outline read as puffy, so the curve lives in the branches instead.
    const flatTop = rand() < 0.25;
    const shoulder = flatTop ? 0.55 : 0.42;
    const profile = (t: number) => (t <= shoulder ? 1 : 1 - (flatTop ? 0.55 : 1) * ((t - shoulder) / (1 - shoulder)));
    // Each tree its own: how deep its branches scoop, which side reaches further, and how strongly its
    // tiers alternate long and short (a real crown is uneven where a template repeats).
    const scoop = -(0.07 + rand() * 0.09);
    const reachL = 0.9 + rand() * 0.2;
    const reachR = 1.9 - reachL;
    // The previous (lower) tier's half-width, which bounds this tier's cast shadow.
    let below = hw;
    const alternate = 0.06 + rand() * 0.1;
    for (let k = 0; k < tiers; k++) {
      const t = k / tiers;
      // Each tier rises 2.3 steps, so it overlaps the next tier's base by more than half its own height:
      // that overlap is the DEEP CUT running almost to the trunk between tiers. A flat top's upper tiers
      // squat, so the crown ends blunt instead of in a spire.
      const th = step * 2.3 * (flatTop && t > shoulder ? 0.7 : 1);
      const by = crownBase - k * step;
      const ww = hw * Math.max(0.12, profile(t)) * (1 + (k % 2 ? -alternate : alternate)) * (0.9 + rand() * 0.2);
      const xc = cx + lean * t;
      const apex: Pt = [
        xc,
        by - th,
      ];
      const droop = th * (0.06 + rand() * 0.06);
      const lt: Pt = [
        xc - ww * reachL,
        by + droop,
      ];
      const rt: Pt = [
        xc + ww * reachR,
        by + droop,
      ];
      // A FLAT underside, straight across from tip to tip (an underside rising to a point at the trunk
      // stacked every tier into a column of chevrons, a bow in the middle of every tree), split where
      // the tree is TURNED.
      const split: Pt = [
        xc + turn * ww,
        by + droop,
      ];
      // CURVED GREEN: the upper edges SCOOP in (a negative bow), so each tier sweeps out to its tips like
      // a drooping bough instead of bulging (convex) or cutting straight (a wedge).
      const upR = bend(apex, rt, scoop);
      const upL = bend(lt, apex, scoop);
      // The two FACETS make the whole tier between them. The right one reaches a hair past the split,
      // under the left, so the two never leave an anti-aliased seam.
      out.left += pathOf([
        {
          to: apex,
        },
        {
          to: split,
        },
        {
          to: lt,
        },
        {
          to: apex,
          via: upL,
        },
      ]);
      out.right += pathOf([
        {
          to: [
            apex[0] - SEAM,
            apex[1],
          ],
        },
        {
          to: apex,
        },
        {
          to: rt,
          via: upR,
        },
        {
          to: [
            split[0] - SEAM,
            split[1],
          ],
        },
      ]);
      // CAST SHADOW, the third tone: each tier shades a band of the tier below, just under its own
      // underside, the way dune's crests cast onto the ridge behind. Clipped to the layer's crowns, so
      // under the deep-cut tips it never hangs over sky, and kept to the width the tier below has at that
      // height (about 0.6 of its reach): run out to this tier's tips, a band in a dense ridge reached a
      // neighbour in the same layer and laid a dark bar across its crown. Not on the narrow spire tiers:
      // clipped to a crown that slim, the band was a dark tab on the axis.
      // Only where this tier is about as wide as the one it shades: a narrow spire tier resting on a broad
      // tier cast a short band with square ends floating mid-crown, which read as a dark bar. The ends
      // taper inward, the way a shadow under a cone does, rather than stopping square.
      if (cast && k > 0 && profile(t) > 0.4 && ww > below * 0.75) {
        const d = th * 0.16;
        const x0 = Math.max(lt[0], xc - below * reachL * 0.62);
        const x1 = Math.min(rt[0], xc + below * reachR * 0.62);
        const taper = (x1 - x0) * 0.2;
        out.cast += poly([
          [
            x0,
            lt[1],
          ],
          [
            x1,
            rt[1],
          ],
          [
            x1 - taper,
            rt[1] + d,
          ],
          [
            x0 + taper,
            lt[1] + d,
          ],
        ]);
      }
      below = ww;
    }
  }
  // LITTER on the forest floor, dune's grains and striation in redwood form: wood streaks running with
  // the slope and specks of duff, in browns only (light and deep, never the scene's teal ink). Two
  // patterns, as dune runs two striation passes at different periods: the light litter in cells a
  // twelfth of the tile wide and 23 units tall, the dark in cells a seventh wide and 17 tall. Both
  // widths divide the tile, so each repeats a whole number of times per tile; because the two grids
  // never line up, neither reads as rows. (One small cell made its strokes line up across the screen.)
  const lightCell: [
    number,
    number,
  ] = [
    w / 12,
    23,
  ];
  const darkCell: [
    number,
    number,
  ] = [
    w / 7,
    17,
  ];
  let litter = "";
  let darkLitter = "";
  const dash = (
    [cw, ch]: [
      number,
      number,
    ],
    len: number,
    slant: number,
    thick: number,
  ) => {
    const x = rand() * (cw - len);
    const y = 0.5 + rand() * (ch - 1);
    const a = (rand() - 0.5) * slant;
    return poly([
      [
        x,
        y,
      ],
      [
        x + Math.cos(a) * len,
        y + Math.sin(a) * len,
      ],
      [
        x + Math.cos(a) * len,
        y + Math.sin(a) * len + thick * 0.5,
      ],
      [
        x,
        y + thick,
      ],
    ]);
  };
  if (duff > 0) {
    // Duff specks. (No needles: short dashes at every slant read as green pine needles scattered on the
    // floor; the floor is wood and duff, so its marks are the streaks below.)
    for (let n = 0; n < 26; n++) {
      const x = 0.3 + rand() * (darkCell[0] - 0.6);
      const y = 0.3 + rand() * (darkCell[1] - 0.6);
      const r = 0.12 + rand() * 0.14;
      darkLitter += poly([
        [
          x - r,
          y,
        ],
        [
          x,
          y - r,
        ],
        [
          x + r,
          y,
        ],
        [
          x,
          y + r,
        ],
      ]);
    }
    // WOOD STREAKS, dune's striation in forest form: strokes at a slight slant, from slivers to longer
    // grain, never the width of a cell (a line that ran the full cell repeated edge to edge, ruled like
    // notebook paper: dune's own warning about contour lines).
    for (let n = 0; n < 22; n++) litter += dash(lightCell, lightCell[0] * (0.06 + rand() * 0.3), 0.1, 0.11 + rand() * 0.06);
    for (let n = 0; n < 16; n++) darkLitter += dash(darkCell, darkCell[0] * (0.05 + rand() * 0.22), 0.1, 0.11 + rand() * 0.06);
  }
  return {
    ground,
    rim,
    litter,
    darkLitter,
    lightCell,
    darkCell,
    layers,
  };
}

/* Five ridges, far → near, and the perspective is what makes the forest DENSE: not more trees but
   closer ones. The near ridge holds a few giants whose crowns climb out of the top of the frame, and
   each ridge back has more, smaller trees with fewer tiers. `vh` is the ridge's share of the viewport,
   so a tile is vh × width / 100 vh wide and the trees keep their proportions at any viewport. */
const FOREST_RIDGES = [
  {
    cls: "fo-r0",
    vh: 50,
    spec: {
      seed: 11,
      width: 240,
      ridge: 22,
      roll: [
        [
          1.6,
          2,
        ],
        [
          0.8,
          5,
        ],
      ],
      trees: 34,
      height: [
        16,
        30,
      ],
      spread: 0.22,
      tiers: 4,
      trunk: 0,
      furrows: 0,
      hair: 0.2,
      cast: false,
      duff: 0,
    },
  },
  {
    cls: "fo-r1",
    vh: 54,
    spec: {
      seed: 23,
      width: 230,
      ridge: 34,
      roll: [
        [
          2,
          2,
        ],
        [
          1,
          4,
        ],
      ],
      trees: 24,
      layers: 3,
      height: [
        24,
        42,
      ],
      spread: 0.22,
      tiers: 6,
      trunk: 0,
      furrows: 0,
      hair: 0.2,
      cast: true,
      duff: 0,
    },
  },
  {
    cls: "fo-r2",
    vh: 62,
    spec: {
      seed: 37,
      width: 210,
      ridge: 50,
      roll: [
        [
          2.4,
          1,
        ],
        [
          1.2,
          3,
        ],
      ],
      trees: 16,
      layers: 3,
      height: [
        38,
        60,
      ],
      spread: 0.2,
      tiers: 8,
      trunk: 0.12,
      furrows: 3,
      hair: 0.18,
      cast: true,
      opening: {
        half: 10,
        dip: 1.5,
      },
      duff: 0,
    },
  },
  {
    cls: "fo-r3",
    vh: 80,
    spec: {
      seed: 41,
      width: 230,
      ridge: 72,
      roll: [
        [
          1.6,
          2,
        ],
      ],
      trees: 10,
      layers: 3,
      height: [
        80,
        104,
      ],
      spread: 0.16,
      tiers: 12,
      trunk: 0.26,
      furrows: 5,
      hair: 0.15,
      cast: true,
      opening: {
        half: 18,
        dip: 3,
      },
      duff: 0.5,
    },
  },
  {
    cls: "fo-r4",
    vh: 100,
    spec: {
      seed: 59,
      width: 260,
      ridge: 88,
      roll: [
        [
          1.2,
          2,
        ],
      ],
      trees: 4,
      height: [
        125,
        150,
      ],
      spread: 0.16,
      tiers: 14,
      trunk: 0.34,
      furrows: 9,
      hair: 0.13,
      cast: true,
      opening: {
        half: 46,
        dip: 5,
      },
      duff: 0.9,
    },
  },
] satisfies {
  cls: string;
  vh: number;
  spec: Ridge;
}[];

/** What each part is painted with, as a CSS colour (it reaches the SVG through stop-color, so it reads
 *  the ridge's palette variables and follows the light/dark flip). Facets and trunk halves mix shadow
 *  toward light by how squarely the disc faces them (--fo-lit-l / --fo-lit-r, set inline from the sun /
 *  moon placement), the way dune's faces follow --du-light. */
const LIT = (side: "l" | "r", shade: string, lit: string) =>
  `color-mix(in oklch, var(${shade}), var(${lit}) calc(var(--fo-lit-${side}, ${side === "l" ? 0 : 1}) * 100%))`;
const PART_PAINT: Record<LayerKey | "ground", string> = {
  ground: "var(--fo-earth)",
  barkLeft: LIT("l", "--fo-bk", "--fo-bkl"),
  barkRight: LIT("r", "--fo-bk", "--fo-bkl"),
  barkEdge: "var(--fo-bark-shade)",
  barkGrooves: "color-mix(in oklch, var(--fo-bk), var(--fo-furrow) 60%)",
  left: LIT("l", "--fo-c", "--fo-cl"),
  right: LIT("r", "--fo-c", "--fo-cl"),
  cast: "var(--fo-shade)",
};

const FOREST_PATHS = FOREST_RIDGES.map(({ spec }) => forestRidge(spec));

/** Tiles per ridge: enough to cover a viewport up to 5× as wide as it is tall, plus one. */
const tilesFor = (vh: number, width: number) => Math.ceil(500 / ((vh * width) / 100)) + 1;

/** One ridge as an inline SVG. The tile is drawn once in <defs> and placed side by side with <use>;
 *  each part is filled with a vertical gradient that holds its paint down the forested slope below the
 *  ridge line and then dissolves into the valley fog by --fo-pool. Inline SVG rather than CSS masks
 *  (the other scenes' tool) because a theme flip only refills these paths: as 63 full-viewport masked
 *  layers, every one re-composited its mask on each flip and the switch took ~1.2s against dune's
 *  ~0.2s. The cast shadow is clipped to its layer's two facets, the crowns, so under the deep-cut tips
 *  it never hangs over sky. A ridge with an OPENING is shifted so its clearing (the middle of its third
 *  tile) sits under the sun / moon, wherever the placement control puts it: you look out at the disc
 *  through a gap in the giants. */
function ForestRidge({ index }: { index: number }) {
  const { cls, vh, spec } = FOREST_RIDGES[index];
  const { ground, rim, litter, darkLitter, lightCell, darkCell, layers } = FOREST_PATHS[index];
  const before = spec.opening ? 2 : 0;
  const tiles = tilesFor(vh, spec.width) + before;
  const unit = vh / 100; // one viewBox unit, in vh
  /* Per INSTANCE, not just per ridge: url(#…) resolves to the first matching id in the document, so a
     second forest on the page (the /backdrop route over the site's own background) would otherwise paint
     with the first one's gradients, lit for the first one's sun placement. */
  const scope = useId().replace(/[^\w-]/g, "");
  const id = (part: string) => `${scope}fo-${index}-${part}`;
  const fill = (part: string) => `url(#${id(part)})`;
  return (
    <svg
      className={`fo-ridge ${cls}`}
      viewBox={`0 0 ${spec.width * tiles} 100`}
      preserveAspectRatio="none"
      style={{
        height: `${vh}vh`,
        width: `${spec.width * tiles * unit}vh`,
        left: spec.opening ? `calc(var(--sw-disc-x, 50%) - ${(before + 0.5) * spec.width * unit}vh)` : 0,
      }}
      aria-hidden="true"
    >
      <defs>
        {(Object.keys(PART_PAINT) as (keyof typeof PART_PAINT)[]).map((part) => (
          <linearGradient key={part} id={id(part)} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
            <stop
              offset={`${spec.ridge + 4}%`}
              style={{
                stopColor: PART_PAINT[part],
              }}
            />
            <stop
              offset={`${Math.min(100, spec.ridge + 18)}%`}
              style={{
                // The floor shades to a deeper brown below its crest, and the trunks fade toward that
                // brown floor they stand in; the crowns fade into the valley fog by --fo-pool.
                stopColor:
                  part === "ground"
                    ? "color-mix(in oklch, var(--fo-earth), var(--fo-earth-deep) 45%)"
                    : `color-mix(in oklch, ${PART_PAINT[part]}, ${part.startsWith("bark") ? "var(--fo-earth)" : "var(--fo-fog)"} var(--fo-pool, 70%))`,
              }}
            />
          </linearGradient>
        ))}
        {spec.duff > 0 && (
          <>
            <pattern id={id("litter")} patternUnits="userSpaceOnUse" width={lightCell[0]} height={lightCell[1]}>
              <path
                d={litter}
                style={{
                  fill: "color-mix(in oklch, var(--fo-earth), var(--fo-duff-hi) 40%)",
                }}
              />
            </pattern>
            <pattern id={id("dark-litter")} patternUnits="userSpaceOnUse" width={darkCell[0]} height={darkCell[1]}>
              <path
                d={darkLitter}
                style={{
                  fill: "color-mix(in oklch, var(--fo-earth), var(--fo-earth-deep) 75%)",
                }}
              />
            </pattern>
          </>
        )}
        {layers.map((layer, l) => (
          <clipPath key={l} id={id(`crowns-${l}`)}>
            <path d={layer.left} />
            <path d={layer.right} />
          </clipPath>
        ))}
        <g id={id("tile")}>
          <path d={ground} fill={fill("ground")} />
          {spec.duff > 0 && <path d={ground} fill={fill("dark-litter")} opacity={spec.duff} />}
          {spec.duff > 0 && <path d={ground} fill={fill("litter")} opacity={spec.duff} />}
          {/* The lit rim along the crest, dune's crest-rim twin as a stroke: only on the floors with litter
              (the near hill and the ridge behind it), and kept close to the brown. On every ridge, at
              full strength, the rims drew pale contour lines across the whole floor. */}
          {spec.duff > 0 && (
            <path
              d={rim}
              fill="none"
              strokeWidth={spec.hair * 2.5}
              style={{
                stroke: "color-mix(in oklch, var(--fo-earth), var(--fo-duff-hi) 30%)",
              }}
            />
          )}
          {layers.flatMap((layer, l) =>
            LAYER_KEYS.filter((key) => layer[key]).map((key) => (
              <path key={`${l}-${key}`} d={layer[key]} fill={fill(key)} clipPath={key === "cast" ? `url(#${id(`crowns-${l}`)})` : undefined} />
            )),
          )}
        </g>
      </defs>
      {Array.from(
        {
          length: tiles,
        },
        (_, k) => (
          <use key={k} href={`#${id("tile")}`} x={k * spec.width} />
        ),
      )}
    </svg>
  );
}

const FOREST_STYLES = `
[data-pattern="forest"] {
  /* DAY — SUNRISE in the fog. The sky runs from a dusty blue zenith through lavender and rose into a
     warm gold band at the treeline, chroma kept low the way a hazy dawn is; the top three stops take
     the theme cast like the other day skies. */
  --sw-cast: min(calc(var(--glass-tint-c, 0.018) * 250%), 16%);
  --fo-sky-a: ${tintCast(0.66, 0.06, 252, 0.055)};
  --fo-sky-b: ${tintCast(0.76, 0.05, 298, 0.045)};
  --fo-sky-c: ${tintCast(0.83, 0.05, 345, 0.045)};
  --fo-sky-d: oklch(0.87 0.06 45); /* peach — authored from here down, or the cast muddies the dawn */
  --fo-sky-e: oklch(0.9 0.07 72); /* the gold band the sun rises out of */
  /* Ridges, far → near, each a SHADOW / LIT pair (the two facets of every tier): lavender haze to a
     fog-softened blue-green in shadow, warming toward a sunlit yellow-green on the lit facets as the
     ridges approach, the way low sun only reads on what is close. Light-mode type is set for a LIGHT page
     and the hero copy sits right on these ridges, which in this close view means on the giants' crowns:
     so even the nearest shadow facet stays at L 0.58, a step above dune's middle tiers. The marine layer is the excuse, and it is the true one: coastal
     redwoods at dawn photograph pale. */
  --fo-r0: oklch(0.8 0.03 320);
  --fo-r0-lit: oklch(0.85 0.035 20);
  --fo-r1: oklch(0.74 0.036 305);
  --fo-r1-lit: oklch(0.8 0.035 70);
  --fo-r2: oklch(0.67 0.04 278);
  --fo-r2-lit: oklch(0.76 0.045 100);
  --fo-r3: oklch(0.64 0.04 230);
  --fo-r3-lit: oklch(0.75 0.055 115);
  --fo-r4: oklch(0.58 0.045 195);
  --fo-r4-lit: oklch(0.72 0.07 125);
  --fo-shade: oklch(0.3 0.06 200 / 0.32); /* the cast-shadow glaze: lit green → mid, shadow green → deep */
  --fo-duff-hi: oklch(0.93 0.05 72); /* what lit litter and the crest rim lean toward: low sun on duff */
  --fo-bark-shade: oklch(0.24 0.06 30 / 0.45);
  --fo-furrow: oklch(0.3 0.08 30); /* what a trunk furrow cuts toward: deep red-brown, not the teal ink */
  /* Forest floor, far → near: BROWN at every distance, a stylistic choice over realism. The trees fade
     into the haze; the floor stays duff, lighter and warmer far off, deeper up close, and shades to
     --fo-earth-deep below each crest instead of dissolving into the fog. */
  --fo-r0-earth: oklch(0.64 0.055 58);
  --fo-r1-earth: oklch(0.6 0.06 55);
  --fo-r2-earth: oklch(0.56 0.065 52);
  --fo-r3-earth: oklch(0.52 0.07 50);
  --fo-r4-earth: oklch(0.47 0.07 48);
  --fo-earth-deep: oklch(0.36 0.06 42);
  /* Redwood bark: the red-brown that names the tree, fogged back on the farther ridges. */
  --fo-r2-bark: oklch(0.62 0.04 38);
  --fo-r2-bark-lit: oklch(0.71 0.05 48);
  --fo-r3-bark: oklch(0.6 0.05 35);
  --fo-r3-bark-lit: oklch(0.7 0.065 48);
  --fo-r4-bark: oklch(0.56 0.065 33); /* L 0.56, not darker: the giants' trunks stand behind the hero copy */
  --fo-r4-bark-lit: oklch(0.68 0.085 45);
  --fo-fog: oklch(0.91 0.035 55); /* the marine layer, lit warm by the low sun */
  --fo-fog-a: oklch(0.93 0.03 60 / 0.5);
  --fo-glow: oklch(0.92 0.09 75 / 0.6); /* the haze bloom around the sun */
  --fo-ray: oklch(0.97 0.06 82 / 0.16);
  --fo-rays-o: 1;
  /* daytime SUN — the shared outrun disc on the horizon, behind every ridge. Sun ramp as dune's: the
     accent at the bottom of the disc, mixing to a warm yellow crown. */
  --sw-sun-o: 1;
  --sw-moon-o: 0;
  --sw-sun-d: block;
  --sw-moon-d: none;
  --sun-size: 40vh;
  --fo-disc-y: 51.2vh; /* the disc's centre: 58vh horizon - 0.17 × 40vh (the sun dips 33% below it) */
  --sun-h: var(--accent-h, var(--glass-tint-h, 35));
  --sw-disc-1: oklch(0.6 0.21 var(--sun-h));
  --sw-disc-2: color-mix(in oklch, oklch(0.68 0.2 var(--sun-h)), oklch(0.74 0.18 48) 30%);
  --sw-disc-3: color-mix(in oklch, oklch(0.76 0.18 var(--sun-h)), oklch(0.82 0.17 66) 58%);
  --sw-disc-4: color-mix(in oklch, oklch(0.85 0.15 var(--sun-h)), oklch(0.89 0.15 80) 80%);
  --sw-disc-5: oklch(0.94 0.13 94);
  --sw-disc-glow: oklch(0.82 0.16 var(--sun-h) / 0.45);
  --sw-stars-o: 0;
}
.dark [data-pattern="forest"] {
  /* NIGHT — the same ridges under a cold moon: navy sky, silver fog, and the ladder compressed toward
     black so the far ridges still sit just under the sky's value. */
  --fo-sky-a: oklch(0.09 0.035 262);
  --fo-sky-b: oklch(0.12 0.045 266);
  --fo-sky-c: oklch(0.16 0.05 272);
  --fo-sky-d: oklch(0.21 0.05 276);
  --fo-sky-e: oklch(0.25 0.045 270);
  --fo-r0: oklch(0.24 0.042 272);
  --fo-r0-lit: oklch(0.28 0.042 266);
  --fo-r1: oklch(0.2 0.04 268);
  --fo-r1-lit: oklch(0.255 0.04 262);
  --fo-r2: oklch(0.16 0.036 262);
  --fo-r2-lit: oklch(0.235 0.04 258);
  --fo-r3: oklch(0.125 0.03 250);
  --fo-r3-lit: oklch(0.21 0.04 250);
  --fo-r4: oklch(0.095 0.024 230);
  --fo-r4-lit: oklch(0.185 0.035 245); /* moonlit facets: cool, lifted just enough to keep the cut */
  --fo-shade: oklch(0.02 0.01 250 / 0.45);
  --fo-duff-hi: oklch(0.34 0.035 55); /* moonlight on the floor: dimmer, and still brown */
  --fo-bark-shade: oklch(0.02 0.01 30 / 0.5);
  --fo-furrow: oklch(0.06 0.02 30);
  /* Brown at night too (it was blue-violet far off): moonlit duff, darker near. */
  --fo-r0-earth: oklch(0.21 0.028 50);
  --fo-r1-earth: oklch(0.19 0.027 48);
  --fo-r2-earth: oklch(0.17 0.026 46);
  --fo-r3-earth: oklch(0.14 0.024 45);
  --fo-r4-earth: oklch(0.12 0.022 44);
  --fo-earth-deep: oklch(0.08 0.016 40);
  --fo-r2-bark: oklch(0.16 0.02 262);
  --fo-r2-bark-lit: oklch(0.21 0.025 258);
  --fo-r3-bark: oklch(0.14 0.02 260);
  --fo-r3-bark-lit: oklch(0.19 0.025 255);
  --fo-r4-bark: oklch(0.12 0.02 30);
  --fo-r4-bark-lit: oklch(0.18 0.025 250);
  --fo-fog: oklch(0.32 0.04 268);
  --fo-fog-a: oklch(0.5 0.035 268 / 0.3);
  --fo-glow: oklch(0.6 0.05 262 / 0.35);
  /* No rays at night: a moon is too dim to throw shafts through fog, and a fan at its rim read as a
     starburst. */
  --fo-rays-o: 0;
  --sw-sun-o: 0;
  --sw-moon-o: 1;
  --sw-sun-d: none;
  --sw-moon-d: block;
  /* Low enough that the tallest spires cross its lower edge: the moon rises BEHIND the forest. */
  --moon-size: 30vh;
  --moon-bottom: 47%;
  --moon-dip: 0%;
  --fo-disc-y: 38vh; /* the moon's centre: bottom edge at 53vh, minus half of 30vh */
  --sw-moon-1: oklch(0.95 0.015 255);
  --sw-moon-2: oklch(0.85 0.035 262);
  --sw-moon-3: oklch(0.72 0.06 270);
  --sw-maria: 0.64 0.05 268;
  --sw-disc-glow: oklch(0.82 0.05 262 / 0.45);
  --sw-stars-o: 1;
}
.fo-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(
    to bottom,
    var(--fo-sky-a) 0%,
    var(--fo-sky-b) 26%,
    var(--fo-sky-c) 40%,
    var(--fo-sky-d) 50%,
    var(--fo-sky-e) 56%,
    var(--fo-fog) 64%
  );
}
/* A ridge: an inline SVG (see ForestRidge), anchored to the bottom left and as wide as its tiles. The
   scene clips whatever runs past the right edge. Its parts take their colours from the vars below. The
   facets and trunk halves mix shadow toward light by the placement, the cast shadow is a translucent
   glaze (one band reads as a mid green on a lit facet and a deep green on a shadow facet), and the trunk
   furrows are the bark tone pushed toward a deep red-brown. The forest floor is its own earthy duff brown. The
   fog pool fades each part to the valley fog below its ridge line (the nearest ridge has none: it runs
   down to the bottom of the screen, and fogging it out there read as snow). */
.fo-ridge {
  position: absolute;
  left: 0;
  bottom: 0;
  display: block;
  overflow: visible;
}
${FOREST_RIDGES.map(
  ({ cls }) => `.${cls} {
  --fo-c: var(--${cls});
  --fo-cl: var(--${cls}-lit);
  --fo-bk: var(--${cls}-bark);
  --fo-bkl: var(--${cls}-bark-lit);
  --fo-earth: var(--${cls}-earth);
}`,
).join("\n")}
.fo-r3 {
  --fo-pool: 50%; /* less fog under the near-middle ridge: at 70% its floor read as snow between the giants */
}
.fo-r4 {
  --fo-pool: 0%;
}
/* The bloom around the disc, over the far ridges: aerial perspective is brightest toward the light. */
.fo-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(70vh 26vh at var(--sw-disc-x, 50%) calc(var(--fo-disc-y) + 6vh), var(--fo-glow) 0%, transparent 100%);
}
/* Crepuscular RAYS through the fog: two repeating conic fans at co-prime periods, so the beams fall at
   irregular spacing rather than as a ruled sunburst, faded with distance from the disc and shown only
   BELOW it. A shaft needs something to shade it and haze to show in, which is the fogbound forest; a
   fan across open sky is a poster's sunburst. */
.fo-rays {
  position: absolute;
  inset: 0;
  opacity: var(--fo-rays-o, 1);
  background:
    repeating-conic-gradient(from 3deg at var(--sw-disc-x, 50%) var(--fo-disc-y), var(--fo-ray) 0deg, transparent 1.6deg 5.3deg),
    repeating-conic-gradient(from 1deg at var(--sw-disc-x, 50%) var(--fo-disc-y), var(--fo-ray) 0deg, transparent 2.4deg 8.9deg);
  -webkit-mask-image:
    radial-gradient(64vh 52vh at var(--sw-disc-x, 50%) var(--fo-disc-y), transparent 0%, #000 22%, transparent 100%),
    linear-gradient(to bottom, transparent calc(var(--fo-disc-y) + 2vh), #000 calc(var(--fo-disc-y) + 14vh));
  -webkit-mask-composite: source-in;
  mask-image:
    radial-gradient(64vh 52vh at var(--sw-disc-x, 50%) var(--fo-disc-y), transparent 0%, #000 22%, transparent 100%),
    linear-gradient(to bottom, transparent calc(var(--fo-disc-y) + 2vh), #000 calc(var(--fo-disc-y) + 14vh));
  mask-composite: intersect;
}
/* FOG — strips of long, soft billows that drift one tile per loop (seamless), each overhanging the
   viewport by a tile per side. Same GEOMETRY RULE as the cloud decks: every ellipse stays inside its
   tile (cx ± rx within 0–100%) or it clips to a hard edge that repeats with the tile. */
.fo-fog {
  position: absolute;
  left: calc(-1 * var(--fo-ft));
  right: calc(-1 * var(--fo-ft));
  background-repeat: repeat-x;
  background-size: var(--fo-ft) 100%;
  animation: fo-drift calc(var(--pat-dur, 8s) * var(--fo-fk)) linear infinite;
  will-change: var(--pat-wc, transform);
}
@keyframes fo-drift {
  from { transform: translateX(0); }
  to   { transform: translateX(var(--fo-ft)); }
}
.fo-fog-a {
  top: 55%;
  height: 14%;
  --fo-ft: 150vh;
  --fo-fk: 12;
  background-image:
    radial-gradient(34% 30% at 36% 56%, var(--fo-fog-a) 0 18%, transparent 80%),
    radial-gradient(18% 22% at 78% 48%, var(--fo-fog-a) 0 16%, transparent 78%),
    linear-gradient(to bottom, transparent 0, var(--fo-fog-a) 60%, transparent 100%);
}
/* The two strips that cross the floor are thinner than the far one, so the floor stays brown under
   them: pale fog laid across it at full strength washed the duff out to beige. */
.fo-fog-b {
  opacity: 0.55;
  top: 62%;
  height: 18%;
  --fo-ft: 190vh;
  --fo-fk: 8;
  background-image:
    radial-gradient(30% 32% at 30% 52%, var(--fo-fog-a) 0 18%, transparent 80%),
    radial-gradient(22% 26% at 72% 58%, var(--fo-fog-a) 0 16%, transparent 78%),
    linear-gradient(to bottom, transparent 0, var(--fo-fog-a) 58%, transparent 100%);
}
.fo-fog-c {
  opacity: 0.4;
  top: 70%;
  height: 20%;
  --fo-ft: 230vh;
  --fo-fk: 5.5;
  background-image:
    radial-gradient(36% 34% at 40% 54%, var(--fo-fog-a) 0 16%, transparent 80%),
    radial-gradient(14% 22% at 86% 48%, var(--fo-fog-a) 0 14%, transparent 76%),
    linear-gradient(to bottom, transparent 0, var(--fo-fog-a) 62%, transparent 100%);
}
${stopRules(".fo-fog")}`;

// Peaks — an alpine range at SUNRISE (by night, under the moon), seen down a valley that runs toward the
// disc. Four ridges recede by aerial perspective; each is open in the middle, wider the nearer it is, so
// their slopes converge on the far range's COL, where the sun or moon rises. Like forest's ridges, each is
// one inline SVG (a theme flip refills paths; it re-composites no masks), anchored on the disc placement
// so the valley follows it. Every peak is two FACETS split down an arête from its summit, and the facet
// facing the disc takes the light (--pk-lit-l / --pk-lit-r, inline from the placement); the far ranges
// carry snow caps split the same way. Motion is two valley fog banks drifting one tile per loop, on
// compositor-only transforms, stopped by stopRules. Nothing tilts in 3D and nothing is filtered: a
// rotated plane is what made synthwave's floor a WebKit layer in every picker (see `preview`).

type PeakSpec = {
  /** The SVG's top edge, in vh from the top of the scene; the ridge runs from there to the bottom. */
  top: number;
  /** The valley floor (the far range's col), in vh below `top`. */
  floor: number;
  /** Half-width of the valley opening, in vh: the ridge stays at its floor this far either side. */
  open: number;
  /** Mean peak spacing, in vh. */
  spacing: number;
  /** How far a summit can fall short of the crest line, 0–1. */
  rough: number;
  /** Snow-cap depth as a fraction of a summit's rise above its higher saddle; 0 for none. */
  snow: number;
  /** How far a face dissolves into the valley fog toward the bottom, 0–1. */
  pool: number;
  seed: number;
};

/** A ridge's width, in vh, centred on the disc: the valley may sit anywhere from 26% to 74% across a
 *  window up to 5× as wide as it is tall, and the ridge still reaches both edges. */
const PEAK_W = 750;

const PEAK_RIDGES: PeakSpec[] = [
  {
    top: 16,
    floor: 40,
    open: 9,
    spacing: 30,
    rough: 0.5,
    snow: 0.42,
    pool: 0.45,
    seed: 11,
  },
  {
    top: 34,
    floor: 32,
    open: 22,
    spacing: 34,
    rough: 0.45,
    snow: 0.26,
    pool: 0.5,
    seed: 23,
  },
  {
    top: 46,
    floor: 30,
    open: 40,
    spacing: 40,
    rough: 0.4,
    snow: 0,
    pool: 0.4,
    seed: 37,
  },
  {
    top: 56,
    floor: 36,
    open: 64,
    spacing: 52,
    rough: 0.35,
    snow: 0,
    pool: 0,
    seed: 51,
  },
];

/** One ridge's facets and snow caps as SVG paths, in vh, from its spec. Deterministic, so the range is
 *  the same on the server and the client. */
function peakRidge({ top, floor, open, spacing, rough, snow, seed }: PeakSpec) {
  const h = 100 - top;
  const rand = mulberry32(seed);
  const mid = PEAK_W / 2;
  // The crest line: the valley floor inside the opening, rising smoothly to 2vh under the top.
  const crest = (x: number) => {
    const t = Math.min(1, Math.max(0, (Math.abs(x - mid) - open) / (open * 1.6 + 8)));
    return floor + (2 - floor) * t * t * (3 - 2 * t);
  };
  const summits: Pt[] = [];
  for (let x = rand() * spacing * 0.5; x < PEAK_W; x += spacing * (0.7 + rand() * 0.6)) {
    const c = crest(x);
    summits.push([
      x,
      Math.min(h - 3, c + rough * rand() * (h - c) * 0.35),
    ]);
  }
  // A saddle between neighbours, lower than both by a share of their spacing; the ends close at the edges.
  const saddles: Pt[] = [
    [
      0,
      Math.min(h - 1, summits[0][1] + spacing * 0.3),
    ],
  ];
  for (let i = 1; i < summits.length; i++) {
    const [a, b] = [
      summits[i - 1],
      summits[i],
    ];
    saddles.push([
      a[0] + (b[0] - a[0]) * (0.35 + rand() * 0.3),
      Math.min(h - 1, Math.max(a[1], b[1]) + (b[0] - a[0]) * (0.18 + rand() * 0.22)),
    ]);
  }
  saddles.push([
    PEAK_W,
    Math.min(h - 1, summits[summits.length - 1][1] + spacing * 0.3),
  ]);
  // A crag part-way along a flank, pushed off the straight line so the profile breaks.
  const crag = (from: Pt, to: Pt): Pt => {
    const f = 0.35 + rand() * 0.3;
    const [dx, dy] = [
      to[0] - from[0],
      to[1] - from[1],
    ];
    const k = (rand() - 0.5) * 0.16;
    return [
      from[0] + dx * f - dy * k,
      from[1] + dy * f + dx * k,
    ];
  };
  // Where a flank (summit → crag → saddle) first drops to depth y.
  const cross = (flank: Pt[], y: number): Pt => {
    for (let i = 1; i < flank.length; i++) {
      const [a, b] = [
        flank[i - 1],
        flank[i],
      ];
      if (b[1] >= y) {
        const t = (y - a[1]) / (b[1] - a[1] || 1);
        return [
          a[0] + (b[0] - a[0]) * t,
          y,
        ];
      }
    }
    return flank[flank.length - 1];
  };
  const left: string[] = [];
  const right: string[] = [];
  const snowLeft: string[] = [];
  const snowRight: string[] = [];
  // The whole ridge line, for the shadowed body every facet sits on.
  const line: Pt[] = [
    saddles[0],
  ];
  summits.forEach((s, i) => {
    const [sl, sr] = [
      saddles[i],
      saddles[i + 1],
    ];
    const [cl, cr] = [
      crag(sl, s),
      crag(s, sr),
    ];
    line.push(cl, s, cr, sr);
    // The arête runs down from the summit to just below the shoulders, where the two facets meet the
    // body. Carried to the foot of the ridge it split every peak into a pair of crystal shards.
    const end: Pt = [
      Math.min(sr[0] - 2, Math.max(sl[0] + 2, s[0] + (rand() - 0.5) * spacing * 0.3)),
      Math.min(h - 1, s[1] + (Math.max(sl[1], sr[1]) - s[1]) * (1.1 + rand() * 0.5)),
    ];
    left.push(
      poly([
        sl,
        cl,
        s,
        end,
      ]),
    );
    right.push(
      poly([
        s,
        cr,
        sr,
        end,
      ]),
    );
    const depth = snow * (Math.min(sl[1], sr[1]) - s[1]);
    if (depth < 1.5) return;
    const y = s[1] + depth * (0.8 + rand() * 0.4);
    const [xl, xr] = [
      cross(
        [
          s,
          cl,
          sl,
        ],
        y,
      ),
      cross(
        [
          s,
          cr,
          sr,
        ],
        y,
      ),
    ];
    const split: Pt = [
      s[0] + (end[0] - s[0]) * Math.min(1, (y - s[1]) / (end[1] - s[1])),
      y + depth * 0.15,
    ];
    // The snow line's lower edge dips below the level in two places on each side, never above it, so the
    // cap stays inside the rock it lies on.
    const dips = (from: Pt, to: Pt): Pt[] =>
      [
        1 / 3,
        2 / 3,
      ].map((f) => [
        from[0] + (to[0] - from[0]) * f,
        y + rand() * depth * 0.35,
      ]);
    snowLeft.push(
      poly([
        xl,
        ...(cl[1] < y
          ? [
              cl,
            ]
          : []),
        s,
        split,
        ...dips(split, xl),
      ]),
    );
    snowRight.push(
      poly([
        s,
        ...(cr[1] < y
          ? [
              cr,
            ]
          : []),
        xr,
        ...dips(xr, split),
        split,
      ]),
    );
  });
  const body = poly([
    [
      0,
      h,
    ],
    ...line,
    [
      PEAK_W,
      h,
    ],
  ]);
  return {
    h,
    body,
    left: left.join(""),
    right: right.join(""),
    snowLeft: snowLeft.join(""),
    snowRight: snowRight.join(""),
  };
}

const PEAK_PATHS = PEAK_RIDGES.map(peakRidge);

/** A facet's paint: its shadow tone mixed toward its lit tone by how squarely the disc faces that side.
 *  In OKLab, not OKLCH: the shadows are cool and the light warm, nearly opposite hues, and an OKLCH mix
 *  turns the hue through green on the way, so a half-lit facet came out olive. */
const PEAK_LIT = (side: "l" | "r", shade: string, lit: string) =>
  `color-mix(in oklab, var(${shade}), var(${lit}) calc(var(--pk-lit-${side}, ${side === "l" ? 0 : 1}) * 100%))`;

/** One ridge as an inline SVG, its valley centred on the disc. The body is the shadow tone, dissolving
 *  into the valley fog toward the foot by the ridge's `pool`; the summits' two facets sit on it, the one
 *  facing the disc lit (dawn light reaches the tops first), and snow keeps its colour. */
function PeakRidge({ index }: { index: number }) {
  const spec = PEAK_RIDGES[index];
  const { h, body, left, right, snowLeft, snowRight } = PEAK_PATHS[index];
  // Per instance: url(#…) resolves to the first matching id in the document (see ForestRidge).
  const scope = useId().replace(/[^\w-]/g, "");
  const id = (part: string) => `${scope}pk-${index}-${part}`;
  const faces = [
    [
      "body",
      body,
      `var(--pk-r${index})`,
    ],
    [
      "left",
      left,
      PEAK_LIT("l", `--pk-r${index}`, `--pk-r${index}-lit`),
    ],
    [
      "right",
      right,
      PEAK_LIT("r", `--pk-r${index}`, `--pk-r${index}-lit`),
    ],
  ] as const;
  return (
    <svg
      className={`pk-ridge pk-r${index}`}
      viewBox={`0 0 ${PEAK_W} ${h}`}
      preserveAspectRatio="none"
      style={{
        height: `${h}vh`,
        width: `${PEAK_W}vh`,
        left: `calc(var(--sw-disc-x, 50%) - ${PEAK_W / 2}vh)`,
      }}
      aria-hidden="true"
    >
      <defs>
        {faces.map(([part, , paint]) => (
          <linearGradient key={part} id={id(part)} gradientUnits="userSpaceOnUse" x1="0" y1={spec.floor * 0.5} x2="0" y2={h}>
            <stop
              offset="0"
              style={{
                stopColor: paint,
              }}
            />
            <stop
              offset="1"
              style={{
                stopColor: `color-mix(in oklab, ${paint}, var(--pk-fog) ${spec.pool * 100}%)`,
              }}
            />
          </linearGradient>
        ))}
      </defs>
      {faces.map(([part, d]) => (
        <path key={part} d={d} fill={`url(#${id(part)})`} />
      ))}
      {snowLeft ? (
        <path
          d={snowLeft}
          style={{
            fill: PEAK_LIT("l", "--pk-snow", "--pk-snow-lit"),
          }}
        />
      ) : null}
      {snowRight ? (
        <path
          d={snowRight}
          style={{
            fill: PEAK_LIT("r", "--pk-snow", "--pk-snow-lit"),
          }}
        />
      ) : null}
    </svg>
  );
}

const PEAKS_STYLES = `
[data-pattern="peaks"] {
  /* DAY — SUNRISE over the range. A clear, cold zenith warming through lavender and rose to a gold band
     at the col; the top three stops take the theme cast like the other day skies. The ridges run from a
     pale violet haze far off to a deeper slate up close, their lit facets warming toward alpenglow, and
     stay light enough (the nearest shadow at L 0.56) for dark text on a light page. */
  --sw-cast: min(calc(var(--glass-tint-c, 0.018) * 250%), 16%);
  --pk-sky-a: ${tintCast(0.6, 0.08, 255, 0.07)};
  --pk-sky-b: ${tintCast(0.73, 0.06, 285, 0.05)};
  --pk-sky-c: ${tintCast(0.82, 0.06, 335, 0.05)};
  --pk-sky-d: oklch(0.88 0.065 40);
  --pk-sky-e: oklch(0.91 0.075 72);
  --pk-r0: oklch(0.77 0.035 290);
  --pk-r0-lit: oklch(0.86 0.05 25);
  --pk-r1: oklch(0.7 0.042 275);
  --pk-r1-lit: oklch(0.8 0.05 40);
  --pk-r2: oklch(0.63 0.048 258);
  --pk-r2-lit: oklch(0.75 0.045 52);
  --pk-r3: oklch(0.56 0.05 238);
  --pk-r3-lit: oklch(0.69 0.045 58);
  --pk-snow: oklch(0.88 0.03 275);
  --pk-snow-lit: oklch(0.97 0.03 45);
  --pk-fog: oklch(0.9 0.035 60);
  --pk-fog-a: oklch(0.93 0.03 62 / 0.55);
  --pk-glow: oklch(0.93 0.09 75 / 0.55);
  --sw-sun-o: 1;
  --sw-moon-o: 0;
  --sw-sun-d: block;
  --sw-moon-d: none;
  --sun-size: 34vh;
  --pk-disc-y: 52.2vh; /* the sun's centre: 58vh horizon - 0.17 × 34vh; the col hides its lower third */
  --sun-h: var(--accent-h, var(--glass-tint-h, 35));
  --sw-disc-1: oklch(0.6 0.21 var(--sun-h));
  --sw-disc-2: color-mix(in oklch, oklch(0.68 0.2 var(--sun-h)), oklch(0.74 0.18 48) 30%);
  --sw-disc-3: color-mix(in oklch, oklch(0.76 0.18 var(--sun-h)), oklch(0.82 0.17 66) 58%);
  --sw-disc-4: color-mix(in oklch, oklch(0.85 0.15 var(--sun-h)), oklch(0.89 0.15 80) 80%);
  --sw-disc-5: oklch(0.94 0.13 94);
  --sw-disc-glow: oklch(0.82 0.16 var(--sun-h) / 0.45);
  --sw-stars-o: 0;
}
.dark [data-pattern="peaks"] {
  /* NIGHT — the range under the moon: navy sky, moonlit snow, the ridge ladder compressed toward black. */
  --pk-sky-a: oklch(0.09 0.035 262);
  --pk-sky-b: oklch(0.12 0.045 266);
  --pk-sky-c: oklch(0.16 0.05 272);
  --pk-sky-d: oklch(0.2 0.05 276);
  --pk-sky-e: oklch(0.24 0.045 270);
  --pk-r0: oklch(0.25 0.04 270);
  --pk-r0-lit: oklch(0.31 0.045 262);
  --pk-r1: oklch(0.2 0.038 266);
  --pk-r1-lit: oklch(0.26 0.042 258);
  --pk-r2: oklch(0.155 0.034 260);
  --pk-r2-lit: oklch(0.215 0.04 252);
  --pk-r3: oklch(0.11 0.028 250);
  --pk-r3-lit: oklch(0.17 0.034 245);
  --pk-snow: oklch(0.4 0.03 265);
  --pk-snow-lit: oklch(0.6 0.035 255);
  --pk-fog: oklch(0.28 0.04 268);
  --pk-fog-a: oklch(0.46 0.035 268 / 0.3);
  --pk-glow: oklch(0.6 0.05 262 / 0.35);
  --sw-sun-o: 0;
  --sw-moon-o: 1;
  --sw-sun-d: none;
  --sw-moon-d: block;
  /* Risen clear of the col, in the gap between the far peaks. */
  --moon-size: 24vh;
  --moon-bottom: 41%;
  --moon-dip: 0%;
  --pk-disc-y: 47vh;
  --sw-moon-1: oklch(0.95 0.015 255);
  --sw-moon-2: oklch(0.85 0.035 262);
  --sw-moon-3: oklch(0.72 0.06 270);
  --sw-maria: 0.64 0.05 268;
  --sw-disc-glow: oklch(0.82 0.05 262 / 0.45);
  --sw-stars-o: 1;
}
.pk-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(
    to bottom,
    var(--pk-sky-a) 0%,
    var(--pk-sky-b) 24%,
    var(--pk-sky-c) 38%,
    var(--pk-sky-d) 48%,
    var(--pk-sky-e) 56%,
    var(--pk-fog) 66%
  );
}
.pk-ridge {
  position: absolute;
  bottom: 0;
  display: block;
  overflow: visible;
}
/* The bloom around the disc, over the far range: brightest toward the light. */
.pk-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(64vh 24vh at var(--sw-disc-x, 50%) calc(var(--pk-disc-y) + 4vh), var(--pk-glow) 0%, transparent 100%);
}
/* VALLEY FOG — soft banks drifting one tile per loop (seamless), each overhanging the viewport by a tile
   per side; every ellipse stays inside its tile, or it clips to an edge that repeats. Banks only: forest's
   continuous band under them ruled a stripe straight across the mountain faces. */
.pk-fog {
  position: absolute;
  left: calc(-1 * var(--pk-ft));
  right: calc(-1 * var(--pk-ft));
  background-repeat: repeat-x;
  background-size: var(--pk-ft) 100%;
  animation: pk-drift calc(var(--pat-dur, 8s) * var(--pk-fk)) linear infinite;
  will-change: var(--pat-wc, transform);
}
@keyframes pk-drift {
  from { transform: translateX(0); }
  to   { transform: translateX(var(--pk-ft)); }
}
.pk-fog-a {
  top: 58%;
  height: 14%;
  --pk-ft: 160vh;
  --pk-fk: 11;
  background-image:
    radial-gradient(30% 48% at 34% 56%, var(--pk-fog-a) 0 14%, transparent 78%),
    radial-gradient(18% 40% at 76% 50%, var(--pk-fog-a) 0 12%, transparent 76%);
}
.pk-fog-b {
  opacity: 0.6;
  top: 70%;
  height: 16%;
  --pk-ft: 210vh;
  --pk-fk: 7;
  background-image:
    radial-gradient(28% 46% at 28% 52%, var(--pk-fog-a) 0 14%, transparent 78%),
    radial-gradient(20% 40% at 70% 56%, var(--pk-fog-a) 0 12%, transparent 76%);
}
${stopRules(".pk-fog")}`;

// Meadow — rolling grass hills on a clear morning (by night, under the moon). Four ranges of hills recede
// by aerial perspective, from a hazy blue-green far off to a deep green up close, the nearest fringed with
// grass along its crest. Each range is ONE periodic tile of hill, used as a CSS mask and repeated across a
// strip centred on the disc (as peaks' ridges are), with a dip at every tile's centre, so the sun or moon
// sits in a saddle between the far hills wherever the placement puts it. The light comes from the disc:
// each hill glows toward it (a radial wash centred on the disc), carries a lighter crest rim (dune's
// technique: the same mask, nudged up, behind the fill), and shades toward its foot. Motion is two bands
// of cumulus drifting across the sky on compositor-only transforms, stopped by stopRules. Nothing tilts
// in 3D and nothing is filtered (see `preview`).

type HillSpec = {
  /** The hill strip's top edge, in vh from the top of the scene; it runs from there to the bottom. */
  top: number;
  /** The crest line's mean depth below `top`, in vh. */
  crest: number;
  /** How far the crest rolls above and below that line, in vh. */
  amp: number;
  /** How much deeper the saddle at the tile's centre (under the disc) sits, in vh. */
  dip: number;
  /** Grass blade height along the crest, in vh; 0 for none. */
  grass: number;
  seed: number;
};

/** One tile of hill, in vh, repeated across the strip; it divides the strip so a tile is centred on it. */
const MEADOW_TILE = 150;
/** The strip's width, in vh, centred on the disc: as peaks' ridges, wide enough for a 5:1 window. */
const MEADOW_W = 750;

const MEADOW_HILLS: HillSpec[] = [
  {
    top: 44,
    crest: 10,
    amp: 4,
    dip: 7,
    grass: 0,
    seed: 7,
  },
  {
    top: 54,
    crest: 9,
    amp: 4.5,
    dip: 5,
    grass: 0,
    seed: 19,
  },
  {
    top: 64,
    crest: 8,
    amp: 5,
    dip: 4,
    grass: 0,
    seed: 29,
  },
  {
    top: 74,
    crest: 7,
    amp: 6,
    dip: 3,
    grass: 1.4,
    seed: 43,
  },
];

/** A hill tile's silhouette as an SVG mask, in vh. The crest is a sum of three sines that each complete
 *  whole cycles across the tile, plus a saddle at its centre that has died away by the edges, so the tile
 *  ends at the height it starts at and repeats without a step. Deterministic, so server and client agree. */
function meadowHill({ top, crest, amp, dip, grass, seed }: HillSpec) {
  const w = MEADOW_TILE;
  const h = 100 - top;
  const rand = mulberry32(seed);
  const phase = [
    rand(),
    rand(),
    rand(),
  ].map((r) => r * Math.PI * 2);
  const crestAt = (x: number) =>
    crest +
    amp *
      (0.55 * Math.sin((2 * Math.PI * x) / w + phase[0]) +
        0.3 * Math.sin((4 * Math.PI * x) / w + phase[1]) +
        0.15 * Math.sin((6 * Math.PI * x) / w + phase[2])) +
    dip * Math.exp(-(((x - w / 2) / (w / 8)) ** 2));
  const n = 48;
  const pts: Pt[] = Array.from(
    {
      length: n + 1,
    },
    (_, i) => [
      (w * i) / n,
      crestAt((w * i) / n),
    ],
  );
  const mid = (a: Pt, b: Pt): Pt => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];
  // Through the midpoints with each sample as the control point: a smooth roll with no corners.
  let d = `M0 ${f1(h)}L0 ${f1(pts[0][1])}L${f1(mid(pts[0], pts[1])[0])} ${f1(mid(pts[0], pts[1])[1])}`;
  for (let i = 1; i < n; i++) {
    const m = mid(pts[i], pts[i + 1]);
    d += `Q${f1(pts[i][0])} ${f1(pts[i][1])} ${f1(m[0])} ${f1(m[1])}`;
  }
  d += `L${w} ${f1(pts[n][1])}L${w} ${f1(h)}Z`;
  // Grass: thin leaning blades rooted just below the crest, kept clear of the tile's edges so none is cut.
  const blades: string[] = [];
  if (grass > 0) {
    for (let x = 0.6; x < w - 0.6; x += 0.42 + rand() * 0.26) {
      const root = crestAt(x) + 0.35;
      const half = 0.16 + rand() * 0.08;
      blades.push(
        poly([
          [
            x - half,
            root,
          ],
          [
            x + (rand() - 0.5) * 0.7,
            root - grass * (0.55 + rand() * 0.75),
          ],
          [
            x + half,
            root,
          ],
        ]),
      );
    }
  }
  return {
    h,
    mask: svgMask(`<path d='${d}${blades.join("")}'/>`, `0 0 ${w} ${h}`),
  };
}

const MEADOW_PATHS = MEADOW_HILLS.map(meadowHill);

const MEADOW_STYLES = `
[data-pattern="meadow"] {
  /* DAY — a clear morning. A deep blue zenith opening to a pale, slightly warm horizon; the top stops take
     the theme cast like the other day skies. The hills run from a hazy blue-green far off to a deep green
     up close, their lit sides warming toward a sunlit yellow-green, and stay light enough (the nearest
     shadow at L 0.58) for dark text on a light page. */
  --sw-cast: min(calc(var(--glass-tint-c, 0.018) * 250%), 16%);
  --mw-sky-a: ${tintCast(0.66, 0.09, 240, 0.08)};
  --mw-sky-b: ${tintCast(0.78, 0.065, 228, 0.06)};
  --mw-sky-c: oklch(0.87 0.045 210);
  --mw-sky-d: oklch(0.92 0.045 92);
  --mw-haze: oklch(0.9 0.035 130);
  --mw-h0: oklch(0.79 0.04 178);
  --mw-h0-lit: oklch(0.87 0.055 115);
  --mw-h1: oklch(0.72 0.065 160);
  --mw-h1-lit: oklch(0.83 0.085 118);
  --mw-h2: oklch(0.65 0.085 150);
  --mw-h2-lit: oklch(0.78 0.105 122);
  --mw-h3: oklch(0.58 0.1 145);
  --mw-h3-lit: oklch(0.73 0.125 128);
  --mw-rim-to: oklch(0.96 0.05 100); /* what a crest rim leans toward: low sun on grass tips */
  --mw-rim-mix: 24%;
  --mw-foot-far: oklch(0.9 0.035 130 / 0.6);
  --mw-foot-near: oklch(0.32 0.07 150 / 0.4);
  --mw-cloud: oklch(0.985 0.008 230 / 0.92);
  --mw-cloud-lo: oklch(0.88 0.02 235 / 0.85);
  --mw-cloud-o: 1;
  --sw-sun-o: 1;
  --sw-moon-o: 0;
  --sw-sun-d: block;
  --sw-moon-d: none;
  --sun-size: 34vh;
  --sun-h: var(--accent-h, var(--glass-tint-h, 35));
  --sw-disc-1: oklch(0.6 0.21 var(--sun-h));
  --sw-disc-2: color-mix(in oklch, oklch(0.68 0.2 var(--sun-h)), oklch(0.74 0.18 48) 30%);
  --sw-disc-3: color-mix(in oklch, oklch(0.76 0.18 var(--sun-h)), oklch(0.82 0.17 66) 58%);
  --sw-disc-4: color-mix(in oklch, oklch(0.85 0.15 var(--sun-h)), oklch(0.89 0.15 80) 80%);
  --sw-disc-5: oklch(0.94 0.13 94);
  --sw-disc-glow: oklch(0.85 0.14 var(--sun-h) / 0.42);
  --sw-stars-o: 0;
}
.dark [data-pattern="meadow"] {
  /* NIGHT — the same hills under the moon: navy sky, dark blue-green hills, faint moonlit crests. */
  --mw-sky-a: oklch(0.09 0.035 262);
  --mw-sky-b: oklch(0.12 0.045 266);
  --mw-sky-c: oklch(0.16 0.05 272);
  --mw-sky-d: oklch(0.21 0.05 268);
  --mw-haze: oklch(0.25 0.04 240);
  --mw-h0: oklch(0.25 0.035 215);
  --mw-h0-lit: oklch(0.31 0.04 210);
  --mw-h1: oklch(0.2 0.04 190);
  --mw-h1-lit: oklch(0.27 0.045 185);
  --mw-h2: oklch(0.16 0.045 170);
  --mw-h2-lit: oklch(0.22 0.05 168);
  --mw-h3: oklch(0.12 0.045 158);
  --mw-h3-lit: oklch(0.18 0.05 158);
  --mw-rim-to: oklch(0.45 0.04 225);
  --mw-rim-mix: 20%;
  --mw-foot-far: oklch(0.25 0.04 240 / 0.5);
  --mw-foot-near: oklch(0.04 0.02 160 / 0.5);
  --mw-cloud: oklch(0.42 0.025 260 / 0.55);
  --mw-cloud-lo: oklch(0.3 0.025 262 / 0.5);
  --mw-cloud-o: 0.6;
  --sw-sun-o: 0;
  --sw-moon-o: 1;
  --sw-sun-d: none;
  --sw-moon-d: block;
  /* Risen just above the far hills' saddle. */
  --moon-size: 22vh;
  --moon-bottom: 45%;
  --moon-dip: 0%;
  --sw-moon-1: oklch(0.95 0.015 255);
  --sw-moon-2: oklch(0.85 0.035 262);
  --sw-moon-3: oklch(0.72 0.06 270);
  --sw-maria: 0.64 0.05 268;
  --sw-disc-glow: oklch(0.82 0.05 240 / 0.45);
  --sw-stars-o: 1;
}
.mw-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(
    to bottom,
    var(--mw-sky-a) 0%,
    var(--mw-sky-b) 26%,
    var(--mw-sky-c) 44%,
    var(--mw-sky-d) 54%,
    var(--mw-haze) 64%
  );
}
/* A range of hills: a strip MEADOW_W wide centred on the disc, masked by its repeating tile. */
.mw-hill {
  position: absolute;
  bottom: 0;
  width: ${MEADOW_W}vh;
  left: calc(var(--sw-disc-x, 50%) - ${MEADOW_W / 2}vh);
  height: var(--mw-hh);
  -webkit-mask: var(--mw-m) 0 0 / ${MEADOW_TILE}vh 100% repeat-x;
  mask: var(--mw-m) 0 0 / ${MEADOW_TILE}vh 100% repeat-x;
}
${MEADOW_PATHS.map(
  ({ h, mask }, i) => `.mw-h${i} {
  --mw-hh: ${h}vh;
  --mw-m: ${mask};
  --mw-c: var(--mw-h${i});
  --mw-cl: var(--mw-h${i}-lit);
  --mw-crest: ${MEADOW_HILLS[i].crest}vh;
  --mw-foot: var(${i < 2 ? "--mw-foot-far" : "--mw-foot-near"});
}`,
).join("\n")}
/* The crest rim: the hill's own silhouette in a lighter tone, nudged up behind the fill so only a sliver
   shows along the top. Kept faint and thin: at 0.35vh and a 45% mix every crest read as an outline. */
.mw-rim {
  background: color-mix(in oklab, var(--mw-cl), var(--mw-rim-to) var(--mw-rim-mix, 24%));
  transform: translateY(-0.25vh);
}
/* The face: brightest toward the disc (an ellipse centred on the strip, which is centred on the disc, at
   the crest's height), its own shadow tone away from it, and shading toward the foot. Mixed in OKLab: the
   shadow tones are cool and the light warm, and an OKLCH blend would swing the hue between them. */
.mw-fill {
  background:
    linear-gradient(to bottom, transparent 35%, var(--mw-foot) 100%),
    radial-gradient(110vh 34vh at 50% var(--mw-crest) in oklab, var(--mw-cl) 0%, var(--mw-c) 100%);
}
/* CUMULUS — puffs drifting one tile per loop (seamless), each strip overhanging the viewport by a tile
   per side; every ellipse stays inside its tile, or it clips to an edge that repeats. */
.mw-cloud {
  position: absolute;
  left: calc(-1 * var(--mw-ct));
  right: calc(-1 * var(--mw-ct));
  background-repeat: repeat-x;
  background-size: var(--mw-ct) 100%;
  opacity: var(--mw-cloud-o, 1);
  animation: mw-drift calc(var(--pat-dur, 8s) * var(--mw-ck)) linear infinite;
  will-change: var(--pat-wc, transform);
}
@keyframes mw-drift {
  from { transform: translateX(0); }
  to   { transform: translateX(var(--mw-ct)); }
}
.mw-cloud-a {
  top: 8%;
  height: 14%;
  --mw-ct: 150vh;
  --mw-ck: 16;
  background-image:
    radial-gradient(7% 34% at 18% 58%, var(--mw-cloud) 0 55%, transparent 74%),
    radial-gradient(6% 42% at 23% 46%, var(--mw-cloud) 0 55%, transparent 74%),
    radial-gradient(7% 32% at 28% 60%, var(--mw-cloud) 0 55%, transparent 74%),
    radial-gradient(14% 22% at 23% 74%, var(--mw-cloud-lo) 0 50%, transparent 72%),
    radial-gradient(5% 30% at 66% 52%, var(--mw-cloud) 0 55%, transparent 74%),
    radial-gradient(6% 38% at 71% 42%, var(--mw-cloud) 0 55%, transparent 74%),
    radial-gradient(5% 28% at 76% 56%, var(--mw-cloud) 0 55%, transparent 74%),
    radial-gradient(11% 20% at 71% 70%, var(--mw-cloud-lo) 0 50%, transparent 72%);
}
.mw-cloud-b {
  top: 25%;
  height: 10%;
  --mw-ct: 115vh;
  --mw-ck: 11;
  background-image:
    radial-gradient(5% 34% at 38% 56%, var(--mw-cloud) 0 55%, transparent 74%),
    radial-gradient(5% 44% at 42% 44%, var(--mw-cloud) 0 55%, transparent 74%),
    radial-gradient(5% 32% at 46% 58%, var(--mw-cloud) 0 55%, transparent 74%),
    radial-gradient(10% 22% at 42% 72%, var(--mw-cloud-lo) 0 50%, transparent 72%),
    radial-gradient(4% 30% at 86% 54%, var(--mw-cloud) 0 55%, transparent 74%),
    radial-gradient(4% 38% at 89% 44%, var(--mw-cloud) 0 55%, transparent 74%),
    radial-gradient(7% 20% at 88% 70%, var(--mw-cloud-lo) 0 50%, transparent 72%);
}
${stopRules(".mw-cloud")}`;

// Shipit — an ocean liner steaming across the open sea at sunset (by night, under the moon, its windows lit
// yellow). THE SEA is eight rows of swell receding to the horizon by aerial perspective, from a pale, hazy
// blue at the skyline to a deep blue up close. Each row is ONE periodic tile of waves (peaked crests over
// broad troughs, each leaning a little), used as a CSS mask and repeated across the scene; the near rows are
// taller and longer than the far ones, and the gaps between rows widen toward the viewer, so the sea
// compresses toward the horizon as a real one does. The upper part of every crest catches the light (a cap
// drawn inside the wave, thickest at its tip), and the caps brighten toward the disc in a band that widens
// toward the viewer: the sun's or the moon's glitter path, made of nothing but lit crests.
// THE LINER is an inline SVG from a seeded generator, as forest's and peaks' ridges are: a four-funnel liner
// in profile with a black hull over a red boot-topping band and a white superstructure, buff funnels with
// black tops and the steam pipes up their fronts (smoke from the forward three; the fourth only ventilated),
// lifeboats in their davits, two masts and their wire, and rows of portholes and windows. By day the
// windows are dark glass; by night most of them are lit, in runs as cabins are, haloed, and streaking the
// water below. It carries its own wake, bow wave, waterline foam and broken reflection, so nothing on the
// sea has to move.
// MOTION is the liner alone, crossing the whole scene on a compositor-only transform, always sailing toward
// the disc (east when it is on the right or centred, west when it is on the left). Still, it rests a third
// of the way in from the side it sails from, and the loop is phased so a scene set moving sails on from
// exactly that pose. Nothing is filtered, nothing tilts in 3D, and its paint is a still child of the box
// that moves (see .au-paint).

type SwellSpec = {
  /** The row's highest crest, in vh from the top of the scene; the row runs from there to the bottom. */
  top: number;
  /** The tallest crest's height above the troughs, in vh. */
  amp: number;
  /** The mean wavelength, in vh. */
  wave: number;
  /** The repeating tile's width, in vh. It holds a whole number of waves, so it ends where it starts. */
  tile: number;
  seed: number;
};

const SEA_ROWS: SwellSpec[] = [
  {
    top: 58.3,
    amp: 0.3,
    wave: 2.2,
    tile: 29,
    seed: 3,
  },
  {
    top: 59.1,
    amp: 0.42,
    wave: 3.1,
    tile: 37,
    seed: 5,
  },
  {
    top: 60.4,
    amp: 0.6,
    wave: 4.4,
    tile: 43,
    seed: 13,
  },
  {
    top: 62.3,
    amp: 0.85,
    wave: 6.2,
    tile: 53,
    seed: 17,
  },
  {
    top: 65,
    amp: 1.2,
    wave: 8.8,
    tile: 67,
    seed: 31,
  },
  {
    top: 68.8,
    amp: 1.65,
    wave: 12.4,
    tile: 83,
    seed: 41,
  },
  {
    top: 74.2,
    amp: 2.3,
    wave: 17.5,
    tile: 107,
    seed: 47,
  },
  {
    top: 82,
    amp: 3.2,
    wave: 24.5,
    tile: 139,
    seed: 59,
  },
];

/** Hundredths: a far row's waves are a few tenths of a vh tall, and tenths would step them. */
const f2 = (n: number) => String(Math.round(n * 100) / 100);

/** One row's tile, in vh: the wave line as a mask (everything below it), and the lit caps of its crests as a
 *  second mask. A wave is a raised cosine sharpened to a peak, its crest pushed off-centre so the faces are
 *  unequal, with a little chop that vanishes at the troughs. The troughs ride a long, low swell that runs
 *  whole cycles across the tile (without it every row stood on a ruled line, a row of scallops), and every
 *  wave starts and ends on it, so the waves join smoothly and the tile repeats without a step. Deterministic. */
function swellRow({ top, amp, wave, tile, seed }: SwellSpec) {
  const h = 100 - top;
  const rand = mulberry32(seed);
  const n = Math.max(2, Math.round(tile / wave));
  const share = Array.from(
    {
      length: n,
    },
    () => 0.75 + rand() * 0.5,
  );
  const total = share.reduce((a, b) => a + b, 0);
  /** How deep a cap reaches into its crest, at the tip. */
  const cap = 0.1 + amp * 0.4;
  const [cycles, phase] = [
    1 + Math.floor(rand() * 2),
    rand() * Math.PI * 2,
  ];
  const swell = (x: number) => (amp * 0.32 * (1 - Math.cos((2 * Math.PI * cycles * x) / tile + phase))) / 2;
  const line: Pt[] = [];
  const caps: string[] = [];
  let x0 = 0;
  for (const s of share) {
    const w = (s / total) * tile;
    const a = amp * (0.4 + 0.6 * rand() ** 0.7);
    const lean = -(0.2 + rand() * 0.25);
    const chop = (rand() - 0.5) * 0.16;
    const m = 16;
    const samples = Array.from(
      {
        length: m,
      },
      (_, j) => {
        const u = j / m;
        const g = ((1 - Math.cos(2 * Math.PI * (u + lean * u * (1 - u)))) / 2) ** 1.7;
        return {
          pt: [
            x0 + w * u,
            Math.max(0.02, amp - a * g + amp * chop * Math.sin(6 * Math.PI * u) + swell(x0 + w * u)),
          ] as Pt,
          g,
        };
      },
    );
    for (const { pt } of samples) line.push(pt);
    // The cap: the crest line on top, and under it the same line pushed down by a depth that is greatest at
    // the tip and nothing where the crest falls below 30% of its height.
    const upper = samples.filter(({ g }) => g > 0.3);
    if (upper.length > 2 && a > amp * 0.6) {
      caps.push(
        poly([
          ...upper.map(({ pt }) => pt),
          ...[
            ...upper,
          ]
            .reverse()
            .map(
              ({ pt, g }): Pt => [
                pt[0],
                pt[1] + cap * ((g - 0.3) / 0.7) ** 0.75,
              ],
            ),
        ]),
      );
    }
    x0 += w;
  }
  const at = ([x, y]: Pt) => `${f2(x)} ${f2(y)}`;
  const d = `M0 ${f2(h)}L${line.map(at).join("L")}L${f2(tile)} ${f2(line[0][1])}L${f2(tile)} ${f2(h)}Z`;
  const viewBox = `0 0 ${f2(tile)} ${f2(h)}`;
  return {
    h,
    mask: svgMask(`<path d='${d}'/>`, viewBox),
    caps: svgMask(`<path d='${caps.join("")}'/>`, viewBox),
  };
}

const SEA_PATHS = SEA_ROWS.map(swellRow);

/** Every ship is drawn in the same units, about a metre each at the liner's scale: a unit is SHIP_SU vh on
 *  screen whichever ship it is, so the wake, the foam, the windows and the reflection's strokes are the same
 *  size under all of them, and a ship's length on screen is its length in units. Screen y runs down, from the
 *  waterline at 0, and every ship is drawn heading east (a west-bound crossing mirrors it in CSS). */
const SHIP_SU = 64 / 270;
/** Where the middle of the hull rests when the scene is still: this share of the scene's width in from the
 *  side the ship sails from. */
const SHIP_REST = 0.32;
/** The waterline, in vh from the top of the scene: 6vh below the horizon, so a ship's upperworks stand
 *  against the sky and its hull against the sea. */
const SHIP_WATERLINE = 65;
/** One crossing, in loops of the scene's pace (--pat-dur): 80s at the default 8s. */
const SHIP_LOOP = 10;

type ShipFrame = {
  /** Hull length, stern (0) to stem, in units. */
  len: number;
  /** The painting's box: past the bow (its spray, or a bowsprit), above the highest smoke or masthead, and
   *  down to the reflection's foot. Its left edge is worked out (frameOf). */
  right: number;
  top: number;
  bottom: number;
};

/** A ship's box, with its left edge past the end of the wake, placed so the middle of the hull sits
 *  (1 - SHIP_REST) of the way across the box. Carried from just off one side of the scene to just off the
 *  other, such a box puts the hull SHIP_REST of the way across the scene at SHIP_REST of the way through the
 *  loop, at EVERY scene width: so the still pose is one transform, the same for every ship, and the loop is
 *  phased to start from it (see .sh-ship). */
function frameOf(f: ShipFrame) {
  const left = (f.len / 2 - (1 - SHIP_REST) * f.right) / SHIP_REST;
  return {
    ...f,
    left,
    w: f.right - left,
    h: f.bottom - f.top,
  };
}

/** One path of a ship's drawing: painted by a class (its colour a palette variable) or by one of the ship's
 *  gradients, optionally faded by one of the water masks, optionally shown only at night, optionally inside
 *  a group with classes of its own (`wrap`: the lights that switch on and off), and optionally drawn only
 *  when the ship sails one way (`only`: anything that has to read the right way round when mirrored). */
type Ink = {
  d: string;
  cls?: string;
  grad?: string;
  mask?: "down" | "aft" | "bow";
  night?: boolean;
  wrap?: string;
  only?: "east" | "west";
};
/** A linear gradient a ship paints with, x1 y1 → x2 y2: in the drawing's units when `user`, else across each
 *  shape's own box. Stops are [offset, colour, opacity?]. */
type Grad = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  user?: boolean;
  stops: [
    number,
    string,
    number?,
  ][];
};
type Puff = {
  cx: number;
  cy: number;
  r: number;
  o: number;
};
type ShipArt = {
  frame: ReturnType<typeof frameOf>;
  grads: Grad[];
  smoke: Puff[];
  /** Back to front. */
  inks: Ink[];
  /** Running lights: white lamps, and the green starboard light. */
  lamps: Pt[];
  green: Pt;
  /** Where the wake's fade runs (x, from → to), and the bow wave's arm's. */
  aft: [
    number,
    number,
  ];
  bow: [
    number,
    number,
  ];
};

const shipRect = (x: number, y: number, w: number, h: number) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}Z`;
const shipAt = ([x, y]: Pt) => `${f1(x)} ${f1(y)}`;

/** A strip between h0 and h1 above a sheer line, from x0 to x1, sampled so it follows the curve. */
function sheerBand(sheer: (x: number) => number, x0: number, x1: number, h0: number, h1: number): string {
  const xs: number[] = [];
  for (let x = x0; x < x1; x += 6) xs.push(x);
  xs.push(x1);
  return poly([
    ...xs.map(
      (x): Pt => [
        x,
        -(sheer(x) + h1),
      ],
    ),
    ...[
      ...xs,
    ]
      .reverse()
      .map(
        (x): Pt => [
          x,
          -(sheer(x) + h0),
        ],
      ),
  ]);
}

/** A hull: up the stern's profile from the waterline, along the sheer, and down the stem. */
function hullOf(sternX: (h: number) => number, bowX: (h: number) => number, sheer: (x: number) => number, len: number): string {
  const [hs, hb] = [
    sheer(0),
    sheer(len),
  ];
  const along: Pt[] = [];
  for (let x = 6; x < len - 4; x += 6)
    along.push([
      x,
      -sheer(x),
    ]);
  return poly([
    ...Array.from(
      {
        length: 17,
      },
      (_, i): Pt => [
        sternX((hs * i) / 16),
        -(hs * i) / 16,
      ],
    ),
    ...along,
    [
      bowX(hb),
      -hb,
    ],
    [
      bowX(0),
      0,
    ],
  ]);
}

/** A band right across the hull between two heights above the waterline (a boot-topping, a copper bottom),
 *  its ends on the stern's and the stem's profiles. */
function hullBand(sternX: (h: number) => number, bowX: (h: number) => number, h0: number, h1: number): string {
  const hm = (h0 + h1) / 2;
  return poly([
    [
      sternX(h0),
      -h0,
    ],
    [
      sternX(hm),
      -hm,
    ],
    [
      sternX(h1),
      -h1,
    ],
    [
      bowX(h1),
      -h1,
    ],
    [
      bowX(hm),
      -hm,
    ],
    [
      bowX(h0),
      -h0,
    ],
  ]);
}

/** A mast (or a pole), raked aft, tapering from `base` to `top` (heights above the waterline). */
function mastOf(x: number, base: number, top: number, w = 0.9, rake = 0.045) {
  const xAt = (h: number) => x - rake * (h - base);
  return {
    xAt,
    top: [
      xAt(top),
      -top,
    ] as Pt,
    d: poly([
      [
        xAt(base) - w / 2,
        -base,
      ],
      [
        xAt(base) + w / 2,
        -base,
      ],
      [
        xAt(top) + w * 0.3,
        -top,
      ],
      [
        xAt(top) - w * 0.3,
        -top,
      ],
    ]),
  };
}

/** Smoke streaming aft from a funnel's top and rising as it thins. */
function smokeFrom(rand: () => number, [x0, y0]: Pt, puffs: number, size: number, strength: number): Puff[] {
  return Array.from(
    {
      length: puffs,
    },
    (_, k) => ({
      cx: x0 - 0.5 - k * 4.6 * size - k ** 1.4 * 0.4 + (rand() - 0.5) * 1.2,
      cy: y0 - 1.2 * size - k * 0.75 * size - rand() * 0.6,
      r: (2.4 + k * 0.8 + rand() * 0.6) * size,
      o: strength * (1 - k / (puffs + 0.5)) ** 1.2,
    }),
  );
}

type WinRow = {
  /** Centre height above the sheer line (negative: down the side of the hull). */
  h: number;
  x0: number;
  x1: number;
  step: number;
  /** Window width and height. */
  w: number;
  t: number;
  /** Portholes in the hull, or windows in the superstructure (which glow wider at night). */
  part: "hull" | "super";
  /** Windows to a group, and the blank slots between groups (plating, bulkheads). */
  group: [
    number,
    number,
  ];
  gap: number;
  /** At night, the chance a lit window's neighbour is dark, and a dark one's lit: lit cabins come in runs. */
  off: number;
  on: number;
};
/** A run of rows sharing everything but their height and extent: [h, x0, x1]. */
const winRows = (
  rows: [
    number,
    number,
    number,
  ][],
  rest: Omit<WinRow, "h" | "x0" | "x1">,
): WinRow[] =>
  rows.map(([h, x0, x1]) => ({
    h,
    x0,
    x1,
    ...rest,
  }));

/** How many sets of windows switch on and off on their own schedules (see .sh-blink). The even sets start
 *  lit and go dark for a while; the odd ones start dark and come on. */
const BLINK_SETS = 6;

/** Windows, laid out in groups with blank plating between them and lit (at night) in runs. `at` is the screen
 *  y of a point h above the sheer at x. A share of them (`flicker`) are SWITCHERS: drawn dark, with a lit
 *  copy over them in one of BLINK_SETS groups that turn on and off on their own clocks, as people come and go
 *  from their cabins. Returns the inks that draw them all with their night halos, and where the light falls
 *  for the streaks on the water. */
function windowsOf(rows: WinRow[], at: (x: number, h: number) => number, rand: () => number, flicker = 0.1) {
  const port: string[] = [];
  const portLit: string[] = [];
  const win: string[] = [];
  const winLit: string[] = [];
  const sets = Array.from(
    {
      length: BLINK_SETS,
    },
    () => ({
      port: [] as string[],
      win: [] as string[],
    }),
  );
  const litAt: [
    number,
    number,
  ][] = [];
  for (const row of rows) {
    const groupOf = () => row.group[0] + Math.floor(rand() * (row.group[1] - row.group[0] + 1));
    let left = groupOf();
    let skip = 0;
    let lit = rand() < 0.6;
    for (let x = row.x0; x <= row.x1 + 1e-6; x += row.step) {
      if (skip > 0) {
        skip--;
        continue;
      }
      if (left === 0) {
        skip = row.gap - 1;
        left = groupOf();
        continue;
      }
      left--;
      lit = lit ? rand() >= row.off : rand() < row.on;
      const d = shipRect(x - row.w / 2, at(x, row.h) - row.t / 2, row.w, row.t);
      const set = rand() < flicker ? Math.floor(rand() * BLINK_SETS) : -1;
      if (set >= 0) {
        // A switcher: dark underneath, its light in its set.
        (row.part === "hull" ? port : win).push(d);
        (row.part === "hull" ? sets[set].port : sets[set].win).push(d);
      } else if (row.part === "hull") (lit ? portLit : port).push(d);
      else (lit ? winLit : win).push(d);
      if (set >= 0 ? set % 2 === 0 : lit)
        litAt.push([
          x,
          row.part === "super" ? 1 : 0.4,
        ]);
    }
  }
  const [p, pl, w, wl] = [
    port,
    portLit,
    win,
    winLit,
  ].map((list) => list.join(""));
  return {
    litAt,
    // The superstructure's big windows glow wide; a porthole only a little.
    inks: [
      {
        d: wl,
        cls: "sh-halo-wide",
        night: true,
      },
      {
        d: pl + wl,
        cls: "sh-halo",
        night: true,
      },
      {
        d: p,
        cls: "sh-port",
      },
      {
        d: pl,
        cls: "sh-port-lit",
      },
      {
        d: w,
        cls: "sh-win",
      },
      {
        d: wl,
        cls: "sh-win-lit",
      },
      ...sets.flatMap((set, i): Ink[] => {
        const wrap = `sh-blink sh-blink-${i}`;
        const [sp, sw] = [
          set.port.join(""),
          set.win.join(""),
        ];
        return [
          {
            d: sw,
            cls: "sh-halo-wide",
            night: true,
            wrap,
          },
          {
            d: sp + sw,
            cls: "sh-halo",
            night: true,
            wrap,
          },
          {
            d: sp,
            cls: "sh-port-lit",
            wrap,
          },
          {
            d: sw,
            cls: "sh-win-lit",
            wrap,
          },
        ];
      }),
    ] as Ink[],
  };
}

/** A depth range of the reflection (in units below the waterline), the class that colours it, and the
 *  stretches of the ship it mirrors there. */
type ReflBand = {
  from: number;
  to: number;
  cls: string;
  spans: [
    number,
    number,
  ][];
};

/** What every ship puts on the water: its broken reflection, the lit windows' streaks, the wake churned up
 *  astern between the two arms of the wave it throws, the bow wave's near arm, and the foam along the
 *  waterline, climbing the stem as the bow wave and curling ahead of it, with the wash under the stern.
 *  `stern` and `bow` are where the hull meets the water. */
function shipWater(
  rand: () => number,
  {
    stern,
    bow,
    left,
    bottom,
    len,
    bands,
    litAt,
  }: {
    stern: number;
    bow: number;
    left: number;
    bottom: number;
    len: number;
    bands: ReflBand[];
    litAt: [
      number,
      number,
    ][];
  },
) {
  // The reflection, in broken strokes that come apart with depth.
  const refl = new Map<string, string[]>();
  for (let y = 0.7; y < bottom - 1; y += 0.62) {
    for (const band of bands.filter((b) => y >= b.from && y < b.to)) {
      const out = refl.get(band.cls) ?? [];
      refl.set(band.cls, out);
      for (const [xa, xb] of band.spans) {
        let x = xa + (rand() - 0.5) * 1.5;
        while (x < xb) {
          const run = Math.min(2.5 + rand() * 9, xb - x);
          if (run > 0.6) out.push(shipRect(x, y, run, 0.3));
          x += run + 0.5 + rand() * (0.8 + y * 0.18);
        }
      }
    }
  }
  // The lit windows' light on the water: a broken column of glints under every stretch with enough of it.
  const streaks: string[] = [];
  for (let b = 0; b < len; b += 2.8) {
    const weight = litAt.filter(([x]) => x >= b && x < b + 2.8).reduce((sum, [, k]) => sum + k, 0);
    if (weight < 2.6) continue;
    const reach = 3 + Math.min(9, weight * 1.4) + rand() * 2;
    for (let y = 0.9; y < 0.9 + reach; y += 0.75 + rand() * 0.5) {
      const w = 0.35 + rand() * 1 + (y / 15) * 0.8;
      streaks.push(shipRect(b + 1.4 + (rand() - 0.5) * 1.6 - w / 2, y, w, 0.26));
    }
  }
  // The wake: a churned trail spreading aft of the stern, then the two arms of the wave it throws.
  const [from, to] = [
    stern + 1,
    left + 14,
  ];
  const wake: string[] = [];
  for (let lane = 0; lane < 6; lane++) {
    let x = from - rand() * 4;
    while (x > to) {
      const d = from - x;
      const run = 1.5 + rand() * 5;
      const t = 0.34 - 0.14 * Math.min(1, d / 150);
      const y = 0.35 + (lane - 2.5) * 0.34 * (1 + d / 110) + (rand() - 0.5) * 0.25;
      wake.push(shipRect(x - run, y - t / 2, run, t));
      x -= run + (0.5 + rand() * 2.2) * (1 + d / 50);
    }
  }
  const arm = (a: Pt, b: Pt, out: string[]) => {
    const span = Math.abs(b[0] - a[0]);
    for (let f = 0; f < 1; ) {
      const run = 2 + rand() * 5;
      const t = 0.42 - 0.18 * f;
      const x = a[0] + (b[0] - a[0]) * f;
      const y = a[1] + (b[1] - a[1]) * f + (rand() - 0.5) * 0.3;
      out.push(shipRect(x - run, y - t / 2, run, t));
      f += (run + 0.8 + rand() * 3 * (1 + f * 2)) / span;
    }
  };
  const reach = (from - to) / 156;
  arm(
    [
      stern - 6,
      0.9,
    ],
    [
      to,
      0.9 + 4.5 * reach,
    ],
    wake,
  );
  arm(
    [
      stern - 8,
      -0.25,
    ],
    [
      to,
      -0.25 - 1.25 * reach,
    ],
    wake,
  );
  const bowArm: string[] = [];
  arm(
    [
      bow - 6.6,
      0.9,
    ],
    [
      bow - 72.6,
      3.4,
    ],
    bowArm,
  );
  // Foam along the waterline, the bow wave and its curl, and the wash under the stern.
  const phase = [
    rand(),
    rand(),
    rand(),
  ].map((r) => r * Math.PI * 2);
  const wob = (x: number) => 0.5 * Math.sin(x / 7 + phase[0]) + 0.3 * Math.sin(x / 3.1 + phase[1]) + 0.2 * Math.sin(x / 1.7 + phase[2]);
  const top: Pt[] = [];
  const foot: Pt[] = [];
  for (let x = stern; x <= bow - 0.5; x += 2) {
    const rise = Math.max(0, (x - (bow - 30.6)) / 30) ** 2;
    top.push([
      x,
      -0.15 - 0.2 * (1 + wob(x)) - 2.1 * rise,
    ]);
    foot.push([
      x,
      0.45 + 0.3 * (1 + wob(x + 40)) + 0.5 * rise,
    ]);
  }
  const s = stern - 12;
  const foam =
    poly([
      ...top,
      [
        bow + 1.2,
        -2.5,
      ],
      [
        bow + 3.2,
        -1.1,
      ],
      [
        bow + 4.2,
        0.4,
      ],
      [
        bow + 2.4,
        1.2,
      ],
      ...foot.reverse(),
    ]) +
    poly(
      [
        [
          17,
          -0.4,
        ],
        [
          12,
          -1.1,
        ],
        [
          7,
          -0.8,
        ],
        [
          2,
          -1.2,
        ],
        [
          -3,
          -0.5,
        ],
        [
          -7,
          0.5,
        ],
        [
          -2,
          1.5,
        ],
        [
          6,
          1.6,
        ],
        [
          13,
          1.2,
        ],
        [
          18,
          0.7,
        ],
      ].map(
        ([x, y]): Pt => [
          x + s,
          y,
        ],
      ),
    );
  return {
    back: [
      ...[
        ...refl,
      ].map(
        ([cls, out]): Ink => ({
          d: out.join(""),
          cls,
          mask: "down",
        }),
      ),
      {
        d: streaks.join(""),
        cls: "sh-streak",
        mask: "down",
        night: true,
      },
      {
        d: wake.join(""),
        cls: "sh-foam",
        mask: "aft",
      },
      {
        d: bowArm.join(""),
        cls: "sh-foam",
        mask: "bow",
      },
    ] as Ink[],
    foam: {
      d: foam,
      cls: "sh-foam",
    } as Ink,
    aft: [
      from + 1,
      to,
    ] as [
      number,
      number,
    ],
    bow: [
      bow - 2.6,
      bow - 72.6,
    ] as [
      number,
      number,
    ],
  };
}

/** A vertical gradient across the drawing, top colour at y1, bottom at y2. */
const vGrad = (key: string, y1: number, y2: number, hi: string, lo: string): Grad => ({
  key,
  user: true,
  x1: 0,
  y1,
  x2: 0,
  y2,
  stops: [
    [
      0,
      hi,
    ],
    [
      1,
      lo,
    ],
  ],
});
/** Round, or bellied, and lit on its forward side: the disc is always ahead, since a ship sails toward it. */
const roundGrad = (key: string, shade: string, lit: string): Grad => ({
  key,
  x1: 0,
  y1: 0,
  x2: 1,
  y2: 0,
  stops: [
    [
      0,
      shade,
    ],
    [
      0.72,
      lit,
    ],
    [
      1,
      `color-mix(in oklab, ${lit}, ${shade} 45%)`,
    ],
  ],
});

/** THE LINER: a four-funnel liner in profile, black hull over a red boot-topping band and a gilt sheer line,
 *  white superstructure, buff funnels with black tops and the steam pipes up their fronts (smoke from the
 *  forward three; the fourth only ventilated), lifeboats in their davits, two masts and their wire, and four
 *  decks of portholes under two of windows. */
function linerArt(): ShipArt {
  const frame = frameOf({
    len: 270,
    right: 276,
    top: -64,
    bottom: 16,
  });
  const rand = mulberry32(1912);
  // The top of the black hull: lowest a little aft of amidships, rising to the bow and the stern.
  const sheer = (x: number) => 15 + 2.4 * ((x - 130) / 135) ** 2;
  const deckY = (x: number, h: number) => -(sheer(x) + h);
  // A counter stern: the waterline ends 12 units in, and the hull sweeps aft over it to the deck.
  const sternX = (h: number) => (h <= 9 ? 0.6 + 11.4 * (1 - h / 9) ** 2 : 0.6 - (0.5 * (h - 9)) / (sheer(0) - 9));
  // The stem: straight, raked a little forward.
  const bowX = (h: number) => 268.6 + (1.8 * h) / sheer(270);
  const band = (x0: number, x1: number, h0: number, h1: number) => sheerBand(sheer, x0, x1, h0, h1);
  const funnelsAt = [
    180,
    147,
    114,
    81,
  ];
  const rake = 2.6;
  const funnels = funnelsAt.map((c, i) => {
    const [base, top] = [
      deckY(c, 8.6),
      deckY(c, 29.6),
    ];
    const at = (f: number, side: -1 | 1): Pt => [
      c + side * (4.4 - 0.2 * f) - rake * f,
      base + (top - base) * f,
    ];
    // The steam pipe up the funnel's forward face, standing clear of its top; only the working three.
    const pipe = (f0: number, f1: number) => {
      const p = (f: number, dx: number): Pt => [
        c + 4.5 + dx - rake * f,
        base + (top - base) * f,
      ];
      return poly([
        p(f0, 0),
        p(f0, 0.8),
        p(f1, 0.8),
        p(f1, 0),
      ]);
    };
    return {
      body: poly([
        at(0, -1),
        at(0, 1),
        at(1, 1),
        at(1, -1),
      ]),
      pipe: i < 3 ? pipe(0, 1.07) : "",
      black:
        poly([
          at(0.82, -1),
          at(0.82, 1),
          at(1, 1),
          at(1, -1),
        ]) + (i < 3 ? pipe(0.82, 1.07) : ""),
    };
  });
  const smoke = funnelsAt.slice(0, 3).flatMap((c) =>
    smokeFrom(
      rand,
      [
        c - rake,
        deckY(c, 29.6),
      ],
      10,
      1,
      0.42,
    ),
  );
  const fore = mastOf(236, sheer(236) - 0.5, 50);
  const main = mastOf(34, sheer(34) - 0.5, 46);
  const masts = [
    fore.d,
    main.d,
    shipRect(fore.xAt(36) - 0.95, -36.8, 1.9, 1.6),
    // The posts under the docking bridge.
    ...[
      6.5,
      28.5,
    ].map((x) => shipRect(x, deckY(x, 3.1), 0.45, 1.1)),
  ].join("");
  const stem: Pt = [
    bowX(sheer(270)),
    -sheer(270),
  ];
  const sternTop: Pt = [
    sternX(sheer(0)),
    -sheer(0),
  ];
  const wires = [
    `M${shipAt(fore.top)}Q${shipAt([
      (fore.top[0] + main.top[0]) / 2,
      (fore.top[1] + main.top[1]) / 2 + 4,
    ])} ${shipAt(main.top)}`,
    `M${shipAt(fore.top)}L${shipAt(stem)}`,
    `M${shipAt(main.top)}L${shipAt(sternTop)}`,
  ].join("");
  const boatsAt = [
    158,
    167.5,
    191,
    200.5,
    70,
    79.5,
    101,
    110.5,
  ];
  const boats = boatsAt
    .map((b) => {
      const y = deckY(b, 9.15);
      return poly([
        [
          b - 4.3,
          y - 1.45,
        ],
        [
          b + 4.3,
          y - 1.45,
        ],
        [
          b + 3.5,
          y,
        ],
        [
          b - 3.5,
          y,
        ],
      ]);
    })
    .join("");
  const davits = boatsAt
    .flatMap((b) =>
      [
        -3.1,
        3.1,
      ].map((dx) => shipRect(b + dx - 0.15, deckY(b + dx, 11.4), 0.3, 2.8)),
    )
    .join("");
  const windows = windowsOf(
    [
      // The hull's four decks of portholes, C (just under the sheer) down to F.
      ...winRows(
        [
          [
            -2.5,
            22,
            258,
          ],
          [
            -5.3,
            18,
            260,
          ],
          [
            -8.1,
            30,
            254,
          ],
          [
            -10.5,
            48,
            240,
          ],
        ],
        {
          step: 2.4,
          w: 0.75,
          t: 0.8,
          part: "hull",
          group: [
            5,
            14,
          ],
          gap: 2,
          off: 0.34,
          on: 0.3,
        },
      ),
      // B deck, A deck's promenade, the officers' quarters and the wheelhouse.
      {
        h: 2.4,
        x0: 60.5,
        x1: 212,
        step: 2.35,
        w: 1,
        t: 1.35,
        part: "super",
        group: [
          8,
          24,
        ],
        gap: 1,
        off: 0.18,
        on: 0.5,
      },
      {
        h: 6.4,
        x0: 68.5,
        x1: 208,
        step: 2.75,
        w: 1.75,
        t: 1.65,
        part: "super",
        group: [
          8,
          24,
        ],
        gap: 1,
        off: 0.18,
        on: 0.5,
      },
      ...winRows(
        [
          [
            10,
            186,
            204,
          ],
        ],
        {
          step: 2.3,
          w: 0.9,
          t: 0.9,
          part: "super",
          group: [
            8,
            24,
          ],
          gap: 1,
          off: 0.18,
          on: 0.5,
        },
      ),
      ...winRows(
        [
          [
            11.55,
            206.2,
            210.8,
          ],
        ],
        {
          step: 1.15,
          w: 0.75,
          t: 0.5,
          part: "super",
          group: [
            8,
            24,
          ],
          gap: 1,
          off: 0.18,
          on: 0.5,
        },
      ),
    ],
    deckY,
    rand,
  );
  const water = shipWater(rand, {
    stern: sternX(0),
    bow: bowX(0),
    left: frame.left,
    bottom: frame.bottom,
    len: 270,
    litAt: windows.litAt,
    bands: [
      {
        from: 0,
        to: 1.4,
        cls: "sh-refl-red",
        spans: [
          [
            14,
            266,
          ],
        ],
      },
      {
        from: 1.4,
        to: 8.6,
        cls: "sh-refl-hull",
        spans: [
          [
            14,
            266,
          ],
        ],
      },
      {
        from: 8.6,
        to: 12.8,
        cls: "sh-refl-white",
        spans: [
          [
            60,
            212,
          ],
        ],
      },
      {
        from: 12.8,
        to: 99,
        cls: "sh-refl-buff",
        spans: funnelsAt.map((c) => [
          c - 5.8,
          c + 3.2,
        ]),
      },
    ],
  });
  return {
    frame,
    grads: [
      vGrad("hull", -18, 0, "var(--sh-hull-hi)", "var(--sh-hull)"),
      vGrad("white", -29, -15, "var(--sh-white-hi)", "var(--sh-white)"),
      roundGrad("funnel", "var(--sh-buff)", "var(--sh-buff-lit)"),
    ],
    smoke,
    inks: [
      {
        d: wires,
        cls: "sh-wire",
      },
      {
        d: masts,
        cls: "sh-mast",
      },
      ...water.back,
      {
        d: hullOf(sternX, bowX, sheer, 270),
        grad: "hull",
      },
      {
        d: hullBand(sternX, bowX, 0, 3.6),
        cls: "sh-red",
      },
      {
        d: band(3, 267, -1.32, -0.98),
        cls: "sh-gold",
      },
      {
        d: [
          band(58, 214, -0.4, 4.6), // B deck, seated a little into the hull
          band(66, 210, 4.5, 8.6), // A deck
          band(184, 211, 8.5, 11.2), // the officers' quarters
          band(205, 211.5, 11.1, 12), // the wheelhouse
          band(211, 214.6, 10.8, 11.25), // the bridge wing
          band(120, 132, 8.5, 10.6),
          band(150, 158, 8.5, 10.3),
          band(70, 84, 8.5, 10.4),
          band(12, 24, -0.2, 2), // the poop deckhouse
          band(5, 30, 3.1, 3.6), // the docking bridge
        ].join(""),
        grad: "white",
      },
      {
        d: band(58, 214, 4.4, 4.7) + band(66, 210, 8.35, 8.65),
        cls: "sh-deck",
      },
      ...funnels.flatMap(({ body, pipe }): Ink[] => [
        {
          d: body,
          grad: "funnel",
        },
        {
          d: pipe,
          grad: "funnel",
        },
      ]),
      {
        d: funnels.map((f) => f.black).join(""),
        cls: "sh-black",
      },
      {
        d: davits,
        cls: "sh-mast",
      },
      {
        d: boats,
        cls: "sh-boat",
      },
      ...windows.inks,
      water.foam,
    ],
    lamps: [
      [
        fore.xAt(42),
        -42,
      ],
      [
        main.xAt(38),
        -38,
      ],
      [
        1.4,
        deckY(1.4, 1.6),
      ],
    ],
    green: [
      214.2,
      deckY(214.2, 11),
    ],
    aft: water.aft,
    bow: water.bow,
  };
}

/** THE CLIPPER: a three-masted full-rigged ship under all plain sail. A black hull on a copper bottom with a
 *  painted band of gun ports, a raked clipper bow under a long bowsprit, square sails stacked five high on
 *  the fore and main and four on the mizzen, three jibs, a spanker, and her standing rigging. By night her
 *  stern windows and deckhouses are lit and her canvas pales under the moon. */
function clipperArt(): ShipArt {
  const frame = frameOf({
    len: 150,
    right: 180,
    top: -84,
    bottom: 16,
  });
  const rand = mulberry32(1869);
  const sheer = (x: number) => 8 + 3.2 * ((x - 72) / 78) ** 2;
  const deckY = (x: number, h: number) => -(sheer(x) + h);
  // A raked counter, and the clipper's cutwater sweeping forward to the bowsprit.
  const sternX = (h: number) => (h <= 5 ? 3.5 + 7 * (1 - h / 5) ** 2 : 3.5 - (2.5 * (h - 5)) / (sheer(0) - 5));
  const bowX = (h: number) => 141 + 10 * (h / sheer(150)) ** 1.5;
  const band = (x0: number, x1: number, h0: number, h1: number) => sheerBand(sheer, x0, x1, h0, h1);
  // Fore, main and mizzen: [x, height above the waterline, square sails as [foot, head, half-width at the
  // foot, half-width at the head]].
  const rig: [
    number,
    number,
    [
      number,
      number,
      number,
      number,
    ][],
  ][] = [
    [
      118,
      76,
      [
        [
          16,
          27,
          17,
          15.5,
        ],
        [
          28,
          37,
          15,
          13.2,
        ],
        [
          38,
          46,
          13,
          11.2,
        ],
        [
          47,
          54.5,
          10.5,
          9,
        ],
        [
          55.5,
          62,
          8.4,
          7,
        ],
      ],
    ],
    [
      80,
      82,
      [
        [
          16,
          28,
          19,
          17,
        ],
        [
          29,
          39,
          16.5,
          14.5,
        ],
        [
          40,
          49,
          14.2,
          12.2,
        ],
        [
          50,
          58,
          11.5,
          9.6,
        ],
        [
          59,
          66,
          9,
          7.4,
        ],
      ],
    ],
    [
      38,
      64,
      [
        [
          26,
          34,
          12.5,
          11,
        ],
        [
          35,
          42,
          10.8,
          9.4,
        ],
        [
          43,
          49.5,
          9,
          7.6,
        ],
        [
          50.5,
          55.5,
          7.2,
          6,
        ],
      ],
    ],
  ];
  const masts = rig.map(([x, top]) => mastOf(x, sheer(x) - 0.5, top, 0.9, 0.035));
  const [fore, main, mizzen] = masts;
  // A square sail: straight along its yard, its leeches and foot bellied out by the wind.
  const sail = (
    xAt: (h: number) => number,
    [h0, h1, w0, w1]: [
      number,
      number,
      number,
      number,
    ],
  ) => {
    const [c0, c1, cm] = [
      xAt(h0),
      xAt(h1),
      xAt((h0 + h1) / 2),
    ];
    const hm = (h0 + h1) / 2;
    return `M${shipAt([
      c1 - w1,
      -h1,
    ])}L${shipAt([
      c1 + w1,
      -h1,
    ])}Q${shipAt([
      cm + (w0 + w1) / 2 + 1,
      -hm,
    ])} ${shipAt([
      c0 + w0,
      -h0,
    ])}Q${shipAt([
      c0,
      -h0 + 1.6,
    ])} ${shipAt([
      c0 - w0,
      -h0,
    ])}Q${shipAt([
      cm - (w0 + w1) / 2 - 1,
      -hm,
    ])} ${shipAt([
      c1 - w1,
      -h1,
    ])}Z`;
  };
  const squares = rig.flatMap(([, , sails], i) => sails.map((s) => sail(masts[i].xAt, s)));
  const yards = rig
    .flatMap(([, , sails], i) =>
      sails.map(([, h1, , w1]) => {
        const c = masts[i].xAt(h1);
        return shipRect(c - w1 - 1, -h1 - 0.5, 2 * w1 + 2, 0.55);
      }),
    )
    .join("");
  const sprit: Pt = [
    176,
    -17.5,
  ];
  const head: Pt = [
    bowX(sheer(150)),
    -sheer(150),
  ];
  const jibs = [
    poly([
      [
        fore.xAt(66) + 0.6,
        -66,
      ],
      sprit,
      [
        160,
        -20,
      ],
    ]),
    poly([
      [
        fore.xAt(56) + 0.6,
        -56,
      ],
      [
        169,
        -16.2,
      ],
      [
        152,
        -17,
      ],
    ]),
    poly([
      [
        fore.xAt(44) + 0.6,
        -44,
      ],
      [
        158,
        -13.4,
      ],
      [
        142,
        -14.6,
      ],
    ]),
  ];
  // The spanker, a gaff sail abaft the mizzen on its gaff and boom, set behind the square sails: only its
  // after part shows past them.
  const spanker = poly([
    [
      mizzen.xAt(13.5) - 0.5,
      -13.5,
    ],
    [
      mizzen.xAt(34) - 0.5,
      -34,
    ],
    [
      12,
      -40,
    ],
    [
      6.5,
      -14,
    ],
  ]);
  const spankerSpars =
    poly([
      [
        mizzen.xAt(34),
        -34.4,
      ],
      [
        mizzen.xAt(34),
        -33.8,
      ],
      [
        11.6,
        -39.7,
      ],
      [
        11.8,
        -40.4,
      ],
    ]) + shipRect(6.5, -14.2, mizzen.xAt(13.5) - 6.5, 0.5);
  const spars = [
    yards,
    // The bowsprit and jib boom, from the head out over the bow.
    poly([
      [
        head[0] - 4,
        head[1] + 0.2,
      ],
      [
        head[0] - 4,
        head[1] - 0.9,
      ],
      sprit,
      [
        sprit[0],
        sprit[1] + 0.45,
      ],
    ]),
  ].join("");
  const line = (a: Pt, b: Pt) => `M${shipAt(a)}L${shipAt(b)}`;
  const rail = (x: number): Pt => [
    x,
    deckY(x, 0.15),
  ];
  const wires = [
    // Stays, forward from each masthead, and the fore's out to the jib boom.
    line(fore.top, sprit),
    line(main.top, [
      fore.xAt(62),
      -62,
    ]),
    line(mizzen.top, [
      main.xAt(58),
      -58,
    ]),
    line(mizzen.top, rail(3)),
    // Shrouds, fanning from the tops down to the rail abreast of each mast.
    ...masts.flatMap((m, i) => {
      const [x, , sails] = rig[i];
      const h = sails[0][1];
      return [
        -6,
        -3,
        -0.5,
      ].map((dx) =>
        line(
          [
            m.xAt(h),
            -h,
          ],
          rail(x + dx),
        ),
      );
    }),
  ].join("");
  const windows = windowsOf(
    [
      // The stern gallery, the after cabin and the deckhouse amidships.
      ...winRows(
        [
          [
            -4.6,
            5.5,
            12.5,
          ],
        ],
        {
          step: 2.3,
          w: 1,
          t: 1,
          part: "hull",
          group: [
            4,
            4,
          ],
          gap: 1,
          off: 0.08,
          on: 0.8,
        },
      ),
      ...winRows(
        [
          [
            1.3,
            6,
            20,
          ],
          [
            1.7,
            88.5,
            98,
          ],
        ],
        {
          step: 2.6,
          w: 1.1,
          t: 0.95,
          part: "super",
          group: [
            6,
            6,
          ],
          gap: 1,
          off: 0.1,
          on: 0.7,
        },
      ),
      // A few ports along the 'tween deck.
      ...winRows(
        [
          [
            -5.4,
            22,
            134,
          ],
        ],
        {
          step: 5.2,
          w: 0.65,
          t: 0.65,
          part: "hull",
          group: [
            3,
            6,
          ],
          gap: 1,
          off: 0.45,
          on: 0.25,
        },
      ),
    ],
    deckY,
    rand,
    0.3,
  );
  const water = shipWater(rand, {
    stern: sternX(0),
    bow: bowX(0),
    left: frame.left,
    bottom: frame.bottom,
    len: 150,
    litAt: windows.litAt,
    bands: [
      {
        from: 0,
        to: 1.2,
        cls: "sh-refl-copper",
        spans: [
          [
            12,
            140,
          ],
        ],
      },
      {
        from: 1.2,
        to: 5.6,
        cls: "sh-refl-hull",
        spans: [
          [
            12,
            142,
          ],
        ],
      },
      {
        from: 5.6,
        to: 7,
        cls: "sh-refl-band",
        spans: [
          [
            10,
            144,
          ],
        ],
      },
      {
        from: 7.6,
        to: 99,
        cls: "sh-refl-sail",
        spans: rig.map(([x, , sails]) => [
          x - sails[0][2],
          x + sails[0][2],
        ]),
      },
    ],
  });
  return {
    frame,
    grads: [
      vGrad("hull", -12, 0, "var(--sh-cl-hull-hi)", "var(--sh-cl-hull)"),
      vGrad("white", -12, -8, "var(--sh-white-hi)", "var(--sh-white)"),
      roundGrad("sail", "var(--sh-sail)", "var(--sh-sail-lit)"),
    ],
    smoke: [],
    inks: [
      {
        d: wires,
        cls: "sh-wire",
      },
      {
        d: masts.map((m) => m.d).join(""),
        cls: "sh-spar",
      },
      ...water.back,
      {
        d: hullOf(sternX, bowX, sheer, 150),
        grad: "hull",
      },
      {
        d: hullBand(sternX, bowX, 0, 1.6),
        cls: "sh-cl-copper",
      },
      {
        d: band(2.6, 147.5, -3.4, -1.8),
        cls: "sh-cl-band",
      },
      {
        // The painted gun ports along the band.
        d: Array.from(
          {
            length: 23,
          },
          (_, i) => 13 + i * 5.6,
        )
          .map((x) => shipRect(x - 0.7, deckY(x, -2.95), 1.4, 0.75))
          .join(""),
        cls: "sh-black",
      },
      {
        d: band(1.5, 149, -0.35, 0.15),
        cls: "sh-cl-rail",
      },
      {
        d: band(4, 22, 0.1, 2.4) + band(86, 100, 0.1, 3.1),
        grad: "white",
      },
      {
        d: spanker,
        grad: "sail",
      },
      {
        d: spankerSpars,
        cls: "sh-spar",
      },
      ...[
        ...squares,
        ...jibs,
      ].map(
        (d): Ink => ({
          d,
          grad: "sail",
        }),
      ),
      {
        d: spars,
        cls: "sh-spar",
      },
      ...windows.inks,
      water.foam,
    ],
    lamps: [
      [
        1.2,
        deckY(1.2, 2.6),
      ],
    ],
    green: [
      121,
      deckY(121, 1),
    ],
    aft: water.aft,
    bow: water.bow,
  };
}

/** THE FREIGHTER, after the Mærsk Mc-Kinney Møller (the Triple E class): a 400m container ship in the line's
 *  light blue over a red bottom. Her deckhouse is set well forward, two fifths of her length back from the
 *  bow, so the boxes stack high before it and her engines and funnel can sit aft; and from bow to stern she
 *  is a wall of 20ft boxes (so they read nearly square from the side, as 40ft ones do not), mostly in the
 *  line's own blue, stacked eight to ten high and stepping down into the bow. Her funnel is banded in the
 *  chosen colour; a free-fall lifeboat sits on her stern. */
function freighterArt(): ShipArt {
  const len = 330;
  const frame = frameOf({
    len,
    right: len + 6,
    top: -66,
    bottom: 16,
  });
  const rand = mulberry32(2013);
  const sheer = (x: number) => 15 + 2.6 * Math.max(0, (x - (len - 50)) / 50) ** 2 + 0.8 * Math.max(0, (30 - x) / 30) ** 2;
  const deckY = (x: number, h: number) => -(sheer(x) + h);
  // A transom stern, and a raked, flared bow.
  const sternX = (h: number) => (h <= 6 ? 7 - 4.5 * (h / 6) ** 0.7 : 2.5 - (0.6 * (h - 6)) / (sheer(0) - 6));
  const bowX = (h: number) => len - 8 + 8 * (h / sheer(len)) ** 1.4;
  const band = (x0: number, x1: number, h0: number, h1: number) => sheerBand(sheer, x0, x1, h0, h1);
  const [houseA, houseB] = [
    190,
    206,
  ];
  const [funnelA, funnelB] = [
    40,
    53,
  ];
  // Stacks of boxes, each drawn 1.5 tall to 1 wide and large enough to read as boxes at this scale (5.2 units
  // tall, about 1.2vh), in columns grouped four to a bay between lashing bridges:
  // aft of the funnel, between the funnel and the house, and before the house to the bow, where they step
  // down. A bay's columns stand mostly one height, now and then a box apart.
  const TIER = 5.2;
  const COL = TIER / 1.5;
  const PITCH = COL + 0.16;
  const BAY = 4;
  const cargo: string[][] = Array.from(
    {
      length: 6,
    },
    () => [],
  );
  const stacks: string[] = [];
  for (const [from, to] of [
    [
      13,
      funnelA - 1,
    ],
    [
      funnelB + 1.5,
      houseA - 1.5,
    ],
    [
      houseB + 1.5,
      len - 14,
    ],
  ]) {
    for (let x = from; x + BAY * PITCH <= to; x += BAY * PITCH + 0.9) {
      const height = 4 + Math.floor(rand() * 2);
      for (let c = 0; c < BAY; c++) {
        const sx = x + c * PITCH;
        const tiers = Math.max(2, height - (sx > len - 40 ? 2 : sx > len - 60 ? 1 : 0) - (rand() < 0.12 ? 1 : 0));
        const base = deckY(sx + COL / 2, 1);
        stacks.push(shipRect(sx - 0.06, base - tiers * TIER - 0.06, PITCH, tiers * TIER + 1.06));
        let colour = 0;
        for (let t = 0; t < tiers; t++) {
          // Mostly the line's own blue; others in runs, as boxes of one line are stowed together.
          if (t === 0 || rand() > 0.4) colour = rand() < 0.55 ? 0 : 1 + Math.floor(rand() * 5);
          cargo[colour].push(shipRect(sx, base - (t + 1) * TIER + 0.14, COL, TIER - 0.28));
        }
      }
    }
  }
  const funnel = (f0: number, f1: number) =>
    poly([
      [
        funnelA - 0.6 * f0,
        deckY(funnelA, 34 * f0),
      ],
      [
        funnelB - 0.6 * f0,
        deckY(funnelB, 34 * f0),
      ],
      [
        funnelB - 0.6 * f1,
        deckY(funnelB, 34 * f1),
      ],
      [
        funnelA - 0.6 * f1,
        deckY(funnelA, 34 * f1),
      ],
    ]);
  const radar = mastOf(198, sheer(198) + 35, sheer(198) + 42, 0.6, 0);
  const fore = mastOf(len - 8, sheer(len - 8) + 1, 40, 0.7, 0.02);
  const windows = windowsOf(
    [
      ...winRows(
        Array.from(
          {
            length: 9,
          },
          (
            _,
            i,
          ): [
            number,
            number,
            number,
          ] => [
            4 + 3 * i,
            houseA + 1.6,
            houseB - 1.6,
          ],
        ),
        {
          step: 2.15,
          w: 1.2,
          t: 1.1,
          part: "super",
          group: [
            3,
            7,
          ],
          gap: 1,
          off: 0.3,
          on: 0.45,
        },
      ),
      // The bridge, a band of glass right across.
      ...winRows(
        [
          [
            32.4,
            houseA - 3.4,
            houseB + 3.4,
          ],
        ],
        {
          step: 1.4,
          w: 1.2,
          t: 1.4,
          part: "super",
          group: [
            20,
            20,
          ],
          gap: 1,
          off: 0.05,
          on: 0.9,
        },
      ),
    ],
    deckY,
    rand,
    0.25,
  );
  const water = shipWater(rand, {
    stern: sternX(0),
    bow: bowX(0),
    left: frame.left,
    bottom: frame.bottom,
    len,
    litAt: windows.litAt,
    bands: [
      {
        from: 0,
        to: 1.4,
        cls: "sh-refl-red",
        spans: [
          [
            10,
            len - 8,
          ],
        ],
      },
      {
        from: 1.4,
        to: 8,
        cls: "sh-refl-fr",
        spans: [
          [
            10,
            len - 8,
          ],
        ],
      },
      {
        from: 8,
        to: 15,
        cls: "sh-refl-cargo",
        spans: [
          [
            14,
            len - 16,
          ],
        ],
      },
    ],
  });
  return {
    frame,
    grads: [
      vGrad("hull", -18, 0, "var(--sh-fr-hull-hi)", "var(--sh-fr-hull)"),
      vGrad("white", -50, -15, "var(--sh-white-hi)", "var(--sh-white)"),
    ],
    smoke: smokeFrom(
      rand,
      [
        funnelA + 6,
        deckY(funnelA + 6, 34.4),
      ],
      7,
      0.75,
      0.24,
    ),
    inks: [
      {
        d: radar.d + shipRect(195, deckY(198, 40.4), 6, 0.45) + fore.d,
        cls: "sh-mast",
      },
      ...water.back,
      {
        d: hullOf(sternX, bowX, sheer, len),
        grad: "hull",
      },
      {
        d: hullBand(sternX, bowX, 0, 3.4),
        cls: "sh-red",
      },
      {
        // The breakwater on the forecastle.
        d: band(len - 30, len - 2, -0.2, 1.8),
        cls: "sh-fr-deck",
      },
      {
        d: stacks.join(""),
        cls: "sh-cargo-gap",
      },
      ...cargo.map(
        (boxes, i): Ink => ({
          d: boxes.join(""),
          cls: `sh-cargo-${i + 1}`,
        }),
      ),
      {
        d: band(houseA, houseB, -0.3, 31) + band(houseA - 4, houseB + 4, 31, 34),
        grad: "white",
      },
      {
        d: funnel(0, 1),
        cls: "sh-fr-funnel",
      },
      {
        d: funnel(0.74, 0.86),
        cls: "sh-fr-mark",
      },
      {
        d: funnel(0.95, 1),
        cls: "sh-black",
      },
      {
        // The free-fall lifeboat on its ramp at the stern, its bow pointing down and aft.
        d: poly([
          [
            4,
            deckY(4, 0.4),
          ],
          [
            4.4,
            deckY(4.4, 2.9),
          ],
          [
            12.5,
            deckY(12.5, 5),
          ],
          [
            13,
            deckY(13, 2.6),
          ],
        ]),
        cls: "sh-cr-tender",
      },
      ...windows.inks,
      water.foam,
    ],
    lamps: [
      fore.top,
      radar.top,
      [
        3,
        deckY(3, 1.5),
      ],
    ],
    green: [
      houseB + 3.6,
      deckY(houseB + 3.6, 33),
    ],
    aft: water.aft,
    bow: water.bow,
  };
}

/** The easter egg's letters, five rows of four, top row first. */
const HERO_FONT: Record<string, string[]> = {
  H: [
    "X..X",
    "X..X",
    "XXXX",
    "X..X",
    "X..X",
  ],
  E: [
    "XXXX",
    "X...",
    "XXX.",
    "X...",
    "XXXX",
  ],
  R: [
    "XXX.",
    "X..X",
    "XXX.",
    "X.X.",
    "X..X",
  ],
  O: [
    ".XX.",
    "X..X",
    "X..X",
    "X..X",
    ".XX.",
  ],
};

/** The cruise ship's easter egg: now and then, by night, a block of her balconies goes dark and H, E, R and O
 *  light up across it one after another, each font pixel two windows by two, then go out again (see
 *  .sh-hero). The block covers ten rows of windows from `row0` and 38 columns from `col0`: a wall behind
 *  (hiding the halos of the windows it covers), every cell dark, then each letter's cells lit and haloed.
 *  `y(x, row)` is a window row's centre and `x(col)` a column's. Drawn twice, once for each heading: the
 *  ship is mirrored when it sails west, so that copy's letters are mirrored to read the right way round. */
function heroLights(
  y: (x: number, row: number) => number,
  x: (col: number) => number,
  {
    row0,
    col0,
    w,
    t,
  }: {
    row0: number;
    col0: number;
    w: number;
    t: number;
  },
): Ink[] {
  const COLS = 38;
  const ROWS = 10;
  // The text's lit cells, as [screen column, row from the bottom, letter].
  const lit: [
    number,
    number,
    number,
  ][] = [];
  [
    ..."HERO",
  ].forEach((letter, k) =>
    HERO_FONT[letter].forEach((line, r) =>
      [
        ...line,
      ].forEach((px, c) => {
        if (px !== "X") return;
        for (const dc of [
          0,
          1,
        ])
          for (const dr of [
            0,
            1,
          ])
            lit.push([
              k * 10 + c * 2 + dc,
              ROWS - 1 - (r * 2 + dr),
              k,
            ]);
      }),
    ),
  );
  const cell = (col: number, row: number) => {
    const cx = x(col0 + col);
    return shipRect(cx - w / 2, y(cx, row0 + row) - t / 2, w, t);
  };
  const [left, right] = [
    x(col0) - w / 2 - 0.9,
    x(col0 + COLS - 1) + w / 2 + 0.9,
  ];
  const [top, foot] = [
    y(left, row0 + ROWS - 1) - t / 2 - 1.1,
    y(left, row0) + t / 2 + 1.1,
  ];
  const inks: Ink[] = [
    {
      d: shipRect(left, top, right - left, foot - top),
      grad: "white",
      night: true,
      wrap: "sh-hero-dark",
    },
  ];
  for (const heading of [
    "east",
    "west",
  ] as const) {
    // Mirrored going west: screen column s is drawn at COLS - 1 - s.
    const at = (s: number) => (heading === "east" ? s : COLS - 1 - s);
    const on = new Set(lit.map(([s, row]) => `${at(s)},${row}`));
    const dark: string[] = [];
    for (let col = 0; col < COLS; col++) for (let row = 0; row < ROWS; row++) if (!on.has(`${col},${row}`)) dark.push(cell(col, row));
    inks.push({
      d: dark.join(""),
      cls: "sh-win",
      night: true,
      wrap: "sh-hero-dark",
      only: heading,
    });
    for (let k = 0; k < 4; k++) {
      const d = lit
        .filter(([, , letter]) => letter === k)
        .map(([s, row]) => cell(at(s), row))
        .join("");
      const wrap = `sh-hero sh-hero-${k}`;
      for (const cls of [
        "sh-halo-wide",
        "sh-halo",
        "sh-win-lit",
      ])
        inks.push({
          d,
          cls,
          night: true,
          wrap,
          only: heading,
        });
    }
  }
  return inks;
}

/** THE CRUISE SHIP, after Allure of the Seas (the Oasis class): white from her navy boot-topping up, a hull
 *  with two rows of ports, then a long recess where her big orange lifeboats hang, and over it a sheer block
 *  of a dozen balcony decks, flush at the stern and leaning back a little toward the bow. On top, the pool
 *  deck under a glass solarium forward, her bridge at the head of it, two funnels abreast a little aft of
 *  amidships (one in profile, banded in the chosen colour), and aft the waterslide tower with its tubes, the
 *  long slide coiling down the stern, and a climbing wall. By night her balconies are lit end to end. */
function cruiseArt(): ShipArt {
  const len = 320;
  const frame = frameOf({
    len,
    right: len + 6,
    top: -82,
    bottom: 16,
  });
  const rand = mulberry32(2010);
  const sheer = (x: number) => 14 + 2.4 * Math.max(0, (x - (len - 50)) / 50) ** 2;
  const deckY = (x: number, h: number) => -(sheer(x) + h);
  const sternX = (h: number) => (h <= 4 ? 6 - 0.75 * h : 3);
  const bowX = (h: number) => len - 14 + 14 * (h / sheer(len)) ** 1.3;
  const band = (x0: number, x1: number, h0: number, h1: number) => sheerBand(sheer, x0, x1, h0, h1);
  const DECK = 3;
  const DECKS = 12;
  const TOP = 45;
  // The superstructure's after edge, h above the sheer: a smooth slant from the stern up and forward to the
  // pool deck, steepest low down; and its forward edge, a gentle lean back toward the top.
  const aftX = (h: number) => 3 + 30 * (Math.max(0, h) / TOP) ** 1.2;
  const foreX = (h: number) => 303 - 0.42 * h;
  const hs = Array.from(
    {
      length: 16,
    },
    (_, i) => -0.3 + ((TOP + 0.3) * i) / 15,
  );
  const tops: number[] = [];
  for (let x = aftX(TOP) + 8; x < foreX(TOP); x += 8) tops.push(x);
  const block = poly([
    ...hs.map(
      (h): Pt => [
        aftX(h),
        deckY(aftX(h), h),
      ],
    ),
    ...tops.map(
      (x): Pt => [
        x,
        deckY(x, TOP),
      ],
    ),
    ...[
      ...hs,
    ]
      .reverse()
      .map(
        (h): Pt => [
          foreX(h),
          deckY(foreX(h), h),
        ],
      ),
  ]);
  // The bridge, its front standing just proud of the superstructure's.
  const decks = block + band(268, 289, 35.8, 39.2);
  // Balconies sit on one grid of columns (GRID from x 5), so every deck's line up; the HERO lights need it.
  const GRID = 2.2;
  const onGrid = (x: number) => 5 + Math.ceil((x - 5) / GRID) * GRID;
  const rowH = (i: number) => 6 + DECK * i + 1.55;
  // The lifeboat recess along decks 4 and 5, and the boats hanging in it.
  const recess = band(28, 284, 0.6, 5.4);
  const boats = Array.from(
    {
      length: 17,
    },
    (_, i) => 36 + i * 14.4,
  )
    .map((b) => {
      const y = deckY(b, 4.9);
      return poly([
        [
          b - 5.6,
          y,
        ],
        [
          b + 5.6,
          y,
        ],
        [
          b + 4.8,
          y + 3.4,
        ],
        [
          b - 4.8,
          y + 3.4,
        ],
      ]);
    })
    .join("");
  // The solarium's glass roof forward, sloping down to the bow.
  const solarium = poly([
    [
      242,
      deckY(242, 44.6),
    ],
    [
      286,
      deckY(286, 44.6),
    ],
    [
      276,
      deckY(276, 48.4),
    ],
    [
      246,
      deckY(246, 49),
    ],
  ]);
  // Two funnels abreast, one in profile, a little aft of amidships.
  const funnel = (f0: number, f1: number) =>
    poly([
      [
        112 - 1.4 * f0,
        deckY(112, 45 + 10 * f0),
      ],
      [
        136 - 1.4 * f0,
        deckY(136, 45 + 10 * f0),
      ],
      [
        136 - 1.4 * f1,
        deckY(136, 45 + 10 * f1),
      ],
      [
        112 - 1.4 * f1,
        deckY(112, 45 + 10 * f1),
      ],
    ]);
  // Aft: the slide tower, its tubes, the long slide coiling down the stern, and a climbing wall.
  const at = (x: number, h: number) =>
    shipAt([
      x,
      deckY(x, h),
    ]);
  const tower = band(62, 72, 44.8, 52.5);
  const wall = band(38, 43, 44.8, 52) + band(46, 51, 44.8, 51);
  const slides = [
    `M${at(64, 52)}C${at(52, 54)} ${at(50, 47.5)} ${at(58, 48.4)}S${at(54, 45.4)} ${at(52, 45.2)}`,
    `M${at(70, 51)}C${at(86, 55)} ${at(94, 48)} ${at(84, 47.5)}S${at(92, 45)} ${at(100, 45.3)}`,
  ];
  // The long slide, coiling down just off the slanted stern.
  const coil = [
    40,
    33,
    26,
    19,
    12,
  ].map(
    (h, i): Pt => [
      aftX(h) + (i % 2 ? 4 : -2.5),
      h,
    ],
  );
  let abyss = `M${at(60, 50)}C${at(40, 52)} ${at(aftX(46) - 6, 46)} ${at(...coil[0])}`;
  for (let i = 1; i < coil.length; i++) abyss += `S${at(coil[i][0] + (i % 2 ? -3 : 3), coil[i][1] + 3.5)} ${at(...coil[i])}`;
  const radar = mastOf(276, sheer(276) + 45, sheer(276) + 53, 0.6, 0);
  const windows = windowsOf(
    [
      // Two rows of ports in the hull.
      ...winRows(
        [
          [
            -3.5,
            16,
            298,
          ],
          [
            -7,
            18,
            294,
          ],
        ],
        {
          step: 2.4,
          w: 0.8,
          t: 0.8,
          part: "hull",
          group: [
            8,
            20,
          ],
          gap: 1,
          off: 0.2,
          on: 0.5,
        },
      ),
      // A row of balconies along every deck.
      ...Array.from(
        {
          length: DECKS,
        },
        (_, i): WinRow => ({
          h: rowH(i),
          x0: onGrid(aftX(rowH(i) + 1) + 1.8),
          x1: foreX(rowH(i) + 1) - 2,
          step: 2.2,
          w: 1.75,
          t: 1.6,
          part: "super",
          group: [
            12,
            40,
          ],
          gap: 1,
          off: 0.22,
          on: 0.42,
        }),
      ),
      // The bridge.
      ...winRows(
        [
          [
            37.5,
            269.5,
            284.5,
          ],
        ],
        {
          step: 1.4,
          w: 1.2,
          t: 1.4,
          part: "super",
          group: [
            20,
            20,
          ],
          gap: 1,
          off: 0.05,
          on: 0.9,
        },
      ),
    ],
    deckY,
    rand,
  );
  const hero = heroLights(
    (x, i) => deckY(x, rowH(i)),
    (j) => 5 + j * GRID,
    {
      row0: 1,
      col0: 47,
      w: 1.75,
      t: 1.6,
    },
  );
  const water = shipWater(rand, {
    stern: sternX(0),
    bow: bowX(0),
    left: frame.left,
    bottom: frame.bottom,
    len,
    litAt: windows.litAt,
    bands: [
      {
        from: 0,
        to: 1.4,
        cls: "sh-refl-navy",
        spans: [
          [
            8,
            len - 10,
          ],
        ],
      },
      {
        from: 1.4,
        to: 15,
        cls: "sh-refl-white",
        spans: [
          [
            8,
            len - 14,
          ],
        ],
      },
    ],
  });
  return {
    frame,
    grads: [
      vGrad("white", -62, -2, "var(--sh-white-hi)", "var(--sh-white)"),
    ],
    smoke: smokeFrom(
      rand,
      [
        122,
        deckY(122, 55.4),
      ],
      6,
      0.8,
      0.16,
    ),
    inks: [
      {
        d: radar.d + shipRect(273, deckY(276, 51.4), 6, 0.45),
        cls: "sh-mast",
      },
      ...water.back,
      {
        d: hullOf(sternX, bowX, sheer, len) + decks + tower,
        grad: "white",
      },
      {
        d: hullBand(sternX, bowX, 0, 2.4),
        cls: "sh-cr-band",
      },
      {
        d: recess,
        cls: "sh-cr-recess",
      },
      {
        d: solarium,
        cls: "sh-win",
      },
      {
        d: wall,
        cls: "sh-cr-wall",
      },
      {
        d: funnel(0, 1),
        cls: "sh-boat",
      },
      {
        d: funnel(0.55, 0.75),
        cls: "sh-cr-funnel",
      },
      {
        d: funnel(0.88, 1),
        cls: "sh-cr-band",
      },
      ...windows.inks,
      ...hero,
      {
        d: boats,
        cls: "sh-cr-tender",
      },
      {
        d: abyss,
        cls: "sh-cr-slide-3",
      },
      {
        d: slides[0],
        cls: "sh-cr-slide-1",
      },
      {
        d: slides[1],
        cls: "sh-cr-slide-2",
      },
      water.foam,
    ],
    lamps: [
      radar.top,
      [
        3.4,
        deckY(3.4, 2),
      ],
    ],
    green: [
      286.4,
      deckY(286.4, 37.6),
    ],
    aft: water.aft,
    bow: water.bow,
  };
}

const SHIP_ART: Record<ShipKind, ShipArt> = {
  liner: linerArt(),
  clipper: clipperArt(),
  freighter: freighterArt(),
  cruise: cruiseArt(),
};

/** A ship as one inline SVG, heading east (a west-bound crossing mirrors it in CSS): its smoke, then its inks
 *  back to front (rigging and masts, the reflection and the wake on the water, the hull and everything on it,
 *  the windows, the foam over the hull's foot), then its running lights. Night-only parts (the halos, the
 *  lights' streaks, the running lights) sit in .sh-night groups. */
function Ship({ kind, west = false }: { kind: ShipKind; west?: boolean }) {
  const art = SHIP_ART[kind];
  const { frame } = art;
  // Per instance: url(#…) resolves to the first matching id in the document (see ForestRidge).
  const scope = useId().replace(/[^\w-]/g, "");
  const id = (part: string) => `${scope}sh-${part}`;
  const url = (part: string) => `url(#${id(part)})`;
  const stop = (offset: number, color: string, opacity?: number) => (
    <stop
      key={offset}
      offset={offset}
      style={{
        stopColor: color,
        stopOpacity: opacity,
      }}
    />
  );
  /** A luminance mask that fades what it masks out along one axis, from `start` (white: fully drawn) to nothing. */
  const fade = (name: string, [x1, y1]: Pt, [x2, y2]: Pt, start = "#fff") => (
    <>
      <linearGradient id={id(`${name}-ramp`)} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
        <stop offset="0" stopColor={start} />
        <stop offset="1" stopColor="#000" />
      </linearGradient>
      <mask id={id(name)} maskUnits="userSpaceOnUse" x={frame.left} y={frame.top} width={frame.w} height={frame.h}>
        <rect x={frame.left} y={frame.top} width={frame.w} height={frame.h} fill={url(`${name}-ramp`)} />
      </mask>
    </>
  );
  return (
    <svg className="sh-paint" viewBox={`${f1(frame.left)} ${frame.top} ${f1(frame.w)} ${frame.h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        {art.grads.map((g) => (
          <linearGradient key={g.key} id={id(g.key)} gradientUnits={g.user ? "userSpaceOnUse" : undefined} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
            {g.stops.map(([offset, color, opacity]) => stop(offset, color, opacity))}
          </linearGradient>
        ))}
        <radialGradient id={id("smoke")}>
          {stop(0, "var(--sh-smoke)", 0.9)}
          {stop(0.55, "var(--sh-smoke)", 0.45)}
          {stop(1, "var(--sh-smoke)", 0)}
        </radialGradient>
        <radialGradient id={id("halo")}>
          {stop(0, "var(--sh-lamp)", 0.7)}
          {stop(1, "var(--sh-lamp)", 0)}
        </radialGradient>
        {fade(
          "down",
          [
            0,
            0.5,
          ],
          [
            0,
            frame.bottom - 1,
          ],
          "#a6a6a6",
        )}
        {fade(
          "aft",
          [
            art.aft[0],
            0,
          ],
          [
            art.aft[1],
            0,
          ],
        )}
        {fade(
          "bow",
          [
            art.bow[0],
            0,
          ],
          [
            art.bow[1],
            0,
          ],
        )}
      </defs>
      {art.smoke.map(({ cx, cy, r, o }) => (
        <circle key={`${f1(cx)},${f1(cy)}`} cx={f1(cx)} cy={f1(cy)} r={f1(r)} opacity={f2(o)} fill={url("smoke")} />
      ))}
      {art.inks
        .filter(({ d, only }) => d && only !== (west ? "east" : "west"))
        .map(({ d, cls, grad, mask, night, wrap }, i) => {
          const path = <path key={i} className={cls} d={d} fill={grad ? url(grad) : undefined} mask={mask ? url(mask) : undefined} />;
          const group = [
            night ? "sh-night" : "",
            wrap ?? "",
          ]
            .join(" ")
            .trim();
          return group ? (
            <g key={i} className={group}>
              {path}
            </g>
          ) : (
            path
          );
        })}
      <g className="sh-night">
        {art.lamps.map(([x, y]) => (
          <Fragment key={`${f1(x)},${f1(y)}`}>
            <circle cx={f1(x)} cy={f1(y)} r="2.6" fill={url("halo")} />
            <circle className="sh-lamp" cx={f1(x)} cy={f1(y)} r="0.45" />
          </Fragment>
        ))}
        <circle className="sh-green" cx={f1(art.green[0])} cy={f1(art.green[1])} r="1.2" opacity="0.35" />
        <circle className="sh-green" cx={f1(art.green[0])} cy={f1(art.green[1])} r="0.45" />
      </g>
    </svg>
  );
}

/** The lights that switch on and off, and the cruise ship's HERO. Each BLINK_SETS set keeps its own clock:
 *  the even sets are lit and go dark for a stretch (sh-lights-out), the odd ones are dark and come on
 *  (sh-lights-on), and still (Speed 0, reduced motion) each holds its resting state. A switch is instant:
 *  steps(1, end) holds every keyframe until the next. The HERO lights run on two crossings' clock, phased
 *  with the crossing, so they show every other one as the ship passes mid-scene: the block goes dark, the
 *  letters come on one after another and go out in the same order. Built outside SHIPIT_STYLES, as
 *  seaRowRules is. */
function lightsRules() {
  const clocks = [
    [
      5.3,
      -1.9,
    ],
    [
      4.1,
      -0.7,
    ],
    [
      6.7,
      -4.6,
    ],
    [
      3.7,
      -2.9,
    ],
    [
      7.9,
      -0.4,
    ],
    [
      5.9,
      -3.3,
    ],
  ];
  const sets = Array.from(
    {
      length: BLINK_SETS,
    },
    (_, i) => {
      const [k, d] = clocks[i % clocks.length];
      return `.sh-blink-${i} { --sh-bk: ${k}; --sh-bd: ${d};${i % 2 ? " opacity: 0; animation-name: sh-lights-on;" : ""} }`;
    },
  ).join("\n");
  const start = f2(-SHIP_LOOP * SHIP_REST);
  return `.sh-blink {
  animation: sh-lights-out calc(var(--pat-dur, 8s) * var(--sh-bk, 5)) steps(1, end) calc(var(--pat-dur, 8s) * var(--sh-bd, 0)) infinite;
}
${sets}
@keyframes sh-lights-out {
  0%, 30% { opacity: 1; }
  31%, 54% { opacity: 0; }
  55%, 100% { opacity: 1; }
}
@keyframes sh-lights-on {
  0%, 18% { opacity: 0; }
  19%, 63% { opacity: 1; }
  64%, 100% { opacity: 0; }
}
.sh-hero-dark, .sh-hero {
  opacity: 0;
  animation: sh-hero-dark calc(var(--pat-dur, 8s) * ${2 * SHIP_LOOP}) steps(1, end) calc(var(--pat-dur, 8s) * ${start}) infinite;
}
.sh-hero {
  animation-name: sh-hero;
  animation-delay: calc(var(--pat-dur, 8s) * (${start} + var(--sh-hd, 0)));
}
.sh-hero-1 { --sh-hd: 0.08; }
.sh-hero-2 { --sh-hd: 0.16; }
.sh-hero-3 { --sh-hd: 0.24; }
@keyframes sh-hero-dark {
  0%, 22% { opacity: 0; }
  22.1%, 29.5% { opacity: 1; }
  29.6%, 100% { opacity: 0; }
}
@keyframes sh-hero {
  0%, 22.6% { opacity: 0; }
  22.7%, 28% { opacity: 1; }
  28.1%, 100% { opacity: 0; }
}`;
}

/** Each ship's box: as wide and tall as its drawing, its waterline on SHIP_WATERLINE. Built outside
 *  SHIPIT_STYLES, as seaRowRules is. */
function shipBoxRules() {
  return SHIP_KINDS.map((kind) => {
    const { frame } = SHIP_ART[kind];
    return `.sh-k-${kind} {
  bottom: ${f2(100 - SHIP_WATERLINE - frame.bottom * SHIP_SU)}vh;
  width: ${f2(frame.w * SHIP_SU)}vh;
  height: ${f2(frame.h * SHIP_SU)}vh;
}`;
  }).join("\n");
}

/** Each row's own knobs: its tile and caps, its colours by nearness, and how wide its glitter runs. Built
 *  outside SHIPIT_STYLES so the stylesheet holds no nested template (check-patterns reads it to its first
 *  backtick-semicolon). */
function seaRowRules() {
  return SEA_PATHS.map(({ h, mask, caps }, i) => {
    const row = SEA_ROWS[i];
    const next = SEA_ROWS[i + 1];
    // How near the row is, 0 at the horizon to 1 at the front.
    const k = (i / (SEA_ROWS.length - 1)) ** 0.85;
    return `.sh-r${i} {
  --sh-rh: ${f2(h)}vh;
  --sh-m: ${mask};
  --sh-cm: ${caps};
  --sh-rt: ${row.tile}vh;
  --sh-mx: ${f2(-mulberry32(row.seed + 1)() * row.tile)}vh;
  --sh-c: color-mix(in oklab, var(--sh-far), var(--sh-near) ${Math.round(k * 100)}%);
  --sh-d: color-mix(in oklab, var(--sh-far-deep), var(--sh-near-deep) ${Math.round(k * 100)}%);
  --sh-band: ${f2(next ? next.top + next.amp - row.top : h)}vh;
  --sh-gw: ${f2(3 + 24 * k)}vh;
  --sh-gh: ${f2(row.amp * 3 + 1)}vh;
  --sh-ga: ${100 - Math.round(k * 30)}%;
}`;
  }).join("\n");
}

const SHIPIT_STYLES = `
[data-pattern="shipit"] {
  /* DAY — SUNSET at sea. A clear blue zenith (the top stops take the theme cast like the other day skies)
     warming to gold at the skyline, where the sun sits on the water. The sea runs from a pale hazy blue at
     the horizon to a deep blue up close, and stays light enough (the nearest trough at L 0.55) for dark
     text on a light page. */
  --sw-cast: min(calc(var(--glass-tint-c, 0.018) * 250%), 16%);
  --sh-sky-a: ${tintCast(0.62, 0.1, 248, 0.09)};
  --sh-sky-b: ${tintCast(0.74, 0.08, 238, 0.07)};
  --sh-sky-c: ${tintCast(0.84, 0.05, 222, 0.045)};
  --sh-sky-d: oklch(0.9 0.055 82);
  --sh-sky-e: oklch(0.88 0.075 62);
  --sh-far: oklch(0.8 0.045 218);
  --sh-far-deep: oklch(0.73 0.055 225);
  --sh-near: oklch(0.63 0.085 234);
  --sh-near-deep: oklch(0.55 0.09 240);
  --sh-crest: oklch(0.93 0.03 205); /* what a crest's cap leans toward, away from the glitter */
  --sh-crest-mix: 42%;
  --sh-glint: oklch(0.97 0.1 88); /* the glitter path: low sun on the crests */
  /* The water under the sun is LIGHTER, not warmer: a warm wash composited over blue greys it. The warmth
     is the glitter's. */
  --sh-sheen: oklch(0.9 0.035 210 / 0.35);
  /* The sun's path: near white at the horizon, warming to gold toward the viewer as it fades. */
  --sh-path-1: oklch(0.98 0.07 92);
  --sh-path-2: oklch(0.94 0.1 84 / 0.85);
  --sh-path-3: oklch(0.88 0.12 72 / 0.7);
  --sh-path-4: oklch(0.84 0.12 62 / 0.55);
  --sh-path-w: 70vh;
  --sh-glow: oklch(0.93 0.09 75 / 0.55);
  --sh-haze: oklch(0.91 0.045 70 / 0.55);
  /* The liner: black hull, red band, white superstructure, buff funnels with black tops. */
  --sh-hull: oklch(0.17 0.01 260);
  --sh-hull-hi: oklch(0.31 0.015 250);
  --sh-red: oklch(0.5 0.16 27);
  --sh-gold: oklch(0.8 0.1 82);
  --sh-white: oklch(0.88 0.015 245);
  --sh-white-hi: oklch(0.97 0.018 85);
  --sh-deck: oklch(0.78 0.02 245);
  --sh-buff: oklch(0.62 0.09 66);
  --sh-buff-lit: oklch(0.8 0.11 76);
  --sh-black: oklch(0.2 0.01 60);
  --sh-boat: oklch(0.95 0.012 85);
  --sh-mast: oklch(0.5 0.05 60);
  --sh-wire: oklch(0.3 0.01 250 / 0.5);
  /* By day every window is glass: the portholes catch the sky, the superstructure's are dark. */
  --sh-port: oklch(0.55 0.03 235);
  --sh-port-lit: var(--sh-port);
  --sh-glass: oklch(0.42 0.03 250);
  --sh-glass-lit: var(--sh-glass);
  --sh-lamp: oklch(0.92 0.13 88);
  /* Shown only at night (the .sh-night parts), set once here for both modes. */
  --sh-halo: oklch(0.85 0.16 82 / 0.3);
  --sh-halo-wide: oklch(0.8 0.15 75 / 0.12);
  --sh-green: oklch(0.8 0.2 150);
  --sh-foam: oklch(0.98 0.012 220 / 0.92);
  --sh-smoke: oklch(0.6 0.015 60);
  --sh-refl-red: oklch(0.45 0.1 30);
  --sh-refl-hull: oklch(0.3 0.03 245);
  --sh-refl-white: oklch(0.9 0.03 215);
  --sh-refl-buff: oklch(0.72 0.08 70);
  /* The clipper: black wood on a copper bottom, a cream band of ports, canvas warmed by the low sun. */
  --sh-cl-hull: oklch(0.19 0.012 50);
  --sh-cl-hull-hi: oklch(0.31 0.02 55);
  --sh-cl-band: oklch(0.86 0.06 85);
  --sh-cl-copper: oklch(0.62 0.12 50);
  --sh-cl-rail: oklch(0.9 0.02 85);
  --sh-spar: oklch(0.34 0.04 55);
  --sh-sail: oklch(0.8 0.045 72);
  --sh-sail-lit: oklch(0.97 0.035 88);
  --sh-refl-copper: oklch(0.5 0.09 50);
  --sh-refl-band: oklch(0.76 0.05 85);
  --sh-refl-sail: oklch(0.88 0.04 80);
  /* The freighter: a navy hull, boxes in a run of lines' colours, a funnel banded in the chosen colour. */
  --sh-fr-hull: oklch(0.56 0.11 238);
  --sh-fr-hull-hi: oklch(0.67 0.1 232);
  --sh-fr-deck: oklch(0.76 0.01 250);
  --sh-fr-funnel: oklch(0.6 0.11 236);
  --sh-fr-mark: oklch(0.6 0.16 var(--accent-h, var(--glass-tint-h, 25)));
  --sh-cargo-1: oklch(0.67 0.11 230); /* the line's own blue */
  --sh-cargo-2: oklch(0.42 0.09 258);
  --sh-cargo-3: oklch(0.88 0.01 240);
  --sh-cargo-4: oklch(0.52 0.15 28);
  --sh-cargo-5: oklch(0.7 0.15 58);
  --sh-cargo-6: oklch(0.6 0.01 250);
  --sh-cargo-gap: oklch(0.22 0.02 250);
  --sh-refl-fr: oklch(0.52 0.08 236);
  --sh-refl-navy: oklch(0.34 0.05 255);
  --sh-refl-cargo: oklch(0.56 0.08 230);
  /* The cruise ship: white over a navy boot-topping, orange lifeboats in a dark recess, a funnel band and
     a waterslide in the chosen colour. */
  --sh-cr-band: oklch(0.3 0.07 258);
  --sh-cr-funnel: oklch(0.55 0.14 var(--accent-h, var(--glass-tint-h, 250)));
  --sh-cr-tender: oklch(0.7 0.17 55);
  --sh-cr-recess: oklch(0.42 0.02 250);
  --sh-cr-wall: oklch(0.72 0.04 70);
  --sh-cr-slide-1: oklch(0.62 0.17 var(--accent-h, var(--glass-tint-h, 300)));
  --sh-cr-slide-2: oklch(0.72 0.16 60);
  --sh-cr-slide-3: oklch(0.56 0.15 285);
  --sw-sun-o: 1;
  --sw-moon-o: 0;
  --sw-sun-d: block;
  --sw-moon-d: none;
  --sun-size: 34vh;
  --sun-h: var(--accent-h, var(--glass-tint-h, 35));
  --sw-disc-1: oklch(0.6 0.21 var(--sun-h));
  --sw-disc-2: color-mix(in oklch, oklch(0.68 0.2 var(--sun-h)), oklch(0.74 0.18 48) 30%);
  --sw-disc-3: color-mix(in oklch, oklch(0.76 0.18 var(--sun-h)), oklch(0.82 0.17 66) 58%);
  --sw-disc-4: color-mix(in oklch, oklch(0.85 0.15 var(--sun-h)), oklch(0.89 0.15 80) 80%);
  --sw-disc-5: oklch(0.94 0.13 94);
  --sw-disc-glow: oklch(0.84 0.15 var(--sun-h) / 0.42);
  --sw-stars-o: 0;
}
.dark [data-pattern="shipit"] {
  /* NIGHT — the same sea under the moon: navy sky, dark swell with a silver path to the moon, and the
     liner a black shape picked out by its lit windows, their light streaking the water. */
  --sh-sky-a: oklch(0.09 0.035 262);
  --sh-sky-b: oklch(0.12 0.045 266);
  --sh-sky-c: oklch(0.16 0.05 270);
  --sh-sky-d: oklch(0.2 0.05 268);
  --sh-sky-e: oklch(0.23 0.045 262);
  --sh-far: oklch(0.21 0.04 255);
  --sh-far-deep: oklch(0.17 0.04 256);
  --sh-near: oklch(0.13 0.035 252);
  --sh-near-deep: oklch(0.09 0.03 255);
  --sh-crest: oklch(0.38 0.04 248);
  --sh-crest-mix: 30%;
  --sh-glint: oklch(0.86 0.03 250);
  --sh-sheen: oklch(0.55 0.04 250 / 0.25);
  /* The moon's path: silver, cooling and fading toward the viewer. */
  --sh-path-1: oklch(0.95 0.015 250);
  --sh-path-2: oklch(0.9 0.025 252 / 0.85);
  --sh-path-3: oklch(0.82 0.035 258 / 0.7);
  --sh-path-4: oklch(0.74 0.04 262 / 0.55);
  --sh-path-w: 46vh;
  --sh-glow: oklch(0.6 0.05 262 / 0.3);
  --sh-haze: oklch(0.3 0.04 260 / 0.35);
  --sh-hull: oklch(0.1 0.01 260);
  --sh-hull-hi: oklch(0.2 0.02 255);
  --sh-red: oklch(0.27 0.07 25);
  --sh-gold: oklch(0.45 0.06 80);
  --sh-white: oklch(0.4 0.025 258);
  --sh-white-hi: oklch(0.54 0.025 255);
  --sh-deck: oklch(0.33 0.02 258);
  --sh-buff: oklch(0.28 0.035 66);
  --sh-buff-lit: oklch(0.4 0.05 72);
  --sh-black: oklch(0.1 0.01 260);
  --sh-boat: oklch(0.55 0.02 255);
  --sh-mast: oklch(0.28 0.03 65);
  --sh-wire: oklch(0.4 0.02 255 / 0.5);
  --sh-port: oklch(0.17 0.015 255);
  --sh-glass: oklch(0.2 0.02 260);
  /* Lit windows: lamplight yellow, haloed. */
  --sh-lamp: oklch(0.9 0.15 88);
  --sh-port-lit: var(--sh-lamp);
  --sh-glass-lit: var(--sh-lamp);
  --sh-foam: oklch(0.6 0.02 250 / 0.8);
  --sh-smoke: oklch(0.32 0.015 258);
  --sh-refl-red: oklch(0.14 0.03 25);
  --sh-refl-hull: oklch(0.07 0.01 260);
  --sh-refl-white: oklch(0.32 0.025 255);
  --sh-refl-buff: oklch(0.2 0.03 70);
  --sh-cl-hull: oklch(0.1 0.01 50);
  --sh-cl-hull-hi: oklch(0.18 0.015 55);
  --sh-cl-band: oklch(0.4 0.03 80);
  --sh-cl-copper: oklch(0.28 0.06 45);
  --sh-cl-rail: oklch(0.45 0.02 255);
  --sh-spar: oklch(0.17 0.02 260);
  --sh-sail: oklch(0.34 0.02 258);
  --sh-sail-lit: oklch(0.56 0.025 255);
  --sh-refl-copper: oklch(0.15 0.03 45);
  --sh-refl-band: oklch(0.24 0.02 255);
  --sh-refl-sail: oklch(0.3 0.02 255);
  --sh-fr-hull: oklch(0.17 0.04 240);
  --sh-fr-hull-hi: oklch(0.25 0.045 236);
  --sh-fr-deck: oklch(0.34 0.015 255);
  --sh-fr-funnel: oklch(0.22 0.04 238);
  --sh-fr-mark: oklch(0.32 0.09 var(--accent-h, var(--glass-tint-h, 25)));
  --sh-cargo-1: oklch(0.28 0.05 232);
  --sh-cargo-2: oklch(0.2 0.04 258);
  --sh-cargo-3: oklch(0.38 0.01 245);
  --sh-cargo-4: oklch(0.25 0.07 28);
  --sh-cargo-5: oklch(0.32 0.07 58);
  --sh-cargo-6: oklch(0.27 0.01 250);
  --sh-cargo-gap: oklch(0.08 0.01 260);
  --sh-refl-fr: oklch(0.11 0.02 240);
  --sh-refl-navy: oklch(0.08 0.015 258);
  --sh-refl-cargo: oklch(0.14 0.02 250);
  --sh-cr-band: oklch(0.14 0.03 258);
  --sh-cr-funnel: oklch(0.28 0.07 var(--accent-h, var(--glass-tint-h, 250)));
  --sh-cr-tender: oklch(0.36 0.08 50);
  --sh-cr-recess: oklch(0.12 0.01 260);
  --sh-cr-wall: oklch(0.3 0.02 70);
  --sh-cr-slide-1: oklch(0.32 0.08 var(--accent-h, var(--glass-tint-h, 300)));
  --sh-cr-slide-2: oklch(0.36 0.08 60);
  --sh-cr-slide-3: oklch(0.3 0.08 285);
  --sh-night-d: inline;
  --sw-sun-o: 0;
  --sw-moon-o: 1;
  --sw-sun-d: none;
  --sw-moon-d: block;
  /* Risen a little clear of the horizon, so its path runs down the sea to the viewer. */
  --moon-size: 22vh;
  --moon-bottom: 52%;
  --moon-dip: 0%;
  --sw-moon-1: oklch(0.95 0.015 255);
  --sw-moon-2: oklch(0.85 0.035 262);
  --sw-moon-3: oklch(0.72 0.06 270);
  --sw-maria: 0.64 0.05 268;
  --sw-disc-glow: oklch(0.82 0.05 250 / 0.45);
  --sw-stars-o: 1;
}
/* A size container, so the liner's crossing can be measured in the scene's own width (cqw), which holds in
   a preview swatch as well as in a full window. */
.sh-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  container-type: inline-size;
  background: linear-gradient(
    to bottom,
    var(--sh-sky-a) 0%,
    var(--sh-sky-b) 24%,
    var(--sh-sky-c) 40%,
    var(--sh-sky-d) 51%,
    var(--sh-sky-e) 58%,
    var(--sh-far) 58.3%
  );
}
/* The bloom around the disc. Painted before the sea, so only its sky half shows: on the water the caps'
   glitter and the rows' sheen carry the light. */
.sh-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(70vh 22vh at var(--sw-disc-x, 50%) 56vh, var(--sh-glow) 0%, transparent 100%);
}
/* A thin haze over the horizon, faded out before the third row starts. */
.sh-haze {
  position: absolute;
  left: 0;
  right: 0;
  top: 55%;
  height: 5.4%;
  background: linear-gradient(to bottom, transparent, var(--sh-haze) 45%, var(--sh-haze) 60%, transparent);
}
/* A row of swell: full width, masked by its repeating tile. */
.sh-row {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--sh-rh);
}
${seaRowRules()}
/* The wave: its row colour at the crests deepening to the trough colour where the next row takes over, with
   a sheen toward the disc. Mixed in OKLab, as every scene mixes light into shade. */
.sh-fill {
  -webkit-mask: var(--sh-m) var(--sh-mx) 0 / var(--sh-rt) 100% repeat-x;
  mask: var(--sh-m) var(--sh-mx) 0 / var(--sh-rt) 100% repeat-x;
  background:
    radial-gradient(calc(var(--sh-gw) * 1.8) calc(var(--sh-band) * 1.6) at var(--sw-disc-x, 50%) 0, var(--sh-sheen) 0%, transparent 100%),
    linear-gradient(to bottom, var(--sh-c) 0, var(--sh-d) var(--sh-band));
}
/* The crests' caps: lighter than the wave everywhere, and the glitter where they face the disc. */
.sh-cap {
  -webkit-mask: var(--sh-cm) var(--sh-mx) 0 / var(--sh-rt) 100% repeat-x;
  mask: var(--sh-cm) var(--sh-mx) 0 / var(--sh-rt) 100% repeat-x;
  background:
    radial-gradient(var(--sh-gw) var(--sh-gh) at var(--sw-disc-x, 50%) 0, color-mix(in oklab, var(--sh-glint) var(--sh-ga), transparent) 0%, transparent 100%),
    color-mix(in oklab, var(--sh-c), var(--sh-crest) var(--sh-crest-mix, 40%));
}
/* THE SUN / MOON PATH, aurora's technique (.au-sunpath): the disc's light broken on the water as a column of
   soft glints that widens toward the viewer, each one nudged off the centre line, blurred so no edge is hard,
   and broken into lines by a fine ripple mask. It replaces a column of hard-edged bars, which near the
   viewer read as pixels. The lit crests in the column (the caps' glint) still sparkle over it. Still, so its
   blur and masks are drawn into the scene group once; the box carries none, as aurora's does not. */
.sh-path {
  position: absolute;
  top: 58.3%;
  bottom: 0;
  left: var(--sw-disc-x, 50%);
  width: var(--sh-path-w, 70vh);
  transform: translateX(-50%);
}
.sh-path-paint {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(9% 5% at 50% 2%, var(--sh-path-1) 0 45%, transparent 78%),
    radial-gradient(13% 6% at 47% 10%, var(--sh-path-1) 0 42%, transparent 78%),
    radial-gradient(18% 7% at 53% 20%, var(--sh-path-2) 0 40%, transparent 80%),
    radial-gradient(24% 7.5% at 46% 32%, var(--sh-path-2) 0 38%, transparent 80%),
    radial-gradient(31% 8% at 54% 46%, var(--sh-path-3) 0 36%, transparent 82%),
    radial-gradient(38% 8.5% at 48% 61%, var(--sh-path-3) 0 34%, transparent 82%),
    radial-gradient(45% 9% at 52% 77%, var(--sh-path-4) 0 32%, transparent 84%),
    radial-gradient(50% 9% at 49% 92%, var(--sh-path-4) 0 30%, transparent 84%);
  filter: blur(6px);
  -webkit-mask-image:
    linear-gradient(to bottom, #000 0 10%, rgb(0 0 0 / 0.7) 50%, transparent 98%),
    repeating-linear-gradient(to bottom, #000 0 3px, rgb(0 0 0 / 0.3) 3px 8px, #000 8px 13px, rgb(0 0 0 / 0.45) 13px 19px);
  mask-image:
    linear-gradient(to bottom, #000 0 10%, rgb(0 0 0 / 0.7) 50%, transparent 98%),
    repeating-linear-gradient(to bottom, #000 0 3px, rgb(0 0 0 / 0.3) 3px 8px, #000 8px 13px, rgb(0 0 0 / 0.45) 13px 19px);
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
}
/* THE SHIP. This box only moves; its SVG child draws. It crosses from just off one side of the scene to just
   off the other (100cqw is the scene's width), and at rest it holds the pose the crossing passes through at
   SHIP_REST of the loop, which the negative delay starts the loop at: set moving, it sails on from where it
   stood. Every ship's box puts the hull's middle (1 - SHIP_REST) of the way across it (frameOf), which is what
   makes that pose the same share of the scene at every width, and one transform serve every ship; each
   ship's own size is its .sh-k-* rule. */
.sh-ship {
  position: absolute;
  left: 0;
  transform: translateX(calc(${Math.round(SHIP_REST * 100)}cqw - ${Math.round((1 - SHIP_REST) * 100)}%));
  animation: sh-east calc(var(--pat-dur, 8s) * ${SHIP_LOOP}) linear calc(var(--pat-dur, 8s) * ${f2(-SHIP_LOOP * SHIP_REST)}) infinite;
  will-change: var(--pat-wc, transform);
}
${shipBoxRules()}
/* Sailing west (the disc on the left), mirrored: it rests as far in from the right. */
.sh-ship.sh-west {
  transform: translateX(calc(${Math.round((1 - SHIP_REST) * 100)}cqw - ${Math.round(SHIP_REST * 100)}%));
  animation-name: sh-west;
}
@keyframes sh-east {
  from { transform: translateX(-100%); }
  to   { transform: translateX(100cqw); }
}
@keyframes sh-west {
  from { transform: translateX(100cqw); }
  to   { transform: translateX(-100%); }
}
.sh-paint {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}
.sh-west .sh-paint {
  transform: scaleX(-1);
}
.sh-night { display: var(--sh-night-d, none); }
.sh-red { fill: var(--sh-red); }
.sh-gold { fill: var(--sh-gold); }
.sh-deck { fill: var(--sh-deck); }
.sh-black { fill: var(--sh-black); }
.sh-boat { fill: var(--sh-boat); }
.sh-mast { fill: var(--sh-mast); }
.sh-wire { fill: none; stroke: var(--sh-wire); stroke-width: 0.22; }
.sh-port { fill: var(--sh-port); }
.sh-port-lit { fill: var(--sh-port-lit); }
.sh-win { fill: var(--sh-glass); }
.sh-win-lit { fill: var(--sh-glass-lit); }
/* A lit window's halo: its own outline stroked wide and faint, twice. One path, so where neighbours' halos
   overlap they do not stack: a run of lit cabins reads as one glowing strip. */
.sh-halo, .sh-halo-wide { fill: none; stroke-linejoin: round; }
.sh-halo { stroke: var(--sh-halo); stroke-width: 1.3; }
.sh-halo-wide { stroke: var(--sh-halo-wide); stroke-width: 3.2; }
.sh-lamp, .sh-streak { fill: var(--sh-lamp); }
.sh-green { fill: var(--sh-green); }
.sh-foam { fill: var(--sh-foam); }
.sh-refl-red { fill: var(--sh-refl-red); }
.sh-refl-hull { fill: var(--sh-refl-hull); }
.sh-refl-white { fill: var(--sh-refl-white); }
.sh-refl-buff { fill: var(--sh-refl-buff); }
.sh-refl-copper { fill: var(--sh-refl-copper); }
.sh-refl-band { fill: var(--sh-refl-band); }
.sh-refl-sail { fill: var(--sh-refl-sail); }
.sh-refl-navy { fill: var(--sh-refl-navy); }
.sh-refl-cargo { fill: var(--sh-refl-cargo); }
.sh-cl-band { fill: var(--sh-cl-band); }
.sh-cl-copper { fill: var(--sh-cl-copper); }
.sh-cl-rail { fill: var(--sh-cl-rail); }
.sh-spar { fill: var(--sh-spar); }
.sh-fr-deck { fill: var(--sh-fr-deck); }
.sh-fr-funnel { fill: var(--sh-fr-funnel); }
.sh-fr-mark { fill: var(--sh-fr-mark); }
.sh-cargo-gap { fill: var(--sh-cargo-gap); }
.sh-refl-fr { fill: var(--sh-refl-fr); }
.sh-cargo-1 { fill: var(--sh-cargo-1); }
.sh-cargo-2 { fill: var(--sh-cargo-2); }
.sh-cargo-3 { fill: var(--sh-cargo-3); }
.sh-cargo-4 { fill: var(--sh-cargo-4); }
.sh-cargo-5 { fill: var(--sh-cargo-5); }
.sh-cargo-6 { fill: var(--sh-cargo-6); }
.sh-cr-band { fill: var(--sh-cr-band); }
.sh-cr-recess { fill: var(--sh-cr-recess); }
.sh-cr-wall { fill: var(--sh-cr-wall); }
/* The waterslides: tubes, so a stroke along a curve. */
.sh-cr-slide-1, .sh-cr-slide-2, .sh-cr-slide-3 { fill: none; stroke-width: 1.1; stroke-linecap: round; }
.sh-cr-slide-1 { stroke: var(--sh-cr-slide-1); }
.sh-cr-slide-2 { stroke: var(--sh-cr-slide-2); }
.sh-cr-slide-3 { stroke: var(--sh-cr-slide-3); }
.sh-cr-funnel { fill: var(--sh-cr-funnel); }
.sh-cr-tender { fill: var(--sh-cr-tender); }
${lightsRules()}
${stopRules(".sh-ship", ".sh-blink", ".sh-hero-dark", ".sh-hero")}`;

// Starfield — a deep night field by night, a "morning haze" by day: an azure sky leaning toward the chosen
// colour where it agrees, the nebulae in that colour, and the glints SOFTENED but kept (identity over astronomy — hiding the stars would
// leave an empty gradient; the Tron scenes can hide theirs because the sun/grid carry the scene).
// Same mode recipe as the other scenes: --sf-* palette vars, day on [data-pattern="starfield"], night
// verbatim under .dark. The star dots themselves stay white in both modes — only their layer's opacity
// flips, via the shared --sw-stars-o gate (which the Muse constellation also rides).
const STARFIELD_STYLES = `
[data-pattern="starfield"] {
  /* DAY — a daylight sky: azure, nudged by the accent, with the stars still showing through.
     The sky used to take the accent hue OUTRIGHT (L 0.82 c 0.05, whatever hue the theme supplied), so a
     green theme gave a green sky and every theme gave a washed one — c 0.05 at L 0.82 is spread 56, and
     with an arbitrary hue it just read as grey. Anchoring to blue and MIXING the accent in keeps it a
     sky in every theme while still carrying the colour: across the 17 presets the mixed hue lands
     between 194 and 276, i.e. always blue, spread 82-126 (was 56).
     28% is the ceiling on that mix, and it is measured, not chosen: color-mix interpolates hue along the
     shorter arc, so an amber accent (h75) pulls 240 -> 194 at 28% but -> 182 at 35%, which is teal. Past
     28% the sky stops being blue for warm themes.
     STARS: the dots are hardcoded #fff, so their contrast is purely the sky's lightness. L 0.78 puts
     them +22 L clear (the old L 0.82 at 0.75 opacity gave +13.5), and the gate goes to 1 — this is the
     one scene where the stars ARE the subject, so they should not be half-faded by day.
     NEBULAE sit below the sky rather than above it. At the old L 0.92 the sRGB ceiling is 0.037 against
     the 0.1 they asked, so 39% of the colour survived and the wisps rendered near-neutral — the hue had
     nowhere to go. Below the sky it does: capped with min() at 0.10 / 0.09, which holds at EVERY accent
     hue (worst is h200 at 0.106 / 0.099), 7-8 L clear of the sky and now reading as accent-coloured
     wisps against the blue rather than grey smudges.
     THE CHOSEN COLOUR, by day and by night, lives in the NEBULAE; the sky leans toward it only as far as
     the two hues agree (the cosine of their distance, nothing at 90° or more: tintCast's rule). At a flat
     28%, "always blue" held on paper but not on screen: amber's 194 reads teal, and the warm themes'
     clouds were muddy olive and brown on it; the reds' 290s read lavender. Now a warm theme keeps the
     azure sky and carries its colour in the clouds, which are stronger to carry it (0.55 / 0.4 → 0.8 /
     0.65), and a blue or violet theme tints the sky as before. The second cloud turns toward RED
     (--sf-h2), not a fixed +40°: from amber or citrine +40° landed on olive, and from a blue it heads for
     violet either way. */
  --sf-h: var(--accent-h, var(--glass-tint-h, 240));
  --sf-h2: calc(var(--sf-h) + 40 * sin(calc((20 - var(--sf-h)) * 1deg)));
  --sf-bg: color-mix(
    in oklch,
    oklch(0.78 0.1 240),
    oklch(0.78 0.1 var(--sf-h)) calc(28% * max(0, cos(calc((var(--sf-h) - 240) * 1deg))))
  );
  --sf-nebula-1: oklch(0.64 min(var(--accent-c, 0.1), 0.1) var(--sf-h) / 0.8);
  --sf-nebula-2: oklch(0.6 min(var(--accent-c, 0.09), 0.09) var(--sf-h2) / 0.65);
  --sw-stars-o: 1;
  /* Not faded at all by day: the layer gate is already 1, and this gives each dot a solid core so it
     is genuinely opaque rather than a gradient that is only white at its centre pixel. Mean alpha
     across the dot goes 0.333 -> 0.655, i.e. an effective +14.4 L over the L-0.78 sky instead of +7.3. */
  --star-core: 60%;
}
.dark [data-pattern="starfield"] {
  /* NIGHT — a deep blue field (selenite's, h 250) with the chosen colour in the nebulae, by the day's rule.
     The sky used to BE the chosen colour at L 0.19, which read as night only for the blues and violets:
     amber and carnelian made it brown, citrine and peridot olive. Now it leans toward the colour as far as
     the hues agree, all the way for a blue (sapphire's night is unchanged), none for a warm one; the
     clouds are stronger to carry the colour (0.42 / 0.3 → 0.75 / 0.55) and glow amber, gold, red or green
     on the blue, and the second takes --sf-h2 as by day. */
  --sf-bg: color-mix(
    in oklch,
    oklch(0.19 0.055 250),
    oklch(0.19 0.055 var(--sf-h)) calc(100% * max(0, cos(calc((var(--sf-h) - 250) * 1deg))))
  );
  --sf-nebula-1: oklch(0.5 var(--accent-c, 0.17) var(--sf-h) / 0.75);
  --sf-nebula-2: oklch(0.45 var(--accent-c, 0.16) var(--sf-h2) / 0.55);
  --sw-stars-o: 1;
  /* Pinned back to the original falloff. --star-core lives in the shared base block, which night
     inherits, and night's stars already read fine on a near-black sky — solidifying them there would
     have made them chunkier for no reason, in the mode that already works. */
  --star-core: 0%;
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
// row/column center via CSS round(down, <nominal>, var(--pac-cell)) + cell/2, where round() exists (pellet centers sit at
// (k + 0.5)·cell), so Pac chomps ALONG a dot line at every density and viewport, no JS. Sprites are
// --pac-sprite = min(cell, 34px): never bigger than one dot cell (dense shrinks them to the cell; sparse
// keeps them 34px inside the larger cell), Pac and ghost the same size, centered on the row.
// MODE-AWARE like the Tron scenes: the --pac-* palette carries a sunlit theme-tinted maze by day (tonal
// paper field, tonal-dark pellets/walls) and the original CRT arcade values by night, all hue-tracking
// the tint — the light/dark flip is pure CSS. Pac himself keeps his gold in both.
// STILL: where each lane stands when nothing moves (Speed 0 or reduced motion), as its runners' BASE
// transforms, which the running animations override. With the animations gone they used to sit at their
// keyframe origins: every Pac off-screen to the left and every ghost stacked in one column at the edge.
// `pac` / `ghost` are the sprites' leading positions in vw (vh for the N–S lanes); `scared` ghosts hold the
// fright blue, about to be eaten. Poses keep clear of the N–S columns where those lanes' own sprites stand
// (a 30% ghost at 69vw sat on the 74% column's ghost on short windows).
const PAC_LANES = [
  {
    top: "12%",
    factor: 2.3,
    still: {
      pac: 34,
      ghost: 52,
      scared: false,
    },
    hue: "var(--hue-complement)",
    frightDur: "9s",
    delay: "0s",
    caught: false,
  },
  {
    top: "30%",
    factor: 1.9,
    still: {
      pac: 52,
      ghost: 59,
      scared: true,
    },
    hue: "calc(var(--hue-complement) + 22)",
    frightDur: "7.5s",
    delay: "-3s",
    caught: true,
  },
  {
    top: "50%",
    factor: 3,
    still: {
      pac: 12,
      ghost: 36,
      scared: false,
    },
    hue: "calc(var(--hue-complement) - 24)",
    frightDur: "10s",
    delay: "-1.5s",
    caught: false,
  },
  {
    top: "70%",
    factor: 2.1,
    still: {
      pac: 44,
      ghost: 51,
      scared: true,
    },
    hue: "calc(var(--hue-complement) + 44)",
    frightDur: "8.5s",
    delay: "-5s",
    caught: true,
  },
  {
    top: "88%",
    factor: 2.6,
    still: {
      pac: 76,
      ghost: 93,
      scared: false,
    },
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
    still: {
      pac: 58,
      ghost: 77,
      scared: false,
    },
    hue: "calc(var(--hue-complement) + 12)",
    frightDur: "8s",
    delay: "-2s",
    caught: true,
    up: false,
  },
  {
    left: "74%",
    factor: 2,
    still: {
      pac: 40,
      ghost: 19,
      scared: true,
    },
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

/** The fright blue a scared ghost turns (pac-fright's peak), held by a STILL scared ghost. */
const PAC_FRIGHT = "oklch(0.6 0.2 262)";

/** A lane's shared vars, for its wake layer and its sprite layer alike. */
function pacVars(lane: (typeof PAC_LANES)[number] | (typeof PAC_VLANES)[number]) {
  return {
    "--pac-dur": `calc(var(--pat-dur, 8s) * ${lane.factor})`,
    "--pac-ghost": `oklch(0.68 0.19 ${lane.hue})`,
    "--pac-ghost-still": lane.still.scared ? PAC_FRIGHT : undefined,
    "--pac-fright-dur": lane.frightDur,
    "--pac-delay": lane.delay,
  };
}

const pacLane = (lane: (typeof PAC_LANES)[number]) =>
  ({
    // The NOMINAL position; .pac-lane snaps it to the pellet grid where round() exists (see there).
    "--pac-top": lane.top,
    "--pac-x": `${lane.still.pac}vw`,
    "--ghost-x": `${lane.still.ghost}vw`,
    ...pacVars(lane),
  }) as CSSProperties;

const pacVlane = (lane: (typeof PAC_VLANES)[number]) =>
  ({
    // The NOMINAL position; .pac-vlane snaps it to the pellet columns where round() exists.
    "--pac-left": lane.left,
    "--pac-y": `${lane.still.pac}vh`,
    "--ghost-y": `${lane.still.ghost}vh`,
    ...pacVars(lane),
  }) as CSSProperties;

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
  /* Sprite box: 1.3 pellet cells, capped at 1.3 × the classic 34px: Pac and the ghosts stand out over the
     dot grid as they do in the arcade, rather than fitting inside one cell. Pac and ghost share it. */
  --pac-sprite: calc(min(var(--pac-cell, 34px), 34px) * 1.3);
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
  top: var(--pac-top);
  left: 0;
  right: 0;
  height: var(--pac-sprite);
  transform: translateY(-50%);
}
/* Each lane SNAPS its nominal position to the nearest pellet-row CENTER below it (rows sit at (k+0.5)·cell),
   so Pac chomps along an actual dot line at every density and viewport; the N–S lanes snap to columns.
   Behind a feature query, as the discs' round() is: Chrome and Edge only have round() from 125, and
   written inline it sat in a calc() with var()s, where an unsupported function does not fall back but
   leaves the property unset, so every lane piled up at the top. Without round() a lane keeps its
   nominal position, a little off the dot line. */
@supports (width: round(1px, 2px)) {
  .pac-lane {
    top: calc(round(down, var(--pac-top), var(--pac-cell, 34px)) + var(--pac-cell, 34px) / 2);
  }
}
/* Pac rides a runner that translates across. Only transforms animate here. The base transform is the lane's
   STILL pose, which the animation overrides while it runs. */
.pac-runner {
  position: absolute;
  top: 50%;
  left: 0;
  width: var(--pac-sprite);
  height: var(--pac-sprite);
  transform: translate(var(--pac-x, 40vw), -50%);
  animation: pac-run var(--pac-dur, 9s) linear infinite;
  animation-delay: var(--pac-delay, 0s);
  will-change: var(--pat-wc, transform);
}
@keyframes pac-run {
  from { transform: translate(-16vw, -50%); }
  to   { transform: translate(112vw, -50%); }
}
/* What Pac has eaten STAYS eaten. His wake is a bg-coloured strip from his mouth back past the left edge, on
   its own runner in step with his, so the row stays cleared behind him for the whole pass; it used to be a
   34vw gradient, so pellets grew back right behind him and the next pass ate them again. It fades only once
   he is off-screen (the last 10% of the pass), so the board refills between passes, not under anyone.
   The wakes sit in a layer BELOW every sprite: a lane's wake would otherwise paint over a Pac or ghost
   crossing it on another lane. */
.pac-wake-runner {
  position: absolute;
  top: 50%;
  left: 0;
  width: var(--pac-sprite);
  height: var(--pac-sprite);
  transform: translate(var(--pac-x, 40vw), -50%);
  animation: pac-eat var(--pac-dur, 9s) linear infinite;
  animation-delay: var(--pac-delay, 0s);
  will-change: var(--pat-wc, transform), var(--pat-wc, opacity);
}
@keyframes pac-eat {
  0%   { transform: translate(-16vw, -50%); opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translate(112vw, -50%); opacity: 0; }
}
.pac-wake {
  position: absolute;
  right: calc(var(--pac-sprite) / 2);
  top: 0;
  width: 140vw;
  height: 100%;
  background: var(--pac-bg);
}
.pac-man {
  position: absolute;
  inset: 0;
  background: oklch(0.86 0.17 96);
  border-radius: 50%;
  /* Mouth open when still: the chomp's widest frame. Without the animation he was a closed yellow disc. */
  clip-path: polygon(50% 50%, 100% 22%, 100% 0, 0 0, 0 100%, 100% 100%, 100% 78%);
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
  transform: translate(var(--ghost-x, 60vw), -50%);
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
/* A ghost is three layers in one element: it bobs; ::before is the masked body, which takes the colour (still,
   a scared lane's ghost holds the fright blue, --pac-ghost-still; running, pac-fright drives it); ::after
   paints the eyes over it, white with pupils looking where it is going (--eye-x / --eye-y). */
.pac-ghost {
  position: absolute;
  inset: 0;
  --eye-x: 2.5%;
  --eye-y: 0%;
  animation: pac-bob 1.1s ease-in-out infinite;
  animation-delay: var(--pac-delay, 0s);
}
.pac-ghost::before,
.pac-vghost::before {
  content: "";
  position: absolute;
  inset: 0;
  background-color: var(--pac-ghost-still, var(--pac-ghost, oklch(0.68 0.19 320)));
  -webkit-mask: ${GHOST} center / contain no-repeat;
  mask: ${GHOST} center / contain no-repeat;
  animation: pac-fright var(--pac-fright-dur, 8s) linear infinite;
  animation-delay: var(--pac-delay, 0s);
}
.pac-ghost::after,
.pac-vghost::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(4.6% 5.4% at calc(37% + var(--eye-x)) calc(41% + var(--eye-y)), oklch(0.32 0.14 262) 92%, transparent),
    radial-gradient(4.6% 5.4% at calc(63% + var(--eye-x)) calc(41% + var(--eye-y)), oklch(0.32 0.14 262) 92%, transparent),
    radial-gradient(8.5% 10% at 37% 40%, oklch(0.97 0.01 262) 94%, transparent),
    radial-gradient(8.5% 10% at 63% 40%, oklch(0.97 0.01 262) 94%, transparent);
}
@keyframes pac-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-5px); }
}
@keyframes pac-fright {
  0%, 76%, 100% { background-color: var(--pac-ghost, oklch(0.68 0.19 320)); }
  84%, 96%      { background-color: ${PAC_FRIGHT}; }
}
/* ── Vertical (N–S) lanes ── same runner idea, turned 90°. Pac faces its travel direction (a static rotate
   reusing the chomp), the wake trails behind, the ghost flees ahead. .pac-vup flips a lane to climb north.
   Distances are in vh — the column spans the viewport height. */
.pac-vlane {
  position: absolute;
  left: var(--pac-left);
  top: 0;
  bottom: 0;
  width: var(--pac-sprite);
  transform: translateX(-50%);
}
/* The columns' snap, as .pac-lane's (see there). AFTER .pac-vlane: at equal specificity a snap written
   before it lost to its nominal left, and the N–S sprites stood 2px off their dot column. */
@supports (width: round(1px, 2px)) {
  .pac-vlane {
    left: calc(round(down, var(--pac-left), var(--pac-cell, 34px)) + var(--pac-cell, 34px) / 2);
  }
}
.pac-vrunner {
  position: absolute;
  left: 50%;
  top: 0;
  width: var(--pac-sprite);
  height: var(--pac-sprite);
  transform: translate(-50%, var(--pac-y, 50vh));
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
  clip-path: polygon(50% 50%, 100% 22%, 100% 0, 0 0, 0 100%, 100% 100%, 100% 78%);
  transform: rotate(90deg);
  animation: pac-chomp 0.34s linear infinite;
  animation-delay: var(--pac-delay, 0s);
}
.pac-vlane.pac-vup .pac-vman { transform: rotate(-90deg); }
.pac-vwake-runner {
  position: absolute;
  left: 50%;
  top: 0;
  width: var(--pac-sprite);
  height: var(--pac-sprite);
  transform: translate(-50%, var(--pac-y, 50vh));
  animation: pac-veat-down var(--pac-dur, 18s) linear infinite;
  animation-delay: var(--pac-delay, 0s);
  will-change: var(--pat-wc, transform), var(--pat-wc, opacity);
}
.pac-vlane.pac-vup .pac-vwake-runner { animation-name: pac-veat-up; }
@keyframes pac-veat-down {
  0%   { transform: translate(-50%, -18vh); opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translate(-50%, 118vh); opacity: 0; }
}
@keyframes pac-veat-up {
  0%   { transform: translate(-50%, 118vh); opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translate(-50%, -18vh); opacity: 0; }
}
.pac-vwake {
  position: absolute;
  left: 0;
  bottom: calc(var(--pac-sprite) / 2);
  width: 100%;
  height: 140vh;
  background: var(--pac-bg);
}
.pac-vlane.pac-vup .pac-vwake {
  bottom: auto;
  top: calc(var(--pac-sprite) / 2);
}
.pac-vghost-runner {
  position: absolute;
  left: 50%;
  top: 0;
  width: var(--pac-sprite);
  height: var(--pac-sprite);
  transform: translate(-50%, var(--ghost-y, 70vh));
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
  --eye-x: 0%;
  --eye-y: 3%;
  animation: pac-vsway 1.2s ease-in-out infinite;
  animation-delay: var(--pac-delay, 0s);
}
.pac-vlane.pac-vup .pac-vghost {
  --eye-y: -3%;
}
@keyframes pac-vsway {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(4px); }
}
${stopRules(
  ".pac-runner",
  ".pac-wake-runner",
  ".pac-man",
  ".pac-ghost-runner",
  ".pac-ghost",
  ".pac-ghost::before",
  ".pac-vrunner",
  ".pac-vwake-runner",
  ".pac-vman",
  ".pac-vghost-runner",
  ".pac-vghost",
  ".pac-vghost::before",
)}`;

/** The geometric tiles' size at scale 1, in px: the grid's cell and the dots' spacing. Exported so a
 *  preview can size its tiles from the same numbers the wallpaper uses (HERO's PatternSwatch). */
export const GEOMETRIC_TILE = {
  grid: 44,
  dots: 24,
} as const;

function styleFor(style: PatternStyle, density: PatternDensity, tileScale?: number): CSSProperties {
  const bg = "var(--background)";
  // Ink follows the accent (fallback: tint hue) so every geometric pattern recolors with the accent knob.
  const ink = "oklch(0.6 0.16 var(--accent-h, var(--glass-tint-h)) / 0.5)";
  // Density scales the tile size (dots/grid use the airier TILE_SCALE ladder; chase has its own cells).
  // `tileScale` overrides it for a preview that must fit several tiles in a small box.
  const d = tileScale ?? TILE_SCALE[density];
  const px = (n: number) => `${Math.round(n * d)}px`;
  const sq = (n: number) => `${px(n)} ${px(n)}`;

  switch (style) {
    case "grid":
      return {
        backgroundColor: bg,
        backgroundImage: `linear-gradient(${ink} 1px, transparent 1px), linear-gradient(90deg, ${ink} 1px, transparent 1px)`,
        backgroundSize: sq(GEOMETRIC_TILE.grid),
      };
    case "dots":
      return {
        backgroundColor: bg,
        backgroundImage: `radial-gradient(${ink} 1.6px, transparent 1.8px)`,
        backgroundSize: sq(GEOMETRIC_TILE.dots),
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
    case "forest":
      // Rendered by its own layered branch in PatternBackground (palettes in FOREST_STYLES); kept exhaustive here.
      return {
        backgroundColor: "oklch(0.09 0.035 262)",
      };
    case "peaks":
      // Rendered by its own layered branch in PatternBackground (palettes in PEAKS_STYLES); kept exhaustive here.
      return {
        backgroundColor: "oklch(0.09 0.035 262)",
      };
    case "meadow":
      // Rendered by its own layered branch in PatternBackground (palettes in MEADOW_STYLES); kept exhaustive here.
      return {
        backgroundColor: "oklch(0.09 0.035 262)",
      };
    case "shipit":
      // Rendered by its own layered branch in PatternBackground (palettes in SHIPIT_STYLES); kept exhaustive here.
      return {
        backgroundColor: "oklch(0.09 0.035 262)",
      };
    case "chase":
      // Pac-Man chase is rendered by its own branch in PatternBackground; kept exhaustive here.
      return {
        backgroundColor: "oklch(0.12 0.025 var(--glass-tint-h))",
      };
  }
}

export type PatternBackgroundProps = {
  style?: PatternStyle;
  density?: PatternDensity;
  speed?: number;
  disc?: "left" | "center" | "right";
  /** Blowing-sand intensity for the dune scene — drives the wind veils and the airborne specks. */
  sand?: "still" | "breeze" | "storm";
  /** The ship the shipit scene sails: a liner, a clipper, a container freighter or a cruise ship. */
  ship?: ShipKind;
  /** The geometric tiles' (dots, grid) scale, in place of the density's: a picker chip draws smaller
   *  tiles than the wallpaper, or a 48px chip shows one dot of a 48px-spaced field and no grid line. */
  tileScale?: number;
  /** A miniature of the scene (a picker swatch, a thumbnail) rather than the page's backdrop. A preview
   *  drops the layer only the full-window wallpaper needs: the root's `glass-backdrop-layer` promotion
   *  (it is not the ground sheer materials blur). Pair it with `speed={0}` for a still picker, since a
   *  moving part needs its layer whatever it is drawn in.
   *  The scene is still `position: fixed`, so the swatch has to contain it: `contain: paint` does,
   *  without the layer a `transform: translateZ(0)` wrapper forces.
   *  A still preview of any scene adds no compositing layers: synthwave's and moonrise's floor is drawn
   *  flat when still (see FloorGrid), so the old advice to draw those two swatches last no longer applies.
   *  Measured in Safari Technology Preview's WebKit, a 13-swatch picker adds none (it was 109). */
  preview?: boolean;
};

/** A full-viewport, pure-CSS pattern wallpaper. Recolors with the live tint; sprites tile a field. */
export function PatternBackground(props: PatternBackgroundProps) {
  // The discs have no layers of their own, so moving one in place would meet a WebKit repaint bug (see
  // .sw-sun). Keyed on the placement, the scene remounts instead, and a new scene paints whole.
  return <PatternScene key={props.disc ?? "right"} {...props} />;
}

function PatternScene({
  style = "dots",
  density = "medium",
  speed = 8,
  disc = "right",
  sand = "breeze",
  ship = "liner",
  tileScale,
  preview = false,
}: PatternBackgroundProps) {
  // The scene root. Only the page's own backdrop is promoted (see glass-backdrop-layer in the theme).
  const root = `fixed inset-0 -z-10 ${preview ? "" : "glass-backdrop-layer "}overflow-hidden pointer-events-none transition-[background-color] duration-500`;
  const patPreview = preview ? "" : undefined;
  // Animated patterns share one pace: --pat-dur (loop seconds).
  const patDur = speed > 0 ? `${speed}s` : "8s";
  // Static means nothing moves, so the animation is REMOVED, not paused — `data-pat-static`
  // is what `stopRules` keys on, and it takes `will-change` down with it. This replaced a
  // `--pat-play: paused` knob that left every scene layer live; see stopRules for why.
  const patStatic = speed > 0 ? undefined : "";
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
        className={root}
        style={
          {
            "--pat-dur": patDur,
            "--pat-wc": patWc,
            "--pac-cell": `${Math.round(34 * DENSITY_SCALE[density])}px`,
          } as CSSProperties
        }
        data-pattern="chase"
        data-pat-static={patStatic}
        data-pat-preview={patPreview}
      >
        <SceneStyles name="chase" css={PAC_STYLES} />
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
          {/* Every wake under every sprite (see .pac-wake-runner), then the sprites. */}
          {PAC_LANES.map((lane) => (
            <div key={lane.top} className="pac-lane" style={pacLane(lane)}>
              <div className="pac-wake-runner">
                <div className="pac-wake" />
              </div>
            </div>
          ))}
          {PAC_VLANES.map((lane) => (
            <div key={lane.left} className={lane.up ? "pac-vlane pac-vup" : "pac-vlane"} style={pacVlane(lane)}>
              <div className="pac-vwake-runner">
                <div className="pac-vwake" />
              </div>
            </div>
          ))}
          {PAC_LANES.map((lane) => (
            <div key={lane.top} className="pac-lane" style={pacLane(lane)}>
              <div className={lane.caught ? "pac-ghost-runner pac-caught" : "pac-ghost-runner"}>
                <div className="pac-ghost" />
              </div>
              <div className="pac-runner">
                <div className="pac-man" />
              </div>
            </div>
          ))}
          {PAC_VLANES.map((lane) => (
            <div key={lane.left} className={lane.up ? "pac-vlane pac-vup" : "pac-vlane"} style={pacVlane(lane)}>
              <div className={lane.caught ? "pac-vghost-runner pac-caught" : "pac-vghost-runner"}>
                <div className="pac-vghost" />
              </div>
              <div className="pac-vrunner">
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
        className={root}
        style={
          {
            // Scene colors (incl. --sw-line) live in SYNTHWAVE_STYLES' [data-pattern] palette blocks so the
            // .dark day/night switch can override them — an inline declaration would beat every stylesheet rule.
            // Sun/moon horizontal placement (left/center/right).
            "--sw-disc-x": discX,
            // Grid scroll pace — one cell every --pat-dur seconds (shared pace across animated patterns).
            "--pat-dur": patDur,
            "--pat-wc": patWc,
          } as CSSProperties
        }
        data-pattern={style}
        data-pat-static={patStatic}
        data-pat-preview={patPreview}
      >
        <SceneStyles name="sky" css={SKY_STYLES} />
        <SceneStyles name="synthwave" css={SYNTHWAVE_STYLES} />
        <div className="sw-scene">
          <div
            className="sw-stars"
            style={{
              backgroundImage: stars,
            }}
          />
          <MuseConstellation />
          <div className={moon ? "scene-moon" : "sw-sun"} />
          <div className="scene-group">
            <div className="sw-ground" />
            <div className="sw-glow" />
            <div className="sw-floor sw-floor-rungs">
              <FloorGrid kind="rungs" still={speed <= 0} />
            </div>
            <div className="sw-floor sw-floor-rails">
              <FloorGrid kind="rails" still={speed <= 0} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (style === "clouds") {
    const stars = STAR_GRADIENTS.slice(0, STAR_COUNT[density]).join(", ");
    return (
      <div
        className={root}
        style={
          {
            // Moon placement (left/center/right) + the shared animated-pattern pace; scene colors live in
            // CLOUDS_STYLES' [data-pattern] palette blocks so the .dark day/night switch can override them.
            "--sw-disc-x": discX,
            "--pat-dur": patDur,
            "--pat-wc": patWc,
          } as CSSProperties
        }
        data-pattern="clouds"
        data-pat-static={patStatic}
        data-pat-preview={patPreview}
      >
        <SceneStyles name="sky" css={SKY_STYLES} />
        <SceneStyles name="clouds" css={CLOUDS_STYLES} />
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
          <div className="scene-group">
            <div className="cl-sea" />
            <div className="cl-deck cl-deck-far" />
            <div className="cl-deck cl-deck-mid" />
            <div className="cl-deck cl-deck-near" />
            <div className="cl-haze" />
          </div>
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
        className={root}
        style={
          {
            "--sw-disc-x": discX,
            "--du-light": duneLight,
            "--du-sand-o": sandVeil,
            "--du-grain-o": sandGrain,
            "--pat-dur": patDur,
            "--pat-wc": patWc,
          } as CSSProperties
        }
        data-pattern="dune"
        data-pat-static={patStatic}
        data-pat-preview={patPreview}
      >
        <SceneStyles name="sky" css={SKY_STYLES} />
        <SceneStyles name="dune" css={DUNE_STYLES} />
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
          <div className="scene-group">
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
      </div>
    );
  }
  if (style === "aurora") {
    const stars = STAR_GRADIENTS.slice(0, STAR_COUNT[density]).join(", ");
    return (
      <div
        className={root}
        style={
          {
            // Sun (day) / moon (night) placement plus the shared pace vars.
            "--sw-disc-x": discX,
            "--pat-dur": patDur,
            "--pat-wc": patWc,
          } as CSSProperties
        }
        data-pattern="aurora"
        data-pat-static={patStatic}
        data-pat-preview={patPreview}
      >
        <SceneStyles name="sky" css={SKY_STYLES} />
        <SceneStyles name="aurora" css={AURORA_STYLES} />
        <div className="au-scene">
          <div
            className="sw-stars"
            style={{
              backgroundImage: stars,
            }}
          />
          <MuseConstellation />
          <div className="au-cirrus" />
          <div className="au-curtain au-b">
            <div className="au-paint" />
          </div>
          <div className="au-curtain au-a">
            <div className="au-paint" />
          </div>
          <div className="au-curtain au-c">
            <div className="au-paint" />
          </div>
          {/* AFTER the curtains: behind them, three layers of translucent light wash the disc green and
              it stops reading as a sun. Still before the glow and water, so the haze and waterline
              cover it the way they cover everything else at the horizon. The sky patch is grouped
              because the curtains under it move: as a layer of its own, its mask would be re-applied on
              every frame (see .scene-group). */}
          <div className="scene-group">
            <div className="au-sunsky" />
          </div>
          <div className="sw-sun" />
          <div className="scene-moon" />
          <div className="scene-group">
            <div className="au-water-base" />
            <div className="au-water">
              <div className="au-mirror">
                <div className="au-curtain au-b au-flat">
                  <div className="au-paint" />
                </div>
                <div className="au-curtain au-a au-flat">
                  <div className="au-paint" />
                </div>
                <div className="au-curtain au-c au-flat">
                  <div className="au-paint" />
                </div>
                <AuroraStreaks layer="b" />
                <AuroraStreaks layer="a" />
                <AuroraStreaks layer="c" />
              </div>
              <div className="au-ripple-fade">
                <div className="au-ripples" />
              </div>
            </div>
            {/* Still, over the moving reflection. */}
            <div className="scene-group">
              <div className="au-sunpath">
                <div className="au-sunpath-paint" />
              </div>
              <div className="au-haze" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (style === "forest") {
    const stars = STAR_GRADIENTS.slice(0, STAR_COUNT[density]).join(", ");
    // Which facet takes the light: the side facing the disc. Centred, the light still leans left a
    // little; an even split would erase the facets and leave flat silhouettes.
    const [litL, litR] = {
      left: [
        "1",
        "0",
      ],
      center: [
        "0.7",
        "0.25",
      ],
      right: [
        "0",
        "1",
      ],
    }[disc];
    const ridge = (i: number) => <ForestRidge index={i} />;
    return (
      <div
        className={root}
        style={
          {
            "--sw-disc-x": discX,
            "--fo-lit-l": litL,
            "--fo-lit-r": litR,
            "--pat-dur": patDur,
            "--pat-wc": patWc,
          } as CSSProperties
        }
        data-pattern="forest"
        data-pat-static={patStatic}
        data-pat-preview={patPreview}
      >
        <SceneStyles name="sky" css={SKY_STYLES} />
        <SceneStyles name="forest" css={FOREST_STYLES} />
        <div className="fo-scene">
          <div
            className="sw-stars"
            style={{
              backgroundImage: stars,
            }}
          />
          <MuseConstellation />
          {/* The disc goes down first: every ridge stands in front of it. */}
          <div className="sw-sun" />
          <div className="scene-moon" />
          <div className="scene-group">
            {ridge(0)}
            {ridge(1)}
            <div className="fo-glow" />
            <div className="fo-fog fo-fog-a" />
            {ridge(2)}
            <div className="fo-fog fo-fog-b" />
            {/* Still, over a drifting fog bank: grouped so the rays' mask is drawn once (see .scene-group).
                Rays between the middle ridges: in front of the far ranks, behind the near trees. */}
            <div className="scene-group">
              <div className="fo-rays" />
              {ridge(3)}
            </div>
            <div className="fo-fog fo-fog-c" />
            {ridge(4)}
          </div>
        </div>
      </div>
    );
  }
  if (style === "peaks") {
    const stars = STAR_GRADIENTS.slice(0, STAR_COUNT[density]).join(", ");
    // The facet facing the disc takes the light; centred, both sides catch some (see forest).
    const [litL, litR] = {
      left: [
        "1",
        "0",
      ],
      center: [
        "0.7",
        "0.25",
      ],
      right: [
        "0",
        "1",
      ],
    }[disc];
    const ridge = (i: number) => <PeakRidge index={i} />;
    return (
      <div
        className={root}
        style={
          {
            "--sw-disc-x": discX,
            "--pk-lit-l": litL,
            "--pk-lit-r": litR,
            "--pat-dur": patDur,
            "--pat-wc": patWc,
          } as CSSProperties
        }
        data-pattern="peaks"
        data-pat-static={patStatic}
        data-pat-preview={patPreview}
      >
        <SceneStyles name="sky" css={SKY_STYLES} />
        <SceneStyles name="peaks" css={PEAKS_STYLES} />
        <div className="pk-scene">
          <div
            className="sw-stars"
            style={{
              backgroundImage: stars,
            }}
          />
          <MuseConstellation />
          {/* The disc first: the far range's col hides its lower third, every ridge stands in front. */}
          <div className="sw-sun" />
          <div className="scene-moon" />
          <div className="scene-group">
            {ridge(0)}
            <div className="pk-glow" />
            {ridge(1)}
            <div className="pk-fog pk-fog-a" />
            {ridge(2)}
            <div className="pk-fog pk-fog-b" />
            {ridge(3)}
          </div>
        </div>
      </div>
    );
  }
  if (style === "meadow") {
    const stars = STAR_GRADIENTS.slice(0, STAR_COUNT[density]).join(", ");
    return (
      <div
        className={root}
        style={
          {
            "--sw-disc-x": discX,
            "--pat-dur": patDur,
            "--pat-wc": patWc,
          } as CSSProperties
        }
        data-pattern="meadow"
        data-pat-static={patStatic}
        data-pat-preview={patPreview}
      >
        <SceneStyles name="sky" css={SKY_STYLES} />
        <SceneStyles name="meadow" css={MEADOW_STYLES} />
        <div className="mw-scene">
          <div
            className="sw-stars"
            style={{
              backgroundImage: stars,
            }}
          />
          <MuseConstellation />
          {/* The disc first: the clouds drift across it and every hill stands in front of it. */}
          <div className="sw-sun" />
          <div className="scene-moon" />
          <div className="scene-group">
            <div className="mw-cloud mw-cloud-a" />
            <div className="mw-cloud mw-cloud-b" />
            {MEADOW_HILLS.map((_, i) => (
              <Fragment key={i}>
                <div className={`mw-hill mw-h${i} mw-rim`} />
                <div className={`mw-hill mw-h${i} mw-fill`} />
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (style === "shipit") {
    const stars = STAR_GRADIENTS.slice(0, STAR_COUNT[density]).join(", ");
    return (
      <div
        className={root}
        style={
          {
            "--sw-disc-x": discX,
            "--pat-dur": patDur,
            "--pat-wc": patWc,
          } as CSSProperties
        }
        data-pattern="shipit"
        data-pat-static={patStatic}
        data-pat-preview={patPreview}
      >
        <SceneStyles name="sky" css={SKY_STYLES} />
        <SceneStyles name="shipit" css={SHIPIT_STYLES} />
        <div className="sh-scene">
          <div
            className="sw-stars"
            style={{
              backgroundImage: stars,
            }}
          />
          <MuseConstellation />
          {/* The disc first: the sea covers its foot, and the ship crosses in front of it. */}
          <div className="sw-sun" />
          <div className="scene-moon" />
          <div className="scene-group">
            <div className="sh-glow" />
            {SEA_ROWS.map((_, i) => (
              <Fragment key={i}>
                {i === 2 ? <div className="sh-haze" /> : null}
                <div className={`sh-row sh-r${i} sh-fill`} />
                <div className={`sh-row sh-r${i} sh-cap`} />
              </Fragment>
            ))}
            <div className="sh-path">
              <div className="sh-path-paint" />
            </div>
            {/* Last, so nothing still is painted over the one part that moves (see .scene-group). It sails
                toward the disc: west when the disc is on the left. Keyed on the ship, so a new one starts
                its crossing from the still pose rather than mid-stride in another ship's box. */}
            <div key={ship} className={`sh-ship sh-k-${ship}${disc === "left" ? " sh-west" : ""}`}>
              <Ship kind={ship} west={disc === "left"} />
            </div>
          </div>
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
      <div className={root} data-pattern="starfield" data-pat-preview={patPreview}>
        <SceneStyles name="starfield" css={STARFIELD_STYLES} />
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
  return <div className={root} style={styleFor(style, density, tileScale)} data-pattern={style} data-pat-preview={patPreview} />;
}
