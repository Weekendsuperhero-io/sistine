"use client"

import * as React from "react"
import { Cropper as BaseCropper } from "@/registry/ui/cropper"
import { cn } from "@/lib/utils"

export interface ChitraCropperProps {
  image: string
  onCropComplete: (croppedArea: { x: number; y: number; width: number; height: number }, croppedAreaPixels: { x: number; y: number; width: number; height: number }) => void
  aspect?: number
  variant?: "default" | "glass"
  glow?: boolean
  className?: string
}

/**
 * Glass UI Cropper - Enhanced image cropper with glassy effects
 */
export function ChitraCropper({ className, variant = "glass", glow = false, ...props }: ChitraCropperProps) {
  return (
    <div
      className={cn(
        glow && "shadow-lg shadow-purple-500/20",
        className
      )}
    >
      <BaseCropper
        variant={variant}
        {...props}
      />
    </div>
  )
}

