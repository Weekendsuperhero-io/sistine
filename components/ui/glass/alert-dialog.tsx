"use client";

import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialog as BaseAlertDialog,
  AlertDialogContent as BaseAlertDialogContent,
} from "@os-glass/components/ui/alert-dialog";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface AlertDialogContentProps extends React.ComponentProps<typeof BaseAlertDialogContent> {
  animated?: boolean;
}

/**
 * Glass UI Alert Dialog - Enhanced alert dialog with glassy effects
 */
export const AlertDialogContent = React.forwardRef<React.ElementRef<typeof BaseAlertDialogContent>, AlertDialogContentProps>(
  ({ className, variant = "glass", animated = true, ...props }, ref) => {
    return <BaseAlertDialogContent ref={ref} variant={variant} className={cn(animated && "backdrop-blur-[var(--blur-lg)]", className)} {...props} />;
  },
);
AlertDialogContent.displayName = "AlertDialogContent";

export {
  BaseAlertDialog as AlertDialog,
  AlertDialogTrigger,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
