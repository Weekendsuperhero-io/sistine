"use client";

import { HoverCard as BaseHoverCard, HoverCardContent as BaseHoverCardContent, HoverCardTrigger } from "@os-glass/components/ui/hover-card";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface HoverCardContentProps extends React.ComponentProps<typeof BaseHoverCardContent> {
  glow?: boolean;
}

/**
 * Glass UI Hover Card - Enhanced hover card with glassy effects
 */
export const HoverCardContent = React.forwardRef<React.ElementRef<typeof BaseHoverCardContent>, HoverCardContentProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return <BaseHoverCardContent ref={ref} variant={variant} className={cn(glow && "shadow-lg shadow-purple-500/30", className)} {...props} />;
  },
);
HoverCardContent.displayName = "HoverCardContent";

export { BaseHoverCard as HoverCard, HoverCardTrigger };
