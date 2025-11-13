import * as React from "react"

import { cn } from "@/lib/utils"
import { getGlassStyles, type GlassCustomization } from "@/lib/glass-utils"

function Input({ 
  className, 
  type, 
  variant = "glass",
  glass,
  style,
  ...props 
}: React.ComponentProps<"input"> & {
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
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        getVariantClass(),
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
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

export { Input }
