"use client";

import * as React from "react";
import type { Area, Point } from "react-easy-crop";
import CropperLib from "react-easy-crop";
import { type MaterialAxisProps, materialSurface } from "@/lib/material";
import { cn } from "@/lib/utils";
import { Slider } from "./slider";

interface CropperProps extends MaterialAxisProps {
  image: string;
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
  aspect?: number;
  variant?: "default" | "glass";
  className?: string;
}

/* Role: bordered adaptive glass. */
const ROLE = {
  border: true,
};

export function Cropper({
  image,
  onCropComplete,
  aspect = 1,
  variant = "glass",
  material,
  border,
  veil,
  gradient,
  glow,
  sheen,
  diffuse,
  stained,
  className,
}: CropperProps) {
  const [crop, setCrop] = React.useState<Point>({
    x: 0,
    y: 0,
  });
  const [zoom, setZoom] = React.useState(1);
  const [_croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null);

  const handleCropComplete = React.useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
      onCropComplete(croppedArea, croppedAreaPixels);
    },
    [
      onCropComplete,
    ],
  );

  /* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
  const m = materialSurface(variant === "default" ? null : ROLE, {
    material,
    border,
    veil,
    gradient,
    glow,
    sheen,
    diffuse,
    stained,
  });

  return (
    <div
      data-material={m?.["data-material"]}
      className={cn(m?.className, "relative w-full h-[400px]", variant === "glass" && "rounded-lg overflow-hidden", className)}
    >
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
          value={[
            zoom,
          ]}
          min={1}
          max={3}
          step={0.1}
          onValueChange={(value) => setZoom(value[0])}
        />
      </div>
    </div>
  );
}
