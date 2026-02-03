"use client";

import { Label as BaseLabel } from "@os-glass/components/ui/label";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface LabelProps extends React.ComponentProps<typeof BaseLabel> {
  required?: boolean;
}

/**
 * Glass UI Label - Enhanced label component with glassy styling
 */
export const Label = React.forwardRef<React.ElementRef<typeof BaseLabel>, LabelProps>(({ className, required, children, ...props }, ref) => {
  return (
    <BaseLabel ref={ref} className={cn("transition-colors duration-200", className)} {...props}>
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </BaseLabel>
  );
});
Label.displayName = "Label";
