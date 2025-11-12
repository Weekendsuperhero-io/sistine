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

export interface DialogContentProps extends Omit<React.ComponentProps<typeof BaseDialogContent>, "glass"> {
  animated?: boolean
  glass?: GlassCustomization
}

/**
 * Glass UI Dialog - Enhanced dialog with glassy effects and animations
 * 
 * @example
 * ```tsx
 * <DialogContent 
 *   glass={{
 *     color: "rgba(139, 92, 246, 0.15)",
 *     blur: 40,
 *     outline: "rgba(139, 92, 246, 0.3)"
 *   }}
 * >
 *   Dialog content
 * </DialogContent>
 * ```
 */
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof BaseDialogContent>,
  DialogContentProps
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
DialogContent.displayName = "DialogContent"

export {
  BaseDialog as Dialog,
  DialogTrigger,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

