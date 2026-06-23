"use client";

import * as React from "react";
import { CanvasBackground } from "@/components/canvas-background";
import { GradientBackground } from "@/components/gradient-background";
import { GridBackground } from "@/components/grid-background";
import type { GradientScheme } from "@/lib/gradient-utils";

export type BackgroundType = "grid" | "gradient" | "canvas";

const STORAGE_KEY = "sistine-background";

const CANVAS_PATTERNS = [
  "gradient",
  "circles",
  "waves",
  "particles",
  "noise",
  "artistic",
  "blobs",
] as const;
type CanvasPattern = (typeof CANVAS_PATTERNS)[number];

const GRADIENT_SCHEMES: GradientScheme[] = [
  "complementary",
  "analogous",
  "triadic",
  "monochromatic",
];

const DEFAULT_GRADIENT_HUE = 290; // purple

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

interface BackgroundContextValue {
  background: BackgroundType;
  setBackground: (background: BackgroundType) => void;
  /** Switch to the gradient background and reshuffle it (new hue + color scheme). */
  shuffleGradient: () => void;
  /** Switch to the canvas background and reshuffle it (new pattern + palette). */
  shuffleCanvas: () => void;
  /** Toggle canvas animation on/off. */
  toggleCanvasAnimated: () => void;
  /** Whether the canvas is currently animating. */
  canvasAnimated: boolean;
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
  gradientHue: number;
  gradientScheme: GradientScheme;
  canvasPattern: CanvasPattern;
  canvasSeed: string;
  canvasAnimated: boolean;
}

function renderBackground(background: BackgroundType, args: RenderArgs) {
  switch (background) {
    case "gradient":
      return <GradientBackground hue={args.gradientHue} scheme={args.gradientScheme} />;
    case "canvas":
      // key forces a clean redraw when the pattern/palette/animation changes
      return (
        <CanvasBackground
          key={`${args.canvasPattern}-${args.canvasSeed}-${args.canvasAnimated}`}
          pattern={args.canvasPattern}
          seed={args.canvasSeed}
          animated={args.canvasAnimated}
        />
      );
    default:
      return <GridBackground />;
  }
}

/**
 * Holds the site-wide background choice (persisted to localStorage) and renders it
 * behind the app. Pair with <BackgroundSwitcher /> to preview + shuffle each style.
 */
export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  // SSR + first client render use "grid" so hydration matches; localStorage is read after mount.
  const [background, setBackgroundState] = React.useState<BackgroundType>("grid");
  const [gradientHue, setGradientHue] = React.useState(DEFAULT_GRADIENT_HUE);
  const [gradientScheme, setGradientScheme] = React.useState<GradientScheme>("complementary");
  const [canvasPattern, setCanvasPattern] = React.useState<CanvasPattern>("blobs");
  const [canvasSeed, setCanvasSeed] = React.useState("sistine");
  const [canvasAnimated, setCanvasAnimated] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "grid" || stored === "gradient" || stored === "canvas") {
      setBackgroundState(stored);
    }
  }, []);

  const setBackground = React.useCallback((next: BackgroundType) => {
    setBackgroundState(next);
    persistBackground(next);
  }, []);

  const shuffleGradient = React.useCallback(() => {
    setBackgroundState("gradient");
    setGradientHue(Math.floor(Math.random() * 360));
    setGradientScheme(pickRandom(GRADIENT_SCHEMES));
    persistBackground("gradient");
  }, []);

  const shuffleCanvas = React.useCallback(() => {
    setBackgroundState("canvas");
    setCanvasPattern(pickRandom(CANVAS_PATTERNS));
    setCanvasSeed(Math.random().toString(36).slice(2));
    persistBackground("canvas");
  }, []);

  const toggleCanvasAnimated = React.useCallback(() => {
    setCanvasAnimated((on) => !on);
  }, []);

  const value = React.useMemo(
    () => ({
      background,
      setBackground,
      shuffleGradient,
      shuffleCanvas,
      toggleCanvasAnimated,
      canvasAnimated,
    }),
    [
      background,
      setBackground,
      shuffleGradient,
      shuffleCanvas,
      toggleCanvasAnimated,
      canvasAnimated,
    ],
  );

  return (
    <BackgroundContext.Provider value={value}>
      {renderBackground(background, {
        gradientHue,
        gradientScheme,
        canvasPattern,
        canvasSeed,
        canvasAnimated,
      })}
      {children}
    </BackgroundContext.Provider>
  );
}
