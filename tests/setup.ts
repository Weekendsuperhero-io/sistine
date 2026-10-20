import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

/* jsdom ships no ResizeObserver, and several Radix primitives (Slider via use-size, among others)
   construct one during their layout effect — so rendering them throws before a single assertion runs.
   A no-op stub is the right shape here: these tests assert state and DOM attributes, never measured
   geometry, which jsdom reports as 0 regardless. */
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

/* jsdom has no layout, so no document.elementFromPoint either; input-otp calls it on a timer to detect a
   password manager's overlay badge, and the resulting TypeError surfaced as an unhandled error. Nothing is
   at any point in a layout-less document. */
if (typeof document.elementFromPoint !== "function") {
  document.elementFromPoint = () => null;
}
