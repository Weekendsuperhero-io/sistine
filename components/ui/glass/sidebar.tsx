"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar as BaseSidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarItem } from "../sidebar";

export interface SidebarProps extends React.ComponentProps<typeof BaseSidebar> {
  glow?: boolean;
}

/**
 * Sistine Sidebar - Enhanced sidebar with glassy effects
 */
export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return <BaseSidebar ref={ref} variant={variant} className={cn(glow && "shadow-lg shadow-purple-500/20", className)} {...props} />;
});
Sidebar.displayName = "Sidebar";

export { SidebarContent, SidebarFooter, SidebarHeader, SidebarItem };
