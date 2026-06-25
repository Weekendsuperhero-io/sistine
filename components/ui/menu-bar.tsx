"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { type GlassCustomization, getGlassStyles } from "@/lib/glass-utils";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const menuBarVariants = cva("", {
  variants: {
    variant: {
      default: "bg-card text-card-foreground border shadow-sm",
      glass: "glass-bg text-foreground",
      frosted: "glass-frosted text-foreground",
      fluted: "glass-fluted text-foreground",
      crystal: "glass-crystal text-foreground",
      opaque: "glass-opaque text-foreground",
    },
  },
  defaultVariants: {
    variant: "glass",
  },
});

export interface MenuBarProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof menuBarVariants> {
  glass?: GlassCustomization;
}

const MenuBar = React.forwardRef<HTMLDivElement, MenuBarProps>(({ className, variant = "glass", glass, children, ...props }, ref) => {
  const hasCustomGlass = glass !== undefined;
  const effectiveVariant = hasCustomGlass && variant !== "default" ? "glass" : variant;

  const glassStyles = variant !== "default" ? getGlassStyles(glass) : {};

  return (
    <div
      ref={ref}
      role="menubar"
      className={cn(
        "inline-flex items-center gap-1 rounded-md p-1",
        menuBarVariants({
          variant: effectiveVariant,
        }),
        className,
      )}
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
