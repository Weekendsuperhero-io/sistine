"use client";

import { MenuBar as BaseMenuBar, MenuBarItem as BaseMenuBarItem } from "@os-glass/components/ui/menu-bar";
import type { GlassCustomization } from "@os-glass/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@os-glass/lib/hover-effects";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface MenuBarProps extends React.ComponentProps<typeof BaseMenuBar> {
  effect?: HoverEffect;
  glass?: GlassCustomization;
}

/**
 * Glass UI Menu Bar - A beautifully designed menu bar with glassy effects
 * Built on top of the base MenuBar component with enhanced visual styling
 */
export const MenuBar = React.forwardRef<HTMLDivElement, MenuBarProps>(({ className, variant = "glass", effect = "none", glass, ...props }, ref) => {
  return <BaseMenuBar ref={ref} variant={variant} glass={glass} className={cn(hoverEffects({ hover: effect }), className)} {...props} />;
});
MenuBar.displayName = "MenuBar";

export interface MenuBarItemProps extends React.ComponentProps<typeof BaseMenuBarItem> {}

export const MenuBarItem = React.forwardRef<HTMLButtonElement, MenuBarItemProps>(({ className, ...props }, ref) => {
  return <BaseMenuBarItem ref={ref} className={className} {...props} />;
});
MenuBarItem.displayName = "MenuBarItem";
