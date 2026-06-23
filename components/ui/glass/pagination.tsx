"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Pagination as BasePagination,
  PaginationContent as BasePaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../pagination";

export interface PaginationContentProps extends React.ComponentProps<typeof BasePaginationContent> {
  glow?: boolean;
}

/**
 * Sistine Pagination - Enhanced pagination with glassy effects
 */
export const PaginationContent = React.forwardRef<HTMLUListElement, PaginationContentProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return (
      <BasePaginationContent ref={ref} variant={variant} className={cn(glow && "shadow-md shadow-(color:--glass-glow)", className)} {...props} />
    );
  },
);
PaginationContent.displayName = "PaginationContent";

export { BasePagination as Pagination, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious };
