"use client";

import { usePathname } from "next/navigation";
import { CanvasBackground } from "./canvas-background";

/**
 * CanvasBackgroundWrapper - Wraps CanvasBackground with pathname-based seed
 * This ensures each page gets a unique but consistent background
 */
export function CanvasBackgroundWrapper() {
  const pathname = usePathname();

  return <CanvasBackground seed={pathname} pattern="artistic" colorCount={5} opacity={0.5} blur={true} />;
}
