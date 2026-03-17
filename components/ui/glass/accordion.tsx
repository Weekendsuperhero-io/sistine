"use client";

import {
  AccordionContent,
  AccordionItem,
  Accordion as BaseAccordion,
  AccordionTrigger as BaseAccordionTrigger,
} from "@os-glass/components/ui/accordion";
import { cn } from "@os-glass/lib/utils";
import * as React from "react";

export interface AccordionTriggerProps extends React.ComponentProps<typeof BaseAccordionTrigger> {
  glow?: boolean;
}

/**
 * Glass UI Accordion - Enhanced accordion with glassy effects
 */
export const AccordionTrigger = React.forwardRef<React.ElementRef<typeof BaseAccordionTrigger>, AccordionTriggerProps>(
  ({ className, variant = "glass", glow = false, ...props }, ref) => {
    return (
      <BaseAccordionTrigger
        ref={ref}
        variant={variant}
        className={cn(glow && "data-[state=open]:shadow-md data-[state=open]:shadow-purple-500/20", className)}
        {...props}
      />
    );
  },
);
AccordionTrigger.displayName = "AccordionTrigger";

export { AccordionContent, AccordionItem, BaseAccordion as Accordion };
