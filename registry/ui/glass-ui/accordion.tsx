"use client"

import * as React from "react"
import {
  Accordion as BaseAccordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger as BaseAccordionTrigger,
} from "@/registry/ui/accordion"
import { cn } from "@/lib/utils"

export interface ChitraAccordionTriggerProps extends React.ComponentProps<typeof BaseAccordionTrigger> {
  glow?: boolean
}

/**
 * Glass UI Accordion - Enhanced accordion with glassy effects
 */
export const ChitraAccordionTrigger = React.forwardRef<
  React.ElementRef<typeof BaseAccordionTrigger>,
  ChitraAccordionTriggerProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseAccordionTrigger
      ref={ref}
      variant={variant}
      className={cn(
        glow && "data-[state=open]:shadow-md data-[state=open]:shadow-purple-500/20",
        className
      )}
      {...props}
    />
  )
})
ChitraAccordionTrigger.displayName = "ChitraAccordionTrigger"

export {
  BaseAccordion as Accordion,
  AccordionItem,
  AccordionContent,
}
