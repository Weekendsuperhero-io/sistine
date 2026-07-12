import { ArrowsHorizontalIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import * as React from "react";
import { type MaterialAxisProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";
import { type Button, buttonVariants } from "./button";

/* Role: bordered adaptive glass. */
const ROLE = {
  border: true,
};

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav aria-label="pagination" data-slot="pagination" className={cn("mx-auto flex w-full justify-center", className)} {...props} />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul"> &
    MaterialAxisProps & {
      variant?: "default" | "glass";
    }
>(({ className, variant = "glass", ...props }, ref) => {
  const [axes, rest] = splitAxisProps(props);
  /* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
  const variants = {
    default: "",
    glass: "rounded-lg px-2 py-1",
  };

  const m = materialSurface(variant === "default" ? null : ROLE, axes);

  return (
    <ul
      ref={ref}
      data-slot="pagination-content"
      data-material={m?.["data-material"]}
      className={cn(m?.className, "flex flex-row items-center gap-1", variants[variant], className)}
      {...rest}
    />
  );
});
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ className, ...props }, ref) => (
  <li ref={ref} data-slot="pagination-item" className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a"> &
  MaterialAxisProps & {
    variant?: "default" | "glass";
  };

const PaginationLink = ({ className, isActive, size = "icon", variant = "glass", ...props }: PaginationLinkProps) => {
  const [axes, rest] = splitAxisProps(props);
  // The glass surface rides the ACTIVE page only; inactive links keep the plain outline/ghost button look.
  const m = variant === "glass" && isActive ? materialSurface(ROLE, axes) : null;

  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      data-material={m?.["data-material"]}
      className={cn(
        m?.className,
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size,
        }),
        variant === "default" && isActive && "bg-background text-foreground",
        className,
      )}
      {...rest}
    />
  );
};
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to previous page" size="default" className={cn("gap-1 px-2.5 sm:pl-2.5", className)} {...props}>
    <CaretLeftIcon className="h-4 w-4" />
    <span className="hidden sm:block">Previous</span>
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to next page" size="default" className={cn("gap-1 px-2.5 sm:pr-2.5", className)} {...props}>
    <span className="hidden sm:block">Next</span>
    <CaretRightIcon className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span aria-hidden data-slot="pagination-ellipsis" className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>
    <ArrowsHorizontalIcon className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious };
