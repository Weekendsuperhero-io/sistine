#!/usr/bin/env node

/**
 * Copy the built Storybook into the exported site at `out/storybook/`, so the deploy serves it at
 * /storybook alongside the docs site. Cross-platform stand-in for rsync.
 *
 * RUNS AFTER `next build`, not before. The old order staged Storybook through `public/storybook`, which
 * fed a loop: `.storybook/main.ts` sets `staticDirs: ["../public"]` (stories reference /logo-dark.png
 * and friends), so each Storybook build swallowed the PREVIOUS export back into `storybook-static/`.
 * That cost ~35 MB of copying per build and forced this script to special-case the nested `storybook`
 * directory on the way back out — a guard that silently had to stay correct or the fossil would ship.
 *
 * Writing to `out/` breaks the cycle at the source: `public/` never contains a Storybook, so
 * `staticDirs` has nothing stale to pick up and no skip rule is needed.
 */

const fs = require("fs");
const path = require("path");

const sourceDir = path.join(process.cwd(), "storybook-static");
const targetDir = path.join(process.cwd(), "out", "storybook");

function copyRecursiveSync(src, dest) {
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    fs.mkdirSync(dest, {
      recursive: true,
    });
    for (const childItemName of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync(sourceDir)) {
  console.error(`Error: Source directory "${sourceDir}" does not exist.`);
  console.error('Please run "bun run storybook:build" first.');
  process.exit(1);
}

// out/ is produced by `next build` (output: "export"). Ordering matters, so say so rather than
// silently creating a stray directory the deploy would never look at.
if (!fs.existsSync(path.join(process.cwd(), "out"))) {
  console.error('Error: "out/" does not exist — run "bun run build" before exporting Storybook.');
  process.exit(1);
}

if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, {
    recursive: true,
    force: true,
  });
}

console.log(`Copying Storybook files from ${sourceDir} to ${targetDir}...`);
copyRecursiveSync(sourceDir, targetDir);
console.log("✓ Storybook files exported successfully!");
