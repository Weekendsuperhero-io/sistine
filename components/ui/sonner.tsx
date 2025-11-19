"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Glass UI Toaster - Toast notifications with glassmorphism effects
 * 
 * Features:
 * - Glass background with backdrop blur
 * - Glass border and shadow effects
 * - Smooth animations and transitions
 * - Light/dark mode support
 * 
 * @example
 * ```tsx
 * import { Toaster } from "@/components/ui/sonner"
 * import { toast } from "sonner"
 * 
 * // Add to root layout
 * <Toaster />
 * 
 * // Use in components
 * toast.success('Success!', { description: 'Your action completed' })
 * ```
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:glass-bg group-[.toaster]:backdrop-blur-[var(--blur)] group-[.toaster]:border group-[.toaster]:border-[var(--glass-border)] group-[.toaster]:shadow-[var(--glass-shadow-lg)] group-[.toaster]:text-foreground",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:glass-bg group-[.toast]:backdrop-blur-[var(--blur-sm)] group-[.toast]:border group-[.toast]:border-[var(--glass-border)] group-[.toast]:text-foreground group-[.toast]:hover:opacity-90",
          cancelButton:
            "group-[.toast]:glass-bg group-[.toast]:backdrop-blur-[var(--blur-sm)] group-[.toast]:border group-[.toast]:border-[var(--glass-border)] group-[.toast]:text-muted-foreground group-[.toast]:hover:opacity-90",
          success: "group-[.toast]:border-green-500/30",
          error: "group-[.toast]:border-red-500/30",
          warning: "group-[.toast]:border-yellow-500/30",
          info: "group-[.toast]:border-blue-500/30",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

