"use client"

import * as React from "react"
import CropperLib from "react-easy-crop"
import type { Area, Point } from "react-easy-crop"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/registry/ui/dialog"
import { Slider } from "@/registry/ui/slider"

interface CropperProps {
  image: string
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void
  aspect?: number
  variant?: "default" | "glass"
}

export function Cropper({
  image,
  onCropComplete,
  aspect = 1,
  variant = "glass",
}: CropperProps) {
  const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null)

  const handleCropComplete = React.useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  return (
    <div className={cn(
      "relative w-full h-[400px]",
      variant === "glass" && "glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] rounded-lg overflow-hidden shadow-[var(--glass-shadow)]"
    )}>
      <CropperLib
        image={image}
        crop={crop}
        zoom={zoom}
        aspect={aspect}
        onCropChange={setCrop}
        onZoomChange={setZoom}
        onCropComplete={handleCropComplete}
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4">
        <Slider
          value={[zoom]}
          min={1}
          max={3}
          step={0.1}
          onValueChange={(value) => setZoom(value[0])}
        />
      </div>
    </div>
  )
}

