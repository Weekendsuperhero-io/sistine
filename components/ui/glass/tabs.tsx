"use client";

import { Tabs as BaseTabs, TabsList as BaseTabsList, TabsContent, TabsTrigger } from "@os-glass/components/ui/tabs";
import { type HoverEffect, hoverEffects } from "@os-glass/lib/hover-effects";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface TabsListProps extends React.ComponentProps<typeof BaseTabsList> {
  glow?: boolean;
  hover?: HoverEffect;
}

/**
 * Glass UI Tabs - Enhanced tabs with glassy effects
 */
export const TabsList = React.forwardRef<React.ElementRef<typeof BaseTabsList>, TabsListProps>(
  ({ className, variant = "glass", glow = false, hover = "none", ...props }, ref) => {
    return (
      <BaseTabsList
        ref={ref}
        variant={variant}
        className={cn("relative overflow-hidden", glow && "shadow-lg shadow-purple-500/20", hoverEffects({ hover }), className)}
        {...props}
      />
    );
  },
);
TabsList.displayName = "TabsList";

export { BaseTabs as Tabs, TabsContent, TabsTrigger };
