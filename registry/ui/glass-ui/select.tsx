"use client"

import * as React from "react"
import {
  Select as BaseSelect,
  SelectContent as BaseSelectContent,
  SelectItem,
  SelectTrigger as BaseSelectTrigger,
  SelectValue,
} from "@/registry/ui/select"
import { cn } from "@/lib/utils"

export interface ChitraSelectTriggerProps extends React.ComponentProps<typeof BaseSelectTrigger> {
  glow?: boolean
}

export interface ChitraSelectContentProps extends React.ComponentProps<typeof BaseSelectContent> {
  glow?: boolean
}

/**
 * Glass UI Select - Enhanced select with glassy effects
 */
export const ChitraSelectTrigger = React.forwardRef<
  React.ElementRef<typeof BaseSelectTrigger>,
  ChitraSelectTriggerProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseSelectTrigger
      ref={ref}
      variant={variant}
      className={cn(
        glow && "shadow-md shadow-purple-500/20",
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  )
})
ChitraSelectTrigger.displayName = "ChitraSelectTrigger"

export const ChitraSelectContent = React.forwardRef<
  React.ElementRef<typeof BaseSelectContent>,
  ChitraSelectContentProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseSelectContent
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
ChitraSelectContent.displayName = "ChitraSelectContent"

export {
  BaseSelect as Select,
  SelectValue,
  SelectItem,
}

