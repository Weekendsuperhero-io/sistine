"use client";

import { Dot } from "@phosphor-icons/react";
import { OTPInput, OTPInputContext, type RenderProps, type SlotProps } from "input-otp";
import * as React from "react";

import { type MaterialAxisProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";

/* Root role: bordered adaptive glass. */
const ROOT_ROLE = {
  border: true,
};

/* Slot role: borderless adaptive glass (the slot draws its own border-y/border-r chrome). */
const SLOT_ROLE = {};

/* shadcn's API, so the documented composition works: give it children (InputOTPGroup / InputOTPSlot index={n}
   / InputOTPSeparator) and they render inside input-otp's context, or a `render` function, or neither for
   the built-in row of slots. `containerClassName` styles the container (merged with the material surface)
   and `className` the input itself, as in shadcn. Children used to be dropped from the props and a render
   function always passed, so the documented markup neither typechecked nor showed typed characters, and a
   containerClassName replaced the whole surface instead of adding to it. */
const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  Omit<React.ComponentPropsWithoutRef<typeof OTPInput>, "render" | "children" | "containerClassName"> &
    MaterialAxisProps & {
      variant?: "default" | "glass";
      render?: (props: RenderProps) => React.ReactNode;
      children?: React.ReactNode;
      containerClassName?: string;
    }
>(({ className, containerClassName, variant = "glass", render, children, ...props }, ref) => {
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

  const content =
    children !== undefined && !render
      ? {
          children,
        }
      : {
          render: render || defaultRender,
        };

  return (
    <OTPInput
      ref={ref}
      data-slot="input-otp"
      data-material={m?.["data-material"]}
      containerClassName={cn(m?.className, "flex items-center gap-2 has-disabled:opacity-50", variants[variant], containerClassName)}
      className={cn("disabled:cursor-not-allowed", className)}
      {...content}
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

/* A slot is addressed by `index` inside InputOTP's children (it reads its state from input-otp's context,
   as shadcn's does), or handed its SlotProps directly by the built-in render. */
const InputOTPSlot = React.forwardRef<
  React.ElementRef<"div">,
  Partial<SlotProps> &
    React.ComponentPropsWithoutRef<"div"> &
    MaterialAxisProps & {
      index?: number;
      variant?: "default" | "glass";
    }
>(
  (
    { variant = "glass", className, index, char: charProp, isActive: isActiveProp, hasFakeCaret: hasFakeCaretProp, placeholderChar = "○", ...props },
    ref,
  ) => {
    const context = React.useContext(OTPInputContext);
    const slot = index === undefined ? undefined : context?.slots[index];
    const char = slot ? slot.char : charProp;
    const isActive = slot ? slot.isActive : isActiveProp;
    const hasFakeCaret = slot ? slot.hasFakeCaret : hasFakeCaretProp;
    const [axes, rest] = splitAxisProps(props);
    /* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
    const variants = {
      default:
        "relative flex h-12 w-12 items-center justify-center border-y border-r border-input text-foreground text-lg font-semibold transition-[color,border-color,box-shadow] first:rounded-l-md first:border-l last:rounded-r-md aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
      glass:
        "relative flex h-12 w-12 items-center justify-center border-y border-r border-[var(--glass-border)] text-foreground text-lg font-semibold transition-[color,border-color,box-shadow] first:rounded-l-md first:border-l last:rounded-r-md aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
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
  },
);
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(({ ...props }, ref) => (
  <div ref={ref} data-slot="input-otp-separator" role="separator" aria-orientation="vertical" {...props}>
    <Dot />
  </div>
));
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
