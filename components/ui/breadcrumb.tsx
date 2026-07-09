import { ArrowsHorizontalIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Slot as SlotPrimitive } from "radix-ui";
import * as React from "react";

import { type Material, resolveMaterial } from "@/lib/material";
import { cn } from "@/lib/utils";

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"nav"> & {
    separator?: React.ComponentType<{
      className?: string;
    }>;
  }
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" data-slot="breadcrumb" {...props} />);
Breadcrumb.displayName = "Breadcrumb";

/* Role: bordered adaptive glass (the old glass-surface look). */
const ROLE = {
  border: true,
};

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<"ol"> & {
    variant?: "default" | "glass";
    material?: Material;
    border?: boolean;
    /** Resting glow (folded from the glass wrapper). */
    glow?: boolean;
  }
>(({ className, variant = "glass", material, border, glow, ...props }, ref) => {
  /* Variant classes carry BEHAVIOR only; the surface comes from resolveMaterial. */
  const variants = {
    default: "",
    glass: "rounded-lg px-4 py-2",
  };

  const m = resolveMaterial(ROLE, variant === "default" ? null : variant, {
    material,
    border,
  });

  return (
    <ol
      ref={ref}
      data-slot="breadcrumb-list"
      data-material={m?.["data-material"]}
      className={cn(
        m?.className,
        "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
        variants[variant],
        glow && "glass-glow",
        className,
      )}
      {...props}
    />
  );
});
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<"li">>(({ className, ...props }, ref) => (
  <li ref={ref} data-slot="breadcrumb-item" className={cn("inline-flex items-center gap-1.5", className)} {...props} />
));
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a"> & {
    asChild?: boolean;
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? SlotPrimitive.Slot : "a";
  return <Comp ref={ref} data-slot="breadcrumb-link" className={cn("transition-colors hover:text-foreground", className)} {...props} />;
});
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    data-slot="breadcrumb-page"
    role="link"
    aria-disabled="true"
    aria-current="page"
    tabIndex={0}
    className={cn("font-normal text-foreground", className)}
    {...props}
  />
));
BreadcrumbPage.displayName = "BreadcrumbPage";

const BreadcrumbSeparator = ({ children, className, ...props }: React.ComponentProps<"li">) => (
  <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className={cn("[&>svg]:size-3.5", className)} {...props}>
    {children ?? <CaretRightIcon />}
  </li>
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

const BreadcrumbEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    data-slot="breadcrumb-ellipsis"
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <ArrowsHorizontalIcon className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
);
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

export { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator };
