#!/usr/bin/env node
/**
 * Golden test — prove our inlined APCA (lib/oklch-utils → apcaContrast) matches the official apca-w3
 * reference across a color sweep, so the locked constants can't silently drift.
 *
 * apca-w3 is a DEV dependency ONLY. It is never shipped in @sistine/oklch-utils — its license is a
 * W3/AGWG collaborative-agreement license (not MIT) and it pulls in colorparsley. We keep our own
 * dependency-free port for the shipped artifact and use apca-w3 here purely as the test oracle.
 *
 * Both sides are fed the SAME sRGB (via our oklchToSrgb), so this isolates the APCA math itself —
 * apcaLuminance + the contrast formula — from the OKLCH→sRGB step.
 *
 * Run: pnpm test:apca   (needs Node ≥22 to type-strip the imported .ts)
 */
import { APCAcontrast, sRGBtoY } from "apca-w3";
import { apcaContrast, oklchToSrgb } from "../lib/oklch-utils.ts";

const rgb255 = (o) => oklchToSrgb(o.l, o.c, o.h).map((v) => v * 255);
const refLc = (text, bg) => Number(APCAcontrast(sRGBtoY(rgb255(text)), sRGBtoY(rgb255(bg))));

let max = 0;
let worst = null;
let n = 0;
for (let tl = 0; tl <= 100; tl += 10) {
  for (let bl = 0; bl <= 100; bl += 10) {
    for (const h of [0, 90, 180, 255, 320]) {
      for (const c of [0, 0.1, 0.2]) {
        const text = { l: tl, c, h };
        const bg = { l: bl, c: c * 0.5, h: (h + 40) % 360 };
        const d = Math.abs(apcaContrast(text, bg) - refLc(text, bg));
        n++;
        if (d > max) {
          max = d;
          worst = { text, bg, ours: apcaContrast(text, bg).toFixed(2), ref: refLc(text, bg).toFixed(2) };
        }
      }
    }
  }
}

const TOL = 0.5;
console.log(`apca-oracle: ${n} pairs swept against apca-w3 — max |ΔLc| = ${max.toFixed(3)}`);
if (max > TOL) {
  console.error(`✗ our apcaContrast drifts from the apca-w3 reference by ${max.toFixed(3)} Lc (> ${TOL})`);
  console.error(`  worst: text=oklch(${worst.text.l} ${worst.text.c} ${worst.text.h}) bg=oklch(${worst.bg.l} ${worst.bg.c} ${worst.bg.h}) ours=${worst.ours} ref=${worst.ref}`);
  process.exit(1);
}
console.log(`✓ matches the APCA-W3 reference within ${TOL} Lc — our inlined port is faithful`);
