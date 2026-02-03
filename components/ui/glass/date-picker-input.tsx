"use client";

import { DatePickerInput as BaseDatePickerInput } from "@os-glass/components/ui/date-picker-input";
import type { GlassCustomization } from "@os-glass/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@os-glass/lib/hover-effects";
import { cn } from "@os-glass/lib/utils";

export interface DatePickerInputProps extends React.ComponentProps<typeof BaseDatePickerInput> {
  effect?: HoverEffect;
  glass?: GlassCustomization;
}

/**
 * Glass UI Date Picker Input - A beautifully designed date picker with glassy effects
 * Built on top of the base DatePickerInput component with enhanced visual styling
 */
export function DatePickerInput({ className, variant = "glass", effect = "none", glass: _glass, ref, ...props }: DatePickerInputProps) {
  return <BaseDatePickerInput ref={ref} variant={variant} className={cn(hoverEffects({ hover: effect }), className)} {...props} />;
}
