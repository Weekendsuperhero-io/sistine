"use client"

import * as React from "react"
import { RadioGroup as BaseRadioGroup, RadioGroupItem as BaseRadioGroupItem } from "@/registry/ui/radio-group"
import { cn } from "@/lib/utils"

export interface ChitraRadioGroupItemProps extends React.ComponentProps<typeof BaseRadioGroupItem> {
  glow?: boolean
}

/**
 * Glass UI Radio Group - Enhanced radio group with glassy effects
 */
export const ChitraRadioGroupItem = React.forwardRef<
  React.ElementRef<typeof BaseRadioGroupItem>,
  ChitraRadioGroupItemProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseRadioGroupItem
      ref={ref}
      variant={variant}
      className={cn(
        glow && "data-[state=checked]:shadow-lg data-[state=checked]:shadow-purple-500/30",
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  )
})
ChitraRadioGroupItem.displayName = "ChitraRadioGroupItem"

export {
  BaseRadioGroup as RadioGroup,
}

