"use client"

import * as React from "react"
import { Badge as BaseBadge } from "@/registry/ui/badge"
import { cn } from "@/lib/utils"

export interface ChitraBadgeProps extends React.ComponentProps<typeof BaseBadge> {
  glow?: boolean
}

/**
 * Glass UI Badge - Enhanced badge with glassy effects and glow option
 */
export function ChitraBadge({ className, variant = "glass", glow = false, ...props }: ChitraBadgeProps) {
  return (
    <BaseBadge
      variant={variant}
      className={cn(
        glow && "shadow-lg shadow-purple-500/30",
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  )
}

