"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Switch as BaseSwitch } from "../switch";

export interface SwitchProps extends React.ComponentProps<typeof BaseSwitch> {
  glow?: boolean;
}

/**
 * Sistine Switch - Enhanced switch with glassy effects
 */
export const Switch = React.forwardRef<React.ElementRef<typeof BaseSwitch>, SwitchProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return (
      <BaseSwitch
        ref={ref}
        variant={variant}
        className={cn(glow && "data-[state=checked]:shadow-lg data-[state=checked]:shadow-purple-500/30", "transition-all duration-200", className)}
        {...props}
      />
    );
  },
);
Switch.displayName = "Switch";
