/** Named palette shared by the color picker and the material comparison. CSS owns each preset’s mode-specific paint. */
export const GLASS_TINT_PRESETS = [
  {
    value: "selenite",
    label: "Selenite",
    h: 250,
    c: 0,
    a: 0,
    swatch: "oklch(90% 0 0)",
  },
  {
    value: "onyx",
    label: "Onyx",
    h: 250,
    c: 0,
    a: 0.94,
    swatch: "oklch(18% 0 0)",
  },
  {
    value: "sistine",
    label: "Sistine",
    h: 75,
    c: 0.062,
    a: 0.16,
    bespoke: true,
    swatch: "linear-gradient(135deg in oklch, oklch(82% 0.12 75), oklch(80% 0.12 8), oklch(78% 0.12 255), oklch(80% 0.12 158))",
  },
  {
    value: "muse",
    label: "Muse",
    h: 230,
    c: 0.056,
    a: 0.1,
    bespoke: true,
    swatch: "linear-gradient(135deg in oklch, oklch(85% 0.1 222), oklch(78% 0.2 326), oklch(84% 0.12 74))",
  },
  {
    value: "aurora",
    label: "Aurora",
    h: 205,
    c: 0.054,
    a: 0.16,
    bespoke: true,
    swatch: "linear-gradient(135deg in oklch, oklch(76.3% 0.124 235), oklch(74.7% 0.111 205), oklch(71.8% 0.155 155))",
  },
  {
    value: "gloaming",
    label: "Gloaming",
    h: 32,
    c: 0.089,
    a: 0.12,
    bespoke: true,
    swatch: "linear-gradient(135deg in oklch, oklch(84% 0.13 62), oklch(78% 0.15 350), oklch(64% 0.14 278))",
  },
  {
    value: "moonstone",
    label: "Moonstone",
    h: 75,
    c: 0.047,
    a: 0.18,
    swatch: "oklch(94% 0.047 75)",
  },
  {
    value: "amber",
    label: "Amber",
    h: 75,
    c: 0.062,
    a: 0.38,
    swatch: "oklch(85% 0.13 75)",
  },
  {
    value: "rose",
    label: "Rose",
    h: 8,
    c: 0.095,
    a: 0.17,
    swatch: "oklch(82% 0.12 8)",
  },
  {
    value: "goldstone",
    label: "Goldstone",
    h: 22,
    c: 0.094,
    a: 0.17,
    swatch: "oklch(68% 0.15 22)",
  },
  {
    value: "amethyst",
    label: "Amethyst",
    h: 300,
    c: 0.101,
    a: 0.15,
    swatch: "oklch(78% 0.13 300)",
  },
  {
    value: "celestite",
    label: "Celestite",
    h: 235,
    c: 0.064,
    a: 0.2,
    swatch: "oklch(80% 0.11 235)",
  },
  {
    value: "sapphire",
    label: "Sapphire",
    h: 255,
    c: 0.075,
    a: 0.19,
    swatch: "oklch(78% 0.13 255)",
  },
  {
    value: "sodalite",
    label: "Sodalite",
    h: 262,
    c: 0.08,
    a: 0.11,
    swatch: "oklch(66% 0.17 262)",
  },
  {
    value: "lapis",
    label: "Lapis",
    h: 268,
    c: 0.085,
    a: 0.13,
    swatch: "oklch(56% 0.21 268)",
  },
  {
    value: "tanzanite",
    label: "Tanzanite",
    h: 284,
    c: 0.093,
    a: 0.1,
    swatch: "oklch(67% 0.17 284)",
  },
  {
    value: "aventurine",
    label: "Aventurine",
    h: 158,
    c: 0.076,
    a: 0.54,
    swatch: "oklch(80% 0.13 158)",
  },
  {
    value: "carnelian",
    label: "Carnelian",
    h: 38,
    c: 0.081,
    a: 0.19,
    swatch: "oklch(78% 0.14 38)",
  },
  {
    value: "citrine",
    label: "Citrine",
    h: 100,
    c: 0.066,
    a: 0.54,
    swatch: "oklch(90% 0.16 100)",
  },
  {
    value: "peridot",
    label: "Peridot",
    h: 128,
    c: 0.083,
    a: 0.54,
    swatch: "oklch(86% 0.16 128)",
  },
  {
    value: "turquoise",
    label: "Turquoise",
    h: 190,
    c: 0.057,
    a: 0.54,
    swatch: "oklch(82% 0.1 190)",
  },
  {
    value: "aquamarine",
    label: "Aquamarine",
    h: 215,
    c: 0.053,
    a: 0.5,
    swatch: "oklch(80% 0.11 215)",
  },
  {
    value: "tourmaline",
    label: "Tourmaline",
    h: 342,
    c: 0.106,
    a: 0.18,
    swatch: "oklch(76% 0.16 342)",
  },
] as const;

type PresetName = (typeof GLASS_TINT_PRESETS)[number]["value"];

/**
 * Day/night PAIRS: one switcher chip that wears a light-mode preset by day and a dark-mode one by night.
 * Not a theme preset. The switcher writes the plain preset for the current mode onto <html> and swaps it
 * when the mode flips, so the theme, AutoForeground and every rule written for selenite or onyx only ever
 * see a preset they already know. A CSS-only consumer pairs them the same way, from its own mode toggle.
 */
export const GLASS_TINT_PAIRS = [
  {
    id: "selenite-onyx",
    label: "Selenite by day, onyx by night",
    day: "selenite",
    night: "onyx",
    // Selenite's white and onyx's black, split on the diagonal.
    swatch: "linear-gradient(135deg, oklch(90% 0 0) 50%, oklch(18% 0 0) 50%)",
  },
] as const satisfies readonly {
  id: string;
  label: string;
  day: PresetName;
  night: PresetName;
  swatch: string;
}[];
