import type * as React from "react";

/**
 * The Sistine material system — the single source of the material → markup mapping.
 *
 * FOUR materials (glass, frosted, crystal, opaque), each a `[data-material]` token set in
 * app/theme/materials.css, composed with orthogonal AXES (border, veil, size, gradient, glow, sheen)
 * over the one structural `glass` utility. Components call `glassMaterial()` instead of hardcoding
 * recipe class strings (check-theme bans the legacy `glass-bg`/`glass-surface`/… classes).
 *
 * Semantics:
 * - `material` UNDEFINED = adaptive: no attribute is rendered; the surface follows the page's
 *   [data-glass] style (the default everywhere).
 * - An explicit material PINS the element under any page style, and — because the token set is
 *   inherited custom properties — also acts as a scoped default for adaptive glass descendants
 *   (a dialog set to frosted re-skins the controls inside it; pin a child back with its own material).
 * - `"none"` = not a glass surface: the helper returns nothing and the component supplies its plain
 *   (shadcn) classes.
 */
export type Material = "glass" | "frosted" | "crystal" | "opaque" | "none";

export interface MaterialProps {
  /** undefined = adaptive (follows the page style); "none" = the component's plain fallback. */
  material?: Material;
  /** Material border. Three weights: `true`/"hairline" = the material's edge (1px; 0.5px under
   *  frosted), "rim" = 4px, "frame" = 8px (thick frames pair best with larger radii). */
  border?: boolean | "hairline" | "rim" | "frame";
  /** Element-composed legibility floor for read-through overlays (menus, tooltips, toasts). */
  veil?: boolean;
  /** Blur/elevation tier — INTERNAL: set by a component's ROLE (glass-sm/-lg), not a public prop
   *  ("size" universally means a component's dimensions; the material tier must never shadow that). */
  size?: "sm" | "lg";
  /** Brand-gradient accent layered over the material. */
  gradient?: boolean;
  /** Resting glow, or the intensified "lg" halo. */
  glow?: boolean | "lg";
  /** Opt-in hover shimmer (pseudo-element based — avoid on sticky/fixed surfaces). */
  sheen?: boolean;
}

/** The PUBLIC per-instance axis props a component spreads onto its type. Excludes `size` (the material
 *  blur tier is a role-internal detail — a component's own `size` prop owns that name). */
export type MaterialAxisProps = Omit<MaterialProps, "size">;

export interface MaterialAttrs {
  /** Spread-ready: undefined for adaptive and "none". */
  "data-material"?: Exclude<Material, "none">;
  /** "" when material === "none" (caller supplies its plain classes). */
  className: string;
}

export function glassMaterial(props: MaterialProps = {}): MaterialAttrs {
  const { material, border, veil, size, gradient, glow, sheen } = props;
  if (material === "none") {
    return {
      className: "",
    };
  }
  return {
    "data-material": material,
    className: [
      "glass",
      border && "glass-border",
      border === "rim" && "glass-border-rim",
      border === "frame" && "glass-border-frame",
      veil && "glass-veil",
      size === "sm" && "glass-sm",
      size === "lg" && "glass-lg",
      gradient && "glass-gradient",
      glow === "lg" ? "glass-glow-lg" : glow ? "glass-glow" : false,
      sheen && "glass-sheen",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

/**
 * The component-facing resolver: merge a component's ROLE (its default axes for a given semantic
 * variant) with explicit per-instance material/axis props, and return the surface markup — or null
 * when the element is NOT a glass surface (role === null, or material === "none").
 *
 * Explicit props override the role per-axis; unspecified axes fall back to the role.
 */
export function materialSurface(role: MaterialProps | null, props: MaterialProps): MaterialAttrs | null {
  if (props.material === "none" || role === null) {
    return null;
  }
  return glassMaterial({
    material: props.material,
    border: props.border ?? role.border,
    veil: props.veil ?? role.veil,
    size: props.size ?? role.size,
    gradient: props.gradient ?? role.gradient,
    glow: props.glow ?? role.glow,
    sheen: props.sheen ?? role.sheen,
  });
}

/**
 * Typed per-element knobs → CSS custom properties ONLY (the cascade-native successor to the old
 * `glass={{…}}` inline-style prop). Everything routes through the token system, so nothing here can
 * fight a material, a page style, or the theme.
 *
 * The tint* keys recolor engine-composed tokens, which re-resolve at grouped declarations — pair
 * them with a `data-glass-tint` attribute on the same element so the engine re-composes there.
 */
export interface GlassVars {
  /** → --glass-tint-h (surface hue) */
  tintH?: number;
  /** → --glass-tint-c (surface chroma — the colorfulness master) */
  tintC?: number;
  /** → --glass-tint-a (tint film alpha) */
  tintA?: number;
  /** → --glass-opacity (0..1 solidify dial; element-composed in `glass`) */
  opacity?: number;
  /** → --srf-blur (number → px; glass material only) */
  blur?: number | string;
  /** → --glass-solid-a (veil floor alpha; element-composed in `glass-veil`) */
  solidA?: number;
}

export function glassVars(v: GlassVars = {}): React.CSSProperties {
  const s: Record<string, string> = {};
  if (v.tintH !== undefined) {
    s["--glass-tint-h"] = String(v.tintH);
  }
  if (v.tintC !== undefined) {
    s["--glass-tint-c"] = String(v.tintC);
  }
  if (v.tintA !== undefined) {
    s["--glass-tint-a"] = String(v.tintA);
  }
  if (v.opacity !== undefined) {
    s["--glass-opacity"] = String(v.opacity);
  }
  if (v.blur !== undefined) {
    s["--srf-blur"] = typeof v.blur === "number" ? `${v.blur}px` : v.blur;
  }
  if (v.solidA !== undefined) {
    s["--glass-solid-a"] = String(v.solidA);
  }
  return s as React.CSSProperties;
}
