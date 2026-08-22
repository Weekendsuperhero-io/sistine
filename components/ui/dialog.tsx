"use client";

import { X } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";
import { type MaterialAxisProps, type MaterialProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
const dialogContentVariants = cva("", {
  variants: {
    variant: {
      default: "bg-background border",
      glass: "text-foreground",
    },
  },
  defaultVariants: {
    variant: "glass",
  },
});

/* Role: bordered adaptive glass at the elevated blur tier. */
const ROLE: MaterialProps = {
  border: true,
  size: "lg",
};

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-slot="dialog-overlay"
    className={cn(
      "fixed inset-0 z-50 bg-transparent backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> &
    VariantProps<typeof dialogContentVariants> &
    MaterialAxisProps & {
      /** Elevated backdrop blur (folded from the glass wrapper). */
      animated?: boolean;
      /** Styles the inner scrolling wrapper around `children`. `className` targets the OUTER surface,
       *  so without this a consumer has no way to change the body's layout — swap the grid for flex,
       *  drop the gap, or take the scrolling over entirely.
       *  Its `-m-6 p-6` is a matched pair that cancels the dialog's padding so the scroll container
       *  stops clipping child shadows; override one and you must override the other. */
      bodyClassName?: string;
      showCloseButton?: boolean;
    }
>(({ className, variant = "glass", children, animated = true, bodyClassName, showCloseButton = true, ...props }, ref) => {
  const [axes, rest] = splitAxisProps(props);
  const m = materialSurface(variant === "default" ? null : ROLE, axes);

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        data-slot="dialog-content"
        data-material={m?.["data-material"]}
        className={cn(
          m?.className,
          // Centered WITHOUT a transform. The usual `left-1/2 top-1/2 -translate-1/2` lands any
          // odd-pixel-sized dialog on a half pixel, and on a composited glass surface every glyph then
          // rasterizes off the pixel grid — visibly blurry text. `inset-0 m-auto h-fit` centers through
          // layout instead, which snaps to whole pixels. (This is why the inset-positioned sheet was
          // always crisp and dialogs were not.) The slide-* utilities are gone with it: they existed
          // only to offset that base translate, and here they would drag the dialog off-centre. Fade +
          // zoom both END AT IDENTITY, so nothing is left on a fractional transform once open.
          // NOTE the underscores in the max-h arbitrary value: Tailwind turns them into spaces, and
          // `calc(100dvh-2rem)` without them is invalid CSS (calc needs whitespace around - and +), so the
          // whole declaration is silently dropped and the cap does nothing.
          // max-h + an inner scroll area: without a cap, content taller than the viewport simply ran off
          // the bottom with no way to reach it. The DIALOG keeps overflow-hidden (it clips the rounded
          // corners and keeps the absolutely-positioned close button pinned); the scrolling happens in
          // the wrapper around {children} below, so the close button never scrolls out of reach.
          // grid-rows-[minmax(0,1fr)] is the other half of it: an IMPLICIT auto row sizes to its content
          // and happily overflows a max-height, so the wrapper never became scrollable and the dialog
          // just clipped. minmax(0,1fr) lets the row shrink, which is what hands the overflow to the
          // wrapper's overflow-y-auto.
          "@container/dialog-content fixed inset-0 z-50 m-auto grid h-fit max-h-[calc(100dvh_-_2rem)] grid-rows-[minmax(0,1fr)] w-full max-w-lg gap-4 overflow-hidden rounded-lg p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          dialogContentVariants({
            variant,
          }),
          className,
        )}
        {...rest}
      >
        {/* min-h-0 is load-bearing: a grid item defaults to min-height:auto, which refuses to shrink
            below its content, so without it this never scrolls and the dialog just clips again.
            -m-6 p-6 cancels the dialog's own p-6 so this box's edges land ON the dialog's padding box
            instead of its content box. That matters because `overflow-y: auto` is not one-axis: when
            either axis is non-visible the other computes visible -> auto, so this is a scroll
            container HORIZONTALLY too, and a scroll container clips at its padding box. Sitting at the
            content box it sheared every child's box-shadow flat 24px inside the dialog edge — a hard
            vertical cut down the side of the last footer button and a hard horizontal one under the
            footer row. Cancelling the padding moves that clip out to where the dialog's own
            overflow-hidden already clips, which does the same job and follows the rounded corners.
            The two utilities are a pair: overriding padding alone via bodyClassName re-offsets the
            body by the leftover negative margin. */}
        <div className={cn("-m-6 grid min-h-0 gap-4 overflow-y-auto p-6", bodyClassName)}>{children}</div>
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div data-slot="dialog-header" className={cn("flex flex-col space-y-1.5 text-center @sm/dialog-content:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  showCloseButton?: boolean;
}) => (
  <div
    data-slot="dialog-footer"
    className={cn("flex flex-col-reverse @sm/dialog-content:flex-row @sm/dialog-content:justify-end @sm/dialog-content:space-x-2", className)}
    {...props}
  >
    {children}
    {showCloseButton && (
      <DialogPrimitive.Close asChild>
        <Button variant="outline">Close</Button>
      </DialogPrimitive.Close>
    )}
  </div>
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title
      ref={ref}
      data-slot="dialog-title"
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} data-slot="dialog-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger };
