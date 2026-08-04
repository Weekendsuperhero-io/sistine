/**
 * TST-1-3 — patternSand state.
 *
 * The value drives the dune scene's blowing-sand veils. Cycling has to wrap and has to visit every
 * value exactly once per lap — a cycle that skipped or repeated an entry would still appear to "wrap".
 */
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { BackgroundProvider, PATTERN_SANDS, useBackground } from "@/components/background-provider";

function SandProbe() {
  const { patternSand, cyclePatternSand } = useBackground();
  return (
    <button type="button" onClick={cyclePatternSand}>
      {patternSand}
    </button>
  );
}

const renderProbe = () =>
  render(
    <BackgroundProvider>
      <SandProbe />
    </BackgroundProvider>,
  );

describe("BackgroundProvider — patternSand", () => {
  beforeEach(() => localStorage.clear());

  it("exposes a value from the declared set", () => {
    renderProbe();
    expect(PATTERN_SANDS).toContain(screen.getByRole("button").textContent);
  });

  it("cycles through every value in order and wraps back to the start", async () => {
    const user = userEvent.setup();
    renderProbe();
    const button = screen.getByRole("button");

    const start = button.textContent as (typeof PATTERN_SANDS)[number];
    const startIndex = PATTERN_SANDS.indexOf(start);
    expect(startIndex).toBeGreaterThanOrEqual(0);

    // One full lap: every step lands on the next entry, and the last one returns to where we began.
    for (let step = 1; step <= PATTERN_SANDS.length; step++) {
      await user.click(button);
      expect(button.textContent).toBe(PATTERN_SANDS[(startIndex + step) % PATTERN_SANDS.length]);
    }
    expect(button.textContent).toBe(start);
  });

  it("visits each distinct value exactly once per lap", async () => {
    const user = userEvent.setup();
    renderProbe();
    const button = screen.getByRole("button");

    const seen = new Set([
      button.textContent,
    ]);
    for (let i = 0; i < PATTERN_SANDS.length - 1; i++) {
      await user.click(button);
      seen.add(button.textContent);
    }
    // A cycle that skipped or repeated a value would still "wrap" — this is what catches that.
    expect(seen.size).toBe(PATTERN_SANDS.length);
  });

  it("is session-only, like every other pattern knob", async () => {
    /* Only the background TYPE is persisted (STORAGE_KEY "sistine-background"); density, speed, disc
       and sand are all plain useState by design. Pinned so persisting one knob without the others —
       or dropping persistence from the type — shows up as a deliberate change, not a silent drift. */
    const user = userEvent.setup();
    const first = renderProbe();
    const initial = screen.getByRole("button").textContent;
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button").textContent).not.toBe(initial);

    act(() => first.unmount());
    renderProbe();

    expect(screen.getByRole("button").textContent).toBe(initial);
    expect(localStorage.getItem("sistine-pattern-sand")).toBeNull();
  });
});
