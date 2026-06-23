"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu as BaseDropdownMenu,
  DropdownMenuContent as BaseDropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu";

export interface DropdownMenuContentProps extends React.ComponentProps<typeof BaseDropdownMenuContent> {
  glow?: boolean;
}

/**
 * Sistine Dropdown Menu - Enhanced dropdown menu with glassy effects
 */
export const DropdownMenuContent = React.forwardRef<React.ElementRef<typeof BaseDropdownMenuContent>, DropdownMenuContentProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return (
      <BaseDropdownMenuContent ref={ref} variant={variant} className={cn(glow && "shadow-lg shadow-(color:--glass-glow)", className)} {...props} />
    );
  },
);
DropdownMenuContent.displayName = "DropdownMenuContent";

export { BaseDropdownMenu as DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger };
