/**
 * Demos the harmonic color tokens minted in globals.css — pure CSS custom properties derived from the
 * harmony anchor hue (--harmony-h), no JS. Every swatch is `oklch(… var(--hue-*))` / `var(--color-*)`, so it
 * FOLLOWS THE ACTIVE THEME automatically: switch the tint from the header switcher and the whole set rotates
 * in context (the inline vars re-resolve via the cascade — no re-render). Neutral + bone anchor the wheel at
 * 0°, so their accents stay a colorful red-based harmony. Sibling of gradient-schemes-demo (JS generator);
 * this one proves the same relationships work as static, everywhere-usable tokens.
 */

const HUES = [
  [
    "base",
    "--hue-base",
  ],
  [
    "complement",
    "--hue-complement",
  ],
  [
    "analogous-1",
    "--hue-analogous-1",
  ],
  [
    "analogous-2",
    "--hue-analogous-2",
  ],
  [
    "split-1",
    "--hue-split-1",
  ],
  [
    "split-2",
    "--hue-split-2",
  ],
  [
    "triad-1",
    "--hue-triad-1",
  ],
  [
    "triad-2",
    "--hue-triad-2",
  ],
  [
    "tetrad-1",
    "--hue-tetrad-1",
  ],
  [
    "tetrad-2",
    "--hue-tetrad-2",
  ],
  [
    "tetrad-3",
    "--hue-tetrad-3",
  ],
  [
    "square-1",
    "--hue-square-1",
  ],
  [
    "square-2",
    "--hue-square-2",
  ],
  [
    "square-3",
    "--hue-square-3",
  ],
] as const;

const COLORS = [
  "complement",
  "analogous-1",
  "analogous-2",
  "split-1",
  "split-2",
  "triad-1",
  "triad-2",
] as const;

export function HarmonicSwatchesDemo() {
  return (
    <section className="glass-surface w-full max-w-2xl rounded-xl p-6">
      <h2 className="mb-1 font-semibold text-foreground text-xl">Harmonic color tokens</h2>
      <p className="mb-6 text-muted-foreground text-sm">
        CSS custom properties derived from the harmony anchor hue (<code className="text-xs">--harmony-h</code>) — no JS. Each is{" "}
        <code className="text-xs">calc(var(--harmony-h) + N°)</code>, and they <strong>follow the active theme</strong> — switch it from the header
        (◇) to see the harmony in context. Neutral + bone anchor the wheel at <strong>0°</strong>, so their accents stay a colorful red-based set.
      </p>

      <h3 className="mb-2 font-medium text-foreground text-sm">
        <code className="text-xs">--hue-*</code> — angle tokens, shown at a fixed illustrative chroma to reveal each angle
      </h3>
      <div className="mb-6 grid grid-cols-4 gap-3 sm:grid-cols-7">
        {HUES.map(([label, v]) => (
          <div key={v} className="flex flex-col items-center gap-1.5">
            <div
              className="h-14 w-full rounded-lg border border-[var(--glass-border)]"
              style={{
                background: `oklch(0.62 0.16 var(${v}))`,
              }}
            />
            <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <h3 className="mb-2 font-medium text-foreground text-sm">
        <code className="text-xs">--color-*</code> — ready tokens at a fixed vivid chroma (colorful in every theme, incl. neutral/bone)
      </h3>
      <div className="mb-6 grid grid-cols-4 gap-3 sm:grid-cols-7">
        {COLORS.map((c) => (
          <div key={c} className="flex flex-col items-center gap-1.5">
            <div
              className="h-14 w-full rounded-lg border border-[var(--glass-border)]"
              style={{
                background: `var(--color-${c})`,
              }}
            />
            <span className="font-mono text-[10px] text-muted-foreground">{c}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 font-medium text-foreground text-sm">
            <code className="text-xs">--mono-1..3</code>
          </h3>
          <div className="flex overflow-hidden rounded-lg border border-[var(--glass-border)]">
            {[
              1,
              2,
              3,
            ].map((n) => (
              <div
                key={n}
                className="h-12 flex-1"
                style={{
                  background: `var(--mono-${n})`,
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 font-medium text-foreground text-sm">Alpha tiers — accent at 0.04 → 0.5</h3>
          <div className="flex overflow-hidden rounded-lg border border-[var(--glass-border)]">
            {/* Design-guidance ramp (not theme tokens): hairline → subtle → standard → pressed → prominent → scrim. */}
            {[
              0.04,
              0.08,
              0.12,
              0.2,
              0.32,
              0.5,
            ].map((a) => (
              <div
                key={a}
                className="h-12 flex-1"
                style={{
                  background: `oklch(0.6 0.18 var(--glass-fg-h) / ${a})`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
