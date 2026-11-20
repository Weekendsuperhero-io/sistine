"use client";

import { Circle } from "@phosphor-icons/react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import * as React from "react";

import { type MaterialAxisProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid gap-2", className)} {...props} ref={ref} />;
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

/* Role: bordered adaptive glass. */
const ROLE = {
  border: true,
};

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> &
    MaterialAxisProps & {
      variant?: "default" | "glass";
    }
>(({ className, variant = "glass", ...props }, ref) => {
  const [axes, rest] = splitAxisProps(props);
  /* `glow` rides the CHECKED state on toggles — kept out of the materialSurface forward below. */
  const m = materialSurface(variant === "default" ? null : ROLE, {
    ...axes,
    glow: undefined,
  });

  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      data-slot="radio-group-item"
      data-material={m?.["data-material"]}
      className={cn(
        m?.className,
        "aspect-square h-4 w-4 shrink-0 rounded-full border shadow transition-[color,box-shadow] focus:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        m === null && "border-primary",
        /* CHECKED is a solid disc in the primary colour with a light dot, readable from across the room on
           any theme: a primary dot inside a glass ring of nearly the same colour (an amber page) was not. On
           glass the disc replaces the material's image layer (--srf-bg-image), since a background colour sits
           UNDER the glass's image layers. */
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:[--srf-bg-image:linear-gradient(var(--primary),var(--primary))]",
        axes.glow && "data-[state=checked]:glass-glow transition duration-200",
        className,
      )}
      {...rest}
    >
      <RadioGroupPrimitive.Indicator data-slot="radio-group-indicator" className="flex items-center justify-center">
        <Circle className="h-2 w-2 fill-primary-foreground text-primary-foreground" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
