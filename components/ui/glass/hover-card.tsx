"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { HoverCard as BaseHoverCard, HoverCardContent as BaseHoverCardContent, HoverCardTrigger } from "../hover-card";

export interface HoverCardContentProps extends React.ComponentProps<typeof BaseHoverCardContent> {
  glow?: boolean;
}

/**
 * Sistine Hover Card - Enhanced hover card with glassy effects
 */
export const HoverCardContent = React.forwardRef<React.ElementRef<typeof BaseHoverCardContent>, HoverCardContentProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return <BaseHoverCardContent ref={ref} variant={variant} className={cn(glow && "glass-glow", className)} {...props} />;
  },
);
HoverCardContent.displayName = "HoverCardContent";

export { BaseHoverCard as HoverCard, HoverCardTrigger };
