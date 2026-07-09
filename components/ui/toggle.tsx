"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";
import * as React from "react";

import { type Material, resolveMaterial } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Variant classes carry BEHAVIOR only; the surface comes from resolveMaterial. */
const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
        glass: "hover:opacity-90",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "glass",
      size: "default",
    },
  },
);

/* Role: bordered adaptive glass (the old glass-surface look). */
const ROLE = {
  border: true,
};

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants> & {
      material?: Material;
      border?: boolean;
      /** Glow rides the ON state on toggles (folded from the glass wrapper). */
      glow?: boolean;
    }
>(({ className, variant = "glass", size, material, border, glow, ...props }, ref) => {
  // "outline" and "default" are not glass tiers, so they resolve to no surface / the role glass.
  const m = resolveMaterial(ROLE, variant === "default" ? null : variant, {
    material,
    border,
  });

  return (
    <TogglePrimitive.Root
      ref={ref}
      data-slot="toggle"
      data-material={m?.["data-material"]}
      className={cn(
        m?.className,
        toggleVariants({
          variant,
          size,
        }),
        glow && "data-[state=on]:glass-glow transition duration-200",
        className,
      )}
      {...props}
    />
  );
});

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
