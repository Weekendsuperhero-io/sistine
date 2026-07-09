import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import type * as React from "react";

import { type Material, resolveMaterial } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Variant classes carry BEHAVIOR only (text, hover, destructive chrome); the SURFACE comes from
   resolveMaterial (the material system) — see SURFACE_TIER below for how semantic variants ride it. */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow [a&]:hover:bg-primary/80",
        glass: "text-foreground",
        frosted: "text-foreground",
        crystal: "text-foreground",
        opaque: "text-foreground",
        surface: "text-foreground",
        solid: "text-foreground",
        secondary: "text-muted-foreground",
        destructive: "backdrop-blur-[var(--blur-sm)] border border-destructive/50 text-destructive shadow-[var(--glass-shadow-sm)]",
        outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "border-transparent [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "border-transparent text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "glass",
    },
  },
);

/* Which tier supplies each SEMANTIC variant's surface (undefined = the variant name IS the tier;
   null = no glass surface — the variant styles itself, e.g. default/ghost/link). */
const SURFACE_TIER: Partial<Record<string, string | null>> = {
  default: null,
  outline: null,
  ghost: null,
  link: null,
  destructive: "glass",
  secondary: "surface",
};

/* Role: bordered adaptive glass (the old glass-surface look). */
const ROLE = {
  border: true,
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  material?: Material;
  border?: boolean;
}

function Badge({ className, variant, asChild = false, material, border, ...props }: BadgeProps) {
  const Comp = asChild ? SlotPrimitive.Slot : "span";

  const surfaceVariant = SURFACE_TIER[variant ?? "glass"] === undefined ? variant : SURFACE_TIER[variant ?? "glass"];
  // Destructive rides a BORDERLESS glass surface (its red border is its own behavior class, like the
  // old glass-bg look) — the bordered ROLE applies to the material tiers only.
  const m = resolveMaterial(variant === "destructive" ? {} : ROLE, surfaceVariant, {
    material,
    border,
  });

  return (
    <Comp
      data-slot="badge"
      data-variant={variant ?? "glass"}
      data-material={m?.["data-material"]}
      data-glass-tint={variant === "destructive" ? "destructive" : undefined}
      className={cn(
        m?.className,
        badgeVariants({
          variant,
        }),
        className,
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
