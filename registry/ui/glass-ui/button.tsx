"use client"

import * as React from "react"
import { Button as BaseButton, buttonVariants } from "@/registry/ui/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import type { GlassCustomization } from "@/lib/glass-utils"

const chitraButtonVariants = cva(
  "relative overflow-hidden transition-all duration-300",
  {
    variants: {
      effect: {
        none: "",
        glow: "shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/70",
        shimmer: "before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent hover:before:translate-x-full before:transition-transform before:duration-1000",
        ripple: "relative overflow-hidden after:absolute after:inset-0 after:scale-0 after:rounded-full after:bg-white/30 after:transition-transform after:duration-500 hover:after:scale-150",
      },
    },
    defaultVariants: {
      effect: "none",
    },
  }
)

export interface ChitraButtonProps
  extends Omit<React.ComponentProps<typeof BaseButton>, "glass">,
    VariantProps<typeof chitraButtonVariants> {
  effect?: "none" | "glow" | "shimmer" | "ripple"
  glass?: GlassCustomization
}

/**
 * Glass UI Button - A beautifully designed button component with glassy effects
 * Built on top of the base Button component with enhanced visual effects
 * 
 * @example
 * ```tsx
 * <ChitraButton 
 *   glass={{
 *     color: "rgba(59, 130, 246, 0.2)",
 *     blur: 25,
 *     outline: "rgba(59, 130, 246, 0.4)"
 *   }}
 * >
 *   Click me
 * </ChitraButton>
 * ```
 */
export const ChitraButton = React.forwardRef<
  HTMLButtonElement,
  ChitraButtonProps
>(({ className, effect = "glow", variant = "glass", glass, ...props }, ref) => {
  return (
    <BaseButton
      ref={ref}
      variant={variant}
      glass={glass}
      className={cn(chitraButtonVariants({ effect }), className)}
      {...props}
    />
  )
})
ChitraButton.displayName = "ChitraButton"

export { chitraButtonVariants }

