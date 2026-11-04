import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  staticDirs: [
    "../public",
  ],
  /* No CSS source maps in the PRODUCTION build. @storybook/nextjs leaves css-loader's and postcss-loader's
     `sourceMap` unset, so they follow webpack's devtool, which is on; style-loader then inlines the map into
     the JS. For app/site.css that map carries a second, complete copy of the stylesheet (sourcesContent)
     plus 54 KB of mappings: 488 KiB of module for 222 KB of CSS. The exported Storybook is served under
     /storybook/, so that weight reached visitors. Development keeps its maps. */
  webpackFinal: async (config, { configType }) => {
    if (configType !== "PRODUCTION") return config;
    const cssLoader = /[\\/](post)?css-loader[\\/]/;
    for (const rule of config.module?.rules ?? []) {
      if (!rule || typeof rule !== "object" || !Array.isArray(rule.use)) continue;
      rule.use = rule.use.map((use) => {
        const entry = typeof use === "string" ? { loader: use } : use;
        if (!entry || typeof entry !== "object" || typeof entry.loader !== "string" || !cssLoader.test(entry.loader)) return use;
        return {
          ...entry,
          options: {
            ...(typeof entry.options === "object" ? entry.options : {}),
            sourceMap: false,
          },
        };
      });
    }
    /* Size warnings set just above Storybook's OWN chunks, not webpack's 244 KiB default. Those chunks (the
       React compatibility layer, axe-core for the a11y addon, Storybook's UI and docs blocks, the Next.js
       preview) run to 1.19 MiB each and the entrypoint to 1.43 MiB; nothing here can shrink them short of
       dropping addons, so the default only ever reported them. At these limits the build is quiet, and a
       stylesheet or component that grows by ~70 KiB still trips the entrypoint warning. */
    config.performance = {
      ...config.performance,
      maxAssetSize: 1.3 * 1024 * 1024,
      maxEntrypointSize: 1.5 * 1024 * 1024,
    };
    return config;
  },
  // Configure base path for subdirectory deployment
  // This adds <base href="/storybook/" /> to the HTML
  managerHead: (head, { configType }) => {
    if (configType === "PRODUCTION") {
      return `
        ${head}
        <base href="/storybook/" />
      `;
    }
    return head;
  },
};
export default config;
