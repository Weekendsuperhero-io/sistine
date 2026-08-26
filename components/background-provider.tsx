"use client";

import * as React from "react";
import { CanvasBackground } from "@/components/canvas-background";
import { GradientBackground } from "@/components/gradient-background";
import { PATTERN_DENSITIES, PATTERN_STYLES, PatternBackground, type PatternDensity, type PatternStyle } from "@/components/pattern-background";
import type { CanvasStyle } from "@/lib/canvas-background-utils";
import type { GradientGeometry, GradientShape, RampGradientAxis } from "@/lib/oklch-utils";

export type BackgroundType = "gradient" | "canvas" | "pattern" | "none";

const STORAGE_KEY = "sistine-background";

/** Canvas styles (lava renamed from "blobs", circle from "circles"). */
export const CANVAS_STYLES: CanvasStyle[] = [
  "gradient",
  "lava",
  "circle",
];

/** Ramp axes shared by the Gradient background and the Canvas (lightness = the "linear" ramp). */
export const RAMP_AXES: RampGradientAxis[] = [
  "tonal",
  "hue",
  "lightness",
  "chroma",
];

/** Gradient painting shapes the Gradient background cycles through. */
export const GRADIENT_SHAPES: GradientShape[] = [
  "linear",
  "radial",
  "conic",
];

/** Center positions (radial + conic) the switcher cycles through. */
export const GRADIENT_POSITIONS: {
  value: string;
  label: string;
}[] = [
  {
    value: "50% 50%",
    label: "center",
  },
  {
    value: "0% 0%",
    label: "top-left",
  },
  {
    value: "100% 0%",
    label: "top-right",
  },
  {
    value: "100% 100%",
    label: "bottom-right",
  },
  {
    value: "0% 100%",
    label: "bottom-left",
  },
];

/** The position values the cycler steps through (labels live in GRADIENT_POSITIONS). */
const GRADIENT_POSITION_VALUES = GRADIENT_POSITIONS.map((p) => p.value);

/** Radial shape + size options. */
export const RADIAL_SHAPES: NonNullable<GradientGeometry["radialShape"]>[] = [
  "circle",
  "ellipse",
];
export const RADIAL_SIZES: NonNullable<GradientGeometry["radialSize"]>[] = [
  "farthest-corner",
  "farthest-side",
  "closest-corner",
  "closest-side",
];

/** Angle presets — 45° steps around the circle, shared by the gradient + canvas angle cyclers. */
const ANGLES = [
  0,
  45,
  90,
  135,
  180,
  225,
  270,
  315,
];

/** Steps-per-side presets the canvas/ramps cycle through (4–12). */
export const CANVAS_STEPS = [
  4,
  6,
  8,
  10,
  12,
] as const;

/** Animation pace presets. */
export const CANVAS_SPEEDS = [
  0.5,
  1,
  2,
] as const;

/** Animated-pattern pace: loop/scroll duration in SECONDS (2s fastest … 16s slowest); 0 = static.
 * Shared by every animated pattern (synthwave, moonrise, clouds, dune, aurora, chase) via the --pat-dur CSS var. */
export const PATTERN_SPEEDS = [
  2,
  4,
  8,
  12,
  16,
  0,
] as const;

/** Sun/moon horizontal placement for the horizon scenes (synthwave / moonrise / clouds / dune) — off-center
 * clears the page's centered content. */
export const PATTERN_DISCS = [
  "right",
  "center",
  "left",
] as const;

/** Blowing-sand intensity for the dune scene — "still" is a calm desert (no airborne sand at all),
 * distinct from the speed control's "static", which only pauses the motion that is already there. */
export const PATTERN_SANDS = [
  "breeze",
  "storm",
  "still",
] as const;

function persistBackground(next: BackgroundType) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function cycle<T>(items: readonly T[], current: T): T {
  const i = items.indexOf(current);
  return items[(i + 1) % items.length];
}

/**
 * State that steps through a fixed preset list, wrapping at the end. Returns the value, a stable
 * advance-to-the-next-preset callback, and the raw setter.
 */
function useCycle<T>(
  items: readonly T[],
  initial: T,
): [
  T,
  () => void,
  React.Dispatch<React.SetStateAction<T>>,
] {
  const [value, setValue] = React.useState(initial);
  const next = React.useCallback(
    () => setValue((v) => cycle(items, v)),
    [
      items,
    ],
  );
  return [
    value,
    next,
    setValue,
  ];
}

interface BackgroundContextValue {
  background: BackgroundType;
  setBackground: (background: BackgroundType) => void;
  /** The ramp axis driving the gradient background. */
  gradientAxis: RampGradientAxis;
  /** Switch to the gradient background and set its ramp axis. */
  setGradientAxis: (axis: RampGradientAxis) => void;
  /** Gradient angle in degrees (90 = left → right). */
  gradientAngle: number;
  /** Rotate the gradient by 45°. */
  cycleGradientAngle: () => void;
  /** The gradient painting shape (linear | radial | conic). */
  gradientShape: GradientShape;
  /** Advance to the next gradient shape. */
  cycleGradientShape: () => void;
  /** Center position for radial + conic gradients (CSS `at <position>`). */
  gradientPosition: string;
  /** Advance to the next center-position preset. */
  cycleGradientPosition: () => void;
  /** Radial shape (circle | ellipse). */
  radialShape: NonNullable<GradientGeometry["radialShape"]>;
  /** Toggle the radial shape. */
  cycleRadialShape: () => void;
  /** Radial size keyword. */
  radialSize: NonNullable<GradientGeometry["radialSize"]>;
  /** Advance to the next radial size. */
  cycleRadialSize: () => void;
  // ── Canvas ──
  /** The canvas style (gradient | lava | circle). */
  canvasStyle: CanvasStyle;
  /** Switch to the canvas background and set its style. */
  setCanvasStyle: (style: CanvasStyle) => void;
  /** The ramp axis driving the canvas colors. */
  canvasRamp: RampGradientAxis;
  /** Switch to the canvas background and set its ramp axis. */
  setCanvasRamp: (axis: RampGradientAxis) => void;
  /** Steps per side (4–12). */
  canvasSteps: number;
  /** Advance to the next steps-per-side preset. */
  cycleCanvasSteps: () => void;
  /** Canvas gradient angle in degrees. */
  canvasAngle: number;
  /** Rotate the canvas gradient by 45°. */
  cycleCanvasAngle: () => void;
  /** Canvas animation pace. */
  canvasSpeed: number;
  /** Advance to the next animation-pace preset. */
  cycleCanvasSpeed: () => void;
  /** Whether the canvas is currently animating. */
  canvasAnimated: boolean;
  /** Toggle canvas animation on/off. */
  toggleCanvasAnimated: () => void;
  /** Switch to the canvas background and reshuffle it (new style + ramp + layout seed). */
  shuffleCanvas: () => void;
  // ── Pattern (pure-CSS wallpapers) ──
  /** The active CSS pattern style. */
  patternStyle: PatternStyle;
  /** Switch to the pattern background and set its style. */
  setPatternStyle: (style: PatternStyle) => void;
  /** Advance to the next pattern style. */
  cyclePatternStyle: () => void;
  /** Star-field density (sparse | medium | dense). */
  patternDensity: PatternDensity;
  /** Advance to the next star-field density. */
  cyclePatternDensity: () => void;
  /** Horizon-grid scroll pace (synthwave / moonrise); 0 is static. */
  patternSpeed: number;
  /** Advance to the next grid scroll pace (… → static). */
  cyclePatternSpeed: () => void;
  /** Sun/moon placement for the horizon scenes (right | center | left). */
  patternDisc: (typeof PATTERN_DISCS)[number];
  /** Advance to the next sun/moon placement. */
  cyclePatternDisc: () => void;
  /** Blowing-sand intensity for the dune scene (breeze | storm | still). */
  patternSand: (typeof PATTERN_SANDS)[number];
  /** Advance to the next blowing-sand level. */
  cyclePatternSand: () => void;
  // ── Base color (the "none" backdrop) ──
  /** Base color for the "none" backdrop; null = follow the theme (tint-tinted, light/dark aware). */
  baseColor: string | null;
  /** Override the "none" backdrop color; null clears back to the themed default. */
  setBaseColor: (color: string | null) => void;
}

const BackgroundContext = React.createContext<BackgroundContextValue | null>(null);

export function useBackground() {
  const context = React.useContext(BackgroundContext);
  if (!context) {
    throw new Error("useBackground must be used within a BackgroundProvider");
  }
  return context;
}

interface RenderArgs {
  gradientAxis: RampGradientAxis;
  gradientAngle: number;
  gradientShape: GradientShape;
  gradientPosition: string;
  radialShape: NonNullable<GradientGeometry["radialShape"]>;
  radialSize: NonNullable<GradientGeometry["radialSize"]>;
  canvasStyle: CanvasStyle;
  canvasRamp: RampGradientAxis;
  canvasSteps: number;
  canvasAngle: number;
  canvasSpeed: number;
  canvasAnimated: boolean;
  canvasSeed: string;
  patternStyle: PatternStyle;
  patternDensity: PatternDensity;
  patternSpeed: number;
  patternDisc: (typeof PATTERN_DISCS)[number];
  patternSand: (typeof PATTERN_SANDS)[number];
  baseColor: string | null;
}

function renderBackground(background: BackgroundType, args: RenderArgs) {
  switch (background) {
    case "canvas":
      // key forces a clean redraw when the style/ramp/steps/seed/animation change
      return (
        <CanvasBackground
          key={`${args.canvasStyle}-${args.canvasRamp}-${args.canvasSteps}-${args.canvasAngle}-${args.canvasSpeed}-${args.canvasSeed}-${args.canvasAnimated}`}
          style={args.canvasStyle}
          ramp={args.canvasRamp}
          steps={args.canvasSteps}
          angle={args.canvasAngle}
          speed={args.canvasSpeed}
          animated={args.canvasAnimated}
          seed={args.canvasSeed}
        />
      );
    case "pattern":
      return (
        <PatternBackground
          style={args.patternStyle}
          density={args.patternDensity}
          speed={args.patternSpeed}
          disc={args.patternDisc}
          sand={args.patternSand}
        />
      );
    case "none":
      // Forgo the decorative backdrop — a clean solid that honors the theme (tint hue, light/dark) by
      // default, overridable by the user's chosen base color.
      return (
        <>
          <style>{`[data-bg-none]{background:oklch(0.98 0.006 var(--glass-tint-h))}.dark [data-bg-none]{background:oklch(0.15 0.014 var(--glass-tint-h))}`}</style>
          <div
            className="fixed inset-0 -z-10 glass-backdrop-layer transition-[background-color] duration-500"
            data-bg-none=""
            style={
              args.baseColor
                ? {
                    background: args.baseColor,
                  }
                : undefined
            }
          />
        </>
      );
    default:
      return (
        <GradientBackground
          axis={args.gradientAxis}
          angle={args.gradientAngle}
          shape={args.gradientShape}
          position={args.gradientPosition}
          radialShape={args.radialShape}
          radialSize={args.radialSize}
        />
      );
  }
}

/**
 * Holds the site-wide background choice (persisted to localStorage) and renders it
 * behind the app. Pair with <BackgroundSwitcher /> to preview + tune each style.
 */
export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  // SSR + first client render use "gradient" so hydration matches; localStorage is read after mount.
  const [background, setBackgroundState] = React.useState<BackgroundType>("pattern");
  const [gradientAxis, setGradientAxisState] = React.useState<RampGradientAxis>("tonal");
  const [gradientAngle, cycleGradientAngle] = useCycle(ANGLES, 90);
  const [gradientShape, cycleGradientShape] = useCycle(GRADIENT_SHAPES, "linear");
  const [gradientPosition, cycleGradientPosition] = useCycle(GRADIENT_POSITION_VALUES, "50% 50%");
  const [radialShape, cycleRadialShape] = useCycle(RADIAL_SHAPES, "circle");
  const [radialSize, cycleRadialSize] = useCycle(RADIAL_SIZES, "farthest-corner");
  const [canvasStyle, setCanvasStyleState] = React.useState<CanvasStyle>("gradient");
  const [canvasRamp, setCanvasRampState] = React.useState<RampGradientAxis>("tonal");
  const [canvasSteps, cycleCanvasSteps] = useCycle<number>(CANVAS_STEPS, 6);
  const [canvasAngle, cycleCanvasAngle] = useCycle(ANGLES, 90);
  const [canvasSpeed, cycleCanvasSpeed] = useCycle<number>(CANVAS_SPEEDS, 1);
  const [canvasAnimated, setCanvasAnimated] = React.useState(false);
  const [canvasSeed, setCanvasSeed] = React.useState("sistine");
  const [patternStyle, cyclePatternStyleState, setPatternStyleState] = useCycle(PATTERN_STYLES, "moonrise");
  const [patternDensity, cyclePatternDensityState] = useCycle(PATTERN_DENSITIES, "medium");
  /* Static by DEFAULT (0 = no animation, the last entry in PATTERN_SPEEDS). The pattern layer is a
     backdrop for reading glass against, and a moving one competes with the content for attention on
     first load — motion should be something you opt into, not something you have to switch off. The
     speed control still cycles 2/4/8/12/16/0, so the animation is one click away. */
  const [patternSpeed, cyclePatternSpeedState] = useCycle<number>(PATTERN_SPEEDS, 0);
  const [baseColor, setBaseColor] = React.useState<string | null>(null);
  const [patternDisc, cyclePatternDiscState] = useCycle(PATTERN_DISCS, "right");
  const [patternSand, cyclePatternSandState] = useCycle(PATTERN_SANDS, "breeze");

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "gradient" || stored === "canvas" || stored === "pattern" || stored === "none") {
      setBackgroundState(stored);
    }
  }, []);

  /** The coupling every per-style setter/cycler shares: switch to that background type, apply, persist. */
  const withType =
    <A extends unknown[]>(type: BackgroundType, fn: (...args: A) => void) =>
    (...args: A) => {
      setBackgroundState(type);
      fn(...args);
      persistBackground(type);
    };

  const value: BackgroundContextValue = {
    background,
    setBackground: (next) => {
      setBackgroundState(next);
      persistBackground(next);
    },
    gradientAxis,
    setGradientAxis: withType("gradient", setGradientAxisState),
    gradientAngle,
    cycleGradientAngle,
    gradientShape,
    cycleGradientShape,
    gradientPosition,
    cycleGradientPosition,
    radialShape,
    cycleRadialShape,
    radialSize,
    cycleRadialSize,
    canvasStyle,
    setCanvasStyle: withType("canvas", setCanvasStyleState),
    canvasRamp,
    setCanvasRamp: withType("canvas", setCanvasRampState),
    canvasSteps,
    cycleCanvasSteps,
    canvasAngle,
    cycleCanvasAngle,
    canvasSpeed,
    cycleCanvasSpeed,
    canvasAnimated,
    toggleCanvasAnimated: () => setCanvasAnimated((on) => !on),
    shuffleCanvas: withType("canvas", () => {
      setCanvasStyleState(pickRandom(CANVAS_STYLES));
      setCanvasRampState(pickRandom(RAMP_AXES));
      setCanvasSeed(Math.random().toString(36).slice(2));
    }),
    patternStyle,
    setPatternStyle: withType("pattern", setPatternStyleState),
    cyclePatternStyle: withType("pattern", cyclePatternStyleState),
    patternDensity,
    cyclePatternDensity: withType("pattern", cyclePatternDensityState),
    patternSpeed,
    cyclePatternSpeed: withType("pattern", cyclePatternSpeedState),
    patternDisc,
    cyclePatternDisc: withType("pattern", cyclePatternDiscState),
    patternSand,
    cyclePatternSand: withType("pattern", cyclePatternSandState),
    baseColor,
    setBaseColor,
  };

  return (
    <BackgroundContext.Provider value={value}>
      {renderBackground(background, {
        gradientAxis,
        gradientAngle,
        gradientShape,
        gradientPosition,
        radialShape,
        radialSize,
        canvasStyle,
        canvasRamp,
        canvasSteps,
        canvasAngle,
        canvasSpeed,
        canvasAnimated,
        canvasSeed,
        patternStyle,
        patternDensity,
        patternSpeed,
        patternDisc,
        patternSand,
        baseColor,
      })}
      {children}
    </BackgroundContext.Provider>
  );
}
