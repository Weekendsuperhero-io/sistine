# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **ARC Bronze contrast** — introduced APCA contrast banding targeting for size-tiered text foregrounds and icons.
- **Perceptual hue helpers** — added `complement` and `harmony` OKLCH hue helpers for theme-complementary accents.
- **Glass surface tiers** — added `surface` and `solid` variants across all glass UI components.
- **Standalone icon utilities** — shipped `--foreground-ui` and the `text-foreground-ui` utility for standalone icons with optional hue tracking.
- **Theming documentation and tooling** — added an APCA verification oracle, an interactive `ForegroundTester`, and comprehensive theming guides.
- **Hue wheel presets** — added 5 new single-hue jewels (Carnelian, Peridot, Turquoise, Aquamarine, Tourmaline) to fill color gaps.
- **New frescoes** — introduced Aurora and Gloaming bespoke multi-hue presets for light and dark modes.
- **Theme regression guard** — introduced a test script in CI to verify scope invariants and theme synchronization.
- **Surface tiers switcher** — introduced a tunable surface switcher with a configurable solid glass floor.
- **Gradient text component** — shipped `@sistine/gradient-text` along with corresponding theme tokens and utilities.

### Changed
- **Text foreground ramp** — changed the default to a linear lightness ramp to hold theme chroma and shift high-contrast text to tinted white.
- **Fresco anchor hues** — retuned Sistine, Muse Night, and Gloaming Day for better warmth and legibility.
- **Dark mode selector** — refactored to use a zero-specificity `&:where(.dark, .dark *)` selector for proper styling application.
- **Glass tint scoping** — split `:root` and `.dark` declarations so `data-glass-tint` properly scopes derived tokens to its subtree.
- **Solid glass opacity** — composed `--glass-solid-a` inside the utility class so mode lightness and opacity dials both resolve directly on the element.
- **CanvasBackground component** — added an optional `hue` prop to drive canvas color independently of the live tint.
- **Sonner toaster** — decoupled from `next-themes` by accepting a `theme` prop to make the component portable.
- **Component architecture** — converted 16 glass components to use `cva` for variant consistency.
- **Theme packaging** — components and blocks now depend on `@sistine/theme` for the CSS tokens instead of each bundling a copy of `app/globals.css`, so a fresh `add` writes the theme once (via the dependency, with its `tw-animate-css` dep) rather than dropping a redundant `globals.css` per component.
- **GradientBackground component** — added an optional `hue` prop to drive the gradient color independently of the live tint (mirrors `CanvasBackground`).
- **Component docs** — clarified that `carousel` is a single items-driven component (pass slides as `children`; no compound `CarouselContent`/`CarouselItem`/`CarouselNext`/`CarouselPrevious`/`CarouselApi`) and that `mode-toggle` requires a `next-themes` `ThemeProvider`.

### Fixed
- **Gamut safety margin** — added a 3% margin to prevent high-chroma edge colors from greying out in Safari.
- **Neutral tints** — updated to correctly produce achromatic foregrounds while keeping the hue ramp a full 360° color wheel.
- **Dialog rendering** — dropped the `relative` position class from the glass wrapper to prevent the modal from rendering off-screen.
- **Button styling** — updated `default` to keep primary fill with a glass sheen, and `secondary` to use bordered neutral glass.
- **Badge hydration** — changed the root element from `<div>` to `<span>` to resolve hydration warnings inside phrasing content.
- **Glass variants** — resolved crystal wash issues under fresco presets and dropped backdrop blur on `glass-opaque` for lossless composition.
- **input-otp types** — the base component now compiles against upstream `input-otp` types directly; removed a private module shim that masked a discriminated-union mismatch and never shipped to consumers, so `shadcn add input-otp` no longer fails to type-check.
- **Resizable dependency pin** — corrected the `react-resizable-panels` pin from `^3.0.6` to `^4.12.1` to match the v4 namespace API (`Group`/`Panel`/`Separator`) the component uses; a fresh `add` no longer installs an incompatible v3.

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
