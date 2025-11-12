/**
 * Canvas Background Utilities
 * Generate random canvas backgrounds with various patterns and colors
 */

export interface CanvasConfig {
  /**
   * Width of the canvas
   */
  width?: number
  /**
   * Height of the canvas
   */
  height?: number
  /**
   * Number of color stops/gradients
   */
  colorCount?: number
  /**
   * Pattern type: 'gradient', 'circles', 'waves', 'particles', 'noise'
   */
  pattern?: 'gradient' | 'circles' | 'waves' | 'particles' | 'noise'
  /**
   * Seed for consistent generation (optional)
   */
  seed?: string
  /**
   * Animation speed (0 = static, higher = faster)
   */
  animationSpeed?: number
}

/**
 * Generate a random color
 */
function randomColor(seed?: number): string {
  const r = seed !== undefined 
    ? Math.floor((Math.sin(seed) * 10000) % 1 * 255)
    : Math.floor(Math.random() * 255)
  const g = seed !== undefined
    ? Math.floor((Math.sin(seed * 2) * 10000) % 1 * 255)
    : Math.floor(Math.random() * 255)
  const b = seed !== undefined
    ? Math.floor((Math.sin(seed * 3) * 10000) % 1 * 255)
    : Math.floor(Math.random() * 255)
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Seeded random number generator
 */
function seededRandom(seed: string): () => number {
  let value = 0
  for (let i = 0; i < seed.length; i++) {
    value = ((value << 5) - value) + seed.charCodeAt(i)
    value = value & value
  }
  let seedValue = Math.abs(value)
  
  return () => {
    seedValue = (seedValue * 9301 + 49297) % 233280
    return seedValue / 233280
  }
}

/**
 * Draw gradient pattern on canvas
 */
function drawGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colorCount: number,
  random: () => number
): void {
  const gradient = ctx.createLinearGradient(
    random() * width,
    random() * height,
    random() * width,
    random() * height
  )
  
  for (let i = 0; i < colorCount; i++) {
    const offset = i / (colorCount - 1)
    const color = randomColor(random() * 1000)
    gradient.addColorStop(offset, color)
  }
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

/**
 * Draw circles pattern on canvas
 */
function drawCircles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colorCount: number,
  random: () => number
): void {
  // Base gradient background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height)
  bgGradient.addColorStop(0, randomColor(random() * 1000))
  bgGradient.addColorStop(1, randomColor(random() * 1000))
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)
  
  // Draw circles
  const circleCount = Math.floor(colorCount * 2)
  for (let i = 0; i < circleCount; i++) {
    const x = random() * width
    const y = random() * height
    const radius = (random() * Math.min(width, height) * 0.3) + 50
    const color = randomColor(random() * 1000)
    const alpha = random() * 0.5 + 0.3
    
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', `, ${alpha})`)
    ctx.fill()
  }
}

/**
 * Draw waves pattern on canvas
 */
function drawWaves(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colorCount: number,
  random: () => number
): void {
  // Base gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height)
  bgGradient.addColorStop(0, randomColor(random() * 1000))
  bgGradient.addColorStop(1, randomColor(random() * 1000))
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)
  
  // Draw waves
  ctx.strokeStyle = randomColor(random() * 1000)
  ctx.lineWidth = 3
  ctx.globalAlpha = 0.6
  
  for (let i = 0; i < colorCount; i++) {
    ctx.beginPath()
    const y = (height / colorCount) * i
    const frequency = random() * 0.02 + 0.01
    const amplitude = random() * 50 + 20
    
    for (let x = 0; x < width; x += 2) {
      const waveY = y + Math.sin(x * frequency) * amplitude
      if (x === 0) {
        ctx.moveTo(x, waveY)
      } else {
        ctx.lineTo(x, waveY)
      }
    }
    
    ctx.strokeStyle = randomColor(random() * 1000)
    ctx.stroke()
  }
  
  ctx.globalAlpha = 1
}

/**
 * Draw particles pattern on canvas
 */
function drawParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colorCount: number,
  random: () => number
): void {
  // Base gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height)
  bgGradient.addColorStop(0, randomColor(random() * 1000))
  bgGradient.addColorStop(1, randomColor(random() * 1000))
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)
  
  // Draw particles
  const particleCount = colorCount * 20
  for (let i = 0; i < particleCount; i++) {
    const x = random() * width
    const y = random() * height
    const size = random() * 3 + 1
    const color = randomColor(random() * 1000)
    const alpha = random() * 0.8 + 0.2
    
    ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', `, ${alpha})`)
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * Draw noise pattern on canvas
 */
function drawNoise(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colorCount: number,
  random: () => number
): void {
  // Base gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height)
  bgGradient.addColorStop(0, randomColor(random() * 1000))
  bgGradient.addColorStop(1, randomColor(random() * 1000))
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)
  
  // Draw noise
  const imageData = ctx.createImageData(width, height)
  const data = imageData.data
  const baseColor = randomColor(random() * 1000).match(/\d+/g) || ['128', '128', '128']
  
  for (let i = 0; i < data.length; i += 4) {
    const noise = (random() - 0.5) * 50
    data[i] = Math.max(0, Math.min(255, parseInt(baseColor[0]) + noise))     // R
    data[i + 1] = Math.max(0, Math.min(255, parseInt(baseColor[1]) + noise)) // G
    data[i + 2] = Math.max(0, Math.min(255, parseInt(baseColor[2]) + noise)) // B
    data[i + 3] = random() * 100 + 50 // A
  }
  
  ctx.putImageData(imageData, 0, 0)
}

/**
 * Generate canvas background
 */
export function generateCanvasBackground(config: CanvasConfig = {}): {
  draw: (ctx: CanvasRenderingContext2D) => void
  width: number
  height: number
} {
  const {
    width = typeof window !== 'undefined' ? window.innerWidth : 1920,
    height = typeof window !== 'undefined' ? window.innerHeight : 1080,
    colorCount = 4,
    pattern = 'gradient',
    seed,
  } = config

  const random = seed ? seededRandom(seed) : () => Math.random()

  const draw = (ctx: CanvasRenderingContext2D) => {
    switch (pattern) {
      case 'circles':
        drawCircles(ctx, width, height, colorCount, random)
        break
      case 'waves':
        drawWaves(ctx, width, height, colorCount, random)
        break
      case 'particles':
        drawParticles(ctx, width, height, colorCount, random)
        break
      case 'noise':
        drawNoise(ctx, width, height, colorCount, random)
        break
      case 'gradient':
      default:
        drawGradient(ctx, width, height, colorCount, random)
        break
    }
  }

  return { draw, width, height }
}

