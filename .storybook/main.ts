import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  "stories": [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest"
  ],
  "framework": {
    "name": "@storybook/nextjs",
    "options": {}
  },
  "staticDirs": [
    "../public"
  ],
  // Configure base path for subdirectory deployment
  // This adds <base href="/storybook/" /> to the HTML
  "managerHead": (head, { configType }) => {
    if (configType === 'PRODUCTION') {
      return `
        ${head}
        <base href="/storybook/" />
      `;
    }
    return head;
  }
};
export default config;