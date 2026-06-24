"use client";

import * as React from "react";
import type { GlassCustomization } from "@/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { cn } from "@/lib/utils";
import { InputGroup as BaseInputGroup } from "../input-group";

export interface InputGroupProps extends React.ComponentProps<typeof BaseInputGroup> {
  effect?: HoverEffect;
  glass?: GlassCustomization;
}

/**
 * Sistine Input Group - A beautifully designed input group with glassy effects
 * Built on top of the base InputGroup component with enhanced visual styling
 */
export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, variant = "glass", effect = "none", glass, ...props }, ref) => {
    return (
      <BaseInputGroup
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
InputGroup.displayName = "InputGroup";

export { InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from "../input-group";
