import type * as React from "react";
import { type GlassCustomization, getGlassStyles } from "@/lib/glass-utils";
import { cn } from "@/lib/utils";

function Textarea({
  className,
  variant = "glass",
  glass,
  style,
  ...props
}: React.ComponentProps<"textarea"> & {
  variant?: "default" | "glass" | "glassSubtle" | "frosted" | "fluted" | "crystal";
  glass?: GlassCustomization;
}) {
  const hasCustomGlass = glass !== undefined;

  const getVariantClass = () => {
    if (variant === "default") return "dark:bg-input/30 border-input bg-transparent shadow-xs";
    if (hasCustomGlass) return "glass-surface-sm";

    const variants = {
      glass: "glass-surface-sm",
      glassSubtle: "glass-surface-sm opacity-50",
      frosted: "glass-frosted",
      fluted: "glass-fluted",
      crystal: "glass-crystal",
    };
    return variants[variant] || variants.glass;
  };

  const glassStyles = variant !== "default" ? getGlassStyles(glass) : {};

  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        getVariantClass(),
        className,
      )}
      style={{
        ...glassStyles,
        ...style,
      }}
      {...props}
    />
  );
}

export { Textarea };
