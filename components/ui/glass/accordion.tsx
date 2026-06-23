"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AccordionContent, AccordionItem, Accordion as BaseAccordion, AccordionTrigger as BaseAccordionTrigger } from "../accordion";

export interface AccordionTriggerProps extends React.ComponentProps<typeof BaseAccordionTrigger> {
  glow?: boolean;
}

/**
 * Sistine Accordion - Enhanced accordion with glassy effects
 */
export const AccordionTrigger = React.forwardRef<React.ElementRef<typeof BaseAccordionTrigger>, AccordionTriggerProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return (
      <BaseAccordionTrigger
        ref={ref}
        variant={variant}
        className={cn(glow && "data-[state=open]:shadow-md data-[state=open]:shadow-(color:--glass-glow)", className)}
        {...props}
      />
    );
  },
);
AccordionTrigger.displayName = "AccordionTrigger";

export { AccordionContent, AccordionItem, BaseAccordion as Accordion };
