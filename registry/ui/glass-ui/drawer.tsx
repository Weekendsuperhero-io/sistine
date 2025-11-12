"use client"

import * as React from "react"
import {
  Drawer as BaseDrawer,
  DrawerClose,
  DrawerContent as BaseDrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "@/registry/ui/drawer"
import { cn } from "@/lib/utils"

export interface ChitraDrawerContentProps extends React.ComponentProps<typeof BaseDrawerContent> {
  glow?: boolean
}

/**
 * Glass UI Drawer - Enhanced drawer with glassy effects
 */
export const ChitraDrawerContent = React.forwardRef<
  React.ElementRef<typeof BaseDrawerContent>,
  ChitraDrawerContentProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseDrawerContent
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
ChitraDrawerContent.displayName = "ChitraDrawerContent"

export {
  BaseDrawer as Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}

