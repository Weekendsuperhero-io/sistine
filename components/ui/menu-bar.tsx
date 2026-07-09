"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { type GlassCustomization, getGlassStyles } from "@/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { type Material, resolveMaterial } from "@/lib/material";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/* Variant classes carry BEHAVIOR only; the surface comes from resolveMaterial. */
const menuBarVariants = cva("", {
  variants: {
    variant: {
      default: "bg-card text-card-foreground border shadow-sm",
      glass: "text-foreground",
      frosted: "text-foreground",
      crystal: "text-foreground",
      opaque: "text-foreground",
      surface: "text-foreground",
      solid: "text-foreground",
    },
  },
  defaultVariants: {
    variant: "glass",
  },
});

/* Role: borderless adaptive glass (the old glass-bg look). */
const ROLE = {};

export interface MenuBarProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof menuBarVariants> {
  glass?: GlassCustomization;
  material?: Material;
  border?: boolean;
  veil?: boolean;
  gradient?: boolean;
  glow?: boolean | "lg";
  sheen?: boolean;
  effect?: HoverEffect;
}

const MenuBar = React.forwardRef<HTMLDivElement, MenuBarProps>(
  ({ className, variant = "glass", glass, material, border, veil, gradient, glow, sheen, effect, style, children, ...props }, ref) => {
    const m = resolveMaterial(ROLE, variant === "default" ? null : variant, {
      material,
      border,
      veil,
      gradient,
      glow,
      sheen,
    });

    const hasCustomGlass = glass !== undefined;
    const glassStyles = m !== null && hasCustomGlass ? getGlassStyles(glass) : {};

    return (
      <div
        ref={ref}
        role="menubar"
        data-material={m?.["data-material"]}
        className={cn(
          m?.className,
          "inline-flex items-center gap-1 rounded-md p-1",
          menuBarVariants({
            variant,
          }),
          effect &&
            hoverEffects({
              hover: effect,
            }),
          className,
        )}
        style={{
          ...glassStyles,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
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
