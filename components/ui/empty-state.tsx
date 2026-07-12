import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { type MaterialAxisProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
const emptyStateVariants = cva("", {
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

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof emptyStateVariants>, MaterialAxisProps {
  effect?: HoverEffect;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(({ className, variant = "glass", effect, children, ...props }, ref) => {
  const [axes, rest] = splitAxisProps(props);
  const m = materialSurface(variant === "default" ? null : ROLE, axes);

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
      {...rest}
    >
      {children}
    </div>
  );
});
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
