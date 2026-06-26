# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Hue wheel presets** — added 5 single-hue jewels (Carnelian, Peridot, Turquoise, Aquamarine, Tourmaline) to complete the color wheel.
- **Aurora and Gloaming frescoes** — introduced two new bespoke multi-hue presets for light and dark themes.
- **Regression guard** — added `check-theme.mjs` test script to CI to prove scope, token, and preset invariants.
- **Theming documentation** — added `/docs/theming` to document consumer-facing knobs, surface tiers, and tuning variables.
- **CanvasBackground hue** — added an optional `hue` prop to drive the canvas color directly instead of relying on the live tint.
- **Surface tiers** — added home-page surface switcher and tunable `--glass-solid-a` floor for `glass-bg`, `glass-surface`, `glass-solid`, and `glass-opaque`.
- **Gradient text** — introduced `@sistine/gradient-text` component alongside `text-gradient` theme tokens and utilities.

### Changed
- **Scoped glass tint** — updated `data-glass-tint` so derived tokens re-resolve at the tinted element rather than globally on `:root`.
- **Solid glass opacity** — moved `--glass-solid-a` composition into `@utility glass-solid` so both lightness and opacity resolve on the element.
- **Sonner Toaster** — decoupled the component from `next-themes` to make `@sistine/sonner` portable, accepting a `theme` prop instead.
- **Glass components** — converted 16 glass components to use `cva` for styling consistency.

### Fixed
- **Dialog positioning** — removed `relative` from the glass `DialogContent` wrapper to ensure the modal renders in-flow and on-screen.
- **Button styling** — fixed `default` and `secondary` buttons to use glass sheen, shadows, and bordered neutral glass instead of flat unstyled colors.
- **Badge hydration** — changed the badge and glass wrapper from a `<div>` to a `<span>` to fix invalid phrasing content hydration warnings.
- **Fresco crystal wash** — fixed the crystal wash behavior under sistine/muse fresco presets.
- **Opaque glass** — dropped backdrop blur from `glass-opaque` to ensure it composes losslessly over `glass-bg`.

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
