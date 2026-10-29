"use client";

import { CaretLeftIcon, CaretRightIcon, PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { type HoverEffect, hoverEffects } from "@/lib/hover-effects";
import { type MaterialAxisProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
const carouselVariants = cva("", {
  variants: {
    variant: {
      default: "bg-card text-card-foreground border shadow-sm",
      glass: "text-foreground",
    },
  },
  defaultVariants: {
    variant: "glass",
  },
});

/* Role: borderless adaptive glass. */
const ROLE = {};

export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof carouselVariants>, MaterialAxisProps {
  effect?: HoverEffect;
  autoPlay?: boolean;
  interval?: number;
}

/* The prefers-reduced-motion query, live. */
function useReducedMotion() {
  return React.useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/* The accessibility contract follows shadcn's carousel (an Embla component with a different API; this one
   stays a children-based slider): the root is a labelled `region` with aria-roledescription "carousel"
   and every slide a `group` "slide"; ←/→ move between slides while focus is inside; the previous / next
   buttons are named (they were icon-only, so a screen reader announced two unnamed buttons) and the
   current dot is marked. Off-screen slides are `inert`, so Tab cannot land inside a slide you cannot see.
   Autoplay (WCAG 2.2.2): it pauses while the pointer or focus is on the carousel, carries a visible
   pause / play button, and does not start at all under prefers-reduced-motion. */
const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  ({ className, variant = "glass", effect, autoPlay = false, interval = 3000, children, ...props }, ref) => {
    const [axes, rest] = splitAxisProps(props);
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [paused, setPaused] = React.useState(false);
    const [hovered, setHovered] = React.useState(false);
    const [focused, setFocused] = React.useState(false);
    const reducedMotion = useReducedMotion();
    const items = React.Children.toArray(children);
    const totalItems = items.length;
    const activeIndex = Math.min(currentIndex, Math.max(totalItems - 1, 0));
    const playing = autoPlay && !paused && !hovered && !focused && !reducedMotion && totalItems > 1;

    React.useEffect(() => {
      if (!playing) return;

      const timer = setInterval(() => {
        setCurrentIndex((prev) => (Math.min(prev, totalItems - 1) + 1) % totalItems);
      }, interval);

      return () => clearInterval(timer);
    }, [
      playing,
      interval,
      totalItems,
    ]);

    const goToSlide = (index: number) => {
      setCurrentIndex(index);
    };

    const goToPrevious = () => {
      setCurrentIndex((prev) => (Math.min(prev, totalItems - 1) - 1 + totalItems) % totalItems);
    };

    const goToNext = () => {
      setCurrentIndex((prev) => (Math.min(prev, totalItems - 1) + 1) % totalItems);
    };

    const onKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (
        event.defaultPrevented ||
        target.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [role="combobox"], [role="spinbutton"]')
      )
        return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNext();
      }
    };

    const m = materialSurface(variant === "default" ? null : ROLE, axes);

    if (totalItems === 0) return null;

    return (
      <div
        ref={ref}
        data-slot="carousel"
        role="region"
        aria-roledescription="carousel"
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
        onKeyDownCapture={onKeyDownCapture}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
        }}
        {...rest}
      >
        <div
          data-slot="carousel-content"
          aria-live={playing ? "off" : "polite"}
          className="flex transition-transform duration-500 ease-in-out motion-reduce:transition-none"
          style={{
            transform: `translateX(-${activeIndex * 100}%)`,
          }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              data-slot="carousel-item"
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${totalItems}`}
              inert={index !== activeIndex}
              className="min-w-full flex-shrink-0"
            >
              {item}
            </div>
          ))}
        </div>

        {totalItems > 1 && (
          <>
            <Button
              data-slot="carousel-previous"
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full glass"
              onClick={goToPrevious}
            >
              <CaretLeftIcon aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              data-slot="carousel-next"
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Next slide"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full glass"
              onClick={goToNext}
            >
              <CaretRightIcon aria-hidden="true" className="h-4 w-4" />
            </Button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {items.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={cn(
                    "h-2 w-2 rounded-full transition-[width,background-color]",
                    index === activeIndex ? "bg-primary w-6" : "bg-muted-foreground/50 hover:bg-muted-foreground",
                  )}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                />
              ))}
            </div>

            {autoPlay && !reducedMotion && (
              <Button
                data-slot="carousel-autoplay"
                type="button"
                variant="ghost"
                size="icon"
                aria-label={paused ? "Play slideshow" : "Pause slideshow"}
                aria-pressed={paused}
                className="absolute bottom-2 right-2 h-7 w-7 rounded-full glass"
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? <PlayIcon aria-hidden="true" className="h-3.5 w-3.5" /> : <PauseIcon aria-hidden="true" className="h-3.5 w-3.5" />}
              </Button>
            )}
          </>
        )}
      </div>
    );
  },
);
Carousel.displayName = "Carousel";

export { Carousel };
