import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Fully static build to `out/`. The site is a component-library demo: every route's data is local
     (the registry JSON and the block catalogue), so nothing needs a server at request time. That makes
     it deployable as plain assets to Cloudflare Pages / Workers Static Assets. */
  output: "export",
  images: {
    /* `output: "export"` has no image optimizer to call. The one next/image usage (the header logo)
       is a fixed-size local PNG, so it just serves the source file. */
    unoptimized: true,
  },
  experimental: {
    useTypeScriptCli: true,
  },
};

export default nextConfig;
