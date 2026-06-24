"use client";

import * as React from "react";
import { type GlassCustomization, getGlassStyles } from "@/lib/glass-utils";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface MenuBarProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "frosted" | "fluted" | "crystal" | "opaque";
  glass?: GlassCustomization;
}

const MenuBar = React.forwardRef<HTMLDivElement, MenuBarProps>(({ className, variant = "glass", glass, children, ...props }, ref) => {
  const hasCustomGlass = glass !== undefined;

  const getVariantClass = () => {
    if (variant === "default") return "bg-card text-card-foreground border shadow-sm";
    if (hasCustomGlass) return "glass-bg text-foreground";

    const variants = {
      glass: "glass-bg text-foreground",
      frosted: "glass-frosted text-foreground",
      fluted: "glass-fluted text-foreground",
      crystal: "glass-crystal text-foreground",
      opaque: "glass-opaque text-foreground",
    };
    return variants[variant] || variants.glass;
  };

  const glassStyles = variant !== "default" ? getGlassStyles(glass) : {};

  return (
    <div
      ref={ref}
      role="menubar"
      className={cn("inline-flex items-center gap-1 rounded-md p-1", getVariantClass(), className)}
      style={{
        ...glassStyles,
      }}
      {...props}
    >
      {children}
    </div>
  );
});
MenuBar.displayName = "MenuBar";

export interface MenuBarItemProps extends React.ComponentProps<typeof Button> {
  active?: boolean;
}

const MenuBarItem = React.forwardRef<HTMLButtonElement, MenuBarItemProps>(({ className, active, variant = "ghost", ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant={variant}
      className={cn("h-8 px-3 text-sm", active && "bg-foreground/10 text-accent-foreground", className)}
      {...props}
    />
  );
});
MenuBarItem.displayName = "MenuBarItem";

export { MenuBar, MenuBarItem };
