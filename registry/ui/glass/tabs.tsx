"use client"

import * as React from "react"
import { Tabs as BaseTabs, TabsContent, TabsList as BaseTabsList, TabsTrigger } from "@/registry/ui/tabs"
import { cn } from "@/lib/utils"

export interface TabsListProps extends React.ComponentProps<typeof BaseTabsList> {
  glow?: boolean
}

/**
 * Glass UI Tabs - Enhanced tabs with glassy effects
 */
export const TabsList = React.forwardRef<
  React.ElementRef<typeof BaseTabsList>,
  TabsListProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseTabsList
      ref={ref}
      variant={variant}
      className={cn(
        glow && "shadow-lg shadow-purple-500/20",
        className
      )}
      {...props}
    />
  )
})
TabsList.displayName = "TabsList"

export {
  BaseTabs as Tabs,
  TabsContent,
  TabsTrigger,
}

