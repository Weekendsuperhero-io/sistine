import { Suspense } from "react";
import { BackdropScene } from "@/components/backdrop-scene";

export const metadata = {
  title: "Backdrop · Sistine",
  description: "A single Sistine pattern scene, full-screen: for wallpapers and for scripts/export-backgrounds.mjs.",
  robots: {
    index: false,
  },
};

/* The scene reads the query, which a statically exported page only knows in the browser, so it renders
   client-side under this boundary (the build fails on useSearchParams without one). */
export default function BackdropPage() {
  return (
    <Suspense>
      <BackdropScene />
    </Suspense>
  );
}
