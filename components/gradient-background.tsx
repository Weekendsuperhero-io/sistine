"use client";

import * as React from "react";
import { type GradientScheme, generateBeautifulGradient, generateSeededGradient, gradientToCSS } from "@/lib/gradient-utils";

interface GradientBackgroundProps {
  /**
   * Seed for consistent gradient per page (e.g., page pathname)
   * If not provided, generates a new random gradient on each render
   */
  seed?: string;
  /**
   * Use beautiful complementary colors instead of random
   */
  beautiful?: boolean;
  /**
   * Additional className
   */
  className?: string;
  /**
   * Opacity of the gradient (0-1)
   */
  opacity?: number;
  /**
   * Blur effect for the background
   */
  blur?: boolean;
  /**
   * Base hue (0-360) for a deterministic "beautiful" gradient. Changing it reshuffles.
   */
  hue?: number;
  /**
   * Color-harmony scheme for the beautiful gradient.
   */
  scheme?: GradientScheme;
}

export function GradientBackground({
  seed,
  beautiful = true,
  className = "",
  opacity = 1,
  blur = true,
  hue,
  scheme = "complementary",
}: GradientBackgroundProps) {
  const [gradient, setGradient] = React.useState<string>("");

  React.useEffect(() => {
    const gradientObj =
      hue !== undefined
        ? generateBeautifulGradient(hue, scheme)
        : seed
          ? generateSeededGradient(seed)
          : beautiful
            ? generateBeautifulGradient()
            : generateSeededGradient(Math.random().toString());

    setGradient(gradientToCSS(gradientObj));
  }, [
    seed,
    beautiful,
    hue,
    scheme,
  ]);

  if (!gradient) return null;

  return (
    <div
      className={`fixed inset-0 -z-10 pointer-events-none ${className}`}
      style={{
        background: gradient,
        opacity,
        filter: blur ? "blur(15px)" : "none",
      }}
    >
      {/* Additional organic shapes for liquid glass effect */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 20% 30%, oklch(100% 0 0 / 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 80% 70%, oklch(100% 0 0 / 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 50% 50%, oklch(0% 0 0 / 0.1) 0%, transparent 50%)`,
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}
