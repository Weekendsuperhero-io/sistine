/**
 * Demos the harmonic color tokens minted in globals.css — pure CSS custom properties derived from the
 * harmony anchor hue (--harmony-h), no JS. Every swatch is `oklch(… var(--hue-*))` / `var(--color-*)`, so it
 * FOLLOWS THE ACTIVE THEME automatically: switch the tint from the header switcher and the whole set rotates
 * in context (the inline vars re-resolve via the cascade — no re-render). Selenite + moonstone anchor the wheel at
 * 0°, so their accents stay a colorful red-based harmony. One labeled ROW per harmony STYLE (complement /
 * analogous / split / triad / tetrad / square / monochromatic) so each relationship reads left-to-right from
 * its base hue. Sibling of gradient-schemes-demo (JS generator); this one proves the same relationships work
 * as static, everywhere-usable tokens.
 */

type Swatch = {
  label: string;
  bg: string;
};

/** Angle-token swatch at the fixed illustrative chroma (reveals the hue relationship in every theme). */
function hueSwatch(label: string, v: string): Swatch {
  return {
    label,
    bg: `oklch(0.62 0.16 var(${v}))`,
  };
}

/** One row per harmony style — same swatch rendering as before, regrouped by relationship (base hue first,
 *  then its offsets). Monochromatic uses the ready --mono-* tones (same hue, stepped lightness). */
const ROWS: {
  label: string;
  swatches: Swatch[];
}[] = [
  {
    label: "Complement",
    swatches: [
      hueSwatch("base", "--hue-base"),
      hueSwatch("+180", "--hue-complement"),
    ],
  },
  {
    label: "Analogous",
    swatches: [
      hueSwatch("−30", "--hue-analogous-1"),
      hueSwatch("base", "--hue-base"),
      hueSwatch("+30", "--hue-analogous-2"),
    ],
  },
  {
    label: "Split",
    swatches: [
      hueSwatch("base", "--hue-base"),
      hueSwatch("+150", "--hue-split-1"),
      hueSwatch("+210", "--hue-split-2"),
    ],
  },
  {
    label: "Triad",
    swatches: [
      hueSwatch("base", "--hue-base"),
      hueSwatch("+120", "--hue-triad-1"),
      hueSwatch("+240", "--hue-triad-2"),
    ],
  },
  {
    label: "Tetrad",
    swatches: [
      hueSwatch("base", "--hue-base"),
      hueSwatch("+60", "--hue-tetrad-1"),
      hueSwatch("+180", "--hue-tetrad-2"),
      hueSwatch("+240", "--hue-tetrad-3"),
    ],
  },
  {
    label: "Square",
    swatches: [
      hueSwatch("base", "--hue-base"),
      hueSwatch("+90", "--hue-square-1"),
      hueSwatch("+180", "--hue-square-2"),
      hueSwatch("+270", "--hue-square-3"),
    ],
  },
  {
    label: "Monochromatic",
    swatches: [
      {
        label: "mono-1",
        bg: "var(--mono-1)",
      },
      {
        label: "mono-2",
        bg: "var(--mono-2)",
      },
      {
        label: "mono-3",
        bg: "var(--mono-3)",
      },
    ],
  },
];

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
    <section className="glass glass-border w-full max-w-2xl rounded-xl p-6">
      <h2 className="mb-1 font-semibold text-foreground text-xl">Harmonic color tokens</h2>
      <p className="mb-6 text-muted-foreground text-sm">
        CSS custom properties derived from the harmony anchor hue (<code className="text-xs">--harmony-h</code>), no JS. Each is{" "}
        <code className="text-xs">calc(var(--harmony-h) + N°)</code>, and they <strong>follow the active theme</strong>: switch it from the header (◇)
        to see the harmony in context. Selenite + moonstone anchor the wheel at <strong>0°</strong>, so their accents stay a colorful red-based set.
      </p>

      <h3 className="mb-2 font-medium text-foreground text-sm">
        One row per harmony style: <code className="text-xs">--hue-*</code> angle tokens at a fixed illustrative chroma (mono row:{" "}
        <code className="text-xs">--mono-1..3</code>)
      </h3>
      <div className="mb-6 space-y-3">
        {ROWS.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-muted-foreground text-xs">{row.label}</span>
            <div className="flex gap-2">
              {row.swatches.map((s) => (
                <div key={s.label} className="flex w-14 flex-col items-center gap-1">
                  <div
                    className="h-10 w-full rounded-lg border border-[var(--glass-border)]"
                    style={{
                      background: s.bg,
                    }}
                  />
                  <span className="font-mono text-[10px] text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h3 className="mb-2 font-medium text-foreground text-sm">
        <code className="text-xs">--color-*</code>: ready tokens at a fixed vivid chroma (colorful in every theme, incl. selenite/moonstone)
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

      <div>
        <h3 className="mb-2 font-medium text-foreground text-sm">Alpha tiers: accent at 0.04 → 0.5</h3>
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
    </section>
  );
}
