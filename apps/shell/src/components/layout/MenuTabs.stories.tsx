import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MenuTabs } from './MenuTabs'

const meta: Meta<typeof MenuTabs> = {
  title: 'Components/Layout/MenuTabs',
  component: MenuTabs,
  parameters: { layout: 'fullscreen' },
  globals: {
    viewport: { value: 'tablet' },
  },
}

export default meta
type Story = StoryObj<typeof MenuTabs>

export const ActiveHome: Story = {
  parameters: {
    nextjs: { navigation: { pathname: '/dashboard' } },
  },
}

export const ActiveStatement: Story = {
  parameters: {
    nextjs: { navigation: { pathname: '/dashboard/extrato' } },
  },
}