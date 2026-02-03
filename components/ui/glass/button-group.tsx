"use client";

import { ButtonGroup as BaseButtonGroup } from "@os-glass/components/ui/button-group";
import type { GlassCustomization } from "@os-glass/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@os-glass/lib/hover-effects";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface ButtonGroupProps extends React.ComponentProps<typeof BaseButtonGroup> {
  effect?: HoverEffect;
  glass?: GlassCustomization;
}

/**
 * Glass UI Button Group - A beautifully designed button group with glassy effects
 * Built on top of the base ButtonGroup component with enhanced visual styling
 */
export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, variant = "glass", effect = "none", glass, ...props }, ref) => {
    return <BaseButtonGroup ref={ref} variant={variant} glass={glass} className={cn(hoverEffects({ hover: effect }), className)} {...props} />;
  },
);
ButtonGroup.displayName = "ButtonGroup";
