"use client"

import * as React from "react"
import {
  ChartContainer as BaseChartContainer,
  ChartTooltip,
  ChartTooltipContent as BaseChartTooltipContent,
  ChartLegend,
  ChartLegendContent as BaseChartLegendContent,
} from "@/registry/ui/chart"
import { cn } from "@/lib/utils"
import type { ChartConfig } from "@/registry/ui/chart"

export interface ChitraChartContainerProps extends React.ComponentProps<typeof BaseChartContainer> {
  glow?: boolean
}

export interface ChitraChartTooltipContentProps extends React.ComponentProps<typeof BaseChartTooltipContent> {
  glow?: boolean
}

export interface ChitraChartLegendContentProps extends React.ComponentProps<typeof BaseChartLegendContent> {
  glow?: boolean
}

/**
 * Glass UI Chart - Enhanced chart components with glassy effects
 */
export const ChitraChartContainer = React.forwardRef<
  HTMLDivElement,
  ChitraChartContainerProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseChartContainer
      ref={ref}
      variant={variant}
      className={cn(
        glow && "shadow-lg shadow-purple-500/20",
        className
      )}
      {...props}
    />
  )
})
ChitraChartContainer.displayName = "ChitraChartContainer"

export const ChitraChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChitraChartTooltipContentProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseChartTooltipContent
      ref={ref}
      variant={variant}
      className={cn(
        glow && "shadow-lg shadow-purple-500/30",
        className
      )}
      {...props}
    />
  )
})
ChitraChartTooltipContent.displayName = "ChitraChartTooltipContent"

export const ChitraChartLegendContent = React.forwardRef<
  HTMLDivElement,
  ChitraChartLegendContentProps
>(({ className, variant = "glass", glow = false, ...props }, ref) => {
  return (
    <BaseChartLegendContent
      ref={ref}
      variant={variant}
      className={cn(
        glow && "shadow-md shadow-purple-500/20",
        className
      )}
      {...props}
    />
  )
})
ChitraChartLegendContent.displayName = "ChitraChartLegendContent"

export {
  ChartTooltip,
  ChartLegend,
}

export type { ChartConfig }

