"use client";

import { InputGroup as BaseInputGroup } from "@os-glass/components/ui/input-group";
import type { GlassCustomization } from "@os-glass/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@os-glass/lib/hover-effects";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface InputGroupProps extends React.ComponentProps<typeof BaseInputGroup> {
  effect?: HoverEffect;
  glass?: GlassCustomization;
}

/**
 * Glass UI Input Group - A beautifully designed input group with glassy effects
 * Built on top of the base InputGroup component with enhanced visual styling
 */
export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, variant = "glass", effect = "none", glass, ...props }, ref) => {
    return <BaseInputGroup ref={ref} variant={variant} glass={glass} className={cn(hoverEffects({ hover: effect }), className)} {...props} />;
  },
);
InputGroup.displayName = "InputGroup";
