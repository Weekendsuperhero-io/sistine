"use client";

import { PaletteIcon, PauseIcon, PlayIcon, ShuffleIcon, SparkleIcon } from "@phosphor-icons/react";
import { type BackgroundType, CANVAS_STYLES, RAMP_AXES, useBackground } from "@/components/background-provider";
import { cn } from "@/lib/utils";

const options: {
  value: BackgroundType;
  label: string;
  Icon: typeof PaletteIcon;
}[] = [
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

/** Compact glyphs for the gradient center + radial size. */
const POS_SYMBOL: Record<string, string> = {
  "50% 50%": "•",
  "0% 0%": "↖",
  "100% 0%": "↗",
  "100% 100%": "↘",
  "0% 100%": "↙",
};
const SIZE_SHORT: Record<string, string> = {
  "farthest-corner": "f-cnr",
  "farthest-side": "f-side",
  "closest-corner": "c-cnr",
  "closest-side": "c-side",
};

const segmentButton = "inline-flex h-7 items-center justify-center rounded-md transition-colors";

/**
 * Compact segmented control to switch the site-wide background. Gradient exposes a ramp-axis +
 * angle picker; Canvas exposes style (gradient / lava / circle), ramp axis, steps-per-side, angle,
 * speed, shuffle, and animate. Great for previewing how glass components read against each backdrop.
 */
export function BackgroundSwitcher() {
  const {
    background,
    setBackground,
    gradientAxis,
    setGradientAxis,
    gradientAngle,
    cycleGradientAngle,
    gradientShape,
    cycleGradientShape,
    gradientPosition,
    cycleGradientPosition,
    radialShape,
    cycleRadialShape,
    radialSize,
    cycleRadialSize,
    canvasStyle,
    setCanvasStyle,
    canvasRamp,
    setCanvasRamp,
    canvasSteps,
    cycleCanvasSteps,
    canvasAngle,
    cycleCanvasAngle,
    canvasSpeed,
    cycleCanvasSpeed,
    canvasAnimated,
    toggleCanvasAnimated,
    shuffleCanvas,
  } = useBackground();

  const active = "bg-foreground/10 text-foreground";
  const idle = "text-muted-foreground hover:bg-foreground/5 hover:text-foreground";
  const nextStyle = CANVAS_STYLES[(CANVAS_STYLES.indexOf(canvasStyle) + 1) % CANVAS_STYLES.length];

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
          className={cn(segmentButton, "w-7", background === value ? active : idle)}
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
              className={cn(segmentButton, "w-7 text-[11px] font-semibold uppercase", gradientAxis === axis ? active : idle)}
            >
              {axis[0]}
            </button>
          ))}
          {/* Shape: linear | radial | conic */}
          <button
            type="button"
            title={`Gradient shape: ${gradientShape} — click to change`}
            aria-label={`Gradient shape ${gradientShape}, click to change`}
            onClick={cycleGradientShape}
            className={cn(segmentButton, "px-1.5 text-[10px] font-semibold capitalize", active)}
          >
            {gradientShape}
          </button>
          {/* Center position — radial + conic */}
          {(gradientShape === "radial" || gradientShape === "conic") && (
            <button
              type="button"
              title={`Center — ${gradientPosition}`}
              aria-label={`Gradient center ${gradientPosition}`}
              onClick={cycleGradientPosition}
              className={cn(segmentButton, "w-7 text-[13px]", idle)}
            >
              {POS_SYMBOL[gradientPosition] ?? "•"}
            </button>
          )}
          {/* Radial shape + size */}
          {gradientShape === "radial" && (
            <>
              <button
                type="button"
                title={`Radial shape: ${radialShape}`}
                aria-label={`Radial shape ${radialShape}`}
                onClick={cycleRadialShape}
                className={cn(segmentButton, "px-1.5 text-[10px] font-semibold capitalize", idle)}
              >
                {radialShape}
              </button>
              <button
                type="button"
                title={`Radial size: ${radialSize}`}
                aria-label={`Radial size ${radialSize}`}
                onClick={cycleRadialSize}
                className={cn(segmentButton, "px-1.5 text-[10px] font-semibold", idle)}
              >
                {SIZE_SHORT[radialSize] ?? radialSize}
              </button>
            </>
          )}
          {/* Angle — not meaningful for radial (fixed center) */}
          {gradientShape !== "radial" && (
            <button
              type="button"
              title={`Rotate gradient — ${gradientAngle}°`}
              aria-label={`Rotate gradient, currently ${gradientAngle} degrees`}
              onClick={cycleGradientAngle}
              className={cn(segmentButton, "px-1.5 text-[10px] font-semibold tabular-nums", idle)}
            >
              {gradientAngle}°
            </button>
          )}
        </div>
      )}

      {background === "canvas" && (
        <div className="flex items-center gap-0.5 border-[var(--glass-border)] border-l pl-0.5" role="group" aria-label="Canvas controls">
          {/* Style: gradient | lava | circle */}
          <button
            type="button"
            title={`Canvas style: ${canvasStyle} — click for ${nextStyle}`}
            aria-label={`Canvas style ${canvasStyle}, click to change`}
            onClick={() => setCanvasStyle(nextStyle)}
            className={cn(segmentButton, "px-1.5 text-[10px] font-semibold capitalize", active)}
          >
            {canvasStyle}
          </button>
          {/* Ramp axis (lightness = "linear") */}
          {RAMP_AXES.map((axis) => (
            <button
              key={axis}
              type="button"
              title={`${axis === "lightness" ? "linear (lightness)" : axis} ramp`}
              aria-label={`${axis} ramp`}
              aria-pressed={canvasRamp === axis}
              onClick={() => setCanvasRamp(axis)}
              className={cn(segmentButton, "w-7 text-[11px] font-semibold uppercase", canvasRamp === axis ? active : idle)}
            >
              {axis[0]}
            </button>
          ))}
          {/* Steps per side (4–12) */}
          <button
            type="button"
            title={`Steps per side — ${canvasSteps}`}
            aria-label={`Steps per side, currently ${canvasSteps}`}
            onClick={cycleCanvasSteps}
            className={cn(segmentButton, "px-1.5 text-[10px] font-semibold tabular-nums", idle)}
          >
            {canvasSteps}×
          </button>
          {/* Angle — gradient style only */}
          {canvasStyle === "gradient" && (
            <button
              type="button"
              title={`Gradient angle — ${canvasAngle}°`}
              aria-label={`Gradient angle, currently ${canvasAngle} degrees`}
              onClick={cycleCanvasAngle}
              className={cn(segmentButton, "px-1.5 text-[10px] font-semibold tabular-nums", idle)}
            >
              {canvasAngle}°
            </button>
          )}
          {/* Speed — only meaningful while animating */}
          {canvasAnimated && (
            <button
              type="button"
              title={`Animation speed — ${canvasSpeed}×`}
              aria-label={`Animation speed, currently ${canvasSpeed} times`}
              onClick={cycleCanvasSpeed}
              className={cn(segmentButton, "px-1.5 text-[10px] font-semibold tabular-nums", idle)}
            >
              {canvasSpeed}×
            </button>
          )}
          <button
            type="button"
            title="Shuffle canvas"
            aria-label="Shuffle canvas style, ramp, and layout"
            onClick={shuffleCanvas}
            className={cn(segmentButton, "w-7", idle)}
          >
            <ShuffleIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            title={canvasAnimated ? "Pause animation" : "Animate canvas"}
            aria-label={canvasAnimated ? "Pause canvas animation" : "Animate canvas"}
            aria-pressed={canvasAnimated}
            onClick={toggleCanvasAnimated}
            className={cn(segmentButton, "w-7", canvasAnimated ? active : idle)}
          >
            {canvasAnimated ? <PauseIcon className="h-4 w-4" weight="fill" /> : <PlayIcon className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
