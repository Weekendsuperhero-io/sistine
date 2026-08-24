/**
 * TST-1-1 — the crystal gloss demo's per-scheme Light override.
 *
 * `--glass-gloss-l` became a mode twin (97 light / 66 dark for tonal, a pinned 74 for hue). The demo
 * used to write ONE inline value on mount, and an inline style on <html> outranks every stylesheet
 * rule, so the gloss froze: toggling day/night moved every other token and left the highlight behind.
 *
 * The fix stores Light as a per-SCHEME map and re-resolves it from a class MutationObserver. These
 * pin the three things that made the bug: the storage SHAPE, that a scheme with no override hands the
 * property back to CSS (rather than writing a stale number), and that flipping `.dark` re-resolves.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CrystalGlossDemo } from "@/components/crystal-gloss-demo";

const L_KEY = "sistine-gloss-l";
const MODE_KEY = "sistine-crystal";

const root = () => document.documentElement;
const inlineL = () => root().style.getPropertyValue("--glass-gloss-l");

beforeEach(() => {
  localStorage.clear();
  root().className = "";
  root().removeAttribute("style");
  localStorage.setItem(MODE_KEY, "tonal"); // the only flavor that shows the Light slider
});

afterEach(() => {
  localStorage.clear();
  root().className = "";
  root().removeAttribute("style");
});

describe("CrystalGlossDemo: per-scheme gloss override", () => {
  it("writes no inline --glass-gloss-l when neither scheme is overridden", async () => {
    /* The whole point of the fix. An unconditional write here is what froze the twin, so "absent" is
       the correct state: CSS owns the value and the day/night pair resolves on its own. */
    render(<CrystalGlossDemo />);
    await waitFor(() => expect(screen.getByText("Light")).toBeInTheDocument());
    expect(inlineL()).toBe("");
  });

  it("applies only the active scheme's override", async () => {
    localStorage.setItem(
      L_KEY,
      JSON.stringify({
        light: 80,
        dark: 70,
      }),
    );
    render(<CrystalGlossDemo />);
    await waitFor(() => expect(inlineL()).toBe("80"));
  });

  it("re-resolves to the other scheme's value when .dark flips", async () => {
    /* The MutationObserver is the mechanism. Without it the light override stayed pinned into dark. */
    localStorage.setItem(
      L_KEY,
      JSON.stringify({
        light: 80,
        dark: 70,
      }),
    );
    render(<CrystalGlossDemo />);
    await waitFor(() => expect(inlineL()).toBe("80"));

    root().classList.add("dark");
    await waitFor(() => expect(inlineL()).toBe("70"));

    root().classList.remove("dark");
    await waitFor(() => expect(inlineL()).toBe("80"));
  });

  it("hands the property back to CSS for a scheme with no override", async () => {
    /* Half-overridden is the interesting case: light is pinned, dark must NOT inherit that number.
       Removing the property is what lets the stylesheet's 66 apply. */
    localStorage.setItem(
      L_KEY,
      JSON.stringify({
        light: 80,
      }),
    );
    render(<CrystalGlossDemo />);
    await waitFor(() => expect(inlineL()).toBe("80"));

    root().classList.add("dark");
    await waitFor(() => expect(inlineL()).toBe(""));
  });

  it("treats a legacy bare number as no override at all", async () => {
    /* Anything persisted before this was a map. That value was only ever correct in one mode, so the
       migration hands those users back to the theme rather than restoring it into both. */
    localStorage.setItem(L_KEY, "88");
    render(<CrystalGlossDemo />);
    await waitFor(() => expect(screen.getByText("Light")).toBeInTheDocument());
    expect(inlineL()).toBe("");
  });

  it("survives an unparseable stored value", async () => {
    localStorage.setItem(L_KEY, "{not json");
    render(<CrystalGlossDemo />);
    await waitFor(() => expect(screen.getByText("Light")).toBeInTheDocument());
    expect(inlineL()).toBe("");
  });

  it("drops every override when the flavor changes", async () => {
    /* Each flavor has its own right answer per scheme (tonal 97/66, hue a pinned 74). Carrying a
       tonal override into hue is how those numbers drift out of the theme. */
    localStorage.setItem(
      L_KEY,
      JSON.stringify({
        light: 80,
        dark: 70,
      }),
    );
    render(<CrystalGlossDemo />);
    await waitFor(() => expect(inlineL()).toBe("80"));

    fireEvent.click(
      screen.getByRole("button", {
        name: "Hue",
      }),
    );

    await waitFor(() => expect(inlineL()).toBe(""));
    expect(JSON.parse(localStorage.getItem(L_KEY) ?? "null")).toEqual({});
  });

  it("clears only the active scheme when Light is handed back", async () => {
    /* The label is clickable only while an override exists. It must delete THIS scheme's key and
       leave the other exactly as the user left it. */
    localStorage.setItem(
      L_KEY,
      JSON.stringify({
        light: 80,
        dark: 70,
      }),
    );
    render(<CrystalGlossDemo />);
    await waitFor(() => expect(inlineL()).toBe("80"));

    fireEvent.click(screen.getByText("Light"));

    await waitFor(() => expect(inlineL()).toBe(""));
    expect(JSON.parse(localStorage.getItem(L_KEY) ?? "null")).toEqual({
      dark: 70,
    });
  });

  it("marks an un-overridden scheme as auto in the readout", async () => {
    render(<CrystalGlossDemo />);
    /* Anchored on the trailing "%" so this keeps matching the LIGHT readout only: Tint carries its own
       "· auto" now (it has to — presets override --glass-gloss-tint), and a bare /· auto$/ matches both. */
    await waitFor(() => expect(screen.getByText(/%\s·\sauto$/)).toBeInTheDocument());

    localStorage.setItem(
      L_KEY,
      JSON.stringify({
        light: 80,
      }),
    );
    /* Re-resolve through the observer rather than remounting, so this exercises the same path a
       real mode toggle takes. */
    root().classList.add("dark");
    root().classList.remove("dark");
    await waitFor(() => expect(screen.getByText("80%")).toBeInTheDocument());
  });
});

/**
 * TST-2-2 — the Tint slider has to be able to give `--glass-gloss-tint` back to the preset.
 *
 * Gloss tint is the multiplier taking the theme chroma up to the highlight's chroma, and presets set
 * their own (moonstone pins 1, against the 4.25 default) because a pale silvery stone with a highlight
 * 4× its own chroma reads as a colour cast rather than a sheen. That override lives in CSS, so an
 * inline value on <html> defeats it for every preset at once.
 *
 * A one-way slider would therefore be a trapdoor: touch it and no preset can ever style its own
 * highlight again for the rest of the session. The `auto` state is the way back out — the same shape as
 * the Light override above, but load-bearing for a different reason: Light's twin is per-SCHEME, this
 * one is per-PRESET, so the value it must defer to changes on every swatch click rather than only at
 * the day/night boundary.
 */
describe("CrystalGlossDemo: tint auto-toggle", () => {
  const inlineTint = () => root().style.getPropertyValue("--glass-gloss-tint");
  const TINT_KEY = "sistine-gloss-tint";
  /** The Tint readout is a bare 2dp number; Light's carries a "%", so this cannot match the wrong row. */
  const tintAutoReadout = () => screen.queryByText(/^\d+\.\d{2}\s·\sauto$/);

  it("writes no inline tint and reads as auto when the user has not chosen one", async () => {
    /* Absent, not "the default written out". Writing 4.25 inline would silently override moonstone's 1
       with the very number the preset exists to replace. */
    render(<CrystalGlossDemo />);
    await waitFor(() => expect(screen.getByText("Tint")).toBeInTheDocument());
    expect(inlineTint()).toBe("");
    expect(tintAutoReadout()).toBeInTheDocument();
  });

  it("locks the value inline once the user has chosen one", async () => {
    localStorage.setItem(TINT_KEY, "2.5");
    render(<CrystalGlossDemo />);
    await waitFor(() => expect(inlineTint()).toBe("2.5"));
    /* Locked: the readout drops "· auto", which is the affordance telling the user CSS no longer owns it. */
    expect(tintAutoReadout()).not.toBeInTheDocument();
  });

  it("hands the property back to the preset when the Tint label is clicked", async () => {
    /* The trapdoor's exit. Clearing storage is not enough on its own — the inline property has to be
       removed too, or the preset's override stays shadowed until a reload. */
    localStorage.setItem(TINT_KEY, "2.5");
    render(<CrystalGlossDemo />);
    await waitFor(() => expect(inlineTint()).toBe("2.5"));

    fireEvent.click(screen.getByText("Tint"));

    await waitFor(() => expect(inlineTint()).toBe(""));
    expect(localStorage.getItem(TINT_KEY)).toBeNull();
    expect(tintAutoReadout()).toBeInTheDocument();
  });

  it("leaves the label inert while the value is already auto", async () => {
    /* onLabelClick is undefined in the auto state, so clicking is a no-op rather than a write of the
       current number — which would re-lock the property the click is meant to release. */
    render(<CrystalGlossDemo />);
    await waitFor(() => expect(screen.getByText("Tint")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Tint"));

    expect(inlineTint()).toBe("");
    expect(localStorage.getItem(TINT_KEY)).toBeNull();
  });
});
