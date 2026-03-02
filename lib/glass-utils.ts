/**
 * Glassmorphism customization utilities
 * Allows users to customize color, transparency, blur, and outline for glass effects
 */

export interface GlassCustomization {
  /**
   * Background color for the glass effect (e.g., "oklch(1 0 0 / 0.1)" or "#ffffff")
   * Default: uses CSS variable --glass-bg
   */
  color?: string;

  /**
   * Transparency/opacity for the background (0-1)
   * If provided, will override the alpha channel in color
   */
  transparency?: number;

  /**
   * Blur amount in pixels
   * Default: uses CSS variable --blur (20px)
   */
  blur?: number | string;

  /**
   * Border/outline color (e.g., "oklch(1 0 0 / 0.25)" or "#ffffff")
   * Default: uses CSS variable --glass-border
   */
  outline?: string;

  /**
   * Border/outline width in pixels
   * Default: 1px
   */
  outlineWidth?: number | string;

  /**
   * Shadow for the glass effect
   * Default: uses CSS variable --glass-shadow
   */
  shadow?: string;

  /**
   * Inner glow color and intensity (e.g., "oklch(1 0 0 / 0.2)")
   * Creates an inset shadow for a glowing effect inside the element
   */
  innerGlow?: string;

  /**
   * Inner glow blur/spread radius in pixels
   * Default: 20px
   */
  innerGlowBlur?: number | string;
}

/**
 * Applies a new alpha/transparency value to a color string.
 * Supports oklch, rgba/rgb, and hex formats.
 */
function applyAlpha(color: string, alpha: number): string {
  // oklch format: oklch(L C H) or oklch(L C H / A)
  const oklchMatch = color.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\)/);
  if (oklchMatch) {
    const [, l, c, h] = oklchMatch;
    return `oklch(${l} ${c} ${h} / ${alpha})`;
  }

  // rgba/rgb format
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch;
    return `oklch(${rgbToOklchString(Number(r), Number(g), Number(b))} / ${alpha})`;
  }

  // hex format
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `oklch(${rgbToOklchString(r, g, b)} / ${alpha})`;
  }

  // Fallback
  return `${color}${alpha}`;
}

/**
 * Approximate RGB (0-255) to oklch L C H string.
 * Good enough for glass UI defaults — not a full colour-science conversion.
 */
function rgbToOklchString(r: number, g: number, b: number): string {
  // Linearize sRGB
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lr = toLinear(r),
    lg = toLinear(g),
    lb = toLinear(b);

  // sRGB → OKLab via LMS
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l1 = Math.cbrt(l_),
    m1 = Math.cbrt(m_),
    s1 = Math.cbrt(s_);

  const L = 0.2104542553 * l1 + 0.793617785 * m1 - 0.0040720468 * s1;
  const a = 1.9779984951 * l1 - 2.428592205 * m1 + 0.4505937099 * s1;
  const bOk = 0.0259040371 * l1 + 0.7827717662 * m1 - 0.808675766 * s1;

  const C = Math.sqrt(a * a + bOk * bOk);
  let H = (Math.atan2(bOk, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return `${L.toFixed(2)} ${C.toFixed(2)} ${H.toFixed(0)}`;
}

/**
 * Converts glass customization props to CSS style object
 */
export function getGlassStyles(customization?: GlassCustomization): React.CSSProperties {
  if (!customization) return {};

  const styles: React.CSSProperties = {};

  // Handle background color and transparency
  if (customization.color || customization.transparency !== undefined) {
    let bgColor = customization.color || "oklch(1 0 0 / 0.1)";

    // If transparency is provided, adjust the alpha channel
    if (customization.transparency !== undefined) {
      bgColor = applyAlpha(bgColor, customization.transparency);
    }

    styles.backgroundColor = bgColor;
  }

  // Handle blur
  if (customization.blur !== undefined) {
    const blurValue = typeof customization.blur === "number" ? `${customization.blur}px` : customization.blur;
    styles.backdropFilter = `blur(${blurValue})`;
    styles.WebkitBackdropFilter = `blur(${blurValue})`; // Safari support
  }

  // Handle outline/border - always apply border for glassmorphism effect
  if (customization.outline !== undefined) {
    const width = customization.outlineWidth || "1px";
    styles.borderColor = customization.outline;
    styles.borderWidth = typeof width === "number" ? `${width}px` : width;
    styles.borderStyle = "solid";
  } else if (!customization.outline && (customization.color || customization.transparency !== undefined || customization.blur !== undefined)) {
    // Apply default border if glass customization is provided but outline is not
    styles.borderColor = "oklch(1 0 0 / 0.3)";
    styles.borderWidth = "1px";
    styles.borderStyle = "solid";
  }

  // Handle shadow and inner glow - combine both if provided
  const shadows: string[] = [];

  // Add outer shadow
  if (customization.shadow !== undefined) {
    shadows.push(customization.shadow);
  } else if (customization.color || customization.transparency !== undefined || customization.blur !== undefined) {
    // Apply default glass shadow for depth
    shadows.push("0 8px 32px oklch(0 0 0 / 0.1), 0 2px 8px oklch(0 0 0 / 0.05)");
  }

  // Add inner glow as inset shadow
  if (customization.innerGlow !== undefined) {
    const glowBlur =
      customization.innerGlowBlur !== undefined
        ? typeof customization.innerGlowBlur === "number"
          ? `${customization.innerGlowBlur}px`
          : customization.innerGlowBlur
        : "20px";
    shadows.push(`inset 0 0 ${glowBlur} ${customization.innerGlow}`);
  }

  if (shadows.length > 0) {
    styles.boxShadow = shadows.join(", ");
  }

  return styles;
}

/**
 * Generates CSS custom properties for glass customization
 * Useful for components that need to pass styles to child elements
 */
export function getGlassCSSVars(customization?: GlassCustomization): Record<string, string> {
  if (!customization) return {};

  const vars: Record<string, string> = {};

  if (customization.color || customization.transparency !== undefined) {
    let bgColor = customization.color || "oklch(1 0 0 / 0.1)";

    if (customization.transparency !== undefined) {
      bgColor = applyAlpha(bgColor, customization.transparency);
    }

    vars["--glass-bg-custom"] = bgColor;
  }

  if (customization.blur !== undefined) {
    const blurValue = typeof customization.blur === "number" ? `${customization.blur}px` : customization.blur;
    vars["--blur-custom"] = blurValue;
  }

  if (customization.outline !== undefined) {
    vars["--glass-border-custom"] = customization.outline;
  }

  if (customization.outlineWidth !== undefined) {
    const width = typeof customization.outlineWidth === "number" ? `${customization.outlineWidth}px` : customization.outlineWidth;
    vars["--glass-border-width-custom"] = width;
  }

  if (customization.shadow !== undefined) {
    vars["--glass-shadow-custom"] = customization.shadow;
  }

  if (customization.innerGlow !== undefined) {
    vars["--glass-inner-glow-custom"] = customization.innerGlow;
  }

  if (customization.innerGlowBlur !== undefined) {
    const blurValue = typeof customization.innerGlowBlur === "number" ? `${customization.innerGlowBlur}px` : customization.innerGlowBlur;
    vars["--glass-inner-glow-blur-custom"] = blurValue;
  }

  return vars;
}
