"use client";

import * as React from "react";
import { ToggleGroup as BaseToggleGroup, ToggleGroupItem } from "../toggle-group";
import { cn } from "@/lib/utils";

type BaseToggleGroupProps = React.ComponentProps<typeof BaseToggleGroup>;

export type ToggleGroupProps = Omit<BaseToggleGroupProps, "variant" | "className"> & {
  glow?: boolean;
  variant?: "default" | "glass";
  className?: string;
};

/**
 * Glass UI Toggle Group - Enhanced toggle group with glassy effects
 */
export const ToggleGroup = React.forwardRef<React.ElementRef<typeof BaseToggleGroup>, ToggleGroupProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return (
      <BaseToggleGroup
        ref={ref}
        variant={variant}
        className={cn(glow && "shadow-md shadow-purple-500/20", className)}
        {...(props as BaseToggleGroupProps)}
      />
    );
  },
);
ToggleGroup.displayName = "ToggleGroup";

export { ToggleGroupItem };
