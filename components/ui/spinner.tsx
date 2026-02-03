import type { GlassCustomization } from "@os-glass/lib/glass-utils";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "glassSubtle" | "frosted" | "fluted" | "crystal";
  size?: "sm" | "md" | "lg";
  glass?: GlassCustomization;
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(({ className, variant = "glass", size = "md", glass, ...props }, ref) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-[3px]",
  };

  // Spinner should always be visible - use primary color for border
  // The variant is for styling context, but spinner itself should be clearly visible
  // Use solid primary color for top border (visible part), transparent for others
  const borderColor = "border-primary";

  return (
    <div
      ref={ref}
      className={cn("inline-block rounded-full border-t-transparent border-r-transparent animate-spin", sizeClasses[size], borderColor, className)}
      {...props}
    />
  );
});
Spinner.displayName = "Spinner";

export { Spinner };
