"use client";

import { Badge as BaseBadge } from "@os-glass/components/ui/badge";
import { type HoverEffect, hoverEffects } from "@os-glass/lib/hover-effects";
import { cn } from "@os-glass/lib/utils";
import type * as React from "react";

export interface BadgeProps extends React.ComponentProps<typeof BaseBadge> {
  glow?: boolean;
  hover?: HoverEffect;
}

/**
 * Glass UI Badge - Enhanced badge with glassy effects and glow option
 */
export function Badge({ className, variant = "glass", glow = false, hover = "none", ...props }: BadgeProps) {
  return (
    <BaseBadge
      variant={variant}
      className={cn(
        "relative overflow-hidden",
        glow && "shadow-lg shadow-purple-500/30",
        "transition-all duration-200",
        hoverEffects({ hover }),
        className,
      )}
      {...props}
    />
  );
}
