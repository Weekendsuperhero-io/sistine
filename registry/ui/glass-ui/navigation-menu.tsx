"use client"

import * as React from "react"
import {
  NavigationMenu as BaseNavigationMenu,
  NavigationMenuContent as BaseNavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuIndicator,
  NavigationMenuLink,
  NavigationMenuList as BaseNavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport as BaseNavigationMenuViewport,
} from "@/registry/ui/navigation-menu"
import { cn } from "@/lib/utils"

export interface ChitraNavigationMenuListProps extends React.ComponentProps<typeof BaseNavigationMenuList> {
  glow?: boolean
}

export interface ChitraNavigationMenuContentProps extends React.ComponentProps<typeof BaseNavigationMenuContent> {
  glow?: boolean
}

export interface ChitraNavigationMenuViewportProps extends React.ComponentProps<typeof BaseNavigationMenuViewport> {
  glow?: boolean
}

/**
 * Glass UI Navigation Menu - Enhanced navigation menu with glassy effects
 */
export const ChitraNavigationMenuList = React.forwardRef<
  React.ElementRef<typeof BaseNavigationMenuList>,
  ChitraNavigationMenuListProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseNavigationMenuList
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
ChitraNavigationMenuList.displayName = "ChitraNavigationMenuList"

export const ChitraNavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof BaseNavigationMenuContent>,
  ChitraNavigationMenuContentProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseNavigationMenuContent
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
ChitraNavigationMenuContent.displayName = "ChitraNavigationMenuContent"

export const ChitraNavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof BaseNavigationMenuViewport>,
  ChitraNavigationMenuViewportProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseNavigationMenuViewport
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
ChitraNavigationMenuViewport.displayName = "ChitraNavigationMenuViewport"

export {
  BaseNavigationMenu as NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuTrigger,
}

