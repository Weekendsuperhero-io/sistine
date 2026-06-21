"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import type * as React from "react";

import { type GlassCustomization, getGlassStyles } from "@/lib/glass-utils";
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

interface ButtonGroupProps extends React.ComponentProps<"div">, VariantProps<typeof buttonGroupVariants> {
  variant?: "default" | "glass" | "glassSubtle" | "frosted" | "fluted" | "crystal";
  glass?: GlassCustomization;
}

function ButtonGroup({ className, orientation = "horizontal", variant = "glass", glass, style, ...props }: ButtonGroupProps) {
  const getVariantClass = () => {
    if (variant === "default") return "";
    const variants = {
      glass: "glass-bg rounded-md",
      glassSubtle: "glass-bg rounded-md opacity-50",
      frosted: "glass-frosted rounded-md",
      fluted: "glass-fluted rounded-md",
      crystal: "glass-crystal rounded-md",
    };
    return variants[variant] || variants.glass;
  };

  const glassStyles = variant !== "default" && glass !== undefined ? getGlassStyles(glass) : {};

  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(
        buttonGroupVariants({
          orientation,
        }),
        getVariantClass(),
        className,
      )}
      style={{
        ...glassStyles,
        ...style,
      }}
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
        "flex items-center gap-2 rounded-md border border-[var(--glass-border)] glass-bg backdrop-blur-[var(--blur-sm)] px-4 text-sm font-medium text-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
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
