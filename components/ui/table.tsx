import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const tableVariants = cva("w-full caption-bottom text-sm", {
  variants: {
    variant: {
      default: "",
      glass: "glass-surface rounded-lg overflow-hidden",
      frosted: "glass-frosted rounded-lg overflow-hidden",
      fluted: "glass-fluted rounded-lg overflow-hidden",
      crystal: "glass-crystal rounded-lg overflow-hidden",
      opaque: "glass-opaque rounded-lg overflow-hidden",
    },
  },
  defaultVariants: {
    variant: "glass",
  },
});

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> &
    VariantProps<typeof tableVariants> & {
      /** When true, rows alternate in brightness and the per-row dividers are removed. */
      striped?: boolean;
    }
>(({ className, variant = "glass", striped = false, ...props }, ref) => {
  const stripedClass = striped ? "[&_tbody_tr]:border-0 [&_tbody_tr:nth-child(even)]:bg-foreground/[0.04]" : "";

  return (
    <div data-slot="table-container" className={variant !== "default" ? "rounded-lg overflow-hidden" : ""}>
      <table
        ref={ref}
        data-slot="table"
        data-striped={striped}
        className={cn(
          tableVariants({
            variant,
          }),
          stripedClass,
          className,
        )}
        {...props}
      />
    </div>
  );
});
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <thead ref={ref} data-slot="table-header" className={cn("[&_tr]:border-b bg-foreground/[0.08]", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tbody ref={ref} data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tfoot ref={ref} data-slot="table-footer" className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    data-slot="table-row"
    className={cn(
      "border-b border-[var(--glass-border)] transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    data-slot="table-head"
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    data-slot="table-cell"
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(({ className, ...props }, ref) => (
  <caption ref={ref} data-slot="table-caption" className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
