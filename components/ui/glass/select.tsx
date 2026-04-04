"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";
import {
  Select as BaseSelect,
  SelectContent as BaseSelectContent,
  SelectTrigger as BaseSelectTrigger,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SelectVariant = "default" | "glass" | "glassSubtle" | "frosted" | "fluted" | "crystal";

export interface SelectTriggerProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> {
  variant?: SelectVariant;
  glow?: boolean;
}

export interface SelectContentProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {
  variant?: SelectVariant;
  glow?: boolean;
}

/**
 * Glass UI Select - Enhanced select with glassy effects
 */
export const SelectTrigger = React.forwardRef<React.ElementRef<typeof BaseSelectTrigger>, SelectTriggerProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return (
      <BaseSelectTrigger
        ref={ref}
        className={cn(glow && "shadow-md shadow-purple-500/20", "transition-all duration-200", className)}
        {...({ variant, ...props } as React.ComponentProps<typeof BaseSelectTrigger>)}
      />
    );
  },
);
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<React.ElementRef<typeof BaseSelectContent>, SelectContentProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return (
      <BaseSelectContent
        ref={ref}
        className={cn(glow && "shadow-lg shadow-purple-500/30", className)}
        {...({ variant, ...props } as React.ComponentProps<typeof BaseSelectContent>)}
      />
    );
  },
);
SelectContent.displayName = "SelectContent";

export { BaseSelect as Select, SelectItem, SelectValue };
