export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  radius?: string;
  // Glass effect variables
  glassBg?: string;
  glassBorder?: string;
  glassShadow?: string;
  glassShadowLg?: string;
  glassShadowSm?: string;
  blur?: string;
  blurSm?: string;
  blurLg?: string;
  // Dark mode glass variables
  darkGlassBg?: string;
  darkGlassBorder?: string;
  darkGlassShadow?: string;
  darkGlassShadowLg?: string;
  darkGlassShadowSm?: string;
}

export function generateThemeCSS(colors: ThemeColors, darkColors?: Partial<ThemeColors>): string {
  const lightTheme = `:root {
  --radius: ${colors.radius || "0.625rem"};
  --primary: ${colors.primary};
  --primary-foreground: ${colors.primaryForeground};
  --background: ${colors.background};
  --foreground: ${colors.foreground};
  --card: ${colors.card};
  --card-foreground: ${colors.cardForeground};
  --popover: ${colors.popover};
  --popover-foreground: ${colors.popoverForeground};
  --secondary: ${colors.secondary};
  --secondary-foreground: ${colors.secondaryForeground};
  --muted: ${colors.muted};
  --muted-foreground: ${colors.mutedForeground};
  --accent: ${colors.accent};
  --accent-foreground: ${colors.accentForeground};
  --destructive: ${colors.destructive};
  --destructive-foreground: ${colors.destructiveForeground};
  --border: ${colors.border};
  --input: ${colors.input};
  --ring: ${colors.ring};
  
  /* Glass effect variables - Enhanced with gradient tint and border glow */
  --glass-bg: ${colors.glassBg || "linear-gradient(in oklch, 135deg, oklch(100.000% 0.000000 0.000000 / 0.400000) 0%, oklch(100.000% 0.000000 0.000000 / 0.250000) 50%, oklch(97.6470% 0.010680 245.000000 / 0.300000) 100%)"};
  --glass-border: ${colors.glassBorder || "oklch(100.000% 0.000000 0.000000 / 0.300000)"};
  --glass-shadow: ${colors.glassShadow || "0 8px 32px oklch(0.000000% 0.000000 0.000000 / 0.120000), 0 2px 8px oklch(0.000000% 0.000000 0.000000 / 0.080000), 0 0 0 1px oklch(100.000% 0.000000 0.000000 / 0.100000) inset, 0 0 20px oklch(100.000% 0.000000 0.000000 / 0.050000)"};
  --glass-shadow-lg: ${colors.glassShadowLg || "0 12px 48px oklch(0.000000% 0.000000 0.000000 / 0.180000), 0 4px 16px oklch(0.000000% 0.000000 0.000000 / 0.120000), 0 0 0 1px oklch(100.000% 0.000000 0.000000 / 0.150000) inset, 0 0 30px oklch(100.000% 0.000000 0.000000 / 0.080000)"};
  --glass-shadow-sm: ${colors.glassShadowSm || "0 4px 16px oklch(0.000000% 0.000000 0.000000 / 0.100000), 0 1px 4px oklch(0.000000% 0.000000 0.000000 / 0.060000), 0 0 0 1px oklch(100.000% 0.000000 0.000000 / 0.080000) inset, 0 0 10px oklch(100.000% 0.000000 0.000000 / 0.030000)"};
  --blur: ${colors.blur || "30px"};
  --blur-sm: ${colors.blurSm || "15px"};
  --blur-lg: ${colors.blurLg || "50px"};
}`;

  const darkTheme = darkColors
    ? `
.dark {
  --primary: ${darkColors.primary || colors.primary};
  --primary-foreground: ${darkColors.primaryForeground || colors.primaryForeground};
  --background: ${darkColors.background || colors.background};
  --foreground: ${darkColors.foreground || colors.foreground};
  --card: ${darkColors.card || colors.card};
  --card-foreground: ${darkColors.cardForeground || colors.cardForeground};
  --popover: ${darkColors.popover || colors.popover};
  --popover-foreground: ${darkColors.popoverForeground || colors.popoverForeground};
  --secondary: ${darkColors.secondary || colors.secondary};
  --secondary-foreground: ${darkColors.secondaryForeground || colors.secondaryForeground};
  --muted: ${darkColors.muted || colors.muted};
  --muted-foreground: ${darkColors.mutedForeground || colors.mutedForeground};
  --accent: ${darkColors.accent || colors.accent};
  --accent-foreground: ${darkColors.accentForeground || colors.accentForeground};
  --destructive: ${darkColors.destructive || colors.destructive};
  --destructive-foreground: ${darkColors.destructiveForeground || colors.destructiveForeground};
  --border: ${darkColors.border || colors.border};
  --input: ${darkColors.input || colors.input};
  --ring: ${darkColors.ring || colors.ring};
  
  /* Glass effect variables - Dark mode (Enhanced with gradient tint and border glow) */
  --glass-bg: ${colors.darkGlassBg || darkColors.darkGlassBg || "linear-gradient(in oklch, 135deg, oklch(100.000% 0.000000 0.000000 / 0.150000) 0%, oklch(100.000% 0.000000 0.000000 / 0.080000) 50%, oklch(97.6470% 0.010680 245.000000 / 0.100000) 100%)"};
  --glass-border: ${colors.darkGlassBorder || darkColors.darkGlassBorder || "oklch(100.000% 0.000000 0.000000 / 0.250000)"};
  --glass-shadow: ${colors.darkGlassShadow || darkColors.darkGlassShadow || "0 8px 32px oklch(0.000000% 0.000000 0.000000 / 0.500000), 0 2px 8px oklch(0.000000% 0.000000 0.000000 / 0.300000), 0 0 0 1px oklch(100.000% 0.000000 0.000000 / 0.150000) inset, 0 0 20px oklch(100.000% 0.000000 0.000000 / 0.080000)"};
  --glass-shadow-lg: ${colors.darkGlassShadowLg || darkColors.darkGlassShadowLg || "0 12px 48px oklch(0.000000% 0.000000 0.000000 / 0.600000), 0 4px 16px oklch(0.000000% 0.000000 0.000000 / 0.400000), 0 0 0 1px oklch(100.000% 0.000000 0.000000 / 0.200000) inset, 0 0 30px oklch(100.000% 0.000000 0.000000 / 0.100000)"};
  --glass-shadow-sm: ${colors.darkGlassShadowSm || darkColors.darkGlassShadowSm || "0 4px 16px oklch(0.000000% 0.000000 0.000000 / 0.400000), 0 1px 4px oklch(0.000000% 0.000000 0.000000 / 0.200000), 0 0 0 1px oklch(100.000% 0.000000 0.000000 / 0.100000) inset, 0 0 10px oklch(100.000% 0.000000 0.000000 / 0.050000)"};
}`
    : "";

  return lightTheme + darkTheme;
}

export const defaultTheme: ThemeColors = {
  primary: "oklch(0.5 0.2 260)",
  primaryForeground: "oklch(0.9 0.02 260)",
  background: "oklch(0.85 0.1 220)",
  foreground: "oklch(0.1 0.1 280)",
  card: "oklch(0.85 0.1 220)",
  cardForeground: "oklch(0.1 0.1 280)",
  popover: "oklch(0.85 0.1 220)",
  popoverForeground: "oklch(0.1 0.1 280)",
  secondary: "oklch(0.5 0.2 260)",
  secondaryForeground: "oklch(0.1 0.1 280)",
  muted: "oklch(0.85 0 0)", // Darker gray for light mode - avoids glass effect override
  mutedForeground: "oklch(0.5 0.2 280)",
  accent: "oklch(0.5 0.2 260)",
  accentForeground: "oklch(1 0 0)",
  destructive: "oklch(0.6 0.2 20)",
  destructiveForeground: "oklch(1 0 0)",
  border: "oklch(0.5 0.2 260)",
  input: "oklch(0.5 0.2 260)",
  ring: "oklch(0.5 0.2 260)",
  radius: "0rem",
  // Glass effect defaults - Enhanced with gradient tint and border glow
  glassBg: "linear-gradient(in oklch, 135deg, oklch(100.000% 0.000000 0.000000 / 0.400000) 0%, oklch(100.000% 0.000000 0.000000 / 0.250000) 50%, oklch(97.6470% 0.010680 245.000000 / 0.300000) 100%)",
  glassBorder: "oklch(100.000% 0.000000 0.000000 / 0.300000)",
  glassShadow:
    "0 8px 32px oklch(0.000000% 0.000000 0.000000 / 0.120000), 0 2px 8px oklch(0.000000% 0.000000 0.000000 / 0.080000), 0 0 0 1px oklch(100.000% 0.000000 0.000000 / 0.100000) inset, 0 0 20px oklch(100.000% 0.000000 0.000000 / 0.050000)",
  glassShadowLg:
    "0 12px 48px oklch(0.000000% 0.000000 0.000000 / 0.180000), 0 4px 16px oklch(0.000000% 0.000000 0.000000 / 0.120000), 0 0 0 1px oklch(100.000% 0.000000 0.000000 / 0.150000) inset, 0 0 30px oklch(100.000% 0.000000 0.000000 / 0.080000)",
  glassShadowSm:
    "0 4px 16px oklch(0.000000% 0.000000 0.000000 / 0.100000), 0 1px 4px oklch(0.000000% 0.000000 0.000000 / 0.060000), 0 0 0 1px oklch(100.000% 0.000000 0.000000 / 0.080000) inset, 0 0 10px oklch(100.000% 0.000000 0.000000 / 0.030000)",
  blur: "30px",
  blurSm: "15px",
  blurLg: "50px",
  // Dark mode glass defaults - Enhanced with gradient tint and border glow
  darkGlassBg: "linear-gradient(in oklch, 135deg, oklch(100.000% 0.000000 0.000000 / 0.150000) 0%, oklch(100.000% 0.000000 0.000000 / 0.080000) 50%, oklch(97.6470% 0.010680 245.000000 / 0.100000) 100%)",
  darkGlassBorder: "oklch(100.000% 0.000000 0.000000 / 0.250000)",
  darkGlassShadow:
    "0 8px 32px oklch(0.000000% 0.000000 0.000000 / 0.500000), 0 2px 8px oklch(0.000000% 0.000000 0.000000 / 0.300000), 0 0 0 1px oklch(100.000% 0.000000 0.000000 / 0.150000) inset, 0 0 20px oklch(100.000% 0.000000 0.000000 / 0.080000)",
  darkGlassShadowLg:
    "0 12px 48px oklch(0.000000% 0.000000 0.000000 / 0.600000), 0 4px 16px oklch(0.000000% 0.000000 0.000000 / 0.400000), 0 0 0 1px oklch(100.000% 0.000000 0.000000 / 0.200000) inset, 0 0 30px oklch(100.000% 0.000000 0.000000 / 0.100000)",
  darkGlassShadowSm:
    "0 4px 16px oklch(0.000000% 0.000000 0.000000 / 0.400000), 0 1px 4px oklch(0.000000% 0.000000 0.000000 / 0.200000), 0 0 0 1px oklch(100.000% 0.000000 0.000000 / 0.100000) inset, 0 0 10px oklch(100.000% 0.000000 0.000000 / 0.050000)",
};
