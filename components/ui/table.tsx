import * as React from "react";

import { cn } from "@/lib/utils";

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & {
    variant?: "default" | "glass" | "glassSubtle" | "frosted" | "fluted" | "crystal";
  }
>(({ className, variant = "glass", ...props }, ref) => {
  const getVariantClass = () => {
    if (variant === "default") return "w-full caption-bottom text-sm";

    const variants = {
      glass:
        "w-full caption-bottom text-sm glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] rounded-lg overflow-hidden shadow-[var(--glass-shadow-sm)]",
      glassSubtle:
        "w-full caption-bottom text-sm glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] rounded-lg overflow-hidden shadow-[var(--glass-shadow-sm)] opacity-50",
      frosted:
        "w-full caption-bottom text-sm glass-frosted backdrop-blur-[var(--blur-frosted)] border border-[var(--glass-frosted-border)] rounded-lg overflow-hidden shadow-[var(--glass-frosted-shadow)]",
      fluted:
        "w-full caption-bottom text-sm glass-fluted backdrop-blur-[var(--blur)] border border-[var(--glass-border)] rounded-lg overflow-hidden shadow-[var(--glass-shadow-sm)]",
      crystal:
        "w-full caption-bottom text-sm glass-crystal backdrop-blur-[var(--blur-crystal)] border border-[var(--glass-crystal-border)] rounded-lg overflow-hidden shadow-[var(--glass-crystal-shadow)]",
    };
    return variants[variant] || variants.glass;
  };

  return (
    <div data-slot="table-container" className={variant !== "default" ? "rounded-lg overflow-hidden" : ""}>
      <table ref={ref} data-slot="table" className={cn(getVariantClass(), className)} {...props} />
    </div>
  );
});
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <thead ref={ref} data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />
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
    className={cn("border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted", className)}
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
