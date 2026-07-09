"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { type GlassCustomization, getGlassStyles } from "@/lib/glass-utils";
import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { type Material, resolveMaterial } from "@/lib/material";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/* Variant classes carry BEHAVIOR only; the surface comes from resolveMaterial. */
const carouselVariants = cva("", {
  variants: {
    variant: {
      default: "bg-card text-card-foreground border shadow-sm",
      glass: "text-foreground",
      frosted: "text-foreground",
      crystal: "text-foreground",
      opaque: "text-foreground",
      surface: "text-foreground",
      solid: "text-foreground",
    },
  },
  defaultVariants: {
    variant: "glass",
  },
});

/* Role: borderless adaptive glass (the old glass-bg look). */
const ROLE = {};

export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof carouselVariants> {
  glass?: GlassCustomization;
  material?: Material;
  border?: boolean;
  veil?: boolean;
  gradient?: boolean;
  glow?: boolean | "lg";
  sheen?: boolean;
  effect?: HoverEffect;
  autoPlay?: boolean;
  interval?: number;
}

const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  (
    {
      className,
      variant = "glass",
      glass,
      material,
      border,
      veil,
      gradient,
      glow,
      sheen,
      effect,
      autoPlay = false,
      interval = 3000,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const items = React.Children.toArray(children);
    const totalItems = items.length;

    React.useEffect(() => {
      if (!autoPlay || totalItems <= 1) return;

      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % totalItems);
      }, interval);

      return () => clearInterval(timer);
    }, [
      autoPlay,
      interval,
      totalItems,
    ]);

    const goToSlide = (index: number) => {
      setCurrentIndex(index);
    };

    const goToPrevious = () => {
      setCurrentIndex((prev) => (prev - 1 + totalItems) % totalItems);
    };

    const goToNext = () => {
      setCurrentIndex((prev) => (prev + 1) % totalItems);
    };

    const m = resolveMaterial(ROLE, variant === "default" ? null : variant, {
      material,
      border,
      veil,
      gradient,
      glow,
      sheen,
    });

    const hasCustomGlass = glass !== undefined;
    const glassStyles = m !== null && hasCustomGlass ? getGlassStyles(glass) : {};

    if (totalItems === 0) return null;

    return (
      <div
        ref={ref}
        data-material={m?.["data-material"]}
        className={cn(
          m?.className,
          "relative w-full overflow-hidden rounded-lg",
          carouselVariants({
            variant,
          }),
          effect &&
            hoverEffects({
              hover: effect,
            }),
          className,
        )}
        style={{
          ...glassStyles,
          ...style,
        }}
        {...props}
      >
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {items.map((item, index) => (
            <div key={index} className="min-w-full flex-shrink-0">
              {item}
            </div>
          ))}
        </div>

        {totalItems > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full glass-bg"
              onClick={goToPrevious}
            >
              <CaretLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full glass-bg"
              onClick={goToNext}
            >
              <CaretRightIcon className="h-4 w-4" />
            </Button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {items.map((_, index) => (
                <button
                  key={index}
                  className={cn(
                    "h-2 w-2 rounded-full transition-[width,background-color]",
                    index === currentIndex ? "bg-primary w-6" : "bg-muted-foreground/50 hover:bg-muted-foreground",
                  )}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  },
);
Carousel.displayName = "Carousel";

export { Carousel };
