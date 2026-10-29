#!/usr/bin/env node
/**
 * Exports the pattern scenes as still images or seamless video loops: every scene, in light and dark, at
 * every sun / moon placement for the horizon scenes, at the sizes you ask for. Wallpapers, in short.
 *
 * The scenes are live CSS and inline SVG (masks, blurs, blend), which no in-page rasterizer paints
 * faithfully, so this drives a real headless Chrome over the DevTools protocol and photographs the
 * /backdrop route (one scene, full-viewport, over the site chrome). No dependencies: Node's own fetch and
 * WebSocket speak to the browser. Theme, tint and accent are seeded into a throwaway profile's storage,
 * so each frame is what a visitor with those settings sees.
 *
 * Needs a running site: `bun run dev` (or `bun run build && bun run start`).
 *
 *   bun run export:backgrounds                                  every scene, light + dark, 3840×2160 PNG
 *   bun run export:backgrounds --scenes forest,aurora --disc center
 *   bun run export:backgrounds --size desktop,phone --tint lapis,aurora --format webp
 *   bun run export:backgrounds --size 2560x1440@1 --modes dark --accent 330/0.16
 *   bun run export:backgrounds --format mp4 --scenes aurora --disc center      video loops (needs ffmpeg)
 *
 * VIDEO (--format mp4 | webm) steps time rather than recording it: every CSS animation on the page is
 * paused and set to each frame's time in turn, so no frame is dropped and the timing is exact however
 * slow the capture. Every loop is seamless, chosen per scene:
 *   - its own cycle, when all its animations share one of at most --max-loop seconds (synthwave: 8s);
 *   - otherwise RETIMED: a loop length of at most --max-loop seconds into which every animation fits a
 *     whole number of its cycles once its speed is nudged, picked so the largest nudge is smallest. At
 *     the defaults no scene needs more than 1.6× (forest's slowest fog); the factors are printed;
 *   - and only when that would stretch some animation past --max-stretch, --duration seconds whose last
 *     --fade seconds are crossfaded into the start (which double-exposes anything that moved meanwhile).
 * Only the animated scenes move, so the static ones are skipped unless asked for by name. Long loops take
 * a while: every frame is a screenshot, about 5–8 per second at 1920×1080.
 *
 * Options (comma lists where plural):
 *   --scenes   scene names (default: all, read from components/pattern-background.tsx)
 *   --modes    light,dark (default: both)
 *   --disc     sun / moon placements for the horizon scenes: right,center,left (default: all three)
 *   --size     WxH[@scale] in CSS pixels, or a preset: desktop (1920x1080@2), laptop (1512x982@2),
 *              ultrawide (3440x1440@1), tablet (1180x820@2), phone (430x932@3). Default: desktop.
 *              CSS size sets the composition (the scenes are laid out in vh); scale sets the pixel density.
 *   --tint     tint presets from the switcher (default: amethyst, the site default)
 *   --accent   hue[/chroma] to pin the accent, e.g. 330 or 330/0.16 (default: off)
 *   --density  sparse | medium | dense (dots, grid, mesh, starfield, chase; default: medium)
 *   --sand     breeze | storm | still (dune; default: breeze)
 *   --format   png | webp | jpeg for stills (default: png); --quality 0-100 for webp / jpeg (default: 92)
 *              mp4 (H.264) | webm (VP9) for video loops, which default to --size 1920x1080@1
 *   --speed    video: the scene's loop pace in seconds, as the site's speed control (default: 8)
 *   --fps      video: frames per second (default: 30)
 *   --max-loop video: the longest loop, in seconds (default: 60)
 *   --max-stretch  video: the largest speed factor a retimed loop may apply, either way (default: 1.75)
 *   --duration video: crossfaded loops only, their length in seconds (default: 12)
 *   --fade     video: crossfaded loops only, the crossfade in seconds (default: 2)
 *   --ffmpeg   video: the ffmpeg binary (default: FFMPEG_PATH, then ffmpeg on the PATH)
 *   --url      the running site (default: http://localhost:3000)
 *   --out      output folder (default: exports/backgrounds), one subfolder per tint
 *   --chrome   the Chrome / Chromium / Edge binary (default: CHROME_PATH, then the usual install paths,
 *              then Playwright's cached Chromium)
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const { values: opt } = parseArgs({
  options: {
    scenes: { type: "string" },
    modes: { type: "string", default: "light,dark" },
    disc: { type: "string", default: "right,center,left" },
    size: { type: "string" },
    tint: { type: "string", default: "amethyst" },
    accent: { type: "string" },
    density: { type: "string", default: "medium" },
    sand: { type: "string", default: "breeze" },
    format: { type: "string", default: "png" },
    quality: { type: "string", default: "92" },
    speed: { type: "string", default: "8" },
    fps: { type: "string", default: "30" },
    duration: { type: "string", default: "12" },
    fade: { type: "string", default: "2" },
    "max-loop": { type: "string", default: "60" },
    "max-stretch": { type: "string", default: "1.75" },
    ffmpeg: { type: "string" },
    url: { type: "string", default: "http://localhost:3000" },
    out: { type: "string", default: "exports/backgrounds" },
    chrome: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

if (opt.help) {
  const src = readFileSync(fileURLToPath(import.meta.url), "utf8");
  console.log(src.slice(src.indexOf("/**") + 3, src.indexOf("*/")).replace(/^ \* ?/gm, ""));
  process.exit(0);
}

const list = (s) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/** The `item` captures inside the first region of `file` matching `re` (quoted lowercase names by default,
 *  as check-patterns reads them). */
function names(file, re, label, item = /"([a-z-]+)"/g) {
  const m = readFileSync(join(root, file), "utf8").match(re);
  if (!m) throw new Error(`could not locate ${label} in ${file}`);
  return [...m[1].matchAll(item)].map((x) => x[1]);
}
const SCENES = names("components/pattern-background.tsx", /export const PATTERN_STYLES: PatternStyle\[\] = \[([\s\S]*?)\];/, "PATTERN_STYLES");
const ANIMATED_SCENES = names(
  "components/pattern-background.tsx",
  /export const ANIMATED_PATTERNS = new Set<PatternStyle>\(\[([\s\S]*?)\]\)/,
  "ANIMATED_PATTERNS",
);
const DISC_SCENES = names("components/pattern-background.tsx", /export const DISC_PATTERNS = new Set<PatternStyle>\(\[([\s\S]*?)\]\)/, "DISC_PATTERNS");
const TINTS = names("lib/glass-presets.ts", /const GLASS_TINT_PRESETS = \[([\s\S]*?)\n\] as const;/, "GLASS_TINT_PRESETS", /value: "([a-z-]+)"/g);

const SIZES = {
  desktop: "1920x1080@2",
  laptop: "1512x982@2",
  ultrawide: "3440x1440@1",
  tablet: "1180x820@2",
  phone: "430x932@3",
};

function choose(flag, given, allowed) {
  const bad = given.filter((x) => !allowed.includes(x));
  if (bad.length) throw new Error(`--${flag}: unknown ${bad.join(", ")} (one of: ${allowed.join(", ")})`);
  return given;
}

function size(spec) {
  const m = /^(\d+)x(\d+)(?:@(\d+(?:\.\d+)?))?$/.exec(SIZES[spec] ?? spec);
  if (!m) throw new Error(`--size: "${spec}" is not WxH[@scale] or one of ${Object.keys(SIZES).join(", ")}`);
  return { width: Number(m[1]), height: Number(m[2]), scale: Number(m[3] ?? 1) };
}

function accent(spec) {
  if (!spec) return null;
  const [h, c = "0.15"] = spec.split("/");
  if (!Number.isFinite(Number(h)) || !Number.isFinite(Number(c))) throw new Error(`--accent: "${spec}" is not hue[/chroma]`);
  return { on: true, h: Number(h), c: Number(c) };
}

function seconds(flag, min) {
  const n = Number(opt[flag]);
  if (!Number.isFinite(n) || n < min) throw new Error(`--${flag}: "${opt[flag]}" is not a number of at least ${min}`);
  return n;
}

const format = choose("format", [opt.format], ["png", "webp", "jpeg", "mp4", "webm"])[0];
const video = format === "mp4" || format === "webm";
const scenes = choose("scenes", opt.scenes ? list(opt.scenes) : SCENES, SCENES);
const plan = {
  scenes: video ? scenes.filter((s) => ANIMATED_SCENES.includes(s)) : scenes,
  stills: video ? scenes.filter((s) => !ANIMATED_SCENES.includes(s)) : [],
  modes: choose("modes", list(opt.modes), ["light", "dark"]),
  discs: choose("disc", list(opt.disc), ["right", "center", "left"]),
  sizes: list(opt.size ?? (video ? "1920x1080@1" : "desktop")).map(size),
  tints: choose("tint", list(opt.tint), TINTS),
  accent: accent(opt.accent),
  density: choose("density", [opt.density], ["sparse", "medium", "dense"])[0],
  sand: choose("sand", [opt.sand], ["breeze", "storm", "still"])[0],
  format,
  video,
  quality: Number(opt.quality),
  speed: video ? seconds("speed", 1) : 0,
  fps: seconds("fps", 1),
  duration: seconds("duration", 1),
  fade: seconds("fade", 0),
  maxLoop: seconds("max-loop", 1),
  maxStretch: seconds("max-stretch", 1),
  out: resolve(root, opt.out),
};

/** The first browser binary that exists: the flag, CHROME_PATH, the usual installs, then Playwright's cache. */
function findChrome() {
  const given = opt.chrome ?? process.env.CHROME_PATH;
  if (given) {
    if (!existsSync(given)) throw new Error(`no browser at ${given}`);
    return given;
  }
  const pf = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean);
  const installs = {
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    ],
    linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium"],
    win32: pf.flatMap((p) => [join(p, "Google/Chrome/Application/chrome.exe"), join(p, "Microsoft/Edge/Application/msedge.exe")]),
  }[process.platform] ?? [];
  const playwright =
    process.env.PLAYWRIGHT_BROWSERS_PATH ??
    {
      darwin: join(homedir(), "Library/Caches/ms-playwright"),
      win32: join(process.env.LOCALAPPDATA ?? "", "ms-playwright"),
    }[process.platform] ??
    join(homedir(), ".cache/ms-playwright");
  const cached = existsSync(playwright)
    ? readdirSync(playwright)
        .filter((d) => /^chromium-\d+$/.test(d))
        .sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)))
        .flatMap((d) =>
          [
            "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
            "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
            "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
            "chrome-linux64/chrome",
            "chrome-linux/chrome",
            "chrome-win64/chrome.exe",
            "chrome-win/chrome.exe",
          ].map((p) => join(playwright, d, p)),
        )
    : [];
  const found = [...installs, ...cached].find((p) => existsSync(p));
  if (!found) throw new Error("no Chrome, Chromium or Edge found: pass --chrome <binary> or set CHROME_PATH");
  return found;
}

/** ffmpeg, checked before anything is captured: the flag, FFMPEG_PATH, then the PATH. */
function findFfmpeg() {
  const bin = opt.ffmpeg ?? process.env.FFMPEG_PATH ?? "ffmpeg";
  if (spawnSync(bin, ["-version"], { stdio: "ignore" }).status !== 0) {
    throw new Error(`video needs ffmpeg and ${bin} did not run: install it (brew install ffmpeg) or pass --ffmpeg <binary>`);
  }
  return bin;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A DevTools-protocol session: send(method, params) → result, once(event) → its params. */
async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((ok, fail) => {
    ws.addEventListener("open", ok, { once: true });
    ws.addEventListener("error", () => fail(new Error(`could not connect to ${url}`)), { once: true });
  });
  let seq = 0;
  const pending = new Map();
  const waiting = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { resolve: ok, reject, method } = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) reject(new Error(`${method}: ${m.error.message}`));
      else ok(m.result);
    } else if (m.method && waiting.has(m.method)) {
      for (const fn of waiting.get(m.method)) fn(m.params);
      waiting.delete(m.method);
    }
  });
  return {
    send: (method, params = {}) =>
      new Promise((ok, reject) => {
        const id = ++seq;
        pending.set(id, { resolve: ok, reject, method });
        ws.send(JSON.stringify({ id, method, params }));
      }),
    once: (method) => new Promise((ok) => waiting.set(method, [...(waiting.get(method) ?? []), ok])),
    close: () => ws.close(),
  };
}

/* Runs before any page script on every navigation, so next-themes and the tint switcher restore these
   exactly as they would a returning visitor's choices. */
const seed = (tint, mode) => `try {
  localStorage.setItem("theme", ${JSON.stringify(mode)});
  localStorage.setItem("sistine-glass-tint", ${JSON.stringify(tint)});
  ${plan.accent ? `localStorage.setItem("sistine-accent", ${JSON.stringify(JSON.stringify(plan.accent))});` : 'localStorage.removeItem("sistine-accent");'}
} catch {}`;

/* Waits for the scene, then past the 500ms colour transition the tint's inline vars start when they land
   after hydration, and reports what actually applied. The dev-build indicator is hidden from the frame. */
const ready = (scene) => `(async () => {
  const until = Date.now() + 30000;
  while (!document.querySelector('[data-backdrop="${scene}"] [data-pattern]')) {
    if (Date.now() > until) return { ok: false };
    await new Promise((r) => setTimeout(r, 100));
  }
  const hide = document.createElement("style");
  hide.textContent = "nextjs-portal { display: none !important; }";
  document.head.append(hide);
  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 900));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const html = document.documentElement;
  return { ok: true, dark: html.classList.contains("dark"), tint: html.dataset.glassTint ?? null };
})()`;

/* Video: takes every CSS animation off the clock. Transitions are finished; animations are paused, and
   __seek(ms) sets each to ms × its rate in __rates (1 until a retimed loop sets them) and resolves once
   that has been painted. Returns each running animation's full cycle in ms (an alternating one only
   repeats after going there and back), or null for one that ends. */
const FREEZE = `(() => {
  const all = document.getAnimations();
  for (const a of all) if (a instanceof CSSTransition) a.finish();
  const running = all.filter((a) => !(a instanceof CSSTransition));
  for (const a of running) a.pause();
  window.__rates = running.map(() => 1);
  window.__seek = (ms) => {
    running.forEach((a, i) => {
      a.currentTime = ms * window.__rates[i];
    });
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  };
  return running.map((a) => {
    const t = a.effect.getComputedTiming();
    if (t.iterations !== Infinity) return null;
    return (String(t.direction).includes("alternate") ? 2 : 1) * t.duration;
  });
})()`;

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** The scene's common cycle in ms (every animation back where it started), if one exists within --max-loop
 *  and lands on a whole frame. */
function commonCycle(cycles) {
  const tick = 10;
  let lcm = 1;
  for (const cycle of cycles) {
    const n = Math.round(cycle / tick);
    if (n < 1 || Math.abs(n * tick - cycle) > 0.5) return null;
    lcm = (lcm * n) / gcd(lcm, n);
    if (lcm * tick > plan.maxLoop * 1000) return null;
  }
  return Number.isInteger((lcm * tick * plan.fps) / 1000) ? lcm * tick : null;
}

/** How to loop a scene whose animations have these cycles (ms; null = one that ends, left alone). */
function loopPlan(cycles) {
  const same = cycles.map(() => 1);
  const periodic = cycles.filter(Boolean);
  if (!periodic.length) return { length: plan.duration, rates: same, fade: plan.fade, kind: "crossfaded loop (nothing repeats)" };
  const cycle = commonCycle(periodic);
  if (cycle) return { length: cycle / 1000, rates: same, fade: 0, kind: "exact loop" };
  // Retimed: try every whole-frame length; each animation takes the whole number of its cycles nearest
  // the length (by ratio), and the length whose worst nudge is smallest wins.
  let best = null;
  for (let n = Math.ceil(8 * plan.fps); n <= plan.maxLoop * plan.fps; n++) {
    const length = (n * 1000) / plan.fps;
    let worst = 0;
    const rates = cycles.map((c) => {
      if (!c) return 1;
      const k = Math.max(1, Math.floor(length / c));
      const rate = [k, k + 1].map((m) => (m * c) / length).reduce((a, b) => (Math.abs(Math.log(b)) < Math.abs(Math.log(a)) ? b : a));
      worst = Math.max(worst, Math.abs(Math.log(rate)));
      return rate;
    });
    if (!best || worst < best.worst - 1e-9) best = { length: length / 1000, rates, worst };
  }
  if (Math.exp(best.worst) <= plan.maxStretch) {
    const used = best.rates.filter((_, i) => cycles[i]);
    const span = `×${Math.min(...used).toFixed(2)}–×${Math.max(...used).toFixed(2)}`;
    return { length: best.length, rates: best.rates, fade: 0, kind: `retimed loop, speeds ${span}` };
  }
  return { length: plan.duration, rates: same, fade: plan.fade, kind: `crossfaded loop (a retime needed ×${Math.exp(best.worst).toFixed(2)})` };
}

/** Encodes frames 0…n-1 of `dir` into `file`. With `fade` extra frames past the loop, the start is
 *  crossfaded from them (frame i blends frame n+i into frame i), so the last frame runs into the first. */
function encode(ffmpeg, dir, frames, fade, file) {
  const input = (start) => ["-framerate", String(plan.fps), "-start_number", String(start), "-i", join(dir, "%05d.png")];
  const even = "scale=trunc(iw/2)*2:trunc(ih/2)*2:out_color_matrix=bt709:out_range=tv,format=yuv420p";
  const graph = fade
    ? `[0:v]trim=end_frame=${frames},setpts=PTS-STARTPTS[a];[1:v]trim=end_frame=${fade},setpts=PTS-STARTPTS[b];` +
      `[a][b]blend=all_expr='if(lt(N,${fade}),A*N/${fade}+B*(1-N/${fade}),A)'[c];[c]${even}[v]`
    : `[0:v]trim=end_frame=${frames},${even}[v]`;
  const codec =
    plan.format === "mp4"
      ? ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-movflags", "+faststart"]
      : ["-c:v", "libvpx-vp9", "-crf", "24", "-b:v", "0", "-row-mt", "1"];
  const args = [
    "-y",
    "-loglevel",
    "error",
    ...input(0),
    ...(fade ? input(frames) : []),
    "-filter_complex",
    graph,
    "-map",
    "[v]",
    "-r",
    String(plan.fps),
    ...codec,
    "-colorspace",
    "bt709",
    "-color_primaries",
    "bt709",
    "-color_trc",
    "bt709",
    file,
  ];
  return new Promise((ok, fail) => {
    const run = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    run.stderr.on("data", (d) => {
      err += d;
    });
    run.on("error", fail);
    run.on("exit", (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited ${code}: ${err.trim()}`))));
  });
}

/** Records the loaded scene into `file`; returns its loop plan. */
async function record(page, ffmpeg, file) {
  const { result } = await page.send("Runtime.evaluate", { expression: FREEZE, returnByValue: true });
  const loop = loopPlan(result.value);
  await page.send("Runtime.evaluate", { expression: `window.__rates = ${JSON.stringify(loop.rates)}` });
  const frames = Math.round(loop.length * plan.fps);
  const fade = Math.min(frames, Math.round(loop.fade * plan.fps));
  const dir = mkdtempSync(join(tmpdir(), "sistine-frames-"));
  try {
    for (let i = 0; i < frames + fade; i++) {
      await page.send("Runtime.evaluate", { expression: `window.__seek(${(i * 1000) / plan.fps})`, awaitPromise: true });
      const shot = await page.send("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(dir, `${String(i).padStart(5, "0")}.png`), Buffer.from(shot.data, "base64"));
      if (process.stdout.isTTY) process.stdout.write(`\r  ${relative(process.cwd(), file)}  frame ${i + 1}/${frames + fade}`);
    }
    if (process.stdout.isTTY) process.stdout.write("\r\x1b[K");
    await encode(ffmpeg, dir, frames, fade, file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return loop;
}

async function main() {
  if (plan.stills.length) console.log(`  skipping ${plan.stills.join(", ")}: not animated, so a still is all there is (use --format png)`);
  if (!plan.scenes.length) throw new Error("no scenes to export");
  const ffmpeg = plan.video ? findFfmpeg() : null;
  const site = new URL(opt.url);
  try {
    const res = await fetch(new URL("/backdrop", site));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    throw new Error(`no Sistine site answering at ${new URL("/backdrop", site)} (${e.message}): start \`bun run dev\` first, or pass --url`);
  }

  const bin = findChrome();
  const profile = mkdtempSync(join(tmpdir(), "sistine-export-"));
  const browser = spawn(
    bin,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      // Same colours on every machine: without it the frame is encoded in the host display's profile.
      "--force-color-profile=srgb",
      // Finish raster before every frame is drawn. Raster is otherwise asynchronous, and a layer that had
      // been off-screen (a Pac sprite, seeked into view) was captured blank, before its tiles were painted.
      "--run-all-compositor-stages-before-draw",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let page;
  try {
    // Port 0 lets Chrome pick a free port; it writes the one it chose into the profile.
    const portFile = join(profile, "DevToolsActivePort");
    for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
    if (!existsSync(portFile)) throw new Error(`${bin} did not start a DevTools endpoint`);
    const port = readFileSync(portFile, "utf8").split("\n")[0];
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
    page = await connect(target.webSocketDebuggerUrl);
    await page.send("Page.enable");

    const ext = plan.format === "jpeg" ? "jpg" : plan.format;
    let count = 0;
    for (const tint of plan.tints) {
      mkdirSync(join(plan.out, tint), { recursive: true });
      for (const mode of plan.modes) {
        const { identifier } = await page.send("Page.addScriptToEvaluateOnNewDocument", { source: seed(tint, mode) });
        for (const { width, height, scale } of plan.sizes) {
          await page.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: false });
          for (const scene of plan.scenes) {
            const discs = DISC_SCENES.includes(scene) ? plan.discs : [null];
            for (const disc of discs) {
              const url = new URL("/backdrop", site);
              url.search = new URLSearchParams({
                scene,
                ...(disc && { disc }),
                density: plan.density,
                sand: plan.sand,
                speed: String(plan.speed),
              }).toString();
              const loaded = page.once("Page.loadEventFired");
              await page.send("Page.navigate", { url: url.href });
              await loaded;
              const { result } = await page.send("Runtime.evaluate", { expression: ready(scene), awaitPromise: true, returnByValue: true });
              const state = result.value;
              if (!state?.ok) throw new Error(`${url.href} never rendered the ${scene} scene`);
              if (state.dark !== (mode === "dark") || state.tint !== tint) {
                throw new Error(`${url.href} rendered ${state.dark ? "dark" : "light"} / ${state.tint}, not ${mode} / ${tint}`);
              }
              const file = join(plan.out, tint, `${scene}${disc ? `-${disc}` : ""}-${mode}-${width * scale}x${height * scale}.${ext}`);
              if (plan.video) {
                const loop = await record(page, ffmpeg, file);
                console.log(`  ${relative(process.cwd(), file)}  ${Math.round(loop.length * 100) / 100}s ${loop.kind}`);
              } else {
                const shot = await page.send("Page.captureScreenshot", {
                  format: plan.format,
                  ...(plan.format !== "png" && { quality: plan.quality }),
                });
                writeFileSync(file, Buffer.from(shot.data, "base64"));
                console.log(`  ${relative(process.cwd(), file)}`);
              }
              count++;
            }
          }
        }
        await page.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
      }
    }
    console.log(`✓ exported ${count} background${count === 1 ? "" : "s"} to ${relative(process.cwd(), plan.out) || "."}`);
  } finally {
    page?.close();
    browser.kill();
    await new Promise((r) => (browser.exitCode === null ? browser.once("exit", r) : r()));
    rmSync(profile, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(`✗ export-backgrounds: ${e.message}`);
  process.exit(1);
});
