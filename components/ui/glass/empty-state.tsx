"use client";

import * as React from "react";
import type { GlassCustomization } from "@/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { cn } from "@/lib/utils";
import { EmptyState as BaseEmptyState, EmptyStateDescription, EmptyStateIcon, EmptyStateTitle } from "../empty-state";

export interface EmptyStateProps extends React.ComponentProps<typeof BaseEmptyState> {
  effect?: HoverEffect;
  glass?: GlassCustomization;
}

/**
 * Glass UI Empty State - A beautifully designed empty state component with glassy effects
 * Built on top of the base EmptyState component with enhanced visual styling
 */
export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, variant = "glass", effect = "none", glass, ...props }, ref) => {
    return (
      <BaseEmptyState
        ref={ref}
        variant={variant}
        glass={glass}
        className={cn(
          hoverEffects({
            hover: effect,
          }),
          className,
        )}
        {...props}
      />
    );
  },
);
EmptyState.displayName = "EmptyState";

export { EmptyStateDescription, EmptyStateIcon, EmptyStateTitle };
