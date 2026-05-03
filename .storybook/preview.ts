import type { Preview } from '@storybook/nextjs-vite'
import '../src/styles/globals.css'

const viewports = {
  mobile: {
    name: 'Mobile (360px)',
    styles: { width: '360px', height: '800px' },
    type: 'mobile' as const,
  },
  tablet: {
    name: 'Tablet (768px)',
    styles: { width: '768px', height: '1024px' },
    type: 'tablet' as const,
  },
  desktop: {
    name: 'Desktop (1280px)',
    styles: { width: '1280px', height: '900px' },
    type: 'desktop' as const,
  },
}

const preview: Preview = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/dashboard',
      },
    },
    viewport: {
      options: viewports,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
  initialGlobals: {
    viewport: { value: 'desktop' },
  },
}

export default preview