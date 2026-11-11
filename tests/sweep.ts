/**
 * Sweeps that assert once, on the worst of thousands of samples, without being blind to NaN.
 *
 * A worst-of written `if (d > worst.d)` never records a NaN difference (every comparison with NaN is
 * false), so a model that returns NaN over a band of hues leaves the worst at 0 and the sweep passes. Here a
 * sample where either side is not a finite number is reported on its own (the first one, `nonFinite`), and
 * the worst finite difference is kept with `!(d <= worst)`, the form that is true on NaN. expectWithin and
 * expectAtMost assert both.
 */
import { expect } from "vitest";

export interface Worst<T> {
  /** The largest finite |a − b| over the samples (0 if there were none). */
  d: number;
  /** The sample it was at. */
  at: T | undefined;
  /** The first sample where a or b was not a finite number, if any. */
  nonFinite: T | undefined;
}

/** The largest |a(x) − b(x)| over the samples, and the first sample where either is not finite. */
export function worstDifference<T>(samples: Iterable<T>, a: (x: T) => number, b: (x: T) => number): Worst<T> {
  const worst: Worst<T> = {
    d: 0,
    at: undefined,
    nonFinite: undefined,
  };
  for (const x of samples) {
    const va = a(x);
    const vb = b(x);
    if (!(Number.isFinite(va) && Number.isFinite(vb))) {
      if (worst.nonFinite === undefined) worst.nonFinite = x;
      continue;
    }
    const d = Math.abs(va - vb);
    if (!(d <= worst.d)) {
      worst.d = d;
      worst.at = x;
    }
  }
  return worst;
}

/** The largest f(x) over the samples (f ≥ 0, a share or a ratio), and the first sample where it is not finite. */
export const worstValue = <T>(samples: Iterable<T>, f: (x: T) => number): Worst<T> => worstDifference(samples, f, () => 0);

/** Every compared value finite, and the worst difference strictly under `bound`. */
export function expectWithin<T>(worst: Worst<T>, bound: number, what: string): void {
  expect(worst.nonFinite, `${what}: not a finite number at ${String(worst.nonFinite)}`).toBeUndefined();
  expect(worst.d, `${what}: differ most at ${String(worst.at)}`).toBeLessThan(bound);
}

/** Every value finite, and the worst at most `bound`. */
export function expectAtMost<T>(worst: Worst<T>, bound: number, what: string): void {
  expect(worst.nonFinite, `${what}: not a finite number at ${String(worst.nonFinite)}`).toBeUndefined();
  expect(worst.d, `${what}: largest at ${String(worst.at)}`).toBeLessThanOrEqual(bound);
}
