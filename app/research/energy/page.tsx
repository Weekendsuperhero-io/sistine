import { Bench } from "./bench";

export const metadata = {
  title: "Energy bench · Sistine",
  description: "Research harness: background renderers under glass, for scripts/energy/run.mjs.",
  robots: {
    index: false,
  },
};

/* RESEARCH ONLY. See docs/research/2026-11-04-webgpu-energy.md. */
export default function EnergyBenchPage() {
  return <Bench />;
}
