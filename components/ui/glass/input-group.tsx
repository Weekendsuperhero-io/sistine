"use client"

import * as React from "react"
import { InputGroup as BaseInputGroup } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"
import type { GlassCustomization } from "@/lib/glass-utils"
import { hoverEffects, type HoverEffect } from "@/lib/hover-effects"

export interface InputGroupProps extends React.ComponentProps<typeof BaseInputGroup> {
  effect?: HoverEffect
  glass?: GlassCustomization
}

/**
 * Glass UI Input Group - A beautifully designed input group with glassy effects
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
          hoverEffects({ hover: effect }),
          className
        )}
        {...props}
      />
    )
  }
)
InputGroup.displayName = "InputGroup"

