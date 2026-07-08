"use client";

import { PaletteIcon, PauseIcon, PlayIcon, ProhibitIcon, ShuffleIcon, SparkleIcon, SquaresFourIcon } from "@phosphor-icons/react";
import { type BackgroundType, CANVAS_STYLES, RAMP_AXES, useBackground } from "@/components/background-provider";
import { ANIMATED_PATTERNS, DISC_PATTERNS, PATTERN_STYLES, type PatternStyle } from "@/components/pattern-background";
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
  {
    value: "pattern",
    label: "Pattern",
    Icon: SquaresFourIcon,
  },
  {
    value: "none",
    label: "None",
    Icon: ProhibitIcon,
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
    patternStyle,
    setPatternStyle,
    patternDensity,
    cyclePatternDensity,
    patternSpeed,
    cyclePatternSpeed,
    patternDisc,
    cyclePatternDisc,
    baseColor,
    setBaseColor,
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

      {background === "pattern" && (
        <div className="flex items-center gap-0.5 border-[var(--glass-border)] border-l pl-0.5" role="group" aria-label="Pattern controls">
          {/* Direct pick — jump straight to any pattern instead of cycling through all of them. */}
          <select
            value={patternStyle}
            onChange={(e) => setPatternStyle(e.target.value as PatternStyle)}
            title="Pattern — pick one"
            aria-label="Pattern style"
            className={cn(segmentButton, "cursor-pointer bg-transparent px-1.5 text-[10px] font-semibold capitalize outline-none", active)}
          >
            {PATTERN_STYLES.map((s) => (
              <option key={s} value={s} className="bg-background text-foreground capitalize">
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            title={`Density: ${patternDensity} — click to change`}
            aria-label={`Density ${patternDensity}, click to change`}
            onClick={cyclePatternDensity}
            className={cn(segmentButton, "px-1.5 text-[10px] font-semibold capitalize", idle)}
          >
            {patternDensity}
          </button>
          {ANIMATED_PATTERNS.has(patternStyle) && (
            <button
              type="button"
              title={`Speed: ${patternSpeed === 0 ? "static" : `${patternSpeed}s`} — click to change`}
              aria-label={`Animation speed ${patternSpeed === 0 ? "static" : `${patternSpeed} seconds`}, click to change`}
              onClick={cyclePatternSpeed}
              className={cn(segmentButton, "px-1.5 text-[10px] font-semibold tabular-nums", patternSpeed === 0 ? active : idle)}
            >
              {patternSpeed === 0 ? "Static" : `${patternSpeed}s`}
            </button>
          )}
          {DISC_PATTERNS.has(patternStyle) && (
            <button
              type="button"
              title={`Sun/moon placement: ${patternDisc} — click to change`}
              aria-label={`Sun and moon placement ${patternDisc}, click to change`}
              onClick={cyclePatternDisc}
              className={cn(segmentButton, "w-7 text-[11px] font-semibold uppercase", idle)}
            >
              {patternDisc[0]}
            </button>
          )}
        </div>
      )}

      {background === "none" && (
        <div className="flex items-center gap-1 border-[var(--glass-border)] border-l pl-1.5" role="group" aria-label="Base color">
          <label
            className="relative inline-flex h-6 w-6 cursor-pointer items-center justify-center"
            title="Base color — pick to override the themed default"
          >
            <span className="sr-only">Base color</span>
            <span
              aria-hidden="true"
              className="h-4 w-4 rounded-full border border-[var(--glass-border)]"
              style={{
                background: baseColor ?? "oklch(0.85 0.03 var(--glass-tint-h))",
              }}
            />
            <input
              type="color"
              value={baseColor ?? "#101014"}
              onChange={(e) => setBaseColor(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          {baseColor && (
            <button
              type="button"
              title="Reset base color to the themed default"
              aria-label="Reset base color to theme default"
              onClick={() => setBaseColor(null)}
              className={cn(segmentButton, "px-1.5 text-[10px] font-semibold", idle)}
            >
              Theme
            </button>
          )}
        </div>
      )}
    </div>
  );
}
