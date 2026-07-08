#!/usr/bin/env node
/**
 * Regenerate the "Muse" star-field constellation from a source SVG (the Agent mascot).
 *
 * The raw mascot SVG is NOT shipped — only the sampled dot string is embedded in
 * components/pattern-background.tsx (const MUSE_DOTS). When the Agent design changes, re-run this to
 * produce a fresh dot string and paste it into MUSE_DOTS (and update the viewBox height there).
 *
 * It parses the SVG's <path> beziers, keeps the on-curve anchor points, drops tiny detail shapes,
 * crops to the head (the coat sprawls into unreadable scatter as pure dots), downsamples + dedupes to a
 * sparse set, and re-normalizes to a width-100 box.
 *
 * Usage:
 *   node scripts/extract-constellation.mjs <path-to.svg> [minDiag] [downsample] [dedupe] [yCrop]
 * Defaults (minDiag=8 downsample=5 dedupe=4 yCrop=53) reproduce the shipped ~45-dot fedora+helmet head.
 * Output: `HEIGHT=<viewBox height>` then the space-separated "x,y x,y …" string for MUSE_DOTS.
 */
import { readFileSync } from "node:fs";

const [svgPath, DIAG = "8", THR = "5", DED = "4", YCUT = "53"] = process.argv.slice(2);
if (!svgPath) {
  console.error("usage: node scripts/extract-constellation.mjs <path-to.svg> [minDiag] [downsample] [dedupe] [yCrop]");
  process.exit(1);
}
const [minDiag, downsample, dedupe, yCrop] = [DIAG, THR, DED, YCUT].map(Number);

const svg = readFileSync(svgPath, "utf8");
const vbW = Number((svg.match(/viewBox="0 0 (\d+(?:\.\d+)?)/) || [, "1254"])[1]) || 1254;
const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);

/** Parse an SVG path `d` into its on-curve anchor points (absolute), handling M/L/H/V/C/S/Q/T/A/Z. */
function parse(d) {
  const t = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = "";
  const pts = [];
  const n = () => Number.parseFloat(t[i++]);
  while (i < t.length) {
    if (/[a-zA-Z]/.test(t[i])) cmd = t[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    let x, y;
    if (C === "M") { x = n(); y = n(); if (rel) { x += cx; y += cy; } cx = x; cy = y; sx = x; sy = y; pts.push([x, y]); cmd = rel ? "l" : "L"; }
    else if (C === "L") { x = n(); y = n(); if (rel) { x += cx; y += cy; } cx = x; cy = y; pts.push([x, y]); }
    else if (C === "H") { x = n(); if (rel) x += cx; cx = x; pts.push([x, cy]); }
    else if (C === "V") { y = n(); if (rel) y += cy; cy = y; pts.push([cx, y]); }
    else if (C === "C") { n(); n(); n(); n(); x = n(); y = n(); if (rel) { x += cx; y += cy; } cx = x; cy = y; pts.push([x, y]); }
    else if (C === "S" || C === "Q") { n(); n(); x = n(); y = n(); if (rel) { x += cx; y += cy; } cx = x; cy = y; pts.push([x, y]); }
    else if (C === "T") { x = n(); y = n(); if (rel) { x += cx; y += cy; } cx = x; cy = y; pts.push([x, y]); }
    else if (C === "A") { n(); n(); n(); n(); n(); x = n(); y = n(); if (rel) { x += cx; y += cy; } cx = x; cy = y; pts.push([x, y]); }
    else if (C === "Z") { cx = sx; cy = sy; }
    else i++;
  }
  return pts;
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const norm = (v) => (v / vbW) * 100;

// Collect on-curve anchors from the major shapes, downsampled along each contour, cropped to the head.
const raw = [];
for (const d of paths) {
  const pts = parse(d);
  if (pts.length < 2) continue;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const diag = norm(Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)));
  if (diag < minDiag) continue;
  const thr = (downsample / 100) * vbW;
  const kept = [pts[0]];
  for (const p of pts) if (dist(p, kept[kept.length - 1]) > thr) kept.push(p);
  for (const p of kept) {
    const nx = norm(p[0]);
    const ny = norm(p[1]);
    if (ny < yCrop) raw.push([nx, ny]);
  }
}
// Global dedupe, then re-normalize to width 100 (aspect preserved).
const dots = [];
for (const p of raw) if (!dots.some((q) => dist(p, q) < dedupe)) dots.push(p);
const xs = dots.map((p) => p[0]);
const ys = dots.map((p) => p[1]);
const mnX = Math.min(...xs), mxX = Math.max(...xs), mnY = Math.min(...ys), mxY = Math.max(...ys);
const s = 100 / (mxX - mnX);
const out = dots.map(([x, y]) => [Math.round((x - mnX) * s * 10) / 10, Math.round((y - mnY) * s * 10) / 10]);

console.log(`HEIGHT=${Math.round((mxY - mnY) * s * 10) / 10}`);
console.log(`# ${out.length} dots — paste into MUSE_DOTS`);
console.log(out.map((p) => `${p[0]},${p[1]}`).join(" "));
