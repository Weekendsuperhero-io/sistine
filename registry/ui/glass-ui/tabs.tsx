"use client"

import * as React from "react"
import { Tabs as BaseTabs, TabsContent, TabsList as BaseTabsList, TabsTrigger } from "@/registry/ui/tabs"
import { cn } from "@/lib/utils"

export interface ChitraTabsListProps extends React.ComponentProps<typeof BaseTabsList> {
  glow?: boolean
}

/**
 * Glass UI Tabs - Enhanced tabs with glassy effects
 */
export const ChitraTabsList = React.forwardRef<
  React.ElementRef<typeof BaseTabsList>,
  ChitraTabsListProps
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
ChitraTabsList.displayName = "ChitraTabsList"

export {
  BaseTabs as Tabs,
  TabsContent,
  TabsTrigger,
}

