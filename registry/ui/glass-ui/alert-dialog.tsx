"use client"

import * as React from "react"
import {
  AlertDialog as BaseAlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent as BaseAlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/registry/ui/alert-dialog"
import { cn } from "@/lib/utils"

export interface ChitraAlertDialogContentProps extends React.ComponentProps<typeof BaseAlertDialogContent> {
  animated?: boolean
}

/**
 * Glass UI Alert Dialog - Enhanced alert dialog with glassy effects
 */
export const ChitraAlertDialogContent = React.forwardRef<
  React.ElementRef<typeof BaseAlertDialogContent>,
  ChitraAlertDialogContentProps
>(({ className, variant = "glass", animated = true, ...props }, ref) => {
  return (
    <BaseAlertDialogContent
      ref={ref}
      variant={variant}
      className={cn(
        animated && "backdrop-blur-[var(--blur-lg)]",
        className
      )}
      {...props}
    />
  )
})
ChitraAlertDialogContent.displayName = "ChitraAlertDialogContent"

export {
  BaseAlertDialog as AlertDialog,
  AlertDialogTrigger,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}

