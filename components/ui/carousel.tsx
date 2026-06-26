"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { type GlassCustomization, getGlassStyles } from "@/lib/glass-utils";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const carouselVariants = cva("", {
  variants: {
    variant: {
      default: "bg-card text-card-foreground border shadow-sm",
      glass: "glass-bg text-foreground",
      frosted: "glass-frosted text-foreground",
      fluted: "glass-fluted text-foreground",
      crystal: "glass-crystal text-foreground",
      opaque: "glass-opaque text-foreground",
      surface: "glass-surface text-foreground",
      solid: "glass-solid text-foreground",
    },
  },
  defaultVariants: {
    variant: "glass",
  },
});

export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof carouselVariants> {
  glass?: GlassCustomization;
  autoPlay?: boolean;
  interval?: number;
}

const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  ({ className, variant = "glass", glass, autoPlay = false, interval = 3000, children, ...props }, ref) => {
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

    const hasCustomGlass = glass !== undefined;
    const effectiveVariant = hasCustomGlass && variant !== "default" ? "glass" : variant;

    const glassStyles = variant !== "default" ? getGlassStyles(glass) : {};

    if (totalItems === 0) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-lg",
          carouselVariants({
            variant: effectiveVariant,
          }),
          className,
        )}
        style={{
          ...glassStyles,
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
