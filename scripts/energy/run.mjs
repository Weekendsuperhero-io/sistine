#!/usr/bin/env node
/**
 * RESEARCH: what each background renderer costs in energy under glass (docs/research/2026-11-04-webgpu-energy.md).
 *
 * Runs the /research/energy page's schedule and reads the SoC's energy counters meanwhile, through
 * scripts/energy/ioreport-sampler.c (Apple Silicon, no root). The page runs itself on the wall clock, so
 * any browser works: this prints the URL, you open it (in a visible window, left alone), and it waits.
 *
 *   bun run build && (cd /tmp && npx serve@latest <repo>/out -l 4173)   # production build, no dev overlay
 *   node scripts/energy/run.mjs --url http://localhost:4173 --rounds 3 --out docs/research/data/run.json
 *   node scripts/energy/run.mjs --from docs/research/data/run.json      # re-summarise a saved run
 *
 *   --url      site origin                       (default http://localhost:4173)
 *   --rounds   repetitions; each round shuffles the order (seeded), so drift spreads evenly (default 3)
 *   --settle   seconds after each switch that are not measured: startup, shader compiles (default 5)
 *   --measure  measured seconds per phase       (default 30)
 *   --lead     seconds before the first phase: time to open the URL (default 45)
 *   --variants comma list (default: all thirteen below)
 *   --browser  substring of the browser's process paths, to attribute CPU time to it
 *              (default "Safari Technology Preview.app")
 *   --out      JSON with every phase, the raw samples and the summary (default: printed only)
 *   --from     skip measuring: summarise a JSON an earlier run wrote (with --out, rewrite it)
 *
 * What to trust. GPU energy is the clean signal: the GPU is the part these renderers load, and nothing
 * else on an idle Mac touches it much, so it repeats within a few hundredths of a watt. System CPU energy
 * is not: any background burst (Spotlight, an update check) lands in it, single phases read 10–20 W. So
 * the CPU side is taken per process instead, as CPU time from `ps` at each window's edges: the browser's
 * web-content and GPU processes, and the window server. The summary reports medians over rounds, and each
 * variant's GPU power minus the `still` phase OF THE SAME ROUND (or `still~noglass` for a no-glass variant),
 * which cancels slow drift.
 */
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const ALL = [
  "still",
  "css-clouds",
  "css-aurora",
  "canvas2d-gradient",
  "webgl2-gradient",
  "webgpu-gradient",
  "canvas2d-lava",
  "webgl2-lava",
  "webgpu-lava",
  "still~noglass",
  "css-aurora~noglass",
  "canvas2d-lava~noglass",
  "webgpu-lava~noglass",
];
const CHANNELS = ["cpu", "gpu", "gpuRail", "dram", "fabric"];

/** Runs the schedule and returns { meta, phases, rows }. */
async function measure() {
  const plan = {
    url: arg("url", "http://localhost:4173"),
    rounds: Number(arg("rounds", 3)),
    settle: Number(arg("settle", 5)),
    measure: Number(arg("measure", 30)),
    lead: Number(arg("lead", 45)),
    variants: arg("variants", ALL.join(",")).split(","),
    browser: arg("browser", "Safari Technology Preview.app"),
  };

  // A seeded shuffle per round (mulberry32), so a rerun uses the same order.
  let seed = 0x5157;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const shuffled = (list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const order = Array.from({ length: plan.rounds }, () => shuffled(plan.variants)).flat();
  const phaseMs = (plan.settle + plan.measure) * 1000;
  const start = Math.ceil((Date.now() + plan.lead * 1000) / 1000) * 1000;
  const end = start + order.length * phaseMs;
  const url = `${plan.url}/research/energy?start=${start}&settle=${plan.settle}&measure=${plan.measure}&order=${order.join(",")}`;

  const sampler = join(tmpdir(), "sistine-ioreport-sampler");
  execFileSync("clang", ["-O2", "-o", sampler, join(root, "scripts/energy/ioreport-sampler.c"), "-lIOReport", "-framework", "CoreFoundation"]);

  console.log(`open: ${url}`);
  console.log(`phases: ${order.length} × ${plan.settle + plan.measure}s, starts ${new Date(start).toLocaleTimeString()}, ends ${new Date(end).toLocaleTimeString()}`);

  const rows = [];
  const proc = spawn(sampler, ["1000"]);
  let buffered = "";
  proc.stdout.on("data", (chunk) => {
    buffered += chunk;
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) rows.push(JSON.parse(line));
  });

  /** CPU seconds so far for the browser's web-content and GPU processes, and the window server. */
  const seconds = (time) => {
    const [days, rest] = time.includes("-") ? time.split("-") : ["0", time];
    return Number(days) * 86400 + rest.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
  };
  const cpuSnapshot = () => {
    const groups = { webContent: 0, gpuProcess: 0, windowServer: 0 };
    for (const line of execFileSync("ps", ["-A", "-o", "time=,command="], { encoding: "utf8" }).split("\n")) {
      const m = line.trim().match(/^(\S+)\s+(.*)$/);
      if (!m) continue;
      const [, time, command] = m;
      if (command.includes(plan.browser) && command.includes("WebKit.WebContent")) groups.webContent += seconds(time);
      else if (command.includes(plan.browser) && command.includes("WebKit.GPU")) groups.gpuProcess += seconds(time);
      else if (/\/WindowServer(\s|$)/.test(command)) groups.windowServer += seconds(time);
    }
    return groups;
  };
  const snapshots = new Map();
  order.forEach((_, i) => {
    const a = start + i * phaseMs + plan.settle * 1000;
    const b = start + (i + 1) * phaseMs;
    setTimeout(() => snapshots.set(`${i}a`, cpuSnapshot()), a - Date.now());
    setTimeout(() => snapshots.set(`${i}b`, cpuSnapshot()), b - Date.now() - 100);
  });

  await new Promise((done) => setTimeout(done, end - Date.now() + 3000));
  proc.kill();

  const phases = order.map((variant, i) => {
    const a = start + i * phaseMs + plan.settle * 1000;
    const b = start + (i + 1) * phaseMs;
    const inside = rows.filter((r) => r.t > a && r.t <= b);
    const dt = inside.reduce((sum, r) => sum + r.dt, 0) / 1000;
    const power = Object.fromEntries(CHANNELS.map((c) => [c, inside.reduce((sum, r) => sum + r[c], 0) / dt]));
    power.total = power.cpu + power.gpu + power.dram + power.fabric;
    const before = snapshots.get(`${i}a`);
    const after = snapshots.get(`${i}b`);
    const window = (b - a) / 1000;
    const cores = before && after ? Object.fromEntries(Object.keys(before).map((k) => [k, (after[k] - before[k]) / window])) : null;
    return { round: Math.floor(i / plan.variants.length), i, variant, seconds: dt, power, cores };
  });
  return { meta: { ...plan, start, end, order, url }, phases, rows };
}

const from = arg("from");
const { meta, phases, rows } = from ? (({ plan, phases, rows }) => ({ meta: plan, phases, rows }))(JSON.parse(readFileSync(resolve(from), "utf8"))) : await measure();

const median = (xs) => {
  const s = [...xs].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const summary = meta.variants.map((variant) => {
  const mine = phases.filter((p) => p.variant === variant);
  const baseline = variant.includes("~noglass") ? "still~noglass" : "still";
  const deltas = mine.map((p) => p.power.gpu - (phases.find((q) => q.round === p.round && q.variant === baseline)?.power.gpu ?? Number.NaN));
  return {
    variant,
    gpu: median(mine.map((p) => p.power.gpu)),
    gpuDelta: median(deltas),
    gpuDeltaRange: [Math.min(...deltas), Math.max(...deltas)],
    browserCores: median(mine.map((p) => (p.cores?.webContent ?? 0) + (p.cores?.gpuProcess ?? 0))),
    windowServerCores: median(mine.map((p) => p.cores?.windowServer ?? 0)),
    systemCpu: median(mine.map((p) => p.power.cpu)),
    dram: median(mine.map((p) => p.power.dram)),
  };
});

const w = (x) => x.toFixed(2);
const signed = (x) => `${x >= 0 ? "+" : ""}${w(x)}`;
console.log("\n| variant | GPU W | Δ GPU vs still, W (range) | browser CPU, cores | WindowServer, cores | system CPU W (noisy) | DRAM W |");
console.log("|---|---|---|---|---|---|---|");
for (const s of summary) {
  console.log(
    `| ${s.variant} | ${w(s.gpu)} | ${signed(s.gpuDelta)} (${signed(s.gpuDeltaRange[0])} … ${signed(s.gpuDeltaRange[1])}) | ${w(s.browserCores)} | ${w(s.windowServerCores)} | ${w(s.systemCpu)} | ${w(s.dram)} |`,
  );
}
const out = arg("out");
if (out) {
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(resolve(out), `${JSON.stringify({ plan: meta, summary, phases, rows })}\n`);
  console.log(`\nwrote ${out}`);
}
