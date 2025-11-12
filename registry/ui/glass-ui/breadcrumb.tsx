"use client"

import * as React from "react"
import {
  Breadcrumb as BaseBreadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList as BaseBreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/registry/ui/breadcrumb"
import { cn } from "@/lib/utils"

export interface ChitraBreadcrumbListProps extends React.ComponentProps<typeof BaseBreadcrumbList> {
  glow?: boolean
}

/**
 * Glass UI Breadcrumb - Enhanced breadcrumb with glassy effects
 */
export const ChitraBreadcrumbList = React.forwardRef<
  HTMLOListElement,
  ChitraBreadcrumbListProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseBreadcrumbList
      ref={ref}
      variant={variant}
      className={cn(
        glow && "shadow-md shadow-purple-500/20",
        className
      )}
      {...props}
    />
  )
})
ChitraBreadcrumbList.displayName = "ChitraBreadcrumbList"

export {
  BaseBreadcrumb as Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}

