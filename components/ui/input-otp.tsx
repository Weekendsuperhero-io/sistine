"use client";

import { Dot } from "@phosphor-icons/react";
import { OTPInput, type RenderProps, type SlotProps } from "input-otp";
import * as React from "react";

import { type MaterialAxisProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Root role: bordered adaptive glass. */
const ROOT_ROLE = {
  border: true,
};

/* Slot role: borderless adaptive glass (the slot draws its own border-y/border-r chrome). */
const SLOT_ROLE = {};

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  Omit<React.ComponentPropsWithoutRef<typeof OTPInput>, "render" | "children"> &
    MaterialAxisProps & {
      variant?: "default" | "glass";
      render?: (props: RenderProps) => React.ReactNode;
    }
>(({ className, variant = "glass", render, ...props }, ref) => {
  const [axes, rest] = splitAxisProps(props);
  /* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
  const variants = {
    default: "",
    glass: "rounded-lg",
  };

  const m = materialSurface(variant === "default" ? null : ROOT_ROLE, axes);

  const defaultRender = ({ slots }: { slots: SlotProps[] }) => (
    <InputOTPGroup variant={variant}>
      {slots.map((slot, index) => (
        <InputOTPSlot key={index} {...slot} variant={variant} />
      ))}
    </InputOTPGroup>
  );

  return (
    <OTPInput
      ref={ref}
      data-slot="input-otp"
      data-material={m?.["data-material"]}
      containerClassName={cn(m?.className, "flex items-center gap-2 has-disabled:opacity-50", variants[variant], className)}
      className="disabled:cursor-not-allowed"
      render={render || defaultRender}
      {...rest}
    />
  );
});
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & {
    variant?: "default" | "glass";
    /** Resting glow (folded from the glass wrapper). */
    glow?: boolean;
  }
>(({ className, variant = "glass", glow, ...props }, ref) => {
  const variants = {
    default: "flex items-center gap-1",
    glass: "flex items-center gap-1",
  };

  return <div ref={ref} data-slot="input-otp-group" className={cn(variants[variant], glow && "glass-glow", className)} {...props} />;
});
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<
  React.ElementRef<"div">,
  SlotProps &
    React.ComponentPropsWithoutRef<"div"> &
    MaterialAxisProps & {
      variant?: "default" | "glass";
    }
>(({ variant = "glass", className, char, isActive, hasFakeCaret, placeholderChar = "○", ...props }, ref) => {
  const [axes, rest] = splitAxisProps(props);
  /* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
  const variants = {
    default:
      "relative flex h-12 w-12 items-center justify-center border-y border-r border-input text-foreground text-lg font-semibold transition-[color,border-color,box-shadow] first:rounded-l-md first:border-l last:rounded-r-md",
    glass:
      "relative flex h-12 w-12 items-center justify-center border-y border-r border-[var(--glass-border)] text-foreground text-lg font-semibold transition-[color,border-color,box-shadow] first:rounded-l-md first:border-l last:rounded-r-md",
  };

  const m = materialSurface(variant === "default" ? null : SLOT_ROLE, axes);

  return (
    <div
      ref={ref}
      data-slot="input-otp-slot"
      data-active={isActive}
      data-material={m?.["data-material"]}
      className={cn(
        m?.className,
        variants[variant],
        isActive && "z-10 ring-2 ring-ring ring-offset-background opacity-100",
        !char && !isActive && "opacity-70",
        className,
      )}
      {...rest}
    >
      <span className={cn("text-foreground font-semibold", !char && "text-muted-foreground")}>{char ?? placeholderChar}</span>
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-0.5 bg-foreground animate-pulse" />
        </div>
      )}
    </div>
  );
});
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(({ ...props }, ref) => (
  <div ref={ref} data-slot="input-otp-separator" role="separator" aria-orientation="vertical" {...props}>
    <Dot />
  </div>
));
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
