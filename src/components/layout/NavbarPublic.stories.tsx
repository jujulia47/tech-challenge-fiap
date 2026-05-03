import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { NavbarPublic } from './NavbarPublic'

const meta: Meta<typeof NavbarPublic> = {
  title: 'Components/Layout/NavbarPublic',
  component: NavbarPublic,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof NavbarPublic>

export const Default: Story = {
  args: {
    onLoginClick: () => {},
    onSignupClick: () => {},
  },
}
