# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Surface tiers** — introduced a surface switcher (`glass-bg` / `glass-surface` / `glass-solid` / `glass-opaque`) and a tunable `glass-solid` floor.
- **Gradient text** — added new `@sistine/gradient-text` component and `text-gradient` theme tokens/utilities.
- **CanvasBackground** — added an optional `hue` prop to drive the canvas color instead of the live `--glass-tint-h`.

### Changed
- **Glass components** — converted 16 glass components to `cva` for consistency.
- **Sonner Toaster** — decoupled from `next-themes` by accepting `theme` as a prop, making `@sistine/sonner` portable.
- **Registry** — rebuilt `registry.json` and `public/r/*` so subscribers receive the latest components and theme.

### Fixed
- **Dialog** — dropped `relative` positioning on the glass `DialogContent` wrapper so the base `fixed` positioning keeps the modal on-screen.
- **Buttons** — updated `default` to keep bold primary fill with glass sheen and shadow, and `secondary` to bordered neutral glass, preventing them from looking unstyled.
- **Badge** — changed the element and glass wrapper from `<div>` to `<span>` to prevent hydration warnings inside phrasing content.
- **Crystal wash** — fixed wash under fresco presets (sistine/muse).
- **Opaque glass** — dropped backdrop blur from `glass-opaque` so it composes losslessly over `glass-bg`.

### Added
- **ReadableText component** — introduced to calculate surface wash logic and adapt foreground text for dynamic APCA contrast guarding.
- **Canvas styles** — added P3 gamut support and dynamic canvas styles (`gradient`, `lava`, `circle`) via OKLCH ramps.
- **Hover effects showcase** — added a dedicated showcase for `hoverEffects` variants (`glow`, `shimmer`, `ripple`, `lift`, `scale`).
- **Registry entries** — added new entries for `readable-text`, `glass-utils`, `hover-effects`, `canvas-background-utils`, and `canvas-background`.

### Changed
- **Canvas background** — overhauled to be ramp-driven and responsive to live glass tints.
- **BackgroundSwitcher** — expanded with comprehensive controls for style, ramp axis, steps, angle, and speed.

### Fixed
- **Opaque glass mode rendering** — targeted `@layer utilities` in `globals.css` to ensure `[data-glass="opaque"]` properly overrides layered glass variants.
