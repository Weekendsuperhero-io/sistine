import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import type * as React from "react";

import { type MaterialAxisProps, type MaterialProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Variant classes carry BEHAVIOR only (text, hover, destructive chrome); the SURFACE comes from
   materialSurface (the material system) — see SURFACE_ROLE below for how semantic variants ride it. */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        /* Flat like the glass variants unless the page raises its pills: its small shadow is a page value,
           --pill-raise (styles.css, THE FLAT SHADOW), so a shadow class a consumer passes still replaces it. */
        default: "border-transparent bg-primary text-primary-foreground shadow-(--pill-raise) [a&]:hover:bg-primary/80",
        glass: "text-foreground",
        secondary: "text-muted-foreground",
        destructive: "border border-destructive/50 text-destructive",
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

/* Each semantic variant's surface role (null = no glass surface — the variant styles itself, e.g.
   default/outline/ghost/link; destructive rides a borderless glass surface, its red border its own).
   A badge sits on something, a card, a row, a header, so its glass is flat (no drop shadow, unless the
   page raises its pills: data-flat-shadow) and unblurred (what is behind it is blurred already). A badge
   over a bare scene takes `blur` per instance. */
const SURFACE_ROLE: Record<string, MaterialProps | null> = {
  glass: {
    border: true,
    flat: true,
    blur: false,
  },
  secondary: {
    border: true,
    flat: true,
    blur: false,
  },
  destructive: {
    size: "sm",
    flat: true,
    blur: false,
  },
  default: null,
  outline: null,
  ghost: null,
  link: null,
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants>, MaterialAxisProps {
  asChild?: boolean;
}

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? SlotPrimitive.Slot : "span";

  const [axes, rest] = splitAxisProps(props);
  const m = materialSurface(SURFACE_ROLE[variant ?? "glass"] ?? null, axes);
  // The primary pill is not glass, so it reads the flat axis here: raised in code, flat in code, or as the page says.
  const primaryLift = variant === "default" ? (axes.flat === false ? "shadow" : axes.flat === true ? "shadow-none" : undefined) : undefined;

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
        primaryLift,
        className,
      )}
      {...rest}
    />
  );
}

export { Badge, badgeVariants };
