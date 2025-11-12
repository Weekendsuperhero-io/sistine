"use client"

import * as React from "react"
import { Input as BaseInput } from "@/registry/ui/input"
import { cn } from "@/lib/utils"
import type { GlassCustomization } from "@/lib/glass-utils"

export interface InputProps extends Omit<React.ComponentProps<typeof BaseInput>, "glass"> {
  icon?: React.ReactNode
  error?: boolean
  glass?: GlassCustomization
}

/**
 * Glass UI Input - A beautifully designed input component with glassy effects
 * Built on top of the base Input component with enhanced visual styling
 * 
 * @example
 * ```tsx
 * <Input 
 *   glass={{
 *     color: "rgba(255, 255, 255, 0.15)",
 *     blur: 15,
 *     outline: "rgba(255, 255, 255, 0.3)"
 *   }}
 *   placeholder="Enter text..."
 * />
 * ```
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "glass", icon, error, glass, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <BaseInput
          ref={ref}
          variant={variant}
          glass={glass}
          className={cn(
            icon && "pl-10",
            error && "border-destructive focus-visible:ring-destructive",
            "transition-all duration-200 focus-visible:scale-[1.02]",
            className
          )}
          {...props}
        />
      </div>
    )
  }
)
Input.displayName = "Input"

