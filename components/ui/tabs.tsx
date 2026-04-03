"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: "default" | "glass" | "glassSubtle" | "frosted" | "fluted" | "crystal";
  }
>(({ className, variant = "glass", ...props }, ref) => {
  const getVariantClass = () => {
    if (variant === "default") return "bg-muted";

    const variants = {
      glass: "glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] shadow-[var(--glass-shadow-sm)]",
      glassSubtle: "glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] shadow-[var(--glass-shadow-sm)] opacity-50",
      frosted: "glass-frosted backdrop-blur-[var(--blur-frosted)] border border-[var(--glass-frosted-border)] shadow-[var(--glass-frosted-shadow)]",
      fluted: "glass-fluted backdrop-blur-[var(--blur)] border border-[var(--glass-border)] shadow-[var(--glass-shadow-sm)]",
      crystal: "glass-crystal backdrop-blur-[var(--blur-crystal)] border border-[var(--glass-crystal-border)] shadow-[var(--glass-crystal-shadow)]",
    };
    return variants[variant] || variants.glass;
  };

  return (
    <TabsPrimitive.List
      ref={ref}
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
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        // Inactive state - transparent, blends with background
        "text-muted-foreground",
        // Active state - lighter, more opaque background with shadow
        // Light mode: white/opaque background
        "data-[state=active]:bg-white/80 data-[state=active]:text-foreground",
        "data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.5)]",
        // Dark mode: lighter background with better contrast
        "dark:data-[state=active]:bg-white/20 dark:data-[state=active]:text-foreground",
        "dark:data-[state=active]:shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.15),inset_0_0_8px_rgba(255,255,255,0.1)]",
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
