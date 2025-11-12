"use client"

import * as React from "react"
import {
  Pagination as BasePagination,
  PaginationContent as BasePaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/registry/ui/pagination"
import { cn } from "@/lib/utils"

export interface ChitraPaginationContentProps extends React.ComponentProps<typeof BasePaginationContent> {
  glow?: boolean
}

/**
 * Glass UI Pagination - Enhanced pagination with glassy effects
 */
export const ChitraPaginationContent = React.forwardRef<
  HTMLUListElement,
  ChitraPaginationContentProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BasePaginationContent
      ref={ref}
      variant={variant}
      className={cn(
        glow && "shadow-md shadow-purple-500/20",
        className
      )}
      {...props}
    />
  )
})
ChitraPaginationContent.displayName = "ChitraPaginationContent"

export {
  BasePagination as Pagination,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
}

