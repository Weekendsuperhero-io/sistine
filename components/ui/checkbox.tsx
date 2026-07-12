"use client";

import { Check } from "@phosphor-icons/react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import * as React from "react";

import { type MaterialAxisProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Role: bordered adaptive glass. */
const ROLE = {
  border: true,
};

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> &
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
    <CheckboxPrimitive.Root
      ref={ref}
      data-slot="checkbox"
      data-material={m?.["data-material"]}
      className={cn(
        m?.className,
        "peer h-4 w-4 shrink-0 rounded-sm border shadow transition-shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        m === null && "border-primary",
        m !== null && "data-[state=checked]:glass data-[state=checked]:border-[var(--glass-border)]",
        axes.glow && "data-[state=checked]:glass-glow transition duration-200",
        className,
      )}
      {...rest}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className={cn("flex items-center justify-center text-current")}>
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
