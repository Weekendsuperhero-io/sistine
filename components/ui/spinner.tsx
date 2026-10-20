import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(({ className, size = "md", ...props }, ref) => {
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
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block rounded-full animate-spin",
        sizeClasses[size],
        borderColor,
        "border-t-transparent border-r-transparent",
        /* Icon-sized inside a control, as shadcn's svg spinner is by the controls' [&_svg] rules: a bare
           <Spinner /> in a Button was the standalone 32px ring. */
        "in-data-[slot=button]:size-4 in-data-[slot=input-group-addon]:size-4 in-data-[slot=item-media]:size-4",
        className,
      )}
      {...props}
    />
  );
});
Spinner.displayName = "Spinner";

export { Spinner };
