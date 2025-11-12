"use client"

import * as React from "react"
import { Switch as BaseSwitch } from "@/registry/ui/switch"
import { cn } from "@/lib/utils"

export interface ChitraSwitchProps extends React.ComponentProps<typeof BaseSwitch> {
  glow?: boolean
}

/**
 * Glass UI Switch - Enhanced switch with glassy effects
 */
export const ChitraSwitch = React.forwardRef<
  React.ElementRef<typeof BaseSwitch>,
  ChitraSwitchProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseSwitch
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
ChitraSwitch.displayName = "ChitraSwitch"

