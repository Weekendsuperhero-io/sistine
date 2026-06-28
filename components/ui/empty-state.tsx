import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { type GlassCustomization, getGlassStyles } from "@/lib/glass-utils";
import { cn } from "@/lib/utils";

const emptyStateVariants = cva("", {
  variants: {
    variant: {
      default: "bg-card text-card-foreground border shadow-sm",
      glass: "glass-bg text-foreground",
      frosted: "glass-frosted text-foreground",
      fluted: "glass-fluted text-foreground",
      crystal: "glass-crystal text-foreground",
      opaque: "glass-opaque text-foreground",
      surface: "glass-surface text-foreground",
      solid: "glass-solid text-foreground",
    },
  },
  defaultVariants: {
    variant: "glass",
  },
});

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof emptyStateVariants> {
  glass?: GlassCustomization;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(({ className, variant = "glass", glass, children, ...props }, ref) => {
  const hasCustomGlass = glass !== undefined;
  const effectiveVariant = hasCustomGlass && variant !== "default" ? "glass" : variant;

  const glassStyles = variant !== "default" ? getGlassStyles(glass) : {};

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl p-12 text-center",
        emptyStateVariants({
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
