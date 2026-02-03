"use client";

import { Separator as BaseSeparator } from "@os-glass/components/ui/separator";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface SeparatorProps extends React.ComponentProps<typeof BaseSeparator> {
  glow?: boolean;
}

/**
 * Glass UI Separator - Enhanced separator with glassy effects
 */
export const Separator = React.forwardRef<React.ElementRef<typeof BaseSeparator>, SeparatorProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return <BaseSeparator ref={ref} variant={variant} className={cn(glow && "shadow-sm shadow-purple-500/20", className)} {...props} />;
  },
);
Separator.displayName = "Separator";
