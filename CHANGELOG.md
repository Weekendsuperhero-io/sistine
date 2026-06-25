# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Surface tiers** — added home-page surface switcher (`glass-bg` / `glass-surface` / `glass-solid` / `glass-opaque`) with a tunable `glass-solid` floor.
- **Gradient text** — added new `@sistine/gradient-text` component and `text-gradient` theme tokens/utilities.

### Changed
- **Component consistency** — converted 16 glass components to `cva`.
- **Registry** — rebuilt `registry.json` and `public/r/*` so subscribers receive the updated components and theme.

### Fixed
- **Crystal wash** — fixed rendering under fresco presets (sistine/muse).
- **Opaque glass** — updated `glass-opaque` to drop backdrop blur so it composes losslessly over `glass-bg`.

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
