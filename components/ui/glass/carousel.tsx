"use client";

import * as React from "react";
import { Carousel as BaseCarousel } from "../carousel";
import type { GlassCustomization } from "@/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { cn } from "@/lib/utils";

export interface CarouselProps extends React.ComponentProps<typeof BaseCarousel> {
  effect?: HoverEffect;
  glass?: GlassCustomization;
}

/**
 * Glass UI Carousel - A beautifully designed carousel with glassy effects
 * Built on top of the base Carousel component with enhanced visual styling
 */
export const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(({ className, variant = "glass", effect = "none", glass, ...props }, ref) => {
  return (
    <BaseCarousel
      ref={ref}
      variant={variant}
      glass={glass}
      className={cn(
        hoverEffects({
          hover: effect,
        }),
        className,
      )}
      {...props}
    />
  );
});
Carousel.displayName = "Carousel";
