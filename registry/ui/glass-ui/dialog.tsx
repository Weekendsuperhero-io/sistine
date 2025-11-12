"use client"

import * as React from "react"
import {
  Dialog as BaseDialog,
  DialogContent as BaseDialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/ui/dialog"
import { cn } from "@/lib/utils"
import type { GlassCustomization } from "@/lib/glass-utils"

export interface ChitraDialogContentProps extends Omit<React.ComponentProps<typeof BaseDialogContent>, "glass"> {
  animated?: boolean
  glass?: GlassCustomization
}

/**
 * Glass UI Dialog - Enhanced dialog with glassy effects and animations
 * 
 * @example
 * ```tsx
 * <ChitraDialogContent 
 *   glass={{
 *     color: "rgba(139, 92, 246, 0.15)",
 *     blur: 40,
 *     outline: "rgba(139, 92, 246, 0.3)"
 *   }}
 * >
 *   Dialog content
 * </ChitraDialogContent>
 * ```
 */
export const ChitraDialogContent = React.forwardRef<
  React.ElementRef<typeof BaseDialogContent>,
  ChitraDialogContentProps
>(({ className, variant = "glass", animated = true, glass, ...props }, ref) => {
  return (
    <BaseDialogContent
      ref={ref}
      variant={variant}
      glass={glass}
      className={cn(
        animated && "backdrop-blur-[var(--blur-lg)]",
        className
      )}
      {...props}
    />
  )
})
ChitraDialogContent.displayName = "ChitraDialogContent"

export {
  BaseDialog as Dialog,
  DialogTrigger,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

