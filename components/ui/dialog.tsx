"use client";

import { X } from "@phosphor-icons/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";
import { type GlassCustomization, getGlassStyles } from "@/lib/glass-utils";
import { cn } from "@/lib/utils";
import { Button } from "./button";

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
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    variant?: "default" | "glass" | "glassSubtle" | "frosted" | "fluted" | "crystal";
    glass?: GlassCustomization;
    showCloseButton?: boolean;
  }
>(({ className, variant = "glass", children, glass, style, showCloseButton = true, ...props }, ref) => {
  const hasCustomGlass = glass !== undefined;

  const getVariantClass = () => {
    if (variant === "default") return "bg-background border";
    if (hasCustomGlass)
      return "glass-bg backdrop-blur-[var(--blur-lg)] border border-[var(--glass-border)] text-foreground shadow-[var(--glass-shadow-lg)]";

    const variants = {
      glass: "glass-bg backdrop-blur-[var(--blur-lg)] border border-[var(--glass-border)] text-foreground shadow-[var(--glass-shadow-lg)]",
      glassSubtle:
        "glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] text-foreground shadow-[var(--glass-shadow-lg)] opacity-50",
      frosted:
        "glass-frosted backdrop-blur-[var(--blur-frosted)] border border-[var(--glass-frosted-border)] text-foreground shadow-[var(--glass-frosted-shadow)]",
      fluted: "glass-fluted backdrop-blur-[var(--blur)] border border-[var(--glass-border)] text-foreground shadow-[var(--glass-shadow-lg)]",
      crystal:
        "glass-crystal backdrop-blur-[var(--blur-crystal)] border border-[var(--glass-crystal-border)] text-foreground shadow-[var(--glass-crystal-shadow)]",
    };
    return variants[variant] || variants.glass;
  };

  const glassStyles = variant !== "default" ? getGlassStyles(glass) : {};

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        data-slot="dialog-content"
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          getVariantClass(),
          className,
        )}
        style={{
          ...glassStyles,
          ...style,
        }}
        {...props}
      >
        {children}
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
  <div data-slot="dialog-header" className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
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
  <div data-slot="dialog-footer" className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props}>
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
