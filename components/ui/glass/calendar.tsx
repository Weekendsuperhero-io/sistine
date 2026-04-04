"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Calendar as BaseCalendar, type CalendarProps as BaseCalendarProps } from "../calendar";

export type CalendarProps = BaseCalendarProps & {
  glow?: boolean;
};

/**
 * Glass UI Calendar - Enhanced calendar with glassy effects
 */
export function Calendar({ className, variant = "glass", glow = false, ...props }: CalendarProps) {
  return (
    <div className={cn(glow && "shadow-lg shadow-purple-500/20", className)}>
      <BaseCalendar variant={variant} {...props} />
    </div>
  );
}
