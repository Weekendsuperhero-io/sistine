"use client";

import { BuildingsIcon, PaletteIcon, PauseIcon, PlayIcon, ShuffleIcon, SparkleIcon } from "@phosphor-icons/react";
import { type BackgroundType, RAMP_AXES, useBackground } from "@/components/background-provider";
import { cn } from "@/lib/utils";

const options: {
  value: BackgroundType;
  label: string;
  Icon: typeof BuildingsIcon;
}[] = [
  {
    value: "grid",
    label: "City",
    Icon: BuildingsIcon,
  },
  {
    value: "gradient",
    label: "Gradient",
    Icon: PaletteIcon,
  },
  {
    value: "canvas",
    label: "Canvas",
    Icon: SparkleIcon,
  },
];

/**
 * Compact segmented control to switch the site-wide background. When Gradient is active it exposes a
 * Hue / Lightness / Tonal / Chroma ramp picker; Canvas exposes shuffle + animate. Great for
 * previewing how glass components read against each backdrop.
 */
export function BackgroundSwitcher() {
  const {
    background,
    setBackground,
    gradientAxis,
    setGradientAxis,
    gradientAngle,
    cycleGradientAngle,
    shuffleCanvas,
    toggleCanvasAnimated,
    canvasAnimated,
  } = useBackground();

  return (
    <div
      role="group"
      aria-label="Background style"
      className="hidden items-center gap-0.5 rounded-lg border border-[var(--glass-border)] p-0.5 sm:flex"
    >
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          title={`${label} background`}
          aria-label={`${label} background`}
          aria-pressed={background === value}
          onClick={() => setBackground(value)}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            background === value ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" weight={background === value ? "fill" : "regular"} />
        </button>
      ))}
      {background === "gradient" && (
        <div className="flex items-center gap-0.5 border-[var(--glass-border)] border-l pl-0.5" role="group" aria-label="Gradient ramp + angle">
          {RAMP_AXES.map((axis) => (
            <button
              key={axis}
              type="button"
              title={`${axis} gradient`}
              aria-label={`${axis} gradient`}
              aria-pressed={gradientAxis === axis}
              onClick={() => setGradientAxis(axis)}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold uppercase transition-colors",
                gradientAxis === axis ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
              )}
            >
              {axis[0]}
            </button>
          ))}
          <button
            type="button"
            title={`Rotate gradient — ${gradientAngle}°`}
            aria-label={`Rotate gradient, currently ${gradientAngle} degrees`}
            onClick={cycleGradientAngle}
            className="inline-flex h-7 items-center justify-center rounded-md px-1.5 text-[10px] font-semibold text-muted-foreground tabular-nums transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            {gradientAngle}°
          </button>
        </div>
      )}
      {background === "canvas" && (
        <>
          <button
            type="button"
            title="Shuffle canvas"
            aria-label="Shuffle canvas pattern and palette"
            onClick={shuffleCanvas}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <ShuffleIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            title={canvasAnimated ? "Pause animation" : "Animate canvas"}
            aria-label={canvasAnimated ? "Pause canvas animation" : "Animate canvas"}
            aria-pressed={canvasAnimated}
            onClick={toggleCanvasAnimated}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              canvasAnimated ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            {canvasAnimated ? <PauseIcon className="h-4 w-4" weight="fill" /> : <PlayIcon className="h-4 w-4" />}
          </button>
        </>
      )}
    </div>
  );
}
