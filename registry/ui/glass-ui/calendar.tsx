"use client"

import * as React from "react"
import { Calendar as BaseCalendar, type CalendarProps } from "@/registry/ui/calendar"
import { cn } from "@/lib/utils"

export type ChitraCalendarProps = CalendarProps & {
  glow?: boolean
}

/**
 * Glass UI Calendar - Enhanced calendar with glassy effects
 */
export function ChitraCalendar({ className, variant = "glass", glow = false, ...props }: ChitraCalendarProps) {
  return (
    <div
      className={cn(
        glow && "shadow-lg shadow-purple-500/20",
        className
      )}
    >
      <BaseCalendar
        variant={variant}
        {...props}
      />
    </div>
  )
}

