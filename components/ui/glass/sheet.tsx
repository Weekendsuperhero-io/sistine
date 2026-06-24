"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Sheet as BaseSheet,
  SheetContent as BaseSheetContent,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "../sheet";

export interface SheetContentProps extends React.ComponentProps<typeof BaseSheetContent> {
  glow?: boolean;
}

/**
 * Sistine Sheet - Enhanced sheet with glassy effects
 */
export const SheetContent = React.forwardRef<React.ElementRef<typeof BaseSheetContent>, SheetContentProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return <BaseSheetContent ref={ref} variant={variant} className={cn(glow && "glass-glow", className)} {...props} />;
  },
);
SheetContent.displayName = "SheetContent";

export { BaseSheet as Sheet, SheetClose, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger };
