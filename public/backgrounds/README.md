# Demo background images

`components/grid-background.tsx` (the demo wallpaper behind the glass UI) loads two cityscapes,
blurred, switched by theme:

- **`city-day.png`** — light mode (bright futuristic daytime city)
- **`city-night.png`** — dark mode (neon nighttime city)

Drop those two files in **this folder** with exactly those names. Next serves them at
`/backgrounds/city-day.png` and `/backgrounds/city-night.png`.

Demo-only — these are **not** part of the shipped `@sistine` registry.
