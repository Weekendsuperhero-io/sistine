"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { RadioGroup as BaseRadioGroup, RadioGroupItem as BaseRadioGroupItem } from "../radio-group";

export interface RadioGroupItemProps extends React.ComponentProps<typeof BaseRadioGroupItem> {
  glow?: boolean;
}

/**
 * Sistine Radio Group - Enhanced radio group with glassy effects
 */
export const RadioGroupItem = React.forwardRef<React.ElementRef<typeof BaseRadioGroupItem>, RadioGroupItemProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return (
      <BaseRadioGroupItem
        ref={ref}
        variant={variant}
        className={cn(
          glow && "data-[state=checked]:shadow-lg data-[state=checked]:shadow-(color:--glass-glow)",
          "transition-all duration-200",
          className,
        )}
        {...props}
      />
    );
  },
);
RadioGroupItem.displayName = "RadioGroupItem";

export { BaseRadioGroup as RadioGroup };
