# Sistine

A glassmorphic component library built on filtered light: colour cast through tinted glass, surfaces cut and polished like sheet acrylic, and a spectrum of stone tints that retune the whole system from a single hue. Built with Next.js 16, React 19, and the shadcn-ui registry.

![Sistine](https://img.shields.io/badge/Sistine-v0.1.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![React](https://img.shields.io/badge/React-19.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)

## ✨ Features

- **50+ Glass Components** - Comprehensive collection of beautiful, glassy UI components
- **Light Through Glass** - Layered translucency, cut edges, and depth that hold up on any backdrop
- **OKLCH tint system** - Recolor every glass surface from a hue + chroma pair or a built-in preset
- **Theme Support** - Built-in light/dark mode with automatic theme switching
- **Enhanced Effects** - Glow, shimmer, ripple, and gradient animations
- **Fully Customizable** - Per-component glass effect customization
- **Package Manager Support** - Install with bun, pnpm, yarn, or npm
- **TypeScript** - Fully typed components for better developer experience
- **Accessible** - Built on Radix UI primitives for accessibility
- **Tailwind CSS** - Utility-first styling with CSS variables

## 🚀 Quick Start

### Installation

Sistine is a namespaced shadcn registry. Add the `@sistine` namespace to your project's `components.json` **once**:

```json
{
  "registries": {
    "@sistine": "https://raw.githubusercontent.com/Weekendsuperhero-io/sistine/main/public/r/{name}.json"
  }
}
```

Then add any component with the shadcn CLI using your preferred package manager:

**bun:**
```bash
bunx shadcn@latest add @sistine/button
```

**pnpm:**
```bash
pnpm dlx shadcn@latest add @sistine/button
```

**yarn:**
```bash
yarn dlx shadcn@latest add @sistine/button
```

**npm:**
```bash
npx shadcn@latest add @sistine/button
```

### Usage

After installation, import and use components in your project:

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function Example() {
  return (
    <div>
      <Button effect="glow">
        Click me
      </Button>
      <Card material="frosted" border gradient>
        <CardHeader>
          <CardTitle>Beautiful Card</CardTitle>
        </CardHeader>
        <CardContent>Your content here</CardContent>
      </Card>
    </div>
  )
}
```

> **Note:** The import path depends on your project's component directory configuration. By default, shadcn CLI installs components to `@/components/ui/`.

## 📚 Documentation

Visit the [full documentation](https://sistine.weekendsuperhero.io) for:
- Complete component reference
- Installation guides
- Customization examples
- Theme configuration
- Glass effect customization

## 🎨 Interactive Playground

Explore and test components interactively with Storybook:

```bash
# Start Storybook
bun run storybook

# Build Storybook (static)
bun run storybook:build
```

Storybook provides:
- ✨ Live component previews
- 🎛️ Interactive controls for all props
- 📖 Auto-generated documentation
- ♿ Accessibility testing
- 🌓 Theme switching
- 📱 Responsive viewport testing

Visit `http://localhost:6006` after starting Storybook.

## 🏗️ Architecture

Every component lives in a single tree (`components/ui/[name].tsx`, published under `registry/ui/`) and draws its surface from the **material system** in `lib/material.ts`:

- **Five materials** (`glass`, `frosted`, `crystal`, `chakra`, `opaque`) via the `material` prop. Leave it off and the surface is **adaptive**: it follows the page's `data-glass` style; an explicit material pins the element under any page style.
- **Orthogonal axes** (`border`, `veil`, `diffuse`, `gradient`, `glow`, `sheen`) layered on top of any material. Booleans with typed refinements: `border="rim" | "frame"` (2px / 4px), `diffuse="stained"` (dyed glass), `glow="lg"`.
- **Hover effects**: `effect="glow | shimmer | ripple | lift | scale"` from `lib/hover-effects.ts`.
- Accessibility from Radix UI primitives, fully typed, and themed through CSS tokens.

Components call `materialSurface()` from `lib/material.ts` instead of hardcoding recipe class strings, so the material → markup mapping lives in one place.

## 🌐 Browser support

**Safari 17.5+ · Chrome 120+ · Edge 120+ · Firefox 128+**: declared as `browserslist` in `package.json`.

This floor is derived from what the theme actually uses, not chosen. The binding constraints are:

| Feature | Needs | Used for |
|---|---|---|
| `text-wrap: balance` | Safari 17.5 | `CardTitle`, `CardDescription` |
| CSS nesting (bare `&`) | Chrome 120 | `app/theme/utilities.css` |
| `mask-composite` (unprefixed) | Chrome 120 | pattern scenes, glass masks |
| `@property` | Firefox 128 | Tailwind v4's own output |
| `oklch()` / `color-mix()` | Safari 16.2 · Chrome 111 | every colour in the theme |

Tailwind v4's own baseline (Safari 16.4 / Chrome 111 / Firefox 128) sits just under this, so the floor is set by Sistine's CSS rather than by Tailwind.

Below the floor there is **one safety net, not a polyfill**: `app/theme/tokens.css` ends with an `@supports not (color: oklch(…))` block that restores a legible background, foreground and panel fill. Because every colour is an oklch value passed through a custom property, an engine without oklch resolves those properties to invalid at substitution time and computes them to `unset`, so surfaces go transparent rather than falling back. The block prevents that; it does not reproduce the palette.

## 🎨 Customization

### Retint all glass

Every color is authored in **oklch** in `app/theme/` (aggregated by `app/globals.css`; full reference: [`docs/color-tokens.md`](./docs/color-tokens.md)). The whole glass system is driven by the tint variables. Change them, or set a preset on `<html data-glass-tint="…">`, to recolor every surface, border, and accent at once:

```css
:root {
  --glass-tint-h: 250; /* hue 0–360 */
  --glass-tint-c: 0.018; /* chroma: the "how colorful" master (0 = neutral) */
}
```

Raise `--glass-tint-c` freely: the surfaces with lightness headroom (`--primary`, `--glass-tint-wash`, the opaque body) scale with it, while the near-white sheet and borders read a capped `--glass-tint-c-hi` instead. At L 95–100% sRGB holds almost no chroma, and how much survives depends on the hue, so uncapped they would drift per preset and per engine. `bun run test:gamut` scores every preset against the sRGB ceiling and fails if a new one reaches further out than those shipping today.

Built-in presets ship as `[data-glass-tint]` blocks: **jewels** (single hue: selenite, rose, goldstone, carnelian, amber, moonstone, peridot, aventurine, turquoise, aquamarine, sapphire, lapis, amethyst, tourmaline) and **frescoes** (multi-hue: sistine, muse, aurora, gloaming). Switch the surface treatment with `data-glass` on `<html>`: `glass` (default), `frosted`, `crystal`, `chakra`, `opaque`. Components also take a `glow` axis prop, a tint-tracking colored halo documented in [`docs/glow.md`](./docs/glow.md).

**Presets are turnkey, pure CSS.** Set the attribute and toggle `.dark` (e.g. next-themes): every preset and fresco carries its own day + night values, the scene backgrounds flip with the mode, and static text baselines keep every material legible with no JavaScript. Optionally install and mount `<AutoForeground />` (once, in your root layout) to upgrade those baselines to exact APCA-solved foregrounds that re-band live as the tint, mode, or surface knobs change. It refines; it is never required.

### Per-Component Customization

Pass CSS-variable overrides through the `glassVars` helper (the successor to the old `glass={{…}}` prop; it emits `--glass-*` / `--srf-*` custom properties that route through the token system):

```tsx
import { glassVars } from "@/lib/material"

<Card style={glassVars({ tintH: 293, blur: 30, opacity: 0.3 })}>
  Content
</Card>
```

## 📦 Available Components

### Form Components
- Button, Input, Textarea, Label
- Checkbox, Switch, Radio Group
- Select, Input OTP

### Display Components
- Card, Badge, Avatar, Alert
- Skeleton, Separator, Table

### Overlay Components
- Dialog, Alert Dialog, Popover
- Tooltip, Hover Card, Sheet
- Drawer, Sidebar

### Navigation Components
- Tabs, Accordion, Breadcrumb
- Dropdown Menu, Navigation Menu
- Pagination, Scroll Area

### Data Display
- Calendar, Chart, Command
- Slider, Toggle, Toggle Group

And more! See the [full component list](https://sistine.weekendsuperhero.io/components).

## 🛠️ Development

### Prerequisites

- Node.js 18+ 
- bun, pnpm, yarn, or npm

### Setup

```bash
# Clone the repository
git clone https://github.com/Weekendsuperhero-io/sistine.git
cd sistine

# Install dependencies
bun install

# Start development server
bun run dev

# Start Storybook (interactive playground)
bun run storybook

# Build the project
bun run build

# Build the registry
bun run registry:build
```

### Project Structure

```
sistine/
├── app/                    # Next.js app directory
├── components/             # Shared components
├── lib/                    # Utilities and helpers
├── public/                 # Static assets
├── registry/
│   └── ui/                # Components (one tree, material system)
├── stories/               # Storybook stories
└── registry.json          # Component registry
```

## 🚀 Deployment

The site is a **fully static build** (`output: "export"`), so it deploys as plain files to any static host: Cloudflare Pages, Cloudflare Workers Static Assets, Vercel, Netlify, S3. There is no server at request time.

Storybook is folded into the same output at `/storybook`, so one deploy covers both.

| Setting | Value |
|---|---|
| Install command | `bun install --frozen-lockfile` |
| Build command | `bun run storybook:build && bun run build && bun run storybook:export` |
| Output directory | `out` |

**Order matters.** `storybook:build` produces `storybook-static/`, `build` exports the site to `out/`, and `storybook:export` copies Storybook into `out/storybook/`. Running the export before the build fails with an explicit message rather than silently shipping without Storybook.

### Environment variables

| Variable | Purpose | Default if unset |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Absolute URLs in `/rss.xml`. Baked at build time, so set it per environment or previews advertise production links. | `https://sistine.weekendsuperhero.io` |
| `NEXT_PUBLIC_STORYBOOK_URL` | Where component pages link for Storybook docs. | `https://sistine.weekendsuperhero.io/storybook` |

### Build Commands

```bash
# Full deployable build (site + Storybook at /storybook)
bun run storybook:build && bun run build && bun run storybook:export

# Site only
bun run build

# Storybook only
bun run storybook:build

# Serve the built site locally. `next start` does NOT work with output: export,
# because there is no server to start.
npx serve@latest out
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- [Documentation](https://sistine.weekendsuperhero.io)
- [GitHub Repository](https://github.com/Weekendsuperhero-io/sistine)
- [Issue Tracker](https://github.com/Weekendsuperhero-io/sistine/issues)

## 🙏 Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com)
- Powered by [Radix UI](https://www.radix-ui.com)
- Inspired by filtered light, cut glass, and stone

---

Made with ❤️ by Weekend Superhero LLC · Based on [Glass UI](https://github.com/crenspire/glass-ui) by Crenspire Technologies (MIT)
