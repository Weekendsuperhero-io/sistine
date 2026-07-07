# Color tokens

Every color in Sistine is a CSS custom property in **`app/globals.css`**, authored in **oklch**. There are three blocks:

| Block | Role |
|---|---|
| `@theme inline { … }` | Maps `--color-*` → the base vars, which is what makes the Tailwind utilities exist (`bg-primary`, `text-foreground`, `border-input`, …). |
| `:root { … }` | The **light**-mode values. |
| `.dark { … }` | The **dark**-mode overrides (anything not redefined here inherits the light value). |

So `bg-card` resolves `--color-card` → `--card`, which is `transparent` in both modes — the glass utilities provide the actual surface.

> Recolor knobs (OKLCH): `--glass-tint-h` (hue) + `--glass-tint-c` (chroma — the single colorfulness master) + `--glass-opaque-l` (tint body lightness) retint all glass at once (driven by the tint presets + picker). `--glass-tint-a` is a fixed tint-film alpha per preset — the former "wash" slider is retired. See [the glass system in `globals.css`](../app/globals.css).

---

## Semantic tokens (shadcn)

| Variable | Light | Dark | Purpose |
|---|---|---|---|
| `--background` | `transparent` | `transparent` | Page background — kept clear so the backdrop/glass shows through |
| `--foreground` | `oklch(0 0 0)` | `oklch(1 0 0)` | Body text — the extremes; **AutoForeground** walks a contrast-banded ramp at runtime (rarely pure 0/1 in practice) |
| `--card` / `--card-foreground` | `transparent` / `var(--foreground)` | `transparent` / `var(--foreground)` | Card surface (glass) + its text |
| `--popover` / `--popover-foreground` | `transparent` / `var(--foreground)` | `transparent` / `var(--foreground)` | Menu/overlay surface (glass) + its text |
| `--primary` / `--primary-foreground` | `oklch(0.42 0 0)` / `oklch(0.98 0 0)` | `oklch(0.78 0 0)` / `oklch(0.15 0 0)` | Primary action — **neutral grey** ("pure glass"; the theme tint comes from the glass overlay on the button, not the token) + text on it |
| `--secondary` / `--secondary-foreground` | `oklch(0.96 0 0)` / `var(--foreground)` | `oklch(0.25 0 0)` / `var(--foreground)` | Secondary surface + text |
| `--muted` / `--muted-foreground` | `oklch(0.85 0 0)` / `oklch(0.14 0.04 var(--glass-fg-h))` | `oklch(0.18 0 0)` / `oklch(0.89 0.04 var(--glass-fg-h))` | Muted surface + text (the **foreground** is theme-tinted — Level 1 toward the tint hue) |
| `--accent` / `--accent-foreground` | `oklch(0.96 0 0)` / `var(--foreground)` | `oklch(0.25 0 0)` / `var(--foreground)` | Accent surface + text |
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
| `--sidebar-foreground` | `var(--foreground)` | `var(--foreground)` | Sidebar text |
| `--sidebar-primary` / `-foreground` | `oklch(0.5 0.2 250)` / `oklch(0.98 0 0)` | `oklch(0.56 0.16 250)` / `oklch(1 0 0)` | Active/brand item + text |
| `--sidebar-accent` / `-foreground` | `oklch(0.15 0 0 / 0.1)` / `var(--foreground)` | `oklch(1 0 0 / 0.1)` / `var(--foreground)` | Hover/active overlay (translucent `foreground/10`) + text |
| `--sidebar-border` | `oklch(0.88 0 0)` | `oklch(0.3 0 0)` | Sidebar dividers |
| `--sidebar-ring` | `oklch(0.5 0.2 250)` | `oklch(0.6 0.2 250)` | Sidebar focus ring |

---

## Glass tint knobs

The recolor controls — the tint presets (`[data-glass-tint="…"]`) and the live picker set these on `<html>`; the hue/chroma flow into every glass token.

| Variable | Light | Dark | Purpose |
|---|---|---|---|
| `--glass-tint-h` | `250` | *(shared)* | Tint **hue** (0–360) |
| `--glass-tint-c` | `0` | *(shared)* | Tint **chroma** — the single "how colorful" master (surfaces + text + harmonic accents); `0` = neutral |
| `--glass-tint-a` | `0` | *(shared)* | Tint **film** alpha, per preset. The former "Wash" slider is retired — chroma is the colorfulness dial |
| `--glass-opaque-l` | `90` | `32` | Tint **body lightness** (OKLCH L, plain number → %); lower = a deeper tint. The opaque floor color + AutoForeground's opaque-card banding both read it |
| `--glass-opacity` | `0` | *(shared)* | Component **solidity floor** — `0` = the variant's sheer glass, `1` = reads as its opaque variant; set inline or via the `glass` prop |
| `--glass-opaque-outline` | *(unset)* | *(shared)* | Optional **accent outline** for opaque surfaces — falls back to `--glass-border`; set to e.g. `var(--glass-accent)` for a colored edge |
| `--glass-tint-wash` | `oklch(72% calc(var(--glass-tint-c) * 2.5) var(--glass-tint-h) / var(--glass-tint-a))` | `oklch(58% … )` | Solid colored floor; lighter in light mode (L 72%), deeper in dark (58%) |
| `--glass-accent` | `oklch(0.6 0.15 var(--glass-tint-h))` | `oklch(0.68 0.14 …)` | Vivid solid accent in the tint hue — **fixed** chroma so it's always colored (switch/slider fill) |
| `--glass-glow` | `oklch(0.62 0.2 var(--glass-tint-h) / 0.25)` | `oklch(0.7 0.18 … / 0.3)` | Glow/shadow color in the tint hue — drives the `glow` hover effect + the `glow` prop |
| `--glass-solid-bg` | `oklch(99% 0 0 / 0.65)` | `oklch(18% 0 0 / 0.65)` | Near-opaque **neutral** floor **with blur** for read-through overlays (menus/tooltips/toasts) |
| `--glass-opaque-bg` | `oklch(calc(var(--glass-opaque-l) * 1%) calc(var(--glass-tint-c) * 1.4) var(--glass-tint-h))` | `oklch(… calc(… * 0.9) …)` | Fully-opaque **tinted** panel floor, **no blur** — L driven by `--glass-opaque-l`; the `glass-opaque` utility, `variant="opaque"`, and the global `data-glass="opaque"` mode |

*(`--glass-tint-h/c/a` are set once and shared across light/dark; `--glass-opaque-l`, `-wash`, and `-solid-bg` differ per mode.)*

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
| `--glass-crystal-bg` | `oklch(100% calc(var(--glass-tint-c) * 0.6) var(--glass-tint-h) / 0.3)` | `… / 0.1` | Crystal fill (white/tonal flavors); the `hue` flavor overrides it with a hue-carrying floor |
| `--glass-crystal-border` | `… / 0.3` | `… / 0.3` (same) | Crystal edge |
| `--glass-crystal-shadow` / `-hover` | glow (dark outer + white) | stronger glow | Crystal glow |

## Crystal gloss (`data-crystal`)

The crystal shine has three flavors — set `data-crystal` on any ancestor (default `tonal`): `white` (flat specular), `tonal` (theme tint), `hue` (iridescent sweep). Tuned by:

| Variable | Default | Purpose |
|---|---|---|
| `--glass-gloss-ink` | `calc(--glass-gloss-l %) calc(--glass-tint-c × --glass-gloss-tint) --glass-tint-h` | Gloss color (L C H) for white/tonal; set to `var(--shadow-highlight)` for pure white |
| `--glass-gloss-l` | `94` | Highlight lightness (→ %); lower = bolder |
| `--glass-gloss-tint` | `2` | Tonal: × the theme chroma (`0` = white gloss) |
| `--glass-gloss-hue-span` | `40` | Hue: ° the sweep shifts ± around the tint |
| `--glass-gloss-c` | `0.16` | Hue: chroma of the swept stops |
| `--glass-gloss-hue-dir` | `1` | Direction (±1) — flips the tonal streak diagonal + the hue sweep order |

*(Every use carries a fallback, so the gloss ships even if a token is stripped downstream.)*

## Harmonic color

Color-wheel relationships off `--harmony-h` (the content hue, or `0` for the hue-less neutral / bone themes). Pure CSS, so they rotate with the theme.

| Family | What |
|---|---|
| `--hue-*` | Angle tokens: `base`, `complement`, `analogous-1/2`, `split-1/2`, `triad-1/2`, `tetrad-1/2/3`, `square-1/2/3` — use as `oklch(L C var(--hue-triad-1))` |
| `--color-*` | Ready vivid colors at the accent envelope: `complement`, `triad-1/2`, `split-1/2`, `analogous-1/2` |
| `--mono-1..3` | Monochromatic ramp in the theme hue |
| `--alpha-1..6` | Standard alpha tiers: `0.04 · 0.08 · 0.12 · 0.2 · 0.32 · 0.5` |

## Shadow & press

| Variable | Value | Purpose |
|---|---|---|
| `--shadow-ink` | `0% 0 0` | Base shadow color (apply alpha at the call site) — one knob for every drop / pressed-inset shadow |
| `--shadow-highlight` | `100% 0 0` | Inner bevel / top-highlight color |
| `--press-shadow-sm` / `--press-shadow` / `-strong` / `-deep` | inset composites off `--shadow-ink` | Active/pressed depth ladder (mode-aware; used by button / tabs / toggle — no `dark:` twin) |
| `--active-shadow` | drop + inset-highlight | The selected-control **lift** (tabs / toggle) |

## Non-color tokens

| Variable | Value | Dark | Purpose |
|---|---|---|---|
| `--radius` | `1.25rem` | *(inherited)* | Base radius; `--radius-sm/md/lg/xl` derive from it in `@theme` |
| `--blur` / `-sm` / `-lg` / `-frosted` / `-crystal` | `10` / `4` / `20` / `25` / `2px` | *(inherited)* | Backdrop-blur amounts per glass size/variant |
| `--gradient` | `oklch(base + offset) → oklch(base)`, base `0.6 0.15 H` | `0.68 0.14 …` | **Theme-aware, parameterized** brand gradient — base in `--grad-l/c/h` (h = `--glass-tint-h`), offset in `--grad-dl/dc/dh` (default = hue ramp, 3 steps out, 8/side). The `gradient-{hue,chroma,lightness,tonal}` + `gradient-reverse` @utilities re-aim it along each ramp axis; drives `glass-gradient` + the `gradient` Button |

`--radius` and the `--blur*` family are **not** redefined in `.dark` — they carry through both modes. (`--gradient` *is* mode-specific — a lifted lightness in dark, like `--glass-accent`.)
