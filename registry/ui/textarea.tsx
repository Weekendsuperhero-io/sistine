import * as React from "react"

import { cn } from "@/lib/utils"
import { getGlassStyles, type GlassCustomization } from "@/lib/glass-utils"

function Textarea({ 
  className, 
  variant = "glass",
  glass,
  style,
  ...props 
}: React.ComponentProps<"textarea"> & {
  variant?: "default" | "glass" | "glassSubtle" | "frosted" | "fluted" | "crystal"
  glass?: GlassCustomization
}) {
  const hasCustomGlass = glass !== undefined
  
  const getVariantClass = () => {
    if (variant === "default") return "dark:bg-input/30 border-input bg-transparent shadow-xs"
    if (hasCustomGlass) return "glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] shadow-[var(--glass-shadow-sm)]"
    
    const variants = {
      glass: "glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] shadow-[var(--glass-shadow-sm)]",
      glassSubtle: "glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] shadow-[var(--glass-shadow-sm)] opacity-50",
      frosted: "glass-frosted backdrop-blur-[var(--blur-frosted)] border border-[var(--glass-frosted-border)] shadow-[var(--glass-frosted-shadow)]",
      fluted: "glass-fluted backdrop-blur-[var(--blur)] border border-[var(--glass-border)] shadow-[var(--glass-shadow-sm)]",
      crystal: "glass-crystal backdrop-blur-[var(--blur-crystal)] border border-[var(--glass-crystal-border)] shadow-[var(--glass-crystal-shadow)]",
    }
    return variants[variant] || variants.glass
  }
  
  const glassStyles = variant !== "default" ? getGlassStyles(glass) : {}
  
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        getVariantClass(),
        className
      )}
      style={{
        ...glassStyles,
        ...style,
      }}
      {...props}
    />
  )
}

export { Textarea }
