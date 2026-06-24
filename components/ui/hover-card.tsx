"use client";

import { HoverCard as HoverCardPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content> & {
    variant?: "default" | "glass" | "frosted" | "fluted" | "crystal" | "opaque";
  }
>(({ className, align = "center", sideOffset = 4, variant = "glass", ...props }, ref) => {
  const getVariantClass = () => {
    if (variant === "default") return "bg-popover text-popover-foreground border";

    const variants = {
      glass: "glass-solid text-foreground",
      frosted: "glass-frosted text-foreground",
      fluted: "glass-fluted text-foreground",
      crystal: "glass-crystal text-foreground",
      opaque: "glass-opaque text-foreground",
    };
    return variants[variant] || variants.glass;
  };

  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        ref={ref}
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-64 rounded-xl p-4 shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          getVariantClass(),
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
});
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardContent, HoverCardTrigger };
