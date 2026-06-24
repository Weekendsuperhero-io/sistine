"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Toggle as BaseToggle, toggleVariants } from "../toggle";

export interface ToggleProps extends React.ComponentProps<typeof BaseToggle> {
  glow?: boolean;
}

/**
 * Sistine Toggle - Enhanced toggle with glassy effects
 */
export const Toggle = React.forwardRef<React.ElementRef<typeof BaseToggle>, ToggleProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return (
      <BaseToggle ref={ref} variant={variant} className={cn(glow && "data-[state=on]:glass-glow", "transition duration-200", className)} {...props} />
    );
  },
);
Toggle.displayName = "Toggle";

export { toggleVariants };
