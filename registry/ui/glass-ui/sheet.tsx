"use client"

import * as React from "react"
import {
  Sheet as BaseSheet,
  SheetClose,
  SheetContent as BaseSheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "@/registry/ui/sheet"
import { cn } from "@/lib/utils"

export interface ChitraSheetContentProps extends React.ComponentProps<typeof BaseSheetContent> {
  glow?: boolean
}

/**
 * Glass UI Sheet - Enhanced sheet with glassy effects
 */
export const ChitraSheetContent = React.forwardRef<
  React.ElementRef<typeof BaseSheetContent>,
  ChitraSheetContentProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseSheetContent
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
ChitraSheetContent.displayName = "ChitraSheetContent"

export {
  BaseSheet as Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}

