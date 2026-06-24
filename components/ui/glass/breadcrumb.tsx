"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Breadcrumb as BaseBreadcrumb,
  BreadcrumbList as BaseBreadcrumbList,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../breadcrumb";

export interface BreadcrumbListProps extends React.ComponentProps<typeof BaseBreadcrumbList> {
  glow?: boolean;
}

/**
 * Sistine Breadcrumb - Enhanced breadcrumb with glassy effects
 */
export const BreadcrumbList = React.forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return <BaseBreadcrumbList ref={ref} variant={variant} className={cn(glow && "glass-glow", className)} {...props} />;
  },
);
BreadcrumbList.displayName = "BreadcrumbList";

export { BaseBreadcrumb as Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator };
