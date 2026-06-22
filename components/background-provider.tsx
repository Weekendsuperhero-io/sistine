"use client";

import * as React from "react";
import { CanvasBackground } from "@/components/canvas-background";
import { GradientBackground } from "@/components/gradient-background";
import { GridBackground } from "@/components/grid-background";

export type BackgroundType = "grid" | "gradient" | "canvas";

const STORAGE_KEY = "sistine-background";

interface BackgroundContextValue {
  background: BackgroundType;
  setBackground: (background: BackgroundType) => void;
  /** Switch to the gradient background and reshuffle it to a new hue. */
  shuffleGradient: () => void;
}

const DEFAULT_GRADIENT_HUE = 290; // purple

const BackgroundContext = React.createContext<BackgroundContextValue | null>(null);

export function useBackground() {
  const context = React.useContext(BackgroundContext);
  if (!context) {
    throw new Error("useBackground must be used within a BackgroundProvider");
  }
  return context;
}

function renderBackground(background: BackgroundType, gradientHue: number) {
  switch (background) {
    case "gradient":
      return <GradientBackground hue={gradientHue} />;
    case "canvas":
      return <CanvasBackground />;
    default:
      return <GridBackground />;
  }
}

/**
 * Holds the site-wide background choice (persisted to localStorage) and renders it
 * behind the app. Pair with <BackgroundSwitcher /> to let users preview each style.
 */
export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  // SSR + first client render use "grid" so hydration matches; localStorage is read after mount.
  const [background, setBackgroundState] = React.useState<BackgroundType>("grid");
  const [gradientHue, setGradientHue] = React.useState(DEFAULT_GRADIENT_HUE);

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "grid" || stored === "gradient" || stored === "canvas") {
      setBackgroundState(stored);
    }
  }, []);

  const setBackground = React.useCallback((next: BackgroundType) => {
    setBackgroundState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, []);

  const shuffleGradient = React.useCallback(() => {
    setBackgroundState("gradient");
    setGradientHue(Math.floor(Math.random() * 360));
    try {
      localStorage.setItem(STORAGE_KEY, "gradient");
    } catch {
      // ignore storage failures
    }
  }, []);

  const value = React.useMemo(
    () => ({
      background,
      setBackground,
      shuffleGradient,
    }),
    [
      background,
      setBackground,
      shuffleGradient,
    ],
  );

  return (
    <BackgroundContext.Provider value={value}>
      {renderBackground(background, gradientHue)}
      {children}
    </BackgroundContext.Provider>
  );
}
