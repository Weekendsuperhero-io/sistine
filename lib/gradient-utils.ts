/**
 * Utility functions for generating random gradient backgrounds
 */

export interface GradientColor {
  r: number
  g: number
  b: number
}

export interface Gradient {
  colors: GradientColor[]
  angle: number
  stops: number[]
}

/**
 * Generate a random color in RGB format
 */
export function randomColor(): GradientColor {
  return {
    r: Math.floor(Math.random() * 255),
    g: Math.floor(Math.random() * 255),
    b: Math.floor(Math.random() * 255),
  }
}

/**
 * Generate a random gradient with 2-4 colors
 */
export function generateRandomGradient(): Gradient {
  const numColors = Math.floor(Math.random() * 3) + 2 // 2-4 colors
  const colors: GradientColor[] = []
  const stops: number[] = []

  for (let i = 0; i < numColors; i++) {
    colors.push(randomColor())
    stops.push((i / (numColors - 1)) * 100)
  }

  const angle = Math.floor(Math.random() * 360) // 0-360 degrees

  return { colors, angle, stops }
}

/**
 * Convert gradient to CSS linear-gradient string
 */
export function gradientToCSS(gradient: Gradient): string {
  const colorStops = gradient.colors
    .map((color, index) => {
      const stop = gradient.stops[index]
      return `rgba(${color.r}, ${color.g}, ${color.b}, 0.8) ${stop}%`
    })
    .join(", ")

  return `linear-gradient(${gradient.angle}deg, ${colorStops})`
}

/**
 * Generate a seeded random gradient based on a string (for consistent per-page gradients)
 */
export function generateSeededGradient(seed: string): Gradient {
  // Simple hash function for seed
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }

  // Use hash to seed random number generator
  const rng = (seed: number) => {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }

  const numColors = Math.floor(rng(hash) * 3) + 2 // 2-4 colors
  const colors: GradientColor[] = []
  const stops: number[] = []

  for (let i = 0; i < numColors; i++) {
    const colorHash = hash + i * 1000
    colors.push({
      r: Math.floor(rng(colorHash) * 255),
      g: Math.floor(rng(colorHash + 1) * 255),
      b: Math.floor(rng(colorHash + 2) * 255),
    })
    stops.push((i / (numColors - 1)) * 100)
  }

  const angle = Math.floor(rng(hash + 10000) * 360)

  return { colors, angle, stops }
}

/**
 * Generate a beautiful gradient with complementary colors
 */
export function generateBeautifulGradient(): Gradient {
  // Generate a base hue
  const baseHue = Math.floor(Math.random() * 360)
  
  // Generate complementary colors
  const colors: GradientColor[] = []
  const stops: number[] = [0, 50, 100]

  // Convert HSL to RGB
  const hslToRgb = (h: number, s: number, l: number): GradientColor => {
    s /= 100
    l /= 100
    const k = (n: number) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4)),
    }
  }

  // Primary color
  colors.push(hslToRgb(baseHue, 70, 50))
  // Complementary color (180 degrees away)
  colors.push(hslToRgb((baseHue + 180) % 360, 70, 50))
  // Tertiary color (120 degrees away)
  colors.push(hslToRgb((baseHue + 120) % 360, 60, 55))

  const angle = Math.floor(Math.random() * 360)

  return { colors, angle, stops }
}

