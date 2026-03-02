"use client";

import { Input as BaseInput } from "@os-glass/components/ui/input";
import type { GlassCustomization } from "@os-glass/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@os-glass/lib/hover-effects";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface InputProps extends Omit<React.ComponentProps<typeof BaseInput>, "glass"> {
  icon?: React.ReactNode;
  error?: boolean;
  hover?: HoverEffect;
  glass?: GlassCustomization;
}

/**
 * Glass UI Input - A beautifully designed input component with glassy effects
 * Built on top of the base Input component with enhanced visual styling
 *
 * @example
 * ```tsx
 * <Input
 *   glass={{
 *     color: "oklch(1 0 0 / 0.15)",
 *     blur: 15,
 *     outline: "oklch(1 0 0 / 0.3)"
 *   }}
 *   placeholder="Enter text..."
 * />
 * ```
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "glass", icon, error, hover = "none", glass, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-muted-foreground pointer-events-none">{icon}</div>}
        <BaseInput
          ref={ref}
          variant={variant}
          glass={glass}
          className={cn(
            "relative overflow-hidden",
            icon && "pl-10",
            error && "border-destructive focus-visible:ring-destructive",
            "transition-all duration-200 focus-visible:scale-[1.02]",
            hoverEffects({ hover }),
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = "Input";
