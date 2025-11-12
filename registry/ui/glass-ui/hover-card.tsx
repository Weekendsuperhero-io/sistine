"use client"

import * as React from "react"
import {
  HoverCard as BaseHoverCard,
  HoverCardContent as BaseHoverCardContent,
  HoverCardTrigger,
} from "@/registry/ui/hover-card"
import { cn } from "@/lib/utils"

export interface ChitraHoverCardContentProps extends React.ComponentProps<typeof BaseHoverCardContent> {
  glow?: boolean
}

/**
 * Glass UI Hover Card - Enhanced hover card with glassy effects
 */
export const ChitraHoverCardContent = React.forwardRef<
  React.ElementRef<typeof BaseHoverCardContent>,
  ChitraHoverCardContentProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseHoverCardContent
      ref={ref}
      variant={variant}
      className={cn(
        glow && "shadow-lg shadow-purple-500/30",
        className
      )}
      {...props}
    />
  )
})
ChitraHoverCardContent.displayName = "ChitraHoverCardContent"

export {
  BaseHoverCard as HoverCard,
  HoverCardTrigger,
}

