"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import * as React from "react";

import { type Material, materialSurface } from "@/lib/material";
import { cn } from "@/lib/utils";

type ToggleGroupVariant = "default" | "glass";

const ToggleGroupContext = React.createContext<{
  variant?: ToggleGroupVariant;
  size?: "default" | "sm" | "lg";
  spacing?: number;
}>({
  variant: "glass",
  size: "default",
  spacing: 0,
});

/* Role: bordered adaptive glass (the old glass-surface look). */
const ROLE = {
  border: true,
};

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & {
    variant?: ToggleGroupVariant;
    size?: "default" | "sm" | "lg";
    spacing?: number;
    material?: Material;
    border?: boolean;
    /** Resting glow (folded from the glass wrapper). */
    glow?: boolean;
  }
>(({ className, variant = "glass", size = "default", spacing = 0, material, border, glow, children, ...props }, ref) => {
  /* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
  const variants = {
    default: "",
    glass: "rounded-md p-1",
  };

  const m = materialSurface(variant === "default" ? null : ROLE, {
    material,
    border,
  });

  return (
    <ToggleGroupPrimitive.Root
      ref={ref}
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-material={m?.["data-material"]}
      className={cn(
        m?.className,
        "group/toggle-group inline-flex items-center justify-center rounded-md",
        variants[variant],
        glow && "glass-glow",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider
        value={{
          variant,
          size,
          spacing,
        }}
      >
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
});

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & {
    variant?: ToggleGroupVariant;
    size?: "default" | "sm" | "lg";
  }
>(({ className, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        "inline-flex items-center justify-center rounded-sm px-3 py-1 text-sm font-medium ring-offset-background transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        // Inactive state - transparent, blends with background
        "text-muted-foreground",
        // Active state - lighter, more opaque background with shadow (same as tabs)
        "data-[state=on]:bg-white/80 dark:data-[state=on]:bg-white/20",
        "data-[state=on]:text-foreground",
        "data-[state=on]:shadow-[var(--active-shadow)]",
        "hover:bg-accent/50 hover:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
