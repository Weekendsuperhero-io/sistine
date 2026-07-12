"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import type * as React from "react";

import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { type MaterialAxisProps, materialSurface } from "@/lib/material";
import { cn } from "@/lib/utils";
import { Separator } from "./separator";

const buttonGroupVariants = cva(
  "flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2 [&>*]:focus-visible:relative [&>*]:focus-visible:z-10 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal: "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
        vertical: "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  },
);

interface ButtonGroupProps extends React.ComponentProps<"div">, VariantProps<typeof buttonGroupVariants>, MaterialAxisProps {
  variant?: "default" | "glass";
  /** Hover effect (folded from the glass wrapper). */
  effect?: HoverEffect;
}

/* Role: borderless adaptive glass. */
const ROLE = {};

function ButtonGroup({
  className,
  orientation = "horizontal",
  variant = "glass",
  material,
  border,
  veil,
  gradient,
  glow,
  sheen,
  diffuse,
  stained,
  effect,
  ...props
}: ButtonGroupProps) {
  /* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
  const getVariantClass = () => (variant === "default" ? "" : "rounded-md");

  const m = materialSurface(variant === "default" ? null : ROLE, {
    material,
    border,
    veil,
    gradient,
    glow,
    sheen,
    diffuse,
    stained,
  });

  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      data-material={m?.["data-material"]}
      className={cn(
        m?.className,
        buttonGroupVariants({
          orientation,
        }),
        getVariantClass(),
        effect &&
          hoverEffects({
            hover: effect,
          }),
        className,
      )}
      {...props}
    />
  );
}

function ButtonGroupText({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? SlotPrimitive.Slot : "div";

  return (
    <Comp
      className={cn(
        "flex items-center gap-2 rounded-md glass glass-border px-4 text-sm font-medium text-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function ButtonGroupSeparator({ className, orientation = "vertical", ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn("relative m-0! self-stretch bg-[var(--glass-border)] data-[orientation=vertical]:h-auto", className)}
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };
