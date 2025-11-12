"use client"

import * as React from "react"
import {
  Tooltip as BaseTooltip,
  TooltipContent as BaseTooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/ui/tooltip"
import { cn } from "@/lib/utils"

export interface ChitraTooltipContentProps extends React.ComponentProps<typeof BaseTooltipContent> {
  glow?: boolean
}

/**
 * Glass UI Tooltip - Enhanced tooltip with glassy effects
 */
export const ChitraTooltipContent = React.forwardRef<
  React.ElementRef<typeof BaseTooltipContent>,
  ChitraTooltipContentProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseTooltipContent
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
ChitraTooltipContent.displayName = "ChitraTooltipContent"

export {
  BaseTooltip as Tooltip,
  TooltipTrigger,
  TooltipProvider,
}

