"use client";

import {
  DropdownMenu as BaseDropdownMenu,
  DropdownMenuContent as BaseDropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@os-glass/components/ui/dropdown-menu";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface DropdownMenuContentProps extends React.ComponentProps<typeof BaseDropdownMenuContent> {
  glow?: boolean;
}

/**
 * Glass UI Dropdown Menu - Enhanced dropdown menu with glassy effects
 */
export const DropdownMenuContent = React.forwardRef<React.ElementRef<typeof BaseDropdownMenuContent>, DropdownMenuContentProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return <BaseDropdownMenuContent ref={ref} variant={variant} className={cn(glow && "shadow-lg shadow-purple-500/30", className)} {...props} />;
  },
);
DropdownMenuContent.displayName = "DropdownMenuContent";

export { BaseDropdownMenu as DropdownMenu, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator };
