"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Popover as PopoverPrimitive } from "radix-ui";
import * as React from "react";

import { type MaterialAxisProps, materialSurface } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
const popoverContentVariants = cva(
  "z-50 w-72 rounded-xl p-4 shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  {
    variants: {
      variant: {
        default: "bg-popover text-popover-foreground border",
        glass: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "glass",
    },
  },
);

/* Role: bordered + veiled adaptive glass. */
const ROLE = {
  border: true,
  veil: true,
};

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & VariantProps<typeof popoverContentVariants> & MaterialAxisProps
>(
  (
    { className, align = "center", sideOffset = 4, variant = "glass", material, border, veil, gradient, glow, sheen, diffuse, stained, ...props },
    ref,
  ) => {
    const m = materialSurface(variant === "default" ? null : ROLE, {
      material,
      border,
      veil,
      gradient,
      glow,
      sheen,
      diffuse,
      stained,
    });

    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={ref}
          data-slot="popover-content"
          data-material={m?.["data-material"]}
          align={align}
          sideOffset={sideOffset}
          className={cn(
            m?.className,
            popoverContentVariants({
              variant,
            }),
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Portal>
    );
  },
);
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
