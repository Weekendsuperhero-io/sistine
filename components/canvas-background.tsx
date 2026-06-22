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

    const ctx = canvas.getContext("2d", {
      colorSpace: "display-p3",
    });
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

    if (animated) {
      // Render the pattern ONCE into an offscreen buffer, then gently drift/breathe that
      // cached image so it floats smoothly — instead of re-randomizing the pattern each frame.
      const buffer = document.createElement("canvas");
      buffer.width = canvas.width;
      buffer.height = canvas.height;
      const bufferCtx = buffer.getContext("2d", {
        colorSpace: "display-p3",
      });
      if (bufferCtx) {
        draw(bufferCtx);
      }

      // Initial static frame (avoids a flash before the first animation frame).
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(buffer, 0, 0);

      const paint = (now: number) => {
        const t = now / 1000;
        // Very slow drift + subtle "breathing" scale. The 1.12x base scale keeps the
        // ~3% drift within bounds so no canvas edges are exposed.
        const driftX = Math.sin(t * 0.12) * canvas.width * 0.03;
        const driftY = Math.cos(t * 0.1) * canvas.height * 0.03;
        const scale = 1.12 + Math.sin(t * 0.08) * 0.015;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-canvas.width / 2 + driftX, -canvas.height / 2 + driftY);
        ctx.drawImage(buffer, 0, 0);
        ctx.restore();
        animationFrameRef.current = requestAnimationFrame(paint);
      };
      animationFrameRef.current = requestAnimationFrame(paint);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      draw(ctx);
    }

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
