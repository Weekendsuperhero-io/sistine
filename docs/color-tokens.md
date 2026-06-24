# Color tokens

Every color in Sistine is a CSS custom property in **`app/globals.css`**, authored in **oklch**. There are three blocks:

| Block | Role |
|---|---|
| `@theme inline { … }` | Maps `--color-*` → the base vars, which is what makes the Tailwind utilities exist (`bg-primary`, `text-foreground`, `border-input`, …). |
| `:root { … }` | The **light**-mode values. |
| `.dark { … }` | The **dark**-mode overrides (anything not redefined here inherits the light value). |

So `bg-card` resolves `--color-card` → `--card`, which is `transparent` in both modes — the glass utilities provide the actual surface.

> Recolor knobs: `--glass-tint-h` / `-c` / `-a` retint all glass at once (driven by the tint presets + picker). See [the glass system in `globals.css`](../app/globals.css).

---

## Semantic tokens (shadcn)

| Variable | Light | Dark | Purpose |
|---|---|---|---|
| `--background` | `transparent` | `transparent` | Page background — kept clear so the backdrop/glass shows through |
| `--foreground` | `oklch(0.15 0 0)` | `oklch(1 0 0)` | Body text |
| `--card` / `--card-foreground` | `transparent` / `oklch(0.15 0 0)` | `transparent` / `oklch(1 0 0)` | Card surface (glass) + its text |
| `--popover` / `--popover-foreground` | `transparent` / `oklch(0.15 0 0)` | `transparent` / `oklch(1 0 0)` | Menu/overlay surface (glass) + its text |
| `--primary` / `--primary-foreground` | `oklch(0.5 0.2 250)` / `oklch(0.98 0 0)` | `oklch(0.56 0.16 250)` / `oklch(1 0 0)` | Primary action (blue) + text on it |
| `--secondary` / `--secondary-foreground` | `oklch(0.96 0 0)` / `oklch(0.15 0 0)` | `oklch(0.25 0 0)` / `oklch(1 0 0)` | Secondary surface + text |
| `--muted` / `--muted-foreground` | `oklch(0.85 0 0)` / `oklch(0.1 0 0)` | `oklch(0.18 0 0)` / `oklch(1 0 0)` | Muted surface + text |
| `--accent` / `--accent-foreground` | `oklch(0.96 0 0)` / `oklch(0.15 0 0)` | `oklch(0.25 0 0)` / `oklch(1 0 0)` | Accent surface + text |
| `--destructive` / `--destructive-foreground` | `oklch(0.55 0.22 25)` / `oklch(0.98 0 0)` | `oklch(0.65 0.22 25)` / `oklch(1 0 0)` | Destructive (red, WCAG AA) + text |
| `--border` | `oklch(0.88 0 0)` | `oklch(0.3 0 0)` | Borders / dividers |
| `--input` | `oklch(0.88 0 0)` | `oklch(0.25 0 0)` | Input borders |
| `--ring` | `oklch(0.5 0.2 250)` | `oklch(0.6 0.2 250)` | Focus ring |

## Chart

| Variable | Light | Dark | Purpose |
|---|---|---|---|
| `--chart-1` | `oklch(0.6 0.2 250)` | `oklch(0.65 0.2 250)` | Blue |
| `--chart-2` | `oklch(0.55 0.15 150)` | `oklch(0.7 0.15 150)` | Green |
| `--chart-3` | `oklch(0.5 0.2 50)` | `oklch(0.75 0.2 50)` | Yellow |
| `--chart-4` | `oklch(0.65 0.2 300)` | `oklch(0.7 0.2 300)` | Purple |
| `--chart-5` | `oklch(0.6 0.2 20)` | `oklch(0.68 0.2 20)` | Orange |

Each is lightened in dark mode for contrast on a dark backdrop.

## Sidebar

| Variable | Light | Dark | Purpose |
|---|---|---|---|
| `--sidebar` | `oklch(0.98 0 0)` | `oklch(0.18 0 0)` | Sidebar surface |
| `--sidebar-foreground` | `oklch(0.15 0 0)` | `oklch(1 0 0)` | Sidebar text |
| `--sidebar-primary` / `-foreground` | `oklch(0.5 0.2 250)` / `oklch(0.98 0 0)` | `oklch(0.56 0.16 250)` / `oklch(1 0 0)` | Active/brand item + text |
| `--sidebar-accent` / `-foreground` | `oklch(0.15 0 0 / 0.1)` / `oklch(0.15 0 0)` | `oklch(1 0 0 / 0.1)` / `oklch(1 0 0)` | Hover/active overlay (translucent `foreground/10`) + text |
| `--sidebar-border` | `oklch(0.88 0 0)` | `oklch(0.3 0 0)` | Sidebar dividers |
| `--sidebar-ring` | `oklch(0.5 0.2 250)` | `oklch(0.6 0.2 250)` | Sidebar focus ring |

---

## Glass tint knobs

The recolor controls — the tint presets (`[data-glass-tint="…"]`) and the live picker set these on `<html>`; the hue/chroma flow into every glass token.

| Variable | Light | Dark | Purpose |
|---|---|---|---|
| `--glass-tint-h` | `250` | *(shared)* | Tint **hue** (0–360) |
| `--glass-tint-c` | `0.018` | *(shared)* | Tint **chroma** (gradient saturation) |
| `--glass-tint-a` | `0` | *(shared)* | Wash **alpha** — `0` = no colored floor (Neutral); presets raise it |
| `--glass-tint-wash` | `oklch(72% calc(var(--glass-tint-c) * 2.5) var(--glass-tint-h) / var(--glass-tint-a))` | `oklch(58% … )` | Solid colored floor; lighter in light mode (L 72%), deeper in dark (58%) |
| `--glass-accent` | `oklch(0.6 0.15 var(--glass-tint-h))` | `oklch(0.68 0.14 …)` | Vivid solid accent in the tint hue — **fixed** chroma so it's always colored (switch/slider fill) |
| `--glass-glow` | `oklch(0.62 0.2 var(--glass-tint-h) / 0.25)` | `oklch(0.7 0.18 … / 0.3)` | Glow/shadow color in the tint hue — drives the `glow` hover effect + the `glow` prop |
| `--glass-solid-bg` | `oklch(99% 0 0 / 0.65)` | `oklch(18% 0 0 / 0.65)` | Near-opaque **neutral** floor **with blur** for read-through overlays (menus/tooltips/toasts) |
| `--glass-opaque-bg` | `oklch(90% calc(var(--glass-tint-c) * 1.4) var(--glass-tint-h))` | `oklch(32% calc(… * 0.9) …)` | Fully-opaque **tinted** panel floor, **no blur** — the `glass-opaque` utility, `variant="opaque"`, and the global `data-glass="opaque"` mode |

*(`--glass-tint-h/c/a` are set once and shared across light/dark — only `-wash` and `-solid-bg` differ per mode.)*

## Glass surface tokens

The glassmorphism recipe values consumed by the `@utility glass-*` family. Multi-stop gradients/shadows are summarized — see `app/globals.css` for exact stops.

| Variable | Light | Dark | Purpose |
|---|---|---|---|
| `--glass-bg` | 5-stop 135° gradient, ~0.11–0.15 α (tinted via the knobs) | same, ~0.05–0.08 α | Standard glass surface fill |
| `--glass-border` | `oklch(100% calc(var(--glass-tint-c) * 0.5) var(--glass-tint-h) / 0.12)` | `… / 0.15` | Glass edge |
| `--glass-shadow` / `-sm` / `-lg` | drop + inset-glow composites | stronger (darker) drops | Depth + inner highlight |
| `--glass-frosted-bg` | 5-stop gradient, ~0.21–0.25 α | ~0.11–0.15 α | Frosted variant fill |
| `--glass-frosted-border` | `oklch(100% 0 0 / 0.3)` | `oklch(100% 0 0 / 0.25)` | Frosted edge |
| `--glass-frosted-shadow` | composite | stronger | Frosted depth |
| `--glass-fluted-pattern` | repeating white ridges, ~0.08–0.15 α | ~0.01–0.12 α | Fluted vertical ridges |
| `--glass-crystal-bg` | `oklch(100% calc(var(--glass-tint-c) * 0.6) var(--glass-tint-h) / 0.3)` | `… / 0.1` | Crystal fill |
| `--glass-crystal-border` | `… / 0.3` | `… / 0.3` (same) | Crystal edge |
| `--glass-crystal-shadow` / `-hover` | glow (dark outer + white) | stronger glow | Crystal glow |

## Non-color tokens

| Variable | Value | Dark | Purpose |
|---|---|---|---|
| `--radius` | `1.25rem` | *(inherited)* | Base radius; `--radius-sm/md/lg/xl` derive from it in `@theme` |
| `--blur` / `-sm` / `-lg` / `-frosted` / `-crystal` | `10` / `4` / `20` / `25` / `2px` | *(inherited)* | Backdrop-blur amounts per glass size/variant |
| `--gradient` | `oklch(base + offset) → oklch(base)`, base `0.6 0.15 H` | `0.68 0.14 …` | **Theme-aware, parameterized** brand gradient — base in `--grad-l/c/h` (h = `--glass-tint-h`), offset in `--grad-dl/dc/dh` (default = hue ramp, 3 steps out, 8/side). The `gradient-{hue,chroma,lightness,tonal}` + `gradient-reverse` @utilities re-aim it along each ramp axis; drives `glass-gradient` + the `gradient` Button |

`--radius` and the `--blur*` family are **not** redefined in `.dark` — they carry through both modes. (`--gradient` *is* mode-specific — a lifted lightness in dark, like `--glass-accent`.)
