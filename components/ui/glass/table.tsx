"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Table as BaseTable, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "../table";

export interface TableProps extends React.ComponentProps<typeof BaseTable> {
  glow?: boolean;
}

/**
 * Sistine Table - Enhanced table with glassy effects
 */
export const Table = React.forwardRef<HTMLTableElement, TableProps>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return <BaseTable ref={ref} variant={variant} className={cn(glow && "shadow-lg shadow-purple-500/20", className)} {...props} />;
});
Table.displayName = "Table";

export { TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
