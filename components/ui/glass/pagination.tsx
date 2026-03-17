"use client";

import {
  Pagination as BasePagination,
  PaginationContent as BasePaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@os-glass/components/ui/pagination";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface PaginationContentProps extends React.ComponentProps<typeof BasePaginationContent> {
  glow?: boolean;
}

/**
 * Glass UI Pagination - Enhanced pagination with glassy effects
 */
export const PaginationContent = React.forwardRef<HTMLUListElement, PaginationContentProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return <BasePaginationContent ref={ref} variant={variant} className={cn(glow && "shadow-md shadow-purple-500/20", className)} {...props} />;
  },
);
PaginationContent.displayName = "PaginationContent";

export { BasePagination as Pagination, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious };
