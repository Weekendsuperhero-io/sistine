"use client";

import {
  Breadcrumb as BaseBreadcrumb,
  BreadcrumbList as BaseBreadcrumbList,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@os-glass/components/ui/breadcrumb";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface BreadcrumbListProps extends React.ComponentProps<typeof BaseBreadcrumbList> {
  glow?: boolean;
}

/**
 * Glass UI Breadcrumb - Enhanced breadcrumb with glassy effects
 */
export const BreadcrumbList = React.forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return <BaseBreadcrumbList ref={ref} variant={variant} className={cn(glow && "shadow-md shadow-purple-500/20", className)} {...props} />;
  },
);
BreadcrumbList.displayName = "BreadcrumbList";

export { BaseBreadcrumb as Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis };
