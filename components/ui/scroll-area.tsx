"use client";

import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import * as React from "react";

import { type MaterialAxisProps, materialSurface } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Role: bordered adaptive glass. */
const ROLE = {
  border: true,
};

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> &
    MaterialAxisProps & {
      variant?: "default" | "glass";
    }
>(({ className, variant = "glass", material, border, veil, gradient, glow, sheen, diffuse, children, ...props }, ref) => {
  /* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
  const variants = {
    default: "relative overflow-hidden",
    glass: "relative overflow-hidden rounded-lg",
  };

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
    <ScrollAreaPrimitive.Root
      ref={ref}
      data-slot="scroll-area"
      data-material={m?.["data-material"]}
      className={cn(m?.className, variants[variant], className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="h-full w-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
});
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    data-slot="scroll-area-scrollbar"
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb data-slot="scroll-area-thumb" className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
