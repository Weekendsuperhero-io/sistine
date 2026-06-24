"use client";

import * as React from "react";
import type { GlassCustomization } from "@/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { cn } from "@/lib/utils";
import { Spinner as BaseSpinner } from "../spinner";

export interface SpinnerProps extends React.ComponentProps<typeof BaseSpinner> {
  effect?: HoverEffect;
  glass?: GlassCustomization;
}

/**
 * Sistine Spinner - A beautifully designed loading spinner with glassy effects
 * Built on top of the base Spinner component with enhanced visual styling
 */
export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(({ className, variant = "glass", effect = "none", glass, ...props }, ref) => {
  return (
    <BaseSpinner
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
Spinner.displayName = "Spinner";
