# Glow

The optional colored halo on glass components: the Button's default `effect="glow"`, and the `glow` prop on cards, badges, avatars, etc. One token, one composable shadow layer, and it shows under **every** glass style.

> Authored in **`app/globals.css`** alongside the rest of the glass system.

---

## How it works

Three pieces:

| Piece | What it is |
|---|---|
| `--glass-glow` | The glow **color**: `oklch(… var(--glass-tint-h) … / α)`, so it tracks the active tint (Sapphire → blue, Sistine → amber). `0.45` alpha in light, `0.5` in dark. |
| `--glow-layer` | A **composable shadow**, registered with `@property { syntax: "*"; inherits: false }`. Every glass `box-shadow` folds in `var(--glow-layer, 0 0 0 0 transparent)`, a no-op when unset. `inherits: false` stops a glowing card from lighting up its glass children. |
| `glass-glow` / `glass-glow-lg` | Utilities that set `--glow-layer` to a two-layer colored halo (a dense inner ring + a wider halo). Resting vs. intensified. |

The `effect="glow"` hover effect is `glass-glow hover:glass-glow-lg` (rest → intensify on hover). The boolean `glow` prop applies `glass-glow` directly; some are state-scoped, e.g. checkbox `data-[state=checked]:glass-glow`, accordion `data-[state=open]:glass-glow`.

### Why a *layer* and not a plain shadow

Each material swaps the surface shadow by setting a **token** (`--srf-shadow`) that the `glass` utility reads:

```css
[data-material="crystal"] { --srf-shadow: var(--glass-crystal-shadow); }
```

A plain `shadow-lg shadow-(color:--glass-glow)` glow would be **replaced** the moment a material swaps that shadow, so it wouldn't survive frosted / crystal / opaque. Folding `--glow-layer` into the single `box-shadow` the `glass` utility composes means the glow rides **alongside** whatever shadow the material set, and survives every material:

```css
/* @utility glass */
box-shadow: var(--srf-shadow, var(--srf-elev, var(--glass-shadow))), var(--glow-layer, 0 0 0 0 transparent);
```

> **Exceptions:** the avatar root and separator aren't glass surfaces (their `box-shadow` is never clobbered), so they keep a direct `shadow-(color:--glass-glow)` instead of the layer.

---

## Tuning

| To change… | Edit |
|---|---|
| Strength / shape | the two `@utility glass-glow` / `glass-glow-lg` blocks, blur + spread, two layers. |
| Color / intensity | the `--glass-glow` alpha. Override the whole var to force a glow color independent of the tint. |

---

## Troubleshooting: "the glow doesn't show"

It's almost always **too faint, not broken**. The glow is a low-alpha colored shadow, so it washes out on a busy backdrop. (It was invisible as a single diffuse `0 0 18px` at `0.25` alpha; the fix was a two-layer halo with spread at `0.45 / 0.5`.)

Before assuming the *mechanism* is broken, **verify against the real build's compiled CSS**, not source, and not a standalone compile:

- `bun run build`, then grep **`.next/static/chunks/*.css`** (Turbopack puts CSS there, **not** `.next/static/css/`). Dev output lives under `.next/dev/static/chunks/*.css`.
- Do **not** test with `@tailwindcss/cli --content <file>`: `--content` is a v3 flag, **ignored by v4**, so component sources aren't scanned and `@utility` / arbitrary classes look "missing" when they're actually fine.
- `bun run registry:build` passing does **not** prove the CSS compiles: the registry embeds **raw** `globals.css` (no lightningcss).

> Rule of thumb: ask "is it rendering but invisible?" (alpha / contrast / geometry) before touching the mechanism.

---

See also: [`docs/color-tokens.md`](./color-tokens.md) · [the glass system in `app/globals.css`](../app/globals.css).
