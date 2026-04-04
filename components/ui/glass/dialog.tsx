"use client";

import * as React from "react";
import {
  Dialog as BaseDialog,
  DialogContent as BaseDialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../dialog";
import type { GlassCustomization } from "@/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { cn } from "@/lib/utils";

export interface DialogContentProps extends Omit<React.ComponentProps<typeof BaseDialogContent>, "glass"> {
  variant?: "default" | "glass" | "glassSubtle" | "frosted" | "fluted" | "crystal";
  animated?: boolean;
  hover?: HoverEffect;
  glass?: GlassCustomization;
}

/**
 * Glass UI Dialog - Enhanced dialog with glassy effects and animations
 *
 * @example
 * ```tsx
 * <DialogContent
 *   glass={{
 *     color: "oklch(60.5631% 0.218915 292.717225 / 0.15)",
 *     blur: 40,
 *     outline: "oklch(60.5631% 0.218915 292.717225 / 0.3)"
 *   }}
 * >
 *   Dialog content
 * </DialogContent>
 * ```
 */
export const DialogContent = React.forwardRef<React.ElementRef<typeof BaseDialogContent>, DialogContentProps>(
  ({ className, variant = "glass", animated = true, hover = "none", glass, children, ...props }, ref) => {
    return (
      <BaseDialogContent
        ref={ref}
        variant={variant}
        glass={glass}
        className={cn(
          "relative overflow-hidden",
          animated && "backdrop-blur-[var(--blur-lg)]",
          hoverEffects({
            hover,
          }),
          className,
        )}
        {...props}
      >
        {children}
      </BaseDialogContent>
    );
  },
);
DialogContent.displayName = "DialogContent";

export { BaseDialog as Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger };
