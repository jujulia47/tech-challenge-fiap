import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Header } from './Header'

const meta: Meta<typeof Header> = {
  title: 'Components/Layout/Header',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      navigation: {
        pathname: '/dashboard',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Header>

export const Default: Story = {
  parameters: {
    nextjs: {
      navigation: { pathname: '/dashboard' },
    },
  },
}
