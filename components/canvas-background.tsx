"use client";

import * as React from "react";
import { type CanvasConfig, generateCanvasBackground } from "@/lib/canvas-background-utils";

interface CanvasBackgroundProps extends Omit<CanvasConfig, "width" | "height"> {
  /**
   * Additional className
   */
  className?: string;
  /**
   * Opacity of the background (0-1)
   */
  opacity?: number;
  /**
   * Blur effect for the background
   */
  blur?: boolean;
  /**
   * Whether to animate the background
   */
  animated?: boolean;
}

export function CanvasBackground({
  seed,
  pattern = "gradient",
  colorCount = 4,
  className = "",
  opacity = 1,
  blur = false,
  animated = false,
}: CanvasBackgroundProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animationFrameRef = React.useRef<number | undefined>(undefined);
  const [dimensions, setDimensions] = React.useState({
    width: 1920,
    height: 1080,
  });

  // Update dimensions on mount and resize
  React.useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Draw canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { colorSpace: "display-p3" });
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const { draw } = generateCanvasBackground({
      width: dimensions.width,
      height: dimensions.height,
      colorCount,
      pattern,
      seed: seed || window.location.pathname,
    });

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      draw(ctx);

      if (animated) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    dimensions,
    seed,
    pattern,
    colorCount,
    animated,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 -z-10 pointer-events-none ${className}`}
      style={{
        opacity,
        filter: blur ? "blur(20px)" : "none",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
}
