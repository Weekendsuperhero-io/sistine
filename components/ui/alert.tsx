import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { type MaterialAxisProps, type MaterialProps, materialSurface } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Variant classes carry BEHAVIOR only (text, status chrome); the surface comes from materialSurface.
   Status variants ride a BORDERLESS glass surface (their colored border is their own chrome). */
const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        glass: "text-foreground",
        info: "border border-blue-500/60 text-blue-600 shadow-[var(--glass-shadow)] dark:text-blue-400 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
        success:
          "border border-green-500/60 text-green-600 shadow-[var(--glass-shadow)] dark:text-green-400 [&>svg]:text-green-600 dark:[&>svg]:text-green-400",
        warning:
          "border border-yellow-500/60 text-yellow-600 shadow-[var(--glass-shadow)] dark:text-yellow-400 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400",
        destructive: "border border-destructive/60 text-destructive shadow-[var(--glass-shadow)] [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "glass",
    },
  },
);

const STATUS_VARIANTS = [
  "info",
  "success",
  "warning",
  "destructive",
] as const;

/* Each semantic variant's surface role: statuses ride a BORDERLESS glass surface (their colored
   border is their own chrome); default renders no glass surface. */
const SURFACE_ROLE: Record<string, MaterialProps | null> = {
  default: null,
  glass: {},
  info: {},
  success: {},
  warning: {},
  destructive: {},
};

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof alertVariants> &
    MaterialAxisProps & {
      effect?: HoverEffect;
    }
>(({ className, variant, material, border, veil, gradient, glow, sheen, diffuse, effect, ...props }, ref) => {
  const isStatus = variant !== null && variant !== undefined && (STATUS_VARIANTS as readonly string[]).includes(variant);
  const m = materialSurface(SURFACE_ROLE[variant ?? "glass"] ?? null, {
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
      ref={ref}
      data-slot="alert"
      role="alert"
      data-material={m?.["data-material"]}
      data-glass-tint={isStatus ? variant : undefined}
      className={cn(
        m?.className,
        alertVariants({
          variant,
        }),
        effect && "relative overflow-hidden transition duration-200",
        effect &&
          hoverEffects({
            hover: effect,
          }),
        className,
      )}
      {...props}
    />
  );
});
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h5 ref={ref} data-slot="alert-title" className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="alert-description" className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription, AlertTitle };
