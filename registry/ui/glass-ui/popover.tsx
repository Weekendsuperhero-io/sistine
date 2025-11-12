"use client"

import * as React from "react"
import {
  Popover as BasePopover,
  PopoverContent as BasePopoverContent,
  PopoverTrigger,
} from "@/registry/ui/popover"
import { cn } from "@/lib/utils"

export interface ChitraPopoverContentProps extends React.ComponentProps<typeof BasePopoverContent> {
  glow?: boolean
}

/**
 * Glass UI Popover - Enhanced popover with glassy effects
 */
export const ChitraPopoverContent = React.forwardRef<
  React.ElementRef<typeof BasePopoverContent>,
  ChitraPopoverContentProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BasePopoverContent
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
ChitraPopoverContent.displayName = "ChitraPopoverContent"

export {
  BasePopover as Popover,
  PopoverTrigger,
}

