"use client"

import * as React from "react"
import {
  Sidebar as BaseSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
} from "@/registry/ui/sidebar"
import { cn } from "@/lib/utils"

export interface ChitraSidebarProps extends React.ComponentProps<typeof BaseSidebar> {
  glow?: boolean
}

/**
 * Glass UI Sidebar - Enhanced sidebar with glassy effects
 */
export const ChitraSidebar = React.forwardRef<HTMLDivElement, ChitraSidebarProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return (
      <BaseSidebar
        ref={ref}
        variant={variant}
        className={cn(
          glow && "shadow-lg shadow-purple-500/20",
          className
        )}
        {...props}
      />
    )
  }
)
ChitraSidebar.displayName = "ChitraSidebar"

export {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarItem,
}

