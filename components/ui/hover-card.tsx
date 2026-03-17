"use client";

import { cn } from "@os-glass/lib/utils";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import * as React from "react";

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content> & {
    variant?: "default" | "glass" | "glassSubtle" | "frosted" | "fluted" | "crystal";
  }
>(({ className, align = "center", sideOffset = 4, variant = "glass", ...props }, ref) => {
  const getVariantClass = () => {
    if (variant === "default") return "bg-popover text-popover-foreground border";

    const variants = {
      glass: "glass-bg backdrop-blur-[var(--blur)] border border-[var(--glass-border)] text-foreground shadow-[var(--glass-shadow)]",
      glassSubtle:
        "glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] text-foreground shadow-[var(--glass-shadow)] opacity-50",
      frosted:
        "glass-frosted backdrop-blur-[var(--blur-frosted)] border border-[var(--glass-frosted-border)] text-foreground shadow-[var(--glass-frosted-shadow)]",
      fluted: "glass-fluted backdrop-blur-[var(--blur)] border border-[var(--glass-border)] text-foreground shadow-[var(--glass-shadow)]",
      crystal:
        "glass-crystal backdrop-blur-[var(--blur-crystal)] border border-[var(--glass-crystal-border)] text-foreground shadow-[var(--glass-crystal-shadow)]",
    };
    return variants[variant] || variants.glass;
  };

  return (
    <HoverCardPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-64 rounded-md p-4 shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        getVariantClass(),
        className,
      )}
      {...props}
    />
  );
});
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardContent, HoverCardTrigger };
