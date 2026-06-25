import type * as React from "react";

/**
 * Standalone fallbacks for when the @sistine/theme tokens aren't present. They mirror the theme
 * gradient's hue math (base hue → +63.53°): the default at a mid lightness, the contrast one dark
 * (legible on light surfaces; the theme's .dark override flips it light).
 */
const FALLBACK_GRADIENT = "linear-gradient(135deg, oklch(0.62 0.16 250) 0%, oklch(0.62 0.16 313.53) 100%)";
const FALLBACK_CONTRAST = "linear-gradient(135deg, oklch(0.32 0.14 250) 0%, oklch(0.32 0.14 313.53) 100%)";

export interface GradientTextProps extends React.ComponentProps<"span"> {
  /** Override the gradient. Defaults to the theme's `--gradient-text`, which follows the live glass tint. */
  gradient?: string;
  /**
   * Use the high-contrast theme gradient (`--gradient-text-contrast`: dark in light mode, light in
   * dark mode) so the text stays legible printed ON a tinted glass surface. Ignored when `gradient`
   * is set.
   */
  contrast?: boolean;
}

/**
 * Fills its text with a gradient via `background-clip: text`. Defaults to the theme token
 * `--gradient-text` (which tracks the live glass tint); pass `contrast` to use the lightness-
 * contrasting `--gradient-text-contrast` when the text sits on a tinted surface. Falls back to a
 * fixed brand gradient when the theme isn't present, so it works standalone. Best on large/display
 * text — a gradient fill has no single contrast value, so keep body/UI text solid.
 *
 * @example
 * <h1><GradientText>Beautiful interfaces</GradientText></h1>
 * <GradientText contrast><code>{css}</code></GradientText>
 * <GradientText gradient="linear-gradient(90deg, #f00, #00f)">Custom</GradientText>
 */
export function GradientText({ gradient, contrast = false, style, ...props }: GradientTextProps) {
  const themed = contrast ? `var(--gradient-text-contrast, ${FALLBACK_CONTRAST})` : `var(--gradient-text, ${FALLBACK_GRADIENT})`;
  return (
    <span
      data-slot="gradient-text"
      style={{
        backgroundImage: gradient ?? themed,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
        ...style,
      }}
      {...props}
    />
  );
}
