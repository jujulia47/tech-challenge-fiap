import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DashboardWelcome } from './DashboardWelcome'

const meta: Meta<typeof DashboardWelcome> = {
  title: 'Components/Layout/DashboardWelcome',
  component: DashboardWelcome,
  tags: ['autodocs'],
  parameters: {
    nextjs: { navigation: { pathname: '/dashboard' } },
  },
}

export default meta
type Story = StoryObj<typeof DashboardWelcome>

export const Default: Story = {}
