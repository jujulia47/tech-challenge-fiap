import type { StorybookConfig } from '@storybook/nextjs-vite'
import remarkGfm from 'remark-gfm'

const config: StorybookConfig = {
  stories: [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    {
      name: "@storybook/addon-docs",
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
    "@storybook/addon-onboarding"
  ],
  framework: "@storybook/nextjs-vite",
  staticDirs: [
    "..\\public"
  ],
  viteFinal: async (config) => {
    return {
      ...config,
      plugins: [
        ...(config.plugins || []),
        {
          name: 'inject-material-icons',
          transformIndexHtml(html: string) {
            return html.replace(
              '</head>',
              '<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet"></head>'
            )
          },
        },
      ],
    }
  },
}

export default config
