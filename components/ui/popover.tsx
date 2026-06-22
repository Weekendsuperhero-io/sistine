"use client";

import { Popover as PopoverPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    variant?: "default" | "glass" | "glassSubtle" | "frosted" | "fluted" | "crystal";
  }
>(({ className, align = "center", sideOffset = 4, variant = "glass", ...props }, ref) => {
  const getVariantClass = () => {
    if (variant === "default") return "bg-popover text-popover-foreground border";

    const variants = {
      glass: "glass-solid text-foreground",
      glassSubtle: "glass-solid text-foreground opacity-50",
      frosted: "glass-frosted text-foreground",
      fluted: "glass-fluted text-foreground",
      crystal: "glass-crystal text-foreground",
    };
    return variants[variant] || variants.glass;
  };

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-xl p-4 shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          getVariantClass(),
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

const PopoverHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div data-slot="popover-header" className={cn("flex flex-col gap-1 text-sm", className)} {...props} />
);
PopoverHeader.displayName = "PopoverHeader";

const PopoverTitle = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div data-slot="popover-title" className={cn("font-medium", className)} {...props} />
);
PopoverTitle.displayName = "PopoverTitle";

const PopoverDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p data-slot="popover-description" className={cn("text-muted-foreground", className)} {...props} />
);
PopoverDescription.displayName = "PopoverDescription";

export { Popover, PopoverAnchor, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
