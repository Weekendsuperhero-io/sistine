"use client"

import * as React from "react"
import { ScrollArea as BaseScrollArea, ScrollBar } from "@/registry/ui/scroll-area"
import { cn } from "@/lib/utils"

export interface ChitraScrollAreaProps extends React.ComponentProps<typeof BaseScrollArea> {
  glow?: boolean
}

/**
 * Glass UI Scroll Area - Enhanced scroll area with glassy effects
 */
export const ChitraScrollArea = React.forwardRef<
  React.ElementRef<typeof BaseScrollArea>,
  ChitraScrollAreaProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseScrollArea
      ref={ref}
      variant={variant}
      className={cn(
        glow && "shadow-md shadow-purple-500/20",
        className
      )}
      {...props}
    />
  )
})
ChitraScrollArea.displayName = "ChitraScrollArea"

export {
  ScrollBar,
}

