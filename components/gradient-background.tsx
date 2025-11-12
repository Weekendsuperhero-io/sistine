"use client"

import * as React from "react"
import { generateSeededGradient, generateBeautifulGradient, gradientToCSS } from "@/lib/gradient-utils"

interface GradientBackgroundProps {
  /**
   * Seed for consistent gradient per page (e.g., page pathname)
   * If not provided, generates a new random gradient on each render
   */
  seed?: string
  /**
   * Use beautiful complementary colors instead of random
   */
  beautiful?: boolean
  /**
   * Additional className
   */
  className?: string
  /**
   * Opacity of the gradient (0-1)
   */
  opacity?: number
  /**
   * Blur effect for the background
   */
  blur?: boolean
}

export function GradientBackground({
  seed,
  beautiful = true,
  className = "",
  opacity = 1,
  blur = true,
}: GradientBackgroundProps) {
  const [gradient, setGradient] = React.useState<string>("")

  React.useEffect(() => {
    const gradientObj = seed
      ? generateSeededGradient(seed)
      : beautiful
      ? generateBeautifulGradient()
      : generateSeededGradient(Math.random().toString())

    setGradient(gradientToCSS(gradientObj))
  }, [seed, beautiful])

  if (!gradient) return null

  return (
    <div
      className={`fixed inset-0 -z-10 pointer-events-none ${className}`}
      style={{
        background: gradient,
        opacity,
        filter: blur ? "blur(15px)" : "none",
      }}
    >
      {/* Additional organic shapes for liquid glass effect */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.1) 0%, transparent 50%)`,
          mixBlendMode: "overlay",
        }}
      />
    </div>
  )
}

