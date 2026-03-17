"use client";

import { Tooltip as BaseTooltip, TooltipContent as BaseTooltipContent, TooltipProvider, TooltipTrigger } from "@os-glass/components/ui/tooltip";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface TooltipContentProps extends React.ComponentProps<typeof BaseTooltipContent> {
  glow?: boolean;
}

/**
 * Glass UI Tooltip - Enhanced tooltip with glassy effects
 */
export const TooltipContent = React.forwardRef<React.ElementRef<typeof BaseTooltipContent>, TooltipContentProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return <BaseTooltipContent ref={ref} variant={variant} className={cn(glow && "shadow-lg shadow-purple-500/30", className)} {...props} />;
  },
);
TooltipContent.displayName = "TooltipContent";

export { BaseTooltip as Tooltip, TooltipProvider, TooltipTrigger };
