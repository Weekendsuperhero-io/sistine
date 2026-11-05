"use client";

/**
 * RESEARCH ONLY: GPU ports of two CanvasBackground styles, for the energy comparison in
 * docs/research/2026-11-04-webgpu-energy.md. Not part of the library.
 *
 * Each port draws what the 2D canvas draws, from the same inputs:
 *   - the same palette (the tonal ramp around the live tint, banded for readable text), resolved to
 *     Display-P3 by a 1×1 canvas so both pipelines start from identical bytes;
 *   - the same geometry: lava's blobs come from the same seeded generator, in the same call order;
 *   - the same backing size (window × devicePixelRatio, capped at 2) and the same ~30 fps cap.
 * The one deliberate difference is lava's blur. The 2D canvas fills discs into an offscreen canvas and
 * blurs the whole frame (`filter: blur(54px × dpr)`). A GPU version evaluates the blurred edge per pixel
 * instead (a disc convolved with a Gaussian is the normal CDF of the distance to its edge), which is how
 * the effect would be written for a GPU. Overlaps blend in draw order rather than being blurred together.
 */

import * as React from "react";
import { backdropPalette, backdropReadableBand, useBackdropTint } from "@/lib/canvas-background-utils";
import { fitToBand, formatOklch, parseOklch, rampAxisColors } from "@/lib/oklch-utils";

export type GpuApi = "webgl2" | "webgpu";
export type GpuStyle = "gradient" | "lava";

/** Frames drawn by any GPU port, read by the bench to report the achieved frame rate. */
export const gpuFrames = {
  count: 0,
};

const STEPS = 6;
const ANGLE = 90;
const SPEED = 1;
const SEED = "sistine";
const MAX_STOPS = 48; // 4 × the 12-step maximum: the ping-ponged gradient ramp
const MAX_BLOBS = 32;

type Rgb = [
  number,
  number,
  number,
];

/** A CSS colour as Display-P3 floats, through the same rasteriser the 2D canvas uses. */
function toP3(css: string): Rgb {
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 1;
  const x = c.getContext("2d", {
    colorSpace: "display-p3",
    willReadFrequently: true,
  });
  if (!x)
    return [
      0,
      0,
      0,
    ];
  x.fillStyle = css;
  x.fillRect(0, 0, 1, 1);
  const d = x.getImageData(0, 0, 1, 1, {
    colorSpace: "display-p3",
  }).data;
  return [
    d[0] / 255,
    d[1] / 255,
    d[2] / 255,
  ];
}

/** CanvasBackground's palette for the live tint (createCanvas's colour branch, unchanged). */
function palette(tint: ReturnType<typeof useBackdropTint>) {
  const { base, frescoColors } = backdropPalette(tint);
  const band = backdropReadableBand(tint.fg, tint.dark, base);
  let colors: string[];
  if (frescoColors && frescoColors.length > 1) {
    colors = band
      ? frescoColors.map((css) => {
          const p = parseOklch(css);
          return p
            ? formatOklch({
                ...p,
                l: Math.min(band.lMax, Math.max(band.lMin, p.l)),
              })
            : css;
        })
      : frescoColors;
  } else {
    const ramp = rampAxisColors("tonal", base, STEPS, tint.p3 ? "p3" : "srgb");
    colors = (band ? fitToBand(ramp, band) : ramp).map((c) => formatOklch(c));
  }
  return {
    base,
    colors,
  };
}

/** createCanvas's seeded PRNG, so the blobs land where the 2D canvas puts them. */
function seededRandom(seed: string): () => number {
  let value = 0;
  for (let i = 0; i < seed.length; i++) {
    value = (value << 5) - value + seed.charCodeAt(i);
    value = value & value;
  }
  let s = Math.abs(value) || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Uniform data for one style, as one Float32Array in the WGSL struct's layout (GLSL reads the same). */
function sceneData(
  style: GpuStyle,
  tint: ReturnType<typeof useBackdropTint>,
  w: number,
  h: number,
  dpr: number,
): {
  data: Float32Array;
  tOffset: number;
} {
  const { base, colors } = palette(tint);
  if (style === "gradient") {
    // struct { res: vec2f, phase0, speed, line: vec4f, t, m, pad: vec2f, colors: array<vec4f, 48> }
    const cyc =
      colors.length > 2
        ? [
            ...colors,
            ...colors.slice(1, -1).reverse(),
          ]
        : colors;
    const m = cyc.length;
    const rad = ((ANGLE - 90) * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
    const data = new Float32Array(12 + MAX_STOPS * 4);
    data.set([
      w,
      h,
      0.5 - Math.floor(colors.length / 2) / m,
      SPEED,
      w / 2 - dx * half,
      h / 2 - dy * half,
      w / 2 + dx * half,
      h / 2 + dy * half,
      0,
      m,
    ]);
    cyc.forEach((css, i) =>
      data.set(
        [
          ...toP3(css),
          1,
        ],
        12 + i * 4,
      ),
    );
    return {
      data,
      tOffset: 8,
    };
  }
  // struct { res: vec2f, t, speed, bgTop: vec4f, bgBottom: vec4f, sigma, alpha, n, pad, a/b/c: array<vec4f, 32> }
  const random = seededRandom(SEED);
  const minDim = Math.min(w, h);
  const n = Math.min(MAX_BLOBS, Math.max(colors.length, 6));
  const data = new Float32Array(16 + MAX_BLOBS * 12);
  data.set([
    w,
    h,
    0,
    SPEED,
    ...toP3(formatOklch(base)),
    1,
    ...toP3(
      formatOklch({
        l: Math.max(12, base.l * 0.72),
        c: base.c,
        h: base.h,
      }),
    ),
    1,
    54 * dpr,
    0.82,
    n,
    0,
  ]);
  for (let i = 0; i < n; i++) {
    // Same object-literal order as makeLava: baseX, baseY, r, ampX, ampY, spd, phase.
    const baseX = random() * w;
    const baseY = random() * h;
    const r = (random() * 0.14 + 0.13) * minDim;
    const ampX = (random() * 0.05 + 0.03) * w;
    const ampY = (random() * 0.16 + 0.12) * h;
    const spd = random() * 0.16 + 0.05;
    const phase = random() * Math.PI * 2;
    data.set(
      [
        baseX,
        baseY,
        r,
        ampX,
      ],
      16 + i * 4,
    );
    data.set(
      [
        ampY,
        spd,
        phase,
        0,
      ],
      16 + MAX_BLOBS * 4 + i * 4,
    );
    data.set(
      [
        ...toP3(colors[i % colors.length]),
        1,
      ],
      16 + MAX_BLOBS * 8 + i * 4,
    );
  }
  return {
    data,
    tOffset: 2,
  };
}

/* ── Shaders. One body per style, written twice (WGSL, GLSL) with the same arithmetic. Pixel space
   matches the 2D canvas: device pixels, origin top-left, y down. ── */

const WGSL = {
  gradient: /* wgsl */ `
struct U { res: vec2f, phase0: f32, speed: f32, line: vec4f, t: f32, m: f32, pad: vec2f, colors: array<vec4f, ${MAX_STOPS}> };
@group(0) @binding(0) var<uniform> u: U;
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let d = u.line.zw - u.line.xy;
  let along = clamp(dot(pos.xy - u.line.xy, d) / dot(d, d), 0.0, 1.0);
  let phase = fract(u.phase0 + u.t * u.speed * 0.05);
  let s = fract(along - phase) * u.m;
  let k = u32(floor(s)) % u32(u.m);
  let c = mix(u.colors[k], u.colors[(k + 1u) % u32(u.m)], fract(s));
  return vec4f(c.rgb, 1.0);
}`,
  lava: /* wgsl */ `
struct U { res: vec2f, t: f32, speed: f32, bgTop: vec4f, bgBottom: vec4f, sigma: f32, alpha: f32, n: f32, pad: f32,
  a: array<vec4f, ${MAX_BLOBS}>, b: array<vec4f, ${MAX_BLOBS}>, c: array<vec4f, ${MAX_BLOBS}> };
@group(0) @binding(0) var<uniform> u: U;
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let bg = mix(u.bgTop.rgb, u.bgBottom.rgb, pos.y / u.res.y);
  let tt = u.t * u.speed;
  var p = vec3f(0.0);
  var a = 0.0;
  for (var i = 0u; i < u32(u.n); i++) {
    let A = u.a[i]; let B = u.b[i];
    let center = vec2f(A.x + sin(tt * B.y + B.z) * A.w, A.y + cos(tt * B.y * 0.8 + B.z) * B.x);
    let r = A.z * (1.0 + sin(tt * B.y * 1.5 + B.z) * 0.12);
    let cover = 1.0 / (1.0 + exp(1.702 * (distance(pos.xy, center) - r) / u.sigma));
    p = p * (1.0 - cover) + u.c[i].rgb * cover;
    a = a * (1.0 - cover) + cover;
  }
  return vec4f(bg * (1.0 - u.alpha * a) + u.alpha * p, 1.0);
}`,
};

const WGSL_VERTEX = /* wgsl */ `
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let xy = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
}`;

const GLSL = {
  gradient: `#version 300 es
precision highp float;
uniform vec4 u_head[3]; // res.xy phase0 speed | line | t m - -
uniform vec4 u_colors[${MAX_STOPS}];
out vec4 o;
void main() {
  vec2 res = u_head[0].xy;
  vec2 pos = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y);
  vec4 line = u_head[1];
  vec2 d = line.zw - line.xy;
  float along = clamp(dot(pos - line.xy, d) / dot(d, d), 0.0, 1.0);
  float phase = fract(u_head[0].z + u_head[2].x * u_head[0].w * 0.05);
  float m = u_head[2].y;
  float s = fract(along - phase) * m;
  int k = int(floor(s)) % int(m);
  vec4 c = mix(u_colors[k], u_colors[(k + 1) % int(m)], fract(s));
  o = vec4(c.rgb, 1.0);
}`,
  lava: `#version 300 es
precision highp float;
uniform vec4 u_head[4]; // res.xy t speed | bgTop | bgBottom | sigma alpha n -
uniform vec4 u_a[${MAX_BLOBS}];
uniform vec4 u_b[${MAX_BLOBS}];
uniform vec4 u_c[${MAX_BLOBS}];
out vec4 o;
void main() {
  vec2 res = u_head[0].xy;
  vec2 pos = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y);
  vec3 bg = mix(u_head[1].rgb, u_head[2].rgb, pos.y / res.y);
  float tt = u_head[0].z * u_head[0].w;
  float sigma = u_head[3].x;
  vec3 p = vec3(0.0);
  float a = 0.0;
  int n = int(u_head[3].z);
  for (int i = 0; i < ${MAX_BLOBS}; i++) {
    if (i >= n) break;
    vec4 A = u_a[i]; vec4 B = u_b[i];
    vec2 center = vec2(A.x + sin(tt * B.y + B.z) * A.w, A.y + cos(tt * B.y * 0.8 + B.z) * B.x);
    float r = A.z * (1.0 + sin(tt * B.y * 1.5 + B.z) * 0.12);
    float cover = 1.0 / (1.0 + exp(1.702 * (distance(pos, center) - r) / sigma));
    p = p * (1.0 - cover) + u_c[i].rgb * cover;
    a = a * (1.0 - cover) + cover;
  }
  o = vec4(bg * (1.0 - u_head[3].y * a) + u_head[3].y * p, 1.0);
}`,
};

const GLSL_VERTEX = `#version 300 es
void main() {
  vec2 xy = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(xy * 2.0 - 1.0, 0.0, 1.0);
}`;

type Renderer = {
  draw: (t: number) => void;
  destroy: () => void;
};

function webgl2(canvas: HTMLCanvasElement, style: GpuStyle, data: Float32Array, tOffset: number, preserve = false): Renderer | null {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: preserve,
  });
  if (!gl) return null;
  gl.drawingBufferColorSpace = "display-p3";
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) throw new Error("createShader failed");
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader error");
    return s;
  };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, GLSL_VERTEX));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, GLSL[style]));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link error");
  // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook.
  gl.useProgram(program);
  gl.bindVertexArray(gl.createVertexArray());
  gl.viewport(0, 0, canvas.width, canvas.height);
  // The same floats as the WGSL struct, sliced into the GLSL uniform arrays.
  const vec4s = (from: number, count: number) => data.subarray(from, from + count * 4);
  const head = gl.getUniformLocation(program, "u_head");
  if (style === "gradient") {
    gl.uniform4fv(head, vec4s(0, 3));
    gl.uniform4fv(gl.getUniformLocation(program, "u_colors"), vec4s(12, MAX_STOPS));
  } else {
    gl.uniform4fv(head, vec4s(0, 4));
    gl.uniform4fv(gl.getUniformLocation(program, "u_a"), vec4s(16, MAX_BLOBS));
    gl.uniform4fv(gl.getUniformLocation(program, "u_b"), vec4s(16 + MAX_BLOBS * 4, MAX_BLOBS));
    gl.uniform4fv(gl.getUniformLocation(program, "u_c"), vec4s(16 + MAX_BLOBS * 8, MAX_BLOBS));
  }
  const headLen = style === "gradient" ? 3 : 4;
  return {
    draw: (t) => {
      data[tOffset] = t;
      gl.uniform4fv(head, vec4s(0, headLen));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    // Not loseContext(): the canvas outlives the effect, and getContext() would hand the next run the
    // same, now lost, context (the effect re-runs once the theme tint has been read).
    destroy: () => gl.deleteProgram(program),
  };
}

async function webgpu(canvas: HTMLCanvasElement, style: GpuStyle, data: Float32Array, tOffset: number): Promise<Renderer | null> {
  const adapter = await navigator.gpu?.requestAdapter({
    powerPreference: "low-power",
  });
  if (!adapter) return null;
  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu") as GPUCanvasContext | null;
  if (!context) return null;
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: "opaque",
    colorSpace: "display-p3",
  });
  const module = device.createShaderModule({
    code: WGSL_VERTEX + WGSL[style],
  });
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module,
      entryPoint: "vs",
    },
    fragment: {
      module,
      entryPoint: "fs",
      targets: [
        {
          format,
        },
      ],
    },
  });
  // GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST (the enum objects are not in TypeScript's DOM lib).
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage: 0x40 | 0x08,
  });
  device.queue.writeBuffer(buffer, 0, data);
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer,
        },
      },
    ],
  });
  const t = new Float32Array(1);
  return {
    draw: (seconds) => {
      t[0] = seconds;
      device.queue.writeBuffer(buffer, tOffset * 4, t);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: {
              r: 0,
              g: 0,
              b: 0,
              a: 1,
            },
          },
        ],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();
      device.queue.submit([
        encoder.finish(),
      ]);
    },
    destroy: () => {
      context.unconfigure();
      device.destroy();
    },
  };
}

/** A full-window GPU background, animated at ~30 fps like CanvasBackground, or one still frame. */
export function GpuBackground({
  api,
  style,
  animated = true,
  preserve = false,
}: {
  api: GpuApi;
  style: GpuStyle;
  animated?: boolean;
  /** Keep WebGL's drawing buffer so the bench's compare view can copy a still frame out of it. */
  preserve?: boolean;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const tint = useBackdropTint();
  const [failed, setFailed] = React.useState<string | null>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    const { data, tOffset } = sceneData(style, tint, canvas.width, canvas.height, dpr);
    let renderer: Renderer | null = null;
    let frame = 0;
    let cancelled = false;
    const start = async () => {
      try {
        renderer = api === "webgl2" ? webgl2(canvas, style, data, tOffset, preserve) : await webgpu(canvas, style, data, tOffset);
      } catch (e) {
        setFailed(String(e));
        return;
      }
      if (cancelled) return renderer?.destroy();
      if (!renderer) return setFailed(`${api} unavailable`);
      const r = renderer;
      if (!animated) return r.draw(0);
      let last = 0;
      const paint = (now: number) => {
        if (now - last >= 33) {
          // CanvasBackground's ~30 fps cap
          last = now;
          r.draw(now / 1000);
          gpuFrames.count++;
        }
        // Scheduled after the draw, so a draw that throws ends the loop rather than rethrowing every frame.
        frame = requestAnimationFrame(paint);
      };
      frame = requestAnimationFrame(paint);
    };
    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      renderer?.destroy();
    };
  }, [
    api,
    style,
    animated,
    preserve,
    tint,
  ]);

  return (
    <>
      <canvas ref={ref} className="fixed inset-0 -z-10 glass-backdrop-layer pointer-events-none h-full w-full" data-gpu={api} />
      {failed ? <p className="fixed bottom-2 left-2 text-sm text-red-500">{failed}</p> : null}
    </>
  );
}
