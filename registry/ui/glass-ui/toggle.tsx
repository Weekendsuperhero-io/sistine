"use client"

import * as React from "react"
import { Toggle as BaseToggle, toggleVariants } from "@/registry/ui/toggle"
import { cn } from "@/lib/utils"

export interface ChitraToggleProps extends React.ComponentProps<typeof BaseToggle> {
  glow?: boolean
}

/**
 * Glass UI Toggle - Enhanced toggle with glassy effects
 */
export const ChitraToggle = React.forwardRef<
  React.ElementRef<typeof BaseToggle>,
  ChitraToggleProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseToggle
      ref={ref}
      variant={variant}
      className={cn(
        glow && "data-[state=on]:shadow-lg data-[state=on]:shadow-purple-500/30",
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  )
})
ChitraToggle.displayName = "ChitraToggle"

export { toggleVariants }

