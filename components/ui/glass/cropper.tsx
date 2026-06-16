"use client";

import { cn } from "@/lib/utils";
import { Cropper as BaseCropper } from "../cropper";

export interface CropperProps {
  image: string;
  onCropComplete: (
    croppedArea: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
    croppedAreaPixels: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
  ) => void;
  aspect?: number;
  variant?: "default" | "glass";
  glow?: boolean;
  className?: string;
}

/**
 * Sistine Cropper - Enhanced image cropper with glassy effects
 */
export function Cropper({ className, variant = "glass", glow = false, ...props }: CropperProps) {
  return (
    <div className={cn(glow && "shadow-lg shadow-purple-500/20", className)}>
      <BaseCropper variant={variant} {...props} />
    </div>
  );
}
