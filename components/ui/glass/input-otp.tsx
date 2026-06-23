"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { InputOTP as BaseInputOTP, InputOTPGroup as BaseInputOTPGroup, InputOTPSlot as BaseInputOTPSlot, InputOTPSeparator } from "../input-otp";

export interface InputOTPProps extends React.ComponentProps<typeof BaseInputOTP> {
  glow?: boolean;
}

export interface InputOTPGroupProps extends React.ComponentProps<typeof BaseInputOTPGroup> {
  glow?: boolean;
}

export interface InputOTPSlotProps extends React.ComponentProps<typeof BaseInputOTPSlot> {
  glow?: boolean;
}

/**
 * Sistine Input OTP - Enhanced OTP input with glassy effects
 */
export const InputOTP = React.forwardRef<React.ElementRef<typeof BaseInputOTP>, InputOTPProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return <BaseInputOTP ref={ref} variant={variant} className={cn(glow && "shadow-md shadow-(color:--glass-glow)", className)} {...props} />;
  },
);
InputOTP.displayName = "InputOTP";

export const InputOTPGroup = React.forwardRef<HTMLDivElement, InputOTPGroupProps>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return <BaseInputOTPGroup ref={ref} variant={variant} className={cn(glow && "shadow-md shadow-(color:--glass-glow)", className)} {...props} />;
});
InputOTPGroup.displayName = "InputOTPGroup";

export const InputOTPSlot = React.forwardRef<HTMLDivElement, InputOTPSlotProps>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return <BaseInputOTPSlot ref={ref} variant={variant} className={cn(glow && "ring-1 ring-(color:--glass-glow)", className)} {...props} />;
});
InputOTPSlot.displayName = "InputOTPSlot";

export { InputOTPSeparator };
