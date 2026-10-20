"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import * as React from "react";
import { type MaterialAxisProps, type MaterialProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";
import { Button, type buttonVariants } from "./button";

/* Variant classes carry BEHAVIOR only; the surface comes from materialSurface.
   Centered WITHOUT a transform — see the matching note in dialog.tsx: `left-1/2 top-1/2 -translate-1/2`
   puts any odd-pixel-sized dialog on a half pixel and blurs every glyph on the composited glass
   surface, so this centers through layout (`inset-0 m-auto h-fit`) and the slide-* utilities that only
   existed to offset that translate are gone. Fade + zoom end at identity. */
const alertDialogContentVariants = cva(
  // A 1rem gutter each side on narrow screens (`min(100% − 2rem, …)`): at `w-full max-w-lg` it ran edge to
  // edge below 512px. Capped like dialog.tsx so over-tall content can't run off the bottom unreachable. This one scrolls
  // the whole surface rather than an inner wrapper — AlertDialogContent hands children straight to
  // Radix, so there is nothing to wrap. Its actions scroll with the content; acceptable, because an
  // alert dialog that tall is already a design smell.
  "group/alert-dialog-content @container/alert-dialog-content fixed inset-0 z-50 m-auto grid h-fit max-h-[calc(100dvh_-_2rem)] w-full max-w-[min(calc(100%-2rem),32rem)] gap-4 overflow-y-auto rounded-lg p-6 shadow-lg duration-200 data-[size=sm]:max-w-[min(calc(100%-2rem),20rem)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  {
    variants: {
      variant: {
        default: "bg-background border",
        glass: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "glass",
    },
  },
);

/* Role: bordered adaptive glass at the elevated blur tier. */
const ROLE: MaterialProps = {
  border: true,
  size: "lg",
};

const AlertDialog = ({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Root>) => (
  <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
);

const AlertDialogTrigger = ({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) => (
  <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
);

const AlertDialogPortal = ({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) => (
  <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
);

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    data-slot="alert-dialog-overlay"
    className={cn(
      "fixed inset-0 z-50 bg-transparent backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> &
    VariantProps<typeof alertDialogContentVariants> &
    MaterialAxisProps & {
      /** Elevated backdrop blur (folded from the glass wrapper). */
      animated?: boolean;
      size?: "default" | "sm";
    }
>(({ className, variant = "glass", animated = true, size = "default", ...props }, ref) => {
  const [axes, rest] = splitAxisProps(props);
  const m = materialSurface(variant === "default" ? null : ROLE, axes);

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        data-slot="alert-dialog-content"
        data-size={size}
        data-material={m?.["data-material"]}
        className={cn(
          m?.className,
          alertDialogContentVariants({
            variant,
          }),
          className,
        )}
        {...rest}
      />
    </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="alert-dialog-header"
    className={cn(
      "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-6 @sm/alert-dialog-content:place-items-start @sm/alert-dialog-content:text-left @sm/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
      className,
    )}
    {...props}
  />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="alert-dialog-footer"
    className={cn(
      "flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 @sm/alert-dialog-content:flex-row @sm/alert-dialog-content:justify-end",
      className,
    )}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    data-slot="alert-dialog-title"
    className={cn(
      "text-lg font-semibold @sm/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
      className,
    )}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    data-slot="alert-dialog-description"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const AlertDialogMedia = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="alert-dialog-media"
    className={cn(
      "mb-2 inline-flex size-16 items-center justify-center rounded-md bg-muted @sm/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-8",
      className,
    )}
    {...props}
  />
);
AlertDialogMedia.displayName = "AlertDialogMedia";

/* Action and Cancel ARE Buttons (asChild onto the Radix primitive), as upstream composes them. They used to
   put buttonVariants on the bare primitive, but in Sistine buttonVariants carries behaviour only: the
   SURFACE comes from materialSurface inside Button. So the default (glass) action rendered with no glass at
   all, a destructive one without its tint, and neither carried data-variant / data-size / data-material
   or accepted the material axes. */
type AlertDialogButtonProps<T extends typeof AlertDialogPrimitive.Action | typeof AlertDialogPrimitive.Cancel> = React.ComponentPropsWithoutRef<T> &
  Pick<VariantProps<typeof buttonVariants>, "variant" | "size"> &
  MaterialAxisProps;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  AlertDialogButtonProps<typeof AlertDialogPrimitive.Action>
>(({ className, variant = "glass", size = "default", ...props }, ref) => {
  const [axes, rest] = splitAxisProps(props);
  return (
    <Button variant={variant} size={size} {...axes} asChild>
      <AlertDialogPrimitive.Action ref={ref} data-slot="alert-dialog-action" className={className} {...rest} />
    </Button>
  );
});
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  AlertDialogButtonProps<typeof AlertDialogPrimitive.Cancel>
>(({ className, variant = "outline", size = "default", ...props }, ref) => {
  const [axes, rest] = splitAxisProps(props);
  return (
    <Button variant={variant} size={size} {...axes} asChild>
      <AlertDialogPrimitive.Cancel ref={ref} data-slot="alert-dialog-cancel" className={className} {...rest} />
    </Button>
  );
});
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
