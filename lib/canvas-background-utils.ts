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
 * Curated color palettes in OKLCH for beautiful glassmorphism backgrounds
 * Values: l (lightness 0-100%), c (chroma 0-0.4), h (hue 0-360)
 */
const COLOR_PALETTES = {
  // Sunset/Sunrise gradients (warm, vibrant)
  sunset: [
    {
      l: 71.2,
      c: 0.181,
      h: 22.8,
    }, // Coral Red
    {
      l: 78.5,
      c: 0.155,
      h: 61.3,
    }, // Orange
    {
      l: 87.3,
      c: 0.147,
      h: 86.7,
    }, // Golden Yellow
    {
      l: 75.2,
      c: 0.186,
      h: 346.6,
    }, // Pink
  ],
  // Ocean/Sea gradients (calm, refreshing)
  ocean: [
    {
      l: 71.1,
      c: 0.129,
      h: 219,
    }, // Ocean Blue
    {
      l: 77.9,
      c: 0.117,
      h: 213.7,
    }, // Sky Blue
    {
      l: 86,
      c: 0.081,
      h: 210.7,
    }, // Light Blue
    {
      l: 63.1,
      c: 0.126,
      h: 230.5,
    }, // Deep Blue
  ],
  // Forest/Nature gradients (earthy, natural)
  forest: [
    {
      l: 55.8,
      c: 0.169,
      h: 142.9,
    }, // Forest Green
    {
      l: 52.3,
      c: 0.135,
      h: 144.2,
    }, // Dark Green
    {
      l: 67.3,
      c: 0.162,
      h: 144.2,
    }, // Light Green
    {
      l: 57.5,
      c: 0.145,
      h: 144.2,
    }, // Green
  ],
  // Lavender/Dream gradients (soft, dreamy)
  lavender: [
    {
      l: 75.9,
      c: 0.068,
      h: 326.2,
    }, // Lavender
    {
      l: 64.5,
      c: 0.162,
      h: 321.6,
    }, // Purple
    {
      l: 57.6,
      c: 0.194,
      h: 321.6,
    }, // Deep Purple
    {
      l: 83.7,
      c: 0.069,
      h: 323,
    }, // Light Lavender
  ],
  // Fire/Ember gradients (intense, dynamic)
  fire: [
    {
      l: 67.9,
      c: 0.213,
      h: 36.5,
    }, // Deep Orange
    {
      l: 77,
      c: 0.174,
      h: 64.1,
    }, // Orange
    {
      l: 84.4,
      c: 0.172,
      h: 84.9,
    }, // Amber
    {
      l: 64.3,
      c: 0.215,
      h: 28.8,
    }, // Red
  ],
  // Midnight/Space gradients (mysterious, deep)
  midnight: [
    {
      l: 28.8,
      c: 0.144,
      h: 272.8,
    }, // Midnight Blue
    {
      l: 41.4,
      c: 0.125,
      h: 286,
    }, // Dark Slate Blue
    {
      l: 54.4,
      c: 0.171,
      h: 285.5,
    }, // Slate Blue
    {
      l: 60.4,
      c: 0.194,
      h: 285.5,
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
 * Generate a beautiful color from curated palette (returns oklch string)
 */
function randomColor(seed?: number): string {
  if (seed === undefined) {
    seed = Math.random() * 1000;
  }

  const palette = getColorPalette(seed);
  const colorIndex = Math.floor((Math.abs(Math.sin(seed * 2)) * 10000) % palette.length);
  const color = palette[colorIndex];

  // Add slight variation for more natural look
  const variation = 0.15;
  const lVariation = Math.sin(seed * 3) * variation;
  const cVariation = Math.sin(seed * 4) * variation;
  const hVariation = Math.sin(seed * 5) * 15; // ±15° hue shift

  const l = Math.max(0, Math.min(100, color.l * (1 + lVariation)));
  const c = Math.max(0, Math.min(0.4, color.c * (1 + cVariation)));
  const h = (((color.h + hVariation) % 360) + 360) % 360;

  return `oklch(${l.toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
}

/**
 * Add alpha to an oklch color string
 */
function withAlpha(color: string, alpha: number): string {
  return color.replace(")", ` / ${alpha})`);
}

/**
 * Get linear Display P3 float values (0-1) from a palette color for pixel manipulation
 */
function randomColorP3(seed?: number): [
  number,
  number,
  number,
] {
  if (seed === undefined) {
    seed = Math.random() * 1000;
  }

  const palette = getColorPalette(seed);
  const colorIndex = Math.floor((Math.abs(Math.sin(seed * 2)) * 10000) % palette.length);
  const color = palette[colorIndex];

  const variation = 0.15;
  const lVariation = Math.sin(seed * 3) * variation;
  const cVariation = Math.sin(seed * 4) * variation;
  const hVariation = Math.sin(seed * 5) * 15;

  const l = Math.max(0, Math.min(1, (color.l * (1 + lVariation)) / 100));
  const c = Math.max(0, Math.min(0.4, color.c * (1 + cVariation)));
  const h = (((((color.h + hVariation) % 360) + 360) % 360) * Math.PI) / 180;

  // OKLCH → Oklab
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  // Oklab → linear sRGB
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const ll = l_ * l_ * l_;
  const mm = m_ * m_ * m_;
  const ss = s_ * s_ * s_;

  // Linear sRGB → linear Display P3 (using sRGB-to-P3 matrix)
  const sr = +4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss;
  const sg = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss;
  const sb = -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss;

  // sRGB linear → Display P3 linear
  const pr = 0.8224621 * sr + 0.177538 * sg + 0.0 * sb;
  const pg = 0.0331942 * sr + 0.9668058 * sg + 0.0 * sb;
  const pb = 0.0170608 * sr + 0.072374 * sg + 0.9105652 * sb;

  return [
    Math.max(0, Math.min(1, pr)),
    Math.max(0, Math.min(1, pg)),
    Math.max(0, Math.min(1, pb)),
  ];
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
    ctx.fillStyle = withAlpha(color, alpha);
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

    ctx.fillStyle = withAlpha(color, alpha);
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

  // Draw noise using float16 P3 pixel data
  const imageData = ctx.createImageData(width, height, {
    colorSpace: "display-p3",
    pixelFormat: "rgba-float16",
  });
  const data = imageData.data;
  const [baseR, baseG, baseB] = randomColorP3(random() * 1000);

  for (let i = 0; i < data.length; i += 4) {
    const noise = (random() - 0.5) * 0.2; // ±0.1 in 0-1 range
    data[i] = Math.max(0, Math.min(1, baseR + noise)); // R
    data[i + 1] = Math.max(0, Math.min(1, baseG + noise)); // G
    data[i + 2] = Math.max(0, Math.min(1, baseB + noise)); // B
    data[i + 3] = random() * 0.4 + 0.2; // A
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

    ctx.strokeStyle = withAlpha(color, alpha);
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
    ctx.fillStyle = withAlpha(color, alpha);
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

    ctx.strokeStyle = withAlpha(color, alpha);
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

    ctx.fillStyle = withAlpha(color, alpha);
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
