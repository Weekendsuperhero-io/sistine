/**
 * TST-2-1 — the switcher must not write `--glass-opacity` inline unless the user actually chose one.
 *
 * `@utility glass` composes `var(--glass-opacity, 0.7)`, so the STYLESHEET owns the default. The
 * switcher used to write the property onto <html> unconditionally on mount, which pinned the surface
 * to whatever the React state happened to be and made that fallback unreachable — the same shape of bug
 * as the crystal gloss twin (an inline style on <html> outranks every stylesheet rule).
 *
 * The subtle case these pin is a stored "0": it is a legitimate override meaning "fully sheer", not an
 * absent preference, and a truthiness check would silently discard it.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GlassTintSwitcher } from "@/components/glass-tint-switcher";

const OPACITY_KEY = "sistine-glass-opacity";

const root = () => document.documentElement;
/** The INLINE value only. `style.getPropertyValue` never sees the stylesheet, which is the point. */
const inlineOpacity = () => root().style.getPropertyValue("--glass-opacity");
/** Likewise inline-only: the whole point is that CSS, not <html>, owns this one. */
const inlineAlpha = () => root().style.getPropertyValue("--glass-tint-a");

/** The switcher writes on mount inside an effect; wait for that pass to settle. */
async function mounted() {
  render(<GlassTintSwitcher />);
  await waitFor(() => expect(screen.getByRole("button")).toBeInTheDocument());
}

beforeEach(() => {
  localStorage.clear();
  root().removeAttribute("style");
  root().className = "";
  delete root().dataset.glassTint;
});

afterEach(() => {
  localStorage.clear();
  root().removeAttribute("style");
  root().className = "";
  delete root().dataset.glassTint;
});

describe("GlassTintSwitcher: --glass-opacity persistence", () => {
  it("writes nothing inline when there is no stored preference", async () => {
    /* The regression. An inline write here shadows @utility glass's 0.7 fallback, so the theme default
       becomes unreachable and every consumer of the demo sees the switcher's idea of opacity instead. */
    await mounted();
    await waitFor(() => expect(inlineOpacity()).toBe(""));
  });

  it("applies a stored preference inline", async () => {
    localStorage.setItem(OPACITY_KEY, "0.35");
    await mounted();
    await waitFor(() => expect(inlineOpacity()).toBe("0.35"));
  });

  it("honours a stored 0 rather than treating it as absent", async () => {
    /* 0 is falsy, so any truthiness check would drop it and silently restore the 0.7 default — the
       user asked for fully sheer glass and would get a 70% solid floor instead. */
    localStorage.setItem(OPACITY_KEY, "0");
    await mounted();
    await waitFor(() => expect(inlineOpacity()).toBe("0"));
  });

  it("falls back to the stylesheet when the stored value is unparseable", async () => {
    localStorage.setItem(OPACITY_KEY, "not-a-number");
    await mounted();
    await waitFor(() => expect(screen.getByRole("button")).toBeInTheDocument());
    expect(inlineOpacity()).toBe("");
  });

  it("clears a previously-written inline value when storage is empty", async () => {
    /* removeProperty, not "skip the write": a stale inline value from an earlier session or another
       control would otherwise survive and keep shadowing the stylesheet. */
    root().style.setProperty("--glass-opacity", "0.9");
    await mounted();
    await waitFor(() => expect(inlineOpacity()).toBe(""));
  });
});

/**
 * TST-2-1 — a named preset must hand `--glass-tint-a` back to CSS rather than inline it.
 *
 * Alpha is the blend weight sliding a surface from the material floor toward the tint wash, and how far
 * it can travel before body text drops under the 75 Lc floor depends on the MODE: a wash sitting near
 * dark's floor barely moves it, the same wash in light drags the surface through the mid-tone band where
 * no text polarity reaches the floor. So alpha is a mode twin — lapis takes 0.54 in dark and 0.13 in
 * light — carried by `[data-glass-tint="lapis"]` and `.dark[data-glass-tint="lapis"]`.
 *
 * An inline value on <html> outranks BOTH blocks at once, which is what makes this worth pinning: it
 * does not merely override one number, it collapses the twin to whichever single value the preset table
 * happened to hold, silently stranding that preset in the other mode. scripts/check-contrast.mjs cannot
 * see it — it reads the CSS, and the CSS stays correct; only the runtime DOM goes wrong.
 */
describe("GlassTintSwitcher: per-mode alpha stays with CSS", () => {
  /** Open the popover and pick a swatch by its aria-label. */
  async function pick(label: string) {
    const user = userEvent.setup();
    await mounted();
    await user.click(screen.getByLabelText("Glass color"));
    await user.click(await screen.findByLabelText(label));
  }

  it("sets data-glass-tint and inlines no alpha for a named preset", async () => {
    await pick("Lapis");

    /* The attribute is what activates the preset's block at all — its per-hue --glass-wash-l and its
       mode-split alpha both live behind it. Jewels used to apply as bare inline h/c/a with no attribute,
       which left the whole per-hue system inert on this switcher. */
    await waitFor(() => expect(root().dataset.glassTint).toBe("lapis"));
    expect(inlineAlpha()).toBe("");
  });

  it("removes a stale inline alpha left by an earlier custom tint", async () => {
    /* The path that actually bites: drag to a custom colour (which legitimately inlines its own alpha,
       having no CSS block to read from), then pick a preset. Skipping the write is not enough here —
       the old value survives and shadows the twin. It has to be removed. */
    root().style.setProperty("--glass-tint-a", "0.94");

    await pick("Lapis");

    await waitFor(() => expect(inlineAlpha()).toBe(""));
  });

  it("still pins hue and chroma inline", async () => {
    /* Alpha is delegated; h and c are not. They stay inline so a drag off a preset starts from the
       preset's own numbers, and check-theme's [tint-sync] asserts they match the block they shadow. */
    await pick("Lapis");

    await waitFor(() => expect(root().style.getPropertyValue("--glass-tint-h")).not.toBe(""));
    expect(root().style.getPropertyValue("--glass-tint-c")).not.toBe("");
  });

  /**
   * REV-3-1 — a saved CUSTOM tint must not leak onto a named preset at MOUNT.
   *
   * `sistine-glass-tint-custom` persists for good once the user has dragged the sliders even once. The
   * mount effect restored it unconditionally, so from then on every reload overwrote the SELECTED
   * preset's hue and chroma with those stale custom numbers, and — because the alpha delegation was
   * gated on "does a custom tint exist in storage" rather than "is custom the active base" — re-inlined
   * the alpha too. The attribute still said `lapis` while the inline vars said something else entirely,
   * with the mode split collapsed to one number.
   *
   * The delegation tests above all pick a preset by CLICK, which routes through `choose()` and never
   * touches this branch, so the whole class was invisible to them. That is the gap: the bug lives on
   * the reload path, not the interaction path.
   */
  it("ignores a saved custom tint when a named preset is the active base", async () => {
    localStorage.setItem("sistine-glass-tint", "lapis");
    localStorage.setItem(
      "sistine-glass-tint-custom",
      JSON.stringify({
        h: 30,
        c: 0.2,
        a: 0.9,
      }),
    );

    await mounted();

    /* Lapis's own hue, not the custom 30 — and critically NO inline alpha, so `[data-glass-tint="lapis"]`
       and `.dark[data-glass-tint="lapis"]` keep their 0.13 / 0.54 split. */
    await waitFor(() => expect(root().dataset.glassTint).toBe("lapis"));
    expect(inlineAlpha()).toBe("");
    expect(root().style.getPropertyValue("--glass-tint-h")).toBe("268");
    expect(root().style.getPropertyValue("--glass-tint-c")).toBe("0.085");
  });

  it("still restores the custom tint when custom IS the active base", async () => {
    /* The other side: the custom path has no CSS block to read from, so it MUST inline all three. A fix
       that simply stopped reading CUSTOM_KEY would silently discard the user's own colour on reload. */
    localStorage.setItem("sistine-glass-tint", "custom");
    localStorage.setItem(
      "sistine-glass-tint-custom",
      JSON.stringify({
        h: 30,
        c: 0.2,
        a: 0.9,
      }),
    );

    await mounted();

    await waitFor(() => expect(root().style.getPropertyValue("--glass-tint-h")).toBe("30"));
    expect(root().style.getPropertyValue("--glass-tint-c")).toBe("0.2");
    expect(inlineAlpha()).toBe("0.9");
    expect(root().dataset.glassTint).toBeUndefined();
  });
});
