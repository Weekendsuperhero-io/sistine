"use client"

import * as React from "react"
import { Card as BaseCard, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/registry/ui/card"
import { cn } from "@/lib/utils"
import type { GlassCustomization } from "@/lib/glass-utils"

export interface ChitraCardProps extends React.ComponentProps<typeof BaseCard> {
  gradient?: boolean
  animated?: boolean
  glass?: GlassCustomization
}

/**
 * Glass UI Card - A beautifully designed card component with glassy effects
 * Built on top of the base Card component with enhanced visual styling
 * 
 * @example
 * ```tsx
 * <ChitraCard 
 *   glass={{
 *     color: "rgba(139, 92, 246, 0.2)",
 *     blur: 30,
 *     transparency: 0.3,
 *     outline: "rgba(139, 92, 246, 0.5)"
 *   }}
 * >
 *   Content
 * </ChitraCard>
 * ```
 */
export const ChitraCard = React.forwardRef<HTMLDivElement, ChitraCardProps>(
  ({ className, variant = "glass", gradient = false, animated = false, glass, children, ...props }, ref) => {
    return (
      <BaseCard
        ref={ref}
        variant={variant}
        glass={glass}
        className={cn(
          "relative",
          gradient && "bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-pink-500/10",
          animated && "transition-all duration-300 hover:scale-[1.02] hover:shadow-[var(--glass-shadow-lg)]",
          className
        )}
        {...props}
      >
        {children}
      </BaseCard>
    )
  }
)
ChitraCard.displayName = "ChitraCard"

export {
  ChitraCard as Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
}

