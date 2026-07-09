import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { type GlassCustomization, getGlassStyles } from "@/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { type Material, resolveMaterial } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Variant classes carry BEHAVIOR only; the surface comes from resolveMaterial. */
const emptyStateVariants = cva("", {
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

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof emptyStateVariants> {
  glass?: GlassCustomization;
  material?: Material;
  border?: boolean;
  veil?: boolean;
  gradient?: boolean;
  glow?: boolean | "lg";
  sheen?: boolean;
  effect?: HoverEffect;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
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
        data-material={m?.["data-material"]}
        className={cn(
          m?.className,
          "flex flex-col items-center justify-center rounded-xl p-12 text-center",
          emptyStateVariants({
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
EmptyState.displayName = "EmptyState";

function EmptyStateIcon({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 text-foreground-ui", className)} {...props} />;
}

function EmptyStateTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-foreground mb-2", className)} {...props} />;
}

function EmptyStateDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground max-w-sm", className)} {...props} />;
}

export { EmptyState, EmptyStateDescription, EmptyStateIcon, EmptyStateTitle };
