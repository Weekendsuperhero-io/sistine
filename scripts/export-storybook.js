#!/usr/bin/env node

/**
 * Export Storybook static files to public/storybook/
 * Cross-platform alternative to rsync for Vercel deployment
 */

const fs = require("fs");
const path = require("path");

const sourceDir = path.join(process.cwd(), "storybook-static");
const targetDir = path.join(process.cwd(), "public", "storybook");

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, {
    recursive: true,
  });
}

// Copy files recursively
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, {
        recursive: true,
      });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Check if source directory exists
if (!fs.existsSync(sourceDir)) {
  console.error(`Error: Source directory "${sourceDir}" does not exist.`);
  console.error('Please run "pnpm build-storybook" first.');
  process.exit(1);
}

// Remove existing target directory if it exists
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, {
    recursive: true,
    force: true,
  });
}

// Copy files — but NOT the build's own nested "storybook" dir: staticDirs ("../public") makes the build
// swallow public/storybook (the PREVIOUS export), so copying it back would nest a stale snapshot one
// level deeper on every build cycle (public/storybook/storybook/… kept fossilized pre-rename bundles).
console.log(`Copying Storybook files from ${sourceDir} to ${targetDir}...`);
fs.mkdirSync(targetDir, { recursive: true });
for (const child of fs.readdirSync(sourceDir)) {
  if (child === "storybook") continue;
  copyRecursiveSync(path.join(sourceDir, child), path.join(targetDir, child));
}
console.log("✓ Storybook files exported successfully!");
