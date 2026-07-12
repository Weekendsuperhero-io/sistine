"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import * as React from "react";

import { type MaterialAxisProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Role: bordered + veiled adaptive glass. */
const ROLE = {
  border: true,
  veil: true,
};

const TooltipProvider = ({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />
);

const Tooltip = ({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) => <TooltipPrimitive.Root data-slot="tooltip" {...props} />;

const TooltipTrigger = ({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) => (
  <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
);

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> &
    MaterialAxisProps & {
      variant?: "default" | "glass";
    }
>(({ className, variant = "glass", sideOffset = 4, children, ...props }, ref) => {
  const [axes, rest] = splitAxisProps(props);
  /* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
  const variants = {
    default: "bg-primary text-primary-foreground",
    glass: "text-foreground",
  };

  const m = materialSurface(variant === "default" ? null : ROLE, axes);

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        data-slot="tooltip-content"
        data-material={m?.["data-material"]}
        sideOffset={sideOffset}
        className={cn(
          m?.className,
          "z-50 overflow-hidden rounded-md px-3 py-1.5 text-sm shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          variants[variant],
          className,
        )}
        {...rest}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] glass border-[var(--glass-border)]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
