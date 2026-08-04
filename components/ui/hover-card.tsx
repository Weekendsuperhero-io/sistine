"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { HoverCard as HoverCardPrimitive } from "radix-ui";
import * as React from "react";

import { type MaterialAxisProps, materialSurface, splitAxisProps } from "@/lib/material";
import { composeRefs, useSnappedPopper } from "@/lib/snap-popper";
import { cn } from "@/lib/utils";

/* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
const hoverCardContentVariants = cva(
  "z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-xl p-4 shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
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

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content> & VariantProps<typeof hoverCardContentVariants> & MaterialAxisProps
>(({ className, align = "center", sideOffset = 4, variant = "glass", ...props }, ref) => {
  const [axes, rest] = splitAxisProps(props);
  const snapRef = useSnappedPopper();
  const m = materialSurface(variant === "default" ? null : ROLE, axes);

  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        ref={composeRefs(ref, snapRef)}
        data-slot="hover-card-content"
        data-material={m?.["data-material"]}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          m?.className,
          hoverCardContentVariants({
            variant,
          }),
          className,
        )}
        {...rest}
      />
    </HoverCardPrimitive.Portal>
  );
});
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardContent, HoverCardTrigger };
