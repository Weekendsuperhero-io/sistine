"use client"

import * as React from "react"
import { OTPInput, OTPInputContext } from "@onefifteen-z/react-input-otp"
import { Dot } from "lucide-react"

import { cn } from "@/lib/utils"

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput> & {
    variant?: "default" | "glass"
  }
>(({ className, variant = "glass", ...props }, ref) => {
  const variants = {
    default: "",
    glass: "glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] shadow-[var(--glass-shadow-sm)]",
  }
  
  return (
    <OTPInput
      ref={ref}
      containerClassName={cn("flex items-center gap-2", variants[variant], className)}
      {...props}
    />
  )
})
InputOTP.displayName = "InputOTP"

const InputOTPGroup = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & {
    variant?: "default" | "glass"
  }
>(({ className, variant = "glass", ...props }, ref) => {
  const variants = {
    default: "flex items-center",
    glass: "flex items-center glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] rounded-md",
  }
  
  return (
    <div ref={ref} className={cn(variants[variant], className)} {...props} />
  )
})
InputOTPGroup.displayName = "InputOTPGroup"

const InputOTPSlot = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & {
    index: number
    variant?: "default" | "glass"
  }
>(({ index, variant = "glass", className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index] ?? {}

  const variants = {
    default: "relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
    glass: "relative flex h-10 w-10 items-center justify-center border-y border-r border-[var(--glass-border)] glass-bg opacity-50 backdrop-blur-[var(--blur-sm)] text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
  }

  return (
    <div
      ref={ref}
      className={cn(
        variants[variant],
        isActive && "z-10 ring-2 ring-ring ring-offset-background",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Dot className="h-4 w-4 animate-pulse" />
        </div>
      )}
    </div>
  )
})
InputOTPSlot.displayName = "InputOTPSlot"

const InputOTPSeparator = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ ...props }, ref) => (
  <div ref={ref} role="separator" aria-orientation="vertical" {...props}>
    <Dot />
  </div>
))
InputOTPSeparator.displayName = "InputOTPSeparator"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }

