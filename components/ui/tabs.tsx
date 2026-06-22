"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>>(
  ({ className, orientation = "horizontal", ...props }, ref) => (
    <TabsPrimitive.Root
      ref={ref}
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", className)}
      {...props}
    />
  ),
);
Tabs.displayName = TabsPrimitive.Root.displayName;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: "default" | "glass" | "glassSubtle" | "frosted" | "fluted" | "crystal";
  }
>(({ className, variant = "glass", ...props }, ref) => {
  const getVariantClass = () => {
    if (variant === "default") return "bg-muted";

    const variants = {
      glass: "glass-surface",
      glassSubtle: "glass-surface opacity-50",
      frosted: "glass-frosted",
      fluted: "glass-fluted",
      crystal: "glass-crystal",
    };
    return variants[variant] || variants.glass;
  };

  return (
    <TabsPrimitive.List
      ref={ref}
      data-slot="tabs-list"
      className={cn("inline-flex h-9 items-center justify-center rounded-lg p-1 text-muted-foreground", getVariantClass(), className)}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        // Inactive state - transparent, blends with background
        "text-muted-foreground",
        // Active state - lighter, more opaque background with shadow
        // Light mode: white/opaque background
        "data-[state=active]:bg-white/80 data-[state=active]:text-foreground",
        "data-[state=active]:shadow-[0_1px_3px_oklch(0%_0_0/0.1),inset_0_1px_1px_oklch(100%_0_0/0.5)]",
        // Dark mode: lighter background with better contrast
        "dark:data-[state=active]:bg-white/20 dark:data-[state=active]:text-foreground",
        "dark:data-[state=active]:shadow-[0_2px_6px_oklch(0%_0_0/0.4),inset_0_1px_2px_oklch(100%_0_0/0.15),inset_0_0_8px_oklch(100%_0_0/0.1)]",
        className,
      )}
      {...props}
    />
  ),
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Content
      ref={ref}
      data-slot="tabs-content"
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  ),
);
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
