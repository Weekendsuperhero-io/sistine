import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { type MaterialAxisProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";

/**
 * An empty state: a centred message where content will be, under shadcn's name and anatomy (Empty,
 * EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent). `empty-state` is the older,
 * Sistine-only take on the same thing; prefer this for new work.
 *
 * The root is plain layout by default, because an empty state usually sits INSIDE a surface that is
 * already glass (a card, a table, a panel); `variant="glass"` makes it a surface of its own.
 */

/* Role: borderless adaptive glass, only when asked for. */
const ROLE = {};
/* The icon tile: a small bordered chip. */
const MEDIA_ROLE = {
  border: true,
  size: "sm" as const,
};

function Empty({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> &
  MaterialAxisProps & {
    variant?: "default" | "glass";
  }) {
  const [axes, rest] = splitAxisProps(props);
  const m = materialSurface(variant === "glass" ? ROLE : null, axes);

  return (
    <div
      data-slot="empty"
      data-material={m?.["data-material"]}
      className={cn(
        m?.className,
        "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl p-12 text-center text-balance text-foreground",
        className,
      )}
      {...rest}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-header" className={cn("flex max-w-sm flex-col items-center gap-2", className)} {...props} />;
}

/* Variant classes carry BEHAVIOR only; the icon tile's surface comes from materialSurface. */
const emptyMediaVariants = cva("mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0", {
  variants: {
    variant: {
      default: "bg-transparent",
      icon: "size-10 rounded-lg text-foreground-ui [&_svg:not([class*='size-'])]:size-6",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants> & MaterialAxisProps) {
  const [axes, rest] = splitAxisProps(props);
  const m = materialSurface(variant === "icon" ? MEDIA_ROLE : null, axes);

  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      data-material={m?.["data-material"]}
      className={cn(
        m?.className,
        emptyMediaVariants({
          variant,
        }),
        className,
      )}
      {...rest}
    />
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-title" className={cn("text-lg font-medium tracking-tight text-foreground", className)} {...props} />;
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-description"
      className={cn("text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary", className)}
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn("flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance", className)}
      {...props}
    />
  );
}

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle };
