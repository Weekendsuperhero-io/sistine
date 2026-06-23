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
   * Pattern type: 'gradient', 'circles', 'blobs'
   */
  pattern?: "gradient" | "circles" | "blobs";
  /**
   * Seed for consistent generation (optional)
   */
  seed?: string;
  /**
   * Animation speed (0 = static, higher = faster)
   */
  animationSpeed?: number;
  /**
   * Device pixel ratio the target canvas is backed at — scales blur radii so the gooey metaball
   * filter looks the same at any backing resolution. Default 1.
   */
  dpr?: number;
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

/**
 * Lava-lamp / metaball field. Returns `step(ctx, t)` which paints slowly drifting, pulsing
 * blobs that merge gooily — drawn solid onto an offscreen layer, then composited through a
 * blur()+contrast() filter so overlapping blobs fuse with metaball "necks". Drive it per
 * frame for animation, or call once at t=0 for a static frame. Used by the "blobs" pattern.
 */
export function createLavaLamp(config: CanvasConfig = {}): {
  step: (ctx: CanvasRenderingContext2D, t: number) => void;
} {
  const width = config.width ?? (typeof window !== "undefined" ? window.innerWidth : 1920);
  const height = config.height ?? (typeof window !== "undefined" ? window.innerHeight : 1080);
  const colorCount = config.colorCount ?? 5;
  const random = config.seed ? seededRandom(config.seed) : () => Math.random();

  const dpr = config.dpr ?? 1;
  const paletteSeed = random() * 1000;
  const bgHue = (paletteSeed * 0.37) % 360;
  // Deep, colored jewel-tone backdrop (not near-black) so it reads as theme-adjacent.
  const bgTop = `oklch(28% 0.06 ${bgHue.toFixed(1)})`;
  const bgBottom = `oklch(19% 0.07 ${((bgHue + 40) % 360).toFixed(1)})`;

  const minDim = Math.min(width, height);
  const blobCount = Math.max(5, colorCount + 2);
  const blobs = Array.from(
    {
      length: blobCount,
    },
    (_, i) => ({
      baseX: random() * width,
      baseY: random() * height,
      r: (random() * 0.14 + 0.13) * minDim,
      ampX: (random() * 0.05 + 0.03) * width,
      ampY: (random() * 0.16 + 0.12) * height,
      speed: random() * 0.16 + 0.05,
      phase: random() * Math.PI * 2,
      color: randomColor(paletteSeed + i * 13 + 9),
    }),
  );

  // Blobs are drawn opaque here, then composited through the gooey filter onto the target.
  const off = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (off) {
    off.width = width;
    off.height = height;
  }
  const offCtx =
    off?.getContext("2d", {
      colorSpace: "display-p3",
    }) ?? null;

  return {
    step: (ctx, t) => {
      // Deep, colored backdrop straight onto the target — drawn WITHOUT the blur/contrast filter so
      // it stays a jewel tone instead of being crushed to black.
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, bgTop);
      grad.addColorStop(1, bgBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      if (!off || !offCtx) return;

      // Blobs on a transparent layer, then composited back through a soft, dpr-scaled blur so they
      // read as glowing, merging lava. (The old blur(34px)+contrast(11) snapped overlaps into harsh,
      // aliased edges that looked pixelated — replaced with a soft glow.)
      offCtx.clearRect(0, 0, width, height);
      for (const b of blobs) {
        const x = b.baseX + Math.sin(t * b.speed + b.phase) * b.ampX;
        const y = b.baseY + Math.cos(t * b.speed * 0.8 + b.phase) * b.ampY;
        const r = b.r * (1 + Math.sin(t * b.speed * 1.5 + b.phase) * 0.12);
        offCtx.beginPath();
        offCtx.arc(x, y, r, 0, Math.PI * 2);
        offCtx.fillStyle = b.color;
        offCtx.fill();
      }

      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.filter = `blur(${(54 * dpr).toFixed(0)}px)`;
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    },
  };
}
