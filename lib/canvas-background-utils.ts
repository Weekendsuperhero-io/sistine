/**
 * Canvas Background Utilities
 * Generate random canvas backgrounds with various patterns and colors
 */

export interface CanvasConfig {
  /**
   * Width of the canvas
   */
  width?: number;
  /**
   * Height of the canvas
   */
  height?: number;
  /**
   * Number of color stops/gradients
   */
  colorCount?: number;
  /**
   * Pattern type: 'gradient', 'circles', 'waves', 'particles', 'noise', 'artistic'
   */
  pattern?: "gradient" | "circles" | "waves" | "particles" | "noise" | "artistic";
  /**
   * Seed for consistent generation (optional)
   */
  seed?: string;
  /**
   * Animation speed (0 = static, higher = faster)
   */
  animationSpeed?: number;
}

/**
 * Curated color palettes for beautiful glassmorphism backgrounds
 */
const COLOR_PALETTES = {
  // Sunset/Sunrise gradients (warm, vibrant)
  sunset: [
    {
      r: 255,
      g: 107,
      b: 107,
    }, // Coral Red
    {
      r: 255,
      g: 159,
      b: 64,
    }, // Orange
    {
      r: 255,
      g: 206,
      b: 84,
    }, // Golden Yellow
    {
      r: 255,
      g: 119,
      b: 198,
    }, // Pink
  ],
  // Ocean/Sea gradients (calm, refreshing)
  ocean: [
    {
      r: 0,
      g: 180,
      b: 216,
    }, // Ocean Blue
    {
      r: 72,
      g: 202,
      b: 228,
    }, // Sky Blue
    {
      r: 144,
      g: 224,
      b: 239,
    }, // Light Blue
    {
      r: 0,
      g: 150,
      b: 199,
    }, // Deep Blue
  ],
  // Forest/Nature gradients (earthy, natural)
  forest: [
    {
      r: 34,
      g: 139,
      b: 34,
    }, // Forest Green
    {
      r: 46,
      g: 125,
      b: 50,
    }, // Dark Green
    {
      r: 76,
      g: 175,
      b: 80,
    }, // Light Green
    {
      r: 56,
      g: 142,
      b: 60,
    }, // Green
  ],
  // Lavender/Dream gradients (soft, dreamy)
  lavender: [
    {
      r: 200,
      g: 162,
      b: 200,
    }, // Lavender
    {
      r: 186,
      g: 104,
      b: 200,
    }, // Purple
    {
      r: 171,
      g: 71,
      b: 188,
    }, // Deep Purple
    {
      r: 224,
      g: 187,
      b: 228,
    }, // Light Lavender
  ],
  // Fire/Ember gradients (intense, dynamic)
  fire: [
    {
      r: 255,
      g: 87,
      b: 34,
    }, // Deep Orange
    {
      r: 255,
      g: 152,
      b: 0,
    }, // Orange
    {
      r: 255,
      g: 193,
      b: 7,
    }, // Amber
    {
      r: 244,
      g: 67,
      b: 54,
    }, // Red
  ],
  // Midnight/Space gradients (mysterious, deep)
  midnight: [
    {
      r: 25,
      g: 25,
      b: 112,
    }, // Midnight Blue
    {
      r: 72,
      g: 61,
      b: 139,
    }, // Dark Slate Blue
    {
      r: 106,
      g: 90,
      b: 205,
    }, // Slate Blue
    {
      r: 123,
      g: 104,
      b: 238,
    }, // Medium Slate Blue
  ],
};

/**
 * Get a curated color palette based on seed
 */
function getColorPalette(seed: number): typeof COLOR_PALETTES.sunset {
  const palettes = Object.values(COLOR_PALETTES);
  const index = Math.floor((Math.abs(Math.sin(seed)) * 10000) % palettes.length);
  return palettes[index];
}

/**
 * Generate a beautiful color from curated palette
 */
function randomColor(seed?: number): string {
  if (seed === undefined) {
    seed = Math.random() * 1000;
  }

  const palette = getColorPalette(seed);
  const colorIndex = Math.floor((Math.abs(Math.sin(seed * 2)) * 10000) % palette.length);
  const color = palette[colorIndex];

  // Add slight variation for more natural look
  const variation = 0.15; // 15% variation
  const rVariation = Math.sin(seed * 3) * variation;
  const gVariation = Math.sin(seed * 4) * variation;
  const bVariation = Math.sin(seed * 5) * variation;

  const r = Math.max(0, Math.min(255, Math.floor(color.r * (1 + rVariation))));
  const g = Math.max(0, Math.min(255, Math.floor(color.g * (1 + gVariation))));
  const b = Math.max(0, Math.min(255, Math.floor(color.b * (1 + bVariation))));

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Seeded random number generator
 */
function seededRandom(seed: string): () => number {
  let value = 0;
  for (let i = 0; i < seed.length; i++) {
    value = (value << 5) - value + seed.charCodeAt(i);
    value = value & value;
  }
  let seedValue = Math.abs(value);

  return () => {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    return seedValue / 233280;
  };
}

/**
 * Draw gradient pattern on canvas
 */
function drawGradient(ctx: CanvasRenderingContext2D, width: number, height: number, colorCount: number, random: () => number): void {
  const gradient = ctx.createLinearGradient(random() * width, random() * height, random() * width, random() * height);

  for (let i = 0; i < colorCount; i++) {
    const offset = i / (colorCount - 1);
    const color = randomColor(random() * 1000);
    gradient.addColorStop(offset, color);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Draw circles pattern on canvas
 */
function drawCircles(ctx: CanvasRenderingContext2D, width: number, height: number, colorCount: number, random: () => number): void {
  // Base gradient background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, randomColor(random() * 1000));
  bgGradient.addColorStop(1, randomColor(random() * 1000));
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw circles
  const circleCount = Math.floor(colorCount * 2);
  for (let i = 0; i < circleCount; i++) {
    const x = random() * width;
    const y = random() * height;
    const radius = random() * Math.min(width, height) * 0.3 + 50;
    const color = randomColor(random() * 1000);
    const alpha = random() * 0.5 + 0.3;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color.replace("rgb", "rgba").replace(")", `, ${alpha})`);
    ctx.fill();
  }
}

/**
 * Draw waves pattern on canvas
 */
function drawWaves(ctx: CanvasRenderingContext2D, width: number, height: number, colorCount: number, random: () => number): void {
  // Base gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, randomColor(random() * 1000));
  bgGradient.addColorStop(1, randomColor(random() * 1000));
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw waves
  ctx.strokeStyle = randomColor(random() * 1000);
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.6;

  for (let i = 0; i < colorCount; i++) {
    ctx.beginPath();
    const y = (height / colorCount) * i;
    const frequency = random() * 0.02 + 0.01;
    const amplitude = random() * 50 + 20;

    for (let x = 0; x < width; x += 2) {
      const waveY = y + Math.sin(x * frequency) * amplitude;
      if (x === 0) {
        ctx.moveTo(x, waveY);
      } else {
        ctx.lineTo(x, waveY);
      }
    }

    ctx.strokeStyle = randomColor(random() * 1000);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

/**
 * Draw particles pattern on canvas
 */
function drawParticles(ctx: CanvasRenderingContext2D, width: number, height: number, colorCount: number, random: () => number): void {
  // Base gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, randomColor(random() * 1000));
  bgGradient.addColorStop(1, randomColor(random() * 1000));
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw particles
  const particleCount = colorCount * 20;
  for (let i = 0; i < particleCount; i++) {
    const x = random() * width;
    const y = random() * height;
    const size = random() * 3 + 1;
    const color = randomColor(random() * 1000);
    const alpha = random() * 0.8 + 0.2;

    ctx.fillStyle = color.replace("rgb", "rgba").replace(")", `, ${alpha})`);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw noise pattern on canvas
 */
function drawNoise(ctx: CanvasRenderingContext2D, width: number, height: number, _colorCount: number, random: () => number): void {
  // Base gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, randomColor(random() * 1000));
  bgGradient.addColorStop(1, randomColor(random() * 1000));
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw noise
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const baseColor = randomColor(random() * 1000).match(/\d+/g) || [
    "128",
    "128",
    "128",
  ];

  for (let i = 0; i < data.length; i += 4) {
    const noise = (random() - 0.5) * 50;
    data[i] = Math.max(0, Math.min(255, parseInt(baseColor[0]) + noise)); // R
    data[i + 1] = Math.max(0, Math.min(255, parseInt(baseColor[1]) + noise)); // G
    data[i + 2] = Math.max(0, Math.min(255, parseInt(baseColor[2]) + noise)); // B
    data[i + 3] = random() * 100 + 50; // A
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Draw artistic painting pattern with random lines and brush strokes
 */
function drawArtistic(ctx: CanvasRenderingContext2D, width: number, height: number, colorCount: number, random: () => number): void {
  // Base gradient background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, randomColor(random() * 1000));
  bgGradient.addColorStop(0.5, randomColor(random() * 1000));
  bgGradient.addColorStop(1, randomColor(random() * 1000));
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw artistic brush strokes
  const strokeCount = colorCount * 8;
  for (let i = 0; i < strokeCount; i++) {
    const x1 = random() * width;
    const y1 = random() * height;
    const x2 = x1 + (random() - 0.5) * width * 0.4;
    const y2 = y1 + (random() - 0.5) * height * 0.4;

    const color = randomColor(random() * 1000);
    const alpha = random() * 0.4 + 0.3;
    const lineWidth = random() * 15 + 5;

    ctx.beginPath();
    ctx.moveTo(x1, y1);

    // Create curved brush stroke with control points
    const cp1x = x1 + (random() - 0.5) * width * 0.2;
    const cp1y = y1 + (random() - 0.5) * height * 0.2;
    const cp2x = x2 + (random() - 0.5) * width * 0.2;
    const cp2y = y2 + (random() - 0.5) * height * 0.2;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);

    ctx.strokeStyle = color.replace("rgb", "rgba").replace(")", `, ${alpha})`);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  // Draw abstract shapes (circles and ovals)
  const shapeCount = colorCount * 3;
  for (let i = 0; i < shapeCount; i++) {
    const x = random() * width;
    const y = random() * height;
    const radiusX = random() * Math.min(width, height) * 0.15 + 20;
    const radiusY = random() * Math.min(width, height) * 0.15 + 20;

    const color = randomColor(random() * 1000);
    const alpha = random() * 0.3 + 0.2;

    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, random() * Math.PI * 2, 0, Math.PI * 2);
    ctx.fillStyle = color.replace("rgb", "rgba").replace(")", `, ${alpha})`);
    ctx.fill();
  }

  // Draw flowing lines
  const lineCount = colorCount * 5;
  for (let i = 0; i < lineCount; i++) {
    const startX = random() * width;
    const startY = random() * height;
    const segments = Math.floor(random() * 5) + 3;

    const color = randomColor(random() * 1000);
    const alpha = random() * 0.5 + 0.3;
    const lineWidth = random() * 8 + 2;

    ctx.beginPath();
    ctx.moveTo(startX, startY);

    let currentX = startX;
    let currentY = startY;

    for (let j = 0; j < segments; j++) {
      currentX += (random() - 0.5) * width * 0.3;
      currentY += (random() - 0.5) * height * 0.3;
      ctx.lineTo(currentX, currentY);
    }

    ctx.strokeStyle = color.replace("rgb", "rgba").replace(")", `, ${alpha})`);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // Add some splatter effects (small dots)
  const splatterCount = colorCount * 15;
  for (let i = 0; i < splatterCount; i++) {
    const x = random() * width;
    const y = random() * height;
    const size = random() * 4 + 1;

    const color = randomColor(random() * 1000);
    const alpha = random() * 0.6 + 0.2;

    ctx.fillStyle = color.replace("rgb", "rgba").replace(")", `, ${alpha})`);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Generate canvas background
 */
export function generateCanvasBackground(config: CanvasConfig = {}): {
  draw: (ctx: CanvasRenderingContext2D) => void;
  width: number;
  height: number;
} {
  const {
    width = typeof window !== "undefined" ? window.innerWidth : 1920,
    height = typeof window !== "undefined" ? window.innerHeight : 1080,
    colorCount = 4,
    pattern = "gradient",
    seed,
  } = config;

  const random = seed ? seededRandom(seed) : () => Math.random();

  const draw = (ctx: CanvasRenderingContext2D) => {
    switch (pattern) {
      case "circles":
        drawCircles(ctx, width, height, colorCount, random);
        break;
      case "waves":
        drawWaves(ctx, width, height, colorCount, random);
        break;
      case "particles":
        drawParticles(ctx, width, height, colorCount, random);
        break;
      case "noise":
        drawNoise(ctx, width, height, colorCount, random);
        break;
      case "artistic":
        drawArtistic(ctx, width, height, colorCount, random);
        break;
      case "gradient":
      default:
        drawGradient(ctx, width, height, colorCount, random);
        break;
    }
  };

  return {
    draw,
    width,
    height,
  };
}
