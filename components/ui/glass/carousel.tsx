"use client";

import { Carousel as BaseCarousel } from "@os-glass/components/ui/carousel";
import type { GlassCustomization } from "@os-glass/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@os-glass/lib/hover-effects";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface CarouselProps extends React.ComponentProps<typeof BaseCarousel> {
  effect?: HoverEffect;
  glass?: GlassCustomization;
}

/**
 * Glass UI Carousel - A beautifully designed carousel with glassy effects
 * Built on top of the base Carousel component with enhanced visual styling
 */
export const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(({ className, variant = "glass", effect = "none", glass, ...props }, ref) => {
  return <BaseCarousel ref={ref} variant={variant} glass={glass} className={cn(hoverEffects({ hover: effect }), className)} {...props} />;
});
Carousel.displayName = "Carousel";
