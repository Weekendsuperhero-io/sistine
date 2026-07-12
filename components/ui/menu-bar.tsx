"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { type MaterialAxisProps, materialSurface } from "@/lib/material";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
const menuBarVariants = cva("", {
  variants: {
    variant: {
      default: "bg-card text-card-foreground border shadow-sm",
      glass: "text-foreground",
    },
  },
  defaultVariants: {
    variant: "glass",
  },
});

/* Role: borderless adaptive glass. */
const ROLE = {};

export interface MenuBarProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof menuBarVariants>, MaterialAxisProps {
  effect?: HoverEffect;
}

const MenuBar = React.forwardRef<HTMLDivElement, MenuBarProps>(
  ({ className, variant = "glass", material, border, veil, gradient, glow, sheen, diffuse, effect, children, ...props }, ref) => {
    const m = materialSurface(variant === "default" ? null : ROLE, {
      material,
      border,
      veil,
      gradient,
      glow,
      sheen,
      diffuse,
      stained,
    });

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
