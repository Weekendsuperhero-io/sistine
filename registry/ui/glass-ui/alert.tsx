"use client"

import * as React from "react"
import { Alert as BaseAlert, AlertDescription, AlertTitle } from "@/registry/ui/alert"
import { cn } from "@/lib/utils"

export interface ChitraAlertProps extends React.ComponentProps<typeof BaseAlert> {
  glow?: boolean
}

/**
 * Glass UI Alert - Enhanced alert with glassy effects
 */
export const ChitraAlert = React.forwardRef<HTMLDivElement, ChitraAlertProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return (
      <BaseAlert
        ref={ref}
        variant={variant}
        className={cn(
          glow && "shadow-lg shadow-purple-500/20",
          "transition-all duration-200",
          className
        )}
        {...props}
      />
    )
  }
)
ChitraAlert.displayName = "ChitraAlert"

export {
  AlertDescription,
  AlertTitle,
}

