"use client";

import * as React from "react";
import { CanvasBackground } from "@/components/canvas-background";
import { GradientBackground } from "@/components/gradient-background";
import type { CanvasStyle } from "@/lib/canvas-background-utils";
import type { GradientGeometry, GradientShape, RampGradientAxis } from "@/lib/oklch-utils";

export type BackgroundType = "gradient" | "canvas";

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
  const [background, setBackgroundState] = React.useState<BackgroundType>("gradient");
  const [gradientAxis, setGradientAxisState] = React.useState<RampGradientAxis>("tonal");
  const [gradientAngle, setGradientAngle] = React.useState(90);
  const [gradientShape, setGradientShape] = React.useState<GradientShape>("linear");
  const [gradientPosition, setGradientPosition] = React.useState("50% 50%");
  const [radialShape, setRadialShape] = React.useState<NonNullable<GradientGeometry["radialShape"]>>("circle");
  const [radialSize, setRadialSize] = React.useState<NonNullable<GradientGeometry["radialSize"]>>("farthest-corner");
  const [canvasStyle, setCanvasStyleState] = React.useState<CanvasStyle>("gradient");
  const [canvasRamp, setCanvasRampState] = React.useState<RampGradientAxis>("tonal");
  const [canvasSteps, setCanvasSteps] = React.useState(6);
  const [canvasAngle, setCanvasAngle] = React.useState(90);
  const [canvasSpeed, setCanvasSpeed] = React.useState(1);
  const [canvasAnimated, setCanvasAnimated] = React.useState(false);
  const [canvasSeed, setCanvasSeed] = React.useState("sistine");

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "gradient" || stored === "canvas") {
      setBackgroundState(stored);
    }
  }, []);

  const setBackground = React.useCallback((next: BackgroundType) => {
    setBackgroundState(next);
    persistBackground(next);
  }, []);

  const setGradientAxis = React.useCallback((axis: RampGradientAxis) => {
    setBackgroundState("gradient");
    setGradientAxisState(axis);
    persistBackground("gradient");
  }, []);

  const cycleGradientAngle = React.useCallback(() => {
    setGradientAngle((a) => (a + 45) % 360);
  }, []);

  const cycleGradientShape = React.useCallback(() => {
    setGradientShape((s) => cycle(GRADIENT_SHAPES, s));
  }, []);

  const cycleGradientPosition = React.useCallback(() => {
    setGradientPosition((p) => {
      const i = GRADIENT_POSITIONS.findIndex((x) => x.value === p);
      return GRADIENT_POSITIONS[(i + 1) % GRADIENT_POSITIONS.length].value;
    });
  }, []);

  const cycleRadialShape = React.useCallback(() => {
    setRadialShape((s) => cycle(RADIAL_SHAPES, s));
  }, []);

  const cycleRadialSize = React.useCallback(() => {
    setRadialSize((s) => cycle(RADIAL_SIZES, s));
  }, []);

  const setCanvasStyle = React.useCallback((style: CanvasStyle) => {
    setBackgroundState("canvas");
    setCanvasStyleState(style);
    persistBackground("canvas");
  }, []);

  const setCanvasRamp = React.useCallback((axis: RampGradientAxis) => {
    setBackgroundState("canvas");
    setCanvasRampState(axis);
    persistBackground("canvas");
  }, []);

  const cycleCanvasSteps = React.useCallback(() => {
    setCanvasSteps((s) => cycle(CANVAS_STEPS, s as (typeof CANVAS_STEPS)[number]));
  }, []);

  const cycleCanvasAngle = React.useCallback(() => {
    setCanvasAngle((a) => (a + 45) % 360);
  }, []);

  const cycleCanvasSpeed = React.useCallback(() => {
    setCanvasSpeed((s) => cycle(CANVAS_SPEEDS, s as (typeof CANVAS_SPEEDS)[number]));
  }, []);

  const toggleCanvasAnimated = React.useCallback(() => {
    setCanvasAnimated((on) => !on);
  }, []);

  const shuffleCanvas = React.useCallback(() => {
    setBackgroundState("canvas");
    setCanvasStyleState(pickRandom(CANVAS_STYLES));
    setCanvasRampState(pickRandom(RAMP_AXES));
    setCanvasSeed(Math.random().toString(36).slice(2));
    persistBackground("canvas");
  }, []);

  const value = React.useMemo(
    () => ({
      background,
      setBackground,
      gradientAxis,
      setGradientAxis,
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
      setCanvasStyle,
      canvasRamp,
      setCanvasRamp,
      canvasSteps,
      cycleCanvasSteps,
      canvasAngle,
      cycleCanvasAngle,
      canvasSpeed,
      cycleCanvasSpeed,
      canvasAnimated,
      toggleCanvasAnimated,
      shuffleCanvas,
    }),
    [
      background,
      setBackground,
      gradientAxis,
      setGradientAxis,
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
      setCanvasStyle,
      canvasRamp,
      setCanvasRamp,
      canvasSteps,
      cycleCanvasSteps,
      canvasAngle,
      cycleCanvasAngle,
      canvasSpeed,
      cycleCanvasSpeed,
      canvasAnimated,
      toggleCanvasAnimated,
      shuffleCanvas,
    ],
  );

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
      })}
      {children}
    </BackgroundContext.Provider>
  );
}
