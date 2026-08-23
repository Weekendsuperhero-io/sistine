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
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GlassTintSwitcher } from "@/components/glass-tint-switcher";

const OPACITY_KEY = "sistine-glass-opacity";

const root = () => document.documentElement;
/** The INLINE value only. `style.getPropertyValue` never sees the stylesheet, which is the point. */
const inlineOpacity = () => root().style.getPropertyValue("--glass-opacity");

/** The switcher writes on mount inside an effect; wait for that pass to settle. */
async function mounted() {
  render(<GlassTintSwitcher />);
  await waitFor(() => expect(screen.getByRole("button")).toBeInTheDocument());
}

beforeEach(() => {
  localStorage.clear();
  root().removeAttribute("style");
  root().className = "";
});

afterEach(() => {
  localStorage.clear();
  root().removeAttribute("style");
  root().className = "";
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
