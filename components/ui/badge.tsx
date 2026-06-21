import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow [a&]:hover:bg-primary/80",
        glass: "glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] text-foreground shadow-[var(--glass-shadow-sm)]",
        glassSubtle:
          "glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] text-foreground shadow-[var(--glass-shadow-sm)] opacity-50",
        frosted:
          "glass-frosted backdrop-blur-[var(--blur-frosted)] border border-[var(--glass-frosted-border)] text-foreground shadow-[var(--glass-frosted-shadow)]",
        fluted: "glass-fluted backdrop-blur-[var(--blur)] border border-[var(--glass-border)] text-foreground shadow-[var(--glass-shadow-sm)]",
        crystal:
          "glass-crystal backdrop-blur-[var(--blur-crystal)] border border-[var(--glass-crystal-border)] text-foreground shadow-[var(--glass-crystal-shadow)]",
        secondary:
          "glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] text-muted-foreground shadow-[var(--glass-shadow-sm)]",
        destructive: "glass-bg backdrop-blur-[var(--blur-sm)] border border-destructive/50 text-destructive shadow-[var(--glass-shadow-sm)]",
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

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? SlotPrimitive.Slot : "div";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant ?? "glass"}
      className={cn(
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
