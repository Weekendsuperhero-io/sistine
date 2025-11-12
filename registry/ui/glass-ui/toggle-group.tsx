"use client"

import * as React from "react"
import { ToggleGroup as BaseToggleGroup, ToggleGroupItem } from "@/registry/ui/toggle-group"
import { cn } from "@/lib/utils"

type BaseToggleGroupProps = React.ComponentProps<typeof BaseToggleGroup>

export type ChitraToggleGroupProps = Omit<BaseToggleGroupProps, "variant" | "className"> & {
  glow?: boolean
  variant?: "default" | "glass"
  className?: string
}

/**
 * Glass UI Toggle Group - Enhanced toggle group with glassy effects
 */
export const ChitraToggleGroup = React.forwardRef<
  React.ElementRef<typeof BaseToggleGroup>,
  ChitraToggleGroupProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseToggleGroup
      ref={ref}
      variant={variant}
      className={cn(
        glow && "shadow-md shadow-purple-500/20",
        className
      )}
      {...(props as BaseToggleGroupProps)}
    />
  )
})
ChitraToggleGroup.displayName = "ChitraToggleGroup"

export {
  ToggleGroupItem,
}

