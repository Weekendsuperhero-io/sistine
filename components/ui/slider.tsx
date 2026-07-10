"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import * as React from "react";

import { type Material, materialSurface } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Role: bordered adaptive glass. */
const ROLE = {
  border: true,
};

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    variant?: "default" | "glass";
    material?: Material;
    border?: boolean;
    /** Glow on the thumb (folded from the glass wrapper). */
    glow?: boolean;
  }
>(({ className, variant = "glass", material, border, glow, defaultValue, value, min = 0, max = 100, ...props }, ref) => {
  // The THUMB is the glass surface element: a small glass knob, or a plain neutral dot when m === null.
  const m = materialSurface(variant === "default" ? null : ROLE, {
    material,
    border,
  });

  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [
              min,
              max,
            ],
    [
      value,
      defaultValue,
      min,
      max,
    ],
  );

  return (
    <SliderPrimitive.Root
      ref={ref}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-foreground/15 data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-[var(--glass-accent)] data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from(
        {
          length: _values.length,
        },
        (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            data-material={m?.["data-material"]}
            className={cn(
              m?.className,
              "block size-4 shrink-0 rounded-full shadow-[var(--glass-shadow-sm)] transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
              m === null && "border border-foreground/30 bg-foreground",
              glow && "glass-glow",
            )}
          />
        ),
      )}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
