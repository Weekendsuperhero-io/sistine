"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Drawer as BaseDrawer,
  DrawerContent as BaseDrawerContent,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "../drawer";

export interface DrawerContentProps extends React.ComponentProps<typeof BaseDrawerContent> {
  glow?: boolean;
}

/**
 * Sistine Drawer - Enhanced drawer with glassy effects
 */
export const DrawerContent = React.forwardRef<React.ElementRef<typeof BaseDrawerContent>, DrawerContentProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return <BaseDrawerContent ref={ref} variant={variant} className={cn(glow && "shadow-lg shadow-(color:--glass-glow)", className)} {...props} />;
  },
);
DrawerContent.displayName = "DrawerContent";

export { BaseDrawer as Drawer, DrawerClose, DrawerDescription, DrawerFooter, DrawerHeader, DrawerOverlay, DrawerPortal, DrawerTitle, DrawerTrigger };
