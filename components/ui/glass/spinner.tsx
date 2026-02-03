"use client";

import { Spinner as BaseSpinner } from "@os-glass/components/ui/spinner";
import type { GlassCustomization } from "@os-glass/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@os-glass/lib/hover-effects";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface SpinnerProps extends React.ComponentProps<typeof BaseSpinner> {
  effect?: HoverEffect;
  glass?: GlassCustomization;
}

/**
 * Glass UI Spinner - A beautifully designed loading spinner with glassy effects
 * Built on top of the base Spinner component with enhanced visual styling
 */
export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(({ className, variant = "glass", effect = "none", glass, ...props }, ref) => {
  return <BaseSpinner ref={ref} variant={variant} glass={glass} className={cn(hoverEffects({ hover: effect }), className)} {...props} />;
});
Spinner.displayName = "Spinner";
