"use client";

import {
  ContextMenu as BaseContextMenu,
  ContextMenuContent as BaseContextMenuContent,
  ContextMenuTrigger as BaseContextMenuTrigger,
  ContextMenuCheckboxItem,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@os-glass/components/ui/context-menu";
import * as React from "react";

/**
 * Glass UI Context Menu - A beautifully designed context menu with glassy effects
 * Built on top of the base ContextMenu component with enhanced visual styling
 */
export const ContextMenu = BaseContextMenu;
export const ContextMenuTrigger = BaseContextMenuTrigger;

export const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof BaseContextMenuContent>,
  React.ComponentProps<typeof BaseContextMenuContent> & {
    variant?: "default" | "glass" | "glassSubtle" | "frosted" | "fluted" | "crystal";
  }
>(({ className, variant = "glass", ...props }, ref) => {
  return <BaseContextMenuContent ref={ref} variant={variant} className={className} {...props} />;
});
ContextMenuContent.displayName = "ContextMenuContent";

export {
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};
