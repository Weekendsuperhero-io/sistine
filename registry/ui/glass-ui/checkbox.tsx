"use client"

import * as React from "react"
import { Checkbox as BaseCheckbox } from "@/registry/ui/checkbox"
import { cn } from "@/lib/utils"

export interface ChitraCheckboxProps extends React.ComponentProps<typeof BaseCheckbox> {
  glow?: boolean
}

/**
 * Glass UI Checkbox - Enhanced checkbox with glassy effects
 */
export const ChitraCheckbox = React.forwardRef<
  React.ElementRef<typeof BaseCheckbox>,
  ChitraCheckboxProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseCheckbox
      ref={ref}
      variant={variant}
      className={cn(
        glow && "data-[state=checked]:shadow-lg data-[state=checked]:shadow-purple-500/30",
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  )
})
ChitraCheckbox.displayName = "ChitraCheckbox"

