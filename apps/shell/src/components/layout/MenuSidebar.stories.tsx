import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MenuSidebar } from './MenuSidebar'

const meta: Meta<typeof MenuSidebar> = {
  title: 'Components/Layout/MenuSidebar',
  component: MenuSidebar,
  parameters: { layout: 'fullscreen' },
  globals: {
    viewport: { value: 'desktop' },
  },
  decorators: [
    (Story) => (
      <div className="flex h-screen bg-bg-base">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof MenuSidebar>

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

export const ActiveInvestments: Story = {
  parameters: {
    nextjs: { navigation: { pathname: '/dashboard/investments' } },
  },
}