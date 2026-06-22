/**
 * Utility functions for generating random gradient backgrounds (OKLCH color space)
 */

export interface GradientColor {
  /** Lightness (0-100%) */
  l: number;
  /** Chroma (0-0.4) */
  c: number;
  /** Hue (0-360) */
  h: number;
}

export interface Gradient {
  colors: GradientColor[];
  angle: number;
  stops: number[];
}

/**
 * Generate a random color in OKLCH
 */
export function randomColor(): GradientColor {
  return {
    l: Math.random() * 60 + 30, // 30-90% lightness
    c: Math.random() * 0.25 + 0.05, // 0.05-0.30 chroma
    h: Math.random() * 360, // full hue range
  };
}

/**
 * Generate a random gradient with 2-4 colors
 */
export function generateRandomGradient(): Gradient {
  const numColors = Math.floor(Math.random() * 3) + 2;
  const colors: GradientColor[] = [];
  const stops: number[] = [];

  for (let i = 0; i < numColors; i++) {
    colors.push(randomColor());
    stops.push((i / (numColors - 1)) * 100);
  }

  const angle = Math.floor(Math.random() * 360);

  return {
    colors,
    angle,
    stops,
  };
}

/**
 * Convert gradient to CSS linear-gradient string (oklch)
 */
export function gradientToCSS(gradient: Gradient): string {
  const colorStops = gradient.colors
    .map((color, index) => {
      const stop = gradient.stops[index];
      return `oklch(${color.l.toFixed(1)}% ${color.c.toFixed(3)} ${color.h.toFixed(1)} / 0.8) ${stop}%`;
    })
    .join(", ");

  return `linear-gradient(${gradient.angle}deg in oklch, ${colorStops})`;
}

/**
 * Generate a seeded random gradient based on a string (for consistent per-page gradients)
 */
export function generateSeededGradient(seed: string): Gradient {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const rng = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const numColors = Math.floor(rng(hash) * 3) + 2;
  const colors: GradientColor[] = [];
  const stops: number[] = [];

  for (let i = 0; i < numColors; i++) {
    const colorHash = hash + i * 1000;
    colors.push({
      l: rng(colorHash) * 60 + 30,
      c: rng(colorHash + 1) * 0.25 + 0.05,
      h: rng(colorHash + 2) * 360,
    });
    stops.push((i / (numColors - 1)) * 100);
  }

  const angle = Math.floor(rng(hash + 10000) * 360);

  return {
    colors,
    angle,
    stops,
  };
}

/**
 * Generate a beautiful gradient with complementary colors
 */
export function generateBeautifulGradient(baseHue?: number): Gradient {
  const hue = baseHue ?? Math.random() * 360;

  const colors: GradientColor[] = [
    // Primary
    {
      l: 65,
      c: 0.2,
      h: hue,
    },
    // Complementary (180° away)
    {
      l: 65,
      c: 0.2,
      h: (hue + 180) % 360,
    },
    // Tertiary (120° away)
    {
      l: 70,
      c: 0.17,
      h: (hue + 120) % 360,
    },
  ];

  const stops = [
    0,
    50,
    100,
  ];
  const angle = Math.floor(Math.random() * 360);

  return {
    colors,
    angle,
    stops,
  };
}
