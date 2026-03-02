"use client";

import { Button as BaseButton } from "@os-glass/components/ui/button";
import type { GlassCustomization } from "@os-glass/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@os-glass/lib/hover-effects";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface ButtonProps extends Omit<React.ComponentProps<typeof BaseButton>, "glass"> {
  effect?: HoverEffect;
  glass?: GlassCustomization;
}

/**
 * Glass UI Button - A beautifully designed button component with glassy effects
 * Built on top of the base Button component with enhanced visual effects
 *
 * @example
 * ```tsx
 * <Button
 *   glass={{
 *     color: "oklch(0.62 0.19 260 / 0.2)",
 *     blur: 25,
 *     outline: "oklch(0.62 0.19 260 / 0.4)"
 *   }}
 * >
 *   Click me
 * </Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, effect = "glow", variant = "glass", glass, ...props }, ref) => {
  return (
    <BaseButton
      ref={ref}
      variant={variant}
      glass={glass}
      className={cn("relative overflow-hidden", hoverEffects({ hover: effect }), className)}
      {...props}
    />
  );
});
Button.displayName = "Button";
