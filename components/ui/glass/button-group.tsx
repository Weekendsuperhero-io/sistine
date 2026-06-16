"use client";

import * as React from "react";
import type { GlassCustomization } from "@/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { cn } from "@/lib/utils";
import { ButtonGroup as BaseButtonGroup } from "../button-group";

export interface ButtonGroupProps extends React.ComponentProps<typeof BaseButtonGroup> {
  effect?: HoverEffect;
  glass?: GlassCustomization;
}

/**
 * Sistine Button Group - A beautifully designed button group with glassy effects
 * Built on top of the base ButtonGroup component with enhanced visual styling
 */
export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, variant = "glass", effect = "none", glass, ...props }, ref) => {
    return (
      <BaseButtonGroup
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
  },
);
ButtonGroup.displayName = "ButtonGroup";
